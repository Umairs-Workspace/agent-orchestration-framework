// FF-17201 (milestone 172 / ADR-001) — THE ARCHITECT'S CONVERSATION LAUNCH NEVER BYPASSES PERMISSIONS.
//
// "The architect's conversation launch never bypasses permissions: its argument vector carries
//  `--permission-prompts none` and an explicit `--allowedTools`, never `--dangerously-skip-permissions`,
//  `--allow-dangerously-skip-permissions` or `bypassPermissions`, and it is spawned with an argument
//  vector, never through a shell."
//
// Why it matters: the session runs on the board's server, out of sight, with Bash among its tools. A
// prompt nobody can see would hang it, and the easy way out of a hung prompt — skipping permissions —
// would hand a browser-reachable process every tool on the machine. The launch instead DENIES anything
// outside its list inside the turn. The argv has one builder (`conversationLaunchArgs`), so this
// control reads that builder and drives it, and reads the module's one spawn for its shell option.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conversationLaunchArgs } from "@aof/execution/conversation-session";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MODULE = "packages/execution/src/conversation-session.mjs";
const BYPASS = ["--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "bypassPermissions"];

// What, in the module's code, would let the conversation bypass permissions or reach a shell.
function launchViolations(code) {
  const hits = [];
  for (const token of BYPASS) if (code.includes(token)) hits.push(`spells ${token}`);
  const builder = functionBody(code, "export function conversationLaunchArgs(");
  if (!builder) hits.push("has no conversationLaunchArgs builder");
  else {
    if (!/"--permission-prompts",\s*"none"/u.test(builder)) hits.push("launches without --permission-prompts none");
    if (!/"--allowedTools"/u.test(builder)) hits.push("launches without --allowedTools");
  }
  const spawns = [...code.matchAll(/\bspawnChild\(/gu)];
  if (spawns.length !== 1) hits.push(`spawns ${spawns.length} times, not once`);
  for (const match of spawns) {
    const call = code.slice(match.index, code.indexOf(");", match.index));
    if (!/\bshell:\s*false\b/u.test(call)) hits.push("spawns without shell: false");
  }
  if (/\bshell:\s*true\b/u.test(code) || /\bexec\(/u.test(code)) hits.push("reaches a shell");
  return hits;
}

export const archTests = [
  {
    name: "arch/172 FF-17201: the conversation launch denies what it does not allow, never bypasses permissions, and never spawns through a shell",
    run: async () => {
      const code = stripComments(await readFile(path.join(repoRoot, MODULE), "utf8"));
      assert.deepEqual(launchViolations(code), []);
    },
  },
  {
    name: "arch/172 FF-17201: the built argv carries --permission-prompts none and exactly the caller's tools, whatever model and effort it is given",
    run: () => {
      const tools = ["Read", "Bash(aof diagram scene:*)"];
      for (const launch of [{ tools }, { tools, model: "opus", effort: "max" }]) {
        const args = conversationLaunchArgs(launch);
        assert.equal(args[args.indexOf("--permission-prompts") + 1], "none");
        assert.deepEqual(args.slice(args.indexOf("--allowedTools") + 1), tools);
        assert.ok(!args.some((arg) => BYPASS.some((token) => arg.includes(token))), JSON.stringify(args));
      }
    },
  },
  {
    name: "arch/172 FF-17201 red probe: the detector fires on each planted bypass, a missing guard and a shell spawn",
    run: async () => {
      const code = stripComments(await readFile(path.join(repoRoot, MODULE), "utf8"));
      const plant = (from, to) => { const planted = code.replace(from, to); assert.notEqual(planted, code, `the plant ${to} applied`); return launchViolations(planted); };
      assert.ok(plant('"--permission-prompts", "none"', '"--permission-prompts", "none", "--dangerously-skip-permissions"').includes("spells --dangerously-skip-permissions"));
      assert.ok(plant('"--permission-prompts", "none"', '"--permission-mode", "bypassPermissions"').includes("launches without --permission-prompts none"));
      assert.ok(plant('args.push("--allowedTools", ...tools);', "args.push(...tools);").includes("launches without --allowedTools"));
      assert.ok(plant("shell: false", "shell: true").includes("spawns without shell: false"));
    },
  },
];
