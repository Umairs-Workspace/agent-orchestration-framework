// Type declarations for the BOARD's call-site mount (milestone 46 / story 04).
// `dock-mount.mjs` is framework-free so `node:test` drives it headlessly; `Board.tsx` and the one
// terminal control get their types from here.
//
// THE MOUNT SHAPE ITSELF IS NOT DECLARED HERE. It lives in `ui/src/terminal/mount.d.mts`, the
// shared domain folder both surfaces import DOWN into — a contract two consumers share may not
// live in one consumer's folder, which is TECH_DEBT 18(a)'s exact shape and the thing this
// milestone exists to reduce rather than add to.

import type { TerminalMountDeclaration } from "../terminal/mount.mjs";

// The board's ONE dock session descriptor. The kinds ARE the source kinds (ADR-002): the
// conflated `local`/`remote` vocabulary retires with `TerminalDock.tsx`.
export type DockSession =
  | { kind: "local-pty"; ref: string; command: string | null }
  | { kind: "mirror"; ref: string; nodeId: string; sessionId: string };

export declare const DOCK_SOURCE_LOCAL_PTY: "local-pty";
export declare const DOCK_SOURCE_MIRROR: "mirror";

export type { TerminalMountDeclaration };

// NOTE THE SIGNATURE: no options. The `provider` half of a `local-pty`'s addressing tuple is the
// PICKER's selection, which is chrome state the control holds — so the control completes the
// tuple with `withSelectedProvider` and this module does NOT default it. A mount that defaulted
// it would spawn `claude` for an operator who had chosen otherwise, and the defaulting would be
// invisible because the tuple would look complete.
export declare function boardDockMount(session: DockSession | null | undefined): TerminalMountDeclaration;

export declare const UNBOUND_DOCK_MOUNT: TerminalMountDeclaration;
