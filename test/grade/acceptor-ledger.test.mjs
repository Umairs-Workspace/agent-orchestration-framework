// Traceability: milestone 61 / story 04 — the rule and the ledger (the LEDGER half).
//
//   tasks/01_a-loss-carries-rather-than-resets.feature
//   tasks/05_the-ledger-accrues-across-epochs.feature
//
// Every scenario and every Examples row across the two is exercised here.
//
// THE SELECTION AND THE ARITHMETIC ARE COMPOSED HERE, NOT INSIDE EITHER LEAF. Which
// rulings are in force is `criterion.mjs`'s `rulingsUnderCurrentCriterion` (61/01,
// ADR-005 §1a); totalling them is `ledger.mjs`'s. The ledger never sees a digest, so a
// total spanning two criteria is not a path it refuses — it is one it cannot express
// (ADR-006 §4a). The scenarios that span a criterion change therefore drive the REAL
// pair, exactly as the command boundary will.
//
// AND EVERY RULING CARRIES THE DIGEST OBJECT, NOT A BARE STRING. `criterionDigest`
// returns per-member digests as well as the whole criterion's, and only the object form
// lets a reset name WHICH part moved; a ruling carrying only the string renders
// `member: "unknown"` (`criterion.mjs:511-513`). The obligation is 61/01's review's and
// it is discharged here, asserted rather than assumed.
import assert from "node:assert/strict";

import {
  accrualReport,
  criterionDigest,
  defaultCriterion,
  makeCriterion,
  rulingsUnderCurrentCriterion,
} from "../../src/work-acceptor/criterion.mjs";
import { PAIR_OUTCOMES, deriveRule, earliestCrossing } from "../../src/work-acceptor/rule.mjs";
import {
  BUDGET_EXHAUSTED,
  EVIDENCE_SHORT,
  INITIAL_WEALTH,
  LEDGER_INCOMPLETE,
  LedgerError,
  RULING_INCOMPLETE,
  RULING_KEYS,
  accrue,
  assembleLedger,
  attained,
  evaluateRun,
  makeRuling,
  observedTieRate,
  tally,
} from "../../src/work-acceptor/ledger.mjs";

const shipped = defaultCriterion();
const rule = deriveRule(shipped);
const { N: _derived, ...shippedFields } = shipped;

const W = PAIR_OUTCOMES.FAVOURABLE;
const L = PAIR_OUTCOMES.UNFAVOURABLE;
const T = PAIR_OUTCOMES.TIE;

const close = (actual, expected, tolerance = 0.005) => Math.abs(actual - expected) <= tolerance;

// A complete ruling — all thirteen frozen keys — carrying the DIGEST OBJECT.
function ruling(overrides = {}) {
  const criterion = overrides.underCriterion ?? shipped;
  const { underCriterion: _unused, ...rest } = overrides;
  return makeRuling({
    key: "work.loop.reviewRounds",
    from: 1,
    to: 2,
    epochId: "61",
    criterion: criterionDigest(criterion),
    ledger: [W],
    evalue: attained({ wins: 1, losses: 0 }, rule),
    counterMetric: { before: 0, after: 0, direction: "unchanged", measured: true },
    dwell: "cycles:2",
    dwellFrom: "61",
    provenance: "acceptor",
    verdict: "report-only",
    refusals: [],
    ...rest,
  });
}

// The phrase each Examples row names, and the frozen key(s) it stands for.
//
// "the dwell expiry" is read as the dwell DECLARATION and the epoch it started at,
// which is what the record actually holds. ADR-006 §3 and ADR-010 §5 ban a computed
// expiry by name — nothing in this system counts a cycle of the receiving loop, so
// converting one into a clock would be a fabricated conversion — so the row is
// discharged over `dwell` AND `dwellFrom`, and no `dwellExpiry` key exists to drop.
const MISSING_PART_ROWS = Object.freeze([
  ["the knob it names", ["key"]],
  ["the value it moved from", ["from"]],
  ["the value it moved to", ["to"]],
  ["the milestone it was rendered in", ["epochId"]],
  ["the criterion it was rendered under", ["criterion"]],
  ["the win, loss and tie sequence", ["ledger"]],
  ["the wealth it attained", ["evalue"]],
  ["the counter-metric reading", ["counterMetric"]],
  ["the dwell expiry", ["dwell", "dwellFrom"]],
  ["its provenance", ["provenance"]],
  ["its verdict", ["verdict"]],
  ["the refusals it reports", ["refusals"]],
]);

function refusalFrom(body) {
  try {
    body();
  } catch (error) {
    return error;
  }
  assert.fail("expected a refusal, and nothing was refused");
  return null;
}

export const acceptorLedgerTests = [
  // ─── tasks/01 — a loss carries rather than resets ───────────────────────────────────

  {
    name: "61/04 task 01: what a record of wins and losses does under the day-one budget (9 Examples rows)",
    run: () => {
      assert.equal(rule.level, 20, "a criterion whose commit level is 20");
      assert.equal(rule.win, 1.5, "…whose bet multiplies a win by 1.5");
      assert.equal(rule.budget, 11, "…and whose budget is 11");
      // | wins | losses | wealth | commits | state |
      const rows = [
        [8, 0, 25.63, true, null],
        [7, 1, 8.54, false, EVIDENCE_SHORT],
        [8, 1, 12.81, false, EVIDENCE_SHORT],
        [9, 1, 19.22, false, EVIDENCE_SHORT],
        [10, 1, 28.83, true, null],
        [0, 1, 0.50, false, EVIDENCE_SHORT],
        [5, 2, 1.90, false, BUDGET_EXHAUSTED],
        [0, 2, 0.25, false, BUDGET_EXHAUSTED],
        [9, 2, 9.61, false, BUDGET_EXHAUSTED],
      ];
      for (const [wins, losses, wealth, commits, state] of rows) {
        const evaluation = evaluateRun({ wins, losses }, rule);
        assert.ok(close(evaluation.wealth, wealth), `${wins}-${losses}: the attained wealth is approximately ${wealth}, got ${evaluation.wealth}`);
        assert.equal(evaluation.commits, commits, `${wins}-${losses}: whether it commits is ${commits ? "yes" : "no"}`);
        if (!commits) assert.equal(evaluation.state, state, `${wins}-${losses}: its reported state is ${state}`);
        else assert.equal(evaluation.verdict, "commit", `${wins}-${losses}: it commits, so no refusal state is reported`);
      }
    },
  },
  {
    name: "61/04 task 01: a loss leaves the pairs already won in place",
    run: () => {
      const before = [W, W, W, W];
      const after = evaluateRun([...before, L], rule);
      assert.equal(after.wins, 4, "the run still reports four favourable pairs");
      assert.equal(after.losses, 1);
      // A LOSS MULTIPLIES. It never resets, and there is no path here that zeroes it.
      assert.equal(after.wealth > 0, true, "its wealth is reported as a positive value rather than as nothing");
      assert.ok(close(after.wealth, attained({ wins: 4, losses: 0 }, rule) * rule.loss, 1e-9));
      assert.notEqual(after.wealth, 0);
      assert.notEqual(after.wealth, INITIAL_WEALTH, "…and not reset to what it started from either");
    },
  },
  {
    name: "61/04 task 01: a proposal one loss down is told exactly what would rescue it",
    run: () => {
      const evaluation = evaluateRun({ wins: 8, losses: 1 }, rule);
      assert.equal(evaluation.record, "8-1", "it reports the record as eight against one");
      assert.ok(close(evaluation.wealth, 12.81), "it reports the attained wealth…");
      assert.equal(evaluation.level, 20, "…against the commit level");
      assert.equal(evaluation.wealth < evaluation.level, true);
      assert.equal(evaluation.nextCrossing.record, "10-1", "it names ten favourable against one as the next record that would cross");
      assert.equal(evaluation.nextCrossing.at, 11, "…at eleven pairs");
      assert.equal(evaluation.winsStillNeeded, 2);
      assert.equal(evaluation.budgetRemaining, 2, "it reports how many pairs of the budget remain");
      assert.equal(evaluation.state, EVIDENCE_SHORT);
    },
  },
  {
    name: "61/04 task 01: a proposal the budget can no longer rescue says so by name",
    run: () => {
      assert.equal(rule.budget, 11, "a criterion whose budget is eleven pairs");
      const evaluation = evaluateRun({ wins: 5, losses: 2 }, rule);
      assert.equal(evaluation.state, BUDGET_EXHAUSTED, "the proposal is reported as budget-exhausted");
      assert.equal(evaluation.nextCrossing.record, "11-2", "it names eleven favourable against two as the record that would have crossed");
      assert.equal(evaluation.nextCrossing.at, 13, "…at thirteen pairs");
      assert.equal(evaluation.budget, 11, "it names the budget that ran out");
      assert.equal(evaluation.nextCrossing.at > evaluation.budget, true, "…and that record falls outside it");
      assert.notEqual(evaluation.state, EVIDENCE_SHORT, "it is not reported as short of evidence");
      assert.deepEqual([...evaluation.refusals], [BUDGET_EXHAUSTED]);
    },
  },
  {
    name: "61/04 task 01: short of evidence and out of budget are never interchangeable",
    run: () => {
      const reachable = evaluateRun({ wins: 7, losses: 1 }, rule);
      const spent = evaluateRun({ wins: 5, losses: 2 }, rule);
      assert.equal(reachable.recoverable, true, "one proposal still able to reach a crossing inside its budget");
      assert.equal(spent.recoverable, false, "one proposal for which no reachable record crosses");
      assert.notEqual(reachable.state, spent.state, "the two carry different states");
      assert.equal(reachable.state, EVIDENCE_SHORT);
      assert.equal(spent.state, BUDGET_EXHAUSTED);
      assert.equal(reachable.refusals.includes(BUDGET_EXHAUSTED), false, "neither is reported under the other's state");
      assert.equal(spent.refusals.includes(EVIDENCE_SHORT), false);
    },
  },
  {
    name: "61/04 task 01: a losing proposal is still a proposal",
    run: () => {
      const record = ruling({ ledger: [W, L, W] });
      const ledger = accrue({ rulings: [record], rule });
      assert.equal(ledger.total, 1, "the proposal is listed with its ledger");
      assert.deepEqual([...ledger.sequence], [W, L, W]);
      assert.equal(ledger.evaluation.dropped, false, "it is not reported as dropped");
      assert.equal(ledger.evaluation.losses, 1);
      assert.equal(ledger.rulings[0].key, record.key);
    },
  },
  {
    name: "61/04 task 01: the order pairs arrived in does not change what they attained",
    run: () => {
      const first = [W, W, L, W, W];
      const second = [L, W, W, W, W];
      const a = evaluateRun(first, rule);
      const b = evaluateRun(second, rule);
      assert.deepEqual({ wins: a.wins, losses: a.losses }, { wins: b.wins, losses: b.losses }, "two runs holding the same favourable and unfavourable pairs");
      assert.equal(a.wealth, b.wealth, "both attain the same wealth");
      assert.deepEqual([...a.admittedPairs], first, "each reports its own sequence in the order that sequence was recorded");
      assert.deepEqual([...b.admittedPairs], second);
      assert.notDeepEqual([...a.admittedPairs], [...b.admittedPairs]);
    },
  },
  {
    name: "61/04 task 01: a run that has lost every pair is reported, not deleted",
    run: () => {
      const evaluation = evaluateRun(Array.from({ length: 10 }, () => L), rule);
      assert.equal(evaluation.wealth > 0, true, "its wealth is reported as a positive value…");
      assert.equal(evaluation.wealth < rule.level, true, "…below the commit level");
      assert.ok(close(evaluation.wealth, Math.pow(rule.loss, 10), 1e-12));
      assert.equal(evaluation.state, BUDGET_EXHAUSTED, "it is reported as budget-exhausted");
      assert.equal(evaluation.dropped, false, "it is still listed rather than dropped");
      assert.equal(evaluation.losses, 10);
    },
  },
  {
    name: "61/04 task 01: nothing recorded is not the same as everything lost",
    run: () => {
      const nothing = evaluateRun({ wins: 0, losses: 0 }, rule);
      const lost = evaluateRun({ wins: 0, losses: 2 }, rule);
      assert.equal(nothing.wealth, INITIAL_WEALTH, "its wealth is reported as the level it started from");
      assert.equal(nothing.startedFrom, INITIAL_WEALTH);
      assert.equal(nothing.started, false);
      assert.equal(lost.started, true, "it is distinguished from a proposal that has recorded losses");
      assert.notEqual(nothing.wealth, lost.wealth);
      assert.notEqual(nothing.state, lost.state);
      assert.equal(nothing.losses, 0);
      assert.equal(lost.losses, 2);
    },
  },

  // ─── tasks/05 — the ledger accrues across epochs ────────────────────────────────────

  {
    name: "61/04 task 05: evidence recorded in earlier milestones counts in a later one",
    run: () => {
      const rulings = ["59", "60", "61"].map((epochId) => ruling({ epochId }));
      const ledger = accrue({ rulings, rule, open: "61" });
      assert.equal(ledger.total, 3, "it totals the rulings from all three");
      assert.equal(ledger.epochsCounted, 3);
      assert.deepEqual([...ledger.epochs], ["59", "60", "61"]);
      // NOT LIMITED TO THE MILESTONE CURRENTLY OPEN. An epoch-scoped counter could never
      // exceed one at this system's measured yield, so the acceptor could never fire.
      assert.equal(ledger.rulings.filter((entry) => entry.epochId === "61").length, 1);
      assert.equal(ledger.total > ledger.rulings.filter((entry) => entry.epochId === ledger.open).length, true, "it is not limited to the milestone currently open");
    },
  },
  {
    name: "61/04 task 05: the milestone is reported and is not a filter",
    run: () => {
      const rulings = ["59", "60", "61"].map((epochId) => ruling({ epochId }));
      for (const entry of accrue({ rulings, rule }).rulings) {
        assert.equal(typeof entry.epochId, "string", "each ruling names the milestone it was rendered in");
      }
      const totals = ["59", "60", "61", null].map((open) => accrue({ rulings, rule, open }).total);
      assert.deepEqual(totals, [3, 3, 3, 3], "the total is the same whichever milestone is open");
      // The open milestone is carried as provenance and consulted by nothing.
      assert.equal(accrue({ rulings, rule, open: "60" }).open, "60");
    },
  },
  {
    name: "61/04 task 05: a ledger that spans a criterion change totals only the run since the change (4 Examples rows)",
    run: () => {
      const earlier = makeCriterion({ ...shippedFields, lambda: 0.75 });
      const current = criterionDigest(shipped);
      // | before | after | counted |
      for (const [before, after, counted] of [[6, 2, 2], [6, 0, 0], [0, 8, 8], [9, 4, 4]]) {
        const rulings = [
          ...Array.from({ length: before }, () => ruling({ underCriterion: earlier })),
          ...Array.from({ length: after }, () => ruling()),
        ];
        // THE SELECTION IS ARITHMETIC, NOT A RULE SOMEBODY APPLIES: the total is the run
        // of rulings back to the last criterion change, so a straddling total is not
        // refused — it cannot be expressed.
        const selected = rulingsUnderCurrentCriterion(rulings, current);
        const ledger = accrue({ rulings: selected, rule });
        assert.equal(ledger.total, counted, `${before} before / ${after} after: the total counted is ${counted}`);
        const report = accrualReport({ rulings, criterion: shipped });
        assert.equal(report.counted, counted);
        if (before > 0) {
          assert.equal(report.criterionMoved, true, `${before} before / ${after} after: the report says the criterion moved`);
          // …and names WHICH member moved, because the ruling carries the digest OBJECT.
          assert.deepEqual(report.moved.map((entry) => entry.member), ["evidence-threshold"]);
          assert.equal(report.moved.some((entry) => entry.member === "unknown"), false, "a per-member digest was persisted, so the reset names the part that moved");
        }
      }
    },
  },
  {
    name: "61/04 task 05: a criterion that did not move is stated as unchanged rather than assumed",
    run: () => {
      const rulings = [ruling({ epochId: "60" }), ruling({ epochId: "61" })];
      const report = accrualReport({ rulings, criterion: shipped });
      assert.equal(report.criterionMoved, false, "the report states that the criterion was unchanged");
      assert.equal(report.state, "carried-forward");
      assert.equal(report.carriedForward, true, "the carried-forward total is reported alongside that statement");
      assert.deepEqual([...report.moved], []);
      assert.equal(report.counted, 2);
      assert.equal(accrue({ rulings: report.rulings, rule }).total, 2);
    },
  },
  {
    name: "61/04 task 05: a ruling missing any part of its record is refused when it is made (12 Examples rows)",
    run: () => {
      assert.equal(RULING_KEYS.length, 13, "the frozen key set");
      const covered = new Set(MISSING_PART_ROWS.flatMap(([, parts]) => parts));
      assert.deepEqual([...RULING_KEYS].filter((key) => !covered.has(key)), [], "every frozen key is named by a row");
      for (const [phrase, parts] of MISSING_PART_ROWS) {
        for (const part of parts) {
          const complete = { ...ruling() };
          delete complete[part];
          let produced = null;
          const refusal = refusalFrom(() => {
            produced = makeRuling(complete);
          });
          assert.equal(produced, null, `${phrase}: no ruling is produced with that part left blank`);
          assert.ok(refusal instanceof LedgerError);
          assert.equal(refusal.code, RULING_INCOMPLETE);
          assert.equal(refusal.part, part, `${phrase}: it is refused naming ${part}`);
          assert.match(refusal.message, new RegExp(part));
          // A key present and BLANK is the same refusal — a null in the record
          // justifying a configuration change is the missing "why".
          assert.equal(refusalFrom(() => makeRuling({ ...ruling(), [part]: null })).part, part);
        }
      }
    },
  },
  {
    name: "61/04 task 05: an incomplete ruling already recorded is refused at assembly too",
    run: () => {
      const recorded = { ...ruling() };
      delete recorded.counterMetric;
      const refusal = refusalFrom(() => assembleLedger([ruling(), recorded]));
      assert.ok(refusal instanceof LedgerError);
      assert.equal(refusal.code, LEDGER_INCOMPLETE);
      assert.equal(refusal.at, 1, "the assembly is refused naming that ruling");
      assert.equal(refusal.part, "counterMetric", "…and the missing part");
      assert.equal(refusal.ruling, recorded);
      // …and it is refused through the accrual too, so nothing renders it with a blank.
      assert.equal(refusalFrom(() => accrue({ rulings: [recorded], rule })).code, LEDGER_INCOMPLETE);
    },
  },
  {
    name: "61/04 task 05: the sequence is reported in the order it happened",
    run: () => {
      const alternating = [W, L, W, L, W, L];
      const ledger = accrue({ rulings: [ruling({ ledger: alternating })], rule });
      assert.deepEqual([...ledger.sequence], alternating, "the sequence is reported in the order it was recorded");
      const sorted = [...alternating].sort();
      assert.notDeepEqual([...ledger.sequence], sorted, "it is not reported sorted");
      assert.deepEqual([...tally(alternating).sequence], alternating);
      assert.deepEqual([...ledger.evaluation.admittedPairs], alternating);
    },
  },
  {
    name: "61/04 task 05: an accrual short of a crossing reports how short it is",
    run: () => {
      assert.equal(earliestCrossing(shipped).wins, 8, "a criterion whose earliest crossing is eight");
      const ledger = accrue({ rulings: [ruling({ ledger: [W, W, W, W] })], rule });
      assert.equal(ledger.held, 4, "it reports four pairs held…");
      assert.equal(ledger.crossesAt, 8, "…against the eight that would cross");
      assert.equal(ledger.budgetRemaining, 7, "it reports how many pairs of the budget remain");
      assert.equal(ledger.commits, false, "no commit is reported");
      assert.equal(ledger.evaluation.state, EVIDENCE_SHORT);
    },
  },
  {
    name: "61/04 task 05: an empty ledger totals nothing and says so",
    run: () => {
      const ledger = accrue({ rulings: [], rule });
      assert.equal(ledger.total, 0, "the total is zero");
      assert.equal(ledger.empty, true, "it is reported as an empty ledger…");
      assert.equal(ledger.read, true, "…rather than as a failure to read one");
      assert.deepEqual([...ledger.sequence], []);
      assert.equal(ledger.evaluation.wealth, INITIAL_WEALTH);
      assert.equal(ledger.tieRate.first, null);
    },
  },
  {
    name: "61/04 task 05: the answer does not depend on when it is asked",
    run: () => {
      const rulings = [ruling({ epochId: "60", ledger: [W, T] }), ruling({ epochId: "61", ledger: [W, L] })];
      const early = accrue({ rulings, rule, now: "2026-01-01T00:00:00.000Z" });
      const late = accrue({ rulings, rule, now: "2027-12-31T23:59:59.999Z" });
      assert.equal(early.total, late.total, "the totals are identical");
      assert.deepEqual({ wins: early.wins, losses: early.losses, ties: early.ties }, { wins: late.wins, losses: late.losses, ties: late.ties });
      assert.equal(early.evaluation.wealth, late.evaluation.wealth, "the totals do not change when the supplied moment changes");
      assert.notEqual(early.readAt, late.readAt, "…and the moment itself is recorded rather than consulted");
      assert.deepEqual({ ...early.tieRate.observed }, { ...late.tieRate.observed });
      assert.equal(observedTieRate(tally([W, T, L])).rate, 1 / 3);
    },
  },
];
