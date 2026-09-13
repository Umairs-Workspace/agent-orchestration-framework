// Traceability: 69/01 tasks 00-01. The real bundled hook appends consumption and
// the real run-store consumes it through heartbeat before evaluating liveness.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { driveInteractiveClaudeSession, resolveInteractiveDriverLaunch } from "../../src/agent-session-driver.mjs";
import { consumeHeartbeatQueue } from "../../src/run-heartbeat-consumption.mjs";
import { readRuns, startRun } from "../../src/run-store.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const hook = path.join(root, "src", "bundle", "hooks", "run-heartbeat-enqueue.mjs");

async function fixture() {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-heartbeat-consumption-"));
  const item = { ref: "69/01", dir: path.join(home, "wiki", "work", "69_milestone_x", "stories", "01_story_y") };
  await mkdir(item.dir, { recursive: true });
  const run = await startRun(item, { now: "2026-08-22T10:00:00.000Z" });
  return { home, item, run };
}

function fire(item, runId, env = {}) {
  return execFileSync(process.execPath, [hook], {
    env: { ...process.env, AOF_RUN_ITEM_DIR: item?.dir, AOF_RUN_ID: runId, ...env },
    encoding: "utf8",
  });
}

export const runHeartbeatConsumptionTests = [
  {
    name: "69/01 task00 a PostToolUse event stamps only the known running run's liveness",
    run: async () => {
      const fx = await fixture();
      try {
        assert.equal(fire(fx.item, fx.run.runId), "");
        await consumeHeartbeatQueue(fx.item);
        const [record] = await readRuns(fx.item);
        assert.equal(record.state, "running");
        assert.equal(record.outcome, null);
        assert.ok(Date.parse(record.heartbeatAt) > Date.parse(fx.run.updatedAt));
      } finally { await rm(fx.home, { recursive: true, force: true }); }
    },
  },
  {
    name: "69/01 task00 absent and unknown identities are silent successful no-ops",
    run: async () => {
      const fx = await fixture();
      try {
        assert.equal(fire(null, null, { AOF_RUN_ITEM_DIR: "", AOF_RUN_ID: "" }), "");
        assert.equal(fire(fx.item, "unknown-run"), "");
        await consumeHeartbeatQueue(fx.item);
        const [record] = await readRuns(fx.item);
        assert.equal(record.heartbeatAt, null);
      } finally { await rm(fx.home, { recursive: true, force: true }); }
    },
  },
  {
    name: "69/01 task00 spawn identity arrives after the IDE scrub beside attribution",
    run: () => {
      const launch = resolveInteractiveDriverLaunch("claude", {
        env: { PATH: process.env.PATH, VSCODE_IPC_HOOK_CLI: "remove-me" },
        which: () => process.execPath,
        attribution: { runId: "run-1", storyId: "69/01" },
        heartbeat: { itemDir: "C:/repo/wiki/work/69/story", runId: "run-1" },
      });
      assert.equal(launch.env.AOF_RUN_ITEM_DIR, "C:/repo/wiki/work/69/story");
      assert.equal(launch.env.AOF_RUN_ID, "run-1");
      assert.equal(launch.env.VSCODE_IPC_HOOK_CLI, undefined);
      assert.match(launch.env.OTEL_RESOURCE_ATTRIBUTES, /run\.id=run-1/u);
    },
  },
  {
    name: "69/01 task00 the hook queue is consumed and removed rather than becoming run state",
    run: async () => {
      const fx = await fixture();
      try {
        fire(fx.item, fx.run.runId);
        await consumeHeartbeatQueue(fx.item);
        const queue = path.join(fx.item.dir, "runs", ".heartbeats.ndjson");
        await assert.rejects(readFile(queue, "utf8"), (error) => error.code === "ENOENT");
      } finally { await rm(fx.home, { recursive: true, force: true }); }
    },
  },
  {
    name: "69/01 F-69-V4 a declared heartbeat override moves the driver's completion idle window",
    run: async () => {
      const fake = createFakePtySpawn();
      let completionArgs = null;
      const result = await driveInteractiveClaudeSession(
        { itemRef: "69/01", worktreeCwd: "/tmp/wt", task: "heartbeat", command: "/aof:continue 69/01" },
        {
          ptySpawn: fake.spawn,
          which: createFakeWhich(["claude"]),
          watchTranscriptSessionId: async () => "session-69-01",
          watchTranscriptCompletion: async (args) => {
            completionArgs = args;
            return { outcome: "done" };
          },
          deadlinePolicy: { heartbeatMs: 60_000 },
          commandDelayMs: 0,
        },
      );

      assert.equal(result.outcome, "done");
      assert.equal(completionArgs?.idleMs, 60_000);
    },
  },
];
