// Traceability wiring for milestone 54 / story 02, task
// `01_the-doctor-gate-scope-and-severity`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/02_story_fitness-in-the-gate/tasks/01_the-doctor-gate-scope-and-severity.feature
//
// THIS IS THE RUNG THAT CHANGES BEHAVIOUR, so every one of its edges is ruled rather than
// discovered, and each of the three measured facts closes a way it could have gone wrong:
//
//   SEVERITY — `aof work doctor --json` returns 397 findings stream-wide and 396 of them are
//   `warn`. A gate that read warns would block every loop in this repository on a numbering
//   artefact. The gate INHERITS `severityFor`'s mapping rather than re-deriving it.
//
//   SCOPE — the rung runs at the driven item's own ref, exactly as the shell already invoked
//   `work:validate`. Without that, one un-authored register anywhere under `wiki/work` would
//   stop every loop in the repository (`70/ADR-007`'s inherited-red pathology).
//
//   THE ADMITTED SET — a FILTER over `CONTROL_FINDING_CODES`, never a copy. `verify.md:130-132`
//   makes the red-probe register an artefact THE VERIFY PHASE ITSELF AUTHORS, and this gate
//   sits at the entry to verify: gating entry to verify on verify's own output is circular and
//   unsatisfiable for every milestone, forever. The obligation is MOVED, not weakened.
import assert from "node:assert/strict";
import path from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { invoke, getCommand } from "../../src/command-core.mjs";
import { runLoopBody, admittedDoctorFindings, DOCTOR_GATE_CODES } from "../../src/commands/loop.mjs";
import { CONTROL_FINDING_CODES } from "../../src/work/doctor-controls.mjs";
import { severityFor } from "../../src/acceptance-horizon.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";
import { stripComments, functionBody } from "../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const UNRESOLVED_REGISTER = `# Story architecture

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-0001 | **A control the register cites and the tree does not carry.** | \`test/arch/no-such-control.test.mjs\` | ADR-000 |
`;

const PENDING_REGISTER = UNRESOLVED_REGISTER.replace("| ADR-000 |", "— **pending** | ADR-000 |");

function capturingReport() {
  const lines = [];
  const report = (line) => { lines.push(String(line)); };
  report.lines = lines;
  report.doctorAdmitted = () => {
    const line = lines.find((entry) => entry.startsWith("Gate work:doctor "));
    return line == null ? null : Number.parseInt(line.match(/— (\d+) admitted/u)?.[1] ?? "", 10);
  };
  return report;
}

const seedRegister = (fx, text) => writeFileSync(path.join(fx.storyDir, "ARCHITECTURE.md"), text);

function seedSibling(fx, register) {
  const dir = path.join(fx.workDir, "04_milestone_sibling");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "SPEC.md"), [
    "---", "type: milestone", "number: 04", "slug: sibling", "status: in-progress",
    'title: "Sibling"', "created: 2026-08-15", "updated: 2026-08-15", "schema: 1", "---",
    "# 04 · Sibling", "",
  ].join("\n"));
  writeFileSync(path.join(dir, "ARCHITECTURE.md"), register);
}

const crossToVerify = (fx) => completingDriver(fx, {
  onCommand(command) {
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  },
});

export const loopDoctorGateScopeAndSeverityTests = [
  {
    name: "loop gate/01 the gate is invoked at the driven item's own scope, never stream-wide",
    run: async () => {
      const fx = await loopFixture();
      try {
        seedRegister(fx, UNRESOLVED_REGISTER);
        const scopes = [];
        const doctor = getCommand("work:doctor");
        const original = doctor.run.bind(doctor);
        doctor.run = async (commandInput, commandCtx) => {
          scopes.push(commandInput?.scope);
          return await original(commandInput, commandCtx);
        };
        try {
          await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: completingDriver(fx).options, report: () => {} });
        } finally {
          doctor.run = original;
        }
        assert.ok(scopes.length > 0, "guard: the doctor rung really ran");
        assert.deepEqual([...new Set(scopes)], ["03/01"], "work:doctor is invoked with that story's own ref as its scope");
        assert.ok(!scopes.includes(undefined) && !scopes.includes(null), "it is not invoked stream-wide");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/01 a sibling's debt cannot halt your loop",
    run: async () => {
      const fx = await loopFixture();
      try {
        // A milestone ELSEWHERE in the stream carrying an admitted error; the driven story
        // carries none.
        seedSibling(fx, UNRESOLVED_REGISTER);
        const report = capturingReport();
        const driver = crossToVerify(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });

        assert.equal(report.doctorAdmitted(), 0, "the gate finds nothing");
        assert.ok(driver.typed.some((typed) => typed.startsWith("/aof:verify 03/01")), "the loop proceeds to the next rung");
        assert.equal(state.state, "done");

        // NON-VACUITY: the sibling's error is real — a stream-wide gate WOULD have halted.
        const streamWide = await invoke("work:doctor", {}, fx.ctx);
        assert.ok(
          streamWide.findings.some((finding) => finding.code === "control-unresolved" && finding.severity === "error"),
          "guard: the sibling really does carry an admitted error stream-wide",
        );
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/01 [outline] only errors gate, and the severity comes from the horizon (9 rows)",
    run: () => {
      const rows = [
        { code: "control-unresolved", severity: "error", gates: true },
        { code: "control-unregistered", severity: "error", gates: true },
        { code: "staged-control", severity: "error", gates: true },
        { code: "register-duplicate-id", severity: "error", gates: true },
        { code: "register-dangling-citation", severity: "error", gates: true },
        { code: "numbering-gap", severity: "warn", gates: false },
        { code: "mtime-ahead-of-updated", severity: "warn", gates: false },
        { code: "doc-over-budget", severity: "warn", gates: false },
        { code: "control-runner-unchecked", severity: "warn", gates: false },
      ];
      for (const row of rows) {
        const finding = { code: row.code, severity: row.severity, path: "wiki/work/03_milestone_fixture/ARCHITECTURE.md", message: "m" };
        const admitted = admittedDoctorFindings([finding]);
        assert.equal(admitted.length === 1, row.gates, `[${row.code} @ ${row.severity}] the gate admits it only when it should`);
      }
      // …AND THE SEVERITY IS THE ONLY THING SEPARATING an admitted code from itself: the same
      // five codes at `warn` (which is what `severityFor` answers OUTSIDE the horizon — a
      // `done` item) admit nothing.
      for (const row of rows.filter((entry) => entry.gates)) {
        const asWarn = { code: row.code, severity: "warn", path: "p", message: "m" };
        assert.deepEqual(admittedDoctorFindings([asWarn]), [], `[${row.code} @ warn] a warn never gates, whatever it says`);
      }
    },
  },

  {
    name: "loop gate/01 a control carrying the pending marker is already a warn, so it does not gate",
    run: async () => {
      const fx = await loopFixture();
      try {
        seedRegister(fx, PENDING_REGISTER);
        // THE FINDING IS REPORTED AT `warn` — read off the real doctor, not asserted about
        // the gate's own filter.
        const doctor = await invoke("work:doctor", { scope: "03/01" }, fx.ctx);
        const unresolved = doctor.findings.filter((finding) => finding.code === "control-unresolved");
        assert.equal(unresolved.length, 1, "guard: the pending control really is still reported");
        assert.equal(unresolved[0].severity, "warn", "the finding is reported at warn");

        const report = capturingReport();
        const driver = crossToVerify(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });
        assert.equal(report.doctorAdmitted(), 0, "the gate admits nothing");
        assert.equal(state.state, "done", "the loop proceeds to the next rung");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/01 [outline] the two verification codes never gate, at any severity (2 rows)",
    run: async () => {
      for (const code of ["verification-register-missing", "verification-missing-red-probe"]) {
        assert.deepEqual(
          admittedDoctorFindings([{ code, severity: "error", path: "p", message: "m" }]),
          [],
          `[${code}] the gate admits nothing`,
        );
      }
      // …AND THE SAME FINDING STILL RENDERS AT `error` ON EVERY OTHER SURFACE. The obligation
      // is MOVED (to before-accept, where it can always be met), never weakened.
      const fx = await loopFixture();
      try {
        // The unresolved register also produces `verification-register-missing` at `error` —
        // one fixture, both halves of the rule.
        seedRegister(fx, PENDING_REGISTER);
        const doctor = await invoke("work:doctor", { scope: "03/01" }, fx.ctx);
        const register = doctor.findings.filter((finding) => finding.code === "verification-register-missing");
        assert.equal(register.length, 1, "guard: the fixture really produces the verification code");
        assert.equal(register[0].severity, "error", "the same finding still renders at error on every other surface");

        const report = capturingReport();
        const driver = crossToVerify(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });
        assert.equal(report.doctorAdmitted(), 0, "…and the gate still admits nothing");
        assert.equal(state.state, "done", "the loop proceeds to the next rung");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/01 the admitted set is derived by filter, never restated as a literal",
    run: async () => {
      const expected = CONTROL_FINDING_CODES.filter((code) => !code.startsWith("verification-") && code !== "control-runner-unchecked");
      assert.deepEqual([...DOCTOR_GATE_CODES], expected, "it is exactly that array minus its two verification- members and control-runner-unchecked");
      assert.equal(DOCTOR_GATE_CODES.length, 5, "it is five codes");
      assert.equal(Object.isFrozen(DOCTOR_GATE_CODES), true, "…and frozen");

      // A CODE ADDED TO THE FROZEN ARRAY IS EITHER ADMITTED OR EXCLUDED BY THE SAME FILTER,
      // WITH NO SECOND LIST TO EDIT — proven on the source, because the property is about
      // there being no literal to fall out of step.
      const source = await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8");
      const code = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      assert.match(code, /DOCTOR_GATE_CODES\s*=\s*Object\.freeze\(\s*CONTROL_FINDING_CODES\.filter/u, "the set is derived from the frozen array by filter");
      for (const admitted of expected) {
        assert.ok(!code.includes(`"${admitted}"`), `the gate restates no admitted code as a literal (found "${admitted}")`);
      }
    },
  },

  {
    name: "loop gate/01 the gate never consults the Loop-Ready score",
    run: async () => {
      const fx = await loopFixture();
      try {
        // The doctor's result really does carry a score, so "it is not read" is a statement
        // about something that was there to read.
        const doctor = await invoke("work:doctor", { scope: "03/01" }, fx.ctx);
        assert.ok(Object.prototype.hasOwnProperty.call(doctor, "loopReady"), "guard: the doctor result carries a Loop-Ready score");
        assert.deepEqual(admittedDoctorFindings(doctor.findings), [], "the gate admits nothing on a clean item");

        const report = capturingReport();
        const driver = crossToVerify(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });
        assert.equal(state.state, "done", "the loop proceeds to the next rung");

        // NO GATE DECISION READ THE LOOP-READY SCORE — asserted on the ladder's own source,
        // which is the only place it could have been read.
        // Cut STRUCTURALLY through the one home (`test/support/source-slice.mjs`), never by a
        // positional window or an `indexOf` sentinel end — `acd-test-suite-registration`'s
        // ledger records six instruments this repo got wrong that way.
        const source = stripComments(await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8"));
        const body = functionBody(source, "async function invokeGateLadder(");
        assert.ok(body != null, "the ladder's body was found structurally");
        assert.ok(!/\bloopReady\b/u.test(body), "the ladder reads loopReady nowhere");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/01 the horizon's own mapping is neither modified nor re-derived",
    run: async () => {
      // THE GATE TAKES THE SEVERITY THE DOCTOR ALREADY REPORTED. Proven by handing the filter
      // a finding whose code is admitted but whose severity contradicts what the horizon
      // would say: the filter follows the REPORTED value, so it computes nothing of its own.
      assert.deepEqual(admittedDoctorFindings([{ code: "control-unresolved", severity: "warn" }]), [], "a reported warn is not re-graded up");
      assert.equal(admittedDoctorFindings([{ code: "control-unresolved", severity: "error" }]).length, 1, "a reported error is not re-graded down");

      const source = await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8");
      const code = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      assert.ok(!code.includes("severityFor"), "it computes no severity of its own — `severityFor` is neither re-derived nor called here");

      // AND A `done` ITEM'S IDENTICAL FINDING IS STILL REPORTED AT `warn` — the horizon's own
      // answer, unchanged by this story.
      assert.equal(severityFor("done"), "warn", "a done item's identical finding is still reported at warn");
      assert.equal(severityFor("in-progress"), "error", "…and an open one's at error");

      const fx = await loopFixture();
      try {
        seedRegister(fx, UNRESOLVED_REGISTER);
        const open = await invoke("work:doctor", { scope: "03/01" }, fx.ctx);
        assert.equal(open.findings.find((finding) => finding.code === "control-unresolved").severity, "error", "guard: open reports error");
        replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
        const done = await invoke("work:doctor", { scope: "03/01" }, fx.ctx);
        assert.equal(done.findings.find((finding) => finding.code === "control-unresolved").severity, "warn", "…and the same finding on a done item reports warn");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/01 an admitted error re-drives the build with the doctor's findings, and exhausts at the cap",
    run: async () => {
      const fx = await loopFixture();
      try {
        seedRegister(fx, UNRESOLVED_REGISTER);
        const report = capturingReport();
        const driver = completingDriver(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });

        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2], "the loop re-drives continue for that story");
        assert.equal(report.doctorAdmitted(), 1, "…on the doctor's own admitted finding");

        // THE RE-DRIVE CARRIES THE DOCTOR FINDING — the second continue's prompt is compiled
        // from the pending fix, whose findings are the gate's.
        assert.ok(
          driver.typed.some((typed) => typed.includes("no-such-control.test.mjs")),
          "the re-drive carries the doctor finding",
        );

        // A CYCLE COUNT THAT HAS REACHED THE CAP HALTS ON `cap-exhausted` INSTEAD…
        assert.equal(state.act.stop, "cap-exhausted", "a cycle count that has reached the cap halts on cap-exhausted");
        // …AND NO NEW STOP ID WAS MINTED FOR THIS RUNG.
        const { LOOP_STOPS } = await import("../../src/work/loop.mjs");
        assert.ok(!LOOP_STOPS.includes("doctor-gate"), "no new stop id was minted for this rung");
        assert.ok(!LOOP_STOPS.some((stop) => stop.includes("doctor")), "…under any spelling");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
