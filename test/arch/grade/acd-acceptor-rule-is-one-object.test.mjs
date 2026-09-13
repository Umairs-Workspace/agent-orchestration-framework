// FF-6101 (milestone 61 / ADR-001) — THE RULE IS ONE OBJECT AND ITS NUMBERS ARE DERIVED,
// NEVER TYPED.
//
// The whole defensibility of this rule is that there is one condition. Eight favourable
// pairs is not a second rule bolted onto the sequential test; it is the earliest
// crossing that test can reach. An engine that TYPES the number rather than deriving
// the crossings from its own inputs has broken that silently the first time either
// input is revised — so what this control checks is the DERIVATION, not the eight.
//
// WHICH FILES ARE "THE ENGINE", AND WHY THE CRITERION IS NOT ONE OF THEM.
// `src/work-acceptor/{rule,ledger}.mjs` COMPUTE; `criterion.mjs` DECLARES. A declared
// `alpha: 0.05` is the input whose revision this control exists to propagate, and
// banning it where it is declared would ban the criterion from having a value at all.
// A literal in the engine is the defect precisely because it SURVIVES that revision.
//
// THE LATTICE IS RE-DERIVED HERE FROM THE SHIPPED alpha/lambda rather than compared
// against a table of pair counts. `crossings[0].at === 8` would be a typed 8 living in
// the control instead of the engine — the same defect, one file over, and invisible.
// So the control solves `w * ln(1+lambda) - l * ln(1/(1-lambda)) >= ln(1/alpha)` itself
// and asserts the engine agrees; ADR-001 §1a's published rows are then checked against
// THAT derivation, so a change to lambda moves both together and the record's four rows
// are what fails if they ever stop following from the criterion.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { codeOnly } from "../run/acd-progress-ledger-consumed.test.mjs";
import { assertFamilyPurity } from "../../support/module-family.mjs";
import * as bounds from "../../../src/loop-bounds.mjs";
import { CriterionError, defaultCriterion, makeCriterion } from "../../../src/work-acceptor/criterion.mjs";
import {
  NOT_AN_ORDINAL_KNOB,
  crossingLattice,
  deriveRule,
  readStep,
} from "../../../src/work-acceptor/rule.mjs";
import {
  BUDGET_EXHAUSTED,
  EVIDENCE_SHORT,
  PAIR_OUTCOMES,
  attained,
  evaluateRun,
} from "../../../src/work-acceptor/ledger.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const ENGINE_MODULES = Object.freeze(["src/work-acceptor/rule.mjs", "src/work-acceptor/ledger.mjs"]);

const engineSources = async () => Promise.all(
  ENGINE_MODULES.map(async (rel) => ({ rel, code: await readFile(path.join(root, ...rel.split("/")), "utf8") })),
);

// Every numeric literal a module holds IN CODE. Comments and strings are stripped by the
// same reader 69's guard uses, so a number quoted in a message is not a claim.
export function numericLiterals(code) {
  return (codeOnly(code).match(/(?<![\w.$])\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/gu) ?? []).map(Number);
}

// PURE — sources in, the derived quantities in, findings out. Pure so the defect can be
// PLANTED rather than written into a real engine module to prove the sweep sees one.
export function typedQuantities(modules, forbidden) {
  return modules.flatMap(({ rel, code }) => numericLiterals(code)
    .filter((value) => forbidden.some((entry) => entry.value === value))
    .map((value) => {
      const entry = forbidden.find((candidate) => candidate.value === value);
      return `${rel} holds the literal ${value} — that is ${entry.what}, and a literal is a number that SURVIVES a revision of the criterion it should follow (61/ADR-001 §2).`;
    }));
}

// The control's OWN derivation of the crossing lattice, from first principles.
function derivedLattice(alpha, lambda, upTo) {
  const rows = [];
  for (let losses = 0; losses <= upTo; losses += 1) {
    const need = Math.log(1 / alpha) + losses * Math.log(1 / (1 - lambda));
    const wins = Math.ceil(need / Math.log(1 + lambda));
    rows.push({ losses, wins, at: wins + losses });
  }
  return rows;
}

const shipped = defaultCriterion();
const { N: _derived, ...shippedFields } = shipped;
const revising = (fields) => makeCriterion({ ...shippedFields, ...fields });

function refusalFrom(body) {
  try {
    body();
  } catch (error) {
    return error;
  }
  assert.fail("expected a refusal, and nothing was refused");
  return null;
}

export const archTests = [
  {
    name: "arch/61 FF-6101 the engine holds no threshold, multiplier, N or budget literal — and the sweep can see one that does",
    run: async () => {
      const modules = await engineSources();
      assert.equal(modules.length, 2, "both engine modules were read");
      const rule = deriveRule(shipped);
      // The four quantities ADR-001 §2 names, plus the budget, all taken from the
      // SHIPPED criterion so this list follows a revision instead of pinning one.
      const forbidden = [
        { value: rule.pairCount, what: "N, the earliest crossing" },
        { value: rule.win, what: "1 + lambda, the favourable multiplier" },
        { value: rule.level, what: "1 / alpha, the commit level" },
        { value: shipped.alpha, what: "alpha itself" },
        { value: rule.budget, what: "B, the declared pair budget" },
      ];
      assert.deepEqual([...new Set(forbidden.map((entry) => entry.value))].sort((a, b) => a - b), [0.05, 1.5, 8, 11, 20], "the forbidden set is the shipped criterion's own numbers");

      assert.deepEqual(typedQuantities(modules, forbidden), []);

      // NON-VACUITY, and the distinction. A typed threshold is reported; the same number
      // in a comment or a diagnostic message is not.
      const typed = [{ rel: "src/work-acceptor/planted.mjs", code: "const N = 8;\nif (wins >= N) commit();\n" }];
      assert.equal(typedQuantities(typed, forbidden).length, 1, "a typed pair count is a second home for a derived number");
      const quoted = [{ rel: "src/work-acceptor/planted.mjs", code: "// eight pairs, at 1.5 each\nthrow new Error(`8 pairs at 20`);\n" }];
      assert.deepEqual(typedQuantities(quoted, forbidden), [], "a number quoted in a diagnostic is not a claim");
    },
  },
  {
    name: "arch/61 FF-6101 the crossing lattice is derived from the shipped alpha/lambda, and ADR-001 §1a's rows follow from it",
    run: () => {
      const lattice = crossingLattice(shipped);
      const derived = derivedLattice(shipped.alpha, shipped.lambda, shipped.B);
      assert.deepEqual(
        lattice.map((row) => ({ losses: row.losses, wins: row.wins, at: row.at })),
        derived,
        "the engine's lattice is the one the arithmetic gives",
      );

      // ADR-001 §1a's four published rows, asserted against the DERIVATION rather than
      // typed here: the record and the engine follow one computation, or both fail.
      assert.deepEqual(derived.slice(0, 4).map((row) => [`${row.wins}-${row.losses}`, row.at]), [["8-0", 8], ["10-1", 11], ["11-2", 13], ["13-3", 16]]);
      const rule = deriveRule(shipped);
      for (const [row, expected] of [[derived[0], 25.63], [derived[1], 28.83], [derived[2], 21.62], [derived[3], 24.33]]) {
        assert.ok(Math.abs(attained(row, rule) - expected) < 0.005, `${row.wins}-${row.losses} attains ${attained(row, rule)}`);
      }

      // NO PATH CROSSES AT 9 OR 10 PAIRS. It is an absence in the derivation, not a rule.
      const crossesAt = new Set(derived.map((row) => row.at));
      assert.equal(crossesAt.has(9), false);
      assert.equal(crossesAt.has(10), false);

      // A CHANGE TO LAMBDA MOVES THE WHOLE LATTICE, so nothing above is a typed 8.
      const revised = crossingLattice(revising({ lambda: 0.75 }));
      assert.deepEqual(revised.slice(0, 2).map((row) => `${row.wins}-${row.losses}`), ["6-0", "8-1"]);
      assert.deepEqual(revised.slice(0, 2).map((row) => `${row.wins}-${row.losses}`), derivedLattice(shipped.alpha, 0.75, 1).map((row) => `${row.wins}-${row.losses}`));
    },
  },
  {
    name: "arch/61 FF-6101 lambda is refused outside (0,1), so the hard reset cannot arrive through the parameter",
    run: () => {
      for (const lambda of [1, 0, 1.5, -0.5, Number.NaN]) {
        const refusal = refusalFrom(() => revising({ lambda }));
        assert.ok(refusal instanceof CriterionError, `lambda ${lambda} is refused`);
        assert.equal(refusal.part, "lambda");
      }
      // `lambda = 1` is the one worth naming: it makes the loss multiplier zero and
      // annihilates wealth on a loss — the hard reset ADR-001 §3 rejects, admitted
      // through the parameter.
      assert.equal(1 - 1, 0, "the loss multiplier at lambda = 1");
      assert.equal(deriveRule(shipped).loss > 0, true, "…and the shipped one is not that");
    },
  },
  {
    name: "arch/61 FF-6101 a loss multiplies by (1 - lambda); no path resets the ledger or drops a proposal",
    run: async () => {
      const rule = deriveRule(shipped);
      // BEHAVIOURAL: over the whole reachable grid the attained wealth is exactly
      // `win^w * loss^l`, so no reset, floor or clamp is anywhere on the path.
      for (let losses = 0; losses <= rule.budget; losses += 1) {
        for (let wins = 0; wins + losses <= rule.budget; wins += 1) {
          const evaluation = evaluateRun({ wins, losses }, rule);
          assert.ok(Math.abs(evaluation.wealth - Math.pow(rule.win, wins) * Math.pow(rule.loss, losses)) < 1e-9, `${wins}-${losses}: the wealth carries`);
          assert.equal(evaluation.dropped, false, `${wins}-${losses}: the proposal is not dropped`);
          assert.equal(evaluation.wealth > 0, true, `${wins}-${losses}: a loss never zeroes it`);
        }
      }
      // STRUCTURAL: no assignment zeroes the wealth, and nothing filters a loss out.
      const [, ledger] = await engineSources();
      const code = codeOnly(ledger.code);
      assert.doesNotMatch(code, /\bwealth\s*=\s*0\b/u, "no code path resets the wealth to zero");
      assert.doesNotMatch(code, /\bwealth\s*=\s*INITIAL_WEALTH\b(?![\s\S]{0,40}let)/u, "…and none re-seeds it mid-run");
    },
  },
  {
    name: "arch/61 FF-6101 the commit predicate has exactly one leg, and all-favourable is spelled nowhere in the engine",
    run: async () => {
      const rule = deriveRule(shipped);
      // ONE LEG, over every reachable record: commit iff the wealth clears the level.
      // A second leg on the record's shape would show up as a record that attains the
      // level and does not commit.
      let clearing = 0;
      for (let losses = 0; losses <= rule.budget; losses += 1) {
        for (let wins = 0; wins + losses <= rule.budget; wins += 1) {
          const clears = attained({ wins, losses }, rule) >= rule.level;
          if (clears) clearing += 1;
          assert.equal(evaluateRun({ wins, losses }, rule).commits, clears, `${wins}-${losses}`);
        }
      }
      assert.ok(clearing > 1, `the grid actually contains crossing records: ${clearing}`);
      // THE RECORD THAT WOULD FAIL AN ALL-FAVOURABLE CONJUNCTION. 10-1 commits, which
      // is the promise ADR-001's correction restored; a conjunction would refuse it and
      // the surface would be promising a recovery the rule could never grant.
      assert.equal(evaluateRun({ wins: 10, losses: 1 }, rule).commits, true);
      assert.equal(evaluateRun({ wins: 10, losses: 1 }, rule).losses > 0, true);

      const modules = await engineSources();
      for (const { rel, code } of modules) {
        const source = codeOnly(code);
        assert.doesNotMatch(source, /\blosses\s*===?\s*0\b/u, `${rel} compares a loss count against zero`);
        assert.doesNotMatch(source, /\ballFavourable\b|\bunbroken\b|\bperfectRun\b/u, `${rel} spells an all-favourable requirement`);
      }
    },
  },
  {
    name: "arch/61 FF-6101 B is read from the criterion, refused below N, and budget-exhausted is never evidence-short",
    run: () => {
      const rule = deriveRule(shipped);
      assert.equal(rule.budget, shipped.B, "B is read from the criterion");
      const refusal = refusalFrom(() => revising({ B: rule.pairCount - 1 }));
      assert.equal(refusal.code, "criterion-budget-below-pair-count");
      assert.equal(refusal.budget, rule.pairCount - 1);
      assert.equal(refusal.pairCount, rule.pairCount);

      // PLANTED AT 5-2 WITH B = 11 (ADR-001 §3a). Once two pairs are lost the earliest
      // crossing lies at 13, beyond the budget, and nothing reachable inside it crosses.
      const spent = evaluateRun({ wins: 5, losses: 2 }, rule);
      assert.equal(spent.state, BUDGET_EXHAUSTED);
      assert.notEqual(spent.state, EVIDENCE_SHORT, "reporting it as short of evidence would be the machine lying about its own evidence");
      assert.equal(spent.nextCrossing.at, 13);
      assert.equal(spent.nextCrossing.at > rule.budget, true);
      // …and the two states are not interchangeable in the other direction either.
      assert.equal(evaluateRun({ wins: 7, losses: 1 }, rule).state, EVIDENCE_SHORT);
      assert.equal(evaluateRun({ wins: 7, losses: 1 }, rule).nextCrossing.at <= rule.budget, true);

      // A LARGER BUDGET MOVES THE ANSWER, so the state follows the criterion rather than
      // a remembered pair count.
      const roomier = deriveRule(revising({ B: 13 }));
      assert.equal(evaluateRun({ wins: 5, losses: 2 }, roomier).state, EVIDENCE_SHORT);
    },
  },
  {
    name: "arch/61 FF-6101 a two-key proposal is a coded refusal rather than a split, and a non-ordinal knob is refused by name",
    run: () => {
      const compound = readStep({ moves: [{ key: "a", from: 1, to: 2 }, { key: "b", from: 2, to: 3 }] }, { bounds });
      assert.equal(compound.accepted, false);
      assert.deepEqual([...compound.steps], [], "no step is produced for either key");
      assert.equal(compound.code, bounds.STEP_WOULD_BE_COMPOUND, "the code comes from the one home for that species (61/ADR-009 §4)");
      const unordered = readStep({ key: "models", from: { role: "a" }, to: { role: "b" } }, { bounds });
      assert.equal(unordered.code, NOT_AN_ORDINAL_KNOB);
      assert.notEqual(unordered.code, compound.code, "three different things to do about it, three different names");
    },
  },
  {
    name: "arch/61 FF-6101 the engine imports nothing, reads no clock, and derives no e-value in a second module",
    run: async () => {
      const modules = await engineSources();
      // PURITY IS EXTERNAL (119/ADR-002), and this is the ruling's own case live in the tree: both
      // engine modules sit inside `src/work-acceptor/`, and the token ban forbade the edge between
      // them. The family is the containment boundary and the two engine modules are the scope — the
      // directory's other four members open files, and no ADR ever claimed they were pure.
      await assertFamilyPurity(assert, root, "src/work-acceptor", { members: [...ENGINE_MODULES] });
      for (const { rel, code } of modules) {
        assert.doesNotMatch(code, /\brequire\s*\(/u, `${rel} requires nothing`);
        assert.doesNotMatch(codeOnly(code), /\bDate\.now\b|\bnew Date\b|\bperformance\.now\b|\bprocess\.hrtime\b/u, `${rel} reads no clock`);
        assert.doesNotMatch(codeOnly(code), /\breadFile\b|\bwriteFile\b|\bappendFile\b|\bspawn\b|\bexecFile\b/u, `${rel} touches no file`);
      }
      // ONE HOME FOR THE E-VALUE. A wealth product is an exponentiation over a win and a
      // loss count; the only module in `src/` that forms one is the arithmetic leaf.
      const derivers = [];
      for (const rel of await walk(path.join(root, "src"))) {
        const code = codeOnly(await readFile(path.join(root, rel), "utf8"));
        const exponentiates = /\bMath\.pow\s*\(/u.test(code) || /\*\*/u.test(code);
        const overPairs = /\b(?:wins|losses|favourable|unfavourable)\b/u.test(code);
        if (exponentiates && overPairs) derivers.push(rel);
      }
      assert.deepEqual(derivers, ["src/work-acceptor/ledger.mjs"], "no second module derives an e-value");
      // The sequence vocabulary is real, so the sweep above is not vacuous.
      assert.equal(PAIR_OUTCOMES.UNFAVOURABLE, "unfavourable");
    },
  },
];

async function walk(dir, prefix = "src") {
  const found = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) found.push(...await walk(path.join(dir, entry.name), `${prefix}/${entry.name}`));
    else if (entry.name.endsWith(".mjs")) found.push(`${prefix}/${entry.name}`);
  }
  return found;
}
