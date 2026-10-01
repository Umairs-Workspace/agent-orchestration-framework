// Type declarations for the ONE terminal control's drag clamp (milestone 46 / story 03 —
// ADR-009). Framework-free by contract: it takes the content box as an argument and reads no
// viewport global, which is what keeps it drivable by `node:test`.

export declare const DOCK_MIN_HEIGHT: number;
export declare const DOCK_DEFAULT_HEIGHT: number;
export declare const DOCK_MAX_SHARE: number;

export interface DockHeightBounds {
  // `false` means NOBODY HAS MEASURED THE BOX YET — not that the box is empty. A measured zero
  // is a real (degenerate) box with a ceiling of 0; see the module header.
  readonly measured: boolean;
  readonly contentRegionHeight: number | null;
  // The floor YIELDS TO THE CEILING when the box cannot hold it (`min(48, max)`): a dock taller
  // than its own box puts its handle and header above the content region, which is the exact
  // failure DG-46-1 exists to prevent.
  readonly min: number;
  readonly max: number | null;
  readonly defaultHeight: number;
}

// The content REGION's height — `viewport - chrome`, and never minus the dock inset (the dock is
// the inset; subtracting it closes a measurement loop). `publishedChromeHeight` is the raw CSS
// value of `--aof-shell-chrome-height`; unset means no shell, so the region IS the viewport.
export declare function contentRegionHeight(viewportHeight: unknown, publishedChromeHeight: unknown): number | null;

export declare function dockHeightBounds(contentRegionHeight: unknown): DockHeightBounds;
export declare function clampDockHeight(requested: unknown, contentRegionHeight: unknown): number;
export declare function dockDefaultHeight(contentRegionHeight: unknown): number;
