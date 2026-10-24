// FF-13304 — DIAGRAMMING IS ITS OWN PACKAGE, AND DEPENDENCIES RUN ONE WAY.
//
// "No module under `packages/work/src/**` or `packages/core/src/**` imports a diagram module by
//  relative path, `packages/work/package.json` does not list `@aof/diagrams`, `@aof/diagrams`
//  lists `@aof/work`, and core registers the diagram verbs through `@aof/diagrams`' own
//  contribution rather than @aof/work's."
//
// Why it matters: the diagram verbs, the layout, the generator adapter and the doctor lane moved
// out of `@aof/work` and core so that diagramming is ONE unit core composes and can leave out — the
// node half of an opt-out that the browser half (the Excalidraw editor) will join. A single import
// back from `@aof/work`, or a diagram verb riding the work contribution again, would make the move a
// relabelling: the package would exist and the seam would not. `@aof/work` reaches diagramming only
// through its injected doctor seams (`diagramsGroup`, `diagramListing`), and core composes the two —
// the FF-13501 shape, applied to diagrams.
//
// The import detector reads the syntax tree (`moduleReferences`, the workspace boundary check's own
// parser), so a specifier in a comment or a string is not an import and a dynamic `import()` is.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { moduleReferences } from "../../../scripts/workspace-boundaries.mjs";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PACKAGE = "@aof/diagrams";
const WORK_SRC = "packages/work/src/";
const CORE_SRC = "packages/core/src/";

// What, in one `@aof/work` module, reaches into the package — by name or by path.
function workBackReferences(file, text) {
  const hits = [];
  for (const reference of moduleReferences(text, file).references) {
    const specifier = reference.specifier ?? "";
    if (specifier === PACKAGE || specifier.startsWith(`${PACKAGE}/`)) hits.push(`imports ${specifier}`);
    if (/(?:^|\/)diagrams\/src\//.test(specifier)) hits.push(`reaches the package by path: ${specifier}`);
  }
  return hits;
}

// What, in one core module, reaches a diagram module OTHER than through the package's exports: a
// relative path into the retired homes, or the work package's retired diagram exports.
const RETIRED = [/^@aof\/work\/diagrams\//u, /^@aof\/work\/commands\/diagram\//u, /^@aof\/work\/doctor\/diagrams$/u, /(?:^|\/)diagrams\/generators\.mjs$/u, /(?:^|\/)diagrams\/generator-[^/]+\.mjs$/u];
function coreRetiredReferences(file, text) {
  const hits = [];
  for (const reference of moduleReferences(text, file).references) {
    const specifier = reference.specifier ?? "";
    if (RETIRED.some((form) => form.test(specifier))) hits.push(`imports a retired diagram home: ${specifier}`);
  }
  return hits;
}

async function modulesUnder(prefix, floor) {
  const files = (await readRuntimeFiles(repoRoot, { runtime: "node" })).filter((file) => file.rel.startsWith(prefix));
  assert.ok(files.length > floor, `the ${prefix} sources were enumerated (${files.length})`);
  return files;
}

export const archTests = [
  {
    name: "arch/133 FF-13304: no @aof/work source imports @aof/diagrams, and no core source imports a retired diagram home",
    run: async () => {
      const offenders = [];
      for (const file of await modulesUnder(WORK_SRC, 50)) {
        for (const hit of workBackReferences(file.rel, await readFile(file.path, "utf8"))) offenders.push(`${file.rel}: ${hit}`);
      }
      for (const file of await modulesUnder(CORE_SRC, 50)) {
        for (const hit of coreRetiredReferences(file.rel, await readFile(file.path, "utf8"))) offenders.push(`${file.rel}: ${hit}`);
      }
      assert.deepEqual(offenders, []);
    },
  },
  {
    name: "arch/133 FF-13304: @aof/work's manifest does not list the package and exports no diagram module; the package lists @aof/work; core lists the package",
    run: async () => {
      const work = JSON.parse(await readFile(path.join(repoRoot, "packages/work/package.json"), "utf8"));
      for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        assert.equal(PACKAGE in (work[field] ?? {}), false, `packages/work/package.json ${field} lists ${PACKAGE}`);
      }
      assert.deepEqual(Object.keys(work.exports).filter((key) => /diagram/u.test(key)), [], "@aof/work exports no diagram module");
      const diagrams = JSON.parse(await readFile(path.join(repoRoot, "packages/diagrams/package.json"), "utf8"));
      assert.equal(diagrams.name, PACKAGE);
      assert.deepEqual(Object.keys(diagrams.dependencies).sort(), ["@aof/contracts", "@aof/work"]);
      const core = JSON.parse(await readFile(path.join(repoRoot, "packages/core/package.json"), "utf8"));
      assert.equal(core.dependencies[PACKAGE], "workspace:*", "core composes the package by declared dependency");
    },
  },
  {
    name: "arch/133 FF-13304: the diagram verbs ride @aof/diagrams' contribution, and @aof/work's contribution no longer owns their ids",
    run: async () => {
      const registry = stripComments(await readFile(path.join(repoRoot, "packages/core/src/application/bindings/command-core.mjs"), "utf8"));
      assert.match(registry, /createDiagramsContribution\(\[diagramPlanCommand, diagramExportCommand, diagramFileCommand, diagramSceneCommand, diagramCapabilityCommand\]\)/u, "the five verbs are registered through the package's contribution");
      assert.doesNotMatch(registry, /createWorkContribution\(\[[^\]]*diagram[^\]]*\]\)/u, "no diagram verb rides the work contribution");
      const { WORK_COMMAND_IDS } = await import("@aof/work/commands");
      assert.deepEqual(WORK_COMMAND_IDS.filter((id) => id.startsWith("diagram:")), [], "@aof/work owns no diagram: id");
      const { DIAGRAM_COMMAND_IDS } = await import("@aof/diagrams/contribution");
      assert.deepEqual([...DIAGRAM_COMMAND_IDS], ["diagram:plan", "diagram:export", "diagram:file", "diagram:scene", "diagram:capability"]);
    },
  },
  {
    name: "arch/133 FF-13304 red probe: the detectors fire on each planted back-reference and retired home, and not on a comment or an injected seam",
    run: () => {
      const planted = [
        ['import { DIAGRAMS_DIR } from "@aof/diagrams/layout";', "imports @aof/diagrams/layout"],
        ['const lane = await import("@aof/diagrams/doctor-lane");', "imports @aof/diagrams/doctor-lane"],
        ['import { x } from "../../diagrams/src/layout.mjs";', "reaches the package by path: ../../diagrams/src/layout.mjs"],
      ];
      for (const [source, hit] of planted) {
        assert.ok(workBackReferences("packages/work/src/doctor/index.mjs", source).includes(hit), `${source} → ${hit}`);
      }
      for (const source of [
        'import { generatorIds } from "../../diagrams/generators.mjs";',
        'import { createDiagramPlanCommand } from "@aof/work/commands/diagram/plan";',
        'import { createDoctorDiagrams } from "@aof/work/doctor/diagrams";',
        'import { renderDiagramBlock } from "@aof/work/diagrams/layout";',
      ]) {
        assert.equal(coreRetiredReferences("packages/core/src/application/bindings/x.mjs", source).length, 1, source);
      }
      assert.deepEqual(coreRetiredReferences("packages/core/src/x.mjs", 'import { generatorIds } from "@aof/diagrams/generators";'), [], "the package's export is the admitted route");
      assert.deepEqual(workBackReferences("packages/work/src/x.mjs", "// the diagrams lane is @aof/diagrams' (see @aof/diagrams/doctor-lane)\nconst a = 1;"), [], "a comment is not code");
      assert.deepEqual(workBackReferences("packages/work/src/x.mjs", "export function createWorkDoctor({ diagramsGroup, diagramListing = async () => null }) {}"), [], "an injected seam names nothing");
    },
  },
];
