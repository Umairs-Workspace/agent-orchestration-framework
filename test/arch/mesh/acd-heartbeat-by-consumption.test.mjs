// FF-6903 / ADR-003: tool consumption feeds the one heartbeat writer; no pinger
// and no second threshold/default are introduced.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const archTests = [
  {
    name: "arch/69 FF-6903 heartbeat is hook-fed consumption with one threshold and no periodic self-ping",
    run: async () => {
      const [hook, consumer, driver, reclaim] = await Promise.all([
        readFile(path.join(root, "src/bundle/hooks/run-heartbeat-enqueue.mjs"), "utf8"),
        readFile(path.join(root, "src/run-heartbeat-consumption.mjs"), "utf8"),
        readFile(path.join(root, "src/agent-session-driver.mjs"), "utf8"),
        readFile(path.join(root, "src/mesh/assignment-reclaim.mjs"), "utf8"),
      ]);
      assert.doesNotMatch(hook, /from\s+["'][^"']*src\//u);
      assert.doesNotMatch(hook, /setInterval|setTimeout|openGlobalWorkProjectionStore|run-store/u);
      assert.match(driver, /sessionEnv\.AOF_RUN_ITEM_DIR/u);
      assert.match(driver, /sessionEnv\.AOF_RUN_ID/u);
      assert.match(consumer, /consumeHeartbeatQueue\(item\)[\s\S]*heartbeat\(item, runId, \{ now: at \}\)/u);
      assert.match(reclaim, /heartbeatThresholdMs:\s*heartbeatFromConfig\(ws\)/u);
      assert.doesNotMatch(reclaim, /heartbeatThresholdMs:\s*\d/u);
      assert.match(
        driver,
        /watchTranscriptCompletion\(\{[\s\S]*?idleMs:\s*positiveMs\(deadlinePolicy\?\.heartbeatMs\)\s*\?\s*deadlinePolicy\.heartbeatMs\s*:\s*COMPLETION_IDLE_MS,/u,
        "the transcript completion fallback consumes the caller-resolved heartbeat deadline",
      );

      const plantedPinger = `${hook}\nsetInterval(() => heartbeat(), 1000);`;
      assert.match(plantedPinger, /setInterval|setTimeout/u, "a planted periodic self-ping trips the hook detector");
      const plantedThreshold = reclaim.replace("heartbeatThresholdMs: heartbeatFromConfig(ws)", "heartbeatThresholdMs: 900000");
      assert.notEqual(plantedThreshold, reclaim, "the literal-threshold plant changed the source");
      assert.match(plantedThreshold, /heartbeatThresholdMs:\s*\d/u, "a planted second threshold trips the reclaim detector");
      const plantedDriverThreshold = driver.replace(
        /idleMs:\s*positiveMs\(deadlinePolicy\?\.heartbeatMs\)\s*\?\s*deadlinePolicy\.heartbeatMs\s*:\s*COMPLETION_IDLE_MS,/u,
        "idleMs: 900000,",
      );
      assert.notEqual(plantedDriverThreshold, driver, "the driver threshold plant changed the source");
      assert.match(
        plantedDriverThreshold,
        /watchTranscriptCompletion\(\{[\s\S]*?idleMs:\s*\d/u,
        "a planted driver-local threshold trips the same completion-watch detector",
      );
    },
  },
];
