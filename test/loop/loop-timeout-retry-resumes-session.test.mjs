import { defaultApplication as _aofApplication } from "aof/default-application";
// 2026-11-12 — A RETRY OF A TIMED-OUT CONTINUE RESUMES THE SESSION THE DEADLINE CUT. Measured on
// loop 07: two story builds were killed at their one-hour bound mid-work and each retry opened a
// cold session. Pins, through the real continue drive over a scripted PTY:
//   - a lent retry whose prior attempt failed `timeout`, with the prior session's transcript in the
//     tree, launches `--resume <prior session>` and types the phase command plus why it is back
//   - a prior that failed for any other reason, or whose transcript is gone, launches cold
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { defaultSessionDriver as _aofSessions } from "aof/session-services";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";

const continueDriverCommand = _aofApplication.getCommand("work:drive-continue");
const transitionRunStart = _aofApplication.execution.transitions.transitionRunStart;
const completeRun = _aofApplication.execution.runs.completeRun;
const recordSessionId = _aofApplication.execution.runs.recordSessionId;
const resolveItemExact = _aofApplication.work.commandTools.resolve.resolveItemExact;
const claudeProjectsDir = _aofSessions.workObserve.claudeProjectsDir;

const SUBMIT_KEY = String.fromCharCode(13);

async function fixture() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "aof-timeout-resume-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const storyDir = path.join(workDir, "03_milestone_fixture", "stories", "01_story_ready");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await writeFile(path.join(workDir, "03_milestone_fixture", "SPEC.md"), "---\ntype: milestone\nnumber: 3\nslug: fixture\ntitle: Fixture\nstatus: in-progress\ndepends: []\n---\n# Fixture\n");
  await writeFile(path.join(storyDir, "STORY.md"), "---\ntype: story\nnumber: 1\nslug: ready\ntitle: Ready\nparent: 3\nstatus: in-progress\ndepends: []\n---\n# Ready\n");
  await writeFile(path.join(storyDir, "tasks", "00_ready.feature"), "@executable\nFeature: Ready\n  Scenario: ready\n    Given a fixture\n    When it runs\n    Then it passes\n");
  const workspace = {
    projectRoot,
    workDir,
    configPath: path.join(projectRoot, ".aof", "aof.config.json"),
    config: { work: { dir: "wiki/work", autonomous: { maxAttempts: 3 } } },
  };
  return { projectRoot, workspace, cleanup: () => rm(projectRoot, { recursive: true, force: true }) };
}

function scriptedDriver() {
  const typed = [];
  const fake = createFakePtySpawn({
    onWrite: ({ chunk, rawChunk, emitExit }) => {
      if (rawChunk === SUBMIT_KEY) {
        emitExit(0);
        return;
      }
      typed.push(chunk.replace(/[\r\n]+$/u, ""));
    },
  });
  const options = {
    ptySpawn: fake.spawn,
    which: createFakeWhich(["claude"]),
    watchTranscriptSessionId: async () => "sess-retry",
    commandDelayMs: 0,
    submitDelayMs: 0,
    trustWorktree: async () => {},
  };
  return { ...fake, typed, options };
}

// A prior attempt that ran session `s-prior` and failed with `reason`, then the retry the loop
// mints on it — the lent run the drive receives.
async function timedOutLineage(fx, reason) {
  const item = await resolveItemExact({ workspace: fx.workspace }, "03/01");
  const { record: prior } = await transitionRunStart(item, { now: "2026-11-11T23:41:34.656Z" });
  await recordSessionId(item, { runId: prior.runId, sessionId: "s-prior", now: "2026-11-11T23:42:00.000Z" });
  await completeRun(item, { runId: prior.runId, outcome: "failed", failureReason: reason, now: "2026-11-12T00:41:35.000Z", settleSpend: false });
  const { record: retry } = await transitionRunStart(item, { mode: "retry", maxAttempts: 3, now: "2026-11-12T00:41:36.000Z" });
  assert.equal(retry.retryOf, prior.runId, "the retry names its prior attempt");
  return retry;
}

async function driveRetry({ reason, transcript }) {
  const fx = await fixture();
  try {
    const env = { ...process.env, CLAUDE_CONFIG_DIR: path.join(fx.projectRoot, "claude-config") };
    if (transcript) {
      const projectsDir = claudeProjectsDir({ cwd: fx.projectRoot, env });
      await mkdir(projectsDir, { recursive: true });
      await writeFile(path.join(projectsDir, "s-prior.jsonl"), `${JSON.stringify({ type: "assistant", message: { usage: { input_tokens: 1, output_tokens: 1 } } })}\n`);
    }
    const retry = await timedOutLineage(fx, reason);
    const driver = scriptedDriver();
    driver.options.env = env;
    await continueDriverCommand.run(
      { ref: "03/01", run: retry.runId },
      { workspace: fx.workspace, agentSessionDriverOptions: driver.options },
    );
    return { args: driver.spawnCalls[0].args, typed: driver.typed };
  } finally {
    await fx.cleanup();
  }
}

export const loopTimeoutRetryResumesSessionTests = [
  {
    name: "timeout-resume/01 a retry of a continue that failed `timeout` resumes the prior session and says why it is back",
    async run() {
      const { args, typed } = await driveRetry({ reason: "timeout", transcript: true });
      assert.deepEqual(args.slice(args.indexOf("--resume"), args.indexOf("--resume") + 2), ["--resume", "s-prior"]);
      assert.ok(typed.some((line) => line.includes("RESUMED AFTER THE ATTEMPT DEADLINE")), typed.join("\n---\n"));
    },
  },
  {
    name: "timeout-resume/02 a prior that failed for another reason, or whose transcript is gone, launches cold",
    async run() {
      // `agent_error` is not retryable at all, so no retry of it is ever minted to drive.
      for (const [reason, transcript] of [["runtime_offline", true], ["timeout", false]]) {
        const { args, typed } = await driveRetry({ reason, transcript });
        assert.equal(args.includes("--resume"), false, `${reason} transcript=${transcript}: no --resume`);
        assert.equal(typed.some((line) => line.includes("RESUMED AFTER THE ATTEMPT DEADLINE")), false, `${reason} transcript=${transcript}: a cold directive`);
      }
    },
  },
];
