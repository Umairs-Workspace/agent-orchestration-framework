import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCleanPlan, executeCleanPlan } from "../src/clean.mjs";
import { hashContent, writeLock } from "../src/lock.mjs";
import { createLockManifest, createRenderPlan, executeApplyActions, planApplyActions } from "../src/render-plan.mjs";

export const cleanTests = [
  {
    name: "plans clean actions and removes matching lock entries",
    run: plansCleanActions
  },
  {
    name: "preserves drifted generated files and framework lock data",
    run: preservesDriftedFiles
  },
  {
    name: "204/02 task02 E9 — an edit inside aof's managed block in AGENTS.md is drift: clean leaves the file byte for byte, reports drift-warning, and keeps the lock entry",
    run: keepsAnEditedManagedBlock
  }
];

async function keepsAnEditedManagedBlock() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-clean-"));
  try {
    const config = { resources: [], workflows: [], packages: [], projectDocs: [{ id: "guide", targets: ["AGENTS.md"], runtimes: ["codex"], body: "Run the tests.\nKeep commits small." }] };
    const outputs = await createRenderPlan(config, { targetDir, runtimes: ["codex"] });
    const actions = await planApplyActions(outputs, null, { targetDir });
    await executeApplyActions(actions);
    await writeLock(path.join(targetDir, ".aof", "aof.lock.json"), createLockManifest({ actions, desiredOutputs: outputs, previousLock: null, config, runtimes: ["codex"] }));

    const agentsPath = path.join(targetDir, "AGENTS.md");
    const applied = await readFile(agentsPath, "utf8");
    assert.ok(applied.includes("Keep commits small."), applied);
    const edited = applied.replace("Keep commits small.", "Keep commits tiny.");
    await writeFile(agentsPath, edited, "utf8");

    const plan = await createCleanPlan(targetDir);
    assert.deepEqual(plan.actions.map((action) => [action.path, action.action]), [["AGENTS.md", "drift-warning"]]);
    await executeCleanPlan(plan);

    assert.equal(await readFile(agentsPath, "utf8"), edited);
    const lock = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.lock.json"), "utf8"));
    assert.deepEqual(lock.files.map((entry) => entry.path), ["AGENTS.md"]);
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function plansCleanActions() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-clean-"));
  try {
    const generatedPath = ".codex/skills/context/SKILL.md";
    const absolutePath = path.join(targetDir, generatedPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, "Body\n", "utf8");
    await writeLock(path.join(targetDir, ".aof", "aof.lock.json"), {
      version: 2,
      files: [{ path: generatedPath, hash: hashContent("Body\n"), runtime: "codex", resource: { kind: "skill", id: "context" } }],
      frameworks: [{ id: "gsd", source: "npm:get-shit-done-cc@latest", runtimes: ["codex"] }],
      frameworkInstallAttempts: []
    });

    const plan = await createCleanPlan(targetDir);
    assert.equal(plan.actions[0].action, "delete");
    assert.equal(plan.removedCount, 1);
    await executeCleanPlan(plan);

    const lock = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.lock.json"), "utf8"));
    assert.deepEqual(lock.files, []);
    assert.equal(lock.frameworks[0].id, "gsd");
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}

async function preservesDriftedFiles() {
  const targetDir = await mkdtemp(path.join(os.tmpdir(), "aof-clean-"));
  try {
    const generatedPath = ".codex/skills/context/SKILL.md";
    const absolutePath = path.join(targetDir, generatedPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, "Manual edit\n", "utf8");
    await writeLock(path.join(targetDir, ".aof", "aof.lock.json"), {
      version: 2,
      files: [{ path: generatedPath, hash: hashContent("Original\n"), runtime: "codex", resource: { kind: "skill", id: "context" } }],
      frameworks: [{ id: "gsd", source: "npm:get-shit-done-cc@latest", runtimes: ["codex"] }],
      frameworkInstallAttempts: [{ framework: "gsd", runtime: "codex", status: "success" }]
    });

    const plan = await createCleanPlan(targetDir);
    assert.equal(plan.actions[0].action, "drift-warning");
    assert.equal(plan.removedCount, 0);
    await executeCleanPlan(plan);

    assert.equal(await readFile(absolutePath, "utf8"), "Manual edit\n");
    const lock = JSON.parse(await readFile(path.join(targetDir, ".aof", "aof.lock.json"), "utf8"));
    assert.equal(lock.files.length, 1);
    assert.equal(lock.frameworkInstallAttempts[0].status, "success");
  } finally {
    await rm(targetDir, { recursive: true, force: true });
  }
}
