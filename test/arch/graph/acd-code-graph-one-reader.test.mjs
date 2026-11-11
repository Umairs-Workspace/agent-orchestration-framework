// FF-17904 — milestone 179 / ADR-004: the code graph has one reader. Across `packages/*/src`, the
// graph's three reader functions — `readGraph`, `normalizeGraph` and `computeImpact` — are imported
// only by the modules this allowlist names, each with its reason, and by no core binding.
//
// WHY A STATIC IMPORT SCAN. "Two faces that reach the graph only through the port" decays the first
// time a new selector imports `normalizeGraph` because it is quicker. The scan reads every module's
// named imports from the two reader homes (`graph-normalize`, `graph-impact`), by relative path or
// by package specifier, so a new reader is refused by name, with its line.
//
// THE ONE EXCEPTION IS NAMED, NEVER A GLOB. The graphify memory backend reads its own
// `.aof/memory-graph/` artifact until `retire-graphify-memory-backend` deletes it. Its entry is one
// exact path with that reason, so the exception has to be deleted with the backend rather than
// outliving it.
//
// The check is exported so the red probe runs it over a planted module.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const READERS = Object.freeze(["readGraph", "normalizeGraph", "computeImpact"]);
const READER_HOMES = /(^|\/)(graph-normalize|graph-impact)(\.mjs)?$/u;

export const ONE_READER_ALLOWLIST = Object.freeze({
  "packages/knowledge/src/graphify-code-relations.mjs": "the code corpus's one reader, behind the knowledge-engine port (179/ADR-002); the backend's read half, split from its build at PR #22 so the read-only audit family imports no file writer (77/FF-7703)",
  "packages/knowledge/src/graph-normalize.mjs": "defines readGraph and normalizeGraph, the artifact's location and shape home",
  "packages/knowledge/src/graph-impact.mjs": "defines computeImpact, the pure edge walk",
  "packages/knowledge/src/graphify.mjs": "the graphify driver re-exports the normalizer for its build verbs",
  "packages/knowledge/src/memory/graphify-backend.mjs": "reads its own .aof/memory-graph artifact until retire-graphify-memory-backend",
});

// Every `.mjs` under every `packages/<name>/src`, as { rel, text }.
function packageSources() {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".mjs")) files.push({ rel: path.relative(repoRoot, full).split(path.sep).join("/"), text: readFileSync(full, "utf8") });
    }
  };
  for (const pkg of readdirSync(path.join(repoRoot, "packages"), { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    try {
      walk(path.join(repoRoot, "packages", pkg.name, "src"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return files;
}

// Each named import of a reader from a reader home, as { rel, line, name, specifier }. The
// specifiers come from the one extractor (`test/support/module-family.mjs`); the named bindings are
// read from the brace clause that precedes each one's quoted spelling.
export function readerImports(files) {
  const found = [];
  for (const { rel, text } of files) {
    const code = stripComments(text);
    for (const { specifier, dynamic } of importSpecifiers(text)) {
      if (dynamic || !READER_HOMES.test(specifier)) continue;
      for (const quote of ['"', "'"]) {
        let at = code.indexOf(`${quote}${specifier}${quote}`);
        while (at >= 0) {
          const head = code.slice(0, at);
          const open = head.lastIndexOf("{");
          const close = head.lastIndexOf("}");
          const keyword = head.lastIndexOf("import", open);
          if (open >= 0 && close > open && keyword >= 0 && /^\s*from\s*$/u.test(head.slice(close + 1))) {
            const line = head.slice(0, keyword).split("\n").length;
            for (const binding of head.slice(open + 1, close).split(",").map((entry) => entry.trim().split(/\s+as\s+/u)[0]).filter(Boolean)) {
              if (READERS.includes(binding)) found.push({ rel, line, name: binding, specifier });
            }
          }
          at = code.indexOf(`${quote}${specifier}${quote}`, at + 1);
        }
      }
    }
  }
  return found;
}

// The FF-17904 check: each failure names the module, the line of the import and the reader.
export function oneReaderFailures(files, allowlist = ONE_READER_ALLOWLIST) {
  return readerImports(files)
    .filter((hit) => !Object.hasOwn(allowlist, hit.rel))
    .map((hit) => `${hit.rel}:${hit.line} imports ${hit.name} from ${hit.specifier} — the code graph has one reader; ask the code corpus's relations through the port (179/ADR-004)`);
}

export const archTests = [
  {
    name: "arch/179/04 FF-17904 (acd-code-graph-one-reader): only the allowed modules import the graph's readers, and no core binding does",
    run() {
      const files = packageSources();
      assert.ok(files.length > 500, `non-vacuous: ${files.length} package source modules were scanned`);
      assert.deepEqual(oneReaderFailures(files), [], "no module outside the allowlist imports readGraph, normalizeGraph or computeImpact");
      const importers = new Set(readerImports(files).map((hit) => hit.rel));
      for (const rel of importers) assert.ok(Object.hasOwn(ONE_READER_ALLOWLIST, rel), `${rel} is allowed`);
      assert.deepEqual([...importers].filter((rel) => rel.startsWith("packages/core/src/application/bindings/")), [], "no core binding imports any of the three");
      assert.ok(importers.has("packages/knowledge/src/graphify-code-relations.mjs"), "…and the code backend's read half genuinely is a reader, so this is one reader and not none");
    },
  },
  {
    name: "arch/179/04 FF-17904: the control is registered in the graph arch index",
    run() {
      const index = readFileSync(path.join(repoRoot, "test", "arch", "graph", "index.mjs"), "utf8");
      assert.match(index, /from "\.\/acd-code-graph-one-reader\.test\.mjs"/u);
      assert.match(index, /\.\.\.acdCodeGraphOneReaderTests,/u);
    },
  },
  {
    name: "arch/179/04 FF-17904 red probe: a select.mjs that imports readGraph from the graph-normalize module fails, naming the module, the line and the reader",
    run() {
      const rel = "packages/work/src/testing/select.mjs";
      const text = readFileSync(path.join(repoRoot, rel), "utf8");
      const planted = `import { readGraph } from "@aof/knowledge/graph-normalize";\n${text}`;
      assert.deepEqual(oneReaderFailures([{ rel, text: planted }]).map((failure) => failure.split(" — ")[0]), [`${rel}:1 imports readGraph from @aof/knowledge/graph-normalize`]);
    },
  },
  {
    name: "arch/179/04 FF-17904: the retiring backend's exception is named, not a wildcard",
    run() {
      assert.equal(ONE_READER_ALLOWLIST["packages/knowledge/src/memory/graphify-backend.mjs"], "reads its own .aof/memory-graph artifact until retire-graphify-memory-backend");
      for (const rel of Object.keys(ONE_READER_ALLOWLIST)) assert.doesNotMatch(rel, /[*?[\]{}]/u, `${rel} is one exact path, never a glob`);
      assert.ok(Object.isFrozen(ONE_READER_ALLOWLIST));
    },
  },
];
