import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { globalMeshPaths } from "../workspace.mjs";
import { reportDegrade } from "../degrade.mjs";

export function meshLauncherLockPaths(options = {}) {
  const meshPaths = options.paths ?? globalMeshPaths(options);
  // The launcher remains the default/only production caller of its historical
  // name. Other repository-scoped critical sections may reuse the same atomic
  // mkdir + owner-token primitive by supplying a distinct fixed name.
  const lockName = typeof options.lockName === "string" && /^[a-z0-9][a-z0-9.-]*$/iu.test(options.lockName)
    ? options.lockName
    : "launcher.lock";
  const lockDir = path.join(meshPaths.meshRoot, lockName);
  return { lockDir, ownerPath: path.join(lockDir, "owner.json") };
}

function defaultIsProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function readOwner(ownerPath) {
  try {
    const owner = JSON.parse(await readFile(ownerPath, "utf8"));
    return owner != null && typeof owner === "object" ? owner : null;
  } catch {
    return null;
  }
}

// removeLockDirIfOwned(lockDir, expectedToken) — compare-and-remove without
// ever deleting through the public lock path. Every remover first wins ONE
// mkdir claim inside the current directory, re-reads the owner under that claim,
// and atomically renames the directory to its own unique tombstone. A successor
// may then acquire `lockDir`; cleanup touches only the tombstone, so neither a
// stale release handle nor a second dead-owner contender can remove it.
async function removeLockDirIfOwned(lockDir, expectedToken) {
  const guardPath = path.join(lockDir, ".remove-guard");
  let claimed = false;
  let tombstone = null;
  try {
    await mkdir(guardPath, { recursive: false });
    claimed = true;
  } catch (error) {
    if (error?.code === "EEXIST" || error?.code === "ENOENT") return false;
    throw error;
  }

  try {
    const owner = await readOwner(path.join(lockDir, "owner.json"));
    const currentToken = typeof owner?.token === "string" ? owner.token : null;
    if (currentToken !== expectedToken) return false;

    const tombstoneTarget = `${lockDir}.removed-${process.pid}-${randomUUID()}`;
    try {
      await rename(lockDir, tombstoneTarget);
      tombstone = tombstoneTarget;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
    await rm(tombstone, { recursive: true, force: true });
    return true;
  } finally {
    // Before rename, release a claim that discovered a successor/mismatch. After
    // rename, the claim moved with the tombstone and was already removed there.
    if (claimed && tombstone == null) await rm(guardPath, { recursive: true, force: true });
  }
}

export async function readMeshLauncherLockStatus(options = {}) {
  const isProcessAlive = typeof options.isProcessAlive === "function" ? options.isProcessAlive : defaultIsProcessAlive;
  const { lockDir, ownerPath } = meshLauncherLockPaths(options);
  const owner = await readOwner(ownerPath);
  const ownerPid = Number.isInteger(owner?.pid) ? owner.pid : null;
  if (ownerPid == null) return { running: false, pid: null, path: lockDir };
  if (isProcessAlive(ownerPid)) return { running: true, pid: ownerPid, path: lockDir };
  return { running: false, pid: null, path: lockDir, stalePid: ownerPid };
}

export async function acquireMeshLauncherLock(options = {}) {
  const pid = Number.isInteger(options.pid) ? options.pid : process.pid;
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const isProcessAlive = typeof options.isProcessAlive === "function" ? options.isProcessAlive : defaultIsProcessAlive;
  const { lockDir, ownerPath } = meshLauncherLockPaths(options);
  const token = randomUUID();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await mkdir(path.dirname(lockDir), { recursive: true });
      await mkdir(lockDir, { recursive: false });
      await writeFile(ownerPath, `${JSON.stringify({ pid, token, createdAt: now() }, null, 2)}\n`, "utf8");
      return {
        acquired: true,
        pid,
        path: lockDir,
        release: async () => {
          await removeLockDirIfOwned(lockDir, token);
        },
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const owner = await readOwner(ownerPath);
      const ownerPid = Number.isInteger(owner?.pid) ? owner.pid : null;
      if (ownerPid != null && isProcessAlive(ownerPid)) {
        return { acquired: false, pid: ownerPid, path: lockDir, release: async () => {} };
      }
      // Another process may have won mkdir and not yet written owner.json. That
      // is a held lock, not a stale one. Never steal this tiny publication gap;
      // a waiting caller will retry. If the would-be owner crashed inside that
      // gap, reclaim only after a bounded grace so the lock cannot wedge forever.
      if (ownerPid == null) {
        const unpublishedGraceMs = Number.isFinite(options.unpublishedGraceMs) ? options.unpublishedGraceMs : 5_000;
        let ageMs = 0;
        // A stat fault here is not nothing: `ageMs` stays 0, which reads as "the gap
        // just opened" and makes the grace below decline to reclaim. That is the SAFE
        // direction (never steal a lock on bad information), and it is also the shape
        // that wedges a lock forever if the fault is persistent — so it is reported
        // rather than swallowed, and the safe fallback is stated as a decision.
        try {
          ageMs = Date.now() - (await stat(lockDir)).mtimeMs;
        } catch (error) {
          reportDegrade("mesh-launcher-lock-age", error, { lockDir });
          ageMs = 0;
        }
        if (ageMs >= unpublishedGraceMs && attempt === 0) {
          if (await removeLockDirIfOwned(lockDir, null)) continue;
        }
        return { acquired: false, pid: null, path: lockDir, release: async () => {} };
      }
      if (attempt === 0) {
        const ownerToken = typeof owner?.token === "string" ? owner.token : null;
        if (await removeLockDirIfOwned(lockDir, ownerToken)) continue;
      }
      return { acquired: false, pid: ownerPid, path: lockDir, release: async () => {} };
    }
  }

  return { acquired: false, pid: null, path: lockDir, release: async () => {} };
}
