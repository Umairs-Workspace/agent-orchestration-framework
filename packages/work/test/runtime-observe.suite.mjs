import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createObserverServices } from "./support/observer-services.mjs";
const observer = createObserverServices();

export const runtimeObserveTests = [{ name: "154/08 task01 — Codex observation joins run/thread/turn without Claude cache or fabricated transcript metrics", async run() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "aof-observe-native-"));
  try {
    const folder = path.join(cwd, "wiki/work/154_milestone_native");
    for (const [number, tokens] of [[1, 100], [2, 50]]) {
      const dir = path.join(folder, `stories/0${number}_story_native-${number}`, "runs"); await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "run.json"), JSON.stringify({ runId: `run-${number}`, itemRef: `154/${number}`, sessionId: "shared-thread", execution: { runtime: "codex" }, state: "done", spend: null,
        brief: { runtimeObservation: { version: 1, runtime: "codex", turns: [{ sessionId: "shared-thread", turnId: `turn-${number}` }], tokens: { input: tokens, output: 20, total: tokens + 20 }, costUsd: null, lastActivityAt: `2026-10-07T20:0${number}:00.000Z` } } }));
    }
    for (const [number, expected] of [[1, 100], [2, 50]]) {
      const result = await observer.observeMilestone({ cwd, ref: `154/0${number}`, home: cwd, env: {}, cacheRatioTarget: 999, write: true });
      assert.equal(result.json.nativeRuns.length, 1); const row = result.json.nativeRuns[0];
      assert.equal(row.tokens.input, expected); assert.equal(row.runId, `run-${number}`); assert.equal(row.turns[0].turnId, `turn-${number}`);
      assert.equal(row.attributedTo, `154/${number}`); assert.equal(row.costUsd, null); assert.equal(row.costUnavailable, "native-cost-not-reported");
      assert.equal(result.json.runs.total.costUsd, null); assert.equal(result.json.runs.total.cacheVerdict, null);
      assert.ok(row.unavailable.includes("tool-wait")); assert.equal(result.agents.length, 0);
      assert.match(result.report, /Subscription access does not imply zero dollars/); assert.doesNotMatch(result.report, /\*\*missed\*\*|\$0\.0000/);
      const exported = JSON.parse(await readFile(result.written.jsonPath, "utf8")); assert.deepEqual(exported.nativeRuns, result.json.nativeRuns);
      assert.equal((await observer.buildSessionItemIndex({ cwd })).has("shared-thread"), false, "native ids never enter the Claude transcript join");
    }
    const parent = await observer.observeMilestone({ cwd, ref: "154", home: cwd, env: {} });
    assert.equal(parent.json.nativeRuns.length, 2); assert.deepEqual(parent.json.nativeRuns.map(row => row.tokens.input).sort((a,b)=>a-b), [50,100]);
    const file = path.join(folder, "stories/01_story_native-1/runs/run.json");
    const captured = JSON.parse(await readFile(file, "utf8")); delete captured.itemRef;
    await writeFile(file, JSON.stringify(captured));
    assert.equal((await observer.observeMilestone({ cwd, ref: "154/01", home: cwd, env: {} })).json.nativeRuns[0].attributedTo, null, "a directory name never supplies missing capture");
    captured.itemRef = "154/99"; await writeFile(file, JSON.stringify(captured));
    assert.equal((await observer.observeMilestone({ cwd, ref: "154/01", home: cwd, env: {} })).json.nativeRuns[0].attributedTo, "154/99", "capture wins over the directory-derived ref");
  } finally { await rm(cwd, { recursive: true, force: true }); }
} }, { name: "154/08 task01 — Claude observation remains compatible with documented token, cost and cache measurements", run() {
  const rollup = observer.applyCacheTarget(observer.rollupRunsByPhase([{ spend: { tokens: { input: 100, output: 20, cacheRead: 200, cacheCreate: 100 }, costUsd: 1.23 }, brief: { loop: { phase: "continue" } } }]), 2);
  assert.equal(rollup.total.tokens, 420); assert.equal(rollup.total.costUsd, 1.23); assert.equal(rollup.total.cacheRatio, 2); assert.equal(rollup.total.cacheVerdict, "met");
  const stats = observer.analyzeTranscript(JSON.stringify({ type: "assistant", message: { usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 200, cache_creation_input_tokens: 100 } } }));
  assert.deepEqual(stats.tokens, { inp: 100, out: 20, cacheRead: 200, cacheCreate: 100 });
} }];
