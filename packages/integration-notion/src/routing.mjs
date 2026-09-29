// ADR-001 shape disambiguation: a `parent` value is a RAW PAGE-ID iff it is EITHER the
// compact 32-hex form OR the canonical 8-4-4-4-12 dashed UUID — exactly those two
// shapes, nothing looser (a stray-dash form like `1-1-1-…` is NOT a page-id). The
// boundary is exact — 31 hex, 33 hex, or a non-hex char (e.g. `g`) all fall cleanly to
// "key". A page-id is used verbatim (no registry lookup); any other string is a KEY
// resolved against the chosen board's `parents` map.
const COMPACT_PAGE_ID = /^[0-9a-fA-F]{32}$/;
const DASHED_PAGE_ID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export function isPageId(value) {
  if (typeof value !== "string") return false;
  return COMPACT_PAGE_ID.test(value) || DASHED_PAGE_ID.test(value);
}

// Classify a parent value as a raw page-id or a key (the human-readable label the
// reader/resolver and the associate verb speak in).
export function classifyParent(value) {
  return isPageId(value) ? "raw page-id" : "key";
}

// Normalise a board connection to the m17 flat shape (dataSourceId, tokenEnv?,
// statusProperty, statusMap, relationProperty, parents?). Used to synthesise the
// implicit default board from a flat m17 config (back-compat, ADR-002).
function asBoardConnection(block) {
  return {
    dataSourceId: block.dataSourceId,
    tokenEnv: block.tokenEnv,
    statusProperty: block.statusProperty,
    statusType: block.statusType,
    titleProperty: block.titleProperty,
    statusMap: block.statusMap,
    relationProperty: block.relationProperty,
    parents: block.parents,
  };
}

// Reduce a central `work.integrations.notion` config to a uniform `{ default, boards }`
// view (ADR-002). A boards-registry block is returned as-is; a FLAT m17 block (a
// `dataSourceId` at the top level and no `boards` key) is synthesised into the implicit
// default board: `boards = { default: <flat> }`, `default = "default"`. An absent
// config ⇒ no boards.
export function asBoardsRegistry(notionConfig) {
  if (!notionConfig || typeof notionConfig !== "object") {
    return { default: undefined, boards: {} };
  }
  if (notionConfig.boards && typeof notionConfig.boards === "object") {
    return { default: notionConfig.default, boards: notionConfig.boards };
  }
  // Flat m17 block ⇒ the implicit default board (back-compat). The whole flat block IS
  // the single board, keyed "default".
  if (typeof notionConfig.dataSourceId === "string") {
    return { default: "default", boards: { default: asBoardConnection(notionConfig) } };
  }
  return { default: undefined, boards: {} };
}

// A resolve error — a config defect (an unknown board key referenced by a descriptor,
// or an unknown `default`) the Ajv schema cannot express (the cross-check that
// `default` names a real board is the resolver's, ADR-002). The associate verb maps
// these to honest command errors; the projection surfaces them as resolve failures.
export class RoutingError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "RoutingError";
    this.code = code;
  }
}

export function createNotionRouting({ readRouting }) {
// Resolve an item's routing against the central `boards` registry (ADR-002/003). It
// combines the committed descriptor (readRouting) with the registry, PURELY from
// committed config — no Notion call (ADR-006).
//
//   → { board: <resolved board connection>, parentPageId: <string|null>, reason?: <string> }
//
// Resolution (ADR-002/003):
//   - descriptor `board: X` ⇒ X's connection; absent `board` ⇒ the configured `default`
//     board; a flat m17 block ⇒ the implicit default board (back-compat); no descriptor
//     at all ⇒ the default board, parentPageId: null.
//   - `parent` (ADR-001): a raw page-id is used verbatim; a key resolves against the
//     CHOSEN board's `parents` map; an absent/unresolvable parent ⇒ parentPageId: null
//     plus an honest `reason` naming the unresolvable key.
//   - an unknown referenced board ⇒ RoutingError("unknown-board-key"); an unknown
//     `default` ⇒ RoutingError("unknown-default-board") — each naming the available boards.
function resolveNotionRouting(item, notionConfig) {
  const { default: defaultKey, boards } = asBoardsRegistry(notionConfig);
  const available = Object.keys(boards);

  const descriptor = readRouting(item);
  const notion = descriptor && typeof descriptor.notion === "object" ? descriptor.notion : {};

  // Choose the board: the descriptor's `board`, else the configured `default`.
  const requested = typeof notion.board === "string" ? notion.board : undefined;
  const boardKey = requested ?? defaultKey;

  if (requested != null && !Object.prototype.hasOwnProperty.call(boards, requested)) {
    throw new RoutingError(
      `Unknown board key "${requested}". Available boards: ${formatBoards(available)}.`,
      "unknown-board-key"
    );
  }
  if (boardKey != null && !Object.prototype.hasOwnProperty.call(boards, boardKey)) {
    // The descriptor named no board (or names the default) but `default` itself is
    // dangling — an honest config error (ADR-002, the resolver's cross-check).
    throw new RoutingError(
      `Unknown default board "${boardKey}". Available boards: ${formatBoards(available)}.`,
      "unknown-default-board"
    );
  }

  const board = boardKey != null ? boards[boardKey] : undefined;

  // Resolve the parent page id (ADR-001): a raw page-id verbatim; a key against the
  // chosen board's parents; an absent/unresolvable parent ⇒ null + an honest reason.
  let parentPageId = null;
  let reason;
  const parent = notion.parent;
  if (typeof parent === "string" && parent.length > 0) {
    if (isPageId(parent)) {
      parentPageId = parent;
    } else {
      const parents = (board && board.parents) || {};
      if (Object.prototype.hasOwnProperty.call(parents, parent)) {
        parentPageId = parents[parent];
      } else {
        reason = boardKey
          ? `parent key "${parent}" is not bound in the "${boardKey}" board's parents map`
          : `parent key "${parent}" is not bound (no board resolved for this item)`;
      }
    }
  }

  return { board, parentPageId, ...(reason ? { reason } : {}) };
}

// Format an available-board list for an error message ("ops","growth"), or a clear
// "(none configured)" when the registry is empty.
function formatBoards(available) {
  return available.length ? available.map((k) => `"${k}"`).join(",") : "(none configured)";
}


return { resolveNotionRouting };
}
