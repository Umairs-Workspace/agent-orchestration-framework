// Type declarations for the terminals home's layout composer (milestone 49 / story 02 /
// task 02 — ADR-009, DG-49-9). Framework-free by contract: STORAGE IS AN ARGUMENT and this
// module reads no global. That is what keeps it drivable under `node:test`, and it is the same
// discipline `withScopeParam`/`scopeFromSearch` and the socket-URL builder already follow.

/** The per-origin key. `localStorage` is already per-origin, so no origin is encoded in it. */
export declare const LAYOUT_STORAGE_KEY: "aof.home.layout";

/** A shape change is a SILENT RESET, in BOTH directions — older and newer both degrade. */
export declare const LAYOUT_SCHEMA_VERSION: 1;

/** `[nodeId, sessionId]` — the only addressing-shaped pair a `MeshSession` carries. */
export type StoredPaneTuple = readonly [nodeId: string, sessionId: string];

/**
 * The minimal shape the composer needs to read off a live row. A row carries far more; the
 * composer reads exactly these two and persists exactly these two.
 */
export type AddressableRow = { readonly nodeId?: unknown; readonly sessionId?: unknown };

/**
 * A `localStorage`-shaped double. BOTH members are optional and BOTH may throw — on the call
 * AND on the property access itself, which is what a private mode actually does.
 */
export type LayoutStorage = {
  getItem?: (key: string) => unknown;
  setItem?: (key: string, value: string) => unknown;
};

/**
 * Exactly two keys, and no third. There is no ghost, no placeholder, no tombstone, no
 * `missing`/`dropped`/`ended` entry, and no error or degraded-state channel: every failure is
 * the live rows in the order they arrived, with no focus.
 */
export type ComposedLayout<Row = unknown> = {
  /**
   * Every entry is `===`-identical to an element of the live rows: the composer SELECTS. It is a
   * PERMUTATION of them — same length, every handed row exactly once — because a stored
   * preference may reorder the live index and may never shorten it (ADR-009, DG-49-9).
   */
  readonly rows: readonly Row[];
  /** `null`, or a tuple that is present in `rows`. Never a dangling reference, never a position. */
  readonly focus: StoredPaneTuple | null;
};

export declare function composeHomeLayout<Row extends AddressableRow>(
  rows: readonly Row[] | null | undefined,
  storage?: LayoutStorage | null,
): ComposedLayout<Row>;

/**
 * Writes tuples and focus and nothing else. Returns nothing: a save that cannot be written is a
 * silent no-op, and the grid stays fully functional.
 */
export declare function saveHomeLayout<Row extends AddressableRow>(
  rows: readonly Row[] | null | undefined,
  storage?: LayoutStorage | null,
  options?: { readonly focus?: StoredPaneTuple | AddressableRow | null },
): void;
