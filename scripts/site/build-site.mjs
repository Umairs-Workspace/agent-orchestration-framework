// scripts/site/build-site.mjs — the STAGING step for the published site (story 125).
//
// WHAT IT IS, AND WHAT IT IS NOT. It assembles ONE git-ignored directory that Jekyll builds from:
// the committed shell under `docs/` (config, layout, landing page) plus a page projected from each
// entry of the manifest below. It is not a renderer — Jekyll renders, in CI, through
// `actions/jekyll-build-pages` — and it is not a composer: the graph document's bytes are the
// committed document exactly as `aof work loops document --write` rendered it, and nothing here
// knows what a loop document looks like inside.
//
// WHY IT LIVES UNDER `scripts/` AND NOT `src/`. Story 79's drift control
// (`test/arch/loop/acd-loop-document-current.test.mjs`) walks `src/` for every reader of the graph
// document and asserts the reader set is exactly its own two modules. That control is what says the
// document gates the suite and nothing in the work lifecycle. A builder in `src/` would red it on
// arrival; a builder here — beside the release scripts, where this repository already keeps its
// build steps — imports the seam freely, and `acd-site-is-projected-not-copied` holds the placement.
//
// THE ONE HOME IS REACHED, NEVER RESPELLED. The document's path comes from `loopDocumentPath`, over
// the work directory `loadWorkspace` resolves; this file spells no basename of its own. The remedy
// a stale page names is `REGENERATE_COMMAND` from the same module, for the same reason.
//
// NARRATIVE AND PROJECTION ARE STAGED THE SAME WAY AND GOVERNED DIFFERENTLY. Every staged page
// carries front matter that names its source and its kind. A `generated` page also names the command
// that regenerates its source; an `authored` page names no such command, because nobody regenerates
// prose. The BODY is the source's bytes, unchanged.
//
// THE LIQUID GUARD. Jekyll runs Liquid over every page before kramdown sees it, and the graph
// document carries Mermaid hexagon nodes spelled `{{"…"}}` — three of them, measured at lines
// 47-49 of the committed document — which Liquid reads as output tags and strips. Measured against
// the Pages build image itself (ghcr.io/actions/jekyll-build-pages v1.0.13, github-pages 232,
// 2026-09-12): unguarded, `watcher_x{{"watcher:x · …"}}` reaches the page as `watcher_xwatcher:x · …`,
// which is not a node Mermaid can parse. So each body is wrapped in `{% raw %}` … `{% endraw %}`.
// The wrapper is part of the provenance envelope this builder adds (the front matter above the
// body, the guard around it); it is the mechanism by which the body is published AS AUTHORED
// rather than as Liquid rewrites it — and task 01's "published as authored" clause names it.
//
// ATOMIC, AND IT REPLACES ONLY ITS OWN OUTPUT. The site is assembled in a temporary sibling of the
// target and renamed into place. A source that is missing fails the build BY NAME before anything
// is written; a failure later leaves the PREVIOUS WHOLE site in place, never a partial one. And the
// target is cleared only when it is recognisably a previous staging — the shell's `_config.yml`
// plus pages carrying this builder's provenance envelope — so `--out` pointed at a directory that
// holds anything else is refused by name rather than emptied (measured at review: `--out wiki`
// deleted the work stream at exit 0). DETERMINISTIC: no clock, no absolute path, no environment
// reaches the staged bytes, so two runs over an unchanged tree are byte-identical.
import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loopDocumentPath, REGENERATE_COMMAND } from "../../src/loop-document.mjs";
import { loadWorkspace } from "../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The committed shell, and the default staging target: a SIBLING of `docs/`, never inside it, so
// the shell is read and never written. The target is what `.gitignore` names.
export const SHELL_DIR = "docs";
export const DEFAULT_OUT = "dist-site";

// THE MANIFEST — what travels the publishing path. The generated entry's source is DERIVED (a
// function of the workspace) rather than spelled; the authored entries are the two planning PRDs
// the story publishes as-is. A page is staged under its source's own basename — never a second
// spelling of it here — and `permalink` is the URL the landing page links.
export const MANIFEST = Object.freeze([
  Object.freeze({
    kind: "generated",
    source: (workspace) => loopDocumentPath(workspace),
    regenerate: REGENERATE_COMMAND,
    permalink: "/loops/",
  }),
  Object.freeze({
    kind: "authored",
    source: "wiki/planning/PRD-acd-loop-engineering.md",
    permalink: "/prd-acd-loop-engineering/",
  }),
  Object.freeze({
    kind: "authored",
    source: "wiki/planning/PRD-graph-engineering.md",
    permalink: "/prd-graph-engineering/",
  }),
]);

// The guard's two halves, exported so a test can subtract exactly what the builder added and
// compare what is left with the source, byte for byte.
export const RAW_OPEN = "{% raw %}\n";
export const RAW_CLOSE = "\n{% endraw %}\n";
// Any spelling Liquid would read as the closer, whitespace-trimmed or not.
const RAW_CLOSE_ANY = /\{%-?\s*endraw\s*-?%\}/;

// `path` on an error is always ABSOLUTE — the machine-readable field; the message carries the
// project-relative display form where one exists.
export class SiteBuildError extends Error {
  constructor(message, { code, path: failedPath } = {}) {
    super(message);
    this.name = "SiteBuildError";
    this.code = code ?? "site-build-failed";
    if (failedPath) this.path = failedPath;
  }
}

function posix(relative) {
  return relative.split(path.sep).join("/");
}

// The page's title is the source's first H1, read rather than composed — the manifest entry's
// filename is the fallback for a source that opens without one.
function titleOf(body, fallback) {
  const heading = /^#\s+(.+?)\s*$/m.exec(body);
  return heading ? heading[1] : fallback;
}

// The provenance envelope's front matter: the source and the kind (and, for a generated page, the
// regeneration command), each value quoted as JSON — valid YAML for a double-quoted scalar, so a
// colon or a quote in a heading or a path cannot break the parse.
export function frontMatterFor({ kind, source, regenerate, permalink }, body, fallbackTitle) {
  const lines = [
    "---",
    `layout: ${JSON.stringify("default")}`,
    `title: ${JSON.stringify(titleOf(body, fallbackTitle))}`,
    `permalink: ${JSON.stringify(permalink)}`,
    `source: ${JSON.stringify(source)}`,
    `kind: ${JSON.stringify(kind)}`,
  ];
  if (kind === "generated") lines.push(`regenerate: ${JSON.stringify(regenerate)}`);
  lines.push("---", "");
  return lines.join("\n");
}

// A staged page: the envelope (front matter, then the guard) around the source's bytes.
export function stagePage(entry, body) {
  // A body that closes the guard itself would publish as a truncated page with Liquid loose over
  // the rest — refused by name rather than staged.
  if (RAW_CLOSE_ANY.test(body)) {
    throw new SiteBuildError(`Cannot stage ${entry.page}: its source ${entry.source} contains \`${RAW_CLOSE.trim()}\`, which would close the Liquid guard early.`, { code: "site-source-unguardable", path: entry.absolute });
  }
  return `${frontMatterFor(entry, body, entry.page)}${RAW_OPEN}${body}${RAW_CLOSE}`;
}

// Resolve each manifest entry against a root: the generated entry's source through the seam, the
// authored entries' relative to the root. `source` in the result is the PROJECT-RELATIVE,
// forward-slashed display path the staged page names — never the absolute one, which would put the
// checkout location into the staged bytes; `absolute` is kept beside it for the read.
export function resolveManifest(root, workspace) {
  return MANIFEST.map((entry) => {
    const absolute = typeof entry.source === "function" ? entry.source(workspace) : path.resolve(root, entry.source);
    return { ...entry, absolute, source: posix(path.relative(root, absolute)), page: path.basename(absolute) };
  });
}

async function isDirectory(target) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function refuseTarget(root, outDir) {
  const shell = path.resolve(root, SHELL_DIR);
  if (inside(outDir, root)) {
    throw new SiteBuildError(`Refusing to stage into ${outDir}: it contains the repository root.`, { code: "site-out-contains-root", path: outDir });
  }
  if (inside(shell, outDir)) {
    throw new SiteBuildError(`Refusing to stage into ${outDir}: the committed shell under ${SHELL_DIR}/ is read, never written.`, { code: "site-out-inside-shell", path: outDir });
  }
}

// Does a staged page's text open with this builder's envelope — the front matter it writes, then
// the guard? A test can ask the same question of a file it suspects; the builder asks it of every
// page it would otherwise clear.
export function carriesProvenanceEnvelope(text) {
  const opening = /^---\n[\s\S]*?\n---\n/.exec(text);
  if (!opening) return false;
  const frontMatter = opening[0];
  return /^source:\s/m.test(frontMatter) && /^kind:\s/m.test(frontMatter) && text.startsWith(RAW_OPEN, frontMatter.length);
}

// ONLY A PREVIOUS STAGING IS EVER REPLACED. A target that does not exist, or is empty, is fine. One
// that holds files is cleared only if every file is either the shell's own (same relative path
// under `docs/`, so `_config.yml` and the layout) or a page carrying this builder's envelope — and
// the shell's `_config.yml` must be among them. Anything else is somebody's tree, and it is named.
async function assertReplaceableTarget(outDir, shell) {
  if (!(await isDirectory(outDir))) return;
  const files = [];
  async function walk(dir, prefix) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), key);
      else files.push(key);
    }
  }
  await walk(outDir, "");
  if (files.length === 0) return;
  const refuse = (why) => {
    throw new SiteBuildError(`Refusing to clear ${outDir}: ${why}. Only a previous staging of this builder is ever replaced.`, { code: "site-out-foreign", path: outDir });
  };
  if (!files.includes("_config.yml")) refuse("it holds files but no _config.yml from the shell, so it is not a previous staging");
  for (const file of files) {
    const shellCopy = path.join(shell, ...file.split("/"));
    let isShell = false;
    try {
      isShell = (await stat(shellCopy)).isFile();
    } catch {
      isShell = false;
    }
    if (isShell) continue;
    if (path.dirname(file) === "." && file.endsWith(".md") && carriesProvenanceEnvelope(await readFile(path.join(outDir, file), "utf8"))) continue;
    refuse(`${file} is neither the shell's nor a page this builder staged`);
  }
}

// buildSite — stage the site. Returns what was staged so a caller (the CLI below, a test) can
// account for every file the build produced.
//
//   { root, out }   root: the repository (defaults to this one); out: the staging directory,
//                   relative to root or absolute (defaults to `dist-site`).
export async function buildSite({ root = repoRoot, out = DEFAULT_OUT } = {}) {
  const rootDir = path.resolve(root);
  const outDir = path.resolve(rootDir, out);
  refuseTarget(rootDir, outDir);

  const shell = path.join(rootDir, SHELL_DIR);
  if (!(await isDirectory(shell))) {
    throw new SiteBuildError(`The site's shell is missing: ${SHELL_DIR}/ is not a directory.`, { code: "site-shell-missing", path: shell });
  }

  const workspace = await loadWorkspace(rootDir);
  const manifest = resolveManifest(rootDir, workspace);

  // Every source is read BEFORE anything is written, so a missing one fails with nothing staged.
  const pages = [];
  for (const entry of manifest) {
    let body;
    try {
      body = await readFile(entry.absolute, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      throw new SiteBuildError(`Cannot stage ${entry.page}: its source ${entry.source} does not exist.`, { code: "site-source-missing", path: entry.absolute });
    }
    pages.push({ ...entry, text: stagePage(entry, body) });
  }

  // And the target is inspected BEFORE the temporary directory exists, so a refusal strands nothing.
  await assertReplaceableTarget(outDir, shell);

  await mkdir(path.dirname(outDir), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(outDir), `.${path.basename(outDir)}-`));
  try {
    await cp(shell, staging, { recursive: true });
    for (const page of pages) await writeFile(path.join(staging, page.page), page.text, "utf8");
    await rm(outDir, { recursive: true, force: true });
    await rename(staging, outDir);
  } catch (error) {
    // The staging is reclaimed; the target is NOT touched here — up to the `rm` above it still
    // holds the previous whole site, and after it nothing is left to publish.
    await rm(staging, { recursive: true, force: true });
    throw error;
  }

  return {
    out: outDir,
    pages: pages.map(({ kind, source, page, permalink, regenerate }) => ({ kind, source, page, permalink, ...(regenerate ? { regenerate } : {}) })),
  };
}

function parseArgv(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out" || arg === "--root") {
      const value = argv[index + 1];
      if (value === undefined) throw new SiteBuildError(`${arg} requires a value.`, { code: "site-argv" });
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new SiteBuildError(`Unknown argument "${arg}". Usage: node scripts/site/build-site.mjs [--root <dir>] [--out <dir>]`, { code: "site-argv" });
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { root, out } = parseArgv(process.argv.slice(2));
    const result = await buildSite({ root, out });
    const shown = posix(path.relative(process.cwd(), result.out)) || ".";
    for (const page of result.pages) console.log(`staged ${shown}/${page.page} (${page.kind}) from ${page.source}`);
    console.log(`Staged ${result.pages.length} page(s) plus the ${SHELL_DIR}/ shell into ${shown}/.`);
  } catch (error) {
    console.error(error instanceof SiteBuildError ? error.message : error.stack ?? String(error));
    process.exitCode = 1;
  }
}
