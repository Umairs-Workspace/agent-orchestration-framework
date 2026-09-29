import assert from "node:assert/strict";
import test from "node:test";
import { createTriggerDeclarations } from "@aof/work-loop/trigger/declaration";
import { createTriggerCommand } from "@aof/work-loop/commands/trigger";
import { createTriggerContribution } from "@aof/work-loop/commands";
import { createCommandRegistry } from "@aof/contracts/commands";

const member = (overrides = {}) => ({
  id: "wake", protects: "an unattended driver", source: "cron", scope: "63", level: "L1", ...overrides,
});
const declaration = (members = [member()]) => ({ version: 1, members });
const services = (ports = {}) => createTriggerDeclarations({
  readAssetText: () => JSON.stringify(declaration()),
  parseCadence: () => { throw new Error("no cadence expected"); },
  ...ports,
});

test("trigger declarations use supplied asset and grammar ports and refuse a whole malformed set", () => {
  const reads = [], cadences = [];
  const parsed = { kind: "periodic", milliseconds: 1000 };
  const api = services({
    readAssetText: (...args) => { reads.push(args); return JSON.stringify(declaration()); },
    parseCadence: (value) => { cadences.push(value); return parsed; },
  });
  assert.deepEqual(api.bundledTriggerDeclaration(), declaration());
  assert.deepEqual(reads, [["bundle", "triggers.jsonc"]]);
  const compiled = api.compileTriggerDeclaration(declaration([member({ cadence: "periodic:1s" })]));
  assert.deepEqual(cadences, ["periodic:1s"]);
  assert.equal(compiled.triggers[0].cadence, parsed);
  assert.ok(Object.isFrozen(compiled.triggers));
  assert.throws(() => api.compileTriggerDeclaration(declaration([member(), member({ id: "bad", level: "invalid" })])), api.TriggerDeclarationError);
});

test("trigger command lazily loads the supplied registry and resolves argv without invoking the loop", async () => {
  let loads = 0;
  const looked = [];
  const api = createTriggerCommand({
    ...services(),
    loadCommandCore: async () => {
      loads++;
      return {
        getCommand: (id) => { looked.push(id); return { cli: { route: ["work", "loop"] } }; },
        invoke: () => { throw new Error("trigger must not invoke an ungated loop"); },
      };
    },
  });
  assert.equal(loads, 0);
  const report = await api.buildTriggerReport({}, {
    workspace: { projectRoot: process.cwd() }, trigger: { declaration: declaration() },
  });
  assert.equal(loads, 1);
  assert.deepEqual(looked, ["work:loop"]);
  assert.equal(report.resolved.length, 1);
  assert.deepEqual(report.resolved[0].argv.slice(0, 2), ["work", "loop"]);
  assert.equal(report.refused.length, 0);
  assert.equal(api.triggerCommand.cli.launch, undefined);
  const contribution = createTriggerContribution(api.triggerCommand);
  const registry = createCommandRegistry([contribution]);
  assert.equal(registry.ownerOf("work:trigger"), "@aof/work-loop");
  assert.equal(registry.getCommand("work:trigger"), api.triggerCommand);
  assert.ok(Object.isFrozen(contribution.commands));
  assert.throws(() => createTriggerContribution({ id: "work:loop" }), /requires work:trigger/);
});

test("a malformed trigger declaration is reported before the registry is loaded", async () => {
  const api = createTriggerCommand({
    ...services(), loadCommandCore: () => { throw new Error("registry must not load"); },
  });
  const report = await api.buildTriggerReport({}, {
    workspace: { projectRoot: process.cwd() }, trigger: { declaration: { members: "bad" } },
  });
  assert.deepEqual(report.resolved, []);
  assert.ok(report.failure);
});
