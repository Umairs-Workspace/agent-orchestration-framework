// Traceability wiring for milestone 135 / story 01 — the practice is its own package.
//
// Covers EVERY @executable scenario in
//   tasks/00_the-package-holds-the-practice-and-work-keeps-only-seams.feature
//
// The package's exports are imported by their published names; `@aof/work`'s engine and phase doors
// are built from `@aof/work`'s own factories with nothing of this package plugged in, or with a
// stand-in probe, budget row or before-build check that names no practice. Work streams are fixture
// folders in a fresh temp directory. node:assert/strict, `{ name, run }` shape, one test object per
// @executable scenario, Scenario Outline rows folded into one entry.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { createWorkDoctor } from "@aof/work/doctor";
import { createPhaseDoorCommands } from "@aof/work/commands/continue";
import { createExampleAnswers } from "@aof/specification-by-example/answers";
import { mapToken } from "@aof/specification-by-example/map";

const ON = Object.freeze({ work: { examples: { enabled: true } } });
const OPEN_MAP = "# 7/2 · the map\n\n## R1 · a rule\n- E1 · an example [proposed]\n\n## Questions\n- Q1 · business · open · does a reserved book count?\n";
const refuse = (name) => () => { throw new Error(`${name} must not be reached`); };
const lines = (count) => Array.from({ length: count }, (_, index) => `line ${index + 1}`).join("\n") + "\n";

const recordDoc = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\nschema: 1\n---\n# ${fields.title}\n`;

// A work stream holding milestone 7 and its stories 7/1 and 7/2, in a fresh temp directory.
async function withStream(body) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-sbe-seams-")));
  const workDir = path.join(root, "wiki", "work");
  const milestone = path.join(workDir, "7_milestone_m");
  const stories = { "7/1": path.join(milestone, "stories", "1_story_a"), "7/2": path.join(milestone, "stories", "2_story_b") };
  try {
    await mkdir(milestone, { recursive: true });
    await writeFile(path.join(milestone, "SPEC.md"), recordDoc({ type: "milestone", number: 7, slug: "m", title: "m", status: "in-progress", created: "2026-10-03", updated: "2026-10-03" }), "utf8");
    for (const [ref, dir] of Object.entries(stories)) {
      const number = ref.split("/")[1];
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "STORY.md"), recordDoc({ type: "story", number, slug: path.basename(dir).split("_").at(-1), title: ref, parent: 7, depends: "[]", status: "in-progress", created: "2026-10-03", updated: "2026-10-03" }), "utf8");
    }
    return await body({ root, workDir, stories });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// `@aof/work`'s engine, built from its own factory with only what the case hands it.
const engine = (seams = {}) => createWorkDoctor({ projectExecution: refuse("projectExecution"), readRuns: refuse("readRuns"), diagramsGroup: () => [], ...seams });
const rowsOf = (snapshot) => Object.fromEntries(snapshot.items.map((item) => [item.ref, item]));

// The phase doors, built from `@aof/work`'s own factory over a resolved story row, recording every
// collaborator that moves, mints or dispatches.
function doors(row, beforeBuild) {
  const calls = [];
  const spy = (name, answer) => async (...args) => { calls.push(name); return typeof answer === "function" ? answer(...args) : answer; };
  const built = createPhaseDoorCommands({
    assignWork: spy("assignWork", { ok: true, assignmentId: "a-1" }),
    resolveItem: async () => row,
    resolveItemExact: async () => row,
    transitionItemStatus: spy("transitionItemStatus", { record: { status: "in-progress", from: "not-started" } }),
    readExecutionOverlay: spy("readExecutionOverlay", {}),
    resolveScopedExecution: () => null,
    executionScopeRef: (ref) => ref.split("/")[0],
    readStreamedItemRow: async () => null,
    ...(beforeBuild === undefined ? {} : { beforeBuild }),
  });
  return { ...built, calls };
}

export const packageSeamsTests = [
  {
    name: "sbe/135-01 00 the package answers what @aof/work used to export for the map (outline: 5 exports)",
    run: async () => {
      const rows = [
        ["./map", ["EXAMPLES_DOC", "PROVENANCE", "QUESTION_STATES", "QUESTION_CLASSES", "parseExampleMap", "mapToken", "readMapToken"]],
        ["./answers", ["createExampleAnswers"]],
        ["./doctor-lane", ["createDoctorExamples"]],
      ];
      for (const [exported, members] of rows) {
        const module = await import(`@aof/specification-by-example/${exported.slice(2)}`);
        for (const member of members) assert.ok(member in module, `${exported} exports ${member}`);
      }
      // "a factory for the continue door's examples check": a factory whose product is one
      // `async (ctx, row)` check, silent for a row it cannot judge.
      const { createExamplesBuildDoor } = await import("@aof/specification-by-example/build-door");
      const { refuseOpenExamples } = createExamplesBuildDoor({ examplesEnabledFromConfig: () => true, examplesFindings: refuse("examplesFindings"), collectAnswers: refuse("collectAnswers") });
      assert.equal(typeof refuseOpenExamples, "function");
      assert.equal(await refuseOpenExamples({ workspace: { config: ON } }, { ref: "7", type: "milestone", dir: "x" }), undefined);
      // "a factory for the doctor snapshot's story probe": a factory whose product answers a story
      // row, and answers nothing while the gate is off.
      const { createExamplesStoryProbe, EXAMPLES_BUDGET_ROWS } = await import("@aof/specification-by-example/story-probe");
      const { storyProbe } = createExamplesStoryProbe({ examplesEnabledFromConfig: () => false, collectAnswers: refuse("collectAnswers") });
      assert.equal(typeof storyProbe, "function");
      assert.equal(await storyProbe({ ref: "7/2", type: "story", dir: "x" }, { config: {}, fileState: refuse("fileState") }), null);
      assert.deepEqual(EXAMPLES_BUDGET_ROWS, [{ doc: "EXAMPLES.md", kind: "examples", lines: 50 }]);
    },
  },
  {
    name: "sbe/135-01 00 @aof/work no longer exports the map (outline: 3 old exports)",
    run: async () => {
      for (const old of ["./examples/map", "./examples/answers", "./doctor/examples"]) {
        await assert.rejects(import(`@aof/work/${old.slice(2)}`), (error) => error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED", old);
      }
    },
  },
  {
    name: "sbe/135-01 00 a doctor engine with no story probe gives a story row no extensions",
    run: () => withStream(async ({ workDir, stories }) => {
      await writeFile(path.join(stories["7/2"], "EXAMPLES.md"), OPEN_MAP, "utf8");
      const rows = rowsOf(await engine().buildSnapshot(workDir, { config: ON }));
      assert.equal(rows["7/2"].extensions, null);
      assert.equal("EXAMPLES.md" in rows["7/2"].docSizes, false);
    }),
  },
  {
    name: "sbe/135-01 00 a story probe's sizes and extensions land on the story row",
    run: () => withStream(async ({ workDir }) => {
      const probed = [];
      const storyProbe = async (item) => { probed.push(item.ref); return { docSizes: { "NOTES.md": { lines: 12 } }, extensions: { probe: "seen" } }; };
      const rows = rowsOf(await engine({ storyProbe }).buildSnapshot(workDir, {}));
      for (const ref of ["7/1", "7/2"]) {
        assert.deepEqual(rows[ref].docSizes["NOTES.md"], { lines: 12 }, ref);
        assert.equal(rows[ref].extensions?.probe, "seen", ref);
      }
      assert.equal(rows["7"].extensions?.probe, undefined, "no milestone row carries the extension");
      assert.deepEqual(probed.sort(), ["7/1", "7/2"], "the probe is asked for stories only");
    }),
  },
  {
    name: "sbe/135-01 00 an injected budget row is judged like a built-in one",
    run: () => withStream(async ({ workDir, stories }) => {
      await writeFile(path.join(stories["7/2"], "NOTES.md"), lines(11), "utf8");
      // A probe that measures NOTES.md through the engine's own `fileState`, as a practice would.
      const storyProbe = async (item, { fileState }) => {
        const state = await fileState(path.join(item.dir, "NOTES.md"));
        return state.present ? { docSizes: { "NOTES.md": { lines: state.lines } } } : null;
      };
      const doctor = engine({ storyProbe, budgetRows: [{ doc: "NOTES.md", kind: "notes", lines: 10 }] });
      assert.equal(doctor.budgetsFromConfig({}).notes, 10, "the row's default resolves beside the built-in kinds");
      const findings = await doctor.doctorWork(workDir, {}, undefined, { now: Date.parse("2026-10-03T12:00:00Z") });
      const over = findings.filter((finding) => finding.code === "doc-over-budget");
      assert.deepEqual(over.map((finding) => finding.path), [path.join(stories["7/2"], "NOTES.md")]);
      assert.match(over[0].message, /NOTES\.md is 11 lines, over the 10-line budget/);
      // Without the row, the same measurement is no kind and is silent.
      const silent = await engine({ storyProbe }).doctorWork(workDir, {}, undefined, { now: Date.parse("2026-10-03T12:00:00Z") });
      assert.deepEqual(silent.filter((finding) => finding.code === "doc-over-budget"), []);
    }),
  },
  {
    name: "sbe/135-01 00 the continue door runs each before-build check and stops at the first refusal",
    run: async () => {
      let secondRan = false;
      const first = async () => { throw commandError("refused by the first check", "first-refusal", 409); };
      const second = async () => { secondRan = true; };
      const { continueCommand, calls } = doors({ ref: "7/2", type: "story", dir: "wiki/work/7_milestone_m/stories/2_story_b", status: "not-started" }, [first, second]);
      await assert.rejects(continueCommand.run({ ref: "7/2" }, { workspace: { config: ON, projectRoot: "/fixture" } }), (error) => error?.code === "first-refusal");
      assert.equal(secondRan, false, "the second check was not run");
      assert.deepEqual(calls, [], "no status moved, the overlay was not read and nothing was dispatched");
    },
  },
  {
    name: "sbe/135-01 00 the continue door with no before-build checks refuses no story",
    run: () => withStream(async ({ root, stories }) => {
      await writeFile(path.join(stories["7/2"], "EXAMPLES.md"), OPEN_MAP, "utf8");
      const { continueCommand, calls } = doors({ ref: "7/2", type: "story", dir: path.relative(root, stories["7/2"]), status: "not-started" });
      const result = await continueCommand.run({ ref: "7/2" }, { workspace: { config: ON, projectRoot: root } });
      assert.equal(result.ok, true);
      assert.equal(result.where, "local");
      assert.ok(calls.includes("readExecutionOverlay"), "the door went on past the before-build position");
    }),
  },
  // Moved with the reader from packages/work/test/domain-services.test.mjs (135/01): the answers
  // reader is this package's, so its domain case is too.
  {
    name: "sbe/135-01 example answer collection filters settled run evidence to the requested story",
    run: async () => {
      const record = { token: mapToken("01/00", "Q1"), question: "question", answer: "yes", toolUseId: "tool", at: "2026-09-29" };
      const reader = createExampleAnswers({
        HUMAN_INPUT_TOOL_NAMES: ["AskUserQuestion"], reportDegrade() {},
        readRuns: async () => [{ state: "done", brief: { answers: [record, record] } }],
        isRunning: () => false, readTranscriptTree: async () => null, claudeProjectsDir: () => null,
      });
      assert.deepEqual(reader.readAnswers("not JSON"), []);
      assert.equal(await reader.readSessionAnswers(null, "session"), null);
      // An invalid or unrelated map token is never attributed to the current story.
      assert.deepEqual(await reader.collectAnswers({ ref: "02/00", dir: "/fixture/story" }), []);
      assert.deepEqual(await reader.collectAnswers({ ref: "01/00", dir: "/fixture/story" }), [record]);
    },
  },
];
