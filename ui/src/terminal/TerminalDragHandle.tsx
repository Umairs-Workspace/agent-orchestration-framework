// C0a — THE DRAG HANDLE (milestone 46; DESIGN §S1's C0a and §Accessibility 8,
// `mocks/CONFORMANCE.md` §2·S1: `height:6px`, transparent, `cursor:ns-resize`, hover teal).
//
// Extracted from `TerminalControl.tsx` at story 46/05 under `acd-ui-surface-file-budget`'s own
// remedy — the ratchet fired on that file and the answer to a ratchet is a child component, never
// a raised number (ADR-014/E3: and never trimmed rationale either).
//
// ═══ ONE CLAMP, TWO INPUT METHODS — AND THE EXTRACTION IS WHAT MAKES IT STRUCTURAL ═══════════
//
// DESIGN §Accessibility 8 asks for a separator a keyboard can move, "within the clamp", and task
// 03 pins that pointer and keyboard "must not disagree about the maximum". Before this component
// existed they disagreed about something the clause did not name: the pointer drag started from
// the RENDERED height and the keyboard from the STORED one, which are different numbers the
// moment the content box changes.
//
//   Measured: with 300 stored and the window shrunk to a 432px box, the dock renders at 216
//   (clamped) and ArrowDown answered 300 − 16 = 284 → re-clamped back to 216. A DEAD KEYPRESS,
//   and a second, and a third, until the stored value walked back under the ceiling. Both agreed
//   about the maximum throughout, so the clause survived literally while the control did not
//   work — which is why it had to be measured rather than read.
//
// So this component OWNS NEITHER the height nor the clamp. It reports a DELTA and the host applies
// its one clamp to its one current height: `onResizeBy` is called with `-16` by ArrowDown and with
// the pointer's travel by a drag, and there is no second path for either to diverge along.
//
// THE ARIA RANGE IS ALWAYS COMPLETE. `aria-valuemax` used to be omitted whenever the box was
// unmeasured — i.e. on the first frame of every mount — leaving a `role="separator"` that
// announced a value and a floor with no ceiling. An incomplete range is worse than a missing one:
// it reads as authoritative.
import { useRef } from "react";
import type * as React from "react";

// The keyboard step. 16px is one Tailwind spacing unit — big enough to be worth a keypress, small
// enough that holding a key is a resize rather than a jump.
export const DRAG_KEY_STEP = 16;

export function TerminalDragHandle({
  value,
  min,
  max,
  onResizeBy,
}: {
  // The height ON SCREEN — the same number `aria-valuenow` reports and the same one both inputs
  // move from.
  value: number;
  min: number;
  // Absent while the box is unmeasured; the range is completed from `value` rather than dropped.
  max: number | null;
  onResizeBy: (delta: number) => void;
}) {
  const drag = useRef<{ startY: number; startHeight: number } | null>(null);

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="horizontal"
      aria-label="Resize terminal dock"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max ?? value}
      onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        drag.current = { startY: event.clientY, startHeight: value };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event: React.PointerEvent<HTMLDivElement>) => {
        const active = drag.current;
        if (!active) return;
        // The delta is measured from where the drag STARTED, not from the last frame, so a drag
        // that is clamped at one end and comes back does not accumulate error.
        onResizeBy(active.startHeight + (active.startY - event.clientY) - value);
      }}
      onPointerUp={(event: React.PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        drag.current = null;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* pointer already released */
        }
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        // A separator only a pointer can move is a control a keyboard user cannot reach (DESIGN
        // §Accessibility 8 — no precedent in either predecessor; built here). Up GROWS the dock:
        // it grows upward from the bottom edge, so the key matches the direction of travel.
        if (event.key === "ArrowUp") onResizeBy(DRAG_KEY_STEP);
        else if (event.key === "ArrowDown") onResizeBy(-DRAG_KEY_STEP);
        else return;
        event.preventDefault();
      }}
      className="h-1.5 w-full shrink-0 cursor-row-resize bg-transparent hover:bg-primary/40"
    />
  );
}
