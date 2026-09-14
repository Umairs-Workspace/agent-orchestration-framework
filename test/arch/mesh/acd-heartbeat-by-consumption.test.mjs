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
  {
    // 129/04 (ADR-007 §2; RULING 2026-09-13) — THE ONE RATIFIED DEPARTURE, admitted BY NAME.
    // FF-6903's subject is a SESSION, whose tool use is its liveness: the hook appends on every
    // tool call and the consumer is the one heartbeat writer. The WAVE RUN has no session — the
    // loop process is the actor while its lanes' children work in their own trees — so its honest
    // liveness is an interval in the loop process: every `heartbeatMs / 3` it appends the HOOK'S
    // EXACT BYTES to the milestone's queue and calls the ONE consumer. Exactly one timer, in
    // exactly one module, feeding the existing writer through the existing queue — no second
    // threshold, no second consumer, no `heartbeat()` written directly.
    name: "arch/129/04 FF-6903 (extended): the wave run's interval is the one admitted timer — one setInterval in wave.mjs, appending the hook's bytes and consuming through the one writer",
    run: async () => {
      const wave = await readFile(path.join(root, "src/loop/wave.mjs"), "utf8");
      const stripped = wave.replace(/\/\/[^\n]*/gu, "");
      const timers = [...stripped.matchAll(/\bsetInterval\(/gu)];
      // Two spellings of ONE timer: the default seam (`timers.setInterval` resolving to the
      // platform's) and the one call that arms the wave run's heartbeat. No third.
      assert.equal(timers.length, 2, "one default seam plus one arming call, no third setInterval");
      assert.match(stripped, /heartbeatHandle = timers\.setInterval\(\(\) => beatWaveRun\(\)/u, "the one armed interval beats the wave run");
      assert.match(stripped, /Math\.floor\(bounds\.heartbeatMs \/ 3\)/u, "…on heartbeatMs / 3, the threshold handed in from the one bound home");
      assert.doesNotMatch(stripped, /heartbeatFromConfig|work\.loop\.heartbeatMs|\bheartbeat\(/u, "no second threshold, and never the store's heartbeat() directly");
      assert.match(stripped, /\.heartbeats\.ndjson/u, "the hook's queue");
      assert.match(stripped, /\$\{JSON\.stringify\(\{ runId, at \}\)\}\\n/u, "…the hook's exact bytes");
      assert.match(stripped, /consumeHeartbeatQueue\(waveRun\.item\)/u, "…consumed through the one consumer");
      assert.doesNotMatch(stripped, /setTimeout\(/u, "no self-ping by timeout either");
      // The hook and the consumer are untouched by the extension.
      const [hook, consumer] = await Promise.all([
        readFile(path.join(root, "src/bundle/hooks/run-heartbeat-enqueue.mjs"), "utf8"),
        readFile(path.join(root, "src/run-heartbeat-consumption.mjs"), "utf8"),
      ]);
      assert.doesNotMatch(hook, /setInterval|setTimeout/u);
      assert.match(consumer, /consumeHeartbeatQueue\(item\)[\s\S]*heartbeat\(item, runId, \{ now: at \}\)/u);
    },
  },
];
