// Type declarations for the ONE terminal control's session source table (milestone 46 /
// story 03 / task 00, ADR-002). `source-table.mjs` is framework-free so `node:test` drives
// it headlessly; the `.tsx` consumer gets its types from here. House pattern, same as
// ui/src/app/routes.d.mts.

export declare const ORIGIN_ROLE_SELF: "self";
export declare const ORIGIN_ROLE_FLEET: "fleet";
export type OriginRole = "self" | "fleet";

export declare const RESIZE_CONTROL_FRAME: "resize";
export declare const WORKER_TERMINAL_COLS: number;
export declare const WORKER_TERMINAL_ROWS: number;

export type SessionSourceKind = "local-pty" | "mirror";
export declare const SESSION_SOURCE_KINDS: readonly SessionSourceKind[];

export interface FixedGeometry {
  readonly cols: number;
  readonly rows: number;
}

export interface SessionSource {
  readonly kind: SessionSourceKind;
  readonly path: string;
  readonly params: readonly string[];
  readonly originRole: OriginRole;
  readonly resizeControlFrame: string | null;
  readonly canInput: boolean;
  readonly fixedGeometry: FixedGeometry | null;
}

export declare const SESSION_SOURCES: readonly SessionSource[];
export declare const SESSION_SOURCE_FIELDS: readonly string[];

export declare function sessionSourceTable(): readonly SessionSource[];

export type SessionSourceLookup =
  | { readonly resolved: true; readonly kind: SessionSourceKind; readonly source: SessionSource }
  | {
      readonly resolved: false;
      readonly source: null;
      readonly requestedKind: string | null;
      readonly knownKinds: readonly SessionSourceKind[];
      readonly message: string;
    };

export declare function sessionSourceFor(kind: unknown): SessionSourceLookup;

// DERIVED from the descriptor's own declared field — never a seventh column, never a branch on
// the kind. A lane either speaks the frozen control envelope in BOTH directions or in neither.
export declare function sourceCarriesControlFrames(source: SessionSource | null | undefined): boolean;
