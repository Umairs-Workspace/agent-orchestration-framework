// Executable wiring for milestone 70 / story 04, task 00. The real loop, drive
// command, interactive launch resolver, run transitions, and run store are used;
// only the PTY/session availability edge is injected; ordinary change scoping uses git.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { admitResumeBuildRun, runLoopBody } from "../../src/commands/loop.mjs";
import { resolvePhaseResumeTarget } from "../../src/commands/drive.mjs";
import { readRuns } from "../../src/run-store.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { claudeProjectsDir } from "../../src/work/observe.mjs";
import { reviewBlockerClaim } from "../../src/work/loop.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";
import { loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";

const INVALID = `Feature: Invalid
  Scenario: missing lane
    Given a fixture
`;
const VALID = `@executable
Feature: Repaired
  Scenario: repaired
    Given a fixture
    When it runs
    Then it passes
`;
const execFileAsync = promisify(execFile);

function fixDriver(fx, {
  sessions = ["build-session", "review-session", "milestone-session"],
  resumable = true,
  failFirstResume = false,
  failResumeGenerically = false,
  keepInvalid = false,
  interruptContinueCount = null,
  repairOnFix = true,
} = {}) {
  const typed = [];
  let watch = 0;
  let failedResume = false;
  let availabilityChecks = 0;
  let activeFreshSessionId = null;
  const env = { ...process.env, CLAUDE_CONFIG_DIR: fx.projectRoot };
  const projectsDir = claudeProjectsDir({ cwd: fx.projectRoot, env });
  const usageLine = (sessionId, inputTokens) => `${JSON.stringify({
    type: "assistant",
    sessionId,
    message: {
      model: "claude-test",
      effort: "high",
      usage: { input_tokens: inputTokens, output_tokens: 1, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 },
      content: [{ type: "text", text: "done" }],
    },
  })}\n`;
  const fake = createFakePtySpawn({
    onWrite({ chunk, emitExit }) {
      const input = chunk.replace(/[\r\n]+$/u, "");
      typed.push(input);
      const directive = input.split("\n\n")[0];
      if (directive === "/aof:continue 03/01") {
        const continueCount = typed.filter((value) => value.startsWith(directive)).length;
        if (continueCount === 1) writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), `${INVALID}# build delta\n`);
        if (continueCount === 2 && !keepInvalid && repairOnFix) writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), VALID);
        if (continueCount >= 2 && keepInvalid) writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), `${INVALID}# fix delta ${continueCount}\n`);
      }
      if (directive === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
      if (directive === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
      const resumed = fake.spawnCalls.at(-1)?.args.includes("--resume") === true;
      const args = fake.spawnCalls.at(-1)?.args ?? [];
      const sessionId = resumed ? args[args.indexOf("--resume") + 1] : activeFreshSessionId;
      if (sessionId) appendFileSync(path.join(projectsDir, `${sessionId}.jsonl`), usageLine(sessionId, resumed ? 7 : 100));
      if (failFirstResume && resumed && !failedResume) {
        failedResume = true;
      } else if (failResumeGenerically && resumed && !failedResume) {
        failedResume = true;
        emitExit(1);
      } else {
        emitExit(0);
      }
      if (directive === "/aof:continue 03/01") {
        const continueCount = typed.filter((value) => value.startsWith(directive)).length;
        if (continueCount === interruptContinueCount) process.emit("SIGINT");
      }
    },
  });
  return {
    fake,
    typed,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      env,
      resumeSessionAvailable: async () => {
        availabilityChecks += 1;
        return failFirstResume ? availabilityChecks === 1 : resumable;
      },
      watchTranscriptSessionId: () => {
        const index = watch++;
        const sessionId = index < sessions.length ? sessions[index] : `session-${watch}`;
        activeFreshSessionId = sessionId;
        if (sessionId != null) {
          writeFileSync(path.join(projectsDir, `${sessionId}.jsonl`), usageLine(sessionId, 2));
        }
        return sessionId;
      },
      ...(failFirstResume ? {
        watchTranscriptCompletion: async () => {
          const resumed = fake.spawnCalls.at(-1)?.args.includes("--resume") === true;
          return resumed && !failedResume ? { outcome: "failed", failureReason: "runtime_offline" } : await new Promise(() => {});
        },
      } : {}),
      commandDelayMs: 0,
    },
  };
}

async function runFix({
  sessions,
  resumable = true,
  failFirstResume = false,
  failResumeGenerically = false,
  interruptAfterFindings = false,
  interruptAfterFindingCount = 1,
  keepInvalid = false,
  interruptContinueCount = null,
  preexistingDirty = false,
  cap,
  repairOnFix = true,
  reviewRounds,
  reviewClaims,
} = {}) {
  const fx = await loopFixture({
    ...(cap == null ? {} : { cap }),
    ...(reviewRounds == null ? {} : { reviewRounds }),
  });
  writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), INVALID);
  if (preexistingDirty) writeFileSync(path.join(fx.projectRoot, "operator-notes.txt"), "committed baseline\n");
  await execFileAsync("git", ["init", "--quiet"], { cwd: fx.projectRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: fx.projectRoot, windowsHide: true });
  await execFileAsync("git", ["-c", "user.name=AOF Test", "-c", "user.email=aof@example.invalid", "commit", "--quiet", "-m", "baseline"], { cwd: fx.projectRoot, windowsHide: true });
  if (preexistingDirty) {
    writeFileSync(path.join(fx.projectRoot, "operator-notes.txt"), "operator staged content\n");
    await execFileAsync("git", ["add", "operator-notes.txt"], { cwd: fx.projectRoot, windowsHide: true });
    appendFileSync(path.join(fx.projectRoot, "operator-notes.txt"), "operator unstaged content\n");
  }
  await mkdir(claudeProjectsDir({
    cwd: fx.projectRoot,
    env: { ...process.env, CLAUDE_CONFIG_DIR: fx.projectRoot },
  }), { recursive: true });
  const driver = fixDriver(fx, { sessions, resumable, failFirstResume, failResumeGenerically, keepInvalid, interruptContinueCount, repairOnFix });
  let interrupted = false;
  let findingReads = 0;
  const reports = [];
  const runCtx = {
    ...fx.ctx,
    agentSessionDriverOptions: driver.options,
    ...(interruptAfterFindings ? {
      readChangeUnderReview: async (cwd, baseline) => {
        const { stdout } = await execFileAsync("git", ["diff", "--no-ext-diff", baseline, "--"], { cwd, windowsHide: true, encoding: "utf8" });
        findingReads += 1;
        if (!interrupted && findingReads === interruptAfterFindingCount) {
          interrupted = true;
          process.emit("SIGINT");
        }
        return stdout.trim();
      },
    } : {}),
    report: (line) => { reports.push(line); },
  };
  const state = await runLoopBody(
    { scope: "03", ...(cap == null ? {} : { cap }), ...(reviewClaims == null ? {} : { reviewClaims }) },
    runCtx,
  );
  return { fx, driver, state, runCtx, reports };
}

export const warmFixLoopTests = [
  {
    name: "70/04 task00 a fix resumes the build session that produced the code and carries the review findings",
    async run() {
      const { fx, driver, state } = await runFix();
      try {
        assert.equal(state.state, "done", "the fix proceeds through verify");
        const fixSpawn = driver.fake.spawnCalls[1];
        assert.deepEqual(fixSpawn.args.slice(fixSpawn.args.indexOf("--resume"), fixSpawn.args.indexOf("--resume") + 2), ["--resume", "build-session"]);
        assert.match(driver.typed[1], /## REVIEW FINDINGS/u);
        assert.match(driver.typed[1], /missing-(?:when|then)|missing/u, "the producer's finding is carried as input");
        assert.doesNotMatch(driver.typed[1], /locked-contract-violation/u, "ordinary validator prose is not inferred to be a blocker claim");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/00 amended F-6900 production re-review uses the declared cap, not the engine cycle cap",
    async run() {
      const { fx, driver, state, reports } = await runFix({ repairOnFix: false, cap: 5, reviewRounds: 1 });
      try {
        assert.equal(state.state, "halted");
        assert.equal(state.cap, 5, "the engine cycle/attempt cap remains independently resolved");
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "review:rounds>=cap");
        assert.equal(driver.typed.length, 2, "the first findings-bearing gate re-drives once; the next unclaimed gate halts");
        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2]);
        assert.match(reports.at(-1), /round=1; reviewCap=1/u);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/00 amended F-6900 a configured review cap changes the production path without changing engine cycles",
    async run() {
      const { fx, driver, state, reports } = await runFix({ repairOnFix: false, cap: 5, reviewRounds: 2 });
      try {
        assert.equal(state.cap, 5);
        assert.equal(state.act.producer, "review:rounds>=cap");
        assert.equal(driver.typed.length, 3, "the configured cap admits two findings-driven re-drives");
        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2, 3]);
        assert.match(reports.at(-1), /round=2; reviewCap=2/u);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task00 a resumed fix receives findings and the change under review, not the tree context already held by the session",
    async run() {
      const { fx, driver } = await runFix();
      try {
        assert.match(driver.typed[1], /## CHANGE UNDER REVIEW\ndiff --git/u);
        assert.doesNotMatch(driver.typed[1], /## TASK CONTRACTS|## STRUCTURAL CONSTRAINTS/u, "the resumed input does not repeat the compiled tree brief");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 fix change context excludes staged and unstaged content present before the build while retaining the build delta",
    async run() {
      const { fx, driver } = await runFix({ preexistingDirty: true });
      try {
        const fixInput = driver.typed[1];
        assert.match(fixInput, /## CHANGE UNDER REVIEW[\s\S]*# build delta/u, "the production git snapshot path carries the build-attributable delta");
        assert.doesNotMatch(fixInput, /operator-notes|operator staged content|operator unstaged content/u, "ambient staged and unstaged changes are excluded");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task00 an unavailable resume target degrades to a fresh session with a compiled brief and the fix proceeds",
    async run() {
      const { fx, driver, state } = await runFix({ resumable: false, sessions: ["pruned-session", "cold-fix-session", "review-session", "milestone-session"] });
      try {
        assert.equal(driver.fake.spawnCalls[1].args.includes("--resume"), false);
        assert.match(driver.typed[1], /## TASK CONTRACTS/u, "the cold fix is handed a compiled brief");
        assert.equal(state.state, "done");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task00 a build with no recorded session id spawns cold with a brief and invents no id from a path",
    async run() {
      const { fx, driver, state } = await runFix({ sessions: [null, "cold-fix-session", "review-session", "milestone-session"] });
      try {
        assert.equal(driver.fake.spawnCalls[1].args.includes("--resume"), false);
        assert.match(driver.typed[1], /## TASK CONTRACTS/u);
        assert.equal(state.state, "done");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task00 the resume target is the specific build run being fixed, never the item's merely-latest session",
    async run() {
      const target = await resolvePhaseResumeTarget({
        phase: "fix",
        buildRun: { runId: "build-own", sessionId: "build-own-session", node: null },
        latestRun: { runId: "later-review", sessionId: "merely-latest-session" },
        isResumable: async () => true,
      });
      assert.equal(target, "build-own-session");
    },
  },
  {
    name: "70/04 task00 outline resolving a fix target — warm when resumable; cold when pruned, absent, or recorded on another node",
    async run() {
      const rows = [
        [{ sessionId: "warm-session", node: "node-a" }, "node-a", true, "warm-session"],
        [{ sessionId: "pruned-session", node: "node-a" }, "node-a", false, null],
        [{ sessionId: null, node: "node-a" }, "node-a", true, null],
        [{ sessionId: "remote-session", node: "node-b" }, "node-a", true, null],
      ];
      for (const [buildRun, currentNode, available, expected] of rows) {
        const admitted = admitResumeBuildRun(buildRun, currentNode);
        const actual = await resolvePhaseResumeTarget({
          phase: "fix",
          buildRun: admitted,
          isResumable: async () => available,
        });
        assert.equal(actual, expected);
      }
    },
  },
  {
    name: "70/04 task00 outline resumed bookkeeping is unchanged — fix run mint, session attribution, spend settle, attempt and retry lineage",
    async run() {
      const { fx } = await runFix();
      try {
        const item = await resolveItemExact(fx.ctx, "03/01");
        const continues = (await readRuns(item)).filter((run) => run.brief?.loop?.phase === "continue");
        assert.equal(continues.length, 2, "a distinct run record is minted for the fix");
        const fix = continues[1];
        assert.equal(fix.sessionId, "build-session", "the resumed session id is recorded against the fix run");
        assert.ok(fix.spend, "spend is ingested at settle");
        assert.equal(fix.spend.tokens.input, 7, "only usage appended by the warm fix is charged; the build's 102 tokens are not counted again");
        assert.equal(fix.attempt, 1, "attempt bookkeeping is unchanged");
        assert.equal(fix.retryOf, null, "retry lineage is unchanged");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task00 a positively unavailable target falls back cold on a visible retry record, never as a hidden second process in one attempt",
    async run() {
      const { fx, driver, state } = await runFix({
        failFirstResume: true,
        sessions: ["build-session", "cold-fix-session", "review-session", "milestone-session"],
      });
      try {
        assert.equal(driver.fake.spawnCalls[1].args.includes("--resume"), true, "the availability probe initially admitted resume");
        assert.equal(driver.fake.spawnCalls[2].args.includes("--resume"), false, "the retry's fresh availability decision is positively cold");
        assert.match(driver.typed.find((input) => /## REVIEW FINDINGS/u.test(input)) ?? "", /## TASK CONTRACTS/u);
        assert.equal(state.state, "done");
        const item = await resolveItemExact(fx.ctx, "03/01");
        const fixRuns = (await readRuns(item)).filter((run) => run.brief?.loop?.phase === "continue").slice(1);
        assert.deepEqual(fixRuns.map((run) => run.attempt), [1, 2], "the failed warm launch and cold fallback are visible to attempt bookkeeping");
        assert.equal(fixRuns[1].retryOf, fixRuns[0].runId, "the cold fallback stays on the retry lineage");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task00 a generic failed resumed process is not disguised as a second cold process",
    async run() {
      const { fx, driver, state } = await runFix({ failResumeGenerically: true });
      try {
        assert.equal(state.act.stop, "run-not-retryable");
        assert.equal(driver.fake.spawnCalls.length, 2, "one build and one resumed fix were launched; there is no hidden cold third process");
        assert.equal(driver.fake.spawnCalls[1].args.includes("--resume"), true);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 task00 interruption after review preserves pending fix identity and findings through existing run lineage",
    async run() {
      const { fx, driver, state, runCtx } = await runFix({ interruptAfterFindings: true });
      try {
        assert.equal(state.act.stop, "operator-interrupt", JSON.stringify(state));
        const resumed = await runLoopBody({ scope: "03", resume: true }, runCtx);
        assert.equal(resumed.state, "done");
        const fixArgs = driver.fake.spawnCalls[1].args;
        assert.deepEqual(fixArgs.slice(fixArgs.indexOf("--resume"), fixArgs.indexOf("--resume") + 2), ["--resume", "build-session"]);
        assert.match(driver.typed.find((input) => /## REVIEW FINDINGS/u.test(input)) ?? "", /missing/u, "the authoritative findings were reconstructed");
        assert.doesNotMatch(driver.typed.find((input) => /## REVIEW FINDINGS/u.test(input)) ?? "", /## CHANGE UNDER REVIEW/u, "unreconstructable git scope is omitted rather than guessed from an assumed parent");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/00 an admitted blocker survives interruption in run lineage and ordinary resume retries without re-supply",
    async run() {
      const claim = reviewBlockerClaim(
        "production-defect",
        "the production path remains invalid",
        { producer: "review" },
      );
      const { fx, driver, state, runCtx } = await runFix({
        cap: 4,
        keepInvalid: true,
        interruptAfterFindings: true,
        interruptAfterFindingCount: 2,
        reviewRounds: 1,
        reviewClaims: [{ ref: "03/01", completedRounds: 1, claim }],
      });
      try {
        assert.equal(state.act.stop, "operator-interrupt");
        const item = await resolveItemExact(fx.ctx, "03/01");
        const beforeResume = (await readRuns(item)).filter((run) => run.brief?.loop?.phase === "continue");
        assert.deepEqual(beforeResume.at(-1).brief.review.blockerClaim, claim, "the completed gate-producing run persisted the explicit claim");

        const resumed = await runLoopBody({ scope: "03", resume: true }, runCtx);
        assert.equal(resumed.act.producer, "review:rounds>=cap", "the next unclaimed gate halts only after the admitted retry ran");
        assert.equal(
          driver.typed.filter((input) => input.startsWith("/aof:continue 03/01")).length,
          3,
          "ordinary resume launched the already-admitted third continue without reviewClaims",
        );
        const afterResume = (await readRuns(item)).filter((run) => run.brief?.loop?.phase === "continue");
        assert.deepEqual(afterResume.at(-1).brief.review.admittedBlockerClaim, claim, "the pending-fix run carries the admission in its lineage");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "70/04 cap two survives repeated interruption and resume, so no third fix drive can succeed",
    async run() {
      const { fx, driver, state, runCtx } = await runFix({
        cap: 2,
        keepInvalid: true,
        interruptAfterFindings: true,
        interruptContinueCount: 2,
      });
      try {
        assert.equal(state.act.stop, "operator-interrupt");
        const firstResume = await runLoopBody({ scope: "03", resume: true }, runCtx);
        assert.equal(firstResume.act.stop, "operator-interrupt", "the successful cycle-two fix drive was interrupted before settlement");
        assert.equal(driver.typed.filter((input) => input.startsWith("/aof:continue 03/01")).length, 2, "the build and one fix drove successfully");

        const secondResume = await runLoopBody({ scope: "03", resume: true, now: "2099-01-01T00:00:00.000Z" }, runCtx);
        assert.equal(secondResume.act.stop, "cap-exhausted");
        assert.equal(driver.typed.filter((input) => input.startsWith("/aof:continue 03/01")).length, 2, "resume did not reset the lane and launch a third continue/fix");
        const item = await resolveItemExact(fx.ctx, "03/01");
        const cycles = (await readRuns(item))
          .filter((run) => run.brief?.loop?.phase === "continue")
          .map((run) => run.brief.loop.cycle);
        assert.deepEqual(cycles, [1, 2], "the persisted declarations remain the cap's reconstruction source");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
