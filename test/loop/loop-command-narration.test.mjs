// Traceability: milestone 126 / story 00, tasks 02 and 03 (ADR-002, AMENDED). FF-12602's DRIVEN
// half — what actually reaches a collector, in what order, and what `--quiet` does to it. The
// structural half is `test/arch/loop/acd-loop-narrates-in-flight.test.mjs`.
//
// Every fixture drives with an INJECTED `now`, so nothing here ages out of its own precondition.
import assert from "node:assert/strict";
import path from "node:path";
import { writeFile } from "node:fs/promises";

import { runLoopBody } from "../../src/commands/loop.mjs";
import { completeRun, readRuns, startRun } from "../../src/run-store.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";

const IN_FLIGHT = /^(Driving|Retrying|Resumed|Reclaimed|Gate) /u;
const isInFlight = (line) => IN_FLIGHT.test(line);

/** Drive the fixture, collecting every line the ONE injected printer receives. */
async function collect(fx, input, { onCommand, driverOverrides = {} } = {}) {
  const lines = [];
  const driver = completingDriver(fx, { onCommand });
  const state = await runLoopBody(
    { scope: "03", ...input },
    {
      ...fx.ctx,
      agentSessionDriverOptions: { ...driver.options, ...driverOverrides },
      report: (line) => { lines.push(line); },
    },
  );
  return { lines, state, driver };
}

/**
 * A driver whose phase outcomes are scripted, so the retry lane is reachable. The same shape
 * `loop-command-stops.test.mjs` drives its stop table with; local because that one is not
 * exported, and duplicating six lines is cheaper than widening another suite's surface.
 */
function watcherDriver(outcomes) {
  const scripted = [...outcomes];
  const waiting = [];
  const fake = createFakePtySpawn({
    onWrite() {
      waiting.shift()?.(scripted.shift() ?? { outcome: "done" });
    },
  });
  return {
    spawnCalls: fake.spawnCalls,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => `session-${fake.spawnCalls.length}`,
      watchTranscriptCompletion: async () => await new Promise((resolve) => waiting.push(resolve)),
      commandDelayMs: 0,
    },
  };
}

/** Drive with a scripted driver, collecting the printer's lines. */
async function collectScripted(fx, input, outcomes) {
  const lines = [];
  const driver = watcherDriver(outcomes);
  const state = await runLoopBody(
    { scope: "03", ...input },
    { ...fx.ctx, agentSessionDriverOptions: driver.options, report: (line) => { lines.push(line); } },
  );
  return { lines, state, driver };
}

/**
 * `completingDriver` emits the session's exit synchronously after handing the directive to
 * `onCommand` — right for a scripted agent that only reads. An agent that WRITES the run store
 * needs its act to land before the shell reads the record back (the live gap was thirty
 * seconds; here it is one awaited promise), or both sides read `running` and the last write
 * wins with no conflict raised at all. Same shape, one await — and the Enter write ignored:
 * 70/06 delivers the directive as a bracketed paste with the Enter as its OWN write, and an
 * exit fired on that keystroke's empty command lands before the directive's act has run.
 */
function actingDriver(fx, { onCommand } = {}) {
  const typed = [];
  const fake = createFakePtySpawn({
    onWrite({ chunk, emitExit }) {
      const command = chunk.replace(/[\r\n]+$/u, "");
      if (command === "") return;
      typed.push(command);
      Promise.resolve(onCommand?.(command.split("\n\n")[0])).then(() => emitExit(0));
    },
  });
  return {
    typed,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => `session-${typed.length}`,
      commandDelayMs: 0,
    },
  };
}

const closingCommands = (fx) => (command) => {
  if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
  if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
};

export const loopCommandNarrationTests = [
  {
    // 2026-09-12 — THE SETTLE THAT LOST ITS RACE. Measured live on 127/01: the agent inside a
    // 21-minute loop drive ran `aof work run-complete 127/01 --outcome done` as its closing act
    // (the bundle's un-driven-regime bookkeeping), which settled the LOOP's run; the shell then
    // settled it again, the store answered `illegal transition done -> done`, and the whole loop
    // died with that one line on stderr. The verb now yields inside a driven session (see
    // test/run/run-commands.test.mjs, the driven cases) — but the record is a file any process
    // can reach, so the shell's settle must ALSO survive losing the race: report the conflict
    // in the narration, carry on with what the driver observed, and reach verify like any
    // other done drive. This fixture settles the run out from under the shell at the exact
    // moment the agent did — while the directive is being typed into the PTY.
    name: "loop settle — a run settled out from under the shell is a narrated conflict, not a death; the loop carries on",
    async run() {
      const fx = await loopFixture();
      try {
        const settledByAgent = [];
        const lines = [];
        const driver = actingDriver(fx, {
          onCommand: async (command) => {
            if (command === "/aof:continue 03/01") {
              // The agent's closing act, as the store received it: the item's single running run.
              // Taken only once the driver's session-id capture has LANDED on the record (live:
              // the capture at ~2s, the act twenty minutes later). `recordSessionId` is a
              // read-modify-write with no state guard, so an act that lands inside its window is
              // clobbered back to `running` and no conflict is ever raised — a real hazard in the
              // store, and not the one this case is about.
              const item = await resolveItemExact(fx.ctx, "03/01");
              let running = null;
              for (let attempt = 0; attempt < 200 && running?.sessionId == null; attempt += 1) {
                running = (await readRuns(item)).find((run) => run.state === "running") ?? null;
                if (running?.sessionId == null) await new Promise((resolve) => setTimeout(resolve, 5));
              }
              assert.ok(running?.sessionId, "the driver's session-id capture landed before the agent acted");
              settledByAgent.push((await completeRun(item, { runId: running.runId, outcome: "done", now: "2026-09-08T10:05:00.000Z" })).runId);
            }
            closingCommands(fx)(command);
          },
        });
        const state = await runLoopBody(
          { scope: "03", now: "2026-09-08T10:00:00.000Z" },
          { ...fx.ctx, agentSessionDriverOptions: driver.options, report: (line) => { lines.push(line); } },
        );
        assert.equal(settledByAgent.length, 1, "the fixture settled the shell's run once, mid-drive");

        // The conflict is narrated, naming the run, both views, and that nothing was rewritten.
        const conflict = lines.find((line) => line.startsWith("Settle conflict on 03/01"));
        assert.ok(conflict, `a Settle conflict line reaches the collector — got: ${JSON.stringify(lines)}`);
        assert.match(conflict, new RegExp(`run ${settledByAgent[0]} was already done at 2026-09-08T10:05:00.000Z`, "u"), "it names the run and the state found on disk");
        assert.match(conflict, /the driver observed done\. Record left as it stands\.$/u, "it names the driver's observation and that the record stands");

        // The loop did not die: the continue drive is accounted for, verify was reached, and the
        // terminal account closed the story and its milestone exactly as an unraced drive does.
        assert.deepEqual(
          lines.filter((line) => line.startsWith("Driving ")),
          [
            "Driving 03/01 — continue, cycle 1 of 3, L2.",
            "Driving 03/01 — verify, cycle 1 of 3, L2.",
            "Driving 03 — verify, cycle 1 of 3, L2.",
          ],
          "the conflict changed nothing about the walk",
        );
        assert.equal(state.state, "done", "the loop reached its terminal state");
        const continued = state.driven.find((row) => row.ref === "03/01" && row.phase === "continue");
        assert.equal(continued.outcome, "done", "the driven row carries the driver's observation");
        assert.equal(continued.runId, settledByAgent[0], "…on the run the shell minted");

        // And the record on disk is the agent's settle, untouched by the losing side.
        const item = await resolveItemExact(fx.ctx, "03/01");
        const record = (await readRuns(item)).find((run) => run.runId === settledByAgent[0]);
        assert.equal(record.state, "done");
        assert.equal(record.updatedAt, "2026-09-08T10:05:00.000Z", "the illegal transition wrote nothing");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/00 task02 — the act line arrives before the drive, and every Driven row falls in the terminal account's contiguous block",
    async run() {
      const fx = await loopFixture();
      try {
        const { lines } = await collect(fx, { now: "2026-09-08T10:00:00.000Z" }, { onCommand: closingCommands(fx) });
        assert.equal(
          lines[0],
          "Driving 03/01 — continue, cycle 1 of 3, L2.",
          "the collector's FIRST line announces the drive",
        );
        const firstDriven = lines.findIndex((line) => line.startsWith("Driven "));
        assert.ok(firstDriven > 0, "and it precedes every Driven row");
        assert.ok(lines.slice(0, firstDriven).every((line) => !line.startsWith("Driven ")));

        // The Driven rows are contiguous: the terminal account replays them in one block.
        const drivenIndexes = lines.flatMap((line, index) => line.startsWith("Driven ") ? [index] : []);
        assert.deepEqual(
          drivenIndexes,
          drivenIndexes.map((_, offset) => drivenIndexes[0] + offset),
          "the account's Driven block is contiguous",
        );
        assert.ok(!isInFlight(lines.at(-1)), "the last line is the account's state line");

        // EVERY drive announces itself, and the cross to verify is a drive: a clean gate goes
        // there without asking `work:next`, so an act line only at the main site would leave the
        // verify wait silent. The story closes and its milestone is then verified too.
        assert.deepEqual(
          lines.filter((line) => line.startsWith("Driving ")),
          [
            "Driving 03/01 — continue, cycle 1 of 3, L2.",
            "Driving 03/01 — verify, cycle 1 of 3, L2.",
            "Driving 03 — verify, cycle 1 of 3, L2.",
          ],
          "one act line per drive, each naming the ref of the run that drive mints",
        );
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    // The cycle is the one fact in the act line that changes between drives, so it is the one
    // that can be silently wrong — a line that reported `cycle 1 of 3` three times would read as
    // a stuck loop, which is the opposite of what this story is for.
    name: "126/00 task02 — a re-driven story counts its cycles in the act line, one per drive",
    async run() {
      // `reviewRounds: 2` is what lets the cap be the bound that bites: with the default of one
      // round a red gate re-drives once and stops on the review bound at cycle 2, which proves
      // the counter advances but never exercises a third act line.
      const fx = await loopFixture({ cap: 3, reviewRounds: 2 });
      try {
        // A gate that stays red re-drives `continue` until the engine's cycle cap ends the range.
        await writeFile(
          path.join(fx.storyDir, "tasks", "00_ready.feature"),
          "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n",
        );
        const { lines, state } = await collect(fx, { now: "2026-09-08T10:00:00.000Z" });
        assert.deepEqual(
          lines.filter((line) => line.startsWith("Driving ")),
          [
            "Driving 03/01 — continue, cycle 1 of 3, L2.",
            "Driving 03/01 — continue, cycle 2 of 3, L2.",
            "Driving 03/01 — continue, cycle 3 of 3, L2.",
          ],
          "the cycle advances with the drive it announces",
        );
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "engine:cycle>=cap");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/00 task02 — an L1 invocation prints no Driving line, because L1 drives nothing",
    async run() {
      const fx = await loopFixture();
      try {
        const { lines } = await collect(fx, { level: "L1", now: "2026-09-08T10:00:00.000Z" });
        assert.equal(lines.filter((line) => line.startsWith("Driving ")).length, 0);
        assert.ok(lines.length > 0, "and its row lines are still printed: they are the account");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/00 task02 — a scope that halts before any drive announces no drive at all",
    async run() {
      const fx = await loopFixture({ storyStatus: "done", milestoneStatus: "done" });
      try {
        const { lines } = await collect(fx, { now: "2026-09-08T10:00:00.000Z" });
        assert.equal(lines.filter((line) => line.startsWith("Driving ")).length, 0);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/00 task02 — a reclaim and a resume each say so once, naming the run the sweep settled and the retry the drive uses",
    async run() {
      const fx = await loopFixture();
      try {
        const item = await resolveItemExact(fx.ctx, "03/01");
        const seeded = await startRun(item, {
          brief: { loop: { loopRunId: "narrate-seeded", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-09-08T10:00:00.000Z" } },
          now: "2026-09-08T10:00:00.000Z",
        });
        const { lines } = await collect(
          fx,
          { resume: true, now: "2026-09-08T10:16:00.000Z" },
          { onCommand: closingCommands(fx) },
        );
        const reclaimed = lines.filter((line) => line.startsWith("Reclaimed "));
        assert.deepEqual(reclaimed, [`Reclaimed 03/01 — run ${seeded.runId} (runtime_offline).`]);

        const resumed = lines.filter((line) => line.startsWith("Resumed "));
        assert.equal(resumed.length, 1, "exactly one Resumed line");
        const retry = (await readRuns(item)).find((run) => run.retryOf === seeded.runId);
        assert.equal(resumed[0], `Resumed 03/01 — attempt 2 of 3 on run ${retry.runId}.`);

        const firstDriven = lines.findIndex((line) => line.startsWith("Driven "));
        assert.ok(lines.indexOf(reclaimed[0]) < firstDriven);
        assert.ok(lines.indexOf(resumed[0]) < firstDriven);
        assert.ok(
          lines.indexOf(resumed[0]) < lines.findIndex((line) => line.startsWith("Driving ")),
          "the lineage fact rides beside the act line, before the drive it describes",
        );
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/00 task02 — the three in-flight lines that existed already reach the same collector",
    async run() {
      const fx = await loopFixture();
      try {
        const { lines } = await collect(fx, { now: "2026-09-08T10:00:00.000Z" }, { onCommand: closingCommands(fx) });
        assert.ok(
          lines.some((line) => /^Gate work:validate 03\/01 — \d+ finding\(s\)\.$/u.test(line)),
          "the gate ladder's first rung",
        );
        const firstDriven = lines.findIndex((line) => line.startsWith("Driven "));
        for (const gate of lines.filter((line) => line.startsWith("Gate "))) {
          assert.ok(lines.indexOf(gate) < firstDriven, `${gate} arrives in flight, not in the account`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/00 task02 — an in-process retry says so once per attempt the store admits, and a refused retry says nothing",
    async run() {
      const timeouts = await loopFixture({ cap: 3 });
      try {
        const { lines, state } = await collectScripted(
          timeouts,
          { now: "2026-09-08T10:00:00.000Z" },
          Array(3).fill({ outcome: "failed", failureReason: "timeout" }),
        );
        assert.deepEqual(
          lines.filter((line) => line.startsWith("Retrying ")),
          [
            "Retrying 03/01 — continue, attempt 2 of 3 (timeout).",
            "Retrying 03/01 — continue, attempt 3 of 3 (timeout).",
          ],
          "one line per admitted retry — and NO fourth, because the store refuses a fourth attempt",
        );
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "run-store:attempts-exhausted");
        const firstDriven = lines.findIndex((line) => line.startsWith("Driven "));
        for (const line of lines.filter((l) => l.startsWith("Retrying "))) {
          assert.ok(lines.indexOf(line) < firstDriven, "each arrives before the drive it describes");
        }
      } finally {
        await timeouts.cleanup();
      }

      // A retry the store REFUSES announces nothing: the line is printed after the mint is
      // admitted, never before it.
      for (const [failureReason, stop] of [["agent_error", "run-not-retryable"], ["session_limit", "retry-parked"]]) {
        const fx = await loopFixture({ cap: 3 });
        try {
          const { lines, state } = await collectScripted(
            fx,
            { now: "2026-09-08T10:00:00.000Z" },
            [{ outcome: "failed", failureReason }],
          );
          assert.equal(state.act.stop, stop, failureReason);
          assert.equal(lines.filter((line) => line.startsWith("Retrying ")).length, 0, failureReason);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "126/00 task03 — under --quiet, zero in-flight lines and a byte-identical account from the first Driven row onward",
    async run() {
      const loud = await loopFixture();
      const quiet = await loopFixture();
      try {
        const now = "2026-09-08T10:00:00.000Z";
        const a = await collect(loud, { now }, { onCommand: closingCommands(loud) });
        const b = await collect(quiet, { now, quiet: true }, { onCommand: closingCommands(quiet) });

        assert.equal(b.lines.filter(isInFlight).length, 0, "the quiet run holds no in-flight line");
        assert.ok(a.lines.filter(isInFlight).length >= 1, "the loud run holds at least one");

        const from = (lines) => lines.slice(lines.findIndex((line) => line.startsWith("Driven ")));
        assert.deepEqual(from(b.lines), from(a.lines), "the account is byte-identical");
        assert.equal(b.lines.at(-1), a.lines.at(-1), "…including the state line");
        assert.deepEqual(b.lines, a.lines.filter((line) => !isInFlight(line)), "quiet removes exactly the in-flight class");
      } finally {
        await loud.cleanup();
        await quiet.cleanup();
      }
    },
  },
  {
    name: "126/00 task03 — a stop reached before any drive prints the same bytes loud or quiet",
    async run() {
      const loud = await loopFixture({ storyStatus: "done", milestoneStatus: "done" });
      const quiet = await loopFixture({ storyStatus: "done", milestoneStatus: "done" });
      try {
        const now = "2026-09-08T10:00:00.000Z";
        const a = await collect(loud, { now });
        const b = await collect(quiet, { now, quiet: true });
        assert.deepEqual(b.lines, a.lines, "byte-identical in full, line for line");
        assert.equal(a.lines.filter(isInFlight).length, 0, "neither printed an in-flight line, because none was reachable");
      } finally {
        await loud.cleanup();
        await quiet.cleanup();
      }
    },
  },
  {
    name: "126/00 task03 — `--level L1 --quiet` prints exactly what `--level L1` prints",
    async run() {
      const loud = await loopFixture();
      const quiet = await loopFixture();
      try {
        const now = "2026-09-08T10:00:00.000Z";
        const a = await collect(loud, { level: "L1", now });
        const b = await collect(quiet, { level: "L1", now, quiet: true });
        assert.deepEqual(b.lines, a.lines, "byte-identical, line for line");
        assert.ok(a.lines.length > 0, "and both are non-empty: the L1 rows are the account");
        assert.ok(
          a.lines.some((line) => /^03\/01 — /u.test(line)),
          "one row line per item the walk offers — classifying by call site would have silenced this invocation entirely",
        );
      } finally {
        await loud.cleanup();
        await quiet.cleanup();
      }
    },
  },
  {
    name: "126/00 task03 — `Nothing to resume` is the account, and is printed under --quiet byte for byte",
    async run() {
      const loud = await loopFixture();
      const quiet = await loopFixture();
      try {
        const now = "2026-09-08T10:00:00.000Z";
        const a = await collect(loud, { resume: true, now });
        const b = await collect(quiet, { resume: true, now, quiet: true });
        const expected = "Nothing to resume in 03 — no run carries a loop declaration.";
        assert.ok(a.lines.includes(expected));
        assert.deepEqual(b.lines, a.lines, "the same one line, byte-identical");
      } finally {
        await loud.cleanup();
        await quiet.cleanup();
      }
    },
  },
  {
    name: "126/00 task03 — a halt under --quiet still names its stop, its ref, its producer and the resume command",
    async run() {
      const loud = await loopFixture();
      const quiet = await loopFixture();
      try {
        const now = "2026-09-08T10:00:00.000Z";
        const seed = async (fx) => {
          const item = await resolveItemExact(fx.ctx, "03/01");
          const prior = await startRun(item, {
            brief: { loop: { loopRunId: "quiet-halt", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: now } },
            now,
          });
          await completeRun(item, { runId: prior.runId, outcome: "failed", failureReason: "agent_error", now });
        };
        await seed(loud);
        await seed(quiet);
        const a = await collect(loud, { resume: true, now });
        const b = await collect(quiet, { resume: true, now, quiet: true });

        assert.equal(a.state.act.stop, "run-not-retryable");
        assert.equal(b.state.act.stop, "run-not-retryable");
        assert.equal(b.lines.at(-1), a.lines.at(-1), "the last line is byte-identical");
        assert.match(b.lines.at(-1), /halted on run-not-retryable at 03\/01/u);
        assert.match(b.lines.at(-1), /Resume with: aof work loop 03 --resume/u);
        assert.equal(b.lines.filter(isInFlight).length, 0);
        assert.deepEqual(
          b.lines.filter((line) => line.startsWith("Driven ") || line.startsWith("Accepted milestone ")),
          a.lines.filter((line) => line.startsWith("Driven ") || line.startsWith("Accepted milestone ")),
          "every Driven row and Accepted milestone line the loud run printed is printed here too",
        );
        assert.equal(
          b.lines.filter((line) => line.startsWith("Resumed ")).length,
          0,
          "a retry the store refuses announces nothing, loud or quiet",
        );
        assert.equal(a.lines.filter((line) => line.startsWith("Resumed ")).length, 0);
      } finally {
        await loud.cleanup();
        await quiet.cleanup();
      }
    },
  },
  {
    name: "126/00 task03 — the default is loud: an in-flight line reaches the printer before the terminal account",
    async run() {
      const fx = await loopFixture();
      try {
        const { lines } = await collect(fx, { now: "2026-09-08T10:00:00.000Z" }, { onCommand: closingCommands(fx) });
        const firstDriven = lines.findIndex((line) => line.startsWith("Driven "));
        assert.ok(lines.slice(0, firstDriven).some(isInFlight), "at least one in-flight line precedes the account");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
