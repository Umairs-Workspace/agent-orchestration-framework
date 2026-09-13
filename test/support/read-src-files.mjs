// test/support/read-src-files.mjs — shared helper for the milestone-70 arch guards
// (FF-7004, FF-7005) that measure an absence "anywhere in src/**". One walker, two
// consumers — never two implementations of the same scan.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// readSrcFiles(repoRoot) — every src/**/*.mjs file as `{ rel, path }`, where `rel` is
// the slash-joined path relative to src/. Used to assert that a forbidden argv shape
// (a `--system-prompt` replacement, a second claude launch builder) exists nowhere.
export async function readSrcFiles(repoRoot) {
  const srcDir = path.join(repoRoot, "src");
  const out = [];
  async function walk(dir, relPrefix) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.name.endsWith(".mjs")) {
        out.push({ rel, path: full });
      }
    }
  }
  await walk(srcDir, "");
  return out;
}

// ONE READ OF src/**, SHARED (milestone 70 / story 05). Three suites assert the same fact —
// "no second ceiling literal exists outside the compiler" — and each was globbing and
// reading every src file to do it, ~113 ms a copy. The invariant is FF-7003's; the WALK is
// nobody's, which is how it came to be written three times. `srcFilesContaining` is that
// walk, and the bodies are read once per process because they cannot change under a running
// suite. (A cache in a TEST SUPPORT module, not in the pure compiler — the leaf stays
// stateless, which is what makes its output a function of its inputs.)
let bodyCache = null;

async function srcBodies(repoRoot) {
  if (bodyCache == null) {
    bodyCache = new Map();
    for (const file of await readSrcFiles(repoRoot)) {
      bodyCache.set(file.rel, await readFile(file.path, "utf8"));
    }
  }
  return bodyCache;
}

/**
 * Every `src/**` file whose text contains `needle`, as slash-joined paths relative to src/,
 * excluding any whose relative path ends with one of `except`. Returns the paths rather
 * than a count so a failure names WHICH file broke the invariant.
 */
export async function srcFilesContaining(repoRoot, needle, { except = [] } = {}) {
  const bodies = await srcBodies(repoRoot);
  const hits = [];
  for (const [rel, text] of bodies) {
    if (except.some((tail) => rel === tail || rel.endsWith(`/${tail}`))) continue;
    if (text.includes(needle)) hits.push(rel);
  }
  return hits;
}
