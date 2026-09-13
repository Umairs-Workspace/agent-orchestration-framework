// Type sidecar for slot-aids.mjs (milestone 47 / story 03, verify fix pass 2026-08-11).
// The module is plain JS so it stays directly executable by `node:test`; this declares it for
// the `.tsx` consumers, exactly as `scope.d.mts` does for the narrowing home.

export declare const SLOT_AID_DROP_WIDTH: number;
export declare const POPOVER_GUTTER: number;

/** DG-47-4's two discrete drops, taken together and keyed to the viewport. */
export declare function slotAidForm(viewportWidth?: number | null): "glyph" | "words";

/** Where a right-anchored popover may sit without being silently clipped (DESIGN S1-C). */
export declare function clampedPopover(input?: {
  anchorRight?: number | null;
  popoverWidth?: number | null;
  viewportWidth?: number | null;
  gutter?: number;
}): { right: number; maxWidth: number | null };
