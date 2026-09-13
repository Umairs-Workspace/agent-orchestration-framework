import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";
import {
  GATING_CODES,
  checkActuatorArbitration,
  checkAnchorGrounding,
  checkGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkTimescale,
} from "../../../src/work/loops-checks.mjs";
import { withLoopRegistry } from "../../support/loop-registry-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const loopsDir = path.join(root, "src", "bundle", "loops");
const CHECKS = Object.freeze([
  checkGrounding,
  checkAnchorGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkActuatorArbitration,
  checkTimescale,
]);

const OPTIMIZERS = Object.freeze([
  "loop:build-to-green",
  "loop:review-fix-rereview",
  "loop:autonomous-cascade",
]);

async function shippedFiles() {
  const names = (await readdir(loopsDir)).filter((name) => name.endsWith(".md"));
  assert.ok(names.length > 0, `the sweep of ${loopsDir} found no .md record — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
  const entries = await Promise.all(names.map(async (name) => [name, await readFile(path.join(loopsDir, name), "utf8")]));
  return Object.fromEntries(entries);
}

function byId(model) {
  return new Map(model.nodes.map((node) => [node.id, node]));
}

// Every watcher's measurement pointer set, as raw strings.
function measurementPointers(node) {
  return (node.fields.measurement ?? []).map((entry) => entry.raw);
}

export const archTests = [
  {
    name: "arch/57 FF-5708: every optimizing loop is the endpoint of a watcher's monitoring edge, every watcher watches at least one loop, and the registry loads clean",
    run: async () => {
      const files = await shippedFiles();
      await withLoopRegistry(files, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        // The registry loads with zero error-severity findings.
        const errors = model.findings.filter((f) => f.severity === "error");
        assert.deepEqual(errors, [], "no error-severity findings on the shipped registry");

        const nodes = byId(model);
        const watchers = model.nodes.filter((node) => node.kind === "watcher");
        assert.ok(watchers.length >= OPTIMIZERS.length, `non-vacuous: ${watchers.length} shipped watchers`);

        // Every watcher watches at least one loop, and its endpoints resolve.
        for (const watcher of watchers) {
          const monitoring = watcher.edges.monitoring ?? [];
          assert.ok(monitoring.length >= 1, `${watcher.id}: watches at least one loop`);
          for (const edge of monitoring) {
            assert.equal(edge.resolved, true, `${watcher.id}: monitoring endpoint ${edge.raw} resolves`);
            assert.equal(nodes.get(edge.raw)?.kind, "loop", `${watcher.id}: ${edge.raw} is a loop`);
            // NO self-watch assertion here, and its absence is a finding rather than an omission
            // (F-57-05-2). One stood here and was UNREACHABLE: `nodes.get(edge.raw)?.kind === "loop"`
            // runs first on the same edge, and a watcher's own id always resolves to a node of kind
            // `watcher`. It could not have been reached by any mutation. ADR-001 §7's self-reference
            // rule is still refused, earlier and louder: `watcher` is not in `ENDPOINT_SCHEMES`, so
            // `monitoring: [watcher:…]` is ungrammatical — measured, the loader raises
            // `loop-bad-value` at ERROR severity, which the zero-error leg above already asserts.
          }
        }

        // Every optimizing loop is the endpoint of at least one inbound monitoring edge —
        // the structural condition 57/01's `loop-unpaired-optimizer` reads off the table.
        for (const id of OPTIMIZERS) {
          const loop = nodes.get(id);
          assert.ok(loop, `${id} is shipped`);
          assert.equal(loop.fields.optimizing.value, true, `${id}: optimizing true`);
          const inbound = watchers.filter((w) => (w.edges.monitoring ?? []).some((e) => e.raw === id));
          assert.ok(inbound.length >= 1, `${id}: has an inbound monitoring edge from a watcher`);
        }
      });
    },
  },
  {
    name: "arch/57 FF-5708: the five independence legs hold on the records, so the shipped registry yields zero gating findings on merit",
    run: async () => {
      const files = await shippedFiles();
      await withLoopRegistry(files, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        const nodes = byId(model);
        const watchers = model.nodes.filter((node) => node.kind === "watcher");

        for (const watcher of watchers) {
          // Leg 3 — a watcher has no actuator vocabulary at all (ADR-001 §3).
          assert.equal("actuator" in watcher.fields, false, `${watcher.id}: declares no actuator`);
          // Leg 5 — determinism: counter requires pointer-only measurement (ADR-002 §5).
          assert.equal(watcher.fields.determinism.value, "counter", `${watcher.id}: determinism counter`);
          for (const entry of watcher.fields.measurement ?? []) {
            assert.equal(entry.pointer?.scheme, "command", `${watcher.id}: measurement is a command pointer`);
          }

          for (const edge of watcher.edges.monitoring ?? []) {
            const loop = nodes.get(edge.raw);
            if (!loop) continue;
            // Leg 2 — disjoint measurement: the watcher reads a different artifact.
            const loopMeas = measurementPointers(loop);
            const watcherMeas = measurementPointers(watcher);
            const shared = watcherMeas.filter((p) => loopMeas.includes(p));
            assert.deepEqual(shared, [], `${watcher.id}: measurement is disjoint from ${loop.id}'s`);
            // Leg 4 — counter is a different quantity from the controlled variable.
            const controlled = loop.fields.controlled?.raw ?? "";
            const counter = watcher.fields.counter?.raw ?? "";
            const norm = (s) => s.trim().toLowerCase();
            assert.notEqual(norm(counter), norm(controlled), `${watcher.id}: counter differs from ${loop.id}'s controlled`);
          }
        }

        const gateFindings = CHECKS.flatMap((check) => check(model)).filter((finding) => GATING_CODES.has(finding.code));
        assert.deepEqual(gateFindings, [], "the shipped registry produces zero findings from the frozen gating set");
      });
    },
  },
  {
    name: "arch/57 FF-5708: the shipped registry carries no judge and no arch-failure-count metric",
    run: async () => {
      const files = await shippedFiles();
      await withLoopRegistry(files, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        for (const node of model.nodes) {
          // No shipped watcher is a judge (ADR-002 §6): a judge census that named one would be the
          // maker grading itself, which is the exact failure the pairing exists to refuse.
          if (node.kind === "watcher") {
            assert.equal(node.fields.determinism.value, "counter", `${node.id}: no judge among shipped watchers`);
          }
          // ADR-006 §2 — no record declares an arch-failure count as its metric. A metric that
          // names the count/tally of failing fitness functions is banned; the build loop's
          // "fitness functions green" is the target state (all green), not a count, and is fine.
          for (const field of ["controlled", "counter"]) {
            const value = node.fields[field]?.raw ?? "";
            assert.doesNotMatch(value, /(?:arch.?failure|failing fitness|failed fitness).*(?:count|number|tally)|count.*(?:arch.?failure|failing fitness)/iu, `${node.id}: ${field} is not an arch-failure count`);
          }
        }
      });
    },
  },
];
