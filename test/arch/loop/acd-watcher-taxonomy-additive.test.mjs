import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ADMITTED_KEYS, EDGE_KEYS, NODE_KINDS, loadLoops } from "../../../src/work/loops.mjs";
import { withLoopRegistry } from "../../support/loop-registry-fixture.mjs";
import { withShippedRegistry } from "../../support/registry-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const priorKinds = Object.freeze(["loop", "actor", "anchor"]);
const watcherKeys = Object.freeze([
  "id",
  "kind",
  "title",
  "counter",
  "determinism",
  "measurement",
  "data-feed",
  "target-setting",
  "monitoring",
  "veto",
  "parameter-tuning",
  // 59/ADR-001 §3 — the sixth edge key. 57's claim about the watcher is that its set is its three
  // declarations plus THE EDGE KEYS; the key it must not admit is `actuator`, asserted below.
  "reporting",
]);
// SEEDS, not contents — the fixture copies the endpoint-CLOSED set derived from these
// (58/ADR-007 §3a), and the node count below is asserted against that closure.
const originalSeeds = Object.freeze([
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
]);
const originalFindingSignature = Object.freeze([
  "autonomous-cascade.md:loop-field-prose-only:actuator",
  "autonomous-cascade.md:loop-owner-unknown:owner",
  "build-to-green.md:loop-field-prose-only:reference",
  "build-to-green.md:loop-field-prose-only:measurement",
  "build-to-green.md:loop-field-prose-only:actuator",
  "build-to-green.md:loop-owner-unknown:owner",
  "mesh-assignment-reclaim.md:loop-owner-unknown:owner",
  "retrospective-memory-ingest.md:loop-field-prose-only:reference",
  "retrospective-memory-ingest.md:loop-field-prose-only:measurement",
  "retrospective-memory-ingest.md:loop-owner-unknown:owner",
  "review-fix-rereview.md:loop-field-prose-only:reference",
  "review-fix-rereview.md:loop-field-prose-only:measurement",
  "review-fix-rereview.md:loop-field-prose-only:actuator",
  "review-fix-rereview.md:loop-owner-unknown:owner",
  "run-resilience.md:loop-owner-unknown:owner",
  "verify-triage-accept.md:loop-field-prose-only:reference",
  "verify-triage-accept.md:loop-field-prose-only:measurement",
  "verify-triage-accept.md:loop-field-prose-only:actuator",
]);

function watcher(stem, { determinism = "counter", omit = null } = {}) {
  const fields = [
    ["id", `watcher:${stem}`],
    ["kind", "watcher"],
    ["title", stem],
    ["counter", "contract changes"],
    ["determinism", determinism],
    ["measurement", "[module:src/work/loops.mjs#loadLoops]"],
  ];
  return `---\n${fields.filter(([key]) => key !== omit).map(([key, value]) => `${key}: ${value}\n`).join("")}---\n# ${stem}\n`;
}

function findingKey(message) {
  return ["reference", "measurement", "actuator", "owner"].find((key) => message.startsWith(key)) ?? "?";
}

export const archTests = [
  {
    name: "arch/57 FF-5701: watcher taxonomy widens additively and admits no actuator",
    run: async () => {
      const loaderSource = await readFile(path.join(root, "src", "work", "loops.mjs"), "utf8");
      // `watcher` stays where 57 put it, with 58's `arbiter` and 59's `auditor` appended after it —
      // the ORDER is asserted, so a widening that re-sorted the enum would fail here too.
      assert.deepEqual([...NODE_KINDS], [...priorKinds, "watcher", "arbiter", "auditor"]);
      for (const kind of priorKinds) assert.equal(NODE_KINDS.has(kind), true, kind);
      assert.deepEqual([...ADMITTED_KEYS.watcher].sort(), [...watcherKeys].sort());
      assert.equal(ADMITTED_KEYS.watcher.has("actuator"), false);
      // 59/ADR-001 §3 appends `reporting`, an auditor's outbound report. It is a SIXTH key and not a
      // reuse of `monitoring` precisely so that 57's pairing edge keeps meaning only what it meant:
      // this node computes a counter-metric on that optimizer.
      assert.deepEqual([...EDGE_KEYS], ["data-feed", "target-setting", "monitoring", "veto", "parameter-tuning", "reporting"]);
      assert.equal(ADMITTED_KEYS.watcher.has("counter"), true, "…and the watcher's own counter is untouched by the widening");
      assert.match(loaderSource, /const DETERMINISM_VALUES = frozenSet\("counter", "judge"\);/);

      for (const set of [NODE_KINDS, ADMITTED_KEYS.watcher, EDGE_KEYS]) {
        const before = [...set];
        set.add("not-admitted");
        assert.deepEqual([...set], before);
      }

      await withLoopRegistry({ "phrase.md": watcher("phrase") }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings, []);
        assert.deepEqual(model.nodes[0].fields.counter, {
          key: "counter",
          raw: "contract changes",
          kind: "phrase",
        });
      });

      for (const field of ["id", "kind", "title", "counter", "determinism", "measurement"]) {
        await withLoopRegistry({ "required.md": watcher("required", { omit: field }) }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          const finding = model.findings.find((candidate) => candidate.code === "loop-missing-field");
          assert.match(finding?.message ?? "", new RegExp(field), field);
          if (field === "determinism") assert.equal("determinism" in model.nodes[0].fields, false);
        });
      }

      for (const [determinism, valid] of [
        ["counter", true],
        ["judge", true],
        ["deterministic", false],
        ["unknown", false],
        ["true", false],
        ["false", false],
      ]) {
        await withLoopRegistry({ "value.md": watcher("value", { determinism }) }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          assert.equal(model.findings.some((finding) => finding.code === "loop-bad-value" && finding.message.includes("determinism")), !valid);
        });
      }

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
        await withLoopRegistry({
          "counter.md": watcher("counter").replace("counter: contract changes", `counter: ${counter}`),
        }, async (fixture) => {
          const model = await loadLoops(fixture.workDir);
          assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value"], counter);
          assert.equal("counter" in model.nodes[0].fields, false, counter);
        });
      }

      await withShippedRegistry(originalSeeds, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.equal(model.nodes.length, fixture.names.length, `the CLOSED set parses whole (seeds ${fixture.seeds.length}, closure added ${JSON.stringify(fixture.added)})`);
        assert.deepEqual(model.findings.map((finding) => `${path.basename(finding.path)}:${finding.code}:${findingKey(finding.message)}`), originalFindingSignature);
      });
    },
  },
];
