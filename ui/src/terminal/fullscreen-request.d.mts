// Type declarations for the ONE terminal control's fullscreen request (milestone 46 / story 05
// / task 02 — ADR-009). Framework-free at runtime; the types below are erased.

import type { SessionSource } from "./source-table.mjs";

export declare const FULLSCREEN_EXIT_ANCHOR: string;

// WHERE FOCUS LANDS ON PRESENT (m49/ADR-007 (C); DESIGN §S3 delta 2) — a closed pair, derived
// from `inputEnabled` beside `claimsEscape` so the two cannot disagree.
export declare const FOCUS_PRESENTS_TERMINAL: "terminal";
export declare const FOCUS_PRESENTS_EXIT: "exit-control";
export type FullscreenFocusTarget = "terminal" | "exit-control";

// The element carrying the PRESENTING affordance's form: the icon control's button, or the host's
// own pane region when it declares `FORM_PANE_ACTIVATION`.
export declare function fullscreenOpenerFor<TControl = unknown, TPane = unknown>(
  form: string | null | undefined,
  elements?: { control?: TControl | null; pane?: TPane | null },
): TControl | TPane | null;

// The node/home/opener are PASSED THROUGH, never touched: this module reads no browser global,
// which is what keeps it loadable by plain node (ADR-001). They are therefore generic rather than
// typed as DOM — the caller's own types flow through to the shell's `FullscreenRequest`, and this
// declaration stays free of DOM vocabulary. `unknown` by default, so a headless test needs nothing.
export interface TerminalFullscreenRequest<TNode = unknown, THome = unknown, TOpener = unknown> {
  readonly id: string;
  readonly label: string;
  readonly node: TNode;
  readonly home: THome;
  readonly opener: TOpener;
  // EXACTLY `source.canInput && !mount.readOnly`, never one flag.
  readonly claimsEscape: boolean;
  // Derived from the same one fact, right beside it.
  readonly focusOnPresent: FullscreenFocusTarget;
  // This control paints its own fullscreen header (DESIGN §S3), so the shell paints none.
  readonly ownsChrome: true;
  readonly onLayout: (() => void) | null;
  readonly onDismiss: (() => void) | null;
}

export interface TerminalFullscreenExits {
  readonly inputEnabled: boolean;
  readonly claimsEscape: boolean;
  readonly escapeReachesFarEnd: boolean;
  readonly escapeDismisses: boolean;
  readonly exitControl: {
    readonly visible: true;
    readonly alwaysVisible: true;
    readonly anchor: string;
    readonly onlyExit: boolean;
  };
}

export declare function terminalFullscreenId(sessionKey: unknown): string | null;

export declare function terminalFullscreenRequest<TNode = unknown, THome = unknown, TOpener = unknown>(input?: {
  source?: SessionSource | null;
  posture?: string | null;
  sessionKey?: string | null;
  label?: string | null;
  node?: TNode;
  home?: THome;
  opener?: TOpener;
  onLayout?: (() => void) | null;
  onDismiss?: (() => void) | null;
}): TerminalFullscreenRequest<TNode, THome, TOpener> | null;

export declare function terminalFullscreenExits(input?: {
  source?: SessionSource | null;
  posture?: string | null;
}): TerminalFullscreenExits;
