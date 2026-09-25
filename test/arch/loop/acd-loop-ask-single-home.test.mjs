// FF-13101 + FF-13102 + FF-13103 — THE ASK HAS ONE HOME, ONE READER READS THE QUESTION, AND A
// WAITING RUN IS RECORDED RATHER THAN RECLAIMED OR CHARGED (milestone 131 / story 06; ARCHITECTURE
// `## Fitness functions`, ADR-001 §4, ADR-002, ADR-003). Which of this directory's three subjects:
// the RECORD — the ask file under the aof home, the question read off the transcript, and the
// `asks` key on the run record are the three records a human-in-the-loop leaves behind, and these
// are the controls on who may spell, read and write them.
//
// FF-13101, structural. Over a comment-stripped sweep of `src/**` the segment literal `loop-asks`
// appears only in `src/loop/ask-request.mjs`; no module joins `meshRoot` with an `ask` literal;
// `src/loop/ask.mjs`, `src/commands/resume.mjs` and `src/commands/list.mjs` import the home by
// RESOLVED specifier (through `test/support/module-family.mjs`, FF-11901's one extractor). The
// ask-state leg keys on `ASK_STATES` (defined in the home alone) and on an ask record's `state`
// compared against one of the three words — never on the bare English words, which this tree
// spells in unrelated vocabularies (`resume.mjs`'s retry row is `parked` too; task 00 ruling 6).
// The `asks` key is written only inside `openRunAsk`, `parkRunAsk` and `answerRunAsk`: the sweep
// of `src/run-store.mjs` (the one persister of a run record) allows exactly the mint's `asks: []`
// and the read-forward normaliser, and no `src/**` module mutates an `asks` array in place.
// Fixture: `answerAsk` refuses `answer-control-chars`, `answer-empty` and, on a second answer,
// `ask-already-answered`. NON-VACUOUS: the sweep finds the home and at least three importers.
//
// FF-13102, structural then fixture. `readLastAssistantTurn` is defined in `src/work/observe.mjs`
// and imported by name by the driver; `ask.mjs` reaches it through `readAskQuestion`, imported
// from `observe.mjs` by resolved specifier, and walks no transcript itself (task 00 ruling 2). No
// other `src/**` module both `JSON.parse`s and reads `stop_reason` — the driver's
// `defaultSpawnRuntime` is cut out first and named: it parses the headless runtime's ONE stdout
// document, never transcript lines. The driver's export set stays 17 (`53/FF-5302`), and
// `NEEDS_INPUT_INSTRUCTION` keeps the sentinel, the four labels and the threshold sentence.
//
// FF-13103, fixture. A minted record carries 17 keys with `asks` last and `[]`, and a 16-key one
// reads forward with `asks: []`. `transitionStaleRunsReclaimed` leaves a stale `running` run whose
// last ask is unanswered byte-unchanged and reclaims it once the ask is answered. A run that
// waited three hours on a human is charged what the same run is charged without the wait.
//
// Every sweep reports what it read (a rename, a moved directory or a truncated read must fail here
// rather than pass vacuously); every cut is on the language's own structure through
// `test/support/source-slice.mjs`.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { functionBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";
import { answerAsk, openAsk } from "../../../src/loop/ask-request.mjs";
import { answerRunAsk, readRuns, runRecordPath, startRun } from "../../../src/run-store.mjs";
import { transitionStaleRunsReclaimed } from "../../../src/effects/run-transitions.mjs";
import { attemptElapsedMs } from "../../../src/work/loop.mjs";
import { claudeProjectsDir, readAskQuestion, NEEDS_INPUT_SENTINEL } from "../../../src/work/observe.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const toPosix = (value) => String(value).split(path.sep).join("/");

// THE HOME and the three readers ADR-003 names. The needle is the module's repo-relative path as a
// resolved specifier lands on it — misspell it and zero importers resolve, which the non-vacuity leg
// reds on rather than passing over.
const HOME = "src/loop/ask-request.mjs";
const SEGMENT = "loop-asks";
const READERS = Object.freeze(["src/loop/ask.mjs", "src/commands/resume.mjs", "src/commands/list.mjs"]);
const STORE = "src/run-store.mjs";
const ASK_WRITERS = Object.freeze(["openRunAsk", "parkRunAsk", "answerRunAsk"]);
// Task 00 ruling 6: the two `asks:` keys that are the record's SHAPE, not a write of an ask.
const SHAPE_KEYS = Object.freeze([
  { fn: "buildRecord", text: "asks: []" },
  { fn: "normalizeRecord", text: "asks: Array.isArray(raw.asks) ? raw.asks : []" },
]);
const STATE_WORDS = Object.freeze(["waiting", "parked", "answered"]);
// The calls whose answer is an ask record — a binding of one is an ask record by construction.
const ASK_READS_RE = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:readAsk|readAsks|answerAsk|openAsk|parkAsk)\s*\(/gu;

const OBSERVE = "src/work/observe.mjs";
const DRIVER = "src/agent-session-driver.mjs";
const ASK = "src/loop/ask.mjs";
// The driver's one non-transcript parse: the headless runtime's stdout document (a codex run).
const STDOUT_PARSER = "export function defaultSpawnRuntime(";
const DRIVER_EXPORTS = 17; // 53/FF-5302
const FOUR_LABELS = Object.freeze(["Decision needed:", "Options:", "I would pick:", "What the answer changes:"]);
const THRESHOLD = "genuine judgment call";

function assertRead(what, count, floor, unit = "file(s)") {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} ${unit}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

// A specifier resolved against its importer, as a repo-relative posix path; a package or a builtin
// stays as spelled. `.mjs` is appended when the specifier omits it.
function resolved(fromRel, specifier) {
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return specifier;
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
  return joined.endsWith(".mjs") ? joined : `${joined}.mjs`;
}

// ONE read of `src/**`, comment-stripped: `[{ rel, code, raw }]` with `rel` repo-relative posix.
async function srcUnits() {
  const units = [];
  for (const file of await readSrcFiles(repoRoot)) {
    const raw = await readFile(file.path, "utf8");
    units.push({ rel: `src/${toPosix(file.rel)}`, raw, code: stripComments(raw) });
  }
  return units;
}

const unitOf = (units, rel) => {
  const unit = units.find((entry) => entry.rel === rel);
  assert.ok(unit != null, `NOT FOUND: ${rel} is not under src/** — the control cannot claim anything about a module it did not read`);
  return unit;
};

// The modules whose resolved specifiers reach `target`. PURE over units, so the non-vacuity probe
// can misspell the needle and watch the answer go to zero.
export function importersOf(units, target) {
  return units
    .filter(({ rel, code }) => importSpecifiers(code).some(({ specifier }) => resolved(rel, specifier) === target))
    .map(({ rel }) => rel);
}

// Every `path.join(` whose arguments name `meshRoot` beside a quoted literal carrying `ask` — the
// spelling a second home for the ask would take. Arguments are cut by matching parens and split at
// depth-0 commas, never a regex over the call.
export function meshRootAskJoins(code) {
  const found = [];
  for (const match of code.matchAll(/\bpath\s*\.\s*join\s*\(/gu)) {
    const span = matchedParenSpan(code, match.index);
    if (span == null) continue;
    const args = topLevelArguments(span.body);
    const namesMeshRoot = args.some((arg) => /\bmeshRoot\b/u.test(arg));
    const askLiteral = args.some((arg) => /^["'`][^"'`]*ask[^"'`]*["'`]$/iu.test(arg.trim()));
    if (namesMeshRoot && askLiteral) found.push(`path.join(${span.body.trim()})`);
  }
  return found;
}

// An ask record's `state` compared against one of the three words, spelled rather than read from
// `ASK_STATES`. An ask record is a binding of one of the home's reads, or a name that says `ask`.
export function spelledAskStates(code) {
  const bound = new Set([...code.matchAll(ASK_READS_RE)].map((match) => match[1]));
  const words = STATE_WORDS.join("|");
  const found = [];
  const receiver = String.raw`([A-Za-z_$][\w$]*)\s*\??\.\s*state`;
  const word = String.raw`["'\x60](${words})["'\x60]`;
  for (const match of code.matchAll(new RegExp(`${receiver}\\s*[!=]==?\\s*${word}`, "gu"))) {
    if (bound.has(match[1]) || /ask/iu.test(match[1])) found.push(match[0]);
  }
  for (const match of code.matchAll(new RegExp(`${word}\\s*[!=]==?\\s*${receiver}`, "gu"))) {
    if (bound.has(match[2]) || /ask/iu.test(match[2])) found.push(match[0]);
  }
  return found;
}

// A module that mutates an `asks` array in place: a write the three writers never make.
const ASKS_MUTATION_RE = /\.\s*asks\s*(?:=(?!=)|\[[^\]]*\]\s*=(?!=)|\.\s*(?:push|pop|shift|unshift|splice|fill|sort|reverse|copyWithin)\s*\()/gu;

// Every `asks:` object key in `code`, with the name of the top-level function it sits in.
function asksKeysByFunction(code) {
  const functions = [...code.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gmu)].map((match) => ({ name: match[1], at: match.index }));
  const keys = [];
  for (const match of code.matchAll(/(?<![\w$.])asks\s*:/gu)) {
    const owner = functions.filter((fn) => fn.at < match.index).at(-1)?.name ?? "<module>";
    const line = code.slice(code.lastIndexOf("\n", match.index) + 1, code.indexOf("\n", match.index));
    keys.push({ owner, at: match.index, line: line.trim() });
  }
  return keys;
}

async function withTemp(prefix, body) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function refusalOf(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return null;
}

// FF-13103's fixture: an item folder and a run record written directly in the shape a case needs.
const RUN_ID = "20260925T100000000Z-0000";
const at = (hhmm) => `2026-09-25T${hhmm}:00.000Z`;
const NOW = at("14:00");
const FIVE_MIN = 5 * 60 * 1000;
function staleRunning(asks) {
  return {
    runId: RUN_ID, itemRef: "20", state: "running", attempt: 1, outcome: null, sessionId: "S1", brief: {},
    createdAt: at("10:00"), updatedAt: at("10:01"), failureReason: null, heartbeatAt: at("10:01"),
    retryOf: null, reclaimedAt: null, node: null, resumeAfter: null, spend: null, asks,
  };
}
const OPEN_ASK = Object.freeze({ question: "Which store?", phase: "build", askedAt: at("10:01"), parkedAt: null, answer: null, answeredAt: null, by: null });

async function writeRun(item, record) {
  const file = runRecordPath(item, record.runId);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return file;
}

export const archTests = [
  {
    name: "arch/131 FF-13101 (acd-loop-ask-single-home): the ask has ONE home — loop-asks is spelled in src/loop/ask-request.mjs alone, no module joins meshRoot with an ask literal, and the three readers import the home by RESOLVED specifier",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const home = unitOf(units, HOME);
      assert.ok(home.code.includes(SEGMENT), `NOT FOUND: ${HOME} does not spell ${JSON.stringify(SEGMENT)} — the sweep must find the home before it can claim it is the only one`);

      const spellers = units.filter(({ code }) => code.includes(SEGMENT)).map(({ rel }) => rel);
      assert.deepEqual(spellers, [HOME], `loop-asks appears only in src/loop/ask-request.mjs — spelled by: ${spellers.join(", ")}. A module that composes the ask's path itself is a second home for the ask (ADR-003 §1); read it through loopAsksDir()/askRequestPath()`);

      const joins = units.flatMap(({ rel, code }) => meshRootAskJoins(code).map((join) => `${rel}: ${join}`));
      assert.deepEqual(joins, [], `no module joins meshRoot with an ask literal — found: ${joins.join(" | ")}. The ask's path has one home (ADR-003 §1): loopAsksDir()`);
      assert.equal(meshRootAskJoins('const p = path.join(globalMeshPaths().meshRoot, "loop-asks", id);').length, 1, "self-check: the register's red probe spelling is seen");
      assert.equal(meshRootAskJoins("const p = path.join(globalMeshPaths({ env }).meshRoot, ASKS_SEGMENT);").length, 0, "self-check: the home's own join carries no literal and is not flagged");

      const importers = importersOf(units, HOME);
      for (const reader of READERS) {
        assert.ok(importers.includes(reader), `${reader} imports src/loop/ask-request.mjs by RESOLVED specifier (through module-family.mjs) — importers found: ${importers.join(", ") || "none"}`);
      }
    },
  },
  {
    name: "arch/131 FF-13101 (acd-loop-ask-single-home): the ask states are ASK_STATES's — defined in the home alone, and no ask record's state is compared against a spelled word",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const definers = units.filter(({ code }) => /\bASK_STATES\s*=/u.test(code)).map(({ rel }) => rel);
      assert.deepEqual(definers, [HOME], `ASK_STATES is defined in src/loop/ask-request.mjs and nowhere else — defined in: ${definers.join(", ") || "nowhere"}`);

      const carriers = importersOf(units, HOME).filter((rel) => rel !== HOME);
      assertRead("the modules that carry an ask", carriers.length, READERS.length, "importer(s)");
      const spelled = carriers.flatMap((rel) => spelledAskStates(unitOf(units, rel).code).map((hit) => `${rel}: ${hit}`));
      assert.deepEqual(spelled, [], `an ask record's state is read through ASK_STATES, never compared against a spelled "waiting"/"parked"/"answered" — found: ${spelled.join(" | ")}`);
      // SELF-CHECK — the detector sees an ask record's spelled state and leaves another vocabulary alone.
      assert.equal(spelledAskStates('const file = await readAsk(dir, id);\nif (file.state === "parked") x();').length, 1, "self-check: a bound ask record's spelled state is seen");
      assert.equal(spelledAskStates('if (ask?.state !== "answered") x();').length, 1, "self-check: an ask-named receiver is seen");
      assert.equal(spelledAskStates('if (row.state === "parked") x();').length, 0, "self-check: a retry row's own \"parked\" is another vocabulary (ruling 6)");
    },
  },
  {
    name: "arch/131 FF-13101 (acd-loop-ask-single-home): asks is written only inside openRunAsk, parkRunAsk and answerRunAsk — the mint's asks: [] and the read-forward normaliser are the record's shape, and nothing mutates asks in place",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const store = unitOf(units, STORE);
      const keys = asksKeysByFunction(store.code);
      assertRead(`the asks: keys of ${STORE}`, keys.length, ASK_WRITERS.length + SHAPE_KEYS.length, "key(s)");
      const stray = keys.filter(({ owner, line }) => !ASK_WRITERS.includes(owner) && !SHAPE_KEYS.some((shape) => shape.fn === owner && line.startsWith(shape.text)));
      assert.deepEqual(stray.map(({ owner, line }) => `${owner}: ${line}`), [], `asks is written only inside openRunAsk, parkRunAsk and answerRunAsk (ruling 6 allows the mint's asks: [] and the normaliser) — found in: ${stray.map(({ owner }) => owner).join(", ")}`);
      for (const writer of ASK_WRITERS) {
        assert.ok(keys.some(({ owner }) => owner === writer), `NOT FOUND: ${writer} writes no asks key — the writer set the register names has moved`);
      }
      for (const shape of SHAPE_KEYS) {
        assert.equal(keys.filter(({ owner, line }) => owner === shape.fn && line.startsWith(shape.text)).length, 1, `the record's shape keeps exactly one \`${shape.text}\` in ${shape.fn}`);
      }
      const mutations = units.flatMap(({ rel, code }) => [...code.matchAll(ASKS_MUTATION_RE)].map((match) => `${rel}: ${match[0]}`));
      assert.deepEqual(mutations, [], `no src/** module mutates an asks array in place — the three writers replace it whole: ${mutations.join(" | ")}`);
      assert.equal([..."record.asks.push(entry)".matchAll(ASKS_MUTATION_RE)].length, 1, "self-check: an in-place push is seen");
      assert.equal([..."const asks = Array.isArray(record?.asks) ? record.asks : [];".matchAll(ASKS_MUTATION_RE)].length, 0, "self-check: a read is not a write");
    },
  },
  {
    name: "arch/131 FF-13101 (acd-loop-ask-single-home): fixture — answerAsk refuses answer-control-chars for a paste terminator, answer-empty for blank, and ask-already-answered on a second answer",
    run: async () => {
      await withTemp("aof-arch-131-ask-", async (dir) => {
        const control = await refusalOf(answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "ok\u001b[201~rm" }));
        assert.equal(control?.code, "answer-control-chars", `answerAsk refuses answer-control-chars for "ok\\u001b[201~rm": ${control?.message}`);
        const blank = await refusalOf(answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "  " }));
        assert.equal(blank?.code, "answer-empty", `answerAsk refuses answer-empty for "  ": ${blank?.message}`);

        await openAsk(dir, { runId: "r-131-06", ref: "03/01", workspaceId: "w1", sessionId: "S1", phase: "build", question: "Q" });
        const first = await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "take B", by: { actor: "you", via: "cli", node: null } });
        assert.equal(first?.answer, "take B", "the first answer lands");
        const second = await refusalOf(answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "take C" }));
        assert.equal(second?.code, "ask-already-answered", `answerAsk refuses ask-already-answered on a second answer: ${second?.message}`);
      });
    },
  },
  {
    name: "arch/131 FF-13101 (acd-loop-ask-single-home): NON-VACUOUS — the sweep finds the module and at least three importers, and reds when it finds fewer",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const home = units.find(({ rel }) => rel === HOME);
      const importers = importersOf(units, HOME);
      assert.ok(
        home != null && importers.length >= READERS.length,
        `the sweep finds the module and at least three importers: ${HOME} ${home == null ? "was NOT found" : "found"}, ${importers.length} importer(s) resolved (${importers.join(", ") || "none"}) — a needle that resolves to nothing is a guard asserting over the empty set, not a clean tree`,
      );
      const planted = [{ rel: "src/x.mjs", code: 'import { readAsk } from "./loop/ask-requests.mjs";' }];
      assert.equal(importersOf(planted, HOME).length, 0, "self-check: a misspelled specifier resolves to no importer");
      assert.equal(importersOf([{ rel: "src/x.mjs", code: 'import { readAsk } from "./loop/ask-request.mjs";' }], HOME).length, 1, "self-check: the right specifier resolves");
    },
  },
  {
    name: "arch/131 FF-13102 (acd-loop-ask-single-home): one reader of the question — readLastAssistantTurn is defined in observe.mjs and imported by the driver, and ask.mjs reads its question through observe.mjs and walks no transcript",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const observe = unitOf(units, OBSERVE);
      assert.match(observe.code, /\bexport\s+async\s+function\s+readLastAssistantTurn\s*\(/u, "readLastAssistantTurn is defined in src/work/observe.mjs");
      const definers = units.filter(({ code }) => /\bfunction\s+readLastAssistantTurn\s*\(/u.test(code)).map(({ rel }) => rel);
      assert.deepEqual(definers, [OBSERVE], `readLastAssistantTurn is defined once — in: ${definers.join(", ")}`);

      const driver = unitOf(units, DRIVER);
      assert.ok(importSpecifiers(driver.code).some(({ specifier }) => resolved(DRIVER, specifier) === OBSERVE), "the driver imports src/work/observe.mjs by resolved specifier");
      assert.match(driver.code, /import\s*\{[^}]*\breadLastAssistantTurn\b[^}]*\}\s*from\s*["']\.\/work\/observe\.mjs["']/u, "the driver imports readLastAssistantTurn by name");

      const ask = unitOf(units, ASK);
      assert.ok(importSpecifiers(ask.code).some(({ specifier }) => resolved(ASK, specifier) === OBSERVE), "src/loop/ask.mjs imports its reader from src/work/observe.mjs by resolved specifier (ruling 2)");
      assert.match(ask.code, /import\s*\{[^}]*\breadAskQuestion\b[^}]*\}\s*from\s*["']\.\.\/work\/observe\.mjs["']/u, "…and the reader is readAskQuestion");
      for (const [needle, what] of [[/\bJSON\s*\.\s*parse\s*\(/u, "JSON.parse("], [/stop_reason/u, "stop_reason"], [/\.jsonl\b/u, ".jsonl"], [/\breadFile\s*\(/u, "readFile("]]) {
        assert.doesNotMatch(ask.code, needle, `src/loop/ask.mjs walks no transcript itself — it spells ${what}`);
      }
    },
  },
  {
    name: "arch/131 FF-13102 (acd-loop-ask-single-home): no other src/** module both JSON.parses transcript lines and reads stop_reason — the driver's headless stdout parse is cut out by name",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const driver = unitOf(units, DRIVER);
      const stdout = functionBody(driver.code, STDOUT_PARSER);
      assert.ok(stdout != null && /\bJSON\s*\.\s*parse\s*\(/u.test(stdout), `NOT FOUND: ${STDOUT_PARSER} — the one allowed parse has moved, so the cut would exempt nothing`);
      const scanners = [];
      for (const { rel, code } of units) {
        if (rel === OBSERVE) continue;
        const body = rel === DRIVER ? code.replace(stdout, "") : code;
        if (/\bJSON\s*\.\s*parse\s*\(/u.test(body) && /stop_reason/u.test(body)) scanners.push(rel);
      }
      assert.deepEqual(scanners, [], `no other src/** module both JSON.parses transcript lines and reads stop_reason — found in: ${scanners.join(", ")}. The transcript has one reader (ADR-002): readLastAssistantTurn in src/work/observe.mjs`);
    },
  },
  {
    name: "arch/131 FF-13102 (acd-loop-ask-single-home): the driver keeps its seventeen exports, and NEEDS_INPUT_INSTRUCTION embeds the sentinel, asks the four labels and keeps the genuine-judgment-call sentence",
    run: async () => {
      const driver = await import("../../../src/agent-session-driver.mjs");
      assert.equal(Object.keys(driver).length, DRIVER_EXPORTS, `the driver's export set stays at 17 (53/FF-5302) — it has ${Object.keys(driver).length}`);
      const text = driver.NEEDS_INPUT_INSTRUCTION;
      assert.equal(typeof text, "string", "NEEDS_INPUT_INSTRUCTION is exported");
      assert.ok(text.includes(`line ${NEEDS_INPUT_SENTINEL} on its own line`), "NEEDS_INPUT_INSTRUCTION embeds the sentinel on a line of its own");
      for (const label of FOUR_LABELS) assert.ok(text.includes(`"${label}"`), `NEEDS_INPUT_INSTRUCTION carries ${label}`);
      assert.ok(text.replace(/\s+/gu, " ").includes(THRESHOLD), `NEEDS_INPUT_INSTRUCTION keeps the "${THRESHOLD}" sentence — the threshold for asking is not this milestone's to move`);
    },
  },
  {
    name: "arch/131 FF-13102 (acd-loop-ask-single-home): fixture — an end_turn transcript answers its text minus the sentinel line, and a pending AskUserQuestion answers its questions and option labels",
    run: async () => {
      await withTemp("aof-arch-131-transcript-", async (root) => {
        const env = { CLAUDE_CONFIG_DIR: path.join(root, "claude-cfg") };
        const cwd = path.join(root, "worktree");
        const dir = claudeProjectsDir({ cwd, env });
        await mkdir(dir, { recursive: true });
        const jsonl = (records) => `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
        await writeFile(path.join(dir, "S-end.jsonl"), jsonl([
          { type: "assistant", message: { stop_reason: "end_turn", content: [{ type: "text", text: `Decision needed: which store\nOptions: sqlite, json\n${NEEDS_INPUT_SENTINEL}` }] } },
        ]));
        await writeFile(path.join(dir, "S-tool.jsonl"), jsonl([
          { type: "assistant", message: { stop_reason: "tool_use", content: [{ type: "text", text: "Let me ask" }, { type: "tool_use", name: "AskUserQuestion", input: { questions: [{ question: "Which store?", options: [{ label: "sqlite" }, { label: "json" }] }] } }] } },
        ]));
        assert.equal(await readAskQuestion({ cwd, env, sessionId: "S-end" }), "Decision needed: which store\nOptions: sqlite, json", "an end_turn transcript answers its text minus the sentinel line");
        assert.equal(await readAskQuestion({ cwd, env, sessionId: "S-tool" }), "Which store?\n- sqlite\n- json", "a pending AskUserQuestion answers its questions and option labels");
      });
    },
  },
  {
    name: "arch/131 FF-13103 (acd-loop-ask-single-home): fixture — a minted record carries 17 keys with asks last and [], and a 16-key record reads forward with asks: []",
    run: async () => {
      await withTemp("aof-arch-131-record-", async (root) => {
        const item = { ref: "20", dir: path.join(root, "20_milestone_x") };
        await mkdir(item.dir, { recursive: true });
        const minted = await startRun(item, { now: at("10:00") });
        const raw = JSON.parse(await readFile(runRecordPath(item, minted.runId), "utf8"));
        const keys = Object.keys(raw);
        assert.equal(keys.length, 17, `a minted record carries 17 keys — it has ${keys.length}: ${keys.join(", ")}`);
        assert.equal(keys.at(-1), "asks", "asks is the last key");
        assert.deepEqual(raw.asks, [], "…and it is []");
      });
      await withTemp("aof-arch-131-record-", async (root) => {
        const item = { ref: "20", dir: path.join(root, "20_milestone_x") };
        const { asks: _dropped, ...sixteen } = staleRunning([]);
        assert.equal(Object.keys(sixteen).length, 16, "the fixture is a sixteen-key record");
        await writeRun(item, sixteen);
        const [read] = await readRuns(item);
        assert.equal(Object.keys(read).length, 17, "the sixteen-key record reads forward as seventeen keys");
        assert.deepEqual(read.asks, [], "…with asks: []");
      });
    },
  },
  {
    name: "arch/131 FF-13103 (acd-loop-ask-single-home): fixture — transitionStaleRunsReclaimed over a stale running run whose last ask is unanswered leaves it byte-unchanged, and reclaims the same run once the ask is answered",
    run: async () => {
      await withTemp("aof-arch-131-reclaim-", async (root) => {
        const item = { ref: "20", dir: path.join(root, "20_milestone_x") };
        const file = await writeRun(item, staleRunning([OPEN_ASK]));
        const before = await readFile(file, "utf8");
        const swept = await transitionStaleRunsReclaimed([item], { now: NOW, stalenessThreshold: FIVE_MIN });
        assert.equal(await readFile(file, "utf8"), before, "transitionStaleRunsReclaimed over a stale running run whose last ask is unanswered leaves it byte-unchanged");
        assert.equal(swept.length, 0, "…and reclaims nothing: a run waiting on a human is not an orphan");

        await answerRunAsk(item, RUN_ID, { answer: "take B", by: { actor: "you", via: "cli", node: null }, now: at("13:59") });
        const settled = await transitionStaleRunsReclaimed([item], { now: NOW, stalenessThreshold: FIVE_MIN });
        assert.equal(settled.length, 1, "once answered, the same stale run is reclaimed");
        const [run] = await readRuns(item);
        assert.equal(run.state, "failed");
        assert.equal(run.failureReason, "runtime_offline");
      });
    },
  },
  {
    name: "arch/131 FF-13103 (acd-loop-ask-single-home): fixture — attemptElapsedMs over a run that waited three hours on a human equals attemptElapsedMs over the same run without the wait",
    run: () => {
      const base = { runId: RUN_ID, createdAt: at("10:00"), heartbeatAt: null, reclaimedAt: null, state: "done" };
      const waited = { ...base, updatedAt: at("13:30"), asks: [{ ...OPEN_ASK, askedAt: at("10:15"), answer: "take B", answeredAt: at("13:15") }] };
      const unwaited = { ...base, updatedAt: at("10:30") };
      const charged = attemptElapsedMs({ record: waited, now: NOW });
      assert.equal(charged, attemptElapsedMs({ record: unwaited, now: NOW }), "a three-hour ask interval is charged to nobody: the waited run costs what the same run costs without the wait");
      assert.equal(charged, 30 * 60 * 1000, "…thirty minutes of work, the wait removed");
    },
  },
];
