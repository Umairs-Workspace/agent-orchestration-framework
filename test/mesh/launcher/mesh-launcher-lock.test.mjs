import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { acquireMeshLauncherLock, meshLauncherLockPaths } from "../../../src/mesh/launcher-lock.mjs";
import { globalMeshPaths } from "../../../src/workspace.mjs";

async function withTempHome(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-launcher-lock-"));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export const meshLauncherLockTests = [
  {
    name: "mesh-launcher-lock/00 a second launcher on the same machine is refused by the global mesh lock",
    run: async () => withTempHome(async (home) => {
      const env = { AOF_GLOBAL_HOME: home };
      const first = await acquireMeshLauncherLock({ env, pid: 111, isProcessAlive: () => true });
      assert.equal(first.acquired, true, "first launcher acquires the global lock");

      const second = await acquireMeshLauncherLock({ env, pid: 222, isProcessAlive: () => true });
      assert.equal(second.acquired, false, "second launcher is refused");
      assert.equal(second.pid, 111, "refusal reports the owning pid");

      const owner = JSON.parse(await readFile(path.join(globalMeshPaths({ env }).meshRoot, "launcher.lock", "owner.json"), "utf8"));
      assert.equal(owner.pid, 111, "owner is persisted under the global mesh home");

      await first.release();
      const afterRelease = await acquireMeshLauncherLock({ env, pid: 333, isProcessAlive: () => true });
      assert.equal(afterRelease.acquired, true, "lock can be acquired after release");
      await afterRelease.release();
    }),
  },
  {
    name: "mesh-launcher-lock/00 a stale launcher lock is reclaimed when its owner pid is dead",
    run: async () => withTempHome(async (home) => {
      const env = { AOF_GLOBAL_HOME: home };
      const first = await acquireMeshLauncherLock({ env, pid: 111, isProcessAlive: () => true });

      const stale = await acquireMeshLauncherLock({ env, pid: 222, isProcessAlive: (pid) => pid !== 111 });
      assert.equal(stale.acquired, true, "dead owner lock is reclaimed");
      assert.equal(stale.pid, 222, "new owner pid is recorded");

      await first.release();
      const third = await acquireMeshLauncherLock({ env, pid: 333, isProcessAlive: () => true });
      assert.equal(third.acquired, false, "a stale handle cannot release the new owner lock");
      assert.equal(third.pid, 222, "the reclaimed owner remains protected");
      await stale.release();
    }),
  },
  {
    name: "mesh-launcher-lock/00 concurrent dead-owner reclaim has one winner, no filesystem fault, and stale releases cannot remove its successor",
    run: async () => withTempHome(async (home) => {
      const env = { AOF_GLOBAL_HOME: home };
      const dead = await acquireMeshLauncherLock({ env, pid: 111, isProcessAlive: () => true });
      const attempts = await Promise.allSettled(
        Array.from({ length: 12 }, (_, index) => acquireMeshLauncherLock({
          env,
          pid: 1_000 + index,
          isProcessAlive: (pid) => pid !== 111,
        })),
      );
      assert.ok(attempts.every((entry) => entry.status === "fulfilled"), "no contender leaks EPERM/ENOENT from stale cleanup");
      const results = attempts.map((entry) => entry.value);
      const winners = results.filter((entry) => entry.acquired);
      assert.equal(winners.length, 1, "atomic reclaim permits exactly one successor acquisition");
      const winner = winners[0];

      await Promise.all(Array.from({ length: 12 }, () => dead.release()));
      const protectedOwner = JSON.parse(await readFile(path.join(globalMeshPaths({ env }).meshRoot, "launcher.lock", "owner.json"), "utf8"));
      assert.equal(protectedOwner.pid, winner.pid, "stale release handles cannot remove or replace the successor lock");

      const blocked = await acquireMeshLauncherLock({ env, pid: 2_000, isProcessAlive: () => true });
      assert.equal(blocked.acquired, false);
      assert.equal(blocked.pid, winner.pid);
      await winner.release();
    }),
  },
  {
    name: "mesh-launcher-lock/00 unpublished owners keep their grace, then concurrent stale recovery has one winner",
    run: async () => withTempHome(async (home) => {
      const env = { AOF_GLOBAL_HOME: home };
      const { lockDir } = meshLauncherLockPaths({ env });
      await mkdir(lockDir, { recursive: true });

      const duringGrace = await acquireMeshLauncherLock({ env, pid: 222, unpublishedGraceMs: 60_000 });
      assert.equal(duringGrace.acquired, false, "an owner between mkdir and owner publication is never stolen during grace");
      assert.equal(duringGrace.pid, null);

      const old = new Date(Date.now() - 120_000);
      await utimes(lockDir, old, old);
      const attempts = await Promise.allSettled(
        Array.from({ length: 8 }, (_, index) => acquireMeshLauncherLock({ env, pid: 3_000 + index, unpublishedGraceMs: 5_000, isProcessAlive: () => true })),
      );
      assert.ok(attempts.every((entry) => entry.status === "fulfilled"));
      const winners = attempts.map((entry) => entry.value).filter((entry) => entry.acquired);
      assert.equal(winners.length, 1);
      await winners[0].release();
    }),
  },
];
