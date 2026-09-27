// src/work/item-row.mjs — THE CACHE ROW's SHAPE at the store boundary (milestone 127 / story
// 04, ADR-006 §1): what `work_items` stores of an enumerator row, screened before the bind and
// widened after the read.
//
// WHY A LEAF OF ITS OWN. `src/global-work-store.mjs` is the declared single writer of four fact
// tables and sits at its 1,280-line ratchet (43/ADR-012/B4), whose escape hatch is exactly this:
// "put the next block in its own module and call it from here". The next block is the two
// LOCATION shapes 127/01 gave the enumerator's row — `backlog` (a backlog row's group path, `""`
// at the top; `number: null` derives from its PRESENCE) and `archived: true` — which have to be
// carried at every hop between the disk and the wire. The screen moved here with them because
// the screen is about the SAME thing: which values of which columns are storable. The store
// re-exports the screen so every importer (and the coverage ratchet in
// `acd-work-items-single-writer`) keeps reading it from where it always did, exactly as
// `WORK_ITEM_DOC_FILES` is re-exported from `./artifacts.mjs`.
//
// THE WIDENING RULE, the same one 127/01 gave the frozen `listStream` row: a live numbered row
// is BYTE-IDENTICAL to before (no key added, ever — the frozen-shape pins over live rows hold),
// ONLY a backlog row gains `backlog`, and ONLY an archived row gains `archived: true`. No
// `number` key is ever added to a store row: the store has never carried one, and `backlog`'s
// presence is the one fact `number: null` derives from.
//
// A pure leaf: no imports, so the store, the seam and a test can all reach it without dragging
// anything behind it.

// The row screen (43/02, ADR-012/B5): the four NOT NULL columns and the columns a row MAY
// carry. IT COVERS EVERY VALUE THE STATEMENT BINDS, not only the NOT NULL ones. Screening the
// four required columns was measured insufficient: the upsert binds eight row-derived values
// and `status`/`title`/`parent` reached it unchecked. A frame carrying `title: ["alpha","beta"]`
// threw out of the whole batch and landed ZERO rows; the same shape reaches the DISK path from
// ordinary operator input (`parseFrontmatter` parses an inline list) and froze every other item
// in the workspace on every tick until a human edited that one doc. That is P0.3's own
// sentence, so AC5's "retired" was false until this screen existed. The coverage ratchet
// (`acd-work-items-single-writer`) reads these lists rather than re-spelling them, so the next
// column cannot ship unscreened.
export const REQUIRED_ITEM_FIELDS = ["ref", "type", "slug", "sourcePath"];
// `backlog` joins the optional set as a STRING column: `""` is a value (the top of the backlog)
// and is stored as `""`, never coerced to NULL. `archived` is deliberately NOT here — it is a
// boolean on the row and SQLite refuses a boolean at bind time (measured: `isBindableValue`
// says so), so it has its own predicate below and its own mapping at the bind.
export const OPTIONAL_ITEM_FIELDS = ["status", "title", "parent", "backlog"];

// What SQLite binds: null/undefined, a string, a number/bigint. An array, a plain object
// and a BOOLEAN all throw — measured, not assumed. Numbers stay admitted: a `title: 2026`
// has always stored 2026, and rejecting it would be a behaviour change in a fix's clothes.
function isBindableValue(value) {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "bigint";
}

// The archived flag's own screen: `true`, `undefined` or `null` are storable (present, or
// absent — there is no "not archived" value, absent is absent), and anything else — `"yes"`,
// `1`, `false`, an object — is refused naming its column, so a frame that spells the flag
// wrongly is skipped as one row rather than aborting the batch.
function isStorableArchivedFlag(value) {
  return value === true || value == null;
}

// itemRowFault(row) → null when storable, else { reason, column } — so a count is always
// explainable by the column that caused it.
export function itemRowFault(row) {
  if (row == null || typeof row !== "object" || Array.isArray(row)) return { reason: "incomplete-row", column: null };
  for (const field of REQUIRED_ITEM_FIELDS) {
    if (typeof row[field] !== "string" || row[field].length === 0) return { reason: "incomplete-row", column: field };
  }
  for (const field of OPTIONAL_ITEM_FIELDS) {
    if (!isBindableValue(row[field])) return { reason: "unstorable-value", column: field };
  }
  if (!isStorableArchivedFlag(row.archived)) return { reason: "unstorable-value", column: "archived" };
  return null;
}

export function isCompleteItemRow(row) {
  return itemRowFault(row) == null;
}

// archivedColumn(row) — the flag AT THE BIND: `true → 1`, else NULL. Never `0`: a row that
// says "not archived" is a different row from one that never carried the fact, and reading a
// `0` back would put an `archived` key on a live row the frozen shape must not gain.
export function archivedColumn(row) {
  return row?.archived === true ? 1 : null;
}

// itemLocationKeys(item) — the widening from an ENUMERATOR item (`listItems`' row, on the
// disk side of the store): `{ backlog }` for a backlog row (`number == null` — the group path,
// `""` at the top), `{ archived: true }` for an archived one, `{}` for a live row.
export function itemLocationKeys(item) {
  return {
    ...(item?.number == null ? { backlog: item?.backlog ?? "" } : {}),
    ...(item?.archived === true ? { archived: true } : {}),
  };
}

// rowLocationKeys(row) — the same widening from a STORED row (the columns as SQLite hands them
// back): `backlog` when the column is not NULL (`""` included), `archived: true` when the
// column reads `1`. Each key present only when the fact is, so a pre-v9 row and a live row
// read back with exactly the keys they always had. This is the STORE row's own shape (the
// board's cache read): no `number` key, exactly as the disk projection stored it.
export function rowLocationKeys(row) {
  return {
    ...(row?.backlog != null ? { backlog: row.backlog } : {}),
    ...(row?.archived === 1 ? { archived: true } : {}),
  };
}

// wireLocationKeys(row) — the FLEET payload's widening (`mapItemRow`, `/api/mesh/status`),
// which ADR-006 §1 rules carries the shapes "exactly as `listItems` emits them": a backlog row
// says `number: null` beside its `backlog`, so a fleet reader partitions on the wire's own fact
// rather than on a ref's spelling. The store row above never carries `number` (it never has);
// the key is DERIVED here from `backlog`'s presence, the one fact it follows from.
export function wireLocationKeys(row) {
  return {
    ...(row?.backlog != null ? { number: null } : {}),
    ...rowLocationKeys(row),
  };
}
