import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { functionBody } from "../../support/source-slice.mjs";
import { NOT_ADMISSIBLE, HARNESS_NOT_INTROSPECTABLE, KEY_OUTSIDE_DECLARED_SET } from "../../../src/work-acceptor/admissibility.mjs";
import { defaultCriterion, makeCriterion } from "../../../src/work-acceptor/criterion.mjs";
import { BUDGET_EXHAUSTED, EVIDENCE_SHORT } from "../../../src/work-acceptor/ledger.mjs";
import {
  METRIC_UNMEASURABLE,
  NOT_AN_ORDINAL_KNOB,
  NO_STEP_PROPOSED,
  STEP_IS_MORE_THAN_ONE_NOTCH,
  TRIAL_UNAFFORDABLE,
  TRIAL_UNIT_UNDECLARED,
} from "../../../src/work-acceptor/rule.mjs";
import { NO_DECLARED_RANGE, OUTSIDE_DECLARED_RANGE, STEP_WOULD_BE_COMPOUND, compoundStepRefusal } from "../../../src/loop-bounds.mjs";
import { RULING_REFUSAL_ORDER, YIELD_BOUND, acceptorCommand, buildAcceptorReport } from "../../../src/commands/acceptor.mjs";

const KEY = "config.fixture.knob";
const census = Object.freeze({ populations: Object.freeze([]), findings: Object.freeze([]) });

function criterion() {
  return makeCriterion({
    ...defaultCriterion(),
    tunables: { [KEY]: { trialUnit: { unit: "milestone build", meanUsd: 137.3 }, values: [1, 2, 3] } },
  });
}

function crowdedReport() {
  return buildAcceptorReport({
    proposals: [{ key: KEY, from: 1, to: 2, arms: [], sequence: [] }],
    criterion: criterion(),
    model: { nodes: [{ id: "arbiter:test", edges: { "parameter-tuning": [{ scheme: "config", operand: KEY }] } }] },
    units: [],
    harness: { kind: "prompt", document: "continue.md", text: "policy in prose" },
    census,
    config: { config: { fixture: { knob: 1 } } },
    bounds: {
      rangeProbe: (key, proposed) => ({ key, proposed, admissible: true, inEffect: proposed, code: null }),
      compoundStepRefusal,
    },
    metricRegistry: {
      "module:src/work/counters.mjs#roundsToAccept": () => ({ status: "measured", value: 0, better: "lower" }),
      "module:src/work/counters.mjs#countFindingEscapes": () => ({ status: "measured", value: 0, better: "lower" }),
    },
  });
}

export const archTests = [
  {
    name: "arch/61 FF-6112 · work:acceptor is report-only by default, has no strict flag, and freezes the eight-member ruling lane",
    run: async () => {
      assert.equal(acceptorCommand.id, "work:acceptor");
      assert.deepEqual(acceptorCommand.cli.route, ["work", "acceptor"]);
      assert.equal(Object.hasOwn(acceptorCommand.cli.spec.flags, "strict"), false);
      const independentlyAssembled = [
        NOT_ADMISSIBLE,
        METRIC_UNMEASURABLE,
        TRIAL_UNAFFORDABLE,
        YIELD_BOUND,
        EVIDENCE_SHORT,
        BUDGET_EXHAUSTED,
        STEP_WOULD_BE_COMPOUND,
        NOT_AN_ORDINAL_KNOB,
      ];
      assert.deepEqual(RULING_REFUSAL_ORDER, independentlyAssembled, "the composition boundary assembles the eight declaring modules in ADR-013 order");
      assert.ok(Object.isFrozen(RULING_REFUSAL_ORDER));

      const constructionAndGrounds = [
        TRIAL_UNIT_UNDECLARED,
        STEP_IS_MORE_THAN_ONE_NOTCH,
        NO_STEP_PROPOSED,
        KEY_OUTSIDE_DECLARED_SET,
        HARNESS_NOT_INTROSPECTABLE,
        OUTSIDE_DECLARED_RANGE,
        NO_DECLARED_RANGE,
      ];
      assert.deepEqual(constructionAndGrounds.filter((code) => RULING_REFUSAL_ORDER.includes(code)), [], "construction refusals and admissibility grounds are disjoint from the ruling lane");

      const crowded = crowdedReport();
      assert.deepEqual(crowded.proposals[0].refusals.map((entry) => entry.code), [
        NOT_ADMISSIBLE,
        METRIC_UNMEASURABLE,
        TRIAL_UNAFFORDABLE,
        EVIDENCE_SHORT,
      ], "every applicable refusal accumulates in frozen order rather than stopping at the first");
      assert.ok(crowded.proposals[0].refusals[0].detail.grounds.some((ground) => ground.code === HARNESS_NOT_INTROSPECTABLE));
      assert.ok(!crowded.proposals[0].refusals.some((entry) => entry.code === HARNESS_NOT_INTROSPECTABLE), "an admissibility ground remains detail beneath the one crossing code");

      assert.deepEqual(Object.keys(crowded), [
        "mode", "reportOnly", "commitRequiresExplicitRequest", "threshold", "vocabulary",
        "census", "proposals", "structurallySilent", "findings", "action",
      ], "the machine report's top-level key set is frozen");
      assert.deepEqual(Object.keys(crowded.proposals[0]), [
        "key", "proposal", "range", "verdict", "eligible", "applied", "evidence", "distance",
        "basket", "metric", "admissibility", "refusals", "constructionRefusals",
      ], "each proposal has one stable machine shape");

      const source = await readFile(new URL("../../../src/commands/acceptor.mjs", import.meta.url), "utf8");
      assert.ok(source.includes("commitRequiresExplicitRequest: true"));
      assert.ok(source.includes("if (typeof requested === \"string\" && requested.length > 0)"), "the transition is behind the explicit request branch");
      assert.ok(!/flags\s*:\s*\{[^}]*strict/us.test(source), "the face declares no strictness option");
      const ordering = functionBody(source, "function orderedCodes(");
      assert.notEqual(ordering, null, "the ruling-lane composition is found structurally");
      assert.ok(ordering.includes("ruling-refusal-unknown"), "an unknown lane code is refused rather than silently dropped or rendered as free text");
      assert.ok(ordering.includes("RULING_REFUSAL_ORDER.indexOf"), "the emitted order comes from the frozen vocabulary");
      const renderer = functionBody(source, "function render(");
      assert.notEqual(renderer, null, "the human renderer is found structurally");
      assert.ok(renderer.includes("result.proposals"), "the human face renders the canonical result object");
      assert.ok(!renderer.includes("deriveRule") && !renderer.includes("evaluateRun"), "the human face does not re-derive the machine answer");
    },
  },
];
