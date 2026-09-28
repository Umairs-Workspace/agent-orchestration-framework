import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { createAskRequests, ASK_STATES } from "@aof/work-loop/ask-request";
import { createStopRequests, STOP_LEVELS } from "@aof/work-loop/stop-request";
import { createChildDrive } from "@aof/work-loop/child-drive";

async function fixture(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-loop-package-"));
  try { await run(dir); } finally {
    assert.equal(path.dirname(await realpath(dir)), await realpath(os.tmpdir()));
    await rm(dir, { recursive: true, force: true });
  }
}

test("service instances keep path policy and diagnostic sinks isolated", () => {
  for (const create of [createAskRequests, createStopRequests]) {
    assert.throws(() => create({}), /getRuntimeRoot is required/);
    assert.throws(() => create({ getRuntimeRoot() {} }), /reportDegrade is required/);
    const unexpected = () => { throw new Error("construction called a service"); };
    assert.ok(Object.isFrozen(create({ getRuntimeRoot: unexpected, reportDegrade: unexpected })));
  }
});

test("ask records retain unknown fields, sanitize answers and report corrupt records once", () => fixture(async root => {
  const events = [];
  const env = { sentinel: true };
  const asks = createAskRequests({ getRuntimeRoot: value => { assert.equal(value, env); return root; }, reportDegrade: (...args) => events.push(args) });
  const dir = asks.loopAsksDir(env);
  const now = () => new Date("2026-09-28T12:00:00.000Z");
  const opened = await asks.openAsk(dir, { runId: "r1", ref: "42/01", workspaceId: "w", question: "Proceed?", future: 7, now });
  assert.equal(opened.state, ASK_STATES.waiting);
  await assert.rejects(asks.answerAsk(dir, { workspaceId: "w", ref: "42/01", text: "\u001b[201~" }), error => error.code === "answer-control-chars");
  const answered = await asks.answerAsk(dir, { workspaceId: "w", ref: "42/01", text: "Yes", now });
  assert.equal(answered.future, 7);
  assert.equal(answered.state, ASK_STATES.answered);
  const bytes = await readFile(asks.askRequestPath(dir, "r1"), "utf8");
  await asks.parkAsk(dir, "r1", { now });
  assert.equal(await readFile(asks.askRequestPath(dir, "r1"), "utf8"), bytes);
  await writeFile(asks.askRequestPath(dir, "r1"), "broken");
  assert.equal(await asks.readAsk(dir, "r1"), null);
  assert.equal(events.length, 1);
  assert.equal(events[0][0], "loop-ask-request");
  const otherEvents = [];
  const other = createAskRequests({ getRuntimeRoot: () => root, reportDegrade: (...args) => otherEvents.push(args) });
  await other.readAsk(dir, "r1");
  assert.equal(events.length, 1);
  assert.equal(otherEvents.length, 1);
}));

test("stop files escalate monotonically and release owned process listeners", () => fixture(async root => {
  const stops = createStopRequests({ getRuntimeRoot: () => root, reportDegrade: () => assert.fail("unexpected degradation") });
  const dir = stops.loopStopsDir();
  const first = await stops.requestLoopStop(dir, { loopRunId: "r1", scope: "42" });
  assert.equal(first.level, STOP_LEVELS.drain);
  const proc = new EventEmitter();
  const source = stops.createStopSource({ dir, loopRunId: "r1", process: proc, pollMs: 0 });
  assert.equal(source.level(), 0);
  await source.poll();
  assert.equal(source.level(), STOP_LEVELS.drain);
  await stops.requestLoopStop(dir, { loopRunId: "r1", scope: "42" });
  await source.poll();
  assert.equal(source.signal.aborted, true);
  assert.equal(proc.listenerCount("SIGINT"), 0);
  await stops.clearStopRequest(dir, "r1");
  await source.poll();
  assert.equal(source.level(), STOP_LEVELS.cancel);
  source.stop();
  const resumes = stops.loopResumesDir();
  await stops.requestLoopResume(resumes, { loopRunId: "r1", scope: "42" });
  assert.equal((await stops.clearResumeRequest(resumes, "r1")).cleared, true);
}));

test("child drive uses supplied CLI only for Node and preserves subprocess arguments", async () => {
  let packaged = false;
  let entryReads = 0;
  const calls = [];
  const services = createChildDrive({
    getRuntimeRoot: () => "runtime",
    isPackaged: () => packaged,
    getCliEntry: () => { entryReads++; return "application/cli.mjs"; },
    runBounded: async options => { calls.push(options); return { outcome: "exited", exitCode: 0, stdout: '{"outcome":"done"}', stderr: "" }; },
  });
  const input = { ref: "42/01", phase: "continue", runId: "r1", lane: "lane" };
  const result = await services.spawnLaneDrive(input);
  assert.equal(result.outcome, "document");
  assert.equal(calls[0].command, process.execPath);
  assert.deepEqual(calls[0].args, ["application/cli.mjs", "work", "drive", "continue", "42/01", "--run", "r1", "--json"]);
  assert.equal(calls[0].ownConsole, true);
  assert.equal(calls[0].stdin, "pipe");
  packaged = true;
  await services.spawnLaneDrive(input);
  assert.deepEqual(calls[1].args, calls[0].args.slice(1));
  assert.equal(entryReads, 1);
  await assert.rejects(services.spawnLaneDrive({ ...input, answerFile: "answer", fixFile: "fix" }), /cannot ride one drive/);
  assert.equal(calls.length, 2);
});
