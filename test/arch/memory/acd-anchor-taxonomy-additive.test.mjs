import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { ADMITTED_KEYS, GROUND_VALUES, NODE_KINDS, loadLoops } from "../../../src/work/loops.mjs";
import { withShippedRegistry } from "../../support/registry-fixture.mjs";

// The records milestone 52 shipped — the SEED of this fixture, not its contents. What is copied
// is the endpoint-CLOSED set the helper derives from these (58/ADR-007 §3a): a subset that names
// `operator.md` while omitting the record its `target-setting` edge resolves to would report a
// dangling endpoint from a widening that broke nothing, and this suite would read that as a
// back-compatibility failure. The count below is asserted against the closed set the helper
// returns, never against this literal.
const originalSeeds = [
  "autonomous-cascade.md", "build-to-green.md", "mesh-assignment-reclaim.md", "operator.md",
  "product-owner.md", "retrospective-memory-ingest.md", "review-fix-rereview.md",
  "run-resilience.md", "verify-triage-accept.md",
];

const sorted = (values) => [...values].sort();

export const archTests = [
  {
    name: "arch/55 FF-5501: taxonomy widens additively while the host remains kind-scoped",
    run: () => {
      // The claim is ADDITIVITY, so the literal is restated whole at each widening rather than
      // loosened to a membership test: 57 appended `watcher`, 58 `arbiter`, and 59/ADR-001 §1
      // `auditor`. A member silently DROPPED still fails here, which a `has()` sweep would not see.
      assert.deepEqual([...NODE_KINDS], ["loop", "actor", "anchor", "watcher", "arbiter", "auditor"]);
      assert.deepEqual([...GROUND_VALUES], ["process-exit", "build-stamp", "landed-commit", "live-soak", "frozen-rule", "exogenous"]);
      // 59/ADR-005 §2 adds `checked:` — on the anchor ALONE, and optional; 59/ADR-001 §3 adds the
      // `reporting` edge to every kind's edge set. 55's own two rules are untouched below: the host
      // of `ground:` did not widen, and `observes:` is still the anchor's alone.
      assert.deepEqual(sorted(ADMITTED_KEYS.anchor), sorted(["id", "kind", "title", "ground", "observes", "checked", "data-feed", "target-setting", "monitoring", "veto", "parameter-tuning", "reporting"]));
      assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has("checked")), ["anchor"],
        "`checked:` is admitted on the anchor and on no other kind — 59/ADR-005 §2");
      assert.equal(ADMITTED_KEYS.loop.has("ground"), false);
      assert.equal(ADMITTED_KEYS.loop.has("observes"), false);
      assert.equal(ADMITTED_KEYS.actor.has("ground"), true);
      assert.equal(ADMITTED_KEYS.actor.has("observes"), false);
      for (const value of [NODE_KINDS, GROUND_VALUES, ADMITTED_KEYS.anchor]) {
        const before = [...value];
        value.add("not-admitted");
        assert.deepEqual([...value], before);
      }
    },
  },
  {
    name: "arch/55 FF-5501: every milestone-52 record still parses without a new error",
    run: async () => {
      await withShippedRegistry(originalSeeds, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.equal(model.nodes.length, fixture.names.length, `the CLOSED set parses whole (seeds ${fixture.seeds.length}, closure added ${JSON.stringify(fixture.added)})`);
        assert.deepEqual(model.findings.filter((finding) => finding.severity === "error"), []);
        assert.ok(model.nodes.some((node) => node.id === "actor:operator" && node.fields.ground.value === "exogenous"));
      });
    },
  },
  {
    name: "arch/55 FF-5501: an anchor requires a typed class and a non-prose pointer",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-anchor-contract-"));
      try {
        const loops = path.join(temp, "loops");
        await mkdir(loops);
        await writeFile(path.join(loops, "good.md"), "---\nid: anchor:good\nkind: anchor\ntitle: Good\nground: build-stamp\nobserves: module:src/build-info.mjs#readBuildInfo\n---\n# Good\n");
        await writeFile(path.join(loops, "prose.md"), "---\nid: anchor:prose\nkind: anchor\ntitle: Prose\nground: process-exit\nobserves: prose:docs/evidence.md\n---\n# Prose\n");
        await writeFile(path.join(loops, "loop.md"), "---\nid: loop:loop\nkind: loop\ntitle: Loop\ncontrolled: state\nreference: [module:src/run-store.mjs#isRetryable]\nmeasurement: [module:src/run-store.mjs#retryReadiness]\nactuator: [command:work:next]\ncadence: event:per-item\nceiling: none\nowner: actor:product-owner\noptimizing: false\nground: process-exit\n---\n# Loop\n");
        const model = await loadLoops(temp);
        const good = model.nodes.find((node) => node.id === "anchor:good");
        assert.equal(good.fields.ground.kind, "enum");
        assert.equal(good.fields.observes.kind, "pointer");
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value", "loop-key-not-admitted-for-kind"]);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
];
