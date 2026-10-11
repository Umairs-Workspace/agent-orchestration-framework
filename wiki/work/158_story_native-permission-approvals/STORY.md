---
type: story
number: 158
slug: native-permission-approvals
title: "The loop waits for native permission decisions"
status: not-started
owner: product-owner
created: 2026-10-11
updated: 2026-10-11
schema: 1
aofVersion: 0.1.0
reads: []
files: []
---
# 158 · The loop waits for native permission decisions

## User story

As an AOF operator,
I want a loop to surface a coding assistant's native permission request and continue
after my explicit decision,
so that required verification can finish with my chosen model while I retain control
over commands and access that exceed its existing permissions.

## Tasks

## Notes

### Observed problem

This is follow-on work to [156 — One loop selects an assistant per phase](../156_story_one-loop-selects-an-assistant-per-phase/STORY.md)
and the Codex execution delivered in milestone 154. It is a separate capability;
the diagnostic and generated-lock fixes already committed under 156 do not implement it.

Language-tutor's 16/01 verification and AOF's 153/01 verification reached Astra/high
successfully, but Windows blocked Node test subprocesses with `spawn EPERM`. Codex
requested native approval. AOF's App Server adapter immediately declined and settled
`operator_action_required`. The same scoped commands passed through the governing
session's approved host execution tool (language-tutor: 99 tests). This is an approval
handling gap, not evidence that Astra cannot verify or that those tests fail.

### Agreed scope for refinement

- Keep a live native permission request open and expose a distinct waiting-for-permission
  state. It must not become a discovery question, successful phase, or automatic retry.
- Present the operation, working directory, requested access and reason to the operator,
  with explicit approve-once and deny choices. Bind the decision to the exact project,
  run, native session, turn and request; support concurrent lanes without crossed answers.
- Cover command execution, file changes and permission-scope requests supported by the
  admitted Codex protocol profiles. Refuse unsupported or malformed shapes explicitly.
- Provide an operator approval path for a foreground CLI loop and a defined path for
  background/worker loops. Refinement must settle the available approval surfaces and
  authorization checks; an ordinary business-question answer must not grant permission.
- Return the decision to the outstanding native request. Approval allows that operation
  to continue in the existing session. Denial grants no access and has a visible outcome.
- Cancellation, timeout, disconnect and restart never imply approval. Do not replay an
  expired request or apply an old decision to a newly emitted request. Keep waiting and
  recovery bounded, with actionable instructions when the original session cannot continue.
- Preserve the configured sandbox, model/effort choices and Claude behavior. No blanket
  permission bypass, runtime-selection flags, or silent substitution of Sonnet for Astra.
- Provide supported recovery for the existing failed verification attempts after the
  permission problem is resolved, retaining failure history and completed builds.

### Evidence required before acceptance

Refinement must define executable coverage for approve, deny, no answer, invalid or
stale answers, mismatched identities, concurrent requests, cancellation, disconnect
and restart. Include CLI/worker delivery, persistence failures and unchanged Claude
behavior. Permission details must not leak through unrelated logs or notifications.

Live acceptance must use Astra/high on Windows: reproduce a sandbox-blocked test
subprocess, present the exact native approval to the operator, observe its explicit
decision and the resulting native operation, and demonstrate verification continuing
without rebuilding completed stories. A scripted adapter reply or externally run test
alone is not this live acceptance. No live approval is assumed in advance.
