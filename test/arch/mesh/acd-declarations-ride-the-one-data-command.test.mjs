// FF-12605 — "The argv has ONE home, and the declarations answer rides the ONE data command."
//
// milestone 126 / story 02, ADR-005 (tasks 02 and 03). The STRUCTURAL half; the driven halves are
// `test/mesh/identity/mesh-status-declarations.test.mjs` and `test/loop/trigger-command.test.mjs`.
//
// WHAT THIS CONTROL EXISTS TO CATCH, in the contract's own words: the producer spelling
// `["work","loop",scope,"--resume"]` inline "just this once"; a `--resume` literal in two files; a
// flag the leaf spells that `work:loop` does not declare (parsed as unknown and refused at the
// door); the leaf importing the command registry to look the flags up, which is TECH_DEBT item
// 26's ring again; a second verb `aof work declarations`; and rows without `cwd`, so a
// login-autostarted supervisor spawns from `C:\WINDOWS\system32` (TECH_DEBT item 4's shape).
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { LEVEL_FLAG, RESUME_FLAG, argvFor, loopInputOf } from "../../../src/loop-argv.mjs";
import { loopCommand } from "../../../src/commands/loop.mjs";
import { meshStatusCommand } from "../../../src/commands/mesh/identity.mjs";
import { listCommands } from "../../../src/command-core.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LEAF = "src/loop-argv.mjs";
const PRODUCER = "src/mesh/declarations.mjs";
const read = async (rel) => await readFile(path.join(root, rel), "utf8");
const source = async (rel) => stripComments(await read(rel));
const ROUTE = Object.freeze(["work", "loop"]);
const flagKey = (token) => token.replace(/^--/u, "");

async function sourceModules() {
  const dir = path.join(root, "src");
  const modules = (await readdir(dir, { recursive: true }))
    .map((entry) => `src/${String(entry).replaceAll("\\", "/")}`)
    .filter((rel) => rel.endsWith(".mjs"))
    .sort();
  assert.ok(modules.length > 0, `the sweep of ${dir} found no .mjs module — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
  return modules;
}

export const archTests = [
  {
    name: "arch/126/02 FF-12605 leg 1: the leaf composes one argv from one declaration",
    run() {
      const rows = [
        ["124", "L2", true, ["work", "loop", "124", "--level", "L2", "--resume"]],
        ["120-130", "L1", true, ["work", "loop", "120-130", "--level", "L1", "--resume"]],
        ["124", "L3", true, ["work", "loop", "124", "--level", "L3", "--resume"]],
        ["124", "L2", false, ["work", "loop", "124", "--level", "L2"]],
        ["120-130", "L2", false, ["work", "loop", "120-130", "--level", "L2"]],
        // An absent level emits neither the flag nor a value token.
        ["124", undefined, true, ["work", "loop", "124", "--resume"]],
        // A scope the grammar refuses is composed VERBATIM: a check here would be a second scope
        // grammar beside `decideLoopScope`, and `work:loop` refuses it at its own door anyway.
        ["53/02", "L2", true, ["work", "loop", "53/02", "--level", "L2", "--resume"]],
        ["130-120", "L2", false, ["work", "loop", "130-120", "--level", "L2"]],
      ];
      for (const [scope, level, resume, expected] of rows) {
        const argv = argvFor(ROUTE, loopInputOf({ scope, level }), { resume });
        assert.deepEqual([...argv], expected, `${scope} / ${level} / resume=${resume}`);
        assert.ok(Object.isFrozen(argv));
        assert.ok(!argv.some((token) => String(token).includes("cap")), "no token names the cap");
        assert.deepEqual([...argvFor(ROUTE, loopInputOf({ scope, level }), { resume })], expected, "composing twice yields the same array");
      }
      // Called with TWO arguments it composes exactly what it composed inside the trigger face,
      // which is what makes that move a move and not a change.
      assert.deepEqual([...argvFor(ROUTE, loopInputOf({ scope: "63", level: "L1" }))], ["work", "loop", "63", "--level", "L1"]);
    },
  },
  {
    name: "arch/126/02 FF-12605 leg 2: the leaf has zero imports and is the only composer",
    run: async () => {
      const raw = await read(LEAF);
      assert.equal(
        raw.split("\n").filter((line) => /^import\b/u.test(line.trim())).length,
        0,
        "src/loop-argv.mjs carries no `import` statement of any kind",
      );
      assert.doesNotMatch(stripComments(raw), /\bimport\s*\(/u, "and no dynamic import — TECH_DEBT 26's ring stays open");
      // It imports cleanly in a fresh process, which is the property that makes it reachable from
      // a registered command module without joining a cycle.
      const fresh = await import(`../../../src/loop-argv.mjs?fresh=${Date.now()}`);
      assert.equal(typeof fresh.argvFor, "function");

      // `--level` and `--resume` are each BOUND TO A CONSTANT in exactly one module: this leaf.
      // The loop's own usage and resume-hint strings bind neither.
      const binders = [];
      for (const rel of await sourceModules()) {
        const body = stripComments(await read(rel));
        if (/(?:const|let|var)\s+\w+\s*=\s*"--(?:level|resume)"/u.test(body)) binders.push(rel);
      }
      assert.deepEqual(binders, [LEAF], "one binding home for each flag");

      // The only `["work","loop"]` array under src/ is `work:loop`'s own declared route.
      const spellers = [];
      for (const rel of await sourceModules()) {
        const body = stripComments(await read(rel));
        if (/\[\s*"work"\s*,\s*"loop"/u.test(body)) spellers.push(rel);
      }
      assert.deepEqual(spellers, ["src/commands/loop.mjs"], "only the command's own cli.route spells it");

      // Neither the producer nor the command that carries it spells a flag literal.
      const producer = await source(PRODUCER);
      const identity = await source("src/commands/mesh/identity.mjs");
      assert.doesNotMatch(producer, /"--[a-z]/u, `${PRODUCER} contains no \`--\` flag literal`);
      assert.doesNotMatch(identity, /"--[a-z]/u, "src/commands/mesh/identity.mjs contains no `--` flag literal");
      assert.match(producer, /argvFor\(/u, "…it asks the leaf instead");
    },
  },
  {
    name: "arch/126/02 FF-12605 leg 3: every flag the leaf can emit is one work:loop declares",
    run() {
      const flags = loopCommand.cli.spec.flags;
      const properties = loopCommand.input.properties;
      for (const [token, inputKey] of [[LEVEL_FLAG, "level"], [RESUME_FLAG, "resume"]]) {
        assert.ok(token.startsWith("--"), `${token} is spelled as a flag`);
        assert.ok(
          Object.prototype.hasOwnProperty.call(flags, flagKey(token)),
          `${token} is a flag work:loop declares — its vocabulary is {${Object.keys(flags).join(", ")}}`,
        );
        assert.ok(Object.prototype.hasOwnProperty.call(properties, inputKey), `${token} carries input key ${inputKey}`);
      }
      // The list is exhaustive: a third token would be parsed as an unknown flag and refused.
      const emitted = new Set();
      for (const scope of ["124", "120-130"]) {
        for (const level of ["L1", "L2", "L3", undefined]) {
          for (const resume of [true, false]) {
            for (const token of argvFor(ROUTE, loopInputOf({ scope, level }), { resume })) {
              if (String(token).startsWith("--")) emitted.add(token);
            }
          }
        }
      }
      assert.deepEqual([...emitted].sort(), [LEVEL_FLAG, RESUME_FLAG].sort(), "no other token the leaf can emit begins with --");
    },
  },
  {
    name: "arch/126/02 FF-12605 leg 4: the answer rides the ONE data command — no second verb exists for it",
    run: async () => {
      const ids = listCommands().map((command) => command.id ?? command);
      for (const forbidden of ["work:declarations", "mesh:declarations"]) {
        assert.ok(!ids.includes(forbidden), `no \`${forbidden}\` command is registered`);
      }
      // `mesh:status` is the only command whose result can carry `declarations`.
      const producers = [];
      for (const rel of await sourceModules()) {
        if (!rel.startsWith("src/commands/")) continue;
        const body = stripComments(await read(rel));
        if (/result\.declarations\s*=|declarations:\s*await/u.test(body)) producers.push(rel);
      }
      assert.deepEqual(producers, ["src/commands/mesh/identity.mjs"], "one producing site");
      assert.equal(meshStatusCommand.id, "mesh:status");
    },
  },
  {
    name: "arch/126/02 FF-12605 leg 5: the flag gates the WALK, not just the key, and the row carries a cwd",
    run: async () => {
      const identity = await source("src/commands/mesh/identity.mjs");
      // The enumeration sits INSIDE the flag's branch — and so does the MODULE that performs it,
      // loaded by a dynamic import from within that branch. A producer that walked the workspaces
      // and then declined to emit the key would have paid the whole 167 ms the refine measured;
      // one whose module were statically imported would put the registry on the session hot path
      // (72/FF-7205), which is why the producer lives outside this command's static closure.
      assert.match(
        identity,
        /if \(input\?\.declarations === true\) \{[\s\S]{0,600}?import\("\.\.\/\.\.\/mesh\/declarations\.mjs"\)[\s\S]{0,200}?supervisedDeclarations\(/u,
        "the walk, and the module that performs it, are reached only through the flag",
      );
      assert.doesNotMatch(identity, /^import .*declarations\.mjs/mu, "…never statically");
      const producer = await source(PRODUCER);
      assert.match(producer, /resolveNodeWorkspaces\(/u, "the workspace set comes from the resolver");
      assert.match(producer, /readRuns\(/u, "and the records from disk");
      assert.doesNotMatch(producer, /readWorkerRuns|cache-read/u, "never from a cached-row reader");
      assert.match(producer, /cwd: row\.projectRoot/u, "each row's cwd is its own descriptor's projectRoot");
      assert.match(producer, /resolved\.ok !== true/u, "a resolver that did not answer is never dressed as a standalone node");
      assert.match(producer, /skipped: Object\.freeze\(resolved\.skipped\)/u, "the resolver's skips are carried verbatim");
    },
  },
];
