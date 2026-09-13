// C2 + C3 — THE BYTE AREA AND THE NON-LIVE BAR (milestone 46; DESIGN §The control's anatomy).
//
// Extracted from `TerminalControl.tsx` at story 46/05 under `acd-ui-surface-file-budget`'s own
// remedy: "a surface gains CHILD COMPONENTS, not blocks". It is a genuine region with a genuine
// prop boundary — a descriptor, a ref and one layout flag — rather than a slice taken to fit
// under a number, and no explanation was deleted to make it fit (ADR-014/E3).
//
// ONE COMPONENT, THREE SURFACES: the inline dock, the inline card and the fullscreen occupant all
// render this, so a treatment can never exist on one and not another. (At first review the
// overlay rendered only the bar, so a `waiting` fullscreen pane was a black rectangle with no
// `connected · waiting for first output` in it — DESIGN's "all three surfaces, one rule", broken
// by a copy.)
//
// EVERY PANE DECISION IS A DESCRIPTOR FIELD, not a boolean re-derived from a state word here.
// `pane`, `showsBar`, `showsTopLeftLine`, `dims` and `labelClass` are all computed in
// `state-ramp.mjs`, because DESIGN V11 (the bar never overprints; the top-left line is only for a
// pane that is empty BY DEFINITION) is the hardest-won rule in this milestone, and at first review
// it lived in JSX that no test in this repo can reach.
//
// THE BAR IS INSIDE THIS BOX, which is what makes it "paid for out of the byte area": the
// terminal's own pane is a `flex-1` sibling, so it SHRINKS by the bar's height and the control's
// layout effect re-fits or re-scales into the smaller box. The host's total height does not move —
// that is the mock's S2 `0.47 → 0.40` and S3 `1.83 → 1.76` pair, derived rather than typed.
import type * as React from "react";
import { cn } from "@/lib/utils";
import { PANE_EMPTY_HOST, PANE_LINE_CENTRED, PANE_UNAVAILABLE_BLOCK } from "./state-ramp.mjs";
import { hostAnnouncesState } from "./host-model.mjs";
import {
  TERMINAL_BORDER_CLASS,
  TERMINAL_BYTE_AREA_FRAME_CLASS,
  TERMINAL_CHROME_BG_CLASS,
  TERMINAL_FOREGROUND_CLASS,
  TERMINAL_UNAVAILABLE_BLOCK_CLASS,
  TERMINAL_VIEWPORT_BG_CLASS,
} from "./palette.mjs";

// The shape `describeTerminalState` returns. Named loosely on purpose: the descriptor's contract
// is the shared core's, and restating its field types here would be a second home for it.
interface PaneDescriptor {
  pane: string;
  paneLine: string | null;
  paneLinePlacement?: string | null;
  cause?: string | null;
  recovery?: string | null;
  dims: boolean;
  showsBar: boolean;
  showsTopLeftLine: boolean;
  labelClass: string;
}

export function TerminalByteArea({
  descriptor,
  paneRef,
  framed,
  host,
  onActivate,
}: {
  descriptor: PaneDescriptor;
  // The xterm host is appended imperatively into this element by the control's layout effect —
  // ONE pane, moved between the inline host and the fullscreen one, never rebuilt.
  paneRef: React.RefObject<HTMLDivElement | null>;
  framed: boolean;
  // WHICH HOST IS SHOWING THIS, asked rather than parameterised — the same shape the identity
  // fragment already uses for its own live region (m46 GAP G1's lesson).
  host?: string;
  // THE SECOND DOOR, and only where a host declares it (m49/ADR-007 (B), `FORM_PANE_ACTIVATION`).
  // A click into a GRID TILE's byte area presents the pane fullscreen, because at 0.47–0.59× the
  // tile is a picture and the words are in the overlay (DG-49-5). PER-HOST for a measured reason:
  // on the board dock the same click must focus xterm *to type*, and turning that into a present
  // would take typing away from the surface m42 deliberately made typeable. Absent — which is
  // every host m46 shipped — and this component renders what it always did, down to the prop keys.
  onActivate?: (() => void) | null;
}) {
  // The xterm host is never a keyboard focus target inline: at every documented tile width the
  // effective glyph is 6.1–7.6px against a 10px smallest-asserted-readable, so focus belongs on
  // the tile and typing belongs in the overlay (DESIGN §S2 C2, DG-49-5). Declared only where the
  // second door is, so no other host's rendered props change by one key.
  const paneProps = onActivate ? { tabIndex: -1 } : null;
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        TERMINAL_VIEWPORT_BG_CLASS,
        framed ? TERMINAL_BYTE_AREA_FRAME_CLASS : "m-2",
      )}
    >
      <div className="relative min-h-0 flex-1" {...(onActivate ? { onClick: onActivate } : null)}>
        {descriptor.pane === PANE_UNAVAILABLE_BLOCK ? (
          // There is no dimmed terminal underneath — there IS no terminal.
          <div className="grid h-full place-items-center p-6">
            <div className={cn(TERMINAL_UNAVAILABLE_BLOCK_CLASS, TERMINAL_BORDER_CLASS)}>
              <p className="mono text-xs text-zinc-400">{descriptor.cause}</p>
              {/* `text-zinc-400`, not `text-zinc-500` — the recovery is THE COMMAND THE OPERATOR
                  MUST TYPE, and zinc-500 on the byte area measures 3.98:1, below AA. An
                  accessibility floor outranks the mock (PO ruling, 2026-08-08). */}
              {descriptor.recovery ? <p className="mono text-[11px] text-zinc-400">{descriptor.recovery}</p> : null}
            </div>
          </div>
        ) : descriptor.pane === PANE_EMPTY_HOST ? (
          // THE BOX, and its line only when the descriptor places it HERE: `idle` is two
          // treatments (m49/05 F5) — a host with nothing in it says so in the middle, and a
          // terminal that is empty says so top-left, below, where the first byte would have been.
          <div className="grid h-full place-items-center p-6 text-center">
            {descriptor.paneLinePlacement === PANE_LINE_CENTRED ? (
              <p className="mono text-xs text-zinc-400">{descriptor.paneLine}</p>
            ) : null}
          </div>
        ) : (
          // NO PADDING ON THE PANE, and it is arithmetic rather than taste: the 8px gutter is the
          // byte-area FRAME's margin, and a second inset here would shrink the box a `scale`
          // source measures itself against — the peek scales its 408px screen by exactly
          // `192/408`, which a 16px inset would quietly turn into `176/408`.
          <div
            ref={paneRef}
            className={cn("absolute inset-0 overflow-hidden", TERMINAL_FOREGROUND_CLASS, descriptor.dims && "opacity-60")}
            {...paneProps}
          />
        )}
        {descriptor.showsTopLeftLine ? (
          // The honest cold start: the pane is empty by definition, so nothing can be overprinted
          // and the message sits where the first line will appear.
          <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
            <p className={cn("mono text-xs", descriptor.labelClass)}>{descriptor.paneLine}</p>
          </div>
        ) : null}
      </div>
      {descriptor.showsBar ? (
        // C3 — OPAQUE, IN FLOW, at the bottom of the byte area and paid for OUT OF it, so the
        // terminal re-fits or re-scales into the smaller box and no glyph is ever covered. One
        // rule, all three surfaces (changes 6 and 7 — both predecessors overprinted somewhere).
        // `role="status"`, never `role="alert"`: a stream ending is information, not an emergency.
        <div
          // `role="status"` IS AN IMPLICIT POLITE LIVE REGION, so it follows the SAME host
          // declaration the chip's `aria-live` does (m49/05 F6, DG-49-7): one pane on one card
          // announces that its stream ended; a dozen ended tiles on a grid is a screen reader
          // narrating the fleet, which is the defect this milestone exists to remove. The bar
          // still RENDERS its words everywhere — only the announcement moved, exactly as it did
          // for the chip, and the grid's own region is what speaks for those panes.
          {...(hostAnnouncesState(host) ? { role: "status" } : null)}
          className={cn("shrink-0 border-t px-3 py-1.5", TERMINAL_BORDER_CLASS, TERMINAL_CHROME_BG_CLASS)}
        >
          <p className={cn("mono text-xs", descriptor.labelClass)}>{descriptor.paneLine}</p>
        </div>
      ) : null}
    </div>
  );
}
