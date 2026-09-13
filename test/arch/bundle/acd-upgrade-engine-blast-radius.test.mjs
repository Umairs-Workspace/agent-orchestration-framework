// Fitness function for milestone 40 / ADR-005 — the god-node blast-radius guard for the
// upgrade engine (mirrors m41/ADR-001's acd-reindex-engine-blast-radius).
//
//   "The migration registry + engine are a NEW module (src/work/upgrade.mjs) that
//    IMPORTS work.mjs's readers + the ADR-004 writer; work.mjs NEVER imports the engine
//    back. The god-node's 39-module blast radius does not grow."
//
// `aof graph impact src/work.mjs` (refine 40): imported/called by 39 modules, imports
// only 3 (fs, node-identity, workspace). Bolting the upgrade engine INTO work.mjs would
// inherit that whole blast radius. This pins the dependency DIRECTION on import
// specifiers (comment-stripped so a documenting mention never trips it):
//   - work.mjs imports NO upgrade engine module — asserted NOW, always live;
//   - GUARD-IF-PRESENT: once src/work/upgrade.mjs exists it MUST import ./work.mjs (the
//     engine depends on the readers, never the reverse).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORK = path.join(repoRoot, "src", "work.mjs");
const UPGRADE = path.join(repoRoot, "src", "work", "upgrade.mjs");

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// The upgrade ENGINE module specifier work.mjs must never pull in.
const ENGINE_MODULE = /(^|\/)(work-upgrade|upgrade)\.mjs$/;
const WORK_MODULE = /(^|\/)work\.mjs$/;

export const archTests = [
  {
    name: "arch/ADR-005(m40): src/work.mjs imports NO upgrade engine module — the 39-module god-node blast radius does not grow",
    run: async () => {
      const specs = importSpecifiers(stripComments(await readFile(WORK, "utf8"))).map((entry) => entry.specifier);
      assert.ok(specs.length > 0, `${WORK} was read and has imports — an empty import list would pass the absence claim below over nothing (FF-11902)`);
      const engineImports = specs.filter((s) => ENGINE_MODULE.test(s));
      assert.deepEqual(
        engineImports,
        [],
        `src/work.mjs imports no upgrade engine — imports: ${specs.join(", ")}`,
      );
      // Self-checks (non-vacuous): the matcher catches the engine-module form and does
      // NOT flag work.mjs's legitimate dependencies.
      for (const bad of ["./work/upgrade.mjs", "../src/work/upgrade.mjs", "./upgrade.mjs"]) {
        assert.ok(ENGINE_MODULE.test(bad), `the matcher catches a real ${bad} import`);
      }
      for (const ok of ["./fs.mjs", "./node-identity.mjs", "./workspace.mjs"]) {
        assert.ok(!ENGINE_MODULE.test(ok), `the matcher does NOT flag work.mjs's legitimate dependency (${ok})`);
      }
    },
  },
  {
    name: "arch/ADR-005(m40): GUARD-IF-PRESENT — once src/work/upgrade.mjs exists it imports ./work.mjs (the engine depends on the readers + the ADR-004 writer, never the reverse)",
    run: async () => {
      assert.ok(existsSync(UPGRADE), `the upgrade engine must be readable at ${UPGRADE} — a subject a control cannot find is a FAILURE, never a skip (119/01, ADR-003 §4): this gate returned green having asserted nothing, so a move of its subject was undetectable at review`);
      const specs = importSpecifiers(stripComments(await readFile(UPGRADE, "utf8"))).map((entry) => entry.specifier);
      const importsWork = specs.some((s) => WORK_MODULE.test(s));
      assert.ok(
        importsWork,
        `src/work/upgrade.mjs must import ./work.mjs (the engine consumes work.mjs's readers + writer) — imports: ${specs.join(", ")}`,
      );
      // Self-check (non-vacuous): the WORK matcher recognises the real specifier and does
      // not confuse the engine module for it.
      assert.ok(WORK_MODULE.test("./work.mjs"), "the WORK matcher recognises ./work.mjs");
      assert.ok(!WORK_MODULE.test("./work/upgrade.mjs"), "the WORK matcher does not confuse work-upgrade.mjs for work.mjs");
    },
  },
];
