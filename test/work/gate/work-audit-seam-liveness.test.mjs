// Behavioural evidence for milestone 77 / story 02 — the seam liveness.
//
//   tasks/00_a-seam-with-no-production-caller-is-named.feature
//   tasks/01_an-unknown-is-a-stated-limit-never-a-clean-seam.feature
//   tasks/02_the-suppressions-are-derived-never-ledgered.feature
//
// The census rows of task 01 — the routes to a graph that must not exist in the lane's own source —
// are the control's, and live in `acd-seam-liveness-unknown-is-a-limit.test.mjs`.
//
// EVERY GRAPH HERE IS A REAL ARTIFACT ON DISK, written into a temp project root and read back
// through the shipped reader — the same reasoning 72/01's suite gives: handing the lane an
// already-normalised object would drive the arithmetic and skip the two things most likely to be
// wrong, that the artifact is FOUND and that one which does not parse is an ANSWER rather than a
// crash. And every corpus is built for its own run, holding no name this lane could have stored:
// a derivation that only works on the repository it was written against is a ledger with extra
// steps.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { graphJsonPath } from "../../../src/graph-normalize.mjs";
import { TEST_ROOTS } from "../../../src/work-audit/census.mjs";
import { readFinding } from "../../../src/work-audit/reads.mjs";
import {
  SEAM_LIVENESS_FINDING_CODES,
  dependentsIndex,
  exportedNames,
  runSeamLiveness,
} from "../../../src/work-audit/seam-liveness.mjs";

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────────

const EXPORTS_ONE = "export function reach() { return 1; }\n";
const NO_EXPORTS = "function main() { return 1; }\nawait main();\n";

function project(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "aof-seam-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

// A raw NetworkX node_link_data artifact, written where the shipped reader looks for it. `links`,
// never `edges` — the key spelling the normalizer exists to police.
function writeGraph(root, { files = [], edges = [] } = {}, raw = null) {
  mkdirSync(path.join(root, "graphify-out"), { recursive: true });
  const index = new Map(files.map((file, position) => [file, `n${position}`]));
  const body = raw ?? JSON.stringify({
    directed: true,
    multigraph: false,
    graph: {},
    nodes: files.map((file, position) => ({ id: `n${position}`, label: file, source_file: file })),
    links: edges.map(([from, into]) => ({ source: index.get(from), target: index.get(into), relation: "imports", confidence: "EXPLICIT" })),
  });
  writeFileSync(graphJsonPath(root), body);
}

// `from` imports `into` — an edge ARRIVING at `into` makes `from` a dependent of it.
const imports = (from, into) => [from, into];

async function laneOver(files, graph, options = {}) {
  const root = project(files);
  try {
    if (graph !== null) writeGraph(root, graph.spec ?? graph, graph.raw ?? null);
    const result = await runSeamLiveness({ root, ...options });
    return { root, result, findings: result.findings.filter((finding) => finding.code === "audit-seam-unwired") };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// An artifact that is ON DISK and cannot be read: a directory where the file should be. The
// alternative — a chmod — is not portable to the Windows control node this repository runs on.
async function laneOverUnreadableArtifact(files) {
  const root = project(files);
  try {
    mkdirSync(graphJsonPath(root), { recursive: true });
    const result = await runSeamLiveness({ root });
    return { root, result, findings: result.findings.filter((finding) => finding.code === "audit-seam-unwired") };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const named = (findings) => findings.map((finding) => finding.path).sort();

export const seamLivenessTests = [
  // ── TASK 00 — THE SEAM IS NAMED ────────────────────────────────────────────────────────────
  {
    name: "seam-liveness: an exported module the graph gives no dependents is named, with what it strands",
    async run() {
      const { result, findings } = await laneOver(
        { "src/seam.mjs": EXPORTS_ONE, "src/caller.mjs": "export function other() { return 2; }\n" },
        { files: ["src/seam.mjs", "src/caller.mjs"], edges: [] },
      );
      assert.equal(findings.length, 2, "both exported modules with no dependent are named");
      for (const finding of findings) {
        assert.equal(finding.code, "audit-seam-unwired", "coded audit-seam-unwired");
        assert.equal(finding.severity, "warn", "…at warn");
      }
      const seam = findings.find((finding) => finding.path === "src/seam.mjs");
      assert.notEqual(seam, undefined, "it names that module");
      assert.match(seam.message, /`reach`/u, "and it names the export it strands");
      assert.equal(result.findings.length, findings.length, "and no other finding is reported");
    },
  },
  {
    name: "seam-liveness: only a caller outside every declared test root wires a seam",
    async run() {
      const rows = [
        [["test/seam.test.mjs"], true, "one file under test/"],
        [["test/arch/acd-seam.test.mjs"], true, "one file under test/arch/"],
        [["test/integration/seam.test.mjs"], true, "one file under test/integration/"],
        [["test/a.test.mjs", "test/arch/b.test.mjs", "test/integration/c.test.mjs"], true, "files under all three declared test roots"],
        [["src/caller.mjs"], false, "one module under src/"],
        [["src/caller.mjs", "test/arch/b.test.mjs"], false, "one module under src/ and one under test/arch/"],
        [["src/work/test-changed.mjs"], false, "one module under src/ whose own name holds \"test\""],
        [["docs/example.mjs"], false, "one file under a root that is declared nowhere"],
      ];
      for (const [dependents, expectNamed, why] of rows) {
        const { findings } = await laneOver(
          { "src/seam.mjs": EXPORTS_ONE },
          { files: ["src/seam.mjs", ...dependents], edges: dependents.map((file) => imports(file, "src/seam.mjs")) },
        );
        assert.equal(
          findings.some((finding) => finding.path === "src/seam.mjs"),
          expectNamed,
          `${why}: the module ${expectNamed ? "is named as an unwired seam at warn" : "is not named"}`,
        );
      }
      assert.deepEqual([...TEST_ROOTS], ["test", "test/arch", "test/integration"], "and the roots come from their one home rather than a second spelling here");
    },
  },
  {
    name: "seam-liveness: a dependency is not a dependent, so the graph's observed noise cannot wire a seam",
    async run() {
      const rows = [
        [imports("src/caller.mjs", "src/seam.mjs"), false, "a dependent under src/"],
        [imports("src/seam.mjs", "src/other.mjs"), true, "a dependency under src/"],
        [imports("src/seam.mjs", "test/arch/acd-migrate.test.mjs"), true, "a dependency that is a test file — the noise as observed"],
        [imports("test/seam.test.mjs", "src/seam.mjs"), true, "a dependent that is a test file"],
      ];
      for (const [edge, expectNamed, why] of rows) {
        const { findings } = await laneOver(
          { "src/seam.mjs": EXPORTS_ONE },
          { files: ["src/seam.mjs", "src/caller.mjs", "src/other.mjs", "test/seam.test.mjs", "test/arch/acd-migrate.test.mjs"], edges: [edge] },
        );
        assert.equal(findings.some((finding) => finding.path === "src/seam.mjs"), expectNamed, `${why}: the module ${expectNamed ? "is named" : "is not named"}`);
      }
    },
  },
  {
    name: "seam-liveness: the finding names what is stranded, not merely the file that holds it",
    async run() {
      const rows = [
        ["export function alpha() {}\n", ["alpha"], "exports one function"],
        ["export function alpha() {}\nexport function bravo() {}\nexport function charlie() {}\n", ["alpha", "bravo", "charlie"], "exports three functions"],
        ["export const alpha = 1;\nexport function bravo() {}\n", ["alpha", "bravo"], "exports one const and one function"],
        ["export default function () {}\n", ["default"], "has only a default export"],
      ];
      for (const [source, expected, why] of rows) {
        const { findings } = await laneOver({ "src/seam.mjs": source }, { files: ["src/seam.mjs"], edges: [] });
        assert.equal(findings.length, 1, `${why}: one finding`);
        for (const name of expected) {
          assert.equal(findings[0].message.includes(`\`${name}\``), true, `${why}: the finding names \`${name}\``);
        }
        assert.deepEqual(exportedNames(source), expected, `${why}: and the export reader agrees`);
      }
    },
  },
  {
    name: "seam-liveness: the finding names the module by a project-root-relative path with forward slashes",
    async run() {
      const rows = [
        ["src/sync.mjs", "the top of src/"],
        ["src/notion/sync.mjs", "a subdirectory of src/"],
        ["src/a/b/seam.mjs", "two directories deep under src/"],
      ];
      for (const [location, why] of rows) {
        const { root, findings } = await laneOver({ [location]: EXPORTS_ONE }, { files: [location], edges: [] });
        assert.equal(findings.length, 1, `${why}: one finding`);
        assert.equal(findings[0].path, location, `${why}: the finding names ${location}`);
        assert.equal(findings[0].path.includes(root), false, "and it names no absolute path");
        assert.equal(findings[0].path.includes("\\"), false, "and the path it names holds no backslash");
      }
    },
  },
  {
    name: "seam-liveness: fifty candidates give the answer of fifty single-candidate runs",
    async run() {
      const many = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`src/m${index}.mjs`, EXPORTS_ONE]));
      const files = Object.keys(many);
      // Half are wired by a production caller, half by a test file only.
      const edges = files.map((file, index) => (index % 2 === 0 ? imports("src/hub.mjs", file) : imports("test/hub.test.mjs", file)));
      const graph = { files: [...files, "src/hub.mjs", "test/hub.test.mjs"], edges };

      const together = await laneOver(many, graph);

      const separately = [];
      for (const file of files) {
        const one = await laneOver({ [file]: EXPORTS_ONE }, graph);
        separately.push(...named(one.findings));
      }

      assert.deepEqual(named(together.findings), separately.sort(), "its findings are exactly the findings of fifty single-candidate runs combined");
      assert.equal(new Set(named(together.findings)).size, together.findings.length, "and no finding appears twice");
      assert.equal(together.findings.length, 25, "…which is the twenty-five wired only by a test file");
    },
  },
  {
    name: "seam-liveness: the graph is walked ONCE for the whole candidate set, never once per candidate",
    run() {
      for (const count of [50, 150]) {
        const files = Array.from({ length: count }, (_, index) => `src/m${index}.mjs`);
        let walks = 0;
        const edges = [];
        const graph = {
          nodes: files.map((file, index) => ({ id: `n${index}`, sourceFile: file })),
          get edges() { walks += 1; return edges; },
        };

        const index = dependentsIndex(graph);
        assert.equal(walks, 1, `${count} candidates: the edges are walked once, and the number does not grow with the candidate count`);
        assert.equal(index.present.size, count, "…and every candidate's presence was resolved from that one pass");

        // The contrast the bound exists for: asked per candidate, the same walk happens per candidate.
        walks = 0;
        for (const file of files) { void file; void graph.edges; }
        assert.equal(walks, count, `${count} candidates: a per-candidate walk would cost ${count} passes, which is what ADR-006 §1a prices at ~12 s`);
      }
    },
  },
  {
    name: "seam-liveness: the sweep counts source modules on disk, never modules the graph covers",
    async run() {
      const twenty = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`src/m${index}.mjs`, EXPORTS_ONE]));
      const { result } = await laneOver(twenty, { files: ["src/m0.mjs", "src/m1.mjs", "src/m2.mjs"], edges: [] });
      assert.equal(result.reads[0].count, 20, "the read record counts twenty");
      assert.equal(result.reads[0].floor > 0, true, "its floor is greater than zero");
      assert.equal(readFinding(result.reads[0]), null, "and no audit-ran-on-nothing finding is reported");
    },
  },
  {
    name: "seam-liveness: this lane's OWN vocabulary is one code at one severity",
    async run() {
      const { result } = await laneOver(
        { "src/a.mjs": EXPORTS_ONE, "src/b.mjs": EXPORTS_ONE, "src/c.mjs": EXPORTS_ONE },
        { files: ["src/a.mjs", "src/b.mjs", "src/c.mjs"], edges: [] },
      );
      for (const finding of result.findings) {
        assert.equal(finding.code, "audit-seam-unwired", "its code is audit-seam-unwired");
        assert.equal(finding.severity, "warn", "and its severity is warn");
      }
      assert.equal(new Set(result.findings.map((finding) => finding.code)).size, 1, "no finding carries a second code");
      assert.equal(new Set(result.findings.map((finding) => finding.severity)).size, 1, "…or a second severity");
      assert.deepEqual([...SEAM_LIVENESS_FINDING_CODES], ["audit-seam-unwired"], "and the code set this lane declares holds that one code and nothing else");
    },
  },

  // ── TASK 01 — AN UNKNOWN IS A STATED LIMIT ─────────────────────────────────────────────────
  {
    name: "seam-liveness: an artifact that cannot answer produces no finding and a limit that says why",
    async run() {
      const source = { "src/a.mjs": EXPORTS_ONE, "src/b.mjs": EXPORTS_ONE };
      const rows = [
        [null, /no code graph was available/u, "no graph artifact on disk"],
        // A DIRECTORY where the artifact should be: on disk, and genuinely unreadable.
        ["directory", /could not be read/u, "an artifact on disk that cannot be read"],
        [{ raw: "{ not json at all" }, /could not be read/u, "an artifact on disk that does not parse"],
        // `edges` where the reader requires `links` — the shape `normalizeGraph` surfaces as a
        // format error rather than returning a silently empty edge set.
        [{ raw: JSON.stringify({ nodes: [], edges: [] }) }, /could not be read/u, "an artifact whose shape the shared reader refuses"],
      ];
      for (const [graph, reason, why] of rows) {
        const { result, findings } = graph === "directory"
          ? await laneOverUnreadableArtifact(source)
          : await laneOver(source, graph);
        assert.deepEqual(findings, [], `${why}: no audit-seam-unwired finding is reported`);
        const said = result.limits.map((limit) => limit.consequence).join(" ");
        assert.match(said, reason, `${why}: the result carries a limit stating the reason`);
        assert.match(said, /NOTHING in this result is a claim that a seam is wired/u, `${why}: and nothing in the result claims that any seam is wired`);
      }
    },
  },
  {
    name: "seam-liveness: a candidate the graph does not hold is counted in the limit, never reported as unwired",
    async run() {
      const { result, findings } = await laneOver(
        { "src/held.mjs": EXPORTS_ONE, "src/absent.mjs": EXPORTS_ONE },
        { files: ["src/held.mjs"], edges: [] },
      );
      assert.deepEqual(named(findings), ["src/held.mjs"], "exactly one finding is reported, naming the first");
      assert.equal(findings.some((finding) => finding.path === "src/absent.mjs"), false, "and no finding names the second");

      const said = result.limits.map((limit) => limit.consequence).join(" ");
      assert.match(said, /1 candidate\(s\) whose coupling could not be resolved/u, "the result carries a limit counting one candidate whose coupling could not be resolved");
      assert.match(said, /src\/absent\.mjs/u, "…naming it");
      assert.equal(/src\/absent\.mjs[^.]*no dependent/u.test(said), false, "and the second module is not described as having no dependents");
    },
  },
  {
    name: "seam-liveness: the floor is taken over source on disk, so an optional tool's absence cannot red a run",
    async run() {
      const many = (count) => Object.fromEntries(Array.from({ length: count }, (_, index) => [`src/m${index}.mjs`, EXPORTS_ONE]));
      const rows = [
        [many(148), { files: Object.keys(many(148)), edges: [] }, 148, false, "148 modules, an artifact holding all 148"],
        [many(148), { files: ["src/m0.mjs", "src/m1.mjs", "src/m2.mjs"], edges: [] }, 148, false, "148 modules, an artifact holding three"],
        [many(148), { files: [], edges: [] }, 148, false, "148 modules, an artifact holding none"],
        [many(148), null, 148, false, "148 modules, no artifact at all"],
        [{ "README.md": "no source at all" }, { files: Object.keys(many(148)), edges: [] }, 0, true, "no module at all, an artifact holding 148"],
      ];
      for (const [files, graph, count, reported, why] of rows) {
        const { result } = await laneOver(files, graph);
        assert.equal(result.reads[0].count, count, `${why}: the read record counts ${count}`);
        assert.equal(result.reads[0].floor > 0, true, `${why}: against a floor greater than zero`);
        const shortfall = readFinding(result.reads[0]);
        if (reported) {
          assert.notEqual(shortfall, null, `${why}: audit-ran-on-nothing is reported`);
          assert.equal(shortfall.severity, "error", "…at error");
        } else {
          assert.equal(shortfall, null, `${why}: audit-ran-on-nothing is not reported`);
        }
      }
    },
  },
  {
    name: "seam-liveness: every result reports the artifact's own recorded build time",
    async run() {
      const source = { "src/a.mjs": EXPORTS_ONE };
      const resolving = await laneOver(source, { files: ["src/a.mjs"], edges: [] });
      assert.notEqual(resolving.result.builtAt, null, "a graph resolving every candidate reports the artifact's instant");
      assert.equal(Number.isFinite(Date.parse(resolving.result.builtAt)), true, "…as a parseable instant");
      assert.equal(Date.parse(resolving.result.builtAt) <= Date.now(), true, "and it reports no instant later than the artifact's");

      const holdingNone = await laneOver(source, { files: [], edges: [] });
      assert.notEqual(holdingNone.result.builtAt, null, "a graph holding none of the candidates still reports the artifact's instant");

      for (const [graph, why] of [[{ raw: "{ broken" }, "an artifact that does not parse"], [null, "no artifact on disk"]]) {
        const { result } = await laneOver(source, graph);
        assert.equal(result.builtAt, null, `${why}: no build time`);
        assert.match(result.limits.map((limit) => limit.consequence).join(" "), /no build time to report/u, `${why}: and the limit says why`);
      }
    },
  },
  {
    name: "seam-liveness: the build time is the artifact's, never the moment of the call",
    async run() {
      const root = project({ "src/a.mjs": EXPORTS_ONE });
      try {
        writeGraph(root, { files: ["src/a.mjs"], edges: [] });
        const first = await runSeamLiveness({ root });
        await new Promise((resolve) => { setTimeout(resolve, 30); });
        const second = await runSeamLiveness({ root });
        assert.equal(second.builtAt, first.builtAt, "both results report that same instant with time passing between the two runs");
        assert.deepEqual(second.findings, first.findings, "…and the same findings");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "seam-liveness: a clean run still states what it could not see",
    async run() {
      const { result, findings } = await laneOver(
        { "src/a.mjs": EXPORTS_ONE, "src/b.mjs": EXPORTS_ONE },
        { files: ["src/a.mjs", "src/b.mjs"], edges: [imports("src/b.mjs", "src/a.mjs"), imports("src/a.mjs", "src/b.mjs")] },
      );
      assert.deepEqual(findings, [], "no audit-seam-unwired finding is reported");
      assert.equal(result.limits.length > 0, true, "the result still carries the limits this lane can state");
      for (const limit of result.limits) {
        assert.equal(typeof limit.question === "string" && limit.question.length > 0, true, "every limit states the question it answers");
        assert.equal(typeof limit.consequence === "string" && limit.consequence.length > 0, true, "…and the consequence of not answering it");
      }
      const said = result.limits.map((limit) => limit.consequence).join(" ");
      assert.equal(/seams are fine|no unwired seam|everything is wired/iu.test(said), false, "and no statement in the result says the seams are fine");
    },
  },

  // ── TASK 02 — THE SUPPRESSIONS ARE DERIVED ─────────────────────────────────────────────────
  {
    name: "seam-liveness: a module declaring no export is never a candidate",
    async run() {
      const rows = [
        ["function main() {}\nawait main();\n", false, "declares no export and ends in `await main()`"],
        ["function main() {}\nmain();\n", false, "declares no export and ends in a top-level call"],
        ["// nothing but a comment, and a long one at that\n", false, "declares no export and holds only comments"],
        ["export function reach() {}\nasync function main() {}\nawait main();\n", true, "exports one function and ends in `await main()`"],
        ["export function reach() {}\n", true, "exports one function and is spawned by another module"],
      ];
      for (const [source, expectNamed, why] of rows) {
        const { result, findings } = await laneOver(
          { "src/subject.mjs": source, "src/spawner.mjs": 'export const program = "src/subject.mjs";\n' },
          { files: ["src/subject.mjs", "src/spawner.mjs"], edges: [] },
        );
        assert.equal(findings.some((finding) => finding.path === "src/subject.mjs"), expectNamed, `${why}: the module ${expectNamed ? "is named as an unwired seam at warn" : "is not a candidate and is not named"}`);
        if (!expectNamed) {
          assert.equal(JSON.stringify(result).includes("src/subject.mjs"), false, "and no exemption entry anywhere in the result names it");
        }
      }
    },
  },
  {
    name: "seam-liveness: a resolvable dynamic-import literal is a reference, swept at every depth under src/",
    async run() {
      const rows = [
        ["./scaffold.mjs", "src/holder.mjs", false, "a module at the top of src/"],
        ["../scaffold.mjs", "src/commands/holder.mjs", false, "a module one directory under src/"],
        ["../../scaffold.mjs", "src/a/b/holder.mjs", false, "a module two directories under src/"],
        ["../src/scaffold.mjs", "test/holder.test.mjs", true, "a file under test/"],
      ];
      for (const [literal, holder, expectNamed, why] of rows) {
        const { findings } = await laneOver(
          { "src/scaffold.mjs": EXPORTS_ONE, [holder]: `export async function go() { await import("${literal}"); }\n` },
          { files: ["src/scaffold.mjs", holder], edges: [] },
        );
        assert.equal(findings.some((finding) => finding.path === "src/scaffold.mjs"), expectNamed, `${why}: the module ${expectNamed ? "is named as an unwired seam at warn" : "is not named"}`);
      }
    },
  },
  {
    name: "seam-liveness: a literal is resolved against the file that holds it, never matched by basename",
    async run() {
      const rows = [
        ["./sync.mjs", "src/notion/sync-work.mjs", "src/notion/sync.mjs", "src/sync.mjs"],
        ["../sync.mjs", "src/notion/sync-work.mjs", "src/sync.mjs", "src/notion/sync.mjs"],
        ["./sync.mjs", "src/dsl.mjs", "src/sync.mjs", "src/notion/sync.mjs"],
      ];
      for (const [literal, holder, suppressed, stillNamed] of rows) {
        const { findings } = await laneOver(
          {
            "src/sync.mjs": EXPORTS_ONE,
            "src/notion/sync.mjs": EXPORTS_ONE,
            [holder]: `export async function go() { await import("${literal}"); }\n`,
          },
          { files: ["src/sync.mjs", "src/notion/sync.mjs", holder], edges: [] },
        );
        const reported = named(findings);
        assert.equal(reported.includes(suppressed), false, `import("${literal}") in ${holder}: ${suppressed} is not named`);
        assert.equal(reported.includes(stillNamed), true, `…and ${stillNamed} is named as an unwired seam at warn`);
      }
    },
  },
  {
    name: "seam-liveness: an import that resolves to nothing on disk suppresses nothing",
    async run() {
      const rows = [
        ['await import("./nowhere.mjs");', "a relative path that is on no disk file"],
        ['await import("lodash");', "a bare package specifier"],
        ['await import("seam.mjs");', "the module by its basename alone"],
        ['await import("../../outside/seam.mjs");', "a path resolving outside src/"],
      ];
      for (const [statement, why] of rows) {
        const { findings } = await laneOver(
          { "src/seam.mjs": EXPORTS_ONE, "src/holder.mjs": `export async function go() { ${statement} }\n` },
          { files: ["src/seam.mjs", "src/holder.mjs"], edges: [] },
        );
        assert.equal(findings.some((finding) => finding.path === "src/seam.mjs"), true, `${why}: the module is named as an unwired seam at warn`);
      }
    },
  },
  {
    name: "seam-liveness: an import the lane cannot read as a literal is a stated blindness, not a suppression",
    async run() {
      const rows = [
        ["const target = \"./seam.mjs\"; await import(target);", "an argument that is a variable"],
        ["await import(`./${name}.mjs`);", "a template holding an interpolation"],
        ["const paths = [\"./seam.mjs\"]; await import(paths[0]);", "an element of an array"],
      ];
      for (const [statement, why] of rows) {
        const { result, findings } = await laneOver(
          { "src/seam.mjs": EXPORTS_ONE, "src/holder.mjs": `export async function go(name) { void name; ${statement} }\n` },
          { files: ["src/seam.mjs", "src/holder.mjs"], edges: [] },
        );
        assert.equal(findings.some((finding) => finding.path === "src/seam.mjs"), true, `${why}: the module is named as an unwired seam at warn`);
        assert.match(
          result.limits.map((limit) => limit.consequence).join(" "),
          /cannot read as a literal|INVISIBLE to this rule/u,
          `${why}: and the result carries a limit saying an import it cannot read as a literal is invisible to it`,
        );
      }
    },
  },
  {
    name: "seam-liveness: both suppressions hold over a corpus this lane has never seen",
    async run() {
      // No name here appears in this repository, so nothing the lane could have stored can help it.
      const { result, findings } = await laneOver(
        {
          "src/zephyr-program.mjs": NO_EXPORTS,
          "src/quill-reached.mjs": EXPORTS_ONE,
          "src/deep/tessel-holder.mjs": 'export async function go() { await import("../quill-reached.mjs"); }\n',
          "src/marlow-stranded.mjs": EXPORTS_ONE,
        },
        { files: ["src/zephyr-program.mjs", "src/quill-reached.mjs", "src/deep/tessel-holder.mjs", "src/marlow-stranded.mjs"], edges: [imports("src/marlow-stranded.mjs", "src/deep/tessel-holder.mjs")] },
      );
      assert.deepEqual(named(findings), ["src/marlow-stranded.mjs"], "exactly one finding is reported, naming the third module");
      assert.equal(findings.some((finding) => /zephyr|quill/u.test(finding.path)), false, "and neither of the first two is named");
      for (const foreign of ["scaffold.mjs", "work/audit-probe.mjs", "sync.mjs", "clean.mjs"]) {
        assert.equal(JSON.stringify(result).includes(foreign), false, `no name from any other project appears anywhere in the result (${foreign})`);
      }
    },
  },
  {
    name: "seam-liveness: the suppression is recomputed for each corpus and never remembered between them",
    async run() {
      const withImport = await laneOver(
        { "src/seam.mjs": EXPORTS_ONE, "src/holder.mjs": 'export async function go() { await import("./seam.mjs"); }\n' },
        { files: ["src/seam.mjs", "src/holder.mjs"], edges: [] },
      );
      const withoutImport = await laneOver(
        { "src/seam.mjs": EXPORTS_ONE, "src/holder.mjs": "export async function go() { return 1; }\n" },
        { files: ["src/seam.mjs", "src/holder.mjs"], edges: [] },
      );
      assert.equal(named(withImport.findings).includes("src/seam.mjs"), false, "that module is not named in the first result");
      assert.equal(named(withoutImport.findings).includes("src/seam.mjs"), true, "and it is named as an unwired seam at warn in the second");
      assert.notDeepEqual(named(withoutImport.findings), named(withImport.findings), "so the second answer is not the first repeated");
    },
  },
];
