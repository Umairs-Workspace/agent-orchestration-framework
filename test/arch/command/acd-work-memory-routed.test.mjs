// Fitness function for story 128 / task 01
// (`01_the-ladder-door-closes-and-the-frozen-lists-move.feature`): THE LADDER DOOR CLOSES
// BEHIND THE MIGRATED VERB, AND THE FROZEN LISTS MOVE WITH IT.
//
//   "A migration that leaves its old door open is two doors."
//
// WHY THIS EXISTS. `aof work memory` rode `src/cli.mjs`'s legacy ladder as a "deliberately-
// unrouted door" (42/WAVE-D-MIGRATION d1 wave 2) until story 125's README control measured
// what that costs: five true lines red, because the route table is derived from the registry
// and the door was not in it. Task 00 registers the door (`work:memory`, commands/work/memory.mjs)
// and drives it; THIS control is the subtraction and the bookkeeping — the claims about the TREE
// that a behavioural suite cannot make:
//
//   (1) the ladder holds no memory branch and no memory shim, and the ladder face's identifier
//       (`workMemoryCommand`) is imported by nothing under `src/` — read through the one comment
//       stripper (test/support/source-slice.mjs), so a comment naming the old door is not a door;
//       and `acd-command-route-derived`'s no-second-door rule passes, unedited, over the result.
//   (2) `aof --help` lists the verb where the registry puts it (under Work) and the static
//       `Also:` tail no longer hand-writes it — while still naming `aof session`, which is not
//       this story's.
//   (3) the module FOUNDS `src/commands/work/` under budget: the flat `src/commands/` row refused a
//       68th sibling, the founded directory carries its own row, and that row names the fold of
//       the other `work:*` commands as a separate item.
//   (4) the four frozen lists moved, each for its own reason — `WORK_IDS`, `BOARD_DEFERRED`,
//       `argsFor`, `PRINTERS` — and the printer ratchet FELL (12 → 11), because a ceiling that
//       may only fall is the point; and the seam calls `console.log` nowhere.
//   (5) the seam's existing callers are untouched: every binding the `test/memory/` suites and
//       `declared-id` import from `src/work/memory.mjs` is still exported by it. (The suites
//       themselves run unedited in the story's focused set — `scripts/test.mjs --only` over
//       `test/memory/*` and `test/command/declared-id.test.mjs`; a `git diff --quiet` is not a
//       reliable "unedited" in a shared checkout, so the claim asserted HERE is the one the tree
//       can answer: the contract they import against is intact.)
//   (6) story 125's README control goes green — its own "every command the README spells
//       resolves" row is imported and run, and the five `aof work memory` lines are shown to
//       resolve through `deriveRouteTable`. That control is imported LAZILY inside its one row:
//       a static import would make this directory's whole index fail to load if 125's file were
//       absent, and one absent control should red one row, not every suite here.
//
// Gates are read as SOURCE where the thing asserted is a frozen list or a ladder (comment-blind,
// through source-slice), and as MODULES where the thing asserted is behaviour (the registry, the
// route table, another control's own row). No positional window: every cut is a language
// construct or a named region.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { stripComments, functionBody } from "../../support/source-slice.mjs";
import { listCommands, getCommand } from "../../../src/command-core.mjs";
import { deriveRouteTable } from "../../../src/spine/face.mjs";
import { archTests as routeDerivedTests } from "./acd-command-route-derived.test.mjs";
import { SOURCE_DIRECTORY_BUDGETS, COUNTING_RULES } from "../testing/acd-source-directory-budget.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const at = (...segments) => path.join(repoRoot, ...segments);
const read = async (...segments) => (await readFile(at(...segments), "utf8")).replace(/\r\n/g, "\n");
const cliPath = at("bin", "aof.mjs");

const CLI_MJS = ["src", "cli.mjs"];
const SEAM = ["src", "work", "memory.mjs"];
const COMMAND = ["src", "commands", "work", "memory.mjs"];
const GATES = {
  workIds: ["test", "command", "command-core-contract.test.mjs"],
  boardDeferred: ["test", "arch", "work", "acd-work-command-route-coverage.test.mjs"],
  argsFor: ["test", "arch", "work", "acd-work-command-cli-bijection.test.mjs"],
  printers: ["test", "arch", "command", "acd-console-log-confined.test.mjs"],
};
// The seam's callers whose imports must still resolve (5).
const SEAM_CALLERS_DIR = ["test", "memory"];
const DECLARED_ID = ["test", "command", "declared-id.test.mjs"];

// Every .mjs under src/, recursively — the walk (1) makes over the whole source tree.
async function srcModules(dir = at("src"), out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await srcModules(full, out);
    else if (entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

// The `[ … ]` literal bound to `const <name> =` (optionally wrapped in `new Set(`), by matching
// brackets — the frozen lists (4) are arrays, not brace blocks, so `matchedBraceBody` is the
// wrong cut and a `]` inside a string would break a lazy regex.
function arrayLiteral(code, name) {
  const start = code.search(new RegExp(`const\\s+${name}\\s*=`));
  if (start < 0) return null;
  const open = code.indexOf("[", start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "[") depth += 1;
    else if (code[i] === "]" && --depth === 0) return code.slice(open + 1, i);
  }
  return null;
}

// The `aof --help` text split into its titled sections: `Title:\n  line\n  line` blocks.
function helpSections(text) {
  const sections = new Map();
  let current = null;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const title = /^(\S[^:]*):\s*$/.exec(line);
    if (title) { current = title[1]; sections.set(current, []); continue; }
    if (current && line.startsWith("  ")) sections.get(current).push(line.trim());
    else if (line.trim() === "") current = null;
  }
  return sections;
}

export const archTests = [
  {
    name: "arch/128/01 (acd-work-memory-routed): the ladder holds no memory branch and no memory shim — no `subcommand === \"memory\"` in workCommand, no `workMemoryCommandCli`, `workMemoryCommand` imported by nothing under src/ — and acd-command-route-derived's no-second-door rule passes unedited",
    run: async () => {
      const cli = stripComments(await read(...CLI_MJS));
      const ladder = functionBody(cli, "async function workCommand(");
      assert.ok(ladder, "workCommand was located in src/cli.mjs");
      assert.doesNotMatch(ladder, /subcommand\s*===\s*["']memory["']/, "no `subcommand === \"memory\"` branch remains in the work ladder");
      assert.doesNotMatch(cli, /\bworkMemoryCommandCli\b/, "no `workMemoryCommandCli` function remains");
      assert.doesNotMatch(cli, /from\s+["']\.\/work\/memory\.mjs["']/, "cli.mjs no longer imports the memory seam at all");

      // The ladder face's identifier, gone from CODE everywhere under src/ (comments stripped):
      // the seam no longer exports it, and nothing imports it.
      const holders = [];
      for (const file of await srcModules()) {
        const code = stripComments(await readFile(file, "utf8"));
        if (/\bworkMemoryCommand\b/.test(code)) holders.push(path.relative(repoRoot, file).split(path.sep).join("/"));
      }
      assert.deepEqual(holders, [], `\`workMemoryCommand\` is imported (or declared) by nothing under src/ — found in: ${holders.join(", ")}`);
      const seam = await import(new URL("../../../src/work/memory.mjs", import.meta.url));
      assert.equal("workMemoryCommand" in seam, false, "the seam exports no `workMemoryCommand` (the ladder face is deleted)");

      // And the registry's route for the verb is the ONE door: the route-derived control's own
      // no-second-door row, run as it ships.
      const noSecondDoor = routeDerivedTests.find((entry) => /no group ladder re-implements a routed verb/.test(entry.name));
      assert.ok(noSecondDoor, "acd-command-route-derived still carries its no-second-door row");
      await noSecondDoor.run();
      assert.ok(deriveRouteTable(listCommands()).has("work memory"), "…and `work memory` is a route it judged");
    },
  },

  {
    name: "arch/128/01 (acd-work-memory-routed): `aof --help` lists the verb where the registry puts it — the Work family carries a line beginning `aof work memory`, the static `Also:` tail no longer names it, and the tail still names `aof session`",
    run: async () => {
      const result = spawnCliSync(process.execPath, [cliPath, "--help"], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
      assert.equal(result.status, 0, `aof --help exits 0 (stderr: ${result.stderr})`);
      const sections = helpSections(result.stdout ?? "");
      const work = sections.get("Work (ACD work stream)");
      assert.ok(work && work.length > 0, `the help text has a Work section (sections: ${[...sections.keys()].join(" | ")})`);
      const memoryLine = work.find((line) => line.startsWith("aof work memory"));
      assert.ok(memoryLine, "the Work family carries a line beginning `aof work memory`");
      assert.equal(memoryLine, getCommand("work:memory").cli.spec.usage, "…and it is the command's own cli.spec.usage, registry-derived");
      const also = sections.get("Also");
      assert.ok(also && also.length > 0, "the static `Also:` tail is present");
      assert.equal(also.some((line) => line.startsWith("aof work memory")), false, "the `Also:` tail no longer names `aof work memory`");
      assert.ok(also.some((line) => line.startsWith("aof session")), "…and it still names `aof session`, which stays laddered");
      // The tail is hand-written prose in cli.mjs: the source agrees with the spawn.
      const cli = stripComments(await read(...CLI_MJS));
      assert.doesNotMatch(cli, /\n\s+aof work memory <verb>/, "cli.mjs's Also: tail carries no hand-written `aof work memory` line");
    },
  },

  {
    name: "arch/128/01 (acd-work-memory-routed): the command module founds the work family, budgeted — src/commands/ holds no more direct-child files than its ceiling, src/commands/work/memory.mjs exports the work:memory command, and SOURCE_DIRECTORY_BUDGETS carries a src/commands/work row whose `why` names the fold as a separate item",
    run: async () => {
      const flatRow = SOURCE_DIRECTORY_BUDGETS.find((row) => row.directory === "src/commands");
      assert.ok(flatRow, "the budget table carries the src/commands row");
      const predicate = COUNTING_RULES[flatRow.counts];
      const flatChildren = (await readdir(at("src", "commands"), { withFileTypes: true })).filter((entry) => entry.isFile() && predicate(entry.name)).length;
      assert.ok(flatChildren <= flatRow.ceiling, `src/commands/ holds ${flatChildren} direct-child files, at or under its ceiling of ${flatRow.ceiling} — the module did not land as a flat sibling`);
      assert.equal(flatRow.allowance, 0, "…and the flat row grants no allowance");

      assert.ok(existsSync(at(...COMMAND)), "src/commands/work/memory.mjs exists");
      const module = await import(new URL("../../../src/commands/work/memory.mjs", import.meta.url));
      const exported = Object.values(module).find((value) => value && typeof value === "object" && value.id === "work:memory");
      assert.ok(exported, "…and exports the work:memory command");
      assert.equal(getCommand("work:memory"), exported, "…which is the one the registry carries");
      assert.deepEqual(exported.cli.route, ["work", "memory"], "…routed at `work memory`");

      const familyRow = SOURCE_DIRECTORY_BUDGETS.find((row) => row.directory === "src/commands/work");
      assert.ok(familyRow, "SOURCE_DIRECTORY_BUDGETS carries a row for src/commands/work — the family is founded, stated rather than smuggled");
      assert.equal(familyRow.allowance, 0, "the founded row grants no allowance");
      assert.match(familyRow.why, /fold/i, "its `why` names the fold of the other work:* commands");
      assert.match(familyRow.why, /separate item/i, "…as a separate item, not taken here");
      const familyChildren = (await readdir(at("src", "commands", "work"), { withFileTypes: true })).filter((entry) => entry.isFile()).length;
      assert.equal(familyChildren, familyRow.ceiling, `the founded directory holds exactly its ceiling (${familyRow.ceiling}) — the row was measured, not guessed`);
    },
  },

  {
    name: "arch/128/01 (acd-work-memory-routed): the four frozen lists have moved, and the printer ratchet fell — WORK_IDS carries work:memory, BOARD_DEFERRED carries memory with a stated reason, argsFor(\"memory\") is the task 00 probe, PRINTERS has no work/memory.mjs row and PRINTER_CEILING is 11 — and src/work/memory.mjs calls console.log nowhere",
    run: async () => {
      // WORK_IDS — "exactly the known work ids": the census names the new one.
      const workIds = arrayLiteral(stripComments(await read(...GATES.workIds)), "WORK_IDS");
      assert.ok(workIds, "WORK_IDS was located in command-core-contract");
      assert.match(workIds, /"work:memory"/, "WORK_IDS carries \"work:memory\"");
      assert.ok(listCommands().some((command) => command.id === "work:memory"), "…and the registry carries it, so the census is exact");

      // BOARD_DEFERRED — the carve-out takes `memory` WITH a reason: the comment block directly
      // above the entry (raw source, since the reason IS a comment) is non-empty and says why.
      const coverageRaw = await read(...GATES.boardDeferred);
      const deferredRaw = arrayLiteral(coverageRaw, "BOARD_DEFERRED");
      assert.ok(deferredRaw, "BOARD_DEFERRED was located in acd-work-command-route-coverage");
      const deferredLines = deferredRaw.split("\n");
      const memoryAt = deferredLines.findIndex((line) => /^\s*"memory",\s*$/.test(line));
      assert.ok(memoryAt >= 0, "BOARD_DEFERRED carries \"memory\"");
      const reason = [];
      for (let i = memoryAt - 1; i >= 0 && /^\s*\/\//.test(deferredLines[i]); i -= 1) reason.unshift(deferredLines[i].replace(/^\s*\/\/\s?/, ""));
      assert.ok(reason.length > 0, "…with a stated reason directly above it");
      assert.match(reason.join(" "), /hook/i, "…which names the hook affordance recall serves");
      assert.match(reason.join(" "), /board/i, "…and says no board button is asked for");
      assert.match(stripComments(deferredRaw), /"memory"/, "…and the entry is code, not a comment");

      // argsFor — the probe is task 00's: `aof work memory status --json`.
      const bijection = stripComments(await read(...GATES.argsFor));
      const argsFor = functionBody(bijection, "function argsFor(");
      assert.ok(argsFor, "argsFor was located in acd-work-command-cli-bijection");
      assert.match(argsFor, /case\s+"memory":\s*return\s+\["work",\s*"memory",\s*"status",\s*"--json"\];/, "argsFor(\"memory\") is [\"work\", \"memory\", \"status\", \"--json\"]");

      // PRINTERS — the row went and the ceiling FELL.
      const printersSource = stripComments(await read(...GATES.printers));
      const printersStart = printersSource.search(/const\s+PRINTERS\s*=/);
      assert.ok(printersStart >= 0, "PRINTERS was located in acd-console-log-confined");
      const printersOpen = printersSource.indexOf("{", printersStart);
      let depth = 0; let printersEnd = -1;
      for (let i = printersOpen; i < printersSource.length; i += 1) {
        if (printersSource[i] === "{") depth += 1;
        else if (printersSource[i] === "}" && --depth === 0) { printersEnd = i; break; }
      }
      assert.ok(printersEnd > printersOpen, "PRINTERS is a brace-delimited object");
      const printers = printersSource.slice(printersOpen, printersEnd);
      assert.doesNotMatch(printers, /"work\/memory\.mjs"/, "PRINTERS has no work/memory.mjs row");
      assert.match(printers, /"commands\/mesh\/session\.mjs"/, "…and keeps the commands/mesh/session.mjs row (aof session is not this story's)");
      assert.match(printersSource, /const\s+PRINTER_CEILING\s*=\s*11\s*;/, "PRINTER_CEILING is 11 — the ratchet fell from 12");

      // The seam prints nothing.
      const seam = stripComments(await read(...SEAM));
      assert.doesNotMatch(seam, /\bconsole\.log\s*\(/, "src/work/memory.mjs calls console.log nowhere");
      assert.doesNotMatch(seam, /log\s*=\s*console\.log\b/, "…and defaults no collector to it");
    },
  },

  {
    name: "arch/128/01 (acd-work-memory-routed): the seam's existing callers are untouched — every binding test/memory/* and declared-id import from src/work/memory.mjs is still exported by it (the suites themselves run unedited in the story's focused set)",
    run: async () => {
      const seam = await import(new URL("../../../src/work/memory.mjs", import.meta.url));
      const callers = (await readdir(at(...SEAM_CALLERS_DIR))).filter((name) => name.endsWith(".test.mjs")).map((name) => [...SEAM_CALLERS_DIR, name]);
      callers.push(DECLARED_ID);
      let importers = 0;
      for (const caller of callers) {
        const code = stripComments(await read(...caller));
        const match = /import\s*\{([^}]*)\}\s*from\s*["'][./]*\/src\/work\/memory\.mjs["']/.exec(code);
        if (!match) continue;
        importers += 1;
        const bindings = match[1].split(",").map((binding) => binding.trim().split(/\s+as\s+/)[0]).filter(Boolean);
        assert.ok(bindings.length > 0, `${caller.join("/")} names at least one binding`);
        for (const binding of bindings) {
          assert.ok(binding in seam, `${caller.join("/")} imports \`${binding}\` from the seam, and the seam still exports it`);
        }
      }
      // Non-vacuous: the callers the feature names really do import the seam — `runMemory` and
      // `resolveConfiguredBackend` are the pair every harness there is built on.
      assert.ok(importers >= 4, `${importers} caller(s) import the seam (at least the four memory harnesses)`);
      assert.equal(typeof seam.runMemory, "function", "`runMemory` is still exported for them");
      assert.equal(typeof seam.parseMemoryArgv, "function", "`parseMemoryArgv` is still exported for them");
      // …and runMemory's contract for an in-process caller is intact: a collector receives the
      // rendered lines, nothing is printed, and the outcome shape is { ok, exitCode, result }.
      const lines = [];
      const outcome = await seam.runMemory(["status"], { config: {}, resolveBackend: (config) => seam.resolveConfiguredBackend(config), log: (line) => lines.push(line) });
      assert.deepEqual({ ok: outcome.ok, exitCode: outcome.exitCode }, { ok: true, exitCode: 0 });
      assert.deepEqual(lines, ["memory: backend=none records=0"], "the collector received the one status line");
    },
  },

  {
    name: "arch/128/01 (acd-work-memory-routed): story 125's README control goes green — its own \"every command the README spells resolves\" row passes unedited, and the five `aof work memory` lines resolve through deriveRouteTable",
    run: async () => {
      // Lazy, so an absent control reds THIS row rather than the directory's index (header, (6)).
      const { archTests: readmeTests, assessReadme } = await import("./acd-readme-names-what-ships.test.mjs");
      const row = readmeTests.find((entry) => /every command the README spells in a fenced block or a command table resolves/.test(entry.name));
      assert.ok(row, "acd-readme-names-what-ships still carries its resolve-everything row");
      await row.run();

      const readme = (await readFile(at("README.md"), "utf8")).replace(/\r\n/g, "\n");
      const verdict = assessReadme(readme);
      const memoryLines = verdict.invocations.filter((entry) => entry.words.slice(0, 2).join(" ") === "work memory");
      assert.ok(memoryLines.length >= 5, `the README spells \`aof work memory\` at least five times (${memoryLines.length}: lines ${memoryLines.map((entry) => entry.line).join(", ")})`);
      const resolvedMemory = verdict.resolved.filter((entry) => entry.route === "work memory" && !entry.family);
      assert.equal(resolvedMemory.length, memoryLines.length, "every one of them resolves to the `work memory` route");
      assert.equal(verdict.unresolved.filter((entry) => entry.words[0] === "work" && entry.words[1] === "memory").length, 0, "and none is unresolved");
      // Through the table itself, not the control's verdict alone.
      assert.equal(deriveRouteTable().get("work memory")?.id, "work:memory", "deriveRouteTable carries `work memory` → work:memory");
    },
  },
];
