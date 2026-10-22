// Type declarations for loop-line.mjs (162/ADR-003 §2) — the one loop line both the fleet node
// card and the terminals home render. Framework-free by contract.

/** One loop entry as a node publishes it — read structurally, so either surface's type fits. */
export type LoopLineEntry = {
  loopRunId?: string | null;
  workspaceId?: string | null;
  scope?: string | null;
  level?: string | null;
  cap?: number | null;
  phase?: string | null;
  cycle?: number | null;
  ref?: string | null;
  runId?: string | null;
  supervised?: boolean;
  stop?: string | null;
  sessionId?: string | null;
  driveStartedAt?: string | null;
  lastActivityAt?: string | null;
};

// One rendered loop line: the DESIGN's anatomy in `line`, the whole value plus the `L<n>` /
// `supervised` tail (and, composed by `nodeWorkRegion`, the remote reason) in `title`, and the
// facts the button needs beside it. `stop` is the word the line shows — the wire's, raised to
// the held one for the same drive when a memory is handed in. `progress` is the drive's
// elapsed-and-activity segment, and `quiet` says it is in the warning tone.
export type FleetLoopLine = {
  key: string;
  line: string;
  title: string;
  loopRunId: string;
  scope: string;
  workspaceId: string | null;
  runId: string | null;
  stop: null | "drain" | "cancel";
  sessionId: string | null;
  head: string;
  progress: string | null;
  quiet: boolean;
};

// The card's rung memory: per `loopRunId`, the rung reached AGAINST the drive it was reached
// on — a memory from another drive is absent, and nothing here expires on a timer.
export type RememberedStopRung = { rung: number; runId: string | null };
export type StopRungMemory = Map<string, RememberedStopRung>;

/** Ten minutes without a heartbeat is quiet — the one threshold. */
export declare const LOOP_QUIET_AFTER_MS: number;

/** The warning tone a quiet progress segment renders in. */
export declare const LOOP_QUIET_CLASS: string;

export declare function stopWord(value: unknown): null | "drain" | "cancel";

export declare function loopStopRung(
  loop: { stop?: string | null; runId?: string | null } | null | undefined,
  remembered?: RememberedStopRung | null,
): number;

/** `5 s`, `14 min`, `1 h 05 min`. */
export declare function formatLoopDuration(ms: number): string;

export declare function loopProgress(
  loop: LoopLineEntry | null | undefined,
  now?: number,
): { text: string; quiet: boolean } | null;

export declare function fleetLoopLines(
  presence: { loops?: unknown } | null | undefined,
  memory?: StopRungMemory | null,
  now?: number,
): FleetLoopLine[];
