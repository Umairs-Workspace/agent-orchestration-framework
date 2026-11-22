import path from "node:path";
import { rm } from "node:fs/promises";
import { writeText } from "@aof/foundation/fs";
import { checkCodexTarget, nothingLeft, retractCoAuthoredOutput } from "./codex-settings.mjs";
import { hashFileIfExists, readLock, writeLock } from "./lock.mjs";
import { workspacePaths } from "./workspace.mjs";

export async function createCleanPlan(projectDir = process.cwd()) {
  const paths = workspacePaths(projectDir);
  const lock = await readLock(paths.lockPath);
  const files = Array.isArray(lock?.files) ? lock.files : [];
  const actions = [];

  for (const entry of files) {
    const absolutePath = path.resolve(projectDir, entry.path);
    const currentHash = await hashFileIfExists(absolutePath);
    if (!currentHash) {
      actions.push(cleanAction("skip", entry, absolutePath, "previously generated file is already absent"));
      continue;
    }
    // 204/ADR-004: a merged file is retracted, never deleted whole. Drift is judged on aof's
    // fragment alone: an edit outside it is the user's, an edit inside it keeps the file and entry.
    if (entry.ownership) {
      let retracted;
      try {
        await checkCodexTarget({ ...entry, absolutePath }, { targetDir: projectDir });
        retracted = await retractCoAuthoredOutput(entry, absolutePath);
      } catch (error) {
        actions.push(cleanAction("drift-warning", entry, absolutePath, `aof's recorded entries were modified; not retracting (${error.reason ?? error.message})`));
        continue;
      }
      if (nothingLeft(entry.path, retracted.content)) actions.push(cleanAction("delete", entry, absolutePath, "nothing of the user's is left once aof's recorded entries are removed"));
      else actions.push({ ...cleanAction("retract", entry, absolutePath, "aof's recorded entries removed; the user's content kept"), content: retracted.content });
      continue;
    }
    if (currentHash !== entry.hash) {
      actions.push(cleanAction("drift-warning", entry, absolutePath, "generated file was modified; not deleting"));
      continue;
    }
    actions.push(cleanAction("delete", entry, absolutePath, "lock-owned generated file matches recorded hash"));
  }

  const removed = new Set(actions
    .filter((action) => ["delete", "retract", "skip"].includes(action.action))
    .map((action) => normalizePath(action.path)));
  const nextLock = lock ? {
    ...lock,
    files: files.filter((entry) => !removed.has(normalizePath(entry.path)))
  } : null;

  return {
    lockPath: paths.lockPath,
    lock,
    nextLock,
    actions,
    removedCount: removed.size
  };
}

export async function executeCleanPlan(plan) {
  for (const action of plan.actions) {
    if (action.action === "delete") {
      await rm(action.absolutePath, { force: true });
    }
    if (action.action === "retract") {
      await writeText(action.absolutePath, action.content);
    }
  }

  if (plan.nextLock) {
    await writeLock(plan.lockPath, plan.nextLock);
  }
}

function cleanAction(name, entry, absolutePath, reason) {
  return {
    action: name,
    path: entry.path,
    absolutePath,
    runtime: entry.runtime,
    resource: entry.resource ?? null,
    reason
  };
}

function normalizePath(filePath) {
  return String(filePath).replaceAll("\\", "/");
}
