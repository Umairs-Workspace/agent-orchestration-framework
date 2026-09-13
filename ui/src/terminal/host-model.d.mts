// Type declarations for the ONE terminal control's HOST MODEL (milestone 46 / story 04).
// `host-model.mjs` is framework-free so `node:test` drives it headlessly; the `.tsx` consumer
// gets its types from here. House pattern, same as ui/src/app/shell-layout.d.mts.

import type { SessionSource } from "./source-table.mjs";

export type TerminalHost = "board-dock" | "fleet-card" | "fullscreen" | "grid-pane";
export declare const HOST_BOARD_DOCK: "board-dock";
export declare const HOST_FLEET_CARD: "fleet-card";
export declare const HOST_FULLSCREEN: "fullscreen";
// m49/ADR-007 — the FOURTH host: a tile on the terminals home. Name and value match, as the
// other three do; the DIRECTORY is `ui/src/home/` and is a different thing.
export declare const HOST_GRID_PANE: "grid-pane";
export declare const TERMINAL_HOSTS: readonly TerminalHost[];

export type AffordanceName =
  | "collapse"
  | "close"
  | "drag-resize"
  | "watch-hide"
  | "fullscreen"
  | "exit-fullscreen"
  | "restart"
  | "provider-picker";

export declare const AFFORDANCE_COLLAPSE: "collapse";
export declare const AFFORDANCE_CLOSE: "close";
export declare const AFFORDANCE_DRAG_RESIZE: "drag-resize";
export declare const AFFORDANCE_WATCH_HIDE: "watch-hide";
export declare const AFFORDANCE_FULLSCREEN: "fullscreen";
export declare const AFFORDANCE_EXIT_FULLSCREEN: "exit-fullscreen";
export declare const AFFORDANCE_RESTART: "restart";
export declare const AFFORDANCE_PROVIDER_PICKER: "provider-picker";
export declare const AFFORDANCES: readonly AffordanceName[];

export type AffordanceForm =
  | "chevron"
  | "worded-toggle"
  | "icon-control"
  | "separator"
  | "segmented"
  | "pane-activation";
export declare const FORM_CHEVRON: "chevron";
export declare const FORM_WORDED_TOGGLE: "worded-toggle";
export declare const FORM_ICON_CONTROL: "icon-control";
export declare const FORM_SEPARATOR: "separator";
export declare const FORM_SEGMENTED: "segmented";
// m49/ADR-007 amendment (B) — the host's own pane region activates the affordance, in addition
// to the icon control. A new VALUE in this closed vocabulary, never a new prop on the control.
export declare const FORM_PANE_ACTIVATION: "pane-activation";
export declare const AFFORDANCE_FORMS: readonly AffordanceForm[];

export type AffordanceCost = "layout" | "subscription" | "session" | "page-load";
export declare const COST_LAYOUT: "layout";
export declare const COST_SUBSCRIPTION: "subscription";
export declare const COST_SESSION: "session";
export declare const COST_PAGE_LOAD: "page-load";

export declare const WATCH_LABEL: string;
export declare const HIDE_LABEL: string;

export interface DeclaredAffordance {
  readonly declared: true;
  readonly form: AffordanceForm;
  readonly cost: AffordanceCost;
  readonly glyph?: string;
  readonly role?: string;
  readonly onLabel?: string;
  readonly offLabel?: string;
  readonly alwaysVisible?: boolean;
  // A SECOND way in, declared per host (m49/ADR-007 amendment (B)). Present only where the
  // host's own pane region activates the affordance; the icon control in `form` stays.
  readonly activation?: AffordanceForm;
}

export interface UndeclaredAffordance {
  readonly declared: false;
  readonly form: null;
  readonly cost: null;
  readonly reason: string;
}

export type AffordanceEntry = DeclaredAffordance | UndeclaredAffordance;
export type AffordanceTable = Readonly<Record<AffordanceName, AffordanceEntry>>;

export declare function hostAffordances(host: string | null | undefined): AffordanceTable;
export declare function declaresAffordance(host: string | null | undefined, name: AffordanceName): boolean;

// THE SECOND DECLARATION (m49/ADR-007 amendment (A)): what this host's byte area shows when
// NOTHING is bound. A host-layout fact, valued from the ramp's own closed `PANE_*` set plus an
// explicit "no pane", so the control reads a table instead of testing `subscribed`.
export type HostRestPane = "empty-host" | "no-pane";
export declare const REST_PANE_NONE: "no-pane";
export declare function hostRestPane(host: string | null | undefined): HostRestPane;
// THE THIRD (m49/ADR-007 (B)): does this host's own pane region activate the fullscreen
// affordance, in addition to the icon control?
export declare function hostActivatesPane(host: string | null | undefined): boolean;
// THE FOURTH (m49/DG-49-7): does this host's chip announce its own changes? A grid owns ONE
// region for N panes, so its tiles are silent; every other host keeps m46's per-pane announcement.
export declare function hostAnnouncesState(host: string | null | undefined): boolean;
// THE FIFTH (m49/DESIGN §S2): header rows — 1 everywhere m46 shipped, 2 on a grid tile.
export declare function hostHeaderRows(host: string | null | undefined): number;
// THE SIXTH: the byte box's shape. A tile is the mirror's own aspect; the card keeps its 192px.
export type HostPaneBox = "fill" | "fixed" | "aspect";
export declare const PANE_BOX_FILL: "fill";
export declare const PANE_BOX_FIXED: "fixed";
export declare const PANE_BOX_ASPECT: "aspect";
export declare function hostPaneBox(host: string | null | undefined): HostPaneBox;

// WHAT A SURFACE THAT ARBITRATES N PANES DECIDES FOR ONE OF THEM (m49/05). Absent — every host
// m46 shipped — and the control decides for itself exactly as it always did.
export interface TerminalPaneStandingInput {
  readonly subscribed?: boolean;
  readonly watchOffered?: boolean;
  readonly tabStop?: boolean;
  /** May this pane be PRESENTED at all? Withholding the door withholds the keyboard (DG-49-5). */
  readonly presents?: boolean;
  readonly mark?: string | null;
  readonly field?: string | null;
  readonly note?: string | null;
  readonly onWatch?: ((next: boolean) => void) | null;
  /** What the pane reports UP — a byte landed, its transport word, that it took focus. Facts. */
  readonly onReport?: ((event: { painted?: boolean; state?: string | null; focused?: boolean }) => void) | null;
}
export interface TerminalPaneStanding {
  readonly subscribed: boolean;
  readonly offersToggle: boolean;
  readonly activatesPane: boolean;
  readonly presents: boolean;
  readonly tabIndex: number | undefined;
  readonly restPane: HostRestPane;
  readonly paneBox: HostPaneBox;
  readonly mark: string | null;
  readonly field: string | null;
  readonly note: string | null;
}
export declare function terminalPaneStanding(
  host: string | null | undefined,
  standing: TerminalPaneStandingInput | null | undefined,
  ownSubscribed: boolean,
  /** Does anything BIND? R-1: no binding ⇒ no subscription to release ⇒ no toggle. */
  bound?: boolean,
): TerminalPaneStanding;
export declare function activatesPaneOnKey(key: string | null | undefined): boolean;
// Takes a host NAME or a TABLE. The table form is what makes the detector drivable to a
// violation rather than only to silence — a rule that can never be shown to fire is a rule an
// unconditional `return []` satisfies.
export declare function affordanceFormViolations(
  hostOrTable: string | AffordanceTable | Record<string, AffordanceEntry> | null | undefined,
): string[];

export interface TerminalControlState {
  readonly source: SessionSource | null;
  readonly params: Readonly<Record<string, string | null>>;
  readonly posture: string | null;
  readonly runToken: number;
  readonly subscribed: boolean;
  readonly collapsed: boolean;
  readonly expanded: boolean;
  readonly boxHeight: number | null;
  readonly hostRevision: number;
  readonly painted: boolean;
  readonly pageAlive: boolean;
}

export declare function terminalControlState(input?: Partial<TerminalControlState>): TerminalControlState;
export declare const SESSION_IDENTITY_FIELDS: readonly string[];
export declare const NON_IDENTITY_FIELDS: readonly string[];
export declare function terminalSessionIdentity(state: Partial<TerminalControlState> | null | undefined): string | null;

export declare const HOST_CHANGES: {
  readonly COLLAPSE: "collapse";
  readonly EXPAND: "expand";
  readonly RESIZE: "resize";
  readonly HOST_RERENDER: "host-rerender";
  readonly PRESENT_FULLSCREEN: "present-fullscreen";
  readonly DISMISS_FULLSCREEN: "dismiss-fullscreen";
  readonly HIDE: "hide";
  readonly WATCH: "watch";
  readonly CLOSE: "close";
  readonly REBIND: "rebind";
  readonly RESTART: "restart";
  readonly SELECT_PROVIDER: "select-provider";
  readonly SET_POSTURE: "set-posture";
  readonly NAVIGATE: "navigate";
};

export type HostChange =
  | string
  | {
      readonly kind: string;
      readonly boxHeight?: number;
      readonly source?: SessionSource | null;
      readonly params?: Record<string, string | null>;
      readonly provider?: string | null;
      readonly posture?: string | null;
    };

export declare const CHANGE_CATALOGUE: Readonly<Record<string, { readonly cost: AffordanceCost; readonly why: string }>>;
export declare function applyHostChange(
  state: Partial<TerminalControlState> | null | undefined,
  change: HostChange,
): TerminalControlState;

// The TIE between an affordance and the change it dispatches — one row, one form, one cost, one
// transition. `engaged` is the toggle's current side.
export declare const AFFORDANCE_CHANGE: Readonly<Record<string, { readonly engaged: string; readonly idle: string }>>;
export declare function changeForAffordance(name: string, engaged?: boolean): string | null;

export declare const SESSION_SURVIVES: "survives";
export declare const SESSION_TEARS_DOWN: "tears-down";
export declare const SESSION_NONE: "none";
export declare const SCROLLBACK_INTACT: "intact";
export declare const SCROLLBACK_EMPTY: "empty";
export declare const SCROLLBACK_GONE: "gone";

export interface SessionOutcome {
  readonly verdict: "survives" | "tears-down" | "none";
  readonly scrollback: "intact" | "empty" | "gone";
  readonly continuous: boolean;
}

export declare function sessionOutcome(
  before: Partial<TerminalControlState> | null | undefined,
  after: Partial<TerminalControlState> | null | undefined,
): SessionOutcome;

export declare function changeOutcome(
  state: Partial<TerminalControlState> | null | undefined,
  change: HostChange,
): SessionOutcome & {
  readonly cost: AffordanceCost | null;
  readonly why: string | null;
  readonly identityBefore: string | null;
  readonly identityAfter: string | null;
};

export declare const HOST_LAYOUT_FLAGS: readonly string[];
export declare function isRampState(word: string, rampWords: readonly string[]): boolean;
