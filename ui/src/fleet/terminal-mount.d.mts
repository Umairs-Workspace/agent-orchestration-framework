// Type declarations for the FLEET's call-site mount (milestone 46 / story 04).
// `terminal-mount.mjs` is framework-free so `node:test` drives it headlessly; `Fleet.tsx` and
// the one terminal control get their types from here.

// THE SHARED DOMAIN FOLDER, never the board's. `../board/dock-mount.mjs` was a `fleet → board`
// edge — type-only, so invisible to the graph — added by the milestone chartered to remove them
// (ADR-001's own Alternatives-rejected names it). The contract lives in `ui/src/terminal/`, which
// both surfaces import DOWN into and neither imports the other.
import type { FleetTerminalMountDeclaration } from "../terminal/mount.mjs";

export declare const NO_STREAM: {
  readonly NO_ASSIGNMENT: "no-assignment";
  readonly NO_NODE: "no-node";
  readonly NO_SESSION: "no-session";
};

export declare const FLEET_TERMINAL_SOURCE_KIND: "mirror";

// The origins this page hands the control — a pure function of the location it is GIVEN, so the
// fact stays headless and the `.tsx` supplies `window.location`.
export declare function fleetPageOrigins(location: { origin?: unknown } | null | undefined): {
  readonly self: string | null;
  readonly fleet: string | null;
};

export type TerminalStream =
  | { readonly resolved: false; readonly reason: string }
  | {
      readonly resolved: true;
      readonly reason: null;
      readonly nodeId: string;
      readonly sessionId: string;
      readonly key: string | null;
    };

export declare function resolveTerminalStream(assignment: unknown): TerminalStream;

// The V10 copy. `null` for an assignment that could still speak — terminal-ness comes from the
// m35 `assignmentChip`, never from a hand-maintained list.
export declare function terminalAssignmentReason(assignment: unknown): string | null;

export type FleetTerminalMount = FleetTerminalMountDeclaration;

export declare function fleetTerminalMount(
  assignment: unknown,
  options?: { itemRef?: string | null; assignmentId?: string | null },
): FleetTerminalMount;
