import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadBundle } from "../../src/work/bundle.mjs";
import { loadLoops } from "../../src/work/loops.mjs";
import { getCommand } from "../../src/command-core.mjs";
import { updateWork, workLockPath } from "../../src/work/update.mjs";
import { synthesizeBundleConfig } from "../../src/work/bundle-synthesis.mjs";
import { planApplyActions, executeApplyActions, createLockManifest } from "../../src/render-plan.mjs";
import { writeLock } from "../../src/lock.mjs";
import { withLoopRegistry } from "../support/loop-registry-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const loopsDir = path.join(root, "src", "bundle", "loops");

const WATCHERS = Object.freeze([
  { file: "build-to-green-watcher.md", id: "watcher:build-to-green-watcher", watches: "loop:build-to-green", counter: "whether the acceptance criteria got smaller", command: "work:ratchet" },
  { file: "review-fix-rereview-watcher.md", id: "watcher:review-fix-rereview-watcher", watches: "loop:review-fix-rereview", counter: "findings raised after the item was accepted", command: "work:counters" },
  { file: "autonomous-cascade-watcher.md", id: "watcher:autonomous-cascade-watcher", watches: "loop:autonomous-cascade", counter: "how often a run needed a retry or a hand", command: "work:counters" },
]);

const fwd = (p) => String(p).replaceAll("\\", "/");

async function shippedFiles() {
  const { readdir } = await import("node:fs/promises");
  const names = (await readdir(loopsDir)).filter((name) => name.endsWith(".md"));
  assert.ok(names.length > 0, `the sweep of ${loopsDir} found no .md record — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
  const entries = await Promise.all(names.map(async (name) => [name, await readFile(path.join(loopsDir, name), "utf8")]));
  return Object.fromEntries(entries);
}

// The install-manifest builder `work update`'s own tests use (work-update.test.mjs): install the
// shipped bundle into a temp repo exactly as init does, then run update against it.
async function installBase(repo, bundle, runtimes = ["claude", "codex"], version = "0.0.0") {
  const { desiredOutputs } = await synthesizeBundleConfig(bundle, { runtimes, targetDir: repo });
  const actions = await planApplyActions(desiredOutputs, null, { force: false, targetDir: repo });
  await executeApplyActions(actions);
  const base = createLockManifest({ actions, desiredOutputs, previousLock: null, config: { packages: [] }, runtimes });
  const work = {
    generatedAt: base.generatedAt,
    bundle: { version },
    runtimes,
    files: base.files.map((entry) => ({ ...entry, path: fwd(entry.path) })),
    packages: base.packages,
    frameworks: base.frameworks,
    frameworkInstallAttempts: base.frameworkInstallAttempts,
  };
  await writeLock(workLockPath(repo), { work });
}

export const pairingTableTests = [
  {
    name: "pairing-table/00 the three watcher records ship with the bundle and install by the ordinary update path",
    run: async () => {
      const bundle = loadBundle();
      const loopAssets = bundle.assets.filter((a) => a.kind === "asset" && String(a.file).startsWith("loops/"));
      for (const spec of WATCHERS) {
        const member = loopAssets.find((a) => String(a.file) === `loops/${spec.file}`);
        assert.ok(member, `${spec.file} is a shipped bundle asset`);
        assert.equal(member.target, `.aof/loops/${spec.file}`, `${spec.file} installs into the loop registry`);
        assert.deepEqual([...member.runtimes].sort(), ["claude", "codex"], `${spec.file} installs for both runtimes`);
      }

      // The three install by the same path as the eleven: a real update into a temp repo.
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-pairing-"));
      try {
        await installBase(repo, bundle);
        const onDisk = await import("node:fs/promises").then((f) => f.readdir(path.join(repo, ".aof", "loops")));
        for (const spec of WATCHERS) {
          assert.ok(onDisk.includes(spec.file), `${spec.file} is installed by aof work update`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "pairing-table/00 each watcher is framework-owned and an operator edit is not silently overwritten",
    run: async () => {
      for (const spec of WATCHERS) {
        const text = await readFile(path.join(loopsDir, spec.file), "utf8");
        assert.match(text, /^# aof-generated: true\b/mu, `${spec.file} declares itself framework-owned`);
        assert.match(text, /installed by `aof work update`/, `${spec.file} names the update path`);
        assert.match(text, /edit it in aof, not here/, `${spec.file} names the framework edit boundary`);
      }

      // The update-path protection is the engine's drift detection: a locally-edited managed file
      // is classified `drift-warning` and preserved, never overwritten without --force (ADR-005).
      const bundle = loadBundle();
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-pairing-"));
      try {
        await installBase(repo, bundle);
        const target = path.join(repo, ".aof", "loops", WATCHERS[0].file);
        await writeFile(target, await readFile(target, "utf8") + "\n// operator note\n", "utf8");
        const result = await updateWork({ targetDir: repo, bundleOverride: bundle, bundleVersionOverride: "0.0.1" });
        const entry = result.actions.find((a) => fwd(a.path) === `.aof/loops/${WATCHERS[0].file}`);
        assert.equal(entry?.action, "drift-warning", "an operator-edited watcher is preserved, not overwritten");
        const after = await readFile(target, "utf8");
        assert.match(after, /operator note/, "the operator's edit survives");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "pairing-table/00 each watcher declares the loop it watches, deterministic counting, and a resolving counter",
    run: async () => {
      const files = await shippedFiles();
      await withLoopRegistry(files, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        for (const spec of WATCHERS) {
          const watcher = model.nodes.find((node) => node.id === spec.id);
          assert.ok(watcher, `${spec.id} is present`);
          assert.deepEqual((watcher.edges.monitoring ?? []).map((e) => e.raw), [spec.watches], `${spec.id} watches ${spec.watches}`);
          assert.equal(watcher.fields.determinism.value, "counter", `${spec.id} declares deterministic counting`);
          assert.equal(watcher.fields.counter.raw, spec.counter, `${spec.id} counts the reviewable metric`);
          const measurement = watcher.fields.measurement ?? [];
          assert.equal(measurement.length, 1, `${spec.id} has one measurement pointer`);
          assert.equal(measurement[0].pointer.operand, spec.command, `${spec.id} names a registered command`);
          assert.ok(getCommand(spec.command), `${spec.command} is a registered command`);
        }
      });
    },
  },
  {
    name: "pairing-table/01 the shipped registry's independence legs hold on the records",
    run: async () => {
      const files = await shippedFiles();
      await withLoopRegistry(files, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        const byId = new Map(model.nodes.map((n) => [n.id, n]));
        const watchers = model.nodes.filter((n) => n.kind === "watcher");
        assert.equal(watchers.length, 3, "three shipped watchers");

        for (const watcher of watchers) {
          // No shared actuator: a watcher has no actuator vocabulary at all.
          assert.equal("actuator" in watcher.fields, false, `${watcher.id}: no shared actuator`);
          // No judge: every shipped watcher is a deterministic counter.
          assert.equal(watcher.fields.determinism.value, "counter", `${watcher.id}: not a judge`);
          // No not-deterministic: pointer-only measurement while determinism is counter.
          for (const entry of watcher.fields.measurement ?? []) {
            assert.equal(entry.pointer.scheme, "command", `${watcher.id}: pointer-only measurement`);
          }
          for (const edge of watcher.edges.monitoring ?? []) {
            const loop = byId.get(edge.raw);
            assert.ok(loop, `${watcher.id}: endpoint ${edge.raw} resolves`);
            // No shared measurement.
            const loopMeas = (loop.fields.measurement ?? []).map((e) => e.raw);
            const shared = (watcher.fields.measurement ?? []).map((e) => e.raw).filter((p) => loopMeas.includes(p));
            assert.deepEqual(shared, [], `${watcher.id}: measurement disjoint from ${loop.id}`);
            // Counter is a different quantity from controlled.
            const norm = (s) => s.trim().toLowerCase();
            assert.notEqual(norm(watcher.fields.counter.raw), norm(loop.fields.controlled.raw), `${watcher.id}: counter != controlled`);
            // No arch-failure count as a metric.
            assert.doesNotMatch(watcher.fields.counter.raw, /(?:arch.?failure|failing fitness|failed fitness).*(?:count|number|tally)|count.*(?:arch.?failure|failing fitness)/i, `${watcher.id}: counter is not an arch-failure count`);
          }
        }
      });
    },
  },
  {
    name: "pairing-table/01 the inherited registry findings are still only warnings, and the shipped table adds no error",
    run: async () => {
      const files = await shippedFiles();
      await withLoopRegistry(files, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        const errors = model.findings.filter((f) => f.severity === "error");
        assert.deepEqual(errors, [], "the shipped registry loads with zero error-severity findings");
        // The warns that were there before (owner-unknown, prose-only measurement) remain warns.
        const warns = model.findings.filter((f) => f.severity === "warn");
        assert.ok(warns.length > 0, "the inherited honesty findings are still present");
        assert.ok(warns.every((f) => f.severity === "warn"), "every inherited finding is still only a warning");
      });
    },
  },
];
