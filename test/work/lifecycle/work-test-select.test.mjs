// Behavioural evidence for milestone 72 / story 01 — the selection.
//
//   tasks/00_an-unknown-widens-the-selection.feature
//   tasks/01_an-unregistered-suite-is-reported-not-silently-run.feature
//
// The census rows of both features — the routes to the graph that must not exist, the suppressing
// options that must not exist, and the second registration derivations that must not exist — are
// the controls', and live in `acd-test-selection-widens-never-narrows.test.mjs` and
// `acd-suite-registration-single-decider.test.mjs`.
//
// EVERY GRAPH HERE IS A REAL ARTIFACT ON DISK, written into a temp project root and read back
// through the shipped `normalizeGraph`. The alternative — handing the selector an
// already-normalized object — would drive the arithmetic and skip the two things most likely to be
// wrong: that the artifact is FOUND, and that an artifact which does not parse is an ANSWER rather
// than a crash. The git fixture is a real two-commit repository for the same reason.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { graphArtifactBuiltAt, graphJsonPath } from "../../../src/graph-normalize.mjs";
import {
  CHANGED_SET_EMPTY,
  SINCE_REV_UNRESOLVABLE,
  WIDENING_REASONS,
  isSuiteFile,
  registrationReport,
  selectSuites,
  wideningRuleProblems,
} from "../../../src/work/test-select.mjs";
import { changedFiles, parseNameOnly, parsePorcelain } from "../../../src/work/test-changed.mjs";

const ROOTS = ["test", "test/arch"];
const ALL_SUITES = ["test/a.test.mjs", "test/b.test.mjs", "test/arch/c.test.mjs"];

function tempRoot() {
  return mkdtempSync(path.join(os.tmpdir(), "aof-select-"));
}

// A raw NetworkX node_link_data artifact, written where the shipped reader looks for it. `links`,
// never `edges` — the key spelling the normalizer exists to police.
function writeGraph(root, { nodes = [], links = [] } = {}, raw = null) {
  mkdirSync(path.join(root, "graphify-out"), { recursive: true });
  const body = raw ?? JSON.stringify({
    directed: true,
    multigraph: false,
    graph: {},
    nodes: nodes.map((file, index) => ({ id: `n${index}`, label: file, source_file: file })),
    links,
  });
  writeFileSync(graphJsonPath(root), body);
  return graphJsonPath(root);
}

// An edge FROM the importer TO the imported, which is the direction `computeImpact` reads: an edge
// arriving at a node makes its source a DEPENDENT of that node's file.
const edge = (fromIndex, toIndex) => ({ source: `n${fromIndex}`, target: `n${toIndex}`, relation: "imports", confidence: "EXPLICIT" });

// The graph most rows want: `src/a.mjs` imported by `test/a.test.mjs`, and `src/lonely.mjs`
// imported only by another source module.
function couplingGraph(root) {
  return writeGraph(root, {
    nodes: ["src/a.mjs", "test/a.test.mjs", "src/lonely.mjs", "src/b.mjs", "test/arch/c.test.mjs"],
    links: [edge(1, 0), edge(3, 2), edge(4, 2)],
  });
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr ?? result.error?.message}`);
  return result.stdout;
}

// A REAL two-commit repository. The changed-set reader is the story's second deliverable and it
// reads git, so proving it against a parsed string would prove the parser and nothing else.
function gitFixture() {
  const root = tempRoot();
  git(["init", "--initial-branch=main"], root);
  git(["config", "user.email", "fixture@example.invalid"], root);
  git(["config", "user.name", "Fixture"], root);
  writeFileSync(path.join(root, "a.txt"), "one\n");
  git(["add", "a.txt"], root);
  git(["commit", "-m", "first"], root);
  writeFileSync(path.join(root, "b.txt"), "two\n");
  git(["add", "b.txt"], root);
  git(["commit", "-m", "second"], root);
  // …and an uncommitted change plus an untracked file, which is the state an inner loop is in.
  writeFileSync(path.join(root, "a.txt"), "one, edited\n");
  writeFileSync(path.join(root, "c.txt"), "three\n");
  return root;
}

export const workTestSelectTests = [
  // ── tasks/00 ────────────────────────────────────────────────────────────────────────────────
  {
    name: "72/01 task00: coupling the graph knows narrows the selection to the suites that can break",
    run: () => {
      const root = tempRoot();
      try {
        couplingGraph(root);
        const result = selectSuites({ projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS });
        assert.deepEqual([...result.selected], ["test/a.test.mjs"], "the selected suites are the suites among its dependents");
        assert.deepEqual([...result.widened], [], "the selection did not widen");
        assert.equal(result.scope, "impacted", "…so the scope is the impacted subset");
        assert.deepEqual(wideningRuleProblems(result, ALL_SUITES), [], "and the two-sided rule admits it");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/01 task00: each of the four unknowns widens to the whole suite and names the file that caused it",
    run: () => {
      const rows = [
        { state: "absent — no artifact on disk", reason: "no-graph", plant: () => {} },
        { state: "an artifact holding no node for that file", reason: "not-in-graph", plant: (root) => writeGraph(root, { nodes: ["src/other.mjs"], links: [] }) },
        {
          state: "an artifact whose dependents for it hold no suite",
          reason: "no-registered-dependent",
          plant: (root) => writeGraph(root, { nodes: ["src/lonely.mjs", "src/b.mjs"], links: [edge(1, 0)] }),
          changed: "src/lonely.mjs",
        },
        { state: "an artifact on disk that does not parse", reason: "graph-unreadable", plant: (root) => writeGraph(root, {}, "{ this is not json") },
      ];

      for (const row of rows) {
        const root = tempRoot();
        try {
          row.plant(root);
          const changed = row.changed ?? "src/a.mjs";
          const result = selectSuites({ projectRoot: root, changed: [changed], allSuites: ALL_SUITES, roots: ROOTS });

          assert.equal(result.scope, "all", `${row.state}: the whole suite is selected`);
          assert.deepEqual([...result.selected].sort(), [...ALL_SUITES].sort(), `${row.state}: …and it really is the whole suite`);
          assert.deepEqual([...result.widened], [{ file: changed, reason: row.reason }], `${row.state}: the widening names that file with its reason`);
          // The two-sided phrasing of the same claim: not a proper subset.
          assert.equal(result.selected.length, ALL_SUITES.length, `${row.state}: the selection is not a proper subset of the whole suite`);
          assert.deepEqual(wideningRuleProblems(result, ALL_SUITES), [], `${row.state}: and the rule admits it`);
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }
    },
  },

  {
    name: "72/01 task00: the four reasons are the whole vocabulary, and no widening carries a reason outside them",
    run: () => {
      assert.deepEqual([...WIDENING_REASONS], ["no-graph", "not-in-graph", "no-registered-dependent", "graph-unreadable"], "four, named");
      assert.equal(WIDENING_REASONS.length, 4, "…and exactly four");

      // Every widening this selection can produce, gathered from the paths that produce them.
      const produced = new Set();
      const plants = [
        () => {},
        (root) => writeGraph(root, { nodes: ["src/other.mjs"], links: [] }),
        (root) => writeGraph(root, { nodes: ["src/lonely.mjs", "src/b.mjs"], links: [edge(1, 0)] }),
        (root) => writeGraph(root, {}, "{ not json"),
      ];
      for (const plant of plants) {
        const root = tempRoot();
        try {
          plant(root);
          for (const entry of selectSuites({ projectRoot: root, changed: ["src/lonely.mjs"], allSuites: ALL_SUITES, roots: ROOTS }).widened) {
            produced.add(entry.reason);
          }
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }
      for (const reason of produced) assert.ok(WIDENING_REASONS.includes(reason), `${reason} is one of the four`);
      assert.equal(produced.size, 4, `all four are reachable, so the vocabulary is neither larger nor smaller than the paths: ${[...produced].join(", ")}`);
    },
  },

  {
    name: "72/01 task00: the rule is checked from BOTH sides, so neither side passes unexamined",
    run: () => {
      const base = { builtAt: null, graphPath: "g", refusal: null };
      const rows = [
        {
          result: "widened and selected the whole suite",
          value: { ...base, scope: "all", selected: ALL_SUITES, widened: [{ file: "src/a.mjs", reason: "no-graph" }], changed: ["src/a.mjs"], resolved: [] },
          verdict: "admits",
        },
        {
          result: "widened and selected a proper subset of the whole suite",
          value: { ...base, scope: "all", selected: ["test/a.test.mjs"], widened: [{ file: "src/a.mjs", reason: "no-graph" }], changed: ["src/a.mjs"], resolved: [] },
          verdict: "refuses",
        },
        {
          result: "did not widen and resolved every changed file in the graph",
          value: { ...base, scope: "impacted", selected: ["test/a.test.mjs"], widened: [], changed: ["src/a.mjs"], resolved: ["src/a.mjs"] },
          verdict: "admits",
        },
        {
          result: "did not widen and carried a changed file that did not resolve",
          value: { ...base, scope: "impacted", selected: ["test/a.test.mjs"], widened: [], changed: ["src/a.mjs", "src/ghost.mjs"], resolved: ["src/a.mjs"] },
          verdict: "refuses",
        },
      ];

      for (const row of rows) {
        const problems = wideningRuleProblems(row.value, ALL_SUITES);
        if (row.verdict === "admits") assert.deepEqual(problems, [], `${row.result}: the check admits`);
        else assert.ok(problems.length > 0, `${row.result}: the check refuses`);
      }

      // …and a reason outside the four is refused, so the vocabulary claim is enforced and not
      // merely documented.
      const bogus = { ...base, scope: "all", selected: ALL_SUITES, widened: [{ file: "src/a.mjs", reason: "looked-fine" }], changed: ["src/a.mjs"], resolved: [] };
      assert.ok(wideningRuleProblems(bogus, ALL_SUITES).some((problem) => problem.includes("looked-fine")), "a fifth reason is refused by name");
    },
  },

  {
    name: "72/01 task00: no option this selection accepts can turn a widened result narrow",
    run: () => {
      const root = tempRoot();
      try {
        writeGraph(root, { nodes: ["src/other.mjs"], links: [] });
        const base = { projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS };
        const widened = selectSuites(base);
        assert.equal(widened.scope, "all", "the baseline widens");

        // The suppressors that must not exist, offered anyway. A resolver that admitted any of
        // them would answer differently here; one that does not, cannot.
        const suppressors = { noWiden: true, strictScope: true, narrow: true, assumeFresh: true, skipWidening: true, widen: false, scope: "impacted" };
        for (const [key, value] of Object.entries(suppressors)) {
          const result = selectSuites({ ...base, [key]: value });
          assert.equal(result.scope, "all", `${key}: the whole suite is still selected`);
          assert.deepEqual([...result.widened], [...widened.widened], `${key}: the widening is still named`);
        }
        const all = selectSuites({ ...base, ...suppressors });
        assert.equal(all.scope, "all", "and all of them together change nothing either");
        assert.deepEqual([...all.selected].sort(), [...ALL_SUITES].sort(), "…the whole suite is still selected");

        // The options it DOES accept, applied in turn, cannot narrow it either: each of them
        // changes WHAT is asked, never whether an unknown is reported.
        for (const key of ["roots", "allSuites"]) {
          const value = key === "roots" ? [...ROOTS, "test/integration"] : [...ALL_SUITES, "test/d.test.mjs"];
          const result = selectSuites({ ...base, [key]: value });
          assert.equal(result.scope, "all", `${key}: still widened`);
          assert.ok(result.widened.length > 0, `${key}: and the widening is still named`);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/01 task00: a changed file that is itself a suite is in its own selection — the union is taken before the predicate",
    run: () => {
      const rows = [
        {
          changedFile: "a registered suite file whose only dependent is the runner",
          nodes: ["test/a.test.mjs", "scripts/test.mjs"],
          links: [edge(1, 0)],
          changed: "test/a.test.mjs",
          selected: ["test/a.test.mjs"],
          widens: false,
        },
        {
          changedFile: "a registered suite file depended on by the runner and one other suite",
          nodes: ["test/a.test.mjs", "scripts/test.mjs", "test/b.test.mjs"],
          links: [edge(1, 0), edge(2, 0)],
          changed: "test/a.test.mjs",
          selected: ["test/a.test.mjs", "test/b.test.mjs"],
          widens: false,
        },
        {
          changedFile: "a source module with two suite dependents",
          nodes: ["src/a.mjs", "test/a.test.mjs", "test/arch/c.test.mjs"],
          links: [edge(1, 0), edge(2, 0)],
          changed: "src/a.mjs",
          selected: ["test/a.test.mjs", "test/arch/c.test.mjs"],
          widens: false,
        },
        {
          changedFile: "a source module whose dependents are no suite",
          nodes: ["src/a.mjs", "src/b.mjs"],
          links: [edge(1, 0)],
          changed: "src/a.mjs",
          selected: ALL_SUITES,
          widens: true,
        },
      ];

      for (const row of rows) {
        const root = tempRoot();
        try {
          writeGraph(root, { nodes: row.nodes, links: row.links });
          const result = selectSuites({ projectRoot: root, changed: [row.changed], allSuites: ALL_SUITES, roots: ROOTS });
          assert.deepEqual([...result.selected].sort(), [...row.selected].sort(), `${row.changedFile}: the selected suites`);
          assert.equal(result.widened.length > 0, row.widens, `${row.changedFile}: ${row.widens ? "widened, naming it" : "did not widen"}`);
          if (row.widens) assert.equal(result.widened[0].file, row.changed, `${row.changedFile}: …and it names the file`);
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }
    },
  },

  {
    name: "72/01 task00: PRESENCE OUTRANKS THE UNION — a suite file the graph does not cover widens rather than selecting itself",
    run: () => {
      // A test file created this turn: it satisfies the suite PREDICATE and the graph has never
      // seen it. Union-first alone would select it silently, and every other row passes either
      // way — which is why the precedence is an invariant rather than an implementation note.
      const root = tempRoot();
      try {
        writeGraph(root, { nodes: ["src/a.mjs"], links: [] });
        const result = selectSuites({ projectRoot: root, changed: ["test/brand-new.test.mjs"], allSuites: ALL_SUITES, roots: ROOTS });
        assert.equal(result.scope, "all", "it widens");
        assert.deepEqual([...result.widened], [{ file: "test/brand-new.test.mjs", reason: "not-in-graph" }], "…naming it as absent from the graph");
        assert.equal(result.selected.includes("test/brand-new.test.mjs"), false, "and it was NOT quietly selected by the union");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/01 task00: every result reports the ARTIFACT's own build time, widened or not — and never a clock",
    run: () => {
      const rows = [
        { case: "resolves entirely in the graph", changed: "src/a.mjs", plant: couplingGraph, hasBuiltAt: true },
        { case: "widens because a file is not in the graph", changed: "src/absent.mjs", plant: couplingGraph, hasBuiltAt: true },
        { case: "widens because the artifact does not parse", changed: "src/a.mjs", plant: (root) => writeGraph(root, {}, "{ not json"), hasBuiltAt: false, reason: "graph-unreadable" },
        { case: "widens because there is no artifact", changed: "src/a.mjs", plant: () => {}, hasBuiltAt: false, reason: "no-graph" },
      ];

      for (const row of rows) {
        const root = tempRoot();
        try {
          row.plant(root);
          // A fixed PAST instant, stamped onto the artifact, so "the artifact's own" is
          // distinguishable from "now" rather than merely plausible.
          const past = new Date("2020-01-02T03:04:05.000Z");
          if (row.hasBuiltAt) utimesSync(graphJsonPath(root), past, past);
          const result = selectSuites({ projectRoot: root, changed: [row.changed], allSuites: ALL_SUITES, roots: ROOTS });

          if (row.hasBuiltAt) {
            assert.equal(result.builtAt, graphArtifactBuiltAt(graphJsonPath(root)), `${row.case}: the artifact's instant, through the one shared derivation`);
            assert.ok(result.builtAt.startsWith("2020-01-02"), `${row.case}: …and it is the past instant stamped on the file, not now`);
          } else {
            // The artifact that does not parse HAS a perfectly good mtime, and it is deliberately
            // discarded: nothing it claims is trustworthy once it does not parse.
            assert.equal(result.builtAt, null, `${row.case}: no build time`);
            assert.equal(result.widened[0].reason, row.reason, `${row.case}: …and the widening says why`);
          }
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }
    },
  },

  {
    name: "72/01 task00: the build time is the artifact's, never the moment of the call — and selection caches nothing between calls",
    run: async () => {
      const root = tempRoot();
      try {
        couplingGraph(root);
        const past = new Date("2019-05-06T07:08:09.000Z");
        utimesSync(graphJsonPath(root), past, past);

        const first = selectSuites({ projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS });
        await new Promise((resolve) => { setTimeout(resolve, 25); });
        const second = selectSuites({ projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS });
        assert.equal(first.builtAt, second.builtAt, "both results report that same instant");
        assert.ok(Date.parse(first.builtAt) < Date.now(), "and neither reports an instant later than the artifact's");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/01 task00: selection is PURE — two graphs coupling one changed set differently give two answers in one process, in either order",
    run: () => {
      const plantA = (root) => writeGraph(root, { nodes: ["src/a.mjs", "test/a.test.mjs"], links: [edge(1, 0)] });
      const plantB = (root) => writeGraph(root, { nodes: ["src/a.mjs", "test/b.test.mjs"], links: [edge(1, 0)] });
      const answer = (plant) => {
        const root = tempRoot();
        try {
          plant(root);
          return [...selectSuites({ projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS }).selected];
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      };

      for (const [first, second, plantFirst, plantSecond] of [["A", "B", plantA, plantB], ["B", "A", plantB, plantA]]) {
        const one = answer(plantFirst);
        const two = answer(plantSecond);
        assert.notDeepEqual(one, two, `graph ${first} then graph ${second}: the second answers from ${second} rather than repeating the first`);
        assert.deepEqual(two, second === "A" ? ["test/a.test.mjs"] : ["test/b.test.mjs"], `graph ${first} then graph ${second}: …and it is ${second}'s own answer`);
      }
    },
  },

  {
    name: "72/01 task00: the changed set is read from the base that was given, and a base that does not resolve is a refusal rather than an empty set",
    run: async () => {
      const root = gitFixture();
      try {
        const none = await changedFiles({ projectRoot: root });
        assert.equal(none.ok, true, `no base given: the working tree is readable — ${none.message ?? ""}`);
        assert.deepEqual([...none.changed], ["a.txt", "c.txt"], "no base given: the index and working-tree changes, untracked included");
        assert.ok(none.changed.length > 0, "no result is returned that selected nothing");

        const since = await changedFiles({ projectRoot: root, since: "HEAD~1" });
        assert.equal(since.ok, true, `HEAD~1: resolves — ${since.message ?? ""}`);
        assert.deepEqual([...since.changed], ["a.txt", "b.txt", "c.txt"], "HEAD~1: those changes and every change since HEAD~1");

        const bogus = await changedFiles({ projectRoot: root, since: "no-such-rev" });
        assert.equal(bogus.ok, false, "no-such-rev: not answered");
        assert.equal(bogus.code, SINCE_REV_UNRESOLVABLE, "…it is a coded refusal");
        assert.ok(bogus.message.includes("no-such-rev"), "…naming the revision");
        assert.equal(bogus.changed, undefined, "…and it is not an empty changed set wearing a refusal's clothes");

        // NO DEFAULT BRANCH IS INFERRED IN PLACE OF A BASE: the default answer is the working
        // tree, and it does not mention a branch at all.
        assert.equal(none.base, null, "the default base is the working tree, not a branch");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/01 task00: an empty changed set is a refusal, because selecting nothing is the maximal silent narrowing",
    run: async () => {
      const root = tempRoot();
      try {
        git(["init", "--initial-branch=main"], root);
        git(["config", "user.email", "fixture@example.invalid"], root);
        git(["config", "user.name", "Fixture"], root);
        writeFileSync(path.join(root, "a.txt"), "one\n");
        git(["add", "a.txt"], root);
        git(["commit", "-m", "first"], root);

        const clean = await changedFiles({ projectRoot: root });
        assert.equal(clean.ok, false, "a clean tree just after a commit is a refusal");
        assert.equal(clean.code, CHANGED_SET_EMPTY, "…named as such");

        // …and the selector refuses it too, rather than reporting a green run over zero tests.
        const result = selectSuites({ projectRoot: root, changed: [], allSuites: ALL_SUITES, roots: ROOTS });
        assert.equal(result.refusal?.code, CHANGED_SET_EMPTY, "the selector refuses an empty changed set for the same reason");
        assert.deepEqual([...result.selected], [], "…and selects nothing rather than pretending");
        assert.equal(result.gate, false, "…and it is no gate");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "72/01 task00: the porcelain reader keeps untracked files and both ends of a rename, and the suite predicate is a path test",
    run: () => {
      const parsed = parsePorcelain([
        " M src/a.mjs",
        "?? test/brand-new.test.mjs",
        "R  src/old.mjs -> src/new.mjs",
        'A  "src/with space.mjs"',
        "",
      ].join("\n"));
      assert.deepEqual(parsed, ["src/a.mjs", "test/brand-new.test.mjs", "src/old.mjs", "src/new.mjs", "src/with space.mjs"], "modified, untracked, both rename ends and a quoted path");
      assert.deepEqual(parseNameOnly("src/a.mjs\nsrc/b.mjs\n\n"), ["src/a.mjs", "src/b.mjs"], "and the name-only reader drops blanks");

      assert.equal(isSuiteFile("test/a.test.mjs", ROOTS), true, "a suite under a declared root");
      assert.equal(isSuiteFile("test/arch/c.test.mjs", ROOTS), true, "…including a nested root");
      assert.equal(isSuiteFile("src/a.mjs", ROOTS), false, "a source module is not a suite");
      assert.equal(isSuiteFile("test/support/helper.mjs", ROOTS), false, "…nor is a helper that is not a .test.mjs");
      assert.equal(isSuiteFile("other/a.test.mjs", ROOTS), false, "…nor a suite-shaped file outside every declared root");
    },
  },

  // ── tasks/01 ────────────────────────────────────────────────────────────────────────────────
  {
    name: "72/01 task01: what the runner ASSEMBLES decides what is reported, in each registration state a selection can meet",
    run: () => {
      const rows = [
        {
          state: "on disk and every test it exports is in the assembled array",
          file: "test/a.test.mjs",
          suiteNames: new Map([["test/a.test.mjs", ["a one"]]]),
          assembled: new Set(["a one"]),
          registered: true,
        },
        {
          state: "on disk and its tests are absent from the assembled array",
          file: "test/b.test.mjs",
          suiteNames: new Map([["test/b.test.mjs", ["b one"]]]),
          assembled: new Set(["something else"]),
          registered: false,
          code: "audit-suite-unregistered",
        },
        {
          state: "imported by the runner and never spread into the array",
          file: "test/b.test.mjs",
          suiteNames: new Map([["test/b.test.mjs", ["b one"]]]),
          assembled: new Set(["something else"]),
          importedBy: new Set(["test/b.test.mjs"]),
          registered: false,
          code: "audit-suite-imported-never-spread",
        },
        {
          state: "on disk with the names it exports unreadable",
          file: "test/b.test.mjs",
          suiteNames: new Map(),
          assembled: new Set(),
          registered: false,
          code: "audit-runtime-membership-unavailable",
        },
        {
          state: "carried in the shrink-only baseline",
          file: "test/b.test.mjs",
          suiteNames: new Map([["test/b.test.mjs", ["b one"]]]),
          assembled: new Set(),
          baseline: [{ suite: "test/b.test.mjs", reason: "importing it to decide its registration would execute it", origin: "fixture" }],
          registered: false,
          carried: true,
        },
      ];

      for (const row of rows) {
        const report = registrationReport({
          selected: [row.file],
          assembled: row.assembled,
          suiteNames: row.suiteNames,
          importedBy: row.importedBy ?? new Set(),
          ...(row.baseline ? { baseline: row.baseline } : { baseline: [] }),
        });
        const entry = report.files[0];
        assert.equal(entry.registered, row.registered, `${row.state}: reported as ${row.registered ? "registered" : "unregistered"}`);
        if (row.code) assert.equal(entry.code, row.code, `${row.state}: with the census's own code`);
        if (row.carried) {
          assert.equal(entry.carried, true, `${row.state}: carried`);
          assert.equal(entry.message, "importing it to decide its registration would execute it", `${row.state}: with its carried reason`);
        }
        if (row.registered) assert.deepEqual([...report.unregistered], [], `${row.state}: nothing is reported unregistered`);
        else assert.deepEqual([...report.unregistered], [row.file], `${row.state}: it is in the unregistered set`);
      }
    },
  },

  {
    name: "72/01 task01: the unregistered verdict is the census's OWN code and message, never a re-phrasing",
    run: () => {
      const rows = [
        { code: "audit-suite-unregistered", suiteNames: new Map([["test/b.test.mjs", ["b one"]]]), assembled: new Set(), importedBy: new Set() },
        { code: "audit-suite-imported-never-spread", suiteNames: new Map([["test/b.test.mjs", ["b one"]]]), assembled: new Set(), importedBy: new Set(["test/b.test.mjs"]) },
        { code: "audit-runtime-membership-unavailable", suiteNames: new Map(), assembled: new Set(), importedBy: new Set() },
      ];

      for (const row of rows) {
        const report = registrationReport({ selected: ["test/b.test.mjs"], assembled: row.assembled, suiteNames: row.suiteNames, importedBy: row.importedBy, baseline: [] });
        const entry = report.files[0];
        const finding = report.findings.find((candidate) => candidate.path === "test/b.test.mjs");
        assert.equal(entry.code, row.code, `${row.code}: the reason reported is that code`);
        assert.equal(entry.message, finding.message, `${row.code}: …and the message the census gave, verbatim`);
        assert.equal(finding.code, row.code, `${row.code}: …which is the finding the census emitted`);
      }

      // No reason is reported that the census did not emit: every non-carried unregistered row's
      // code is one the findings list holds.
      const emitted = new Set(["audit-suite-unregistered", "audit-suite-imported-never-spread", "audit-runtime-membership-unavailable"]);
      for (const row of rows) {
        const report = registrationReport({ selected: ["test/b.test.mjs"], assembled: row.assembled, suiteNames: row.suiteNames, importedBy: row.importedBy, baseline: [] });
        for (const entry of report.files) {
          if (entry.code != null) assert.ok(emitted.has(entry.code), `${entry.code} is a code the census emits`);
        }
      }
    },
  },

  {
    name: "72/01 task01: a changed file that is not a suite is never reported as one",
    run: () => {
      const root = tempRoot();
      try {
        couplingGraph(root);
        const result = selectSuites({ projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS });
        assert.equal(result.selected.includes("src/a.mjs"), false, "it does not appear among the selected suites");

        const report = registrationReport({
          selected: [...result.selected],
          assembled: new Set(["a one"]),
          suiteNames: new Map([["test/a.test.mjs", ["a one"]]]),
          baseline: [],
        });
        assert.equal(report.files.some((entry) => entry.file === "src/a.mjs"), false, "and it is not reported as unregistered");
        assert.deepEqual([...report.unregistered], [], "…the report is over the SELECTED suites and nothing else");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
];
