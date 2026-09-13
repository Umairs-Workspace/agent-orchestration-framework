import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ADMITTED_KEYS, loadLoops } from "../../src/work/loops.mjs";
import { withLoopRegistry } from "../support/loop-registry-fixture.mjs";
import { withShippedRegistry } from "../support/registry-fixture.mjs";

// SEEDS, not contents — the fixture copies the endpoint-CLOSED set derived from these
// (58/ADR-007 §3a), and the node count below is asserted against that closure.
const originalSeeds = [
  "autonomous-cascade.md",
  "build-to-green.md",
  "mesh-assignment-reclaim.md",
  "operator.md",
  "product-owner.md",
  "retrospective-memory-ingest.md",
  "review-fix-rereview.md",
  "rubric-process-exit.md",
  "run-liveness.md",
  "run-resilience.md",
  "verify-triage-accept.md",
];
const originalFindingCodes = Object.freeze([
  "loop-field-prose-only",
  "loop-owner-unknown",
  "loop-field-prose-only",
  "loop-field-prose-only",
  "loop-field-prose-only",
  "loop-owner-unknown",
  "loop-owner-unknown",
  "loop-field-prose-only",
  "loop-field-prose-only",
  "loop-owner-unknown",
  "loop-field-prose-only",
  "loop-field-prose-only",
  "loop-field-prose-only",
  "loop-owner-unknown",
  "loop-owner-unknown",
  "loop-field-prose-only",
  "loop-field-prose-only",
  "loop-field-prose-only",
]);

function watcher(stem, overrides = {}) {
  const fields = {
    id: `watcher:${stem}`,
    kind: "watcher",
    title: stem,
    counter: "contract changes",
    determinism: "counter",
    measurement: "[module:src/work/loops.mjs#loadLoops]",
    ...overrides,
  };
  return `---\n${Object.entries(fields)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key}: ${value}\n`)
    .join("")}---\n# ${stem}\n`;
}

function loop(stem, extra = "") {
  return `---\nid: loop:${stem}\nkind: loop\ntitle: ${stem}\ncontrolled: scenarios green\nreference: [module:src/work/loops.mjs#loadLoops]\nmeasurement: [module:src/work/loops.mjs#loadLoops]\nactuator: [command:work:continue]\ncadence: event:per-item\nceiling: none\nowner: actor:product-owner\noptimizing: false\n${extra}---\n# ${stem}\n`;
}

function actor(stem) {
  return `---\nid: actor:${stem}\nkind: actor\ntitle: ${stem}\nground: exogenous\n---\n# ${stem}\n`;
}

function anchor(stem) {
  return `---\nid: anchor:${stem}\nkind: anchor\ntitle: ${stem}\nground: process-exit\nobserves: module:src/work/loops.mjs#loadLoops\n---\n# ${stem}\n`;
}

function findingsFor(model, filename) {
  return model.findings.filter((finding) => path.basename(finding.path) === filename);
}

export const watcherNodeTests = [
  {
    name: "watcher-node/00 the fourth kind widens the loader vocabulary additively",
    run: async () => {
      await withLoopRegistry({ "subject.md": watcher("subject") }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings, []);
        assert.equal(model.nodes[0].kind, "watcher");
      });

      await withLoopRegistry({
        "loop.md": loop("loop"),
        "actor.md": actor("actor"),
        "anchor.md": anchor("anchor"),
      }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings, []);
        assert.deepEqual(Object.fromEntries(model.nodes.map((node) => [node.id, node.kind])), {
          "actor:actor": "actor",
          "anchor:anchor": "anchor",
          "loop:loop": "loop",
        });
      });

      await withShippedRegistry(originalSeeds, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.equal(model.nodes.length, fixture.names.length, `the CLOSED set parses whole (seeds ${fixture.seeds.length}, closure added ${JSON.stringify(fixture.added)})`);
        assert.deepEqual(model.findings.map((finding) => finding.code), originalFindingCodes);
      });

      for (const kind of ["observer", "monitor"]) {
        await withLoopRegistry({ "outside.md": watcher("outside", { kind }) }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          const badKind = model.findings.find((finding) => finding.code === "loop-bad-value");
          assert.match(badKind?.message ?? "", /kind/);
          assert.equal(model.nodes.some((node) => node.kind === kind), false);
        });
      }

      for (const [kind, accepted] of [
        ["loop", true],
        ["actor", true],
        ["anchor", true],
        ["watcher", true],
        ["observer", false],
        ["monitor", false],
      ]) {
        const text = kind === "loop"
          ? loop("subject")
          : kind === "actor"
            ? actor("subject")
            : kind === "anchor"
              ? anchor("subject")
              : watcher("subject", { kind });
        await withLoopRegistry({ "subject.md": text }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          assert.equal(model.nodes[0].kind === kind, accepted, kind);
          assert.equal(model.findings.some((finding) => finding.code === "loop-bad-value" && finding.message.includes("kind")), !accepted, kind);
        });
      }
    },
  },
  {
    name: "watcher-node/01 required declarations and the determinism vocabulary have no implicit default",
    run: async () => {
      await withLoopRegistry({ "complete.md": watcher("complete") }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings, []);
        const node = model.nodes[0];
        assert.deepEqual(node.fields.counter, { key: "counter", raw: "contract changes", kind: "phrase" });
        assert.deepEqual(node.fields.determinism, { key: "determinism", raw: "counter", kind: "enum", value: "counter" });
      });

      for (const counter of [
        "module:src/work/loops.mjs#loadLoops",
        "command:work:loops",
        "config:work.autonomous.maxAttempts",
        "prose:docs/counter.md",
        "unknown",
        "none",
        "uncapped",
        "",
      ]) {
        await withLoopRegistry({ "counter.md": watcher("counter", { counter }) }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value"], counter);
          assert.match(model.findings[0].message, /counter/, counter);
          assert.equal("counter" in model.nodes[0].fields, false, counter);
        });
      }

      await withLoopRegistry({ "missing.md": watcher("missing", { determinism: null }) }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-missing-field"]);
        assert.match(model.findings[0].message, /determinism/);
        assert.equal("determinism" in model.nodes[0].fields, false);
      });

      await withLoopRegistry({
        "prose.md": watcher("prose", { determinism: "judge", measurement: "[prose:docs/counter.md]" }),
      }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-field-prose-only"]);
        assert.match(model.findings[0].message, /^measurement is backed only by prose:/);
      });

      for (const field of ["id", "kind", "title", "counter", "determinism", "measurement"]) {
        await withLoopRegistry({ "omitted.md": watcher("omitted", { [field]: null }) }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          const missing = model.findings.filter((finding) => finding.code === "loop-missing-field");
          assert.equal(missing.length, 1, field);
          assert.match(missing[0].message, new RegExp(field), field);
        });
      }

      for (const [value, accepted] of [
        ["counter", true],
        ["judge", true],
        ["deterministic", false],
        ["unknown", false],
        ["true", false],
      ]) {
        await withLoopRegistry({ "value.md": watcher("value", { determinism: value }) }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          assert.equal(model.findings.some((finding) => finding.code === "loop-bad-value" && finding.message.includes("determinism")), !accepted, value);
        });
      }
    },
  },
  {
    name: "watcher-node/02 a watcher cannot declare an actuator or any loop control key",
    run: async () => {
      await withLoopRegistry({
        "subject.md": watcher("subject", { actuator: "[command:work:next]" }),
      }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-key-not-admitted-for-kind"]);
        assert.match(model.findings[0].message, /actuator/);
        assert.equal("actuator" in model.nodes[0].fields, false);
      });

      await withLoopRegistry({ "subject.md": loop("subject") }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.equal(model.findings.some((finding) => finding.message.includes("actuator")), false);
      });
      assert.equal(ADMITTED_KEYS.watcher.has("actuator"), false);

      for (const [key, accepted] of [
        ["counter", true],
        ["measurement", true],
        ["actuator", false],
        ["controlled", false],
        ["ceiling", false],
        ["optimizing", false],
      ]) {
        const value = key === "measurement"
          ? "[module:src/work/loops.mjs#loadLoops]"
          : key === "actuator"
            ? "[command:work:next]"
            : key === "ceiling"
              ? "none"
              : key === "optimizing"
                ? "false"
                : "contract changes";
        await withLoopRegistry({ "key.md": watcher("key", { [key]: value }) }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          const refused = findingsFor(model, "key.md").some((finding) => finding.code === "loop-key-not-admitted-for-kind");
          assert.equal(refused, !accepted, key);
        });
      }
    },
  },
  {
    name: "watcher-node/03 pairing reuses the outbound monitoring edge and no watched-loop key",
    run: async () => {
      await withLoopRegistry({
        "watched.md": loop("watched"),
        "watch.md": watcher("watch", { monitoring: "[loop:watched]" }),
      }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings, []);
        const watch = model.nodes.find((node) => node.id === "watcher:watch");
        const watched = model.nodes.find((node) => node.id === "loop:watched");
        assert.equal(watch.edges.monitoring[0].raw, "loop:watched");
        assert.equal("watcher" in watched.fields, false);
        assert.equal("watcher" in watched.edges, false);
      });

      await withLoopRegistry({
        "loop.md": loop("loop", "watcher: watcher:watch\n").replace("optimizing: false", "optimizing: true"),
      }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-unknown-key"]);
        assert.match(model.findings[0].message, /watcher/);
        assert.equal("watcher" in model.nodes[0].fields, false);
        assert.equal("watcher" in model.nodes[0].edges, false);
      });

      await withLoopRegistry({
        "dangling.md": watcher("dangling", { monitoring: "[loop:missing]" }),
      }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-graph-dangling-endpoint"]);
        assert.match(model.findings[0].message, /loop:missing/);
      });

      await withLoopRegistry({
        "one.md": loop("one"),
        "two.md": loop("two"),
        "watch.md": watcher("watch", { monitoring: "[loop:one, loop:two]" }),
      }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings, []);
        assert.deepEqual(model.nodes.find((node) => node.id === "watcher:watch").edges.monitoring.map((edge) => edge.raw), ["loop:one", "loop:two"]);
      });
    },
  },
];
