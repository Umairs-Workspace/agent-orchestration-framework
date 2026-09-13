// Traceability wiring for milestone 54 / story 04, task `02_the-lane-reads-and-never-runs`.
//
// Every @executable scenario of
//   wiki/work/54_milestone_verification-loop/stories/04_story_scenario-traceability/tasks/02_the-lane-reads-and-never-runs.feature
//
// `work:doctor` IS THE DETERMINISTIC ENGINE, and `66/ADR-004` §2's *"ACD never executes
// anything"* is pinned on it by name. This story adds a lane to that engine, so the
// prohibition applies at full force — and the design that satisfies it already exists one
// lane over: the report arrives as SNAPSHOT TEXT at the engine's one impure edge, exactly as
// the controls lane's leg B receives its runner texts, and the lane itself stays a pure
// `(snapshot, ctx) => Finding[]` function.
//
// ABSENT IS AN HONEST NO-OP, AND NEVER A SILENT PASS. With no report to read, the lane says
// so and names the key to set. It does NOT report every scenario unjoined on the strength of
// a report it never read — that would be "green for the wrong reason" wearing the opposite
// sign, which is the one defect this milestone must not ship.
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { buildSnapshot, CHECK_GROUPS } from "../../src/work/doctor.mjs";
import { rubricTraceabilityGroup, RUBRIC_REPORT_CONFIG_KEY, declaredReportFrom } from "../../src/work/doctor-rubric.mjs";
import { stripComments } from "../support/source-slice.mjs";
import { makeGradeRepo, ctxFor } from "../support/grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const FEATURE = `@executable
Feature: F

  Scenario: the joined one
    Given a
    When b
    Then c

  Scenario: the lonely one
    Given a
    When b
    Then c
`;

const LITERAL_SNAPSHOT = Object.freeze({
  items: [{ ref: "03/00", dir: path.join("no-such-root-ff5408", "item"), featureTexts: { "tasks/00.feature": FEATURE } }],
  rubricReport: { path: path.join("no-such-root-ff5408", "report.tap"), format: "tap", present: true, text: "ok - unit: the joined one\n" },
});

// A workspace declaring a rubric whose report path is `report.tap`, plus one story feature.
async function repoWithReport({ reportText = null, format = "tap", declareReport = true } = {}) {
  const rubric = {
    command: [process.execPath, "-e", "process.exit(0)"],
    ...(declareReport ? { report: { format, path: "report.tap", floor: 1 } } : {}),
  };
  const fx = await makeGradeRepo({ rubric });
  await writeFile(path.join(fx.storyDir, "tasks", "00_task.feature"), FEATURE, "utf8");
  if (reportText != null) await writeFile(path.join(fx.repo, "report.tap"), reportText, "utf8");
  return fx;
}

const codes = (findings) => findings.map((finding) => finding.code);

export const rubricLaneReadsAndNeverRunsTests = [
  {
    name: "rubric/02 the lane is a pure function of the snapshot",
    run: async () => {
      const once = JSON.stringify(rubricTraceabilityGroup(LITERAL_SNAPSHOT));
      const twice = JSON.stringify(rubricTraceabilityGroup(LITERAL_SNAPSHOT));
      assert.equal(twice, once, "it returns the same findings both times");
      assert.ok(JSON.parse(once).length > 0, "non-vacuity: the literal snapshot really does produce findings, so `no filesystem` is not `no answers`");
      // The snapshot's paths name a root that does not exist. A lane that reached disk would
      // have thrown or answered differently.
      assert.equal(existsSync(path.join("no-such-root-ff5408")), false, "guard: the fixture root really is absent");
      for (const finding of JSON.parse(once)) assert.match(finding.path, /no-such-root-ff5408/, "it opened no file");

      // NO CLOCK, and NO `path.resolve` — a lane that read either could not be replayed from
      // a snapshot, which is the whole determinism contract.
      const body = stripComments(await readFile(path.join(repoRoot, "src", "work", "doctor-rubric.mjs"), "utf8"));
      for (const clock of ["Date.now", "new Date", "performance.now", "process.hrtime", "Date.parse"]) {
        assert.ok(!body.includes(clock), `it read no clock (found ${clock})`);
      }
      assert.ok(!/\bpath\.resolve\s*\(/u.test(body), "it resolved no path against the current working directory");
      assert.ok(!/\bprocess\.(?:cwd|env|argv)\b/u.test(body), "…and read no process state at all");
    },
  },

  {
    name: "rubric/02 the report text arrives at the engine's existing impure edge, and the lane performed no read",
    run: async () => {
      const fx = await repoWithReport({ reportText: "ok - unit: the joined one\n" });
      try {
        const ctx = await ctxFor(fx.repo);
        const snapshot = await buildSnapshot(ctx.workspace.workDir, {
          projectRoot: ctx.workspace.projectRoot,
          report: declaredReportFrom(ctx.workspace.config),
        });
        assert.equal(snapshot.rubricReport.present, true, "the report is read once, at the command boundary");
        assert.equal(snapshot.rubricReport.text, "ok - unit: the joined one\n", "and it arrives on the snapshot as plain text");
        assert.equal(snapshot.rubricReport.format, "tap", "…with the format it was declared in");

        // THE LANE ITSELF PERFORMED NO READ — it holds no filesystem import at all.
        const body = stripComments(await readFile(path.join(repoRoot, "src", "work", "doctor-rubric.mjs"), "utf8"));
        for (const io of ["node:fs", "readFile", "readFileSync", "existsSync", "statSync"]) {
          assert.ok(!body.includes(io), `the lane performs no read (found ${io})`);
        }
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "rubric/02 running the doctor never runs the project's rubric",
    run: async () => {
      // A DECLARED RUBRIC COMMAND THAT WOULD FAIL LOUDLY IF INVOKED: it writes a witness file
      // and exits non-zero. If the doctor ever launched it, the witness would exist.
      const fx = await makeGradeRepo();
      try {
        const witness = path.join(fx.repo, "the-rubric-ran");
        await mkdir(path.join(fx.repo, "runners"), { recursive: true });
        const runner = path.join(fx.repo, "runners", "loud.cjs");
        await writeFile(runner, `require("node:fs").writeFileSync(${JSON.stringify(witness)}, "x"); process.exit(9);\n`, "utf8");
        await writeFile(
          path.join(fx.repo, ".aof", "aof.config.json"),
          JSON.stringify({ name: "f", work: { dir: "./wiki/work", rubric: { command: [process.execPath, runner], report: { format: "tap", path: "report.tap", floor: 1 } } } }, null, 2),
          "utf8",
        );
        await writeFile(path.join(fx.storyDir, "tasks", "00_task.feature"), FEATURE, "utf8");

        const result = await invoke("work:doctor", { scope: "03/00" }, await ctxFor(fx.repo));
        assert.ok(Array.isArray(result.findings), "the doctor answers");
        assert.equal(existsSync(witness), false, "the rubric command produced none of its effects");

        // AND THE DOCTOR STARTED NO CHILD PROCESS — structurally, over the whole lane family.
        for (const module of ["work/doctor.mjs", "work/doctor-rubric.mjs", "work/doctor-controls.mjs"]) {
          const body = stripComments(await readFile(path.join(repoRoot, "src", module), "utf8"));
          for (const door of ["child_process", "spawnSync", "execSync", "execFileSync", "fork("]) {
            assert.ok(!body.includes(door), `${module} names no spawn door (found ${door})`);
          }
        }
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "rubric/02 the doctor's existing lanes answer exactly as they did before",
    run: async () => {
      const fx = await repoWithReport({ reportText: "ok - unit: the joined one\n" });
      try {
        const ctx = await ctxFor(fx.repo);
        // The SAME item, with and without the new lane in the registry: the difference is
        // exactly what the traceability lane itself contributes, and nothing else moves.
        const before = await invoke("work:doctor", { scope: "03/00" }, ctx);
        const withoutRubric = CHECK_GROUPS.filter((group) => group !== rubricTraceabilityGroup);
        assert.equal(withoutRubric.length, CHECK_GROUPS.length - 1, "guard: the lane really is one registry entry");

        const { doctorWork } = await import("../../src/work/doctor.mjs");
        const baseline = await doctorWork(ctx.workspace.workDir, ctx.workspace.config, "03/00", {
          now: Date.now(),
          projectRoot: ctx.workspace.projectRoot,
          groups: withoutRubric,
        });
        const contributed = new Set(["scenario-unjoined", "case-unjoined", "rubric-join-unchecked"]);
        const previouslyReported = before.findings.filter((finding) => !contributed.has(finding.code));
        assert.deepEqual(
          previouslyReported.map((finding) => `${finding.code}|${finding.severity}|${finding.message}`).sort(),
          baseline.map((finding) => `${finding.code}|${finding.severity}|${finding.message}`).sort(),
          "every previously reported finding is reported again, unchanged",
        );
        assert.ok(
          before.findings.some((finding) => contributed.has(finding.code)),
          "…and the only difference is what the traceability lane itself contributes",
        );
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "rubric/02 an undeclared report is an honest no-op that names the key to set",
    run: async () => {
      const fx = await repoWithReport({ declareReport: false });
      try {
        const result = await invoke("work:doctor", { scope: "03/00" }, await ctxFor(fx.repo));
        const ours = result.findings.filter((finding) => /unjoin|rubric-join/.test(finding.code));
        assert.deepEqual(codes(ours), ["rubric-join-unchecked"], "it reports that the join was not checked");
        assert.match(ours[0].message, new RegExp(RUBRIC_REPORT_CONFIG_KEY.replace(/\./gu, "\\.")), "the message names the configuration key that would enable it");
        // IT REPORTS NO `scenario-unjoined` FOR ANY SCENARIO — the fixture declares two, and
        // a lane that read silence as a miss would report both.
        assert.deepEqual(ours.filter((finding) => finding.code === "scenario-unjoined"), [], "it reports no scenario-unjoined finding for any scenario");
        // …AND NOTHING THAT COULD BE READ AS A CLEAN JOIN: the finding is present and says
        // "not checked", which is a different claim from reporting nothing at all.
        assert.equal(ours.length, 1, "it reports nothing that could be read as a clean join");
        assert.match(ours[0].message, /not.*join|no runner report/i, "…the notice says what did not happen");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "rubric/02 a declared report that is missing from disk says so rather than guessing",
    run: async () => {
      const fx = await repoWithReport({ reportText: null });
      try {
        assert.equal(existsSync(path.join(fx.repo, "report.tap")), false, "guard: nothing is at the declared path");
        const result = await invoke("work:doctor", { scope: "03/00" }, await ctxFor(fx.repo));
        const ours = result.findings.filter((finding) => /unjoin|rubric-join/.test(finding.code));
        assert.deepEqual(codes(ours), ["rubric-join-unchecked"], "it reports that the join was not checked");
        assert.match(ours[0].message, /report\.tap/, "it names the declared path");
        assert.deepEqual(ours.filter((finding) => finding.code === "scenario-unjoined"), [], "no scenario is reported unjoined on the strength of the absent report");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "rubric/02 an unreadable report names nothing rather than joining nothing",
    run: async () => {
      // A text carrying none of TAP's own structural elements — the normaliser answers
      // `{ ok: false }` and the lane stops there.
      const fx = await repoWithReport({ reportText: "Traceback: the lonely one exploded\nSegmentation fault\n" });
      try {
        const result = await invoke("work:doctor", { scope: "03/00" }, await ctxFor(fx.repo));
        const ours = result.findings.filter((finding) => /unjoin|rubric-join/.test(finding.code));
        assert.deepEqual(codes(ours), ["rubric-join-unchecked"], "it reports that the join was not checked");
        assert.deepEqual(ours.filter((finding) => finding.code === "case-unjoined"), [], "it reports no case-unjoined finding");
        // THE UNPARSEABLE TEXT WAS NOT SCANNED FOR SCENARIO NAMES — it contains "the lonely
        // one" verbatim, so a lane that swept it would have joined that scenario and reported
        // only the other as missing.
        assert.deepEqual(ours.filter((finding) => finding.code === "scenario-unjoined"), [], "…and nothing was joined from it either");
        assert.match(ours[0].message, /did not parse/, "the notice says the report could not be read");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "rubric/02 the lane is horizon-scoped like every other doctor lane",
    run: async () => {
      const fx = await repoWithReport({ reportText: "ok - names nothing here\n" });
      try {
        const ctx = await ctxFor(fx.repo);
        const scoped = await invoke("work:doctor", { scope: "03/00" }, ctx);
        const ours = scoped.findings.filter((finding) => /unjoin|rubric-join/.test(finding.code));
        assert.ok(ours.length > 0, "guard: the lane really did report for the scoped item");
        for (const finding of ours) {
          assert.match(finding.message, /^03\/00:/, "the traceability lane reports only that item's findings");
        }
        // AN ITEM OUTSIDE THE SCOPE CONTRIBUTES NO FINDING — the milestone 03 row is outside
        // `03/00`, and its own findings are absent from this answer.
        for (const finding of scoped.findings) {
          assert.ok(!finding.path.endsWith("03_milestone_board"), "an item outside the scope contributes no finding");
        }
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
];
