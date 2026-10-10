import assert from "node:assert/strict";
import test from "node:test";
import { createSessionDriver } from "@aof/execution/session-driver";
import { createNodePtyLoader, createTerminalSpawn, releasePtyAfterTreeTermination } from "@aof/execution/pty";

test("confirmed tree termination releases ConPTY without enumerating dead/reused PIDs", async () => {
  const original = () => { throw Error("must not enumerate dead console"); };
  const agent = { _useConpty: true, _useConptyDll: false, _getConsoleProcessList: original };
  let list;
  const term = { _agent: agent, kill() { list = agent._getConsoleProcessList(); } };
  releasePtyAfterTreeTermination(term);
  assert.deepEqual(await list, []);
  assert.equal(agent._getConsoleProcessList, original);
  const failure = Error("release failure");
  term.kill = () => { throw failure; };
  assert.throws(() => releasePtyAfterTreeTermination(term), error => error === failure);
  assert.equal(agent._getConsoleProcessList, original);
});

test("session driver composes without I/O and uses supplied launch and transcript services", async () => {
  let loads = 0;
  const calls = [];
  const handle = {};
  const driver = createSessionDriver({
    reportDegrade: assert.fail,
    transcripts: { claudeProjectsDir: assert.fail, readLastAssistantTurn: assert.fail, NEEDS_INPUT_SENTINEL: "fixture-input", HUMAN_INPUT_TOOL_NAMES: ["fixture-tool"] },
    launch: {
      resolveProvider: () => null,
      loadNodePty: async () => { loads++; return { spawn: (...args) => { calls.push(args); return handle; } }; },
      openSessionScreen: assert.fail, ensureWorktreeTrusted: assert.fail,
      buildOtelResourceAttributes: assert.fail, composePhaseBriefInput: assert.fail,
      OTEL_RESOURCE_ATTRIBUTES_ENV_KEY: "fixture-resource", OTEL_TELEMETRY_ENV_KEY: "fixture-telemetry",
    },
  });
  assert.equal(loads, 0);
  assert.ok(driver.NEEDS_INPUT_INSTRUCTION.includes("fixture-input"));
  assert.deepEqual(driver.HUMAN_INPUT_TOOL_NAMES, ["fixture-tool"]);
  assert.equal(driver.resolveInteractiveDriverLaunch("missing"), null);
  assert.equal(driver.buildDriverCommand("claude", { itemRef: "42/01" }), null);
  const args = ["--example"], options = { cwd: "fixture" };
  assert.equal(await driver.defaultPtySpawn("fixture-bin", args, options), handle);
  assert.equal(loads, 1);
  assert.equal(calls[0][1], args);
  assert.equal(calls[0][2], options);
});

test("PTY composition defers distribution policy and preserves native load failure identity", async () => {
  const error = new Error("fixture native load failure");
  let checked = 0;
  const load = createNodePtyLoader({ isPackaged() { checked++; throw error; } });
  const spawn = createTerminalSpawn(load);
  assert.equal(checked, 0);
  await assert.rejects(spawn("unused", [], {}), actual => actual === error);
  assert.equal(checked, 1);
  assert.throws(() => createNodePtyLoader({}), /isPackaged/);
});
