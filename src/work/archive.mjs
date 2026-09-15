// `aof work archive` engine — milestone 127 / ADR-004, story 03. `reindex.mjs`'s twin: the
// stream's OTHER write act, and the one that touches no number.
//
// WHY THE ENGINE LIVES HERE AND NOT IN THE COMMAND (story 03 task 03, ratified at refine). The
// stream seam (`src/effects/stream-transitions.mjs`) imports its fact-writers — `reindexForInsert`
// from beside this file, never a command — and the command imports the seam, so a fact-writer
// inside `src/commands/archive.mjs` would close a cycle. The face resolves, refuses, selects and
// renders; the MOVE and the link rewrite are here, and the seam is the only door onto them
// (`archiveItems`'s one src caller is the seam, asserted by FF-12705 leg (e)).
//
// THE MOVE IS A RENAME, NEVER A COPY: `<workDir>/<name>` → `<workDir>/archive/<name>`, the folder
// name verbatim, `archive/` created on first use. Nothing inside the folder is opened except the
// `.md` files the rewrite pass below reads — the record doc is NOT reserialised, `status:` stays,
// `updated:` is not bumped (archiving is placement, not authorship — 127/02's rule for promotion),
// and no `number:` line is written anywhere (41/ADR-001; FF-12705 legs (c) and (d)).
//
// THE ONE INVARIANT OF THE REWRITE (task 01, sharpening ADR-004 §2 by measurement — 1,868 of the
// tree's 2,192 relative links leave their item folder for `src/`, `ui/`, `planning/`, not for a
// sibling): EVERY RELATIVE LINK RESOLVES TO THE SAME PATH AFTER THE MOVE AS IT DID BEFORE. The
// rewriter is SYNTACTIC and MINIMAL — it matches inline markdown link syntax `](<target>)` and
// nothing else (`number:` is not link syntax, a citation by ref is not link syntax), classifies
// each relative target against the set M of folders moving in THIS run, and edits the link text by
// its shape:
//   (i)   file inside M, target outside every folder in M  → the target gains ONE `../` prefix;
//   (ii)  file outside M, target inside a folder in M       → `archive/` is inserted immediately
//                                                             before that folder's own segment;
//   (iii) both ends inside M (one folder, or two archived together) → untouched;
//   (iv)  neither end in M                                  → untouched.
// Whether the target EXISTS is never consulted: a broken link is rewritten by the same rule and
// is exactly as broken afterwards. A link in a fenced code block is a link like any other.
//
// BYTES AND LINE ENDINGS (m22/R5). A file is read as BYTES (latin1 is the lossless byte↔char
// mapping, and every byte the rewriter inserts is ASCII), rewritten in memory, and written back
// ONLY when at least one link changed — an untouched file keeps its mtime, a CRLF file keeps its
// `\r\n`, a BOM stays where it was, and no trailing newline is added or removed.
//
// THE ORDER OF THE TWO ACTS: pre-flight everything, RENAME first (every folder in M, in number
// order — each rename atomic), then ONE rewrite pass over the whole tree with M known. A rewrite
// failure after the renames is `archive-rewrite-failed` (500) naming the file, with the moves
// already made in `detail.archived` — never a half-moved folder, never a rewrite applied for a
// move that did not happen.
//
// Dependency direction (41/ADR-001, kept): this module imports `work.mjs`'s READERS only —
// `listItems`, `isLiveStreamRow`, `ARCHIVE_ROOT` — and nothing from `src/effects/`, `src/commands/`
// or `src/work/reindex.mjs` (FF-12705 leg (a): its import specifiers are a subset of
// `{ node:*, src/work.mjs }`). It matches no item name of its own: a folder's identity comes from
// the enumerator's row (FF-12701 — one enumerator, one regex home), and "live" is the one
// predicate (FF-12706 — `.archived` is read in `src/work.mjs` and nowhere else).
import path from "node:path";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { listItems, isLiveStreamRow, ARCHIVE_ROOT } from "../work.mjs";

// Mirrors work.mjs's private `workError` (the command-error contract: `.code`/`.status`) — not
// exported there, and `src/command-error.mjs` is outside this module's closed import set.
function archiveError(message, code, status = 400, detail = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (detail) error.detail = detail;
  return error;
}

const slash = (value) => String(value).replaceAll("\\", "/");

// ─────────────────────────────────────────────────────────────── the link grammar ──

// THE ONE REGEX (FF-12705 leg (d) asserts it requires `](` before the target). An inline markdown
// link or image: `](target)` / `](target "title")` — the target runs to the first whitespace or
// `)`, and whatever follows it inside the parentheses (a title) is carried verbatim.
export const INLINE_LINK_RE = /\]\(([^\s)]+)([^)]*)\)/g;

// A RELATIVE target: no scheme, no leading `/`, not an anchor-only `#…`, not empty.
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
export function isRelativeLinkTarget(target) {
  if (typeof target !== "string" || target.length === 0) return false;
  if (target.startsWith("/") || target.startsWith("#") || target.startsWith("\\")) return false;
  if (SCHEME_RE.test(target)) return false;
  return true;
}

// `path#fragment` / `path?query` — the suffix is kept verbatim in the text and dropped for
// resolution. Split at the FIRST `#` or `?`.
function splitSuffix(target) {
  const at = target.search(/[#?]/);
  return at === -1 ? [target, ""] : [target.slice(0, at), target.slice(at)];
}

// A percent-encoded segment (`a%20b.png`) is DECODED for resolution and left encoded in the
// text; an undecodable sequence resolves as written.
function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// isInside(child, parent) — `child` is `parent` itself or somewhere beneath it. Both absolute.
function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

// Rule (ii)'s edit: `archive/` goes immediately before the moved folder's OWN segment — found by
// walking the target's segments and resolving as we go, so `../12_…` from a sibling and the bare
// `12_…` from the work root are both found at the segment that lands ON the folder. `null` when
// no segment lands on it (a target written with a `..` back over the folder — left untouched
// rather than guessed at).
function insertArchiveSegment(pathPart, dir, folder) {
  const segments = pathPart.split("/");
  let cursor = dir;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    cursor = segment === "" ? cursor : path.resolve(cursor, decodeSegment(segment));
    if (segment === folder.name && path.relative(cursor, folder.from) === "") {
      segments.splice(index, 0, ARCHIVE_ROOT);
      return segments.join("/");
    }
  }
  return null;
}

// rewriteCrossingLinks(text, { dir, moving }) — the PURE rewriter over one file's text.
//
//   text   — the file's bytes as a latin1 string (or any string; only ASCII is inserted)
//   dir    — the directory the file's links were WRITTEN relative to: for a file inside a
//            moved folder that is its PRE-move directory, so every target resolves as it did
//   moving — the set M: `[{ name, from, to }]`, `from` the folder's pre-move absolute path
//
// Returns `{ text, links }` — the rewritten text (=== the input when nothing crossed) and the
// count of link occurrences rewritten. Never reads the filesystem, never consults existence.
export function rewriteCrossingLinks(text, { dir, moving = [] } = {}) {
  const folders = Array.isArray(moving) ? moving : [];
  const fileIn = folders.find((folder) => isInside(dir, folder.from)) ?? null;
  let links = 0;
  const rewritten = String(text).replace(INLINE_LINK_RE, (whole, target, title) => {
    if (!isRelativeLinkTarget(target)) return whole;
    const [pathPart, suffix] = splitSuffix(target);
    if (pathPart === "") return whole;
    const resolved = path.resolve(dir, pathPart.split("/").map(decodeSegment).join("/"));
    const targetIn = folders.find((folder) => isInside(resolved, folder.from)) ?? null;

    if (fileIn != null && targetIn == null) {
      // (i) outward from a moved folder — one `../`, whatever is outside.
      links += 1;
      return `](../${target}${title})`;
    }
    if (fileIn == null && targetIn != null) {
      // (ii) inward from outside — `archive/` before the moved folder's segment.
      const inserted = insertArchiveSegment(pathPart, dir, targetIn);
      if (inserted == null) return whole;
      links += 1;
      return `](${inserted}${suffix}${title})`;
    }
    // (iii) both ends move together, or (iv) neither does.
    return whole;
  });
  return { text: links === 0 ? text : rewritten, links };
}

// ───────────────────────────────────────────────────────────── the tree walk ──

// Every `.md` file under `dir`, recursively — all three roots and the work root's own files.
async function listMarkdownFiles(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listMarkdownFiles(full, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

// The rewrite pass: one walk over the whole tree AFTER the renames, M known. A file now under
// `archive/<name>/…` is resolved from its PRE-move directory (`<workDir>/<name>/…`), so the links
// it carries — written against the old location — classify exactly as they were written.
async function rewriteTree(workDir, moving) {
  const files = (await listMarkdownFiles(workDir)).sort();
  const rewritten = [];
  for (const file of files) {
    const fileDir = path.dirname(file);
    const movedInto = moving.find((folder) => isInside(fileDir, folder.to)) ?? null;
    const dir = movedInto == null ? fileDir : path.join(movedInto.from, path.relative(movedInto.to, fileDir));
    const before = (await readFile(file)).toString("latin1");
    const { text, links } = rewriteCrossingLinks(before, { dir, moving });
    if (links === 0) continue;
    await writeFile(file, Buffer.from(text, "latin1"));
    rewritten.push({ path: slash(path.relative(workDir, file)), links });
  }
  return rewritten.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

// ───────────────────────────────────────────────────────────────── the engine ──

// liveDrivers(items) — the enumerator's LIVE top-level rows, in number order. The one predicate
// decides "live" (127/ADR-002 §1); the parse it guards is the sort's and nothing else's.
function liveDrivers(items) {
  return items
    .filter(isLiveStreamRow)
    .filter((item) => item.parent == null)
    .sort((a, b) => Number(a.number) - Number(b.number));
}

// archiveItems(workDir, { names }) — move the named root folders under `archive/`, then rewrite
// the crossing links. `names` are FOLDER NAMES at the stream root (`12_milestone_theta`); each
// must be a LIVE top-level row of the enumerator, whose row supplies `{ ref, type, slug, dir }` —
// the engine matches no folder name itself — and they move in number order.
//
// Pre-flight (every check before the first rename): each name is a live driver at the root and
// its destination `archive/<name>` does not exist. The face has already made the STATUS decisions
// (done, not a story, not archived) — the engine is filesystem only.
//
// Returns `{ archived: [{ ref, type, slug, name, from, to }], rewritten: [{ path, links }] }` —
// `archived` in number order with native absolute paths, `rewritten` one entry per changed file,
// its `path` work-dir-relative and forward-slashed at the file's NEW location, ordered by path.
export async function archiveItems(workDir, { names = [] } = {}) {
  const wanted = new Set((Array.isArray(names) ? names : [names]).map((name) => String(name)));
  const drivers = liveDrivers(await listItems(workDir));
  for (const name of wanted) {
    if (!drivers.some((item) => item.name === name)) {
      throw archiveError(`"${name}" is not a live top-level item folder at the stream root.`, "archive-source-missing", 404);
    }
  }
  const moving = [];
  for (const item of drivers) {
    if (!wanted.has(item.name)) continue;
    const to = path.join(workDir, ARCHIVE_ROOT, item.name);
    if (await exists(to)) {
      throw archiveError(
        `"${slash(path.relative(workDir, to))}" already exists — refusing to archive onto it.`,
        "archive-destination-exists",
        409,
      );
    }
    moving.push({ ref: item.ref, type: item.type, slug: item.slug, name: item.name, from: item.dir, to });
  }

  // THE RENAMES, in number order — each one atomic, `archive/` created on first use.
  if (moving.length > 0) await mkdir(path.join(workDir, ARCHIVE_ROOT), { recursive: true });
  const archived = [];
  for (const folder of moving) {
    await rename(folder.from, folder.to);
    archived.push({ ref: folder.ref, type: folder.type, slug: folder.slug, name: folder.name, from: folder.from, to: folder.to });
  }

  // THE REWRITE — one pass, M known. A failure here names the file and carries what moved.
  let rewritten;
  try {
    rewritten = await rewriteTree(workDir, moving);
  } catch (error) {
    throw archiveError(
      `The folders moved but the link rewrite failed: ${error?.message ?? error}. Moved: ${archived.map((entry) => entry.name).join(", ")}.`,
      "archive-rewrite-failed",
      500,
      { archived, cause: error?.code ?? null },
    );
  }
  return { archived, rewritten };
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

// refsMovedByArchive(workDir, { names }) — every ref the move TOUCHES: each named driver and each
// of its stories, read from the enumerator's rows (the seam's item-lock guard consumes this — the
// guard must read the identical selection the engine moves, never a second derivation).
export async function refsMovedByArchive(workDir, { names = [] } = {}) {
  const wanted = new Set((Array.isArray(names) ? names : [names]).map((name) => String(name)));
  const items = await listItems(workDir);
  const drivers = liveDrivers(items).filter((item) => wanted.has(item.name));
  const numbers = new Set(drivers.map((item) => item.number));
  const refs = drivers.map((item) => item.ref);
  for (const item of items.filter(isLiveStreamRow)) {
    if (item.parent != null && numbers.has(item.parent)) refs.push(item.ref);
  }
  return refs;
}
