// Fitness function: acd-run-phase-single-authority (milestone 68 / story 00 /
// 68/ADR-002 / FF-6802) — "One phase authority."
//
//   "No `phase` key exists on the run record or on `spend`; every phase reader in
//    src/**/*.mjs resolves it from `brief.loop.phase`."
//
// Milestone 53 is done and its loop declaration already carries `phase` on
// `brief.loop`. 68 mints no rival: `spend` (68/ADR-001) carries no `phase` key, and
// the run record proper never gains one. A run not minted by the loop shell has no
// phase and reports null rather than being guessed.
import assert from "node:assert/strict";
import { readdir, readFile, mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = path.join(root, "src");

async function modulesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modulesUnder(target));
    else if (entry.name.endsWith(".mjs")) out.push(target);
  }
  return out;
}

async function makeItem() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-phase-"));
  const dir = path.join(repo, "wiki", "work", "68_milestone_loop-telemetry");
  await mkdir(dir, { recursive: true });
  return { repo, item: { ref: "68", dir } };
}

export const archTests = [
  {
    name: "arch/68 FF-6802 (acd-run-phase-single-authority): the run record and the spend envelope carry no `phase` key — the one authority is brief.loop.phase",
    run: async () => {
      const { repo, item } = await makeItem();
      try {
        const store = await import("../../../src/run-store.mjs");
        // The spend envelope's declared set has no phase.
        assert.ok(!store.SPEND_ENVELOPE_KEYS.includes("phase"), "the spend envelope declares no phase key");
        // A minted run record (in memory and on disk) has no phase key.
        const record = await store.startRun(item, {
          now: "2026-08-20T10:00:00.000Z",
          brief: { loop: { loopRunId: "loop-1", scope: "68", level: 1, cap: null, phase: "build", cycle: 1, startedAt: "2026-08-20T10:00:00.000Z" } },
        });
        assert.ok(!("phase" in record), "the run record carries no top-level phase key");
        assert.equal(record.brief.loop.phase, "build", "the phase is resolved from brief.loop.phase");
        const onDisk = JSON.parse(await readFile(path.join(item.dir, "runs", `${record.runId}.json`), "utf8"));
        assert.ok(!("phase" in onDisk), "the on-disk record carries no phase key");
        assert.equal(onDisk.brief.loop.phase, "build", "the on-disk brief.loop.phase is the single authority");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/68 FF-6802 (acd-run-phase-single-authority): no module in src reads a `phase` key off a run record or its spend envelope directly",
    run: async () => {
      const modules = await modulesUnder(SRC);
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const offenders = [];
      for (const file of modules) {
        const code = (await readFile(file, "utf8")).replace(/\r\n/gu, "\n");
        // A reader that pulls `.phase` off a run-record-shaped object or its spend
        // envelope directly would break the single-authority rule. Legit readers
        // go through brief.loop.phase.
        if (/\.(?:spend\??\.phase|record\??\.phase|run\??\.phase)\b/.test(code)) {
          offenders.push(path.relative(root, file));
        }
      }
      assert.deepEqual(offenders, [], `no module reads phase off the run record or spend directly — authority is brief.loop.phase (offenders: ${offenders.join("; ")})`);
    },
  },
];
