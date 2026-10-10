// Milestone 153 / story 03 task 01 — doctor's memory-effectiveness lane: a recurring lesson, and an
// unpromoted lesson aged past the operator-chosen five later ACCEPTED top-level milestones. Driven
// through the real doctor engine (every built-in lane) over a disposable stream, as `aof work doctor`
// runs it; the lane's findings are advisory and never reach a gate.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CONTROL_FINDING_CODES } from "@aof/work/audit/controls";
import { DEFAULT_UNPROMOTED_AGE_THRESHOLD, MEMORY_EFFECTIVENESS_FINDING_CODES, memoryEffectivenessLane } from "../src/doctor/memory-effectiveness.mjs";
import { createDoctorServices } from "./support/doctor-services.mjs";

const doctor = createDoctorServices();
const META = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";
const lessonText = (id, ...lines) => [`## ${id} — a lesson`, "", META, ...lines, "", "What happened, in prose.", ""].join("\n");
const retro = (...lessons) => ["# Retrospective", "", ...lessons].join("\n");

async function scratch(run) {
  const root = await mkdtemp(path.join(await realpath(os.tmpdir()), "aof-memory-lane-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const frontmatter = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\nschema: 1\n---\n`;

// A stream builder: `milestone(n, { status, updated, retro, archived })`, `story(n, parent, …)`.
function builder(root) {
  const workDir = path.join(root, "wiki", "work");
  const dirs = {};
  const put = async (dir, doc, fields, retrospective) => {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, doc), `${frontmatter(fields)}# ${fields.slug}\n`);
    if (retrospective != null) await writeFile(path.join(dir, "RETROSPECTIVE.md"), retrospective);
  };
  return {
    workDir,
    dirs,
    async milestone(number, { status = "done", updated = "2026-01-01", retrospective = null, archived = false } = {}) {
      const key = String(number).padStart(2, "0");
      const dir = path.join(workDir, ...(archived ? ["archive"] : []), `${key}_milestone_m${key}`);
      dirs[key] = dir;
      const fields = { type: "milestone", number: key, slug: `m${key}`, status, ...(updated == null ? {} : { updated }) };
      await put(dir, "SPEC.md", fields, retrospective);
    },
    async story(number, parent, { status = "done", updated = "2026-01-01", retrospective = null } = {}) {
      const key = String(number).padStart(2, "0");
      const parentDir = dirs[String(parent).padStart(2, "0")];
      const dir = parent == null ? path.join(workDir, `${key}_story_s${key}`) : path.join(parentDir, "stories", `01_story_s${key}`);
      dirs[parent == null ? key : `${parent}/${key}`] = dir;
      await put(dir, "STORY.md", { type: "story", number: parent == null ? key : "01", slug: `s${key}`, ...(parent == null ? {} : { parent }), status, updated }, retrospective);
    },
  };
}

// Milestone 10's single unpromoted lesson, accepted 2026-01-01, then `later` distinct milestones accepted afterwards.
async function ageStream(root, { later, promotion = "none", threshold, extra } = {}) {
  const stream = builder(root);
  await stream.milestone(10, { retrospective: retro(lessonText("R1", ...(promotion == null ? [] : [`- **Promoted to:** ${promotion}`]))) });
  for (let i = 0; i < later; i += 1) await stream.milestone(20 + i, { updated: `2026-02-${String(i + 1).padStart(2, "0")}` });
  if (extra) await extra(stream);
  return { ...stream, config: threshold == null ? {} : { work: { doctor: { memory: { unpromotedAfterMilestones: threshold } } } } };
}

const run = (stream, root, scope) => doctor.doctorWork(stream.workDir, stream.config ?? {}, scope, { now: Date.parse("2026-10-10T00:00:00Z"), projectRoot: root });
const memory = (findings, code) => findings.filter((finding) => (code ? finding.code === code : MEMORY_EFFECTIVENESS_FINDING_CODES.includes(finding.code)));
const AGED = "memory-lesson-unpromoted-aged";

export const memoryEffectivenessTests = [
  {
    name: "153/03 E4: the default warning starts at five later accepted milestones — quiet at four, present at five",
    run: () => scratch(async (root) => {
      assert.equal(DEFAULT_UNPROMOTED_AGE_THRESHOLD, 5);
      assert.deepEqual(memory(await run(await ageStream(root, { later: 4 }), root)), []);
      const aged = memory(await run(await ageStream(path.join(root, "five"), { later: 5 }), path.join(root, "five")), AGED);
      assert.equal(aged.length, 1);
      assert.match(aged[0].message, /10\/R1/);
      assert.match(aged[0].message, /age 5/);
      assert.match(aged[0].message, /default threshold 5/);
      assert.equal(aged[0].severity, "warn");
    }),
  },
  {
    name: "153/03 E5: a missing legacy Promoted to and an explicit none are both unpromoted, labelled separately, and never back-filled",
    run: () => scratch(async (root) => {
      const stream = await ageStream(root, { later: 5, promotion: null });
      await stream.milestone(11, { retrospective: retro(lessonText("R1", "- **Promoted to:** none")) });
      const found = memory(await run(stream, root), AGED);
      const byLesson = Object.fromEntries(found.map((finding) => [finding.message.match(/lesson (\S+)/)[1], finding.message]));
      assert.match(byLesson["10/R1"], /missing .*legacy/);
      assert.match(byLesson["11/R1"], /explicit none/);
      const before = await readFile(path.join(stream.dirs["10"], "RETROSPECTIVE.md"), "utf8");
      assert.ok(!before.includes("Promoted to"), "the legacy retrospective is not back-filled");
    }),
  },
  {
    name: "153/03 E6: no acceptance evidence is unknown age — never an aged warning from numeric refs",
    run: () => scratch(async (root) => {
      const stream = builder(root);
      await stream.milestone(10, { status: "done", updated: null, retrospective: retro(lessonText("R1", "- **Promoted to:** none")) });
      await stream.milestone(11, { status: "in-progress", retrospective: retro(lessonText("R1", "- **Promoted to:** none")) });
      for (let i = 0; i < 8; i += 1) await stream.milestone(20 + i, { updated: `2026-03-${String(i + 1).padStart(2, "0")}` });
      const findings = await run(stream, root);
      assert.deepEqual(memory(findings, AGED), []);
      const unknown = memory(findings, "memory-lesson-age-unknown");
      assert.equal(unknown.length, 1, "an accepted item without an acceptance instant is unknown; an open one has not begun to age");
      assert.match(unknown[0].message, /10\/R1.*unknown age/);
    }),
  },
  ...[
    ["an accepted story after the boundary", 4, false, async (s) => s.story(40, 20, { updated: "2026-06-01" })],
    ["a milestone that is still in progress", 4, false, async (s) => s.milestone(41, { status: "in-progress", updated: "2026-06-01" })],
    ["an accepted milestone at the same acceptance instant", 4, false, async (s) => s.milestone(42, { updated: "2026-01-01" })],
    ["an accepted milestone before the boundary", 4, false, async (s) => s.milestone(43, { updated: "2025-12-01" })],
    ["a duplicate listing of an already-counted milestone", 4, false, async (s) => s.milestone(20, { updated: "2026-02-01", archived: true })],
    ["a distinct archived milestone accepted after the boundary", 4, true, async (s) => s.milestone(44, { updated: "2026-06-01", archived: true })],
  ].map(([event, later, warns, extra]) => ({
    name: `153/03: only later distinct accepted milestones age a lesson — ${event} → ${warns ? "age 5, warns" : "age 4, quiet"}`,
    run: () => scratch(async (root) => {
      const found = memory(await run(await ageStream(root, { later, extra }), root), AGED);
      assert.equal(found.length, warns ? 1 : 0, found.map((finding) => finding.message).join("\n"));
      if (warns) assert.match(found[0].message, /age 5/);
    }),
  })),
  {
    name: "153/03: a nested story ages from its parent's acceptance and a standalone story from its own; story completion adds nothing",
    run: () => scratch(async (root) => {
      const stream = builder(root);
      await stream.milestone(10, { updated: "2026-01-01" });
      await stream.story(1, 10, { updated: "2026-01-02", retrospective: retro(lessonText("R1", "- **Promoted to:** none")) });
      await stream.story(50, null, { updated: "2026-02-10", retrospective: retro(lessonText("R1", "- **Promoted to:** none")) });
      // Five milestones accepted after 10; the standalone story (accepted 02-10) has only three after it.
      for (const [i, updated] of ["2026-02-01", "2026-02-02", "2026-02-11", "2026-02-12", "2026-02-13"].entries()) await stream.milestone(20 + i, { updated });
      await stream.story(60, null, { updated: "2026-03-01" });
      const found = memory(await run(stream, root), AGED);
      assert.deepEqual(found.map((finding) => finding.message.match(/lesson (\S+)/)[1]), ["10/01/R1"]);
      assert.match(found[0].message, /age 5/);
    }),
  },
  ...["control:153/FF-15301", "rule:.aof/rules/cleanup.md", "prompt:packages/core/assets/commands/refine.md"].map((promotion) => ({
    name: `153/03: a recorded ${promotion.split(":")[0]} promotion removes the aged signal and keeps an independent recurrence`,
    run: () => scratch(async (root) => {
      const stream = await ageStream(root, {
        later: 10,
        promotion,
        extra: (s) => s.milestone(60, { retrospective: retro(lessonText("R1", "- **Promoted to:** none", "- **Recurs:** 10/R1")) }),
      });
      const found = memory(await run(stream, root));
      assert.ok(!found.some((finding) => finding.code === AGED && finding.message.includes("10/R1")), "10/R1 is promoted");
      assert.equal(memory(found, "memory-lesson-recurs").length, 1);
    }),
  })),
  {
    name: "153/03 E7: a recurring archived lesson is a warning at the predecessor — its promotion does not suppress it and its retrospective is untouched",
    run: () => scratch(async (root) => {
      const stream = builder(root);
      await stream.milestone(45, { archived: true, retrospective: retro(lessonText("R13", "- **Promoted to:** rule:.aof/rules/x.md")) });
      await stream.milestone(68, { retrospective: retro(lessonText("R10", "- **Promoted to:** none", "- **Recurs:** 45/R13")) });
      const file = path.join(stream.dirs["45"], "RETROSPECTIVE.md");
      const before = await readFile(file);
      const found = memory(await run(stream, root), "memory-lesson-recurs");
      assert.equal(found.length, 1);
      assert.equal(found[0].path, file);
      assert.match(found[0].message, /45\/R13/);
      assert.match(found[0].message, /68\/R10/);
      assert.equal(found[0].severity, "warn");
      assert.ok((await readFile(file)).equals(before));
    }),
  },
  {
    name: "153/03 E8: only memory warnings leave doctor healthy — no errors, and no code in the control gate",
    run: () => scratch(async (root) => {
      const stream = await ageStream(root, { later: 5, extra: (s) => s.milestone(60, { retrospective: retro(lessonText("R1", "- **Promoted to:** none", "- **Recurs:** 10/R1")) }) });
      const findings = await run(stream, root);
      const own = memory(findings);
      assert.ok(own.some((finding) => finding.code === AGED) && own.some((finding) => finding.code === "memory-lesson-recurs"));
      assert.ok(own.every((finding) => finding.severity === "warn"));
      assert.deepEqual(MEMORY_EFFECTIVENESS_FINDING_CODES.filter((code) => CONTROL_FINDING_CODES.includes(code)), []);
      assert.ok(Object.isFrozen(MEMORY_EFFECTIVENESS_FINDING_CODES));
      assert.ok(doctor.CHECK_GROUPS.includes(memoryEffectivenessLane), "the lane is registered in CHECK_GROUPS");
      assert.equal(findings.filter((finding) => finding.severity === "error" && MEMORY_EFFECTIVENESS_FINDING_CODES.includes(finding.code)).length, 0);
    }),
  },
  {
    name: "153/03: a scoped run computes age from the whole stream and reports only in-scope findings",
    run: () => scratch(async (root) => {
      const stream = await ageStream(root, {
        later: 5,
        extra: async (s) => {
          await s.milestone(70, { retrospective: retro(lessonText("R1", "- **Promoted to:** control:153/FF-1")) });
          await s.milestone(71, { retrospective: retro(lessonText("R2", "- **Promoted to:** control:153/FF-1", "- **Recurs:** 70/R1")) });
        },
      });
      const scoped = memory(await run(stream, root, "10"));
      assert.deepEqual(scoped.map((finding) => finding.code), [AGED], "item 10's lesson, aged by milestones outside the scope; the unrelated recurrence is filtered");
      assert.match(scoped[0].message, /age 5/);
    }),
  },
  {
    name: "153/03: the threshold is configurable and the message says when it is not the default",
    run: () => scratch(async (root) => {
      const found = memory(await run(await ageStream(root, { later: 2, threshold: 2 }), root), AGED);
      assert.equal(found.length, 1);
      assert.match(found[0].message, /age 2/);
      assert.ok(!/default threshold/.test(found[0].message));
      assert.match(found[0].message, /threshold 2/);
    }),
  },
];
