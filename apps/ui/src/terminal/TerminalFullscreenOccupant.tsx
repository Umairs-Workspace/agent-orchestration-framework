// S3 — THE FULLSCREEN OCCUPANT (milestone 46 / story 05 / task 02; ADR-009, DESIGN §S3).
//
// "Fullscreen is a bigger BOX, not a different look." This renders the same identity fragment and
// the same byte area as the inline pane, into the node the SHELL adopts — and it carries no
// positioning, no stacking rung and no `fixed inset-0` of its own. Those are the shell's: the
// occupant sits on the ladder's `fullscreen` rung inside the shell's one overlay, and a
// per-surface full-viewport layer is ADR-005's named prohibition, held by
// `test/arch/acd-no-per-surface-fixed-overlay.test.mjs`.
//
// WHY IT IS A PORTAL INTO AN IMPERATIVE NODE. The shell ADOPTS a live DOM element — it
// `appendChild`s it into the overlay's childless host and returns THE SAME element to `home` on
// dismiss — so the element must be one React does not own the POSITION of. React reconciles by
// position among a parent's children and removes a child by asking the parent it believes owns
// it, which throws once the shell has re-parented it. So the control creates the node; React owns
// only what is inside it. That is the same division the xterm pane already lives by one level
// down, and it is what makes ONE xterm / ONE socket / ONE PTY survive both transitions: presenting
// moves DOM and touches no session.
//
// `role="dialog"`, `aria-modal` and the focus trap are DELIBERATELY ABSENT here: the shell's
// overlay declares them for whatever it is presenting, and a second dialog role inside the first
// would announce two.
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { createPortal } from "react-dom";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestFullscreen } from "../app/shell-bus.mjs";
import { terminalFullscreenRequest } from "./fullscreen-request.mjs";
import type { SessionSource } from "./source-table.mjs";
import { TerminalByteArea } from "./TerminalByteArea";
import { TERMINAL_BORDER_CLASS, TERMINAL_CHROME_BG_CLASS, TERMINAL_FOCUS_RING_INSET_CLASS, TERMINAL_HEADER_CHROME_CLASS, TERMINAL_VIEWPORT_BG_CLASS } from "./palette.mjs";

// ── THE DOOR (ADR-009; m49/05 moved it here, beside the room it opens) ───────────────────────
// The control ASKS the shell to present the LIVE NODE it is already rendering into, and hands it
// `home` so dismissal puts the same node back exactly where it came from. It does not build an
// overlay: a per-surface `fixed inset-0` layer is ADR-005's named prohibition, and re-creating
// that shape under a new name is how the exemption m45 granted the file 46/04 deleted would have
// become permanent (`test/arch/acd-no-per-surface-fixed-overlay.test.mjs`).
//
// ONE XTERM, ONE SOCKET, ONE PTY THROUGH BOTH TRANSITIONS. Nothing here touches the session: the
// control's session effect is keyed on `sessionKey` and `expanded` is not one of its inputs.
// Presenting moves DOM; it does not re-subscribe — and a re-subscribe is VISIBLE, because the
// mirror is ephemeral and the pane would come back EMPTY.
//
// IT LIVES IN THIS FILE because the node, the home and the portal are ONE mechanism: the element
// React must not own the position of, the place it goes back to, and the tree rendered into it.
// (It also pays for m49/05's additions to `TerminalControl.tsx` in the currency
// `acd-ui-surface-file-budget` asks for — a surface gains CHILD COMPONENTS, not blocks.)
export function TerminalFullscreenDoor({
  expanded,
  subscribed,
  source,
  posture,
  sessionKey,
  label,
  identity,
  descriptor,
  paneRef,
  exitClassName,
  openerFor,
  onLayout,
  onExit,
}: {
  expanded: boolean;
  subscribed: boolean;
  source: SessionSource | null;
  posture: string;
  sessionKey: string | null;
  label: string;
  identity: React.ReactNode;
  descriptor: React.ComponentProps<typeof TerminalByteArea>["descriptor"];
  paneRef: React.RefObject<HTMLDivElement | null>;
  exitClassName: string;
  // WHICH ELEMENT OPENED IT, read at request time rather than passed as a value: the answer
  // depends on the FORM the operator used, and that is not known until they use one. The shell
  // only ever calls `.focus()` on it, which is the whole of what it must be able to do.
  openerFor: () => { focus?: () => void } | null;
  onLayout: () => void;
  onExit: () => void;
}): React.ReactElement {
  // WHERE THE FULLSCREEN PRESENTATION LIVES, and why it is an imperative element rather than a
  // React one. The shell ADOPTS a live DOM node — it `appendChild`s it into the overlay's
  // childless host and returns THE SAME node to `home` on dismiss — so the node must be one React
  // does not own the position of: React reconciles by POSITION among a parent's children, and it
  // removes a child by asking the parent it BELIEVES owns it, which throws once the shell has
  // re-parented it. So this component creates the host itself and renders its tree INTO it with a
  // portal. React owns the contents; the shell owns the node.
  //
  // The same trick the xterm pane already uses one level down, for the same reason.
  const [node] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const element = document.createElement("div");
    // It fills whatever box the shell hands it — the overlay's own `min-h-0 flex-1` host — and
    // brings no positioning of its own. The BOX is the shell's; the CONTENT is this control's.
    element.className = "h-full";
    return element;
  });
  const homeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded || !subscribed || node == null) return undefined;
    const request = terminalFullscreenRequest({
      source,
      posture,
      sessionKey,
      label,
      node,
      home: homeRef.current,
      opener: openerFor(),
      onLayout,
      // The shell owns two of the three ways out (`Escape` on a read-only occupant, and being
      // replaced by a second terminal), so it TELLS us. Without this the control would keep
      // rendering into a node the shell had already sent home.
      onDismiss: onExit,
    });
    if (request === null) return undefined;
    const dismiss = requestFullscreen(request);
    return () => dismiss();
    // `label` is deliberately absent: it is the occupant's aria-label, and re-requesting on every
    // wording change would re-present (and therefore re-adopt) a live session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, subscribed, sessionKey, source, posture, node]);

  return (
    <>
      {/* WHERE THE ADOPTED NODE LIVES WHEN IT IS NOT PRESENTED. The shell returns the SAME node to
          `home` on dismiss, so `home` has to be somewhere this component still owns — and it is
          `hidden`, because a fullscreen tree rendered inline would be a second copy of the pane. */}
      <div ref={homeRef} className="hidden" aria-hidden="true" />
      {expanded && subscribed && node != null ? (
        <TerminalFullscreenOccupant
          host={node}
          identity={identity}
          descriptor={descriptor}
          paneRef={paneRef}
          exitClassName={exitClassName}
          onExit={onExit}
        />
      ) : null}
    </>
  );
}

export function TerminalFullscreenOccupant({
  host,
  identity,
  descriptor,
  paneRef,
  exitClassName,
  onExit,
}: {
  // The element the shell adopts. Created by the control, never by React.
  host: HTMLElement;
  // C1's identity fragment, rendered VERBATIM — the same lockup, identity line, `read-only` pill
  // and state chip as the inline header, which is what makes this read as the same pane.
  identity: React.ReactNode;
  descriptor: React.ComponentProps<typeof TerminalByteArea>["descriptor"];
  paneRef: React.RefObject<HTMLDivElement | null>;
  exitClassName: string;
  onExit: () => void;
}) {
  return createPortal(
    <div className={cn("flex h-full min-h-0 flex-col text-zinc-200", TERMINAL_VIEWPORT_BG_CLASS)}>
      {/* `@container` IS NOT DECORATION HERE — WITHOUT IT THE IDENTITY FRAGMENT NEVER UNFOLDS.
          C1's yield order is keyed to the header's own width (palette.mjs `TERMINAL_YIELD_*`), and
          a container query with no container ancestor never matches: this occupant is PORTALED
          into a node the shell owns, so it inherits no container from the inline header it was
          expanded out of. Omit this and fullscreen — the biggest box there is — would render the
          most yielded header, permanently dropping the word, the tail and both field labels. */}
      <header className={cn("@container flex min-w-0 flex-nowrap items-center border-b py-2", TERMINAL_HEADER_CHROME_CLASS, TERMINAL_BORDER_CLASS, TERMINAL_CHROME_BG_CLASS)}>
        {identity}
        {/* ALWAYS VISIBLE, and it is binding rather than stylistic: an interactive occupant CLAIMS
            `Escape` (a live keystroke for the `claude` TUI), so this is then the ONLY exit. Never
            hover-revealed, never auto-hiding, never fading with inactivity — a build that did any
            of those has built a room with no door. It sits at the same `ml-auto` anchor as the
            control that entered fullscreen.

            It dispatches the same named change the SHELL's own dismissal does, and the shell
            returns focus to the opener; this component moves no focus itself, or the two would
            disagree about where it went. */}
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit full screen"
          title="exit full screen"
          className={cn("ml-auto", exitClassName)}
        >
          <Minimize2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      {/* THE HOUSE RING, INSET (GAP-2): focus presents INSIDE the terminal here, and the box is the
          viewport's own edge — an outward offset would be clipped, and the UA default is invisible on the
          byte area's own near-black ground. `focus-within`: the element taking focus is xterm's. */}
      <div className={cn("flex min-h-0 flex-1 flex-col", TERMINAL_FOCUS_RING_INSET_CLASS)}>
        <TerminalByteArea descriptor={descriptor} paneRef={paneRef} framed={false} />
      </div>
    </div>,
    host,
  );
}
