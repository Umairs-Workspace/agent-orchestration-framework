// work:run-status — read an item's run history (ADR-003 the observability READ).
//
// A thin READ wrapper over story 00's src/run-store.mjs (the doc.mjs idiom). It
// resolves the ref with `resolveItem` (exact-preferred, free-text slug fallback
// tolerated — the read is forgiving where the writes are not, like work:doc /
// work:tasks). An item with no runs is absent-NOT-error: readRuns returns [] (the
// store's ENOENT→[] discipline, ADR-002), never a thrown error. The result is
// { ref, runs:[…] } — records carry refs, so there is no path projection.
import { resolveItem } from "./resolve.mjs";
import { commandError } from "../command-error.mjs";
import { readRuns } from "../run-store.mjs";
// schema v5 (TECH_DEBT item 6 — finish the board bridge): a ref whose runs live on
// another machine's worktree answers from the worker-streamed projection — the RUNS
// tab used to read the LOCAL runs/ dir and say "No runs yet" for an item that was
// running remotely at that moment.
import { readWorkerRuns, readStreamedItemRow } from "../cache-read.mjs";
import { executionScopeRef } from "../board-mesh-execution.mjs";
// 126/01 (ADR-003 §2) — THE PER-ATTEMPT TERM, REUSED. The one arithmetic that says how long an
// attempt ran: a reclaimed attempt ends at its last liveness, a settled one at its close, a
// running one at `now`. Imported rather than re-derived so the figure an operator reads and the
// figure `scheduleToClose` enforces cannot disagree — a second `updatedAt − createdAt` here would
// print eleven hours where the clock charges thirty minutes. No `stalenessMs` is passed: this is
// the RENDER's question ("how long has this been going"), and a running run is read as alive.
import { attemptElapsedMs } from "../work/loop.mjs";

// A duration an operator can read AND a script can parse: the exact millisecond count, with a
// friendlier form beside it. Never `NaN`, never `Invalid Date` — the caller has already decided
// the figure is present before this is reached.
function duration(ms) {
  const total = Math.floor(ms / 1000);
  const parts = [
    [Math.floor(total / 3600), "h"],
    [Math.floor((total % 3600) / 60), "m"],
    [total % 60, "s"],
  ].filter(([value], index) => value > 0 || index === 2);
  return `${ms}ms (${parts.map(([value, unit]) => `${value}${unit}`).join(" ")})`;
}

// THE PRESENCE RULE for the two time figures, kept apart from the arithmetic above.
const SHOWS_TIME = (run) => run?.state !== "queued";

// One run's line. Every segment is conditional on the record carrying the fact: a worker-streamed
// record holds four keys and must render as four keys, with no `undefined` standing in for the
// twelve it does not have.
function runLine(run, now) {
  const loop = run?.brief?.loop ?? null;
  const parts = [run.runId, run.state];

  if (run.failureReason != null) parts.push(run.failureReason);
  if (run.reclaimedAt != null) parts.push("reclaimed");
  if (run.resumeAfter != null) parts.push(`resumes after ${run.resumeAfter}`);

  // The loop envelope, READ. A cycle without a cap, or a cap without a cycle, is not a ratio and
  // is not printed as one.
  if (loop?.phase != null) parts.push(loop.phase);
  if (loop?.cycle != null && loop?.cap != null) parts.push(`${loop.cycle}/${loop.cap}`);
  if (loop?.level != null) parts.push(loop.level);

  if (run.attempt != null) parts.push(`attempt ${run.attempt}`);

  if (now != null && SHOWS_TIME(run)) {
    const elapsed = attemptElapsedMs({ record: run, now });
    if (elapsed != null) parts.push(`elapsed ${duration(elapsed)}`);
    // The heartbeat age answers "is it still beating", so it is shown only while the run is
    // RUNNING — a settled run's last beat is a fact about the past, not about liveness. The
    // `heartbeatAt ?? updatedAt` fallback is 20/ADR-004's, already stated once in the store.
    if (run.state === "running") {
      const livenessMs = Date.parse(run.heartbeatAt ?? run.updatedAt);
      const nowMs = Date.parse(now);
      if (Number.isFinite(livenessMs) && Number.isFinite(nowMs)) {
        parts.push(`last beat ${duration(Math.max(0, nowMs - livenessMs))}`);
      }
    }
  }

  if (run.sessionId != null) parts.push(`session ${run.sessionId}`);
  if (run.node != null) parts.push(`node ${run.node}`);
  return parts.join("  ");
}

export const runStatusCommand = {
  id: "work:run-status",
  input: {
    type: "object",
    properties: { ref: { type: "string" } },
    required: ["ref"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    const streamedRuns = (lookupRef) => readWorkerRuns(ctx.workspace, lookupRef, {
      globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {},
    });

    // Streamed lookup honours the EXECUTION SCOPE (runs are recorded at the
    // top-level item — a story's run context IS its milestone's): the ref's own
    // streamed runs, else the scope's.
    const streamedScoped = async (lookupRef) =>
      (await streamedRuns(lookupRef)) ?? (executionScopeRef(lookupRef) !== lookupRef ? await streamedRuns(executionScopeRef(lookupRef)) : null);

    // The READ tolerates the slug-fallback resolver (like work:doc / work:tasks).
    const item = await resolveItem(ctx, ref);
    if (!item) {
      // The streamed-existence rule (m42): an item the worker streams EXISTS.
      // Its runs come from the projection (own ref, else scope); no streamed
      // runs is an EMPTY history — "Could not load runs" for a listed item was
      // a lie about existence.
      const streamed = await streamedScoped(ref);
      if (streamed != null) return { ref, runs: streamed.runs, fromWorker: true, answeredFrom: "cache", reportedBy: streamed.reportedBy };
      const row = await readStreamedItemRow(ctx.workspace, ref, { globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {} });
      if (row != null) return { ref, runs: [], fromWorker: true, answeredFrom: "cache" };
      throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
    }

    // m43 / story 06 (ADR-010/R6.4) — THE REACH-THROUGH. A cache-answered row for a ref with
    // no local folder has no `runs/` dir to read, and `readRuns` would join onto a null
    // `dir`. The cache's own run records ARE the answer here; when it holds none, the empty
    // history is marked rather than returned bare, so an operator never reads "no runs" and
    // takes it for a statement about the item rather than about this checkout.
    if (item.dir == null) {
      const streamed = await streamedScoped(item.ref);
      if (streamed != null) return { ref: item.ref, runs: streamed.runs, fromWorker: true, answeredFrom: "cache", reportedBy: streamed.reportedBy };
      return { ref: item.ref, runs: [], fromWorker: true, answeredFrom: "cache", reportedBy: item.reportedBy ?? null };
    }

    // readRuns is absence-tolerant: an item with no runs/ dir → an empty array —
    // in which case the worker's streamed records (an item running remotely RIGHT
    // NOW) are the truthful answer, not an empty local dir.
    const runs = await readRuns(item);
    if (runs.length === 0) {
      const streamed = await streamedScoped(item.ref);
      if (streamed != null) return { ref: item.ref, runs: streamed.runs, fromWorker: true, answeredFrom: "cache", reportedBy: streamed.reportedBy };
    }
    return { ref: item.ref, runs, answeredFrom: item.answeredFrom ?? "disk" };
  },

  cli: {
    // m42 wave (d) leg d1 (wave 2) — routed through the registry-derived table +
    // the ONE generic face; the cli.mjs face copy is deleted.
    route: ["work", "run-status"],
    spec: {
      usage: "aof work run-status <ref> [--json]",
      flags: {},
    },

    // `aof work run-status <ref>` — one positional maps onto the input.
    argv: (positionals) => ({ ref: positionals[0] }),

    // THE RENDER NAMES THE RECORD (126/01, ADR-003 §1-§2). It printed `runId` and `state` — two of
    // the record's sixteen keys, and none of the eight the loop envelope carries — so "is this
    // thing alive?" was answered by opening a JSON file. Every fact below is READ off what the
    // result already holds (68/ADR-002: a phase is read, never minted); no key is added to the
    // document, which stays frozen (task 02).
    //
    // TWO RULES, KEPT APART. ARITHMETIC: a figure's value is exactly what the engine's per-attempt
    // term returns for that record and that `now` — imported from `src/work/loop.mjs`, never
    // written a second time here, so what an operator reads and what the deadline enforces cannot
    // disagree. PRESENCE: a figure is shown only when the record carries what it is derived from.
    // A `queued` run shows neither: no verb mints one, and a state that never ran makes no claim
    // about running time. That the clock still CHARGES a queued attempt is the clock's business.
    //
    // `now` arrives on the `faceCtx` the face hands every render. Absent — a caller that passes
    // none — the two time figures are simply absent; the line is still a line.
    render(result, faceCtx = {}) {
      if (result.runs.length === 0) {
        return `${result.ref} — no runs.`;
      }
      const now = faceCtx?.now;
      const lines = result.runs.map((run) => `  ${runLine(run, now)}`);
      // `fromWorker` marks the RUNS as the projection's mirror — TECH_DEBT item 19 measured a
      // cached row that read `running` for two days after the run finished, so a mirrored history
      // says so rather than passing as a live local fact. `answeredFrom` is deliberately NOT the
      // marker: `:71` hardcodes `cache` for a disk-resolved item whose runs were streamed.
      const mirror = result.fromWorker === true
        ? ` (worker mirror${result.reportedBy == null ? "" : `, reported by ${result.reportedBy}`})`
        : "";
      return `${result.ref} — ${result.runs.length} run(s)${mirror}:\n${lines.join("\n")}`;
    },

    // No path in the result (records carry refs) — passes through unchanged.
    json: (result) => result,
  },
};
