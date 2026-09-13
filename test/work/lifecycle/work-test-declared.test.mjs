// Traceability wiring for milestone 96 / story 03 — the test run matches the story.
//
// Covers EVERY @executable scenario in the three task features:
//   tasks/00_the-declared-write-set-is-a-changed-set-source.feature
//   tasks/01_a-declared-path-the-graph-does-not-know-widens.feature
//   tasks/02_one-selector-and-the-lane-that-calls-it.feature
//
// EVERY GRAPH HERE IS A REAL ARTIFACT ON DISK, written into a temp project root and read back
// through the shipped reader — 72/01's own reasoning, inherited: handing the selector an
// already-normalised object drives the arithmetic and skips the two things most likely to be
// wrong, that the artifact is FOUND and that one which does not parse is an ANSWER rather than a
// crash. Every story record is a real `STORY.md` on disk for the same reason: the declaration's
// quirks are the PARSER's, and a hand-built values array would drive none of them.
//
// The command's impure edges are injected exactly as 72/02's own suite injects them, so the
// invocation rows drive with no repository and no child process, against the code path production
// runs. `readChanged` is stubbed to a THROWING git so "no git command is invoked to produce it" is
// measured rather than asserted about the source.
//
// One test object per @executable scenario, Scenario-Outline rows folded into one entry iterating
// the rows. node:assert/strict, `{ name, run }` shape.
//
// The scenarios this file does not drive are the four that are properties of the TREE rather than
// of a behaviour — `selectSuites` being the only selection function in `src/`, the producer
// reaching the declaration through the shipped parser and through no second frontmatter parse, and
// the absence of any narrowing path or widening-suppressing option. Those are FF-9604's, in
// test/arch/testing/acd-one-selector-one-changed-set.test.mjs.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { graphJsonPath } from "../../../src/graph-normalize.mjs";
import { WIDENING_REASONS } from "../../../src/work/test-select.mjs";
import {
  DECLARED_SET_EMPTY,
  DECLARED_SET_MALFORMED,
  STORY_RECORD_UNREADABLE,
  STORY_REF_NOT_A_STORY,
  STORY_REF_UNRESOLVABLE,
  declaredChangedFiles,
} from "../../../src/work/test-declared.mjs";
import {
  NO_SCOPE,
  SCOPE_UNRECOGNISED,
  STORY_AND_SINCE,
  STORY_OUTSIDE_IMPACTED,
  TEST_SCOPES,
  runTest,
  testCommand,
} from "../../../src/commands/test.mjs";

// ── fixtures ─────────────────────────────────────────────────────────────────

const WHOLE = Object.freeze(["test/a.test.mjs", "test/b.test.mjs", "test/c.test.mjs"]);

const TOOLCHAIN = Object.freeze({
  ok: true,
  toolchain: Object.freeze({
    command: "node",
    program: "/usr/bin/node",
    args: Object.freeze(["scripts/test.mjs"]),
    selectArgs: Object.freeze(["--only", "{file}"]),
    roots: Object.freeze(["test"]),
    deadlineMs: 900_000,
    report: Object.freeze({ format: "tap" }),
  }),
});

const observed = ({ stdout = "# unit\nok - a\n", stderr = "", exitCode = 0 } = {}) => ({
  outcome: "exited",
  command: "/usr/bin/node",
  args: ["scripts/test.mjs"],
  attempted: "/usr/bin/node scripts/test.mjs",
  deadlineMs: 900_000,
  exitCode,
  stdout,
  stderr,
  verdict: exitCode === 0 ? "passed" : "failed",
  status: exitCode === 0 ? 0 : 1,
  message: "the run's own verdict",
});

// A git producer that FAILS THE ROW IF IT IS CALLED. "and no git command is invoked to produce it"
// is a claim about what ran, so it is measured here rather than read off the source.
const gitMustNotRun = async () => {
  throw new Error("the git changed-set producer was invoked on the declared path");
};

function launcher(output = observed()) {
  const handed = [];
  return { handed, run: async (_toolchain, files) => { handed.push([...files]); return output; } };
}

// A raw node_link_data artifact where the shipped reader looks for it. `links`, never `edges`.
async function writeGraph(root, { nodes = [], links = [] } = {}, raw = null) {
  await mkdir(path.join(root, "graphify-out"), { recursive: true });
  const body = raw ?? JSON.stringify({
    directed: true,
    multigraph: false,
    graph: {},
    nodes: nodes.map((file, index) => ({ id: `n${index}`, label: file, source_file: file })),
    links,
  });
  await writeFile(graphJsonPath(root), body, "utf8");
}

// An edge FROM the importer TO the imported — `computeImpact`'s own direction.
const edge = (from, to) => ({ source: `n${from}`, target: `n${to}`, relation: "imports", confidence: "EXPLICIT" });

// A story record on disk carrying a `files:` declaration written EXACTLY as the row spells it, so
// the parser sees the shape rather than a normalised one.
async function storyRecord(root, { ref = "96/03", declaration = "files: []", dir = "wiki/work/96_milestone_m/stories/03_story_s" } = {}) {
  const storyDir = path.join(root, ...dir.split("/"));
  await mkdir(storyDir, { recursive: true });
  await writeFile(
    path.join(storyDir, "STORY.md"),
    `---\ntype: story\nnumber: 03\nslug: s\nparent: 96\nstatus: in-progress\n${declaration}\n---\n# ${ref}\n`,
    "utf8",
  );
  return { ref, type: "story", dir: storyDir };
}

// The EXACT resolver, as the command binds it: an unknown ref resolves to nothing, never to a
// near neighbour.
const exactly = (...items) => async (ref) => items.find((item) => item.ref === ref) ?? null;

const withRoot = (body) => async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-declared-"));
  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

// `runTest` with every seam stubbed — the shape 72/02's own suite uses, one producer wider.
async function invoke(root, input, { resolveStory, run, readChanged = gitMustNotRun } = {}) {
  return runTest(input, {
    projectRoot: root,
    config: {},
    resolveToolchain: () => TOOLCHAIN,
    readChanged,
    resolveStory,
    walk: async () => WHOLE,
    run: run ?? launcher().run,
  });
}

export const workTestDeclaredTests = [
  // ═════ 00_the-declared-write-set-is-a-changed-set-source.feature ═════
  {
    name: "96/03-00 the declared write set becomes the changed set, and no git command is invoked to produce it",
    run: withRoot(async (root) => {
      const story = await storyRecord(root, { declaration: "files:\n  - src/one.mjs\n  - src/two.mjs" });
      await writeGraph(root, { nodes: ["src/one.mjs", "src/two.mjs", "test/a.test.mjs"], links: [edge(2, 0), edge(2, 1)] });

      // `readChanged` throws if reached, so reaching this line at all is the second assertion.
      const out = await invoke(root, { scope: "impacted", story: "96/03" }, { resolveStory: exactly(story) });

      assert.equal(out.refusal, null, out.refusal?.message);
      assert.deepEqual([...out.changed], ["src/one.mjs", "src/two.mjs"]);
      assert.equal(out.story, "96/03");
    }),
  },
  {
    name: "96/03-00 the declaration's own parsing quirks are inherited, not re-decided (Examples: one parser, so one answer per shape)",
    run: withRoot(async (root) => {
      const rows = [
        {
          entry: "a plain path in a block list",
          declaration: "files:\n  - src/one.mjs",
          expect: (set) => assert.deepEqual([...set.changed], ["src/one.mjs"]),
        },
        {
          entry: "a plain path in an inline list",
          declaration: "files: [src/one.mjs, src/two.mjs]",
          expect: (set) => assert.deepEqual([...set.changed], ["src/one.mjs", "src/two.mjs"]),
        },
        {
          entry: "a path followed by a YAML comment",
          declaration: "files:\n  - src/one.mjs # the seam this story hangs off",
          expect: (set) => assert.deepEqual([...set.changed], ["src/one.mjs"]),
        },
        {
          entry: "a path written with backslashes",
          declaration: "files:\n  - src\\\\one.mjs",
          expect: (set) => {
            assert.equal(set.ok, false);
            assert.equal(set.code, DECLARED_SET_MALFORMED);
            // The PARSER's own rule, carried rather than restated — the wording `validate` prints.
            assert.match(set.message, /must use forward slashes so it resolves on every node/);
          },
        },
      ];

      for (const [index, row] of rows.entries()) {
        const dir = `wiki/work/96_milestone_m/stories/03_story_${index}`;
        const story = await storyRecord(root, { declaration: row.declaration, dir });
        const set = await declaredChangedFiles({ projectRoot: root, ref: story.ref, resolve: exactly(story) });
        row.expect(set, row.entry);
      }
    }),
  },
  {
    name: "96/03-00 two sources are refused and an unresolvable one is named (Examples: a refusal, never a silently chosen source)",
    run: withRoot(async (root) => {
      const story = await storyRecord(root, { declaration: "files:\n  - src/one.mjs" });
      await writeGraph(root, { nodes: ["src/one.mjs", "test/a.test.mjs"], links: [edge(1, 0)] });
      const gitChanged = async () => Object.freeze({ ok: true, changed: Object.freeze(["src/one.mjs"]), base: "HEAD~1" });

      // `--scope impacted --story <ref>` — selects from the story's declared set.
      const declared = await invoke(root, { scope: "impacted", story: "96/03" }, { resolveStory: exactly(story) });
      assert.equal(declared.refusal, null);
      assert.deepEqual([...declared.changed], ["src/one.mjs"]);
      assert.equal(declared.story, "96/03");

      // `--scope impacted --since <rev>` — selects from git's changed set.
      const git = await invoke(root, { scope: "impacted", since: "HEAD~1" }, { resolveStory: exactly(story), readChanged: gitChanged });
      assert.equal(git.refusal, null);
      assert.equal(git.story, null, "a run with no story ref carries none");

      // Both — refused, naming BOTH sources rather than picking one.
      const both = await invoke(root, { scope: "impacted", story: "96/03", since: "HEAD~1" }, { resolveStory: exactly(story), readChanged: gitChanged });
      assert.equal(both.refusal.code, STORY_AND_SINCE);
      assert.match(both.refusal.message, /--story/);
      assert.match(both.refusal.message, /--since/);
      assert.equal(both.launched, false);

      // An unresolvable ref — refused NAMING the ref, never an empty changed set.
      const unknown = await invoke(root, { scope: "impacted", story: "96/99" }, { resolveStory: exactly(story) });
      assert.equal(unknown.refusal.code, STORY_REF_UNRESOLVABLE);
      assert.match(unknown.refusal.message, /96\/99/);
      assert.equal(unknown.launched, false);

      // `--scope file --story <ref>` — `--story` narrows the impacted scope only.
      const wrongScope = await invoke(root, { scope: "file", story: "96/03", files: ["test/a.test.mjs"] }, { resolveStory: exactly(story) });
      assert.equal(wrongScope.refusal.code, STORY_OUTSIDE_IMPACTED);
      assert.equal(wrongScope.launched, false);
    }),
  },
  {
    name: "96/03-00 a story whose declaration is empty says so, launches no runner, and is distinguishable from a run that selected nothing",
    run: withRoot(async (root) => {
      const empty = await storyRecord(root, { declaration: "files: []" });
      const launch = launcher();
      const out = await invoke(root, { scope: "impacted", story: "96/03" }, { resolveStory: exactly(empty), run: launch.run });

      assert.equal(out.refusal.code, DECLARED_SET_EMPTY);
      assert.equal(out.launched, false);
      assert.deepEqual(launch.handed, [], "no runner was launched");
      assert.equal(out.scope, NO_SCOPE);
      assert.equal(out.exit, 1, "a refusal is not a green run over zero tests");
      // …and it is its OWN code: "this story declares nothing" never renders as the selector's
      // "nothing has changed", which is a different repair.
      assert.notEqual(out.refusal.code, "changed-set-empty");

      // A story with no `files:` key at all reaches the same repair, and says which it was.
      const absent = await storyRecord(root, { declaration: "owner: product-owner", dir: "wiki/work/96_milestone_m/stories/04_story_t" });
      const none = await declaredChangedFiles({ projectRoot: root, ref: absent.ref, resolve: exactly(absent) });
      assert.equal(none.code, DECLARED_SET_EMPTY);
      assert.doesNotMatch(none.message, /its `files:` is empty/);
    }),
  },
  {
    name: "96/03-00 the ref resolves exactly, never by slug guess — a near-miss uses no other story's declaration",
    run: withRoot(async (root) => {
      const real = await storyRecord(root, { ref: "96/03", declaration: "files:\n  - src/one.mjs" });
      const launch = launcher();

      // "the-test-run" is a near-miss for the real story's slug, and the exact resolver answers
      // nothing for it. A slug fallback here would run the neighbouring story's suites.
      const out = await invoke(root, { scope: "impacted", story: "the-test-run" }, { resolveStory: exactly(real), run: launch.run });

      assert.equal(out.refusal.code, STORY_REF_UNRESOLVABLE);
      assert.deepEqual([...out.changed], [], "no other story's declaration was read");
      assert.deepEqual(launch.handed, []);

      // And the two other ways a ref fails to yield a declaration are their own repairs.
      const milestone = await declaredChangedFiles({
        projectRoot: root,
        ref: "96",
        resolve: async () => ({ ref: "96", type: "milestone", dir: path.join(root, "wiki", "work", "96_milestone_m") }),
      });
      assert.equal(milestone.code, STORY_REF_NOT_A_STORY);

      const remote = await declaredChangedFiles({
        projectRoot: root,
        ref: "96/03",
        resolve: async () => ({ ref: "96/03", type: "story", dir: null, reportedBy: "umamis-mac-mini" }),
      });
      assert.equal(remote.code, STORY_RECORD_UNREADABLE);
    }),
  },

  // ═════ 01_a-declared-path-the-graph-does-not-know-widens.feature ═════
  {
    name: "96/03-01 a declared suite the graph has never seen widens the run, naming that file, under an existing widening reason",
    run: withRoot(async (root) => {
      // The test the developer is about to write: declared, and absent from a graph built before
      // it existed.
      const story = await storyRecord(root, { declaration: "files:\n  - src/one.mjs\n  - test/new.test.mjs" });
      await writeGraph(root, { nodes: ["src/one.mjs", "test/a.test.mjs"], links: [edge(1, 0)] });

      const out = await invoke(root, { scope: "impacted", story: "96/03" }, { resolveStory: exactly(story) });

      assert.equal(out.scope, "all", "a widened run is a whole run");
      assert.ok(out.widened.some((entry) => entry.file === "test/new.test.mjs"), "the widening names the declared suite");
      for (const entry of out.widened) assert.ok(WIDENING_REASONS.includes(entry.reason), `${entry.reason} is not one of the four`);
      assert.equal(out.gate, false, "a run that got there through an unknown may not stand as a verdict");
    }),
  },
  {
    name: "96/03-01 a declared source module the graph has never seen widens the run, naming that file",
    run: withRoot(async (root) => {
      const story = await storyRecord(root, { declaration: "files:\n  - src/brand-new.mjs" });
      await writeGraph(root, { nodes: ["src/one.mjs", "test/a.test.mjs"], links: [edge(1, 0)] });

      const out = await invoke(root, { scope: "impacted", story: "96/03" }, { resolveStory: exactly(story) });

      assert.equal(out.scope, "all");
      assert.deepEqual(out.widened.map((entry) => entry.file), ["src/brand-new.mjs"]);
      assert.equal(out.widened[0].reason, "not-in-graph");
    }),
  },
  {
    name: "96/03-01 known coupling narrows and unknown coupling widens (Examples: the invariant, driven from both ends)",
    run: withRoot(async (root) => {
      const rows = [
        {
          coverage: "all covered, each with a registered dependent suite",
          declaration: "files:\n  - src/one.mjs\n  - src/two.mjs",
          graph: { nodes: ["src/one.mjs", "src/two.mjs", "test/a.test.mjs", "test/b.test.mjs"], links: [edge(2, 0), edge(3, 1)] },
          expect: (out) => {
            assert.equal(out.scope, "impacted");
            assert.deepEqual(out.widened, []);
            assert.deepEqual([...out.selected], ["test/a.test.mjs", "test/b.test.mjs"]);
          },
        },
        {
          coverage: "all covered, one with no dependent suite at all",
          declaration: "files:\n  - src/one.mjs\n  - src/lonely.mjs",
          graph: { nodes: ["src/one.mjs", "src/lonely.mjs", "test/a.test.mjs"], links: [edge(2, 0)] },
          expect: (out) => {
            assert.equal(out.scope, "all");
            assert.deepEqual(out.widened.map((e) => e.file), ["src/lonely.mjs"]);
            assert.equal(out.widened[0].reason, "no-registered-dependent");
          },
        },
        {
          coverage: "one not covered by the graph",
          declaration: "files:\n  - src/one.mjs\n  - src/unseen.mjs",
          graph: { nodes: ["src/one.mjs", "test/a.test.mjs"], links: [edge(1, 0)] },
          expect: (out) => {
            assert.equal(out.scope, "all");
            assert.deepEqual(out.widened.map((e) => e.file), ["src/unseen.mjs"]);
          },
        },
        {
          coverage: "none covered by the graph",
          declaration: "files:\n  - src/unseen.mjs\n  - src/also-unseen.mjs",
          graph: { nodes: ["src/other.mjs"], links: [] },
          expect: (out) => {
            assert.equal(out.scope, "all");
            assert.deepEqual(out.widened.map((e) => e.file).sort(), ["src/also-unseen.mjs", "src/unseen.mjs"]);
          },
        },
      ];

      for (const [index, row] of rows.entries()) {
        const dir = `wiki/work/96_milestone_m/stories/1${index}_story_s`;
        const story = await storyRecord(root, { declaration: row.declaration, dir });
        await writeGraph(root, row.graph);
        const out = await invoke(root, { scope: "impacted", story: story.ref }, { resolveStory: exactly(story) });
        assert.equal(out.refusal, null, `${row.coverage}: ${out.refusal?.message}`);
        row.expect(out);
      }
    }),
  },
  {
    name: "96/03-01 the two absences that are not coverage gaps still widen, and neither is reported as a narrowed run (Examples: no artifact and a broken one)",
    run: withRoot(async (root) => {
      const rows = [
        { artifact: "absent", plant: async () => {}, reason: "no-graph" },
        { artifact: "present but unreadable", plant: async (dir) => writeGraph(dir, {}, "{ not json"), reason: "graph-unreadable" },
      ];

      for (const row of rows) {
        const dir = await mkdtemp(path.join(os.tmpdir(), "aof-declared-absent-"));
        try {
          const story = await storyRecord(dir, { declaration: "files:\n  - src/one.mjs" });
          await row.plant(dir);
          const out = await invoke(dir, { scope: "impacted", story: story.ref }, { resolveStory: exactly(story) });

          assert.equal(out.scope, "all", `${row.artifact}: widened runs carry scope all`);
          assert.equal(out.widened[0].reason, row.reason);
          assert.ok(WIDENING_REASONS.includes(out.widened[0].reason));
          assert.equal(out.gate, false, `${row.artifact}: not a narrowed run and not a verdict`);
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }
    }),
  },
  {
    name: "96/03-01 the frozen reason set does not grow — there are four, and they are the four that were there before",
    async run() {
      assert.deepEqual([...WIDENING_REASONS], ["no-graph", "not-in-graph", "no-registered-dependent", "graph-unreadable"]);
      assert.equal(WIDENING_REASONS.length, 4);
      assert.ok(Object.isFrozen(WIDENING_REASONS));
    },
  },
  {
    name: "96/03-01 the run reports the scope it actually ran as — a widened run says it widened, names each file, and is not a gate",
    run: withRoot(async (root) => {
      const story = await storyRecord(root, { declaration: "files:\n  - src/unseen.mjs" });
      await writeGraph(root, { nodes: ["src/other.mjs"], links: [] });

      const out = await invoke(root, { scope: "impacted", story: "96/03" }, { resolveStory: exactly(story) });
      const rendered = testCommand.cli.render(out);

      assert.match(rendered, /scope all/);
      assert.match(rendered, /1 widening: src\/unseen\.mjs \(not-in-graph\)/);
      assert.match(rendered, /may not stand as a verdict/);
      assert.equal(out.gate, false);
    }),
  },

  // ═════ 02_one-selector-and-the-lane-that-calls-it.feature ═════
  {
    name: "96/03-02 the scope vocabulary does not grow — there are three, and they are impacted, file and all",
    async run() {
      assert.deepEqual([...TEST_SCOPES], ["impacted", "file", "all"]);
      assert.equal(TEST_SCOPES.length, 3);
      assert.ok(Object.isFrozen(TEST_SCOPES));
    },
  },
  {
    name: "96/03-02 the scope is still required and still never defaulted (Examples: the existing refusal, unweakened by the new option)",
    run: withRoot(async (root) => {
      const story = await storyRecord(root, { declaration: "files:\n  - src/one.mjs" });
      const rows = [
        { invocation: "with no scope at all", input: {} },
        { invocation: "with an unrecognised scope", input: { scope: "everything" } },
        { invocation: "`--story <ref>` and no scope", input: { story: "96/03" } },
      ];

      for (const row of rows) {
        const out = await invoke(root, row.input, { resolveStory: exactly(story) });
        assert.equal(out.refusal.code, SCOPE_UNRECOGNISED, row.invocation);
        for (const form of TEST_SCOPES) assert.match(out.refusal.message, new RegExp(form), `${row.invocation} names ${form}`);
        assert.equal(out.launched, false, row.invocation);
      }
    }),
  },
  {
    name: "96/03-02 the story's own task suites always run, selected from the declaration rather than from a lane's judgement",
    run: withRoot(async (root) => {
      const story = await storyRecord(root, { declaration: "files:\n  - src/one.mjs\n  - test/a.test.mjs" });
      // The graph knows both, so nothing widens and the selection is genuinely narrow — which is
      // the only case in which "its own suites are among the selected" says anything.
      await writeGraph(root, { nodes: ["src/one.mjs", "test/a.test.mjs"], links: [edge(1, 0)] });

      const out = await invoke(root, { scope: "impacted", story: "96/03" }, { resolveStory: exactly(story) });

      assert.equal(out.scope, "impacted");
      assert.deepEqual(out.widened, []);
      assert.ok(out.selected.includes("test/a.test.mjs"), "the story's own suite is selected");
      assert.ok(out.changed.includes("test/a.test.mjs"), "and it got there from the declaration");
    }),
  },
  {
    name: "96/03-02 the build lane asks for the story's scope and names no individual suite files",
    async run() {
      const doc = await readFile(new URL("../../../src/bundle/commands/continue.md", import.meta.url), "utf8");
      const build = doc.slice(doc.indexOf("<build_terminator>"), doc.indexOf("</build_terminator>"));

      assert.ok(build.length > 0, "the continue document carries a build terminator");
      assert.match(build, /aof test --scope impacted --story <ref>/);
      assert.match(build, /not\*\* name individual suite files/);
    },
  },
  {
    name: "96/03-02 the review lane asks for the story's scope and states that a story-scoped green does not accept a milestone",
    async run() {
      const doc = await readFile(new URL("../../../src/bundle/commands/continue.md", import.meta.url), "utf8");
      const review = doc.slice(doc.indexOf("<review_lanes>"), doc.indexOf("</review_lanes>"));

      assert.ok(review.length > 0, "the continue document carries the review lanes");
      assert.match(review, /aof test --scope impacted --story <ref>/);
      assert.match(review, /A story-scoped green does not accept a\s+milestone/);
      assert.match(review, /never names suite files\s+by hand/i);
    },
  },
  {
    name: "96/03-02 a narrowed run is never rendered as a whole one — it states the scope it ran as and does not report itself as a gate",
    run: withRoot(async (root) => {
      const story = await storyRecord(root, { declaration: "files:\n  - src/one.mjs" });
      await writeGraph(root, { nodes: ["src/one.mjs", "test/a.test.mjs"], links: [edge(1, 0)] });

      const out = await invoke(root, { scope: "impacted", story: "96/03" }, { resolveStory: exactly(story) });
      const rendered = testCommand.cli.render(out);

      assert.equal(out.scope, "impacted");
      assert.equal(out.gate, false, "a narrowed run is never a gate");
      assert.match(rendered, /scope impacted \(story 96\/03\)/);
      assert.match(rendered, /may not stand as a verdict/);
      // …and the machine face carries the same claims as the human one.
      assert.equal(out.story, "96/03");
      assert.equal(out.selected.length < WHOLE.length, true, "the run really was narrowed");
    }),
  },
];
