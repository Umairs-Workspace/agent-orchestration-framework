// Traceability wiring for milestone 54 / story 02, task `00_the-cost-ladder`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/54_milestone_verification-loop/stories/02_story_fitness-in-the-gate/tasks/00_the-cost-ladder.feature
//
// THE SPEC'S OWN HEADLINE, HALF-WIRED UNTIL NOW. `GATE_ORDER` was three frozen rows naming
// exactly one gate command, and `grep -ci "doctor|controls|fitness"` over both loop modules
// returned 0 — the fitness half had never graded anything in the loop.
//
// THIS FILE IS ABOUT ORDER AND SHORT-CIRCUIT ONLY. The doctor rung's scope, severity and
// admitted code set are the sibling task (`01_the-doctor-gate-scope-and-severity`), and the
// `work:grade` rung's own INVOCATION is 54/03's — the row is declared here because
// `GATE_ORDER` is a frozen declaration and 54/03 rebases onto it, so what is asserted below
// is the rung's POSITION (after the doctor, before the review turn) and that a red doctor
// never reaches it.
import assert from "node:assert/strict";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { GATE_ORDER } from "../../src/work/loop.mjs";
import { runLoopBody } from "../../src/commands/loop.mjs";
import { listCommands } from "../../src/command-core.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";
// 54/03 review finding D4 — the configured half of the ladder's cost claim needs the same
// grading fixture 54/03's suites use, because a rubric nobody declared can launch nothing.
import { emitsFailing, gradingCtx, gradingFixture, stubRubric } from "../support/loop-grade-fixture.mjs";
import { registeredSuitePaths } from "../support/registration/registration-surface.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const invalidFeature = `Feature: Invalid
  Scenario: missing lane
    Given a fixture
`;

// A story-level fitness register citing a control that is NOT on disk. Measured against the
// real doctor: this yields `control-unresolved` at `error` (an ADMITTED code) alongside a
// `verification-register-missing` error (NOT admitted) and two warns — one fixture that
// exercises the admission rule from all four directions at once.
const UNRESOLVED_REGISTER = `# Story architecture

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-0001 | **A control the register cites and the tree does not carry.** | \`test/arch/no-such-control.test.mjs\` | ADR-000 |
`;

// The same register with the control's entry marked `pending` — already a `warn`, so it
// cannot gate.
const PENDING_REGISTER = UNRESOLVED_REGISTER.replace("| ADR-000 |", "— **pending** | ADR-000 |");

// A capturing report. The gate rungs announce themselves on the operator's own report line
// (`53/ADR-016`), which is what makes "the last gate invoked" an OBSERVATION rather than an
// inference about code that was not run.
function capturingReport() {
  const lines = [];
  const report = (line) => { lines.push(String(line)); };
  report.lines = lines;
  report.gates = () => lines
    .filter((line) => line.startsWith("Gate "))
    .map((line) => line.split(" ")[1]);
  return report;
}

const seedRegister = (fx, text) => writeFileSync(path.join(fx.storyDir, "ARCHITECTURE.md"), text);

export const loopGateCostLadderTests = [
  {
    name: "loop gate/00 the loop declares the five-step order it will walk, and every gate step names an invokable command",
    run: () => {
      const steps = GATE_ORDER.map((row) => (row.act === "gate" ? `gate ${row.command}` : `${row.act} ${row.phase}`));
      assert.equal(GATE_ORDER.length, 5, "the declared order is five steps");
      assert.deepEqual(
        steps,
        ["drive continue", "gate work:validate", "gate work:doctor", "gate work:grade", "drive verify"],
        "the steps read drive continue, gate work:validate, gate work:doctor, gate work:grade, drive verify, in that order",
      );

      // EVERY GATE STEP NAMES A COMMAND AN OPERATOR CAN INVOKE BY HAND — resolved against the
      // real registry, so a row naming a command nobody registered fails here rather than at
      // the moment the loop reaches it.
      const registered = new Set(listCommands().map((command) => command.id));
      for (const row of GATE_ORDER.filter((entry) => entry.act === "gate")) {
        assert.ok(registered.has(row.command), `${row.command} is a registered command an operator can invoke by hand`);
      }
      assert.equal(Object.isFrozen(GATE_ORDER), true, "the declaration is frozen");
      for (const row of GATE_ORDER) assert.equal(Object.isFrozen(row), true, "…rows included");
    },
  },

  {
    name: "loop gate/00 a red validate never pays for the doctor",
    run: async () => {
      const fx = await loopFixture();
      try {
        writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), invalidFeature);
        // The doctor WOULD find an admitted error here — and must never be asked, because
        // validate already answered.
        seedRegister(fx, UNRESOLVED_REGISTER);
        const report = capturingReport();
        const driver = completingDriver(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });

        assert.deepEqual(report.gates(), ["work:validate", "work:validate"], "work:doctor is not invoked");
        assert.ok(!report.lines.some((line) => line.includes("work:grade")), "no runner is spawned");
        assert.ok(!driver.typed.some((typed) => typed.startsWith("/aof:verify")), "no verify session is driven");
        // THE LOOP RE-DRIVES CONTINUE CARRYING THE VALIDATE FINDINGS.
        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2]);
        assert.equal(state.act.stop, "cap-exhausted", "…until the review cap stops it, the gate staying red throughout");
      } finally {
        await fx.cleanup();
      }

      // ---- THE SAME LADDER, OVER A FIXTURE THAT CAN ACTUALLY BE OBSERVED ----------------
      //
      // 54/03 review finding D4, cross-lane edit into 54/02's file (recorded in
      // `54/STATE.md`, citing 54/02's own standing rule). The assertion above is BLIND: the
      // fixture declares no `work.rubric`, so `work:grade` launches nothing whatever the
      // shell does, and a report-line grep over a rung that cannot announce itself observes
      // NOTHING. Both reviewers flagged it independently as the m45/R5 shape — a fitness
      // function must check what its name claims — and it is this milestone's fifth instance.
      //
      // Re-aimed at the SPAWN SEAM over a CONFIGURED fixture, asserting what ADR-007 §1 now
      // says after its 2026-08-23 amendment: **the short-circuit governs the DECISION order,
      // not the cost.** Measured here rather than assumed:
      //
      //   - rung 2 is never paid for (the decision short-circuit, intact);
      //   - no verify session is driven (rung 4, intact);
      //   - the runner is launched EXACTLY ONCE PER COMPLETED BUILD and never twice for one
      //     answer — 69/06's per-build ledger call at `commands/loop.mjs:1287`, which is what
      //     makes 54/03 task 00 scenario 2's "one validate finding AND one failing case"
      //     payload reachable at all;
      //   - and rung 1's finding is still what re-drove the maker.
      //
      // A cost short-circuit would make this count 0 — and would make that delivered 54/03
      // scenario unsatisfiable, which is the conflict the amendment settles.
      const configured = await gradingFixture({ cap: 2, reviewRounds: 9 });
      try {
        writeFileSync(path.join(configured.storyDir, "tasks", "00_ready.feature"), invalidFeature);
        seedRegister(configured, UNRESOLVED_REGISTER);
        const report = capturingReport();
        const driver = completingDriver(configured);
        const spawn = stubRubric(emitsFailing([["beta", "beta did not close"]], ["alpha"]));
        const state = await runLoopBody({ scope: "03" }, gradingCtx(configured, { driver, report, spawn }));

        const builds = state.driven.filter((row) => row.phase === "continue" && row.outcome === "done").length;
        assert.equal(builds, 2, "guard: two builds completed, so 'once per completed build' is a real claim");
        // THE DECISION SHORT-CIRCUIT IS INTACT: the doctor is never asked, and no review turn
        // is spent, however red the register beneath it is.
        assert.equal(report.gates().includes("work:doctor"), false, "a red validate still never pays for the doctor");
        assert.equal(driver.typed.some((typed) => typed.startsWith("/aof:verify")), false, "…nor for a review turn");
        // AND THE RUNNER IS LAUNCHED ONCE PER COMPLETED BUILD — the amended cost statement,
        // observed at the seam a spawn really passes through.
        // …plus the ONE baseline the story's lineage pays before its first drive (2026-09-12): a
        // measurement of the tree, not a second answer for any build.
        assert.equal(spawn.calls.length, 1 + builds, "the runner is launched once for the baseline and exactly once per completed build, never twice for one answer");
        assert.equal(
          report.lines.filter((line) => line.startsWith("Gate work:grade ")).length,
          builds,
          "…and the rung announces the answer it READ, once per build",
        );
        // AND RUNG 1 IS STILL WHAT DECIDED: the maker was re-driven on the validate finding.
        const carried = String(driver.typed[1] ?? "").split("## REVIEW FINDINGS")[1] ?? "";
        const producers = [...carried.matchAll(/"gate":\s*"([^"]+)"/gu)].map((match) => match[1]);
        assert.ok(producers.includes("work:validate"), "the payload carries the validate finding that decided the re-drive");
        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2], "the loop re-drives continue");
        assert.equal(state.act.stop, "cap-exhausted", "…until the cap stops it");
      } finally {
        await configured.cleanup();
      }
    },
  },

  {
    name: "loop gate/00 a red doctor never pays for the runner, and never for a review turn",
    run: async () => {
      const fx = await loopFixture();
      try {
        seedRegister(fx, UNRESOLVED_REGISTER);
        const report = capturingReport();
        const driver = completingDriver(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });

        // WORK:VALIDATE WAS INVOKED BEFORE WORK:DOCTOR — read off the order the rungs
        // announced themselves in, not off the source.
        assert.deepEqual(report.gates().slice(0, 2), ["work:validate", "work:doctor"], "work:validate was invoked before work:doctor");
        assert.ok(!report.lines.some((line) => line.includes("work:grade")), "no runner is spawned");
        assert.ok(!driver.typed.some((typed) => typed.startsWith("/aof:verify")), "no verify session is driven");
        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2], "the loop re-drives continue");
        assert.equal(state.act.stop, "cap-exhausted", "…and the permanently red doctor is bounded by the review cap");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/00 every gate answers alone, so the doctor rung is useful before the runner exists",
    run: async () => {
      const fx = await loopFixture();
      try {
        // A REPOSITORY THAT DECLARES NO `work.rubric` — the fixture's config sets none, which
        // is the ordinary case and the whole reason this story lands before the runner.
        assert.equal(fx.workspace.config.work.rubric, undefined, "guard: the fixture declares no rubric");
        seedRegister(fx, UNRESOLVED_REGISTER);
        const report = capturingReport();
        const driver = completingDriver(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });

        assert.ok(report.gates().includes("work:doctor"), "the doctor rung still runs");
        assert.ok(!driver.typed.some((typed) => typed.startsWith("/aof:verify")), "the doctor rung still stops the ladder");
        // AND THE RUNGS BEFORE IT WERE NOT WEAKENED: validate still ran first, and still ran
        // on every cycle.
        assert.deepEqual(report.gates().filter((gate) => gate === "work:validate").length, 2, "validate ran on every cycle, unweakened");
        assert.equal(state.act.stop, "cap-exhausted");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/00 [outline] the first red rung is where the ladder stops (3 rows)",
    run: async () => {
      const rows = [
        { validate: "red", doctor: "—", lastInvoked: "work:validate", verifyDriven: false },
        { validate: "green", doctor: "red", lastInvoked: "work:doctor", verifyDriven: false },
        { validate: "green", doctor: "green", lastInvoked: "work:doctor", verifyDriven: true },
      ];
      for (const row of rows) {
        const fx = await loopFixture();
        try {
          if (row.validate === "red") writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), invalidFeature);
          if (row.doctor === "red") seedRegister(fx, UNRESOLVED_REGISTER);
          const report = capturingReport();
          const driver = completingDriver(fx, {
            onCommand(command) {
              if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
              if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
            },
          });
          await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });

          const gates = report.gates();
          assert.equal(gates[gates.length - 1], row.lastInvoked, `[${row.validate}/${row.doctor}] the last gate invoked is ${row.lastInvoked}`);
          assert.equal(
            driver.typed.some((typed) => typed.startsWith("/aof:verify")),
            row.verifyDriven,
            `[${row.validate}/${row.doctor}] a verify session is driven only when it should be`,
          );
        } finally {
          await fx.cleanup();
        }
      }
    },
  },

  {
    name: "loop gate/00 a clean ladder still crosses to verify exactly as it does today",
    run: async () => {
      const fx = await loopFixture();
      try {
        const report = capturingReport();
        const driver = completingDriver(fx, {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });

        // THE LOOP DRIVES VERIFY, AND WITHOUT ASKING work:next FOR A FRESH DECISION — the
        // continue is immediately followed by the verify for the SAME ref, which is the
        // shipped sequence (`work:next` would have offered the unchanged story and chosen
        // continue).
        assert.deepEqual(
          driver.typed.map((typed) => typed.split("\n\n")[0]).slice(0, 2),
          ["/aof:continue 03/01", "/aof:verify 03/01"],
          "the loop drives verify for that story without asking work:next for a fresh decision",
        );
        assert.equal(state.state, "done");
        assert.deepEqual(report.gates(), ["work:validate", "work:doctor"], "…having walked both deterministic rungs clean first");

        // AND THE THREE SHIPPED LOOP SUITES OBSERVE THE SAME SEQUENCE THEY OBSERVE TODAY —
        // ADR-002 §3's evidence, taken the way the ADR asks for it: they are still registered
        // in the aggregate (which is what "green" means in this repo) and none of them was
        // edited to learn about the new rung. `m08/R2` warns that "green verbatim" and
        // "guarantee preserved" are different claims; the second assertion is what closes the
        // gap, because a suite that had to be TAUGHT the doctor would name it.
        // Registration is transitive since 119/03 — the runner names directories and each
        // directory's index names its own suites — so the aggregate's membership is read from
        // the registration surface rather than from the runner's text. Same claim.
        const registered = await registeredSuitePaths(repoRoot);
        for (const suite of ["loop/loop-command-gate", "loop/loop-command-sequencing", "loop/loop-command-stops"]) {
          assert.ok(registered.has(`test/${suite}.test.mjs`), `test/${suite}.test.mjs is still registered in the aggregate suite`);
          const text = await readFile(path.join(repoRoot, "test", `${suite}.test.mjs`), "utf8");
          assert.ok(!text.includes("work:doctor"), `${suite} names work:doctor nowhere`);
          assert.ok(!text.includes("DOCTOR_GATE_CODES"), `${suite} reaches for the admitted set nowhere`);
          assert.ok(!text.includes("Gate work:"), `${suite} was not taught the new report lines`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/00 the ladder's rungs are invoked at the driven item's own scope",
    run: async () => {
      const fx = await loopFixture();
      try {
        // A SIBLING ELSEWHERE IN THE STREAM CARRYING ITS OWN FINDINGS. Without per-item
        // scope, one un-authored register anywhere under wiki/work would stop every loop in
        // the repository — the inherited-red pathology `70/ADR-007` refuses by name.
        const { mkdirSync } = await import("node:fs");
        const siblingDir = path.join(fx.workDir, "04_milestone_sibling");
        mkdirSync(siblingDir, { recursive: true });
        writeFileSync(path.join(siblingDir, "SPEC.md"), [
          "---", "type: milestone", "number: 04", "slug: sibling", "status: in-progress",
          'title: "Sibling"', "created: 2026-08-15", "updated: 2026-08-15", "schema: 1", "---",
          "# 04 · Sibling", "",
        ].join("\n"));
        writeFileSync(path.join(siblingDir, "ARCHITECTURE.md"), UNRESOLVED_REGISTER);

        const scopes = [];
        const ctx = {
          ...fx.ctx,
          agentSessionDriverOptions: completingDriver(fx, {
            onCommand(command) {
              if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
              if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
            },
          }).options,
          report: () => {},
        };
        // The scope each rung is invoked with, read off the real registry call.
        const { getCommand } = await import("../../src/command-core.mjs");
        for (const id of ["work:validate", "work:doctor"]) {
          const command = getCommand(id);
          const original = command.run.bind(command);
          command.run = async (commandInput, commandCtx) => {
            scopes.push({ id, scope: commandInput?.scope });
            return await original(commandInput, commandCtx);
          };
          fx[`restore:${id}`] = () => { command.run = original; };
        }
        try {
          await runLoopBody({ scope: "03" }, ctx);
        } finally {
          for (const id of ["work:validate", "work:doctor"]) fx[`restore:${id}`]();
        }

        const gateScopes = scopes.filter((entry) => entry.scope === "03/01" || entry.scope == null);
        assert.ok(scopes.length > 0, "guard: the rungs really were invoked");
        assert.deepEqual(
          [...new Set(scopes.map((entry) => entry.scope))],
          ["03/01"],
          "every gate is invoked with the driven item's own scope, and none stream-wide",
        );
        assert.equal(gateScopes.every((entry) => entry.scope === "03/01"), true, "no gate is invoked stream-wide");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/00 a sibling's admitted error is absent from the gate's result",
    run: async () => {
      // The other half of the scope scenario, asserted on the RESULT rather than on the
      // invocation: the sibling below carries an admitted error and the driven story does
      // not, so a stream-wide gate would halt and a scoped one crosses to verify.
      const fx = await loopFixture();
      try {
        const { mkdirSync } = await import("node:fs");
        const siblingDir = path.join(fx.workDir, "04_milestone_sibling");
        mkdirSync(siblingDir, { recursive: true });
        writeFileSync(path.join(siblingDir, "SPEC.md"), [
          "---", "type: milestone", "number: 04", "slug: sibling", "status: in-progress",
          'title: "Sibling"', "created: 2026-08-15", "updated: 2026-08-15", "schema: 1", "---",
          "# 04 · Sibling", "",
        ].join("\n"));
        writeFileSync(path.join(siblingDir, "ARCHITECTURE.md"), UNRESOLVED_REGISTER);

        const report = capturingReport();
        const driver = completingDriver(fx, {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });

        assert.ok(
          report.lines.some((line) => line.startsWith("Gate work:doctor 03/01 — 0 admitted")),
          "the sibling's findings appear in no gate result",
        );
        assert.ok(driver.typed.some((typed) => typed.startsWith("/aof:verify 03/01")), "…so the driven story still crosses to verify");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "loop gate/00 a pending control is a warn, so the ladder crosses it",
    run: async () => {
      // The `pending` marker's effect, asserted at the LADDER level (the sibling task asserts
      // it at the rung's own). It matters here because it is what keeps 69's and 70's fifteen
      // `control-unresolved` findings from gating their loops.
      const fx = await loopFixture();
      try {
        seedRegister(fx, PENDING_REGISTER);
        const report = capturingReport();
        const driver = completingDriver(fx, {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report });
        assert.ok(report.lines.some((line) => line.startsWith("Gate work:doctor 03/01 — 0 admitted")), "the gate admits nothing");
        assert.equal(state.state, "done", "and the loop proceeds to the next rung and on to verify");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
