import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  RULING_REFUSAL_ORDER,
  acceptorCommand,
  buildAcceptorReport,
  reversionDecision,
  withdrawalOnHarm,
} from "../../src/commands/acceptor.mjs";
import { criterionDigest, defaultCriterion, makeCriterion } from "../../src/work-acceptor/criterion.mjs";
import { PAIR_OUTCOMES } from "../../src/work-acceptor/ledger.mjs";
import { tunableSet } from "../../src/work-acceptor/admissibility.mjs";
import { compoundStepRefusal } from "../../src/loop-bounds.mjs";

const KEY = "work.loop.reviewRounds";
const W = PAIR_OUTCOMES.FAVOURABLE;
const L = PAIR_OUTCOMES.UNFAVOURABLE;
const runs = (wins, losses = 0) => [...Array.from({ length: wins }, () => W), ...Array.from({ length: losses }, () => L)];
const census = Object.freeze({ populations: Object.freeze([]), findings: Object.freeze([]) });
const bounds = Object.freeze({
  rangeProbe: (key, proposed) => Object.freeze({ key, proposed, admissible: true, inEffect: proposed, code: null }),
  compoundStepRefusal,
});
const metrics = Object.freeze({
  "module:src/work/counters.mjs#roundsToAccept": (records) => ({ status: "measured", value: records?.value ?? 0, better: "lower" }),
  "module:src/work/counters.mjs#countFindingEscapes": (records) => ({ status: "measured", value: records?.counter ?? 0, better: "lower" }),
});

function model(keys = [KEY], dwell = "cycles:2") {
  return {
    nodes: [
      {
        id: "arbiter:test",
        fields: { dwell: { raw: dwell, kind: "cycles", cycles: Number(dwell.split(":")[1]) } },
        edges: { "parameter-tuning": keys.map((key) => ({ scheme: "config", operand: key })) },
      },
    ],
  };
}

function consumerUnits(key = KEY) {
  const leaf = key.split(".").at(-1);
  return [
    { rel: "src/bounds.mjs", code: `export function ${leaf}FromConfig(workspace) { return workspace.config.value ?? 1; }` },
    { rel: "src/consumer.mjs", code: `function decide(workspace) { const value = ${leaf}FromConfig(workspace); if (value > 0) return true; return false; }` },
  ];
}

function criterionFor(metadata = { trialUnit: { unit: "aof-qa review round", meanUsd: 5.61 }, values: [1, 2, 3] }) {
  return makeCriterion({ ...defaultCriterion(), tunables: { [KEY]: metadata } });
}

// THE EVIDENCE IS THE LEDGER'S. A proposal names a key and a step and carries no pair
// sequence of its own — so a fixture that wants standing evidence writes a ruling record
// under the criterion in force, exactly as the store would, and it passes through the
// digest suffix on the way in.
function ledgerOf(criterion, pairs, key = KEY) {
  return [{ key, criterion: criterionDigest(criterion), ledger: pairs }];
}

function proposal(overrides = {}) {
  return {
    key: KEY,
    from: 1,
    to: 2,
    arms: [{ value: 2, counter: 0 }],
    epochId: "61",
    counterMetric: { measured: true, before: 0, after: 0, direction: "unchanged" },
    provenance: "test",
    ...overrides,
  };
}

function report({ pairs = runs(8), ...overrides } = {}) {
  const criterion = overrides.criterion ?? criterionFor();
  return buildAcceptorReport({
    proposals: [proposal()],
    model: model(),
    units: consumerUnits(),
    harness: { kind: "code", document: "fixture.mjs", text: KEY },
    census,
    config: { work: { loop: { reviewRounds: 1 } } },
    bounds,
    metricRegistry: metrics,
    ...overrides,
    criterion,
    ledger: overrides.ledger ?? ledgerOf(criterion, pairs),
  });
}

function contextFor({ ledger = null, criterion = criterionFor(), nodes = model(), units = consumerUnits(), onTransition } = {}) {
  return {
    workspace: { projectRoot: "C:/fixture", config: { work: { loop: { reviewRounds: 1 } } } },
    acceptor: {
      criterion,
      model: nodes,
      units,
      harness: { kind: "code", document: "fixture.mjs", text: KEY },
      census,
      ledger: ledger ?? ledgerOf(criterion, runs(8)),
      bounds,
      metricRegistry: metrics,
      transition: onTransition,
    },
  };
}

export const acceptorCommandTests = [
  {
    name: "61/06 task 00+01 · the one command is report-only by default, carries one canonical machine object, and offers no strictness flag",
    run: async () => {
      const result = report();
      assert.equal(result.mode, "report-only");
      assert.equal(result.reportOnly, true);
      assert.equal(result.action, null);
      assert.equal(result.proposals[0].eligible, true, "crossing changes eligibility, not the default action");
      assert.equal(result.proposals[0].applied, false);
      assert.equal(result.proposals[0].evidence.count, 8);
      assert.equal(result.proposals[0].evidence.threshold, 8);
      assert.equal(Object.hasOwn(acceptorCommand.cli.spec.flags, "strict"), false);
      assert.deepEqual(acceptorCommand.cli.json(result), result, "JSON is the canonical report rather than a second derivation");
      const human = acceptorCommand.cli.render(result);
      for (const fact of [KEY, "eligible", "8 rulings, threshold 8", "commit requires an explicit request"]) {
        assert.ok(human.includes(fact), `the human face carries ${fact}`);
        assert.ok(JSON.stringify(result).includes(fact.split(" ")[0]), `the machine face carries ${fact}`);
      }
      assert.equal(acceptorCommand.cli.exit(result, { options: {} }), 0);
    },
  },
  {
    name: "61/06 task 01 · only an explicit request reaches the committing transition, and an ineligible request reports every reason without moving",
    run: async () => {
      let transitioned = null;
      const ctx = contextFor({
        onTransition: async (ruling) => {
          transitioned = ruling;
          return { rulingId: "r-1", write: { key: ruling.key, from: ruling.from, to: ruling.to } };
        },
      });
      const bare = await acceptorCommand.run({ proposals: [proposal()] }, ctx);
      assert.equal(transitioned, null, "a crossing on a bare run changes no value");
      assert.equal(bare.action, null);
      const committed = await acceptorCommand.run({ proposals: [proposal()], commit: KEY }, ctx);
      assert.equal(committed.action.applied, true);
      assert.equal(transitioned.verdict, "commit");
      assert.deepEqual(transitioned.refusals, []);
      assert.equal(transitioned.dwell, "cycles:2");

      transitioned = null;
      const refusedCtx = { ...ctx, acceptor: { ...ctx.acceptor, units: [] } };
      const refused = await acceptorCommand.run({ proposals: [proposal()], commit: KEY }, refusedCtx);
      assert.equal(refused.action.applied, false);
      assert.equal(transitioned, null);
      assert.ok(refused.action.refusals.some((entry) => entry.code === "not-admissible"));
    },
  },
  {
    // THE REGRESSION THIS LOCKS (found at `aof:verify 61`'s review of this story): the face
    // used to accept a pair sequence carried on the proposal and prefer it to the ledger, so
    // `run({ proposals: [{ …, sequence: eight wins }], commit })` committed a harness change
    // on evidence its own caller supplied — the enforcement point ADR-005 §1a says cannot be
    // routed around, routed around through `input`.
    name: "61/06 task 01 · the evidence is the LEDGER's — a proposal cannot hand in its own, and a superseded criterion's rulings do not count",
    run: async () => {
      const criterion = criterionFor();
      const fabricated = proposal({ sequence: runs(8), evidence: { count: 8 }, pairs: runs(8) });
      const row = report({ pairs: [], proposals: [fabricated], criterion }).proposals[0];
      assert.equal(row.evidence.count, 0, "the caller's sequence is not evidence");
      assert.equal(row.eligible, false);
      assert.deepEqual(row.refusals.map((entry) => entry.code), ["evidence-short"]);

      let transitioned = null;
      const ctx = contextFor({
        criterion,
        ledger: [],
        onTransition: async (ruling) => { transitioned = ruling; return { rulingId: "r-x", write: {} }; },
      });
      const attempted = await acceptorCommand.run({ proposals: [fabricated], commit: KEY }, ctx);
      assert.equal(attempted.action.applied, false, "a fabricated sequence cannot reach the committing transition");
      assert.equal(transitioned, null);

      // …and the digest suffix the ledger path applies is real: eight wins recorded under a
      // criterion that has since been superseded accrue nothing toward the current one.
      const superseded = ledgerOf(makeCriterion({ ...defaultCriterion(), B: 12, tunables: criterion.tunables }), runs(8));
      const stale = report({ criterion, ledger: superseded }).proposals[0];
      assert.equal(stale.evidence.count, 0, "evidence under a superseded criterion is not summable into this one");
      assert.equal(stale.eligible, false);
    },
  },
  {
    name: "61/06 task 00 · a run that cannot read the ledger fails rather than reporting a zero, and names the line it could not read",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-acceptor-unreadable-"));
      try {
        await mkdir(path.join(root, ".aof"), { recursive: true });
        await writeFile(path.join(root, ".aof", "acceptor-ledger.jsonl"), "{ not json at all\n", "utf8");
        const ctx = contextFor();
        // `ledger` omitted so the command reads the store through its own seam.
        delete ctx.acceptor.ledger;
        ctx.workspace = { ...ctx.workspace, projectRoot: root };
        await assert.rejects(
          () => acceptorCommand.run({ proposals: [proposal()] }, ctx),
          (error) => {
            assert.equal(error.code, "ledger-line-unreadable");
            assert.match(error.message, /line 1/u, "the failure names what it could not read");
            return true;
          },
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "61/06 task 02 · the ruling vocabulary is exactly eight, fixed in order, with construction refusals kept out",
    run: async () => {
      assert.deepEqual(RULING_REFUSAL_ORDER, [
        "not-admissible",
        "metric-unmeasurable",
        "trial-unaffordable",
        "yield-bound",
        "evidence-short",
        "budget-exhausted",
        "step-would-be-compound",
        "not-an-ordinal-knob",
      ]);
      const crowdedCriterion = criterionFor({ trialUnit: { unit: "milestone build", meanUsd: 137.3 }, values: [1, 2, 3] });
      const crowded = report({
        pairs: [],
        proposals: [proposal({ arms: [], observedYield: 0.5, bounds: ["attempt-ceiling", "progress-reset-ceiling"] })],
        criterion: crowdedCriterion,
        units: [],
        harness: { kind: "prompt", document: "continue.md", text: "three rounds" },
      }).proposals[0];
      assert.deepEqual(crowded.refusals.map((entry) => entry.code), [
        "not-admissible",
        "metric-unmeasurable",
        "trial-unaffordable",
        "yield-bound",
        "step-would-be-compound",
      ]);
      // THE ORDER IS THE FROZEN ONE, NOT THE ONE THEY WERE FOUND IN: the reported codes are
      // exactly the declared order filtered to this knob's set, which is a statement no
      // discovery order can satisfy by accident.
      const found = new Set(crowded.refusals.map((entry) => entry.code));
      assert.deepEqual(crowded.refusals.map((entry) => entry.code), RULING_REFUSAL_ORDER.filter((code) => found.has(code)));
      for (const refusal of crowded.refusals) assert.ok(typeof refusal.removal === "string" && refusal.removal.length > 0, `${refusal.code} names its own removal`);
      const groundCodes = crowded.refusals[0].detail.grounds.map((entry) => entry.code);
      assert.ok(groundCodes.includes("harness-not-introspectable"));
      assert.ok(!crowded.refusals.some((entry) => entry.code === "harness-not-introspectable"), "grounds stay beneath not-admissible");

      // A knob refused because no step on it is single STAYS PROPOSABLE — the refusal is
      // about committing, and the key is still what the registry admits for tuning.
      assert.ok(tunableSet(model()).keys.includes(crowded.key), "the compound-step knob is still admitted for tuning");

      const malformed = report({ criterion: criterionFor({ values: [1, 2, 3] }) }).proposals[0];
      assert.ok(malformed.constructionRefusals.some((entry) => entry.code === "trial-unit-undeclared"));
      assert.ok(!malformed.refusals.some((entry) => entry.code === "trial-unit-undeclared"));
      for (const code of ["step-is-more-than-one-notch", "no-step-proposed", "key-outside-declared-set"]) {
        assert.ok(!RULING_REFUSAL_ORDER.includes(code), `${code} is construction, never a ruling-lane member`);
      }
    },
  },
  {
    name: "61/06 task 02 · a reason that stops applying stops being reported, and the others survive with the same removals",
    run: async () => {
      const shared = {
        pairs: [],
        proposals: [proposal({ arms: [], observedYield: 0.5 })],
        criterion: criterionFor({ trialUnit: { unit: "milestone build", meanUsd: 137.3 }, values: [1, 2, 3] }),
        harness: { kind: "prompt", document: "continue.md", text: "three rounds" },
      };
      const before = report({ ...shared, units: [] }).proposals[0].refusals;
      assert.ok(before.some((entry) => entry.code === "not-admissible"), "the reason about to be removed applies first");

      // The ONLY thing that changes is that something executed begins reading the value.
      const after = report({ ...shared, units: consumerUnits(), harness: { kind: "code", document: "fixture.mjs", text: KEY } }).proposals[0].refusals;
      assert.ok(!after.some((entry) => entry.code === "not-admissible"), "the reason that stopped applying stops being reported");
      assert.deepEqual(
        after.map((entry) => entry.code),
        before.filter((entry) => entry.code !== "not-admissible").map((entry) => entry.code),
        "and every other reason is untouched",
      );
      for (const entry of after) {
        assert.equal(entry.removal, before.find((prior) => prior.code === entry.code).removal, `${entry.code} keeps the same removal as before`);
      }
    },
  },
  {
    name: "61/06 task 02 · an unordered knob reports that permanent human-change reason alone",
    run: async () => {
      const unordered = report({
        criterion: criterionFor({ trialUnit: { unit: "aof-qa review round", meanUsd: 5.61 }, values: ["fast", "thorough"] }),
        proposals: [proposal({ values: ["fast", "thorough"] })],
      }).proposals[0];
      assert.deepEqual(unordered.refusals.map((entry) => entry.code), ["not-an-ordinal-knob"]);
      assert.equal(unordered.basket, null);
      assert.equal(unordered.distance.value, 0);
    },
  },
  {
    name: "61/06 task 01 · both numbers are shown at every state of the ledger, and a knob with no ruling at all is reported rather than omitted",
    run: async () => {
      for (const [held, distance] of [[0, 8], [4, 4], [7, 1], [8, 0]]) {
        const row = report({ pairs: runs(held) }).proposals[0];
        assert.equal(row.evidence.count, held, `${held} rulings are reported as ${held}`);
        assert.equal(row.evidence.threshold, 8, "the threshold is stated beside the standing");
        assert.equal(row.distance.value, distance, `${held} against 8 is ${distance} away`);
        assert.equal(row.distance.unit, "rulings");
        const human = acceptorCommand.cli.render(report({ pairs: runs(held) }));
        assert.ok(human.includes(`${held} rulings, threshold 8`), "both numbers appear on the human face too");
      }
      const none = report({ pairs: [] }).proposals[0];
      assert.equal(none.evidence.count, 0, "a knob that never produced a ruling appears with a standing of none");
      assert.equal(none.verdict, "report-only");
      assert.equal(none.eligible, false);
    },
  },
  {
    name: "61/06 task 01 · the next crossing is derived from the record in hand rather than fixed, and recovery is never promised past the budget",
    run: async () => {
      // ADR-001 §1a's lattice, read off the shipped criterion (N 8, B 11): a loss moves the
      // crossing, so each of these is arithmetic rather than a number anyone typed.
      for (const [wins, losses, record, at] of [[4, 0, "8-0", 8], [7, 1, "10-1", 11], [5, 2, "11-2", 13]]) {
        const row = report({ pairs: runs(wins, losses) }).proposals[0];
        assert.equal(row.evidence.record, `${wins}-${losses}`);
        assert.equal(row.evidence.nextCrossing.record, record, `${wins}-${losses} crosses next at ${record}`);
        assert.equal(row.evidence.nextCrossing.at, at, `…falling at ${at} pairs`);
      }
      const live = report({ pairs: runs(7, 1) }).proposals[0];
      assert.deepEqual(live.refusals.map((entry) => entry.code), ["evidence-short"], "a lost pair does not end a proposal");
      assert.equal(live.distance.reachable, true);

      const spent = report({ pairs: runs(5, 2) }).proposals[0];
      assert.deepEqual(spent.refusals.map((entry) => entry.code), ["budget-exhausted"], "dead by arithmetic is its own name, never evidence-short");
      assert.equal(spent.distance.value, null, "no distance is offered that the remaining budget cannot cover");
      assert.equal(spent.distance.reachable, false);
    },
  },
  {
    name: "61/06 task 03 · accruing, yield-bound and budget-exhausted silences carry different computed distances",
    run: async () => {
      const accruing = report({ pairs: runs(4) }).proposals[0];
      assert.deepEqual(accruing.refusals.map((entry) => entry.code), ["evidence-short"]);
      assert.deepEqual(accruing.distance, { unit: "rulings", value: 4, reachable: true });

      const yieldBound = report({ pairs: runs(1), proposals: [proposal({ observedYield: 0.5 })] }).proposals[0];
      assert.deepEqual(yieldBound.refusals.map((entry) => entry.code), ["yield-bound"]);
      assert.deepEqual(yieldBound.distance, { unit: "epochs", value: 14, reachable: true });

      const exhausted = report({ pairs: runs(5, 2) }).proposals[0];
      assert.deepEqual(exhausted.refusals.map((entry) => entry.code), ["budget-exhausted"]);
      assert.equal(exhausted.distance.reachable, false);
      assert.equal(exhausted.evidence.nextCrossing.record, "11-2");
    },
  },
  {
    name: "61/06 task 03 · the distance is computed from the observed yield and moves when the yield moves, with nothing edited",
    run: async () => {
      const slow = report({ pairs: runs(1), proposals: [proposal({ observedYield: 0.5 })] }).proposals[0];
      const faster = report({ pairs: runs(1), proposals: [proposal({ observedYield: 0.7 })] }).proposals[0];
      assert.equal(slow.distance.unit, "epochs");
      assert.equal(faster.distance.unit, "epochs");
      assert.equal(slow.distance.value, 14, "ceil(7 / 0.5)");
      assert.equal(faster.distance.value, 10, "ceil(7 / 0.7)");
      assert.ok(faster.distance.value < slow.distance.value, "a rising yield shortens the distance, and no message was edited to say so");

      // …and a yield at or above one discordant pair per epoch is not structural silence at
      // all: the knob reads as accruing, which is the discrimination this task exists for.
      const reachable = report({ pairs: runs(1), proposals: [proposal({ observedYield: 1 })] }).proposals[0];
      assert.deepEqual(reachable.refusals.map((entry) => entry.code), ["evidence-short"]);
      assert.equal(reachable.distance.unit, "rulings");
    },
  },
  {
    name: "61/06 task 04 · dwell refuses operator reversion without fabricating an expiry, while harm bypasses it",
    run: async () => {
      const record = { key: KEY, from: 1, to: 2, dwell: "cycles:2", dwellFrom: "61" };
      const revert = reversionDecision(record);
      assert.equal(revert.allowed, false);
      assert.equal(revert.code, "dwell-uncounted");
      assert.equal(revert.expiry, null);
      const harm = withdrawalOnHarm(record, { measured: true, direction: "worse", before: 1, after: 2 });
      assert.equal(harm.withdraw, true);
      assert.equal(harm.to, 1);
      assert.equal(harm.consultedDwell, false);
      assert.equal(harm.wait, false);
      const safe = withdrawalOnHarm({ ...record, dwell: "cycles:100" }, { measured: true, direction: "unchanged" });
      assert.equal(safe.withdraw, false);
    },
  },
  {
    name: "61/06 task 04 · changing the declared settling period changes what is recorded and nothing else",
    run: async () => {
      const recorded = [];
      for (const declared of ["cycles:2", "cycles:10"]) {
        const ctx = contextFor({
          nodes: model([KEY], declared),
          onTransition: async (ruling) => { recorded.push(ruling); return { rulingId: `r-${declared}`, write: {} }; },
        });
        const result = await acceptorCommand.run({ proposals: [proposal()], commit: KEY }, ctx);
        assert.equal(result.action.applied, true);
      }
      assert.deepEqual(recorded.map((ruling) => ruling.dwell), ["cycles:2", "cycles:10"], "the period recorded follows the declaration");
      assert.deepEqual(recorded[0].ledger, recorded[1].ledger, "and nothing else about the ruling moved");
      assert.equal(recorded[0].evalue, recorded[1].evalue);

      // The refusal is unchanged, still naming the counter that does not exist…
      const [short, long] = recorded.map((ruling) => reversionDecision(ruling));
      assert.equal(short.code, long.code);
      assert.equal(short.message, long.message);
      assert.equal(short.expiry, null);
      assert.equal(long.expiry, null);

      // …and no settling period reaches the harm path's answer, in either direction.
      const withdrawals = recorded.map((ruling) => withdrawalOnHarm(ruling, { measured: true, direction: "worse" }));
      assert.deepEqual(withdrawals[0], withdrawals[1], "the settling length has no effect on the response to harm");
      for (const withdrawal of withdrawals) assert.ok(!JSON.stringify(withdrawal).includes("cycles"), "no withdrawal mentions a settling period");
    },
  },
  {
    name: "61/06 task 00 · the human and machine faces carry the same step, range, census, refusal, and recovery arithmetic",
    run: async () => {
      const result = report({
        pairs: runs(7, 1),
        census: Object.freeze({
          populations: Object.freeze([Object.freeze({
            sweep: "fixture",
            count: 4,
            excluded: Object.freeze({ fixtures: 2, otherWorkspace: 1, unlocated: 3 }),
            folded: Object.freeze({ events: 1 }),
          })]),
          findings: Object.freeze([]),
        }),
      });
      const row = result.proposals[0];
      const human = acceptorCommand.cli.render(result);
      for (const fact of [
        "step 1 → 2",
        "range: proposed 2, in effect 2, admissible true",
        "record 7-1",
        `E ${row.evidence.wealth} against ${row.evidence.level}`,
        `next crossing ${row.evidence.nextCrossing.record} at ${row.evidence.nextCrossing.at} pairs`,
        `${row.evidence.budgetRemaining} of ${row.evidence.budget} budget pairs remain`,
        "census fixture: counted 4; excluded 2 fixture, 1 other-workspace, 3 unlocated; folded 1 event(s)",
      ]) assert.ok(human.includes(fact), `the human face carries ${fact}`);
      assert.deepEqual(acceptorCommand.cli.json(result), result, "the machine face is the exact object rendered by the human face");
    },
  },
  {
    name: "61/06 task 02 · construction refusals produce no ruling lane and never masquerade as evidence accruing",
    run: async () => {
      const missingUnit = report({ criterion: criterionFor({ values: [1, 2, 3] }) }).proposals[0];
      assert.equal(missingUnit.verdict, "construction-refused");
      assert.deepEqual(missingUnit.refusals, []);
      assert.equal(missingUnit.evidence, null);
      assert.equal(missingUnit.distance, null);
      assert.ok(missingUnit.constructionRefusals.some((entry) => entry.code === "trial-unit-undeclared"));

      const noStep = report({ proposals: [proposal({ to: undefined })] }).proposals[0];
      assert.ok(noStep.constructionRefusals.some((entry) => entry.code === "no-step-proposed"));
      assert.deepEqual(noStep.refusals, []);

      const longStep = report({ proposals: [proposal({ to: 3 })] }).proposals[0];
      assert.ok(longStep.constructionRefusals.some((entry) => entry.code === "step-is-more-than-one-notch"));
      assert.deepEqual(longStep.refusals, []);

      const outside = report({ model: model(["work.loop.someOtherKnob"]) }).proposals.find((row) => row.key === KEY);
      assert.deepEqual(outside.constructionRefusals.map((entry) => entry.code), ["key-outside-declared-set"]);
      assert.deepEqual(outside.refusals, []);
      assert.equal(outside.evidence, null);
      assert.ok(acceptorCommand.cli.render({ ...report(), proposals: [missingUnit] }).includes("no ruling was produced and no evidence is accruing"));
    },
  },
  {
    name: "61/06 task 03 · an entirely yield-bound report states the structural silence, while an exhausted proposal offers no false distance",
    run: async () => {
      const silent = report({ pairs: runs(1), proposals: [proposal({ observedYield: 0.5 })] });
      assert.equal(silent.structurallySilent, true);
      assert.ok(acceptorCommand.cli.render(silent).includes("every reported knob is yield-bound"));

      const exhausted = report({ pairs: runs(5, 2) }).proposals[0];
      assert.deepEqual(exhausted.distance, { unit: "rulings", value: null, reachable: false });
      assert.equal(exhausted.refusals.some((entry) => entry.code === "evidence-short"), false);
    },
  },
];
