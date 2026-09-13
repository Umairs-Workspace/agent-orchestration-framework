import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHECK_GROUPS } from "../../../src/work/doctor.mjs";
import { invoke } from "../../../src/command-core.mjs";
import { loopFixture } from "../../loop/loop-command-probe.test.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const scorerPath = path.join(root, "src", "work", "doctor-loop-ready.mjs");
const COMPOSED = Object.freeze(["grounding", "anchor-grounding", "pairing", "reference-ownership", "actuator-arbitration", "timescale"]);

function specifiers(source) {
  return importSpecifiers(source).map((entry) => entry.specifier);
}

async function importGraph(entry) {
  const seen = new Set();
  async function walk(file) {
    const resolved = path.resolve(file);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    for (const specifier of specifiers(await readFile(resolved, "utf8"))) {
      if (specifier.startsWith(".")) await walk(path.resolve(path.dirname(resolved), specifier));
    }
  }
  await walk(entry);
  return seen;
}

const badRegistry = `---
id: loop:unanchored
kind: loop
title: Unanchored optimizer
controlled: a result
reference: [command:x]
measurement: [command:x]
actuator: [command:y]
cadence: periodic:10s
ceiling: none
owner: unknown
optimizing: true
---
# Unanchored
`;

export const archTests = [
  {
    name: "arch/53 FF-5309 (acd-loop-ready-registry-optional): scorer stays in the doctor determinism family but outside CHECK_GROUPS and the loop import graph",
    run: async () => {
      assert.match(scorerPath.split(path.sep).join("/"), /src\/work\/doctor.*\.mjs$/u);
      assert.ok(CHECK_GROUPS.length > 5, `CHECK_GROUPS was actually read: ${CHECK_GROUPS.length} groups`);
      assert.equal(CHECK_GROUPS.some((group) => group.name === "computeLoopReady"), false);
      const graph = await importGraph(scorerPath);
      assert.ok(graph.has(scorerPath));
      assert.ok(graph.size > 1, `scorer graph was non-vacuous: ${graph.size} modules`);
      // 119/01 — the family moved to `src/work/`, so the filter matches the DIRECTORY it now sits in
      // rather than a `work-loops` filename prefix that no file carries any more.
      const registryModules = [...graph].filter((file) => /(?:^|[\/])src[\/]work[\/]loops[a-z0-9-]*\.mjs$/u.test(file));
      assert.deepEqual(registryModules, []);
      const scorer = stripComments(await readFile(scorerPath, "utf8"));
      assert.doesNotMatch(scorer, /node:fs|Date\.now\s*\(|new\s+Date\s*\(/u);
    },
  },
  {
    name: "arch/53 FF-5309 (acd-loop-ready-registry-optional): doctor reaches the registry only through its deferred command invocation",
    run: async () => {
      const doctor = stripComments(await readFile(path.join(root, "src", "commands", "doctor.mjs"), "utf8"));
      assert.doesNotMatch(doctor, /^import[^\n]+command-core\.mjs/mu, "a static command-core import closes the registry ring");
      assert.match(doctor, /await\s+import\s*\(\s*["'](?:\.\.?\/)+command-core\.mjs["']\s*\)/u);
      assert.match(doctor, /invoke\s*\(\s*["']work:loops-validate["']/u);
      const command = stripComments(await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8"));
      assert.match(command, /invokeRegistered\(\s*["']work:doctor["']/u);
      assert.match(command, /resolveLoopLevelGate\(resolved\.level, l3Gate\)/u);
    },
  },
  {
    name: "arch/53 FF-5309 (acd-loop-ready-registry-optional): absent registry removes six rows from the denominator and a discriminating registry composes exact command counts",
    run: async () => {
      const absentFx = await loopFixture();
      try {
        absentFx.workspace.aofDir = path.join(absentFx.projectRoot, ".aof");
        const doctor = await invoke("work:doctor", {}, absentFx.ctx);
        assert.equal(doctor.loopReady.registry.present, false);
        assert.equal(doctor.loopReady.registry.composed, false);
        const rows = doctor.loopReady.checks.filter((row) => COMPOSED.includes(row.id));
        assert.deepEqual(rows.map((row) => row.id), COMPOSED);
        assert.ok(rows.every((row) => row.state === "not-applicable"));
        assert.equal(doctor.loopReady.applicable, 4);
      } finally {
        await absentFx.cleanup();
      }

      const presentFx = await loopFixture();
      try {
        presentFx.workspace.aofDir = path.join(presentFx.projectRoot, ".aof");
        const loops = path.join(presentFx.workspace.aofDir, "loops");
        await mkdir(loops, { recursive: true });
        await writeFile(path.join(loops, "unanchored.md"), badRegistry);
        const validation = await invoke("work:loops-validate", {}, presentFx.ctx);
        const doctor = await invoke("work:doctor", {}, presentFx.ctx);
        assert.equal(validation.present, true);
        assert.equal(doctor.loopReady.registry.present, true);
        assert.ok(COMPOSED.some((id) => validation.summary.checks[id].findings > 0), "registry fixture is discriminating");
        for (const id of COMPOSED) {
          const row = doctor.loopReady.checks.find((entry) => entry.id === id);
          const expected = validation.summary.checks[id].findings;
          assert.match(row.evidence, new RegExp(`\\b${expected} finding`, "u"), `${id}: scorer must read the command's exact count`);
          assert.equal(row.state, expected === 0 ? "pass" : "fail", id);
        }
      } finally {
        await presentFx.cleanup();
      }
    },
  },
];
