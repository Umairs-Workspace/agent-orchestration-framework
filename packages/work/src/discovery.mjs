// Directory-derived work items and read models. Callers supply paths and optional views.
import path from "node:path";
import { readdir } from "node:fs/promises";
import { ITEM_RE, BACKLOG_ITEM_RE, BACKLOG_ROOT, ARCHIVE_ROOT, parseStorySpan, sameNumber as sameNum } from "./identity.mjs";
import { readItemMeta as readMeta } from "./records.mjs";

export async function readWorkDirectory(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

// ------------------------------------------------------------ discovery ----

// THE OPTIONAL STREAM VIEW (milestone 43 / ADR-005) — the ONE seam through which the
// cache-first read module (`src/work/read.mjs`) reuses the four readers below instead of
// re-deriving their rules.
//
// `view` is PLAIN DATA built OUTSIDE this module — `{ items, meta }`, where `items` is a
// pre-built `listItems` set (the disk's items plus any the cache alone knows) and `meta` is
// a `Map<ref, { status?, title? }>` OVERLAY applied on top of each item's own frontmatter.
// This module imports NO cache module, opens no store and learns no wire vocabulary: the
// seam needs the readers, not the reverse (m41/ADR-001, reused verbatim — `work.mjs` is the
// 37-importer god-node and its blast radius must not grow). The `candidacyView` parameter
// on `nextWork` is the same device from milestone 26/ADR-005, and this is deliberately its
// twin rather than a second mechanism.
//
// ABSENT ⇒ BYTE-IDENTICAL. Every reader below behaves exactly as it did before this
// milestone when no view is passed, which is what the 37 unmigrated importers rely on and
// what 43/06 task 03 asserts behaviourally.

// ONE NUMBERED ROOT, walked flat with ITEM_RE — the stream root and (127/ADR-001 §4) the
// archive share this walk verbatim: a milestone's `stories/` is descended one level, nothing
// else is, and the row is `{ number, type, slug, name, dir, ref, parent }` in that order.
// `stamp` is the only thing the two roots differ by: `{}` at the root, so the row is
// byte-identical to what every reader froze before milestone 127, and `{ archived: true }`
// under the archive, where the location adds one flag and changes nothing else.
async function walkNumberedRoot(root, items, stamp) {
  for (const entry of await readWorkDirectory(root)) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(ITEM_RE);
    if (!match) continue;
    const [, number, type, slug] = match;
    const dir = path.join(root, entry.name);
    items.push({ number, type, slug, name: entry.name, dir, ref: number, parent: null, ...stamp });

    if (type === "milestone") {
      const storiesDir = path.join(dir, "stories");
      for (const child of await readWorkDirectory(storiesDir)) {
        if (!child.isDirectory()) continue;
        const sub = child.name.match(ITEM_RE);
        if (!sub) continue;
        const [, sNumber, sType, sSlug] = sub;
        items.push({
          number: sNumber,
          type: sType,
          slug: sSlug,
          name: child.name,
          dir: path.join(storiesDir, child.name),
          ref: `${number}/${sNumber}`,
          parent: number,
          ...stamp,
        });
      }
    }
  }
}

// THE BACKLOG WALK (127/ADR-001 §2) — recursive, and the type is in the folder name so no
// record doc is ever opened to classify. A directory that does NOT match the leaf grammar is
// a GROUP and is descended into; one that matches is a LEAF and is not (a backlog driver has
// no `stories/`, ADR-005 §4 — `promote` is the door into the stream, and a `stories/` under a
// leaf is doctor's orphan lane's to report). A group carries no semantics: it is the path
// shown in listings, forward-slashed on every platform so `--json` is byte-stable, `""` at
// the top. The row keeps the enumerator's seven keys — `number: null`, `ref: slug`,
// `parent: null` — and adds `backlog` and nothing else.
async function walkBacklogGroup(dir, group, items) {
  for (const entry of await readWorkDirectory(dir)) {
    if (!entry.isDirectory()) continue;
    const leaf = entry.name.match(BACKLOG_ITEM_RE);
    const child = path.join(dir, entry.name);
    if (!leaf) {
      await walkBacklogGroup(child, group === "" ? entry.name : `${group}/${entry.name}`, items);
      continue;
    }
    const [, type, slug] = leaf;
    items.push({ number: null, type, slug, name: entry.name, dir: child, ref: slug, parent: null, backlog: group });
  }
}

// Enumerate items by folder name only — no file reads. With a `view`, the pre-built item
// set REPLACES the disk scan (the view's builder has already done it, plus the merge).
//
// milestone 127 / ADR-001 §1 — THREE ROOTS, ONE FUNCTION, in this order: `<workDir>` (the
// live stream, rows byte-identical to before), `<workDir>/backlog/**` (un-numbered, grouped),
// `<workDir>/archive/` (numbered, out — flat, `ITEM_RE`, every row `archived: true`). Each root
// is walked only when it is a directory (`readWorkDirectory` answers `[]` for anything else), so a
// project with neither is byte-identical to today. This is the ONLY enumerator: a
// `listBacklog` beside it would be the third scanner ADR-001 exists to retire.
export async function listItems(workDir, { view } = {}) {
  if (Array.isArray(view?.items)) return view.items;
  const items = [];
  await walkNumberedRoot(workDir, items, {});
  // The root walk is total over whatever `readdir` refuses (a non-path, an absent dir — both
  // enumerate nothing), and the two sub-roots keep that contract: `path.join` throws on a
  // non-string where the walk used to answer `[]`, so the join is skipped rather than risked.
  const subRoot = (name) => (typeof workDir === "string" ? path.join(workDir, name) : null);
  await walkBacklogGroup(subRoot(BACKLOG_ROOT), "", items);
  await walkNumberedRoot(subRoot(ARCHIVE_ROOT), items, { archived: true });
  return items;
}

// THE ONE LIVE-ROW PREDICATE (127/ADR-002 §1) — the only place `number` and `archived` are
// read together as a SCHEDULING question. Defined over ENUMERATOR rows, which always carry
// `number` (null for a backlog row): a row is live when it has a number and is not archived.
// The walkers that answer "what is next" (`nextWork`, `listStream`'s default, `recent`
// through `work:list`) filter through it; the readers that answer "what is this ref"
// (`findWork`, validate, doctor, memory, depends resolution) do NOT — an archived item is
// still resolvable, still a `depends:` target, still validated. `!= null` is loose on
// purpose: `"00"` is a string and row 00 exists, so a truthiness test would drop it.
export function isLiveStreamRow(row) {
  return row.number != null && row.archived !== true;
}

// ----------------------------------------------------------------- find ----

// `query` is a structured ref (`NN`, `NN/SS`), a work-tree folder path, or a free-text slug
// match. Semantic matching slots in at the lexical branch below.
//
// 150 — THE PATH BRANCH. A query holding `/` or `\` that is neither a pair nor a span is a
// folder path, resolved from `cwd` (the operator's shell, by default). A trailing record doc
// (`…/STORY.md`) names its folder. Only an item whose `dir` IS that folder matches: a path to
// a root (`wiki/work/backlog`) or a `stories/` folder answers no row, never every item under
// it. A slug holds no separator, so every query that answered a row before still reaches the
// branch it reached then.
export async function findWork(workDir, query, { view, cwd = process.cwd() } = {}) {
  const items = await listItems(workDir, { view });
  const ref = (query ?? "").trim();
  let matches;

  if (/^\d+$/.test(ref)) {
    // A bare number is the top-level item at that slot — a milestone, a uat
    // session, or an adhoc story/task (numbers are unique among top-level items).
    matches = items.filter((item) => item.parent == null && sameNum(item.number, ref));
  } else {
    const pair = ref.match(/^(\d+)\/(\d+)$/);
    const span = pair ? null : parseStorySpan(ref);
    if (pair) {
      matches = items.filter(
        (item) => item.type === "story" && item.parent && sameNum(item.parent, pair[1]) && sameNum(item.number, pair[2]),
      );
    } else if (span) {
      // Sorted because a span is the one ref form resolving to MANY rows, and the caller
      // driving them needs the milestone walk's order, not the directory listing's.
      matches = items
        .filter((item) => item.type === "story"
          && item.parent
          && sameNum(item.parent, span.driver)
          && Number.parseInt(item.number, 10) >= span.lo
          && Number.parseInt(item.number, 10) <= span.hi)
        .sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));
    } else if (isFolderPathQuery(ref)) {
      const folder = folderOfPath(ref, cwd);
      matches = items.filter((item) => item.dir != null && samePath(path.resolve(cwd, item.dir), folder));
    } else {
      const needle = ref.toLowerCase();
      // `name` is the on-disk FOLDER basename, so a ref only the cache knows has none —
      // and none is fabricated (ADR-010/R6.4). Its `slug` still matches free text.
      matches = items.filter(
        (item) => item.slug.toLowerCase().includes(needle) || (item.name ?? "").toLowerCase().includes(needle),
      );
    }
  }

  const rows = [];
  for (const item of matches) {
    const meta = await readMeta(item, view);
    const row = {
      ref: item.ref,
      type: item.type,
      slug: item.slug,
      status: meta.status ?? null,
      title: meta.title ?? null,
      parent: item.parent,
      dir: item.dir,
    };
    // 127/ADR-002 §3 — a resolving reader does NOT filter on the root: an archived ref still
    // answers, a backlog slug answers through the free-text branch above. The frozen seven
    // keys are widened ONLY on a row from a new root (DESIGN §facts): a live row is
    // byte-identical to before, so no consumer learns a second field name.
    if (item.number == null) {
      row.number = null;
      row.backlog = item.backlog ?? "";
    }
    if (item.archived === true) row.archived = true;
    rows.push(row);
  }
  return rows;
}

// isFolderPathQuery(query) — whether `findWork` reads `query` through THE PATH BRANCH above: it
// holds a separator and is not a story span (`NN/SS` or `NN/SS-TT`). A path answers by folder
// identity (at most one row), so an exact resolver may accept it as it accepts a ref.
export function isFolderPathQuery(query) {
  const ref = (query ?? "").trim();
  return /[\\/]/.test(ref) && parseStorySpan(ref) == null;
}

// Either separator on every platform: no item folder name holds a backslash, so reading one
// as a separator on POSIX loses nothing and lets a Windows-typed path resolve there too.
function folderOfPath(query, cwd) {
  const target = path.resolve(cwd, query.replaceAll("\\", "/"));
  return /\.md$/i.test(target) ? path.dirname(target) : target;
}

const samePath = process.platform === "win32"
  ? (a, b) => a.toLowerCase() === b.toLowerCase()
  : (a, b) => a === b;

// ----------------------------------------------------------------- list ----

// The board's read model: the WHOLE stream serialised as a flat array, one
// element per `listItems` item, each carrying exactly the seven frozen contract
// fields `{ ref, type, slug, status, title, parent, dir }` (ARCHITECTURE
// ADR-002). Flat-with-`parent` — `parent` is the only tree edge (null at
// depth 0); the consumer (the board) derives the hierarchy from it.
//
// Order is deterministic depth-first preorder: top-level items sorted by number
// ascending, each milestone immediately followed by its stories sorted by
// number. `dir` is the absolute item directory, forward-slashed (the
// lock-manifest path convention) so the JSON is byte-stable across OSes.
//
// This is the single source of the `aof work list --json` contract; the board
// API (story 01) reuses it. Keep it a thin pass over `listItems` — no new
// traversal, no convenience fields.
//
// milestone 127 / ADR-002 §2, §5 — THE DEFAULT LISTING IS THE LIVE ROWS PLUS THE BACKLOG,
// and `all: true` appends the archive. "What is live" includes what is waiting, so a
// backlog row is in the default view; an archived row is not, and `--all` is the one door
// to it. The order is deterministic so `--json` is byte-stable: live rows as before (by
// number, a milestone followed by its stories), then backlog rows by group path then slug,
// then archived rows by number exactly as the live ones. The live path filters through
// `isLiveStreamRow` — the ONE predicate — rather than re-spelling the rule here.
export async function listStream(workDir, { view, all = false } = {}) {
  const items = await listItems(workDir, { view });

  const live = orderByNumber(items.filter(isLiveStreamRow));
  const backlog = items.filter((item) => item.number == null).sort(byGroupThenSlug);
  // An archived row is a NUMBERED row the predicate refuses — read that way round so the
  // flag is consulted in one place, and the listing cannot drift from the walkers' rule.
  const archived = all ? orderByNumber(items.filter((item) => item.number != null && !isLiveStreamRow(item))) : [];

  const rows = [];
  for (const item of [...live, ...backlog, ...archived]) {
    const meta = await readMeta(item, view);
    const row = {
      ref: item.ref,
      type: item.type,
      slug: item.slug,
      status: meta.status ?? null,
      title: meta.title ?? null,
      parent: item.parent,
      // A ref only the cache knows names a folder that is NOT on this node, so its `dir`
      // is null rather than a plausible-looking path nothing would resolve (ADR-010/R6.4).
      dir: item.dir == null ? null : item.dir.replaceAll("\\", "/"),
    };
    // The frozen seven keys, widened ONLY where the root is new (DESIGN §facts, ADR-006 §1):
    // `number: null` + `backlog` on a backlog row, `archived: true` on an archived one.
    if (item.number == null) {
      row.number = null;
      row.backlog = item.backlog ?? "";
    }
    if (item.archived === true) row.archived = true;
    rows.push(row);
  }
  return rows;
}

// The depth-first preorder over one NUMBERED root's rows: top-level items by number, each
// milestone immediately followed by its stories by number. Applied per root — the live rows
// and the archived rows separately — so a story never attaches to a same-numbered milestone
// across the archive line. Guards its own input: a row with no number is not in this order.
function orderByNumber(rows) {
  const numbered = rows.filter((row) => row.number != null);
  const byNum = (a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10);
  const ordered = [];
  for (const item of numbered.filter((row) => row.parent == null).sort(byNum)) {
    ordered.push(item);
    if (item.type === "milestone") {
      ordered.push(...numbered.filter((child) => child.parent === item.number).sort(byNum));
    }
  }
  return ordered;
}

// Backlog order (127/ADR-002 §5): group path, then slug — compared as PLAIN STRINGS in
// code-point order (`<`, never `localeCompare`), so the listing is byte-identical on every
// OS and locale. `""` (the top of the backlog) sorts before every named group. Exported for
// promote's candidates (story 152), whose final tie-break is this listing's order.
export function byGroupThenSlug(a, b) {
  if (a.backlog !== b.backlog) return a.backlog < b.backlog ? -1 : 1;
  if (a.slug !== b.slug) return a.slug < b.slug ? -1 : 1;
  return 0;
}
