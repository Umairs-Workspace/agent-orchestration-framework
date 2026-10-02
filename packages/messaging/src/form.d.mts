// Types for src/notify/form.mjs — the one shape of an ask, shared by every face (131/ADR-006 §1).

type NotifyEvent =
  | "session-needs-input"
  | "session-answered"
  | "session-parked-unanswered"
  | "loop-halted"
  | "loop-died"
  | "loop-relaunched"
  | "milestone-accepted";

// The fields of a notify envelope the formatter reads (`buildNotifyEnvelope`, src/notify/notify.mjs).
interface NotifyEnvelopeFields {
  event: NotifyEvent | string;
  ref: string;
  phase?: string | null;
  elapsedMs?: number | null;
  question?: string | null;
  stop?: { id?: unknown; producer?: unknown; remedy?: unknown; ref?: unknown } | null;
  outcome?: { by?: unknown; answer?: unknown; askedAt?: unknown; parkedAt?: unknown; cause?: unknown; title?: unknown } | null;
}

export declare function formatElapsed(ms: unknown): string | null;
export declare function oneLineAsk(text: unknown): string | null;
export declare function eventPhrase(envelope: NotifyEnvelopeFields | null | undefined): string | null;
export declare function headline(envelope: NotifyEnvelopeFields | null | undefined): string | null;
export declare function cost(envelope: NotifyEnvelopeFields | null | undefined): string | null;
export declare function accountLine(envelope: NotifyEnvelopeFields | null | undefined): string | null;
