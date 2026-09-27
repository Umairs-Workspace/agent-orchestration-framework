// Type declarations for runs.mjs (the pure session/run current-work-line
// projection; milestone 38 / story 00 / task 04; ARCHITECTURE ADR-004 / DESIGN
// §Surface 1). Review fix F1: this helper does NOT perform run→workspace
// attribution (the wire's `activeRuns` is a bare `string[]` of run ids, 23/ADR-002
// — it carries no workspace id). The ADR-004 "run subsumes a same-workspace
// session" rule is applied UPSTREAM, in assembleCurrentPresenceRecord
// (src/mesh/launcher.mjs), which loops per-workspace and therefore knows the
// attribution; `sessions[]` reaching this helper is ALREADY pre-subsumed.
import type { PresenceLoop, PresenceRecord } from "./api";

// The run-state ramp's two tokens this row reuses (never a fleet-local vocabulary):
// active work = primary, quiet = muted (colour+label always travel together).
export type CurrentWorkToken = "primary" | "muted";

// The node's overall liveness projected from { activeRuns, sessions }.
export type CurrentWorkState = "working" | "idle";

export type CurrentWorkLines = {
  // The exact rendered text set, in order: the aggregate `running N runs` line
  // first (when activeRuns is non-empty, N = activeRuns.length), then (if any
  // unsubsumed live session remains) ONE trailing `working ·
  // <repo>[ ×<count>][, <repo>[ ×<count>]…] (session)` fallback line naming every
  // DISTINCT surviving repo ONCE, in ascending plain-codepoint order, with the
  // count wherever a repo holds more than one live session (milestone 49 / story 01
  // — DESIGN §The `(session)` line, ARCHITECTURE ADR-010; before m49 a repo was
  // named once per session, so two sessions in `demo` read `demo, demo`); or the
  // single `idle` line when neither exists.
  lines: string[];
  token: CurrentWorkToken;
  state: CurrentWorkState;
};

// fleetCurrentWorkLines(presence) — the ONE pure projection both the desktop (36)
// and web (25) views call over a presence record's { activeRuns, sessions }.
export declare function fleetCurrentWorkLines(
  presence: Partial<PresenceRecord> | null | undefined
): CurrentWorkLines;

// ── milestone 130 / story 03 (ADR-005 §5; DESIGN §Surface 1) — the loop line and its Stop ──

// One rendered loop line: the DESIGN's anatomy in `line`, the whole value plus the `L<n>` /
// `supervised` tail (and, composed by `nodeWorkRegion`, the remote reason) in `title`, and the
// facts the button needs beside it. `stop` is the word the line shows — the wire's, raised to
// the held one for the same drive when a memory is handed in.
export type FleetLoopLine = {
  key: string;
  line: string;
  title: string;
  loopRunId: string;
  scope: string;
  workspaceId: string | null;
  runId: string | null;
  stop: null | "drain" | "cancel";
};

// The rung a click REQUESTS: 1 = drain (`Stop`), 2 = cancel (`Stop now`). Rung 3 — nothing
// left to ask — renders no button.
export type LoopStopButton = {
  rung: 1 | 2;
  label: "Stop" | "Stop now";
  title: string;
  tone: "muted" | "destructive";
};

export type LoopStopAffordance = {
  button: LoopStopButton | null;
  remote: boolean;
};

// The card's rung memory: per `loopRunId`, the rung reached AGAINST the drive it was reached
// on — a memory from another drive is absent, and nothing here expires on a timer.
export type RememberedStopRung = { rung: number; runId: string | null };
export type StopRungMemory = Map<string, RememberedStopRung>;

export declare function fleetLoopLines(
  presence: Partial<PresenceRecord> | { loops?: unknown } | null | undefined,
  memory?: StopRungMemory | null
): FleetLoopLine[];

export declare function loopStopAffordance(input: {
  loop: Pick<PresenceLoop, "stop" | "scope"> & { runId?: string | null } | FleetLoopLine | null | undefined;
  node: { nodeId?: string | null } | null | undefined;
  localNodeId: string | null | undefined;
  remembered?: RememberedStopRung | null;
}): LoopStopAffordance;

export declare function rememberStopRung(
  memory: StopRungMemory | null | undefined,
  loopRunId: string,
  rung: number,
  runId: string | null
): StopRungMemory;
