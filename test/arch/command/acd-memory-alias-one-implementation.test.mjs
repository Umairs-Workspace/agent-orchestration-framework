// FF-17801 — milestone 178 / ADR-001: `aof work memory` is a second registered door onto the
// `memory` command, never a second implementation. Both commands are registered, `memory` at
// route `memory` and `work:memory` at route `work memory`, and the alias's `input`, `run`,
// `argv`, `render` and `json` are the canonical command's own objects. The ADR names the four
// functions; `input` is checked too because the alias spreads it, and a copied schema would
// let the two doors parse different shapes.
//
// WHY A CONTROL AND NOT A CASE. Byte-for-byte output through both doors is what the alias is
// for (prompts paste `recall --block`, hooks read `recall --json`). A wrapper around `render`
// passes every byte-for-byte case on the day it lands and drifts on the day someone edits one
// side. Object identity is the one check that cannot drift. The check is exported so the red
// probe runs it over a planted registry, which is how the control shows it can fail.
import assert from "node:assert/strict";
import { defaultApplication } from "aof/default-application";
import { KNOWLEDGE_COMMAND_IDS } from "@aof/knowledge/commands";

const SHARED = Object.freeze([
  ["input", (command) => command.input],
  ["run", (command) => command.run],
  ["argv", (command) => command.cli?.argv],
  ["render", (command) => command.cli?.render],
  ["json", (command) => command.cli?.json],
]);

// The FF-17801 check over any command list. It answers the failures, each naming what is
// wrong; an empty list is a pass.
export function memoryAliasFailures(commands) {
  const byId = new Map(commands.map((command) => [command.id, command]));
  const canonical = byId.get("memory");
  const alias = byId.get("work:memory");
  if (!canonical) return ["command \"memory\" is not registered"];
  if (!alias) return ["command \"work:memory\" is not registered"];
  const failures = [];
  if (JSON.stringify(canonical.cli?.route) !== JSON.stringify(["memory"])) failures.push(`"memory" is routed at ${JSON.stringify(canonical.cli?.route)}, not ["memory"]`);
  if (JSON.stringify(alias.cli?.route) !== JSON.stringify(["work", "memory"])) failures.push(`"work:memory" is routed at ${JSON.stringify(alias.cli?.route)}, not ["work","memory"]`);
  for (const [name, pick] of SHARED) {
    if (typeof pick(canonical) === "undefined") failures.push(`"memory" declares no ${name}`);
    else if (pick(alias) !== pick(canonical)) failures.push(`"work:memory"'s ${name} is not "memory"'s own ${name} — the alias must share it, not wrap or copy it`);
  }
  return failures;
}

export const archTests = [
  {
    name: "arch/178/01 FF-17801 (acd-memory-alias-one-implementation): memory and work:memory are both registered, at routes `memory` and `work memory`, and the alias's input, run, argv, render and json are the canonical command's own objects",
    run: () => {
      const commands = defaultApplication.listCommands();
      assert.deepEqual(memoryAliasFailures(commands), [], "the alias is the canonical command at a second route");
      assert.ok(KNOWLEDGE_COMMAND_IDS.includes("memory"), "KNOWLEDGE_COMMAND_IDS carries memory");
      assert.ok(KNOWLEDGE_COMMAND_IDS.includes("work:memory"), "…and still carries work:memory");
      const routes = defaultApplication.cli.deriveRouteTable(commands);
      assert.equal(routes.get("memory")?.id, "memory", "the route table resolves `memory` to the canonical command");
      assert.equal(routes.get("work memory")?.id, "work:memory", "…and `work memory` to the alias");
    },
  },
  {
    name: "arch/178/01 FF-17801 red probe: a planted registry whose work:memory render wraps memory's fails, naming render as the function that is not shared",
    run: () => {
      const commands = defaultApplication.listCommands();
      const canonical = commands.find((command) => command.id === "memory");
      const alias = commands.find((command) => command.id === "work:memory");
      const wrapped = { ...alias, cli: { ...alias.cli, render: (outcome, ctx) => canonical.cli.render(outcome, ctx) } };
      const planted = commands.map((command) => (command === alias ? wrapped : command));
      const failures = memoryAliasFailures(planted);
      assert.equal(failures.length, 1, `exactly one failure (${failures.join("; ")})`);
      assert.match(failures[0], /\brender\b/, "it names render");
      assert.doesNotMatch(failures[0], /\b(run|argv|json|input)\b/, "…and only render");
    },
  },
];
