// Type declarations for the ONE terminal control's geometry (milestone 46 / story 03 /
// task 02 — ADR-003). `geometry.mjs` is framework-free so `node:test` drives it headlessly.

import type { SessionSource } from "./source-table.mjs";

export declare const GEOMETRY_FIT: "fit";
export declare const GEOMETRY_SCALE: "scale";
export type GeometryMode = "fit" | "scale";

export declare const ANCHOR_TOP_LEFT: "top-left";
export declare const SCALED_DOWN: "scaled down";
export declare const SCALED_UP: "scaled up";
export declare const UNSCALED: "unscaled";

export declare function geometryModeFor(source: Partial<SessionSource> | null | undefined): GeometryMode;

export interface ResizeMessage {
  readonly type: "resize";
  readonly cols: number;
  readonly rows: number;
}

export declare function resizeMessage(cols: unknown, rows: unknown): ResizeMessage;
export declare function resizeFrame(cols: unknown, rows: unknown): string;
export declare function toDim(value: unknown): number;

export interface EmitFitResult {
  readonly sent: boolean;
  readonly message: ResizeMessage | null;
  readonly reason: "no-change" | "unmeasured" | null;
}

export declare function emitFit(
  cols: unknown,
  rows: unknown,
  send: (frame: string) => void,
  last?: ResizeMessage | null,
): EmitFitResult;

export declare function terminalFitScale(input?: {
  intrinsicWidth?: unknown;
  intrinsicHeight?: unknown;
  boxWidth?: unknown;
  boxHeight?: unknown;
}): number;

export interface GeometryPlan {
  readonly mode: GeometryMode;
  readonly controlFrame: string | null;
  readonly emitter: typeof emitFit | null;
  readonly emitsResizeFrame: boolean;
  readonly reflows: boolean;
  readonly cols: number | null;
  readonly rows: number | null;
  readonly scale: number;
  readonly direction: "scaled down" | "scaled up" | "unscaled";
  readonly anchor: "top-left";
  readonly scaledWidth: number | null;
  readonly scaledHeight: number | null;
}

export declare function geometryPlanFor(
  source: Partial<SessionSource> | null | undefined,
  box?: {
    cols?: unknown;
    rows?: unknown;
    intrinsicWidth?: unknown;
    intrinsicHeight?: unknown;
    boxWidth?: unknown;
    boxHeight?: unknown;
  },
): GeometryPlan;
