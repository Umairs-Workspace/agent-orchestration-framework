import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function FF-16705 (milestone 167 / ADR-008 — acd-presence-reads-runs-from-the-store):
// "The presence tick reads running runs and loops from `work_item_runs`: no function on its path
// calls `readRuns` or reads an item's `runs/` folder, and the `publish-run` reactor of
// `run.started` and `run.completed` writes the run row."
//
// WHY A STRUCTURAL CONTROL. 167/04's soak measured `mesh serve` at 12% of a core while idle, and
// the profile named the cause: the presence tick called `readRuns` for every item of every
// registered workspace, twice, every 15 s — about 3,600 `ENOENT`s over 1,800 docs for a folder
// that almost never exists. The behavioural suite (test/mesh/presence/
// mesh-presence-reads-runs-from-the-store.test.mjs) proves a tick over 1,800 items sees only the
// ledger-started run; THIS control holds the shape that makes that true, because the walk could be
// re-added inside any helper on the path with every behavioural case still green on a small tree.
//
// Proofs:
//  1. The tick's path — the launcher's aggregation and presence assembly, the presence seam's store
//     read and the loop-entry assembly — calls no `readRuns(`, `readActiveRuns(`,
//     `readActiveLoops(`, `runsDir(` or `readdir(` (comments stripped). `readRun(` (ONE record, for
//     a running loop's last activity) is the one disk read ADR-008 keeps, one per running run.
//  2. The aggregation reads this node's runs through the presence seam's `readStoreActivity`.
//  3. `run.started` and `run.completed` each declare a `publish-run` reactor — locus `local`,
//     retried until done (164/ADR-006) — beside the unchanged `publish-projection`.
//  Self-check (m03 non-vacuous): a path body that calls `readRuns(` trips the detector.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EFFECTS = _aofApplication.effects.reactors.EFFECTS;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LAUNCHER = path.join(repoRoot, "packages", "mesh", "src", "launcher.mjs");
const PRESENCE = path.join(repoRoot, "packages", "mesh", "src", "presence.mjs");

// The functions on the tick's path, by file. The launcher's two are the aggregation the tick runs and
// the record assembly that calls it; the presence seam's two are the store read and the shared
// loop-entry assembly it hands its records to.
const TICK_PATH = [
  { file: LAUNCHER, functions: ["assembleActiveRunsAndSubsumedWorkspaces", "assemblePresenceForTick"] },
  { file: PRESENCE, functions: ["readStoreActivity", "loopEntriesFor"] },
];
const FORBIDDEN_ON_PATH = [/\breadRuns\s*\(/, /\breadActiveRuns\s*\(/, /\breadActiveLoops\s*\(/, /\brunsDir\s*\(/, /\breaddir\s*\(/];

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// functionBody(code, name) — the text of a column-0 `[async ]function name(` declaration up to its
// closing `}` at column 0. Both files declare their functions at column 0 (inside a factory whose
// body is unindented), so the closing brace is unambiguous.
function functionBody(code, name) {
  const normalised = code.replace(/\r\n/g, "\n");
  const match = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, "m").exec(normalised);
  assert.ok(match, `${name} is declared at column 0`);
  const end = normalised.indexOf("\n}\n", match.index);
  assert.ok(end > match.index, `${name} closes at column 0`);
  return normalised.slice(match.index, end + 2);
}

function walkViolations(body, name) {
  return FORBIDDEN_ON_PATH.filter((pattern) => pattern.test(body)).map((pattern) => `${name} matches ${pattern}`);
}

export const archTests = [
  {
    name: "arch/167 ADR-008 (FF-16705): no function on the presence tick's path calls readRuns or reads an item's runs/ folder",
    run: async () => {
      const violations = [];
      for (const { file, functions } of TICK_PATH) {
        const code = stripComments(await readFile(file, "utf8"));
        for (const name of functions) violations.push(...walkViolations(functionBody(code, name), name));
      }
      assert.deepEqual(violations, [], `the tick walks no runs/ folder (violations: ${violations.join("; ")})`);
    },
  },
  {
    name: "arch/167 ADR-008 (FF-16705): the tick's aggregation reads this node's runs from the store through the presence seam (readStoreActivity), and the store read filters in SQL on the node and the running state",
    run: async () => {
      const launcher = stripComments(await readFile(LAUNCHER, "utf8"));
      assert.match(functionBody(launcher, "assembleActiveRunsAndSubsumedWorkspaces"), /\breadStoreActivity\s*\(/, "the aggregation calls readStoreActivity");
      const presence = stripComments(await readFile(PRESENCE, "utf8"));
      assert.match(functionBody(presence, "readStoreActivity"), /\breadNodeRunningRuns\s*\(/, "the presence seam reads the store's running rows for this node");
      // The read lives in content-reads.mjs (the store's read block, moved out under its size ratchet
      // at 167/06) and is returned from the store factory, which is how the presence seam gets it.
      const store = stripComments(await readFile(path.join(repoRoot, "packages", "mesh", "src", "content-reads.mjs"), "utf8"));
      assert.ok(store.includes("function readNodeRunningRuns"), "readNodeRunningRuns is defined in content-reads.mjs");
      const read = store.slice(store.indexOf("function readNodeRunningRuns"), store.indexOf("function readNodeRunningRuns") + 1200);
      assert.match(read, /node_id\s*=\s*\?/, "…bounded to one reporter");
      assert.match(read, /json_extract\(record_json,\s*'\$\.state'\)\s*=\s*'running'/, "…and to records that read running, in SQL, so the cost is the running runs and never the history");
    },
  },
  {
    name: "arch/167 ADR-008 (FF-16705): run.started and run.completed each declare a publish-run reactor — local, retried until done — beside publish-projection",
    run: async () => {
      for (const event of ["run.started", "run.completed"]) {
        const reactors = EFFECTS[event];
        assert.ok(Array.isArray(reactors), `${event} is declared`);
        const publishRun = reactors.find((reactor) => reactor.key === "publish-run");
        assert.ok(publishRun, `${event} declares publish-run`);
        assert.equal(publishRun.locus, "local", `${event}/publish-run runs at the local locus`);
        assert.equal(publishRun.retry, "until-done", `${event}/publish-run is retried until done (164/ADR-006)`);
        assert.equal(typeof publishRun.apply, "function", `${event}/publish-run is executable`);
        assert.ok(reactors.some((reactor) => reactor.key === "publish-projection"), `${event} keeps publish-projection unchanged beside it`);
      }
    },
  },
  {
    name: "arch/167 ADR-008 (FF-16705): self-check — a path body that walks runs/ trips the detector",
    run: async () => {
      assert.deepEqual(walkViolations("async function tick(items) {\n  for (const item of items) runs.push(...await readRuns(item));\n}\n", "tick"), ["tick matches /\\breadRuns\\s*\\(/"]);
      assert.deepEqual(walkViolations("async function tick(items) {\n  const entries = await readdir(runsDir(item));\n}\n", "tick").length, 2, "a raw folder read trips it twice over");
      assert.deepEqual(walkViolations("async function tick(run) {\n  return (await readRun(item, run.runId)).heartbeatAt;\n}\n", "tick"), [], "the one-record read a loop's last activity needs is not a walk");
    },
  },
];
