// Type declarations for the DIAGRAM surface's call-site mount. The mount shape itself lives in
// `apps/ui/src/terminal/mount.d.mts`, the shared domain folder every surface imports DOWN into.

import type { TerminalMountDeclaration } from "../terminal/mount.mjs";

// The surface's one dock session: the item the draft belongs to and the invocation the dock types.
export interface DiagramDockSession {
  readonly ref: string;
  readonly command: string | null;
}

export declare const DIAGRAM_DOCK_SOURCE: "local-pty";
export declare const UNBOUND_DIAGRAM_DOCK_MOUNT: TerminalMountDeclaration;
export declare function diagramDockMount(session: DiagramDockSession | null | undefined): TerminalMountDeclaration;

export type { TerminalMountDeclaration };
