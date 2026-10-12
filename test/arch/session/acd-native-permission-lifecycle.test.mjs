import assert from "node:assert/strict";
import { codexFixture, reviewFrame, finishFrames } from "../../../packages/execution/test/codex-app-server.suite.mjs";
import { mutatedAdapter } from "./acd-native-permission-authority.test.mjs";

async function lifecycle(adapterFactory) {
  const observed = [];
  const p = codexFixture({ adapterFactory, onStart: ({ emit }) => emit(reviewFrame(), reviewFrame("approved", { turnId: "old-turn" }), ...finishFrames()) });
  const r = await p.adapter.drive(p.brief, { ...p.options, onActivity: e => observed.push(e) });
  assert.equal(observed.some(e => e.status === "approved"), false, "FF-15802: foreign turn cannot decide a review");
  assert.equal(r.failureReason, "native_review_incomplete", "FF-15802: an unresolved review cannot finish a phase");
  assert.equal(observed.at(-1).observationState, "unknown", "FF-15802: owner loss preserves unknown evidence");
  assert.equal(p.child.stdout.destroyed, true, "FF-15802: drive cleanup owns the native process");
  assert.equal(p.calls.some(c => c.result), false, "FF-15802: observation is never replayed as authority");
}
export const archTests = [{ name: "arch/158 FF-15802 — native identity and pending review guard; actual crossed identity turns red", async run() {
  await lifecycle();
  await assert.rejects(lifecycle(await mutatedAdapter("nativeReview(method, params, sessionId, turnId)", "nativeReview(method, params, params.threadId, params.turnId)")), /FF-15802: foreign turn cannot decide a review/);
  await assert.rejects(lifecycle(await mutatedAdapter('if (reviewPending()) { fail("native_review_incomplete"); return; }', "")), /FF-15802: an unresolved review cannot finish a phase/);
} }];
