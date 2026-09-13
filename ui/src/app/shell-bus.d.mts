// Type declarations for the surface → shell channel (milestone 45 / story 03; ADR-005).
// `shell-bus.mjs` is framework-free at RUNTIME (no React import, no DOM); the types below are
// erased at compile time, so naming `ReactNode` here costs the module nothing and spares
// every importer a cast.

import type { ReactNode } from "react";

export declare const SLOT_SURFACE: "surface-slot";
export declare const SLOT_NOTICE: "notice-rail";
// m46/ADR-009 — the third slot. Its region is `overlay`; see `slotPlacement` in shell-layout.
export declare const SLOT_DOCK: "dock";
export type ShellSlot = "surface-slot" | "notice-rail" | "dock";
export declare const SHELL_SLOTS: readonly ShellSlot[];

export declare function declareShellPresent(): void;
export declare function hasShellHost(): boolean;
export declare function attachShellHost(handler: (slot: ShellSlot) => void): () => void;
export declare function contribute(slot: ShellSlot, node: ReactNode): () => void;
export declare function contributionFor(slot: ShellSlot): ReactNode;
export declare function resetShellBus(): void;

// [Build-1] — the request carries a LIVE DOM node the shell ADOPTS. Presenting must not
// unmount, remount, re-key or re-create the occupant, and dismissing returns the SAME node to
// `home`, so one xterm, one socket and one PTY survive both transitions.
export interface FullscreenRequest {
  readonly id: string;
  readonly label?: string;
  readonly node: Element;
  readonly home?: Element | null;
  readonly opener?: { focus?: () => void } | null;
  readonly claimsEscape?: boolean;
  // `| null` because the runtime calls these with `?.()` (`Shell.tsx:857`, `:914`) and therefore
  // genuinely accepts null — a caller that normalises "absent" to null (as the terminal control's
  // framework-free request builder does) was type-rejected while being perfectly safe. Widening the
  // declaration to what the code already does, rather than making the caller lie.
  readonly onLayout?: (() => void) | null;
  // m46/05 — the occupant paints its own header and its own (mandatory) exit control, so the
  // shell paints none. Absent means the m45 behaviour: the shell's own header.
  readonly ownsChrome?: boolean;
  // m46/05 — the shell TELLS the occupant it was dismissed (by `Escape`, by the shell's own
  // exit control, or by being replaced). Without it a caller keeps rendering into a node the
  // shell has already sent home.
  readonly onDismiss?: (() => void) | null;
}

export type FullscreenBusEvent =
  | { readonly type: "present"; readonly occupant: FullscreenRequest }
  | { readonly type: "dismiss"; readonly id?: string; readonly via?: string };

export declare function attachFullscreenHost(handler: (event: FullscreenBusEvent) => void): () => void;
export declare function requestFullscreen(request: FullscreenRequest): () => void;
export declare function dismissFullscreen(id?: string): void;
