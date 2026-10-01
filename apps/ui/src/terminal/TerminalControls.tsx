// C1's CONTROL CLUSTER — the `ml-auto` run of affordances at the right of the header
// (milestone 46; DESIGN §S1/§S2's C1).
//
// EVERY CONTROL'S FORM COMES FROM THE HOST'S TABLE AND ITS EFFECT FROM THE CHANGE THAT TABLE
// PAIRS WITH IT. `affordanceFormViolations` then polices the pair — a chevron that unsubscribes,
// a worded toggle that merely collapses, or a control whose declared cost disagrees with the
// transition it dispatches — rather than two frozen literals validating each other. So this
// component decides NOTHING about which controls exist: it asks `declaresAffordance` per host and
// dispatches the named change. A control added here without a declaration renders for nobody.
//
// EXTRACTED at the 2026-08-09 design-conformance pass, the second time `acd-ui-surface-file-budget`
// fired on `TerminalControl.tsx` in one evening (853 vs its 840 ceiling). The ceiling was not
// raised either time — this milestone's precedent is that the author who trips the ratchet
// extracts, and ADR-014/E3 bars deleting explanation to fit under a number.
//
// `shrink-0` ON EVERY CONTROL IS LOAD-BEARING and lives in `CONTROL_CLASS`, one home, because the
// fullscreen occupant renders its exit as a direct child of a `flex-nowrap` header where this
// wrapper's own `shrink-0` does not reach — and it shipped at 17x28 that way.
import type * as React from "react";
import { X, ChevronDown, ChevronUp, RotateCw, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AFFORDANCE_CLOSE,
  AFFORDANCE_COLLAPSE,
  AFFORDANCE_FULLSCREEN,
  AFFORDANCE_RESTART,
  AFFORDANCE_WATCH_HIDE,
  declaresAffordance,
} from "./host-model.mjs";
import type { AffordanceEntry, TerminalHost } from "./host-model.mjs";
import { TERMINAL_HOVER_BG_CLASS } from "./palette.mjs";

export function TerminalControls({
  host,
  controlClassName,
  offersRestart,
  offersFullscreen,
  offersToggle = true,
  onExpand,
  openerRef,
  collapsed,
  subscribed,
  toggle,
  act,
  onWatchHide,
  onClose,
}: {
  host: TerminalHost;
  controlClassName: string;
  // Restart is `ended`/`error` AND a session this host can actually re-spawn — derived upstream,
  // never re-derived here (offering it on a worker mirror is a button promising what it cannot do).
  offersRestart: boolean;
  offersFullscreen: boolean;
  // A CONTROL THAT CANNOT DO ITS JOB IS NOT OFFERED (DG-49-4): at the live-socket cap there is no
  // slot to promote a held pane into, so the worded toggle is ABSENT and the line above it names
  // the exact recovery. Absent, never disabled — a disabled control still says "this surface can
  // do this", which is m46's open question 7 answered where it can be honoured exactly. Defaults
  // to TRUE, so every host that ships today is unchanged.
  offersToggle?: boolean;
  // The expand control's own press, so the control can record WHICH FORM opened the presentation
  // (ADR-007 (C)). The affordance it dispatches is unchanged and is still the table's.
  onExpand?: () => void;
  openerRef: React.RefObject<HTMLButtonElement | null>;
  collapsed: boolean;
  subscribed: boolean;
  // The host table's OWN entry, not a re-typed copy of it — a second shape here would be a
  // second home for the affordance contract, which is what `affordanceFormViolations` polices.
  toggle: AffordanceEntry;
  act: (affordance: string, current?: boolean) => void;
  // Watch/Hide is the one control with an effect BEYOND its change — it resets the ramp — so the
  // caller owns that half rather than this component reaching for the session's state.
  onWatchHide: () => void;
  onClose: (() => void) | undefined;
}): React.ReactElement {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1">
      {offersRestart ? (
        <button type="button" onClick={() => act(AFFORDANCE_RESTART)} aria-label="Restart session" title="restart" className={controlClassName}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
      {offersFullscreen ? (
        <button
          ref={openerRef}
          type="button"
          onClick={() => (onExpand ? onExpand() : act(AFFORDANCE_FULLSCREEN))}
          aria-label="Expand terminal to full screen"
          title="expand to full screen"
          className={controlClassName}
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
      {declaresAffordance(host, AFFORDANCE_COLLAPSE) ? (
        <button
          type="button"
          onClick={() => act(AFFORDANCE_COLLAPSE, collapsed)}
          aria-label={collapsed ? "Expand terminal dock" : "Collapse terminal dock"}
          title={collapsed ? "expand" : "collapse"}
          className={controlClassName}
        >
          {collapsed ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      ) : null}
      {declaresAffordance(host, AFFORDANCE_WATCH_HIDE) && toggle.declared && offersToggle ? (
        <button
          type="button"
          onClick={onWatchHide}
          className={cn("shrink-0 rounded px-2 py-1 text-[11px] whitespace-nowrap text-zinc-400 transition", TERMINAL_HOVER_BG_CLASS)}
        >
          {subscribed ? toggle.onLabel : toggle.offLabel}
        </button>
      ) : null}
      {declaresAffordance(host, AFFORDANCE_CLOSE) ? (
        <button type="button" onClick={onClose} aria-label="Close terminal dock" title="close" className={controlClassName}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
