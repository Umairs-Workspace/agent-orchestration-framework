// FF-19207 — a render reads the project's config and nothing else (milestone 192 / story 00,
// ADR-003 §2, §3).
//
// Covers the FF-19207 scenarios of
//   tasks/03_a-render-reads-the-projects-own-config.feature
//
// Two halves. Statically, `packages/core/src/work/bundle-compose.mjs` — the module that decides what
// is on — imports nothing that could read a file, the environment or the home directory, and spells
// no such read itself. Behaviourally, a fixture project whose machine-wide config turns a practice
// on, and whose own file does not, renders without it through `aof work update`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { updateWork } from "../../../packages/core/src/work/update.mjs";
import { computedDynamicImports, importSpecifiers } from "../../support/module-family.mjs";
import { baseFixture, only } from "../../../packages/core/test/bundle-compose.suite.mjs";
import { machineConfigDoesNotReachRender } from "../../../packages/core/test/work-update.suite.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMPOSE = "packages/core/src/work/bundle-compose.mjs";

// What a module source reads that a pure composition may not: any import at all (a relative one
// could read on its behalf), and any spelling of the environment, the home directory or a file read.
export function forbiddenReads(source) {
  const reads = [];
  for (const { specifier } of importSpecifiers(source)) reads.push(`imports "${specifier}"`);
  if (computedDynamicImports(source).length > 0) reads.push("imports a computed specifier");
  for (const [pattern, what] of [[/\bprocess\.env\b/u, "reads process.env"], [/\bhomedir\s*\(/u, "reads the home directory"], [/\bprocess\.cwd\s*\(/u, "reads the working directory"], [/\breadFile(?:Sync)?\s*\(/u, "reads a file"], [/\brequire\s*\(/u, "requires a module"]]) {
    if (pattern.test(source)) reads.push(what);
  }
  return reads;
}

// A planted update that merges the machine-wide config under the project's before asking what is on.
async function mergingUpdate(repo) {
  const home = process.env.AOF_GLOBAL_HOME;
  const machine = JSON.parse(readFileSync(path.join(home, "aof.config.json"), "utf8"));
  const merge = (base, over) => Object.fromEntries([...new Set([...Object.keys(base ?? {}), ...Object.keys(over ?? {})])].map((key) => [key,
    base?.[key] && typeof base[key] === "object" && over?.[key] && typeof over[key] === "object" ? merge(base[key], over[key]) : over?.[key] ?? base?.[key]]));
  return updateWork({ targetDir: repo, bundleOverride: (project) => only(baseFixture().load(merge(machine, project)), "demo") });
}

export const archTests = [
  {
    name: "arch/192 FF-19207: the composing module imports nothing that reads a file, the environment or the home directory",
    run: () => {
      const reads = forbiddenReads(readFileSync(path.join(repoRoot, COMPOSE), "utf8"));
      assert.deepEqual(reads, [], `${COMPOSE} ${reads.join(", ")}`);
    },
  },
  {
    name: "arch/192 FF-19207: a fixture project whose machine-wide config turns a practice on renders without it",
    run: () => machineConfigDoesNotReachRender(),
  },
  ...[
    ["the composing module imports \"node:os\"", `import os from "node:os";\n${"export const x = 1;"}`, "imports \"node:os\""],
    ["the composing module reads \"process.env\"", "export const on = () => process.env.AOF_PRACTICE === \"1\";", "reads process.env"],
  ].map(([planted, source, named]) => ({
    name: `arch/192 FF-19207 planted: ${planted} turns the control red`,
    run: () => {
      const reads = forbiddenReads(source);
      assert.ok(reads.includes(named), `the control fails and names what was read: ${reads.join(", ")}`);
    },
  })),
  {
    name: "arch/192 FF-19207 planted: the update merges the machine-wide config before asking what is on turns the control red",
    run: () => assert.rejects(machineConfigDoesNotReachRender(mergingUpdate), /machine-wide config[\s\S]*work\.notes\.enabled/u),
  },
];
