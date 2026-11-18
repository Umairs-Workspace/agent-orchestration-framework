// Milestone 201 / story 03 — the recorded recalls replay against the shipped block (ADR-007).
//
//   00_the-replay-runs-each-recorded-recall-twice.feature        R1
//   01_the-report-shows-what-each-block-handed-over.feature      R2
//   02_a-judge-grades-both-blocks.feature                        R3
//
// The driven cases run the REAL script, `node scripts/memory-recall-replay.mjs`, as a child in a
// scratch project with its own global home: 60 recorded recalls across four edges on real ledgers,
// over an index built by `aof memory ingest`. A STAND-IN `claude`, written into the scratch
// directory and named through `AOF_RECALL_PICK_EXECUTABLE`, answers both the picks and the judge's
// requests as each scenario says, and logs what it was sent. No case starts the real `claude`.
//
// The arithmetic (the score and the direction) is driven with grades and no process at all.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import {
  DIRECTION, collectRecalls, directionOf, exitCodeFor, gradeRecall, parseReplayArgs, poolRecords, readGrades, recordIdentity, replayRecall,
  scoreReplay, selectRecalls, withPickOff,
} from "../../scripts/memory-recall-replay.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const SCRIPT = path.join(repoRoot, "scripts", "memory-recall-replay.mjs");
const PICK_EXECUTABLE = "AOF_RECALL_PICK_EXECUTABLE";

// ---------------------------------------------------------------- the stand-in ----

// One program for both calls. It tells a pick from a judge request by the instruction's first
// line, takes its behaviour for that call from the plan (a list per kind, cycled by call number),
// and logs the model it was started at and everything it was sent.
//   pick:  a JSON array as text | "FAIL" (exit 1)
//   judge: "all:<g>" every card <g> | "title" the grade a card's title carries as (g<n>), else 0 |
//          "none" prose with no grades | "partial" card 1 only | "invalid" card 1 graded 7 | "slow"
const STAND_IN_SOURCE = `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
const env = process.env;
let stdin = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) stdin += chunk;
const kind = stdin.startsWith("You grade memory records") ? "judge" : "pick";
const counter = env.REPLAY_STAND_IN_LOG + "." + kind;
const call = existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0;
writeFileSync(counter, String(call + 1));
const argv = process.argv.slice(2);
appendFileSync(env.REPLAY_STAND_IN_LOG, JSON.stringify({ kind, call, model: argv[argv.indexOf("--model") + 1], stdin }) + "\\n");
const plan = JSON.parse(env.REPLAY_STAND_IN_PLAN);
const behaviour = plan[kind][call % plan[kind].length];
const answer = (result) => process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, result }) + "\\n");
if (behaviour === "FAIL") { process.stderr.write("Not logged in\\n"); process.exit(1); }
if (kind === "pick") answer(behaviour);
else {
  const cards = [...stdin.matchAll(/^\\[(\\d+)\\] (.*)$/gm)].map((match) => ({ number: match[1], line: match[2] }));
  const graded = (grade) => JSON.stringify(Object.fromEntries(cards.map((card) => [card.number, grade(card)])));
  if (behaviour === "none") answer("I could not grade these records.");
  else if (behaviour === "partial") answer(JSON.stringify({ 1: 1 }));
  else if (behaviour === "invalid") answer(graded((card) => (card.number === "1" ? 7 : 1)));
  else if (behaviour === "slow") { await new Promise((resolve) => setTimeout(resolve, 20000)); answer(graded(() => 1)); }
  else if (behaviour === "title") answer(graded((card) => Number(/\\(g([012])\\)/.exec(card.line)?.[1] ?? 0)));
  else answer(graded(() => Number(behaviour.split(":")[1])));
}
`;

// ---------------------------------------------------------------- the fixture ----

const EDGES = Object.freeze({
  "continue-developer": { actor: "developer", scope: { kind: "near-miss" } },
  "refine-architect": { actor: "architect", scope: { area: "architecture" } },
  "refine-po": { actor: "product-owner", scope: {} },
  "verify-finding": { actor: "verifier", scope: { kind: "finding" } },
});
const TOPICS = ["worktree junction", "lock file", "render drift", "session token", "ledger row"];

// A scratch project: five topics, and for each one a near-miss lesson and an architecture lesson
// whose TITLE carries the topic (so each ranks first for its topic's query, and is marked (g2)),
// eight more lessons that only mention it (marked (g0)), and two findings. Its ledgers hold
// `perEdge` recalls for each of the four block edges, spread over three items.
async function makeReplayProject({ perEdge = 15, memory = { backend: "local" } } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-201-03-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-201-03-home-"));
  const scratch = await mkdtemp(path.join(os.tmpdir(), "aof-201-03-scratch-"));
  const standIn = path.join(scratch, "claude-stand-in.mjs");
  await writeFile(standIn, STAND_IN_SOURCE, "utf8");
  const emptyPath = path.join(scratch, "empty-path");
  await mkdir(emptyPath);
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const writeConfig = (node) => writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, ...(node ? { memory: node } : {}) }, null, 2)}\n`, "utf8");
  await writeConfig(memory);

  const work = path.join(root, "wiki", "work");
  const items = {};
  for (const [number, slug] of [["39", "records"], ["40", "asks"], ["41", "more-asks"]]) {
    items[number] = path.join(work, `${number}_milestone_${slug}`);
    await mkdir(items[number], { recursive: true });
    await writeFile(path.join(items[number], "SPEC.md"), `---\ntype: milestone\nnumber: ${number}\nslug: ${slug}\nstatus: in-progress\ntitle: "Fixture ${number}"\ncreated: 2026-11-17\nupdated: 2026-11-17\nschema: 1\n---\n# ${number} · Fixture\n`, "utf8");
  }

  const lessons = [];
  const lesson = (title, kind, area, happened) => {
    lessons.push([`## R${lessons.length + 1} — ${title}`, "", `- **Kind:** ${kind} · **Area:** ${area} · **Stage:** build · **Owner:** developer`, `- **What happened:** ${happened}`, ""].join("\n"));
  };
  for (const topic of TOPICS) {
    lesson(`The ${topic} was torn down twice (g2)`, "near-miss", "tooling", `The ${topic} cleanup ran again after the ${topic} was gone.`);
    lesson(`One home for the ${topic} (g2)`, "near-miss", "architecture", `The ${topic} had two writers until the ${topic} was given one home.`);
    for (let n = 1; n <= 8; n += 1) {
      lesson(`Unrelated cleanup ${topic.split(" ")[0]} ${n} (g0)`, "near-miss", n % 2 === 0 ? "architecture" : "tooling", `A step of the suite also touched the ${topic}${", and the suite ran again".repeat(n)}.`);
    }
  }
  await writeFile(path.join(items["39"], "RETROSPECTIVE.md"), ["---", "doc: retrospective", "---", "# 39 · Fixture — Retrospective", "", ...lessons].join("\n"), "utf8");
  const findings = TOPICS.flatMap((topic, index) => [
    `| F-${String(index * 2 + 1).padStart(2, "0")} | major | continue | fixed | the ${topic} was left behind after teardown (g2) |`,
    `| F-${String(index * 2 + 2).padStart(2, "0")} | minor | verify | open | a note mentions the ${topic} in passing (g0) |`,
  ]);
  await writeFile(path.join(items["39"], "VERIFICATION.md"), ["# 39 · Verification", "", "## Findings", "", "| id | severity | stage | status | finding |", "|----|----------|-------|--------|---------|", ...findings, ""].join("\n"), "utf8");

  // The ledgers: `perEdge` recalls per edge, each asking about one topic in its edge's own scope.
  const ledgers = { 39: [], 40: [], 41: [] };
  const recalls = [];
  for (const [edge, { actor, scope }] of Object.entries(EDGES)) {
    for (let n = 0; n < perEdge; n += 1) {
      const row = { kind: "recall", id: `${edge}-${String(n + 1).padStart(2, "0")}`, at: "2026-11-10T12:00:00Z", edge, actor, query: `${TOPICS[n % TOPICS.length]} teardown`, scope, records: [] };
      recalls.push(row);
      ledgers[39 + (recalls.length % 3)].push(row);
    }
  }
  const writeLedgers = async () => {
    for (const [number, rows] of Object.entries(ledgers)) await writeFile(path.join(items[number], "FEEDBACK.ndjson"), rows.map((row) => `${JSON.stringify(row)}\n`).join(""), "utf8");
  };
  await writeLedgers();

  let runs = 0;
  const baseEnv = (logFile, plan, claude) => {
    const env = { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1", REPLAY_STAND_IN_LOG: logFile, REPLAY_STAND_IN_PLAN: JSON.stringify(plan) };
    delete env[PICK_EXECUTABLE];
    if (claude === "stand-in") env[PICK_EXECUTABLE] = standIn;
    else env.PATH = emptyPath;
    return env;
  };
  const DEFAULT_PLAN = { pick: ["[1]"], judge: ["all:1"] };
  // Run the script here. `claude: "none"` names no stand-in and empties PATH, so no `claude` resolves.
  // Answers the exit status, both streams, the report (text and path) and the stand-in's log.
  // With no `--out` among the arguments the report goes to a directory of this run's own, unless
  // `out: false` leaves the script to choose.
  async function replay(args, { plan = {}, claude = "stand-in", out: ownOut = true } = {}) {
    const logFile = path.join(scratch, `stand-in-${runs += 1}.log`);
    const out = !ownOut || args.includes("--out") ? null : path.join(scratch, `out-${runs}`);
    const result = spawnCliSync(process.execPath, [SCRIPT, ...args, ...(out ? ["--out", out] : [])], { cwd: root, encoding: "utf8", env: baseEnv(logFile, { ...DEFAULT_PLAN, ...plan }, claude) });
    const stdout = result.stdout ?? "";
    const reportPath = /^report: (.+)$/mu.exec(stdout)?.[1] ?? null;
    const report = reportPath ? await readFile(reportPath, "utf8") : null;
    const log = (await readFile(logFile, "utf8").catch(() => "")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
    return { status: result.status, stdout, stderr: result.stderr ?? "", report, reportPath, log, picks: log.filter((entry) => entry.kind === "pick"), judges: log.filter((entry) => entry.kind === "judge") };
  }
  // Run the CLI here against the same stand-in, for what `aof memory recall` itself answers.
  function cli(args, { plan = {} } = {}) {
    const result = spawnCliSync(process.execPath, [cliPath, ...args], { cwd: root, encoding: "utf8", env: baseEnv(path.join(scratch, `cli-${runs += 1}.log`), { ...DEFAULT_PLAN, ...plan }, "stand-in") });
    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  }
  if (memory?.backend) assert.equal(cli(["memory", "ingest"]).status, 0, "the fixture ingests");
  const dispose = async () => { for (const dir of [root, home, scratch]) await rm(dir, { recursive: true, force: true }); };
  return { root, home, scratch, work, items, ledgers, recalls, writeLedgers, writeConfig, replay, cli, dispose };
}

// One project shared by the cases that only read it: building and ingesting it is the slow part.
let shared = null;
const sharedProject = async () => (shared ??= await makeReplayProject());

async function withProject(options, body) {
  const fx = await makeReplayProject(options);
  try { await body(fx); } finally { await fx.dispose(); }
}

// ------------------------------------------------------------ reading a report ----

// A markdown table under a heading, as rows of cells keyed by the header's names.
function tableUnder(report, heading) {
  const lines = report.split("\n");
  const start = lines.findIndex((line) => line === heading);
  assert.ok(start >= 0, `the report has the section "${heading}"`);
  const first = lines.findIndex((line, index) => index > start && line.startsWith("| "));
  const cells = (line) => line.split(/(?<!\\)\|/u).slice(1, -1).map((text) => text.trim());
  const header = cells(lines[first]);
  const rows = [];
  for (let at = first + 2; at < lines.length && lines[at].startsWith("| "); at += 1) rows.push(Object.fromEntries(cells(lines[at]).map((text, index) => [header[index], text])));
  return rows;
}
const replayedRows = (report) => tableUnder(report, "## Recalls replayed");
const shownRows = (report) => tableUnder(report, "## What each block handed over");
const gradedRows = (report) => tableUnder(report, "## What the judge made of each block");
const replayedIds = (report) => replayedRows(report).map((row) => row.recall);
// The records of one replayed recall, from its section: [{ record, lexical, shipped, grade }].
function recordsOf(report, number) {
  const lines = report.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`### ${number} · `));
  assert.ok(start >= 0, `the report has a section for recall ${number}`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("### "));
  const section = lines.slice(start, end < 0 ? lines.length : end).join("\n");
  return section.includes("| record |") ? tableUnder(section, lines[start]) : [];
}
const blockOf = (records, block) => records.filter((row) => row[block] !== "").sort((a, b) => Number(a[block]) - Number(b[block])).map((row) => row.record);

// Every file under a folder → its bytes.
async function treeSnapshot(dir) {
  const snapshot = new Map();
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else snapshot.set(path.relative(dir, full), (await readFile(full)).toString("base64"));
    }
  }
  await walk(dir);
  return snapshot;
}

// ------------------------------------------------- results for the arithmetic ----

// `recalls` graded recalls whose blocks hold, in total, the given counts of records graded 0 and
// graded 2 — spread as evenly as whole records allow. The two blocks share no record.
function gradedResults({ recalls = 10, edge = "continue-developer", lexical, shipped }) {
  const share = (total, index) => Math.floor(total / recalls) + (index < total % recalls ? 1 : 0);
  return Array.from({ length: recalls }, (_, index) => {
    const grades = new Map();
    const block = (name, { noise, strong }) => {
      const ids = [];
      for (let n = 0; n < share(noise, index); n += 1) { ids.push(`${name}/lesson/N${index}-${n}`); grades.set(ids.at(-1), 0); }
      for (let n = 0; n < share(strong, index); n += 1) { ids.push(`${name}/lesson/S${index}-${n}`); grades.set(ids.at(-1), 2); }
      return ids;
    };
    return { edge, lexical: block("lexical", lexical), shipped: block("shipped", shipped), degraded: false, grades };
  });
}
const directionFor = (lexical, shipped) => directionOf(scoreReplay(gradedResults({ lexical, shipped })).overall);
// Per-recall averages over ten recalls, as record totals: 1.3 per recall is 13 records.
const per10 = (noise, strong) => ({ noise: Math.round(noise * 10), strong: Math.round(strong * 10) });

// A record identity as its block line opens: `39/lesson/R41` is `R41 (m39)`.
const lineHead = (identity) => { const [item, , id] = identity.split("/"); return `${id} (m${item})`; };
// The identities of a block the CLI printed, read from the head of each line.
const headsOf = (stdout) => stdout.split("\n").filter(Boolean).map((line) => line.split(" · ")[0]);
const overallOf = (rows) => rows.find((row) => row.edge === "overall");

export const recallReplayTests = [
  // ===================================================================
  // 00_the-replay-runs-each-recorded-recall-twice.feature — R1
  // ===================================================================
  {
    name: "201/03 task 00 E1 + outline (seed 177 | seed 178 | no arguments) · a seeded sample is the same sample every time: two runs of --sample 40 --seed 177 replay the same 40 in the same order, seed 178 replays a different 40, and no arguments replays 40 with the seed 177",
    run: async () => {
      const fx = await sharedProject();
      const first = await fx.replay(["--sample", "40", "--seed", "177"]);
      const second = await fx.replay(["--sample", "40", "--seed", "177"]);
      for (const ran of [first, second]) {
        assert.equal(replayedIds(ran.report).length, 40, `each run replays 40 recalls (stderr: ${ran.stderr})`);
        assert.equal(new Set(replayedIds(ran.report)).size, 40, "…and they are 40 different recalls");
        assert.equal(ran.picks.length, 40, "one pick was asked per recall");
      }
      assert.deepEqual(replayedIds(second.report), replayedIds(first.report), "both runs replay the same 40, in the same order");

      const other = await fx.replay(["--sample", "40", "--seed", "178"]);
      assert.equal(replayedIds(other.report).length, 40, "seed 178 replays 40 recalls");
      assert.notDeepEqual([...replayedIds(other.report)].sort(), [...replayedIds(first.report)].sort(), "…and not the same 40 as seed 177");

      const bare = await fx.replay([]);
      assert.deepEqual(replayedIds(bare.report), replayedIds(first.report), "with no arguments it replays the 40 that --sample 40 --seed 177 replays");
      assert.match(bare.report, /^- Sample: 40 · seed: 177 · edge: every block edge$/mu, "…and the report names the sample 40 and the seed 177");
      assert.match(bare.stdout, /^replayed 40 of 60 recorded recalls \(seed 177\)$/mu);
    },
  },
  {
    name: "201/03 task 00 E1 (the arithmetic) · the seed decides the sample and nothing else does: the same recalls in another order select the same sample, and --edge narrows before the cut",
    run: () => {
      const recalls = Array.from({ length: 60 }, (_, index) => ({ id: `r-${String(index).padStart(2, "0")}`, edge: index % 2 === 0 ? "refine-po" : "continue-developer" }));
      const ids = (selection) => selection.selected.map((recall) => recall.id);
      const picked = selectRecalls(recalls, { sample: 40, seed: 177 });
      assert.equal(picked.selected.length, 40);
      assert.deepEqual(ids(selectRecalls(recalls, { sample: 40, seed: 177 })), ids(picked), "one seed, one sample");
      assert.notDeepEqual(ids(selectRecalls(recalls, { sample: 40, seed: 178 })), ids(picked), "another seed, another sample");
      const narrowed = selectRecalls(recalls, { edge: "refine-po", sample: 40, seed: 177 });
      assert.deepEqual([narrowed.selected.length, narrowed.candidates, narrowed.sampleLarger], [30, 30, true], "an edge with 30 recalls replays all 30, and says the sample was larger");
      assert.ok(narrowed.selected.every((recall) => recall.edge === "refine-po"));
    },
  },
  {
    name: "201/03 task 00 E2 · a recall is replayed in the scope it was recorded with: a verify-finding recall's two blocks hold only findings, and both were asked with the recorded query, verbatim",
    run: async () => {
      const fx = await sharedProject();
      const ran = await fx.replay(["--edge", "verify-finding", "--sample", "3"], { plan: { pick: ["[1, 2]"] } });
      const rows = replayedRows(ran.report);
      assert.equal(rows.length, 3);
      for (const [index, row] of rows.entries()) {
        assert.equal(row.scope, '`{"kind":"finding"}`', "the recall is replayed with its recorded scope");
        const records = recordsOf(ran.report, index + 1);
        assert.equal(blockOf(records, "lexical").length, 5, "the lexical block is full");
        assert.equal(blockOf(records, "shipped").length, 2, "the shipped block is the two picked");
        assert.ok(records.every((record) => record.record.split("/")[1] === "finding"), `both blocks hold only findings (${records.map((record) => record.record).join(", ")})`);
        const recorded = fx.recalls.find((recall) => recall.id === row.recall);
        assert.ok(ran.picks[index].stdin.includes(`\nQuery: ${recorded.query}\n`), "the pick was asked with the recorded query, verbatim");
      }

      // Both asks, seen at the door: the recorded query and scope untouched, the pick off for the first.
      const calls = [];
      const invoke = async (id, input, ctx) => { calls.push({ id, input, ctx }); return { result: { records: [{ item: "39", recordType: "finding", id: "F-01" }], pick: { mode: "model", code: null } } }; };
      const workspace = { workDir: "/nowhere", config: { name: "fixture", memory: { backend: "local" } } };
      const recall = { id: "x", edge: "verify-finding", query: "  the cap is  STALE — again ", scope: { kind: "finding" } };
      const replayed = await replayRecall(recall, { invoke, workspace, scopeFlags: ["kind", "area", "item"] });
      assert.deepEqual(calls.map((call) => call.id), ["memory", "memory"], "the recall is asked twice, through the memory command");
      for (const call of calls) {
        assert.equal(call.input.query, recall.query, "the recorded query, verbatim");
        assert.deepEqual(call.input.scope, { kind: "finding" }, "the recorded scope");
        assert.deepEqual([call.input.verb, call.input.block, call.input.opts], ["recall", true, {}], "a block recall at the default cap");
      }
      assert.equal(calls[0].ctx.workspace.config.memory.recall.pick.enabled, false, "the lexical block is asked with the pick off");
      assert.equal(calls[1].ctx.workspace, workspace, "the shipped block is asked with the project's config as loaded");
      assert.deepEqual(workspace.config, { name: "fixture", memory: { backend: "local" } }, "…which turning the pick off did not write to");
      assert.deepEqual(withPickOff({ config: { memory: { backend: "local", recall: { pick: { model: "sonnet" } } } } }).config.memory, { backend: "local", recall: { pick: { model: "sonnet", enabled: false } } });
      assert.deepEqual(replayed.shipped.map(recordIdentity), ["39/finding/F-01"]);

      // A scope this build does not filter by is refused, never asked wider.
      calls.length = 0;
      const refused = await replayRecall({ ...recall, scope: { colour: "red" } }, { invoke, workspace, scopeFlags: ["kind", "area", "item"] });
      assert.match(refused.unreplayable, /"colour"/u);
      assert.equal(calls.length, 0, "…and nothing was asked");
    },
  },
  {
    name: "201/03 task 00 E3 · one edge can be replayed on its own: --edge continue-developer replays only that edge's recalls",
    run: async () => {
      const fx = await sharedProject();
      const ran = await fx.replay(["--edge", "continue-developer"]);
      const rows = replayedRows(ran.report);
      assert.equal(rows.length, 15, "all 15 of the edge's recalls");
      assert.ok(rows.every((row) => row.edge === "continue-developer"), "every replayed recall has the edge continue-developer");
      assert.deepEqual(shownRows(ran.report).map((row) => row.edge), ["continue-developer", "overall"]);
    },
  },
  {
    name: "201/03 task 00 E4 + outline (--sample 500) + a recall recorded twice · a whole-history recall is left out and the report says how many and why; a sample larger than the ledgers replays all 60 and says so; an id on two ledgers is replayed once",
    run: () => withProject({}, async (fx) => {
      fx.ledgers[40].push({ kind: "recall", id: "episodic-01", at: "2026-11-10T12:00:00Z", edge: "continue-episodic", actor: "developer", query: "", scope: { item: "40", area: "delivery" }, records: [] });
      fx.ledgers[41].push({ kind: "recall", id: "evidence-01", at: "2026-11-10T12:00:00Z", edge: "retrospective-evidence", actor: "product-owner", query: "", scope: { item: "41", area: "delivery" }, records: [] });
      // The same recall on a second item's ledger, as a shatter's first driver and a citing one hold it.
      const twice = fx.ledgers[39][0];
      fx.ledgers[41].push(twice);
      await fx.writeLedgers();

      const collected = await collectRecalls(fx.work);
      assert.deepEqual([collected.recorded, collected.recalls.length, collected.repeated], [63, 62, 1], "63 rows on the ledgers are 62 recalls");

      const ran = await fx.replay(["--sample", "500"]);
      const ids = replayedIds(ran.report);
      assert.equal(ids.length, 60, "all 60 block recalls are replayed");
      assert.equal(ids.includes("episodic-01") || ids.includes("evidence-01"), false, "neither whole-history recall is replayed");
      assert.match(ran.report, /^- Left out: 2 whole-history recall\(s\) \(continue-episodic 1, retrospective-evidence 1\)\. They asked with `--all` for an item's whole history and were never a block\.$/mu, "the report says how many it left out, and why");
      assert.match(ran.report, /^- The sample was larger than the ledgers: 500 were asked for and all 60 were replayed\.$/mu, "the report says the sample was larger than the ledgers");
      assert.match(ran.stdout, /the sample of 500 was larger than the ledgers/u);
      assert.equal(ids.filter((id) => id === twice.id).length, 1, "the recall recorded twice is replayed once");
      assert.equal(new Set(ids).size, 60);
      assert.match(ran.report, /^- Recorded twice: 1 recall row\(s\)/mu);

      // Asked for by name, a whole-history edge replays nothing and says why.
      const named = await fx.replay(["--edge", "continue-episodic"]);
      assert.equal(named.report, null);
      assert.match(named.stderr, /"continue-episodic" asks for an item's whole history and is never a block/u);
    }),
  },
  {
    name: "201/03 task 00 E5 · the replay leaves what it reads untouched: every FEEDBACK.ndjson and the memory index are byte for byte what they were, and the only file written is the report",
    run: async () => {
      const fx = await sharedProject();
      const out = path.join(fx.scratch, "e5-out");
      const [project, home] = [await treeSnapshot(fx.root), await treeSnapshot(fx.home)];
      assert.ok([...project.keys()].filter((file) => file.endsWith("FEEDBACK.ndjson")).length === 3 && project.has(path.join(".aof", "aof.memory.index.json")), "guard: the snapshot holds the three ledgers and the memory index");
      const ran = await fx.replay(["--sample", "6", "--out", out]);
      assert.equal(replayedIds(ran.report).length, 6);
      assert.deepEqual(await treeSnapshot(fx.root), project, "nothing under the project changed, and nothing appeared: the ledgers and the index are byte for byte what they were");
      assert.deepEqual(await treeSnapshot(fx.home), home, "nothing under the global home changed");
      assert.deepEqual(await readdir(out), [path.basename(ran.reportPath)], "the only file written is the report");
    },
  },
  {
    name: "201/03 task 00 outline (--sample 0 | --edge no-such-edge) · --sample 0 is refused naming --sample as a positive whole number, and an edge no recall has replays nothing and says so; neither asks a model",
    run: async () => {
      const fx = await sharedProject();
      const zero = await fx.replay(["--sample", "0"]);
      assert.equal(zero.status, 3, "a refusal has its own exit code");
      assert.match(zero.stderr, /--sample takes a positive whole number/u);
      const none = await fx.replay(["--edge", "no-such-edge"]);
      assert.notEqual(none.status, 0);
      assert.match(none.stderr, /Nothing was replayed: no recorded recall has the edge "no-such-edge"\./u);
      for (const ran of [zero, none]) assert.deepEqual([ran.report, ran.log.length], [null, 0], "no report is written and no model is asked");

      for (const [argv, message] of [[["--sample", "4.5"], /--sample takes a positive whole number/u], [["--sample"], /--sample takes a positive whole number/u], [["--seed", "x"], /--seed takes a whole number/u], [["--edge"], /--edge takes a value/u], [["--nope"], /Unknown argument "--nope"/u]]) {
        assert.throws(() => parseReplayArgs(argv), message);
      }
      assert.deepEqual(parseReplayArgs([]), { sample: 40, seed: 177, edge: null, out: null, judgeModel: "opus", judgeTimeoutMs: 120000, help: false }, "the defaults: 40 recalls, the seed 177, an opus judge");
    },
  },
  {
    name: "201/03 task 00 · each recall is replayed as both blocks: the lexical block is the 5 best-ranked records in scope with no claude started for it, and the shipped block is what aof memory recall --block prints for that query and scope",
    run: async () => {
      const fx = await sharedProject();
      const plan = { pick: ["[4, 2]"] };
      const ran = await fx.replay(["--edge", "refine-architect", "--sample", "1"], { plan });
      const [row] = replayedRows(ran.report);
      const recorded = fx.recalls.find((recall) => recall.id === row.recall);
      const records = recordsOf(ran.report, 1);

      const ranked = JSON.parse(fx.cli(["memory", "recall", recorded.query, "--area", "architecture", "--all", "--json"]).stdout);
      assert.ok(ranked.length > 5, "guard: more than 5 records are in scope");
      assert.deepEqual(blockOf(records, "lexical"), ranked.slice(0, 5).map(recordIdentity), "the lexical block is the 5 best-ranked records in scope");
      assert.deepEqual([ran.picks.length, ran.judges.length], [1, 1], "one claude was started for the shipped block and one for the judge: none for the lexical block");

      const printed = fx.cli(["memory", "recall", recorded.query, "--area", "architecture", "--block"], { plan });
      assert.equal(printed.status, 0);
      assert.deepEqual(blockOf(records, "shipped").map(lineHead), headsOf(printed.stdout), "the shipped block is what `aof memory recall … --block` prints for that query and scope");
      assert.deepEqual(blockOf(records, "shipped"), [ranked[3], ranked[1]].map(recordIdentity), "…the two cards picked, in the picker's order");
    },
  },

  // ===================================================================
  // 01_the-report-shows-what-each-block-handed-over.feature — R2
  // ===================================================================
  {
    name: "201/03 task 01 E6 + the report says what it was run with · a stand-in that picks 2 cards for half the recalls and none for the rest: one row per edge and one overall, each with records shown per recall and empty blocks for both blocks and degraded recalls for the shipped one; the report names the sample, the seed, both models and the date, how many recalls the ledgers held and how many were replayed, and that the pick is not repeatable",
    run: async () => {
      const fx = await sharedProject();
      const ran = await fx.replay(["--sample", "40", "--seed", "177"], { plan: { pick: ["[1, 2]", "[]"] } });
      const rows = shownRows(ran.report);
      const edges = [...new Set(replayedRows(ran.report).map((row) => row.edge))].sort();
      assert.deepEqual(rows.map((row) => row.edge), [...edges, "overall"], "one row per edge replayed and one overall row");
      assert.equal(edges.length, 4);
      for (const row of rows) {
        for (const column of ["lexical shown/recall", "shipped shown/recall"]) assert.match(row[column], /^\d+\.\d\d$/u, `${row.edge}: ${column} is given`);
        for (const column of ["recalls", "lexical empty", "shipped empty", "degraded"]) assert.match(row[column], /^\d+$/u, `${row.edge}: ${column} is given`);
      }
      assert.deepEqual(overallOf(rows), { edge: "overall", recalls: "40", "lexical shown/recall": "5.00", "shipped shown/recall": "1.00", "lexical empty": "0", "shipped empty": "20", degraded: "0" }, "20 recalls of 2 and 20 of none are 1.00 per recall and 20 empty blocks");
      assert.equal(rows.slice(0, -1).reduce((sum, row) => sum + Number(row.recalls), 0), 40, "the edges' rows add up to the overall row");

      // What it was run with.
      assert.match(ran.report, /^- Sample: 40 · seed: 177 · edge: every block edge$/mu, "the sample size and the seed");
      assert.match(ran.report, /^- Pick model: haiku \(default\) · time limit 20000 ms$/mu, "the pick's model");
      assert.match(ran.report, /^- Judge model: opus · time limit 120000 ms$/mu, "the judge's model");
      assert.match(ran.report, /^- Date: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/mu, "the date");
      assert.match(ran.report, /^- Recorded recalls on the ledgers: 60 · replayed: 40$/mu, "how many the ledgers held and how many were replayed");
      assert.match(ran.report, /^- The pick is not repeatable\. A model makes it, and a model grades it: a second run with this seed replays the same recalls and may report different figures\.$/mu, "that a second run may differ");
      // …and the two calls really were made at those two models.
      assert.deepEqual([[...new Set(ran.picks.map((entry) => entry.model))], [...new Set(ran.judges.map((entry) => entry.model))]], [["haiku"], ["opus"]]);
    },
  },
  {
    name: "201/03 task 01 E7 · a node that cannot pick is told no direction can be read: with no claude on PATH all 40 recalls are degraded, the report says direction: unreadable and that every shipped block was the lexical block, and the exit code is not 0",
    run: async () => {
      const fx = await sharedProject();
      const ran = await fx.replay(["--sample", "40"], { claude: "none" });
      assert.equal(ran.status, 2, "no direction is its own exit code, and not 0");
      assert.equal(ran.log.length, 0, "no process was started");
      assert.deepEqual([overallOf(shownRows(ran.report)).recalls, overallOf(shownRows(ran.report)).degraded], ["40", "40"], "the report counts all 40 recalls as degraded");
      assert.match(ran.report, /^direction: unreadable$/mu);
      assert.match(ran.report, /all 40 recalls were degraded, so every shipped block was the lexical block and there is nothing to compare\./u);
      assert.equal(overallOf(shownRows(ran.report))["shipped shown/recall"], "5.00", "each shipped block is the lexical 5");
      assert.ok(replayedRows(ran.report).every((row) => row["shipped block"] === "degraded (pick-unavailable)"), "each recall names the miss");
    },
  },
  ...[
    ["picks 2 cards every time", ["[1, 2]"], "2.00", "0", "0"],
    ['answers "[]" every time', ["[]"], "0.00", "10", "0"],
    ["picks 3 cards for 5 and fails for 5", ["[1, 2, 3]", "FAIL"], "4.00", "0", "5"],
    ["picks 5 cards for 4 and none for 6", [...Array(4).fill("[1, 2, 3, 4, 5]"), ...Array(6).fill("[]")], "2.00", "6", "0"],
  ].map(([behaviour, pick, shown, empty, degraded]) => ({
    name: `201/03 task 01 outline · what a row reports — the stand-in ${behaviour} for an edge's 10 replayed recalls: ${shown} records per recall for the shipped block, ${empty} empty shipped blocks and ${degraded} degraded recalls`,
    run: async () => {
      const fx = await sharedProject();
      const ran = await fx.replay(["--edge", "continue-developer", "--sample", "10"], { plan: { pick } });
      const row = shownRows(ran.report).find((each) => each.edge === "continue-developer");
      assert.deepEqual([row.recalls, row["shipped shown/recall"], row["shipped empty"], row.degraded], ["10", shown, empty, degraded]);
      assert.equal(row["lexical shown/recall"], "5.00", "the lexical block is never picked from");
    },
  })),
  {
    name: "201/03 task 01 · the report is written where it is asked, and nowhere in the work tree by default: under --out's directory, and with no --out outside the work directory, at a path the run prints",
    run: async () => {
      const fx = await sharedProject();
      const out = path.join(fx.scratch, "asked-for", "nested");
      const asked = await fx.replay(["--edge", "refine-po", "--sample", "1", "--out", out]);
      assert.equal(path.dirname(asked.reportPath), out, "the report is written under the directory asked for");

      const before = await treeSnapshot(fx.root);
      const bare = await fx.replay(["--edge", "refine-po", "--sample", "1"], { out: false });
      try {
        assert.ok(bare.reportPath, "the path is printed");
        assert.match(bare.report, /^direction: /mu, "…and it is the report");
        const inside = path.relative(fx.work, bare.reportPath);
        assert.ok(inside.startsWith("..") || path.isAbsolute(inside), `the report is outside the work directory (${bare.reportPath})`);
        assert.deepEqual(await treeSnapshot(fx.root), before, "nothing was written anywhere in the project");
      } finally {
        if (bare.reportPath) await rm(bare.reportPath, { force: true });
      }
    },
  },

  // ===================================================================
  // 02_a-judge-grades-both-blocks.feature — R3
  // ===================================================================
  {
    name: "201/03 task 02 E8 · the judge is asked once per recall, about every record either block showed: a lexical block of 5 and a shipped block of 2 of those 5 make one request about those 5 records, the query and the edge, which does not say which block showed which, and each record is graded 0, 1 or 2",
    run: async () => {
      const fx = await sharedProject();
      const ran = await fx.replay(["--edge", "refine-po", "--sample", "1"], { plan: { pick: ["[1, 3]"], judge: ["title"] } });
      const [row] = replayedRows(ran.report);
      const recorded = fx.recalls.find((recall) => recall.id === row.recall);
      const records = recordsOf(ran.report, 1);
      const lexical = blockOf(records, "lexical");
      assert.deepEqual([lexical.length, blockOf(records, "shipped")], [5, [lexical[0], lexical[2]]], "the lexical block shows 5 records and the shipped block 2 of those 5");

      assert.equal(ran.judges.length, 1, "the judge was asked once for that recall");
      const request = ran.judges[0].stdin;
      assert.ok(request.includes(`\nEdge: refine-po\nQuery: ${recorded.query}\nGrade each of the 5 cards below.\n`), "it was asked about the query, the recall's edge and 5 records");
      const cards = [...request.matchAll(/^\[(\d+)\] (.+?) · /gmu)].map((match) => match[2]);
      assert.deepEqual([...cards].sort(), lexical.map(lineHead).sort(), "…those 5 records");
      assert.equal(/lexical|shipped|\bblock\b/iu.test(request), false, "it was not told which block showed which record");
      assert.notDeepEqual(cards, lexical.map(lineHead), "…and the cards are not in the lexical block's order");
      assert.ok(/product owner about to break a piece of work into stories/u.test(request), "the judge is told who was deciding");

      assert.equal(records.length, 5);
      for (const record of records) assert.match(record.grade, /^[012]$/u, `${record.record} has a grade of 0, 1 or 2`);
      assert.deepEqual(records.map((record) => record.grade), records.map((record) => /\(g([012])\)/u.exec(record.title)[1]), "each grade is the one the judge gave that record, whatever order it was asked in");
    },
  },
  {
    name: "201/03 task 02 E8 (the request, undriven) · the pool is every record either block showed, once, in an order the seed fixes; two empty blocks ask no judge; an answer is read by card number",
    run: async () => {
      const record = (id) => ({ item: "39", recordType: "lesson", id, title: `Title ${id}`, text: `Text ${id}` });
      const replayed = { lexical: ["R1", "R2", "R3", "R4", "R5"].map(record), shipped: ["R3", "R9"].map(record) };
      const pool = poolRecords(replayed, 7);
      assert.deepEqual(pool.map((each) => each.id).sort(), ["R1", "R2", "R3", "R4", "R5", "R9"], "six records: R3 is in both blocks and is asked about once");
      assert.deepEqual(poolRecords({ lexical: [...replayed.lexical].reverse(), shipped: replayed.shipped }, 7).map((each) => each.id), pool.map((each) => each.id), "the order is the seed's, whatever order the blocks hold them in");

      const asked = [];
      const ask = async (request) => { asked.push(request); return { outcome: "answered", text: `Here: ${JSON.stringify(Object.fromEntries(pool.map((_, index) => [index + 1, index % 3])))}` }; };
      const graded = await gradeRecall({ recall: { edge: "continue-developer", query: "q" }, replayed, seed: 7 }, { ask, lineOf: (each) => `${each.id} line` });
      assert.equal(asked.length, 1);
      assert.deepEqual([...graded.grades], pool.map((each, index) => [recordIdentity(each), index % 3]), "each record takes the grade given to its card number");

      asked.length = 0;
      const empty = await gradeRecall({ recall: { edge: "refine-po", query: "q" }, replayed: { lexical: [], shipped: [] }, seed: 7 }, { ask, lineOf: () => "" });
      assert.deepEqual([asked.length, empty.grades.size, empty.asked], [0, 0, false], "two empty blocks are graded as showing nothing, and the judge is not asked");
    },
  },
  {
    name: "201/03 task 02 E9 · less noise and no fewer decision-changing records is the direction holding: 2.0 graded 0 and 1.3 graded 2 per recall for the lexical block against 0.7 and 1.6 for the shipped block says direction: holds, exit code 0",
    run: () => {
      const verdict = directionFor(per10(2.0, 1.3), per10(0.7, 1.6));
      assert.equal(`direction: ${verdict.direction}`, "direction: holds");
      assert.equal(exitCodeFor(verdict.direction), 0);
      assert.equal(verdict.why, "noise per recall fell from 2.00 to 0.70, and decision-changing records per recall went from 1.30 to 1.60.");
    },
  },
  {
    name: "201/03 task 02 E10 · fewer decision-changing records is the direction not holding, whatever the noise: 1.3 graded 2 per recall for the lexical block against 0.4 graded 0 and 0.9 graded 2 for the shipped block says direction: does not hold, names the decision-changing records as what fell with both figures, and exits non-zero",
    run: () => {
      const verdict = directionFor(per10(2.0, 1.3), per10(0.4, 0.9));
      assert.equal(`direction: ${verdict.direction}`, "direction: does not hold");
      assert.equal(verdict.why, "decision-changing records per recall fell from 1.30 to 0.90.", "it names what fell, with both figures, and not the noise, which fell too");
      assert.notEqual(exitCodeFor(verdict.direction), 0);
    },
  },
  ...[
    [2.0, 1.3, 0.7, 1.3, DIRECTION.holds],
    [2.0, 1.3, 2.0, 1.6, DIRECTION.doesNotHold],
    [2.0, 1.3, 2.1, 1.6, DIRECTION.doesNotHold],
    [2.0, 1.3, 0.0, 0.0, DIRECTION.doesNotHold],
    [0.0, 1.3, 0.0, 1.3, DIRECTION.doesNotHold],
  ].map(([lexicalNoise, lexicalStrong, shippedNoise, shippedStrong, direction]) => ({
    name: `201/03 task 02 outline · the direction, at its edges — lexical ${lexicalNoise.toFixed(2)} noise and ${lexicalStrong.toFixed(2)} decision-changing, shipped ${shippedNoise.toFixed(2)} and ${shippedStrong.toFixed(2)}: direction: ${direction}`,
    run: () => {
      const score = scoreReplay(gradedResults({ lexical: per10(lexicalNoise, lexicalStrong), shipped: per10(shippedNoise, shippedStrong) }));
      // Guard: the results really average what the row says.
      assert.deepEqual([score.overall.graded, score.overall.lexical.noise, score.overall.lexical.strong, score.overall.shipped.noise, score.overall.shipped.strong], [10, ...[lexicalNoise, lexicalStrong, shippedNoise, shippedStrong].map((value) => Math.round(value * 10))]);
      assert.equal(directionOf(score.overall).direction, direction);
    },
  })),
  {
    name: "201/03 task 02 E9 + E10 + the report carries 177's columns, driven · a replay whose shipped block keeps both strong records and drops the noise reports direction: holds and exits 0, with records graded 2, graded 1 or more and graded 0 per recall for each block and the strong hit out of the recalls where either block held one; a shipped block that drops a strong record reports direction: does not hold, names what fell and exits non-zero",
    run: async () => {
      const fx = await sharedProject();
      // For a near-miss recall the two best-ranked records carry the topic in their title (g2) and the next three do not (g0).
      const holds = await fx.replay(["--edge", "continue-developer", "--sample", "10"], { plan: { pick: ["[1, 2]"], judge: ["title"] } });
      assert.equal(holds.status, 0, `the exit code is 0 (stdout: ${holds.stdout})`);
      assert.match(holds.report, /^direction: holds$/mu);
      assert.match(holds.stdout, /^direction: holds$/mu);
      assert.deepEqual(overallOf(gradedRows(holds.report)), {
        edge: "overall", graded: "10", ungraded: "0",
        "lexical strong": "2.00", "shipped strong": "2.00", "lexical relevant": "2.00", "shipped relevant": "2.00", "lexical noise": "3.00", "shipped noise": "0.00",
        "lexical strong hit": "10/10", "shipped strong hit": "10/10",
      }, "each block's records graded 2, graded 1 or more and graded 0 per recall, and the recalls whose block held a record graded 2 out of those where either block held one");
      assert.match(holds.report, /noise per recall fell from 3\.00 to 0\.00, and decision-changing records per recall went from 2\.00 to 2\.00\./u);

      const falls = await fx.replay(["--edge", "continue-developer", "--sample", "10"], { plan: { pick: ["[3]"], judge: ["title"] } });
      assert.equal(falls.status, 1, "the exit code is not 0");
      assert.match(falls.report, /^direction: does not hold$/mu);
      assert.match(falls.report, /The direction does not hold: decision-changing records per recall fell from 2\.00 to 0\.00, and noise per recall did not fall|The direction does not hold: decision-changing records per recall fell from 2\.00 to 0\.00\./u, "it names the decision-changing records per recall as what fell, with both figures");
      assert.deepEqual([overallOf(gradedRows(falls.report))["lexical strong hit"], overallOf(gradedRows(falls.report))["shipped strong hit"]], ["10/10", "0/10"]);
    },
  },
  {
    name: "201/03 task 02 E11 · no model grades its own pick: with memory.recall.pick.model opus, --judge-model opus is refused before any model is asked, and says the judge and the pick must differ",
    run: () => withProject({ perEdge: 2, memory: { backend: "local", recall: { pick: { model: "opus" } } } }, async (fx) => {
      const ran = await fx.replay(["--judge-model", "opus"]);
      assert.equal(ran.status, 3);
      assert.match(ran.stderr, /The judge and the pick must differ: both are "opus"\./u);
      assert.deepEqual([ran.log.length, ran.report], [0, null], "no model was asked and no report was written");
      // The default judge is opus too, so the same project refuses with no flag at all…
      assert.match((await fx.replay([])).stderr, /The judge and the pick must differ/u);
      // …and a judge that differs runs.
      const other = await fx.replay(["--judge-model", "sonnet"]);
      assert.deepEqual([[...new Set(other.picks.map((entry) => entry.model))], [...new Set(other.judges.map((entry) => entry.model))]], [["opus"], ["sonnet"]]);

      // A project with the pick turned off has nothing to compare, and says so.
      await fx.writeConfig({ backend: "local", recall: { pick: { enabled: false } } });
      const off = await fx.replay([]);
      assert.equal(off.status, 3);
      assert.match(off.stderr, /The pick is turned off in this project \(memory\.recall\.pick\.enabled is false\)/u);
    }),
  },
  ...[
    ["does not answer in time", "slow", /the judge did not answer in time/u],
    ["answers with no grades in it", "none", /the judge's answer held no grades/u],
    ["grades only some of the records it was asked about", "partial", /the judge graded only some of the 5 records/u],
    ["gives a grade that is not 0, 1 or 2", "invalid", /the judge gave card 1 a grade that is not 0, 1 or 2/u],
  ].map(([behaviour, mode, reason]) => ({
    name: `201/03 task 02 outline · a judge that cannot answer does not pass for a grade — the judge ${behaviour} for 3 of 40 recalls: those 3 are reported as ungraded and left out of every average, and the report says 37 recalls were graded`,
    run: async () => {
      const fx = await sharedProject();
      const judge = Array.from({ length: 40 }, (_, index) => ([4, 17, 31].includes(index) ? mode : "all:1"));
      const ran = await fx.replay(["--sample", "40", "--judge-timeout-ms", "1500"], { plan: { pick: ["[1, 2]"], judge } });
      const rows = replayedRows(ran.report);
      const ungraded = rows.filter((row) => row.judge.startsWith("ungraded"));
      assert.deepEqual(ungraded.map((row) => row["#"]), ["5", "18", "32"], "those 3 recalls are reported as ungraded");
      for (const row of ungraded) assert.match(row.judge, reason, "…each with why");
      const overall = overallOf(gradedRows(ran.report));
      assert.deepEqual([overall.graded, overall.ungraded], ["37", "3"], "the report says 37 recalls were graded");
      // Every graded record is a 1, so 37 graded recalls average exactly 5.00 and 2.00 relevant: a
      // recall counted with no grades would pull either figure down.
      assert.deepEqual([overall["lexical relevant"], overall["shipped relevant"], overall["lexical noise"], overall["shipped noise"]], ["5.00", "2.00", "0.00", "0.00"], "the 3 are left out of every average");
      for (const row of ungraded) assert.ok(recordsOf(ran.report, Number(row["#"])).every((record) => record.grade === ""), "an ungraded recall's records carry no grade");
      assert.equal(overallOf(shownRows(ran.report)).recalls, "40", "all 40 are still counted as replayed");
    },
  })),
  {
    name: "201/03 task 02 outline (the reader) · a judge's answer is a grading only when every card has a grade of 0, 1 or 2",
    run: () => {
      assert.deepEqual(readGrades('{"1": 2, "2": 0, "3": 1}', 3), { grades: [2, 0, 1] });
      assert.deepEqual(readGrades('Grades:\n```json\n{"1": 0, "2": 2}\n```', 2), { grades: [0, 2] }, "a fenced object is read");
      assert.deepEqual(readGrades('{"1": 1, "2": 1, "9": 2}', 2), { grades: [1, 1] }, "a number outside the cards is ignored");
      for (const [answer, reason] of [
        ["I could not grade these.", /held no grades/u], ["[2, 0, 1]", /held no grades/u], [null, /held no grades/u],
        ['{"1": 2, "2": 0}', /only some of the 3/u], ['{"1": 2, "2": 0, "3": 3}', /card 3 a grade that is not/u], ['{"1": "2", "2": 0, "3": 1}', /card 1 a grade that is not/u], ['{"1": 1.5, "2": 0, "3": 1}', /card 1/u],
      ]) assert.match(readGrades(answer, 3).reason, reason, `${answer} is not a grading`);
    },
  },
  {
    name: "201/03 task 02 · a replay with nothing graded names no direction: a judge that answers for no recall reports direction: unreadable and exits non-zero",
    run: async () => {
      const fx = await sharedProject();
      const ran = await fx.replay(["--edge", "refine-architect", "--sample", "6"], { plan: { judge: ["none"] } });
      assert.equal(ran.status, 2);
      assert.match(ran.report, /^direction: unreadable$/mu);
      assert.match(ran.report, /No direction can be read: no recall was graded\./u);
      assert.deepEqual([overallOf(gradedRows(ran.report)).graded, overallOf(gradedRows(ran.report)).ungraded], ["0", "6"]);

      // The same answer from the arithmetic: nothing replayed, everything degraded, nothing graded.
      const result = (overrides) => ({ edge: "refine-po", lexical: ["a/lesson/1"], shipped: ["a/lesson/1"], degraded: false, grades: new Map([["a/lesson/1", 2]]), ...overrides });
      assert.equal(directionOf(scoreReplay([]).overall).direction, DIRECTION.unreadable);
      assert.equal(directionOf(scoreReplay([result({ degraded: true }), result({ degraded: true })]).overall).direction, DIRECTION.unreadable);
      assert.equal(directionOf(scoreReplay([result({ grades: null }), result({ grades: null })]).overall).direction, DIRECTION.unreadable);
      assert.equal(exitCodeFor(DIRECTION.unreadable), 2);
    },
  },
  {
    name: "201/03 · the shared scratch project is removed",
    run: async () => {
      if (shared) await (await shared).dispose();
      shared = null;
    },
  },
];
