import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CADENCE_KINDS, EVENT_TRIGGERS } from "../../../src/work/loops.mjs";
import { LOOP_BOUND_CONFIG_KEYS, resolvesLoopBoundConfigKey } from "../../../src/loop-bounds.mjs";
import { MIN_SEPARATION_RATIO, checkReferenceOwnership, checkTimescale } from "../../../src/work/loops-checks.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const checksPath = path.join(root, "src/work/loops-checks.mjs");
const loaderPath = path.join(root, "src/work/loops.mjs");
const endpoint = (raw, resolved = true) => ({ raw, scheme: "loop", operand: raw.slice(5), resolved });
function loop(id, cadence, edges = {}, layer = null) {
  const fields = { cadence };
  // 58/ADR-002 §2 — the RANK is what a comparison is handed. It rides on the parsed field exactly
  // as `ms` rides on a periodic cadence, and the ordering that produced it lives in the loader.
  if (layer) fields.layer = { key: "layer", raw: layer, kind: "enum", value: layer, rank: LAYER_RANK[layer] };
  return { id, kind: "loop", title: id, path: path.join(root, `${id}.md`), fields, edges };
}
function pair(sourceCadence, targetCadence, edge = "target-setting") {
  return { source: path.join(root, "loops"), nodes: [loop("loop:a", sourceCadence, { [edge]: [endpoint("loop:b")] }), loop("loop:b", targetCadence)] };
}
function layeredPair(sourceCadence, sourceLayer, targetCadence, targetLayer, edge = "target-setting") {
  return {
    source: path.join(root, "loops"),
    nodes: [loop("loop:a", sourceCadence, { [edge]: [endpoint("loop:b")] }, sourceLayer), loop("loop:b", targetCadence, {}, targetLayer)],
  };
}
const periodic = (ms) => ({ kind: "periodic", ms, raw: `periodic:${ms}ms` });
const event = (trigger) => ({ kind: "event", trigger, raw: `event:${trigger}` });
// The three layer literals and their ranks are the LOADER's, read out of its source below rather
// than restated here — this constant is only the arithmetic the loader's map performs.
const LAYER_RANK = Object.freeze({ operational: 0, management: 1, governance: 2 });

/** The string literals a `frozenSet(...)` line declares, read from the module that owns them. */
function frozenSetLiterals(source, name) {
  const line = new RegExp(`^const ${name} = frozenSet\\(([^)]*)\\);`, "mu").exec(source);
  assert.ok(line, `${name} is declared as a frozen set in the loader`);
  return [...line[1].matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
}

export const archTests = [
  {
    name: "arch/52 FF-5206: the closed cadence cross-product compares only periodic loop-to-loop target-setting pairs",
    run: () => {
      assert.deepEqual([...CADENCE_KINDS].sort(), ["event:", "periodic:", "unknown"].sort());
      const cadences = [periodic(10_000), ...[...EVENT_TRIGGERS].map(event), { kind: "unknown", raw: "unknown" }];
      let compared = 0;
      for (const left of cadences) for (const right of cadences) {
        const findings = checkTimescale(pair(left, right)); compared += 1;
        if (left.kind === "periodic" && right.kind === "periodic") {
          // 58/ADR-005 §1 promotes `loop-timescale-inversion` to `error`: a supervisor no slower
          // than what it supervises is 58's own subject, inherited from 52. The VERDICT this
          // cross-product freezes — which pairs are inversions and which are not comparable — is
          // untouched, which is the additivity claim; only the severity of one code moved, and
          // that decision has its own control in `acd-loop-finding-envelope`.
          assert.deepEqual(findings.map((f) => [f.code, f.severity]), [["loop-timescale-inversion", "error"]]);
        } else {
          assert.deepEqual(findings.map((f) => [f.code, f.severity]), [["loop-timescale-not-comparable", "warn"]]);
          const message = findings[0].message;
          if (left.kind !== "periodic") assert.ok(message.includes(`loop:a (${left.raw})`), `source non-clock side is named: ${message}`);
          if (right.kind !== "periodic") assert.ok(message.includes(`loop:b (${right.raw})`), `target non-clock side is named: ${message}`);
          if (left.kind === "periodic") assert.equal(message.includes(`loop:a (${left.raw})`), false, "clock source is not mislabelled non-clock");
          if (right.kind === "periodic") assert.equal(message.includes(`loop:b (${right.raw})`), false, "clock target is not mislabelled non-clock");
        }
      }
      assert.equal(compared, 36);
      assert.deepEqual(checkTimescale(pair(periodic(45_000), periodic(15_000))), []);
      assert.deepEqual(checkTimescale(pair(periodic(1_000), periodic(60_000))).map((f) => f.code), ["loop-timescale-inversion"]);
      assert.deepEqual(checkTimescale(pair(periodic(10_000), periodic(5_000), "data-feed")), []);
    },
  },
  {
    name: "arch/52 FF-5206: actor, dangling, extra-registry and self edges stay outside the timescale domain",
    run: async () => {
      const self = loop("loop:a", periodic(1_000), { "target-setting": [endpoint("loop:a")] });
      assert.deepEqual(checkTimescale({ source: root, nodes: [self] }), []);
      const actor = { id: "actor:a", kind: "actor", path: path.join(root, "actor.md"), fields: {}, edges: { "target-setting": [endpoint("loop:b")] } };
      assert.deepEqual(checkTimescale({ source: root, nodes: [actor, loop("loop:b", periodic(1_000))] }), []);
      const actorTarget = loop("loop:a", periodic(1_000), { "target-setting": [endpoint("actor:b")] });
      const targetActor = { id: "actor:b", kind: "actor", path: path.join(root, "actor-target.md"), fields: {}, edges: {} };
      assert.deepEqual(checkTimescale({ source: root, nodes: [actorTarget, targetActor] }), []);
      const dangling = loop("loop:a", periodic(1_000), { "target-setting": [endpoint("loop:missing", false)] });
      assert.deepEqual(checkTimescale({ source: root, nodes: [dangling] }), []);
      for (const raw of ["command:work:next", "config:work.dir", "module:src/work.mjs#findWork"]) {
        // The scheme is the text before the FIRST colon — taken with a bounded `split`, not a
        // slice keyed on a second `indexOf` sentinel (m47 / F-47-04-ARCH-2's ratchet in
        // `acd-test-suite-registration`, which this gate is not ledgered for and needs no
        // permission from). `command:work:next` keeps its multi-colon operand either way.
        const scheme = raw.split(":", 1)[0];
        const external = loop("loop:a", periodic(1_000), {
          "target-setting": [{ raw, scheme, operand: raw.slice(raw.indexOf(":") + 1), resolved: null }],
        });
        assert.deepEqual(checkTimescale({ source: root, nodes: [external] }), [], `${scheme} endpoint is outside the loop timescale domain`);
      }
      const source = stripComments(await readFile(path.join(root, "src/work/loops-checks.mjs"), "utf8"));
      for (const trigger of EVENT_TRIGGERS) assert.equal(source.includes(trigger), false, `${trigger} has no duration mapping in checks`);
    },
  },
  {
    // 58/FF-5802 — EXTENDING 52's guard rather than adding a sibling beside it, so the old
    // behaviour and the new one are asserted by one authority. Four legs, and the first is the one
    // that makes the rest durable: the layer axis is ADDITIVE, so with no layer declared the check
    // answers exactly what it answered before, and the axis that decides where the clocks cannot
    // never invents a duration to do it.
    name: "arch/58 FF-5802: the layer axis is additive over the frozen cadence axis, decides only where both ends declare one, and derives no duration",
    run: async () => {
      // (a) THE LANE RULE (ADR-002 §1a). Every finding this check emits is anchored to a
      // target-setting EDGE; it emits no per-node finding at all. A lone loop — layered,
      // unlayered, clocked, event-cadenced — is silent, while the per-node census that DOES
      // report it lives in the other lane, over the same model.
      const cadences = [periodic(15_000), ...[...EVENT_TRIGGERS].map(event), { kind: "unknown", raw: "unknown" }];
      let lone = 0;
      for (const cadence of cadences) {
        for (const layer of [null, "operational", "management", "governance"]) {
          const model = { source: path.join(root, "loops"), nodes: [loop("loop:a", cadence, {}, layer)] };
          assert.deepEqual(checkTimescale(model), [], "a loop with no target-setting edge is outside the timescale domain");
          lone += 1;
          if (layer === null) {
            assert.deepEqual(
              checkReferenceOwnership(model).map((f) => f.code).filter((code) => code.startsWith("loop-layer")),
              ["loop-layer-undeclared"],
              "…and the per-node census that DOES report it is the other lane's, over the same model",
            );
          }
        }
      }
      assert.equal(lone, 24, "the per-node sweep is non-vacuous across every cadence kind and every layer state");
      for (const edge of ["data-feed", "monitoring", "veto", "parameter-tuning"]) {
        assert.deepEqual(checkTimescale(layeredPair(event("per-phase"), "operational", event("per-phase"), "operational", edge)), [],
          `${edge}: a same-layer pair joined by any other edge key is outside the rule`);
      }

      // (b) ADDITIVITY, measured against the frozen cross-product. With no layer declared the 36
      // pairs, the ratio-3 boundary and the non-target-setting case are byte-identical to the
      // outputs the first gate in this file freezes; declaring a layer on ONE end changes nothing,
      // because a crossing cannot be measured against a rank that was never declared (§5).
      let compared = 0;
      for (const left of cadences) {
        for (const right of cadences) {
          const bare = checkTimescale(pair(left, right));
          for (const [sourceLayer, targetLayer] of [["management", null], [null, "operational"]]) {
            assert.deepEqual(
              checkTimescale(layeredPair(left, sourceLayer, right, targetLayer)), bare,
              "exactly one declared layer leaves the cadence verdict identical",
            );
          }
          compared += 1;
        }
      }
      assert.equal(compared, 36, "the additivity claim is made over the whole closed cross-product");
      assert.deepEqual(checkTimescale(layeredPair(periodic(45_000), "management", periodic(15_000), null)), [], "the ratio-3 boundary is unmoved by a half-declared layer");

      // (c) THE ORDINAL DECIDES WHERE THE CLOCKS CANNOT, AND NEVER BECOMES A DURATION. Both ends
      // layered: the layer answers, whatever the clocks can or cannot say — so an event-cadenced
      // pair yields no not-comparable, and no message states a ratio.
      const eventPair = layeredPair(event("per-item"), "management", event("per-phase"), "operational");
      assert.deepEqual(checkTimescale(eventPair), [], "a layered supervising pair with no clock at either end is decided, not deferred");
      const inverted = checkTimescale(layeredPair(event("per-phase"), "operational", event("per-phase"), "operational"));
      assert.deepEqual(inverted.map((f) => f.code), ["loop-layer-inversion"], "a same-layer event pair is an inversion on the ordinal axis alone");
      assert.equal(inverted[0].message.includes("period ratio"), false, "and no ratio is computed for it");
      const both = checkTimescale(layeredPair(periodic(30_000), "operational", periodic(15_000), "operational"));
      assert.deepEqual(both.map((f) => f.code).sort(), ["loop-layer-inversion", "loop-timescale-inversion"], "an edge inverted on both axes is reported once on each");
      assert.equal(new Set(both.map((f) => f.message)).size, 2, "…and neither finding restates the other");

      // (d) ONE HOME FOR THE ORDERING, AND ONE LITERAL FOR THE RATIO. The two maps exist only in
      // the loader; the checks module spells no trigger token and no layer literal, so it cannot
      // convert either into anything; and the separation ratio is an exported literal 3 that no
      // config key resolves.
      const checksSource = stripComments(await readFile(checksPath, "utf8"));
      const loaderSource = stripComments(await readFile(loaderPath, "utf8"));
      const layerValues = frozenSetLiterals(loaderSource, "LAYER_VALUES");
      assert.equal(layerValues.length, 3, "the loader declares exactly three layer literals");
      assert.deepEqual([...layerValues].sort(), Object.keys(LAYER_RANK).sort(), "…and they are the three this gate ranks");
      for (const value of layerValues) assert.equal(checksSource.includes(value), false, `${value}: no layer literal is spelled in the checks`);
      for (const map of ["LAYER_RANKS", "SCOPE_RANKS"]) {
        assert.ok(loaderSource.includes(`const ${map} = `), `${map} is declared in the loader`);
        assert.equal(checksSource.includes(map), false, `${map}: the ordering has one home and it is not the checks`);
      }
      assert.equal(MIN_SEPARATION_RATIO, 3, "the separation ratio does not move");
      assert.match(checksSource, /export const MIN_SEPARATION_RATIO = 3;/u, "…and it is a frozen literal, exported so this gate reads the number rather than a digit");
      assert.match(checksSource, /ratio < MIN_SEPARATION_RATIO/u, "the comparison reads the exported literal");
      assert.equal(resolvesLoopBoundConfigKey("work.loop.separationRatio"), false, "no config key resolves the separation ratio");
      for (const key of LOOP_BOUND_CONFIG_KEYS) {
        assert.equal(/separation|ratio|layer/iu.test(key), false, `${key}: the loop-bound vocabulary carries no separation, ratio or layer knob`);
      }
      assert.equal(/rank\s*[/*]\s*|[/*]\s*rank/u.test(checksSource), false, "a rank is compared, never divided or multiplied");
    },
  },
];
