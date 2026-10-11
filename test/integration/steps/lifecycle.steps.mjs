import { runSharedCliStep } from "./shared-cli.steps.mjs";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { runRuntimeRegression, prepareLiveRuntimeFixture } from "../../support/runtime-loop/fixture.mjs";
import { runCli } from "../support/cli-context.mjs";

export async function runStep(context, step) {
  if (step === "a mixed loop resumed after refinement and changed configuration") { context.runtimeProof = await runRuntimeRegression("mixed", { resumeAfterRefine: true }); return; }
  let match = step.match(/^a deterministic runtime regression for "(claude|codex|mixed)"$/);
  if (match) { context.runtime = match[1]; context.runtimeProof = await runRuntimeRegression(context.runtime); return; }
  if (step === "its real CLI, phase gates and settled runs pass") {
    assert.equal(context.runtimeProof.state, "done"); assert.equal(context.runtimeProof.globalStateIsolated, true);
    assert.equal(context.runtimeProof.accepted, false); assert.equal(context.runtimeProof.evidence, "deterministic-scripted-transports"); return;
  }
  if (step === "a persistently failing task stops within the recorded bound") {
    context.failureProof = await runRuntimeRegression(context.runtime, { failBuild: true });
    assert.equal(context.failureProof.state, "halted"); assert.equal(context.failureProof.stop, "progress-exhausted"); return;
  }
  match = step.match(/^a prepared live runtime fixture for "(claude|codex)"$/);
  if (match) { context.liveFixture = await prepareLiveRuntimeFixture(match[1]); return; }
  if (step === "it has native assets and an isolated global home without launching or accepting") {
    const f = context.liveFixture;
    try {
      assert.equal(f.launched, false); assert.equal(f.accepted, false);
      assert.ok(f.globalDir.startsWith(f.root + path.sep));
      await readFile(path.join(f.projectDir, ".agents/skills/aof-continue/SKILL.md"));
      await readFile(path.join(f.projectDir, ".codex/agents/aof-qa.toml"));
      const config = JSON.parse(await readFile(path.join(f.projectDir, ".aof/aof.config.json"), "utf8"));
      assert.equal(config.work.agents.mode, "orchestrated");
      const cliContext = { projectDir: f.projectDir, globalDir: f.globalDir, dataDir: path.join(f.root, "data") };
      const red = await runCli(cliContext, "test --scope all --json");
      assert.notEqual(red.status, 0, red.stdout);
      await writeFile(path.join(f.projectDir, "src/s01.cjs"), "module.exports = { answer: 42 };\n");
      const green = await runCli(cliContext, "test --scope all --json");
      assert.equal(green.status, 0, green.stderr + green.stdout);
    } finally { await rm(f.root, { recursive: true, force: true }); } return;
  }
  if (step === "an unsupported Codex runtime regression") {
    context.profileRefusal = await runRuntimeRegression("codex", { version: "0.130.0" }); return;
  }
  if (step === "its profile refusal precedes phase work") { assert.equal(context.profileRefusal.code, "unsupported_profile"); assert.equal(context.profileRefusal.phaseRecords, 0); assert.equal(context.profileRefusal.nativeThreads, 0); return; }
  await runSharedCliStep(context, step);
}
