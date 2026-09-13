// Traceability wiring for milestone 96 / story 01 — the sets are derived, not recalled.
//
// Covers EVERY @executable scenario in the three task features:
//   tasks/00_the-proposal-is-derived-from-three-sources-and-says-which.feature
//   tasks/01_the-test-lane-is-derived-not-recalled.feature
//   tasks/02_it-proposes-and-never-writes.feature
//
// EVERY GRAPH HERE IS A REAL ARTIFACT ON DISK, written into a temp project root and read back
// through the shipped reader — 72/01's own reasoning, and 77/02's: handing the derivation an
// already-normalised object would drive the arithmetic and skip the two things most likely to be
// wrong, that the artifact is FOUND and that one which does not parse is an ANSWER rather than a
// crash. One test object per @executable scenario, Scenario-Outline rows folded into one entry
// iterating the rows. node:assert/strict, `{ name, run }` shape.
//
// The scenarios this file does not drive are the three that are properties of the TREE rather than
// of the seam — the graph reached only through the shipped reader, suite membership having one
// spelling, and the absence of any write path to a `STORY.md`. Those are FF-9602's, in
// test/arch/planning/acd-derivation-proposes-never-writes.test.mjs.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { stripComments } from "../support/source-slice.mjs";
import { PROPOSAL_REASONS, deriveStoryContract } from "../../src/story-contract-derive.mjs";
import { partitionReadySetByDeclaredFiles } from "../../src/ready-wave.mjs";

// ── fixtures ─────────────────────────────────────────────────────────────────

const node = (id, sourceFile) => ({ id, label: id, file_type: "module", source_file: sourceFile, community: 0, norm_label: id });
const link = (source, target) => ({ source, target, relation: "IMPORTS", confidence: "EXPLICIT" });

// The coupling every graph scenario is measured against: two modules import the subject, and the
// subject imports one other. Three answers, three reasons.
const COUPLED = {
  nodes: [node("n_x", "src/x.mjs"), node("n_a", "src/a.mjs"), node("n_b", "src/b.mjs"), node("n_c", "src/c.mjs")],
  links: [link("n_a", "n_x"), link("n_b", "n_x"), link("n_x", "n_c")],
};

// The same shape with different coupling — so "stable" can be shown to mean "a function of its
// inputs" rather than "constant".
const OTHER = {
  nodes: [node("n_x", "src/x.mjs"), node("n_d", "src/d.mjs")],
  links: [link("n_d", "n_x")],
};

// A graph that carries no node for the subject at all: its coupling is UNKNOWN, which is not the
// same fact as having none.
const WITHOUT_SUBJECT = { nodes: [node("n_a", "src/a.mjs")], links: [] };

async function project({ graph = null, graphText = null } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-derive-"));
  if (graph != null || graphText != null) {
    await mkdir(path.join(root, "graphify-out"), { recursive: true });
    await writeFile(path.join(root, "graphify-out", "graph.json"), graphText ?? JSON.stringify(graph), "utf8");
  }
  return root;
}

const withProject = (options, body) => async () => {
  const root = await project(options);
  try {
    return await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

const reasonFor = (entries, file) => entries.find((e) => e.path === file)?.reason;
const paths = (entries) => entries.map((e) => e.path);

export const storyContractDeriveTests = [
  // ════════════════════════════════════════════════════════════════════════════
  // 00_the-proposal-is-derived-from-three-sources-and-says-which.feature
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: "96/01/00 the graph's coupling around a subject file is proposed, with its reason — two importers and one import, each naming the graph as its source",
    run: withProject({ graph: COUPLED }, async (root) => {
      const proposal = deriveStoryContract({ projectRoot: root, subjects: ["src/x.mjs"] });
      assert.ok(proposal.graph.available, "the graph was found and read");
      assert.deepEqual(paths(proposal.reads), ["src/a.mjs", "src/b.mjs", "src/c.mjs"], "the two importers and the one import are proposed");
      assert.equal(reasonFor(proposal.reads, "src/a.mjs"), "graph-dependent", "an importer names the graph as its source");
      assert.equal(reasonFor(proposal.reads, "src/b.mjs"), "graph-dependent");
      assert.equal(reasonFor(proposal.reads, "src/c.mjs"), "graph-dependency", "…and so does an import");
      assert.equal(proposal.complete, true, "the coupling was learned, so the proposal is complete");
    }),
  },
  {
    name: "96/01/00 a citation in the milestone's own documents is proposed for reads, with its reason — a file the graph reports no coupling for",
    run: withProject({ graph: COUPLED }, async (root) => {
      const proposal = deriveStoryContract({
        projectRoot: root,
        subjects: ["src/x.mjs"],
        documents: [{ path: "SPEC.md", text: "measured at `src/cited.mjs:41`" }, { path: "ARCHITECTURE.md", text: "see src/adr-cited.mjs:12-19" }],
      });
      assert.ok(paths(proposal.reads).includes("src/cited.mjs"), "the SPEC's citation is proposed for reads");
      assert.ok(paths(proposal.reads).includes("src/adr-cited.mjs"), "…and the ADR's");
      assert.equal(reasonFor(proposal.reads, "src/cited.mjs"), "citation", "it carries a reason naming the citation as its source");
      assert.equal(reasonFor(proposal.reads, "src/adr-cited.mjs"), "citation");
      // A MENTION IS NOT A CITATION. The line number is what makes it one, and it is what ADR-004
      // §3 names — without it a proposal fills with every filename any document happens to say.
      const mention = deriveStoryContract({ projectRoot: root, subjects: [], documents: [{ path: "SPEC.md", text: "we changed src/mentioned.mjs a lot" }] });
      assert.deepEqual(paths(mention.reads), [], "a bare mention with no line number is not a citation");
    }),
  },
  {
    name: "96/01/00 every proposed entry carries a reason from the closed set, and a seventh source cannot arrive as a free string",
    run: withProject({ graph: COUPLED }, async (root) => {
      const proposal = deriveStoryContract({
        projectRoot: root,
        subjects: ["src/x.mjs"],
        documents: [{ path: "SPEC.md", text: "`src/cited.mjs:41`" }],
      });
      const seen = [...proposal.reads, ...proposal.files];
      assert.ok(seen.length > 0, "there are entries to read");
      for (const entry of seen) {
        assert.ok(PROPOSAL_REASONS.includes(entry.reason), `"${entry.reason}" is a member of the exported reason set`);
      }
      // The set is FROZEN, so a source outside it is rejected rather than pushed in at a call site.
      assert.ok(Object.isFrozen(PROPOSAL_REASONS), "the reason set is frozen");
      assert.throws(() => PROPOSAL_REASONS.push("invented-source"), "a seventh source cannot arrive as a free string");
      assert.equal(PROPOSAL_REASONS.includes("invented-source"), false, "…and did not");
    }),
  },
  {
    name: "96/01/00 an unusable graph yields a citation-only proposal that says so — absent and unreadable are two ways to have no graph and one honest answer",
    run: async () => {
      const rows = [
        { artifact: "absent", options: {}, unavailable: "absent" },
        { artifact: "present but unreadable", options: { graphText: "{ this is not json" }, unavailable: "unreadable" },
      ];
      for (const row of rows) {
        const root = await project(row.options);
        try {
          const proposal = deriveStoryContract({
            projectRoot: root,
            subjects: ["src/x.mjs"],
            documents: [{ path: "SPEC.md", text: "`src/cited.mjs:41`" }],
          });
          assert.deepEqual(paths(proposal.reads), ["src/cited.mjs"], `${row.artifact}: the citation-derived entries are proposed`);
          assert.equal(proposal.graph.available, false, `${row.artifact}: the proposal states that graph coupling was unavailable`);
          assert.equal(proposal.graph.unavailable, row.unavailable, `${row.artifact}: …and which way it was unavailable, because the repairs differ`);
          assert.equal(proposal.complete, false, `${row.artifact}: it is not reported as a complete proposal`);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "96/01/00 a subject file the graph does not cover is reported as unknown, never as uncoupled",
    run: withProject({ graph: WITHOUT_SUBJECT }, async (root) => {
      const proposal = deriveStoryContract({ projectRoot: root, subjects: ["src/x.mjs"] });
      assert.deepEqual(proposal.unknownCoupling, ["src/x.mjs"], "the proposal states that the file's coupling is unknown");
      assert.equal(proposal.complete, false, "…so the proposal is not complete");
      const graphDerived = proposal.reads.filter((e) => e.reason.startsWith("graph-"));
      assert.deepEqual(graphDerived, [], "it does not report that file as having no dependents — it reports that it does not know");
    }),
  },
  {
    name: "96/01/00 the proposal is ordered and stable — identical over the same inputs, different over a different graph",
    run: async () => {
      const one = await project({ graph: COUPLED });
      const two = await project({ graph: OTHER });
      try {
        const inputs = { subjects: ["src/x.mjs"], documents: [{ path: "SPEC.md", text: "`src/cited.mjs:41` `src/also.mjs:2`" }] };
        const first = deriveStoryContract({ projectRoot: one, ...inputs });
        const again = deriveStoryContract({ projectRoot: one, ...inputs });
        assert.deepEqual(again, first, "two derivations in one process are identical");
        assert.deepEqual(paths(first.reads), [...paths(first.reads)].sort(), "…and ordered by path");
        const other = deriveStoryContract({ projectRoot: two, ...inputs });
        assert.notDeepEqual(paths(other.reads), paths(first.reads), "a proposal over a different planted graph differs from the first");
      } finally {
        await rm(one, { recursive: true, force: true });
        await rm(two, { recursive: true, force: true });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 01_the-test-lane-is-derived-not-recalled.feature
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: "96/01/01 a source file with no declared suite proposes one, naming the test lane as its source",
    run: withProject({ graph: COUPLED }, async (root) => {
      const proposal = deriveStoryContract({ projectRoot: root, subjects: ["src/x.mjs"], declaredFiles: ["src/x.mjs"] });
      assert.ok(paths(proposal.files).includes("test/x.test.mjs"), "the suite owning that module is proposed for files:");
      assert.equal(reasonFor(proposal.files, "test/x.test.mjs"), "test-lane", "it carries a reason naming the test lane as its source");
      assert.equal(proposal.files.find((e) => e.path === "test/x.test.mjs").declared, false, "…and it is new, not already the author's");
    }),
  },
  {
    name: "96/01/01 a source file whose suite is already declared proposes nothing further for that module",
    run: withProject({ graph: COUPLED }, async (root) => {
      const declaredFiles = ["src/x.mjs", "test/x.test.mjs"];
      const proposal = deriveStoryContract({ projectRoot: root, subjects: declaredFiles, declaredFiles });
      const newlyProposed = proposal.files.filter((e) => !e.declared);
      assert.deepEqual(newlyProposed, [], "no additional suite is proposed for that module");
      assert.equal(proposal.files.find((e) => e.path === "test/x.test.mjs").declared, true, "…the suite it already names is reported as already declared");
    }),
  },
  {
    name: "96/01/01 what owes a suite, and what does not — the rule applies to source, once, and to nothing else",
    run: withProject({ graph: COUPLED }, async (root) => {
      const rows = [
        { declared: "one source module under a source root", subjects: ["src/x.mjs"], suites: ["test/x.test.mjs"] },
        { declared: "two source modules under a source root", subjects: ["src/x.mjs", "src/y.mjs"], suites: ["test/x.test.mjs", "test/y.test.mjs"] },
        { declared: "a suite file under a declared test root", subjects: ["test/x.test.mjs"], suites: [] },
        { declared: "a markdown document in the work tree", subjects: ["wiki/work/96_milestone_x/SPEC.md"], suites: [] },
        { declared: "a bundle template", subjects: ["src/bundle/templates/story/PLAN.md"], suites: [] },
        { declared: "nothing at all", subjects: [], suites: [] },
      ];
      for (const row of rows) {
        const proposal = deriveStoryContract({ projectRoot: root, subjects: row.subjects, declaredFiles: row.subjects });
        const proposedSuites = proposal.files.filter((e) => e.reason === "test-lane").map((e) => e.path).sort();
        assert.deepEqual(proposedSuites, row.suites, `${row.declared} → ${row.suites.length === 0 ? "no suite is proposed" : row.suites.join(", ")}`);
        if (row.subjects.length === 0) assert.deepEqual(proposal.files, [], "…and with nothing declared the set stays empty");
      }
    }),
  },
  {
    name: "96/01/01 the test roots are handed in, never read from config — a project declaring its own roots gets them",
    run: withProject({ graph: COUPLED }, async (root) => {
      const proposal = deriveStoryContract({
        projectRoot: root,
        subjects: ["lib/x.mjs"],
        declaredFiles: ["lib/x.mjs"],
        testRoots: ["spec"],
        sourceRoots: ["lib"],
      });
      assert.ok(paths(proposal.files).includes("spec/x.test.mjs"), "the handed-in roots decide, so a project that spells them differently is served");
      // And the same call with the default roots proposes nothing for a `lib/` file, which is what
      // proves the roots came from the parameter rather than from anything this module read.
      const defaulted = deriveStoryContract({ projectRoot: root, subjects: ["lib/x.mjs"], declaredFiles: ["lib/x.mjs"] });
      assert.deepEqual(defaulted.files.filter((e) => e.reason === "test-lane"), [], "…and nothing is discovered behind the parameter's back");
    }),
  },
  {
    name: "96/01/01 a story that writes an existing module proposes the suite that exists, not a new one",
    run: withProject({ graph: COUPLED }, async (root) => {
      const proposal = deriveStoryContract({
        projectRoot: root,
        subjects: ["src/x.mjs"],
        declaredFiles: ["src/x.mjs"],
        allSuites: ["test/arch/x.test.mjs"],
      });
      assert.ok(paths(proposal.files).includes("test/arch/x.test.mjs"), "the existing suite's path is proposed");
      assert.equal(paths(proposal.files).includes("test/x.test.mjs"), false, "…and no new suite path is invented beside it");
    }),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 02_it-proposes-and-never-writes.feature
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: "96/01/02 an author's narrowing survives a re-derivation — the declaration is unchanged on disk and the removed entries are reported as proposed-and-not-declared",
    run: withProject({ graph: COUPLED }, async (root) => {
      // A story whose author kept one of the five entries the derivation proposes and removed four.
      const storyDir = path.join(root, "wiki", "work", "96_milestone_x", "stories", "01_story_y");
      await mkdir(storyDir, { recursive: true });
      const storyPath = path.join(storyDir, "STORY.md");
      const authored = [
        "---",
        "type: story",
        "number: 01",
        "reads:",
        "  - src/a.mjs",
        "files:",
        "  - src/x.mjs",
        "---",
        "# 01 · y",
        "",
      ].join("\n");
      await writeFile(storyPath, authored, "utf8");

      const inputs = {
        projectRoot: root,
        subjects: ["src/x.mjs"],
        declaredReads: ["src/a.mjs"],
        declaredFiles: ["src/x.mjs"],
        documents: [{ path: "SPEC.md", text: "`src/cited.mjs:1` `src/second.mjs:2` `src/third.mjs:3`" }],
      };
      const first = deriveStoryContract(inputs);
      const second = deriveStoryContract(inputs);

      assert.equal(await readFile(storyPath, "utf8"), authored, "the story's declaration is unchanged on disk");
      assert.deepEqual(second, first, "…and a re-derivation restores nothing");
      const notDeclared = paths(second.reads.filter((e) => !e.declared)).sort();
      assert.deepEqual(
        notDeclared,
        ["src/b.mjs", "src/c.mjs", "src/cited.mjs", "src/second.mjs", "src/third.mjs"],
        "the entries the author did not take are reported as proposed-and-not-declared, never restored",
      );
      assert.equal(second.reads.find((e) => e.path === "src/a.mjs").declared, true, "…and the one they kept is reported as theirs");
    }),
  },
  {
    name: "96/01/02 the proposal distinguishes what is already declared from what is new",
    run: withProject({ graph: COUPLED }, async (root) => {
      const proposal = deriveStoryContract({
        projectRoot: root,
        subjects: ["src/x.mjs"],
        declaredFiles: ["src/x.mjs", "test/x.test.mjs"],
        declaredReads: ["src/a.mjs", "src/b.mjs"],
      });
      const declared = paths(proposal.reads.filter((e) => e.declared)).sort();
      const fresh = paths(proposal.reads.filter((e) => !e.declared)).sort();
      assert.deepEqual(declared, ["src/a.mjs", "src/b.mjs"], "the two the author already names are reported as already declared");
      assert.deepEqual(fresh, ["src/c.mjs"], "…and the remaining entries are reported as newly proposed");
    }),
  },
  {
    name: "96/01/02 an over-broad set costs a wave and never a refusal — sharing a file serialises, sharing none does not",
    run: async () => {
      const rows = [
        { relation: "share a file", second: ["src/x.mjs", "src/shared.mjs"], sameWave: false },
        { relation: "share no file", second: ["src/y.mjs"], sameWave: true },
      ];
      for (const row of rows) {
        const story = (files) => ["---", "type: story", "reads:", "  - src/r.mjs", "files:", ...files.map((f) => `  - ${f}`), "---", "# s", ""].join("\n");
        const texts = new Map([
          ["a/STORY.md", story(["src/x.mjs", "src/shared.mjs"])],
          ["b/STORY.md", story(row.second)],
        ]);
        const readText = async (file) => {
          const key = [...texts.keys()].find((k) => file.replaceAll("\\", "/").endsWith(k));
          if (key == null) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
          return texts.get(key);
        };
        const readySet = [
          { ref: "96/00", type: "story", path: "a" },
          { ref: "96/01", type: "story", path: "b" },
        ];
        const { wave, heldSet } = await partitionReadySetByDeclaredFiles(readySet, { projectRoot: process.cwd(), readText });
        if (row.sameWave) {
          assert.equal(wave.length, 2, `${row.relation} → placed in the same wave`);
          assert.deepEqual(heldSet, [], "…and nothing is refused");
        } else {
          assert.equal(wave.length, 1, `${row.relation} → placed in different waves`);
          assert.equal(heldSet.length, 1, "…held for the next wave, never refused");
        }
      }
    },
  },
  {
    name: "96/01/02 the escape path is untouched — a read outside the declared set succeeds, and nothing in this story's module set blocks it",
    run: withProject({ graph: COUPLED }, async (root) => {
      const outside = path.join(root, "outside.txt");
      await writeFile(outside, "a file no story declared", "utf8");
      const proposal = deriveStoryContract({ projectRoot: root, subjects: ["src/x.mjs"], declaredReads: [] });
      assert.equal(paths(proposal.reads).includes("outside.txt"), false, "the file is outside the declared set and outside the proposal");
      // The read succeeds anyway — the derivation changes how a set is AUTHORED and nothing about
      // how it is ENFORCED, which is what makes a wrong set degrade rather than block.
      assert.equal(await readFile(outside, "utf8"), "a file no story declared", "the read succeeds");
      // …and the module holds no refusal path of its own: no throw, no exit, no error code. Asserted
      // over the CODE, with the header's prose stripped — a module whose comment says "refuses" is
      // not a module that refuses.
      const code = stripComments(await readFile(new URL("../../src/story-contract-derive.mjs", import.meta.url), "utf8"));
      assert.doesNotMatch(code, /\bthrow\b/, "the derivation throws nothing, so it can block no read");
      assert.doesNotMatch(code, /process\.exit/, "…and exits nothing");
      assert.doesNotMatch(code, /\.code\s*=\s*["'`]/, "…and raises no coded refusal");
    }),
  },
  {
    name: "96/01/02 the refine command asks for a proposal and never for an application",
    run: async () => {
      const refine = await readFile(new URL("../../src/bundle/commands/refine.md", import.meta.url), "utf8");
      assert.match(refine, /derive/i, "the break-down instructions tell the author to derive a proposal");
      assert.match(refine, /subtract/i, "…and to subtract from it");
      // No instruction anywhere to apply, write or overwrite a declaration with a derived set.
      for (const forbidden of [/overwrite the (?:frontmatter|declaration)/i, /--apply\b/, /--write\b/, /apply the proposal/i, /replace the (?:declared|frontmatter)/i]) {
        assert.doesNotMatch(refine, forbidden, `the document instructs no agent to apply a proposal (${forbidden})`);
      }
    },
  },
];
