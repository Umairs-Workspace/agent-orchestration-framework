// FF-6103 (milestone 61 / ADR-003) — ONE THRESHOLD, MANY BASKETS, COMPUTED PER KNOB IN
// INTEGER ARITHMETIC.
//
// The same evidence costs wildly different money depending on what has to be re-run to
// produce one pair of it. Lowering the pair count for cheap knobs would buy
// affordability by weakening the guarantee exactly where evidence is cheapest, so the
// crossing records do not move. What moves is the BASKET: the pairs are the same, the
// unit they are collected in is not.
//
// THE INTEGER RULE HAS ALREADY BEEN BROKEN ONCE, IN A DOCUMENT ABOUT NUMERIC
// DISCIPLINE. SPIKE §Corrections: `8 / (1 - 0.90)` is 80 raw pairs, not 81 — the 81 was
// an IEEE-754 artefact. The artefact lives in the SUBTRACTION (`1 - 0.9` is
// 0.09999999999999998), and it recurs at `B = 11`: the float path yields 111 where the
// integer path yields 110. This control plants that exact case and asserts both halves —
// the engine's answer AND the float answer it must not give — so the rule is checked
// against the mistake it exists to prevent rather than against itself.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { codeOnly } from "../run/acd-progress-ledger-consumed.test.mjs";
import { functionBody } from "../../support/source-slice.mjs";
import { defaultCriterion, makeCriterion } from "../../../src/work-acceptor/criterion.mjs";
import {
  TRIAL_ARMS,
  TRIAL_UNAFFORDABLE,
  TRIAL_UNIT_UNDECLARED,
  basketFor,
  basketSpread,
  commitRequirement,
  crossingLattice,
  knobReport,
  rawPairsFor,
} from "../../../src/work-acceptor/rule.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RULE_MODULE = "src/work-acceptor/rule.mjs";

const shipped = defaultCriterion();
const { N: _derived, ...shippedFields } = shipped;
const revising = (fields) => makeCriterion({ ...shippedFields, ...fields });

// SPIKE §Lane B's unit means, handed in as data beside each knob (ADR-003 §3). They are
// the spike's measurements, not the engine's.
const UNITS = Object.freeze([
  { unit: "aof-qa review round", meanUsd: 5.61 },
  { unit: "aof-developer task build", meanUsd: 22.82 },
  { unit: "milestone build", meanUsd: 137.30 },
]);
const knobs = UNITS.map((trialUnit) => ({ key: `knob:${trialUnit.unit}`, trialUnit }));

// The control's OWN integer computation of the raw pairs, from first principles.
const rawPairsIndependently = (B, { n, d }) => Math.floor((B * d + (d - n) - 1) / (d - n));

export const archTests = [
  {
    name: "arch/61 FF-6103 every basket is the single expression of ADR-003 §2, recomputed independently",
    run: () => {
      for (const knob of knobs) {
        const basket = basketFor(knob, shipped);
        const expected = rawPairsIndependently(shipped.B, shipped.tieRate) * TRIAL_ARMS * knob.trialUnit.meanUsd;
        assert.equal(basket.rawPairs, rawPairsIndependently(shipped.B, shipped.tieRate), `${knob.key}: the raw pairs follow the budget and the declared rate`);
        assert.equal(basket.usd, expected, `${knob.key}: basket = raw pairs x 2 arms x the unit mean`);
        assert.equal(basket.arms, 2, "…and it prices BOTH arms, never one");
        assert.notEqual(basket.usd, basket.rawPairs * knob.trialUnit.meanUsd);
        // THE QUANTITY PURCHASED IS THE BUDGET, NEVER THE FLOOR. Funding only the
        // earliest crossing buys a trial that cannot reach its own second crossing.
        assert.equal(basket.funds, shipped.B);
        assert.notEqual(basket.funds, shipped.N);
      }
      // ADR-003 §3's published dollar column, to the nearest dollar.
      assert.deepEqual(knobs.map((knob) => basketFor(knob, shipped).dollars), [247, 1004, 6041]);
    },
  },
  {
    name: "arch/61 FF-6103 the pair count is integer arithmetic — the planted 90% case returns 110, not the 111 the float path gives",
    run: async () => {
      const ninety = revising({ tieRate: { n: 9, d: 10 } });
      assert.equal(rawPairsFor(ninety), 110, "the declared rational gives 110 raw pairs, exactly");
      // THE MISTAKE THIS RULE EXISTS TO PREVENT, computed here so the assertion above is
      // measured against it rather than against itself.
      assert.equal(Math.ceil(shipped.B / (1 - 0.9)), 111, "the float path yields 111 — the IEEE-754 artefact SPIKE §Corrections already hit once");
      assert.notEqual(rawPairsFor(ninety), Math.ceil(shipped.B / (1 - 0.9)));
      // The spike's own corrected row reproduces on the same path.
      assert.equal(rawPairsIndependently(8, { n: 9, d: 10 }), 80, "`8 / (1 - 0.90)` is 80 raw pairs, not 81");

      // Every declared rate ADR-003 §3 prices, and the two the criterion may carry.
      for (const [rate, raw] of [[{ n: 1, d: 2 }, 22], [{ n: 13, d: 20 }, 32], [{ n: 9508, d: 10000 }, 224]]) {
        assert.equal(rawPairsFor(revising({ tieRate: rate })), raw);
        assert.equal(rawPairsIndependently(shipped.B, rate), raw, "…and the control's own integer arithmetic agrees");
      }

      // STRUCTURAL: no float ever appears on the path from a declared rate to a pair
      // count. The function's own body is cut at the braces the language draws — never a
      // fixed window — and holds no decimal literal and no division by a rate.
      const source = await readFile(path.join(root, ...RULE_MODULE.split("/")), "utf8");
      const body = functionBody(codeOnly(source), "export function rawPairsFor(");
      assert.ok(body != null, "rawPairsFor's body was found; a renamed or moved declaration fails as NOT FOUND rather than as a false green");
      assert.doesNotMatch(body, /\d+\.\d/u, "no floating-point literal on the path");
      assert.doesNotMatch(body, /1\s*-\s*(?:rate|tieRate)/u, "no `1 - rate` subtraction, which is where the artefact lives");
      assert.match(body, /rate\.d\s*-\s*rate\.n/u, "the denominator is the integer difference of the declared terms");
    },
  },
  {
    name: "arch/61 FF-6103 no threshold or basket constant is applied across knobs — the evidence is one, the baskets are many",
    run: async () => {
      const required = commitRequirement(shipped);
      const baskets = knobs.map((knob) => basketFor(knob, shipped));
      for (const basket of baskets) {
        assert.equal(basket.rawPairs, baskets[0].rawPairs, "each knob collects the same evidence");
        assert.equal(basket.funds, required.budget, "…and is funded for the same number of pairs");
      }
      assert.equal(new Set(baskets.map((basket) => basket.usd)).size, knobs.length, "only their baskets differ");
      // …and the crossing records do not move with the tie rate either.
      const records = crossingLattice(shipped).map((row) => row.record);
      for (const rate of [{ n: 13, d: 20 }, { n: 9508, d: 10000 }]) {
        assert.deepEqual(crossingLattice(revising({ tieRate: rate })).map((row) => row.record), records);
      }
      // NO BASKET CONSTANT IN THE ENGINE: none of the three published dollar figures,
      // nor the raw pair count, is a literal anywhere in it.
      const source = codeOnly(await readFile(path.join(root, ...RULE_MODULE.split("/")), "utf8"));
      const numbers = (source.match(/(?<![\w.$])\d+(?:\.\d+)?/gu) ?? []).map(Number);
      for (const banned of [...baskets.map((basket) => basket.dollars), baskets[0].rawPairs, shipped.trialCeilingUsd, ...UNITS.map((unit) => unit.meanUsd)]) {
        assert.equal(numbers.includes(banned), false, `${RULE_MODULE} holds ${banned} as a literal`);
      }
    },
  },
  {
    name: "arch/61 FF-6103 the spread is a ratio of unit means, so it holds under any budget and any tie rate",
    run: () => {
      const ratios = [];
      for (const B of [shipped.B, shipped.B * 2, shipped.N]) {
        for (const tieRate of [{ n: 1, d: 2 }, { n: 13, d: 20 }, { n: 9508, d: 10000 }]) {
          ratios.push(basketSpread(knobs, revising({ B, tieRate, trialCeilingUsd: 1e9 })).ratio);
        }
      }
      assert.equal(new Set(ratios.map((ratio) => ratio.toFixed(10))).size, 1, `one ratio across every assumption: ${[...new Set(ratios)].join(", ")}`);
      assert.ok(Math.abs(ratios[0] - UNITS[2].meanUsd / UNITS[0].meanUsd) < 1e-9, "…because the raw pairs and the arms cancel");
      assert.equal(ratios[0] > 24 && ratios[0] < 25, true, `it reproduces the spike's independently measured 24.5x: ${ratios[0].toFixed(2)}`);
    },
  },
  {
    name: "arch/61 FF-6103 a knob above the ceiling is trial-unaffordable, accrues zero pairs, and stays on the surface with its price",
    run: () => {
      const dear = knobs[2];
      const basket = basketFor(dear, shipped);
      assert.equal(basket.refusal, TRIAL_UNAFFORDABLE);
      assert.equal(basket.admitted, false);
      assert.equal(basket.accrues, false, "it contributes ZERO pairs to any accrual");
      const report = knobReport(dear, { criterion: shipped });
      assert.equal(report.key, dear.key, "…and it is still listed");
      assert.equal(report.basket.dollars, basket.dollars, "with its computed basket");
      assert.equal(report.basket.ceilingUsd, shipped.trialCeilingUsd, "…and the ceiling it exceeded");
      assert.deepEqual([...report.refusals], [TRIAL_UNAFFORDABLE]);

      // THE REFUSAL FOLLOWS THE CEILING, not the knob: raise the ceiling above the
      // basket and the same knob is admitted, with its basket unchanged.
      const roomier = basketFor(dear, revising({ trialCeilingUsd: basket.usd + 1 }));
      assert.equal(roomier.refusal, null);
      assert.equal(roomier.usd, basket.usd);

      // A KNOB WITH NO TRIAL UNIT IS REFUSED RATHER THAN PRICED BY DEFAULT: a default
      // price is a number nobody chose standing in for one somebody must.
      const unpriced = basketFor({ key: "knob:undeclared" }, shipped);
      assert.equal(unpriced.refusal, TRIAL_UNIT_UNDECLARED);
      assert.equal(unpriced.usd, null);
      assert.equal(unpriced.meanUnitUsd, null);
      assert.equal(unpriced.accrues, false);
    },
  },
  {
    name: "arch/61 FF-6103 the ceiling holds its margin at a tie rate 15 points worse than the one assumed",
    run: () => {
      const worse = revising({ tieRate: { n: 13, d: 20 } });
      assert.equal(rawPairsFor(worse), 32);
      const [cheap, mid, dear] = knobs.map((knob) => basketFor(knob, worse));
      assert.equal(cheap.admitted, true, `the review-round knob stays admitted at ${cheap.dollars}`);
      assert.equal(mid.admitted, true, `the task-build knob stays admitted at ${mid.dollars}`);
      assert.equal(dear.admitted, false);
      // A ceiling that flipped a knob from admitted to refused on a small move in an
      // assumption already scheduled for replacement would be a ceiling that re-decides
      // itself (ADR-003 §4). It does not: the margin never falls below four times.
      assert.equal(dear.usd / worse.trialCeilingUsd >= 4, true, `refused by ${(dear.usd / worse.trialCeilingUsd).toFixed(2)}x the cap`);
      assert.ok(Math.abs(basketFor(knobs[2], shipped).usd / shipped.trialCeilingUsd - 4.03) < 0.01, "…and by 4.03x at the assumed rate");
    },
  },
];
