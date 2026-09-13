import { makeLoopReadyRepo } from "./loop-ready-fixture.mjs";
import { actorRecord, loopRecord } from "./loop-registry-fixture.mjs";

export function cleanL3Gate(overrides = {}) {
  return {
    loopReady: {
      score: 100,
      clears: "L3",
      blocking: [],
      checks: [],
      ...(overrides.loopReady ?? {}),
    },
    groundedness: {
      present: true,
      state: "reported",
      components: [],
      authorities: [],
      error: null,
      ...(overrides.groundedness ?? {}),
    },
  };
}

export async function makeQualifiedL3Repo() {
  return await makeLoopReadyRepo({
    config: {
      work: { autonomous: { maxAttempts: 3 } },
      memory: { backend: "local" },
    },
    loops: {
      "product-owner.md": actorRecord({
        id: "actor:product-owner",
        fields: { ground: null, "target-setting": "[loop:sample]" },
      }),
      // 58/ADR-002 §1 + ADR-005 §1 — a loop that declares no `layer:` is an ERROR-severity
      // `loop-layer-undeclared` from milestone 58/02 on, which drops this repo's loop-ready SCORE
      // below the L3 gate and makes a fixture named "qualified" no longer qualify. The layer is the
      // MANAGEMENT one because `loopRecord()`'s default `cadence: event:per-item` carries that
      // scope rank; any other value would trade the undeclared error for a contradicts-cadence one.
      "sample.md": loopRecord({ fields: { layer: "management" } }),
      "gate.md": `---
id: anchor:gate
kind: anchor
title: Gate
ground: frozen-rule
observes: command:work:loops-validate
data-feed: [loop:sample, actor:product-owner]
---
# Gate
`,
    },
  });
}
