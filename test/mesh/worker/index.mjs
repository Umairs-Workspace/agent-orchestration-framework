// THE MESH/WORKER SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { meshWorkerRepoGuardTests } from "./mesh-worker-repo-guard.test.mjs";
// milestone 38 / story 05 — terminal-driven-worker-execution (ADR-013): `claude -p`
// replaced by an interactive `claude` PTY session resolved through the EXISTING
// terminal-providers seam (task 00), the directive's whole command string typed into
// that ONE session's PTY stdin (task 01), an explicit NEEDS_INPUT sentinel yielding a
// THIRD `needs-input` outcome that retains its worktree (task 02), and the session's
// `session_id` captured + surfaced rather than discarded (task 03). Task 04 is the
// @manual real-interactive-claude-on-subscription soak, deferred to aof:verify 38 —
// no test file here. Armed: acd-worker-driver-no-headless-print.
import { meshWorkerDriverInteractivePtyTests } from "./mesh-worker-driver-interactive-pty.test.mjs";
// m42 soak-day owed lanes (STATE §MISSING TESTS, paid 2026-07-31) — the
// withdraw/settle family: the withdraw handler's three paths, the stranded-record
// startup settle, the bracket's withdraw guards, onPtyLive registry lifecycle,
// and the coded failure reporting.
import { meshWorkerWithdrawSettleTests } from "./mesh-worker-withdraw-settle.test.mjs";
import { meshWorkerTrustWorktreeTests } from "./mesh-worker-trust-worktree.test.mjs";
import { meshWorkerCommandTimingTests } from "./mesh-worker-command-timing.test.mjs";
import { meshWorkerCompletionDetectionTests } from "./mesh-worker-completion-detection.test.mjs";
import { meshWorkerDriverDirectiveCommandTests } from "./mesh-worker-driver-directive-command.test.mjs";
import { meshWorkerDriverNeedsInputTests } from "./mesh-worker-driver-needs-input.test.mjs";
import { meshWorkerDriverSessionIdTests } from "./mesh-worker-driver-session-id.test.mjs";
// The driver's onOutputChunk producer link (the FIRST link — term.onData ->
// onOutputChunk(chunk, capturedSessionId), driven from a real scripted PTY, incl. the
// pre-capture null-session chunk) — the shipped producer path, previously asserted only
// structurally by acd-terminal-stream-transport-wired.
import { meshWorkerDriverOutputChunkTests } from "./mesh-worker-driver-output-chunk.test.mjs";
import { meshWorkerPushBeforeRemoveTests } from "./mesh-worker-push-before-remove.test.mjs";
import { meshWorkerCommitDiffTests } from "./mesh-worker-commit-diff.test.mjs";
import { meshWorkerWriteCredentialPullTests } from "./mesh-worker-write-credential-pull.test.mjs";
// m42 wave (b) / TECH_DEBT item 7 — the PTY liveness probe: a child that dies
// without an exit event settles failed/agent_died instead of running forever.
import { meshWorkerLivenessTests } from "./mesh-worker-liveness.test.mjs";

export const tests = [
  ...meshWorkerRepoGuardTests,
  // milestone 38 / story 05 — terminal-driven-worker-execution (ADR-013, tasks 00-03
  // traceability modules + the acd-worker-driver-no-headless-print fitness function)
  ...meshWorkerDriverInteractivePtyTests,
  ...meshWorkerWithdrawSettleTests,
  ...meshWorkerTrustWorktreeTests,
  ...meshWorkerCommandTimingTests,
  ...meshWorkerCompletionDetectionTests,
  ...meshWorkerDriverDirectiveCommandTests,
  ...meshWorkerDriverNeedsInputTests,
  ...meshWorkerDriverSessionIdTests,
  ...meshWorkerDriverOutputChunkTests,
  ...meshWorkerPushBeforeRemoveTests,
  ...meshWorkerCommitDiffTests,
  ...meshWorkerWriteCredentialPullTests,
  ...meshWorkerLivenessTests,
];
