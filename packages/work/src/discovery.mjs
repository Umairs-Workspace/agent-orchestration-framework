// Directory-derived work items and read models. Callers supply paths and optional views.
import path from "node:path";
import { createHash } from "node:crypto";
import { watch as fsWatch } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { ITEM_RE, BACKLOG_ITEM_RE, BACKLOG_ROOT, ARCHIVE_ROOT, parseStorySpan, sameNumber as sameNum } from "./identity.mjs";
import { readItemMeta as readMeta, parseFrontmatter, recordDoc } from "./records.mjs";

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

// ------------------------------------------------------- the stat digest ----

// workTreeStatDigest(workDir, { reportDegrade }) — THE ONE FINGERPRINT of a work tree (167/ADR-003,
// moved verbatim from the publisher's stat gate, 164/ADR-002): a digest of (path, size, mtimeMs) over
// the tree's record docs and task features. It only decides whether to LOOK; a decision is always
// made over what is then read. An unreadable tree has no digest (null), reported once under the stat
// gate's own code. The sync pass and the stream memo below both ask this, so "has this tree
// changed" has one answer.
export async function workTreeStatDigest(workDir, { reportDegrade } = {}) {
  return (await statWorkTree(workDir, { reportDegrade })).digest;
}

// ------------------------------------------------------- the watched walk ----

// 167/ADR-009 — the daemon WATCHES each work tree it syncs, so an unchanged watched tree costs no stat
// walk. ONE watch set per process, created only by `mesh serve`'s launcher: `retain(workDirs)` arms
// a recursive watch for each new dir and closes the ones it no longer names; `close()` drops them
// all, and `arm(workDirs)` adds watches without closing any (the tick arms before it walks). A watched tree is answered from its last complete walk until a watch event dirties it, or the
// walk is `safetyMs` old (5 minutes). A tree whose watch cannot start, or errors later, is walked on
// every ask as before, said once (`work-tree-watch-unavailable`), and not armed again in this
// process. Every real walk in a process holding a watch set is counted as `stat-walk`, labelled
// `unwatched`, `first`, `changed` or `safety`. A process with no watch set walks, uncounted, as
// ADR-003 says.
let treeWatches = null;

export function createWorkTreeWatches({ watch = fsWatch, now = () => Date.now(), safetyMs = 5 * 60 * 1000, meter = null, reportDegrade } = {}) {
  treeWatches?.close();
  const entries = new Map(); // resolved workDir → { watcher, dirty, last, walkedAt, flight }
  const failed = new Set();
  const drop = (key, error) => {
    const entry = entries.get(key);
    entries.delete(key);
    entry?.watcher?.close();
    if (!failed.has(key)) {
      failed.add(key);
      reportDegrade?.("work-tree-watch-unavailable", error, { path: key });
    }
  };
  const arm = (key) => {
    const entry = { watcher: null, dirty: true, last: null, walkedAt: 0, flight: null };
    try {
      entry.watcher = watch(key, { recursive: true }, (_event, name) => {
        if (!recordEventIgnored(name)) entry.dirty = true;
      });
      entry.watcher.on?.("error", (error) => { if (entries.get(key) === entry) drop(key, error); });
      entries.set(key, entry);
    } catch (error) {
      drop(key, error);
    }
  };
  const handle = {
    now,
    safetyMs,
    meter,
    entries,
    retain(workDirs) {
      const keep = new Set([...workDirs].filter((dir) => typeof dir === "string" && dir).map((dir) => path.resolve(dir)));
      for (const key of [...entries.keys()]) {
        if (keep.has(key)) continue;
        entries.get(key).watcher?.close();
        entries.delete(key);
      }
      for (const key of keep) if (!entries.has(key) && !failed.has(key)) arm(key);
    },
    arm(workDirs) {
      for (const dir of workDirs) {
        if (typeof dir !== "string" || !dir) continue;
        const key = path.resolve(dir);
        if (!entries.has(key) && !failed.has(key)) arm(key);
      }
    },
    held: () => [...entries.keys()],
    close() {
      for (const entry of entries.values()) {
        entry.watcher?.close();
      }
      entries.clear();
      if (treeWatches === handle) treeWatches = null;
    },
  };
  treeWatches = handle;
  return handle;
}

// An event names nothing a walk would see when its file has an extension other than a record doc's: a
// run record, a log, a lock. A folder, a record doc or an event with no name is a change (01/R1: the
// tree's shape is part of the memo's key).
function recordEventIgnored(name) {
  if (name == null) return false;
  const ext = path.extname(String(name)).toLowerCase();
  return ext !== "" && ext !== ".md" && ext !== ".feature";
}

// statWorkTree(workDir) → { digest, shape, complete } — the gate over the one walk. The `statFile`
// test seam always walks.
async function statWorkTree(workDir, { reportDegrade, statFile } = {}) {
  const watches = treeWatches;
  if (watches == null || statFile) return walkWorkTree(workDir, { reportDegrade, statFile });
  const key = path.resolve(workDir);
  const entry = watches.entries.get(key);
  if (entry == null) {
    watches.meter?.count?.("stat-walk", { code: "unwatched" });
    return walkWorkTree(workDir, { reportDegrade });
  }
  if (entry.flight) return entry.flight;
  if (!entry.dirty && entry.last && watches.now() - entry.walkedAt < watches.safetyMs) return entry.last;
  const code = entry.last == null ? "first" : entry.dirty ? "changed" : "safety";
  watches.meter?.count?.("stat-walk", { code });
  // Cleared as the walk STARTS: an event during the walk dirties the tree again.
  entry.dirty = false;
  const startedAt = watches.now();
  entry.flight = walkWorkTree(workDir, { reportDegrade }).then((result) => {
    entry.flight = null;
    const remembered = result.digest != null && result.complete;
    entry.last = remembered ? result : null;
    entry.walkedAt = startedAt;
    if (!remembered) entry.dirty = true;
    return result;
  }, (error) => {
    entry.flight = null;
    entry.dirty = true;
    throw error;
  });
  return entry.flight;
}

// walkWorkTree(workDir) → { digest, complete } — `complete` is false when a file listed by the walk
// was gone before it could be stat'ed: the digest still answers the stat gate exactly as before, but
// a memo keyed by it would remember a tree that was moving under the walk.
async function walkWorkTree(workDir, { reportDegrade, statFile = stat } = {}) {
  let entries;
  try {
    entries = await readdir(workDir, { recursive: true, withFileTypes: true });
  } catch (error) {
    reportDegrade?.("sync-stat-digest", error, { path: workDir });
    return { digest: null, shape: null, complete: false };
  }
  // Stats run concurrently: measured on this repository's ~3,200 record files, serial awaits
  // cost ~540ms per command and concurrent ones ~240ms.
  const files = entries.filter((entry) => entry.isFile() && /\.(md|feature)$/i.test(entry.name))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
  let complete = true;
  const lines = await Promise.all(files.map(async (full) => {
    const rel = path.relative(workDir, full).split(path.sep).join("/");
    try {
      const info = await statFile(full);
      return `${rel}\0${info.size}\0${info.mtimeMs}`;
    } catch {
      complete = false;
      return `${rel}\0gone`;
    }
  }));
  // The tree's SHAPE — its directories — is not part of the stat gate's digest (164/ADR-002, kept
  // byte-identical), but a folder made or renamed with no record doc in it changes what the enumerator
  // answers, so the memo keys on both.
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => path.relative(workDir, path.join(entry.parentPath ?? entry.path, entry.name)).split(path.sep).join("/"));
  const shape = createHash("sha256").update(dirs.sort().join("\n")).digest("hex");
  return { digest: createHash("sha256").update(lines.sort().join("\n")).digest("hex"), shape, complete };
}

// --------------------------------------------------- the remembered stream ----

// readStreamSnapshot(workDir, { meter, labels, reportDegrade }) → { digest, items, frontmatter, record, fromMemo }
//
// 167/ADR-003 — a read of an UNCHANGED work tree costs one stat walk. Every daemon tick and every
// viewer poll used to re-enumerate the tree and re-parse each record doc it touched, even when
// nobody had edited it. This remembers, per resolved work dir, the enumeration and every record doc
// parsed under it, keyed by the stat digest:
//   · a read whose digest equals the remembered one parses nothing (`fromMemo`), and is counted as
//     a `cache-hit` labelled `code: memo`;
//   · a read whose digest moved, or the first read, enumerates again and is a `full-disk-read`;
//   · record docs are parsed LAZILY and once per entry (`record(item)` / `frontmatter(item)`), so a
//     miss parses exactly the docs its caller touches, as before, and a hit parses none;
//   · a tree that cannot be fingerprinted — a doc vanished mid-walk — is read from disk and NOT
//     remembered; a work dir that cannot be listed REJECTS, and a rejection is never remembered.
// SINGLE-FLIGHT: callers that ask for one tree at the same moment share one walk (and one parse per
// doc). Bounded: one entry per resolved work dir, replaced whenever its digest changes. The meter
// and the workspace label are the caller's, since discovery knows no workspace ids.
const streamMemo = new Map(); // resolved workDir → { digest, items, records }
const streamInFlight = new Map(); // resolved workDir → Promise<{ entry, fromMemo }>
const STREAM_MEMO_LIMIT = 256;

// `statFile` is a test seam over the digest's per-file stat (a doc that vanishes mid-walk).
export async function readStreamSnapshot(workDir, { meter = null, labels = {}, reportDegrade, statFile } = {}) {
  const key = path.resolve(workDir);
  let flight = streamInFlight.get(key);
  if (flight == null) {
    flight = snapshotFlight(key, workDir, { meter, labels, reportDegrade, statFile });
    streamInFlight.set(key, flight);
    flight.then(() => streamInFlight.delete(key), () => streamInFlight.delete(key));
  }
  const { entry, fromMemo } = await flight;
  return { digest: entry.digest, items: entry.items, fromMemo, record: (item) => entryRecord(entry, item), frontmatter: async (item) => ({ ...(await entryRecord(entry, item)).meta }) };
}

async function snapshotFlight(key, workDir, { meter, labels, reportDegrade, statFile }) {
  // The stream-level probe the enumerator cannot make: it answers a missing dir with `[]`, so the
  // snapshot asks the directory itself whether it is there, and a failure reaches every caller.
  await readdir(workDir);
  const { digest, shape, complete } = await statWorkTree(workDir, { reportDegrade, ...(statFile ? { statFile } : {}) });
  const remembered = streamMemo.get(key);
  if (digest != null && complete && remembered?.digest === digest && remembered.shape === shape) {
    meter?.count?.("cache-hit", { ...labels, code: "memo" });
    return { entry: remembered, fromMemo: true };
  }
  const entry = { digest, shape, items: await listItems(workDir), records: new Map() };
  meter?.count?.("full-disk-read", labels);
  if (digest != null && complete) {
    streamMemo.delete(key);
    streamMemo.set(key, entry);
    // One entry per registered workspace in a daemon; a process that reads many trees keeps the newest.
    if (streamMemo.size > STREAM_MEMO_LIMIT) streamMemo.delete(streamMemo.keys().next().value);
  }
  else streamMemo.delete(key);
  return { entry, fromMemo: false };
}

// One item's record doc under an entry, parsed once: `{ doc, meta, fault }`. `fault` is null on a
// clean parse, `{ kind: "unparseable" }` for a doc with no frontmatter block, and `{ kind: "read",
// message, code }` when the doc could not be read — `meta` is then `{}`, exactly as readItemMeta has
// always answered it.
function entryRecord(entry, item) {
  const id = item.dir ?? `ref:${item.ref}`;
  let pending = entry.records.get(id);
  if (pending == null) {
    pending = readRecord(item);
    entry.records.set(id, pending);
  }
  return pending;
}

async function readRecord(item) {
  const doc = item.dir == null ? null : recordDoc(item);
  if (!doc) return { doc: null, meta: {}, fault: null };
  try {
    const text = await readFile(path.join(item.dir, doc), "utf8");
    const fault = /^---\r?\n[\s\S]*?\r?\n---/.test(text) ? null : { kind: "unparseable" };
    return { doc, meta: parseFrontmatter(text), fault };
  } catch (error) {
    return { doc, meta: {}, fault: { kind: "read", message: error.message, code: error.code ?? null } };
  }
}
