// Fitness function: acd-seam-liveness-unknown-is-a-limit (milestone 77 / story 02, FF-7704;
// ADR-006 §1, §1a, §2, §3, §4).
//
//   "An UNKNOWN is a stated LIMIT, never a clean seam — and the seam lane never builds a graph."
//
// ── WHY THE CENSUS IS OVER TEXT AND NOT OVER THE IMPORT CLOSURE ──────────────────────────────
//
// A closure walk REDS ON ARRIVAL and would say nothing true. This lane imports `./census.mjs` for
// the one home of the test roots, and the census imports the bounded spawn seam, which imports
// `node:child_process` — so a closure walk asserting "no child process" fails on a module that
// starts none. The claim that is both true and worth making is about THIS MODULE'S OWN SOURCE, with
// comments stripped: prose explaining the rejected build path cannot red it, and a build described
// in a comment is still not a build.
//
// ── THE THREE ABSENCES ARE DRIVEN POSITIVELY, BECAUSE SILENCE IS THE BUG ─────────────────────
//
// A run that could not resolve a module's coupling and says nothing has told a reader "the seams
// are fine" in the shape of a clean result, and the reader will not find out. So each absence gets
// its own row and each must produce ZERO findings AND a limit: not a finding, because no unwired
// seam was observed; not silence, because no wired one was either.
//
// The third is the dangerous one. An empty `dependents` list on an ABSENT node looks exactly like an
// empty one on a present node, and rendering the first as "no dependents" is the precise mistake
// this rule exists to prevent — so it is asserted from both sides: the absent candidate is NOT
// reported as unwired, and the present one beside it still IS.
//
// ── AND THE FLOOR IS THE SECOND HALF OF THE SAME HONESTY ─────────────────────────────────────
//
// `audit-ran-on-nothing` is an `error`. A lane whose population were "modules the graph covers"
// would breach its floor — and red a build — in every project that never installed an optional
// tool. So the sweep is asserted to be SOURCE ON DISK, which is always satisfiable where there is
// source, and a graphless project is asserted not to trip it.
//
// ── BOTH SUPPRESSIONS ARE ASSERTED DERIVED, NEVER LEDGERED ───────────────────────────────────
//
// A control that STORES a fact about the tree sends its next bill to a stranger — six carriers in
// three families already (TECH_DEBT item 81) — and here the bill is exact: the ledger is right on
// the day it is written, the third false positive arrives without an entry, and an entry for a
// module that has since gained a caller suppresses a real finding forever. So the module is
// asserted to hold NO module-path literal at all, and both suppressions are driven over a corpus
// built for this run whose names appear in no other project.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import { graphJsonPath } from "../../../src/graph-normalize.mjs";
import { TEST_ROOTS } from "../../../src/work-audit/census.mjs";
import { readFinding } from "../../../src/work-audit/reads.mjs";
import { SEAM_LIVENESS_SWEEPS, runSeamLiveness } from "../../../src/work-audit/seam-liveness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MODULE_REL = "src/work-audit/seam-liveness.mjs";
const moduleSource = () => readFileSync(path.join(repoRoot, MODULE_REL), "utf8");
const SOURCE_FLOOR = 2000;

// ── THE ROUTE DETECTOR ───────────────────────────────────────────────────────────────────────
//
// PURE — (rel, comment-stripped source) in, the routes to a graph out. Pure so the same detector
// that sweeps the real module can be driven against PLANTED sources: an absence claim proves
// nothing until the thing making it is shown to have teeth.
export function graphRoutes(rel, code) {
  const problems = [];
  const has = (pattern) => new RegExp(pattern, "u").test(code);

  if (has("graph[:\\s-]build|buildGraph")) problems.push(`${rel} invokes the graph build`);
  if (has("graphify")) problems.push(`${rel} names graphify`);
  if (has("graph\\.json")) problems.push(`${rel} reads the graph artifact file directly`);
  if (has("JSON\\.parse")) problems.push(`${rel} parses the artifact outside the shared reader`);
  if (has("node:child_process|(?<![.\\w])(?:execFile|execFileSync|execSync|spawnSync|spawn|fork)\\s*\\(")) {
    problems.push(`${rel} starts a child process`);
  }
  return problems;
}

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────────

const EXPORTS_ONE = "export function reach() { return 1; }\n";

function project(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "aof-ff7704-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

function writeGraph(root, { files = [], edges = [] } = {}, raw = null) {
  mkdirSync(path.join(root, "graphify-out"), { recursive: true });
  const index = new Map(files.map((file, position) => [file, `n${position}`]));
  writeFileSync(graphJsonPath(root), raw ?? JSON.stringify({
    directed: true,
    multigraph: false,
    graph: {},
    nodes: files.map((file, position) => ({ id: `n${position}`, label: file, source_file: file })),
    links: edges.map(([from, into]) => ({ source: index.get(from), target: index.get(into), relation: "imports", confidence: "EXPLICIT" })),
  }));
}

async function laneOver(files, graph) {
  const root = project(files);
  try {
    if (graph !== null) writeGraph(root, graph.spec ?? graph, graph.raw ?? null);
    const result = await runSeamLiveness({ root });
    return { result, findings: result.findings.filter((finding) => finding.code === "audit-seam-unwired") };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const named = (findings) => findings.map((finding) => finding.path).sort();
const said = (result) => result.limits.map((limit) => limit.consequence).join(" ");

export const archTests = [
  {
    name: "acd-seam-liveness-unknown-is-a-limit: the lane spells no graph build, no second reader and no child process — a TEXT census over its own source",
    run() {
      const code = stripComments(moduleSource());
      assert.equal(code.length > SOURCE_FLOOR, true, `${MODULE_REL} was read and stripped to something real (${code.length} chars, floor ${SOURCE_FLOOR})`);
      assert.deepEqual(graphRoutes(MODULE_REL, code), [], `${MODULE_REL} holds no route to a graph other than the shipped read`);

      // The POSITIVE half: it reaches the artifact through the shipped reader, and by import.
      assert.match(code, /import \{[^}]*normalizeGraph[^}]*\} from "\.\.\/graph-normalize\.mjs"/u, "it imports the shipped normalizer from its one home");
      assert.match(code, /\breadGraph\b/u, "…and the shipped read");
      assert.match(code, /\bgraphJsonPath\b/u, "…and the shipped path resolver, rather than assembling an artifact path of its own");

      // `computeImpact` is deliberately NOT among them, and that is ADR-006 §1a rather than an
      // omission: it is O(paths × (nodes + edges)) and re-walks every edge once per path in its own
      // map, which over ~150 candidates is ~12 s inside a command that has to stay cheap. The
      // inverted single pass is the composition the ADR prescribes, and the bound it exists for is
      // driven behaviourally in `work-audit-seam-liveness.test.mjs`.
      assert.equal(/\bcomputeImpact\b/u.test(code), false, "and it does not ask the per-path question, which ADR-006 §1a prices at ~12 s over this repository's candidate set");
    },
  },
  {
    name: "acd-seam-liveness-unknown-is-a-limit: no run of the lane leaves a graph artifact behind that was not already there",
    async run() {
      const root = project({ "src/a.mjs": EXPORTS_ONE, "src/b.mjs": EXPORTS_ONE });
      try {
        const artifact = graphJsonPath(root);
        assert.equal(existsSync(artifact), false, "the project starts with no artifact");
        const result = await runSeamLiveness({ root });
        assert.equal(existsSync(artifact), false, "…and still has none after the lane ran, under the input most likely to tempt a build");
        assert.equal(existsSync(path.join(root, "graphify-out")), false, "…not even the directory one would be built into");
        assert.equal(result.builtAt, null, "…and the result reports no build time it could not have had");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "acd-seam-liveness-unknown-is-a-limit: the route detector has teeth — every route is planted and reported, and a comment describing the rejected build path is not",
    run() {
      const plants = [
        ['await runBounded(["aof", "graph:build", "."]);', "an invocation of the graph build"],
        ['const driver = "graphify";', "a graphify token in any form"],
        ['const raw = readFileSync(path.join(root, "graphify-out", "graph.json"));', "a second read of the graph artifact file"],
        ['const graph = JSON.parse(body);', "a parse of the artifact outside the shared reader"],
        ['import { spawn } from "node:child_process";', "a child process of any kind"],
      ];
      for (const [source, why] of plants) {
        const reported = graphRoutes(`${MODULE_REL}`, stripComments(source));
        assert.equal(reported.length > 0, true, `${why}: reported`);
        assert.equal(reported.every((problem) => problem.startsWith(MODULE_REL)), true, `${why}: …naming the file that holds it`);
      }

      assert.deepEqual(
        graphRoutes(MODULE_REL, stripComments("// The rejected design ran `aof graph:build .` through graphify and parsed graph.json itself.\nexport const x = 1;\n")),
        [],
        "a comment describing the rejected build path is not reported — prose explaining a refused design may not red the rule that refused it",
      );
      assert.deepEqual(graphRoutes(MODULE_REL, "export const x = 1;\n"), [], "and with nothing planted no route is found");
    },
  },
  {
    name: "acd-seam-liveness-unknown-is-a-limit: the three absence paths each yield ZERO findings and a stated limit",
    async run() {
      const source = { "src/a.mjs": EXPORTS_ONE, "src/b.mjs": EXPORTS_ONE };

      const noArtifact = await laneOver(source, null);
      assert.deepEqual(noArtifact.findings, [], "no artifact: zero audit-seam-unwired findings");
      assert.match(said(noArtifact.result), /no code graph was available/u, "…and a limit naming the reason");

      const unreadable = await laneOver(source, { raw: "{ not a graph at all" });
      assert.deepEqual(unreadable.findings, [], "an unreadable artifact: zero findings");
      assert.match(said(unreadable.result), /could not be read/u, "…and a limit naming the reason");

      for (const result of [noArtifact.result, unreadable.result]) {
        assert.match(said(result), /NOTHING in this result is a claim that a seam is wired/u, "and neither says a seam is wired");
        assert.equal(result.builtAt, null, "…nor reports a build time it does not have");
      }

      // THE DANGEROUS ONE, asserted from both sides.
      const partial = await laneOver(source, { files: ["src/a.mjs"], edges: [] });
      assert.deepEqual(named(partial.findings), ["src/a.mjs"], "a candidate the graph HOLDS with no dependents is named");
      assert.equal(partial.findings.some((finding) => finding.path === "src/b.mjs"), false, "…and one it reports `present: false` for is NOT reported as unwired");
      assert.match(said(partial.result), /1 candidate\(s\) whose coupling could not be resolved/u, "…it is counted in the limit instead");
      assert.match(said(partial.result), /src\/b\.mjs/u, "…by name");
    },
  },
  {
    name: "acd-seam-liveness-unknown-is-a-limit: the sweep is source ON DISK with a floor above zero, so a graphless project cannot red at error",
    async run() {
      for (const sweep of SEAM_LIVENESS_SWEEPS) {
        assert.equal(sweep.floor > 0, true, `the \`${sweep.id}\` sweep declares a floor greater than zero`);
        assert.match(sweep.what, /source module/u, "…over source modules");
        assert.equal(/graph/u.test(sweep.what), false, "…and never over what the graph covers — that population is empty in every project without an optional tool");
      }

      const many = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`src/m${index}.mjs`, EXPORTS_ONE]));
      const graphless = await laneOver(many, null);
      assert.equal(graphless.result.reads[0].count, 12, "a graphless project's read record counts the source on disk");
      assert.equal(readFinding(graphless.result.reads[0]), null, "…so audit-ran-on-nothing — an ERROR — is not reported for want of an optional tool");

      const sourceless = await laneOver({ "README.md": "no source" }, { files: ["src/a.mjs"], edges: [] });
      const shortfall = readFinding(sourceless.result.reads[0]);
      assert.notEqual(shortfall, null, "and a project with no source at all IS a shortfall — the one case that is genuinely nothing");
      assert.equal(shortfall.severity, "error", "…at error");
    },
  },
  {
    name: "acd-seam-liveness-unknown-is-a-limit: both suppressions are DERIVED — no module-path literal exists in the lane at all",
    run() {
      // A ledger looks like a quoted module path. Two shapes are NOT one and are excluded, each for
      // a reason rather than for convenience:
      //   · an extension test (`endsWith(".mjs")`) names no module, so the census requires a
      //     directory separator inside the quotes;
      //   · an IMPORT SPECIFIER names a module this lane LOADS, which is a dependency of the lane
      //     and not a fact it REMEMBERS about the audited tree. The distinction is the whole point:
      //     item 81's species is a control carrying knowledge of a tree it did not look at, and
      //     `./reads.mjs` is not knowledge about anybody's tree.
      const code = stripComments(moduleSource())
        .split("\n")
        .filter((line) => !/^\s*(?:import|export)\b[^;]*\bfrom\s+["'][^"']+["']/u.test(line) && !/^\s*import\s+["'][^"']+["']/u.test(line))
        .join("\n");
      const ledger = [...code.matchAll(/["'][^"'\n]*\/[^"'\n]*\.mjs["']/gu)].map((match) => match[0]);
      assert.deepEqual(ledger, [], `${MODULE_REL} names no module path, so it can hold no exemption entry — a control that stores a fact about the tree sends its next bill to a stranger (TECH_DEBT item 81)`);
    },
  },
  {
    name: "acd-seam-liveness-unknown-is-a-limit: a zero-export module is never a candidate, and a resolvable relative import suppresses — driven from a subdirectory and against the basename trap",
    async run() {
      // A PROGRAM: no export, ending in a top-level call. It cannot strand an export it lacks.
      const program = await laneOver(
        { "src/zephyr-program.mjs": "async function main() { return 1; }\nawait main();\n", "src/marlow.mjs": EXPORTS_ONE },
        { files: ["src/zephyr-program.mjs", "src/marlow.mjs"], edges: [] },
      );
      assert.deepEqual(named(program.findings), ["src/marlow.mjs"], "a zero-export module is not a candidate, and the exporting one beside it still is");

      // THE SUBDIRECTORY CASE, which a one-level sweep misses — it is why two real modules were
      // falsely reported before the sweep became `src/**`.
      const nested = await laneOver(
        { "src/quill.mjs": EXPORTS_ONE, "src/deep/holder.mjs": 'export async function go() { await import("../quill.mjs"); }\n' },
        { files: ["src/quill.mjs", "src/deep/holder.mjs"], edges: [] },
      );
      assert.equal(named(nested.findings).includes("src/quill.mjs"), false, "a resolvable relative import from a SUBDIRECTORY suppresses");

      // THE BASENAME TRAP. `./tessel.mjs` from `src/notion/` is `src/notion/tessel.mjs` and nothing
      // else. A basename match would suppress `src/tessel.mjs` — which in this repository is the
      // ONLY genuine finding — and leave the rule vacuous while looking cleaner than the correct one.
      const basename = await laneOver(
        {
          "src/tessel.mjs": EXPORTS_ONE,
          "src/notion/tessel.mjs": EXPORTS_ONE,
          "src/notion/tessel-work.mjs": 'export async function go() { await import("./tessel.mjs"); }\n',
        },
        { files: ["src/tessel.mjs", "src/notion/tessel.mjs", "src/notion/tessel-work.mjs"], edges: [] },
      );
      const reported = named(basename.findings);
      assert.equal(reported.includes("src/notion/tessel.mjs"), false, "the literal resolves against the file that holds it");
      assert.equal(reported.includes("src/tessel.mjs"), true, "…and the same-basename module in another directory is STILL named");
    },
  },
  {
    name: "acd-seam-liveness-unknown-is-a-limit: a dependent under a declared test root does not wire a seam, and the roots come from their one home",
    async run() {
      assert.equal(TEST_ROOTS.length >= 3, true, `the declared test roots are non-vacuous: ${TEST_ROOTS.join(", ")}`);
      const code = stripComments(moduleSource());
      assert.match(code, /import \{[^}]*TEST_ROOTS[^}]*\} from "\.\/census\.mjs"/u, "the lane takes the test roots from their one home rather than spelling a second copy");
      for (const root of TEST_ROOTS) {
        assert.equal(new RegExp(`["']${root}["']`, "u").test(code), false, `…and the lane spells no literal for the \`${root}\` root`);
      }

      for (const testRoot of TEST_ROOTS) {
        const { findings } = await laneOver(
          { "src/seam.mjs": EXPORTS_ONE },
          { files: ["src/seam.mjs", `${testRoot}/caller.test.mjs`], edges: [[`${testRoot}/caller.test.mjs`, "src/seam.mjs"]] },
        );
        assert.equal(named(findings).includes("src/seam.mjs"), true, `a dependent under \`${testRoot}\` does not wire the seam`);
      }

      const wired = await laneOver(
        { "src/seam.mjs": EXPORTS_ONE, "src/caller.mjs": EXPORTS_ONE },
        { files: ["src/seam.mjs", "src/caller.mjs"], edges: [["src/caller.mjs", "src/seam.mjs"]] },
      );
      assert.equal(named(wired.findings).includes("src/seam.mjs"), false, "and a production caller does — so the exclusion is not simply reporting everything");
    },
  },
];
