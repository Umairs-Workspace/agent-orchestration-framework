// Milestone 148 / story 04 — a live lesson's meta line is held (ADR-007).
//
// Task 00: validate errors on every live row's lesson whose Kind, Area or Stage starts with no
// vocabulary word, or whose Owner is blank — a qualifier after the word stays legal.
// Task 01: doctor's archived lane gives one `lesson-meta-archived` warning per archived
// retrospective holding a non-conforming lesson, and validate never reads an archived one.
//
// Both are driven through the shipped command and engine factories over a temp stream: the validate
// command's `run` + its `cli.exit` (the exit code `aof work validate` returns), and the doctor
// engine with every built-in lane, as `aof work doctor --json` runs it.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createValidateCommand } from "@aof/work/commands/validate";
import { declaredAdrsInStory, extractAdrBlocks } from "@aof/work/phase-brief";
import { CONTROL_FINDING_CODES } from "@aof/work/audit/controls";
import { LESSON_META_FINDING_CODES, lessonMetaLane } from "../src/doctor/lesson-meta.mjs";
import { createDoctorServices } from "./support/doctor-services.mjs";
import { work } from "./support/work-services.mjs";

const doctor = createDoctorServices();
const { validateCommand } = createValidateCommand({
  declaredAdrsInStory,
  extractAdrBlocks,
  readRenameMap: async () => null,
  validateCoreWork: work.validateWork,
});

const KINDS = "mistake | blocker | near-miss | misunderstanding";
const AREAS = "code | architecture | contract | security | process";

// ------------------------------------------------------------------ fixture ----

const frontmatter = (fields) => ["---", ...Object.entries(fields).map(([key, value]) => `${key}: ${value}`), "schema: 1", "---", ""].join("\n");

async function writeItem(dir, doc, fields) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, doc), `${frontmatter(fields)}# ${fields.title ?? fields.slug}\n`);
}

// Task 00's stream: live milestone 134 (in-progress) with story 01, and parentless stories 144, 146.
async function liveStream(root) {
  const workDir = path.join(root, "wiki", "work");
  const dirs = {
    134: path.join(workDir, "134_milestone_discovery"),
    "134/01": path.join(workDir, "134_milestone_discovery", "stories", "01_story_the-baseline-is-counted"),
    144: path.join(workDir, "144_story_the-whole-tree-run"),
    146: path.join(workDir, "146_story_a-capture"),
  };
  await writeItem(dirs[134], "SPEC.md", { type: "milestone", number: "134", slug: "discovery", status: "in-progress" });
  await writeItem(dirs["134/01"], "STORY.md", { type: "story", number: "01", slug: "the-baseline-is-counted", parent: "134", status: "in-progress" });
  await writeItem(dirs[144], "STORY.md", { type: "story", number: "144", slug: "the-whole-tree-run", status: "in-progress" });
  await writeItem(dirs[146], "STORY.md", { type: "story", number: "146", slug: "a-capture", status: "in-progress" });
  return { workDir, dirs };
}

const retro = (...lessons) => ["# Retrospective", "", ...lessons.flatMap((lesson) => [...lesson, ""])].join("\n");
const lesson = (heading, ...lines) => [heading, "", ...lines, "", "What happened, in prose."];
const writeRetro = (dir, text) => writeFile(path.join(dir, "RETROSPECTIVE.md"), text);

async function scratch(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, "aof-lesson-meta-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function validate(root, workDir, scope) {
  const result = await validateCommand.run(scope ? { scope } : {}, { workspace: { workDir, config: {}, projectRoot: root } });
  return { findings: result.findings, exit: validateCommand.cli.exit(result) };
}

const problemsFor = (findings, dir) =>
  findings.filter((finding) => finding.path === path.join(dir, "RETROSPECTIVE.md")).map((finding) => finding.problem);

// Task 01's archive: 46 (R1..R15, no meta line) and 01 (R1..R4, every value starting with a word).
async function archivedStream(root) {
  const { workDir, dirs } = await liveStream(root);
  const archive = path.join(workDir, "archive");
  dirs[46] = path.join(archive, "46_milestone_terminal-control");
  dirs[1] = path.join(archive, "01_milestone_acd-asset-bundle");
  await writeItem(dirs[46], "SPEC.md", { type: "milestone", number: "46", slug: "terminal-control", status: "done" });
  await writeItem(dirs[1], "SPEC.md", { type: "milestone", number: "01", slug: "acd-asset-bundle", status: "done" });
  await writeRetro(dirs[46], retro(...Array.from({ length: 15 }, (_, i) => lesson(`## R${i + 1} — lesson ${i + 1}`))));
  await writeRetro(
    dirs[1],
    retro(
      lesson("## R1 — one", "- **Kind:** mistake · **Area:** code · **Stage:** build→verify · **Owner:** developer"),
      lesson("## R2 — two", "- **Kind:** near-miss (recurring) · **Area:** process · **Stage:** refine→build · **Owner:** qa"),
      lesson("## R3 — three", "- **Kind:** blocker · **Area:** contract · **Stage:** verify · **Owner:** product-owner"),
      lesson("## R4 — four", "- **Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** architect"),
    ),
  );
  return { workDir, dirs };
}

const runDoctor = (workDir, root) => doctor.doctorWork(workDir, {}, undefined, { now: Date.parse("2026-10-06T00:00:00Z"), projectRoot: root });
const archivedFindings = (findings, dir) =>
  findings.filter((finding) => finding.code === "lesson-meta-archived" && finding.path === path.join(dir, "RETROSPECTIVE.md"));

// -------------------------------------------------------------------- tasks ----

export const lessonMetaHoldTests = [
  {
    name: "148/04 E1: a non-vocabulary Area in a nested story's lesson is an error",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await liveStream(root);
      await writeRetro(dirs["134/01"], retro(lesson("## R1 — a contract cited a file no branch carried", "- **Kind:** mistake · **Area:** planning · **Stage:** refine · **Owner:** product-owner")));
      const { findings, exit } = await validate(root, workDir);
      assert.notEqual(exit, 0);
      const problems = problemsFor(findings, dirs["134/01"]);
      assert.equal(problems.length, 1, problems.join("\n"));
      for (const word of ["R1", "Area", "planning", AREAS]) assert.ok(problems[0].includes(word), `${problems[0]} names ${word}`);
    }),
  },
  {
    name: "148/04 E2: a non-vocabulary Kind in a parentless story's lesson is an error, with the qualifier hint",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await liveStream(root);
      await writeRetro(dirs[144], retro(lesson("## R2", "- **Kind:** risk · **Area:** process · **Stage:** verify · **Owner:** product owner")));
      const problems = problemsFor((await validate(root, workDir)).findings, dirs[144]);
      assert.equal(problems.length, 1, problems.join("\n"));
      for (const word of ["R2", "Kind", "risk", KINDS]) assert.ok(problems[0].includes(word), `${problems[0]} names ${word}`);
      assert.match(problems[0], /a qualifier goes after the word, as "near-miss \(risk\)"/);
    }),
  },
  {
    name: "148/04 E3: a lesson with no meta line is reported on all four fields as missing",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await liveStream(root);
      await writeRetro(dirs[146], retro(lesson("## R1 — A new test file is a budget change")));
      const problems = problemsFor((await validate(root, workDir)).findings, dirs[146]);
      assert.equal(problems.length, 4, problems.join("\n"));
      for (const label of ["Kind", "Area", "Stage", "Owner"]) {
        assert.ok(problems.some((problem) => problem.includes("R1") && problem.includes(label) && problem.includes("missing")), `${label} is reported missing`);
      }
    }),
  },
  {
    name: "148/04 E4: vocabulary words with qualifiers conform",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await liveStream(root);
      await writeRetro(dirs[134], retro(lesson("## R1", "- **Kind:** near-miss (recurring) · **Area:** process · **Stage:** build (caught at review) · **Owner:** developer")));
      assert.deepEqual(problemsFor((await validate(root, workDir)).findings, dirs[134]), []);
    }),
  },
  {
    name: "148/04 E5: an empty Owner is an error",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await liveStream(root);
      await writeRetro(dirs[134], retro(lesson("## R1", "- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:**")));
      const problems = problemsFor((await validate(root, workDir)).findings, dirs[134]);
      assert.equal(problems.length, 1, problems.join("\n"));
      assert.ok(problems[0].includes("R1") && problems[0].includes("Owner") && problems[0].includes("missing"), problems[0]);
    }),
  },
  ...[
    ["- **Kind:** Near-Miss · **Area:** Architecture · **Stage:** Build · **Owner:** architect", 0],
    ["- **Kind:** near-miss · **Area:** code\n- **Stage:** verify · **Owner:** qa", 0],
    ["- **Kind:** mistakes · **Area:** code · **Stage:** build · **Owner:** developer", 1],
    ["- **Kind:** near-miss · **Area:** code · **Stage:** build→verify · **Owner:** developer", 0],
    ["- **Kind:** blocker · **Area:** memory/accounting · **Stage:** build · **Owner:** developer", 1],
  ].map(([meta, count]) => ({
    name: `148/04 outline: the meta line is read as the parser reads it — ${JSON.stringify(meta)} → ${count}`,
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await liveStream(root);
      await writeRetro(dirs[134], retro(lesson("## R1", ...meta.split("\n"))));
      const problems = problemsFor((await validate(root, workDir)).findings, dirs[134]);
      assert.equal(problems.length, count, problems.join("\n"));
    }),
  })),
  {
    name: "148/04: a validate scoped to one item reports only that item's lessons",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await liveStream(root);
      const bad = retro(lesson("## R1", "- **Kind:** risk · **Area:** code · **Stage:** build · **Owner:** qa"));
      await writeRetro(dirs["134/01"], bad);
      await writeRetro(dirs[144], bad);
      const { findings } = await validate(root, workDir, "144");
      assert.equal(problemsFor(findings, dirs[144]).length, 1);
      assert.deepEqual(problemsFor(findings, dirs["134/01"]), []);
    }),
  },
  {
    name: "148/04: an item with no retrospective is not reported",
    run: () => scratch(async (root) => {
      const { workDir } = await liveStream(root);
      const { findings } = await validate(root, workDir);
      assert.deepEqual(findings.filter((finding) => finding.path.endsWith("RETROSPECTIVE.md")), []);
    }),
  },
  {
    name: "148/04 E6: an archived retrospective of 15 unconforming lessons is one warning, and validate never fails it",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await archivedStream(root);
      const found = archivedFindings(await runDoctor(workDir, root), dirs[46]);
      assert.equal(found.length, 1);
      assert.equal(found[0].severity, "warn");
      assert.match(found[0].message, /\b15 lesson/);
      const ids = Array.from({ length: 15 }, (_, i) => `R${i + 1}`);
      assert.ok(found[0].message.includes(ids.join(", ")), found[0].message);
      assert.deepEqual(problemsFor((await validate(root, workDir)).findings, dirs[46]), []);
    }),
  },
  {
    name: "148/04 E7: an archived retrospective whose lessons all conform is not flagged",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await archivedStream(root);
      assert.deepEqual(archivedFindings(await runDoctor(workDir, root), dirs[1]), []);
    }),
  },
  {
    name: "148/04: a live retrospective is never flagged by the archived lane",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await archivedStream(root);
      await writeRetro(dirs[134], retro(lesson("## R1", "- **Kind:** risk · **Area:** code · **Stage:** build · **Owner:** qa")));
      assert.deepEqual(archivedFindings(await runDoctor(workDir, root), dirs[134]), []);
    }),
  },
  {
    name: "148/04: the doctor reads and never writes the archived retrospective",
    run: () => scratch(async (root) => {
      const { workDir, dirs } = await archivedStream(root);
      const file = path.join(dirs[46], "RETROSPECTIVE.md");
      const before = await readFile(file);
      await runDoctor(workDir, root);
      assert.ok((await readFile(file)).equals(before));
    }),
  },
  {
    name: "148/04: the lane's codes cannot reach the gate",
    run: () => {
      assert.ok(Object.isFrozen(LESSON_META_FINDING_CODES));
      assert.ok(LESSON_META_FINDING_CODES.includes("lesson-meta-archived"));
      assert.deepEqual(LESSON_META_FINDING_CODES.filter((code) => CONTROL_FINDING_CODES.includes(code)), []);
      assert.ok(doctor.CHECK_GROUPS.includes(lessonMetaLane), "the lane is registered in CHECK_GROUPS");
    },
  },
];
