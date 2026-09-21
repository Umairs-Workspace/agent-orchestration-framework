// src/loop/stop.mjs — `--stop` RIDES ONE VERB CORE (milestone 130 / story 02; ADR-002, ADR-006 §1).
//
// `stopLoop(workspace, { scope, now })` is the ONE function the CLI face (`work:loop --stop`),
// the fleet route and the desktop reach — a core BELOW the command layer, exactly as `assignWork`
// is the fleet's one sanctioned write door (38/ADR-012: a second CALLER of the SAME core, never a
// re-implementation). It resolves the scope's loop from its RUN RECORDS — the latest declaration
// in scope, whichever item it sits on — writes or escalates the request through
// `stop-request.mjs`'s one writer, and answers a document. It never throws for a refusal: a
// refusal is `{ ok: false, code, message }`, and the faces map it to their own contracts.
//
// The verb reads run records only. `supervised` plays no part, so a foreground loop is as
// stoppable as a supervised one (ADR-002 §7); the request is a file in THIS machine's aof home,
// so a declaration whose latest run names another node is refused by name (ADR-006 §1) — the
// operator stops it on that node's own console.
import { listItems } from "../work.mjs";
import { decideLoopScope, loopScopeIncludes, readLoopDeclaration } from "../work/loop.mjs";
import { isRunning, isStale, readRuns } from "../run-store.mjs";
import { heartbeatFromConfig } from "../loop-bounds.mjs";
import { meshNodeIdOf } from "../commands/mesh/gate.mjs";
import {
  STOP_LEVELS,
  loopStopsDir,
  markStopHonoured,
  requestLoopStop,
  stopRequestPath,
} from "./stop-request.mjs";

// The refusal codes, each a coded document (ADR-002 §3, §5): the command face maps
// `loop-stop-no-declaration` to 404 and the other two to 409; `loop-stop-exclusive` (400) is the
// face's own, raised before this core is reached. The two messages this core composes name their
// code in parentheses, the shell's own `throwRefusal` idiom, because the CLI's human face prints
// a refusal's MESSAGE and nothing else — the code would otherwise reach only the `--json` envelope.
// The scope refusal carries the engine's own reason, verbatim.
export const STOP_REFUSALS = Object.freeze({
  scope: "loop-stop-scope",
  noDeclaration: "loop-stop-no-declaration",
  notLocal: "loop-stop-not-local",
});

const refuse = (code, message) => ({ ok: false, code, message });

// The word for a level, through the ONE map (ADR-001 §2): `drain` for 1, `cancel` for 2.
function wordFor(level) {
  return Object.entries(STOP_LEVELS).find(([, value]) => value === level)?.[0] ?? null;
}

// The clock, whatever shape the caller handed in: a function answering a Date (the suites'
// injected clock), an ISO string or a Date (the shell's `input.now`), or nothing (real time).
function clockOf(now) {
  if (typeof now === "function") return now;
  if (now == null) return () => new Date();
  const fixed = new Date(now);
  return () => new Date(fixed.getTime());
}

// The latest run carrying the declaration, by the same order `readLoopDeclaration` chose it —
// greatest `createdAt`, then greatest `runId` — over every run in scope.
function latestRunCarrying(runs, loopRunId) {
  return runs
    .filter((run) => run?.brief?.loop?.loopRunId === loopRunId)
    .sort((left, right) => {
      const leftTime = String(left.createdAt ?? "");
      const rightTime = String(right.createdAt ?? "");
      if (leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;
      const a = String(left.runId ?? "");
      const b = String(right.runId ?? "");
      return a < b ? -1 : a > b ? 1 : 0;
    })
    .at(-1) ?? null;
}

// stopLoop(workspace, { scope, now }) → the SEVEN-key document, in frozen order
// `{ ok: true, loopRunId, scope, live, request, state, path }`, or `{ ok: false, code, message }`.
//
//   (a) `decideLoopScope` — a refusal is `loop-stop-scope`;
//   (b) the items in scope through `listItems` + `loopScopeIncludes`, their runs through `readRuns`;
//   (c) `readLoopDeclaration` over those runs — `null` is `loop-stop-no-declaration`;
//   (d) the latest run carrying that `loopRunId`: when its `node` and this workspace's
//       `mesh.nodeId` are both named and differ, `loop-stop-not-local` naming both and the
//       remedy; a `null` (or empty) node counts as local — absence is benign;
//   (e) `live` = that run is `running` and not stale under `heartbeatFromConfig(workspace)` —
//       the record's own liveness, by the same threshold the driver times it out on;
//   (f) `requestLoopStop` (129/04's ladder: drain, then cancel, then unchanged) with
//       `by: { node, pid }`; when `live === false` the request is marked `honoured` at once —
//       no loop will honour it, and the mark is what stops the supervisor relaunching a dead one;
//   (g) the answer: `request` is the word for the level AFTER this call, `state` the file's.
//
// A third call answers `cancel` again — idempotent, never an error. A not-live loop's request is
// honoured at the first call and never re-opened: the second and third answer `drain`/`honoured`.
export async function stopLoop(workspace, { scope, now } = {}) {
  const scoped = decideLoopScope(scope);
  if (scoped?.admitted !== true) {
    return refuse(STOP_REFUSALS.scope, scoped?.reason ?? `scope ${JSON.stringify(scope)} is not an admitted loop scope`);
  }
  const items = (await listItems(workspace.workDir)).filter((row) => loopScopeIncludes(scoped.scope, row.ref) && typeof row.dir === "string");
  const runs = [];
  for (const item of items) runs.push(...await readRuns(item));
  const declaration = readLoopDeclaration(runs);
  if (declaration == null) {
    return refuse(STOP_REFUSALS.noDeclaration, `No run in scope ${scoped.scope} carries a loop declaration — there is no loop to stop. Start one with \`aof work loop ${scoped.scope}\` (${STOP_REFUSALS.noDeclaration}).`);
  }
  const latest = latestRunCarrying(runs, declaration.loopRunId);
  const localNode = meshNodeIdOf(workspace.config);
  const runNode = typeof latest?.node === "string" && latest.node.length > 0 ? latest.node : null;
  if (localNode != null && runNode != null && runNode !== localNode) {
    return refuse(
      STOP_REFUSALS.notLocal,
      `Loop ${declaration.loopRunId} in scope ${scoped.scope} last ran on ${runNode}, not on this node (${localNode}) — stop it on ${runNode}'s own console (${STOP_REFUSALS.notLocal}).`,
    );
  }
  const clock = clockOf(now);
  const live = latest != null && isRunning(latest) && !isStale(latest, clock().getTime(), heartbeatFromConfig(workspace));
  const dir = loopStopsDir();
  const written = await requestLoopStop(dir, {
    loopRunId: declaration.loopRunId,
    scope: scoped.scope,
    workspaceId: workspace?.config?.mesh?.workspaceId ?? null,
    by: { node: localNode, pid: process.pid },
    now: clock,
  });
  let record = written.record;
  if (!live) record = await markStopHonoured(dir, declaration.loopRunId, { now: clock }) ?? record;
  return {
    ok: true,
    loopRunId: declaration.loopRunId,
    scope: scoped.scope,
    live,
    request: wordFor(record.level),
    state: record.state,
    path: stopRequestPath(dir, declaration.loopRunId),
  };
}
