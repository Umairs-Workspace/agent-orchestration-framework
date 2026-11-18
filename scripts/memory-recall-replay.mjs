#!/usr/bin/env node
// scripts/memory-recall-replay.mjs — replay the recorded recalls against the shipped block
// (milestone 201 / ADR-007).
//
// The ledgers hold the questions agents really asked, each with the scope it was asked in. This
// script takes a seeded sample of them and builds two blocks for each, over the index as it stands:
// the LEXICAL block (the pick turned off: the 5 best-ranked records in scope) and the SHIPPED block
// (what `aof memory recall … --block` hands over on this node). A model judge then grades every
// record either block showed, 0 / 1 / 2, without being told which block showed it, and one report
// says whether the shipped block shows less noise and no fewer decision-changing records. That is
// the direction spike 177 measured, checked on this project's own recalls.
//
//   node scripts/memory-recall-replay.mjs [--sample 40] [--seed 177] [--edge <edge>]
//                                         [--out <dir>] [--judge-model opus] [--judge-timeout-ms 120000]
//
// Run it from the project's root. It reads the ledgers and the index and writes ONE file, the
// report: no ledger, no index. A replay is not a recall edge, so nothing it does is recorded.
//
// WHAT A SEED FIXES. Which recalls are replayed, in which order, and the order each judge request
// lists its cards in. Not what the pick's model picks or how the judge grades: two runs with one
// seed replay the same recalls and may report different figures.
//
// EXIT CODE. 0 the direction holds · 1 it does not hold · 2 no direction can be read (nothing was
// replayed or graded, or every shipped block was the lexical block) · 3 refused before anything ran.
//
// THE THREE PASSES are kept apart from the arithmetic. `collectRecalls`, `replayRecall` and
// `gradeRecall` read disk and start processes; `scoreReplay`, `directionOf` and `renderReport` are
// pure, so a suite drives them with grades and no model.
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defaultApplication as application } from "aof/default-application";
import { MODEL_ASK, askModel } from "@aof/execution/model-ask";
import { readMemoryConfig } from "@aof/knowledge/memory-config";
import { buildPickRequest, pickAnnouncement } from "@aof/knowledge/memory/recall-pick";
import { listItems } from "@aof/work/discovery";
import { readFeedbackRecords } from "@aof/work/feedback-records";

export const DEFAULT_SAMPLE = 40;
export const DEFAULT_SEED = 177;
export const DEFAULT_JUDGE_MODEL = "opus";
// The judge is not held to the pick's 20 s: 177 measured an opus judge at p95 23.7 s.
export const DEFAULT_JUDGE_TIMEOUT_MS = 120000;

// The two edges that ask with `--all`. They gather an item's whole history and were never a block,
// so there is no pick to compare (ADR-007 §2).
export const WHOLE_HISTORY_EDGES = Object.freeze(["continue-episodic", "retrospective-evidence"]);

export const DIRECTION = Object.freeze({ holds: "holds", doesNotHold: "does not hold", unreadable: "unreadable" });
const EXIT = Object.freeze({ [DIRECTION.holds]: 0, [DIRECTION.doesNotHold]: 1, [DIRECTION.unreadable]: 2, refused: 3 });
export const exitCodeFor = (direction) => EXIT[direction];

const USAGE = "Usage: node scripts/memory-recall-replay.mjs [--sample <n>] [--seed <n>] [--edge <edge>] [--out <dir>] [--judge-model <model>] [--judge-timeout-ms <n>]";

// A refusal is an answer, not a crash: the script says why and starts nothing.
export class ReplayRefusal extends Error {}
const refuse = (message) => { throw new ReplayRefusal(message); };

// ------------------------------------------------------------------ arguments ----

const wholeNumber = (text) => (/^\d+$/u.test(String(text ?? "")) ? Number(text) : null);

export function parseReplayArgs(argv) {
  const options = { sample: DEFAULT_SAMPLE, seed: DEFAULT_SEED, edge: null, out: null, judgeModel: DEFAULT_JUDGE_MODEL, judgeTimeoutMs: DEFAULT_JUDGE_TIMEOUT_MS, help: false };
  const positive = (flag, value) => {
    const n = wholeNumber(value);
    if (n === null || n < 1) refuse(`${flag} takes a positive whole number, such as ${flag} ${flag === "--sample" ? DEFAULT_SAMPLE : DEFAULT_JUDGE_TIMEOUT_MS} (got "${value ?? ""}").`);
    return n;
  };
  const text = (flag, value) => {
    if (typeof value !== "string" || value.trim() === "" || value.startsWith("--")) refuse(`${flag} takes a value.`);
    return value;
  };
  for (let at = 0; at < argv.length; at += 1) {
    const flag = argv[at];
    if (flag === "-h" || flag === "--help") options.help = true;
    else if (flag === "--sample") options.sample = positive(flag, argv[++at]);
    else if (flag === "--seed") {
      const seed = wholeNumber(argv[++at]);
      if (seed === null) refuse(`--seed takes a whole number, such as --seed ${DEFAULT_SEED} (got "${argv[at] ?? ""}").`);
      options.seed = seed;
    } else if (flag === "--edge") options.edge = text(flag, argv[++at]);
    else if (flag === "--out") options.out = text(flag, argv[++at]);
    else if (flag === "--judge-model") options.judgeModel = text(flag, argv[++at]);
    else if (flag === "--judge-timeout-ms") options.judgeTimeoutMs = positive(flag, argv[++at]);
    else refuse(`Unknown argument "${flag}". ${USAGE}`);
  }
  return options;
}

// ------------------------------------------------------------ pass 1 · collect ----

// A small seeded generator (mulberry32) and a Fisher–Yates shuffle over it. The seed decides an
// order and nothing else.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(list, seed) {
  const random = seededRandom(seed);
  const shuffled = [...list];
  for (let at = shuffled.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    [shuffled[at], shuffled[other]] = [shuffled[other], shuffled[at]];
  }
  return shuffled;
}

// Every `recall` row on every item's ledger, read through the ledger's own reader. A recall id
// that sits on two ledgers is one recall, kept once under the first item that holds it. A ledger
// the reader refuses is named and skipped: one bad row must not hide the other ledgers.
export async function collectRecalls(workDir, { list = listItems, readLedger = readFeedbackRecords } = {}) {
  const byId = new Map();
  const unreadable = [];
  const seen = new Set();
  let recorded = 0;
  const items = (await list(workDir)).filter((item) => item?.dir != null);
  items.sort((a, b) => String(a.dir).localeCompare(String(b.dir)));
  for (const item of items) {
    if (seen.has(item.dir)) continue;
    seen.add(item.dir);
    let rows;
    try {
      rows = await readLedger(item);
    } catch (error) {
      unreadable.push({ item: item.ref ?? path.basename(item.dir), reason: error.message });
      continue;
    }
    for (const row of rows) {
      if (row.kind !== "recall") continue;
      recorded += 1;
      if (!byId.has(row.id)) byId.set(row.id, { ...row, item: item.ref ?? path.basename(item.dir) });
    }
  }
  // Ordered by id, so the sample depends on the seed and never on how a filesystem lists folders.
  const recalls = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { recalls, recorded, repeated: recorded - recalls.length, unreadable };
}

// Which of the collected recalls a run replays: the block edges, narrowed to `edge` when one is
// named, shuffled by the seed and cut at the sample.
export function selectRecalls(recalls, { edge = null, sample = DEFAULT_SAMPLE, seed = DEFAULT_SEED } = {}) {
  const leftOut = {};
  const blocks = [];
  for (const recall of recalls) {
    if (WHOLE_HISTORY_EDGES.includes(recall.edge)) leftOut[recall.edge] = (leftOut[recall.edge] ?? 0) + 1;
    else blocks.push(recall);
  }
  const candidates = edge === null ? blocks : blocks.filter((recall) => recall.edge === edge);
  const selected = seededShuffle(candidates, seed).slice(0, sample);
  return { selected, candidates: candidates.length, leftOut, sampleLarger: sample > candidates.length };
}

// ------------------------------------------------------------- pass 2 · replay ----

export const recordIdentity = (record) => `${record.item}/${record.recordType}/${record.id}`;

// The workspace as loaded, with the pick turned off: the lexical block is the same door asked the
// same question with `memory.recall.pick.enabled` false, which starts no process.
export function withPickOff(workspace) {
  const memory = workspace.config?.memory ?? {};
  return { ...workspace, config: { ...workspace.config, memory: { ...memory, recall: { ...memory.recall, pick: { ...memory.recall?.pick, enabled: false } } } } };
}

// One recorded recall, asked twice through the memory command the CLI runs, with its recorded
// query, verbatim, and its recorded scope. A scope naming a filter this build does not read cannot
// be replayed as recorded, so it is refused rather than asked with a wider one.
export async function replayRecall(recall, { invoke, workspace, scopeFlags }) {
  const unknown = Object.keys(recall.scope ?? {}).filter((key) => !scopeFlags.includes(key));
  if (unknown.length > 0) return { unreplayable: `its scope names ${unknown.map((key) => `"${key}"`).join(", ")}, which this build does not filter by` };
  const input = { verb: "recall", query: recall.query, only: null, ref: null, inputFile: null, exclude: null, scope: { ...recall.scope }, opts: {}, block: true, lessons: false, help: false };
  const lexical = (await invoke("memory", input, { workspace: withPickOff(workspace) })).result;
  const shipped = (await invoke("memory", input, { workspace })).result;
  const shippedRecords = shipped?.records ?? [];
  return {
    lexical: lexical?.records ?? [],
    shipped: shippedRecords,
    pick: shipped?.pick ?? null,
    // A miss the door announces (201/ADR-003) left the lexical block in the shipped one's place.
    degraded: pickAnnouncement(shipped?.pick, shippedRecords.length) !== null,
  };
}

// -------------------------------------------------------------- pass 3 · judge ----

// What "should change the decision" means differs by who is deciding, so the judge is told the
// role. 177 graded against a rubric per edge for the same reason.
const RUBRICS = Object.freeze({
  "continue-developer": "The agent is a developer about to build a story. A record changes the decision when it names a gotcha, a constraint or an earlier failure the build would otherwise repeat.",
  "refine-architect": "The agent is an architect about to record a design decision. A record changes the decision when it is an earlier decision, constraint or lesson the new one must honour or knowingly depart from.",
  "refine-po": "The agent is a product owner about to break a piece of work into stories. A record changes the decision when it bears on how the work is cut or on what a story must contain.",
  "shatter-po": "The agent is a product owner about to cut a requirements document into separate pieces of work. A record changes the decision when it bears on where the cuts fall.",
  "verify-finding": "The agent is a verifier triaging a finding. A record changes the decision when it is an earlier finding with the same cause, or evidence that bears on how this one is triaged.",
  "retrospective-domain": "The agent is writing a retrospective. A record changes the decision when it is an earlier lesson that a new lesson would repeat or recur.",
});
const DEFAULT_RUBRIC = "A record changes the decision when acting on it would make the agent do something different about this question.";

export function judgeInstruction(edge) {
  return [
    "You grade memory records that an agent was shown before it made a decision.",
    "You are given the edge the agent asked from, its query, and numbered cards. Each card is one record: a header line, then the record's text.",
    RUBRICS[edge] ?? DEFAULT_RUBRIC,
    "Grade every card: 0 when the record is not relevant to the query, 1 when it is worth a glance, 2 when it should change the decision.",
    "A record that only shares words with the query is 0.",
    'Answer with one JSON object that maps every card number to its grade, and nothing else, for example {"1": 2, "2": 0, "3": 1}.',
  ].join("\n");
}

// The records either block showed, once each, in an order the seed fixes and the blocks do not: a
// judge that could tell the shorter block apart could learn that fewer is better.
export function poolRecords(replayed, seed) {
  const pool = new Map();
  for (const record of [...replayed.lexical, ...replayed.shipped]) if (!pool.has(recordIdentity(record))) pool.set(recordIdentity(record), record);
  const ordered = [...pool.values()].sort((a, b) => recordIdentity(a).localeCompare(recordIdentity(b)));
  return seededShuffle(ordered, seed);
}

export function renderJudgeRequest({ edge, query, cards }) {
  return [`Edge: ${edge}`, `Query: ${query}`, `Grade each of the ${cards.length} cards below.`, "", cards.map((card) => `[${card.number}] ${card.line}\n${card.text}`).join("\n\n"), ""].join("\n");
}

// The first JSON object in an answer, or null.
function firstObject(answer) {
  for (let from = answer.indexOf("{"); from >= 0; from = answer.indexOf("{", from + 1)) {
    let depth = 0;
    for (let at = from; at < answer.length; at += 1) {
      if (answer[at] === "{") depth += 1;
      else if (answer[at] === "}" && (depth -= 1) === 0) {
        try {
          const parsed = JSON.parse(answer.slice(from, at + 1));
          if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
        } catch {
          // A brace in prose, not JSON: carry on to the next one.
        }
        break;
      }
    }
  }
  return null;
}

// Read a judge's answer into one grade per card, by card number, or say why it is not a grading.
// Every card must carry a grade of 0, 1 or 2: a partial or out-of-range answer grades nothing,
// because averaging over the cards a judge chose to grade would flatter whichever block it skipped.
export function readGrades(answer, cards) {
  const object = typeof answer === "string" ? firstObject(answer) : null;
  if (object === null) return { reason: "the judge's answer held no grades" };
  const grades = [];
  for (let number = 1; number <= cards; number += 1) {
    const grade = object[String(number)];
    if (grade === undefined) return { reason: `the judge graded only some of the ${cards} records` };
    if (![0, 1, 2].includes(grade)) return { reason: `the judge gave card ${number} a grade that is not 0, 1 or 2` };
    grades.push(grade);
  }
  return { grades };
}

const UNGRADED = Object.freeze({
  [MODEL_ASK.timeout]: "the judge did not answer in time",
  [MODEL_ASK.failed]: "the judge's process failed",
  [MODEL_ASK.unreadable]: "the judge printed no answer",
});

// Ask the judge once about one recall. Answers `{ grades }`, a Map from record identity to its
// grade, or `{ reason }` when the recall stays ungraded. Two empty blocks need no judge.
export async function gradeRecall({ recall, replayed, seed }, { ask, lineOf }) {
  const pool = poolRecords(replayed, seed);
  if (pool.length === 0) return { grades: new Map(), asked: false };
  const { cards } = buildPickRequest({ query: recall.query, shortlist: pool, cap: pool.length, lineOf });
  const asked = await ask({ instruction: judgeInstruction(recall.edge), input: renderJudgeRequest({ edge: recall.edge, query: recall.query, cards }) });
  if (asked.outcome !== MODEL_ASK.answered) return { reason: asked.outcome === MODEL_ASK.failed && asked.reason ? `${UNGRADED[asked.outcome]}: ${asked.reason}` : UNGRADED[asked.outcome] ?? "the judge could not be asked", asked: true };
  const read = readGrades(asked.text, cards.length);
  if (!read.grades) return { reason: read.reason, asked: true };
  return { grades: new Map(pool.map((record, index) => [recordIdentity(record), read.grades[index]])), asked: true };
}

// ---------------------------------------------------------------------- score ----

const emptyBlockTotals = () => ({ shown: 0, empty: 0, strong: 0, relevant: 0, noise: 0, strongHit: 0 });
const emptyRow = (edge) => ({ edge, recalls: 0, degraded: 0, graded: 0, ungraded: 0, anyStrong: 0, lexical: emptyBlockTotals(), shipped: emptyBlockTotals() });

// One replayed recall as the score reads it: `lexical` and `shipped` are record identities in block
// order, and `grades` is a Map from identity to 0 / 1 / 2, or null when the judge gave none.
function addToRow(row, result) {
  row.recalls += 1;
  if (result.degraded) row.degraded += 1;
  for (const block of ["lexical", "shipped"]) {
    row[block].shown += result[block].length;
    if (result[block].length === 0) row[block].empty += 1;
  }
  if (result.grades == null) {
    row.ungraded += 1;
    return;
  }
  row.graded += 1;
  const strongIn = {};
  for (const block of ["lexical", "shipped"]) {
    const grades = result[block].map((identity) => result.grades.get(identity));
    row[block].strong += grades.filter((grade) => grade === 2).length;
    row[block].relevant += grades.filter((grade) => grade >= 1).length;
    row[block].noise += grades.filter((grade) => grade === 0).length;
    strongIn[block] = grades.includes(2);
  }
  if (strongIn.lexical || strongIn.shipped) row.anyStrong += 1;
  if (strongIn.lexical) row.lexical.strongHit += 1;
  if (strongIn.shipped) row.shipped.strongHit += 1;
}

// Totals per edge and overall. Shown, empty and degraded count every replayed recall; the graded
// columns count only the recalls a judge graded, so an ungraded recall is in no average.
export function scoreReplay(results) {
  const byEdge = new Map();
  const overall = emptyRow("overall");
  for (const result of results) {
    if (!byEdge.has(result.edge)) byEdge.set(result.edge, emptyRow(result.edge));
    addToRow(byEdge.get(result.edge), result);
    addToRow(overall, result);
  }
  return { rows: [...byEdge.values()].sort((a, b) => a.edge.localeCompare(b.edge)), overall };
}

const perRecall = (total, recalls) => (recalls === 0 ? "0.00" : (total / recalls).toFixed(2));

// The direction, read off the overall row. It holds when the shipped block shows LESS noise per
// recall and NO FEWER decision-changing records. Both blocks are averaged over the same graded
// recalls, so the totals are compared and no rounding decides it.
export function directionOf(overall) {
  if (overall.recalls === 0) return { direction: DIRECTION.unreadable, why: "no recall was replayed." };
  if (overall.degraded === overall.recalls) return { direction: DIRECTION.unreadable, why: `all ${overall.recalls} recalls were degraded, so every shipped block was the lexical block and there is nothing to compare.` };
  if (overall.graded === 0) return { direction: DIRECTION.unreadable, why: "no recall was graded." };
  const figure = (block, column) => perRecall(overall[block][column], overall.graded);
  const strongFell = overall.shipped.strong < overall.lexical.strong;
  const noiseFell = overall.shipped.noise < overall.lexical.noise;
  if (!strongFell && noiseFell) {
    return { direction: DIRECTION.holds, why: `noise per recall fell from ${figure("lexical", "noise")} to ${figure("shipped", "noise")}, and decision-changing records per recall went from ${figure("lexical", "strong")} to ${figure("shipped", "strong")}.` };
  }
  const reasons = [];
  if (strongFell) reasons.push(`decision-changing records per recall fell from ${figure("lexical", "strong")} to ${figure("shipped", "strong")}`);
  if (!noiseFell) reasons.push(`noise per recall did not fall: ${figure("lexical", "noise")} for the lexical block, ${figure("shipped", "noise")} for the shipped block`);
  return { direction: DIRECTION.doesNotHold, why: `${reasons.join(", and ")}.` };
}

// --------------------------------------------------------------------- report ----

const cell = (text) => String(text).replaceAll("|", "\\|").replace(/\s+/gu, " ").trim();
const cut = (text, length) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);
const table = (header, rows) => [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)];

export function renderReport({ options, date, pick, collected, selection, results, unreplayable, score, verdict }) {
  const leftOut = Object.entries(selection.leftOut);
  const leftOutTotal = leftOut.reduce((sum, [, count]) => sum + count, 0);
  const shownRow = (row) => [row.edge, row.recalls, perRecall(row.lexical.shown, row.recalls), perRecall(row.shipped.shown, row.recalls), row.lexical.empty, row.shipped.empty, row.degraded];
  const gradedRow = (row) => [
    row.edge, row.graded, row.ungraded,
    perRecall(row.lexical.strong, row.graded), perRecall(row.shipped.strong, row.graded),
    perRecall(row.lexical.relevant, row.graded), perRecall(row.shipped.relevant, row.graded),
    perRecall(row.lexical.noise, row.graded), perRecall(row.shipped.noise, row.graded),
    `${row.lexical.strongHit}/${row.anyStrong}`, `${row.shipped.strongHit}/${row.anyStrong}`,
  ];
  const lines = [
    `# Memory recall replay — ${date}`,
    "",
    `direction: ${verdict.direction}`,
    "",
    `${verdict.direction === DIRECTION.unreadable ? "No direction can be read" : `The direction ${verdict.direction}`}: ${verdict.why}`,
    "",
    "The direction holds when the shipped block shows less noise per recall and no fewer decision-changing records than the lexical block (spike 177).",
    "",
    "## What was run",
    "",
    `- Sample: ${options.sample} · seed: ${options.seed} · edge: ${options.edge ?? "every block edge"}`,
    `- Pick model: ${pick.model} (${pick.source}) · time limit ${pick.timeoutMs} ms`,
    `- Judge model: ${options.judgeModel} · time limit ${options.judgeTimeoutMs} ms`,
    `- Date: ${date}`,
    `- Recorded recalls on the ledgers: ${collected.recorded} · replayed: ${results.length}`,
    ...(collected.repeated > 0 ? [`- Recorded twice: ${collected.repeated} recall row(s) repeat an id another ledger holds. Each recall is replayed once.`] : []),
    ...(leftOutTotal > 0 ? [`- Left out: ${leftOutTotal} whole-history recall(s) (${leftOut.map(([edge, count]) => `${edge} ${count}`).join(", ")}). They asked with \`--all\` for an item's whole history and were never a block.`] : []),
    ...(selection.sampleLarger ? [`- The sample was larger than the ledgers: ${options.sample} were asked for and all ${selection.candidates} were replayed.`] : []),
    ...collected.unreadable.map((ledger) => `- Ledger not read: ${ledger.item} (${ledger.reason})`),
    ...unreplayable.map((entry) => `- Not replayed: ${entry.id} (${entry.edge}), because ${entry.reason}.`),
    "- The pick is not repeatable. A model makes it, and a model grades it: a second run with this seed replays the same recalls and may report different figures.",
    "- Both blocks are built over the index as it stands today, not as it stood when each recall was recorded.",
    "",
    "## What each block handed over",
    "",
    "Records shown per recall, blocks that were empty, and recalls where the pick could not answer and the shipped block was the lexical one (degraded).",
    "",
    ...table(["edge", "recalls", "lexical shown/recall", "shipped shown/recall", "lexical empty", "shipped empty", "degraded"], [...score.rows.map(shownRow), shownRow(score.overall)]),
    "",
    "## What the judge made of each block",
    "",
    "Per graded recall: records graded 2 (strong: should change the decision), graded 1 or more (relevant) and graded 0 (noise). Strong hit counts the recalls whose block held a record graded 2, out of those where either block held one. An ungraded recall is in no average.",
    "",
    ...table(
      ["edge", "graded", "ungraded", "lexical strong", "shipped strong", "lexical relevant", "shipped relevant", "lexical noise", "shipped noise", "lexical strong hit", "shipped strong hit"],
      [...score.rows.map(gradedRow), gradedRow(score.overall)],
    ),
    "",
    "## Recalls replayed",
    "",
    ...table(
      ["#", "recall", "edge", "item", "scope", "lexical", "shipped", "shipped block", "judge"],
      results.map((result, index) => [
        index + 1, result.id, result.edge, result.item, `\`${JSON.stringify(result.scope)}\``, result.lexical.length, result.shipped.length,
        result.degraded ? `degraded (${result.pick?.code})` : result.pick?.mode === "model" ? "picked" : "nothing in scope",
        result.grades == null ? `ungraded: ${result.ungraded}` : result.judged ? "graded" : "nothing to grade",
      ]),
    ),
    "",
    "## Records and grades",
    "",
    "Every record either block showed, with its place in each block and the judge's grade.",
  ];
  results.forEach((result, index) => {
    lines.push("", `### ${index + 1} · ${result.edge} · ${cut(cell(result.query) || "(empty query)", 120)}`, "");
    const identities = [...new Set([...result.lexical, ...result.shipped])];
    if (identities.length === 0) lines.push("Neither block showed a record.");
    else {
      const place = (block, identity) => (block.includes(identity) ? block.indexOf(identity) + 1 : "");
      lines.push(...table(["record", "title", "lexical", "shipped", "grade"], identities.map((identity) => [identity, cut(result.titles[identity] ?? "", 90), place(result.lexical, identity), place(result.shipped, identity), result.grades?.get(identity) ?? ""])));
    }
  });
  return `${lines.join("\n")}\n`;
}

// ----------------------------------------------------------------------- run ----

// The replay over injected collaborators: `invoke` is the application's command door, `ask` the
// judge's one-shot call, `lineOf` the seam's block line. Answers `{ results, score, verdict, … }`
// and writes nothing; the caller writes the report.
export async function runReplay(options, { workspace, invoke, ask, lineOf, scopeFlags, progress = () => {} }) {
  const collected = await collectRecalls(workspace.workDir);
  const selection = selectRecalls(collected.recalls, options);
  const results = [];
  const unreplayable = [];
  for (const [index, recall] of selection.selected.entries()) {
    const replayed = await replayRecall(recall, { invoke, workspace, scopeFlags });
    if (replayed.unreplayable) {
      unreplayable.push({ id: recall.id, edge: recall.edge, reason: replayed.unreplayable });
      continue;
    }
    // A degraded recall is graded like any other: its shipped block is what this node hands over.
    const graded = await gradeRecall({ recall, replayed, seed: options.seed + index + 1 }, { ask, lineOf });
    const titles = Object.fromEntries([...replayed.lexical, ...replayed.shipped].map((record) => [recordIdentity(record), record.title ?? ""]));
    const result = {
      id: recall.id, edge: recall.edge, item: recall.item, query: recall.query, scope: recall.scope,
      lexical: replayed.lexical.map(recordIdentity), shipped: replayed.shipped.map(recordIdentity),
      pick: replayed.pick, degraded: replayed.degraded, grades: graded.grades ?? null, ungraded: graded.reason ?? null, judged: graded.asked === true, titles,
    };
    results.push(result);
    progress(`[${index + 1}/${selection.selected.length}] ${recall.edge} · lexical ${result.lexical.length} · shipped ${result.shipped.length}${result.degraded ? " (degraded)" : ""} · ${result.grades == null ? `ungraded: ${result.ungraded}` : "graded"}`);
  }
  const score = scoreReplay(results);
  return { collected, selection, results, unreplayable, score, verdict: directionOf(score.overall) };
}

// The judge reaches `claude` the way the pick does (201/ADR-004): the stand-in a suite names, else
// the provider seam's own resolution. An npm `.cmd` shim runs only through a shell, and neither
// call is ever started through one.
function resolveJudgeExecutable(env) {
  const standIn = env.AOF_RECALL_PICK_EXECUTABLE;
  const bin = standIn || application.execution.terminal.providers.resolveProvider("claude")?.resolveBinaryPath(env) || null;
  if (!bin || /\.(?:cmd|bat)$/iu.test(bin)) return null;
  return standIn && /\.m?js$/u.test(bin) ? { command: process.execPath, args: [path.resolve(bin)] } : { command: bin, args: [] };
}

const stamp = (date) => date.replace(/[-:]/gu, "").replace(/\.\d+Z$/u, "Z");

export async function main(argv, { cwd = process.cwd(), env = process.env, now = () => new Date(), print = console.log, printError = console.error } = {}) {
  try {
    const options = parseReplayArgs(argv);
    if (options.help) {
      print(USAGE);
      return 0;
    }
    let workspace;
    try {
      workspace = await application.loadWorkspace(cwd);
    } catch (error) {
      refuse(`No aof project could be loaded from ${cwd}: ${error.message}`);
    }
    const pick = readMemoryConfig(workspace.config).recall.pick;
    if (!pick.enabled) refuse("The pick is turned off in this project (memory.recall.pick.enabled is false), so the shipped block is the lexical block and there is nothing to compare.");
    // No model grades its own pick: a judge that is the pick's model would agree with itself.
    if (options.judgeModel.trim().toLowerCase() === String(pick.model).trim().toLowerCase()) {
      refuse(`The judge and the pick must differ: both are "${pick.model}". Name another model with --judge-model.`);
    }

    const executable = resolveJudgeExecutable(env);
    const ask = ({ instruction, input }) => (executable === null
      ? Promise.resolve({ outcome: MODEL_ASK.failed, reason: "no claude resolves on this node" })
      : askModel({ executable, model: options.judgeModel, instruction, input, timeoutMs: options.judgeTimeoutMs, env }));
    const memory = application.knowledge.work.memory;
    const lineOf = (record) => memory.renderRecallBlock({ records: [record] }, { limit: 1 }).trimEnd();

    const replay = await runReplay(options, { workspace, invoke: application.invoke, ask, lineOf, scopeFlags: memory.SCOPE_FLAGS, progress: print });
    if (replay.collected.recorded === 0) {
      printError(`No recorded recall was found on the ledgers under ${workspace.workDir}.`);
      return EXIT[DIRECTION.unreadable];
    }
    if (replay.selection.candidates === 0) {
      printError(options.edge !== null && WHOLE_HISTORY_EDGES.includes(options.edge)
        ? `Nothing was replayed: "${options.edge}" asks for an item's whole history and is never a block.`
        : options.edge !== null
          ? `Nothing was replayed: no recorded recall has the edge "${options.edge}".`
          : "Nothing was replayed: every recorded recall is a whole-history recall, which is never a block.");
      return EXIT[DIRECTION.unreadable];
    }

    const date = now().toISOString();
    const directory = path.resolve(cwd, options.out ?? path.join(os.tmpdir(), "aof-memory-recall-replay"));
    const file = path.join(directory, `memory-recall-replay-${stamp(date)}-seed${options.seed}.md`);
    await mkdir(directory, { recursive: true });
    await writeFile(file, renderReport({ options, date, pick, ...replay }), "utf8");

    print(`replayed ${replay.results.length} of ${replay.collected.recorded} recorded recalls (seed ${options.seed})${replay.selection.sampleLarger ? `: the sample of ${options.sample} was larger than the ledgers` : ""}`);
    print(`direction: ${replay.verdict.direction}`);
    print(replay.verdict.why);
    print(`report: ${file}`);
    return EXIT[replay.verdict.direction];
  } catch (error) {
    if (!(error instanceof ReplayRefusal)) throw error;
    printError(error.message);
    return EXIT.refused;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  let code;
  try {
    code = await main(process.argv.slice(2));
  } finally {
    await application.close?.();
  }
  process.exit(code);
}
