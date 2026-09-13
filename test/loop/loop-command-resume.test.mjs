import assert from "node:assert/strict";
import path from "node:path";
import { completeRun, heartbeat, isStale, retryRun, startRun, readRuns } from "../../src/run-store.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { loopCommand, runLoopBody } from "../../src/commands/loop.mjs";
import { lineageElapsedMs } from "../../src/work/loop.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";

const declaration = {
  loopRunId: "loop-seeded",
  scope: "03",
  level: "L2",
  cap: 2,
  phase: "continue",
  cycle: 1,
  startedAt: "2026-08-15T00:00:00.000Z",
};

// 126/00: the same declaration at cap 3. The cap a RESUME runs under is the declaration's own
// (`resolveLoopResume`), not the fixture's `work.autonomous.maxAttempts` — so a lineage that has
// to reach a third attempt must have declared room for one.
const capThree = { ...declaration, cap: 3 };

export const loopCommandResumeTests = [
  {
    name: "loop command resume — the probe recovers the newest declaration and reports stranded without settling it",
    async run() {
      const fx = await loopFixture({ cap: 5 });
      try {
        const item = await resolveItemExact(fx.ctx, "03/01");
        const seeded = await startRun(item, { brief: { loop: declaration }, now: "2026-08-15T00:00:00.000Z", node: "offline-node" });
        const state = await loopCommand.run({ scope: "03", resume: true, cap: 4 }, fx.ctx);
        assert.equal(state.level, "L2");
        assert.equal(state.cap, 4, "explicit cap wins over the declaration");
        assert.equal(state.resumable.lastDeclaration.loopRunId, "loop-seeded");
        assert.deepEqual(state.resumable.stranded, [{ ref: "03/01", runId: seeded.runId, node: "offline-node" }]);
        assert.equal((await readRuns(item))[0].state, "running", "the probe is read-only");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop command resume — body settles the stranded record, re-asks current stream state, and restores no position",
    async run() {
      const fx = await loopFixture();
      try {
        const item = await resolveItemExact(fx.ctx, "03/01");
        const seeded = await startRun(item, { brief: { loop: declaration }, now: "2026-08-15T00:00:00.000Z" });
        const driver = completingDriver(fx, {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const state = await runLoopBody(
          { scope: "03", resume: true, now: "2026-08-15T00:16:00.000Z" },
          { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} },
        );
        const prior = (await readRuns(item)).find((run) => run.runId === seeded.runId);
        assert.equal(prior.state, "failed");
        assert.equal(prior.failureReason, "runtime_offline");
        assert.ok(prior.reclaimedAt);
        assert.equal(driver.typed[0].split("\n\n")[0], "/aof:continue 03/01", "resume re-asked work:next instead of restoring a phase pointer (the directive leads its first input)");
        assert.equal(state.state, "done");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop command resume — no prior run is reported plainly and drives nothing",
    async run() {
      const fx = await loopFixture();
      try {
        const driver = completingDriver(fx);
        const lines = [];
        const state = await runLoopBody({ scope: "03", resume: true }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: (line) => lines.push(line) });
        assert.equal(driver.spawnCalls.length, 0);
        assert.match(lines.join("\n"), /Nothing to resume/u);
        assert.equal(state.resumable.lastDeclaration, null);
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ── milestone 126 / story 00, task 01 — THE CLOCK AT THE TWO SHELL SITES ──────────────────
  //
  // FF-12601's driven half. Each case injects `now`, so an attempt minted and settled inside one
  // invocation costs 0 — `drivePhase` and `settleDriven` both pass it — and every figure below is
  // therefore the PRIOR lineage's. That is exactly what makes "the eleven hours are not charged"
  // observable rather than merely argued.
  {
    name: "126/00 task01 — the resume-lineage site charges attempts, and the hours the lid was shut are charged to nobody",
    async run() {
      const rows = [
        {
          label: "a 50 ms attempt under a 100 ms ceiling admits and drives",
          ceilingMs: 100,
          createdAt: "2026-09-08T10:00:00.000Z",
          failedAt: "2026-09-08T10:00:00.050Z",
          now: "2026-09-08T10:00:00.100Z",
          admits: true,
        },
        {
          label: "a 99 ms attempt admits twelve hours later: the wall clock decides nothing",
          ceilingMs: 100,
          createdAt: "2026-09-08T10:00:00.000Z",
          failedAt: "2026-09-08T10:00:00.099Z",
          now: "2026-09-08T22:00:00.000Z",
          admits: true,
        },
        {
          label: "a 100 ms attempt has genuinely spent a 100 ms budget and halts",
          ceilingMs: 100,
          createdAt: "2026-09-08T10:00:00.000Z",
          failedAt: "2026-09-08T10:00:00.100Z",
          now: "2026-09-08T10:00:00.100Z",
          admits: false,
          elapsedMs: 100,
        },
        {
          label: "124/00's own reclaimed attempt: admitted, where the same records halt on the wall clock",
          ceilingMs: 7_200_000,
          createdAt: "2026-09-07T23:32:33.272Z",
          heartbeatAt: "2026-09-08T00:02:19.028Z",
          reclaim: true,
          now: "2026-09-08T11:30:00.000Z",
          admits: true,
        },
      ];
      for (const row of rows) {
        const fx = await loopFixture({ cap: 3 });
        try {
          fx.workspace.config.work.loop = { scheduleToCloseMs: row.ceilingMs, heartbeatMs: 900_000 };
          const item = await resolveItemExact(fx.ctx, "03/01");
          const prior = await startRun(item, {
            brief: { loop: { ...declaration, cap: 3, startedAt: row.createdAt } },
            now: row.createdAt,
          });
          if (row.reclaim) {
            // Left `running` with a stale heartbeat — the shape the lid closing leaves behind.
            // The invocation's own sweep is what settles it, exactly as it did on 2026-09-08.
            await heartbeat(item, prior.runId, { now: row.heartbeatAt });
          } else {
            await completeRun(item, { runId: prior.runId, outcome: "failed", failureReason: "timeout", now: row.failedAt });
          }

          const lines = [];
          const driver = completingDriver(fx, {
            onCommand(command) {
              if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
              if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
            },
          });
          const state = await runLoopBody(
            { scope: "03", resume: true, now: row.now },
            { ...fx.ctx, agentSessionDriverOptions: driver.options, report: (line) => lines.push(line) },
          );

          const runs = await readRuns(item);
          if (row.admits) {
            assert.notEqual(state.act.stop, "deadline-exhausted", row.label);
            assert.ok(runs.some((run) => run.retryOf === prior.runId), `${row.label} — a retry is minted on that lineage`);
            assert.ok(driver.spawnCalls.length > 0, `${row.label} — and the drive is spawned`);
          } else {
            assert.equal(state.act.stop, "deadline-exhausted", row.label);
            assert.equal(state.act.producer, "loop:schedule-to-close>=ceiling", row.label);
            assert.equal(state.act.deadline, "scheduleToClose", row.label);
            assert.equal(state.act.disposition, "preserved-for-triage", row.label);
            assert.match(lines.at(-1), new RegExp(`elapsedMs=${row.elapsedMs}`, "u"), row.label);
            assert.equal(runs.length, 1, `${row.label} — no retry run is minted`);
            assert.equal(driver.spawnCalls.length, 0, `${row.label} — and the worktree is untouched`);
          }
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "126/00 task01 — a lineage that has genuinely spent its budget still halts, whatever the calendar says",
    async run() {
      const fx = await loopFixture({ cap: 3 });
      try {
        fx.workspace.config.work.loop = { scheduleToCloseMs: 100 };
        const item = await resolveItemExact(fx.ctx, "03/01");
        // Two attempts of 50 ms each, minted ELEVEN HOURS APART. The wall clock reads eleven
        // hours; the attempt series reads 100 ms, and 100 is the ceiling.
        const first = await startRun(item, { brief: { loop: capThree }, now: "2026-09-08T10:00:00.000Z" });
        await completeRun(item, { runId: first.runId, outcome: "failed", failureReason: "timeout", now: "2026-09-08T10:00:00.050Z" });
        // `retryRun` is what CHAINS them: the second record carries `retryOf`, which is the edge
        // the lineage walk follows. A second `startRun` would mint an unrelated run and the
        // summer would honestly answer for one attempt.
        const second = await retryRun(item, {
          runId: first.runId, maxAttempts: 3,
          brief: { loop: capThree }, now: "2026-09-08T21:00:00.000Z",
        });
        await completeRun(item, { runId: second.runId, outcome: "failed", failureReason: "timeout", now: "2026-09-08T21:00:00.050Z" });

        const lines = [];
        const driver = completingDriver(fx);
        const state = await runLoopBody(
          { scope: "03", resume: true, now: "2026-09-08T22:00:00.000Z" },
          { ...fx.ctx, agentSessionDriverOptions: driver.options, report: (line) => lines.push(line) },
        );
        assert.equal(state.act.stop, "deadline-exhausted");
        assert.equal(state.act.ref, "03/01");
        assert.match(lines.at(-1), /elapsedMs=100/u, "the summed attempts, not the eleven hours");
        assert.match(lines.at(-1), /ceilingMs=100/u);
        assert.match(lines.at(-1), /disposition=preserved-for-triage/u);
        assert.equal((await readRuns(item)).length, 2, "the failed records are still the only records on the item");
        assert.equal(driver.spawnCalls.length, 0);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/00 task01 — the in-process retry site charges the attempts it has driven, not the clock on the wall",
    async run() {
      const fx = await loopFixture({ cap: 3 });
      try {
        // The default 2-hour ceiling, and a lineage root minted eleven hours before `now`. Under
        // the wall-clock reading the FIRST check halted on those eleven hours; under this one both
        // checks admit on the prior attempt's 50 ms, and the loop runs to the store's own cap.
        fx.workspace.config.work.loop = { scheduleToCloseMs: 7_200_000, heartbeatMs: 900_000 };
        const item = await resolveItemExact(fx.ctx, "03/01");
        const prior = await startRun(item, { brief: { loop: capThree }, now: "2026-09-07T23:00:00.000Z" });
        await completeRun(item, { runId: prior.runId, outcome: "failed", failureReason: "timeout", now: "2026-09-07T23:00:00.050Z" });

        const scripted = [
          { outcome: "failed", failureReason: "timeout" },
          { outcome: "failed", failureReason: "timeout" },
          { outcome: "failed", failureReason: "timeout" },
        ];
        const waiting = [];
        const fake = createFakePtySpawn({ onWrite() { waiting.shift()?.(scripted.shift() ?? { outcome: "done" }); } });
        const lines = [];
        const state = await runLoopBody(
          { scope: "03", resume: true, now: "2026-09-08T10:00:00.000Z" },
          {
            ...fx.ctx,
            agentSessionDriverOptions: {
              ptySpawn: fake.spawn,
              which: createFakeWhich(["claude"]),
              watchTranscriptSessionId: async () => `session-${fake.spawnCalls.length}`,
              watchTranscriptCompletion: async () => await new Promise((resolve) => waiting.push(resolve)),
              commandDelayMs: 0,
            },
            report: (line) => lines.push(line),
          },
        );
        assert.notEqual(state.act.stop, "deadline-exhausted", "no deadline halt, where today the first check halts on the eleven hours");
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "run-store:attempts-exhausted");
        assert.match(lines.at(-1), /attempt=3/u);
        const lineage = (await readRuns(item)).filter((run) => run.runId === prior.runId || run.retryOf != null);
        assert.equal(lineage.length, 3, "three attempts exist on that lineage");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    // ── milestone 126 / story 02, task 01 — SUPERVISION IS A LAUNCH FLAG THAT --resume INHERITS.
    // The same explicit-wins / absent-inherits rule level and cap already take, driven through the
    // real shell so what lands on `brief.loop` is the minted record's own key.
    name: "126/02 task01 — --supervised is a launch flag and --resume inherits it",
    async run() {
      const rows = [
        ["absent", {}, false],
        ["absent", { supervised: true }, true],
        ["absent", { resume: true }, false],
        ["supervised", { resume: true }, true],
        ["unsupervised", { resume: true }, false],
        ["unsupervised", { resume: true, supervised: true }, true],
        ["supervised", { resume: true, supervised: true }, true],
        ["eight-key", { resume: true }, false],
      ];
      for (const [prior, flags, expected] of rows) {
        const fx = await loopFixture({ cap: 3 });
        try {
          const item = await resolveItemExact(fx.ctx, "03/01");
          if (prior !== "absent") {
            const envelope = { ...capThree, startedAt: "2026-09-08T10:00:00.000Z" };
            if (prior === "supervised") envelope.supervised = true;
            if (prior === "unsupervised") envelope.supervised = false;
            // "eight-key" seeds the shape every record already on disk carries: no key at all.
            const seeded = await startRun(item, { brief: { loop: envelope }, now: "2026-09-08T10:00:00.000Z" });
            await completeRun(item, { runId: seeded.runId, outcome: "failed", failureReason: "timeout", now: "2026-09-08T10:00:01.000Z" });
          }
          const driver = completingDriver(fx, {
            onCommand(command) {
              if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
              if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
            },
          });
          await runLoopBody(
            { scope: "03", now: "2026-09-08T11:00:00.000Z", ...flags },
            { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} },
          );
          const minted = (await readRuns(item)).filter((run) => run.createdAt === "2026-09-08T11:00:00.000Z");
          if (prior === "absent" && flags.resume === true) {
            // A resume with NOTHING to resume returns the `Nothing to resume` account and mints
            // nothing at all, so this row's claim has no subject — which is itself the correct
            // behaviour, asserted here rather than dressed up as an inheritance.
            assert.equal(minted.length, 0, "a resume with no prior declaration mints nothing");
            continue;
          }
          assert.ok(minted.length > 0, `${prior} + ${JSON.stringify(flags)}: the invocation minted a run`);
          for (const run of minted) {
            assert.equal(
              run.brief?.loop?.supervised,
              expected,
              `${prior} + ${JSON.stringify(flags)}: every minted run carries supervised=${expected}`,
            );
          }
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "126/02 task01 — the flag lands in three places and the probe is untouched",
    async run() {
      const schema = loopCommand.input;
      assert.equal(schema.additionalProperties, false, "the input schema is still closed");
      assert.deepEqual(schema.properties.supervised, { type: "boolean" });
      assert.deepEqual(schema.required, ["scope"]);
      assert.equal(loopCommand.cli.spec.flags.supervised.type, "boolean");
      assert.match(loopCommand.cli.spec.usage, /\[--supervised\]/u);
      assert.deepEqual(loopCommand.cli.argv(["03"], { supervised: true }), { scope: "03", supervised: true });
      assert.deepEqual(loopCommand.cli.argv(["03"], {}), { scope: "03" });

      // `--supervised --json` returns the probe, unchanged, and mints nothing.
      const fx = await loopFixture();
      try {
        const before = await readRuns(await resolveItemExact(fx.ctx, "03/01"));
        const probe = await loopCommand.run({ scope: "03", supervised: true }, fx.ctx);
        assert.deepEqual(Object.keys(probe.resumable), ["stranded", "lastDeclaration"]);
        assert.deepEqual(
          await readRuns(await resolveItemExact(fx.ctx, "03/01")),
          before,
          "the probe mints nothing",
        );
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/02 task01 — a resumed lastDeclaration is the six-key projection",
    async run() {
      const fx = await loopFixture({ cap: 3 });
      try {
        const item = await resolveItemExact(fx.ctx, "03/01");
        await startRun(item, {
          brief: { loop: { ...capThree, supervised: true, startedAt: "2026-09-08T10:00:00.000Z" } },
          now: "2026-09-08T10:00:00.000Z",
        });
        const probe = await loopCommand.run({ scope: "03", resume: true }, fx.ctx);
        assert.deepEqual(
          Object.keys(probe.resumable.lastDeclaration),
          ["loopRunId", "scope", "level", "cap", "startedAt", "supervised"],
        );
        assert.equal(probe.resumable.lastDeclaration.supervised, true);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "126/00 task01 — a stale running attempt is charged its liveness at the shell, not the eleven hours to `now`",
    async run() {
      const fx = await loopFixture({ cap: 3 });
      try {
        fx.workspace.config.work.loop = { scheduleToCloseMs: 7_200_000, heartbeatMs: 900_000 };
        const item = await resolveItemExact(fx.ctx, "03/01");
        // 124/00's record exactly as the lid left it: `running`, last beat 29.8 minutes in,
        // never reclaimed. The wall clock reads 43,046,728 ms against a 7,200,000 ms ceiling.
        const prior = await startRun(item, {
          brief: { loop: { ...declaration, startedAt: "2026-09-07T23:32:31.685Z" } },
          now: "2026-09-07T23:32:33.272Z",
        });
        await heartbeat(item, prior.runId, { now: "2026-09-08T00:02:19.028Z" });

        const driver = completingDriver(fx, {
          onCommand(command) {
            if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const state = await runLoopBody(
          { scope: "03", resume: true, now: "2026-09-08T11:30:00.000Z" },
          { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} },
        );

        const runs = await readRuns(item);
        const swept = runs.find((run) => run.runId === prior.runId);
        assert.equal(swept.state, "failed", "the sweep reclaims that run");
        assert.equal(swept.failureReason, "runtime_offline");
        assert.ok(swept.reclaimedAt);
        assert.notEqual(state.act.stop, "deadline-exhausted", "and the resume-lineage check admits");
        assert.ok(runs.some((run) => run.retryOf === prior.runId), "a retry is minted on that lineage");

        // The figure the shell charged, asserted at the engine over the very record on disk:
        // 1,785,756 ms of attempt, not the 43,046,728 the wall clock reads.
        assert.equal(
          lineageElapsedMs({ runs: [swept], now: "2026-09-08T11:30:00.000Z", stalenessMs: 900_000, isStale }),
          1_785_756,
        );
        assert.equal(
          Date.parse("2026-09-08T11:30:00.000Z") - Date.parse(swept.createdAt),
          43_046_728,
          "…which is what the prior reading would have charged",
        );
      } finally {
        await fx.cleanup();
      }
    },
  },
];
