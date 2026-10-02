import { createRequire } from "node:module";
import { importSpecifiers } from "../../support/module-family.mjs";
const require = createRequire(import.meta.url);
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MODULE = "packages/work-graph/src/record.mjs";

// FF-7801 — the projection is PURE. It computes over injected records only: no filesystem, no
// clock, no spawn. That is what lets the renderer (78/01) and the writer (78/02) be built beside it
// rather than behind it, and what makes the whole of it testable against literal fixtures.
//
// THROUGH ITS DIRECT IMPORTS, not just its own body. A pure module that imports an impure one has
// only moved the impurity one hop, so the sweep follows every local module `packages/core/src/loop-record.mjs`
// imports and holds it to the same rule.
const FORBIDDEN = [
  { what: "the filesystem", pattern: /node:fs|require\(\s*["']fs["']|\bfrom\s+["']fs["']/ },
  { what: "a child process", pattern: /node:child_process|\bspawn\s*\(|\bexecFile\s*\(|\bexecSync\s*\(/ },
  { what: "a clock", pattern: /Date\.now\s*\(|new\s+Date\s*\(|performance\.now\s*\(|process\.hrtime/ },
];

// A local import — the ones this gate follows. A bare specifier is a dependency, and this module
// has none; the assertion below is what keeps that true.
const LOCAL_IMPORT = /\bfrom\s+["'](\.[^"']*)["']/g;

async function sourceOf(rel) {
  return stripComments(await readFile(path.join(root, rel), "utf8"));
}

function importsOf(source, rel) {
  return importSpecifiers(source).map(({ specifier }) => specifier.startsWith(".")
    ? path.posix.normalize(path.posix.join(path.posix.dirname(rel), specifier))
    : path.relative(root, require.resolve(specifier)).replaceAll("\\", "/"));
}

export const archTests = [
  {
    name: "arch/78 FF-7801: the execution projection reaches no filesystem, clock or spawn",
    run: async () => {
      const source = await sourceOf(MODULE);
      assert.ok(source.length > 1000, "the module under test is non-trivial, so this sweep is not vacuous");
      for (const { what, pattern } of FORBIDDEN) {
        assert.doesNotMatch(source, pattern, `${MODULE} reaches ${what}`);
      }
    },
  },
  {
    name: "arch/78 FF-7801: every module the projection directly imports is pure by the same rule",
    run: async () => {
      const source = await sourceOf(MODULE);
      const direct = importsOf(source, MODULE);
      assert.ok(direct.length > 0, "the projection has at least one direct local import to follow");
      assert.deepEqual(direct, ["packages/contracts/src/loop-bounds.mjs"],
        "the projection's direct import set is the one this gate has checked — a new import re-opens the question");
      for (const rel of direct) {
        const imported = await sourceOf(rel);
        for (const { what, pattern } of FORBIDDEN) {
          assert.doesNotMatch(imported, pattern, `${rel}, imported by ${MODULE}, reaches ${what}`);
        }
      }
    },
  },
  {
    name: "arch/78 FF-7801: the projection takes no dependency outside this repository",
    run: async () => {
      const source = await sourceOf(MODULE);
      const bare = [...source.matchAll(/\bfrom\s+["']([^."'][^"']*)["']/g)].map((match) => match[1]);
      assert.deepEqual(bare, ["@aof/contracts/loop-bounds"], "a pure leaf imports nothing it does not own");
    },
  },
  {
    name: "arch/78 FF-7810: the projection is named into the execution family, outside FF-5201's discovery patterns",
    run: async () => {
      // ADR-009 — 52/FF-5201 discovers `packages/core/src/work-loops*.mjs` and `packages/core/src/commands/loops-*.mjs` and
      // holds every discovered module read-only. `packages/core/src/loop-record.mjs` matches neither, which is
      // the distinction the gate encodes rather than an evasion of it: the registry is framework
      // data, an execution is a per-item fact.
      const leaf = MODULE.slice("packages/core/src/".length);
      assert.doesNotMatch(leaf, /^work-loops.*\.mjs$/, "the projection is not discovered as a registry module");
      assert.ok(!MODULE.startsWith("packages/core/src/commands/loops-"), "the projection is not discovered as a registry command");
    },
  },
];
