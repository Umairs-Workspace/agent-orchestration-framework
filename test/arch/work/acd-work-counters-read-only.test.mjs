// Structural review for milestone 57 / story 04.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertFamilyPurity } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const engineUrl = new URL("../../../src/work/counters.mjs", import.meta.url);
const commandUrl = new URL("../../../src/commands/counters.mjs", import.meta.url);
const coreUrl = new URL("../../../src/command-core.mjs", import.meta.url);

export const archTests = [
  {
    name: "arch/57 story 04: counter arithmetic is a pure leaf and the observation boundary is read-only",
    async run() {
      const [engine, command] = await Promise.all([readFile(engineUrl, "utf8"), readFile(commandUrl, "utf8")]);
      // The arithmetic leaf depends on nothing outside itself, asserted over its FAMILY
      // (119/ADR-002) — the unit is the module, not the file, so splitting the leaf stays legal.
      await assertFamilyPurity(assert, root, "src/work/counters");
      assert.doesNotMatch(engine, /\b(?:readFile|writeFile|appendFile|execFile|spawn|process\.|Date\.now)\b/u);
      assert.match(command, /import\s*\{\s*readFile\s*\}\s*from\s*"node:fs\/promises"/u);
      assert.doesNotMatch(command, /\b(?:writeFile|appendFile|unlink|rename|mkdir|execFile|spawn)\b/u);
      assert.match(command, /readFeedbackRecords/u);
      assert.match(command, /readRuns/u);
      assert.match(command, /computeWorkCounters/u);
    },
  },
  {
    name: "arch/57 FF-5707: work:counters is one registered command backed by exported counter symbols",
    async run() {
      const [engine, command, core] = await Promise.all([
        readFile(engineUrl, "utf8"),
        readFile(commandUrl, "utf8"),
        readFile(coreUrl, "utf8"),
      ]);
      assert.match(engine, /export function countFindingEscapes/u);
      assert.match(engine, /export function countInterventions/u);
      assert.match(command, /id:\s*"work:counters"/u);
      assert.match(command, /route:\s*\["work",\s*"counters"\]/u);
      assert.equal((core.match(/import\s*\{\s*countersCommand\s*\}/gu) ?? []).length, 1);
      assert.equal((core.match(/^\s*countersCommand,\s*$/gmu) ?? []).length, 1);
    },
  },
];
