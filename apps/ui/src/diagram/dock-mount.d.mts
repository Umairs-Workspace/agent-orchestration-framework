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

// Delivery (milestone 171 / ADR-005): type into the ready session, start one, or let a note wait.
export type DeliveryKind = "ask" | "note";
export type DeliveryOutcome = "typed" | "started" | "waiting" | "not-running";
export interface DeliveryPlan {
  readonly outcome: DeliveryOutcome;
  readonly type: readonly string[];
  readonly command: string | null;
  readonly then: readonly string[];
}
export declare const DELIVERY_TYPED: "typed";
export declare const DELIVERY_STARTED: "started";
export declare const DELIVERY_WAITING: "waiting";
export declare const DELIVERY_NOT_RUNNING: "not-running";
export declare function deliveryPlan(facts: { kind: DeliveryKind; invocations: readonly string[]; dockOpen: boolean; sessionReady: boolean }): DeliveryPlan;
