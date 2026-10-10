// FF-15302 — milestone 153 / ADR-002: "A labelled recurrence decision catches the junction pair and
// rejects held-out negatives without altering base ranking."
//
// The recurrence matcher (`packages/knowledge/src/memory/recurrence.mjs`) names a lesson as an earlier
// one again when its score is strictly above a threshold. A threshold is only a measurement if it was
// chosen against labelled evidence and can fail, so this control holds all of it:
//
//   (a) the labelled fixture is whole: every pair resolves to a lesson text it carries, the named
//       junction pair 45/R13 ↔ 68/R10 is labelled a recurrence in the TRAINING split, and the
//       fixture, the module and the shipped calibration agree on the version and the threshold;
//   (b) the confusion matrix recomputed from the SHIPPED matcher catches the named pair, has zero
//       false positives on both the training and the held-out split, and keeps its recorded recall;
//   (c) the control can fail — a threshold weakened to admit a held-out negative, a comparator that
//       reads equality as recurrence, and a cruder similarity each turn it red (the red probes
//       VERIFICATION records);
//   (d) base ranking is untouched: the matcher imports no retrieval code and retrieval imports no
//       matcher, so recurrence cannot reorder an ordinary recall.
//
// The fixture is self-contained text. Nothing here reads another item's records.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECURRENCE_CALIBRATION, evaluateRecurrence, recurrenceScore } from "../../../packages/knowledge/src/memory/recurrence.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FIXTURE = JSON.parse(readFileSync(path.join(REPO_ROOT, "test", "arch", "memory", "fixtures", "recurrence-pairs.json"), "utf8"));
const NAMED = { a: "45/R13", b: "68/R10" };

const textOf = (ref) => FIXTURE.lessons[ref]?.text ?? "";
const isNamed = (pair) => pair.a === NAMED.a && pair.b === NAMED.b;

// The decision the control judges, over the fixture, for a given similarity and comparator. The
// shipped pair is (recurrenceScore, strictly greater); the red probes swap one of them.
function judge({ score = recurrenceScore, threshold = RECURRENCE_CALIBRATION.threshold, qualifies = (value, limit) => value > limit } = {}) {
  const scored = FIXTURE.pairs.map((pair) => ({ ...pair, score: score(textOf(pair.a), textOf(pair.b)) }));
  const decided = scored.map((pair) => ({ ...pair, recurs: qualifies(pair.score, threshold) }));
  const by = (split) => decided.filter((pair) => split === "all" || pair.split === split);
  const matrix = (split) => {
    const pairs = by(split);
    const tp = pairs.filter((p) => p.label === "recurrence" && p.recurs).length;
    const fn = pairs.filter((p) => p.label === "recurrence" && !p.recurs).length;
    const fp = pairs.filter((p) => p.label === "distinct" && p.recurs).length;
    const tn = pairs.filter((p) => p.label === "distinct" && !p.recurs).length;
    return { tp, fn, fp, tn };
  };
  const violations = [];
  if (!decided.find(isNamed)?.recurs) violations.push("the named junction pair 45/R13 ↔ 68/R10 is not detected");
  for (const split of ["train", "held-out"]) {
    const { fp } = matrix(split);
    if (fp > 0) violations.push(`${fp} false positive(s) in the ${split} split: ${by(split).filter((p) => p.label === "distinct" && p.recurs).map((p) => `${p.a}|${p.b}`).join(", ")}`);
  }
  return { violations, matrix: { train: matrix("train"), "held-out": matrix("held-out"), all: matrix("all") }, decided };
}

export const archTests = [
  {
    name: "arch/FF-15302 (a): the labelled fixture is whole — every pair carries its texts, the named pair trains, and the version and threshold agree",
    run: () => {
      assert.equal(FIXTURE.calibration, RECURRENCE_CALIBRATION.version, "the fixture was measured for the shipped calibration version");
      assert.equal(FIXTURE.threshold, RECURRENCE_CALIBRATION.threshold, "the recorded threshold is the shipped one");
      assert.ok(RECURRENCE_CALIBRATION.threshold > 0 && RECURRENCE_CALIBRATION.threshold < 1);
      for (const pair of FIXTURE.pairs) {
        assert.ok(textOf(pair.a).length > 40 && textOf(pair.b).length > 40, `${pair.a}|${pair.b} carries both texts`);
        assert.ok(["recurrence", "distinct"].includes(pair.label) && ["train", "held-out"].includes(pair.split));
        assert.ok(pair.basis.length > 20, `${pair.a}|${pair.b} states the basis of its label`);
        assert.ok(FIXTURE.lessons[pair.a].source.includes("RETROSPECTIVE.md:"), "and cites the source passage of each side");
      }
      const named = FIXTURE.pairs.find(isNamed);
      assert.ok(named, "the named junction pair is in the fixture");
      assert.equal(named.label, "recurrence");
      assert.equal(named.split, "train");
      assert.equal(FIXTURE.lessons["45/R13"].kind, "mistake");
      assert.equal(FIXTURE.lessons["68/R10"].kind, "near-miss", "the pair crosses Kind");
      const held = FIXTURE.pairs.filter((p) => p.split === "held-out");
      assert.ok(held.filter((p) => p.label === "distinct").length >= 5, "the held-out split has negatives to fail on");
      assert.ok(FIXTURE.excluded.length > 0, "ambiguous labels are recorded as excluded, not forced");
      assert.equal(new Set(FIXTURE.pairs.map((p) => `${p.a}|${p.b}`)).size, FIXTURE.pairs.length, "no pair is labelled twice");
    },
  },
  {
    name: "arch/FF-15302 (b): the shipped matcher catches the named pair and has zero false positives on both the training and the held-out split",
    run: () => {
      const { violations, matrix } = judge();
      assert.deepEqual(violations, []);
      assert.equal(matrix.train.fp + matrix["held-out"].fp, 0);
      assert.ok(matrix.all.tp / (matrix.all.tp + matrix.all.fn) >= 0.5, `recall is kept at or above its recorded 0.53 (explicit self-reports that paraphrase an earlier lesson are largely missed — RESEARCH records which): ${JSON.stringify(matrix.all)}`);
      assert.ok(matrix["held-out"].tn >= 5, "the held-out negatives were actually decided");
    },
  },
  {
    name: "arch/FF-15302 (b): the decision the command makes is the decision the control judges — evaluateRecurrence agrees with the pair labels it was calibrated on",
    run: () => {
      const named = FIXTURE.pairs.find(isNamed);
      const asRecord = (ref) => ({ recordType: "lesson", item: ref.slice(0, ref.lastIndexOf("/")), id: ref.slice(ref.lastIndexOf("/") + 1), text: textOf(ref), kind: FIXTURE.lessons[ref].kind, title: FIXTURE.lessons[ref].title, source: FIXTURE.lessons[ref].source });
      const decision = evaluateRecurrence({ text: textOf(named.b), records: [asRecord(named.a), asRecord(named.b)], exclude: named.b });
      assert.equal(decision.qualifying, named.a);
      for (const pair of FIXTURE.pairs.filter((p) => p.label === "distinct")) {
        assert.equal(evaluateRecurrence({ text: textOf(pair.b), records: [asRecord(pair.a)] }).qualifying, null, `${pair.a} | ${pair.b}`);
      }
    },
  },
  {
    name: "arch/FF-15302 (c): RED PROBE — a threshold weakened to admit a held-out negative turns the control red",
    run: () => {
      const { decided } = judge();
      const highestHeldOutNegative = Math.max(...decided.filter((p) => p.split === "held-out" && p.label === "distinct").map((p) => p.score));
      const weakened = judge({ threshold: highestHeldOutNegative - 0.000001 });
      assert.ok(weakened.violations.some((message) => message.includes("held-out")), `weakened: ${weakened.violations.join(" | ")}`);
    },
  },
  {
    name: "arch/FF-15302 (c): RED PROBE — a comparator that reads equality as recurrence is caught at the boundary",
    run: () => {
      const named = judge().decided.find(isNamed);
      const atBoundary = judge({ threshold: named.score });
      assert.equal(atBoundary.decided.find(isNamed).recurs, false, "strictly greater: a score exactly at the threshold is not detected");
      assert.ok(atBoundary.violations.some((message) => message.includes("named junction pair")));
      const lenient = judge({ threshold: named.score, qualifies: (value, limit) => value >= limit });
      assert.equal(lenient.decided.find(isNamed).recurs, true, "the weakened comparator admits it");
    },
  },
  {
    name: "arch/FF-15302 (c): RED PROBE — a cruder similarity (plain word overlap) cannot hold the same threshold",
    run: () => {
      const words = (text) => new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
      const overlap = (a, b) => { const x = words(a); const y = words(b); let n = 0; for (const w of x) if (y.has(w)) n += 1; return (2 * n) / (x.size + y.size); };
      const crude = judge({ score: overlap });
      assert.ok(crude.violations.length > 0, "a plain Dice overlap fails the labelled set at the shipped threshold");
    },
  },
  {
    name: "arch/FF-15302 (d): the matcher and retrieval share no code, so recurrence cannot alter base ranking",
    run: () => {
      const read = (file) => readFileSync(path.join(REPO_ROOT, "packages", "knowledge", "src", "memory", file), "utf8");
      const imports = (code) => importSpecifiers(code).map((entry) => entry.specifier);
      assert.deepEqual(imports(read("recurrence.mjs")), [], "the matcher is pure: it imports nothing");
      for (const file of ["local-retrieval.mjs", "local-backend.mjs", "graphify-backend.mjs", "none-backend.mjs"]) {
        assert.ok(!imports(read(file)).some((spec) => spec.includes("recurrence")), `${file} does not import the matcher`);
      }
    },
  },
];
