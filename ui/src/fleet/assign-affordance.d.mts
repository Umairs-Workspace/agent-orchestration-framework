// Type declarations for assign-affordance.mjs (the pure assign-affordance state
// machine; milestone 38 / story 04 / task 06 — DESIGN §Surface 2 A7/A8/A9/A10 and
// the affordance States table, amended 2026-07-24 for F22).
import type { WorkAssignment } from "./api";

export declare const POLL_MS: number;
export declare const ASSIGN_SENT_HOLD_MS: number;
// DG-14 clause 1 — 2 × POLL_MS, derived (never a second literal).
export declare const ASSIGN_TIMEOUT_MS: number;

export declare const ASSIGN_PHASE_REST: "rest";
export declare const ASSIGN_PHASE_SENDING: "sending";
export declare const ASSIGN_PHASE_SENT: "sent";
export declare const ASSIGN_PHASE_REFUSED: "refused";

export declare const ASSIGN_LABEL_REST: "Assign →";
export declare const ASSIGN_LABEL_SENDING: "Assigning…";
export declare const ASSIGN_LABEL_SENT: "Sent";

// DG-13 — the row's binding geometry (A10 amended 2026-07-24).
export declare const ASSIGN_ACTION_LABELS: readonly string[];
export declare const ASSIGN_ACTION_WIDTH_CH: number;
export declare const ASSIGN_PICKER_FLOOR_CH: number;
export declare const ASSIGN_PICKER_CHROME: string;

// DG-14 clause 3 — the timed-out copy, and the honest long form for the `title`.
export declare const ASSIGN_MESSAGE_TIMED_OUT: "no answer — timed out";
export declare const ASSIGN_DETAIL_TIMED_OUT: string;

// DG-13 clause 4 — outcome > holder > all else, keyed by the verb's own code.
export declare const ASSIGN_REFUSAL_COPY: Readonly<Record<string, string>>;

// milestone 130 / story 03 — the loop line's Stop: the same slot, classes and shaping, its own
// words (DESIGN §Surface 1 "Refused"; the two verb codes whose sentence leads with a fact the
// line already shows, and the deadline pair that says the outcome is unknown, never negative).
export declare const LOOP_STOP_REFUSAL_COPY: Readonly<Record<string, string>>;
export declare const LOOP_STOP_MESSAGE_TIMED_OUT: "timed out";
export declare const LOOP_STOP_DETAIL_TIMED_OUT: string;
export declare const LOOP_STOP_TIMED_OUT: Readonly<{ message: string; detail: string }>;
// DG-17 — the message slot's character budget and the copy LADDER that keeps the
// holder atomic (renders whole, or is omitted; never CSS-truncated mid-id).
export declare const ASSIGN_MESSAGE_BUDGET_CH: number;
export declare const ASSIGN_REFUSAL_SHORT_OUTCOME: string;
export declare function assignRefusalLadder(outcome: string, holder: string | null, budgetCh?: number): string;
// DG-20 — region 5's workspace-name budget: the name renders beside a chip only
// when it FITS in full, and is dropped whole otherwise.
export declare const REGION5_NAME_BUDGET_CH: number;
// m47/04 (ADR-008, DG-47-2) — the ONE decision that reads that budget: dropped when
// the view is REPO-FILTERED, or when the fit budget says so. An extension of the
// existing gate, never a second gate, and the filtered half is UNCONDITIONAL.
export declare function region5NameDropped(input: {
  assignment?: unknown;
  workspaceName?: string | null;
  repoFiltered?: boolean;
}): boolean;
// DG-19 — the chip slot's budget: when `→ <target> · <when> · <note>` exceeds it
// the TAIL is dropped whole rather than ellipsised, so nothing partial renders.
// ADR-014 — both are now the FORMULA's two-child outputs rather than literals,
// and both moved DOWN (41 → 12, 31 → 12). They keep their names and their role
// as the suite's read-back handles.
export declare const REGION5_CHIP_SLOT_BUDGET_CH: number;
export declare const REGION5_DRILLIN_ABBREV_AT_CH: number;

// ADR-014 — the row's MEASURED px facts (headless Chromium against the shipped
// stylesheet, 2026-08-12), from which every threshold above is derived. The
// re-measurement instrument is a RENDER, not this suite.
export declare const REGION5_ROW_FLOOR_PX: number;
export declare const REGION5_MONO_ADVANCE_PX: number;
export declare const REGION5_PILL_PX: number;
export declare const REGION5_CHIP_GAP_PX: number;
export declare const REGION5_CLUSTER_GAP_PX: number;
export declare const REGION5_DRILLIN_WORDS_PX: number;
export declare const REGION5_DRILLIN_GLYPH_PX: number;
export declare const REGION5_SECONDARY_WORDS_PX: number;
export declare const REGION5_SECONDARY_MARK_PX: number;

// ADR-014 clause 4 — EVERY decision region 5's row takes, in one shape, because
// two independent booleans cannot express one ladder (rung 2's outcome changes
// rung 4's budget). `null` budgets mean there is no chip on the row, so no rung
// is under pressure and there is no target to budget.
export type Region5Row = {
  // The cluster's own children: chip + (secondary token) + drill-in.
  children: number;
  target: string | null;
  // The chip `title`'s tail — DG-47-7 retired the ELEMENT, so this string has
  // exactly one carrier and no rendering decision attached to it.
  tailText: string;
  drillInWords: boolean;
  secondaryAbbreviated: boolean;
  slotBudgetCh: number | null;
  targetBudgetCh: number | null;
};

export declare function region5RowLadder(row: {
  assignment?: WorkAssignment | null;
  // "a secondary attention TOKEN renders" — never the `·` placeholder, which is
  // what stands in for an absent one.
  secondary?: boolean;
}): Region5Row;

export type AssignPhase = "rest" | "sending" | "sent" | "refused";

// A coded refusal envelope as the api client throws it: the verb's own
// `{ ok:false, code, holder }` surfaced onto the Error (src/mesh/ui-serve.mjs
// forwards the verb's extra fields verbatim; ui/src/fleet/api.ts carries them).
export type AssignRefusalCause = {
  message?: string;
  code?: string;
  holder?: string;
  target?: string;
};

export type AssignAffordanceState = {
  phase: AssignPhase;
  error: string | null;
  // The FULL server text behind a shaped `error` — what the message slot puts
  // in its native `title` (DG-13 clause 3).
  detail: string | null;
};

export type AssignAffordanceView = {
  phase: AssignPhase;
  pickerDisabled: boolean;
  pickerPlaceholder: string | null;
  actionLabel: string;
  actionDisabled: boolean;
  actionTone: "primary" | "muted";
  // Phase-INDEPENDENT geometry (DG-13 clauses 1 + 2).
  actionWidth: string;
  pickerMinWidth: string;
  message: string | null;
  messageTitle: string | null;
  messageTone: "destructive" | null;
  holdMs: number | null;
};

export declare function assignAtRest(): AssignAffordanceState;
export declare function assignBegin(): AssignAffordanceState;
export declare function assignSucceeded(): AssignAffordanceState;
export declare function assignRefused(cause: AssignRefusalCause | string | null | undefined, copy?: Readonly<Record<string, string>>): AssignAffordanceState;
export declare function assignTimedOut(timedOut?: Readonly<{ message: string; detail: string }>): AssignAffordanceState;
export declare function assignAckExpired(state: AssignAffordanceState | null | undefined): AssignAffordanceState;

export declare function assignAffordanceView(ctx: {
  phase?: AssignPhase;
  error?: string | null;
  detail?: string | null;
  hasOptions?: boolean;
  selected?: string;
}): AssignAffordanceView;

// The lifecycle command the worker runs (VERIFICATION 2026-07-25) — OPTIONAL, defaults
// to refine on the route when absent.
export type AssignLifecyclePhase = "refine" | "continue" | "verify";

// Generic over the record the call answers (`WorkAssignment` for assign, the loop-stop
// document for the loop line's Stop) — milestone 130 / story 03 rides the same orchestrator
// with its own `refusalCopy` and `timedOut` words.
export declare function runAssign<Answer = WorkAssignment>(
  deps: {
    assign: (ref: string, nodeId: string, workspaceId: string, phase?: string) => Promise<Answer>;
    onAssigned?: (() => void) | null;
    onState?: ((next: AssignAffordanceState) => void) | null;
    timeoutMs?: number;
    refusalCopy?: Readonly<Record<string, string>>;
    timedOut?: Readonly<{ message: string; detail: string }>;
  },
  request: { ref?: string; nodeId?: string; workspaceId?: string; phase?: AssignLifecyclePhase }
): Promise<
  | { ok: true; record: Answer }
  | { ok: false; error: unknown; timedOut?: undefined }
  | { ok: false; timedOut: true; error?: undefined }
>;
