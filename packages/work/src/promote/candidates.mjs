import path from "node:path";
import { readFile } from "node:fs/promises";
import { parseFrontmatter, recordDoc } from "../records.mjs";
import { asList, isDependNumber, isDependTarget } from "../dependencies.mjs";
import { byGroupThenSlug } from "../discovery.mjs";

// Story 152 — WHICH BACKLOG ITEMS CAN BE PROMOTED NOW, AND IN WHAT ORDER.
//
// `aof work promote <slug>` gates on `depends:` (ADR-003 §6) through `classifyDepends`, but only
// after the operator has named an item. This leaf owns that gate, so the named promote and
// `--show-candidates` / `--next-item` ask ONE rule: a candidate is exactly a backlog row the gate
// accepts, never a second copy of it.
//
// A LEAF, like the rest of the promote family (FF-7104 leg 4): it imports nothing from
// `../commands/`, and it never enumerates the work tree: from discovery it takes only the backlog
// listing's comparator (`byGroupThenSlug`, group path then slug, code-point `<` — never
// `localeCompare`), the final tie-break of the order. Its caller hands it `items` from
// `listItems`, so the disk-read pin on `promoteRow` (`acd-cache-read-surface-boundary`) stays the
// only structural read in this verb.

const sameNum = (a, b) => Number.parseInt(a, 10) === Number.parseInt(b, 10);

// ADR-003 §6 — promotion is where a backlog item's `depends:` is checked as a gate on entering the
// stream. Entries are read as `parseFrontmatter` hands them (quotes and surrounding spaces
// stripped, an empty entry dropped, a duplicate kept), split into number and slug by the one
// predicate (`isDependNumber`, story 139), and checked against the PRE-shift stream: the operator
// wrote them against the numbers that exist now, and the engine's own rewrite carries them
// across a shift.
//
//   · an all-digit entry must name a NUMBERED top-level item `isDependTarget` admits — LIVE OR
//     ARCHIVED. An archived target is satisfied, not missing (ADR-002 §3: the archive is a
//     location, not a status), and `sameNum` makes `5` and `05` one number. A target that is in
//     the stream but not done does not block (152 Q1).
//   · an entry naming a BACKLOG slug (exact, case-sensitive — a slug is lowercase by grammar) is
//     `promote-depends-backlog`: the item waits on work that has not entered the stream, so it
//     cannot enter ahead of it. Promoting that target rewrites this entry to its minted number
//     (`resolveBacklogEdges` in commands/promote.mjs), which is what clears the gate.
//   · anything else is `promote-depends-unresolved`.
//
// EVERY offending entry comes back, in the order written, so the operator fixes the note once.
export function classifyDepends(entries, items) {
  const targets = items.filter((item) => item.number != null && item.parent == null && isDependTarget(item));
  const backlogSlugs = new Set(items.filter((item) => item.number == null).map((item) => item.slug));
  const offenders = [];
  for (const raw of entries) {
    const entry = String(raw);
    if (isDependNumber(entry)) {
      if (!targets.some((item) => sameNum(item.number, entry))) {
        offenders.push({ entry, code: "promote-depends-unresolved" });
      }
      continue;
    }
    offenders.push({ entry, code: backlogSlugs.has(entry) ? "promote-depends-backlog" : "promote-depends-unresolved" });
  }
  return offenders;
}

// The record doc's text, or "" when the row has none or it cannot be read — the same reading
// `promoteRow` step (1) does, so an unreadable doc has no `depends:` here either.
async function readRecordDoc(row) {
  const doc = recordDoc(row);
  if (doc == null || row.dir == null) return "";
  try {
    return await readFile(path.join(row.dir, doc), "utf8");
  } catch {
    return "";
  }
}

// 152 Q2 — most unblocked first, then oldest `created:` (a row with none after every dated one),
// then the backlog listing's order.
function byPromotionOrder(a, b) {
  if (a.unblocks !== b.unblocks) return b.unblocks - a.unblocks;
  if (a.created !== b.created) {
    if (a.created == null) return 1;
    if (b.created == null) return -1;
    return a.created < b.created ? -1 : 1;
  }
  return byGroupThenSlug(a, b);
}

// 152 Q6 — "unblocks" counts every backlog row that waits on the candidate, directly or through
// another backlog row. An edge runs from a backlog row to each backlog row whose `depends:` names
// its slug, and only when that slug is unique in the backlog: the bound `resolveBacklogEdges`
// rewires by, so a shared slug is an edge to nothing here as it is there. A visited set makes a
// cycle terminate, and the row itself is never counted.
function unblockCounts(rows) {
  const bySlug = new Map();
  for (const row of rows) bySlug.set(row.slug, bySlug.has(row.slug) ? null : row);
  const dependents = new Map(rows.map((row) => [row, []]));
  for (const row of rows) {
    for (const entry of row.depends) {
      const target = bySlug.get(entry);
      if (target != null && target !== row) dependents.get(target).push(row);
    }
  }
  const counts = new Map();
  for (const row of rows) {
    const seen = new Set([row]);
    const queue = [row];
    while (queue.length > 0) {
      for (const next of dependents.get(queue.shift())) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    counts.set(row, seen.size - 1);
  }
  return counts;
}

// promotionCandidates(items, readDoc) → { candidates, waiting }. Every backlog row of `items` is
// put to `classifyDepends`: one with no offenders is a candidate, the rest wait on their offenders
// (`waitsOn`, the gate's own `{ entry, code }`, in the order written). Candidates come in
// promotion order; waiting rows in the backlog listing's order. Reads each backlog record doc and
// writes nothing.
export async function promotionCandidates(items, readDoc = readRecordDoc) {
  const rows = [];
  for (const item of items.filter((row) => row.number == null)) {
    const meta = parseFrontmatter(await readDoc(item));
    const created = meta.created == null || meta.created === "" ? null : String(meta.created);
    rows.push({ item, slug: item.slug, backlog: item.backlog ?? "", created, depends: asList(meta.depends).map(String) });
  }
  const counts = unblockCounts(rows);
  const candidates = [];
  const waiting = [];
  for (const row of rows) {
    const base = { ref: row.item.ref, type: row.item.type, slug: row.slug, backlog: row.backlog, created: row.created, dir: row.item.dir };
    const offenders = classifyDepends(row.depends, items);
    if (offenders.length === 0) candidates.push({ ...base, unblocks: counts.get(row) });
    else waiting.push({ ...base, waitsOn: offenders });
  }
  return { candidates: candidates.sort(byPromotionOrder), waiting: waiting.sort(byGroupThenSlug) };
}
