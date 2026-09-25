// test/session/agent-session-driver-door.test.mjs — milestone 53 / story 00, tasks 00 and 01
// (00_the-two-doors.feature, 01_the-importers-stay-put.feature; ADR-001 §1/§2, ADR-010
// §17/§18).
//
// THE TWO DOORS. The seventeen frozen names left `src/mesh/worker-execution.mjs` for
// `src/agent-session-driver.mjs` and are re-exported from the sink verbatim, so every
// one of its recorded dependents keeps the import line it already had. What a CONSUMER can
// observe of that is narrower and sharper than the cardinality claim FF-5302 makes
// structurally, and it is what this suite decides:
//
//   1. An ESM named import of a name a module does not export is a LINK-TIME error,
//      never a runtime `undefined`. So "importable at this door" is a real observable,
//      and a missing re-export cannot survive it. This file is itself the consumer for
//      both doors (the aliased static imports below ARE the assertion — if either door
//      lost a name, this module would not link and the whole suite would fail to load),
//      and it additionally links a generated consumer in a FRESH process, with a bogus
//      eighteenth name as the non-vacuity control.
//   2. A consumer that binds a constant at ONE door and drives a launch built at the
//      OTHER observes agreement, or it observes drift. The reference check catches a
//      duplicated-then-drifted definition structurally; this one runs over the real
//      driver, on the payload the driver actually spawned.
//   3. TWO of the seventeen are consumed INWARD by the sink's own remaining handler
//      code — `defaultSpawnRuntime` is `createMeshWorkerExecutionHandler`'s
//      `spawnRuntime` default, and `driveInteractiveClaudeSession` is
//      `createMeshWorkerTerminalResumeHandler`'s `spawnRuntime` default — so the sink
//      carries an `import` of both AS
//      WELL AS the `export … from` line, a re-export binding no local name (ADR-010 §17a).
//      That count is NOT typed into a lane below: VERIFICATION F-01 was a third inward
//      consumer the story's own hand-count missed, so the inward set is DERIVED from the
//      sink's body and the sites that evaluate at construction are constructed for real.
//
// THE CENSUS (task 01) is the story's crispest correctness criterion: nothing that
// imports the sink today has to learn that the driver moved. "Byte-unchanged" is not
// directly observable from a suite, so it is decided by the exact observable it buys —
// a static-import parse whose class counts are asserted against LITERALS first (a parse
// that stopped parsing reports perfect stability over the empty set), plus a closed
// allowlist of the files under `test/` that may name the new module: this story's
// own five suites, the re-aimed arch gate, and the four milestone-53 fitness gates whose
// subject is the driver or this suite family (ADR-015 §2). Any unlisted consumer still fails.
//
// No process is spawned except the two deliberate fresh-process link probes, and no
// `AOF_GLOBAL_HOME` is touched outside the handler-fixture lane, which brings its own.
import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── DOOR 1: the driver's own ────────────────────────────────────────────────────────
// Seventeen static named imports. A name this module does not export makes the line
// below a SyntaxError at link time, which is exactly the observable task 00 asks for.
import {
  NEEDS_INPUT_SENTINEL as drvNeedsInputSentinel,
  NEEDS_INPUT_INSTRUCTION as drvNeedsInputInstruction,
  DIRECTIVE_COMPLETE_SENTINEL as drvDirectiveCompleteSentinel,
  DIRECTIVE_COMPLETE_INSTRUCTION as drvDirectiveCompleteInstruction,
  WORKER_SESSION_INSTRUCTION as drvWorkerSessionInstruction,
  COMPLETION_IDLE_MS as drvCompletionIdleMs,
  DECLARED_COMPLETION_IDLE_MS as drvDeclaredCompletionIdleMs,
  HUMAN_INPUT_TOOL_NAMES as drvHumanInputToolNames,
  INTERACTIVE_COMMAND_READY_DELAY_MS as drvInteractiveCommandReadyDelayMs,
  defaultWatchTranscriptSessionId as drvDefaultWatchTranscriptSessionId,
  defaultWatchTranscriptCompletion as drvDefaultWatchTranscriptCompletion,
  defaultPtySpawn as drvDefaultPtySpawn,
  resolveInteractiveDriverLaunch as drvResolveInteractiveDriverLaunch,
  driveInteractiveClaudeSession as drvDriveInteractiveClaudeSession,
  buildDriverCommand as drvBuildDriverCommand,
  defaultSpawnRuntime as drvDefaultSpawnRuntime,
  ensureWorktreeTrusted as drvEnsureWorktreeTrusted,
} from "../../src/agent-session-driver.mjs";

// ── DOOR 2: the sink's re-export ────────────────────────────────────────────────────
// Byte-for-byte the import line a pre-existing dependent already writes.
import {
  NEEDS_INPUT_SENTINEL as sinkNeedsInputSentinel,
  NEEDS_INPUT_INSTRUCTION as sinkNeedsInputInstruction,
  DIRECTIVE_COMPLETE_SENTINEL as sinkDirectiveCompleteSentinel,
  DIRECTIVE_COMPLETE_INSTRUCTION as sinkDirectiveCompleteInstruction,
  WORKER_SESSION_INSTRUCTION as sinkWorkerSessionInstruction,
  COMPLETION_IDLE_MS as sinkCompletionIdleMs,
  DECLARED_COMPLETION_IDLE_MS as sinkDeclaredCompletionIdleMs,
  HUMAN_INPUT_TOOL_NAMES as sinkHumanInputToolNames,
  INTERACTIVE_COMMAND_READY_DELAY_MS as sinkInteractiveCommandReadyDelayMs,
  defaultWatchTranscriptSessionId as sinkDefaultWatchTranscriptSessionId,
  defaultWatchTranscriptCompletion as sinkDefaultWatchTranscriptCompletion,
  defaultPtySpawn as sinkDefaultPtySpawn,
  resolveInteractiveDriverLaunch as sinkResolveInteractiveDriverLaunch,
  driveInteractiveClaudeSession as sinkDriveInteractiveClaudeSession,
  buildDriverCommand as sinkBuildDriverCommand,
  defaultSpawnRuntime as sinkDefaultSpawnRuntime,
  ensureWorktreeTrusted as sinkEnsureWorktreeTrusted,
  createMeshWorkerExecutionHandler,
  createMeshWorkerTerminalResumeHandler,
} from "../../src/mesh/worker-execution.mjs";

import * as driverNamespace from "../../src/agent-session-driver.mjs";
import * as sinkNamespace from "../../src/mesh/worker-execution.mjs";

import { loadWorkspace } from "../../src/work.mjs";
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";
import { withMeshWorkerExecFixture, markRepoPublished, seedNodeWorkspaceMembership, createStatusRecorder, scriptedPushExec } from "../support/mesh-worker-exec-fixture.mjs";
import { registeredSuitePaths, registrationSurface } from "../support/registration/registration-surface.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRIVER_MODULE = "src/agent-session-driver.mjs";
const SINK_MODULE = "src/mesh/worker-execution.mjs";
// 119/01 — the specifier the sink uses for the driver, DERIVED from the two module paths this file
// already declares rather than spelled as a literal. It was `./agent-session-driver.mjs`, which was
// true only while the sink sat beside the driver at `src/`; the sink now sits in `src/mesh/`, and a
// pinned spelling would have made this gate a statement about depth instead of about the edge.
// 119/01 — the tail of the sink's path, DERIVED from SINK_MODULE. Every census below recognises
// an importer by this suffix; it was the bare filename `mesh-worker-execution.mjs`, which stopped
// matching every importer at once the day the module moved into `src/mesh/`.
// 119/01 — the launcher moved into `src/mesh/` with the sink, so the specifier it uses is now
// intra-family. Its path is declared here so the resolution below has a `from`.
const LAUNCHER_MODULE = "src/mesh/launcher.mjs";
const SINK_SUFFIX = SINK_MODULE.split("/").slice(1).join("/");
const DRIVER_SPECIFIER = (() => {
  const from = SINK_MODULE.split("/").slice(0, -1);
  const to = DRIVER_MODULE.split("/");
  let shared = 0;
  while (shared < from.length && from[shared] === to[shared]) shared += 1;
  const up = from.length - shared;
  const rel = [...Array.from({ length: up }, () => ".."), ...to.slice(shared)].join("/");
  return up === 0 ? `./${rel}` : rel;
})();
const DRIVER_SPECIFIER_PATTERN = DRIVER_SPECIFIER.replaceAll(".", "\\.").replaceAll("/", "\\/");

const NODE_ID = "worker-a";

// THE FROZEN SEVENTEEN — ADR-001 §1's sixteen plus `ensureWorktreeTrusted`, which
// ADR-010 §18 admits BY NAME as the seventeenth rather than in a parenthetical a gate
// cannot read. `kind` is what a consumer's `typeof` reads. An eighteenth entry here
// would be as much a defect as a missing one.
const FROZEN = [
  { name: "NEEDS_INPUT_SENTINEL", kind: "string", driver: drvNeedsInputSentinel, sink: sinkNeedsInputSentinel },
  { name: "NEEDS_INPUT_INSTRUCTION", kind: "string", driver: drvNeedsInputInstruction, sink: sinkNeedsInputInstruction },
  { name: "DIRECTIVE_COMPLETE_SENTINEL", kind: "string", driver: drvDirectiveCompleteSentinel, sink: sinkDirectiveCompleteSentinel },
  { name: "DIRECTIVE_COMPLETE_INSTRUCTION", kind: "string", driver: drvDirectiveCompleteInstruction, sink: sinkDirectiveCompleteInstruction },
  { name: "WORKER_SESSION_INSTRUCTION", kind: "string", driver: drvWorkerSessionInstruction, sink: sinkWorkerSessionInstruction },
  { name: "COMPLETION_IDLE_MS", kind: "number", driver: drvCompletionIdleMs, sink: sinkCompletionIdleMs },
  { name: "DECLARED_COMPLETION_IDLE_MS", kind: "number", driver: drvDeclaredCompletionIdleMs, sink: sinkDeclaredCompletionIdleMs },
  { name: "HUMAN_INPUT_TOOL_NAMES", kind: "array", driver: drvHumanInputToolNames, sink: sinkHumanInputToolNames },
  { name: "INTERACTIVE_COMMAND_READY_DELAY_MS", kind: "number", driver: drvInteractiveCommandReadyDelayMs, sink: sinkInteractiveCommandReadyDelayMs },
  { name: "defaultWatchTranscriptSessionId", kind: "function", driver: drvDefaultWatchTranscriptSessionId, sink: sinkDefaultWatchTranscriptSessionId },
  { name: "defaultWatchTranscriptCompletion", kind: "function", driver: drvDefaultWatchTranscriptCompletion, sink: sinkDefaultWatchTranscriptCompletion },
  { name: "defaultPtySpawn", kind: "function", driver: drvDefaultPtySpawn, sink: sinkDefaultPtySpawn },
  { name: "resolveInteractiveDriverLaunch", kind: "function", driver: drvResolveInteractiveDriverLaunch, sink: sinkResolveInteractiveDriverLaunch },
  { name: "driveInteractiveClaudeSession", kind: "function", driver: drvDriveInteractiveClaudeSession, sink: sinkDriveInteractiveClaudeSession },
  { name: "buildDriverCommand", kind: "function", driver: drvBuildDriverCommand, sink: sinkBuildDriverCommand },
  { name: "defaultSpawnRuntime", kind: "function", driver: drvDefaultSpawnRuntime, sink: sinkDefaultSpawnRuntime },
  { name: "ensureWorktreeTrusted", kind: "function", driver: drvEnsureWorktreeTrusted, sink: sinkEnsureWorktreeTrusted },
];
const CONSTANT_MEMBERS = FROZEN.filter((m) => m.kind !== "function");
const FUNCTION_MEMBERS = FROZEN.filter((m) => m.kind === "function");

// THIS STORY'S OWN FIVE SUITES plus the arch gate and the controls ADR-015 §2
// admits by name and reason — the closed set under `test/` allowed to name the
// new module. The downstream census is additive: 69/05 contributes one sink-importing
// behavioural suite without naming the promoted driver module directly.
const STORY_SUITES = [
  "test/session/agent-session-driver-door.test.mjs",
  "test/session/agent-session-driver-drives.test.mjs",
  "test/session/agent-session-driver-transcript.test.mjs",
  "test/session/agent-session-driver-runtime-dispatch.test.mjs",
  "test/session/agent-session-driver-gate-aim.test.mjs",
];
const NAMES_THE_NEW_MODULE = [
  ...STORY_SUITES,
  "test/arch/assignment/acd-worker-driver-no-headless-print.test.mjs",
  "test/arch/session/acd-session-driver-mesh-blind.test.mjs",
  "test/arch/session/acd-session-driver-single-home.test.mjs",
  "test/arch/work/acd-phase-door-not-a-driver.test.mjs",
  "test/arch/loop/acd-loop-suite-registration.test.mjs",
  // milestone 70 / story 00 (phase-brief) — the two new driver-naming suites: the seam
  // test drives the REAL driver (and imports the sink, so it is also a census suite) and
  // the FF-7001 arch gate reads the driver's signature.
  "test/arch/work/acd-phase-brief-single-bag.test.mjs",
  "test/work/phase-brief-seams.test.mjs",
  // milestone 69 — heartbeat consumption names the driver to guard its one-way seam,
  // while the deadline suite drives the process-owning function directly.
  "test/arch/mesh/acd-heartbeat-by-consumption.test.mjs",
  "test/run/run-heartbeat-consumption.test.mjs",
  "test/work/four-deadlines.test.mjs",
  // milestone 63 / story 02 (63/ADR-005 §2) — the fourth frozen-set enforcement point
  // compiles to the UNATTENDED LAUNCH SHAPE, and `resolveInteractiveDriverLaunch` is where
  // it is enforced: the behavioural suite drives the REAL seam for both answers (the
  // declared launch, and the coded refusal for anything else), and the FF-6305 arch gate
  // asserts the attended launches are byte-identical with the point compiled in and out.
  "test/loop/unattended-launch-envelope.test.mjs",
  "test/arch/mesh/acd-unattended-launch-is-declared.test.mjs",
  // milestone 63 / story 03 (63/ADR-006 §4) — FF-6306's out-of-scope fence NAMES the
  // driver because that is the point of the leg: the module that OWNS the PTY spawn, the
  // output chunking, the completion detection and the NEEDS_INPUT sentinel is READ, and
  // asserted to contain none of that story's identifiers, which is how "no machinery above
  // the launch was touched" is proven rather than described. It reaches the launch seam
  // through the SINK's re-export, so it names the driver only as a file it reads.
  "test/arch/assignment/acd-assignment-resolves-to-a-loop-call.test.mjs",
  // milestone 119 / story 00 (119/ADR-003 §3) — FF-11902 NAMES this suite as one of the carriers
  // it found, because the ruling's whole claim is that a control DERIVES the carrier set rather
  // than carrying a baseline list of it. It reads this file's source to assert the seven tree-walk
  // equalities became properties with floors; it imports neither the driver nor the sink, so it is
  // a naming consumer and not a census member, and the 44+4 split below is untouched.
  "test/arch/audit/acd-control-derives-its-census.test.mjs",
  // milestone 63 / story 06 (63/ADR-013 §1, ADR-016 §1) — the loop-shaped transcript
  // watch. This suite names the driver because its lane's POSITIVE CONTROL is the driver's
  // own `defaultWatchTranscriptSessionId`: the session-shaped default is run FIRST over the
  // loop run's own worktree and must BIND a planted inner-session transcript, and only then
  // is the loop-shaped seam shown to bind nothing over that same directory. Asserting "the
  // loop's watch resolves nothing" without it would pass equally over an empty directory, a
  // watch that never ran and a seam that was never wired, so the import is the load-bearing
  // half of the leg rather than a convenience. It imports the SINK as well, so it is also a
  // census member and moves the 45+3 split below to 44+4.
  "test/mesh/assignment/mesh-assignment-loop-directive.test.mjs",
  // milestone 119 / story 03 (119/ADR-010 §1) — TWO INDEXES, and they are consumers of the same
  // kind as the suites around them. The registry names directories now, and the per-suite
  // rationale that used to sit above each import in `scripts/test.mjs` moved WITH the suite into
  // its own directory's index. Two of those rationales name the driver, because the suites they
  // introduce do: `test/arch/audit/` holds acd-control-derives-its-census and `test/session/`
  // holds this story's own five.
  //
  // They are ADDED to the allowlist rather than swept out of the census by narrowing it to
  // `*.test.mjs`. Narrowing would be the weakening: an index is a file under `test/` that can
  // name the driver, and the whole point of ADR-015 §2's closed set is that every such file is
  // named with a reason. Neither index imports the driver or the sink, so both are naming
  // consumers and the 44+4 census split below is untouched.
  "test/arch/audit/index.mjs",
  "test/session/index.mjs",
  // milestone 129 / story 05 (129/ADR-005, FF-12902) — the loop family's boundary control NAMES the
  // driver because that is the leg: no family module may import `agent-session-driver.mjs` or
  // `node-pty`, and the planted-positive case spells the forbidden import to prove the detector
  // fires. It imports neither the driver nor the sink — a naming consumer, and the census split
  // below is untouched. Named here at aof:verify 127 (129/06 in review; the entry is 129's to ratify).
  "test/arch/loop/acd-loop-family-boundary.test.mjs",
  // milestone 134 / story 03 (FF-13401 `acd-example-answer-one-reader`) — the one-reader control
  // NAMES the driver because that is its leg: `src/work-examples/answers.mjs` must import
  // `HUMAN_INPUT_TOOL_NAMES` from `../agent-session-driver.mjs`, its one home, and the assertion
  // spells that import. It imports neither the driver nor the sink — a naming consumer, and the
  // census split below is untouched. Named here 2026-09-24, after 134/03 merged home without it.
  "test/arch/examples/acd-example-answer-one-reader.test.mjs",
  // milestone 134 / story 03 — the answer reader's behaviour suite imports `HUMAN_INPUT_TOOL_NAMES`
  // from the driver, the list's one home, to build its transcript fixtures from the same names the
  // reader matches. A binding import, not a driven session. Named here 2026-09-24 with the above.
  "test/examples/example-answers.test.mjs",
  // chore 120 — the shared comment stripper's measured note names the transcript suite (a file
  // whose NAME carries the driver's) in a comment: a naming consumer by this leg's reading, which
  // does not strip comments, and not a census member. Named here at aof:verify 127.
  "test/support/source-slice.mjs",
  // milestone 124 / story 00 (124/ADR-003, FF-12403 leg 3) — the coverage table's NON-VACUITY row
  // for the real 119/04 → 119/03 edge probes a `test/` directory entry against this suite's own
  // path, because that pair is one of the four edges in this stream where equality misses a
  // collision and coverage does not. It names the driver only as a path string in that table;
  // it imports neither the driver nor the sink, so it is a naming consumer and the 44+4 census
  // split below is untouched. Found at 124's whole-tree gate, not in its story lane — the
  // census is one directory over from everything the story declared (119/R3's species).
  "test/arch/planning/acd-contract-set-has-one-home.test.mjs",
].sort();

// The named driver + completion suites that must survive the move green AND registered.
// A census that shrinks is not a pass: these are looked up rather than trusted.
const NAMED_DRIVER_SUITES = [
  ["test/mesh/worker/mesh-worker-driver-interactive-pty.test.mjs", "...meshWorkerDriverInteractivePtyTests"],
  ["test/mesh/worker/mesh-worker-driver-directive-command.test.mjs", "...meshWorkerDriverDirectiveCommandTests"],
  ["test/mesh/worker/mesh-worker-driver-needs-input.test.mjs", "...meshWorkerDriverNeedsInputTests"],
  ["test/mesh/worker/mesh-worker-driver-session-id.test.mjs", "...meshWorkerDriverSessionIdTests"],
  ["test/mesh/worker/mesh-worker-driver-output-chunk.test.mjs", "...meshWorkerDriverOutputChunkTests"],
  ["test/mesh/worker/mesh-worker-completion-detection.test.mjs", "...meshWorkerCompletionDetectionTests"],
];

// ── the static-import parse (the acd-command-layer-imports-downward idiom) ───────────
//
// Comment-stripped and CRLF-normalised, and ANCHORED at the start of a line. The anchor
// is what keeps the census honest: a naive `grep 'from "…mesh-worker-execution.mjs"'`
// returns FIFTY files, because `test/arch/session/acd-session-worktree-lane-scoped.test.mjs`
// names the sink only inside STRING LITERALS (`:191`, a planted import inside a template
// literal; `:265`, a fixture path). It is not an importer — the parse is right and the
// grep is not (ADR-010 §17b).
function stripComments(source) {
  return source.replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, " ");
}

function staticImports(source) {
  const clean = stripComments(source).replace(/\r\n/g, "\n");
  const out = [];
  const re = /^[ \t]*import\s+(?:([^;'"]*?)\s+from\s+)?["']([^"']+)["']/gm;
  let match;
  while ((match = re.exec(clean)) !== null) out.push({ clause: match[1] ?? "", specifier: match[2] });
  return out;
}

function importedNames(clause) {
  const braced = /\{([^}]*)\}/.exec(clause ?? "");
  if (braced == null) return [];
  return braced[1]
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => part.split(/\s+as\s+/)[0].trim());
}

// 119/01 — SINK RECOGNITION IS A RESOLUTION, NOT A SUFFIX. `src/mesh/launcher.mjs` reaches the
// sink as `./worker-execution.mjs` now that both live in `src/mesh/`, so a tail test on the
// specifier misses every intra-family importer while quietly still matching the others — half a
// census, reading green. Resolving the specifier against the file that spells it is the same
// question asked in a way the tree's shape cannot change.
function resolvesToSink(rel, specifier) {
  if (!specifier.startsWith(".")) return false;
  const from = rel.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === ".") continue;
    if (segment === "..") from.pop();
    else from.push(segment);
  }
  return from.join("/") === SINK_MODULE;
}
async function walkMjs(rel) {
  const out = [];
  for (const entry of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await walkMjs(child)));
    else if (entry.name.endsWith(".mjs")) out.push(child);
  }
  return out;
}

let censusCache = null;
// EXPORTED for FF-11902 (`test/arch/audit/acd-control-derives-its-census.test.mjs`), which drives the
// floors below against THIS census rather than against arithmetic. A probe that shows `47 >= 48` is
// false has shown a fact about integers; what has to be shown is that the SHIPPED floors have no
// headroom over the live counts, and only the real walk can say that.
export async function census() {
  if (censusCache != null) return censusCache;
  const files = [...(await walkMjs("test")), ...(await walkMjs("src")), ...(await walkMjs("scripts"))];
  const members = [];
  for (const rel of files) {
    const source = await readFile(path.join(repoRoot, rel), "utf8");
    const sinkImports = staticImports(source).filter((entry) => resolvesToSink(rel, entry.specifier));
    if (sinkImports.length === 0) continue;
    members.push({ rel, names: sinkImports.flatMap((entry) => importedNames(entry.clause)) });
  }
  // THE CENSUS'S SUBJECT IS THE RECORDED DEPENDENTS — the 49 the graph measured on
  // 2026-08-15, whose property is that they keep the import line they already had. This
  // story's OWN five suites are partitioned out of it rather than quietly inflating it:
  // task 00's second scenario REQUIRES the door suite to statically import all seventeen
  // from the sink (the link is the assertion), so it is a new, deliberate 50th importer
  // and counting it as a census member would move an oracle it is not the subject of.
  // The partition is asserted in both directions below, so it can never hide a mesh test.
  // 69/05 legitimately adds test/assignment/blocked-run-parking.test.mjs as the 50th recorded
  // dependent; the oracle advances by that one named, executable consumer.
  const preExisting = members.filter((m) => !STORY_SUITES.includes(m.rel));
  censusCache = {
    files,
    members,
    storyOwn: members.filter((m) => STORY_SUITES.includes(m.rel)),
    preExisting,
    suites: preExisting.filter((m) => m.rel.startsWith("test/") && m.rel.endsWith(".test.mjs")),
    fixtures: preExisting.filter((m) => m.rel.startsWith("test/support/")),
    sourceSide: preExisting.filter((m) => m.rel.startsWith("src/") || m.rel.startsWith("scripts/")),
  };
  return censusCache;
}

// runConsumerModule(names, moduleRel) — writes a throwaway consumer that STATICALLY
// imports `names` from `moduleRel` and links it in a FRESH node process. Resolves
// `{ code, stderr }`. The link itself is the assertion: node reports
// "does not provide an export named" and exits non-zero for a name the module does not
// export, which is a different failure class from a runtime `undefined`.
async function runConsumerModule(names, moduleRel) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-door-"));
  try {
    const target = path.join(repoRoot, moduleRel).split(path.sep).join("/");
    const file = path.join(dir, "consumer.mjs");
    const body = [
      `import { ${names.join(", ")} } from "file:///${target}";`,
      `const bound = { ${names.join(", ")} };`,
      "for (const [name, value] of Object.entries(bound)) {",
      '  if (value === undefined) { console.error(`undefined binding: ${name}`); process.exit(2); }',
      "}",
      'console.log("linked");',
    ].join("\n");
    await writeFile(file, body, "utf8");
    return await new Promise((resolve) => {
      execFile(process.execPath, [file], { cwd: repoRoot, windowsHide: true, timeout: 60_000 }, (error, stdout, stderr) => {
        resolve({ code: error?.code ?? 0, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
      });
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// A clean drive over the fixture pair, from whichever door is handed in.
async function driveOnce(drive, options = {}) {
  const which = createFakeWhich(["claude"]);
  const { spawn, spawnCalls, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
  const result = await drive(
    { itemRef: "53/00", worktreeCwd: "/tmp/wt", task: "the session driver gets a home", command: "/aof:verify 53/00" },
    { ptySpawn: spawn, which, watchTranscriptSessionId: async () => "sess-door", commandDelayMs: 0, ...options },
  );
  return { result, spawnCalls, ptys };
}

export const agentSessionDriverDoorTests = [
  // ── task 00 — the two doors ───────────────────────────────────────────────────────
  {
    name: "53/00 task00 — all seventeen frozen names are importable by name from src/agent-session-driver.mjs (a LINK-time observable, checked in a fresh process, with a bogus eighteenth as the control)",
    run: async () => {
      assert.equal(FROZEN.length, 17, "the frozen set is seventeen — ADR-001 §1's sixteen plus ensureWorktreeTrusted (ADR-010 §18)");
      for (const member of FROZEN) {
        assert.notEqual(member.driver, undefined, `${member.name} is bound at the driver's door (this module's own static import already proved the link)`);
      }
      const ok = await runConsumerModule(FROZEN.map((m) => m.name), DRIVER_MODULE);
      assert.equal(ok.code, 0, `a consumer statically importing all seventeen links in a fresh process:\n${ok.stderr}`);

      // NON-VACUITY: a name the module does not export is a link-time error, never a
      // runtime `undefined` — which is what makes "importable at this door" a real
      // observable rather than a truthiness check.
      const bogus = await runConsumerModule([...FROZEN.map((m) => m.name), "notAnExportOfTheDriver"], DRIVER_MODULE);
      assert.notEqual(bogus.code, 0, "a consumer naming an eighteenth, non-existent binding fails to LINK");
      assert.match(bogus.stderr, /does not provide an export named/, "and it fails as a link error, not as a runtime undefined");
    },
  },
  {
    name: "53/00 task00 — all seventeen are importable by name from src/mesh/worker-execution.mjs unchanged: the import line a pre-existing dependent already writes still resolves",
    run: async () => {
      for (const member of FROZEN) {
        assert.notEqual(member.sink, undefined, `${member.name} is bound at the sink's door through the verbatim re-export`);
      }
      const ok = await runConsumerModule(FROZEN.map((m) => m.name), SINK_MODULE);
      assert.equal(ok.code, 0, `a consumer statically importing all seventeen from the sink links in a fresh process:\n${ok.stderr}`);

      // The sink DEFINES none of them — the re-export is the only reason this door
      // resolves, so a dropped `export … from` line reds here rather than at some
      // dependent's next run.
      const source = stripComments(await readFile(path.join(repoRoot, SINK_MODULE), "utf8"));
      for (const member of FROZEN) {
        assert.equal(
          new RegExp(`(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+${member.name}\\b`).test(source),
          false,
          `${member.name} is no longer DEFINED in the sink — it is re-exported from the driver's module`,
        );
      }
    },
  },
  {
    name: "53/00 task00 — the nine frozen constants carry the same value at both doors (HUMAN_INPUT_TOOL_NAMES deep-equal, being an array)",
    run: async () => {
      assert.equal(CONSTANT_MEMBERS.length, 9, "nine of the seventeen are constants");
      for (const member of CONSTANT_MEMBERS) {
        if (member.kind === "array") {
          assert.deepEqual(member.driver, member.sink, `${member.name} is deep-equal at both doors`);
          assert.deepEqual(member.driver, ["AskUserQuestion"], "HUMAN_INPUT_TOOL_NAMES is the closed one-element set");
        } else {
          assert.equal(member.driver, member.sink, `${member.name} carries the same value at both doors`);
        }
        assert.ok(Object.is(member.driver, member.sink), `${member.name} is the SAME reference at both doors — a duplicated-then-drifted definition cannot satisfy this`);
      }
      assert.equal(drvNeedsInputSentinel, "NEEDS_INPUT");
      assert.equal(drvDirectiveCompleteSentinel, "AOF_DIRECTIVE_COMPLETE");
      assert.equal(drvCompletionIdleMs, 15 * 60 * 1000);
      assert.equal(drvDeclaredCompletionIdleMs, 10 * 1000);
      assert.equal(drvInteractiveCommandReadyDelayMs, 5000);
      assert.ok(drvNeedsInputInstruction.includes(drvNeedsInputSentinel), "NEEDS_INPUT_INSTRUCTION embeds its sentinel");
      assert.ok(drvDirectiveCompleteInstruction.includes(drvDirectiveCompleteSentinel), "DIRECTIVE_COMPLETE_INSTRUCTION embeds its sentinel");
      assert.equal(drvWorkerSessionInstruction, `${drvNeedsInputInstruction}\n\n${drvDirectiveCompleteInstruction}`, "WORKER_SESSION_INSTRUCTION is the two instructions concatenated, in that order");
    },
  },
  {
    name: "53/00 task00 — the eight frozen functions are callable at both doors, defaultPtySpawn among them (a name no consumer could reach before this move)",
    run: async () => {
      assert.equal(FUNCTION_MEMBERS.length, 8, "eight of the seventeen are functions");
      for (const member of FUNCTION_MEMBERS) {
        assert.equal(typeof member.driver, "function", `${member.name} is a function at the driver's door`);
        assert.equal(typeof member.sink, "function", `${member.name} is a function at the sink's door`);
        assert.ok(Object.is(member.driver, member.sink), `${member.name} is one implementation behind both doors`);
      }
      // `defaultPtySpawn` was a bare module-private `const` in the sink until this move
      // (ADR-010 §17d) — the one door that OPENS rather than moves.
      assert.equal(typeof drvDefaultPtySpawn, "function", "defaultPtySpawn is newly reachable at the driver's door");
      assert.equal(typeof sinkDefaultPtySpawn, "function", "and at the sink's, through the re-export");
    },
  },
  {
    name: "53/00 task00 — the sentinels a consumer imports from the SINK are the sentinels the DRIVER's launch actually carries (read off the spawned payload, never re-derived)",
    run: async () => {
      const { spawnCalls } = await driveOnce(drvDriveInteractiveClaudeSession);
      assert.equal(spawnCalls.length, 1, "exactly one spawn");
      const args = spawnCalls[0].args;
      const appendIdx = args.indexOf("--append-system-prompt");
      assert.ok(appendIdx !== -1, "the launch appends a system prompt");
      const payload = args[appendIdx + 1];
      assert.equal(typeof payload, "string", "the appended system prompt is a string arg");
      assert.ok(payload.includes(sinkNeedsInputSentinel), "the payload the driver spawned contains NEEDS_INPUT_SENTINEL as imported FROM THE SINK");
      assert.ok(payload.includes(sinkDirectiveCompleteSentinel), "and DIRECTIVE_COMPLETE_SENTINEL as imported from the sink");
      // A second, drifted definition of either sentinel in either module would fail
      // this: the payload is composed from the DRIVER's constants and compared against
      // the SINK's bindings.
      assert.equal(payload, sinkWorkerSessionInstruction, "the whole payload is WORKER_SESSION_INSTRUCTION as bound at the sink's door");
    },
  },
  {
    name: "53/00 task00 — the same drive through either door produces the same observables: one spawn, deep-equal argv, one write, the same settled shape",
    run: async () => {
      const viaDriver = await driveOnce(drvDriveInteractiveClaudeSession);
      const viaSink = await driveOnce(sinkDriveInteractiveClaudeSession);

      assert.equal(viaDriver.spawnCalls.length, 1, "the driver's door records exactly one spawn call");
      assert.equal(viaSink.spawnCalls.length, 1, "the sink's door records exactly one spawn call");
      assert.equal(viaDriver.spawnCalls[0].bin, viaSink.spawnCalls[0].bin, "same resolved bin");
      assert.deepEqual(viaDriver.spawnCalls[0].args, viaSink.spawnCalls[0].args, "deep-equal argv");
      assert.deepEqual(viaDriver.ptys[0].writes, viaSink.ptys[0].writes, "the same single write");
      assert.equal(viaDriver.ptys[0].writes.length, 1, "exactly one write, from both");
      assert.deepEqual(viaDriver.result, viaSink.result, "the same { outcome, sessionId, failureReason } shape");
      assert.deepEqual(viaDriver.result, { outcome: "done", sessionId: "sess-door" });
    },
  },
  {
    name: "53/00 task00 — INTERACTIVE_COMMAND_READY_DELAY_MS still reaches its one production consumer through the sink: src/mesh/launcher.mjs is unedited and wires it as commandDelayMs at both call sites",
    run: async () => {
      assert.equal(sinkInteractiveCommandReadyDelayMs, 5000, "the constant is 5000 at the launcher's own door");
      const launcher = await readFile(path.join(repoRoot, "src", "mesh", "launcher.mjs"), "utf8");
      const sinkImport = staticImports(launcher).find((entry) => resolvesToSink(LAUNCHER_MODULE, entry.specifier));
      assert.ok(sinkImport != null, "the launcher still imports from mesh-worker-execution.mjs");
      const names = importedNames(sinkImport.clause);
      assert.equal(names.length, 14, `the launcher's import still names fourteen bindings: ${names.join(", ")}`);
      assert.ok(names.includes("INTERACTIVE_COMMAND_READY_DELAY_MS"), "including INTERACTIVE_COMMAND_READY_DELAY_MS");
      assert.ok(names.includes("ensureWorktreeTrusted"), "and ensureWorktreeTrusted");
      const wirings = stripComments(launcher).match(/commandDelayMs:\s*INTERACTIVE_COMMAND_READY_DELAY_MS/g) ?? [];
      assert.equal(wirings.length, 2, "it is wired as commandDelayMs at both driver call sites");
      assert.equal(launcher.includes("agent-session-driver"), false, "the launcher was never told the driver moved");
    },
  },
  {
    name: "53/00 task00 — the sink's own remaining handler code still reaches the two names it consumes INWARD: the default spawnRuntime drives the interactive path exactly once (ADR-010 §17a)",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const recorder = createStatusRecorder();
      const which = createFakeWhich(["claude"]);
      const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const handler = createMeshWorkerExecutionHandler({
        pushExec: scriptedPushExec(),
        loadWs: () => Promise.resolve(ws),
        nodeId: NODE_ID,
        sendAssignmentStatus: recorder.sendAssignmentStatus,
        sendEffectStep: recorder.sendEffectStep,
        now: () => "2026-08-16T09:00:00.000Z",
        globalWorkStoreOptions: { env: fx.env },
        // spawnRuntime is deliberately NOT overridden: this drives the PRODUCTION
        // default, which is now an IMPORT from the driver's module. An `export … from`
        // line alone binds no local name, so a sink carrying only the re-export would
        // be a ReferenceError right here.
        ptySpawn: spawn,
        which,
      });
      await handler({ kind: "directive", to: NODE_ID, assignmentId: "asg-inward", itemRef: fx.itemRef, workspaceId: fx.workspaceId, at: "2026-08-16T09:00:00.000Z", command: "/aof:verify 53/00" });
      assert.equal(spawnCalls.length, 1, "the handler's default runtime drove the interactive path through the injected seam exactly once");

    }),
  },
  {
    // VERIFICATION F-02 (53/00). The lane above drives ONE inward consumer for real; the
    // rest used to be asserted by naming them in a regex, and a hand-counted census is
    // exactly what missed the third (`driveInteractiveClaudeSession` at the resume
    // handler's `spawnRuntime` default — F-01, a ReferenceError on the launcher's own
    // start path that the regex sailed two lines past). So the census is DERIVED here
    // instead of typed: whatever subset of the re-exported names the sink's own body
    // still uses IS the inward set, and the inward `import` clause must cover it. A
    // fourth inward consumer arriving later is caught by construction — nobody has to
    // remember to add its name to a list.
    name: "53/00 task00 — the sink's INWARD set is DERIVED from its own body, not hand-counted: every re-exported name the sink still uses is also imported back (ADR-010 §17a, VERIFICATION F-02)",
    run: async () => {
      const raw = await readFile(path.join(repoRoot, SINK_MODULE), "utf8");
      const sinkSource = stripComments(raw);

      // The re-export block: the seventeen names that now live in the driver.
      // `[^}]*` rather than a lazy `[\s\S]*?`: a lazy span would start at some EARLIER
      // `import {` and run through to this module's specifier, handing `importedNames`
      // the wrong statement's braces.
      const reExport = new RegExp(`export\\s*\\{([^}]*)\\}\\s*from\\s*["']${DRIVER_SPECIFIER_PATTERN}["']`, "u").exec(sinkSource);
      assert.ok(reExport, `the sink re-exports from the driver at ${DRIVER_SPECIFIER}`);
      const reExported = importedNames(reExport[0]);
      assert.equal(reExported.length, 17, `the re-export block carries the frozen seventeen: ${reExported.join(", ")}`);

      // The inward import clause: the names the sink binds LOCALLY.
      const inwardImport = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${DRIVER_SPECIFIER_PATTERN}["']`, "u").exec(sinkSource);
      assert.ok(inwardImport, `the sink also imports from the driver at ${DRIVER_SPECIFIER} — a re-export binds no local name`);
      const imported = importedNames(inwardImport[0]);

      // The body: everything that is neither of those two blocks. Any re-exported name
      // appearing here as an identifier is consumed inward and MUST be bound locally.
      const body = sinkSource.replace(reExport[0], "").replace(inwardImport[0], "");
      const consumedInward = reExported.filter((name) => new RegExp(`(?<![\\w$.])${name}(?![\\w$])`).test(body));

      assert.deepEqual(
        consumedInward.sort(),
        ["defaultSpawnRuntime", "driveInteractiveClaudeSession"],
        "the sink consumes exactly the two remaining ADR-015 §2 inward names",
      );
      const unbound = consumedInward.filter((name) => !imported.includes(name));
      assert.deepEqual(
        unbound,
        [],
        `every re-exported name the sink's own body still uses must ALSO be imported back, or it is a ReferenceError at that site: ${unbound.join(", ")} used but not imported`,
      );

      // The derivation is a FLOOR too: a body-scan that stopped scanning would report a
      // perfect empty set. The two remaining consumers are the known minimum.
      for (const name of ["defaultSpawnRuntime", "driveInteractiveClaudeSession"]) {
        assert.ok(consumedInward.includes(name), `${name} is a known inward consumer and the derivation must find it`);
      }
    },
  },
  {
    // The behavioural half of F-02: the derivation above is static, and a static check
    // cannot prove the binding actually resolves at the site. `createMeshWorkerTerminalResumeHandler`
    // evaluates its `spawnRuntime` default AT CONSTRUCTION, with no injected seam — which
    // is precisely where F-01 threw, and precisely what the production wiring at
    // mesh-launcher.mjs:1402 does. Constructing it here is the positive control the old
    // source regex could not be.
    name: "53/00 task00 — the resume handler CONSTRUCTS with no injected runtime seam: its inward default resolves for real, the way the launcher builds it (VERIFICATION F-01/F-02)",
    run: async () => {
      const handler = createMeshWorkerTerminalResumeHandler({ nodeId: NODE_ID });
      assert.equal(typeof handler, "function", "the handler is constructed, not thrown out of");

      // And the execution handler's own default, same shape, same reason.
      const execHandler = createMeshWorkerExecutionHandler({ nodeId: NODE_ID });
      assert.equal(typeof execHandler, "function", "the execution handler constructs on its inward default too");
    },
  },
  {
    name: "53/00 task00 — ensureWorktreeTrusted is the SEVENTEENTH name: a function at both doors, the same reference at both, counted by the frozen set rather than excepted from it (ADR-010 §18)",
    run: async () => {
      assert.equal(typeof drvEnsureWorktreeTrusted, "function", "a function at the driver's door");
      assert.equal(typeof sinkEnsureWorktreeTrusted, "function", "a function at the sink's door");
      assert.ok(Object.is(drvEnsureWorktreeTrusted, sinkEnsureWorktreeTrusted), "the same reference at both");
      assert.ok(FROZEN.some((m) => m.name === "ensureWorktreeTrusted"), "it is a MEMBER of the frozen set the cardinality check counts, not an exception to it");
      const launcher = await readFile(path.join(repoRoot, "src", "mesh", "launcher.mjs"), "utf8");
      const sinkImport = staticImports(launcher).find((entry) => resolvesToSink(LAUNCHER_MODULE, entry.specifier));
      assert.ok(importedNames(sinkImport.clause).includes("ensureWorktreeTrusted"), "the launcher's existing named import of it from the sink is unaffected");
    },
  },
  {
    name: "53/00 task00 — a door does not invent names: a name neither module owns reads undefined at both, in the same check that reads a frozen one defined at both",
    run: async () => {
      for (const absent of ["driveInteractiveCodexSession", "WORKER_SESSION_PREAMBLE", "defaultWatchTranscript"]) {
        assert.equal(driverNamespace[absent], undefined, `${absent} is not invented at the driver's door`);
        assert.equal(sinkNamespace[absent], undefined, `${absent} is not invented at the sink's door`);
      }
      // NON-VACUITY, in the same check: a name that IS one of the seventeen reads
      // defined at both doors, so a probe that could never find anything fails here.
      for (const member of FROZEN) {
        assert.notEqual(driverNamespace[member.name], undefined, `${member.name} reads defined at the driver's door`);
        assert.notEqual(sinkNamespace[member.name], undefined, `${member.name} reads defined at the sink's door`);
      }
      // The cardinality of the new module's own namespace: exactly the seventeen.
      assert.deepEqual(
        Object.keys(driverNamespace).sort(),
        FROZEN.map((m) => m.name).sort(),
        "the new module exports exactly the frozen seventeen — an eighteenth export is as much a defect as a missing one",
      );
    },
  },

  // ── task 01 — the importers stay put ──────────────────────────────────────────────
  {
    name: "53/00 task01 — the census is checked against its literal oracle before anything is concluded: 48 suites + 2 test/support fixtures + 4 under src//scripts = 54",
    run: async () => {
      const { files, members, preExisting, storyOwn, suites, fixtures, sourceSide } = await census();
      // A parse that matched nothing reports perfect stability over the empty set —
      // TECH_DEBT item 5's species inside the instrument built to measure the move.
      assert.ok(files.length > 300, `the tree was actually parsed (non-vacuous): ${files.length} .mjs files under test/, src/ and scripts/`);
      assert.ok(members.length > 0, "the parse found importers at all");
      // The partition, both directions: everything the parse found is either a
      // pre-existing dependent or one of THIS story's own five suites, and nothing else.
      assert.equal(preExisting.length + storyOwn.length, members.length, "the partition is exhaustive");
      assert.ok(storyOwn.every((m) => STORY_SUITES.includes(m.rel)), "only this story's own suites are held out of the census");
      assert.ok(storyOwn.some((m) => m.rel === "test/session/agent-session-driver-door.test.mjs"), "…and the door suite really is among them, so the hold-out is not vacuous");

      // 63/03 adds TWO, and both reach the sink through its own door rather than the
      // driver's: `mesh-assignment-loop-directive.test.mjs` drives the real worker handler
      // over a loop directive, and `arch/acd-assignment-resolves-to-a-loop-call.test.mjs`
      // (FF-6306) reads the launch seam through the sink's re-export to prove ADR-012 §3's
      // caller-side obligation both ways. Neither NAMES agent-session-driver, so the closed
      // allowlist below is untouched and the 44+2 split becomes 46+2.
      // A CONTROL STORES A DECISION AND DERIVES A FACT (119/ADR-003 §3). Each of these four sites
      // was an exact equality against a set the walk above produces — a fact about the tree,
      // retyped. Its PURPOSE was non-vacuity, and that purpose is what survives: the real property
      // is asserted over EVERY member, and a FLOOR is kept for the non-vacuity the equality was
      // standing in for. The floors stay stored because a floor is a declared bound; the equalities
      // go, because a story that adds a suite importing the sink should not have to edit a control
      // it has never read. That is the bill this file used to send to a stranger, four consecutive
      // stories running.
      // 129/02 (2026-09-13): 48 -> 49 — `test/loop/drive-command-phase-drivers.test.mjs` now imports
      // `driveInteractiveClaudeSession` through the sink for task 01's driver-level `signal` cases;
      // FF-11902's no-headroom probe (`acd-control-derives-its-census`) ratchets these floors to the
      // live census, so the pair moves together (49 + 2 + 4 = 55).
      const SUITE_FLOOR = 49;
      const FIXTURE_FLOOR = 2;
      const SOURCE_SIDE_FLOOR = 4;
      const CENSUS_FLOOR = 55;
      const importsTheSink = async (rel) =>
        staticImports(await readFile(path.join(repoRoot, rel), "utf8")).some((entry) => resolvesToSink(rel, entry.specifier));

      for (const member of suites) {
        assert.match(member.rel, /^test\/(?!support\/).*\.test\.mjs$/u, `${member.rel} is a *.test.mjs suite, and not a support fixture`);
        assert.ok(await importsTheSink(member.rel), `${member.rel} statically imports the sink — re-read from disk rather than trusted from the cached parse`);
      }
      assert.ok(suites.length >= SUITE_FLOOR, `at least ${SUITE_FLOOR} *.test.mjs suites import the sink (got ${suites.length}): ${suites.map((m) => m.rel).join(", ")}`);

      for (const member of fixtures) {
        assert.match(member.rel, /^test\/support\/.*\.mjs$/u, `${member.rel} is a test/support fixture module`);
        assert.ok(await importsTheSink(member.rel), `${member.rel} statically imports the sink`);
      }
      assert.ok(fixtures.length >= FIXTURE_FLOOR, `at least ${FIXTURE_FLOOR} test/support/*.mjs fixture modules do (got ${fixtures.length}): ${fixtures.map((m) => m.rel).join(", ")}`);

      for (const member of sourceSide) {
        assert.match(member.rel, /^(?:src|scripts)\/.*\.mjs$/u, `${member.rel} is a file under src/ or scripts/`);
        assert.ok(await importsTheSink(member.rel), `${member.rel} statically imports the sink`);
      }
      assert.ok(sourceSide.length >= SOURCE_SIDE_FLOOR, `at least ${SOURCE_SIDE_FLOOR} files under src/ or scripts/ do (got ${sourceSide.length}): ${sourceSide.map((m) => m.rel).join(", ")}`);

      // THE THREE CLASSES PARTITION THE CENSUS EXHAUSTIVELY, both directions and disjointly — which
      // is what `48 + 2 + 4 = 54` was really claiming, said as a property rather than as arithmetic
      // somebody has to re-do.
      assert.equal(
        suites.length + fixtures.length + sourceSide.length,
        preExisting.length,
        `the three classes partition the ${preExisting.length} recorded dependents exhaustively`,
      );
      const classified = new Set([...suites, ...fixtures, ...sourceSide].map((m) => m.rel));
      assert.equal(classified.size, preExisting.length, "…and disjointly — no dependent is counted in two classes");
      for (const member of preExisting) assert.ok(classified.has(member.rel), `${member.rel} falls in exactly one class`);
      assert.ok(preExisting.length >= CENSUS_FLOOR, `at least ${CENSUS_FLOOR} recorded dependents (got ${preExisting.length})`);
    },
  },
  {
    name: "53/00 task01 — prose mentions are not dependents: the file that names the sink only inside string literals is excluded, and a narrating comment cannot inflate the census",
    run: async () => {
      const { preExisting } = await census();
      const rels = preExisting.map((m) => m.rel);
      // The trap that produces 44 suites, named so it is not rediscovered: this file
      // names the sink at :191 (a planted import inside a template literal) and :265
      // (a fixture path). Both are STRINGS; it is not an importer.
      const impostor = "test/arch/session/acd-session-worktree-lane-scoped.test.mjs";
      const impostorSource = await readFile(path.join(repoRoot, impostor), "utf8");
      assert.ok(impostorSource.includes(SINK_SUFFIX), "precondition: the file does name the sink, so excluding it is a real decision");
      assert.equal(rels.includes(impostor), false, "…but it is not counted as a dependent — the static-import parse is right and the grep is not");

      // And a comment naming the module is not an import either.
      assert.deepEqual(staticImports('// import { workerHasRepo } from "./mesh/worker-execution.mjs";'), [], "a commented-out import is stripped before the parse");
      // The real shape at :191 — a one-physical-line template literal whose `\n` is an
      // ESCAPE, not a newline. The anchor is what excludes it.
      assert.deepEqual(
        staticImports('const planted = `${clean}\\nimport { workerHasRepo } from "./mesh/worker-execution.mjs";`;'),
        [],
        "an import inside a template literal is not a static import",
      );
      assert.deepEqual(
        staticImports('  { path: "src/mesh/worker-execution.mjs", source: "…" },'),
        [],
        "and a fixture path naming the module is not one either (the shape at :265)",
      );
      assert.equal(staticImports('import { workerHasRepo } from "./mesh/worker-execution.mjs";').length, 1, "self-check: a real static import IS matched");
    },
  },
  {
    name: "53/00 task01 — only the closed named set under test/ may name agent-session-driver; the 48 census members split as 44 zero-name importers plus four named re-aimed gates",
    run: async () => {
      const testFiles = await walkMjs("test");
      const naming = [];
      for (const rel of testFiles) {
        const source = await readFile(path.join(repoRoot, rel), "utf8");
        if (source.includes("agent-session-driver")) naming.push(rel);
      }
      assert.ok(testFiles.length > 300, `the test tree was actually walked (non-vacuous): ${testFiles.length} files`);
      assert.deepEqual(naming.sort(), NAMES_THE_NEW_MODULE, "the closed ADR-015 §2 allowlist includes every later driver consumer by name and reason");

      const { suites } = await census();
      // THE SPLIT'S SUBJECT IS THE CENSUS THE SAME WALK PRODUCED (119/ADR-003 §3) — asserted as an
      // identity below rather than as a retyped count here. The floor is what the equality was for.
      assert.ok(suites.length >= 49, `the census is non-vacuous: ${suites.length} suites import the sink`);
      const zeroMention = [];
      const named = [];
      for (const member of suites) {
        const source = await readFile(path.join(repoRoot, member.rel), "utf8");
        const hits = (source.match(/agent-session-driver/g) ?? []).length;
        (hits === 0 ? zeroMention : named).push(member.rel);
      }
      // DERIVED, WITH A FLOOR. The property is per member — each suite in the zero-mention class
      // really names the driver zero times — and the two classes are asserted to partition the
      // census the same walk produced, which is what the retyped 44 and 48 were standing in for.
      for (const rel of zeroMention) {
        const source = await readFile(path.join(repoRoot, rel), "utf8");
        assert.equal((source.match(/agent-session-driver/g) ?? []).length, 0, `${rel} names the driver zero times`);
      }
      assert.equal(zeroMention.length + named.length, suites.length, "the two classes partition the census exhaustively");
      assert.ok(zeroMention.length >= 44, `at least 44 census suites name the new module zero times (got ${zeroMention.length})`);
      assert.deepEqual(
        named,
        [
          // 63/03's FF-6306 fence READS the driver to prove it holds none of that story's
          // identifiers; it reaches the launch seam through the sink, so it is a census
          // member that names the driver as a subject rather than as an import.
          "test/arch/assignment/acd-assignment-resolves-to-a-loop-call.test.mjs",
          "test/arch/assignment/acd-worker-driver-no-headless-print.test.mjs",
          // 63/06 — the loop-shaped watch lane, which names the driver for its positive
          // control: the session-shaped default it must be shown to have replaced.
          "test/mesh/assignment/mesh-assignment-loop-directive.test.mjs",
          "test/work/phase-brief-seams.test.mjs",
        ],
        "the four named census members are exactly the deliberately re-aimed source gate, 70/00's seam suite, 63/03's fence and 63/06's loop-watch lane",
      );
    },
  },
  {
    name: "53/00 task01 — the census is a floor, not only a set: the named driver and completion suites exist on disk AND are registered",
    run: async () => {
      const registered = await registeredSuitePaths(repoRoot);
      const surface = await registrationSurface(repoRoot);
      for (const [rel, spread] of NAMED_DRIVER_SUITES) {
        const source = await readFile(path.join(repoRoot, rel), "utf8");
        assert.ok(source.length > 0, `${rel} exists on disk — looked up, never trusted`);
        assert.ok(registered.has(rel), `${rel} is registered — its own directory's index imports and spreads it, and the runner spreads that index`);
        assert.ok(surface.includes(spread), `${rel}'s test array is SPREAD — an import that is never spread reads green at the orphan gate while running never`);
      }

      // ── 119/03 AMENDMENT: the labelled BLOCK is gone, and the claim it carried is not ────────
      // These lines asserted that this story's five suites sat inside one labelled, contiguous
      // `// milestone 53 / story 00` block in `scripts/test.mjs`, positionally — ADR-011 §1's
      // "additive, never edits to another story's". Since 119/03 the registry names DIRECTORIES:
      // every suite is imported and spread by the index of the directory that owns it, the runner
      // names no suite at all, and this story's five all live under `test/session/`. There is no
      // block left to be contiguous in.
      //
      // What the block was FOR survives, by OWNERSHIP rather than by position: each of the five is
      // registered exactly once, by `test/session/index.mjs` and by no other index — which is the
      // same "one home, additive, nobody else's block edited" claim, asserted at the home the
      // suite now actually has.
      const sessionIndex = await readFile(path.join(repoRoot, "test", "session", "index.mjs"), "utf8");
      for (const rel of STORY_SUITES) {
        assert.ok(registered.has(rel), `${rel} is registered`);
        assert.equal(sessionIndex.split(`./${path.basename(rel)}"`).length - 1, 1, `${rel} is named EXACTLY once by its own directory's index`);
        assert.ok(surface.includes(`...${path.basename(rel, ".test.mjs").replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Tests`), `${rel}'s array is spread`);
      }
    },
  },
  {
    name: "53/00 task01 — all 53 import-safe census members still link in one fresh process, and no named binding any of the 54 dependents takes from the sink is undefined",
    run: async () => {
      const { preExisting } = await census();
      // `scripts/pin-checkout-id.mjs` is a CLI ENTRY POINT: it reads process.argv and
      // `process.exit(1)`s at module evaluation when invoked with none. It is a real
      // dependent and its bindings are checked below like every other member's; it is
      // simply not importable as a library, and pretending otherwise would mean either
      // a green from a swallowed exit or an edit to a file this story must not touch.
      const importable = preExisting.filter((m) => m.rel !== "scripts/pin-checkout-id.mjs");
      // DERIVED FROM THE CENSUS, WITH A FLOOR (119/ADR-003 §3). The import-safe set is the recorded
      // dependents minus the ONE named CLI entry point held out above — a decision, stated once, in
      // the comment that gives its reason — rather than a total somebody re-adds by hand each time a
      // consumer lands. Every member of it is then linked in one fresh process below, which is the
      // property the count was standing in for.
      assert.equal(importable.length, preExisting.length - 1, "exactly the one named CLI entry point is held out of the fresh-import probe");
      assert.ok(importable.length >= 53, `the probe links at least 53 members (got ${importable.length})`);
      const probe = [
        'const sink = await import("file:///" + process.argv[2] + "/src/mesh/worker-execution.mjs");',
        "const rels = JSON.parse(process.argv[3]);",
        "for (const rel of rels) { await import(\"file:///\" + process.argv[2] + \"/\" + rel); }",
        "const wanted = JSON.parse(process.argv[4]);",
        "const missing = wanted.filter((name) => sink[name] === undefined);",
        'if (missing.length > 0) { console.error("undefined at the sink: " + missing.join(", ")); process.exit(2); }',
        'console.log("linked " + rels.length);',
      ].join("\n");
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-census-"));
      try {
        const file = path.join(dir, "probe.mjs");
        await writeFile(file, probe, "utf8");
        const wanted = [...new Set(preExisting.flatMap((m) => m.names))];
        assert.ok(wanted.length > 20, `the parse recovered the bindings the dependents actually take (non-vacuous): ${wanted.length} distinct names`);
        const result = await new Promise((resolve) => {
          execFile(
            process.execPath,
            [file, repoRoot.split(path.sep).join("/"), JSON.stringify(importable.map((m) => m.rel)), JSON.stringify(wanted)],
            { cwd: repoRoot, windowsHide: true, timeout: 180_000, maxBuffer: 8 * 1024 * 1024 },
            (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") }),
          );
        });
        assert.equal(result.code, 0, `every census member links in a fresh process and every named binding resolves:\n${result.stderr}`);
        assert.match(result.stdout, new RegExp(`linked ${importable.length}`), "and all of them were actually imported");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "53/00 task01 — scripts/pin-checkout-id.mjs is parsed but never executed: every sink binding in its static import links in a fresh consumer process",
    run: async () => {
      const rel = "scripts/pin-checkout-id.mjs";
      const source = await readFile(path.join(repoRoot, rel), "utf8");
      const imports = staticImports(source).filter((entry) => resolvesToSink(rel, entry.specifier));
      assert.equal(imports.length, 1, "the pin CLI has exactly one static import from the sink");
      const names = importedNames(imports[0].clause);
      assert.ok(names.length > 0, "the parsed pin-CLI binding set is non-vacuous");
      const linked = await runConsumerModule(names, SINK_MODULE);
      assert.equal(linked.code, 0, `the pin CLI's parsed sink bindings link without evaluating its command body:\n${linked.stderr}`);
      assert.match(linked.stdout, /linked/, "the fresh consumer process reached its post-link marker");
    },
  },
  {
    name: "53/00 task01 — the other three source-side importers are untouched, and src/work.mjs is not among this story's edits at any distance",
    run: async () => {
      for (const rel of ["src/global-node-registry.mjs", "src/mesh/clone-credential-provider.mjs", "scripts/pin-checkout-id.mjs"]) {
        const source = await readFile(path.join(repoRoot, rel), "utf8");
        assert.ok(
          staticImports(source).some((entry) => resolvesToSink(rel, entry.specifier)),
          `${rel} still imports the sink at ${SINK_MODULE}`,
        );
        assert.equal(source.includes("agent-session-driver"), false, `${rel} does not name the new module`);
      }
      // The milestone's zero-edits-to-the-god-node property: `work.mjs` is neither a
      // subject nor a consequence of the extraction. The new module does not import it
      // either — the one admitted edge is terminal-ws.mjs -> work.mjs (ADR-001 §3).
      const driverSource = await readFile(path.join(repoRoot, DRIVER_MODULE), "utf8");
      assert.equal(
        staticImports(driverSource).some((entry) => entry.specifier.endsWith("work.mjs")),
        false,
        "src/agent-session-driver.mjs does not import src/work.mjs",
      );
      const godNode = await readFile(path.join(repoRoot, "src", "work.mjs"), "utf8");
      assert.equal(godNode.includes("agent-session-driver"), false, "src/work.mjs was not touched by this story");
    },
  },
];
