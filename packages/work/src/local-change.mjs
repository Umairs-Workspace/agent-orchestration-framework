import { createHash } from "node:crypto";
import path from "node:path";
import { itemLocationKeys } from "./item-row.mjs";

// src/work/local-change.mjs — "changed since observed" has ONE home (164/ADR-002, FF-16401).
//
// A node's own record files are canonical (164/ADR-001): a ref whose local record has changed
// since this node last observed it takes authorship of its row in the next publish, exactly as
// an operator verb does. File mtimes cannot answer "changed" (`git checkout` rewrites them), and
// the record doc's bytes over-answer it (a prose edit changes no row field). So the question is
// asked of the projected ROW: the fields `readWorkspaceProjectionItems` derives from disk, hashed
// in a fixed order. The publisher, the sync pass and the read overlays all ask it here, and none
// re-derives a fingerprint.
//
// A pure leaf — `node:crypto`, `node:path` and the row-shape leaf beside it are its only imports,
// and it does no I/O — so mesh (the writer) and work (the readers) both reach it without a new
// package edge.

// The row fields a fingerprint covers — every column the store carries for an item, and nothing
// a store row does not. `ref` is the key the fingerprint is stored under, so it is not hashed.
export const FINGERPRINT_FIELDS = Object.freeze(["type", "slug", "status", "title", "parent", "sourcePath", "backlog", "archived"]);

// normalizeSourcePath(p) — a record doc's path as a row stores it: absolute, forward slashes.
export function normalizeSourcePath(sourcePath) {
  return path.resolve(sourcePath).replaceAll("\\", "/");
}

// projectedRow(item, meta, docName) — THE projected row of one listed item: what the store's
// own-disk read publishes and what a reader fingerprints, built here once so the two can never
// derive it two ways. `meta` is the record doc's parsed frontmatter, `docName` its file name.
export function projectedRow(item, meta, docName) {
  return {
    ref: item.ref,
    type: item.type,
    slug: item.slug,
    status: meta?.status ?? null,
    title: meta?.title ?? null,
    parent: item.parent,
    sourcePath: normalizeSourcePath(path.join(item.dir, docName)),
    // 127/04 — widened ONLY on a backlog or archived row (ADR-006 §1): a live row keeps its
    // seven keys byte-for-byte.
    ...itemLocationKeys(item),
  };
}

// rowFingerprint(row) → a stable hex digest of the row's fields. Absent and null hash alike, so a
// live row (no `backlog`/`archived` keys) and its explicit-null twin are one state.
export function rowFingerprint(row) {
  const values = FINGERPRINT_FIELDS.map((field) => row?.[field] ?? null);
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

// locallyChanged(fingerprint, baseline) — has this node's record changed since it last observed
// it? A MISSING baseline is never a change: a new store, a rebuilt one or a never-seen ref records
// what it sees and claims nothing, so a lost baseline costs one quiet re-baseline rather than a
// wave of stale scaffolds taking over rows another node reported.
export function locallyChanged(fingerprint, baseline) {
  if (typeof baseline !== "string" || baseline.length === 0) return false;
  return fingerprint !== baseline;
}

// reportedElsewhere(row, selfNodeId) — did ANOTHER node put this row's authoritative value in
// the cache? (m43 / ADR-016/G10, moved here by 164/ADR-005.) All three clauses are load-bearing:
// the row must be CACHE-answered (a disk answer is this node's own by construction), the author
// must be KNOWN (a cache-published row with no author is "author unknown", a different fact from
// a remote one), and it must not be us. Doctor's predicate of the same name in
// `doctor/coherence.mjs` is a deliberate second spelling over the doctor SNAPSHOT's shape.
export function reportedElsewhere(row, selfNodeId) {
  return row?.answeredFrom === "cache"
    && typeof row.reportedBy === "string" && row.reportedBy.length > 0
    && row.reportedBy !== selfNodeId;
}

// cacheAnswers({ reportedBy }, { selfNodeId, locallyChanged }) — does a cached row stand in for
// this node's local record? (164/ADR-005, FF-16402.) Only when ANOTHER node reported it and the
// local record has not changed since this node last observed it. A row this node reported is an
// older copy of its own files, and a local edit outranks any report: both answer from disk. The
// stream readers and doctor both ask it here, so the two cannot disagree.
export function cacheAnswers(row, { selfNodeId = null, locallyChanged: changed = false } = {}) {
  return reportedElsewhere({ ...row, answeredFrom: "cache" }, selfNodeId) && changed !== true;
}
