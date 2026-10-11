import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const loopCommand = _aofApplication.getCommand("work:loop");
const runLoopBody = _aofApplication.loop.commandTools.loop.runLoopBody;
const resolveItemExact = _aofApplication.work.commandTools.resolve.resolveItemExact;
const readRuns = _aofApplication.execution.runs.readRuns;
import { buildLoopDeclaration, isWholeItemCascade, readLoopDeclaration, resolveLoopResume, sessionLendFor } from "../../packages/work-loop/src/engine.mjs";
import { resolveSessionTable } from "@aof/execution/session-model";
import { DECLARATION_L1, completingDriver, loopFixture, treeFiles, writeDeclarationRun } from "./loop-command-probe.test.mjs";

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
      assert.deepEqual(Object.keys(state), ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven", "refine", "sessions"]);
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
      const thinking = reports.findIndex((line) => line.startsWith("Sessions:"));
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
    assert.match(loopCommand.cli.spec.usage, /^aof work loop <driver\|NN-MM\|backlog-slug\|backlog-path> /u);
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
}, {
  name: "loop-scope/backlog-path — a path to a backlog item's folder (or its record doc) is the item, so the loop promotes it",
  async run() {
    const fx = await backlogFixture();
    try {
      // Windows-typed and relative to the shell, as an operator types it; plus the absolute record doc.
      const typed = path.relative(process.cwd(), fx.backlogDir).replaceAll("/", "\\");
      const probe = await loopCommand.run({ scope: path.join(fx.backlogDir, "SPEC.md"), dryRun: true }, fx.ctx);
      assert.equal(probe.wouldPromote, "widget-sync");
      const { commands } = await launch(fx, { scope: typed });
      assert.equal(existsSync(fx.promotedDir), true, "promoted to 04");
      assert.match(commands[0], /^\/aof:refine 04(\s|$)/u);
      for (const declaration of await declarationsOn(fx, "04")) assert.equal(declaration.promotedFrom, "widget-sync");
    } finally {
      await fx.cleanup();
    }
  },
}, {
  name: "loop-scope/backlog-path — a path naming no item's folder (the backlog root, a missing folder) refuses, and nothing is written",
  async run() {
    const fx = await backlogFixture();
    try {
      const before = await treeFiles(fx.projectRoot);
      for (const scope of [path.dirname(fx.backlogDir), path.join(path.dirname(fx.backlogDir), "milestone_nonesuch")]) {
        await refusal(() => launch(fx, { scope }), "loop-scope-unsupported");
        await refusal(() => loopCommand.run({ scope, dryRun: true }, fx.ctx), "loop-scope-unsupported");
      }
      assert.deepEqual(await treeFiles(fx.projectRoot), before);
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
        assert.equal(Object.keys(probe)[10], "refine", "the eleventh key, after driven");
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

// ══════════════ 143/03 — the loop runs each phase on the chosen model (ADR-004) ══════════════
//
// Folded here with 143/00's and 143/01's cases: `test/loop` is at its budget ceiling, and the session
// flags are the scope door's vocabulary guards too.

const row = (model, modelSource, effort, effortSource) => ({ model, modelSource, effort, effortSource });
const withSession = (fx, session) => { fx.workspace.config.work.agents = { session }; return fx; };
const firstDeclaration = async (fx, ref = "03/01") => (await declarationsOn(fx, ref))[0];

export const loopCommandSessionTests = [
  // ── task 00 — the loop resolves and records every phase ──
  {
    name: "143/03 task00 the operator's example resolves per phase and is recorded",
    async run() {
      const fx = withSession(await loopFixture(), { effort: { refine: "high", continue: "high", verify: "high" } });
      try {
        await launch(fx, { scope: "03", model: ["sonnet:high", "refine=opus:xhigh", "verify=fable:high"], cap: 1 });
        const declaration = await firstDeclaration(fx);
        assert.deepEqual(declaration.sessions, {
          refine: row("opus", "--model", "xhigh", "--model"),
          continue: row("sonnet", "--model", "high", "--model"),
          verify: row("fable", "--model", "high", "--model"),
        });
        assert.equal(declaration.thinking, null);
      } finally {
        await fx.cleanup();
      }
    },
  },
  ...[
    [undefined, undefined, {}, row(null, null, "high", "default")],
    ["opus", "medium", {}, row("opus", "config", "medium", "config")],
    ["opus", "medium", { model: ["continue=sonnet"] }, row("sonnet", "--model", "medium", "config")],
    ["opus", "medium", { thinking: ["continue=max"] }, row("opus", "config", "max", "--thinking")],
    ["opus", undefined, { thinking: ["xhigh"] }, row("opus", "config", "xhigh", "--thinking")],
    [undefined, undefined, { model: ["refine=opus"] }, row(null, null, "high", "default")],
  ].map(([cfgModel, cfgEffort, flags, expected]) => ({
    name: `143/03 task00 continue — config ${cfgModel ?? "unset"}/${cfgEffort ?? "unset"}, ${JSON.stringify(flags)} → ${JSON.stringify(expected)}`,
    async run() {
      const fx = withSession(await loopFixture(), {
        ...(cfgModel === undefined ? {} : { models: { continue: cfgModel } }),
        ...(cfgEffort === undefined ? {} : { effort: { continue: cfgEffort } }),
      });
      try {
        const probe = await loopCommand.run({ scope: "03", dryRun: true, ...flags }, fx.ctx);
        assert.deepEqual(probe.sessions.continue, expected);
        assert.equal(Object.keys(probe).at(-1), "sessions", "the probe carries the table, last");
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "143/03 task00 an unphased --thinking is still recorded as 141's thinking",
    async run() {
      const fx = await loopFixture();
      try {
        await launch(fx, { scope: "03", thinking: ["extra-high"], cap: 1 });
        const declaration = await firstDeclaration(fx);
        assert.equal(declaration.thinking, "xhigh");
        for (const phase of ["refine", "continue", "verify"]) assert.deepEqual(declaration.sessions[phase], row(null, null, "xhigh", "--thinking"), phase);
        // An older caller's single string is still one value.
        const probe = await loopCommand.run({ scope: "03", dryRun: true, thinking: "extra-high" }, fx.ctx);
        assert.equal(probe.sessions.verify.effort, "xhigh");
      } finally {
        await fx.cleanup();
      }
    },
  },
  ...[
    [{ model: ["build=opus"] }, "session-choice-unknown-phase"],
    [{ model: ["refine=:turbo"] }, "thinking-unknown-level"],
    [{ thinking: ["turbo"] }, "thinking-unknown-level"],
    [{ model: ["verify="] }, "session-choice-empty"],
    [{ model: ["verify=fable:high"], thinking: ["verify=max"] }, "session-choice-conflict"],
  ].map(([flags, code]) => ({
    name: `143/03 task00 ${JSON.stringify(flags)} refuses ${code} at the door — nothing written, nothing spawned`,
    async run() {
      const fx = await loopFixture();
      try {
        const before = await treeFiles(fx.projectRoot);
        const driver = completingDriver(fx);
        let reads = 0;
        const ctx = { ...fx.ctx, agentSessionDriverOptions: driver.options, invokeRegistered: async () => { reads += 1; throw new Error("no read"); } };
        await refusal(() => runLoopBody({ scope: "03", ...flags }, ctx), code);
        await refusal(() => loopCommand.run({ scope: "03", dryRun: true, ...flags }, ctx), code);
        assert.equal(reads, 0, "refused before any registered read");
        assert.equal(driver.spawnCalls.length, 0);
        assert.deepEqual(await treeFiles(fx.projectRoot), before);
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "143/03 task00 the loop says what each phase runs on before its first drive",
    async run() {
      const fx = withSession(await loopFixture(), { effort: { continue: "high" } });
      try {
        const { reports } = await launch(fx, { scope: "03", model: ["refine=opus:xhigh", "verify=fable"], thinking: ["verify=high"], cap: 1 });
        const line = "Sessions: refine opus (--model) at xhigh (--model); continue default model at high (config); verify fable (--model) at high (--thinking).";
        assert.ok(reports.includes(line), reports.join("\n"));
        assert.equal(reports.some((each) => each.startsWith("Thinking:")), false, "the Sessions line replaces 141's Thinking line");
        const driving = reports.findIndex((each) => each.startsWith("Driving "));
        assert.ok(driving === -1 || reports.indexOf(line) < driving, "before the first drive");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "143/03 task00 a declaration built without sessions reads back usable with null",
    run() {
      const fresh = buildLoopDeclaration({ loopRunId: "lr", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-10-02T00:00:00.000Z", id: "loop:autonomous-cascade" });
      assert.equal(fresh.sessions, null);
      const read = readLoopDeclaration([{ runId: "r", createdAt: "2026-10-02T00:00:01.000Z", brief: { loop: fresh } }]);
      assert.notEqual(read, null);
      assert.equal(read.sessions, null);
    },
  },
  {
    name: "143/03 task00 the usage, the schema text and the operator guide name the flag",
    async run() {
      assert.ok(loopCommand.cli.spec.usage.includes("[--model [PHASE=][MODEL][:EFFORT]]..."));
      assert.ok(loopCommand.cli.spec.usage.includes("[--thinking [PHASE=]LEVEL]..."));
      assert.equal(loopCommand.cli.spec.flags.model.repeatable, true);
      assert.equal(loopCommand.cli.spec.flags.thinking.repeatable, true);
      // The session effort map's description, found by its own opening words rather than a schema path.
      const descriptions = [];
      JSON.parse(await readFile(new URL("../../schemas/aof.schema.json", import.meta.url), "utf8"), (key, value) => { if (key === "description" && typeof value === "string") descriptions.push(value); return value; });
      const effortText = descriptions.find((text) => text.startsWith("Phase -> effort level"));
      assert.ok(effortText, "the session effort description is found");
      assert.match(effortText, /--model/u);
      assert.match(effortText, /--thinking/u);
      const guide = await readFile(new URL("../../docs/acd.md", import.meta.url), "utf8");
      assert.match(guide.replace(/\s+/gu, " "), /aof work loop <ref> --model sonnet:high --model refine=opus:xhigh --model verify=fable:high/u);
    },
  },

  // ── task 01 — each drive runs on its own phase's choice (the walk's seams) ──
  ...[
    ["in-process", false],
    ["as the primary's child drive", true],
  ].map(([seam, child]) => ({
    name: `143/03 task01 --model continue=sonnet:low reaches a continue drive ${seam}`,
    async run() {
      const fx = await loopFixture();
      try {
        const calls = [];
        const driver = completingDriver(fx);
        const ctx = { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} };
        if (child) ctx.spawnPhaseDrive = async (args) => { calls.push(args); return { outcome: "document", document: { outcome: "done", sessionId: `s-${calls.length}`, settlementContext: {} } }; };
        await runLoopBody({ scope: "03", model: ["continue=sonnet:low"], cap: 1 }, ctx);
        if (child) {
          assert.ok(calls.length >= 1);
          assert.equal(calls[0].phase, "continue");
          assert.equal(calls[0].model, "sonnet");
          assert.equal(calls[0].thinking, "low");
        } else {
          const args = driver.spawnCalls[0]?.args ?? [];
          assert.deepEqual(args.slice(args.indexOf("--model"), args.indexOf("--model") + 2), ["--model", "sonnet"], args.join(" "));
          assert.deepEqual(args.slice(args.indexOf("--effort"), args.indexOf("--effort") + 2), ["--effort", "low"], args.join(" "));
        }
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "143/03 task01 with no session flag the loop lends nothing, as in 141",
    async run() {
      const fx = withSession(await loopFixture(), { models: { refine: "opus" } });
      try {
        const calls = [];
        const ctx = { ...fx.ctx, report: () => {}, spawnPhaseDrive: async (args) => { calls.push(args); return { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } }; } };
        await runLoopBody({ scope: "03", cap: 1 }, ctx);
        assert.ok(calls.length >= 1);
        for (const call of calls) {
          assert.equal("model" in call, false, `${call.phase}: no model lent`);
          assert.equal("thinking" in call, false, `${call.phase}: no thinking lent`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "143/03 task01 a wave lane's child is lent the continue phase's flag parts from its own declaration",
    async run() {
      const wave = await readFile(new URL("../../packages/work-loop/src/wave.mjs", import.meta.url), "utf8");
      assert.match(wave, /\.\.\.sessionLendFor\(declaration, "continue"\)/u, "the lane spawn spreads the continue lend");
      const declaration = buildLoopDeclaration({ loopRunId: "lr", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-10-02T00:00:00.000Z", id: "loop:autonomous-cascade", sessions: { continue: row("sonnet", "--model", "low", "--model") } });
      assert.deepEqual(sessionLendFor(declaration, "continue"), { model: "sonnet", thinking: "low" });
    },
  },

  // ── task 02 — a resume reruns on the recorded choices ──
  ...[
    ["high", {}, row("opus", "--model", "xhigh", "--model"), row(null, null, "high", "config")],
    ["low", {}, row("opus", "--model", "xhigh", "--model"), row(null, null, "low", "config")],
    ["high", { model: ["refine=sonnet"] }, row("sonnet", "--model", "high", "default"), row(null, null, "high", "config")],
    ["high", { thinking: ["max"] }, row(null, null, "max", "--thinking"), row(null, null, "max", "--thinking")],
  ].map(([cfgEffort, flags, refine, cont]) => ({
    name: `143/03 task02 recorded refine opus:xhigh (--model), continue effort now ${cfgEffort}, resumed with ${JSON.stringify(flags)}`,
    async run() {
      const fx = withSession(await loopFixture(), { effort: { continue: cfgEffort } });
      try {
        const declaration = { ...DECLARATION_L1, sessions: { refine: row("opus", "--model", "xhigh", "--model"), continue: row(null, null, "high", "config"), verify: row(null, null, "high", "default") } };
        const { item } = await writeDeclarationRun(fx, { declaration, state: "done", at: "2026-10-02T11:00:00.000Z" });
        const before = (await readRuns(item)).length;
        await launch(fx, { scope: "03", resume: true, ...flags });
        const minted = (await readRuns(item)).slice(before).map((run) => run.brief?.loop).filter(Boolean);
        assert.ok(minted.length >= 1, "the resume minted a run");
        assert.deepEqual(minted[0].sessions.refine, refine);
        assert.deepEqual(minted[0].sessions.continue, cont);
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "143/03 task02 a resumed refine drive is lent the recorded model and effort",
    run() {
      const recorded = { ...DECLARATION_L1, sessions: { refine: row("opus", "--model", "xhigh", "--model"), continue: row(null, null, "high", "config"), verify: row(null, null, "high", "default") } };
      const resumed = resolveLoopResume({ scope: "03", declaration: recorded });
      assert.deepEqual(resumed.sessionChoices, { refine: { model: "opus", modelFlag: "--model", effort: "xhigh", effortFlag: "--model" } });
      const table = resolveSessionTable({}, resumed.sessionChoices);
      const declaration = buildLoopDeclaration({ ...DECLARATION_L1, sessions: table });
      assert.deepEqual(sessionLendFor(declaration, "refine"), { model: "opus", thinking: "xhigh" });
      assert.deepEqual(sessionLendFor(declaration, "continue"), {}, "a config part is never lent");
    },
  },
  ...[
    ["xhigh", {}, row(null, null, "xhigh", "--thinking")],
    [null, {}, row(null, null, "high", "default")],
    ["xhigh", { thinking: ["low"] }, row(null, null, "low", "--thinking")],
  ].map(([thinking, flags, expected]) => ({
    name: `143/03 task02 a pre-143 declaration with thinking ${thinking ?? "null"}, resumed with ${JSON.stringify(flags)} → every phase at ${expected.effort} (${expected.effortSource})`,
    async run() {
      const fx = await loopFixture();
      try {
        const { item } = await writeDeclarationRun(fx, { declaration: { ...DECLARATION_L1, thinking }, state: "done", at: "2026-10-02T11:00:00.000Z" });
        const before = (await readRuns(item)).length;
        await launch(fx, { scope: "03", resume: true, ...flags });
        const minted = (await readRuns(item)).slice(before).map((run) => run.brief?.loop).filter(Boolean);
        assert.ok(minted.length >= 1);
        for (const phase of ["refine", "continue", "verify"]) assert.deepEqual(minted[0].sessions[phase], expected, phase);
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "143/03 task02 a supervisor relaunch (--resume, no session flag) keeps the operator's verify model",
    run() {
      const launched = resolveSessionTable({}, { verify: { model: "fable", modelFlag: "--model", effort: "high", effortFlag: "--model" } });
      const halted = buildLoopDeclaration({ ...DECLARATION_L1, supervised: true, sessions: launched });
      const resumed = resolveLoopResume({ scope: "03", declaration: readLoopDeclaration([{ runId: "r", createdAt: "2026-10-02T00:00:01.000Z", brief: { loop: halted } }]) });
      const relaunched = buildLoopDeclaration({ ...DECLARATION_L1, supervised: true, sessions: resolveSessionTable({}, resumed.sessionChoices) });
      assert.deepEqual(sessionLendFor(relaunched, "verify"), { model: "fable", thinking: "high" }, "the verify drive launches with --model fable --effort high");
    },
  },
];
