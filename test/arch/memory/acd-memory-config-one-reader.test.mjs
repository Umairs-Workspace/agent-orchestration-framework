// FF-18001 — milestone 180 / story 01, ADR-001.
//
// "Across `packages/*/src`, only `packages/knowledge/src/memory-config.mjs` reads `corpora`,
//  `sources`, `graphify`, `backends` or `graph` off a memory object, or `graph` off the root config;
//  that module imports only `@aof/contracts/error` and `engine.mjs`."
//
// Plus the scenario beside it: the selection keeps its single read. `memory-config.mjs` never reads
// `backend`, and the one read of `memory.backend` stays in the memory seam (05/ADR-002).
//
// THE DETECTOR IS TEXTUAL, over code with comments stripped and string literals blanked, so prose
// and labels (`"aof.memory.graphify.index.json"`, a message naming `memory.sources`) never count. A
// read is a property access off an identifier named `memory` or `configMemory` — the two names the
// node travels under — or a `graph` access off one named `config`. It cannot see a read through a
// renamed alias or a destructure; it is a ratchet on the spelling every reader used before 180, and
// the plant below proves it bites on that spelling.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceFiles } from "../../../scripts/source-inventory.mjs";
import { blankStringLiterals, stripComments } from "../../support/source-slice.mjs";
import { computedDynamicImports, importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const READER = "packages/knowledge/src/memory-config.mjs";
const SEAM = "packages/knowledge/src/memory.mjs";
const NODE_KEYS = "corpora|sources|graphify|backends|graph";
const DOT_READ = new RegExp(`\\b(?:memory|configMemory)\\s*\\??\\.\\s*(?:${NODE_KEYS})\\b`, "u");
const BRACKET_READ = new RegExp(`\\b(?:memory|configMemory)\\s*(?:\\?\\.)?\\s*\\[\\s*["'\`](?:${NODE_KEYS})["'\`]\\s*\\]`, "u");
const ROOT_GRAPH = /\bconfig\s*\??\.\s*graph\b|\bconfig\s*(?:\?\.)?\s*\[\s*["'`]graph["'`]\s*\]/u;
const SELECTION_READ = /memory\s*\??\.\s*backend\b/gu;

function packageSources() {
  return sourceFiles(repoRoot)
    .filter((file) => /^packages\/[^/]+\/src\//u.test(file.rel))
    .map((file) => ({ rel: file.rel, source: readFileSync(file.path, "utf8") }));
}

// The modules that read the node's keys: `{ rel, line }` for every hit.
function nodeReaders(files) {
  const hits = [];
  for (const { rel, source } of files) {
    // Both passes strip comments the same way, so their lines stay aligned with each other.
    const blanked = blankStringLiterals(source).split(/\r?\n/u);
    stripComments(source).split(/\r?\n/u).forEach((line, index) => {
      const code = blanked[index] ?? "";
      if (DOT_READ.test(code) || ROOT_GRAPH.test(code) || BRACKET_READ.test(line)) hits.push({ rel, line: index + 1 });
    });
  }
  return hits;
}

export const archTests = [
  {
    name: "arch/180 FF-18001 + 180/01 task 00: FF-18001 — only memory-config.mjs reads the node's keys, and it imports no index, backend or transport",
    run: () => {
      const files = packageSources();
      assert.ok(files.some((file) => file.rel === READER), `${READER} exists`);
      const outside = nodeReaders(files).filter((hit) => hit.rel !== READER);
      assert.deepEqual(outside, [], `only ${READER} reads corpora/sources/graphify/backends/graph off a memory object, or graph off the root config`);
      assert.ok(nodeReaders(files).some((hit) => hit.rel === READER), "the detector sees the reader's own reads (non-vacuity)");

      const reader = files.find((file) => file.rel === READER).source;
      assert.deepEqual(importSpecifiers(reader).map((entry) => entry.specifier).sort(), ["./engine.mjs", "@aof/contracts/error"], "memory-config.mjs imports only the error contract and the corpus vocabulary");
      assert.deepEqual(computedDynamicImports(reader), [], "and hides no computed import");

      // The control bites: each spelling a pre-180 reader used is reported when planted elsewhere.
      for (const planted of [
        "export const read = (config) => config.memory.sources;",
        "export const read = (ctx) => ctx.configMemory?.graphify;",
        "export const read = (config) => config?.graph ?? {};",
        "export const read = (memory) => memory[\"corpora\"];",
      ]) {
        const caught = nodeReaders([{ rel: "packages/planted/src/planted.mjs", source: planted }]);
        assert.equal(caught.length, 1, `the planted read is reported: ${planted}`);
      }
      // …and prose that merely names a key is not a read.
      assert.deepEqual(nodeReaders([{ rel: "packages/planted/src/prose.mjs", source: 'const file = "aof.memory.graphify.index.json"; // memory.sources\n' }]), []);
    },
  },
  {
    name: "arch/180 FF-18001 + 180/01 task 00: the selection keeps its single read",
    run: () => {
      const files = packageSources();
      const reader = blankStringLiterals(files.find((file) => file.rel === READER).source);
      assert.doesNotMatch(reader, /\.\s*backend\b/u, "memory-config.mjs reads no `backend` key");
      assert.doesNotMatch(stripComments(files.find((file) => file.rel === READER).source), /\[\s*["'`]backend["'`]\s*\]/u, "not even by a computed member");
      const reads = files.flatMap(({ rel, source }) => (stripComments(source).match(SELECTION_READ) ?? []).map(() => rel));
      assert.deepEqual(reads, [SEAM], "memory.backend is read once, in the memory seam");
      const seam = stripComments(files.find((file) => file.rel === SEAM).source);
      assert.match(seam, /export function selectBackendName\(config\) \{\n\s*return declaredBackendName\(config\) \?\? "none";/u, "selectBackendName answers through that one read");
      assert.match(seam, /export function declaredBackendName\(config\) \{\n\s*const declared = config\?\.memory\?\.backend;/u, "and the read is declaredBackendName's");
    },
  },
];
