import assert from "node:assert/strict";
import { getCommand, listCommands } from "../../src/command-core.mjs";
import { deriveRouteTable, resolveRoute } from "../../src/spine/face.mjs";

export const loopCommandRegistrationTests = [{
  name: "loop command registration — four additive ids have distinct derived routes and report-only CLI probes",
  async run() {
    const expected = new Map([
      ["work:loop", ["work", "loop"]],
      ["work:drive-refine", ["work", "drive", "refine"]],
      ["work:drive-continue", ["work", "drive", "continue"]],
      ["work:drive-verify", ["work", "drive", "verify"]],
    ]);
    const ids = new Set(listCommands().map((command) => command.id));
    const table = deriveRouteTable();
    for (const [id, route] of expected) {
      assert.equal(ids.has(id), true);
      assert.deepEqual(getCommand(id).cli.route, route);
      assert.equal(table.get(route.join(" ")).id, id);
      assert.equal(resolveRoute([...route, "03/01"]).command.id, id);
    }
    assert.equal(getCommand("work:drive-continue").cli.argv(["03/01"], { dryRun: true }).dryRun, true);
    assert.equal(getCommand("work:loop").cli.launch({ dryRun: true }), null);
  },
}];
