import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importSpecifiers } from "../../support/module-family.mjs";
import { codexFixture } from "../../../packages/execution/test/codex-app-server.suite.mjs";

export async function mutatedAdapter(anchor, replacement) {
  const url = new URL("../../../packages/execution/src/codex-app-server.mjs", import.meta.url);
  const original = await readFile(url, "utf8");
  assert.equal(original.split(anchor).length, 2, "mutation changes exactly one production site");
  let source = original.replace(anchor, replacement);
  for (const { specifier, dynamic } of importSpecifiers(original)) {
    assert.equal(dynamic, false);
    source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(specifier.startsWith(".") ? new URL(specifier, url).href : import.meta.resolve(specifier)));
  }
  return (await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"))).createCodexAppServerAdapter;
}
async function authority(adapterFactory) {
  for (const resume of [false, true]) {
    const p = codexFixture({ adapterFactory });
    const r = await p.adapter.drive(p.brief, { ...p.options, ...(resume ? { resumeSessionId: p.fixture.nativeThreadId } : {}) });
    assert.equal(r.outcome, "done", "FF-15801: admitted automatic review starts work");
    const launch = p.calls.find(c => c.method === (resume ? "thread/resume" : "thread/start"));
    assert.equal(launch.params.approvalsReviewer, "auto_review", "FF-15801: driven work selects the native reviewer");
    assert.equal(launch.params.approvalPolicy, "on-request", "FF-15801: review has an eligible policy");
    for (const call of p.calls) for (const field of ["sandbox", "sandboxPolicy", "config", "writableRoots"]) assert.equal(Object.hasOwn(call.params ?? {}, field), false, "FF-15801: configured sandbox is preserved");
    assert.equal(p.calls.some(c => c.result), false, "FF-15801: AOF manufactures no native grant");
  }
  const denied = codexFixture({ adapterFactory, acknowledgement: { approvalsReviewer: "user", approvalPolicy: "on-request" } });
  assert.equal((await denied.adapter.drive(denied.brief, denied.options)).failureReason, "automatic_review_unavailable", "FF-15801: effective reviewer must be acknowledged");
  assert.equal(denied.calls.some(c => c.method === "turn/start"), false);
}
export const archTests = [{ name: "arch/158 FF-15801 — native reviewer selection and acknowledgement; actual removal turns red", async run() {
  await authority();
  const anchor = "model: choice.model, ...CODEX_AUTO_REVIEW,";
  await assert.rejects(authority(await mutatedAdapter(anchor, "model: choice.model,")), /FF-15801: driven work selects the native reviewer/);
} }];
