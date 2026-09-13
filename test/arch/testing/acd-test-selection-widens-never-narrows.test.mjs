// Fitness function: acd-test-selection-widens-never-narrows (milestone 72 / story 01, FF-7202;
// ADR-002 §1, §2, §3, §5).
//
//   "An UNKNOWN widens the selection and never narrows it, and the selector never builds a graph."
//
// The failure this control exists to prevent is not slowness. It is a subset derived from a gap,
// handed to an agent that trusts it. That agent will not find out, which is why the invariant is
// one-directional and why every leg below is driven POSITIVELY — a widening asserted only by its
// absence would pass over a selector that never widens at all.
//
// ── WHY THIS IS A TEXT CENSUS AND NOT A CLOSURE WALK ─────────────────────────────────────────
//
// A closure walk reds on arrival and would be wrong twice over. `src/work-audit/census.mjs:49`
// imports `runBounded` from `./spawn.mjs`, which imports the process module at `spawn.mjs:34` — so
// the selector's static closure holds a spawn the instant it imports the registration decider,
// which ADR-004 §4 REQUIRES it to do. And ADR-002 §5 requires a real git child through that same
// seam anyway. The claim is that these modules author no route to the graph of their own, never
// that none is reachable from them.
//
// ── AND WHY THE GIT READER IS NOT IN THE CENSUSED SUBJECT ────────────────────────────────────
//
// The contract's route list ends with *"a child process of any kind"*, and its companion clause is
// *"with nothing planted no route is found"*. Both can hold only over a subject that starts no
// child. So `src/work/test-select.mjs` and `src/graph-impact.mjs` are the subject and stay
// spawn-free, and the bounded git changed-set reader ADR-002 §5 requires lives beside them in
// `src/work/test-changed.mjs`, governed by ADR-001 §5's one-seam rule instead — asserted here too,
// so the split is a placement and not an exemption.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { graphArtifactBuiltAt, graphJsonPath } from "../../../src/graph-normalize.mjs";
import { WIDENING_REASONS, selectSuites, wideningRuleProblems } from "../../../src/work/test-select.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

// THE CENSUSED SUBJECT — the modules that touch the graph. Named rather than globbed, because the
// claim is about these two and a glob would quietly acquire a third.
const GRAPH_FAMILY = Object.freeze(["src/work/test-select.mjs", "src/graph-impact.mjs"]);

// The story's whole new-module set, for the clock claim (which is about anything that could
// fabricate a build time) and for the one-seam claim over the git reader.
const STORY_MODULES = Object.freeze([...GRAPH_FAMILY, "src/work/test-changed.mjs"]);

const SELECTOR = "src/work/test-select.mjs";
const MODULE_FLOOR = 2;

const sourceOf = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");
const modulesOf = (rels) => rels.map((rel) => ({ rel, code: sourceOf(rel) }));

// ── PURE CENSORS ─────────────────────────────────────────────────────────────────────────────

// A ROUTE TO THE GRAPH that is not the shared read. Four shapes, one per contract row, each
// matched over comment-stripped source so prose describing the species is not the species.
const GRAPH_ROUTES = Object.freeze([
  {
    route: "an invocation of the graph build",
    // The build reached by command id, or by the driver's own name.
    test: (code) => /["'`]graph:build["'`]/u.test(code) || /\bgraphify\b/u.test(code),
  },
  {
    route: "a second read of the graph artifact file",
    // Any read of a path naming the artifact that is not `readGraph`'s.
    test: (code) => /\b(?:readFile|readFileSync)\s*\([^)]*graph\.json/u.test(code) || /["'`][^"'`]*graph\.json["'`]/u.test(code),
  },
  {
    route: "a parse of the artifact outside the shared reader",
    test: (code) => /JSON\s*\.\s*parse\s*\(/u.test(code),
  },
  {
    route: "a child process of any kind",
    test: (code) => /from\s+"node:child_process"/u.test(code)
      || /\b(?:spawn|spawnSync|exec|execFile|execFileSync|execSync|fork|runBounded)\s*\(/u.test(code),
  },
]);

export function graphRouteProblems(modules) {
  const problems = [];
  for (const { rel, code } of modules) {
    const source = stripComments(code);
    for (const { route, test } of GRAPH_ROUTES) {
      if (test(source)) problems.push(`${rel} holds ${route} — the graph artifact is reached ONLY through the shared normalisation and impact functions, and a build is minutes even when nothing changed.`);
    }
  }
  return problems;
}

// A CLOCK. The alternative to an honest `null` is a fabricated instant, and the token is the whole
// tell — with comments stripped, because `src/commands/graph-impact.mjs` holds it inside prose
// explaining why it must not be used, and a control that reds on that is reading characters.
export function clockProblems(modules) {
  return modules
    .filter(({ code }) => /new\s+Date\s*\(/u.test(stripComments(code)) || /Date\s*\.\s*now\s*\(/u.test(stripComments(code)))
    .map(({ rel }) => `${rel} reads a clock — \`builtAt\` is the ARTIFACT's instant or it is null, and a call-time stamp is the confident-wrong-answer this row exists to refuse.`);
}

// THE OPTION KEYS THE SELECTOR ACCEPTS, cut from its own destructured parameter list by matching
// parens — the language's own region, never a character window.
export function acceptedOptionKeys(code) {
  const source = stripComments(code);
  const start = source.indexOf("export function selectSuites");
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

const SUPPRESSING = Object.freeze(["noWiden", "no-widen", "strictScope", "strict-scope", "narrow", "assumeFresh", "assume-fresh", "skipWidening", "skip-widening", "force", "suppress", "override"]);

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────────

const ALL_SUITES = ["test/a.test.mjs", "test/b.test.mjs", "test/arch/c.test.mjs"];
const ROOTS = ["test", "test/arch"];

function tempRoot() {
  return mkdtempSync(path.join(os.tmpdir(), "aof-ff7202-"));
}

function plantGraph(root, { nodes = [], links = [] } = {}, raw = null) {
  mkdirSync(path.join(root, "graphify-out"), { recursive: true });
  writeFileSync(graphJsonPath(root), raw ?? JSON.stringify({
    directed: true,
    multigraph: false,
    graph: {},
    nodes: nodes.map((file, index) => ({ id: `n${index}`, label: file, source_file: file })),
    links,
  }));
}

const link = (from, to) => ({ source: `n${from}`, target: `n${to}`, relation: "imports", confidence: "EXPLICIT" });

function withRoot(plant, run) {
  const root = tempRoot();
  try {
    plant(root);
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export const archTests = [
  {
    name: "arch/72 FF-7202 (acd-test-selection-widens-never-narrows): the selector opens no route to the graph but the shared one — no build, no second read, no second parse, no child process",
    run: () => {
      const modules = modulesOf(GRAPH_FAMILY);
      assert.ok(modules.length >= MODULE_FLOOR, `the graph family was read and is non-vacuous: ${modules.length} module(s), floor ${MODULE_FLOOR}`);
      for (const module of modules) assert.ok(module.code.length > 200, `${module.rel} was actually read (${module.code.length} bytes)`);

      const problems = graphRouteProblems(modules);
      assert.deepEqual(problems, [], `the graph is READ, never built, and only through the shared reader:\n  ${problems.join("\n  ")}`);

      // …and the shared reader is genuinely how it is reached, so this is "one route" and not
      // "none". An absence over a module that never touches the graph is free.
      const selector = stripComments(sourceOf(SELECTOR));
      assert.match(selector, /import\s*\{[^}]*normalizeGraph[^}]*\}\s*from\s+"(?:\.\.?\/)+graph-normalize\.mjs"/u, "the selector reaches the artifact through the shipped normalizer");
      assert.match(selector, /import\s*\{[^}]*computeImpact[^}]*\}\s*from\s+"(?:\.\.?\/)+graph-impact\.mjs"/u, "…and through the shipped impact core");
      assert.match(selector, /graphJsonPath\s*\(/u, "…at the one artifact path the tree already derives");
    },
  },

  {
    name: "arch/72 FF-7202 (acd-test-selection-widens-never-narrows): self-check — each of the four routes is reported by the file that holds it, and the bounded git reader is a PLACEMENT rather than an exemption",
    run: () => {
      for (const { route, test } of GRAPH_ROUTES) {
        const planted = {
          "an invocation of the graph build": 'await invoke("graph:build", { folder });',
          "a second read of the graph artifact file": 'const raw = readFileSync(join(root, "graphify-out", "graph.json"), "utf8");',
          "a parse of the artifact outside the shared reader": "const graph = JSON.parse(raw);",
          "a child process of any kind": 'spawnSync("anything", []);',
        }[route];
        assert.ok(test(stripComments(planted)), `the detector for "${route}" fires on its own plant`);
        const problems = graphRouteProblems([{ rel: SELECTOR, code: planted }]);
        assert.ok(problems.length >= 1, `"${route}" planted in a module this story adds is reported`);
        assert.ok(problems.every((problem) => problem.includes(SELECTOR)), `…by the file that holds it: ${problems.join(" | ")}`);
      }

      // With nothing planted, none is found — driven over a module with real content so the pass
      // is not an artefact of an empty string.
      assert.deepEqual(graphRouteProblems([{ rel: SELECTOR, code: "export function selectSuites() { return { scope: \"impacted\" }; }" }]), [], "with nothing planted no route is found");

      // THE GIT READER IS BOUNDED, and that claim is made here so the split above is a placement
      // rather than a hole: it starts children, it starts them through the ONE seam, and it passes
      // no shell.
      const reader = stripComments(sourceOf("src/work/test-changed.mjs"));
      assert.match(reader, /import\s*\{\s*runBounded\s*\}\s*from\s+"(?:\.\.?\/)+work-audit\/spawn\.mjs"/u, "the changed-set reader goes through the shared bounded seam");
      assert.doesNotMatch(reader, /from\s+"node:child_process"/u, "…and reaches the process module directly nowhere");
      assert.doesNotMatch(reader, /\bshell\s*:/u, "…and passes no shell option");
      assert.doesNotMatch(reader, /\b(?:spawnSync|execFile|execFileSync|execSync|fork)\s*\(/u, "…and opens no second way to start a child");

      // NO DEFAULT BRANCH IS INFERRED IN PLACE OF A BASE (ADR-002 §5). A worktree on a story
      // branch has no reliable answer for "what is my base", and a wrong base SILENTLY NARROWS the
      // changed set — the one thing the invariant forbids. The absence is asserted as text because
      // the behavioural row can only show that today's default is the working tree; this shows
      // that no branch name is reachable to become one tomorrow.
      for (const inferred of ['"main"', '"master"', '"origin/HEAD"', '"@{upstream}"', "symbolic-ref", "merge-base"]) {
        assert.equal(reader.includes(inferred), false, `the changed-set reader names ${inferred} nowhere — no default branch is inferred in place of a base`);
      }
      // …and it is NOT a route to the graph either: it names no artifact and no build.
      assert.deepEqual(
        graphRouteProblems([{ rel: "src/work/test-changed.mjs", code: sourceOf("src/work/test-changed.mjs") }])
          .filter((problem) => !problem.includes("a child process of any kind")),
        [],
        "the changed-set reader touches the graph in no way at all",
      );
    },
  },

  {
    name: "arch/72 FF-7202 (acd-test-selection-widens-never-narrows): each of the four widening reasons is driven POSITIVELY against a planted graph, and the rule is asserted two-sided",
    run: () => {
      const rows = [
        { reason: "no-graph", plant: () => {}, changed: "src/a.mjs" },
        { reason: "not-in-graph", plant: (root) => plantGraph(root, { nodes: ["src/other.mjs"] }), changed: "src/a.mjs" },
        { reason: "no-registered-dependent", plant: (root) => plantGraph(root, { nodes: ["src/a.mjs", "src/b.mjs"], links: [link(1, 0)] }), changed: "src/a.mjs" },
        { reason: "graph-unreadable", plant: (root) => plantGraph(root, {}, "{ not json"), changed: "src/a.mjs" },
      ];

      for (const row of rows) {
        withRoot(row.plant, (root) => {
          const result = selectSuites({ projectRoot: root, changed: [row.changed], allSuites: ALL_SUITES, roots: ROOTS });
          assert.equal(result.scope, "all", `${row.reason}: yields scope "all"`);
          assert.deepEqual([...result.selected].sort(), [...ALL_SUITES].sort(), `${row.reason}: …the whole suite, not a proper subset`);
          const named = result.widened.find((entry) => entry.file === row.changed);
          assert.ok(named != null, `${row.reason}: …and a named entry in widened[]`);
          assert.equal(named.reason, row.reason, `${row.reason}: …carrying this reason`);
          assert.deepEqual(wideningRuleProblems(result, ALL_SUITES), [], `${row.reason}: the two-sided rule admits it`);
        });
      }

      // BOTH SIDES, driven: a widened result that selected a proper subset FAILS, and a
      // non-widened result carrying an unresolved changed file FAILS.
      const subset = { scope: "all", selected: ["test/a.test.mjs"], widened: [{ file: "src/a.mjs", reason: "no-graph" }], changed: ["src/a.mjs"], resolved: [], refusal: null };
      assert.ok(wideningRuleProblems(subset, ALL_SUITES).length > 0, "a widened result that selected a proper subset fails");
      const unresolved = { scope: "impacted", selected: ["test/a.test.mjs"], widened: [], changed: ["src/a.mjs", "src/ghost.mjs"], resolved: ["src/a.mjs"], refusal: null };
      assert.ok(wideningRuleProblems(unresolved, ALL_SUITES).length > 0, "a non-widened result carrying an unresolved changed file fails");

      assert.equal(WIDENING_REASONS.length, 4, "and the vocabulary is exactly four");
    },
  },

  {
    name: "arch/72 FF-7202 (acd-test-selection-widens-never-narrows): no option the selection accepts suppresses a widening, and an unknown suppressing key leaves the widening standing",
    run: () => {
      const accepted = acceptedOptionKeys(sourceOf(SELECTOR));
      assert.ok(Array.isArray(accepted) && accepted.length > 0, `the selector's own accepted option keys were cut from its parameter list: ${JSON.stringify(accepted)}`);
      for (const key of accepted) {
        assert.equal(
          SUPPRESSING.some((banned) => key.toLowerCase() === banned.toLowerCase().replaceAll("-", "")),
          false,
          `the selector accepts no option that suppresses, narrows or overrides a widening — it accepts "${key}"`,
        );
      }
      // The flag half of the same claim — that no such flag is DECLARED on a command — rides
      // FF-7204, where a command exists to declare one. This story ships a module and no command,
      // which is why the claim here is over the resolver's OWN option keys.
      const family = stripComments(modulesOf(STORY_MODULES).map(({ code }) => code).join("\n"));
      for (const banned of SUPPRESSING) {
        assert.equal(family.includes(`"--${banned}"`), false, `no --${banned} is spelled anywhere in this story's modules`);
      }

      // And an unknown suppressing key, passed anyway, changes nothing: the widening stands.
      withRoot((root) => plantGraph(root, { nodes: ["src/other.mjs"] }), (root) => {
        const base = { projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS };
        const plain = selectSuites(base);
        for (const banned of SUPPRESSING) {
          const result = selectSuites({ ...base, [banned]: true });
          assert.equal(result.scope, "all", `${banned}: the widening stands`);
          assert.deepEqual([...result.widened], [...plain.widened], `${banned}: …and is still named`);
        }
      });
    },
  },

  {
    name: "arch/72 FF-7202 (acd-test-selection-widens-never-narrows): builtAt is the ARTIFACT's file mtime or exactly null, and no module in this story reads a clock",
    run: () => {
      const past = new Date("2018-03-04T05:06:07.000Z");

      // On the two widening paths where an artifact WAS read, the instant is present and equal to
      // the artifact's own mtime — through `graphArtifactBuiltAt`, the one derivation the tree has.
      for (const [label, plant, changed] of [
        ["a file absent from the graph", (root) => plantGraph(root, { nodes: ["src/other.mjs"] }), "src/a.mjs"],
        ["a file with no suite dependent", (root) => plantGraph(root, { nodes: ["src/a.mjs", "src/b.mjs"], links: [link(1, 0)] }), "src/a.mjs"],
      ]) {
        withRoot(plant, (root) => {
          utimesSync(graphJsonPath(root), past, past);
          const result = selectSuites({ projectRoot: root, changed: [changed], allSuites: ALL_SUITES, roots: ROOTS });
          assert.equal(result.scope, "all", `${label}: widened`);
          assert.equal(result.builtAt, graphArtifactBuiltAt(graphJsonPath(root)), `${label}: builtAt is the artifact's own mtime`);
          assert.ok(result.builtAt.startsWith("2018-03-04"), `${label}: …the stamped past instant, not now`);
        });
      }

      // On `no-graph` there is no file and no instant to take. On `graph-unreadable` the file
      // EXISTS and has a perfectly good mtime — and that instant is DELIBERATELY DISCARDED,
      // because nothing the artifact claims is trustworthy once it does not parse.
      withRoot(() => {}, (root) => {
        const result = selectSuites({ projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS });
        assert.equal(result.builtAt, null, "no-graph: exactly null");
        assert.equal(result.widened[0].reason, "no-graph", "…and the widening says why");
      });
      withRoot((root) => plantGraph(root, {}, "{ not json"), (root) => {
        utimesSync(graphJsonPath(root), past, past);
        assert.notEqual(graphArtifactBuiltAt(graphJsonPath(root)), null, "the unreadable artifact HAS an mtime, so discarding it is a decision");
        const result = selectSuites({ projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS });
        assert.equal(result.builtAt, null, "graph-unreadable: exactly null, the mtime deliberately discarded");
        assert.equal(result.widened[0].reason, "graph-unreadable", "…and the widening says why");
      });

      const clocks = clockProblems(modulesOf([...STORY_MODULES, "src/commands/graph/impact.mjs"]));
      assert.deepEqual(clocks, [], `no module in this family fabricates an instant:\n  ${clocks.join("\n  ")}`);
      // …and the detector is not asleep: it fires on the token, and stays silent on the prose that
      // describes it, which is the shape that would have made this row read characters.
      assert.equal(clockProblems([{ rel: "src/planted.mjs", code: "const builtAt = new Date().toISOString();" }]).length, 1, "the clock detector fires on a real clock");
      assert.deepEqual(clockProblems([{ rel: "src/planted.mjs", code: "// never a new Date() here\nconst builtAt = null;" }]), [], "…and stays silent on prose describing it");
    },
  },

  {
    name: "arch/72 FF-7202 (acd-test-selection-widens-never-narrows): selection is PURE — the same changed set against two planted graphs answers twice in one process",
    run: () => {
      const answer = (nodes, links) => withRoot((root) => plantGraph(root, { nodes, links }), (root) => [
        ...selectSuites({ projectRoot: root, changed: ["src/a.mjs"], allSuites: ALL_SUITES, roots: ROOTS }).selected,
      ]);

      const first = answer(["src/a.mjs", "test/a.test.mjs"], [link(1, 0)]);
      const second = answer(["src/a.mjs", "test/b.test.mjs"], [link(1, 0)]);
      assert.deepEqual(first, ["test/a.test.mjs"], "graph A answers A");
      assert.deepEqual(second, ["test/b.test.mjs"], "graph B answers B, in the same process");
      assert.notDeepEqual(first, second, "so nothing is cached across calls — the optimisation this forbids is the one ADR-002 prices");

      // …and the other order too, because a cache that warms on the first call would pass one
      // direction and fail the other.
      const third = answer(["src/a.mjs", "test/a.test.mjs"], [link(1, 0)]);
      assert.deepEqual(third, first, "and graph A still answers A after graph B");
    },
  },
];
