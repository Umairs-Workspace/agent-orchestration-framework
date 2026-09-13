import path from "node:path";

function frontmatterLines(text) {
  const block = String(text ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return block == null ? [] : block[1].split(/\r?\n/);
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// A YAML comment is legal on a declaration entry, and swallowing one turns a valid
// path into a phantom "does not exist" finding. Only an UNQUOTED value carries a
// comment, and only whitespace-then-# opens it — `path#anchor` has no whitespace, so
// an anchored entry is untouched.
function stripInlineComment(raw) {
  const value = String(raw).trim();
  if (value.startsWith('"') || value.startsWith("'")) return value;
  const comment = value.search(/\s#/);
  return comment < 0 ? value : value.slice(0, comment).trimEnd();
}

// The same courtesy for an inline list: `files: [a.mjs] # note` is a list with a
// comment, not a malformed declaration. A list that never closes stays malformed.
function stripListComment(remainder) {
  if (!remainder.startsWith("[")) return remainder;
  const close = remainder.lastIndexOf("]");
  if (close < 0) return remainder;
  const tail = remainder.slice(close + 1).trim();
  return tail === "" || tail.startsWith("#") ? remainder.slice(0, close + 1) : remainder;
}

// A backslash path resolves on Windows and names a single impossible file everywhere
// else, so the same story validates here and reds on the Mac or WSL node. The rule
// lives here, next to the resolver that enforces it, and validate reads it for the
// message it prints.
export function namesBackslashPath(entry) {
  return String(entry ?? "").includes("\\");
}

function inlineList(value) {
  if (!(value.startsWith("[") && value.endsWith("]"))) return null;
  const body = value.slice(1, -1);
  const values = [];
  let quote = null;
  let current = "";
  for (const char of body) {
    if ((char === '"' || char === "'") && (quote == null || quote === char)) {
      quote = quote == null ? char : null;
      current += char;
    } else if (char === "," && quote == null) {
      if (current.trim() !== "") values.push(unquote(current));
      current = "";
    } else {
      current += char;
    }
  }
  if (quote != null) return null;
  if (current.trim() !== "") values.push(unquote(current));
  return values;
}

// The story contract accepts the repository's established inline-list form and the
// ordinary YAML block-list form used in the proposal. It deliberately parses only one
// named field rather than widening work.mjs's shared frontmatter reader.
export function storyContractList(text, key) {
  const lines = frontmatterLines(text);
  const keyPattern = new RegExp(`^${key}:\\s*(.*)$`);
  const index = lines.findIndex((line) => keyPattern.test(line));
  if (index < 0) return { present: false, malformed: false, values: [] };
  const remainder = lines[index].match(keyPattern)[1].trim();
  if (remainder !== "") {
    const values = inlineList(stripListComment(remainder));
    return values == null
      ? { present: true, malformed: true, values: [] }
      : { present: true, malformed: false, values };
  }

  const values = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) break;
    if (line.trim() === "" || /^\s*#/.test(line)) continue;
    const member = line.match(/^\s+-\s+(.+?)\s*$/);
    if (member == null) return { present: true, malformed: true, values: [] };
    values.push(unquote(stripInlineComment(member[1])));
  }
  return { present: true, malformed: false, values };
}

export function resolveStoryContractPath(entry, { storyDir, projectRoot }) {
  const raw = String(entry ?? "").trim();
  const hash = raw.indexOf("#");
  const filePart = (hash < 0 ? raw : raw.slice(0, hash)).trim();
  const anchor = hash < 0 ? null : raw.slice(hash + 1).trim().toLowerCase();
  if (filePart === "" || path.isAbsolute(filePart) || namesBackslashPath(filePart)) return null;

  const base = filePart === "." || filePart.startsWith("./") || filePart.startsWith("../")
    ? storyDir
    : projectRoot;
  const absolutePath = path.resolve(base, filePart);
  const relative = path.relative(projectRoot, absolutePath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return {
    absolutePath,
    projectPath: relative.replaceAll("\\", "/"),
    anchor: anchor === "" ? null : anchor,
  };
}

// ─────────────────────────────────────────── the declared SET, and what covers what ──
//
// milestone 124 / story 00 (ADR-003 §1). Two ADDITIVE exports on this leaf, and the
// resolver above is deliberately untouched: `validate.mjs`, `test-declared.mjs` and
// `ready-wave.mjs` all read its three keys, so a fourth key or a changed value would be a
// silent edit to three modules' answers. What lands here instead is the SET-shaped question
// none of them could ask — "does this declared set cover that path?" — which `ready-wave`
// answered privately by exact string and the depends census would otherwise have answered a
// SECOND way (72/FF-7203, 119/ADR-010: one question, one home).
//
// THE MODULE STAYS A PURE LEAF (96/FF-9602 leg 1, re-asserted by 124/FF-12403): zero project
// imports, `node:path` only, and NO filesystem — no `node:fs`, no `readFile`, no `stat`, no
// `process.cwd`. That is why directory intent below is AUTHORED rather than probed.

// WHETHER AN ENTRY WAS AUTHORED AS A DIRECTORY, read off the RAW entry and never off the
// resolved path — `resolveStoryContractPath` returns `projectPath` through `path.relative`,
// which never returns a trailing separator, so `src/commands/` and `src/commands` resolve to
// one string and the authored slash is gone before any consumer sees it (ADR-003 §2). The
// intent therefore has to be taken here, before resolution, or not at all.
//
// LEXICAL, AND MEASURED RATHER THAN ASSUMED. Across this stream's 1,569 declared entries,
// exactly 8 carry a trailing `/` and 0 of the rest resolve to a real on-disk directory — so
// the authored rule reproduces a disk-probing reading of the stream EXACTLY, for no `stat` at
// all. A probe would additionally answer differently for a path that has not been created
// yet, which is precisely when a write-set collision matters most.
export function declaresDirectory(entry) {
  const raw = String(entry ?? "").trim();
  const hash = raw.indexOf("#");
  const filePart = (hash < 0 ? raw : raw.slice(0, hash)).trim();
  return filePart !== "" && filePart.endsWith("/");
}

// One declared entry, resolved: `{ path, directory, anchor }`. `path` is the resolver's own
// `projectPath` (forward-slashed, project-relative); `directory` is the authored intent above.
const declaredEntry = (raw, resolved) => ({
  path: resolved.projectPath,
  directory: declaresDirectory(raw),
  anchor: resolved.anchor,
});

// THE COVERAGE PREDICATE (ADR-003 §1/§2). `set` is a resolved declared set — the `entries` of
// `resolveDeclaredSet` below — and `entry` is one resolved entry (or a bare project path).
// A member covers the probed entry when:
//
//   · they are EQUAL — coverage's first leg, and the one that makes `ready-wave`'s adoption a
//     strict TIGHTENING rather than a rewrite: every pair colliding under the exact-string rule
//     this replaces still collides here; or
//   · the member was AUTHORED WITH A TRAILING `/` and the probed path sits BENEATH it.
//
// THE SEPARATOR IS REQUIRED, and it is the whole boundary: `src/commands/` covers
// `src/commands/mesh/gate.mjs` at any depth and does NOT cover `src/commands-old.mjs`, because
// a shared prefix is not containment. A `startsWith` without the separator is the quiet way to
// undo this.
//
// A FILE COVERS NO DIRECTORY, and no `stat` decides that — an entry authored without a slash
// claimed one path, not a subtree.
export function contractSetCovers(set, entry) {
  const probed = typeof entry === "string" ? entry : entry?.path;
  if (typeof probed !== "string" || probed === "") return false;
  for (const member of set ?? []) {
    const declared = typeof member === "string" ? { path: member, directory: false } : member;
    if (typeof declared?.path !== "string") continue;
    if (declared.path === probed) return true;
    if (declared.directory === true && probed.startsWith(`${declared.path}/`)) return true;
  }
  return false;
}

// The other declared key — the one an EMPTY list is read against. See the scaffold rule below.
const siblingContractKey = (key) => (key === "files" ? "reads" : "files");

/**
 * A story's declared set for one key, resolved: `{ present, malformed, entries }`.
 *
 * `entries` is `null` for UNKNOWN and `[]` for a real empty set, and keeping those two apart is
 * the whole point of this function — "the story declared nothing" and "the story declared that
 * it touches nothing" are different facts, and a consumer that conflates them either serialises
 * the whole stream or parallelises a collision onto one disk.
 *
 * THE UNTOUCHED-SCAFFOLD RULE, lifted verbatim from `ready-wave`'s private helper (its `:24-32`,
 * where it has always lived) because this is now its one home. The story template ships BOTH
 * `reads: []` and `files: []`, so a story created and never refined would otherwise declare "I
 * write nothing" and parallelise against every sibling — the exact case the partition exists to
 * catch. A genuinely doc-only story that writes nothing still READS something, so an authored
 * entry under the OTHER key is what separates the two. Stated symmetrically rather than for
 * `files:` alone: the scaffold ships both keys empty, so neither key's emptiness is a claim on
 * its own, and the census reads `reads:` through this same door.
 *
 * A SINGLE UNRESOLVABLE ENTRY POISONS THE WHOLE SET (`ready-wave`'s `:36`). An absolute path, a
 * backslash path or one escaping the project root cannot be compared against anything, and a
 * set that quietly dropped it would answer "no collision" for a story whose declaration nobody
 * could read.
 *
 * AN ANCHORED ENTRY IS POISON UNDER `files:` AND ORDINARY UNDER `reads:`, and the rule is keyed
 * on the key rather than on the caller. `path#anchor` names a REGION of a document: a story can
 * read one, which is what the anchor is for, but nothing writes half a file — so an anchored
 * write entry is a declaration nobody can act on, and the write set is unknown rather than
 * half-read.
 */
export function resolveDeclaredSet(text, key, { storyDir, projectRoot }) {
  const declared = storyContractList(text, key);
  const unknown = { present: declared.present, malformed: declared.malformed, entries: null };
  if (!declared.present || declared.malformed) return unknown;

  if (declared.values.length === 0) {
    const sibling = storyContractList(text, siblingContractKey(key));
    if (!sibling.present || sibling.malformed || sibling.values.length === 0) return unknown;
    return { present: true, malformed: false, entries: [] };
  }

  const entries = [];
  for (const raw of declared.values) {
    const resolved = resolveStoryContractPath(raw, { storyDir, projectRoot });
    if (resolved == null) return unknown;
    if (key === "files" && resolved.anchor != null) return unknown;
    entries.push(declaredEntry(raw, resolved));
  }
  return { present: true, malformed: false, entries };
}

function headingSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

export function storyAnchorResolves(text, anchor) {
  const sought = String(anchor ?? "").replace(/^#/, "").trim().toLowerCase();
  if (sought === "") return true;
  const explicit = new RegExp(`<a\\s+(?:id|name)=["']${sought.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i");
  if (explicit.test(text)) return true;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading == null) continue;
    const slug = headingSlug(heading[1]);
    if (slug === sought || slug.startsWith(`${sought}-`)) return true;
  }
  return false;
}
