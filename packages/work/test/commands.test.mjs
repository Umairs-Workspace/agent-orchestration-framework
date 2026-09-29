import assert from "node:assert/strict";
import test from "node:test";
import { createWorkContribution, WORK_COMMAND_IDS } from "@aof/work/commands";
import { createCommandRegistry } from "@aof/contracts/commands";

const descriptor = (id, route) => ({
  id, input: { type: "object" },
  run: async input => ({ input }),
  cli: { route, spec: { flags: { scope: { type: "string" } } } },
});

test("work contributions retain descriptor identity, order and invocation without running during registration", async () => {
  let runs = 0;
  const first = descriptor("work:list", ["work", "list"]);
  const second = descriptor("work:doc", ["work", "doc"]);
  first.run = async (input, context) => { runs++; return { input, context }; };
  const input = [second, first];
  const contribution = createWorkContribution(input);
  input.reverse();
  const registry = createCommandRegistry([contribution]);
  assert.equal(runs, 0);
  assert.deepEqual(registry.listCommands(), [second, first]);
  assert.equal(registry.getCommand(first.id), first);
  assert.equal(registry.ownerOf(first.id), "@aof/work");
  assert.ok(Object.isFrozen(contribution));
  assert.ok(Object.isFrozen(contribution.commands));
  const context = { workspace: "fixture" };
  assert.deepEqual(await registry.invoke(first.id, { scope: "142" }, context), { input: { scope: "142" }, context });
  assert.equal(runs, 1);
});

test("work shares namespaces while the registry refuses duplicate IDs and routes across packages", () => {
  const work = descriptor("work:list", ["work", "list"]);
  const loop = descriptor("work:loop", ["work", "loop"]);
  const contribution = createWorkContribution([work]);
  const registry = createCommandRegistry([contribution, { name: "@aof/work-loop", commands: [loop] }]);
  assert.equal(registry.ownerOf(loop.id), "@aof/work-loop");
  assert.throws(() => createCommandRegistry([contribution, { name: "other", commands: [work] }]), /Command collision.*@aof\/work.*other/);
  assert.throws(() => createCommandRegistry([contribution, { name: "other", commands: [descriptor("other:list", work.cli.route)] }]), /Route collision/);
});

test("work refuses foreign commands and malformed groups and declares each owned ID once", () => {
  assert.ok(WORK_COMMAND_IDS.length > 0);
  assert.ok(Object.isFrozen(WORK_COMMAND_IDS));
  assert.equal(new Set(WORK_COMMAND_IDS).size, WORK_COMMAND_IDS.length);
  for (const input of [undefined, {}, [], [descriptor("work:loop", ["work", "loop"])], [{ id: "work:list" }]]) {
    assert.throws(() => createWorkContribution(input), TypeError);
  }
});
