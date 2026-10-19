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

// 162/ADR-003 §2 — the loop line, its entry type and the rung memory moved to the shared
// `apps/ui/src/components/loop-line.mjs`; re-exported here for the fleet's readers.
import type { FleetLoopLine, RememberedStopRung, StopRungMemory } from "../components/loop-line.mjs";
export type { FleetLoopLine, RememberedStopRung, StopRungMemory } from "../components/loop-line.mjs";
export { fleetLoopLines } from "../components/loop-line.mjs";

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
