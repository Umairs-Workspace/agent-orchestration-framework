import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";
import { getCommand } from "../../../src/command-core.mjs";
import { withLoopRegistry } from "../../support/loop-registry-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const loopsDir = path.join(root, "src", "bundle", "loops");

// The three shipped watchers, and the registered command each measurement must resolve to.
const WATCHERS = Object.freeze([
  { file: "build-to-green-watcher.md", id: "watcher:build-to-green-watcher", watches: "loop:build-to-green", counter: "whether the acceptance criteria got smaller", command: "work:ratchet" },
  { file: "review-fix-rereview-watcher.md", id: "watcher:review-fix-rereview-watcher", watches: "loop:review-fix-rereview", counter: "findings raised after the item was accepted", command: "work:counters" },
  { file: "autonomous-cascade-watcher.md", id: "watcher:autonomous-cascade-watcher", watches: "loop:autonomous-cascade", counter: "how often a run needed a retry or a hand", command: "work:counters" },
]);

async function shippedFiles() {
  const names = (await readdir(loopsDir)).filter((name) => name.endsWith(".md"));
  assert.ok(names.length > 0, `the sweep of ${loopsDir} found no .md record — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
  const entries = await Promise.all(names.map(async (name) => [name, await readFile(path.join(loopsDir, name), "utf8")]));
  return Object.fromEntries(entries);
}

function watchersOf(model) {
  return model.nodes.filter((node) => node.kind === "watcher");
}

export const archTests = [
  {
    name: "arch/57 FF-5707: every shipped watcher's counter resolves to a registered command",
    run: async () => {
      const files = await shippedFiles();
      await withLoopRegistry(files, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        const watchers = watchersOf(model);
        // Non-vacuity: the three shipped watchers are present.
        assert.equal(watchers.length, 3, `expected the three shipped watchers, found ${watchers.length}`);
        assert.deepEqual(watchers.map((w) => w.id).sort(), WATCHERS.map((w) => w.id).sort());

        for (const watcher of watchers) {
          const spec = WATCHERS.find((w) => w.id === watcher.id);
          assert.ok(spec, `${watcher.id} is not one of the shipped watchers`);
          // The counter is a scalar phrase, never a pointer.
          assert.equal(watcher.fields.counter.kind, "phrase", `${watcher.id}: counter is a phrase`);
          assert.equal(watcher.fields.counter.raw, spec.counter, `${watcher.id}: counter names the reviewable metric`);
          // determinism: counter — a machine produces the number.
          assert.equal(watcher.fields.determinism.value, "counter", `${watcher.id}: determinism is counter`);
          // measurement is pointer-only (ADR-002 §5): no prose while determinism: counter.
          const measurement = watcher.fields.measurement ?? [];
          assert.ok(measurement.length > 0, `${watcher.id}: measurement is non-empty`);
          for (const entry of measurement) {
            assert.equal(entry.kind, "pointer", `${watcher.id}: measurement entry ${entry.raw} is a pointer, not prose`);
            const pointer = entry.pointer;
            assert.notEqual(pointer.scheme, "prose", `${watcher.id}: no prose pointer while determinism is counter`);
            assert.equal(pointer.scheme, "command", `${watcher.id}: measurement resolves through a registered command`);
            const command = getCommand(pointer.operand);
            assert.ok(command, `${watcher.id}: command:${pointer.operand} names no registered command`);
            assert.equal(command.id, pointer.operand, `${watcher.id}: the resolved command's id matches`);
          }
          // Each watcher's measurement names exactly the frozen command (ADR-007 §3).
          assert.equal(measurement.length, 1, `${watcher.id}: one measurement pointer`);
          assert.equal(measurement[0].pointer.operand, spec.command, `${watcher.id}: measurement names ${spec.command}`);
          // The watcher watches its loop through the outbound monitoring edge.
          const monitoring = watcher.edges.monitoring ?? [];
          assert.deepEqual(monitoring.map((e) => e.raw), [spec.watches], `${watcher.id}: monitoring edge names ${spec.watches}`);
        }
      });
    },
  },
];
