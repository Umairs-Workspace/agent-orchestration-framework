import { defaultApplication as _aofApplication } from "aof/default-application";
// FF-21002 — milestone 210 / ADR-003: ONE IMPORT SCAN. It replaces FF-9604's one-selector legs,
// whose selector, declared changed set and `--story` input 210/ADR-008 removed.
//
// Only `packages/work/src/testing/importers.mjs` parses suite import specifiers or searches suite
// text for a path, and `--suggest` and `--failed` reach it through one binding.
//
// WHY. The selector this replaces existed to prevent one failure, and it still applies: a second
// scan built beside the first because the new input felt like a new problem. Two scans agree until
// a specifier form one of them does not read, and then the agent holding the shorter list has been
// told a falsehood in the shape of an answer. So "one scan" is asserted structurally.
//
// THREE CLAIMS, each failing for its own reason:
//
//   1. ONE PARSER. In the testing family, the command face and its core bindings, only importers.mjs
//      holds an import-specifier pattern or builds a pattern to search text for a path.
//   2. ONE BINDING. Across `packages/*/src`, only the test command's core binding imports the scan,
//      and the face receives it from that binding rather than importing it.
//   3. THE FACE ASKS IT. `--suggest` hands the working tree's changed set to the scan it was given,
//      once, and reports exactly what the scan answered.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const runTest = _aofApplication.work.commandTools.test.runTest;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const TESTING_DIR = "packages/work/src/testing";
const SCAN = `${TESTING_DIR}/importers.mjs`;
const FACE = "packages/work/src/commands/test.mjs";
const BINDING = "packages/core/src/application/bindings/commands/test.mjs";
const SUBJECT_EXTRA = Object.freeze([FACE, BINDING, "packages/core/src/application/bindings/work/test-changed.mjs"]);

const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");

// An import-specifier pattern: a regular expression literal that reads `import`, `from` or
// `require(`; or a pattern built at runtime, which is how a path is searched for in text.
const SPECIFIER_PATTERN = /\/(?:[^/\n\\]|\\.)*(?:import\\s|from\\s|require\\s\*\\\()(?:[^/\n\\]|\\.)*\/[gimsuy]*/u;
const BUILT_PATTERN = /\bnew RegExp\s*\(/u;

// Every module in the subject that parses specifiers or searches text for a path, but the scan.
export function secondParsers(files) {
  return files
    .filter(({ rel }) => rel !== SCAN)
    .flatMap(({ rel, text }) => stripComments(text).split("\n").flatMap((line, index) => (
      SPECIFIER_PATTERN.test(line) || BUILT_PATTERN.test(line) ? [`${rel}:${index + 1} ${line.trim()}`] : []
    )));
}

function subject() {
  const testing = readdirSync(path.join(repoRoot, TESTING_DIR)).filter((name) => name.endsWith(".mjs")).map((name) => `${TESTING_DIR}/${name}`);
  return [...testing.sort(), ...SUBJECT_EXTRA].map((rel) => ({ rel, text: read(rel) }));
}

// The modules that import the scan, by package specifier or by relative path.
const IMPORTS_SCAN = /from\s+["'](?:@aof\/work\/testing\/importers|(?:\.{1,2}\/)+(?:testing\/)?importers(?:\.mjs)?)["']/u;

export const archTests = [
  {
    name: "arch/210 FF-21002 (acd-one-selector-one-changed-set): only importers.mjs parses import specifiers or searches suite text for a path",
    run() {
      const files = subject();
      assert.ok(SPECIFIER_PATTERN.test(stripComments(read(SCAN))) && BUILT_PATTERN.test(stripComments(read(SCAN))), "the scan itself is seen by both patterns, so the census is not vacuous");
      assert.deepEqual(secondParsers(files), []);
    },
  },
  {
    name: "arch/210 FF-21002: --suggest and --failed reach the scan through one binding",
    async run() {
      const importers = (await readRuntimeFiles(repoRoot))
        .filter((file) => file.rel !== SCAN && IMPORTS_SCAN.test(stripComments(readFileSync(file.path, "utf8"))))
        .map((file) => file.rel);
      assert.deepEqual(importers, [BINDING], "only the test command's core binding imports the scan");
      assert.doesNotMatch(stripComments(read(FACE)), IMPORTS_SCAN, "the face receives the scan; it does not import it");
      assert.match(read(FACE), /createTestCommand\(\{[^}]*\bscanImporters\b/u, "the face takes the scan as a collaborator");
    },
  },
  {
    name: "arch/210 FF-21002: --suggest hands the working tree's changed set to the scan once, and reports what it answered",
    async run() {
      const asked = [];
      const scan = async (input) => {
        asked.push(input.changed);
        return { suites: [{ file: "test/a.test.mjs", reachedBy: [{ file: "src/a.mjs", how: "imports" }] }], unreached: ["docs/x.md"], unresolved: [] };
      };
      const out = await runTest({ suggest: true }, {
        projectRoot: repoRoot,
        config: {},
        resolveToolchain: () => ({ ok: true, toolchain: { roots: ["test"], deadlineMs: 1, report: { format: "tap" } } }),
        walk: async () => ["test/a.test.mjs"],
        readChanged: async () => ({ ok: true, changed: ["docs/x.md", "src/a.mjs"] }),
        scan,
        exportMap: async () => new Map(),
        run: async () => { throw new Error("--suggest must launch nothing"); },
      });
      assert.deepEqual(asked, [["docs/x.md", "src/a.mjs"]], "asked once, with the changed set");
      assert.deepEqual(out.suggestion.suites.map((entry) => entry.suite), ["test/a.test.mjs"]);
      assert.deepEqual([...out.suggestion.unreached], ["docs/x.md"]);
    },
  },
  {
    name: "arch/210 FF-21002 red probe: a specifier regex added to commands/test.mjs fails, naming the module and the line",
    run() {
      const planted = `${read(FACE)}\nconst SPECIFIER = /\\bimport\\s*["']([^"']+)["']/gu;\n`;
      const found = secondParsers([{ rel: FACE, text: planted }]);
      assert.equal(found.length, 1, found.join("\n"));
      assert.ok(found[0].startsWith(`${FACE}:`), found[0]);
    },
  },
];
