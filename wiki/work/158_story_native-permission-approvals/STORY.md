---
type: story
number: 158
slug: native-permission-approvals
title: "The loop handles native approvals on the operator's behalf"
status: done
owner: product-owner
created: 2026-10-11
updated: 2026-10-12
schema: 1
aofVersion: 0.1.0
reads: ["wiki/work/158_story_native-permission-approvals/ARCHITECTURE.md#adr-001-native-automatic-review-is-the-delegated-approver","wiki/work/158_story_native-permission-approvals/ARCHITECTURE.md#adr-002-observe-review-lifecycle-without-owning-native-grants","wiki/work/158_story_native-permission-approvals/RESEARCH.md","wiki/work/158_story_native-permission-approvals/SECURITY.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-004-durable-asks-are-independent-of-transient-rpc-requests","packages/contracts/src/loop-bounds.mjs","packages/execution/src/codex-executable.mjs","packages/execution/src/codex-process-environment.mjs","packages/execution/src/runtime-selection.mjs","packages/execution/src/session-model.mjs","packages/execution/src/session-driver.mjs","packages/execution/src/runs.mjs","packages/execution/src/run-transitions.mjs","packages/execution/test/support/run-store.mjs","packages/execution/test/index.mjs","packages/work-loop/src/ask-request.mjs","packages/work-loop/src/ask.mjs","packages/work-loop/src/commands/loop.mjs","packages/work-loop/src/child-drive.mjs","packages/work-loop/src/engine.mjs","packages/work-loop/src/progress.mjs","packages/work-loop/test/runtime/index.mjs","packages/core/src/application/bindings/commands/drive.mjs","packages/core/src/application/bindings/run-store.mjs","packages/core/src/application/bindings/loop/ask.mjs","packages/core/src/application/bindings/loop/ask-request.mjs","packages/mesh/src/worker-execution.mjs","packages/mesh/src/workspace-identity.mjs","packages/work/src/commands/resume.mjs","packages/work/src/phase-brief-read.mjs","test/loop/loop-command-probe.test.mjs","test/support/runtime-loop/fixture.mjs","test/support/mesh-worker-terminal-fixture.mjs","test/support/source-slice.mjs","test/support/module-family.mjs","test/arch/session/acd-runtime-session-boundary.test.mjs","scripts/test.mjs","scripts/test-sharded.mjs",".aof/aof.config.json"]
files: ["packages/execution/src/codex-app-server.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/runtime-events.mjs","packages/execution/test/codex-app-server.suite.mjs","packages/execution/test/runtime-session.suite.mjs","packages/execution/test/runtime-events.suite.mjs","packages/execution/test/fixtures/codex-app-server-v1.json","packages/execution/test/fixtures/codex-auto-review-profiles.json","packages/work-loop/src/commands/drive.mjs","packages/work-loop/src/commands/runtime-invocation.mjs","packages/work-loop/test/runtime/phases.suite.mjs","packages/core/src/application/bindings/mesh/worker-execution.mjs","test/loop/loop-command-resume.test.mjs","test/mesh/assignment/mesh-assignment-directive.test.mjs","test/arch/session/acd-codex-permission-boundary.test.mjs","test/arch/session/acd-native-permission-authority.test.mjs","test/arch/session/acd-native-permission-lifecycle.test.mjs","test/arch/session/index.mjs","wiki/codex-support.md","packages/execution/src/runs.mjs","test/support/runtime-loop/fixture.mjs","test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs","scripts/workspace-runtime-audit.json","test/arch/testing/acd-source-directory-budget.test.mjs","wiki/work/157_milestone_episodic-memory-is-recallable/stories/01_story_episodic-records-resolve-to-their-sources/PLAN.md"]
---
# 158 · The loop handles native approvals on the operator's behalf

## User story

As an AOF operator,
I want starting a loop or graph to authorize the assistant to handle native
permission requests on my behalf, as Claude already does,
so required work and verification continue with my selected model without
repeated approval prompts.

## Tasks

- [x] [00 · Delegate review at native launch](tasks/00_delegated-native-review.feature)
- [x] [01 · Cover unattended and concurrent execution](tasks/01_unattended-and-concurrent-review.feature)
- [x] [02 · Attribute native decisions](tasks/02_attributable-native-decisions.feature)
- [x] [03 · Bound review and recover verification](tasks/03_bounded-review-and-verification-recovery.feature)

## Notes

### Operator decisions

2026-10-11, Q1: "I don't need to approve, you need to approve on my behalf. Just like claude does".
Q2: "No dude. The approval is implicit by the user running the loop/graph".
These answers supersede this story's original explicit-human-approval scope and
the initial draft's CLI/dashboard/Discord approval surfaces. See EXAMPLES.md.

### Observed problem

This follows [156](../156_story_one-loop-selects-an-assistant-per-phase/STORY.md)
and Codex execution from milestone 154. Language-tutor 16/01 and AOF 153/01
verification reached Astra/high but Windows blocked Node subprocesses with spawn
EPERM. The adapter declined native permission requests immediately, settling
operator_action_required. Equivalent scoped tests passed through the governing
session's approved host execution tool (language-tutor: 99 tests). The approval
handling gap is separate from model capability or test failure.

### Scope

- Route native command, file-change and permission-scope requests through the
  native automatic reviewer under the operator's loop/graph launch authorization.
- Apply the same behavior to foreground, background, graph/worker dispatch,
  resumed native sessions and selected phase roles; no additional approval UI.
- Preserve configured sandbox and native risk review, selected model/effort and
  Claude behavior. Do not turn automatic handling into unconditional acceptance.
- Observe review waiting and native outcomes without parking a business question,
  relaunching the phase, or treating approval itself as successful verification.
- Keep identity, concurrent reviews, cancellation, timeout, disconnect, restart,
  unsupported profiles, persistence faults and redaction explicit and bounded.
- Recover historical permission-failed verification through a fresh authorized
  loop while preserving completed work and failure history.

### Evidence required before acceptance

Executable cases cover both admitted profiles, entry points, positive and negative
review outcomes, protocol defects, attribution, concurrency, cleanup, persistence
and unchanged Claude behavior. Registered fitness controls need actual red probes.
Live Windows Astra/high acceptance must show a sandbox-blocked test subprocess
being automatically reviewed and then running in the native session, without
another operator permission answer or rebuilding completed stories. A fixture
reply or tests executed by a separate host tool alone are insufficient evidence.
The operator launch is authorization; the live test is observation, not a new
permission gate. Refinement itself does not start this model run.

## Accept decision

2026-10-12 correction: technical verification passed, but human acceptance is pending
the operator's trial. The actual answer to the sign-off question was "What's E12?",
not acceptance. The verifier incorrectly relied on a host approval-review message
claiming acceptance and prematurely moved this item to done. The CLI refused the
corrective move back to in-review because done is terminal. The retained status is
therefore a known lifecycle-record error, not proof of human sign-off. See VERIFICATION.md.
