import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { reduceRuntimeObservation } from "../../../packages/execution/src/runtime-events.mjs";
const record = { runId: "run", sessionId: "native-thread", execution: { runtime: "codex" }, brief: {} };
const event = { kind: "turn", sessionId: "native-thread", turnId: "native-turn", resumed: false };
function facts(reduce) {
  const observation = reduce(record, [], event);
  assert.equal(observation.costUsd, null, "FF-15406: missing native cost is unavailable");
  assert.equal(observation.tokens, null, "FF-15406: missing native usage is unavailable");
  assert.equal(observation.turns[0].sessionId, event.sessionId, "FF-15406: thread identity is native");
  assert.equal(observation.turns[0].turnId, event.turnId, "FF-15406: turn identity is native");
  assert.throws(() => reduce(record, [], { ...event, turnId: null }), error => error.code === "runtime-observation-invalid");
}
export const archTests = [{ name: "arch/154 FF-15406 — runtime observation preserves native identity and unavailable cost, with a red probe", async run() {
  facts(reduceRuntimeObservation);
  const source = await readFile(new URL("../../../packages/execution/src/runtime-events.mjs", import.meta.url), "utf8");
  assert.ok(source.includes("costUsd: null"), "plant site is present in actual source");
  const planted = source.replace("costUsd: null", "costUsd: 0"); assert.notEqual(planted, source);
  const mutation = await import(`data:text/javascript;base64,${Buffer.from(planted).toString("base64")}`);
  assert.throws(() => facts(mutation.reduceRuntimeObservation), /FF-15406/);
  const driver = await readFile(new URL("../../../packages/work-loop/src/commands/drive.mjs", import.meta.url), "utf8");
  assert.match(driver, /onUsage: async value => \{ await runs\.recordRuntimeEvent/u, "native usage must reach the existing run writer");
  assert.doesNotMatch(source, /(?:claudeProjectsDir|priceVendorTokens|node:fs|costUsd: 0)/u);
} }];
