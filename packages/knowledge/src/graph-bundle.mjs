import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
// src/graph-bundle.mjs — the codebase graph as ONE portable file (166). Pure fs + zlib, and the
// spawn-free half of `aof graph export` / `aof graph import`: it never spawns git or graphify, so
// the two command modules stay inside the no-face-spawn guard and receive those reads injected.
//
// THE FORMAT. One gzip stream: a single JSON header line, then every carried file's bytes in the
// header's order. The header names each file with its size and sha256, so a bundle truncated by a
// half-finished copy, or any other file that happens to be gzip, is refused as a whole rather than
// laid down as half a graph. node:zlib only — no archive dependency (yarn.lock holds `tar`
// transitively, never as ours), and the file travels over USB, scp or a synced drive unchanged.
//
// WHAT TRAVELS. `graphify-out/` minus what is machine-local by construction (measured against
// graphify 0.8.44, 2026-10-20): `cache/stat-index.json` keys every file by its ABSOLUTE path (a
// size+mtime shortcut that only ever skips a re-hash), `.graphify_root` is the absolute root of
// the last build, and the lock / pending-queue files are a running graphify's own. `.gitignore` is
// left out because the receiver writes its own through `ensureGraphifyOutGitignore`. Everything
// else — graph.json, manifest.json, GRAPH_REPORT.md and the cache — is repo-relative already.

export const BUNDLE_FORMAT = "aof-graph-bundle";
export const BUNDLE_VERSION = 1;

const MACHINE_LOCAL = new Set([".gitignore", ".graphify_root", ".pending_changes", ".rebuild.lock", "cache/stat-index.json"]);
const MACHINE_LOCAL_PATTERN = /^cache\/stat-index\.[^/]*\.tmp$/u;

export function isMachineLocal(rel) {
  return MACHINE_LOCAL.has(rel) || MACHINE_LOCAL_PATTERN.test(rel);
}

// Every carried file under `outDir`, as sorted forward-slash paths relative to it.
export function listBundleFiles(outDir) {
  const out = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else if (entry.isFile() && !isMachineLocal(rel)) out.push(rel);
    }
  };
  walk(outDir, "");
  return out.sort();
}

// The graphify version that wrote the AST cache, read from its `cache/ast/v<version>/` folder —
// the version the carried cache is valid for. No spawn: the cache names it.
export function cacheGraphifyVersion(files) {
  const versions = new Set();
  for (const rel of files) {
    const match = /^cache\/ast\/v([^/]+)\//u.exec(rel);
    if (match) versions.add(match[1]);
  }
  return versions.size === 1 ? [...versions][0] : null;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

// packBundle({ outDir, stamp }) → the gzipped bundle bytes.
export function packBundle({ outDir, stamp }) {
  const files = listBundleFiles(outDir);
  const blobs = files.map((rel) => readFileSync(path.join(outDir, ...rel.split("/"))));
  const header = {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    stamp,
    files: files.map((rel, index) => ({ path: rel, size: blobs[index].length, sha256: sha256(blobs[index]) })),
  };
  const headerLine = Buffer.from(`${JSON.stringify(header)}\n`, "utf8");
  return { bytes: gzipSync(Buffer.concat([headerLine, ...blobs])), fileCount: files.length };
}

function invalid(reason) {
  const error = new Error(reason);
  error.code = "bundle-invalid";
  return error;
}

// A carried path must stay inside `graphify-out/`: relative, forward-slashed, no `..`, no drive.
function safeRel(rel) {
  return typeof rel === "string"
    && rel.length > 0
    && !rel.includes("\\")
    && !rel.startsWith("/")
    && !rel.includes(":")
    && rel.split("/").every((part) => part !== "" && part !== "." && part !== "..")
    && !isMachineLocal(rel);
}

// unpackBundle(bytes) → { stamp, files: [{ path, bytes }] }, or throws `bundle-invalid` naming why.
export function unpackBundle(bytes) {
  let raw;
  try {
    raw = gunzipSync(bytes);
  } catch (error) {
    throw invalid(`not a gzip stream (${error.message})`);
  }
  const newline = raw.indexOf(0x0a);
  if (newline === -1) throw invalid("no bundle header");
  let header;
  try {
    header = JSON.parse(raw.subarray(0, newline).toString("utf8"));
  } catch {
    throw invalid("no bundle header");
  }
  if (header?.format !== BUNDLE_FORMAT) throw invalid("not an aof graph bundle");
  if (header.version !== BUNDLE_VERSION) throw invalid(`unsupported bundle version ${header.version}`);
  if (!Array.isArray(header.files)) throw invalid("bundle header names no files");
  let offset = newline + 1;
  const files = [];
  for (const entry of header.files) {
    if (!safeRel(entry?.path) || !Number.isInteger(entry.size) || entry.size < 0) {
      throw invalid(`bundle names an unsafe or malformed file ${JSON.stringify(entry?.path)}`);
    }
    const slice = raw.subarray(offset, offset + entry.size);
    if (slice.length !== entry.size || sha256(slice) !== entry.sha256) {
      throw invalid(`${entry.path} does not match the bundle header`);
    }
    files.push({ path: entry.path, bytes: slice });
    offset += entry.size;
  }
  if (offset !== raw.length) throw invalid("bundle holds bytes its header does not name");
  if (!files.some((file) => file.path === "graph.json")) throw invalid("bundle holds no graph.json");
  return { stamp: header.stamp ?? {}, files };
}

// ------------------------------------------------------------- project identity ----
//
// Which project a graph belongs to: the committed `mesh.workspaceId` when the config carries one,
// and the repo's root commit(s) always, so a project with no workspace id is still told apart from
// an unrelated one. `git` is injected (`(args, { cwd }) → Promise<{ status, stdout }>`); a git that
// fails or is absent answers "unknown", never a guess.
export async function gitRead(git, args, cwd) {
  try {
    const result = await git(args, { cwd });
    return result?.status === 0 ? String(result.stdout ?? "").trim() : null;
  } catch {
    return null;
  }
}

export async function readProjectIdentity({ config, git, projectRoot }) {
  const workspaceId = typeof config?.mesh?.workspaceId === "string" && config.mesh.workspaceId ? config.mesh.workspaceId : null;
  const roots = await gitRead(git, ["rev-list", "--max-parents=0", "HEAD"], projectRoot);
  return { workspaceId, rootCommits: roots ? roots.split(/\s+/u).filter(Boolean).sort() : [] };
}

// sameProject(bundle, local) → { same, reason }. Workspace ids decide when both sides carry one;
// otherwise a shared root commit does; with neither, the project cannot be told and is refused.
export function sameProject(bundle, local) {
  if (bundle.workspaceId && local.workspaceId) {
    return { same: bundle.workspaceId === local.workspaceId, by: "workspaceId" };
  }
  if (bundle.rootCommits?.length && local.rootCommits?.length) {
    return { same: bundle.rootCommits.some((sha) => local.rootCommits.includes(sha)), by: "rootCommit" };
  }
  return { same: false, by: "unknown" };
}

export function describeProject(identity) {
  if (identity?.workspaceId) return `workspace ${identity.workspaceId}`;
  if (identity?.rootCommits?.length) return `root commit ${identity.rootCommits[0].slice(0, 7)}`;
  return "an unidentifiable project";
}

// The clone's own files as graphify's `update` sees them: tracked plus untracked-not-ignored,
// repo-relative and forward-slashed, with every `graphify-out*` folder (the graph itself, and an
// import's staging or replaced folder) left out. `null` when git cannot list them.
export async function listCloneFiles(git, projectRoot) {
  const listed = await gitRead(git, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], projectRoot);
  if (listed == null) return null;
  return [...new Set(listed.split("\0").filter(Boolean))].filter((rel) => !rel.split("/")[0].startsWith("graphify-out")).sort();
}

// ------------------------------------------------------------- the inputs stamp ----
//
// WHY aof decides currency itself (166 F-01, measured 2026-10-20 against graphify 0.8.44):
// `graphify update <root>` re-extracts the WHOLE code corpus on every run, and its AST cache never
// serves `.js/.mjs/.ts/.tsx/.vue/.svelte` (`_JS_CACHE_BYPASS_SUFFIXES`) — on this repo every build
// was a ~4-minute full extraction, carried cache or not. So after each code-only build aof stamps
// what the graph was built from, and the next build runs no graphify when nothing it read changed.
//
// The digest covers (a) every file graphify read — its `manifest.json` keys — by content with
// CRLF folded to LF (a Windows and an LF checkout of one commit extract identically), and (b) the
// list of every git-visible path, so a file added or deleted anywhere forces a rebuild even when
// graphify would not have read it: a needless rebuild costs minutes, a missed one a wrong graph.
// The stamp also names the graphify version and graph.json's own hash, so a graph rewritten by
// anything else, or a graphify upgrade, never reads as current. It is repo-relative and
// line-ending-neutral, so it travels inside the bundle and answers on the receiving clone.
export const INPUTS_STAMP = "aof-inputs.json";
const INPUTS_FORMAT = "aof-graph-inputs";

export function hashInput(bytes) {
  return sha256(Buffer.from(bytes.toString("latin1").replace(/\r\n/gu, "\n"), "latin1"));
}

function readIfPresent(file) {
  try {
    return readFileSync(file);
  } catch {
    return null;
  }
}

// hashTree(projectRoot, files) → Map(rel → content hash) over the files that can be read now. An
// unreadable file is left out, and so is never stamped as read.
export function hashTree(projectRoot, files) {
  const hashes = new Map();
  for (const rel of files) {
    const bytes = readIfPresent(path.join(projectRoot, ...rel.split("/")));
    if (bytes) hashes.set(rel, hashInput(bytes));
  }
  return hashes;
}

// The files graphify read for this graph, from its manifest. `null` when there is no manifest or it
// names a path aof cannot place in this clone (a legacy absolute key).
export function manifestInputs(outDir) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(outDir, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
  if (manifest == null || typeof manifest !== "object" || Array.isArray(manifest)) return null;
  const inputs = Object.keys(manifest).map((key) => key.replace(/\\/gu, "/"));
  if (inputs.some((rel) => rel.startsWith("/") || /^[A-Za-z]:/u.test(rel) || rel.split("/").includes(".."))) return null;
  return [...new Set(inputs)].sort();
}

// inputsDigest({ inputs, visible, hashes }) → hex, or null when an input has no hash. A path is
// counted only when it could be read: `ls-files --cached` still lists a tracked file deleted from
// the working tree, and a deletion must change the digest. This is not the 164/ADR-002 record
// fingerprint: it digests what a graph build read, and decides nothing about work items.
export function inputsDigest({ inputs, visible, hashes }) {
  const hash = createHash("sha256").update(`${INPUTS_FORMAT}/1\n`);
  for (const rel of visible) if (hashes.has(rel)) hash.update(`p ${rel}\n`);
  for (const rel of inputs) {
    const own = hashes.get(rel);
    if (own == null) return null;
    hash.update(`f ${rel} ${own}\n`);
  }
  return hash.digest("hex");
}

export function readInputsStamp(outDir) {
  try {
    const stamp = JSON.parse(readFileSync(path.join(outDir, INPUTS_STAMP), "utf8"));
    return stamp?.format === INPUTS_FORMAT ? stamp : null;
  } catch {
    return null;
  }
}

// stampInputs(outDir, { visible, hashes }, graphifyVersion) — stamp what a build read, from the tree
// snapshotted before it ran. Best-effort: when no stamp can be written the old one is removed, and
// the next build simply runs graphify.
export function stampInputs(outDir, { visible, hashes }, graphifyVersion) {
  const target = path.join(outDir, INPUTS_STAMP);
  try {
    const inputs = manifestInputs(outDir);
    const digest = inputs && graphifyVersion ? inputsDigest({ inputs, visible, hashes }) : null;
    if (!digest) {
      rmSync(target, { force: true });
      return;
    }
    const graphSha256 = sha256(readFileSync(path.join(outDir, "graph.json")));
    writeFileSync(target, `${JSON.stringify({ format: INPUTS_FORMAT, version: 1, graphifyVersion, digest, graphSha256 }, null, 2)}\n`, "utf8");
  } catch {
    rmSync(target, { force: true });
  }
}

// inputsCurrent({ outDir, visible, hashes, graphifyVersion }) → true only when the stamp names this
// graph.json, this graphify version, and exactly the inputs and paths this clone holds now.
export function inputsCurrent({ outDir, visible, hashes, graphifyVersion }) {
  const stamp = readInputsStamp(outDir);
  if (!stamp || !graphifyVersion || stamp.graphifyVersion !== graphifyVersion) return false;
  const inputs = manifestInputs(outDir);
  if (!inputs) return false;
  let graphBytes;
  try {
    graphBytes = readFileSync(path.join(outDir, "graph.json"));
  } catch {
    return false;
  }
  if (sha256(graphBytes) !== stamp.graphSha256) return false;
  const digest = inputsDigest({ inputs, visible, hashes });
  return digest != null && digest === stamp.digest;
}

// ------------------------------------------------------------------ the cache key ----
//
// graphify's cache key, ported from `graphify.cache.file_hash` as of graphify 0.8.44 (the version
// the managed store holds; read 2026-10-20 and checked byte-for-byte against graphify's own Python
// over CRLF, LF, unclosed-frontmatter and `----` cases): sha256 over the file's content, a NUL,
// and the lower-cased forward-slash path relative to the project root — where a `.md` file's
// content is only what follows its frontmatter (`_body_content`: a whole-line `---` opener at the
// very start, the next whole-line `---` closes it, and the body begins right after those three
// dashes). The AST cache (`cache/ast/v<version>/`) and the semantic cache (`cache/semantic/`) are
// both keyed this way. If a later graphify changes the formula, a carried entry simply stops
// hitting and that file is re-extracted: the failure mode is a slower build, never a wrong graph.
export const CACHE_KEY_GRAPHIFY_VERSION = "0.8.44";

const FRONTMATTER_DELIM = /^---[ \t]*\r?$/u;

function lineAt(text, start) {
  const newline = text.indexOf("\n", start);
  return { line: text.slice(start, newline === -1 ? text.length : newline), next: newline === -1 ? -1 : newline + 1 };
}

function markdownBody(bytes) {
  const text = new TextDecoder("utf-8").decode(bytes);
  const opener = lineAt(text, 0);
  if (!FRONTMATTER_DELIM.test(opener.line)) return bytes;
  for (let start = opener.next; start !== -1;) {
    const { line, next } = lineAt(text, start);
    if (FRONTMATTER_DELIM.test(line)) return Buffer.from(text.slice(start + 3), "utf8");
    start = next;
  }
  return bytes;
}

export function graphifyCacheKey(rel, bytes) {
  const lower = rel.toLowerCase();
  const content = lower.endsWith(".md") ? markdownBody(bytes) : bytes;
  return createHash("sha256").update(content).update(Buffer.from([0])).update(lower, "utf8").digest("hex");
}

// The same file under the other line-ending convention: the LF form, and the CRLF form of it.
function lineEndingVariants(bytes) {
  const text = bytes.toString("latin1");
  const lf = text.replace(/\r\n/gu, "\n");
  const crlf = lf.replace(/\n/gu, "\r\n");
  return [lf, crlf].filter((variant) => variant !== text).map((variant) => Buffer.from(variant, "latin1"));
}

function listIfPresent(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isDirectory(target) {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

// A bundle with no AST cache, or no semantic cache, carries none to re-key.
function cacheDirs(outDir) {
  const dirs = [];
  const ast = path.join(outDir, "cache", "ast");
  for (const entry of listIfPresent(ast)) {
    if (entry.isDirectory()) dirs.push(path.join(ast, entry.name));
  }
  const semantic = path.join(outDir, "cache", "semantic");
  if (isDirectory(semantic)) dirs.push(semantic);
  return dirs;
}

// rekeyCache({ outDir, projectRoot, files }) — re-key every carried cache entry to the receiving
// clone's own bytes (166 E15). An entry whose key is already this clone's key is KEPT; one keyed by
// the same file under the other line-ending convention is REKEYED (renamed, its content untouched —
// extraction was measured identical for a CRLF and an LF copy of a file); every other entry maps to
// no file this clone holds as the source held it, and is DROPPED, so graphify re-extracts just
// that file. `files` is the clone's own file list, repo-relative and forward-slashed.
export function rekeyCache({ outDir, projectRoot, files }) {
  const counts = { kept: 0, rekeyed: 0, dropped: 0 };
  const dirs = cacheDirs(outDir).map((dir) => ({
    dir,
    entries: new Set(readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5))),
  }));
  if (dirs.every(({ entries }) => entries.size === 0)) return counts;

  const renames = dirs.map(() => new Map());
  const used = dirs.map(() => new Set());
  for (const rel of files) {
    let bytes;
    try {
      bytes = readFileSync(path.join(projectRoot, ...rel.split("/")));
    } catch {
      continue;
    }
    const own = graphifyCacheKey(rel, bytes);
    let variants = null;
    dirs.forEach(({ entries }, index) => {
      if (entries.has(own)) {
        used[index].add(own);
        return;
      }
      variants ??= lineEndingVariants(bytes).map((variant) => graphifyCacheKey(rel, variant));
      const carried = variants.find((key) => entries.has(key) && !used[index].has(key));
      if (carried) {
        used[index].add(carried);
        renames[index].set(carried, own);
      }
    });
  }

  dirs.forEach(({ dir, entries }, index) => {
    for (const key of entries) {
      if (!used[index].has(key)) {
        rmSync(path.join(dir, `${key}.json`), { force: true });
        counts.dropped += 1;
      } else if (!renames[index].has(key)) {
        counts.kept += 1;
      }
    }
    // Two phases, so a rename never lands on an entry still waiting to move.
    for (const from of renames[index].keys()) renameSync(path.join(dir, `${from}.json`), path.join(dir, `${from}.rekey`));
    for (const [from, to] of renames[index]) {
      renameSync(path.join(dir, `${from}.rekey`), path.join(dir, `${to}.json`));
      counts.rekeyed += 1;
    }
  });
  return counts;
}
