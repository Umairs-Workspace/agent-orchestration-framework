// FF-6909 / ADR-007 amendment — a needs-input park is a capacity fact, not
// live-session posture. It is emitted from the post-spawn settle, accepted by the
// durable reactor as the sole non-terminal edge, and cleared before resume spawn.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blockOrStatementAfter, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function functionSlice(source, signature, nextSignature = null) {
  const start = source.indexOf(signature);
  if (start < 0) return "";
  const end = nextSignature == null ? source.length : source.indexOf(nextSignature, start + signature.length);
  return source.slice(start, end < 0 ? source.length : end);
}

function needsInputBranch(source) {
  const match = /if\s*\(\s*outcome\.outcome\s*===\s*["']needs-input["']\s*\)/u.exec(source);
  if (match == null) return null;
  const condition = matchedParenSpan(source, match.index);
  return condition == null ? null : blockOrStatementAfter(source, condition.close + 1)?.body ?? null;
}

function durableParkPublicationCount(source, callee) {
  let count = 0;
  const calls = new RegExp(`\\bawait\\s+${callee}\\s*\\(`, "gu");
  for (const match of source.matchAll(calls)) {
    const args = matchedParenSpan(source, match.index);
    if (args != null && /["']running["']/u.test(args.body) && /code\s*:\s*["']needs-input["']/u.test(args.body)) count += 1;
  }
  return count;
}

export function parkPublicationProblems({ workerSource, effectSource, resumeCommandSource, resumeOrchestrationSource }) {
  const worker = stripComments(workerSource);
  const effects = stripComments(effectSource);
  const resumeCommand = stripComments(resumeCommandSource);
  const resumeOrchestration = stripComments(resumeOrchestrationSource);
  const problems = [];

  if (/sendAssignmentStatus\?\.\([^;]*code\s*:\s*["']needs-input["']/su.test(worker)) {
    problems.push("a live/best-effort assignment-status path publishes the capacity-releasing needs-input code");
  }

  const firstRun = functionSlice(worker, "export function createMeshWorkerExecutionHandler", "export async function settleStrandedRunRecords");
  const firstSpawn = firstRun.indexOf("const outcome = await spawnRuntime(");
  const firstPark = firstRun.indexOf("if (outcome.outcome === \"needs-input\")");
  const firstParkBranch = needsInputBranch(firstRun);
  const freshPathPublications = durableParkPublicationCount(firstRun, "reportSettled");
  if (firstSpawn < 0 || firstPark < firstSpawn || firstParkBranch == null) {
    problems.push("the fresh-run park is not published from the post-spawn needs-input settle path");
  } else {
    const publications = durableParkPublicationCount(firstParkBranch, "reportSettled");
    if (publications !== 1) problems.push(`the fresh-run post-exit park is published ${publications} times, not exactly once`);
  }
  if (freshPathPublications !== 1) problems.push(`the containing fresh-run settle path publishes a durable needs-input park ${freshPathPublications} times, not exactly once`);

  const resume = functionSlice(worker, "export function createMeshWorkerTerminalResumeHandler", "export function createMeshRecoveryPushHandler");
  if (!/settleOutcome[\s\S]*outcome\.outcome\s*===\s*["']needs-input["'][\s\S]*await\s+report\(["']running["'][\s\S]*code:\s*["']needs-input["']/u.test(resumeOrchestration)) {
    problems.push("the resumed park is not published from the post-spawn settle path");
  }
  if (!/outcome\.outcome\s*===\s*["']failed["']\s*&&\s*outcome\.processStarted\s*===\s*false[\s\S]*await\s+refuse/u.test(resumeOrchestration)) {
    problems.push("a pre-spawn resume failure does not restore the park");
  }
  const resumeSettle = functionSlice(resumeOrchestration, "async function settleOutcome", "async function handleFault");
  const resumedParkBranch = needsInputBranch(resumeSettle);
  if (resumedParkBranch != null) {
    const publications = durableParkPublicationCount(resumedParkBranch, "report");
    if (publications !== 1) problems.push(`the resumed post-exit park is published ${publications} times, not exactly once`);
  }
  const resumeSettlePublications = durableParkPublicationCount(resumeSettle, "report");
  if (resumeSettlePublications !== 1) problems.push(`the containing resumed settleOutcome function publishes a durable needs-input park ${resumeSettlePublications} times, not exactly once`);

  const settle = functionSlice(effects, "async function settleAssignment", "// stream.reindexed");
  if (!/const park\s*=\s*state\s*===\s*["']running["']\s*&&\s*code\s*===\s*["']needs-input["']/u.test(settle)) {
    problems.push("the durable reactor does not name running+needs-input as its park edge");
  }
  if (!/state\s*!==\s*["']done["']\s*&&\s*state\s*!==\s*["']failed["']\s*&&\s*!park/u.test(settle)) {
    problems.push("the durable reactor does not refuse every other non-terminal state");
  }
  if (!/transitionAssignmentState\([\s\S]*\{[^}]*code[^}]*\}/u.test(settle)) {
    problems.push("the durable reactor drops the park code before applying the assignment row");
  }

  const reserve = resumeCommand.indexOf("reserveParkedAssignmentResume(");
  const push = resumeCommand.indexOf("await push.push(");
  if (reserve < 0 || push < 0 || reserve > push) problems.push("the admission authority does not clear the park before dispatching resume");
  return problems;
}

async function productionSources() {
  const read = (rel) => readFile(path.join(root, rel), "utf8");
  const [workerSource, effectSource, resumeCommandSource, resumeOrchestrationSource] = await Promise.all([
    read("src/mesh/worker-execution.mjs"),
    read("src/effects/table.mjs"),
    read("src/commands/mesh/terminal-resume.mjs"),
    read("src/mesh/park-resume.mjs"),
  ]);
  return { workerSource, effectSource, resumeCommandSource, resumeOrchestrationSource };
}

export const archTests = [
  {
    name: "arch/69 FF-6909: park publication is post-exit and singular, its reactor applies only the park edge, and resume clears before spawn",
    run: async () => {
      const problems = parkPublicationProblems(await productionSources());
      assert.deepEqual(problems, [], `park-publication violations:\n  ${problems.join("\n  ")}`);
    },
  },
  {
    name: "arch/69 FF-6909 self-check: live or duplicate publication, broad non-terminal admission and clear-after-spawn each trip the detector",
    run: async () => {
      const sources = await productionSources();
      const livePublish = parkPublicationProblems({
        ...sources,
        workerSource: sources.workerSource.replace(
          "// A pending question is only a detector signal here.",
          "sendAssignmentStatus?.(assignmentId, 'running', { code: 'needs-input' });",
        ),
      });
      assert.ok(livePublish.some((problem) => problem.includes("live/best-effort")));

      const duplicateFresh = parkPublicationProblems({
        ...sources,
        workerSource: sources.workerSource.replace(
          '        await reportSettled(assignmentId, "running", { runId: runRecord.runId, sessionId, code: "needs-input" });',
          '        await reportSettled(assignmentId, "running", { runId: runRecord.runId, sessionId, code: "needs-input" });\n        await reportSettled(assignmentId, "running", { runId: runRecord.runId, sessionId, code: "needs-input" });',
        ),
      });
      assert.ok(duplicateFresh.some((problem) => problem.includes("fresh-run post-exit park") && problem.includes("2 times, not exactly once")));

      const duplicateResume = parkPublicationProblems({
        ...sources,
        resumeOrchestrationSource: sources.resumeOrchestrationSource.replace(
          '      await report("running", { runId: runRecord.runId, sessionId: forkedSessionId, code: "needs-input" });',
          '      await report("running", { runId: runRecord.runId, sessionId: forkedSessionId, code: "needs-input" });\n      await report("running", { runId: runRecord.runId, sessionId: forkedSessionId, code: "needs-input" });',
        ),
      });
      assert.ok(duplicateResume.some((problem) => problem.includes("resumed post-exit park") && problem.includes("2 times, not exactly once")));

      // The count belongs to the WHOLE containing settle path, not merely the selected branch.
      // A second durable publication immediately before the branch used to sit outside the count.
      const beforeFreshBranch = parkPublicationProblems({
        ...sources,
        workerSource: sources.workerSource.replace(
          '      if (outcome.outcome === "needs-input") {',
          '      await reportSettled(assignmentId, "running", { runId: runRecord.runId, sessionId, code: "needs-input" });\n      if (outcome.outcome === "needs-input") {',
        ),
      });
      assert.ok(beforeFreshBranch.some((problem) => problem.includes("containing fresh-run settle path") && problem.includes("2 times, not exactly once")));

      // Same hole, at the other edge: a publication immediately after the resumed branch is
      // outside that branch but still inside settleOutcome and must invalidate exactly-once.
      const afterResumeBranch = parkPublicationProblems({
        ...sources,
        resumeOrchestrationSource: sources.resumeOrchestrationSource.replace(
          /    \}\r?\n    const settledOutcome = outcome\.outcome === "done" \? "done" : "failed";/u,
          '    }\n    await report("running", { runId: runRecord.runId, sessionId: forkedSessionId, code: "needs-input" });\n    const settledOutcome = outcome.outcome === "done" ? "done" : "failed";',
        ),
      });
      assert.ok(afterResumeBranch.some((problem) => problem.includes("containing resumed settleOutcome function") && problem.includes("2 times, not exactly once")));

      const broadReactor = parkPublicationProblems({
        ...sources,
        effectSource: sources.effectSource.replace("&& !park", "&& false"),
      });
      assert.ok(broadReactor.some((problem) => problem.includes("every other non-terminal")));

      const clearAfter = parkPublicationProblems({
        ...sources,
        resumeCommandSource: "await push.push({}); reserveParkedAssignmentResume(store, assignmentId);",
      });
      assert.ok(clearAfter.some((problem) => problem.includes("admission authority")));
    },
  },
];
