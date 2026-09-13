// arch/70 FF-7007 (ADR-008) — THE REVIEWER IS NEVER RESUMED.
// Drive the production commands: a helper that merely returns null can stay green
// while a caller still forwards a supplied build session into the real launch.
import assert from "node:assert/strict";
import {
  continueDriverCommand,
  refineDriverCommand,
  verifyDriverCommand,
} from "../../../src/commands/drive.mjs";
import { createFakePtySpawn, createFakeWhich } from "../../support/mesh-worker-terminal-fixture.mjs";
import { loopFixture } from "../../loop/loop-command-probe.test.mjs";

const BUILD = { runId: "build-run", sessionId: "build-session", node: null };

async function productionLaunch(command, { fix = true } = {}) {
  const fx = await loopFixture();
  const fake = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
  await command.run({ ref: "03/01" }, {
    workspace: fx.workspace,
    agentSessionDriverOptions: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => "fresh-session",
      resumeSessionAvailable: async () => true,
      resumeSessionId: "raw-caller-session",
      commandDelayMs: 0,
    },
    ...(fix ? {
      loopDrive: {
        fix: {
          buildRun: BUILD,
          resumeBuildRun: BUILD,
          findings: [{ problem: "planted finding" }],
          changeUnderReview: "diff --git a/a b/a",
        },
      },
    } : {}),
  });
  return { fx, fake };
}

export const archTests = [
  {
    name: "arch/70 FF-7007: production refine and verify launches reject both raw resume and rich loop-fix context",
    async run() {
      for (const command of [refineDriverCommand, verifyDriverCommand]) {
        const { fx, fake } = await productionLaunch(command);
        try {
          const args = fake.spawnCalls[0].args;
          assert.equal(args.includes("--resume"), false, command.id);
          assert.equal(args.includes("build-session"), false, command.id);
          assert.equal(args.includes("raw-caller-session"), false, command.id);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "arch/70 FF-7007: the production continue command is cold by default and warm only on its intended loop-fix path",
    async run() {
      const cold = await productionLaunch(continueDriverCommand, { fix: false });
      try {
        assert.equal(cold.fake.spawnCalls[0].args.includes("--resume"), false, "ordinary continue is cold despite a raw caller option");
      } finally {
        await cold.fx.cleanup();
      }
      const warm = await productionLaunch(continueDriverCommand, { fix: true });
      try {
        const args = warm.fake.spawnCalls[0].args;
        const resumeAt = args.indexOf("--resume");
        assert.equal(args[resumeAt], "--resume");
        assert.equal(args[resumeAt + 1], "build-session");
      } finally {
        await warm.fx.cleanup();
      }
    },
  },
];
