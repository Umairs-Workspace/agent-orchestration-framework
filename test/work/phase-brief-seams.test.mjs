// Traceability wiring for milestone 70 / story 00 (phase-brief) — task 02.
//
//   tasks/02_passed-at-both-seams.feature  (@executable)
//
// Both of the driver's production callers — the local drive command (`src/commands/drive.mjs`)
// and the mesh worker execution handler (`src/mesh/worker-execution.mjs`) — compile the phase
// brief through the SHARED pure compiler (`src/phase-brief-read.mjs` -> `src/phase-brief.mjs`)
// and hand it to the driver BY VALUE on the `brief` bag's additive `context` key. The driver
// then types the command + the brief into the session's first input. One test object per
// @executable scenario; Scenario-Outline rows folded into one entry each.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { driveInteractiveClaudeSession } from "../../src/agent-session-driver.mjs";
import { continueDriverCommand, refineDriverCommand, verifyDriverCommand } from "../../src/commands/drive.mjs";
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";
import { withMeshWorkerExecFixture, markRepoPublished, seedNodeWorkspaceMembership, createStatusRecorder, scriptedPushExec } from "../support/mesh-worker-exec-fixture.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { createMeshWorkerExecutionHandler } from "../../src/mesh/worker-execution.mjs";

const NODE_ID = "worker-a";

// ── a full-doc drive fixture so the local seam has real STORY/tasks/SPEC/ARCHITECTURE ──
async function driveFixture() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-pb-drive-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const milestoneDir = path.join(workDir, "03_milestone_fixture");
  const storyDir = path.join(milestoneDir, "stories", "01_story_ready");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), `---
type: milestone
number: 3
slug: fixture
title: Fixture
status: in-progress
---
# Fixture

## Objective
The phase is handed its context instead of rediscovering it.
`, "utf8");
  await writeFile(path.join(milestoneDir, "ARCHITECTURE.md"), `# Architecture
## fitness functions
| id | invariant | enforced by |
|---|---|---|
| FF-7001 | one brief bag | a test |
`, "utf8");
  await writeFile(path.join(storyDir, "STORY.md"), `---
type: story
number: 1
slug: ready
title: Ready
parent: 3
status: in-progress
depends: [0]
---
# Ready

## User story
As the loop I want a compiled brief handed by value.

## Notes
The addressed record: ADR-009 §4 hands the compiler the user-story and notes blocks, never
the whole file, so this fixture is shaped like the stream rather than shaped to pass.
`, "utf8");
  await writeFile(path.join(storyDir, "tasks", "00_ready.feature"), `@executable
Feature: Ready
  Scenario: ready
    Given a fixture
    When it runs
    Then it passes
`, "utf8");
  const workspace = {
    projectRoot,
    workDir,
    configPath: path.join(projectRoot, ".aof", "aof.config.json"),
    config: { work: { dir: "wiki/work" } },
  };
  const item = { ref: "03/01", dir: storyDir, type: "story" };
  return { projectRoot, workspace, item, cleanup: () => rm(projectRoot, { recursive: true, force: true }) };
}

function scriptedDriver() {
  const fake = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
  return {
    fake,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => "sess-brief",
      commandDelayMs: 0,
    },
  };
}

// 70/06 — the directive reaches the PTY wrapped in bracketed paste, with the Enter that
// submits it as a separate write. These are TERMINAL protocol bytes (spelled from char
// codes, not imported — the driver's export set is frozen at seventeen by an enforced
// gate). `unpasted` reads a write back through the frame so the CONTENT assertions in
// this file keep asserting content rather than transport.
const ESC = String.fromCharCode(27);
const SUBMIT_KEY = String.fromCharCode(13);
const pasted = (text) => [`${ESC}[200~${text}${ESC}[201~`, SUBMIT_KEY];
const unpasted = (chunk) => chunk.replace(`${ESC}[200~`, "").replace(`${ESC}[201~`, "");

export const phaseBriefSeamsTests = [
  // ═══════════════ 02_passed-at-both-seams.feature ═══════════════
  // Scenario: the local drive path hands over a compiled brief
  {
    name: "70/00 task02 the local drive path hands over a compiled brief — the driver receives a compiled brief for that item, by value",
    run: async () => {
      const fx = await driveFixture();
      try {
        const driver = scriptedDriver();
        await continueDriverCommand.run({ ref: "03/01" }, { workspace: fx.workspace, agentSessionDriverOptions: driver.options });
        const written = driver.fake.ptys[0].writes[0];
        assert.ok(written.includes("Item: 03/01"), "the driver received a compiled brief for that item (it names the item)");
        assert.ok(written.includes("## TASK CONTRACTS"), "the brief carries the task contracts");
        assert.ok(written.includes("As the loop I want a compiled brief handed by value"), "the brief carries the story outcome, by value");
        assert.ok(written.includes("FF-7001"), "the brief carries the fitness register");
      } finally {
        await fx.cleanup();
      }
    },
  },
  // Scenario: the mesh worker path hands over a compiled brief
  {
    name: "70/00 task02 the mesh worker path hands over a compiled brief — the driver receives a compiled brief for that item, by value",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const recorder = createStatusRecorder();
      const which = createFakeWhich(["claude"]);
      const { spawn, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const handler = createMeshWorkerExecutionHandler({
        pushExec: scriptedPushExec(),
        loadWs: () => Promise.resolve(ws),
        nodeId: NODE_ID,
        sendAssignmentStatus: recorder.sendAssignmentStatus,
        sendEffectStep: recorder.sendEffectStep,
        now: () => "2026-07-18T09:00:00.000Z",
        globalWorkStoreOptions: { env: fx.env },
        ptySpawn: spawn,
        which,
      });
      await handler({
        kind: "directive", to: NODE_ID, assignmentId: "asg-brief", itemRef: fx.itemRef,
        workspaceId: fx.workspaceId, at: "2026-07-18T09:00:00.000Z", command: `/aof:continue ${fx.itemRef}`,
      });
      const written = ptys[0].writes[0];
      assert.ok(written.includes(`Item: ${fx.itemRef}`), "the driver received a compiled brief for that item, by value");
      assert.ok(written.includes("## TASK CONTRACTS"), "the mesh worker's compiled brief carries the task contracts");
      // The needle is a sentence ONLY the story section can supply. "Demo story" alone is
      // not: the fixture's contract set gained a `tasks/00_demo.feature` whose first line is
      // `Feature: Demo story` (70/05, so the fixture is shaped like the stream), which
      // satisfies that needle out of the TASKS section — proved differentially at review, a
      // compiler that never reaches the story section left this assertion green.
      assert.ok(written.includes("## STORY — outcome and benefit"), "the mesh worker's compiled brief carries the story section");
      assert.ok(written.includes("As a Demo story reader"), "the mesh worker's compiled brief carries the story record's own outcome, which no other section supplies");
    }, { milestoneNumber: "35", storySlug: "demo", storyNumber: "00" }),
  },
  // Scenario: the four existing brief keys keep their meaning
  {
    name: "70/00 task02 the four existing brief keys keep their meaning — itemRef, worktreeCwd, task and command are present and unchanged, and the compiled context sits beside them rather than replacing any",
    run: async () => {
      const which = createFakeWhich(["claude"]);
      const { spawn, spawnCalls, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const context = {
        itemRef: "70/00", phase: "continue", truncated: false, dropped: [], notice: null,
        chars: "BRIEF-BODY".length, ceiling: 8000, text: "BRIEF-BODY",
        sections: [{ id: "item", title: "ITEM", text: "Item: 70/00" }],
      };
      const brief = { itemRef: "70/00", worktreeCwd: "/wt", task: "continue", command: "/aof:continue 70/00", context };
      const result = await driveInteractiveClaudeSession(brief, { ptySpawn: spawn, which });
      assert.equal(spawnCalls[0].options.cwd, "/wt", "worktreeCwd still drives the PTY cwd — unchanged");
      assert.equal(result.outcome, "done");
      // 70/06 — the directive input is now delivered as a bracketed paste, so the
      // command leads the PASTED BODY rather than the raw write. The framing is
      // transport (it is what makes a multi-line brief arrive as one turn instead of
      // eight); the CONTENT assertion is unchanged, and is read here through the frame.
      assert.ok(unpasted(ptys[0].writes[0]).startsWith("/aof:continue 70/00"), "command still leads the directive input — unchanged");
      assert.ok(unpasted(ptys[0].writes[0]).includes("BRIEF-BODY"), "the compiled context sits BESIDE the four keys, not replacing any");
    },
  },
  // Scenario: a spawn without a compiled brief behaves exactly as before
  {
    name: "70/00 task02 a spawn without a compiled brief behaves exactly as before — the spawn proceeds and the launch is byte-identical to today's",
    run: async () => {
      const which = createFakeWhich(["claude"]);
      const { spawn, spawnCalls, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      await driveInteractiveClaudeSession(
        { itemRef: "70/00", worktreeCwd: "/wt", task: "continue", command: "/aof:continue 70/00" },
        { ptySpawn: spawn, which },
      );
      // "Byte-identical to today's" is a statement about what a caller with NO compiled
      // context gets relative to one WITH it: the bare command and nothing else. 70/06
      // changed the transport for both alike, so the invariant is read through the same
      // frame — the pasted body is exactly the command, with no brief appended.
      assert.deepEqual(ptys[0].writes, [pasted("/aof:continue 70/00")[0]], "a caller that supplies no compiled context gets exactly today's single-command write");
      assert.equal(spawnCalls.length, 1, "the spawn proceeds");
    },
  },
  // Scenario: the phase context reaches the model as input
  {
    name: "70/00 task02 the phase context reaches the model as input — the brief's content is present in the session's first input, and the session is not merely told which files to open",
    run: async () => {
      const which = createFakeWhich(["claude"]);
      const { spawn, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const text = "As the loop, the phase is handed its full context by value and must not open any file to rediscover it.";
      const context = {
        itemRef: "70/00", phase: "continue", truncated: false, dropped: [], notice: null,
        chars: text.length, ceiling: 8000, text,
        sections: [{ id: "story", title: "STORY", text: "the full context" }],
      };
      await driveInteractiveClaudeSession(
        { itemRef: "70/00", worktreeCwd: "/wt", task: "continue", command: "/aof:continue 70/00", context },
        { ptySpawn: spawn, which },
      );
      const first = ptys[0].writes[0];
      assert.ok(first.includes("the phase is handed its full context by value"), "the brief's content is present in the first input");
      assert.ok(!first.includes("/aof:continue 70/00\n\nSTORY.md") && !first.match(/open.*(STORY|SPEC|ARCHITECTURE)/i), "the session is not merely told which files to open — the content itself is present");
    },
  },
  // Scenario Outline: both seams, same contract (local drive + mesh worker)
  {
    name: "70/00 task02 outline both seams, same contract (2 rows: the local drive command; the mesh worker execution path) — a compiled brief is present and was compiled by the shared compiler rather than assembled at the seam",
    run: async () => {
      // local drive command seam
      const fx = await driveFixture();
      let driveWrite;
      try {
        const driver = scriptedDriver();
        await continueDriverCommand.run({ ref: "03/01" }, { workspace: fx.workspace, agentSessionDriverOptions: driver.options });
        driveWrite = driver.fake.ptys[0].writes[0];
      } finally {
        await fx.cleanup();
      }
      // mesh worker execution path seam
      let meshWrite;
      await withMeshWorkerExecFixture(async (fx) => {
        await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
        await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
        const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
        const recorder = createStatusRecorder();
        const { spawn, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
        const handler = createMeshWorkerExecutionHandler({
          pushExec: scriptedPushExec(), loadWs: () => Promise.resolve(ws), nodeId: NODE_ID,
          sendAssignmentStatus: recorder.sendAssignmentStatus, sendEffectStep: recorder.sendEffectStep,
          now: () => "2026-07-18T09:00:00.000Z", globalWorkStoreOptions: { env: fx.env }, ptySpawn: spawn, which: createFakeWhich(["claude"]),
        });
        await handler({ kind: "directive", to: NODE_ID, assignmentId: "asg-seam", itemRef: fx.itemRef, workspaceId: fx.workspaceId, at: "2026-07-18T09:00:00.000Z", command: `/aof:continue ${fx.itemRef}` });
        meshWrite = ptys[0].writes[0];
      }, { milestoneNumber: "35", storySlug: "demo", storyNumber: "00" });
      // both carried a compiled brief, and it has the shared compiler's canonical section
      // header shape (## <TITLE>) rather than a hand-assembled blob.
      assert.ok(driveWrite.includes("## TASK CONTRACTS"), "the local drive seam's brief carries the shared compiler's task-contracts section");
      assert.ok(meshWrite.includes("## TASK CONTRACTS"), "the mesh worker seam's brief carries the shared compiler's task-contracts section");
    },
  },
  // Scenario Outline: the brief a phase is handed matches its phase (refine/continue/verify)
  {
    name: "70/00 task02 outline the brief a phase is handed matches its phase (3 rows: refine, continue, verify) — the brief is compiled for that phase and carries the sections that phase needs rather than every section that exists",
    run: async () => {
      const fx = await driveFixture();
      try {
        // refine: the full picture
        let d = scriptedDriver();
        await refineDriverCommand.run({ ref: "03/01" }, { workspace: fx.workspace, agentSessionDriverOptions: d.options });
        const refineWrite = d.fake.ptys[0].writes[0];
        assert.ok(refineWrite.includes("## STORY") && refineWrite.includes("## MILESTONE OBJECTIVE") && refineWrite.includes("## STRUCTURAL CONSTRAINTS"), "a refine brief carries the full design picture");
        // continue: outcome + contracts + constraints (no objective/dependencies section)
        d = scriptedDriver();
        await continueDriverCommand.run({ ref: "03/01" }, { workspace: fx.workspace, agentSessionDriverOptions: d.options });
        const continueWrite = d.fake.ptys[0].writes[0];
        assert.ok(continueWrite.includes("## STORY") && continueWrite.includes("## TASK CONTRACTS"), "a continue brief carries outcome + contracts");
        assert.ok(!continueWrite.includes("## MILESTONE OBJECTIVE"), "a continue brief carries the sections that phase needs, not every section that exists (no objective)");
        // verify: contracts + constraints only
        d = scriptedDriver();
        await verifyDriverCommand.run({ ref: "03/01" }, { workspace: fx.workspace, agentSessionDriverOptions: d.options });
        const verifyWrite = d.fake.ptys[0].writes[0];
        assert.ok(verifyWrite.includes("## TASK CONTRACTS") && verifyWrite.includes("## STRUCTURAL CONSTRAINTS"), "a verify brief carries contracts + constraints");
        assert.ok(!verifyWrite.includes("## STORY") && !verifyWrite.includes("## MILESTONE OBJECTIVE"), "a verify brief is compiled for that phase and omits the sections it does not need");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
