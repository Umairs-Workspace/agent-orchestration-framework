// Type declarations for the ONE terminal control's socket URL builder (milestone 46 /
// story 03 / task 03 — ADR-004). Framework-free by contract: it takes origins as an
// argument and reads no global, which is what keeps it drivable by `node:test`.

import type { OriginRole, SessionSource } from "./source-table.mjs";

export declare const REFUSAL_MISSING_PARAM: "missing-param";
export declare const REFUSAL_MISSING_ORIGIN: "missing-origin";
export declare const REFUSAL_UNRESOLVABLE_ORIGIN: "unresolvable-origin";
export declare const REFUSAL_UNSUPPORTED_SCHEME: "unsupported-scheme";
export declare const REFUSAL_NO_SOURCE: "no-source";

// `null` is a FIRST-CLASS value here, not a laxity: a board that was handed no fleet origin
// carries an EXPLICIT `null` (the served fact's `source: "none"` case), and a surface with no
// window carries one too. The builder refuses on it by name — a missing origin opens no socket
// and says why — which is only expressible if the type admits it.
export type TerminalOrigins = Partial<Record<OriginRole | string, string | null>>;

export interface TerminalSocketUrlBuilt {
  readonly url: string;
  readonly scheme: "ws" | "wss";
  readonly authority: string;
  readonly path: string;
  readonly originRole: string;
  readonly params: readonly (readonly [string, string])[];
  readonly reason: null;
  readonly missing: readonly string[];
  readonly message: null;
}

export interface TerminalSocketUrlRefused {
  readonly url: null;
  readonly scheme: null;
  readonly authority: null;
  readonly path: null;
  readonly originRole: null;
  readonly params: null;
  readonly reason: string;
  readonly missing: readonly string[];
  readonly message: string;
}

export type TerminalSocketUrlResult = TerminalSocketUrlBuilt | TerminalSocketUrlRefused;

export declare function terminalSocketUrl(
  source: Partial<SessionSource> | null | undefined,
  params?: Record<string, unknown>,
  options?: { origins?: TerminalOrigins },
): TerminalSocketUrlResult;
