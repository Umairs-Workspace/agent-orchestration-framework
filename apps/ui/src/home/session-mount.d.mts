// Type declarations for the terminals home's MOUNT DECLARATION (milestone 49 / story 03 /
// task 01 — ADR-007). Framework-free by contract; the `.tsx` consumer gets its types from the
// module that owns the decision.
//
// NOTE WHAT THE SHAPE IS: `TerminalMountDeclaration` plus `noStream`, i.e. exactly the thirteen
// keys `fleetTerminalMount` returns. A fourteenth key for a fact this surface finds interesting
// would end the property that makes one shape worth having.
//
// AND NOTE WHAT IS ABSENT FROM THE SIGNATURE: there is no posture parameter, optional or
// otherwise. The posture is a LITERAL at this one call site, narrowed by the feed axis and by
// nothing else — not a prop, not a parameter, not a value a render site composes.

import type { FeedAxis, FeedAxisContext } from "./feed-axis.mjs";
import type { FleetTerminalMountDeclaration } from "../terminal/mount.mjs";

export declare const HOME_SESSION_SOURCE_KIND: "mirror";

/** The origins this page hands the control — the same value under both keys, taken as an argument. */
export declare function homePageOrigins(
  page: { readonly origin?: string | null } | null | undefined,
): { readonly self: string | null; readonly fleet: string | null };

/** THE HELD TILE'S LINE (DESIGN K7/K8) — the `<N>` comes from the arbiter's cap, never the copy. */
export declare const HELD_LINE: "not streaming";
export declare function heldPaneLine(
  hold: { readonly cause?: string | null; readonly cap?: number | null } | null | undefined,
): string;

export declare const HOME_NO_STREAM: {
  readonly NO_ROW: "no-row";
  readonly NO_NODE: "no-node";
  readonly NO_SESSION: "no-session";
  readonly NO_OWNER: "no-owner";
};

/** DESIGN owes this sentence (K1-K12 has no `roster-gone` string); it has ONE author until then. */
export declare const ROSTER_GONE_REASON: string;

/** Axis value → the sentence that names why the pane cannot type. `producer-known` has none. */
export declare const READ_ONLY_CAUSE_REASON: Readonly<Record<string, string>>;

/** One `MeshSession` entry of milestone 48's index, as the fleet already polls it. */
export interface HomeSessionRow {
  readonly nodeId?: string | null;
  readonly sessionId?: string | null;
  readonly workspaceId?: string | null;
  readonly repo?: string | null;
  readonly assistant?: string | null;
  readonly lastPingAt?: string | null;
  readonly workspaceHasRun?: boolean;
  readonly workItem?: { readonly ref?: string | null; readonly assignmentId?: string | null } | null;
}

export interface HomeSessionMountOptions {
  /** The whole-poll answer, when the caller already has it. Unrecognised ⇒ read-only. */
  readonly axis?: FeedAxis | string | null;
  /** Both polls, when the caller would rather this module derive the axis. */
  readonly context?: FeedAxisContext<HomeSessionRow> | null;
  /** ACCEPTED AND IGNORED: one posture serves both hosts, because changing it costs the session. */
  readonly host?: string | null;
  /**
   * The ARBITER's answer for this row, when the surface has one (m49/05). `subscribed: false`
   * makes the injected sentence the HELD line — precedence 1: not subscribed wins outright,
   * because a pane with no socket has no transport fact to report.
   */
  readonly hold?: { readonly subscribed?: boolean; readonly cause?: string | null; readonly cap?: number | null } | null;
}

export declare function homeSessionMount(
  row: HomeSessionRow | null | undefined,
  options?: HomeSessionMountOptions | null,
): FleetTerminalMountDeclaration;
