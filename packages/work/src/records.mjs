// Item record authority: accepts concrete items; no workspace discovery or mesh dependency.
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { writeText } from "@aof/foundation/fs";
import { VALID_STATUS, itemStatusEdges } from "./lifecycle.mjs";

function workError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

// Resolve an item's record doc — the single file whose frontmatter carries the
// item's identity/status. For a milestone the flow is AOF.md-first: a milestone
// CONVERTED into aof (its pre-aof SPEC.md left untouched) is represented by an
// `AOF.md` digest, and that digest IS its record doc. A native milestone (no
// AOF.md) keeps SPEC.md. Stories/uat are unaffected — only milestones mint a
// digest. The validate schema is then chosen dynamically off the resolved doc
// (digest vs native — see validateWork).
export function recordDoc(item) {
  if (item.type === "milestone") {
    return existsSync(path.join(item.dir, "AOF.md")) ? "AOF.md" : "SPEC.md";
  }
  if (item.type === "story") return "STORY.md";
  if (item.type === "uat") return "SESSION.md";
  // milestone 37 / ADR-002 — spike/chore are single self-contained record docs
  // (no separate STATE.md, unlike milestone/uat). Neither is a milestone, so
  // these branches sit BEFORE the final `return null`.
  if (item.type === "spike") return "SPIKE.md";
  if (item.type === "chore") return "CHORE.md";
  return null;
}

// typeHasRecordDoc(type) — does an item of this TYPE carry a record doc at all? Derived
// from recordDoc above so the fact keeps one home: the types that carry none are exactly
// the ones whose branch there falls through to `null` (an adhoc top-level `task` is a
// folder holding one `.feature` — "a task has no status field"). A milestone's branch
// consults the folder for AOF.md-first, and always names one either way; every other
// branch is a pure type→filename map, so the folder is not needed to answer this.
export function typeHasRecordDoc(type) {
  return type === "milestone" || recordDoc({ type }) != null;
}

// Minimal frontmatter reader: `key: value`, inline lists `[a, b]`, quoted
// scalars. Block lists/maps are not needed — the only collection any record doc
// authors is `depends: [a, b]`. Inline FLOW MAPS `{ … }` are deliberately NOT
// parsed (18/ADR-007): routing intent lives in the per-folder `.integrations.json`
// descriptor, never milestone frontmatter, so this shared seam (the 14-importer
// god-node's parser) parses nothing brace-wrapped into an object.
export function parseFrontmatter(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return {};
  const out = {};
  for (const line of block[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    out[kv[1]] = parseScalarOrCollection(kv[2].trim());
  }
  return out;
}

// One frontmatter value: an inline list `[a, b]` or a quoted scalar. Nested
// collections are not parsed — one level of inline list is all the work stream
// authors. Inline FLOW MAPS `{ … }` are NOT parsed into an object (18/ADR-007 —
// the prior milestone-18 `notion: { parent: <key> }` extension was REVERTED): a
// brace-wrapped value is not a list, so it falls straight to the final
// quote-strip return and round-trips as its VERBATIM string (braces retained),
// routing nothing. This keeps the shared 14-importer seam minimal and de-risked.
function parseScalarOrCollection(value) {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => part.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, "");
}

// One item's frontmatter, with the OPTIONAL view's overlay applied on top (ADR-005).
// Two shapes, and the difference matters:
//   · an item this node HAS on disk keeps its own frontmatter — `depends`, `created`,
//     everything — and the overlay replaces only the facts it carries (status/title). A
//     cache-authoritative status must never cost the driver its own `depends`, or a
//     migrated `next` would stop honouring gates it can read perfectly well.
//   · an item this node does NOT have (`dir == null` — a ref only the cache knows) has no
//     frontmatter to read, so the overlay IS the answer. No path is fabricated to go
//     looking for one.
export async function readItemMeta(item, view) {
  const overlay = view?.meta?.get?.(item.ref);
  if (item.dir == null) return overlay ?? {};
  const doc = recordDoc(item);
  if (!doc) return overlay ?? {};
  let meta = {};
  try {
    meta = parseFrontmatter(await readFile(path.join(item.dir, doc), "utf8"));
  } catch {
    meta = {};
  }
  return overlay == null ? meta : { ...meta, ...overlay };
}

// -------------------------------------------------------- version model ----

// The current work-item record-doc schema (ADR-001, milestone 40) — the ONE
// exported integer constant declaring "the current document shape", mirroring
// GLOBAL_WORK_SCHEMA_VERSION's single-constant idiom (global-work-store.mjs:7).
// It lives HERE (not in a later registry module) because the reader/born-stamp
// (story 01) must consume it before the migration registry (story 02) exists.
// Bump this — and add a registered transform reaching it — when a migration
// changes the document shape.
export const WORK_ITEM_SCHEMA_VERSION = 1;

// Coerce a raw frontmatter `schema` scalar to a non-negative integer: a
// missing key or a non-numeric string reads as the pre-versioning baseline 0
// (ADR-003), mirroring readSchemaVersion's null/absent -> 0 treatment
// (global-work-store.mjs:80-87, parseInt + isFinite). Deliberately NOT clamped
// to WORK_ITEM_SCHEMA_VERSION: an item stamped AHEAD (schema: 2) must read 2,
// faithfully — story 03's staleness check depends on comparing the item's OWN
// schema against the current constant, not a clamped value.
export function coerceSchemaVersion(raw) {
  if (raw === undefined || raw === null || raw === "") return 0;
  const version = Number.parseInt(String(raw), 10);
  // Non-negative by contract: a NaN or a malformed negative (never produced by
  // the born-stamp or a genuine older aof) both read as the baseline 0.
  return Number.isFinite(version) && version >= 0 ? version : 0;
}

// The version READER (ADR-001/ADR-003) — the public seam over readMeta's
// frontmatter read (the core compatibility surface keeps it private; `aof work list
// --json`'s 7-field shape is frozen and does not surface `schema`). Neither
// function widens `parseFrontmatter` (18/ADR-007 protected) — both keys
// already parse as raw scalars; the int coercion lives here, in the reader,
// not the shared parser.
//
// readItemSchema resolves the item's `schema` key to a non-negative integer
// (missing/non-integer -> the baseline 0).
export async function readItemSchema(item) {
  const meta = await readItemMeta(item);
  return coerceSchemaVersion(meta.schema);
}

// readItemVersion resolves the item's `aofVersion` key to a plain provenance
// STRING — never coerced to a number, never parsed for logic. Missing ->
// empty string (there is no numeric "baseline" concept for provenance).
export async function readItemVersion(item) {
  const meta = await readItemMeta(item);
  return typeof meta.aofVersion === "string" ? meta.aofVersion : "";
}

// ------------------------------------------------------ status lifecycle ----

// The lifecycle TABLE is not here: it lives in acceptance-horizon.mjs, beside the frozen
// five words whose keys it is (ADR-009/F — a second spelling of the vocabulary is a second
// home for it). THIS module is the item-frontmatter AUTHORITY: it owns the two guarded write
// faces below and the one surgical write they share, and it can never permit a move the
// imported table does not declare.

// The DOCUMENT's own fault code, raised by the one surgical writer below and shared by
// both faces (74/01). It is deliberately NOT either face's refusal: a caller that treats
// its own refusal as a sanctioned no-op must not thereby swallow a malformed record doc.
// Module-local, like ROLLBACK_TARGETS below — the code reaches callers as the thrown
// error's `code`, which is the channel every other refusal in this file already uses.
const RECORD_DOC_UNUSABLE = "record-doc-unusable";

// The legal rollback TARGETS (20/ADR-005): from in-progress, a transient reclaim
// rolls to not-started (the PRD's `in_progress → todo` map — re-offered by next); a
// genuine blocker rolls to blocked. Rolling FORWARD (→ in-review / → done) is the one
// move a failure/blocker rollback must never make (it would falsely accept un-done work).
const ROLLBACK_TARGETS = new Set(["not-started", "blocked"]);

// The FIRST programmatic item-frontmatter writer in the codebase (20/ADR-005) —
// work.mjs exported only READERS before this. A bounded status rollback the failed-run
// (work:run-complete --outcome failed) and reclaim (run-store:reclaimStaleRuns) paths
// CALL to leave the stream honest. Bounded HARD: it sets status ONLY from `in-progress`
// to not-started|blocked, NEVER to done/in-review; it touches ONLY the frontmatter
// `status` field (the record-doc body and every other frontmatter key — including
// `updated` — stay byte-identical); and it writes via the atomic fs.mjs:writeText
// temp+rename seam. It lives HERE, not in run-store — the 19/ADR-002 write-scope guard
// forbids the store writing any frontmatter; work.mjs is the item-frontmatter authority.
// `now` is accepted for caller-API symmetry but deliberately NOT written (bumping
// `updated` would violate the "only the status field changes" bound).
export async function rollbackItemStatus(item, toStatus, { now } = {}) { // eslint-disable-line no-unused-vars
  if (!ROLLBACK_TARGETS.has(toStatus)) {
    throw workError(`status rollback target must be not-started|blocked (got "${toStatus}")`, "forbidden-rollback", 400);
  }
  // Rollback fires ONLY from in-progress — the narrow reclaim/failure seam, not a
  // general status mutator. Any other from-state is left byte-unchanged, and
  // `updated` is never bumped (the "only the status field changes" bound).
  const written = await writeItemStatusLine(item, toStatus, {
    from: ["in-progress"],
    code: "rollback-not-applicable",
    notApplicable: (status) => `status rollback applies only from in-progress (item is "${status ?? "none"}")`,
    bumpUpdated: false,
  });
  // The frozen `{ ref, status }` result (20/ADR-005) — the shared writer's `from` is
  // dropped here rather than widening this face's contract: its from-state is a
  // constant (`in-progress`) and callers deep-equal the pair.
  return { ref: written.ref, status: written.status };
}

// setItemStatus(item, toStatus, { expectFrom, now }) — THE lifecycle-guarded item-status
// writer, and the forward half the stream never had. It shares ONE surgical write with
// the rollback face above (so there is still exactly one place that rewrites a status
// line) but takes its permission from ITEM_STATUS_EDGES rather than from the rollback's
// hard not-started|blocked bound. The two faces stay separate on purpose: the failure/
// reclaim path must be PROVABLY unable to write forward (a bug there would falsely accept
// un-done work), and a bound that lives in the general writer's argument list is a bound a
// caller can pass wrong.
//
// `expectFrom` narrows the door for a caller that knows which from-states its act
// legitimately covers — the `run.started` reactor advances only `not-started|blocked`, so
// a stray mint against an item already `in-review` cannot drag it back to the bench.
// Every refusal is CODED and writes nothing:
//   invalid-status              (400) the target is not one of the five lifecycle words
//   status-edge-not-applicable  (409) no legal edge from the item's current status —
//                                     including the self-edge an at-least-once redelivery
//                                     asks for, and an `expectFrom` miss
//   record-doc-unusable         (422) the DOCUMENT cannot carry a status line at all
//                                     (absent/unreadable/no frontmatter) — a fault, never
//                                     this face's refusal (74/01)
// Unlike the rollback face this DOES bump `updated:` (when the key exists), because a
// lifecycle move is a real event in the item's history and `work doctor`'s stale-updated
// check reads that field.
export async function setItemStatus(item, toStatus, { expectFrom = null, now } = {}) {
  if (!VALID_STATUS.has(toStatus)) {
    throw workError(`status must be one of ${[...VALID_STATUS].join("|")} (got "${toStatus}")`, "invalid-status", 400);
  }
  const allowed = expectFrom == null ? null : (Array.isArray(expectFrom) ? expectFrom : [expectFrom]);
  return await writeItemStatusLine(item, toStatus, {
    code: "status-edge-not-applicable",
    from: (status) => itemStatusEdges(status).includes(toStatus) && (allowed == null || allowed.includes(status)),
    notApplicable: (status) => {
      if (allowed != null && !allowed.includes(status)) {
        return `item ${item.ref} is "${status ?? "none"}" — this act moves an item to "${toStatus}" only from ${allowed.join("|")}`;
      }
      const edges = itemStatusEdges(status);
      return edges.length === 0
        ? `item ${item.ref} is "${status ?? "none"}" — it has no legal status move (asked for "${toStatus}")`
        : `item ${item.ref} is "${status ?? "none"}" — its legal moves are ${edges.join("|")} (asked for "${toStatus}")`;
    },
    bumpUpdated: true,
    now,
  });
}

// The ONE surgical status write both faces above share: read the record doc, check the
// from-state through the caller's own predicate, and replace ONLY the status line WITHIN
// the frontmatter block (plus `updated`, for the lifecycle face) — the body and every
// other key are reassembled byte-for-byte around it, via the atomic fs.mjs:writeText
// temp+rename seam. An item whose frontmatter carries no `status:` line at all cannot
// reach the write: a missing status has no legal from-state under either face's
// predicate, so it is refused rather than answered with a successful no-write.
//
// A DOC-SHAPE FAULT IS THE DOCUMENT'S, NOT THE TRANSITION'S (74/01, finding F-73-G). The
// three faults below — no record doc, unreadable, no frontmatter block — used to be thrown
// under the CALLER's code, so on the forward face a malformed record doc arrived as
// `status-edge-not-applicable` and on the rollback face as `rollback-not-applicable`. Both
// of those are their caller's SANCTIONED no-op (effects/table.mjs's two reactors), so the
// fault was absorbed as ordinary idempotence and never surfaced: a mint against an item
// whose STORY.md opens with the known `<!-- aof-generated: bundle -->` comment reported
// `{ skipped: true }` and moved nothing, forever. They raise `record-doc-unusable` instead
// — one code, from the one place that detects the fault, which fixes both faces at once and
// leaves each caller's own refusal vocabulary untouched.
async function writeItemStatusLine(item, toStatus, { from, code, notApplicable, bumpUpdated, now }) {
  const doc = recordDoc(item);
  if (!doc) {
    throw workError(`item ${item.ref} carries no record doc, so it has no status line to move`, RECORD_DOC_UNUSABLE, 422);
  }
  const docPath = path.join(item.dir, doc);
  let text;
  try {
    text = await readFile(docPath, "utf8");
  } catch {
    throw workError(`item ${item.ref}: its record doc ${doc} is absent or unreadable`, RECORD_DOC_UNUSABLE, 422);
  }
  const block = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!block) {
    // The frontmatter fence must be the FIRST line. The hand-authored trap worth naming by
    // itself is a doc whose fence is displaced by a LEADING COMMENT (the known
    // `<!-- aof-generated: bundle -->` copied off a template) or blank lines: its
    // frontmatter parses as nothing, which reads as "this item has no status" everywhere.
    // Bounded to exactly that shape — a `---` rule inside an ordinary body is not a
    // displaced fence, and must not be described as one.
    // Each alternative consumes at least one character, so the scan cannot loop on empty.
    const preamble = text.match(/^(?:\s|<!--[\s\S]*?-->)*/)[0];
    const displaced = preamble.length > 0 && /^---\r?\n/.test(text.slice(preamble.length));
    throw workError(
      displaced
        ? `item ${item.ref}: its record doc ${doc} opens with something before the frontmatter fence — the \`---\` must be the first line`
        : `item ${item.ref}: its record doc ${doc} has no frontmatter block`,
      RECORD_DOC_UNUSABLE,
      422,
    );
  }
  const status = parseFrontmatter(text).status;
  const permitted = typeof from === "function" ? from(status) : from.includes(status);
  if (!permitted) {
    const error = workError(notApplicable(status), code, 409);
    // The writer has just read the authoritative record doc. Carry that observed
    // state on a refusal so an idempotent command does not report the cache-first
    // resolver's older opinion as if it were the disk value that rejected the edge.
    error.detail = { status: status ?? null };
    throw error;
  }
  let rewritten = block[2].replace(/^(status:[ \t]*).*$/m, `$1${toStatus}`);
  if (bumpUpdated) rewritten = rewritten.replace(/^(updated:[ \t]*).*$/m, `$1${today(now)}`);
  const updated = block[1] + rewritten + block[3] + text.slice(block[0].length);
  await writeText(docPath, updated);
  return { ref: item.ref, status: toStatus, from: status ?? null };
}

// The record docs stamp DATES (`updated: 2026-06-30`), not timestamps — so an injected
// `now` (the established ISO-8601 test clock) is truncated to its date part rather than
// written whole, which would change the field's shape.
function today(now) {
  const iso = typeof now === "string" && now.length > 0 ? now : new Date().toISOString();
  return iso.slice(0, 10);
}

// ------------------------------------------------- frontmatter transforms --

// The transform-scoped frontmatter WRITER (ADR-004, milestone 40) — a SEPARATE
// export from rollbackItemStatus above, NOT a widening of it. rollbackItemStatus
// keeps its hard status-only, in-progress-> not-started|blocked bound untouched;
// this writer is the broader primitive a registered migration transform (story
// 02) calls to add/rename/re-value ANY frontmatter key.
//
// `mutate` receives the RAW inner frontmatter block text (the bytes between the
// `---` fences, exclusive) and returns the new raw block text — the SAME
// block-capture + slice idiom rollbackItemStatus uses above (`block[2]`
// in/out), never a parseFrontmatter+reserialize round-trip (that shared
// 14-importer parser drops comments/order/formatting — 18/ADR-007). The body —
// every byte after the closing `---` fence — and everything before the opening
// fence are reassembled byte-for-byte around the mutated block. `mutate` may be
// sync or async. Persists via the atomic fs.mjs:writeText temp+rename seam.
//
// It runs ONLY as the primitive a registered transform calls — it is not a
// public "edit any frontmatter" verb in its own right.
export async function applyItemFrontmatter(item, mutate) {
  const doc = recordDoc(item);
  if (!doc) {
    throw workError(`item ${item.ref} has no record doc to update`, "frontmatter-not-applicable", 409);
  }
  const docPath = path.join(item.dir, doc);
  let text;
  try {
    text = await readFile(docPath, "utf8");
  } catch {
    throw workError(`item ${item.ref} record doc is unreadable`, "frontmatter-not-applicable", 409);
  }
  const block = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!block) {
    throw workError(`item ${item.ref} record doc has no frontmatter`, "frontmatter-not-applicable", 409);
  }
  const rewrittenFrontmatter = await mutate(block[2]);
  // Reassembled byte-for-byte around the mutated block: the opening fence
  // (`block[1]`), the new block, the closing fence (`block[3]`), and every
  // byte of the body (`text.slice(block[0].length)`) are untouched by anything
  // other than the mutate callback itself.
  const updated = block[1] + rewrittenFrontmatter + block[3] + text.slice(block[0].length);
  await writeText(docPath, updated);
  return { ref: item.ref, doc };
}
