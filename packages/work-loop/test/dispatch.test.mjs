import assert from "node:assert/strict";
import test from "node:test";
import { createDispatchLanes } from "@aof/work-loop/dispatch";
import { createDispatchCommand } from "@aof/work-loop/commands/dispatch";
import { createDispatchContribution } from "@aof/work-loop/commands";
import { createCommandRegistry } from "@aof/contracts/commands";

test("dispatch admission releases its supplied repository lock after an operation throws", async () => {
  const calls = [];
  const api = createDispatchLanes({
    resolveExec: () => async (argv, options) => { calls.push({ argv, options }); return { status: 0, stdout: ".git" }; },
    acquireMeshLauncherLock: async options => { calls.push(options); return { acquired: true, release: async () => calls.push("released") }; },
  });
  const failure = new Error("operation failed");
  await assert.rejects(api.withDispatchLaneAdmissionLock(process.cwd(), async () => { calls.push("operation"); throw failure; }), error => error === failure);
  assert.deepEqual(calls[0].argv, ["rev-parse", "--git-common-dir"]);
  assert.equal(calls[1].lockName, "aof-dispatch-admission.lock");
  assert.deepEqual(calls.slice(-2), ["operation", "released"]);
});

test("dispatch uses its configured admission and worktree services before opening only admitted lanes", async () => {
  const calls = [];
  const lanes = createDispatchLanes({});
  const { dispatchCommand } = createDispatchCommand({
    ...lanes,
    withDispatchLaneAdmissionLock: async (root, operation) => { calls.push("lock"); const answer = await operation(); calls.push("unlock"); return answer; },
    inspectDispatchLaneAdmission: async () => { calls.push("inspect"); return { occupied: 1, holders: [], lanes: [] }; },
    resolveDispatchLane: async (root, ref) => { calls.push(ref); return { ref, created: true }; },
  });
  const result = await dispatchCommand.run({ refs: ["63/01", "63/02"] }, {
    workspace: { projectRoot: process.cwd(), config: { work: { dispatch: { concurrency: 2 } } } },
  });
  assert.deepEqual(calls, ["lock", "inspect", "63/01", "unlock"]);
  assert.equal(result.dispatched[1].code, "dispatch-capacity-full");
  assert.equal(result.occupancy.afterAdmission, 2);
  const registry = createCommandRegistry([createDispatchContribution(dispatchCommand)]);
  assert.equal(registry.ownerOf("work:dispatch"), "@aof/work-loop");
  assert.equal(registry.getCommand("work:dispatch"), dispatchCommand);
});

test("dispatch's bounded pool keeps processing after a lane fails", async () => {
  const { dispatchReadySet } = createDispatchLanes({});
  let active = 0, peak = 0;
  const failure = new Error("one lane failed");
  const result = await dispatchReadySet([1, 2, 3, 4].map(ref => ({ ref })), async ({ ref }) => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    if (ref === 2) throw failure;
    return ref;
  }, { bound: 2 });
  assert.equal(peak, 2);
  assert.equal(result.peak, 2);
  assert.deepEqual(result.dispatched.map(row => row.ref), [1, 2, 3, 4]);
  assert.equal(result.dispatched[1].error, failure);
  assert.equal(result.dispatched[3].value, 4);
});
