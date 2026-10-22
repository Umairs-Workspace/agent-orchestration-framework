// Type declarations for poll-cadence.mjs (167/ADR-004) — the one cadence every UI poll runs through.

/** The cap an unchanged poll backs off to, in milliseconds (167/02 Q1). */
export const POLL_BACKOFF_CAP_MS: number;

export type PollVisibility = {
  hidden(): boolean;
  subscribe(listener: () => void): () => void;
};

export type Poll = {
  start(): void;
  stop(): void;
  poke(): void;
  pin(): void;
  unpin(): void;
  nextDelay(): number;
};

export function documentVisibility(doc?: { visibilityState?: string; addEventListener?: Function; removeEventListener?: Function } | null): PollVisibility;

/** Create, start and hold a poll; the result is the effect's cleanup. */
export function armPoll(options: Parameters<typeof createPoll>[0], holder?: { current: Poll | null } | null): () => void;

/** `run` resolves `false` for an unchanged answer; anything else is a change. */
export function createPoll(options: {
  baseMs: number;
  capMs?: number;
  run: () => Promise<boolean | void> | boolean | void;
  visibility?: PollVisibility;
}): Poll;
