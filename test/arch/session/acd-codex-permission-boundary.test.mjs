import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { codexFixture } from "../../../packages/execution/test/codex-app-server.suite.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

async function assertDeclined(adapterFactory) {
  for (const method of ["item/commandExecution/requestApproval", "item/fileChange/requestApproval", "item/permissions/requestApproval"]) {
    const p = codexFixture({ scenario: `permission:${method}`, adapterFactory });
    let questions = 0;
    const result = await p.adapter.drive(p.brief, { ...p.options, onQuestion: () => { questions++; } });
    assert.equal(result.failureReason, "operator_action_required"); assert.equal(questions, 0);
    assert.deepEqual(p.calls.find(call => call.id === "approval-1").result, method.includes("permissions") ? { permissions: {}, scope: "turn" } : { decision: "decline" }, "FF-15403: native permissions are declined, never business questions");
  }
}
export const archTests = [{ name: "arch/154 FF-15403 — the actual permission path refuses approvals and a deliberate bypass turns it red", async run() {
  await assertDeclined();
  const url = new URL("../../../packages/execution/src/codex-app-server.mjs", import.meta.url);
  const original = await readFile(url, "utf8");
  const anchor = "const reply = permissionReply(method);";
  assert.equal(original.split(anchor).length, 2, "exactly one production permission decision was read");
  let planted = original.replace(anchor, anchor + ' if (reply && reply.decision) reply.decision = "accept";');
  const imports = importSpecifiers(original);
  assert.ok(imports.length > 0, "the production adapter imports were actually read");
  for (const { specifier, dynamic } of imports) {
    assert.equal(dynamic, false, "this mutation fixture rewrites only static literal dependencies");
    const resolved = specifier.startsWith(".") ? new URL(specifier, url).href : import.meta.resolve(specifier);
    planted = planted.replaceAll(JSON.stringify(specifier), JSON.stringify(resolved));
  }
  const module = await import("data:text/javascript;base64," + Buffer.from(planted).toString("base64"));
  await assert.rejects(() => assertDeclined(module.createCodexAppServerAdapter), /FF-15403/);
} }];
