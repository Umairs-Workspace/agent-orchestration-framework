// FF-21001 — milestone 210 / ADR-003, ADR-008: TESTING READS NO CODE GRAPH.
//
// No module under `packages/work/src/testing/`, nor `packages/work/src/commands/test.mjs`, imports
// the code-relations port or a graph reader, and the test command's core bindings are handed no
// `codeRelations` service.
//
// WHY. The selection 72 built read the code graph, and on every commit measured at the start of 210
// it widened to the whole tree: a stale graph, a file the graph did not hold, a document no suite
// imported (210 STATE, the measurement). The rewrite has the agent choose from the project's own
// words, and the suggestion is a fresh text scan (ADR-003). A graph read creeping back is the first
// step back to a selection that answers "everything" for almost any change, so it is refused by name.
//
// It replaces FF-19003 (narrowing closed and positive) and its file, retired with their subject.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The subject: every testing module, and the command face.
const TESTING_DIR = "packages/work/src/testing";
const FACE = "packages/work/src/commands/test.mjs";
// The core bindings that compose the test command.
const BINDINGS = Object.freeze([
  "packages/core/src/application/bindings/commands/test.mjs",
  "packages/core/src/application/bindings/work/test-changed.mjs",
]);
const ASSEMBLY = "packages/core/src/application/assemble.mjs";

// A route to the graph: the knowledge package's graph modules or its code-relations port, by
// specifier, or a reader named in the source.
const GRAPH_SPECIFIER = /from\s+["'](?:@aof\/knowledge\/(?:graph[\w-]*|graphify[\w-]*|code-relations)|[^"']*graph-(?:normalize|impact)(?:\.mjs)?|[^"']*code-relations(?:\.mjs)?)["']/gu;
const GRAPH_READER = /\b(?:readGraph|normalizeGraph|computeImpact|graphJsonPath|graphArtifactBuiltAt|codeRelations|relations\s*\()/gu;

function subject() {
  const testing = readdirSync(path.join(repoRoot, TESTING_DIR)).filter((name) => name.endsWith(".mjs")).map((name) => `${TESTING_DIR}/${name}`);
  return [...testing.sort(), FACE];
}

const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");

// Every route a module's own code opens to the graph, as `<file>:<line> <match>`.
export function graphRoutes(files) {
  const found = [];
  for (const { rel, text } of files) {
    const lines = stripComments(text).split("\n");
    lines.forEach((line, index) => {
      for (const pattern of [GRAPH_SPECIFIER, GRAPH_READER]) {
        for (const match of line.matchAll(pattern)) found.push(`${rel}:${index + 1} ${match[0].trim()}`);
      }
    });
  }
  return found;
}

// The line in the assembly that composes the test command.
const testAssemblyLine = (text) => text.split("\n").find((line) => line.includes("assembleCommandsTest({")) ?? "";

export const archTests = [
  {
    name: "arch/210 FF-21001 (acd-test-selection-reads-no-graph): no testing module and not the test command opens a route to the code graph",
    run() {
      const files = subject().map((rel) => ({ rel, text: read(rel) }));
      assert.ok(files.some((file) => file.rel.endsWith("/importers.mjs")) && files.some((file) => file.rel.endsWith("/suites.mjs")), "the subject holds the scan and the predicate");
      assert.deepEqual(graphRoutes(files), []);
    },
  },
  {
    name: "arch/210 FF-21001: the test command's core bindings are handed no codeRelations service",
    run() {
      const line = testAssemblyLine(read(ASSEMBLY));
      assert.ok(line.length > 0, "the assembly composes the test command");
      assert.doesNotMatch(line, /codeRelations|testSelect/u, line);
      for (const rel of BINDINGS) assert.deepEqual(graphRoutes([{ rel, text: read(rel) }]), [], `${rel} opens no route to the graph`);
    },
  },
  {
    name: "arch/210 FF-21001 red probe: importing the code-relations port into importers.mjs fails, naming the module and the line",
    run() {
      const rel = `${TESTING_DIR}/importers.mjs`;
      const planted = `import { createCodeRelations } from "@aof/knowledge/graphify-code-relations";\n${read(rel)}`;
      const routes = graphRoutes([{ rel, text: planted }]);
      assert.ok(routes.length > 0, "the planted import is a route");
      assert.ok(routes[0].startsWith(`${rel}:1 `), routes[0]);
      const handed = testAssemblyLine(read(ASSEMBLY)).replace("assembleCommandsTest({", "assembleCommandsTest({ codeRelationsServices: codeRelations,");
      assert.match(handed, /codeRelations/u, "a planted codeRelations service on the assembly line is seen");
    },
  },
];
