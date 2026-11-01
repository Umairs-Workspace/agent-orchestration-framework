// FF-17902 (milestone 179 / ADR-004 §2–§4) — DEPENDENCIES RUN ONE WAY.
//
// "No module under `packages/work/src/**` imports `@aof/learning`, `packages/work/package.json` does
//  not list it, and no comment-stripped `@aof/work` source spells `teach`. Under `packages/core/src`,
//  only `practices.mjs` and `application/bindings/commands/continue.mjs` import it."
//
// Why it matters: teaching is a practice with a package of its own, so that the build door and the
// work stream stay a core that names no practice (SPEC Objective). `@aof/work` offers one neutral seam
// — `operatorModes` on the phase doors — and core hands the package's descriptor to it, as it hands
// specification by example's before-build check (FF-13501 is the precedent). One import back, or the
// mode's name spelt inside `@aof/work`, would put the practice back into the package meant to know
// nothing about it. Core is held to two named importers, so the practice is composed in one place.
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
const PACKAGE = "@aof/learning";
const WORK_SRC = "packages/work/src/";
const CORE_SRC = "packages/core/src/";
// The two core modules that may name the practice package (ADR-004 §3–§4). `practices.mjs` is
// admitted before 179/02 creates it.
const CORE_IMPORTERS = Object.freeze([`${CORE_SRC}practices.mjs`, `${CORE_SRC}application/bindings/commands/continue.mjs`]);

// The specifiers in one module that reach the practice package, by name or by path.
function packageReferences(file, text) {
  const hits = [];
  for (const reference of moduleReferences(text, file).references) {
    const specifier = reference.specifier ?? "";
    if (specifier === PACKAGE || specifier.startsWith(`${PACKAGE}/`)) hits.push(`imports ${specifier}`);
    if (/(?:^|\/)learning\/src\//.test(specifier)) hits.push(`reaches the package by path: ${specifier}`);
  }
  return hits;
}

// What, in one `@aof/work` module, reaches back into the practice.
export function backReferences(file, text) {
  const hits = packageReferences(file, text);
  if (/teach/iu.test(stripComments(text))) hits.push("spells the mode's name");
  return hits;
}

async function modulesUnder(prefix) {
  return (await readRuntimeFiles(repoRoot)).filter((file) => file.rel.startsWith(prefix) && /\.m?js$/u.test(file.rel));
}

export const archTests = [
  {
    name: "arch/179 FF-17902: no @aof/work source imports @aof/learning or spells teach",
    run: async () => {
      const files = await modulesUnder(WORK_SRC);
      assert.ok(files.length > 50, "the @aof/work sources were enumerated");
      const offenders = [];
      for (const file of files) {
        for (const hit of backReferences(file.rel, await readFile(file.path, "utf8"))) offenders.push(`${file.rel}: ${hit}`);
      }
      assert.deepEqual(offenders, []);
    },
  },
  {
    name: "arch/179 FF-17902: @aof/work's manifest does not list @aof/learning",
    run: async () => {
      const work = JSON.parse(await readFile(path.join(repoRoot, "packages/work/package.json"), "utf8"));
      for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        assert.equal(PACKAGE in (work[field] ?? {}), false, `packages/work/package.json ${field} lists ${PACKAGE}`);
      }
    },
  },
  {
    name: "arch/179 FF-17902: under packages/core/src only practices.mjs and the continue binding import @aof/learning",
    run: async () => {
      const files = await modulesUnder(CORE_SRC);
      assert.ok(files.length > 50, "the core sources were enumerated");
      const importers = [];
      for (const file of files) {
        if (packageReferences(file.rel, await readFile(file.path, "utf8")).length > 0) importers.push(file.rel);
      }
      assert.deepEqual(importers.filter((rel) => !CORE_IMPORTERS.includes(rel)), [], "a core module outside the two named importers names the practice");
      assert.ok(importers.includes(`${CORE_SRC}application/bindings/commands/continue.mjs`), "the continue binding composes the practice's mode");
    },
  },
  {
    name: "arch/179 FF-17902 red probe: the detector fires on each planted back-reference, and not on a comment or a neutral seam",
    run: () => {
      const planted = [
        ['import { teachMode } from "@aof/learning/mode";', "imports @aof/learning/mode"],
        ['const practice = await import("@aof/learning");', "imports @aof/learning"],
        ['import { teachMode } from "../../learning/src/mode.mjs";', "reaches the package by path: ../../learning/src/mode.mjs"],
        ['const flag = "teach";', "spells the mode's name"],
      ];
      for (const [source, hit] of planted) {
        assert.ok(backReferences("packages/work/src/commands/continue.mjs", source).includes(hit), `${source} → ${hit}`);
      }
      assert.deepEqual(backReferences("packages/work/src/x.mjs", "// a practice may teach the operator\nconst a = 1;"), [], "a comment is not code");
      assert.deepEqual(backReferences("packages/work/src/x.mjs", "export function createPhaseDoorCommands({ beforeBuild = [], operatorModes = [] }) {}"), [], "a neutral seam names nothing");
    },
  },
];
