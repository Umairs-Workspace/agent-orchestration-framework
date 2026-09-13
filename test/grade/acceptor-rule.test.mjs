// Traceability: milestone 61 / story 04 — the rule and the ledger (the RULE half).
//
//   tasks/00_the-threshold-and-the-e-value-are-one-object.feature
//   tasks/02_a-step-is-one-knob-and-one-notch.feature
//   tasks/03_the-trial-metric-is-declared-not-named.feature
//   tasks/04_the-basket-is-computed-per-knob.feature
//
// Every scenario and every Examples row across the four is exercised here. Three
// things are driven through the REAL thing rather than a fixture standing in for it,
// because each is exactly where a fixture would have let the defect through:
//
//   • the CRITERION is the shipped `defaultCriterion()` (61/01), so "the shipped
//     criterion" means the one a project actually gets, and every derived number is
//     re-derived from its own alpha/lambda rather than compared to a constant;
//   • the RANGE PROBE is the real `src/loop-bounds.mjs`, so a ladder is the ladder the
//     knob's own resolver answers with — a table here would be the second home
//     ADR-009 §2 exists to refuse;
//   • the METRIC REGISTRY is derived from the real `src/work/counters.mjs` namespace,
//     so "resolves to nothing" means a symbol that module genuinely does not export.
//
// The composed construction (`constructCriterion`) is the command boundary in
// miniature: `makeCriterion` builds, `makeTrial` resolves the declared pointers. Both
// leaves stay zero-import and the composition lives here, which is ADR-006 §4's shape.
import assert from "node:assert/strict";

import * as bounds from "../../src/loop-bounds.mjs";
import * as workCounters from "../../src/work/counters.mjs";
import { defaultCriterion, makeCriterion, criterionDigest, CriterionError } from "../../src/work-acceptor/criterion.mjs";
import {
  COUNTER_METRIC_MISSING,
  COUNTER_METRIC_UNRESOLVABLE,
  EVIDENCE_READINGS,
  METRIC_UNMEASURABLE,
  METRIC_UNRESOLVABLE,
  NOT_AN_ORDINAL_KNOB,
  NO_STEP_PROPOSED,
  RANGE_PROBE_MISSING,
  PAIR_OUTCOMES,
  STEP_IS_MORE_THAN_ONE_NOTCH,
  TRIAL_ARMS,
  TRIAL_UNAFFORDABLE,
  TRIAL_UNIT_UNDECLARED,
  basketFor,
  basketSpread,
  commitLevel,
  commitRequirement,
  counterMetricMovement,
  countPair,
  crossingLattice,
  deriveMetricRegistry,
  deriveRule,
  earliestCrossing,
  evidenceReading,
  knobReport,
  ladderPrice,
  lossMultiplier,
  makeTrial,
  metricPopulation,
  rawPairsFor,
  readArm,
  readStep,
  winMultiplier,
} from "../../src/work-acceptor/rule.mjs";
import {
  BUDGET_EXHAUSTED,
  EVIDENCE_SHORT,
  INITIAL_WEALTH,
  accrue,
  attained,
  evaluateRun,
  makeRuling,
} from "../../src/work-acceptor/ledger.mjs";

// ─── the registry, derived from the real counters leaf ─────────────────────────────────

const COUNTERS_MODULE = "src/work/counters.mjs";
const registry = deriveMetricRegistry({ [COUNTERS_MODULE]: workCounters });
const pointerTo = (symbol) => `module:${COUNTERS_MODULE}#${symbol}`;

// The command boundary in miniature: build, then resolve. A criterion whose declared
// pointers do not hold up produces NOTHING — the refusal is raised before anything is
// handed back.
function constructCriterion(fields) {
  return makeTrial({ criterion: makeCriterion(fields), registry });
}

const shipped = defaultCriterion();
const shippedRule = deriveRule(shipped);

// A revision spread over the shipped criterion drops `N`. It is DERIVED from alpha and
// lambda, and 61/01 refuses a criterion that states one those two do not give — which
// is the guard working, not an inconvenience: a pinned N is exactly the number that
// would survive a change to either input.
const { N: _derivedPairCount, ...shippedFields } = shipped;
const revising = (fields) => makeCriterion({ ...shippedFields, ...fields });

// `assert.throws` returns nothing, so the refusal is caught here instead — and the
// sentinel proves the call produced NOTHING rather than something that was discarded.
function refusalFrom(body) {
  const produced = Symbol("nothing was produced");
  let outcome = produced;
  try {
    outcome = body();
  } catch (error) {
    return { refusal: error, produced: null };
  }
  assert.fail(`expected a refusal; got ${outcome === produced ? "nothing" : JSON.stringify(outcome)}`);
  return null;
}

// ─── arm fixtures, read through the REAL counters leaf ─────────────────────────────────

// One accepted item that consumed `rounds` attributed agent rounds. The attribution is
// what makes an arm measurable at all: `sessionId` is null in 61 of 61 records at HEAD,
// which is why every arm there is unmeasurable (ADR-002 §6).
function armWith({ rounds = 1, attributed = true, retries = 0, ref = "61/04" } = {}) {
  const runs = Array.from({ length: rounds }, (_, index) => ({
    runId: `${ref}-run-${index}`,
    sessionId: attributed ? `session-${index}` : null,
    createdAt: "2026-08-01T00:00:00.000Z",
    state: "completed",
    retryOf: index > 0 && index <= retries ? `${ref}-run-${index - 1}` : null,
  }));
  return [{ ref, status: "done", acceptedAt: "2026-08-02T00:00:00.000Z", runs, feedbackRecords: [] }];
}

const trialOn = (metric) => makeTrial({ criterion: revising({ metric: pointerTo(metric) }), registry });
const shippedTrial = makeTrial({ criterion: shipped, registry });

// ─── knob fixtures ─────────────────────────────────────────────────────────────────────
//
// The three trial units and their mean prices are SPIKE §Lane B's own table, handed in
// as data. They are declared beside the knob (ADR-003 §3), never held by the engine.
const REVIEW_ROUND = { unit: "aof-qa review round", meanUsd: 5.61 };
const TASK_BUILD = { unit: "aof-developer task build", meanUsd: 22.82 };
const MILESTONE_BUILD = { unit: "milestone build", meanUsd: 137.30 };

const ORDERED_KNOB = "work.loop.reviewRounds";
const SECOND_ORDERED_KNOB = "work.loop.buildNoProgressRounds";
// A map from roles to models: a set of choices, not a ladder. `+1` has no meaning on it.
const UNORDERED_KNOB = { key: "agents.roleModels", values: { developer: "opus", qa: "sonnet" } };

const ruling = (overrides = {}) => makeRuling({
  key: ORDERED_KNOB,
  from: 1,
  to: 2,
  epochId: "61",
  criterion: criterionDigest(shipped),
  ledger: [PAIR_OUTCOMES.FAVOURABLE],
  evalue: attained({ wins: 1, losses: 0 }, shippedRule),
  counterMetric: { before: 0, after: 0, direction: "unchanged", measured: true },
  dwell: "cycles:2",
  dwellFrom: "61",
  provenance: "test",
  verdict: "report-only",
  refusals: [],
  ...overrides,
});

const close = (actual, expected, tolerance = 0.005) => Math.abs(actual - expected) <= tolerance;

export const acceptorRuleTests = [
  // ─── tasks/00 — the crossing records are derived, and eight is only the top row ──────

  {
    name: "61/04 task 00: the crossing records follow the criterion's own inputs (5 Examples rows)",
    run: () => {
      // | confidence | bet | level | multiplier | clean | cn | lost | ln |
      const rows = [
        [0.05, 0.5, 20, 1.5, "8-0", 8, "10-1", 11],
        [0.05, 0.25, 20, 1.25, "14-0", 14, "15-1", 16],
        [0.05, 0.75, 20, 1.75, "6-0", 6, "8-1", 9],
        [0.01, 0.5, 100, 1.5, "12-0", 12, "14-1", 15],
        [0.10, 0.5, 10, 1.5, "6-0", 6, "8-1", 9],
      ];
      for (const [alpha, lambda, level, multiplier, clean, cn, lost, ln] of rows) {
        const criterion = revising({ alpha, lambda, B: Math.max(shipped.B, ln) });
        const rule = deriveRule(criterion);
        assert.ok(close(rule.level, level, 1e-9), `alpha ${alpha}: the commit level is ${level}, got ${rule.level}`);
        assert.ok(close(rule.win, multiplier, 1e-9), `lambda ${lambda}: a favourable pair multiplies by ${multiplier}, got ${rule.win}`);
        const [first, second] = rule.crossings;
        assert.equal(first.record, clean, `alpha ${alpha} / lambda ${lambda}: the earliest crossing`);
        assert.equal(first.at, cn, `alpha ${alpha} / lambda ${lambda}: the pair the earliest crossing falls at`);
        assert.equal(second.record, lost, `alpha ${alpha} / lambda ${lambda}: the earliest crossing after one unfavourable pair`);
        assert.equal(second.at, ln, `alpha ${alpha} / lambda ${lambda}: the pair it falls at`);
      }
    },
  },
  {
    name: "61/04 task 00: the shipped criterion crosses at eight, then not again until eleven",
    run: () => {
      assert.equal(shipped.alpha, 0.05, "the shipped confidence level");
      assert.equal(shipped.lambda, 0.5, "the shipped bet size");
      const lattice = crossingLattice(shipped);
      const earliest = lattice[0];
      assert.equal(earliest.record, "8-0", "the earliest crossing is eight favourable pairs and no unfavourable pair");
      assert.equal(earliest.at, 8);
      assert.equal(earliest.losses, 0);
      // No PATH first-crosses at nine or ten pairs. It is an absence in this table, not
      // a rule: no row falls there (SPIKE §Lane C's "B=8 and B=10 are necessarily
      // identical").
      const pairsThatCross = lattice.map((row) => row.at);
      assert.equal(pairsThatCross.includes(9), false, "no record of nine pairs crosses");
      assert.equal(pairsThatCross.includes(10), false, "no record of ten pairs crosses");
      const next = lattice[1];
      assert.equal(next.record, "10-1", "the next crossing is ten favourable against one unfavourable pair");
      assert.equal(next.at, 11, "…at eleven pairs");
    },
  },
  {
    name: "61/04 task 00: revising the bet moves the whole set of crossings",
    run: () => {
      const before = crossingLattice(shipped);
      const revised = revising({ lambda: 0.75 });
      const after = crossingLattice(revised);
      assert.notEqual(after[0].at, before[0].at, "the earliest crossing falls at a different number of pairs than before");
      assert.notEqual(after[1].at, before[1].at, "the earliest crossing after one unfavourable pair changes with it");
      // …and nothing was edited to make that happen: the criterion moved, and the whole
      // lattice moved with it.
      assert.deepEqual([after[0].record, after[1].record], ["6-0", "8-1"]);
    },
  },
  {
    name: "61/04 task 00: a record that clears the commit level commits whatever its shape",
    run: () => {
      const evaluation = evaluateRun({ wins: 10, losses: 1 }, shippedRule);
      assert.equal(evaluation.commits, true, "it commits");
      assert.equal(evaluation.verdict, "commit");
      // NO CONDITION BEYOND THE COMMIT LEVEL IS APPLIED TO IT. The predicate has one
      // leg, so the only thing separating this record from a refusal is the level — and
      // a record with one loss is not all-favourable.
      assert.equal(evaluation.losses > 0, true, "…and it is not an all-favourable record");
      assert.equal(evaluation.wealth >= evaluation.level, true, "the one leg is the whole condition");
      assert.deepEqual(evaluation.refusals, [], "nothing else was applied");
    },
  },
  {
    name: "61/04 task 00: the wealth is tested after every pair, not only at the earliest crossing",
    run: () => {
      // A run that reaches the commit level at its ELEVENTH pair: the loss lands first,
      // so nothing before pair 11 clears the level.
      const sequence = [PAIR_OUTCOMES.UNFAVOURABLE, ...Array.from({ length: 10 }, () => PAIR_OUTCOMES.FAVOURABLE)];
      const evaluation = evaluateRun(sequence, shippedRule);
      assert.equal(evaluation.crossedAtPair, 11, "it commits at the pair that carried it over the commit level");
      assert.equal(evaluation.trace[9].wealth < shippedRule.level, true, "…and not before it");
      assert.equal(evaluation.trace[10].wealth >= shippedRule.level, true);
      assert.notEqual(evaluation.crossedAtPair, shippedRule.pairCount, "it is not held back until any fixed number of pairs has been reached");
    },
  },
  {
    name: "61/04 task 00: every derived crossing clears the level it was derived from",
    run: () => {
      const lattice = crossingLattice(shipped);
      assert.ok(lattice.length > 3, `the lattice was actually derived: ${lattice.length} rows`);
      for (const row of lattice) {
        const attainment = attained(row, shippedRule);
        assert.equal(attainment >= shippedRule.level, true, `${row.record} attains ${attainment}, at least the commit level ${shippedRule.level}`);
        // …and the row BEFORE it does not, which is what makes it the FIRST crossing.
        const short = attained({ wins: row.wins - 1, losses: row.losses }, shippedRule);
        assert.equal(short < shippedRule.level, true, `${row.wins - 1}-${row.losses} does not cross`);
      }
      assert.ok(close(attained(lattice[0], shippedRule), 25.63), `the earliest attains approximately 25.63 at eight pairs: ${attained(lattice[0], shippedRule)}`);
      assert.equal(lattice[0].at, 8);
      assert.ok(close(attained(lattice[1], shippedRule), 28.83), `the next attains approximately 28.83 at eleven pairs: ${attained(lattice[1], shippedRule)}`);
      assert.equal(lattice[1].at, 11);
    },
  },
  {
    name: "61/04 task 00: the budget is declared, and a budget below the earliest crossing is refused",
    run: () => {
      const earliest = earliestCrossing(shipped);
      const { refusal: refused } = refusalFrom(() => revising({ B: earliest.at - 1 }));
      assert.ok(refused instanceof CriterionError);
      assert.equal(refused.code, "criterion-budget-below-pair-count");
      assert.equal(refused.budget, earliest.at - 1, "the refusal names the declared budget");
      assert.equal(refused.pairCount, earliest.at, "…and the earliest crossing it falls below");
      assert.match(refused.message, new RegExp(`\\b${earliest.at - 1}\\b`));
      assert.match(refused.message, new RegExp(`\\b${earliest.at}\\b`));
    },
  },
  {
    name: "61/04 task 00: a run may take as many pairs as the budget declares and no more",
    run: () => {
      const criterion = revising({ B: 11 });
      const rule = deriveRule(criterion);
      assert.equal(rule.budget, 11, "a criterion declaring a pair budget of eleven");
      const twelve = Array.from({ length: 12 }, () => PAIR_OUTCOMES.FAVOURABLE);
      const evaluation = evaluateRun(twelve, rule);
      assert.equal(evaluation.admittedPairs.length, 11, "it may be evaluated over up to eleven pairs");
      assert.equal(evaluation.notAdmitted.length, 1, "and no twelfth pair is admitted to it");
      assert.equal(evaluation.pairs, 11);
      assert.equal(evaluation.budgetRemaining, 0);
    },
  },
  {
    name: "61/04 task 00: what a ledger of that size can say at all (4 Examples rows)",
    run: () => {
      const rows = [
        [4, EVIDENCE_READINGS.NEVER],
        [5, EVIDENCE_READINGS.AGGRESSIVE_BET_ONLY],
        [7, EVIDENCE_READINGS.AGGRESSIVE_BET_ONLY],
        [8, EVIDENCE_READINGS.CLEARED],
      ];
      for (const [held, reading] of rows) {
        const rendered = evidenceReading(held, shipped);
        assert.equal(rendered.reading, reading, `a ledger of ${held} all-favourable pairs reports ${reading}`);
      }
      // Both readings are DRIVEN BY THE ARITHMETIC rather than by a second table: the
      // floor is the smallest evidence any bet in the family could commit on, and the
      // shipped floor is the earliest crossing.
      assert.equal(evidenceReading(4, shipped).minimumUnderAnyBet, 5);
      assert.equal(evidenceReading(4, shipped).earliestCrossing, 8);
    },
  },

  // ─── tasks/02 — a step is one knob and one notch ────────────────────────────────────

  {
    name: "61/04 task 02: what a proposal may name (6 Examples rows)",
    run: () => {
      const rows = [
        [{ key: ORDERED_KNOB, from: 1, to: 2 }, "accepted", null],
        [{ key: ORDERED_KNOB, from: 3, to: 2 }, "accepted", null],
        [{ key: ORDERED_KNOB, from: 1, to: 3 }, "refused", STEP_IS_MORE_THAN_ONE_NOTCH],
        [{ moves: [{ key: ORDERED_KNOB, from: 1, to: 2 }, { key: SECOND_ORDERED_KNOB, from: 2, to: 3 }] }, "refused", bounds.STEP_WOULD_BE_COMPOUND],
        [{ key: UNORDERED_KNOB.key, from: { developer: "opus" }, to: { developer: "sonnet" } }, "refused", NOT_AN_ORDINAL_KNOB],
        [{ key: ORDERED_KNOB, from: 2, to: 2 }, "refused", NO_STEP_PROPOSED],
      ];
      for (const [proposal, outcome, code] of rows) {
        const read = readStep(proposal, { bounds });
        assert.equal(read.accepted, outcome === "accepted", `${JSON.stringify(proposal)} is ${outcome}`);
        assert.equal(read.code, code, `${JSON.stringify(proposal)} carries ${code}`);
      }
      // The two accepted rows are a step UP and a step DOWN, each one notch.
      assert.equal(readStep({ key: ORDERED_KNOB, from: 1, to: 2 }, { bounds }).step.notch, 1);
      assert.equal(readStep({ key: ORDERED_KNOB, from: 3, to: 2 }, { bounds }).step.notch, -1);
    },
  },
  {
    name: "61/04 task 02: a two-knob proposal is refused rather than split",
    run: () => {
      const read = readStep({ moves: [{ key: ORDERED_KNOB, from: 1, to: 2 }, { key: SECOND_ORDERED_KNOB, from: 2, to: 3 }] }, { bounds });
      assert.deepEqual(read.steps, [], "no step is produced for either knob");
      assert.equal(read.step, null);
      assert.deepEqual([...read.keys], [ORDERED_KNOB, SECOND_ORDERED_KNOB], "the refusal names both knobs");
      assert.match(read.message, new RegExp(ORDERED_KNOB.replace(/\./gu, "\\.")));
      assert.match(read.message, new RegExp(SECOND_ORDERED_KNOB.replace(/\./gu, "\\.")));
      assert.equal(read.accrues, false, "neither knob accrues a pair from it");
    },
  },
  {
    name: "61/04 task 02: an unordered knob is refused by a different name than a compound proposal",
    run: () => {
      const unordered = readStep({ key: UNORDERED_KNOB.key, from: { a: "x" }, to: { a: "y" } }, { bounds });
      const compound = readStep({ moves: [{ key: ORDERED_KNOB, from: 1, to: 2 }, { key: SECOND_ORDERED_KNOB, from: 2, to: 3 }] }, { bounds });
      assert.equal(unordered.accepted, false, "each is refused");
      assert.equal(compound.accepted, false);
      assert.notEqual(unordered.code, compound.code, "the two refusals carry different names");
      assert.equal(unordered.code, NOT_AN_ORDINAL_KNOB);
      assert.equal(compound.code, bounds.STEP_WOULD_BE_COMPOUND);
    },
  },
  {
    name: "61/04 task 02: an unordered knob is reported as a human change rather than as evidence pending",
    run: () => {
      const report = knobReport(UNORDERED_KNOB, { bounds, criterion: shipped });
      assert.equal(report.steppable, false, "the knob is reported as one that cannot be stepped");
      assert.equal(report.humanChange, true);
      assert.deepEqual([...report.refusals], [NOT_AN_ORDINAL_KNOB]);
      assert.equal(report.awaitingEvidence, false, "it is not listed as awaiting evidence");
      assert.equal(report.proposal, null, "no proposal is offered for it");
    },
  },
  {
    name: "61/04 task 02: the price of a whole ladder is stated in pairs, not asserted",
    run: () => {
      const ladder = ladderPrice(ORDERED_KNOB, shipped, { bounds });
      assert.deepEqual([...ladder.notches], [1, 2, 3], "a knob whose values span three notches, asked of its own resolver");
      assert.equal(ladder.steps, 2, "moving it from its lowest value to its highest is two steps");
      assert.equal(ladder.pairsToEarliestCrossing, 2 * earliestCrossing(shipped).at, "…and twice the pairs one step needs to reach its earliest crossing");
      assert.equal(ladder.pairsToEarliestCrossing, 16);
      assert.equal(ladder.pairsFunded, 2 * shipped.B, "…and up to twice the pairs one step is funded for");
      assert.equal(ladder.pairsFunded, 22);
    },
  },
  {
    name: "61/04 task 02: a refused proposal accrues nothing",
    run: () => {
      const refused = readStep({ key: ORDERED_KNOB, from: 1, to: 3 }, { bounds });
      assert.equal(refused.accepted, false);
      assert.equal(refused.accrues, false);
      // The ledger holds rulings for a DIFFERENT knob only: nothing in it is
      // attributable to the refused proposal.
      const ledger = accrue({ rulings: [ruling({ key: SECOND_ORDERED_KNOB })], rule: shippedRule });
      assert.equal(ledger.rulings.filter((entry) => entry.key === ORDERED_KNOB).length, 0, "it holds no pair attributable to that proposal");
      // …and the refusal is reported rather than the proposal disappearing.
      assert.equal(refused.code, STEP_IS_MORE_THAN_ONE_NOTCH);
      assert.ok(refused.message.length > 0);
      assert.deepEqual([...refused.keys], [ORDERED_KNOB]);
    },
  },

  // ─── tasks/03 — the trial metric is declared, not named ─────────────────────────────

  {
    name: "61/04 task 03: a criterion whose declarations do not hold up is refused when it is built (3 Examples rows)",
    run: () => {
      // | defect | named |
      const rows = [
        [{ metric: pointerTo("roundsToNowhere") }, METRIC_UNRESOLVABLE, "roundsToNowhere", "metric"],
        // The refusal names the missing counter-metric by the key it declares it under,
        // which is the name an operator has to edit.
        [{ counter: undefined }, COUNTER_METRIC_MISSING, "counter", "counter"],
        [{ counter: pointerTo("countNothingAtAll") }, COUNTER_METRIC_UNRESOLVABLE, "countNothingAtAll", "counter"],
      ];
      for (const [defect, code, named, part] of rows) {
        const { refusal, produced } = refusalFrom(() => constructCriterion({ ...shippedFields, ...defect }));
        assert.equal(produced, null, `${code}: no criterion is produced`);
        assert.equal(refusal.part, part, `${code}: the refusal names the part`);
        // The refusal NAMES the thing it could not find, so an operator can act on it.
        assert.match(refusal.message, new RegExp(named), `${code}: the refusal names ${named}`);
        if (code !== COUNTER_METRIC_MISSING) assert.equal(refusal.code, code);
      }
      // The missing counter-metric is refused by the criterion's own constructor —
      // before the pointers are even resolved — because a criterion that cannot tell an
      // improvement from work accepted worse must not exist at all (ADR-002 §2).
      const { refusal: missing } = refusalFrom(() => revising({ counter: undefined }));
      assert.ok(missing instanceof CriterionError);
      assert.equal(missing.part, "counter");
    },
  },
  {
    name: "61/04 task 03: how a pair of arm readings is counted (6 Examples rows)",
    run: () => {
      const trial = shippedTrial;
      const better = readArm(trial, armWith({ rounds: 2 }));
      const worse = readArm(trial, armWith({ rounds: 4 }));
      const equalA = readArm(trial, armWith({ rounds: 3 }));
      const equalB = readArm(trial, armWith({ rounds: 3 }));
      const blind = readArm(trial, armWith({ rounds: 3, attributed: false }));
      assert.equal(better.measured, true);
      assert.equal(blind.measured, false, "an arm whose runs carry no attribution is unmeasurable");

      const rows = [
        [better, worse, PAIR_OUTCOMES.FAVOURABLE],
        [worse, better, PAIR_OUTCOMES.UNFAVOURABLE],
        [equalA, equalB, PAIR_OUTCOMES.TIE],
        [blind, better, PAIR_OUTCOMES.UNMEASURABLE],
        [better, blind, PAIR_OUTCOMES.UNMEASURABLE],
        [blind, blind, PAIR_OUTCOMES.UNMEASURABLE],
      ];
      for (const [a, b, expected] of rows) {
        const counted = countPair(a, b);
        assert.equal(counted.outcome, expected, `${a.value} vs ${b.value} is counted as ${expected}`);
      }
      // A tie is DISCARDED; an unmeasurable pair is in NEITHER total. The two are not
      // the same disposal, and that distinction is the point (ADR-002 §6).
      assert.equal(countPair(equalA, equalB).discarded, true);
      assert.equal(countPair(blind, blind).discarded, false);
      assert.equal(countPair(blind, blind).counted, false);
    },
  },
  {
    name: "61/04 task 03: an unmeasurable pair moves nothing",
    run: () => {
      const held = [PAIR_OUTCOMES.FAVOURABLE, PAIR_OUTCOMES.FAVOURABLE];
      const before = evaluateRun(held, shippedRule);
      const after = evaluateRun([...held, ...Array.from({ length: 3 }, () => PAIR_OUTCOMES.UNMEASURABLE)], shippedRule);
      assert.equal(after.wealth, before.wealth, "its wealth is unchanged from what it held before them");
      const blindOnly = evaluateRun(Array.from({ length: 4 }, () => PAIR_OUTCOMES.UNMEASURABLE), shippedRule);
      assert.equal(blindOnly.wealth, INITIAL_WEALTH);
      assert.equal(blindOnly.wins, 0, "its favourable total is zero");
      assert.equal(blindOnly.ties, 0, "…and its tie total is zero");
      assert.equal(blindOnly.unmeasurable, 4, "the unmeasurable pairs are reported with their own count");
      assert.equal(after.unmeasurable, 3);
    },
  },
  {
    name: "61/04 task 03: a population that cannot be measured is reported as such, not as zero evidence",
    run: () => {
      // Recorded runs, none of which carries the attribution the declared metric needs —
      // which is HEAD exactly: `sessionId` null in 61 of 61 records.
      const arms = [armWith({ rounds: 3, attributed: false, ref: "a" }), armWith({ rounds: 2, attributed: false, ref: "b" })];
      const population = metricPopulation(shippedTrial, arms);
      assert.equal(population.measurable, false, "it reports every arm as unmeasurable");
      assert.equal(population.unmeasurableArms, arms.length);
      assert.equal(population.measuredArms, 0);
      assert.deepEqual([...population.refusals], [METRIC_UNMEASURABLE]);
      assert.equal(population.unableToRead.pointer, shipped.metric, "it names the reading it was unable to take");
      assert.deepEqual([...population.unableToRead.reasons], ["run-attribution-absent"]);
      // NOT ZERO. A count of zero favourable pairs would say a comparison was made and
      // came out even.
      assert.equal(population.favourablePairs, null, "it does not report zero favourable pairs as though a comparison had been made");
      assert.notEqual(population.favourablePairs, 0);
    },
  },
  {
    name: "61/04 task 03: swapping the declared metric changes what the same two arms mean",
    run: () => {
      // TWO ARMS WHOSE RECORDED OUTCOMES ARE FIXED. Arm A took three attributed rounds
      // and needed no intervention; arm B took two, one of them a retry.
      const armA = armWith({ rounds: 3, ref: "arm-a" });
      const armB = armWith({ rounds: 2, retries: 1, ref: "arm-b" });

      const byRounds = trialOn("roundsToAccept");
      const byInterventions = trialOn("countInterventions");
      assert.notEqual(byRounds.criterion.metric, byInterventions.criterion.metric, "two criteria differing only in the metric they declare");
      assert.equal(byRounds.criterion.counter, byInterventions.criterion.counter);

      const underRounds = countPair(readArm(byRounds, armA), readArm(byRounds, armB));
      const underInterventions = countPair(readArm(byInterventions, armA), readArm(byInterventions, armB));
      assert.equal(underRounds.outcome, PAIR_OUTCOMES.UNFAVOURABLE);
      assert.equal(underInterventions.outcome, PAIR_OUTCOMES.FAVOURABLE);
      assert.notEqual(underRounds.outcome, underInterventions.outcome, "the two criteria may count the same pair differently");
      // NEITHER RESULT REQUIRED THE ARMS TO BE RE-RECORDED: both readings were taken off
      // the same two record sets, untouched.
      assert.deepEqual(armA, armWith({ rounds: 3, ref: "arm-a" }));
      assert.deepEqual(armB, armWith({ rounds: 2, retries: 1, ref: "arm-b" }));
    },
  },
  {
    name: "61/04 task 03: a ruling carries the counter-metric reading beside the trial result",
    run: () => {
      const counter = shippedTrial.counter.resolve;
      // The counter-metric reads WORSE after the change than before: one escape where
      // there had been none.
      const item = (escapes) => [{
        ref: "61/04",
        status: "done",
        acceptedAt: "2026-08-01",
        feedbackRecords: [
          { kind: "raw", id: "before", at: "2026-07-01" },
          ...Array.from({ length: escapes }, (_, index) => ({ kind: "raw", id: `after-${index}`, at: "2026-08-05" })),
        ],
      }];
      const movement = counterMetricMovement(counter(item(0)), counter(item(1)));
      assert.equal(movement.measured, true);
      assert.equal(movement.direction, "worse", "the ruling reports the direction it moved");
      assert.equal(movement.before, 0);
      assert.equal(movement.after, 1, "…and the counter-metric reading itself");

      // PRESENT WHETHER OR NOT THE TRIAL RESULT WAS FAVOURABLE. Both rulings carry it,
      // and a ruling without it cannot be constructed at all.
      const favourable = ruling({ ledger: Array.from({ length: 8 }, () => PAIR_OUTCOMES.FAVOURABLE), counterMetric: movement, verdict: "commit" });
      const unfavourable = ruling({ ledger: [PAIR_OUTCOMES.UNFAVOURABLE], counterMetric: movement, verdict: "report-only" });
      for (const record of [favourable, unfavourable]) {
        assert.equal(record.counterMetric.direction, "worse");
        assert.equal(record.counterMetric.after, 1);
      }
      assert.notEqual(favourable.verdict, unfavourable.verdict, "…across a favourable and an unfavourable trial result alike");
    },
  },
  {
    name: "61/04 task 03: the first ruling records the tie rate that was observed",
    run: () => {
      const declared = shipped.tieRate;
      assert.deepEqual({ ...declared }, { n: 1, d: 2 }, "a criterion declaring an assumed tie rate");
      // The first ruling's own sequence is the record of what was observed: three
      // pairs, one of them a tie.
      const first = ruling({ ledger: [PAIR_OUTCOMES.FAVOURABLE, PAIR_OUTCOMES.TIE, PAIR_OUTCOMES.UNFAVOURABLE] });
      const firstOnly = accrue({ rulings: [first], rule: shippedRule });
      assert.equal(firstOnly.tieRate.first.rate, 1 / 3, "the ruling records the tie rate actually observed");
      assert.equal(firstOnly.tieRate.first.ties, 1);
      assert.equal(firstOnly.tieRate.first.compared, 3);

      // THEREAFTER the declared rate is reported BESIDE the observed one — never
      // silently replaced by it and never left standing alone.
      const later = accrue({ rulings: [first, ruling({ ledger: [PAIR_OUTCOMES.TIE] })], rule: shippedRule });
      assert.deepEqual({ ...later.tieRate.declared }, { n: 1, d: 2 }, "the declared rate is reported beside the observed one");
      assert.equal(later.tieRate.observed.rate, 2 / 4);
      assert.equal(later.tieRate.first.rate, 1 / 3, "…and the first ruling's observed rate is still the first ruling's");
    },
  },

  // ─── tasks/04 — one threshold, many baskets ─────────────────────────────────────────

  {
    name: "61/04 task 04: each knob's basket is computed from its own trial unit (3 Examples rows)",
    run: () => {
      assert.equal(shipped.B, 11, "a criterion budgeting 11 pairs");
      assert.deepEqual({ ...shipped.tieRate }, { n: 1, d: 2 }, "…assuming half its pairs tie");
      assert.equal(shipped.trialCeilingUsd, 1500, "…and capping a trial at 1500");
      // | unit | mean | basket | verdict |
      const rows = [
        [REVIEW_ROUND, 247, true],
        [TASK_BUILD, 1004, true],
        [MILESTONE_BUILD, 6041, false],
      ];
      for (const [trialUnit, dollars, admitted] of rows) {
        const basket = basketFor({ key: `knob:${trialUnit.unit}`, trialUnit }, shipped);
        assert.equal(basket.rawPairs, 22, `${trialUnit.unit}: 22 raw pairs are to be collected`);
        assert.equal(basket.dollars, dollars, `${trialUnit.unit}: the basket is ${dollars}`);
        assert.equal(basket.admitted, admitted, `${trialUnit.unit}: admitted is ${admitted}`);
        assert.equal(basket.accrues, admitted, `${trialUnit.unit}: ${admitted ? "accrues against the crossing" : "accrues nothing"}`);
        assert.equal(basket.refusal, admitted ? null : TRIAL_UNAFFORDABLE);
      }
    },
  },
  {
    name: "61/04 task 04: the tie rate moves the raw pairs and never the crossing (3 Examples rows)",
    run: () => {
      const crossings = crossingLattice(shipped).map((row) => row.record);
      // | ties | raw |
      const rows = [
        [{ n: 1, d: 2 }, 22],
        [{ n: 13, d: 20 }, 32],
        [{ n: 9508, d: 10000 }, 224],
      ];
      for (const [tieRate, raw] of rows) {
        const criterion = revising({ tieRate });
        assert.equal(rawPairsFor(criterion), raw, `${tieRate.n}/${tieRate.d}: ${raw} raw pairs must be collected`);
        assert.deepEqual(crossingLattice(criterion).map((row) => row.record), crossings, "the records at which the run would commit are unchanged");
      }
    },
  },
  {
    name: "61/04 task 04: a basket funds the budget, not the earliest crossing",
    run: () => {
      assert.equal(earliestCrossing(shipped).at, 8, "a criterion whose earliest crossing is eight pairs");
      assert.equal(shipped.B, 11, "…and whose budget is eleven");
      const basket = basketFor({ key: "k", trialUnit: REVIEW_ROUND }, shipped);
      assert.equal(basket.funds, 11, "it funds eleven pairs of discordant evidence");
      assert.notEqual(basket.funds, 8, "it does not fund only eight");
      // …and the raw pairs follow the budget, not the floor.
      assert.equal(basket.rawPairs, rawPairsFor(shipped));
      assert.notEqual(basket.rawPairs, rawPairsFor(revising({ B: earliestCrossing(shipped).at })));
    },
  },
  {
    name: "61/04 task 04: a basket prices both arms of the trial",
    run: () => {
      const basket = basketFor({ key: "k", trialUnit: TASK_BUILD }, shipped);
      assert.equal(basket.arms, TRIAL_ARMS);
      assert.equal(basket.usd, basket.rawPairs * TRIAL_ARMS * TASK_BUILD.meanUsd, "the basket is the raw pairs to be collected, times two arms, times that mean");
      assert.notEqual(basket.usd, basket.rawPairs * TASK_BUILD.meanUsd, "it is not the price of running one arm");
    },
  },
  {
    name: "61/04 task 04: the evidence required is the same for every knob whatever it costs",
    run: () => {
      const knobs = [REVIEW_ROUND, TASK_BUILD, MILESTONE_BUILD].map((trialUnit) => ({ key: `knob:${trialUnit.unit}`, trialUnit }));
      const required = commitRequirement(shipped);
      const baskets = knobs.map((knob) => basketFor(knob, shipped));
      for (const basket of baskets) {
        assert.deepEqual(commitRequirement(shipped).crossings.map((row) => row.record), required.crossings.map((row) => row.record), "each requires the same crossing records");
        assert.equal(basket.funds, required.budget, "each is funded for the same number of pairs");
        assert.equal(basket.rawPairs, baskets[0].rawPairs);
      }
      assert.equal(new Set(baskets.map((basket) => basket.usd)).size, knobs.length, "only their baskets differ");
    },
  },
  {
    name: "61/04 task 04: the spread between the cheapest and the dearest knob survives every assumption",
    run: () => {
      const knobs = [REVIEW_ROUND, TASK_BUILD, MILESTONE_BUILD].map((trialUnit) => ({ key: `knob:${trialUnit.unit}`, trialUnit }));
      const ratios = [];
      for (const B of [shipped.B, shipped.B * 2]) {
        for (const tieRate of [{ n: 1, d: 2 }, { n: 13, d: 20 }]) {
          // The ceiling is lifted so the dearest knob is still PRICED under every
          // assumption: the spread is a fact about unit means, not about admission.
          const criterion = revising({ B, tieRate, trialCeilingUsd: 1e9 });
          ratios.push(basketSpread(knobs, criterion).ratio);
        }
      }
      assert.equal(ratios.length, 4, "two different budgets and two different tie rates");
      const rounded = ratios.map((ratio) => ratio.toFixed(10));
      assert.equal(new Set(rounded).size, 1, `the ratio is the same in all four cases: ${rounded.join(", ")}`);
      assert.equal(ratios[0] > 24 && ratios[0] < 25, true, `that ratio is between twenty-four and twenty-five: ${ratios[0]}`);
      // …because it is a ratio of unit means: the raw pairs and the arms cancel.
      assert.ok(close(ratios[0], MILESTONE_BUILD.meanUsd / REVIEW_ROUND.meanUsd, 1e-9));
    },
  },
  {
    name: "61/04 task 04: the trial ceiling leaves margin for a worse tie rate than the one assumed",
    run: () => {
      assert.equal(shipped.trialCeilingUsd, 1500, "a criterion capping a trial at 1500");
      assert.deepEqual({ ...shipped.tieRate }, { n: 1, d: 2 }, "…and assuming half its pairs tie");
      const worse = revising({ tieRate: { n: 13, d: 20 } });
      const agentRound = [REVIEW_ROUND, TASK_BUILD].map((trialUnit) => basketFor({ key: `knob:${trialUnit.unit}`, trialUnit }, worse));
      for (const basket of agentRound) assert.equal(basket.admitted, true, `both agent-round knobs are still admitted: ${basket.trialUnit} at ${basket.dollars}`);
      const milestone = basketFor({ key: "knob:milestone", trialUnit: MILESTONE_BUILD }, worse);
      assert.equal(milestone.admitted, false, "the milestone-unit knob is still refused");
      // "…by about four times the cap." The multiple grows as the tie rate worsens —
      // 4.03x at the assumed 50%, 5.86x here — so what is asserted is the floor the
      // margin never falls below, and the observed multiple is reported with it.
      const multiple = milestone.usd / worse.trialCeilingUsd;
      assert.equal(multiple >= 4, true, `refused by about four times the cap: ${multiple.toFixed(2)}x`);
      assert.ok(close(basketFor({ key: "knob:milestone", trialUnit: MILESTONE_BUILD }, shipped).usd / shipped.trialCeilingUsd, 4.03, 0.01));
    },
  },
  {
    name: "61/04 task 04: an unaffordable knob stays on the report with its price",
    run: () => {
      const knob = { key: "knob:milestone", trialUnit: MILESTONE_BUILD };
      const report = knobReport(knob, { bounds, criterion: shipped });
      assert.equal(report.key, knob.key, "the knob is listed");
      assert.equal(report.basket.dollars, 6041, "it is reported with its computed basket");
      assert.equal(report.basket.ceilingUsd, 1500, "…and the ceiling it exceeded");
      assert.deepEqual([...report.refusals], [TRIAL_UNAFFORDABLE]);
      assert.equal(report.basket.accrues, false, "it contributes no pairs to any accrual");
      assert.match(report.message, /6041/u);
      assert.match(report.message, /1500/u);
    },
  },
  {
    name: "61/04 task 04: raising the ceiling above a basket admits the knob it had refused",
    run: () => {
      const knob = { key: "knob:milestone", trialUnit: MILESTONE_BUILD };
      const refused = basketFor(knob, shipped);
      assert.equal(refused.refusal, TRIAL_UNAFFORDABLE);
      const roomier = revising({ trialCeilingUsd: refused.usd + 1 });
      const admitted = basketFor(knob, roomier);
      assert.equal(admitted.refusal, null, "it is no longer refused on price");
      assert.equal(admitted.admitted, true);
      assert.equal(admitted.usd, refused.usd, "and its basket is unchanged");
      assert.equal(admitted.rawPairs, refused.rawPairs);
    },
  },
  {
    name: "61/04 task 04: a knob with no declared trial unit is refused rather than priced by default",
    run: () => {
      const basket = basketFor({ key: "knob:undeclared" }, shipped);
      assert.equal(basket.refusal, TRIAL_UNIT_UNDECLARED, "it is refused naming the missing trial unit");
      assert.match(basket.message, /trial unit/u);
      assert.equal(basket.meanUnitUsd, null, "no price is assumed on its behalf");
      assert.equal(basket.usd, null);
      assert.equal(basket.dollars, null);
      assert.equal(basket.accrues, false);
      // A declared unit with no price is the same refusal: a unit nobody priced is not
      // a unit.
      assert.equal(basketFor({ key: "k", trialUnit: { unit: "something" } }, shipped).refusal, TRIAL_UNIT_UNDECLARED);
    },
  },

  // ─── the two states the rule may not confuse, asserted from the rule's side ──────────

  {
    name: "61/04 tasks 00/01: the commit predicate has one leg, and the two live states are never interchangeable",
    run: () => {
      // ONE LEG. Every record whose wealth clears the level commits, whatever its shape,
      // and no record whose wealth does not clear it commits, however clean.
      for (let losses = 0; losses <= 2; losses += 1) {
        for (let wins = 0; wins + losses <= shippedRule.budget; wins += 1) {
          const evaluation = evaluateRun({ wins, losses }, shippedRule);
          assert.equal(evaluation.commits, attained({ wins, losses }, shippedRule) >= commitLevel(shipped), `${wins}-${losses}: commit iff the wealth clears the level`);
        }
      }
      assert.equal(evaluateRun({ wins: 5, losses: 2 }, shippedRule).state, BUDGET_EXHAUSTED);
      assert.equal(evaluateRun({ wins: 7, losses: 1 }, shippedRule).state, EVIDENCE_SHORT);
      assert.equal(winMultiplier(shipped) * lossMultiplier(shipped) < 1, true, "a loss costs more than a win pays, which is why a record can run out of budget");
    },
  },
  {
    name: "61/04 task 02: a missing range probe is a refusal, never a default — the knob's own resolver is the only answer",
    run: () => {
      // ADR-009 §2: the range lives in each bound's own resolver, so this module is
      // handed the probe. Silently admitting everything when none arrives would make the
      // engine a second, permissive home for every range.
      for (const call of [
        () => readStep({ key: ORDERED_KNOB, from: 1, to: 2 }, {}),
        () => readStep({ key: ORDERED_KNOB, from: 1, to: 2 }, { bounds: { rangeProbe: bounds.rangeProbe } }),
        () => ladderPrice(ORDERED_KNOB, shipped, {}),
      ]) {
        const { refusal } = refusalFrom(call);
        assert.equal(refusal.code, RANGE_PROBE_MISSING);
      }
      // …and a proposed value the knob's own resolver will not return unchanged is
      // refused with that resolver's own code rather than this module's.
      const outside = readStep({ key: ORDERED_KNOB, from: 3, to: 4 }, { bounds });
      assert.equal(outside.accepted, false);
      assert.equal(outside.code, bounds.OUTSIDE_DECLARED_RANGE);
      assert.equal(readStep({ key: "work.nothing.atAll", from: 1, to: 2 }, { bounds }).code, bounds.NO_DECLARED_RANGE);
      // A rule cannot be derived from nothing either.
      assert.equal(refusalFrom(() => deriveRule(null)).refusal.code, "criterion-not-supplied");
    },
  },
];
