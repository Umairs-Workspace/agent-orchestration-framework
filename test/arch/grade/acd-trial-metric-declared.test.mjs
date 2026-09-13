// FF-6102 (milestone 61 / ADR-002) — THE TRIAL METRIC IS DECLARED, RESOLVABLE AND
// SWAPPABLE, AND THE ENGINE NAMES NONE OF IT.
//
// The metric decides the tie rate, the tie rate decides the price of every trial, and
// the spread across plausible metrics is tenfold. A machinery that names its own metric
// hides that choice where nobody can revise it and makes the price of the choice
// invisible. So the criterion declares a POINTER and the engine resolves it through a
// registry DERIVED FROM CALLABLE RESOLVERS — 69/ADR-001's own rule for
// `LOOP_BOUND_CONFIG_RESOLVERS`, never a parallel allow-list that can name a metric
// nobody computes.
//
// WHERE A NAME MAY APPEAR, AND WHERE IT MAY NOT. The criterion's declared pointer is a
// STRING: it is the data an operator edits at a boundary, and it is what makes the
// metric swappable at all. What is banned is a name held in CODE — a comparison, a
// property access, a table keyed by it — because that is the engine knowing which
// metric it is scoring. The same code-only reading 69's guard uses draws that line, and
// it draws it here.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { codeOnly } from "../run/acd-progress-ledger-consumed.test.mjs";
import { assertFamilyPurity } from "../../support/module-family.mjs";
import * as workCounters from "../../../src/work/counters.mjs";
import { CriterionError, defaultCriterion, makeCriterion } from "../../../src/work-acceptor/criterion.mjs";
import {
  COUNTER_METRIC_UNRESOLVABLE,
  METRIC_UNMEASURABLE,
  METRIC_UNRESOLVABLE,
  PAIR_OUTCOMES as RULE_PAIR_OUTCOMES,
  countPair,
  deriveMetricRegistry,
  deriveRule,
  makeTrial,
  metricPopulation,
  parsePointer,
  readArm,
} from "../../../src/work-acceptor/rule.mjs";
import {
  PAIR_OUTCOMES as LEDGER_PAIR_OUTCOMES,
  evaluateRun,
} from "../../../src/work-acceptor/ledger.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COUNTERS_LEAF = "src/work/counters.mjs";
const ENGINE_MODULES = Object.freeze(["src/work-acceptor/rule.mjs", "src/work-acceptor/ledger.mjs"]);

const shipped = defaultCriterion();
const { N: _derived, ...shippedFields } = shipped;
const revising = (fields) => makeCriterion({ ...shippedFields, ...fields });
const registry = deriveMetricRegistry({ [COUNTERS_LEAF]: workCounters });

// Every module under `src/work-acceptor/`, read from disk rather than listed, so a
// module a later story adds is swept the day it appears.
async function acceptorModules() {
  const dir = path.join(root, "src", "work-acceptor");
  const modules = [];
  for (const name of (await readdir(dir)).sort()) {
    if (!name.endsWith(".mjs")) continue;
    modules.push({ rel: `src/work-acceptor/${name}`, code: await readFile(path.join(dir, name), "utf8") });
  }
  return modules;
}

// PURE — modules in, the declared metric symbols in, findings out. Pure so the defect
// can be PLANTED without writing a metric name into a real acceptor module.
export function spelledMetricNames(modules, symbols) {
  return modules.flatMap(({ rel, code }) => {
    const source = codeOnly(code);
    return symbols
      .filter((symbol) => new RegExp(`\\b${symbol}\\b`, "u").test(source))
      .map((symbol) => `${rel} spells ${JSON.stringify(symbol)} in CODE — the criterion holds the metric as a pointer and the engine resolves it, so a name held here is the engine knowing which metric it scores (61/ADR-002 §5).`);
  });
}

async function walk(dir, prefix = "src") {
  const found = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) found.push(...await walk(path.join(dir, entry.name), `${prefix}/${entry.name}`));
    else if (entry.name.endsWith(".mjs")) found.push(`${prefix}/${entry.name}`);
  }
  return found;
}

function refusalFrom(body) {
  try {
    body();
  } catch (error) {
    return error;
  }
  assert.fail("expected a refusal, and nothing was refused");
  return null;
}

const arm = ({ rounds = 1, attributed = true, ref = "61/04" } = {}) => [{
  ref,
  status: "done",
  acceptedAt: "2026-08-02T00:00:00.000Z",
  feedbackRecords: [],
  runs: Array.from({ length: rounds }, (_, index) => ({
    runId: `${ref}-${index}`,
    sessionId: attributed ? `session-${index}` : null,
    createdAt: "2026-08-01T00:00:00.000Z",
    state: "done",
  })),
}];

export const archTests = [
  {
    name: "arch/61 FF-6102 the registry is DERIVED from callable resolvers, and a pointer resolving to nothing is refused at construction",
    run: () => {
      // DERIVED, NOT DECLARED: only the callables of the namespace enter, so the
      // registry cannot name a metric nobody computes.
      const callables = Object.entries(workCounters).filter(([, value]) => typeof value === "function").map(([name]) => name);
      assert.ok(callables.length >= 4, `the counters leaf exports callables: ${callables.join(", ")}`);
      assert.deepEqual(Object.keys(registry).sort(), callables.map((name) => `module:${COUNTERS_LEAF}#${name}`).sort());
      // A non-callable export does NOT enter — `COUNTER_STATUS` and `LOWER_IS_BETTER`
      // are exported and are not resolvers.
      const notCallable = Object.entries(workCounters).filter(([, value]) => typeof value !== "function").map(([name]) => name);
      assert.ok(notCallable.length > 0, `the leaf also exports non-callables: ${notCallable.join(", ")}`);
      for (const name of notCallable) assert.equal(Object.hasOwn(registry, `module:${COUNTERS_LEAF}#${name}`), false, `${name} is not a resolver`);
      // …and a planted allow-list-shaped namespace of strings yields an EMPTY registry.
      assert.deepEqual(deriveMetricRegistry({ "src/planted.mjs": { roundsToAccept: "a name nobody computes" } }), {});

      // A POINTER NAMING A SYMBOL THAT DOES NOT EXIST is refused when the criterion is
      // built, not discovered at the moment a ruling was due.
      const metric = refusalFrom(() => makeTrial({ criterion: revising({ metric: `module:${COUNTERS_LEAF}#roundsToNowhere` }), registry }));
      assert.equal(metric.code, METRIC_UNRESOLVABLE);
      assert.match(metric.message, /roundsToNowhere/u);
      const counter = refusalFrom(() => makeTrial({ criterion: revising({ counter: `module:${COUNTERS_LEAF}#countNothing` }), registry }));
      assert.equal(counter.code, COUNTER_METRIC_UNRESOLVABLE);
      // A CRITERION WITH A METRIC AND NO COUNTER-METRIC IS REFUSED (ADR-002 §2).
      assert.equal(refusalFrom(() => revising({ counter: undefined })) instanceof CriterionError, true);
      assert.equal(refusalFrom(() => revising({ counter: "" })).part, "counter");
      // …and the SHIPPED criterion resolves, so none of the above is vacuous.
      const trial = makeTrial({ criterion: shipped, registry });
      assert.equal(typeof trial.metric.resolve, "function");
      assert.equal(typeof trial.counter.resolve, "function");
    },
  },
  {
    name: "arch/61 FF-6102 no acceptor module spells a metric name in code, and the engine holds no tie-rate literal",
    run: async () => {
      const modules = await acceptorModules();
      assert.ok(modules.length >= 5, `the acceptor surface was actually read: ${modules.length} modules`);
      const symbols = [shipped.metric, shipped.counter].map((pointer) => parsePointer(pointer).symbol);
      assert.deepEqual(symbols, ["roundsToAccept", "countFindingEscapes"]);

      assert.deepEqual(spelledMetricNames(modules, symbols), []);
      // NON-VACUITY, and the distinction itself: a name HELD in code is reported; the
      // same name inside the declared pointer string is not.
      const held = [{ rel: "src/work-acceptor/planted.mjs", code: `const reading = counters.${symbols[0]}(items);\n` }];
      assert.equal(spelledMetricNames(held, symbols).length, 1, "a metric named in code is the engine knowing its metric");
      const declared = [{ rel: "src/work-acceptor/planted.mjs", code: `metric: "module:${COUNTERS_LEAF}#${symbols[0]}",\n` }];
      assert.deepEqual(spelledMetricNames(declared, symbols), [], "a pointer is data an operator edits, not a name the engine holds");

      // NO TIE-RATE LITERAL IN THE ENGINE. The rate is DECLARED on the criterion as a
      // rational; the engine that prices a trial from it may hold no form of it.
      const declaredRate = shipped.tieRate;
      const forms = [declaredRate.n / declaredRate.d, (declaredRate.n / declaredRate.d) * 100];
      for (const rel of ENGINE_MODULES) {
        const source = codeOnly(await readFile(path.join(root, ...rel.split("/")), "utf8"));
        const numbers = (source.match(/(?<![\w.$])\d+(?:\.\d+)?/gu) ?? []).map(Number);
        for (const form of forms) assert.equal(numbers.includes(form), false, `${rel} holds the declared tie rate ${form} as a literal`);
      }
    },
  },
  {
    name: "arch/61 FF-6102 both pointers resolve into the SAME leaf, and no second deterministic-counter home exists in src/",
    run: async () => {
      const metric = parsePointer(shipped.metric);
      const counter = parsePointer(shipped.counter);
      assert.equal(metric.module, COUNTERS_LEAF, "the trial metric resolves into the counters leaf");
      assert.equal(counter.module, metric.module, "…and so does its paired counter-metric");

      // THE LEAF STILL IMPORTS NOTHING AND WRITES NOTHING (57/04's own discipline,
      // re-asserted from this milestone's side because 61/04 added a function to it).
      const leaf = await readFile(path.join(root, ...COUNTERS_LEAF.split("/")), "utf8");
      // The leaf depends on nothing outside itself, asserted over its FAMILY (119/ADR-002) so the
      // decomposition a growing leaf needs stays legal while every external dependency stays a
      // violation naming the file and the specifier.
      await assertFamilyPurity(assert, root, COUNTERS_LEAF);
      assert.doesNotMatch(leaf, /\b(?:readFile|writeFile|appendFile|execFile|spawn|process\.|Date\.now)\b/u, "…and writes nothing and reads no clock");
      assert.match(leaf, new RegExp(`export function ${metric.symbol}\\b`, "u"), "…and it is where the trial metric lives");

      // NO SECOND HOME: the modules exporting either pointed-at symbol are exactly one.
      const homes = [];
      for (const rel of await walk(path.join(root, "src"))) {
        const code = await readFile(path.join(root, rel), "utf8");
        if ([metric.symbol, counter.symbol].some((symbol) => new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let)\\s+${symbol}\\b`, "u").test(code))) homes.push(rel);
      }
      assert.deepEqual(homes, [COUNTERS_LEAF], "one deterministic-counter home, not two");
    },
  },
  {
    name: "arch/61 FF-6102 an unmeasurable arm is counted in neither total, and no path maps it to a tie or a favourable pair",
    run: () => {
      const trial = makeTrial({ criterion: shipped, registry });
      const measured = readArm(trial, arm({ rounds: 2 }));
      const blind = readArm(trial, arm({ rounds: 2, attributed: false }));
      assert.equal(measured.measured, true);
      assert.equal(blind.measured, false);
      assert.equal(blind.value, null, "an unmeasurable reading is null, never 0");

      for (const [a, b] of [[blind, measured], [measured, blind], [blind, blind]]) {
        const counted = countPair(a, b);
        assert.equal(counted.outcome, RULE_PAIR_OUTCOMES.UNMEASURABLE);
        assert.equal(counted.counted, false, "in neither total");
        assert.equal(counted.discarded, false, "…and not discarded as a tie either");
      }
      // A tie IS discarded, so the two dispositions are genuinely different code.
      assert.equal(countPair(measured, readArm(trial, arm({ rounds: 2, ref: "other" }))).outcome, RULE_PAIR_OUTCOMES.TIE);

      // BEHAVIOURAL, over the engine's own evaluation: adding unmeasurable pairs to any
      // record moves neither total nor the wealth, so no path folds one into either.
      const rule = deriveRule(shipped);
      const held = [RULE_PAIR_OUTCOMES.FAVOURABLE, RULE_PAIR_OUTCOMES.UNFAVOURABLE, RULE_PAIR_OUTCOMES.TIE];
      const before = evaluateRun(held, rule);
      const after = evaluateRun([...held, RULE_PAIR_OUTCOMES.UNMEASURABLE, RULE_PAIR_OUTCOMES.UNMEASURABLE], rule);
      assert.equal(after.wealth, before.wealth, "the wealth is unchanged");
      assert.equal(after.wins, before.wins, "the favourable total is unchanged");
      assert.equal(after.ties, before.ties, "the tie total is unchanged");
      assert.equal(after.unmeasurable, 2, "…and the unmeasurable pairs are reported with their own count");
      assert.equal(after.pairs, before.pairs, "and they cost no budget");

      const population = metricPopulation(trial, [arm({ rounds: 2, attributed: false }), arm({ rounds: 3, attributed: false })]);
      assert.deepEqual([...population.refusals], [METRIC_UNMEASURABLE]);
      assert.equal(population.favourablePairs, null, "a population nobody could read reports no favourable count, not zero");
      assert.equal(population.measurable, false);
    },
  },
  {
    name: "arch/61 FF-6102 the two zero-import leaves spell one pair vocabulary, and the control compares them rather than trusting them",
    run: () => {
      // `rule.mjs` and `ledger.mjs` cannot import each other (ADR-006 §4), so each holds
      // the four outcome words. The duplication is admitted and CHECKED, which is what
      // keeps it from becoming two vocabularies.
      assert.deepEqual({ ...RULE_PAIR_OUTCOMES }, { ...LEDGER_PAIR_OUTCOMES });
      assert.deepEqual(Object.keys(RULE_PAIR_OUTCOMES).sort(), ["FAVOURABLE", "TIE", "UNFAVOURABLE", "UNMEASURABLE"]);
      // …and the split holds in the other direction: the rule DERIVES the constants, the
      // ledger TOTALS a sequence, and neither exports the other's entry point.
      assert.equal(typeof deriveRule, "function");
      assert.equal(typeof evaluateRun, "function");
    },
  },
];
