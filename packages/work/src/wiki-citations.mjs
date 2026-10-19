import path from "node:path";
import { statSync } from "node:fs";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { pathCitationsIn, splitPathLocator } from "./audit/controls.mjs";
import { resolveCitedPath } from "./cited-path-resolve.mjs";

// 161/ADR-001 — the workspace wiki's source-citation probe.
//
// WHAT IT ANSWERS: does every local source FILE a direct wiki page cites still name something? The
// grammar (`pathCitationsIn` / `splitPathLocator`) and the resolution rule (`resolveCitedPath`) are
// the shared ones; this module adds only what neither owns — which pages to read, which citations are
// SOURCE citations, and the finding it reports. There is no second path regex and no rename table
// here, and nothing cited is ever imported or run: existence is a `stat`.
//
// IMPURE BY DESIGN, and called from the doctor command edge only. The pure item engine acquires no
// filesystem dependency. The rename map arrives as data — read ONCE at the edge and shared with the
// snapshot — so this module spawns nothing.
//
// SCOPE: the regular Markdown files DIRECTLY inside `<projectRoot>/wiki`. Not recursive (the work
// stream under it has its own gates), and never relative to cwd or the configured work dir.

export const WIKI_DIR = "wiki";
export const UNRESOLVED_CODE = "wiki-source-unresolved";
export const UNREADABLE_CODE = "wiki-source-unreadable";

// A URL is not a project path, and the shared grammar would otherwise read `example.com/src/a.mjs`
// out of one. This is exclusion policy, not a second grammar.
const URL_TEXT = /[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s)>\]"'`]+/gu;

const posix = (value) => String(value).replaceAll("\\", "/");

function reasonOf(error) {
  return error?.code ?? (error instanceof Error ? error.message : String(error));
}

function unreadable(filePath, what, error) {
  return {
    code: UNREADABLE_CODE,
    severity: "warn",
    path: filePath,
    message: `${what} could not be read (${reasonOf(error)}) — its source citations were NOT checked`,
  };
}

function insideRoot(projectRoot, candidate) {
  const relative = path.relative(projectRoot, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

// A SOURCE citation names a file under a complete `src` path component. `apps/ui/src/x.tsx` and
// `packages/work/src/x.mjs` both qualify, with their whole prefix kept; `test/x.test.mjs` does not.
function isSourcePath(file) {
  return file.split("/").includes("src");
}

// The first occurrence (one-based line) of every distinct, normalized local source file in a page.
export function sourceCitationsIn(text) {
  const first = new Map();
  String(text ?? "").split(/\r?\n/u).forEach((line, index) => {
    for (const cited of pathCitationsIn(line.replace(URL_TEXT, " "))) {
      const file = posix(splitPathLocator(cited).path);
      if (!isSourcePath(file) || first.has(file)) continue;
      first.set(file, index + 1);
    }
  });
  return first;
}

// Regular file at the project-relative destination, never outside the project. A directory of that
// name is not a source file.
function existsAsFile(projectRoot, candidate) {
  const absolute = path.resolve(projectRoot, candidate);
  if (!insideRoot(projectRoot, absolute)) return false;
  try {
    return statSync(absolute).isFile();
  } catch {
    return false;
  }
}

async function pageText(projectRoot, wikiDir, name, io) {
  const page = path.join(wikiDir, name);
  try {
    const info = await lstat(page);
    let target = page;
    if (info.isSymbolicLink()) {
      target = await realpath(page);
      if (!insideRoot(await realpath(projectRoot), target)) {
        return { finding: unreadable(page, `the wiki page ${posix(path.join(WIKI_DIR, name))} (a symlink pointing outside the project)`, "outside-project") };
      }
      if (!(await stat(target)).isFile()) return { skip: true };
    } else if (!info.isFile()) {
      return { skip: true };
    }
    return { page, text: await io.readFile(target, "utf8") };
  } catch (error) {
    return { finding: unreadable(page, `the wiki page ${posix(path.join(WIKI_DIR, name))}`, error) };
  }
}

// `io` is a test seam for the two reads whose failure is otherwise unreachable on a given OS
// (a permission failure); production callers never supply it.
export async function probeWikiCitations({ projectRoot, renameMap = null, io = {} } = {}) {
  const reads = { readdir, readFile, ...io };
  if (typeof projectRoot !== "string" || projectRoot === "") return [];
  const wikiDir = path.join(projectRoot, WIKI_DIR);
  let names;
  try {
    names = (await reads.readdir(wikiDir)).filter((name) => /\.md$/iu.test(name)).sort();
  } catch (error) {
    // No wiki is the normal state of most projects; anything else means the scan is incomplete.
    return error?.code === "ENOENT" || error?.code === "ENOTDIR" ? [] : [unreadable(wikiDir, `the wiki directory ${WIKI_DIR}`, error)];
  }

  const findings = [];
  for (const name of names) {
    const read = await pageText(projectRoot, wikiDir, name, reads);
    if (read.finding) findings.push(read.finding);
    if (read.page == null) continue;
    const citations = sourceCitationsIn(read.text);
    for (const file of [...citations.keys()].sort()) {
      const normalized = path.posix.normalize(file);
      const escapes = normalized.startsWith("..") || path.posix.isAbsolute(normalized);
      const resolved = !escapes && resolveCitedPath(normalized, { existsAtHead: (candidate) => existsAsFile(projectRoot, candidate), renameMap }).resolved;
      if (resolved) continue;
      findings.push({
        code: UNRESOLVED_CODE,
        severity: "warn",
        path: read.page,
        message: `${posix(path.join(WIKI_DIR, name))} cites ${file} (first at line ${citations.get(file)}), which resolves to no current file and has no recorded move to one`,
      });
    }
  }
  return findings;
}
