import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const loopCommand = _aofApplication.getCommand("work:loop");
const runLoopBody = _aofApplication.loop.commandTools.loop.runLoopBody;
const resolveItemExact = _aofApplication.work.commandTools.resolve.resolveItemExact;
const readRuns = _aofApplication.execution.runs.readRuns;
import { buildLoopDeclaration, isWholeItemCascade, readLoopDeclaration } from "../../packages/work-loop/src/engine.mjs";
import { completingDriver, loopFixture, treeFiles, writeDeclarationRun } from "./loop-command-probe.test.mjs";

async function refusal(fn, code) {
  await assert.rejects(fn, (error) => error?.code === code);
}

export const loopCommandRefusalTests = [{
  name: "loop command refusals — unsupported scope, inverted range, computed-gated/unknown levels, and invalid cap are inert and coded",
  async run() {
    const fx = await loopFixture();
    try {
      const before = await treeFiles(fx.projectRoot);
      await refusal(() => loopCommand.run({ scope: "03/01" }, fx.ctx), "loop-scope-unsupported");
      await refusal(() => loopCommand.run({ scope: "03-02" }, fx.ctx), "loop-scope-unsupported");
      await refusal(() => loopCommand.run({ scope: "03", level: "L3" }, fx.ctx), "loop-level-gate");
      await refusal(() => loopCommand.run({ scope: "03", level: "L9" }, fx.ctx), "loop-level-unknown");
      await refusal(() => loopCommand.run({ scope: "03", cap: 0 }, fx.ctx), "loop-bound-unresolved");
      assert.deepEqual(await treeFiles(fx.projectRoot), before);
    } finally {
      await fx.cleanup();
    }
  },
}, {
  name: "loop command inert L1 — reports hypothetical acts without recording a drive or changing fixture bytes",
  async run() {
    const fx = await loopFixture();
    try {
      const driver = completingDriver(fx);
      const reports = [];
      const beforeFiles = await treeFiles(fx.projectRoot);
      const before = new Map(await Promise.all(beforeFiles.map(async (file) => [file, await readFile(`${fx.projectRoot}/${file}`)])));
      const state = await runLoopBody(
        { scope: "03", level: "L1" },
        { ...fx.ctx, agentSessionDriverOptions: driver.options, report: (line) => reports.push(line) },
      );
      assert.equal(driver.spawnCalls.length, 0);
      assert.deepEqual(Object.keys(state), ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven", "refine"]);
      assert.deepEqual(state.driven, []);
      assert.equal("reports" in state, false);
      assert.ok(reports.length >= 1);
      assert.ok(reports.includes("03/01 — drive continue"));
      assert.deepEqual(await treeFiles(fx.projectRoot), beforeFiles);
      for (const [file, bytes] of before) assert.deepEqual(await readFile(`${fx.projectRoot}/${file}`), bytes);
    } finally {
      await fx.cleanup();
    }
  },
}];

// ══════════════ 143/00 — the loop promotes a backlog ref (ADR-001) ══════════════
//
// Folded into this suite rather than a new file: `test/loop` sits at its directory-budget ceiling,
// and a backlog slug is the scope door's subject — the same door the refusals above pin.

const backlogSpec = (slug, depends = null) => `---
type: milestone
number:
slug: ${slug}
title: ${slug}
status: not-started
${depends == null ? "" : `depends: [${depends}]\n`}created: 2026-10-02
updated: 2026-10-02
schema: 1
aofVersion: 0.1.0
---
# ${slug}
`;

// The probe fixture's stream (milestone 03, story 03/01) plus a backlog milestone `widget-sync`
// with no stories, so its first drive is the milestone's break-down refine.
async function backlogFixture({ depends = null } = {}) {
  const fx = await loopFixture();
  const backlogDir = path.join(fx.workDir, "backlog", "milestone_widget-sync");
  await mkdir(backlogDir, { recursive: true });
  await writeFile(path.join(backlogDir, "SPEC.md"), backlogSpec("widget-sync", depends));
  if (depends != null) {
    const otherDir = path.join(fx.workDir, "backlog", `milestone_${depends}`);
    await mkdir(otherDir, { recursive: true });
    await writeFile(path.join(otherDir, "SPEC.md"), backlogSpec(depends));
  }
  return { ...fx, backlogDir, promotedDir: path.join(fx.workDir, "04_milestone_widget-sync") };
}

// Launch the loop body on `input.scope` with a driver that completes every session at once,
// collecting the narration and every directive typed.
async function launch(fx, input) {
  const commands = [];
  const reports = [];
  const driver = completingDriver(fx, { onCommand: (command) => commands.push(command) });
  const state = await runLoopBody(input, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: (line) => reports.push(line) });
  return { state, commands, reports };
}

async function declarationsOn(fx, ref) {
  const item = await resolveItemExact(fx.ctx, ref);
  return (await readRuns(item)).map((run) => run.brief?.loop).filter(Boolean);
}

export const loopCommandBacklogScopeTests = [{
  name: "143/00 task00 — a backlog milestone is promoted and the loop runs at the number it was given",
  async run() {
    const fx = await backlogFixture();
    try {
      const { commands, reports } = await launch(fx, { scope: "widget-sync" });
      assert.equal(existsSync(fx.promotedDir), true, "promoted to 04, appended");
      assert.equal(existsSync(fx.backlogDir), false, "the backlog folder moved");
      assert.match(commands[0], /^\/aof:refine 04(\s|$)/u, "the first drive is the minted number's refine");
      const declarations = await declarationsOn(fx, "04");
      assert.ok(declarations.length >= 1, "the drive's run carries the declaration");
      for (const declaration of declarations) {
        assert.equal(declaration.scope, "04");
        assert.equal(declaration.promotedFrom, "widget-sync");
      }
      const promoted = reports.indexOf("Promoted widget-sync → 04.");
      assert.ok(promoted >= 0, reports.join("\n"));
      const thinking = reports.findIndex((line) => line.startsWith("Thinking:"));
      assert.ok(thinking >= 0 && promoted < thinking, "the promotion line comes before the first drive's narration");
    } finally {
      await fx.cleanup();
    }
  },
}, {
  name: "143/00 task00 — the scope is resolved before the scope grammar runs: a number or a range promotes nothing",
  async run() {
    for (const scope of ["03", "03-03"]) {
      const fx = await backlogFixture();
      try {
        await launch(fx, { scope });
        assert.equal(existsSync(fx.backlogDir), true, `${scope}: nothing promoted`);
        const declarations = await declarationsOn(fx, "03/01");
        assert.ok(declarations.length >= 1, scope);
        for (const declaration of declarations) assert.equal(declaration.promotedFrom, null, scope);
      } finally {
        await fx.cleanup();
      }
    }
  },
}, {
  name: "143/00 task00 — an unresolved scope and a case-folded slug refuse loop-scope-unsupported, and nothing is written",
  async run() {
    const fx = await backlogFixture();
    try {
      const before = await treeFiles(fx.projectRoot);
      for (const scope of ["nonesuch", "WIDGET-SYNC"]) {
        await refusal(() => launch(fx, { scope }), "loop-scope-unsupported");
        await refusal(() => loopCommand.run({ scope, dryRun: true }, fx.ctx), "loop-scope-unsupported");
      }
      assert.deepEqual(await treeFiles(fx.projectRoot), before);
    } finally {
      await fx.cleanup();
    }
  },
}, {
  name: "143/00 task00 — a promote refusal is the loop's refusal, and nothing is minted",
  async run() {
    const fx = await backlogFixture({ depends: "other-idea" });
    try {
      const before = await treeFiles(fx.projectRoot);
      let refused = null;
      await assert.rejects(() => launch(fx, { scope: "widget-sync" }), (error) => {
        refused = error;
        return error?.code === "promote-depends-backlog";
      });
      assert.match(refused.message, /other-idea/u, "the promotion's own message");
      assert.equal(existsSync(fx.backlogDir), true);
      assert.deepEqual(await treeFiles(fx.projectRoot), before, "no run record, no move");
    } finally {
      await fx.cleanup();
    }
  },
}, {
  name: "143/00 task00 — a declaration built without promotedFrom, or written before 143, reads back usable with null",
  run() {
    // The mesh assignment directive and the trigger declaration hand the loop a numeric scope and
    // no slug, so the declaration their launch builds passes no `promotedFrom`.
    const fresh = buildLoopDeclaration({ loopRunId: "lr", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-10-02T00:00:00.000Z", id: "loop:autonomous-cascade" });
    assert.equal(fresh.promotedFrom, null);
    const { promotedFrom: _absent, ...pre143 } = fresh;
    for (const loop of [fresh, pre143]) {
      const read = readLoopDeclaration([{ runId: "r", createdAt: "2026-10-02T00:00:01.000Z", brief: { loop } }]);
      assert.notEqual(read, null, "usable");
      assert.equal(read.promotedFrom, null);
    }
  },
}, {
  name: "143/00 task00 — the usage and the operator guide name the backlog-slug scope form",
  async run() {
    assert.match(loopCommand.cli.spec.usage, /^aof work loop <driver\|NN-MM\|backlog-slug> /u);
    const guide = await readFile(new URL("../../docs/acd.md", import.meta.url), "utf8");
    assert.match(guide, /aof work loop <backlog-slug>` promotes/u);
    assert.match(guide, /a later `--resume` names that number/u);
  },
}, {
  name: "143/00 task01 — a dry run (and an L1 report) says it would promote, and writes nothing",
  async run() {
    const fx = await backlogFixture();
    try {
      const before = await treeFiles(fx.projectRoot);
      const probe = await loopCommand.run({ scope: "widget-sync", dryRun: true }, fx.ctx);
      assert.equal(probe.wouldPromote, "widget-sync");
      assert.match(loopCommand.cli.render(probe), /Nothing was written/u);
      const l1 = await launch(fx, { scope: "widget-sync", level: "L1" });
      assert.equal(l1.state.wouldPromote, "widget-sync");
      assert.equal(l1.reports.length, 1, "the L1 launch prints its answer: the launch face never renders a return");
      assert.match(l1.reports[0], /^widget-sync — a backlog item: .*Nothing was written.$/u);
      assert.deepEqual(await treeFiles(fx.projectRoot), before);
    } finally {
      await fx.cleanup();
    }
  },
}, {
  name: "143/00 task01 — --stop, --hand-off and --resume refuse a backlog slug and name the way to start it",
  async run() {
    const fx = await backlogFixture();
    try {
      const before = await treeFiles(fx.projectRoot);
      const doors = [
        () => loopCommand.run({ scope: "widget-sync", stop: true }, fx.ctx),
        () => loopCommand.run({ scope: "widget-sync", handOff: true }, fx.ctx),
        () => loopCommand.run({ scope: "widget-sync", resume: true }, fx.ctx),
        () => launch(fx, { scope: "widget-sync", resume: true }),
      ];
      for (const door of doors) {
        await assert.rejects(door, (error) => error?.code === "loop-backlog-ref-not-running"
          && error.message.includes("aof work loop widget-sync"));
      }
      assert.equal(existsSync(fx.backlogDir), true);
      assert.deepEqual(await treeFiles(fx.projectRoot), before);
    } finally {
      await fx.cleanup();
    }
  },
}, {
  name: "143/00 task01 — after the promotion, the resume names the number and promotes nothing again",
  async run() {
    const fx = await backlogFixture();
    try {
      // A cap of 1 halts the first launch after one refine drive, so the resume (at a raised cap) drives again.
      await launch(fx, { scope: "widget-sync", cap: 1 });
      const probe = await loopCommand.run({ scope: "04", resume: true }, fx.ctx);
      assert.equal(probe.resumable.lastDeclaration.promotedFrom, "widget-sync");
      const before = await declarationsOn(fx, "04");
      await launch(fx, { scope: "04", resume: true, cap: 3 });
      const after = await declarationsOn(fx, "04");
      assert.ok(after.length > before.length, `the resume drove (${before.length} → ${after.length} declared runs)`);
      for (const declaration of after.slice(before.length)) assert.equal(declaration.promotedFrom, "widget-sync");
      const promoted = (await readdir(fx.workDir)).filter((name) => name.endsWith("_milestone_widget-sync"));
      assert.deepEqual(promoted, ["04_milestone_widget-sync"]);
    } finally {
      await fx.cleanup();
    }
  },
}];

// ══════════════ 143/01 — the refine scope's one flag (ADR-002 §2, §3) ══════════════
//
// Folded here for the reason the backlog cases are: `test/loop` is at its budget ceiling, and the
// flag is the scope door's own vocabulary guard, beside the refusals above.

export const loopCommandRefineScopeTests = [
  ...[
    [undefined, undefined, "per-story"],
    ["whole-item", undefined, "whole-item"],
    ["whole-item", "per-story", "per-story"],
    [undefined, "whole-item", "whole-item"],
  ].map(([configured, flag, resolved]) => ({
    name: `143/01 task00 work.loop.refine ${configured ?? "unset"}, --refine ${flag ?? "absent"} → the probe's refine is ${resolved}`,
    async run() {
      const fx = await loopFixture();
      try {
        if (configured !== undefined) fx.workspace.config.work.loop = { refine: configured };
        const probe = await loopCommand.run({ scope: "03", dryRun: true, ...(flag === undefined ? {} : { refine: flag }) }, fx.ctx);
        assert.equal(probe.refine, resolved);
        assert.equal(Object.keys(probe).at(-1), "refine", "appended last");
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "143/01 task00 --refine all refuses loop-refine-unknown, naming both members, before any read",
    async run() {
      const fx = await loopFixture();
      try {
        const before = await treeFiles(fx.projectRoot);
        let reads = 0;
        const ctx = { ...fx.ctx, invokeRegistered: async () => { reads += 1; throw new Error("no read may happen"); } };
        for (const door of [() => loopCommand.run({ scope: "03", dryRun: true, refine: "all" }, ctx), () => runLoopBody({ scope: "03", refine: "all" }, ctx)]) {
          await assert.rejects(door, (error) => error?.code === "loop-refine-unknown" && error.message.includes("per-story") && error.message.includes("whole-item"));
        }
        assert.equal(reads, 0, "refused before any registered read");
        assert.deepEqual(await treeFiles(fx.projectRoot), before);
      } finally {
        await fx.cleanup();
      }
    },
  },
  ...[
    ["whole-item", undefined, "whole-item"],
    ["whole-item", "per-story", "per-story"],
    [undefined, undefined, "per-story"],
    [undefined, "whole-item", "whole-item"],
  ].map(([recorded, flag, resolved]) => ({
    name: `143/01 task00 a declaration with refine ${recorded ?? "absent (pre-143)"}, resumed ${flag === undefined ? "with --resume alone" : `with --refine ${flag}`} → ${resolved}`,
    async run() {
      const fx = await loopFixture();
      try {
        const declaration = { loopRunId: "L1", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-10-02T11:00:00.000Z", id: "loop:autonomous-cascade", supervised: false, ...(recorded === undefined ? {} : { refine: recorded }) };
        const { item } = await writeDeclarationRun(fx, { declaration, state: "done", at: "2026-10-02T11:00:00.000Z" });
        // The probe answers the mode the resumed walk would declare.
        const probe = await loopCommand.run({ scope: "03", resume: true, ...(flag === undefined ? {} : { refine: flag }) }, fx.ctx);
        assert.equal(probe.refine, resolved);
        // …and the resumed walk declares it on the runs it mints.
        const before = (await readRuns(item)).length;
        await launch(fx, { scope: "03", resume: true, ...(flag === undefined ? {} : { refine: flag }) });
        const minted = (await readRuns(item)).slice(before).map((run) => run.brief?.loop).filter(Boolean);
        assert.ok(minted.length >= 1, "the resume drove");
        for (const loop of minted) assert.equal(loop.refine, resolved);
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "143/01 task00 a declaration built without refine reads back usable with null",
    run() {
      const fresh = buildLoopDeclaration({ loopRunId: "lr", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-10-02T00:00:00.000Z", id: "loop:autonomous-cascade" });
      assert.equal(fresh.refine, null);
      const read = readLoopDeclaration([{ runId: "r", createdAt: "2026-10-02T00:00:01.000Z", brief: { loop: fresh } }]);
      assert.notEqual(read, null);
      assert.equal(read.refine, null);
    },
  },
  {
    name: "143/01 task00 the usage and the operator guide name the flag",
    async run() {
      assert.match(loopCommand.cli.spec.usage, /\[--refine per-story\|whole-item\]/u);
      assert.deepEqual(loopCommand.cli.argv(["03"], { refine: "whole-item" }), { scope: "03", refine: "whole-item" });
      const guide = await readFile(new URL("../../docs/acd.md", import.meta.url), "utf8");
      assert.match(guide, /`work\.loop\.refine`/u);
      assert.match(guide, /`--refine per-story\|whole-item`/u);
    },
  },
];

// ══════════════ 143/01 review — the wire from a whole-item decision to the drive ══════════════
//
// The engine decision and the drive's composition are pinned apart elsewhere; these walk the loop
// so deleting the lend at either seam turns a case red.
loopCommandRefineScopeTests.push(
  ...[
    ["whole-item", "/aof:refine 04 --solo --autonomous"],
    ["per-story", "/aof:refine 04 --solo"],
  ].map(([refine, command]) => ({
    name: `143/01 review — an in-process walk under ${refine} composes the break-down drive as ${command}`,
    async run() {
      const fx = await backlogFixture();
      try {
        const { commands } = await launch(fx, { scope: "widget-sync", refine, cap: 1 });
        assert.equal(commands[0], command);
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "143/01 review — a walk that drives as a child lends autonomous to the break-down drive only",
    async run() {
      for (const [refine, lent] of [["whole-item", true], ["per-story", false]]) {
        const fx = await backlogFixture();
        try {
          const calls = [];
          const spawnPhaseDrive = async (args) => {
            calls.push(args);
            return { outcome: "document", document: { outcome: "done", sessionId: `s-${calls.length}`, settlementContext: {} } };
          };
          await runLoopBody({ scope: "widget-sync", refine, cap: 1 }, { ...fx.ctx, spawnPhaseDrive, report: () => {} });
          assert.ok(calls.length >= 1, `${refine}: the walk drove as a child`);
          assert.equal(calls[0].phase, "refine");
          assert.equal(calls[0].ref, "04");
          assert.equal(calls[0].autonomous === true, lent, `${refine}: autonomous lent ${lent}`);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "143/01 review — the decision and a re-entered drive ask one predicate, and the re-entry passes it",
    async run() {
      assert.equal(isWholeItemCascade({ refine: "whole-item", phase: "refine", type: "milestone" }), true);
      for (const facts of [
        { refine: "per-story", phase: "refine", type: "milestone" },
        { refine: "whole-item", phase: "refine", type: "story" },
        { refine: "whole-item", phase: "verify", type: "milestone" },
        { refine: null, phase: "refine", type: "milestone" },
        {},
      ]) assert.equal(isWholeItemCascade(facts), false, JSON.stringify(facts));
      const cycle = await readFile(new URL("../../packages/work-loop/src/cycle.mjs", import.meta.url), "utf8");
      const reentry = cycle.slice(cycle.indexOf("async function reenterPrimaryAsks"));
      assert.match(reentry, /isWholeItemCascade\(\{ refine: declaration\?\.refine, phase, type: item\.type \}\)/u, "the re-entry asks the predicate of the run's own declaration");
      assert.match(reentry, /drivePhase\(\{[^}]*\bautonomous\b[^}]*\}, ctx\)/u, "…and hands it to every re-drive");
    },
  },
);
