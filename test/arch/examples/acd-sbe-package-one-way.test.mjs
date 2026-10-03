// FF-13501 (milestone 135 / ADR-001 §2, §3) — DEPENDENCIES RUN ONE WAY.
//
// "No module under `packages/work/src/**` imports `@aof/specification-by-example`,
//  `packages/work/package.json` does not list it, and no comment-stripped `@aof/work` source spells
//  `EXAMPLES.md`."
//
// Why it matters: the practice moved out of `@aof/work` so that the core of the work stream stops
// carrying a practice most projects leave off, and so that the practice has one home that grows on
// its own. A single import back — or a second spelling of the map's file name inside `@aof/work` —
// would put the practice back into the package that is meant to know nothing about it, and the move
// would be a relabelling. `@aof/work` reaches the practice only through its three neutral seams (a
// story probe, injected budget rows, a `beforeBuild` list), and core composes the two.
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
const PACKAGE = "@aof/specification-by-example";
const WORK_SRC = "packages/work/src/";

// What, in one `@aof/work` module, reaches back into the practice.
function backReferences(file, text) {
  const hits = [];
  for (const reference of moduleReferences(text, file).references) {
    const specifier = reference.specifier ?? "";
    if (specifier === PACKAGE || specifier.startsWith(`${PACKAGE}/`)) hits.push(`imports ${specifier}`);
    if (/(?:^|\/)specification-by-example\//.test(specifier)) hits.push(`reaches the package by path: ${specifier}`);
  }
  if (/EXAMPLES\.md/.test(stripComments(text))) hits.push("spells the map's file name");
  return hits;
}

async function workModules() {
  const files = (await readRuntimeFiles(repoRoot)).filter((file) => file.rel.startsWith(WORK_SRC));
  assert.ok(files.length > 50, "the @aof/work sources were enumerated");
  return files;
}

export const archTests = [
  {
    name: "arch/135 FF-13501: no @aof/work source imports @aof/specification-by-example or spells EXAMPLES.md",
    run: async () => {
      const offenders = [];
      for (const file of await workModules()) {
        for (const hit of backReferences(file.rel, await readFile(file.path, "utf8"))) offenders.push(`${file.rel}: ${hit}`);
      }
      assert.deepEqual(offenders, []);
    },
  },
  {
    name: "arch/135 FF-13501: @aof/work's manifest does not list the package, and the package lists @aof/work",
    run: async () => {
      const work = JSON.parse(await readFile(path.join(repoRoot, "packages/work/package.json"), "utf8"));
      for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        assert.equal(PACKAGE in (work[field] ?? {}), false, `packages/work/package.json ${field} lists ${PACKAGE}`);
      }
      assert.equal(Object.keys(work.exports).some((key) => /examples/.test(key)), false, "@aof/work exports no examples module");
      const practice = JSON.parse(await readFile(path.join(repoRoot, "packages/specification-by-example/package.json"), "utf8"));
      assert.equal(practice.name, PACKAGE);
      assert.deepEqual(Object.keys(practice.dependencies).sort(), ["@aof/contracts", "@aof/work"]);
    },
  },
  {
    name: "arch/135 FF-13501 red probe: the detector fires on each planted back-reference, and not on a comment or a neutral seam",
    run: () => {
      const planted = [
        ['import { EXAMPLES_DOC } from "@aof/specification-by-example/map";', "imports @aof/specification-by-example/map"],
        ['export { storyProbe } from "@aof/specification-by-example";', "imports @aof/specification-by-example"],
        ['const lane = await import("@aof/specification-by-example/doctor-lane");', "imports @aof/specification-by-example/doctor-lane"],
        ['import { parseExampleMap } from "../../specification-by-example/src/map.mjs";', "reaches the package by path: ../../specification-by-example/src/map.mjs"],
        ['const doc = "EXAMPLES.md";', "spells the map's file name"],
      ];
      for (const [source, hit] of planted) {
        assert.ok(backReferences("packages/work/src/doctor/index.mjs", source).includes(hit), `${source} → ${hit}`);
      }
      assert.deepEqual(backReferences("packages/work/src/x.mjs", "// a story's EXAMPLES.md, read by @aof/specification-by-example\nconst a = 1;"), [], "a comment is not code");
      assert.deepEqual(backReferences("packages/work/src/x.mjs", "export function createWorkDoctor({ storyProbe = null, budgetRows = [] }) {}"), [], "a neutral seam names nothing");
    },
  },
];
