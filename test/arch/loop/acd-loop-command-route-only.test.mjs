import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { deriveRouteTable, resolveRoute } from "../../../src/spine/face.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const verbs = ["show", "graph", "validate", "groundedness"];

export const archTests = [
  {
    name: "arch/52 FF-5207: registered loop commands own exact route triples and resolve without a ladder",
    run: async () => {
      const commands = listCommands();
      const routes = deriveRouteTable(commands);
      for (const verb of verbs) {
        const id = `work:loops-${verb}`;
        const command = getCommand(id);
        assert.ok(command, id);
        assert.deepEqual(command.cli.route, ["work", "loops", verb]);
        assert.equal(routes.get(`work loops ${verb}`)?.id, id);
        for (const key of ["argv", "render", "json"]) assert.equal(typeof command.cli[key], "function", `${id}/${key}`);
        const resolved = resolveRoute(["work", "loops", verb, "tail"], commands);
        assert.equal(resolved.command.id, id);
        assert.deepEqual(resolved.rest, ["tail"]);
      }
      assert.equal(resolveRoute(["work", "loops"], commands), null);
      const cli = stripComments(await readFile(path.join(root, "src/cli.mjs"), "utf8"));
      assert.doesNotMatch(cli, /subcommand\s*===\s*["']loops["']|loops-(?:show|graph|validate|groundedness)/);

      // THE WHOLE-FILE TOKEN GREP ABOVE IS SPELLING-BOUND: `sub === "loops"`,
      // `switch (subcommand) { case "loops": }` and `subcommand == 'loops'` all slip through it,
      // and the whole file is not the region ADR-008's rule is about — `src/cli.mjs` legitimately
      // names other things. So the ladder is read where it lives: the isolated `workCommand`
      // body, cut on the language's own structure through the one home
      // (`test/support/source-slice.mjs`), then matched for the ROUTE WORD in any quoting.
      // 03_command-surface.feature:66-77 asks for exactly this pair, plus the non-vacuity leg —
      // a cut that silently returned nothing would otherwise "prove" the absence of every branch.
      const workBody = functionBody(cli, "async function workCommand(args)");
      assert.ok(workBody, "src/cli.mjs: `async function workCommand(args)` NOT FOUND — the ladder cut could not be made, so no claim below was measured");
      assert.ok(workBody.trim().length > 0, "src/cli.mjs: the isolated workCommand body is empty — the cut landed on the wrong region");
      assert.match(workBody, /\bsubcommand\b/, "the isolated body is the ladder itself — it destructures the subcommand it dispatches on (non-vacuous)");
      assert.doesNotMatch(workBody, /["']loops["']/, "workCommand carries no loops dispatch branch, however the comparison is spelled — the route table is the only admitted door (ADR-008)");
    },
  },
  // RETIRED 2026-08-15, exactly as this file's own note asked. The second leg here was a
  // DELIBERATE, self-declared exception: a BEHAVIOURAL absent-registry check ("a repository with no
  // registry is not an error condition for any of the three verbs",
  // 03_command-surface.feature:120-124) kept only because nothing else mechanised that clause, with
  // the standing instruction that it was "the one to retire" once a behavioural suite covered it.
  // 52/05 task 03 is that suite: the claim now lives in `test/loop/work-loops-commands.test.mjs`, decided
  // twice over — in process across all three verbs, absent AND empty ("loops-commands/02 absence and
  // emptiness are distinguishable on every verb"), and at the process boundary with three real
  // spawns over a work stream carrying items and no `loops/` directory ("loops-commands/03 the
  // family shadows no existing command and writes nothing"). This gate keeps its file, its name and
  // its structural first leg, so FF-5209's nine-file roster and its non-empty `archTests`
  // requirement are both untouched.
];
