// Fitness function FF-16405 · acd-sync-covers-every-registered-workspace (milestone 164 / ADR-004).
//
//   The daemon's propagation tick publishes through the per-workspace sync pass over the registered
//   set; `launcher.mjs` contains no direct `publishGlobalWorkSnapshot(ws` of the launch workspace.
//
// The desktop app launches the daemon from a folder with no aof config, so a cwd-only publish
// re-read no project at all. Measured, three claims over the launcher's source:
//   1. No call publishes the launch workspace directly — the cwd-only publish is REPLACED, not
//      kept beside the pass.
//   2. The propagation tick (`capturePropagation`, which the start-up call also runs) reaches the
//      sync pass over the tick's workspace set, and that pass calls `syncWorkspace`.
//   3. ONE set: the presence aggregation and the sync pass both resolve their workspaces through
//      `resolveTickWorkspaces`, so the two can never disagree about which projects exist.
// Self-check (non-vacuous): planted sources trip each detector.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LAUNCHER = path.join(repoRoot, "packages", "mesh", "src", "launcher.mjs");

function stripComments(source) {
  // Line comments first, then blocks (TECH_DEBT item 24): a line comment holding a block opener
  // must never blind the scan.
  return source.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

// The body of a `const name = async (...) => { ... }` or `async function name(...) { ... }`,
// by brace matching from its first `{`.
function bodyOf(code, name) {
  const start = code.search(new RegExp(`(?:const\\s+${name}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>|async\\s+function\\s+${name}\\s*\\([^)]*\\))\\s*\\{`));
  if (start < 0) return null;
  let depth = 0;
  for (let index = code.indexOf("{", start); index < code.length; index += 1) {
    if (code[index] === "{") depth += 1;
    else if (code[index] === "}" && --depth === 0) return code.slice(start, index + 1);
  }
  return null;
}

const publishesLaunchWorkspace = (code) => /\bpublishGlobalWorkSnapshot\s*\(\s*ws\b/.test(code);

export const archTests = [
  {
    name: "arch/164 FF-16405 (acd-sync-covers-every-registered-workspace): the launcher publishes no launch workspace directly",
    async run() {
      const code = stripComments(await readFile(LAUNCHER, "utf8"));
      assert.ok(code.length > 1000, "the launcher was read (non-vacuous)");
      assert.equal(publishesLaunchWorkspace(code), false, "the cwd-only publish is replaced by the sync pass, never kept beside it");
    },
  },
  {
    name: "arch/164 FF-16405 (acd-sync-covers-every-registered-workspace): the propagation tick runs the sync pass over the tick's workspace set",
    async run() {
      const code = stripComments(await readFile(LAUNCHER, "utf8"));
      const tick = bodyOf(code, "capturePropagation");
      assert.ok(tick, "capturePropagation is found");
      assert.match(tick, /\bsyncTickWorkspaces\s*\(/, "the tick runs the sync pass");
      const pass = bodyOf(code, "syncTickWorkspaces");
      assert.ok(pass, "syncTickWorkspaces is found");
      assert.match(pass, /\bresolveTickWorkspaces\s*\(/, "over the tick's workspace set");
      assert.match(pass, /\bsyncWorkspace\b/, "through the publisher's one sync pass");
      assert.match(code, /await\s+capturePropagation\s*\(\s*\)/, "the start-up call runs the same pass before the first tick (driver 2)");
    },
  },
  {
    name: "arch/164 FF-16405 (acd-sync-covers-every-registered-workspace): presence and sync resolve their workspaces through one set",
    async run() {
      const code = stripComments(await readFile(LAUNCHER, "utf8"));
      const presence = bodyOf(code, "assemblePresenceForTick");
      assert.ok(presence, "assemblePresenceForTick is found");
      assert.match(presence, /\bresolveTickWorkspaces\s*\(/);
      const callers = [...code.matchAll(/\bresolveAggregationWorkspaces\s*\(/g)].length;
      assert.equal(callers, 2, "resolveAggregationWorkspaces is declared once and called once, inside resolveTickWorkspaces");
    },
  },
  {
    name: "arch/164 FF-16405 (acd-sync-covers-every-registered-workspace): self-check — a planted cwd publish trips, and the body reader finds a planted tick",
    run() {
      assert.ok(publishesLaunchWorkspace("const p = await publishGlobalWorkSnapshot(ws, options);"));
      assert.ok(!publishesLaunchWorkspace("await syncTickWorkspaces(ws, nodeId, options, sink);"));
      assert.match(bodyOf("const capturePropagation = async () => { return await publishGlobalWorkSnapshot(ws); };", "capturePropagation"), /publishGlobalWorkSnapshot/);
    },
  },
];
