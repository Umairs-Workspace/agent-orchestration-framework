// Fitness function: acd-suite-registration-single-decider (milestone 72 / story 01, FF-7203;
// ADR-004 §4, ADR-002 §1c).
//
//   "Which suite file contributed which entries has ONE decider, and 72 does not author a second."
//
// Green on a suite nobody registered says nothing about CI. That is 59/FF-5903's finding, at the
// cost of twenty-six suites that were imported and never spread — on disk, passing when run by
// hand, invisible to every gate. A selection command makes that failure CHEAPER to reach, because
// it runs suite files by name and a file no runner assembles is exactly as runnable as one that is.
//
// The answer is not a new check. `registrationDecision` already decides it, once. A second
// derivation — a regex over an import line, a spread matcher, a fresh baseline of unregistered
// suites — is a second answer that agrees until the day someone changes the assembly and only one
// of the two notices.
//
// TWO ASSERTIONS, DELIBERATELY SEPARATE: by the IMPORT, so the reuse is real; and by the ABSENCE of
// the equivalent literals, so a re-home that reaches only one half is caught rather than passing on
// the strength of the surviving edge.
//
// AND THE REUSE CLAIM IS "IMPORTS THE DECIDER AND CALLS IT WITH WHAT IT WAS GIVEN" (ADR-002 §1c).
// `registrationDecision` needs a `Map<file, exported names>` whose only shipped producer is an
// `await import()` of every suite in the runner's own process — which ADR-001 §4 forbids this
// module from doing. So `assembled` and `suiteNames` are asserted to be INJECTED parameters and the
// module is asserted to produce neither, which is what makes the claim clearable by a module that
// cannot honestly produce provenance. Provenance is 72/02's.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { registrationDecision, runnerImportedSuites } from "../../../src/work-audit/census.mjs";
import { registrationReport } from "../../../src/work/test-select.mjs";
import { IMPORT_OF, SPREAD_ROW, bindingsOf, directoryCensus, readIndexes, registrationSurface } from "../../support/registration/registration-surface.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const CENSUS = "src/work-audit/census.mjs";
const REPORTER = "src/work/test-select.mjs";
const STORY_MODULES = Object.freeze([REPORTER, "src/graph-impact.mjs", "src/work/test-changed.mjs"]);

const sourceOf = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");
const modulesOf = (rels) => rels.map((rel) => ({ rel, code: sourceOf(rel) }));

// ── THE RE-DERIVATIONS THAT MUST NOT EXIST ───────────────────────────────────────────────────
//
// Each shape is named by WHAT IT DUPLICATES, because a finding that says only "a regex" leaves the
// reader to work out which shipped answer it is a second copy of.
const RE_DERIVATIONS = Object.freeze([
  {
    derivation: "a pattern over a suite import line",
    duplicates: "runnerImportedSuites (src/work-audit/census.mjs), which already reads which suite modules a runner's source names",
    test: (code) => /\.test\\\.mjs|from\\s\+"\(\[\^"\]\+\\\.test/u.test(code) || /matchAll\s*\(\s*\/[^/]*\\\.test\\\.mjs/u.test(code) || /\/[^/\n]*from[^/\n]*\\\.test\\\.mjs[^/\n]*\//u.test(code),
  },
  {
    derivation: "a matcher over a spread row",
    duplicates: "runCensus's never-spread derivation (src/work-audit/census.mjs), the text-level lane the decider deliberately sits above",
    test: (code) => /\\s\*\\\.\\\.\\\./u.test(code) || /\/\^[^/\n]*\\\.\\\.\\\./u.test(code),
  },
  {
    derivation: "a second baseline of unregistered suites",
    duplicates: "UNREGISTERED_BASELINE (src/work-audit/census.mjs), the shrink-only ledger with one home",
    test: (code) => /UNREGISTERED_BASELINE\s*=/u.test(code) || /\b(?:unregisteredBaseline|UNREGISTERED_SUITES)\s*=/u.test(code),
  },
  {
    derivation: "a second read of the assembled suite array",
    duplicates: "the assembled array the runner exports, which reaches this module as an injected parameter",
    test: (code) => /import\s*\{[^}]*\btests\b[^}]*\}\s*from\s+["'`][^"'`]*scripts\/test\.mjs/u.test(code) || /import\s*\(\s*["'`][^"'`]*scripts\/test\.mjs/u.test(code),
  },
]);

export function reDerivationProblems(modules) {
  const problems = [];
  for (const { rel, code } of modules) {
    const source = stripComments(code);
    for (const { derivation, duplicates, test } of RE_DERIVATIONS) {
      if (test(source)) problems.push(`${rel} holds ${derivation}, which duplicates ${duplicates}. There is one decider and 72 does not author a second.`);
    }
  }
  return problems;
}

// The parameter names a function destructures from its single options object, cut by matching
// parens — the language's own region rather than a character window.
export function destructuredParameters(code, header) {
  const source = stripComments(code);
  const start = source.indexOf(header);
  if (start < 0) return null;
  const params = matchedParenSpan(source, start);
  if (params == null) return null;
  const open = params.body.indexOf("{");
  const close = params.body.lastIndexOf("}");
  if (open < 0 || close < open) return null;
  return params.body
    .slice(open + 1, close)
    .split(",")
    .map((entry) => entry.split("=")[0].trim())
    .filter(Boolean);
}

export const archTests = [
  {
    name: "arch/72 FF-7203 (acd-suite-registration-single-decider): the registration decider is reached BY IMPORT from the shared census, and its inputs are injected rather than produced",
    run: () => {
      const source = stripComments(sourceOf(REPORTER));
      assert.ok(source.length > 200, `${REPORTER} was actually read (${source.length} bytes)`);

      assert.match(
        source,
        /import\s*\{[^}]*registrationDecision[^}]*\}\s*from\s+"(?:\.\.?\/)+work-audit\/census\.mjs"/u,
        "the decision comes from the shared census module, by import",
      );
      // …and the import is live, not decorative: the function this module calls IS the census's.
      assert.equal(typeof registrationDecision, "function", "the shared decider is importable");
      assert.match(source, /registrationDecision\s*\(/u, "…and it is called");

      // THE INPUTS ARE INJECTED. `suiteNames`'s only shipped producer imports every suite in the
      // runner's own process, which is exactly what this module may not do — so it accepts both
      // and produces neither, and the reuse claim stays clearable by a module that cannot honestly
      // produce provenance.
      const parameters = destructuredParameters(sourceOf(REPORTER), "export function registrationReport");
      assert.ok(Array.isArray(parameters), `the report's parameters were cut structurally: ${JSON.stringify(parameters)}`);
      for (const required of ["selected", "assembled", "suiteNames", "importedBy"]) {
        assert.ok(parameters.includes(required), `${required} is an INJECTED parameter — got ${parameters.join(", ")}`);
      }
      assert.doesNotMatch(source, /\bassembledSuite\s*\(/u, "…and the 3.5s child that would produce assembled membership is never called");
      assert.doesNotMatch(source, /\bimport\s*\(/u, "…nor is any suite dynamically imported to produce names");

      // The provenance helper the census owns is NAMED here rather than re-implemented, so a
      // future author looking for it finds the one that exists.
      assert.equal(typeof runnerImportedSuites, "function", `${CENSUS} owns runnerImportedSuites, the producer of the decider's classification input`);
    },
  },

  {
    name: "arch/72 FF-7203 (acd-suite-registration-single-decider): no second derivation of which file contributed which entries is authored anywhere in this story's modules",
    run: () => {
      const modules = modulesOf(STORY_MODULES);
      assert.equal(modules.length, STORY_MODULES.length, `every module this story adds was read: ${modules.map((module) => module.rel).join(", ")}`);
      const problems = reDerivationProblems(modules);
      assert.deepEqual(problems, [], `there is ONE decider:\n  ${problems.join("\n  ")}`);
    },
  },

  {
    name: "arch/72 FF-7203 (acd-suite-registration-single-decider): self-check — each planted re-derivation is reported by the file that holds it AND by what it duplicates, and with nothing planted none is found",
    run: () => {
      const planted = {
        "a pattern over a suite import line": 'const named = [...source.matchAll(/from\\s+"([^"]+\\.test\\.mjs)"/gu)].map((m) => m[1]);',
        "a matcher over a spread row": 'const spreads = lines.filter((line) => /^\\s*\\.\\.\\.[A-Za-z]/u.test(line));',
        "a second baseline of unregistered suites": 'const UNREGISTERED_BASELINE = [{ suite: "test/work/lifecycle/work-observe.test.mjs" }];',
        "a second read of the assembled suite array": 'import { tests } from "../scripts/test.mjs";',
      };

      for (const { derivation, duplicates } of RE_DERIVATIONS) {
        const problems = reDerivationProblems([{ rel: REPORTER, code: planted[derivation] }]);
        assert.ok(problems.length >= 1, `"${derivation}" planted in a module this story adds is reported`);
        assert.ok(problems.some((problem) => problem.includes(REPORTER)), `…by the file that holds it`);
        assert.ok(problems.some((problem) => problem.includes(duplicates.split(" (")[0])), `…and by what it duplicates: ${problems.join(" | ")}`);
      }

      assert.deepEqual(
        reDerivationProblems([{ rel: REPORTER, code: 'import { registrationDecision } from "./work-audit/census.mjs";\nexport function registrationReport(input) { return registrationDecision(input); }' }]),
        [],
        "with nothing planted none is found — and the honest shape, calling the decider with what it was given, is not itself the finding",
      );
    },
  },

  {
    name: "arch/72 FF-7203 (acd-suite-registration-single-decider): the unregistered report carries the DECIDER'S own verdict vocabulary, driven by planting a suite that is on disk and absent from the assembled array",
    run: () => {
      const planted = "test/planted-unregistered.test.mjs";

      // The census's own answer, obtained directly…
      const decision = registrationDecision({
        files: [planted],
        suiteNames: new Map([[planted, ["planted/one"]]]),
        assembled: new Set(["something else"]),
        baseline: [],
        importedBy: new Set(),
      });
      assert.equal(decision.findings.length, 1, "the census answers with one finding for the planted suite");

      // …and this story's report over the same inputs, which must carry it verbatim rather than a
      // re-phrasing of it.
      const report = registrationReport({
        selected: [planted],
        suiteNames: new Map([[planted, ["planted/one"]]]),
        assembled: new Set(["something else"]),
        baseline: [],
        importedBy: new Set(),
      });
      const entry = report.files[0];
      assert.equal(entry.registered, false, "the planted suite is reported unregistered");
      assert.equal(entry.code, decision.findings[0].code, "with the census's own code");
      assert.equal(entry.message, decision.findings[0].message, "…and the census's own message, verbatim");
      assert.deepEqual([...report.findings], [...decision.findings], "…and the findings pass through unaltered");

      // The classification input moves the LABEL and nothing else — the same distinction the
      // census draws, preserved rather than re-invented.
      const mentioned = registrationReport({
        selected: [planted],
        suiteNames: new Map([[planted, ["planted/one"]]]),
        assembled: new Set(["something else"]),
        baseline: [],
        importedBy: new Set([planted]),
      });
      assert.equal(mentioned.files[0].code, "audit-suite-imported-never-spread", "a suite the runner names is imported-never-spread");
      assert.notEqual(mentioned.files[0].code, entry.code, "…which is a different answer from one no runner mentions");
      assert.equal(mentioned.files[0].registered, false, "…and neither is registered");

      // …and a suite whose tests ARE assembled is registered, so the report distinguishes rather
      // than merely refusing.
      const green = registrationReport({
        selected: [planted],
        suiteNames: new Map([[planted, ["planted/one"]]]),
        assembled: new Set(["planted/one"]),
        baseline: [],
      });
      assert.equal(green.files[0].registered, true, "membership decides");
      assert.deepEqual([...green.unregistered], [], "…and nothing is reported against it");
    },
  },
];

// ── FF-11906 (119/ADR-010 §1-§4) — EXTENDS this control; it does not sit beside it. ─────────────
//
//   "The registry spreads one index per directory, and `registrationDecision` stays the SINGLE
//    decider of which file contributed which entries."
//
// WHY AN EXTENSION. The claim above is that no second answer to "which file contributed which
// entries" is authored. A per-directory index is a NEW SURFACE on which that question could be
// answered twice — an index deriving its own membership with `readdir` is exactly the re-derivation
// this file already forbids, one directory down. Same claim, new surface, so it belongs here rather
// than in a sibling (ADR-010 §2, and 119/03's own contract says so).
//
// EVERY LEG IS READ, NEVER EXECUTED: text from disk plus a set comparison between what the registry
// names and what the tree holds. Nothing imports a suite and nothing spawns.
// THE TWO SHAPES A REGISTRATION IS WRITTEN IN, imported rather than re-spelled. They lived here as
// local copies until 119/03's close, beside an identical pair in the registration-surface helper —
// which is one directory below the duplication this very control forbids, in the file that forbids
// it. `test/support/registration/registration-surface.mjs` owns them; this reads them.
//
// WHY THERE AND NOT `src/work-audit/census.mjs`, which has readers of its own: the census's
// `runnerBindings` filters to `.test.mjs` specifiers, because registration is the only question it
// asks. This control must see EVERY import — that is how it catches a registry naming a suite
// directly, or an index importing another directory's suite — so it needs the unfiltered shape.

/** THE SHIPPED DETECTOR. Pure over `{ registry, indexes, dirs, testUnit }`. */
// `test/integration/` is NOT part of the assembled suite and never was: it is a separate lane with
// its own entry point (`npm run test:smoke:cli`, `scripts/check.mjs`), so it owes no index. Declared
// here rather than skipped silently, because an undeclared skip is how a directory stops being
// metered. NOTE, recorded at 119/03 and not fixed here: widening the registration sweep to walk
// recursively surfaced `test/integration/cli-child-process.test.mjs`, which is imported by neither
// runner and by no index — green, red or deleted with identical effect on CI. It is a real orphan
// the old flat walk could not see, it is out of this claim's scope, and it is in the milestone STATE
// so it is scheduled rather than discovered again by whoever widens the next sweep.
const LANES_WITHOUT_AN_INDEX = new Set(["test/integration"]);

export function indexRegistryProblems({ registry, indexes, dirs, testUnit = null }) {
  const problems = [];
  const clean = (text) => stripComments(String(text ?? ""));

  const registrySource = clean(registry);
  const registrySpread = new Set([...registrySource.matchAll(SPREAD_ROW)].map((match) => match[1]));
  const reached = new Set();
  for (const match of registrySource.matchAll(IMPORT_OF)) {
    const specifier = match[2];
    if (specifier.endsWith(".test.mjs")) {
      problems.push(`the registry names a suite directly (${specifier}) — it names DIRECTORIES; a suite is registered in its own directory's index (ADR-010 §1)`);
      continue;
    }
    if (!specifier.endsWith("/index.mjs")) continue;
    reached.add(path.posix.normalize(path.posix.join("scripts", specifier)).replace(/\/index\.mjs$/u, ""));
    for (const binding of bindingsOf(match[1])) {
      if (!registrySpread.has(binding)) {
        problems.push(`the registry imports ${binding} from ${specifier} and never spreads it — the index is registered and contributes nothing, which is 59/FF-5903's own defect one level up`);
      }
    }
  }

  for (const [dir, counts] of dirs) {
    if (counts.suites > 0 && counts.indexes === 0 && !LANES_WITHOUT_AN_INDEX.has(dir)) problems.push(`${dir}/ holds ${counts.suites} suite(s) and carries no index.mjs — those suites reach no runner`);
    if (counts.indexes > 1) problems.push(`${dir}/ carries ${counts.indexes} indexes — two homes for one directory's membership`);
    if (counts.suites > 0 && counts.indexes > 0 && !reached.has(dir) && !LANES_WITHOUT_AN_INDEX.has(dir)) problems.push(`${dir}/ holds suites and its index is not reached by the registry`);
  }
  for (const dir of reached) {
    if (!dirs.has(dir) || dirs.get(dir).suites === 0) problems.push(`the registry reaches ${dir}/index.mjs and that directory holds no suite — an index that owns nothing`);
  }

  for (const index of indexes) {
    const source = clean(index.source);
    if (/\breaddir(?:Sync)?\s*\(/u.test(source)) {
      problems.push(`${index.rel} derives its membership with readdir — a SECOND decider beside registrationDecision (ADR-010 §3); an index is imported and spread, never computed`);
    }
    const spread = new Set([...source.matchAll(SPREAD_ROW)].map((match) => match[1]));
    for (const match of source.matchAll(IMPORT_OF)) {
      const specifier = match[2];
      if (!specifier.endsWith(".test.mjs")) continue;
      const owner = path.posix.dirname(path.posix.normalize(path.posix.join(index.dir, specifier)));
      if (owner !== index.dir) {
        problems.push(`${index.rel} imports ${specifier}, which lives in ${owner}/ — one directory's suites spread by another's index, so the same entries are assembled twice or under two owners`);
      }
      for (const binding of bindingsOf(match[1])) {
        if (!spread.has(binding)) problems.push(`${index.rel} imports ${binding} from ${specifier} and never spreads it — the suite looks registered and executes nothing`);
      }
    }
  }

  if (testUnit != null) {
    for (const match of clean(testUnit).matchAll(IMPORT_OF)) {
      if (match[2].endsWith("/index.mjs")) {
        problems.push(`scripts/test-unit.mjs imports ${match[2]} — TECH_DEBT item 71's second registration home must not become a second INDEX, or its lane stops being a hand-listed subset of what CI assembles (ADR-010 §4)`);
      }
    }
  }
  return problems;
}

archTests.push(
  {
    name: "arch/119 FF-11906: the registry spreads one index per directory, and every directory holding a suite is reached exactly once",
    run: async () => {
      const registry = readFileSync(path.join(repoRoot, "scripts", "test.mjs"), "utf8");
      const indexes = await readIndexes(repoRoot);
      const dirs = await directoryCensus(repoRoot);
      const testUnit = readFileSync(path.join(repoRoot, "scripts", "test-unit.mjs"), "utf8");

      // NON-VACUITY FIRST: a claim over no indexes is the empty-set pass this milestone refuses.
      assert.ok(indexes.length >= 40, `the indexes were really read: ${indexes.length}`);
      assert.ok(dirs.size >= 40, `the tree was really walked: ${dirs.size} directories hold a suite or an index`);

      assert.deepEqual(indexRegistryProblems({ registry, indexes, dirs, testUnit }), []);
    },
  },

  {
    name: "arch/119 FF-11906: the registry no longer grows a line per suite, and names no suite directly",
    run: () => {
      const registry = readFileSync(path.join(repoRoot, "scripts", "test.mjs"), "utf8");
      const suiteSpecifiers = [...stripComments(registry).matchAll(IMPORT_OF)].filter((match) => match[2].endsWith(".test.mjs"));
      assert.deepEqual(suiteSpecifiers.map((match) => match[2]), [], "the registry names directories, not suites");
      assert.ok(
        registry.split(/\r?\n/).length < 1000,
        `the registry stopped growing a line per suite: ${registry.split(/\r?\n/).length} lines, where 1,033 imports and 1,033 spreads made 5,193`,
      );
    },
  },

  {
    name: "arch/119 FF-11906 red probes: each way of arriving at a second answer is reported by the SHIPPED detector",
    run: () => {
      const dirs = new Map([["test/alpha", { suites: 1, indexes: 1 }]]);
      const registry = 'import { tests as alphaTests } from "../test/alpha/index.mjs";\nexport const tests = [\n  ...alphaTests,\n];';
      const index = { rel: "test/alpha/index.mjs", dir: "test/alpha", source: 'import { aTests } from "./a.test.mjs";\nexport const tests = [\n  ...aTests,\n];' };

      // the clean shape is quiet in this same lane, so a detector that always complains cannot pass for one that works
      assert.deepEqual(indexRegistryProblems({ registry, indexes: [index], dirs }), []);

      const probes = [
        ["an index derives its members with readdir", { ...index, source: index.source + '\nconst extra = await readdir("./");' }, /SECOND decider/u],
        ["an index imports a suite it does not spread", { ...index, source: 'import { aTests, bTests } from "./a.test.mjs";\nexport const tests = [\n  ...aTests,\n];' }, /never spreads it/u],
        ["one directory's index spreads another's suite", { ...index, source: 'import { aTests } from "../beta/a.test.mjs";\nexport const tests = [\n  ...aTests,\n];' }, /another's index/u],
      ];
      for (const [what, planted, shape] of probes) {
        const problems = indexRegistryProblems({ registry, indexes: [planted], dirs });
        assert.ok(problems.some((problem) => shape.test(problem)), `${what}: reported — got ${JSON.stringify(problems)}`);
      }

      // the registry naming a suite directly, and an index it imports but never spreads
      assert.ok(
        indexRegistryProblems({ registry: 'import { aTests } from "../test/alpha/a.test.mjs";', indexes: [index], dirs })
          .some((problem) => /names a suite directly/u.test(problem)),
        "the registry naming a suite directly is reported",
      );
      assert.ok(
        indexRegistryProblems({ registry: 'import { tests as alphaTests } from "../test/alpha/index.mjs";\nexport const tests = [\n];', indexes: [index], dirs })
          .some((problem) => /never spreads it/u.test(problem)),
        "an index imported and never spread is reported",
      );
      // a directory holding a suite with no index, and two indexes in one directory
      assert.ok(
        indexRegistryProblems({ registry, indexes: [index], dirs: new Map([...dirs, ["test/gamma", { suites: 2, indexes: 0 }]]) })
          .some((problem) => /carries no index\.mjs/u.test(problem)),
        "a directory holding suites with no index is reported",
      );
      assert.ok(
        indexRegistryProblems({ registry, indexes: [index], dirs: new Map([["test/alpha", { suites: 1, indexes: 2 }]]) })
          .some((problem) => /two homes for one directory's membership/u.test(problem)),
        "two indexes in one directory is reported",
      );
      // item 71's second home must not become a second INDEX
      assert.ok(
        indexRegistryProblems({ registry, indexes: [index], dirs, testUnit: 'import { tests as alphaTests } from "../test/alpha/index.mjs";' })
          .some((problem) => /item 71/u.test(problem)),
        "scripts/test-unit.mjs importing an index is reported",
      );
    },
  },

  {
    name: "arch/119 FF-11906: registrationDecision is still the ONLY answer, and no index re-derives it",
    run: async () => {
      // The extension inherits the claim above: the modules in this story's write set author no
      // second derivation. The indexes are DATA — imports and spreads — and are asserted to carry
      // no decision at all: no readdir, no filter over a spread row, no baseline of their own.
      const indexes = await readIndexes(repoRoot);
      const offenders = [];
      for (const index of indexes) {
        const source = stripComments(index.source);
        if (/\breaddir(?:Sync)?\s*\(/u.test(source)) offenders.push(`${index.rel}: readdir`);
        if (/UNREGISTERED_BASELINE|registrationDecision|runnerSpreadNames/u.test(source)) offenders.push(`${index.rel}: names the decider`);
        if (/\bfilter\s*\(/u.test(source)) offenders.push(`${index.rel}: filters its own membership`);
      }
      assert.deepEqual(offenders, [], "an index is imports and spreads and nothing else — the decision stays in one home");
      assert.ok(indexes.length >= 40, `…asserted over ${indexes.length} indexes, not over an empty set`);
    },
  },

  {
    name: "arch/119 FF-11906: scripts/test-unit.mjs is re-pointed and becomes nothing else",
    run: () => {
      const source = readFileSync(path.join(repoRoot, "scripts", "test-unit.mjs"), "utf8");
      const specifiers = [...stripComments(source).matchAll(IMPORT_OF)].map((match) => match[2]).filter((specifier) => specifier.includes("/test/"));
      assert.ok(specifiers.length >= 90, `its hand-listed suite imports are intact: ${specifiers.length}`);
      for (const specifier of specifiers) {
        assert.ok(specifier.endsWith(".test.mjs"), `${specifier}: names a suite, never an index`);
      }
      assert.equal(/export\s/u.test(stripComments(source)), false, "it still exports nothing");
    },
  },
);
