// test/loop/work-loops-commands.test.mjs — milestone 52 / story 05, task 03: THE COMMAND FAMILY SUITE.
//
// The subjects are the three REGISTERED commands — `work:loops-show`, `work:loops-graph`,
// `work:loops-validate` — obtained from the registry (`getCommand`/`invoke`), never imported from
// their modules, because the registry is the only admitted door (08/ADR-004 inv. 3) and reaching
// past it would make this suite unable to notice a command that stopped being registered.
//
// TWO SUBJECTS, DELIBERATELY. The four covered features make two different KINDS of claim and this
// suite drives each where its claim actually lives:
//
//   · a claim about the RESULT — the frozen `--json` key sets, the raw-absolute `source`,
//     `resolved`'s three values, `summary.checks` — is decided by `command.run(input,
//     {workspace:{workDir,aofDir}})` IN PROCESS. That is the seam milestone 53 composes through, so it is
//     the seam worth pinning; a spawn spent here buys a value a function call already returns.
//   · a claim about the PROCESS — the exit code, exactly one JSON document on stdout, the face path
//     relativised against the invocation cwd, byte identity across two separate processes — is
//     decided by a REAL SPAWN through `test/support/cli-spawn.mjs`. Driving one of these in process
//     proves nothing at all.
//
// The split is not a convention here, it is asserted: every spawn goes through the single `runCli`
// door, which records the spending test, and the last case in this file checks the recorded ledger
// against each case's DECLARED spawn count, checks the declaration against the case's own source
// text, and holds the total under the story's ~35-process budget. Measured spend: 34.
//
// THE CWD TRAP, measured at refine and re-measured at build. All three verbs relativise their face
// output through `path.relative(process.cwd(), value)`. In process that resolves against the TEST
// RUNNER's cwd, not the fixture's — and `process.chdir` is unsafe, because `scripts/test.mjs` runs
// every suite sequentially in ONE process. On Windows `path.relative` also returns an ABSOLUTE path
// when the fixture lands on a different drive from the cwd. Every relativisation case therefore
// asserts `path.resolve(cwd, printed) === source`, never a literal relative string.
//
// WHAT IS ALREADY DECIDED, and is not re-asserted here. FF-5207 owns the three route triples through
// `resolveRoute`, the null for the bare family word and the absence of a `loops` branch in
// `cli.mjs`'s ladder. FF-5208 owns the Mermaid text literal, the three glyphs, total key mangling,
// the collision suffix, shuffle-invariance and `nodeCount` against the node-line count. FF-5209 owns
// the four-key envelope on the command RESULT, `summary.checks` key ORDER and the combined
// loader-then-checks finding order with both mutation non-vacuity legs. Each scenario those cover is
// routed in `coverage.excluded` to the gate that owns it, BY NAME, resolved from disk at run time.
//
// THE GATE LEG THAT MIGRATED OUT, recorded here because this is where the claim now lives.
// `test/arch/loop/acd-loop-command-route-only.test.mjs` carried a second, self-declared BEHAVIOURAL leg —
// *"arch/52 FF-5207: every verb reports an absent registry cleanly"* — whose in-file note named it
// *"the one to retire"* once a behavioural suite covered `03_command-surface.feature`'s clause that
// a repository with no registry is not an error condition for any of the three verbs. This suite is
// that suite: the claim is decided by "loops-commands/02 absence and emptiness are distinguishable
// on every verb" (in process, over all three verbs, absent AND empty) and by
// "loops-commands/03 the family shadows no existing command and writes nothing" (at the process
// boundary, three real spawns over a work stream with no `loops/` directory). The gate keeps its
// file, its name and its first leg, so FF-5209's nine-file roster and its `archTests` non-emptiness
// requirement are both intact.
//
// ONE SCENARIO MIGRATED IN. `05_frozen-finding-codes`' *"the three `ran` cases, pinned at the seam"*
// is a claim about `work:loops-validate` — `ran` is the command's composition of the loader's
// `present` with the five checks, and no check can decide it — so `test/loop/work-loops-checks.test.mjs`
// excludes it as `duplicate-claim` pointing here. The handshake is checked, not asserted: the ledger
// case imports that sibling and resolves the pointer against this module's decided set.
//
// TWO REGISTRATION TRAPS, confirmed at the source (`test/arch/loop/acd-loop-finding-envelope.test.mjs`).
// Its roster leg deep-equals the on-disk `test/arch/acd-loop-*` list against a literal nine, and its
// import-block leg requires no tenth `...acdLoop` spread. So this suite lives in `test/` without the
// `acd-loop-` prefix and exports an alias that does not begin `acdLoop`.
//
// ADR-008 (one command per verb, the three frozen `--json` contracts), ADR-009 (the deterministic
// Mermaid artifact), ADR-011 §11 (the `--json` boundaries D1-D6) and §12 (the five frozen check
// ids), ADR-012 §4 (the shape one-liners, D5 — the face relativises `Node.path` too) and §5 (the
// rendering's totality, E2 — `nodeCount` counts declared records, `edgeCount` every declared edge).
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getCommand, invoke, listCommands } from "../../src/command-core.mjs";
import { resolveRoute } from "../../src/spine/face.mjs";
import { CHECK_FINDING_CODES, CHECK_IDS } from "../../src/work/loops-checks.mjs";
import { LOADER_FINDING_CODES } from "../../src/work/loops.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { examplesTables, scenarioTitles } from "../support/feature-parse.mjs";
import { suiteFilesBelow } from "../support/registration/registration-surface.mjs";
import {
  actorRecord, loopRecord, reversedFiles, withLoopRegistry, withoutLoopRegistry,
} from "../support/loop-registry-fixture.mjs";

// THE REPO ROOT COMES FROM `import.meta.url`, NEVER FROM `process.cwd()` — the runner's working
// directory is not guaranteed, and a cwd-derived root would spawn the wrong CLI.
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
const CLI_ENTRY = path.join(ROOT, "bin", "aof.mjs");
const SELF = path.join(here, "work-loops-commands.test.mjs");

const FEATURE_DIR = "wiki/work/52_milestone_loop-registry-and-graph/stories/02_story_work-loops-command-family/tasks";
const F_SHOW = `${FEATURE_DIR}/00_loops-show.feature`;
const F_VALIDATE = `${FEATURE_DIR}/01_loops-validate.feature`;
const F_GRAPH = `${FEATURE_DIR}/02_loops-graph-mermaid.feature`;
const F_ROUTING = `${FEATURE_DIR}/03_registration-and-routing.feature`;
// The MIGRATED-IN feature. Only one of its scenarios is claimed here; the rest are 52/05 task 02's,
// and `test/loop/work-loops-checks.test.mjs` owns its title set in full.
const F_CODES =
  "wiki/work/52_milestone_loop-registry-and-graph/stories/01_story_structural-checks/tasks/05_frozen-finding-codes.feature";
const MIGRATED_IN = "the three `ran` cases, pinned at the seam";
const CHECKS_SUITE = "./work-loops-checks.test.mjs";

// The two gates whose assertions this suite refuses to duplicate. Every `structural-duplicate`
// pointer names one of these, and the ledger case RESOLVES both against `test/arch/` on disk — a
// pointer at a gate name that no longer exists is how an exclusion table quietly becomes fiction.
const FF5208_FROZEN = "arch/52 FF-5208: Mermaid bytes, canonical order, glyphs and total collision-safe keys are frozen";
const FF5209_CODE_TABLE = "arch/52 FF-5209: the literal lane/severity table is reachable with exact anchors and ordering";

const SHOW = "work:loops-show";
const GRAPH = "work:loops-graph";
const VALIDATE = "work:loops-validate";
const LOOP = "work:loop";
const VERBS = Object.freeze([SHOW, GRAPH, VALIDATE]);

// The story's process budget. `SPAWN_BUDGET` is the ceiling the ledger case enforces; `SPAWN_TOTAL`
// is what this suite actually declares, so a case that quietly grew a spawn fails the equality
// rather than drifting under the ceiling.
const SPAWN_BUDGET = 35;
const SPAWN_TOTAL = 34;

// ---------------------------------------------------------------------------------------------
// THE ONE SPAWN DOOR, and its ledger.
// ---------------------------------------------------------------------------------------------
// `spawnCliSync` is called in exactly ONE place in this module (the ledger case checks that by
// reading this file). Windows CreateProcess intermittently never-runs under full-suite handle
// pressure, which is what the shared hardened helper exists for; a raw `child_process` call here
// would re-open that flake.
const SPAWNS = new Map();
const DECLARED = new Map();
const BODIES = new Map();
const RAN = new Set();
let CURRENT = null;

function runCli(args, { cwd }) {
  SPAWNS.set(CURRENT, (SPAWNS.get(CURRENT) ?? 0) + 1);
  const result = spawnCliSync(process.execPath, [CLI_ENTRY, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return {
    argv: args.join(" "),
    cwd,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Declare one case. `spawns` is the DESIGN constraint of the task feature's case table made
 * machine-checkable: the ledger case asserts the recorded spend equals it, and that a case
 * declaring zero carries no `runCli(` in its own source text.
 */
function testCase(name, spawns, run) {
  DECLARED.set(name, spawns);
  BODIES.set(name, String(run));
  return {
    name,
    run: async () => {
      CURRENT = name;
      RAN.add(name);
      try {
        return await run();
      } finally {
        CURRENT = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Fixtures. The shared `test/support/loop-registry-fixture.mjs` gives a temp workspace + records
// on disk; this suite selects its `.aof` parent because it also drives the real CLI, then adds the
// config file a spawn needs. (If a fourth suite ever needs it, this is the helper to lift.)
// ---------------------------------------------------------------------------------------------
const CONFIG_TEXT = `${JSON.stringify({ name: "loop-command-fixture", work: { dir: "./work" } }, null, 2)}\n`;

async function dressWorkspace(fixture) {
  const aofDir = path.join(fixture.temp, ".aof");
  await mkdir(aofDir, { recursive: true });
  const configPath = path.join(aofDir, "aof.config.json");
  await writeFile(configPath, CONFIG_TEXT, "utf8");
  const nested = path.join(fixture.temp, "nested", "deeper");
  await mkdir(nested, { recursive: true });
  return { ...fixture, projectRoot: fixture.temp, configPath, nested };
}

/** A temp workspace holding a `loops/` registry AND the `.aof/aof.config.json` beside it. */
async function withWorkspace(files, run, options = {}) {
  return withLoopRegistry(files, async (fixture) => run(await dressWorkspace(fixture)), { ...options, parent: ".aof" });
}

/** The same, with NO `loops/` directory at all — a different fact from an empty one (ADR-011 §11/D1). */
async function withoutRegistry(run, options = {}) {
  return withoutLoopRegistry(async (fixture) => run(await dressWorkspace(fixture)), { ...options, parent: ".aof" });
}

/** The in-process seam milestone 53 composes through — the registry lookup, never a module import. */
function runCommand(id, input, workDir) {
  return getCommand(id).run(input, { workspace: { workDir, aofDir: path.join(path.dirname(workDir), ".aof") } });
}

/** The face adapters, called directly. A render is a pure projection of a result, never a process. */
const renderOf = (id, result) => getCommand(id).cli.render(result);
const jsonOf = (id, result) => getCommand(id).cli.json(result);

// THE FIXTURE REGISTRY of `00_loops-show`: `loops/alpha.md` (`id: loop:alpha`), `loops/beta.md`
// (`id: loop:beta`) and `loops/root.md` (`id: actor:root`, `ground: exogenous`), authored here and
// never taken from 52/03.
const baseRegistry = () => ({
  "alpha.md": loopRecord(),
  "beta.md": loopRecord(),
  "root.md": actorRecord(),
});

// A registry that loads with ZERO loader findings and whose four non-grounding checks are silent:
// `root` target-sets `alpha`, `alpha` target-sets `beta` at a 6x period ratio, and the two loops
// hold distinct actuators. Used wherever "a well-formed registry" is the Given.
//
// 58/ADR-002 §1 + ADR-005 §1 — "WELL-FORMED" NOW INCLUDES A DECLARED PLACE IN THE HIERARCHY, so the
// pair steps down exactly one layer. THE REPAIR IS THE FIXTURE, NOT THE EXPECTATION (58/ADR-007
// §3b): every claim driven over this registry is about ROUTING, the `ran` seam or the human face,
// and none of them is about the layer census — a fixture whose subject is not the claim is repaired
// so it stays clean. The clock separation is left at 6x on purpose: with both layers declared the
// ordinal axis decides the edge, and this fixture keeps the two axes AGREEING so that neither is
// silently carrying the other.
const wellFormedRegistry = () => ({
  "alpha.md": loopRecord({
    fields: { cadence: "periodic:60s", layer: "management", actuator: "[command:work:next]", "target-setting": "[loop:beta]" },
  }),
  "beta.md": loopRecord({ fields: { cadence: "periodic:10s", layer: "operational", actuator: "[command:work:validate]" } }),
  "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }),
});

const idsOfNodes = (nodes) => nodes.map((node) => node.id);
const keysOf = (value) => Object.keys(value);
const nodeLines = (text) => text.split("\n").slice(1).filter((line) => !line.includes(" -->|"));
const edgeLines = (text) => text.split("\n").filter((line) => line.includes(" -->|"));
const checkLane = (findings) => findings.filter((finding) => CHECK_FINDING_CODES.has(finding.code));
const loaderLane = (findings) => findings.filter((finding) => LOADER_FINDING_CODES.includes(finding.code));
const codesAt = (findings, filePath) => findings.filter((f) => f.path === filePath).map((f) => f.code);

/**
 * EXACTLY ONE JSON document on stdout. Two concatenated documents do not parse, and a top-level
 * closer at column 0 appears exactly once in `JSON.stringify(value, null, 2)` output — so the two
 * assertions together decide "one document", not merely "parseable".
 */
function oneJsonDocument(result, label) {
  const closers = result.stdout.split(/\r?\n/).filter((line) => line === "}" || line === "]").length;
  assert.equal(closers, 1, `${label}: exactly one top-level JSON document on stdout (got ${closers})`);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); },
    `${label}: stdout parses as one JSON document — ${result.stdout.slice(0, 200)}`);
  return parsed;
}

/**
 * THE CWD DISCIPLINE, in one place. A printed path is checked by RESOLVING it against the cwd the
 * process was invoked from — never against a literal relative string, which Windows breaks the
 * moment the fixture and the cwd land on different drives. The second leg restates the face's own
 * contract (ADR-012 §4/D5) and is what fails if a face ever printed the raw absolute instead.
 */
function printedPathResolves(cwd, printed, target, label) {
  assert.equal(path.resolve(cwd, printed), target, `${label}: the printed path resolves against its own invocation cwd`);
  assert.equal(printed, path.relative(cwd, target) || ".", `${label}: the face relativised against the invocation cwd`);
}

// ---------------------------------------------------------------------------------------------
// THE EXAMPLE TABLES. One case array per `Examples:` block of the four covered features, in file
// order; each is iterated by exactly one case below AND is the `cases` array of one
// `coverage.tables` entry, so a row that stopped being driven would stop being counted.
// ---------------------------------------------------------------------------------------------

// `00_loops-show` Examples 0 — the declared value, and the Field a consumer receives (16 rows).
const DECLARED_VALUE_CASES = [
  { key: "controlled", declared: "run state reaching a terminal value", list: false, kind: "phrase", payload: {} },
  { key: "reference", declared: "[command:work:next]", list: true, kind: "pointer", raw: "command:work:next", payload: { pointer: { scheme: "command", operand: "work:next" } } },
  { key: "actuator", declared: "[module:src/run-store.mjs#isStale]", list: true, kind: "pointer", raw: "module:src/run-store.mjs#isStale", payload: { pointer: { scheme: "module", operand: "src/run-store.mjs", symbol: "isStale" } } },
  { key: "actuator", declared: "[command:a, command:a]", list: true, kind: "pointer", raw: "command:a", entries: 2, payload: { pointer: { scheme: "command", operand: "a" } } },
  { key: "measurement", declared: "[prose:src/bundle/commands/continue.md]", list: true, kind: "prose", raw: "prose:src/bundle/commands/continue.md", payload: { path: "src/bundle/commands/continue.md" } },
  { key: "cadence", declared: "periodic:15s", list: false, kind: "periodic", payload: { ms: 15000 } },
  { key: "cadence", declared: "event:per-item", list: false, kind: "event", payload: { trigger: "per-item" } },
  { key: "cadence", declared: "unknown", list: false, kind: "unknown", payload: {} },
  { key: "ceiling", declared: "[config:work.autonomous.maxAttempts]", list: true, kind: "pointer", raw: "config:work.autonomous.maxAttempts", payload: { pointer: { scheme: "config", operand: "work.autonomous.maxAttempts" } } },
  { key: "ceiling", declared: "uncapped", list: true, kind: "uncapped", payload: {} },
  { key: "ceiling", declared: "none", list: true, kind: "none", payload: {} },
  { key: "ceiling", declared: "unknown", list: true, kind: "unknown", payload: {} },
  { key: "owner", declared: "actor:root", list: false, kind: "ref", payload: { scheme: "actor", operand: "root" } },
  { key: "owner", declared: "unknown", list: false, kind: "unknown", payload: {} },
  { key: "optimizing", declared: "true", list: false, kind: "flag", payload: { value: true } },
  { key: "ground", declared: "exogenous", list: false, kind: "enum", payload: { value: "exogenous" }, base: "actor" },
];

// `00_loops-show` Examples 1 — --id x registry state -> present / nodes / exit (7 rows).
const ID_FILTER_CASES = [
  { id: null, state: "records", present: true, nodes: 3, exit: 0 },
  { id: "loop:alpha", state: "records", present: true, nodes: 1, exit: 0 },
  { id: "actor:root", state: "records", present: true, nodes: 1, exit: 0 },
  { id: "loop:not-declared", state: "records", present: true, nodes: 0, exit: 0 },
  { id: null, state: "empty", present: true, nodes: 0, exit: 0 },
  { id: null, state: "absent", present: false, nodes: 0, exit: 0 },
  { id: "loop:alpha", state: "absent", present: false, nodes: 0, exit: 0 },
];

/**
 * 58/ADR-002 §3 — THE FRAME'S DEFAULT LAYER, corroborated by the frame's default cadence. A loop
 * record built by `loopRecord()` carries `cadence: event:per-item`, whose scope rank is the
 * MANAGEMENT one, so this is the only value that neither leaves the record undeclared nor
 * contradicts the clock it already ships with. A row that means to say something about the layer
 * axis overrides it; every other row inherits a record that is well-formed on the new axis for the
 * same reason `CLEAN_LOOP_FIELDS` makes one well-formed on the old ones.
 */
const FRAME_LAYER = "management";

// `01_loops-validate` Examples 0 — registry state -> reported code / severity / error count (30 rows).
// ONE REGISTRY PER ROW. `subject` is the record the row is about; `anchor` says whether the code is
// per-record or whole-graph, because `checkGrounding` and `checkActuatorArbitration` anchor at the
// loops DIRECTORY (a component is a fact about the graph, not about any one record — ADR-011 §7).
const REGISTRY_STATE_CASES = [
  { state: "no loops/ directory", code: null, severity: null, errors: 0, exit: 0, files: null },
  { state: "loops/ exists, no .md files", code: null, severity: null, errors: 0, exit: 0, files: {} },
  { state: "a well-formed loop declaring `owner: unknown`", code: "loop-owner-unknown", severity: "warn", errors: 0, exit: 0, subject: { fields: { owner: "unknown" } } },
  { state: "a well-formed loop declaring `cadence: unknown`", code: "loop-cadence-unknown", severity: "warn", errors: 0, exit: 0, subject: { fields: { cadence: "unknown" } } },
  { state: "a well-formed loop declaring `ceiling: uncapped`", code: "loop-ceiling-uncapped", severity: "warn", errors: 0, exit: 0, subject: { fields: { ceiling: "uncapped" } } },
  { state: "a well-formed loop declaring `ceiling: unknown`", code: "loop-ceiling-unknown", severity: "warn", errors: 0, exit: 0, subject: { fields: { ceiling: "unknown" } } },
  { state: "a well-formed loop declaring `ceiling: none`", code: null, severity: null, errors: 0, exit: 0, subject: { fields: { ceiling: "none" } } },
  { state: "a loop whose `measurement` is `prose:<path>`", code: "loop-field-prose-only", severity: "warn", errors: 0, exit: 0, subject: { fields: { measurement: "[prose:src/cli.mjs]" } } },
  { state: "a loop record with no `cadence:` key", code: "loop-missing-field", severity: "error", errors: 1, exit: 1, subject: { fields: { cadence: null } } },
  { state: "a loop whose `actuator` is a bare scalar, not a list", code: "loop-expected-list", severity: "error", errors: 1, exit: 1, subject: { fields: { actuator: "command:work:next" } } },
  { state: "a loop whose `controlled` is a list, not a scalar", code: "loop-expected-scalar", severity: "error", errors: 1, exit: 1, subject: { fields: { controlled: "[attempt count]" } } },
  { state: "a loop declaring `reference: []`", code: "loop-empty-list", severity: "error", errors: 1, exit: 1, subject: { fields: { reference: "[]" } } },
  { state: "a loop declaring `monitoring: []`", code: "loop-empty-list", severity: "error", errors: 1, exit: 1, subject: { fields: { monitoring: "[]" } } },
  { state: "a loop whose `id` is not `loop:<filename stem>`", code: "loop-id-mismatch", severity: "error", errors: 1, exit: 1, subject: { id: "loop:elsewhere" }, endpoint: "loop:elsewhere" },
  { state: "a record carrying a key outside the schema and the five edge keys", code: "loop-unknown-key", severity: "error", errors: 1, exit: 1, subject: { fields: { depends: "5" } } },
  { state: "a `kind: loop` record declaring `ground: exogenous`", code: "loop-key-not-admitted-for-kind", severity: "error", errors: 1, exit: 1, subject: { fields: { ground: "exogenous" } } },
  { state: "a `kind: actor` record declaring `controlled:`", code: "loop-key-not-admitted-for-kind", severity: "error", errors: 1, exit: 1, actorSubject: { fields: { controlled: "attempt count" } }, endpoint: "actor:subject" },
  { state: "a record whose frontmatter carries `veto/constraint: [loop:beta]`", code: "loop-malformed-frontmatter-line", severity: "error", errors: 1, exit: 1, subject: { extraLines: ["veto/constraint: [loop:beta]"] } },
  { state: "a loop declaring `cadence: periodic:soon`", code: "loop-bad-value", severity: "error", errors: 1, exit: 1, subject: { fields: { cadence: "periodic:soon" } } },
  { state: "a record whose frontmatter block cannot be parsed", code: "loop-record-unparseable", severity: "error", errors: 1, exit: 1, subject: "# subject\n\nno frontmatter block here at all\n", isolated: true },
  { state: "a loop declaring `data-feed: [loop:absent]`", code: "loop-graph-dangling-endpoint", severity: "error", errors: 1, exit: 1, subject: { fields: { "data-feed": "[loop:absent]" } } },
  { state: "a loop with `optimizing: true` and no inbound `monitoring` edge", code: "loop-unpaired-optimizer", severity: "error", errors: 1, exit: 1, subject: { fields: { optimizing: "true" } } },
  // ————— 58/ADR-005 §1 PROMOTES THREE OF THIS TABLE'S CODES, and the fourth row below changes its
  // error count without changing its code. Four rows move and TWENTY-SIX are byte-identical, which
  // is the point of repairing the fixture builder instead of re-deriving thirty expectations
  // (58/ADR-007 §3b): three changed rows are an event a reviewer must see, thirty are the noise
  // that hides them. No row is added or removed, so the row-count binding to milestone 52's
  // delivered `01_loops-validate` Examples table holds. ——————————————————————————————————————————
  //
  // A loop no admissible source owns is a structural supervision failure now, not a line that
  // scrolls past. `isolated` is what the row is ABOUT, so it stays.
  { state: "a loop with no inbound `target-setting` edge", code: "loop-unowned-reference", severity: "error", errors: 1, exit: 1, subject: {}, isolated: true },
  { state: "a loop declaring `monitoring:` on ITSELF", code: "loop-self-referential-edge", severity: "warn", errors: 0, exit: 0, subject: { fields: { monitoring: "[loop:subject]" } } },
  { state: "a loop declaring `target-setting:` on ITSELF", code: "loop-self-referential-edge", severity: "warn", errors: 0, exit: 0, subject: { fields: { "target-setting": "[loop:subject]" } } },
  // A conflict nobody owns is a refusal (ADR-005 §1). The second record takes the FRAME's layer,
  // corroborated by its inherited `event:per-item` cadence, so the promotion is the only movement.
  { state: "two loops sharing an `actuator` entry, with no `veto` arbiter", code: "loop-shared-actuator-unarbitrated", severity: "error", errors: 1, exit: 1, anchor: "directory", subject: { fields: { actuator: "[command:shared]" } }, extra: { "second.md": loopRecord({ fields: { layer: FRAME_LAYER, actuator: "[command:shared]" } }) } },
  // A supervisor no slower than what it supervises does not supervise it. The pair steps down
  // exactly one layer (ADR-007 §3b names this row's second value change): without it the clock
  // inversion would be joined by a LAYER inversion and the row would carry two errors where its
  // shape names one code.
  { state: "two `periodic:` loops joined by `target-setting`, ratio under 3", code: "loop-timescale-inversion", severity: "error", errors: 1, exit: 1, subject: { fields: { cadence: "periodic:10s", "target-setting": "[loop:second]" } }, extra: { "second.md": loopRecord({ fields: { cadence: "periodic:5s", layer: "operational", actuator: "[command:second]" } }) } },
  // NOT-COMPARABLE STAYS A WARN — an honest "cannot decide" never stops the run — but this row's
  // ERROR COUNT moves anyway, and the reason is structural rather than incidental: after ADR-002 §5
  // the ordinal axis decides any edge whose BOTH ends declare a layer, so the only registry that can
  // still produce `loop-timescale-not-comparable` is one with an undeclared end — which ADR-005 §1
  // gates as `loop-layer-undeclared`. The undeclared end is the target, matching the delivered
  // 58/02 row `| periodic:15s | management | event:per-phase | (undeclared) | not comparable |`.
  // The row's own code and severity are untouched; the extra error is the census's, at second.md.
  { state: "a `periodic:` loop `target-setting` an `event:per-item` loop", code: "loop-timescale-not-comparable", severity: "warn", errors: 1, exit: 1, subject: { fields: { cadence: "periodic:10s", "target-setting": "[loop:second]" } }, extra: { "second.md": loopRecord({ fields: { cadence: "event:per-item", actuator: "[command:second]" } }) } },
  { state: "a loop reachable only from an `actor` declaring `ground: exogenous`", code: "loop-graph-grounded-exogenous-only", severity: "warn", errors: 0, exit: 0, anchor: "directory", subject: {} },
  // `isolated` is DROPPED, and it was never this row's subject: what the row is about is `ungrounded`,
  // which removes the frame actor's `ground:` and leaves every component with no path from a
  // ground-bearing node. Keeping the frame's ownership edge is what stops the promoted
  // `loop-unowned-reference` from adding an error to a row about GROUNDING.
  { state: "a loop with no path from any ground-bearing node", code: "loop-graph-ungrounded-component", severity: "warn", errors: 0, exit: 0, anchor: "directory", subject: {}, ungrounded: true },
];

// `01_loops-validate` Examples 1 — `ran`, derived by the COMMAND from `present` alone (4 rows).
// Row 3's "findings 0" is the ONE row this suite could not satisfy as written; see the deviation
// note on the case that drives it.
const RAN_CASES = [
  { state: "no loops/ directory", present: false, invoked: false, ran: false, findings: 0, exit: 0 },
  { state: "loops/ exists, no .md files", present: true, invoked: true, ran: true, findings: 0, exit: 0 },
  { state: "3 well-formed records, nothing to report", present: true, invoked: true, ran: true, findings: 0, exit: 0, loaderFindings: 0 },
  { state: "3 records, pathologies in both lanes", present: true, invoked: true, ran: true, findings: "own", exit: 0 },
];

// `01_loops-validate` Examples 2 — the frozen finding order, as relative positions (5 rows).
const FINDING_ORDER_CASES = [
  { position: 1, lane: "loader", at: "alpha.md", code: "loop-missing-field" },
  { position: 2, lane: "loader", at: "alpha.md", code: "loop-owner-unknown" },
  { position: 3, lane: "loader", at: "beta.md", code: "loop-ceiling-uncapped" },
  { position: 4, lane: "checks", at: "grounding", code: "loop-graph-ungrounded-component" },
  { position: 5, lane: "checks", at: "pairing", code: "loop-unpaired-optimizer" },
];

// `02_loops-graph-mermaid` Examples 0 — the node, and the line it emits (9 rows).
const GLYPH_LINE_CASES = [
  { subject: "id loop:alpha, kind loop, title Alpha", key: "loop_alpha", line: 'loop_alpha["loop:alpha \u00b7 Alpha"]' },
  { subject: "id actor:root, kind actor, title Root", key: "actor_root", line: 'actor_root(["actor:root \u00b7 Root"])' },
  { subject: "endpoint loop:nowhere — dangling", key: "loop_nowhere", line: 'loop_nowhere[/"loop:nowhere"/]' },
  { subject: "endpoint command:work:next — extra-registry", key: "command_work_next", line: 'command_work_next[/"command:work:next"/]' },
  { subject: "endpoint module:src/run-store.mjs#isStale", key: "module_src_run_store_mjs_isStale", line: 'module_src_run_store_mjs_isStale[/"module:src/run-store.mjs#isStale"/]' },
  { subject: "endpoint config:work.autonomous.maxAttempts", key: "config_work_autonomous_maxAttempts", line: 'config_work_autonomous_maxAttempts[/"config:work.autonomous.maxAttempts"/]' },
  { subject: "endpoint module:src/a-b.mjs#run — collides, sorts first", key: "module_src_a_b_mjs_run", line: 'module_src_a_b_mjs_run[/"module:src/a-b.mjs#run"/]' },
  { subject: "endpoint module:src/a.b.mjs#run — collides, sorts second", key: "module_src_a_b_mjs_run_2", line: 'module_src_a_b_mjs_run_2[/"module:src/a.b.mjs#run"/]' },
  { subject: "edge loop:alpha --target-setting--> loop:beta", key: null, line: "loop_alpha -->|target-setting| loop_beta" },
];

// `02_loops-graph-mermaid` Examples 1 — model shape -> counts + fingerprint (8 rows). "Fingerprint"
// is an EQUALITY RELATION, never a literal digest: rows sharing a label must be byte-identical and
// rows with different labels must differ.
const FINGERPRINT_CASES = [
  { shape: "no loops/ directory", nodeCount: 0, edgeCount: 0, fingerprint: "F0", files: null },
  { shape: "loops/ exists, no .md files", nodeCount: 0, edgeCount: 0, fingerprint: "F0", files: {} },
  { shape: "1 loop record, no edges", nodeCount: 1, edgeCount: 0, fingerprint: "F1", files: { "only.md": loopRecord() } },
  { shape: "1 loop + 1 actor, 1 target-setting edge", nodeCount: 2, edgeCount: 1, fingerprint: "F2", files: { "alpha.md": loopRecord(), "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }) } },
  { shape: "the same 2 records authored in the reverse order", nodeCount: 2, edgeCount: 1, fingerprint: "F2", reversed: true, files: { "alpha.md": loopRecord(), "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }) } },
  { shape: "the same 2 records rendered in a second process", nodeCount: 2, edgeCount: 1, fingerprint: "F2", crossProcess: true, files: { "alpha.md": loopRecord(), "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }) } },
  { shape: "2 loops + 1 actor, 3 edges across 2 edge types", nodeCount: 3, edgeCount: 3, fingerprint: "F3", files: { "alpha.md": loopRecord({ fields: { "target-setting": "[loop:beta]", "data-feed": "[loop:beta]" } }), "beta.md": loopRecord(), "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }) } },
  { shape: "those 3 records with one edge type relabelled", nodeCount: 3, edgeCount: 3, fingerprint: "F4", files: { "alpha.md": loopRecord({ fields: { "target-setting": "[loop:beta]", monitoring: "[loop:beta]" } }), "beta.md": loopRecord(), "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }) } },
];

// `02_loops-graph-mermaid` Examples 2 — the counts against the picture, ADR-012 §5/E2 (6 rows).
const COUNTS_CASES = [
  { shape: "no loops/ directory", nodeCount: 0, edgeCount: 0, lines: 0, files: null },
  { shape: "1 loop record, no edges", nodeCount: 1, edgeCount: 0, lines: 1, files: { "only.md": loopRecord() } },
  { shape: "2 loop records, 1 loop->loop edge", nodeCount: 2, edgeCount: 1, lines: 2, files: { "alpha.md": loopRecord({ fields: { "data-feed": "[loop:beta]" } }), "beta.md": loopRecord() } },
  { shape: "2 loop records, 1 loop->loop edge and 1 dangling endpoint", nodeCount: 2, edgeCount: 2, lines: 3, files: { "alpha.md": loopRecord({ fields: { "data-feed": "[loop:beta, loop:nowhere]" } }), "beta.md": loopRecord() } },
  { shape: "2 loop records and 1 `command:` endpoint", nodeCount: 2, edgeCount: 1, lines: 3, files: { "alpha.md": loopRecord({ fields: { monitoring: "[command:work:next]" } }), "beta.md": loopRecord() } },
  { shape: "1 loop record, 1 `module:` and 1 `config:` endpoint", nodeCount: 1, edgeCount: 2, lines: 3, files: { "alpha.md": loopRecord({ fields: { monitoring: "[module:src/run-store.mjs#isStale]", "parameter-tuning": "[config:work.autonomous.maxAttempts]" } }) } },
];

// `03_registration-and-routing` Examples 0 — argv -> resolved command id + exit (17 rows). `spawn`
// marks the twelve forms this suite drives at the PROCESS boundary; every other row's exit column is
// decided by the named case, so no row's answer is left to a comment.
const ARGV_ROUTE_CASES = [
  { argv: ["work", "loops", "show"], id: SHOW, exit: 0, spawn: true, human: true },
  { argv: ["work", "loops", "show", "--json"], id: SHOW, exit: 0, spawn: true, envelope: "nodes" },
  { argv: ["work", "loops", "show", "--id", "loop:alpha", "--json"], id: SHOW, exit: 0, spawn: true, envelope: "nodes", nodes: 1 },
  { argv: ["work", "loops", "graph"], id: GRAPH, exit: 0, spawn: false, decidedBy: "loops-commands/02 graph's six-key envelope, its printed diagram and two processes' bytes" },
  { argv: ["work", "loops", "graph", "--json"], id: GRAPH, exit: 0, spawn: true, envelope: "text" },
  { argv: ["work", "loops", "graph", "--format", "mermaid", "--json"], id: GRAPH, exit: 0, spawn: false, decidedBy: "loops-commands/02 the diagram is fixed by the registry, not by the order it was authored or read" },
  { argv: ["work", "loops", "graph", "--format", "dot", "--json"], id: GRAPH, exit: "non-zero", spawn: false, decidedBy: "loops-commands/02 an unsupported format is one coded envelope and a non-zero exit" },
  { argv: ["work", "loops", "validate"], id: VALIDATE, exit: 0, spawn: false, decidedBy: "loops-commands/03 the three verbs print legible human output without --json" },
  { argv: ["work", "loops", "validate", "--json"], id: VALIDATE, exit: 0, spawn: true, envelope: "findings" },
  { argv: ["work", "loops", "show", "--loop", "loop:alpha"], id: SHOW, exit: "non-zero", spawn: true, envelope: null },
  { argv: ["work", "loops", "frobnicate"], id: null, exit: "non-zero", spawn: true, envelope: null },
  { argv: ["work", "loops"], id: null, exit: "non-zero", spawn: true, envelope: null },
  {
    argv: ["work", "loop", "show"],
    id: LOOP,
    scope: "show",
    refusal: { code: "loop-scope-unsupported", message: "scope matched neither admitted loop scope form" },
    exit: "non-zero",
    spawn: true,
    envelope: null,
  },
  { argv: ["work", "loops-show", "--json"], id: null, exit: "non-zero", spawn: true, envelope: null },
  { argv: ["work", "loops-graph", "--json"], id: null, exit: "non-zero", spawn: true, envelope: null },
  { argv: ["work", "loops-validate", "--json"], id: null, exit: "non-zero", spawn: true, envelope: null },
  { argv: ["work", "list", "--json"], id: "work:list", exit: 0, spawn: false, decidedBy: "loops-commands/03 the family shadows no existing command and writes nothing" },
];

// `03_registration-and-routing` Examples 1 — the bijection probe argv, on a fixture with no loops/ (3 rows).
const PROBE_CASES = [
  { argv: ["work", "loops", "show", "--json"], id: SHOW, present: false, exit: 0 },
  { argv: ["work", "loops", "graph", "--json"], id: GRAPH, present: false, exit: 0 },
  { argv: ["work", "loops", "validate", "--json"], id: VALIDATE, present: false, exit: 0 },
];

// `03_registration-and-routing` Examples 2 — the id-suffix is NOT the route (3 rows).
const ID_SUFFIX_CASES = [
  { id: SHOW, suffixWords: ["work", "loops-show"], routeWords: ["work", "loops", "show"], onRoute: true, onSuffix: false },
  { id: GRAPH, suffixWords: ["work", "loops-graph"], routeWords: ["work", "loops", "graph"], onRoute: true, onSuffix: false },
  { id: VALIDATE, suffixWords: ["work", "loops-validate"], routeWords: ["work", "loops", "validate"], onRoute: true, onSuffix: false },
];

// ---------------------------------------------------------------------------------------------
// Fixture builders for the two heaviest tables.
// ---------------------------------------------------------------------------------------------

/**
 * One registry per `REGISTRY_STATE_CASES` row. The FRAME is `root.md` (an exogenously grounded
 * actor) target-setting `loop:subject`, which keeps the four non-grounding checks silent so a row's
 * own code is the only thing its record carries; `isolated` drops that edge for the rows whose whole
 * point is a missing inbound edge, and `ungrounded` drops the actor's `ground:` for the row about a
 * component with no path from any ground-bearing node.
 */
/** The row's subject spec, with the frame's layer unless the row declares its own. */
function subjectSpec(spec) {
  if (typeof spec === "string") return spec;
  return { ...spec, fields: { layer: FRAME_LAYER, ...(spec?.fields ?? {}) } };
}

function registryStateFiles(row) {
  if (row.files !== undefined) return row.files;
  const extra = row.extra ?? {};
  const rootFields = {};
  if (row.ungrounded) rootFields.ground = null;
  if (!row.isolated) {
    // THE FRAME OWNS EVERY LOOP IN THE FIXTURE, not just the subject (58/ADR-001 §1). Before this
    // milestone an `extra` record could ride along with no inbound `target-setting` edge, because
    // `loop-unowned-reference` was a warn and this driver counts ERRORS exactly. ADR-005 §1
    // promotes it, so a bystander left unowned would put a SECOND error on the three rows that
    // carry an extra — an error about the frame, on a row whose shape names one code. `actor:root`
    // is one of the three admissible sources, so owning them costs the rows nothing else.
    const owned = [row.endpoint ?? "loop:subject", ...Object.keys(extra).map((name) => `loop:${path.basename(name, ".md")}`)];
    rootFields["target-setting"] = `[${owned.join(", ")}]`;
  }
  const files = { "root.md": actorRecord({ fields: rootFields }) };
  if (row.actorSubject) files["subject.md"] = actorRecord(row.actorSubject);
  else files["subject.md"] = typeof row.subject === "string" ? row.subject : loopRecord(subjectSpec(row.subject));
  return { ...files, ...extra };
}

/**
 * The registry `RAN_CASES` row 4 needs: five checks with counts a counter returning one constant
 * cannot fake. Measured: grounding 5 (one per strongly-connected component), reference-ownership 3
 * (alpha, gamma, delta carry no inbound target-setting), pairing 2 (alpha and beta declare
 * `optimizing: true` with no inbound monitoring), timescale 1 (alpha's periodic clock target-sets
 * beta's event trigger) and actuator-arbitration 0 (four distinct actuators) — four DIFFERENT
 * non-zero counts, plus a fifth check that ran and found nothing.
 */
const pathologicalRegistry = () => ({
  "root.md": actorRecord(),
  "alpha.md": loopRecord({ fields: { optimizing: "true", cadence: "periodic:10s", actuator: "[command:a]", "target-setting": "[loop:beta]" } }),
  "beta.md": loopRecord({ fields: { optimizing: "true", cadence: "event:per-item", actuator: "[command:b]" } }),
  "gamma.md": loopRecord({ fields: { owner: "unknown", actuator: "[command:c]" } }),
  "delta.md": loopRecord({ fields: { cadence: null, actuator: "[command:d]" } }),
});

export const workLoopsCommandsTests = [
  // -------------------------------------------------------------------------------------------
  // 00_loops-show
  // -------------------------------------------------------------------------------------------
  testCase(
    "loops-commands/00 show's result is the frozen three-key envelope and the same data reaches stdout as one document",
    1,
    async () => {
      await withWorkspace(baseRegistry(), async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture.workDir);

        // NON-VACUITY: the key-set assertion sits in the SAME case as the node VALUES, so an empty
        // node list can never satisfy it (the failure mode a key-set-only case cannot see).
        assert.deepEqual(keysOf(result), ["source", "present", "nodes"], "the result's key set is exactly source, present, nodes");
        assert.equal(result.present, true);
        assert.equal(result.nodes.length, 3, "three nodes — one per record");
        assert.deepEqual(idsOfNodes(result.nodes), ["actor:root", "loop:alpha", "loop:beta"]);
        for (const node of result.nodes) {
          // 58/03 — THE SIX PLUS ONE. `referenceSetters` is the seventh key, and it is on the RESULT
          // rather than only on the face because `--id` must narrow what is PRINTED and never what
          // is COMPUTED: the face adapters are handed `result` and a `{positionals, options}`
          // faceCtx (`src/spine/face.mjs`), so a filtered result that carried no setter datum could
          // not answer "who sets loop:build's reference?" once loop:mgr's own record was filtered out.
          // Measured: computing in the face instead returns `[]` there. That the six shipped before
          // 58 carry the same VALUES is a claim about values, which a key-name comparison cannot
          // make; its home is `test/loop/loops-supervision-face.test.mjs`, where the spawned `--json`
          // node minus `referenceSetters`/`path` is deep-equalled against a direct `loadLoops`.
          assert.deepEqual(keysOf(node).sort(), ["edges", "fields", "id", "kind", "path", "referenceSetters", "title"], `${node.id}: the six contract keys, plus 58/03's referenceSetters`);
          assert.equal(node.path, fixture.pathOf(`${node.id.split(":")[1]}.md`), `${node.id}: path names the record it was read from`);
          for (const forbidden of ["id", "kind", "title"]) {
            assert.equal(Object.hasOwn(node.fields, forbidden), false, `${node.id}: ${forbidden} is a node-level scalar, never a field`);
          }
        }
        assert.equal(result.nodes.find((n) => n.id === "actor:root").kind, "actor");
        assert.equal(result.nodes.find((n) => n.id === "loop:alpha").kind, "loop");

        // THE PROCESS half: one document on stdout, exit 0, and the same three nodes on the wire.
        const spawned = runCli(["work", "loops", "show", "--json"], { cwd: fixture.projectRoot });
        assert.equal(spawned.status, 0, `aof work loops show --json exits 0 (stderr: ${spawned.stderr})`);
        const document = oneJsonDocument(spawned, "show --json");
        assert.deepEqual(keysOf(document), ["source", "present", "nodes"]);
        assert.equal(document.present, true);
        assert.deepEqual(idsOfNodes(document.nodes), ["actor:root", "loop:alpha", "loop:beta"]);
      });
    },
  ),

  testCase(
    "loops-commands/00 the result carries raw absolutes and each printed path resolves against its own invocation cwd",
    2,
    async () => {
      await withWorkspace(baseRegistry(), async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture.workDir);

        // The RESULT is basis-neutral: OS-NATIVE raw absolutes, `source` and every `Node.path` alike
        // (ADR-011 §11/D5 as ratified by ADR-012 §4/D5). `path.isAbsolute` alone admits a
        // forward-slashed `C:/x` on Windows, so `path.sep` is the discriminator.
        assert.equal(result.source, fixture.loopsDir);
        assert.ok(path.isAbsolute(result.source) && result.source.includes(path.sep), "source is an OS-native raw absolute");
        for (const node of result.nodes) {
          assert.ok(path.isAbsolute(node.path) && node.path.includes(path.sep), `${node.id}: an OS-native raw absolute`);
          assert.equal(node.path.startsWith(fixture.loopsDir), true, `${node.id}: names a file under the registry directory`);
        }

        // The FACE relativises against the cwd of the process that invoked it — measured from TWO
        // different cwds, and never compared with a literal relative string (the Windows
        // cross-drive trap: `path.relative` legitimately returns an absolute path there).
        const fromRoot = runCli(["work", "loops", "show", "--json"], { cwd: fixture.projectRoot });
        const fromNested = runCli(["work", "loops", "show", "--config", fixture.configPath, "--json"], { cwd: fixture.nested });
        assert.equal(fromRoot.status, 0, `from the workspace root (stderr: ${fromRoot.stderr})`);
        assert.equal(fromNested.status, 0, `from a nested subdirectory (stderr: ${fromNested.stderr})`);
        const rootDocument = oneJsonDocument(fromRoot, "show from the root");
        const nestedDocument = oneJsonDocument(fromNested, "show from a nested subdirectory");

        printedPathResolves(fixture.projectRoot, rootDocument.source, fixture.loopsDir, "source, from the root");
        printedPathResolves(fixture.nested, nestedDocument.source, fixture.loopsDir, "source, from the nested dir");
        for (const document of [rootDocument, nestedDocument]) {
          const cwd = document === rootDocument ? fixture.projectRoot : fixture.nested;
          for (const node of document.nodes) {
            const raw = result.nodes.find((entry) => entry.id === node.id).path;
            printedPathResolves(cwd, node.path, raw, `${node.id}'s printed path`);
          }
        }

        // …and BOTH runs name the same directory on disk, which is the claim the two cwds exist to
        // make (03_registration-and-routing: the two results differ only in path basis).
        assert.equal(path.resolve(fixture.projectRoot, rootDocument.source), path.resolve(fixture.nested, nestedDocument.source));
        assert.deepEqual(idsOfNodes(nestedDocument.nodes), idsOfNodes(result.nodes), "the same nodes, in the same order, as the in-process result");
        assert.equal(path.isAbsolute(result.source), true, "the in-process source is absolute where the printed one is relativised");
      });
    },
  ),

  testCase(
    "loops-commands/00 the declared-value table — a field's shape comes from its key (table)",
    0,
    async () => {
      for (const row of DECLARED_VALUE_CASES) {
        const label = `${row.key}: ${row.declared}`;
        const spec = row.base === "actor"
          ? actorRecord({ fields: { [row.key]: row.declared } })
          : loopRecord({ fields: { [row.key]: row.declared } });
        await withWorkspace({ "subject.md": spec }, async (fixture) => {
          const result = await runCommand(SHOW, {}, fixture.workDir);
          const node = result.nodes[0];
          assert.ok(node, `${label}: the record loaded`);
          const value = node.fields[row.key];
          assert.ok(value !== undefined, `${label}: the key reached the wire`);

          // LIST-NESS FOLLOWS THE KEY, never the data: `ceiling: uncapped` is a one-entry array and
          // `controlled: <phrase>` is a bare Field, whatever either declared.
          assert.equal(Array.isArray(value), row.list, `${label}: fields[key] is ${row.list ? "Field[]" : "a single Field"}`);
          const entries = Array.isArray(value) ? value : [value];
          assert.equal(entries.length, row.entries ?? 1, `${label}: entry count`);
          for (const entry of entries) {
            assert.equal(entry.key, row.key, `${label}: the entry carries its key`);
            assert.equal(entry.raw, row.raw ?? row.declared, `${label}: raw text, verbatim`);
            assert.notEqual(entry.raw, "", `${label}: raw is never the empty string`);
            assert.equal(entry.kind, row.kind, `${label}: kind`);
            for (const [payloadKey, payloadValue] of Object.entries(row.payload)) {
              assert.deepEqual(entry[payloadKey], payloadValue, `${label}: payload ${payloadKey}`);
            }
            if (Object.keys(row.payload).length === 0) {
              assert.deepEqual(keysOf(entry).sort(), ["key", "kind", "raw"], `${label}: raw only — no payload beyond key + raw`);
            }
          }
          // The identity keys are node-level scalars and never fields, on every row.
          for (const forbidden of ["id", "kind", "title"]) {
            assert.equal(Object.hasOwn(node.fields, forbidden), false, `${label}: ${forbidden} appears in no field map`);
          }
          for (const entry of Object.values(node.fields).flatMap((v) => (Array.isArray(v) ? v : [v]))) {
            assert.equal(typeof entry.kind, "string", `${label}: every field of every node carries a kind`);
          }
        });
      }

      // The two rows whose whole point is a CONTRAST live in one registry, so "the two kinds are
      // different values" is decided rather than inferred from two separate runs.
      await withWorkspace({
        "alpha.md": loopRecord({ fields: { measurement: "[prose:src/bundle/commands/continue.md]", owner: "unknown" } }),
        "beta.md": loopRecord({ fields: { actuator: "[command:a, command:a]" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture.workDir);
        const alpha = result.nodes.find((node) => node.id === "loop:alpha");
        assert.equal(alpha.fields.measurement[0].kind, "prose");
        assert.equal(alpha.fields.owner.kind, "unknown");
        assert.notEqual(alpha.fields.measurement[0].kind, alpha.fields.owner.kind, "prose is not conflated with unknown");
        const beta = result.nodes.find((node) => node.id === "loop:beta");
        assert.equal(beta.fields.actuator.length, 2, "a duplicate entry in a field list is KEPT — an enumeration, not a set");
        assert.deepEqual(beta.fields.actuator.map((entry) => entry.raw), ["command:a", "command:a"], "multiplicity and order are the author's statement");
        // A key's array-ness is the same on every node that declares it, whatever it declared.
        for (const key of ["reference", "measurement", "actuator", "ceiling"]) {
          assert.equal(Array.isArray(alpha.fields[key]) && Array.isArray(beta.fields[key]), true, `${key} is an ARRAY of Field on both nodes`);
        }
        for (const key of ["controlled", "cadence", "owner", "optimizing"]) {
          assert.equal(Array.isArray(alpha.fields[key]) || Array.isArray(beta.fields[key]), false, `${key} is a SINGLE Field on both nodes`);
        }
      });
    },
  ),

  testCase(
    "loops-commands/00 an endpoint's resolution reaches the wire as three distinct values",
    0,
    async () => {
      await withWorkspace({
        "alpha.md": loopRecord({
          fields: {
            "data-feed": "[loop:beta, loop:nowhere]",
            monitoring: "[command:work:next, module:src/run-store.mjs#isStale]",
          },
        }),
        "beta.md": loopRecord(),
        "root.md": actorRecord(),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture.workDir);
        const alpha = result.nodes.find((node) => node.id === "loop:alpha");
        const feed = alpha.edges["data-feed"];
        const watch = alpha.edges.monitoring;

        const declared = feed.find((endpoint) => endpoint.raw === "loop:beta");
        const dangling = feed.find((endpoint) => endpoint.raw === "loop:nowhere");
        const external = watch.find((endpoint) => endpoint.raw === "command:work:next");

        // ASSERTED BY IDENTITY: `null` is "not resolved here" and `false` is "declared and absent";
        // a consumer that coerced either to the other would read a dangling edge as an answer.
        assert.equal(declared.resolved, true, "an intra-registry endpoint that resolves carries resolved true");
        assert.equal(dangling.resolved, false, "a dangling intra-registry endpoint carries resolved false");
        assert.equal(external.resolved, null, "an extra-registry endpoint carries resolved null");
        assert.deepEqual([external.resolved, dangling.resolved, declared.resolved], [null, false, true], "null, false and true — never coerced to one another");
        assert.deepEqual(declared, { raw: "loop:beta", scheme: "loop", operand: "beta", resolved: true });
        assert.equal(external.scheme, "command");

        // The `module:` split is the SAME rule `Field.pointer` uses (ADR-011 §11/D4), so the two are
        // compared against each other rather than against two separate literals.
        const moduleEndpoint = watch.find((endpoint) => endpoint.raw.startsWith("module:"));
        assert.deepEqual(moduleEndpoint, {
          raw: "module:src/run-store.mjs#isStale", scheme: "module", operand: "src/run-store.mjs", symbol: "isStale", resolved: null,
        });
        const pointerField = alpha.fields.reference[0];
        assert.equal(Object.hasOwn(declared, "symbol"), false, "an endpoint with no # carries no symbol key at all");
        assert.equal(Object.hasOwn(external, "symbol"), false, "command:work:next carries no symbol key at all");
        assert.equal(pointerField.pointer.scheme, "module", "the field side of the same splitting rule is a module pointer");

        // `Node.edges` carries only DECLARED keys — no zero-filling (ADR-011 §11/D3).
        assert.deepEqual(keysOf(alpha.edges).sort(), ["data-feed", "monitoring"]);
        assert.deepEqual(keysOf(result.nodes.find((node) => node.id === "actor:root").edges), [], "a node declaring no edge key carries an edges map with no keys at all");

        // …and an unresolved endpoint is a REPORT, not a failure: the command returns normally and
        // validate — the verb that reports it — still exits 0 (decided at the process boundary by
        // the argv table's `work loops validate --json` row).
        const validated = await runCommand(VALIDATE, {}, fixture.workDir);
        assert.ok(validated.findings.some((finding) => finding.code === "loop-graph-dangling-endpoint"), "the dangling endpoint is reported");
      });
    },
  ),

  testCase(
    "loops-commands/00 the --id filter table — narrowing never changes the registry's own answer (table)",
    0,
    async () => {
      for (const row of ID_FILTER_CASES) {
        const label = `--id ${row.id ?? "(absent)"} over ${row.state}`;
        const files = row.state === "records" ? baseRegistry() : row.state === "empty" ? {} : null;
        const drive = async (fixture) => {
          const unfiltered = await runCommand(SHOW, {}, fixture.workDir);
          const result = await runCommand(SHOW, row.id == null ? {} : { id: row.id }, fixture.workDir);
          assert.equal(result.present, row.present, `${label}: present`);
          assert.equal(result.nodes.length, row.nodes, `${label}: node count`);
          if (row.id != null && row.nodes === 1) assert.equal(result.nodes[0].id, row.id, `${label}: that entry's id`);
          // The filter narrows the LIST and never the registry's own answer: `present` and `source`
          // are what the registry says, not what the filter matched.
          assert.equal(result.present, unfiltered.present, `${label}: the filter does not change present`);
          assert.equal(result.source, unfiltered.source, `${label}: the filter does not change source`);
          // "not an error": the run resolves and returns the envelope. The process exit for these
          // argv forms is decided by the argv table's spawned `--id` row.
          assert.deepEqual(keysOf(result), ["source", "present", "nodes"], `${label}: still the frozen envelope`);
          assert.equal(row.exit, 0, `${label}: the table's exit column`);
        };
        if (files === null) await withoutRegistry(drive);
        else await withWorkspace(files, drive);
      }
    },
  ),

  testCase(
    "loops-commands/00 the human render lists the nodes, and states an absent registry",
    0,
    async () => {
      await withWorkspace(baseRegistry(), async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture.workDir);
        const rendered = renderOf(SHOW, result);
        assert.match(rendered, /3 node\(s\)/, "the output states how many nodes were found");
        for (const node of result.nodes) {
          assert.ok(rendered.includes(`${node.id} \u00b7 ${node.kind} \u00b7 ${node.title}`), `${node.id}: id, kind and title are all named`);
        }
      });

      await withoutRegistry(async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture.workDir);
        const rendered = renderOf(SHOW, result);
        assert.ok(rendered.trim().length > 0, "the output is not empty");
        const match = rendered.match(/^No loop registry is declared at (.+)\.$/);
        assert.ok(match, `the output states that no loop registry is declared — got ${JSON.stringify(rendered)}`);
        // …NAMING the directory it looked in, checked by RESOLVING the printed path (the cwd trap).
        printedPathResolves(process.cwd(), match[1], fixture.loopsDir, "the absent-registry render");
      });
    },
  ),

  // -------------------------------------------------------------------------------------------
  // 01_loops-validate
  // -------------------------------------------------------------------------------------------
  testCase(
    "loops-commands/01 validate reports both lanes under one envelope, and two processes agree byte for byte",
    2,
    async () => {
      // A registry engineered to fire a code from EACH lane: a schema error and an honesty warn on
      // alpha, a dangling endpoint and a declared gap on beta, and check-lane verdicts besides.
      await withWorkspace({
        "alpha.md": loopRecord({ fields: { cadence: null, owner: "unknown", optimizing: "true" } }),
        "beta.md": loopRecord({ fields: { ceiling: "uncapped", "data-feed": "[loop:absent]" } }),
        "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }),
      }, async (fixture) => {
        const result = await runCommand(VALIDATE, {}, fixture.workDir);
        assert.ok(path.isAbsolute(result.source), "the result's source is a raw absolute");
        assert.ok(result.findings.every((finding) => path.isAbsolute(finding.path)), "every result finding path is a raw absolute");

        const spawned = runCli(["work", "loops", "validate", "--json"], { cwd: fixture.projectRoot });
        assert.equal(spawned.status, 1, `validate enforces error-severity findings (stderr: ${spawned.stderr})`);
        const document = oneJsonDocument(spawned, "validate --json");

        assert.deepEqual(keysOf(document), ["source", "present", "findings", "summary"], "the document's key set is exactly source, present, findings and summary");
        printedPathResolves(fixture.projectRoot, document.source, fixture.loopsDir, "validate's printed source");

        // EVERY finding survives the face as the frozen four-key envelope — the face spreads the
        // finding and overrides `path`, so this is the projection's guard, not the result's
        // (FF-5209 owns the result side and is not re-asserted).
        assert.ok(document.findings.length > 0, "the fixture fired findings, so the sweep below is non-vacuous");
        for (const finding of document.findings) {
          assert.deepEqual(keysOf(finding).sort(), ["code", "message", "path", "severity"], `${finding.code}: exactly the four envelope keys`);
          assert.ok(["warn", "error"].includes(finding.severity), `${finding.code}: severity is warn or error`);
          assert.equal(typeof finding.message === "string" && finding.message.length > 0, true, `${finding.code}: a non-empty message`);
          assert.equal(Object.hasOwn(finding, "problem"), false, `${finding.code}: no problem key`);
        }

        // …and the FACE relativises each finding's anchor against the invocation cwd.
        const printedSchema = document.findings.find((finding) => finding.code === "loop-missing-field");
        assert.ok(printedSchema, "the per-node schema violation reached the wire");
        printedPathResolves(fixture.projectRoot, printedSchema.path, fixture.pathOf("alpha.md"), "the printed finding path");

        // The counts agree with the list, and both lanes fired at once through the same result.
        assert.equal(document.summary.error, document.findings.filter((f) => f.severity === "error").length);
        assert.equal(document.summary.warn, document.findings.filter((f) => f.severity === "warn").length);
        assert.equal(document.summary.error + document.summary.warn, document.findings.length, "error + warn is the length of findings");
        assert.ok(document.summary.error > 0 && document.summary.warn > 0, "every lane fired at once");

        // DETERMINISM, in both the ways the feature states it: twice in one process, and byte for
        // byte across two separate processes.
        const repeated = await runCommand(VALIDATE, {}, fixture.workDir);
        assert.deepEqual(repeated.findings, result.findings, "the two findings arrays are element-for-element identical");
        const second = runCli(["work", "loops", "validate", "--json"], { cwd: fixture.projectRoot });
        assert.equal(second.status, 1);
        assert.equal(second.stdout, spawned.stdout, "two separate processes print byte-identical documents");
      });
    },
  ),

  testCase(
    "loops-commands/01 the registry-state table — each code fires at its own record (table)",
    0,
    async () => {
      for (const row of REGISTRY_STATE_CASES) {
        const label = row.state;
        const files = registryStateFiles(row);
        const drive = async (fixture) => {
          const result = await runCommand(VALIDATE, {}, fixture.workDir);
          const subjectPath = fixture.pathOf("subject.md");
          const errors = result.findings.filter((finding) => finding.severity === "error");
          assert.equal(errors.length, row.errors, `${label}: error findings (${errors.map((e) => e.code).join(", ")})`);
          assert.equal(row.exit, errors.length > 0 ? 1 : 0, `${label}: the face fails exactly when the result carries an error`);

          if (row.code === null) {
            assert.deepEqual(
              codesAt(result.findings, subjectPath).filter((code) => code !== "loop-anchor-absent"),
              [],
              `${label}: the record carries no milestone-52 finding of its own; milestone 55 computes anchor absence separately`,
            );
            return;
          }
          const reported = result.findings.filter((finding) => finding.code === row.code);
          assert.ok(reported.length > 0, `${label}: ${row.code} is reported`);
          for (const finding of reported) {
            assert.equal(finding.severity, row.severity, `${label}: ${row.code} severity`);
            assert.ok(finding.path.length > 0, `${label}: no finding carries an absent or empty path`);
          }
          if (row.anchor === "directory") {
            // A whole-graph verdict is a fact about the GRAPH, not about any one record.
            assert.ok(reported.every((finding) => finding.path === result.source && !finding.path.endsWith(".md")),
              `${label}: ${row.code} anchors at the loops directory, never at a member's file`);
          } else {
            assert.deepEqual(reported.map((finding) => finding.path), [subjectPath],
              `${label}: ${row.code} is anchored at that row's own record, and no other record in the fixture carries it`);
          }
        };
        if (files === null) await withoutRegistry(drive);
        else await withWorkspace(files, drive);
      }
    },
  ),

  testCase(
    "loops-commands/01 the three `ran` cases, pinned at the seam (table)",
    0,
    async () => {
      // THE MIGRATED SCENARIO. `ran` is the COMMAND's composition of the loader's `present` with the
      // five checks — derived from `Model.present` and from nothing any check returned (ADR-012
      // §2/B3) — so no check can decide it and `test/loop/work-loops-checks.test.mjs` routes it here.
      const measured = new Map();
      for (const row of RAN_CASES) {
        const label = row.state;
        const files = row.state === "no loops/ directory" ? null
          : row.state === "loops/ exists, no .md files" ? {}
            : row.state.startsWith("3 well-formed") ? wellFormedRegistry() : pathologicalRegistry();
        const drive = async (fixture) => {
          const result = await runCommand(VALIDATE, {}, fixture.workDir);
          assert.equal(result.present, row.present, `${label}: present`);
          assert.deepEqual(keysOf(result.summary.checks), [...CHECK_IDS],
            `${label}: summary.checks carries exactly the five frozen keys, in that order`);
          for (const id of CHECK_IDS) {
            const entry = result.summary.checks[id];
            assert.deepEqual(keysOf(entry).sort(), ["findings", "ran"], `${label}: ${id} is { ran, findings }`);
            assert.equal(entry.ran, row.ran, `${label}: ${id}.ran`);
            if (row.findings === 0 && row.loaderFindings === undefined) assert.equal(entry.findings, 0, `${label}: ${id}.findings`);
          }
          if (row.findings === 0 && row.loaderFindings === undefined) {
            assert.deepEqual(result.findings, [], `${label}: findings is empty`);
            assert.equal(result.summary.error, 0, `${label}: summary.error`);
            assert.equal(result.summary.warn, 0, `${label}: summary.warn`);
          }
          if (row.loaderFindings !== undefined) {
            // DEVIATION, recorded rather than papered over. This row's "findings 0" cannot be
            // satisfied by any NON-EMPTY registry on the shipped checks: `checkGrounding` emits one
            // verdict per strongly-connected component, and since `GROUND_VALUES` admits only
            // `exogenous`, a perfectly grounded component still reports
            // `loop-graph-grounded-exogenous-only`. What IS decidable — and is decided here — is
            // that the LOADER lane is silent over well-formed records, that every check ran, and
            // that the four checks the row is really about report zero. Raised as a finding against
            // the milestone (STATE.md `## Feedback (for retro)`); the scenario is NOT rewritten.
            assert.equal(loaderLane(result.findings).length, row.loaderFindings, `${label}: the loader lane is silent`);
            for (const id of ["pairing", "reference-ownership", "actuator-arbitration", "timescale"]) {
              assert.equal(result.summary.checks[id].findings, 0, `${label}: ${id} ran and found nothing`);
            }
            assert.ok(result.summary.checks.grounding.findings > 0, `${label}: grounding reports one verdict per component — see the deviation note`);
          }
          if (row.findings === "own") {
            const counts = CHECK_IDS.map((id) => result.summary.checks[id].findings);
            measured.set("counts", counts);
            const distinctNonZero = new Set(counts.filter((count) => count > 0));
            assert.ok(distinctNonZero.size >= 3,
              `${label}: at least three checks carry DIFFERENT non-zero counts, so a counter that always returns the same number fails — got ${counts.join("/")}`);
            assert.ok(counts.some((count) => count === 0), `${label}: and one check ran and found nothing`);
            // NO LOADER-LANE FINDING IS COUNTED AGAINST ANY CHECK.
            assert.equal(counts.reduce((sum, count) => sum + count, 0), checkLane(result.findings).length,
              `${label}: the five counts sum to the check lane exactly`);
            assert.ok(loaderLane(result.findings).length > 0, `${label}: the loader lane fired too, so the exclusion above is non-vacuous`);
            assert.equal(result.summary.error + result.summary.warn, result.findings.length);
          }
          // "no registry" and "checks ran clean" are never the same answer.
          assert.equal(row.invoked, row.present, `${label}: the checks are invoked exactly when a registry exists`);
        };
        if (files === null) await withoutRegistry(drive);
        else await withWorkspace(files, drive);
      }
      assert.ok(measured.has("counts"), "the populated row ran");

      // Each counter counts ITS OWN check's findings: one node's self-referential MONITORING edge is
      // pairing's, the other's self-referential TARGET-SETTING edge is reference-ownership's, and
      // timescale counts neither (ADR-012 §2/B1, §3/C1).
      // Both loops declare the frame's layer: the claim here is per-check ATTRIBUTION of two
      // self-edges, so the per-node layer census (58/ADR-002 §1a, in this very lane) would land
      // two more findings on `reference-ownership`'s counter and drown the attribution the case
      // exists to measure. A fixture whose subject is not the claim is repaired, not re-expected.
      await withWorkspace({
        "alpha.md": loopRecord({ fields: { monitoring: "[loop:alpha]", cadence: "periodic:10s", layer: FRAME_LAYER } }),
        "beta.md": loopRecord({ fields: { "target-setting": "[loop:beta]", cadence: "periodic:10s", layer: FRAME_LAYER } }),
        "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha, loop:beta]" } }),
      }, async (fixture) => {
        const result = await runCommand(VALIDATE, {}, fixture.workDir);
        const selfEdges = result.findings.filter((finding) => finding.code === "loop-self-referential-edge");
        assert.deepEqual(selfEdges.map((finding) => finding.path).sort(), [fixture.pathOf("alpha.md"), fixture.pathOf("beta.md")].sort());
        assert.equal(result.summary.checks.pairing.findings, 1, "pairing counts loop:alpha's self-referential monitoring edge");
        assert.equal(result.summary.checks["reference-ownership"].findings, 1, "reference-ownership counts loop:beta's self-referential target-setting edge");
        assert.equal(result.summary.checks.timescale.findings, 0, "timescale counts neither of them");
        assert.equal(result.findings.some((finding) => finding.code === "loop-timescale-inversion"), false, "and no timescale inversion is reported for either self-edge");
        assert.equal(CHECK_IDS.map((id) => result.summary.checks[id].findings).reduce((a, b) => a + b, 0), checkLane(result.findings).length);
        assert.equal(checkLane(result.findings).length < result.findings.length + 1, true);
      });
    },
  ),

  testCase(
    "loops-commands/01 a finding anchors at its node, at the directory or at its declaring node",
    0,
    async () => {
      // The ternary `path` rule's three legs in ONE registry, so the contrast is what is measured:
      // alpha omits `cadence:` (per-node), nothing is ground-bearing (whole-graph), and alpha
      // target-sets a loop whose cadence is not on a clock (per-edge).
      await withWorkspace({
        "alpha.md": loopRecord({ fields: { cadence: null, "target-setting": "[loop:beta]" } }),
        "beta.md": loopRecord({ fields: { cadence: "event:per-item" } }),
      }, async (fixture) => {
        const result = await runCommand(VALIDATE, {}, fixture.workDir);
        const alphaPath = fixture.pathOf("alpha.md");
        const betaPath = fixture.pathOf("beta.md");
        const only = (code) => result.findings.filter((finding) => finding.code === code);

        const perNode = only("loop-missing-field");
        assert.ok(perNode.length > 0, "the per-node finding fired");
        assert.deepEqual(perNode.map((finding) => finding.path), [alphaPath], "a per-node finding anchors at the node's own file");

        const wholeGraph = only("loop-graph-ungrounded-component");
        assert.ok(wholeGraph.length > 0, "the whole-graph finding fired");
        assert.ok(wholeGraph.every((finding) => finding.path === result.source && !finding.path.endsWith(".md")), "a whole-graph finding anchors at the loops directory");

        const perEdge = only("loop-timescale-not-comparable");
        assert.ok(perEdge.length > 0, "the per-edge finding fired");
        assert.deepEqual(perEdge.map((finding) => finding.path), [alphaPath], "a per-edge finding anchors at the file the edge is DECLARED in");
        assert.equal(perEdge.some((finding) => finding.path === betaPath), false, "never the endpoint's file");
        assert.equal(perEdge.some((finding) => finding.path === result.source), false, "and never the directory");

        for (const finding of result.findings) {
          assert.equal(typeof finding.path === "string" && finding.path.length > 0, true, `${finding.code}: no finding carries an absent or empty path`);
        }
      });
    },
  ),

  testCase(
    "loops-commands/01 the frozen finding-order table — the positions one fixture pins (table)",
    0,
    async () => {
      // TABLE TRACING, not a second home for the order rule: FF-5209 owns the frozen concatenation
      // (with both mutation non-vacuity legs), and `01_loops-validate`'s ordering SCENARIO is
      // excluded to it. What is driven here is the table's own claim — the five named findings'
      // RELATIVE positions over the fixture the table describes.
      await withWorkspace({
        "alpha.md": loopRecord({ fields: { cadence: null, owner: "unknown" } }),
        "beta.md": loopRecord({ fields: { ceiling: "uncapped", optimizing: "true" } }),
      }, async (fixture) => {
        const result = await runCommand(VALIDATE, {}, fixture.workDir);
        const positions = [];
        for (const row of FINDING_ORDER_CASES) {
          // The table's "anchored at / emitted by" column names a FILE for a loader row and the
          // emitting CHECK for a check row — the two lanes are addressed differently on purpose.
          const index = row.lane === "loader"
            ? result.findings.findIndex((finding) => finding.code === row.code && finding.path === fixture.pathOf(row.at))
            : result.findings.findIndex((finding) => finding.code === row.code);
          assert.ok(index >= 0, `position ${row.position}: ${row.code} at ${row.at} was emitted`);
          positions.push({ ...row, index });
        }
        // …and the two check rows carry the two anchor SPECIES, so "grounding then pairing" is a
        // `summary.checks` ordering and not a path or severity ordering in disguise.
        assert.equal(result.findings[positions[3].index].path, result.source, "the grounding verdict anchors at the loops directory");
        assert.equal(result.findings[positions[4].index].path, fixture.pathOf("beta.md"), "the pairing verdict anchors at the optimizing node's own file");
        for (let cursor = 1; cursor < positions.length; cursor += 1) {
          const previous = positions[cursor - 1];
          const current = positions[cursor];
          assert.ok(previous.index < current.index,
            `position ${previous.position} (${previous.code}) precedes position ${current.position} (${current.code})`);
        }
        // …and the loader lane leads the check lane whatever the severities, which is what makes the
        // 3 -> 4 step above a lane boundary rather than an accident of this fixture.
        const lastLoader = positions.filter((entry) => entry.lane === "loader").at(-1).index;
        const firstCheck = positions.find((entry) => entry.lane === "checks").index;
        assert.ok(lastLoader < firstCheck, "every loader-lane finding precedes every check-lane finding");
      });
    },
  ),

  testCase(
    "loops-commands/01 the human render summarises counts, and states an absent registry",
    0,
    async () => {
      await withWorkspace({
        "alpha.md": loopRecord({ fields: { cadence: null, owner: "unknown" } }),
        "beta.md": loopRecord({ fields: { ceiling: "uncapped" } }),
      }, async (fixture) => {
        const result = await runCommand(VALIDATE, {}, fixture.workDir);
        const rendered = renderOf(VALIDATE, result);
        assert.ok(rendered.includes(`${result.summary.error} error(s)`), "the output states the error count");
        assert.ok(rendered.includes(`${result.summary.warn} warning(s)`), "the output states the warn count");
        assert.ok(result.findings.length > 0, "the fixture fired findings, so the sweep below is non-vacuous");
        for (const finding of result.findings) {
          assert.ok(rendered.includes(finding.code), `${finding.code}: the output lists the code`);
          assert.ok(rendered.includes(path.relative(process.cwd(), finding.path) || "."), `${finding.code}: the output names the file it is anchored at`);
        }
      });

      await withoutRegistry(async (fixture) => {
        const result = await runCommand(VALIDATE, {}, fixture.workDir);
        const rendered = renderOf(VALIDATE, result);
        const match = rendered.match(/^No loop registry is declared at (.+)\.$/);
        assert.ok(match, `the output states that no loop registry is declared — got ${JSON.stringify(rendered)}`);
        printedPathResolves(process.cwd(), match[1], fixture.loopsDir, "validate's absent-registry render");
        assert.doesNotMatch(rendered, /0 error\(s\)|clean|passed/i, "the output does NOT claim the registry passed");
      });
    },
  ),

  // -------------------------------------------------------------------------------------------
  // 02_loops-graph-mermaid
  // -------------------------------------------------------------------------------------------
  testCase(
    "loops-commands/02 graph's six-key envelope, its printed diagram and two processes' bytes",
    3,
    async () => {
      await withWorkspace({
        "alpha.md": loopRecord({ fields: { "target-setting": "[loop:beta]" } }),
        "beta.md": loopRecord(),
        "root.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }),
      }, async (fixture) => {
        const jsonRun = runCli(["work", "loops", "graph", "--json"], { cwd: fixture.projectRoot });
        const bareRun = runCli(["work", "loops", "graph"], { cwd: fixture.projectRoot });
        const bareAgain = runCli(["work", "loops", "graph"], { cwd: fixture.projectRoot });

        assert.equal(jsonRun.status, 0, `graph --json exits 0 (stderr: ${jsonRun.stderr})`);
        assert.equal(bareRun.status, 0, `graph exits 0 (stderr: ${bareRun.stderr})`);
        assert.equal(bareAgain.status, 0);

        const document = oneJsonDocument(jsonRun, "graph --json");
        assert.deepEqual(keysOf(document), ["source", "present", "format", "text", "nodeCount", "edgeCount"],
          "exactly the keys source, present, format, text, nodeCount and edgeCount");
        assert.equal(document.format, "mermaid");
        assert.equal(document.present, true);
        assert.equal(document.nodeCount, 3, "nodeCount is 3");
        assert.equal(document.edgeCount, 2, "edgeCount is 2");
        printedPathResolves(fixture.projectRoot, document.source, fixture.loopsDir, "graph's printed source");

        // The human output IS the diagram: first line, every node named, and the same BYTES the
        // `--json` document carries (`console.log` adds the one trailing newline).
        assert.equal(bareRun.stdout.split("\n")[0], "flowchart LR", "the diagram's first line begins with flowchart");
        for (const id of ["loop:alpha", "loop:beta", "actor:root"]) {
          assert.ok(bareRun.stdout.includes(id), `the diagram names ${id}`);
        }
        assert.equal(bareRun.stdout, `${document.text}\n`, "the JSON text is byte-identical to the diagram the bare command prints");

        // BYTE IDENTITY ACROSS SEPARATE PROCESSES — the leg no gate owns: FF-5208's fresh-process
        // check renders a literal model, never the CLI over records on disk.
        assert.equal(bareAgain.stdout, bareRun.stdout, "two separate CLI processes emit byte-identical diagrams");
      });
    },
  ),

  testCase(
    "loops-commands/02 the diagram is fixed by the registry, not by the order it was authored or read",
    0,
    async () => {
      const textFor = async (files) => withWorkspace(files, async (fixture) => (await runCommand(GRAPH, {}, fixture.workDir)).text);

      // AUTHORING ORDER: the same three records, created in the opposite order. The fixture writes
      // sequentially on purpose, so creation order is the only lever a case has here.
      const authored = { "alpha.md": loopRecord(), "beta.md": loopRecord(), "root.md": actorRecord() };
      assert.equal(await textFor(authored), await textFor(reversedFiles(authored)), "the two texts are byte-identical");

      // LEXICOGRAPHIC id ORDER, and its independence from directory read order: the same three ids
      // in files whose names sort the other way.
      const byId = { "alpha.md": loopRecord({ id: "loop:alpha" }), "root.md": actorRecord({ id: "actor:root" }), "zulu.md": loopRecord({ id: "loop:zulu" }) };
      const renamed = { "3-alpha.md": loopRecord({ id: "loop:alpha" }), "2-root.md": actorRecord({ id: "actor:root" }), "1-zulu.md": loopRecord({ id: "loop:zulu" }) };
      const orderText = await textFor(byId);
      const renamedText = await textFor(renamed);
      const keysIn = (text) => nodeLines(text).map((line) => line.trim().split(/[[(]/, 1)[0]);
      assert.deepEqual(keysIn(orderText), ["actor_root", "loop_alpha", "loop_zulu"], "the node lines appear in id order");
      assert.deepEqual(keysIn(renamedText), keysIn(orderText), "that order is unchanged when the record files are renamed to change directory read order");

      // EDGE ORDER by (source, edge type, target). FF-5208's literal model has exactly ONE node
      // carrying edges, so it cannot discriminate the SOURCE leg of the sort; this fixture has two.
      const edgesFirst = {
        "alpha.md": loopRecord({ fields: { monitoring: "[loop:zulu]", "data-feed": "[loop:zulu, loop:beta]" } }),
        "beta.md": loopRecord({ fields: { "data-feed": "[loop:zulu]" } }),
        "zulu.md": loopRecord({ id: "loop:zulu" }),
      };
      const edgesReordered = {
        "alpha.md": loopRecord({ fields: { "data-feed": "[loop:beta, loop:zulu]", monitoring: "[loop:zulu]" } }),
        "beta.md": loopRecord({ fields: { "data-feed": "[loop:zulu]" } }),
        "zulu.md": loopRecord({ id: "loop:zulu" }),
      };
      const expectedEdges = [
        "  loop_alpha -->|data-feed| loop_beta",
        "  loop_alpha -->|data-feed| loop_zulu",
        "  loop_alpha -->|monitoring| loop_zulu",
        "  loop_beta -->|data-feed| loop_zulu",
      ];
      assert.deepEqual(edgeLines(await textFor(edgesFirst)), expectedEdges, "4 edge lines, sorted by source, then edge type, then target");
      assert.deepEqual(edgeLines(await textFor(edgesReordered)), expectedEdges, "unchanged when the same edges are declared in a different order inside each record");

      // `--format mermaid` is the DEFAULT spelled out — a claim about the value the run returns, so
      // it is decided in process; the argv row that spawns it is decided by the argv table.
      await withWorkspace(baseRegistry(), async (fixture) => {
        const explicit = await runCommand(GRAPH, { format: "mermaid" }, fixture.workDir);
        const implicit = await runCommand(GRAPH, {}, fixture.workDir);
        assert.equal(explicit.format, "mermaid");
        assert.equal(implicit.format, "mermaid");
        assert.equal(explicit.text, implicit.text, "--format mermaid is byte-identical to the no-flag output");
      });
    },
  ),

  testCase(
    "loops-commands/02 the glyph table — an authored record becomes its emitted line (table)",
    0,
    async () => {
      // The table is traced END TO END — from the frontmatter a human authors, through the loader,
      // to the line the reader sees. FF-5208 pins the same glyphs over a hand-built literal model
      // and owns those scenarios; what is added here is that a RECORD ON DISK produces them.
      await withWorkspace({
        "alpha.md": loopRecord({
          title: "Alpha",
          fields: {
            "data-feed": "[loop:nowhere]",
            "target-setting": "[loop:beta]",
            monitoring: "[command:work:next, module:src/run-store.mjs#isStale, module:src/a-b.mjs#run, module:src/a.b.mjs#run]",
            "parameter-tuning": "[config:work.autonomous.maxAttempts]",
          },
        }),
        "beta.md": loopRecord({ title: "Beta" }),
        "root.md": actorRecord({ title: "Root" }),
      }, async (fixture) => {
        const result = await runCommand(GRAPH, {}, fixture.workDir);
        const lines = result.text.split("\n").map((line) => line.trim());
        for (const row of GLYPH_LINE_CASES) {
          assert.ok(lines.includes(row.line), `${row.subject}: the emitted line is exactly ${row.line}`);
          if (row.key != null) {
            assert.ok(lines.filter((line) => line.startsWith(`${row.key}[`) || line.startsWith(`${row.key}(`)).length === 1,
              `${row.subject}: exactly one node line carries the key ${row.key}`);
          }
        }
        // A `config:` endpoint takes the same TOTAL rule — BOTH dots replaced — and its edge counts
        // like any other; and the two colliding module endpoints are suffixed in id-sort order
        // ("-" sorts before "." under code units), never merged.
        assert.ok(lines.includes("loop_alpha -->|parameter-tuning| config_work_autonomous_maxAttempts"), "the config endpoint's edge line");
        assert.equal(result.edgeCount, 7, "edgeCount counts the config edge like any other — 1 data-feed + 1 target-setting + 4 monitoring + 1 parameter-tuning");
        assert.equal(nodeLines(result.text).length, 9, "two distinct node lines for the collision — nothing is merged");
        const collided = lines.filter((line) => line.startsWith("module_src_a_b_mjs_run"));
        assert.deepEqual(collided, [
          'module_src_a_b_mjs_run[/"module:src/a-b.mjs#run"/]',
          'module_src_a_b_mjs_run_2[/"module:src/a.b.mjs#run"/]',
        ], "the suffix follows id-sort order, never the order the two were declared in the record");
      });
    },
  ),

  testCase(
    "loops-commands/02 the fingerprint table — equal models render equal text (table)",
    0,
    async () => {
      // "Fingerprint" is an EQUALITY RELATION, never a literal digest: rows sharing a label must be
      // byte-identical and rows with different labels must differ.
      const seen = new Map();
      for (const row of FINGERPRINT_CASES) {
        const files = row.reversed ? reversedFiles(row.files) : row.files;
        const drive = async (fixture) => {
          const result = await runCommand(GRAPH, {}, fixture.workDir);
          assert.equal(result.nodeCount, row.nodeCount, `${row.shape}: nodeCount`);
          assert.equal(result.edgeCount, row.edgeCount, `${row.shape}: edgeCount`);
          if (!seen.has(row.fingerprint)) seen.set(row.fingerprint, []);
          seen.get(row.fingerprint).push({ shape: row.shape, text: result.text });
        };
        if (files === null) await withoutRegistry(drive);
        else await withWorkspace(files, drive);
      }
      for (const [label, group] of seen) {
        for (const entry of group) {
          assert.equal(entry.text, group[0].text, `${label}: ${entry.shape} is byte-identical to ${group[0].shape}`);
        }
      }
      const labels = [...seen.keys()];
      for (const left of labels) {
        for (const right of labels) {
          if (left === right) continue;
          assert.notEqual(seen.get(left)[0].text, seen.get(right)[0].text, `${left} and ${right} are different pictures`);
        }
      }
      // The row whose Given is "rendered in a second process" is asserted for its counts and its
      // equality here; the cross-PROCESS byte identity it names is a process claim and is decided by
      // "loops-commands/02 graph's six-key envelope, its printed diagram and two processes' bytes".
      assert.ok(FINGERPRINT_CASES.some((row) => row.crossProcess), "the cross-process row is declared");
    },
  ),

  testCase(
    "loops-commands/02 the counts table — nodeCount, edgeCount and the node lines they describe (table)",
    0,
    async () => {
      for (const row of COUNTS_CASES) {
        const drive = async (fixture) => {
          const result = await runCommand(GRAPH, {}, fixture.workDir);
          // ASSERTED TOGETHER, so a renderer that dropped an endpoint node is caught: the two counts
          // AND the picture they describe are one observation, not three.
          assert.deepEqual(
            { nodeCount: result.nodeCount, edgeCount: result.edgeCount, lines: nodeLines(result.text).length },
            { nodeCount: row.nodeCount, edgeCount: row.edgeCount, lines: row.lines },
            `${row.shape}: nodeCount, edgeCount and node lines`,
          );
        };
        if (row.files === null) await withoutRegistry(drive);
        else await withWorkspace(row.files, drive);
      }

      // The scenario's own fixture (ADR-012 §5/E2): declared records only on one side, every
      // declared edge on the other, and a picture legitimately larger than both.
      await withWorkspace({
        "alpha.md": loopRecord({ fields: { "data-feed": "[loop:beta, loop:nowhere]", monitoring: "[command:work:next]" } }),
        "beta.md": loopRecord(),
      }, async (fixture) => {
        const graph = await runCommand(GRAPH, {}, fixture.workDir);
        const show = await runCommand(SHOW, {}, fixture.workDir);
        assert.equal(graph.nodeCount, 2, "nodeCount is the declared records, and nothing else");
        assert.equal(graph.edgeCount, 3, "edgeCount is every declared edge, the dangling and extra-registry ones included");
        const lines = nodeLines(graph.text);
        assert.equal(lines.length, 4, "the text carries 4 node lines");
        assert.ok(graph.nodeCount < lines.length, "nodeCount is SMALLER than the number of node lines — the contract, not a defect");
        assert.equal(graph.nodeCount, show.nodes.length, "nodeCount equals the number of nodes work:loops-show reports over the same registry");
      });
    },
  ),

  testCase(
    "loops-commands/02 an unsupported format is one coded envelope and a non-zero exit",
    1,
    async () => {
      await withWorkspace(baseRegistry(), async (fixture) => {
        const refused = runCli(["work", "loops", "graph", "--format", "dot", "--json"], { cwd: fixture.projectRoot });
        const document = oneJsonDocument(refused, "graph --format dot --json");
        assert.equal(document.ok, false, "an error envelope carrying ok false");
        assert.equal(document.code, "unsupported-format", "a stable code");
        assert.equal(typeof document.error === "string" && document.error.length > 0, true, "and a message");
        assert.equal(Object.hasOwn(document, "text"), false, "it carries no text key and no diagram");
        assert.doesNotMatch(refused.stdout, /flowchart/, "no diagram is printed");
        assert.notEqual(refused.status, 0, "the process exits non-zero");
      });
    },
  ),

  testCase(
    "loops-commands/02 absence and emptiness are distinguishable on every verb",
    2,
    async () => {
      // THE MIGRATED GATE LEG, in process and over all three verbs: a repository with no registry is
      // not an error condition for any of them, and an EMPTY directory is a different fact again.
      const answers = new Map();
      const drive = async (state, fixture) => {
        const show = await runCommand(SHOW, {}, fixture.workDir);
        const graph = await runCommand(GRAPH, {}, fixture.workDir);
        const validate = await runCommand(VALIDATE, {}, fixture.workDir);
        const present = state === "empty";
        for (const [id, result] of [[SHOW, show], [GRAPH, graph], [VALIDATE, validate]]) {
          assert.equal(result.present, present, `${state}: ${id} reports present ${present}`);
          assert.equal(result.source, fixture.loopsDir, `${state}: ${id}'s source still names the directory that would hold the registry`);
        }
        assert.deepEqual(show.nodes, [], `${state}: show returns no nodes`);
        assert.equal(graph.nodeCount, 0, `${state}: nodeCount is 0`);
        assert.equal(graph.edgeCount, 0, `${state}: edgeCount is 0`);
        assert.equal(graph.text, "flowchart LR", `${state}: a syntactically valid Mermaid flowchart with no node lines`);
        assert.deepEqual(nodeLines(graph.text), [], `${state}: no node lines`);
        assert.deepEqual(validate.findings, [], `${state}: findings is empty`);
        // The five check entries appear in the SAME order in both, differing only in whether they ran.
        assert.deepEqual(keysOf(validate.summary.checks), [...CHECK_IDS], `${state}: the five keys, in order`);
        for (const id of CHECK_IDS) {
          assert.deepEqual(validate.summary.checks[id], { ran: present, findings: 0 }, `${state}: ${id}`);
        }
        answers.set(state, { graphText: graph.text, checks: keysOf(validate.summary.checks) });
      };
      await withoutRegistry(async (fixture) => drive("absent", fixture));
      await withWorkspace({}, async (fixture) => drive("empty", fixture));
      assert.equal(answers.get("absent").graphText, answers.get("empty").graphText, "text is byte-identical to the text emitted when the directory is absent");
      assert.deepEqual(answers.get("absent").checks, answers.get("empty").checks, "the same five keys in the same order");

      // …and at the PROCESS boundary, where the exit code lives: both spawns exit 0 and print the
      // same empty diagram bytes.
      const spawnGraph = async (files) => {
        const drive = (fixture) => runCli(["work", "loops", "graph", "--json"], { cwd: fixture.projectRoot });
        return files === null ? withoutRegistry(drive) : withWorkspace(files, drive);
      };
      const absentRun = await spawnGraph(null);
      const emptyRun = await spawnGraph({});
      assert.equal(absentRun.status, 0, `graph over an absent registry exits 0 (stderr: ${absentRun.stderr})`);
      assert.equal(emptyRun.status, 0, `graph over an empty registry exits 0 (stderr: ${emptyRun.stderr})`);
      const absentDocument = oneJsonDocument(absentRun, "graph over an absent registry");
      const emptyDocument = oneJsonDocument(emptyRun, "graph over an empty registry");
      assert.equal(absentDocument.present, false);
      assert.equal(emptyDocument.present, true);
      assert.equal(absentDocument.text, emptyDocument.text, "both texts are byte-identical valid empty diagrams");
    },
  ),

  // -------------------------------------------------------------------------------------------
  // 03_registration-and-routing
  // -------------------------------------------------------------------------------------------
  testCase(
    "loops-commands/03 the argv table — what each form resolves to and what the process answers (table)",
    12,
    async () => {
      await withWorkspace(wellFormedRegistry(), async (fixture) => {
        const commands = listCommands();
        for (const row of ARGV_ROUTE_CASES) {
          const label = `aof ${row.argv.join(" ")}`;
          // WHAT IT RESOLVES TO — every row, in process. (FF-5207 owns the three triples and the
          // null for the bare family word; this sweep is the table's tracing, over forms it never
          // sees: the `--id` form, the successor's singular `work:loop` route, and `work list`.)
          const routed = resolveRoute(row.argv, commands);
          if (row.id === null) assert.equal(routed, null, `${label}: resolves to no command`);
          else assert.equal(routed?.command?.id, row.id, `${label}: resolves to ${row.id}`);

          if (row.scope !== undefined) {
            assert.deepEqual(routed.rest, [row.scope], `${label}: the unmatched route word is the loop scope`);
            const input = routed.command.cli.argv(routed.rest, {});
            assert.equal(input.scope, row.scope, `${label}: the loop argv adapter receives scope ${row.scope}`);
            await assert.rejects(
              () => invoke(row.id, input, {
                workspace: {
                  workDir: fixture.workDir,
                  aofDir: path.dirname(fixture.loopsDir),
                  config: {},
                },
              }),
              (error) => {
                assert.equal(error.code, row.refusal.code, `${label}: the command refuses with its coded scope guard`);
                assert.equal(error.message, row.refusal.message, `${label}: the coded refusal keeps its process message`);
                assert.equal(error.detail?.scope, row.scope, `${label}: the refusal names the rejected scope`);
                return true;
              },
            );
          }

          if (!row.spawn) {
            assert.ok(DECLARED.has(row.decidedBy), `${label}: its process answer is decided by ${row.decidedBy}`);
            continue;
          }

          // WHAT THE PROCESS ANSWERS — the twelve forms this case drives.
          const result = runCli(row.argv, { cwd: fixture.projectRoot });
          if (row.exit === 0) assert.equal(result.status, 0, `${label}: exits 0 (stderr: ${result.stderr})`);
          else assert.notEqual(result.status, 0, `${label}: exits non-zero`);

          if (row.envelope === null) {
            // No envelope from any of the three plural-family verbs is printed. The singular
            // successor route is valid, but its inadmissible scope is likewise a stderr refusal.
            assert.equal(result.stdout.trim(), "", `${label}: prints no envelope on stdout`);
            assert.ok(result.stderr.trim().length > 0, `${label}: the CLI refuses out loud`);
            if (row.refusal) assert.equal(result.stderr.trim(), row.refusal.message, `${label}: the process reports the coded refusal's message`);
          } else if (row.human) {
            assert.ok(result.stdout.trim().length > 0, `${label}: prints non-empty human output`);
            assert.throws(() => JSON.parse(result.stdout), `${label}: no raw JSON document`);
          } else if (row.envelope) {
            const document = oneJsonDocument(result, label);
            assert.ok(Object.hasOwn(document, row.envelope), `${label}: its own envelope (${row.envelope})`);
            if (row.nodes !== undefined) assert.equal(document.nodes.length, row.nodes, `${label}: node count`);
          }
        }

        // THE ID-SUFFIX IS NOT THE ROUTE — the case that falsified the bijection gate's old
        // assumption. `work:loops-*` is the first `work:`-namespaced command whose id-suffix is not
        // its route words, and the spawned hyphenated rows above show the process agrees.
        for (const row of ID_SUFFIX_CASES) {
          assert.equal(resolveRoute(row.routeWords, commands)?.command?.id, row.id, `${row.id}: resolves on its route words`);
          assert.equal(resolveRoute(row.suffixWords, commands), null, `${row.id}: does NOT resolve on its id-suffix`);
          assert.equal(row.onRoute && !row.onSuffix, true, `${row.id}: the table's two columns`);
        }
      });
    },
  ),

  testCase(
    "loops-commands/03 each verb is invocable in-process by its command id — the seam 53 composes through",
    0,
    async () => {
      await withWorkspace(wellFormedRegistry(), async (fixture) => {
        const ctx = { workspace: { workDir: fixture.workDir, aofDir: path.dirname(fixture.loopsDir) } };
        const show = await invoke(SHOW, {}, ctx);
        const graph = await invoke(GRAPH, {}, ctx);
        const validate = await invoke(VALIDATE, {}, ctx);

        assert.deepEqual(keysOf(show), ["source", "present", "nodes"]);
        assert.deepEqual(keysOf(graph), ["source", "present", "format", "text", "nodeCount", "edgeCount"]);
        assert.deepEqual(keysOf(validate), ["source", "present", "findings", "summary"]);
        assert.equal(show.nodes.length, 3, "each returns its contract result with no CLI process spawned");

        // A caller reads the SUMMARY, never a rendered string — the whole point of the seam.
        assert.deepEqual(keysOf(validate.summary), ["error", "warn", "checks"]);
        assert.deepEqual(keysOf(validate.summary.checks), [...CHECK_IDS]);
        assert.equal(typeof validate.summary.error, "number");
        assert.equal(typeof validate.summary.warn, "number");

        // Registration only. The route TRIPLE is FF-5207's first leg verbatim, and this story's
        // acceptance forbids a second home for it.
        for (const id of VERBS) {
          assert.ok(getCommand(id), `${id} is registered`);
        }
        for (const unknown of ["work:loops", "work:loops-frobnicate"]) {
          assert.equal(getCommand(unknown), undefined, `${unknown} is not a registered id`);
          await assert.rejects(() => invoke(unknown, {}, ctx), (error) => error.message.includes(unknown),
            `${unknown} is rejected as an unknown command id`);
        }
      });
    },
  ),

  testCase(
    "loops-commands/03 every verb resolves from a nested subdirectory with an explicit --config",
    3,
    async () => {
      await withWorkspace(wellFormedRegistry(), async (fixture) => {
        const runs = {
          [SHOW]: runCli(["work", "loops", "show", "--config", fixture.configPath, "--json"], { cwd: fixture.nested }),
          [GRAPH]: runCli(["work", "loops", "graph", "--config", fixture.configPath, "--json"], { cwd: fixture.nested }),
          [VALIDATE]: runCli(["work", "loops", "validate", "--config", fixture.configPath, "--json"], { cwd: fixture.nested }),
        };
        const shapes = { [SHOW]: "nodes", [GRAPH]: "text", [VALIDATE]: "findings" };
        for (const id of VERBS) {
          const result = runs[id];
          assert.equal(result.status, 0, `${id} from a nested subdirectory exits 0 (stderr: ${result.stderr})`);
          const document = oneJsonDocument(result, `${id} from a nested subdirectory`);
          assert.ok(Object.hasOwn(document, shapes[id]), `${id}: resolved to its own command`);
          assert.equal(document.present, true, `${id}: reports the same registry`);
          // Each names the SAME directory on disk, expressed relative to THAT subdirectory.
          printedPathResolves(fixture.nested, document.source, fixture.loopsDir, `${id}'s printed source`);
        }
      });
    },
  ),

  testCase(
    "loops-commands/03 the family shadows no existing command and writes nothing",
    4,
    async () => {
      // THE BIJECTION PROBE FIXTURE: a work stream carrying items and NO `loops/` directory — the
      // shape the gate's spawn-and-parse leg drives, and the other half of the retired gate leg.
      await withoutRegistry(async (fixture) => {
        const milestoneDir = path.join(fixture.workDir, "03_milestone_board");
        await mkdir(milestoneDir, { recursive: true });
        await writeFile(path.join(milestoneDir, "SPEC.md"),
          "---\ntype: milestone\nnumber: 03\nslug: board\nstatus: in-progress\ntitle: \"Board\"\ncreated: 2026-08-15\nupdated: 2026-08-15\n---\n# 03 · Board\n", "utf8");

        const before = await snapshotTree(fixture.temp);
        assert.ok(before.size > 1, "the snapshot recorded the fixture's file list and every file's bytes");

        for (const row of PROBE_CASES) {
          const label = `aof ${row.argv.join(" ")} in the probe fixture`;
          const result = runCli(row.argv, { cwd: fixture.projectRoot });
          assert.equal(result.status, row.exit, `${label}: exits ${row.exit} (stderr: ${result.stderr})`);
          const document = oneJsonDocument(result, label);
          assert.equal(document.present, row.present, `${label}: present is false`);
          if (row.id === SHOW) assert.deepEqual(document.nodes, [], `${label}: nodes is empty`);
          if (row.id === GRAPH) assert.deepEqual([document.nodeCount, document.edgeCount], [0, 0], `${label}: nodeCount and edgeCount are 0`);
          if (row.id === VALIDATE) assert.deepEqual(document.findings, [], `${label}: findings is empty`);
        }

        // …and the pre-existing route still answers exactly as it did.
        const listed = runCli(["work", "list", "--json"], { cwd: fixture.projectRoot });
        assert.equal(listed.status, 0, `aof work list --json exits 0 (stderr: ${listed.stderr})`);
        const rows = oneJsonDocument(listed, "work list --json");
        assert.ok(Array.isArray(rows), "work:list prints its own envelope unchanged — the bare rows array");
        assert.ok(rows.some((row) => row.ref === "03"), "the fixture's milestone is listed");

        assert.deepEqual(await snapshotTree(fixture.temp), before, "the fixture's file list and bytes are unchanged");
      });
    },
  ),

  testCase(
    "loops-commands/03 an undeclared flag is refused before the command runs",
    1,
    async () => {
      await withWorkspace(baseRegistry(), async (fixture) => {
        const refused = runCli(["work", "loops", "show", "--loop", "loop:alpha", "--json"], { cwd: fixture.projectRoot });
        const document = oneJsonDocument(refused, "show --loop --json");
        assert.equal(document.ok, false, "an error envelope carrying ok false");
        assert.equal(document.code, "unknown-flag", 'and the code "unknown-flag"');
        assert.equal(Object.hasOwn(document, "nodes"), false, "no node list is printed");
        assert.doesNotMatch(refused.stdout, /loop:alpha/, "the registry was never read into the output");
        assert.notEqual(refused.status, 0, "the process exits non-zero");
      });
    },
  ),

  testCase(
    "loops-commands/03 the three verbs print legible human output without --json",
    3,
    async () => {
      await withWorkspace(wellFormedRegistry(), async (fixture) => {
        const runs = {
          [SHOW]: runCli(["work", "loops", "show"], { cwd: fixture.projectRoot }),
          [GRAPH]: runCli(["work", "loops", "graph"], { cwd: fixture.projectRoot }),
          [VALIDATE]: runCli(["work", "loops", "validate"], { cwd: fixture.projectRoot }),
        };
        const expected = { [SHOW]: /node\(s\)/, [GRAPH]: /^flowchart/, [VALIDATE]: /error\(s\).*warning\(s\)/ };
        for (const id of VERBS) {
          const result = runs[id];
          assert.equal(result.status, 0, `${id} without --json exits 0 (stderr: ${result.stderr})`);
          assert.ok(result.stdout.trim().length > 0, `${id}: prints non-empty human output`);
          assert.match(result.stdout, expected[id], `${id}: prints its own legible face`);
          assert.throws(() => JSON.parse(result.stdout), `${id}: prints no raw JSON document`);
        }
      });
    },
  ),

  // -------------------------------------------------------------------------------------------
  // The suite's own claim about itself.
  // -------------------------------------------------------------------------------------------
  testCase(
    "loops-commands/05 the suite spends a process only where the claim is about the process, and its ledger resolves",
    0,
    async () => {
      const names = workLoopsCommandsTests.map((entry) => entry.name);
      assert.equal(new Set(names).size, names.length, "test names are unique");

      // (1) THE SPLIT, statically. A case's DECLARED spend is checked against its own source text:
      // a case that declares zero spawns must contain no call to the one spawn door, and a case that
      // declares a spend must contain one.
      for (const name of names) {
        const body = BODIES.get(name);
        assert.ok(typeof body === "string" && body.length > 0, `${name}: its source was captured`);
        assert.equal(/\brunCli\(/.test(body), DECLARED.get(name) > 0,
          `${name}: declares ${DECLARED.get(name)} spawns, and its body ${DECLARED.get(name) > 0 ? "must" : "must not"} reach the spawn door`);
      }

      // (2) THE SPLIT, dynamically. Every case that HAS RUN spent exactly what it declared — under-
      // as well as over-spending, which the static leg alone cannot see. Scoped to what has run, so
      // the claim is honest whether the suite runs whole or a case runs alone.
      for (const [name, spent] of SPAWNS) {
        assert.ok(DECLARED.has(name), `${name}: an unknown case spent a process`);
        assert.equal(spent, DECLARED.get(name), `${name}: spent ${spent} processes against a declared ${DECLARED.get(name)}`);
      }
      for (const name of RAN) {
        assert.equal(SPAWNS.get(name) ?? 0, DECLARED.get(name), `${name}: ran, and spent exactly the ${DECLARED.get(name)} processes it declared`);
      }
      assert.ok(RAN.size >= 1, "the ledger observed at least this case running");
      const declaredTotal = [...DECLARED.values()].reduce((sum, count) => sum + count, 0);
      assert.equal(declaredTotal, SPAWN_TOTAL, "the declared spend is the measured one");
      assert.ok(declaredTotal <= SPAWN_BUDGET, `the suite spends ${declaredTotal} processes against the story's ~${SPAWN_BUDGET} budget`);
      assert.ok([...SPAWNS.values()].reduce((sum, count) => sum + count, 0) <= SPAWN_BUDGET, "no more processes were spent than budgeted");

      // (3) EVERY SPAWN GOES THROUGH THE SHARED HELPER. Read from disk rather than remembered: a raw
      // `child_process` call here would re-open the Windows CreateProcess flake the helper exists for.
      const source = await readFile(SELF, "utf8");
      assert.doesNotMatch(source, /from\s+"node:child_process"/, "no raw child_process import");
      assert.doesNotMatch(source, /\bspawnSync\(|\bexecFile\(|\bexecFileSync\(/, "no raw spawn call form");
      // The call-site token is ASSEMBLED rather than written whole, for the obvious reason: a
      // literal search string written as a literal is its own first match.
      const door = `${"spawnCliSync"}(`;
      assert.equal(source.split(door).length - 1, 1, "the shared hardened spawn is called in exactly one place — the `runCli` door");
      // 119/03 — the suite sits one directory deeper, so the specifier to its shared helper does
      // too. The claim is that the SHARED helper is what is imported, not the depth it sits at.
      assert.match(source, /import \{ spawnCliSync \} from "(?:\.\.\/)+support\/cli-spawn\.mjs";/, "and it is the shared helper that is imported");

      // (4) THE COVERAGE LEDGER. decided ∪ excluded is EXACTLY the scenario-title set of the four
      // OWNED features; the migrated feature contributes exactly the one scenario this suite took.
      const owned = [F_SHOW, F_VALIDATE, F_GRAPH, F_ROUTING];
      assert.deepEqual(coverage.features, [...owned, F_CODES], "the covered feature set");
      for (const feature of owned) {
        const titles = scenarioTitles(await readFile(path.join(ROOT, feature), "utf8"));
        assert.ok(titles.length > 0, `${feature}: the parser matched scenarios — a parser that matched nothing would report total coverage of nothing`);
        const claimed = [...coverage.decided, ...coverage.excluded]
          .filter((entry) => entry.feature === feature)
          .map((entry) => entry.scenario);
        assert.equal(new Set(claimed).size, claimed.length, `${feature}: no scenario is claimed twice`);
        assert.deepEqual([...claimed].sort(), [...titles].sort(), `${feature}: decided ∪ excluded is exactly the scenario set`);
      }
      const migrated = coverage.decided.concat(coverage.excluded).filter((entry) => entry.feature === F_CODES);
      assert.deepEqual(migrated.map((entry) => entry.scenario), [MIGRATED_IN], "the migrated feature contributes exactly its one command-shaped scenario");
      assert.ok(scenarioTitles(await readFile(path.join(ROOT, F_CODES), "utf8")).includes(MIGRATED_IN), "and that title is one the feature really declares");

      // THE MIGRATION HANDSHAKE, resolved rather than asserted: the checks suite must exclude that
      // title as a `duplicate-claim` pointing at the decided title this suite owns.
      const checksSuite = await import(CHECKS_SUITE);
      const handshake = checksSuite.coverage.excluded.find((entry) => entry.scenario === MIGRATED_IN);
      assert.ok(handshake, "test/loop/work-loops-checks.test.mjs excludes the migrated scenario");
      assert.equal(handshake.class, "duplicate-claim");
      assert.equal(handshake.pointer, MIGRATED_IN, "and points at the title this suite decides");

      for (const entry of coverage.decided) {
        assert.ok(names.includes(entry.test), `${entry.scenario}: decided by a case in this module (${entry.test})`);
        assert.ok(coverage.features.includes(entry.feature), `${entry.scenario}: a covered feature`);
      }

      // (5) EXCLUSIONS RESOLVE. The nine loop gates are IMPORTED from disk, so a `structural-duplicate`
      // pointer is looked up rather than transcribed.
      const archDir = path.join(ROOT, "test", "arch");
      const archNames = new Set();
      // 119/03 — recursive; the gates live under `test/arch/loop/` now.
      for (const file of (await suiteFilesBelow(archDir)).filter((rel) => rel.split("/").pop().startsWith("acd-loop-"))) {
        const module = await import(pathToFileURL(path.join(archDir, file)).href);
        for (const entry of module.archTests ?? []) archNames.add(entry.name);
      }
      assert.ok(archNames.size > 0, "the loop-registry gates resolved");
      assert.ok(archNames.has(FF5208_FROZEN) && archNames.has(FF5209_CODE_TABLE), "both named gates resolved by name");
      // …and the leg this suite retired is GONE, while the gate itself still stands.
      assert.equal(archNames.has("arch/52 FF-5207: every verb reports an absent registry cleanly"), false,
        "the retired absent-registry gate leg no longer exists — its claim lives in this suite now");
      assert.ok(archNames.has("arch/52 FF-5207: registered loop commands own exact route triples and resolve without a ladder"),
        "and FF-5207's structural route-table leg remains in service as the family grows");

      const decidedTitles = new Set(coverage.decided.map((entry) => entry.scenario));
      for (const entry of coverage.excluded) {
        assert.ok(["structural-duplicate", "not-black-box", "duplicate-claim"].includes(entry.class), `${entry.scenario}: a declared exclusion class`);
        assert.ok(entry.reason.length > 0, `${entry.scenario}: states a reason`);
        if (entry.class === "structural-duplicate") assert.ok(archNames.has(entry.pointer), `${entry.scenario}: ${entry.pointer} is an exported gate name`);
        else if (entry.class === "not-black-box") assert.ok(names.includes(entry.pointer), `${entry.scenario}: ${entry.pointer} is the proxy driven here`);
        else assert.ok(decidedTitles.has(entry.pointer), `${entry.scenario}: ${entry.pointer} is a decided scenario`);
      }
      // SHRINK-ONLY: a new exclusion above the ceiling fails, and a ceiling left above the measured
      // count fails too, so ground gained is kept.
      const perClass = { "structural-duplicate": 10, "not-black-box": 0, "duplicate-claim": 0 };
      for (const [className, ceiling] of Object.entries(perClass)) {
        assert.equal(coverage.excluded.filter((entry) => entry.class === className).length, ceiling, `${className}: the measured count IS the ceiling`);
      }

      // (6) TABLE GRANULARITY. Each `cases` array is the one a parameterised case really iterates,
      // and its length is the row count PARSED from the feature — never a literal alone.
      let rowTotal = 0;
      for (const entry of coverage.tables) {
        const table = examplesTable(await readFile(path.join(ROOT, entry.feature), "utf8"), entry.index);
        assert.ok(table, `${entry.feature}#${entry.index}: the table is present`);
        assert.equal(table.rows.length, entry.rows, `${entry.feature}#${entry.index}: the parsed row count`);
        assert.ok(Array.isArray(entry.cases) && entry.cases.length > 0, `${entry.feature}#${entry.index}: a non-empty case array`);
        assert.equal(entry.cases.length, entry.rows, `${entry.feature}#${entry.index}: the case array is exactly the parsed row count`);
        rowTotal += entry.rows;
      }
      assert.equal(coverage.tables.length, 11, "eleven tables across the four covered features");
      assert.equal(rowTotal, 108, "and 108 rows, measured on disk");
      assert.equal(coverage.decided.length + coverage.excluded.length, 78, "77 covered scenarios plus the one migrated in");
    },
  ),
];

// ---------------------------------------------------------------------------------------------
// Readers over the features and the fixture tree. Kept below the cases so a reader meets the
// subjects first.
// ---------------------------------------------------------------------------------------------

/**
 * The Nth `Examples:` block of a feature — an INDEX into the shared parse
 * (`test/support/feature-parse.mjs`), never a second parser. This suite's four features are the
 * ones that TITLE their tables (`Examples: the declared value, …`), which is why the shared anchor
 * is the permissive one; a strict read of them is what produced F-52-05-D's 21-tables miscount.
 * `coverage.tables[].index` is an ordinal into that parse, so a second parser in the tree would
 * not merely disagree on a count — it would disagree on which table an entry names.
 */
const examplesTable = (text, index) => examplesTables(text)[index] ?? null;

/** Every file below `dir`, as a POSIX-relative path -> its bytes. The write-nothing observation. */
async function snapshotTree(dir, prefix = "") {
  const out = new Map();
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      for (const [nested, bytes] of await snapshotTree(full, key)) out.set(nested, bytes);
    } else {
      out.set(key, await readFile(full, "utf8"));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// THE COVERAGE LEDGER. Covered feature set: all four task features of 52/02, plus the ONE
// command-shaped scenario migrated in from 52/01's `05_frozen-finding-codes` (`ran` is derived by
// `work:loops-validate` from `Model.present`, so no check can decide it). `decided` names the case
// in this module that drives each scenario; `excluded` names the class, the reason, and the gate
// name the ledger case resolves from disk.
// ---------------------------------------------------------------------------------------------
export const coverage = {
  features: [F_SHOW, F_VALIDATE, F_GRAPH, F_ROUTING, F_CODES],
  decided: [
    // --- 00_loops-show ---------------------------------------------------------------------
    { feature: F_SHOW, scenario: "the JSON envelope over a declared registry", test: "loops-commands/00 show's result is the frozen three-key envelope and the same data reaches stdout as one document" },
    { feature: F_SHOW, scenario: "every node carries the six contract keys", test: "loops-commands/00 show's result is the frozen three-key envelope and the same data reaches stdout as one document" },
    { feature: F_SHOW, scenario: "the command result's source is a RAW ABSOLUTE path", test: "loops-commands/00 the result carries raw absolutes and each printed path resolves against its own invocation cwd" },
    { feature: F_SHOW, scenario: "the CLI face relativises source to the invocation cwd", test: "loops-commands/00 the result carries raw absolutes and each printed path resolves against its own invocation cwd" },
    { feature: F_SHOW, scenario: "a declared `owner: unknown` is visibly a gap, never an empty string", test: "loops-commands/00 the declared-value table — a field's shape comes from its key (table)" },
    { feature: F_SHOW, scenario: "a pointer field carries its parsed pointer parts", test: "loops-commands/00 the declared-value table — a field's shape comes from its key (table)" },
    { feature: F_SHOW, scenario: 'a `prose:` field is kind "prose" and is not conflated with "unknown"', test: "loops-commands/00 the declared-value table — a field's shape comes from its key (table)" },
    { feature: F_SHOW, scenario: "`fields` is shaped by the KEY, not by the data", test: "loops-commands/00 the declared-value table — a field's shape comes from its key (table)" },
    { feature: F_SHOW, scenario: "a lone sentinel on a list key is still an array of one", test: "loops-commands/00 the declared-value table — a field's shape comes from its key (table)" },
    { feature: F_SHOW, scenario: "a duplicate entry in a field list is KEPT — an enumeration of authorities, never a set like an edge list", test: "loops-commands/00 the declared-value table — a field's shape comes from its key (table)" },
    { feature: F_SHOW, scenario: "`cadence` arrives NORMALISED, never as a string a consumer must parse", test: "loops-commands/00 the declared-value table — a field's shape comes from its key (table)" },
    { feature: F_SHOW, scenario: "`owner`, `optimizing` and `ground` carry their own typed kinds", test: "loops-commands/00 the declared-value table — a field's shape comes from its key (table)" },
    { feature: F_SHOW, scenario: "an intra-registry endpoint that resolves carries resolved true", test: "loops-commands/00 an endpoint's resolution reaches the wire as three distinct values" },
    { feature: F_SHOW, scenario: "a dangling intra-registry endpoint carries resolved false", test: "loops-commands/00 an endpoint's resolution reaches the wire as three distinct values" },
    { feature: F_SHOW, scenario: "an extra-registry endpoint carries resolved null — distinct from false", test: "loops-commands/00 an endpoint's resolution reaches the wire as three distinct values" },
    { feature: F_SHOW, scenario: "a `module:` endpoint splits into operand and symbol, exactly as a pointer field does", test: "loops-commands/00 an endpoint's resolution reaches the wire as three distinct values" },
    { feature: F_SHOW, scenario: "a node's edges map carries only the edge types it declared", test: "loops-commands/00 an endpoint's resolution reaches the wire as three distinct values" },
    { feature: F_SHOW, scenario: "--id returns just that node", test: "loops-commands/00 the --id filter table — narrowing never changes the registry's own answer (table)" },
    { feature: F_SHOW, scenario: "an unknown --id returns an empty node list, not an error", test: "loops-commands/00 the --id filter table — narrowing never changes the registry's own answer (table)" },
    { feature: F_SHOW, scenario: "an existing but EMPTY loops directory is present, with zero nodes", test: "loops-commands/02 absence and emptiness are distinguishable on every verb" },
    { feature: F_SHOW, scenario: "no loops directory at all is present false — a different fact from an empty one", test: "loops-commands/02 absence and emptiness are distinguishable on every verb" },
    { feature: F_SHOW, scenario: "the human render lists the nodes legibly", test: "loops-commands/00 the human render lists the nodes, and states an absent registry" },
    { feature: F_SHOW, scenario: "the human render states an absent registry rather than printing nothing", test: "loops-commands/00 the human render lists the nodes, and states an absent registry" },

    // --- 01_loops-validate -----------------------------------------------------------------
    { feature: F_VALIDATE, scenario: "the JSON envelope", test: "loops-commands/01 validate reports both lanes under one envelope, and two processes agree byte for byte" },
    { feature: F_VALIDATE, scenario: "the summary counts agree with the findings list", test: "loops-commands/01 validate reports both lanes under one envelope, and two processes agree byte for byte" },
    { feature: F_VALIDATE, scenario: "each summary.checks counter counts ITS OWN check's findings, and the five sum to the check lane", test: "loops-commands/01 the three `ran` cases, pinned at the seam (table)" },
    { feature: F_VALIDATE, scenario: '"ran and found nothing" is distinguishable from "did not run"', test: "loops-commands/01 the three `ran` cases, pinned at the seam (table)" },
    { feature: F_VALIDATE, scenario: "an absent registry reports every check as NOT run, by name", test: "loops-commands/01 the three `ran` cases, pinned at the seam (table)" },
    { feature: F_VALIDATE, scenario: "an EMPTY but present registry reports every check as HAVING RUN, and clean", test: "loops-commands/01 the three `ran` cases, pinned at the seam (table)" },
    { feature: F_VALIDATE, scenario: "declared gaps are warn findings, and the command still exits 0", test: "loops-commands/01 the registry-state table — each code fires at its own record (table)" },
    { feature: F_VALIDATE, scenario: "every declared gap is visible — including a ceiling nobody could establish", test: "loops-commands/01 the registry-state table — each code fires at its own record (table)" },
    { feature: F_VALIDATE, scenario: "a schema violation is an error finding, and the command still exits 0", test: "loops-commands/01 the registry-state table — each code fires at its own record (table)" },
    { feature: F_VALIDATE, scenario: "the exit code is 0 even when every lane fires at once", test: "loops-commands/01 validate reports both lanes under one envelope, and two processes agree byte for byte" },
    { feature: F_VALIDATE, scenario: "every finding is the frozen four-key envelope", test: "loops-commands/01 validate reports both lanes under one envelope, and two processes agree byte for byte" },
    { feature: F_VALIDATE, scenario: "the command result's finding paths are RAW ABSOLUTE and the face relativises them", test: "loops-commands/01 validate reports both lanes under one envelope, and two processes agree byte for byte" },
    { feature: F_VALIDATE, scenario: "a per-node finding anchors at the node's file, a whole-graph finding at the directory, a per-EDGE finding at its declaring node", test: "loops-commands/01 a finding anchors at its node, at the directory or at its declaring node" },
    { feature: F_VALIDATE, scenario: "the finding list is deterministically ordered across repeated runs", test: "loops-commands/01 validate reports both lanes under one envelope, and two processes agree byte for byte" },
    { feature: F_VALIDATE, scenario: "the human render summarises counts by severity", test: "loops-commands/01 the human render summarises counts, and states an absent registry" },
    { feature: F_VALIDATE, scenario: "the human render states an absent registry rather than reporting a clean pass", test: "loops-commands/01 the human render summarises counts, and states an absent registry" },

    // --- 02_loops-graph-mermaid ------------------------------------------------------------
    { feature: F_GRAPH, scenario: "the human output is Mermaid flowchart text", test: "loops-commands/02 graph's six-key envelope, its printed diagram and two processes' bytes" },
    { feature: F_GRAPH, scenario: "byte-identical output across separate processes", test: "loops-commands/02 graph's six-key envelope, its printed diagram and two processes' bytes" },
    { feature: F_GRAPH, scenario: "output does not depend on the order the records were authored", test: "loops-commands/02 the diagram is fixed by the registry, not by the order it was authored or read" },
    { feature: F_GRAPH, scenario: "nodes are emitted in lexicographic id order", test: "loops-commands/02 the diagram is fixed by the registry, not by the order it was authored or read" },
    { feature: F_GRAPH, scenario: "edges are sorted by source, then edge type, then target", test: "loops-commands/02 the diagram is fixed by the registry, not by the order it was authored or read" },
    { feature: F_GRAPH, scenario: "a `config:` endpoint renders on the same total rule", test: "loops-commands/02 the glyph table — an authored record becomes its emitted line (table)" },
    { feature: F_GRAPH, scenario: "two endpoints that mangle to the same key are suffixed in id-sort order, never merged", test: "loops-commands/02 the glyph table — an authored record becomes its emitted line (table)" },
    { feature: F_GRAPH, scenario: "the JSON envelope", test: "loops-commands/02 graph's six-key envelope, its printed diagram and two processes' bytes" },
    { feature: F_GRAPH, scenario: "the JSON text is the same bytes as the human render's diagram", test: "loops-commands/02 graph's six-key envelope, its printed diagram and two processes' bytes" },
    { feature: F_GRAPH, scenario: "--format mermaid is accepted and is the same output as the default", test: "loops-commands/02 the diagram is fixed by the registry, not by the order it was authored or read" },
    { feature: F_GRAPH, scenario: "any other format value is refused with a coded error and no diagram", test: "loops-commands/02 an unsupported format is one coded envelope and a non-zero exit" },
    { feature: F_GRAPH, scenario: "no loops directory renders a valid EMPTY diagram rather than crashing", test: "loops-commands/02 absence and emptiness are distinguishable on every verb" },
    { feature: F_GRAPH, scenario: "an empty loops directory renders the same empty diagram, but present is true", test: "loops-commands/02 absence and emptiness are distinguishable on every verb" },
    { feature: F_GRAPH, scenario: "nodeCount counts DECLARED RECORDS, edgeCount counts EVERY declared edge, and the picture may be larger than both", test: "loops-commands/02 the counts table — nodeCount, edgeCount and the node lines they describe (table)" },

    // --- 03_registration-and-routing -------------------------------------------------------
    { feature: F_ROUTING, scenario: "each verb resolves and emits exactly one parseable JSON envelope", test: "loops-commands/03 the argv table — what each form resolves to and what the process answers (table)" },
    { feature: F_ROUTING, scenario: "each verb is invocable in-process by its command id — the seam 53 composes through", test: "loops-commands/03 each verb is invocable in-process by its command id — the seam 53 composes through" },
    { feature: F_ROUTING, scenario: "the in-process result and the CLI --json projection differ only in path basis", test: "loops-commands/00 the result carries raw absolutes and each printed path resolves against its own invocation cwd" },
    { feature: F_ROUTING, scenario: "the bijection probe argv answers clean on a work stream with no registry", test: "loops-commands/03 the family shadows no existing command and writes nothing" },
    { feature: F_ROUTING, scenario: "the hyphenated command id is not an argv form — the route words are", test: "loops-commands/03 the argv table — what each form resolves to and what the process answers (table)" },
    { feature: F_ROUTING, scenario: "EVERY verb answers on its route WORDS and NONE answers on its id-suffix", test: "loops-commands/03 the argv table — what each form resolves to and what the process answers (table)" },
    { feature: F_ROUTING, scenario: "an unknown fourth verb resolves to none of the three", test: "loops-commands/03 the argv table — what each form resolves to and what the process answers (table)" },
    { feature: F_ROUTING, scenario: "the bare family word resolves to nothing", test: "loops-commands/03 the argv table — what each form resolves to and what the process answers (table)" },
    { feature: F_ROUTING, scenario: "a mis-spelled family word resolves to nothing", test: "loops-commands/03 the argv table — what each form resolves to and what the process answers (table)" },
    { feature: F_ROUTING, scenario: "adding the family shadows no existing work route", test: "loops-commands/03 the family shadows no existing command and writes nothing" },
    { feature: F_ROUTING, scenario: "an undeclared flag is refused inside the one JSON envelope", test: "loops-commands/03 an undeclared flag is refused before the command runs" },
    { feature: F_ROUTING, scenario: "a workspace with no loops directory is valid on all three verbs", test: "loops-commands/03 the family shadows no existing command and writes nothing" },
    { feature: F_ROUTING, scenario: "every verb still resolves from a nested subdirectory of the workspace", test: "loops-commands/03 every verb resolves from a nested subdirectory with an explicit --config" },
    { feature: F_ROUTING, scenario: "the three verbs are usable without --json and print something legible", test: "loops-commands/03 the three verbs print legible human output without --json" },

    // --- 05_frozen-finding-codes (MIGRATED IN) ---------------------------------------------
    { feature: F_CODES, scenario: MIGRATED_IN, test: "loops-commands/01 the three `ran` cases, pinned at the seam (table)" },
  ],
  excluded: [
    {
      feature: F_VALIDATE,
      scenario: "the finding order is the frozen contract order, not an artefact of the order the lanes ran",
      class: "structural-duplicate",
      reason: "FF-5209 drives the REAL `loopsValidateCommand.run()` over a materialised registry and deep-equals its `findings` against the frozen loader-then-CHECK_IDS concatenation, with BOTH mutation non-vacuity legs (a reversed CHECK_IDS iteration and a check-lane-first emission) — which is how F-52-04-E was closed. The scenario's final clause, that a second process emits the same order, is decided here by the two-process byte-identity leg of the validate envelope case.",
      pointer: FF5209_CODE_TABLE,
    },
    {
      feature: F_GRAPH,
      scenario: "byte-identical output across repeated calls in one process",
      class: "structural-duplicate",
      reason: "The gate renders its literal model twice in the same process and deep-equals the two results before asserting the frozen text. The CROSS-process leg is a different claim and is decided here by two real CLI spawns.",
      pointer: FF5208_FROZEN,
    },
    {
      feature: F_GRAPH,
      scenario: "the edge type is the link label",
      class: "structural-duplicate",
      reason: "The gate pins every edge line of its fixture as a literal, label included, and separately deep-equals the extracted edge lines against that literal — the frontmatter key verbatim, never prettified.",
      pointer: FF5208_FROZEN,
    },
    {
      feature: F_GRAPH,
      scenario: "node shape differs by kind, so a loop and an actor are visually distinct",
      class: "structural-duplicate",
      reason: "The gate's literal carries a `kind: loop` rectangle and a `kind: actor` stadium in the same text, so the difference-and-consistency claim is decided by the same assertion that freezes the glyphs.",
      pointer: FF5208_FROZEN,
    },
    {
      feature: F_GRAPH,
      scenario: "the three node glyphs are the frozen literals of the contract",
      class: "structural-duplicate",
      reason: "This scenario IS the gate's headline leg: the rectangle, the stadium and the parallelogram are asserted as literal lines over a model carrying all three. The table of emitted lines is still traced here, end to end from records on disk.",
      pointer: FF5208_FROZEN,
    },
    {
      feature: F_GRAPH,
      scenario: 'a node key is the id with EVERY character outside [A-Za-z0-9_] replaced by "_"',
      class: "structural-duplicate",
      reason: "The gate asserts the total mangle over `command:work:next`, `config:work.foo` and a `module:` endpoint, then sweeps every emitted key against `^[A-Za-z0-9_]+$` — the totality claim and its regex, both.",
      pointer: FF5208_FROZEN,
    },
    {
      feature: F_GRAPH,
      scenario: 'a `module:` endpoint renders — its "/", "." and "#" are mangled too, and it is NOT dropped',
      class: "structural-duplicate",
      reason: "`module_src_run_store_mjs_isStale[/\"module:src/run-store.mjs#isStale\"/]` is a literal line of the gate's frozen text, and its node-line count leg proves the endpoint is not dropped in exchange for a cleaner key.",
      pointer: FF5208_FROZEN,
    },
    {
      feature: F_GRAPH,
      scenario: "every node key in the diagram is renderable and unique",
      class: "structural-duplicate",
      reason: "The gate extracts every key from the rendered text, asserts the regex, asserts set-size equals list-length, and pins the node-line count at seven over a model carrying four external or dangling endpoints.",
      pointer: FF5208_FROZEN,
    },
    {
      feature: F_GRAPH,
      scenario: "an edge line is the frozen arrow form",
      class: "structural-duplicate",
      reason: "The arrow form is a literal line of the gate's frozen text, and the gate additionally deep-equals every extracted edge line against the same literal.",
      pointer: FF5208_FROZEN,
    },
    {
      feature: F_GRAPH,
      scenario: "a dangling endpoint still renders, and is not silently dropped",
      class: "structural-duplicate",
      reason: "The gate's model declares `monitoring: [loop:missing]` with `resolved: false` and its frozen text carries `loop_missing[/\"loop:missing\"/]` — the parallelogram, never the rectangle a declared loop gets.",
      pointer: FF5208_FROZEN,
    },
  ],
  tables: [
    { feature: F_SHOW, index: 0, rows: 16, cases: DECLARED_VALUE_CASES },
    { feature: F_SHOW, index: 1, rows: 7, cases: ID_FILTER_CASES },
    { feature: F_VALIDATE, index: 0, rows: 30, cases: REGISTRY_STATE_CASES },
    { feature: F_VALIDATE, index: 1, rows: 4, cases: RAN_CASES },
    { feature: F_VALIDATE, index: 2, rows: 5, cases: FINDING_ORDER_CASES },
    { feature: F_GRAPH, index: 0, rows: 9, cases: GLYPH_LINE_CASES },
    { feature: F_GRAPH, index: 1, rows: 8, cases: FINGERPRINT_CASES },
    { feature: F_GRAPH, index: 2, rows: 6, cases: COUNTS_CASES },
    { feature: F_ROUTING, index: 0, rows: 17, cases: ARGV_ROUTE_CASES },
    { feature: F_ROUTING, index: 1, rows: 3, cases: PROBE_CASES },
    { feature: F_ROUTING, index: 2, rows: 3, cases: ID_SUFFIX_CASES },
  ],
};
