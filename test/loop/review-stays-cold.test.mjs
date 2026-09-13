// Executable wiring for milestone 70 / story 04, task 01 (ADR-008).
import assert from "node:assert/strict";
import { continueDriverCommand, refineDriverCommand, resolvePhaseResumeTarget, verifyDriverCommand } from "../../src/commands/drive.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";
import { loopFixture } from "./loop-command-probe.test.mjs";

const BUILD = { runId: "build-run", sessionId: "build-session", node: "node-a" };

async function reviewLaunch(command = verifyDriverCommand, { withFixContext = true } = {}) {
  const fx = await loopFixture();
  fx.workspace.config.work.agents = {
    session: { models: { verify: "claude-review" }, effort: { verify: "high" } },
  };
  const typed = [];
  const fake = createFakePtySpawn({ onWrite: ({ chunk, emitExit }) => {
    typed.push(chunk.replace(/[\r\n]+$/u, ""));
    emitExit(0);
  } });
  await command.run(
    { ref: "03/01" },
    {
      workspace: fx.workspace,
      agentSessionDriverOptions: {
        ptySpawn: fake.spawn,
        which: createFakeWhich(["claude"]),
        watchTranscriptSessionId: async () => "review-session",
        resumeSessionAvailable: async () => true,
        commandDelayMs: 0,
        resumeSessionId: "caller-supplied-build-session",
      },
      ...(withFixContext ? {
        loopDrive: {
          fix: {
            buildRun: BUILD,
            resumeBuildRun: BUILD,
            findings: [{ problem: "review finding" }],
            changeUnderReview: "diff --git a/a b/a",
          },
        },
      } : {}),
    },
  );
  return { fx, fake, typed };
}

export const reviewStaysColdTests = [
  {
    name: "70/04 task01 a review phase resolves no resume target and starts a fresh session despite a resumable build",
    async run() {
      const target = await resolvePhaseResumeTarget({ phase: "review", buildRun: BUILD, currentNode: "node-a", isResumable: async () => true });
      assert.equal(target, null);
      const { fx, fake } = await reviewLaunch();
      try {
        assert.equal(fake.spawnCalls[0].args.includes("--resume"), false);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task01 a cold reviewer still receives the stable prefix, chosen model and effort, and compiled brief",
    async run() {
      const { fx, fake, typed } = await reviewLaunch();
      try {
        const args = fake.spawnCalls[0].args;
        assert.ok(args.includes("--exclude-dynamic-system-prompt-sections"));
        assert.deepEqual(args.slice(args.indexOf("--model"), args.indexOf("--model") + 2), ["--model", "claude-review"]);
        assert.deepEqual(args.slice(args.indexOf("--effort"), args.indexOf("--effort") + 2), ["--effort", "high"]);
        assert.match(typed[0], /## TASK CONTRACTS/u);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task01 rich build and fix history cannot send any prior session id into a review launch",
    async run() {
      const history = [BUILD, { runId: "fix-1", sessionId: "fix-session", node: "node-a" }];
      const target = await resolvePhaseResumeTarget({
        phase: "structural review",
        buildRun: history[0],
        priorRuns: history,
        currentNode: "node-a",
        isResumable: async () => true,
      });
      assert.equal(target, null);
    },
  },
  {
    name: "70/04 task01 caller-supplied resume and fix context are both ignored by the review phase launch",
    async run() {
      const { fx, fake } = await reviewLaunch();
      try {
        assert.equal(fake.spawnCalls[0].args.includes("caller-supplied-build-session"), false);
        assert.equal(fake.spawnCalls[0].args.includes("build-session"), false);
        assert.equal(fake.spawnCalls[0].args.includes("--resume"), false);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task01 outline production command paths resume only continue/fix; review, verify, and refine stay cold",
    async run() {
      const rows = [
        ["fix", continueDriverCommand, true],
        ["structural review", verifyDriverCommand, false],
        ["behavioural review", verifyDriverCommand, false],
        ["verify", verifyDriverCommand, false],
        ["refine", refineDriverCommand, false],
      ];
      for (const [phase, command, expectedWarm] of rows) {
        const { fx, fake } = await reviewLaunch(command);
        try {
          assert.equal(fake.spawnCalls[0].args.includes("--resume"), expectedWarm, phase);
          assert.equal(fake.spawnCalls[0].args.includes("build-session"), expectedWarm, phase);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
];
