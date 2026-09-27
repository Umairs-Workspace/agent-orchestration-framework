// FF-13005 + FF-13006 + FF-13007 (node leg) — THE STOP REACHES EVERY FACE (milestone 130 /
// story 05; ARCHITECTURE `## Fitness functions`, ADR-005 and ADR-004 §3-§4). Which of this
// directory's three subjects: the RECORD — the loop's presence entry is the record every face
// reads, and these are the controls on how it is carried (additively, by the same pass), where the
// fleet's button may render and which route it reaches, and where the desktop's argv is formed.
//
// FF-13005. `assemblePresenceRecord` without `loops`, and with `loops: []`, is byte-identical to
// today's record (the six keys, order included); with one entry the key is LAST, after `buildId`;
// `activeRuns` stays `string[]` (cited: `acd-active-runs-frozen-string-array`);
// `assemblePresenceRecord(diskRecordWithLoops)` — the registry's read-side reshape — keeps the
// entry; `readActiveLoops` over a fixture with one running loop run and a `requested` level-2 file
// answers exactly one eleven-key entry with `stop: "cancel"`. Structural: every `src/**` module
// that CALLS `readActiveRuns(` also calls `readActiveLoops(` — two today, `heartbeat.mjs` and
// `launcher.mjs`, and the sweep must find both: the launcher's tick is the record this machine
// actually publishes, and a heartbeat that carried the key alone would be erased by the next tick.
//
// FF-13006. `loopStopAffordance` answers `button: null` for `localNodeId: null`, for
// `node.nodeId !== localNodeId`, and after rung 2; a rung-1 button otherwise; `rememberStopRung`
// never lowers a rung; `fleetCurrentWorkLines` stays byte-pinned to the Rust `current_work()`
// over the captured producer fixtures (cited: `acd-captured-producer-fixture`, whose registration
// is checked here so the citation resolves); `ui/src/fleet/**` contains exactly one
// `fetch("/api/mesh/loop-stop"` (in `api.ts`) and none of the `work-loops` / `work/loops` /
// `loops-` tokens (FF-5202 cited); in `ui-serve.mjs` the `/api/mesh/loop-stop` branch reads
// exactly `body.scope` and `body.workspaceId` and calls `admitWriteRequest(` before
// `readJsonBody(`; the route table is exactly six (cited: `acd-mesh-ui-read-only`); the status
// route's body carries `localNodeId`.
//
// FF-13007, the NODE LEG. `app/desktop/crates/app/src/supervisor.rs` spells no `"--stop"` literal
// and reaches `taskkill` in exactly one place; `main.rs` registers `stop_loop` in
// `generate_handler!`; `app.js` invokes `stop_loop` from exactly one delegate. The cargo half —
// `stop_step`, `stop_argv`, `reconcile` under `supervision.rs`'s `#[cfg(test)]` — is story 04's,
// run by `scripts/test.mjs` over `app/desktop/Cargo.toml`, and is CITED here (its tests are
// checked to exist by name) rather than re-run.
//
// Every cut is structural (`test/support/source-slice.mjs`); every sweep reports what it read.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assemblePresenceRecord, readActiveLoops } from "../../../src/mesh/presence.mjs";
import { loopStopsDir, requestLoopStop } from "../../../src/loop/stop-request.mjs";
import { fleetCurrentWorkLines, loopStopAffordance, rememberStopRung } from "../../../ui/src/fleet/runs.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { matchedBraceBody, stripComments } from "../../support/source-slice.mjs";
import { loopFixture, resetLoopStops, writeDeclarationRun } from "../../loop/loop-command-probe.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const toPosix = (value) => String(value).split(path.sep).join("/");

const PRESENCE = "src/mesh/presence.mjs";
const READERS_OF_RUNS = Object.freeze(["src/commands/mesh/heartbeat.mjs", "src/mesh/launcher.mjs"]);
const RUNS_CALL = /(?<!function\s)\breadActiveRuns\s*\(/u;
const LOOPS_CALL = /(?<!function\s)\breadActiveLoops\s*\(/u;
const SIX_KEYS = Object.freeze(["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"]);
const LOOP_ENTRY_KEYS = Object.freeze(["loopRunId", "workspaceId", "scope", "level", "cap", "phase", "cycle", "ref", "runId", "supervised", "stop"]);

const FLEET_DIR = "ui/src/fleet";
const FLEET_FETCH = 'fetch("/api/mesh/loop-stop"';
const FORBIDDEN_UI_TOKENS = /work-loops|work\/loops|loops-/u; // FF-5202's forbidden set, the loop registry's names
const UI_SERVE = "src/mesh/ui-serve.mjs";
const ROUTE_TABLE = Object.freeze(["/api/mesh/assign", "/api/mesh/board-url", "/api/mesh/loop-stop", "/api/mesh/session", "/api/mesh/session-outcome", "/api/mesh/status"]);
const CITED_CAPTURED_PRODUCER = "test/arch/session/acd-captured-producer-fixture.test.mjs";
const CITED_CAPTURED_PRODUCER_INDEX = "test/arch/session/index.mjs";

const SUPERVISOR_RS = "app/desktop/crates/app/src/supervisor.rs";
const MAIN_RS = "app/desktop/crates/app/src/main.rs";
const APP_JS = "app/desktop/ui/app.js";
const SUPERVISION_RS = "app/desktop/crates/core/src/supervision.rs";
const CARGO_TESTS = Object.freeze(["stop_step", "stop_argv", "reconcile"]);

function assertRead(what, count, floor, unit = "file(s)") {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} ${unit}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

async function source(rel) {
  return stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
}

async function srcUnits() {
  const units = [];
  for (const file of await readSrcFiles(repoRoot)) {
    units.push({ rel: `src/${toPosix(file.rel)}`, code: stripComments(await readFile(file.path, "utf8")) });
  }
  return units;
}

// Every module that CALLS `readActiveRuns(` (a definition — `function readActiveRuns(` — is not
// a call), and whether it also calls `readActiveLoops(`. PURE over units, so the non-vacuity
// probe can misspell the needle and watch the caller set go to zero.
export function activeRunsCallers(units, { runsCall = RUNS_CALL, loopsCall = LOOPS_CALL } = {}) {
  return units
    .filter(({ code }) => runsCall.test(code))
    .map(({ rel, code }) => ({ rel, callsLoops: loopsCall.test(code) }));
}

async function walkFiles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

// The six-key record every producer emits today — `buildId` present because a stamped node
// carries one; the loop key must land AFTER it (ADR-005 §1).
const today = () => ({ nodeId: "n1", heartbeatAt: "2026-09-21T12:00:00.000Z", activeRuns: ["r1"], sessions: [], aofVersion: "0.1.0", buildId: "b1" });
const loopEntry = () => ({ loopRunId: "L1", workspaceId: "ws-1", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, ref: "03/01", runId: "r1", supervised: false, stop: null });
const node = (nodeId) => ({ nodeId, presence: {} });

export const archTests = [
  {
    name: "arch/130 FF-13005 (acd-loop-stop-reaches-every-face): loops is additive — absent or empty the record is byte-identical to today's six keys, one entry lands LAST after buildId, activeRuns stays string[], and the read-side reshape keeps the entry",
    run: async () => {
      const base = JSON.stringify(assemblePresenceRecord(today()));
      assert.deepEqual(Object.keys(JSON.parse(base)), [...SIX_KEYS], "guard: today's record is the six keys in order");
      assert.equal(JSON.stringify(assemblePresenceRecord({ ...today(), loops: [] })), base, "assemblePresenceRecord with loops: [] is byte-identical to today's record");
      assert.equal(JSON.stringify(assemblePresenceRecord({ ...today(), loops: undefined })), base, "…and without loops");
      const withOne = assemblePresenceRecord({ ...today(), loops: [loopEntry()] });
      assert.deepEqual(Object.keys(withOne), [...SIX_KEYS, "loops"], "with one entry the key is LAST, after buildId");
      assert.ok(Array.isArray(withOne.activeRuns) && withOne.activeRuns.every((run) => typeof run === "string"), "activeRuns stays string[] (acd-active-runs-frozen-string-array cited)");
      assert.deepEqual(withOne.loops, [loopEntry()]);
      // THE RESHAPE — the registry spreads the DISK record into the assembler; a key it does not
      // carry would be stripped from the wire.
      const disk = JSON.parse(JSON.stringify(withOne));
      assert.deepEqual(assemblePresenceRecord(disk), withOne, "assemblePresenceRecord(diskRecordWithLoops) keeps the entry");
      assert.deepEqual(Object.keys(assemblePresenceRecord({ ...today(), buildId: "", loops: [loopEntry()] })), [...SIX_KEYS.filter((key) => key !== "buildId"), "loops"], "…and a pre-stamp node's record is the five keys plus loops");
    },
  },
  {
    name: "arch/130 FF-13005 (acd-loop-stop-reaches-every-face): readActiveLoops over one running loop run and a requested level-2 file answers exactly one eleven-key entry with stop: cancel",
    run: async () => {
      await resetLoopStops();
      const fx = await loopFixture();
      try {
        const { item } = await writeDeclarationRun(fx, { state: "running", at: new Date().toISOString() });
        const dir = loopStopsDir();
        for (let rung = 0; rung < 2; rung += 1) await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: "ws-1", by: { node: "n1", pid: 1 } });
        const loops = await readActiveLoops([item], { workspaceId: "ws-1" });
        assert.equal(loops.length, 1, "exactly one entry");
        assert.deepEqual(Object.keys(loops[0]), [...LOOP_ENTRY_KEYS], "the eleven keys, in order");
        assert.equal(loops[0].stop, "cancel", "a requested level-2 file reads stop: cancel");
        assert.equal(loops[0].loopRunId, "L1");
        assert.equal(loops[0].workspaceId, "ws-1");
        assert.equal(loops[0].ref, "03/01");
      } finally {
        await fx.cleanup();
        await resetLoopStops();
      }
    },
  },
  {
    name: "arch/130 FF-13005 (acd-loop-stop-reaches-every-face): structural — every src/** module that calls readActiveRuns( also calls readActiveLoops(, and the sweep must find both heartbeat.mjs and launcher.mjs",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const callers = activeRunsCallers(units);
      const found = callers.map(({ rel }) => rel).sort();
      assert.deepEqual(found, [...READERS_OF_RUNS].sort(), `the sweep must find both heartbeat.mjs and launcher.mjs — callers of readActiveRuns( found: ${found.join(", ") || "none"}. A sweep that finds fewer is reading the wrong needle, not a cleaner tree; a third caller is a new producer that must read the loops too`);
      const missing = callers.filter(({ callsLoops }) => !callsLoops).map(({ rel }) => rel);
      assert.deepEqual(missing, [], `every src/** module that calls readActiveRuns( also calls readActiveLoops( (ADR-005 §2 — both producers, or the next tick erases the key): ${missing.join(", ")}`);
      // The home defines both and calls neither — the definitions are not counted as calls.
      const presence = units.find(({ rel }) => rel === PRESENCE);
      assert.ok(presence != null && /\bexport\s+async\s+function\s+readActiveLoops\s*\(/u.test(presence.code), `NOT FOUND: readActiveLoops is defined in ${PRESENCE}`);
      assert.deepEqual(activeRunsCallers([{ rel: "planted.mjs", code: "const ids = await readActiveRuns(items);" }]), [{ rel: "planted.mjs", callsLoops: false }], "self-check: a caller without the loops read is reported");
    },
  },
  {
    name: "arch/130 FF-13006 (acd-loop-stop-reaches-every-face): the fleet's button is local-only — null for localNodeId null, for another node and after rung 2, a rung-1 button otherwise; the rung memory never lowers; the cited current-work pin is registered",
    run: async () => {
      const loop = loopEntry();
      assert.equal(loopStopAffordance({ loop, node: node("n1"), localNodeId: null }).button, null, "button: null for localNodeId: null — an unconfigured serving machine names no node, so no card shows a button");
      assert.equal(loopStopAffordance({ loop, node: node("n1"), localNodeId: "" }).button, null, "…and for an empty one");
      assert.equal(loopStopAffordance({ loop, node: node("n2"), localNodeId: "n1" }).button, null, "button: null for node.nodeId !== localNodeId — the fleet renders a Stop only where the card is this node (ADR-005 §5)");
      assert.equal(loopStopAffordance({ loop, node: node("n2"), localNodeId: "n1" }).remote, true, "…and says why: remote");
      assert.equal(loopStopAffordance({ loop: { ...loop, stop: "cancel" }, node: node("n1"), localNodeId: "n1" }).button, null, "button: null after rung 2 — a cancel stands and nothing is left to ask");
      assert.equal(loopStopAffordance({ loop, node: node("n1"), localNodeId: "n1", remembered: { rung: 3, runId: "r1" } }).button, null, "…including a rung remembered locally for the same drive");
      const local = loopStopAffordance({ loop, node: node("n1"), localNodeId: "n1" });
      assert.equal(local.button?.rung, 1, "a rung-1 button otherwise");
      assert.equal(local.button?.label, "Stop");
      assert.equal(local.remote, false);
      assert.equal(loopStopAffordance({ loop: { ...loop, stop: "drain" }, node: node("n1"), localNodeId: "n1" }).button?.rung, 2, "a drain standing on the wire offers the second rung");
      // THE MEMORY NEVER LOWERS A RUNG for the same drive; a new drive starts afresh.
      const raised = rememberStopRung(new Map(), "L1", 2, "r1");
      assert.equal(rememberStopRung(raised, "L1", 1, "r1").get("L1").rung, 2, "rememberStopRung never lowers a rung");
      assert.equal(rememberStopRung(raised, "L1", 3, "r1").get("L1").rung, 3, "…and raises");
      assert.equal(raised.get("L1").rung, 2, "the input map is never mutated");
      assert.equal(rememberStopRung(raised, "L1", 1, "r2").get("L1").rung, 1, "a different runId is a new drive and starts its own memory");
      // THE CITATION RESOLVES: `fleetCurrentWorkLines` is byte-pinned against the Rust
      // `current_work()` literals by acd-captured-producer-fixture, which must still be registered.
      assert.equal(typeof fleetCurrentWorkLines, "function");
      const citedIndex = await readFile(path.join(repoRoot, CITED_CAPTURED_PRODUCER_INDEX), "utf8");
      assert.match(citedIndex, /acd-captured-producer-fixture\.test\.mjs/u, `the cited pin (${CITED_CAPTURED_PRODUCER}) is registered in its index — fleetCurrentWorkLines over the captured producer fixtures is byte-identical to its pinned lines`);
      assert.match(await readFile(path.join(repoRoot, CITED_CAPTURED_PRODUCER), "utf8"), /fleetCurrentWorkLines\(/u, "…and that control reads the function this face composes with");
    },
  },
  {
    name: "arch/130 FF-13006 (acd-loop-stop-reaches-every-face): ui/src/fleet/** reaches /api/mesh/loop-stop from exactly one fetch (in api.ts) and carries none of the loop registry's tokens",
    run: async () => {
      const files = await walkFiles(path.join(repoRoot, FLEET_DIR));
      assertRead(`the ${FLEET_DIR} walk`, files.length, 15);
      const fetches = [];
      const tokens = [];
      for (const file of files) {
        const rel = toPosix(path.relative(repoRoot, file));
        const code = stripComments(await readFile(file, "utf8"));
        const count = code.split(FLEET_FETCH).length - 1;
        for (let i = 0; i < count; i += 1) fetches.push(rel);
        if (FORBIDDEN_UI_TOKENS.test(code)) tokens.push(rel);
      }
      assert.deepEqual(fetches, [`${FLEET_DIR}/api.ts`], `ui/src/fleet/** contains exactly one fetch("/api/mesh/loop-stop" (in api.ts) — found in: ${fetches.join(", ") || "none"}. The one door (ADR-005 §5); zero means the button reaches no route, two means a second caller of the write`);
      assert.deepEqual(tokens, [], `ui/src/fleet/** carries none of the work-loops / work/loops / loops- tokens (FF-5202 cited): ${tokens.join(", ")}`);
    },
  },
  {
    name: "arch/130 FF-13006 (acd-loop-stop-reaches-every-face): the loop-stop route reads exactly body.scope and body.workspaceId and admits before it reads, the route table is exactly six, and the status body carries localNodeId",
    run: async () => {
      const face = await source(UI_SERVE);
      assertRead("the fleet face", face.length, 10_000, "bytes");
      const branchAt = face.indexOf('if (pathname === "/api/mesh/loop-stop")');
      assert.ok(branchAt >= 0, `NOT FOUND: ${UI_SERVE} — the /api/mesh/loop-stop branch`);
      const branch = matchedBraceBody(face, branchAt);
      assert.ok(branch != null, "the branch body was cut structurally");
      const bodyReads = [...new Set([...branch.matchAll(/\bbody\s*\??\.\s*(\w+)/gu)].map((match) => match[1]))].sort();
      assert.deepEqual(bodyReads, ["scope", "workspaceId"], `in ui-serve.mjs the /api/mesh/loop-stop branch reads exactly body.scope and body.workspaceId (ADR-005 §4) — reads found: ${bodyReads.join(", ")}`);
      const admitAt = branch.indexOf("admitWriteRequest(");
      const readAt = branch.indexOf("readJsonBody(");
      assert.ok(admitAt >= 0 && readAt >= 0 && admitAt < readAt, `the branch calls admitWriteRequest( before readJsonBody( — admit at ${admitAt}, read at ${readAt}; the method, origin and content-type admission precedes any read of the body (item 44's hoist)`);
      // Which core the branch hands the rest to is FF-13003's claim (the one importer set), not this one's.
      // THE ROUTE TABLE IS EXACTLY SIX (cited: acd-mesh-ui-read-only) — the same enumeration.
      const routes = [...new Set([...face.matchAll(/pathname\s*===\s*["'](\/api\/mesh\/[^"']+)["']/gu)].map((match) => match[1]))].sort();
      assert.deepEqual(routes, [...ROUTE_TABLE], `the route table is exactly six — found: ${routes.join(", ")}`);
      // THE STATUS BODY NAMES THE SERVING NODE — item 18 (b), paid by ADR-005 §3.
      const statusAt = face.indexOf('if (pathname === "/api/mesh/status")');
      assert.ok(statusAt >= 0, `NOT FOUND: ${UI_SERVE} — the /api/mesh/status branch`);
      const status = matchedBraceBody(face, statusAt);
      assert.ok(status != null, "the status branch was cut structurally");
      assert.match(status, /\blocalNodeId\s*:/u, "the status route's body carries localNodeId — the card's one test of locality");
    },
  },
  {
    name: "arch/130 FF-13007 (acd-loop-stop-reaches-every-face, node leg): the desktop's argv is formed in core — supervisor.rs spells no \"--stop\" literal and reaches taskkill in exactly one place, main.rs registers stop_loop, and app.js invokes it from one delegate; the cargo half is cited",
    run: async () => {
      const supervisor = await source(SUPERVISOR_RS);
      assertRead("the desktop supervisor", supervisor.length, 10_000, "bytes");
      assert.doesNotMatch(supervisor, /"--stop"/u, "supervisor.rs spells no \"--stop\" literal — the argv is formed in core by stop_argv(child) and never in the shell (ADR-004 §3)");
      assert.match(supervisor, /\bstop_argv\s*\(/u, "…and the shell reads stop_argv's answer");
      const taskkills = [...supervisor.matchAll(/\btaskkill\b/gu)].length;
      assert.equal(taskkills, 1, `supervisor.rs reaches taskkill in exactly one place — the ladder's last rung, the driver's own primitive: ${taskkills} found`);

      const main = await source(MAIN_RS);
      const handlers = /generate_handler!\s*\[([^\]]*)\]/u.exec(main);
      assert.ok(handlers != null, `NOT FOUND: ${MAIN_RS} — generate_handler![…]`);
      const registered = handlers[1].split(",").map((name) => name.trim()).filter(Boolean);
      assertRead("the Tauri handler list", registered.length, 5, "command(s)");
      assert.ok(registered.includes("stop_loop"), `main.rs registers stop_loop in generate_handler! — registered: ${registered.join(", ")}`);
      assert.match(main, /\bfn\s+stop_loop\s*\(/u, "…and defines it");

      const app = await source(APP_JS);
      assertRead("the desktop ui", app.length, 5_000, "bytes");
      const invocations = [...app.matchAll(/\binvoke\s*\(\s*['"]stop_loop['"]/gu)].length;
      assert.equal(invocations, 1, `app.js invokes stop_loop from exactly one delegate: ${invocations} invocation(s)`);
      const delegateAt = app.indexOf("action === 'loop-stop'");
      assert.ok(delegateAt >= 0, "the one control-bar delegate branches on data-action=\"loop-stop\"");
      const delegate = matchedBraceBody(app, delegateAt);
      assert.ok(delegate != null && /\binvoke\s*\(\s*['"]stop_loop['"]/u.test(delegate), "…and that branch is where the invocation lives");

      // THE CARGO HALF IS STORY 04's, CITED: `stop_step`, `stop_argv` and `reconcile` are pure
      // functions of `mesh_desktop_core::supervision`, each with a `#[cfg(test)]` case by name.
      const core = await source(SUPERVISION_RS);
      assert.match(core, /#\[cfg\(test\)\]/u, `${SUPERVISION_RS} carries its #[cfg(test)] module`);
      for (const fn of CARGO_TESTS) {
        assert.match(core, new RegExp(`\\bpub fn ${fn}\\s*\\(`, "u"), `${fn} is a pure core function (cited)`);
        assert.match(core, new RegExp(`\\bfn ${fn}_\\w+\\s*\\(`, "u"), `${fn} has a #[cfg(test)] case by name — run by scripts/test.mjs over app/desktop/Cargo.toml, not here`);
      }
      assert.match(core, /pub const STOP_GRACE_MS: u64 = 30_000;/u, "STOP_GRACE_MS is the core's default decision (ADR-004 §3)");
    },
  },
];
