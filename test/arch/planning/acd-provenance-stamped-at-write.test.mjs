import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileProvenance, PROVENANCE_KEYS } from "../../../src/claim-provenance.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { assertFamilyPurity } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const archTests = [
  {
    name: "arch/FF-5504 provenance is one frozen four-key pure compiler",
    async run() {
      assert.ok(Object.isFrozen(PROVENANCE_KEYS));
      assert.deepEqual([...PROVENANCE_KEYS], ["node", "run", "commit", "at"]);
      const compiled = compileProvenance({ node: "node-a", run: null, commit: null, at: "2026-08-26T14:00:00.000Z" });
      assert.deepEqual(Object.keys(compiled), [...PROVENANCE_KEYS]);

      const source = stripComments(await readFile(path.join(root, "src", "claim-provenance.mjs"), "utf8"));
      // The compiler depends on nothing outside itself, asserted over its FAMILY (119/ADR-002): the
      // subject is `src/claim-provenance/` when that directory exists and the file when it does not,
      // so decomposing the compiler stays legal while every external dependency stays a violation.
      await assertFamilyPurity(assert, root, "src/claim-provenance");
      for (const forbidden of ["Date.now(", "new Date(", "node:fs", "child_process", "process.", "git ", "transcript", "mtime", "readdir", "readFile"]) {
        assert.ok(!source.includes(forbidden), `the pure compiler does not read ${forbidden}`);
      }

      const constructors = [];
      for (const file of await readSrcFiles(root)) {
        const code = stripComments(await readFile(file.path, "utf8"));
        if (/provenance\s*:\s*\{/u.test(code)) constructors.push(file.rel);
      }
      assert.deepEqual(constructors, [], "no src module constructs an envelope beside the one compiler");
    },
  },
  {
    name: "arch/FF-5504 durable grade and reading writes are guarded and no back-fill source exists",
    async run() {
      const runStore = stripComments(await readFile(path.join(root, "src", "run-store.mjs"), "utf8"));
      const grade = stripComments(await readFile(path.join(root, "src", "commands", "grade.mjs"), "utf8"));
      assert.match(runStore, /brief\?\.grade\s*!=\s*null\)\s*assertStampedClaim\(brief\.grade\)/);
      assert.match(runStore, /export async function recordAnchorReading[\s\S]*compileProvenance\(provenance\)[\s\S]*await persist\(item, updated\)/);
      assert.match(grade, /gatherClaimProvenance[\s\S]*compileGrade\(\{/);

      const src = `${runStore}\n${grade}`;
      for (const forbidden of [".claude/projects", "transcript", ".mtime", "statSync", "readdirSync"]) {
        assert.ok(!src.includes(forbidden), `no provenance back-fill through ${forbidden}`);
      }
      assert.ok(!runStore.includes('.aof", "loops'), "the reading writer never targets the delivered registry");
      assert.match(runStore, /anchorReadings:\s*\[\.\.\.\(prior \?\? \[\]\), reading\]/, "readings append rather than replace");
    },
  },
];
