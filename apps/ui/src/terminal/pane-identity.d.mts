// Type declarations for the ONE terminal control's per-pane identity (milestone 46 / story 03
// — ADR-002; m38/ADR-014 invariant 4's V1 and V8). Framework-free by contract.

import type { SessionSource } from "./source-table.mjs";

export declare const NOT_RENDERED: {
  readonly UNADDRESSED: "unaddressed";
  readonly NO_OWNER: "no-owner";
  readonly NO_SOURCE: "no-source";
};

export declare function terminalPaneKey(
  source: Partial<SessionSource> | null | undefined,
  params: Record<string, unknown> | null | undefined,
): string | null;

export interface TerminalPaneNotRendered {
  readonly rendered: false;
  readonly reason: string;
  readonly key: null;
  readonly ref: null;
  readonly label: null;
}

export interface TerminalPaneIdentity {
  readonly rendered: true;
  readonly reason: null;
  readonly key: string;
  readonly ref: string;
  readonly farEnd: string | null;
  readonly label: string;
  readonly address: readonly (readonly [string, unknown])[];
}

export declare function terminalPaneIdentity(input?: {
  source?: Partial<SessionSource> | null;
  params?: Record<string, unknown> | null;
  ref?: unknown;
  farEnd?: unknown;
}): TerminalPaneIdentity | TerminalPaneNotRendered;

// THE ACCESSIBLE NAME (DESIGN §Accessibility 4). `siblings` is m49/05's: on a surface holding N
// panes the identity alone is not unique — two sessions of one work item on one node read the
// same — so the session tail joins the name there and nowhere else.
export declare function terminalPaneLabel(input?: {
  posture?: string | null;
  identity?: { rendered?: boolean; label?: string | null } | null;
  ref?: string | null;
  detail?: string | null;
  siblings?: boolean;
}): string;
