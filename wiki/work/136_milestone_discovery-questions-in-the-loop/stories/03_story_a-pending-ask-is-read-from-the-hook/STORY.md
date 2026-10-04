---
type: story
number: 03
slug: a-pending-ask-is-read-from-the-hook
title: "A pending ask is read from the hook — a driven session's question reaches the operator although the transcript does not show it until it is answered"
parent: 136
status: in-review
owner: product-owner
created: 2026-10-03
updated: 2026-10-04
adrs: [ADR-004]
reads:
  - wiki/work/136_milestone_discovery-questions-in-the-loop/ARCHITECTURE.md#ADR-004
  - packages/core/assets/hooks/run-heartbeat-enqueue.mjs
  - packages/core/assets/hooks/claude-run-heartbeat.json
files:
  - packages/core/assets/hooks/ask-pending-enqueue.mjs
  - packages/core/assets/hooks/claude-ask-pending.json
  - packages/core/assets/bundle.json
  - packages/core/assets/manifest.json
  - packages/work/src/observe.mjs
  - packages/execution/src/session-driver.mjs
  - packages/work-loop/src/ask.mjs
  - packages/mesh/src/park-resume.mjs
  - packages/mesh/src/worker-execution.mjs
  - packages/core/src/application/bindings/work/observe.mjs
  - packages/core/src/application/bindings/loop/ask.mjs
  - packages/core/src/application/bindings/agent-session-driver.mjs
  - packages/core/src/application/bindings/mesh/park-resume.mjs
  - test/loop/loop-ask-pending-hook.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/index.mjs
schema: 1
aofVersion: 0.1.0
---
# 03 · A pending ask is read from the hook

## User story

As **the operator running a loop whose sessions ask me questions**,
I want **a question a driven session asks with `AskUserQuestion` to reach me while the session
waits on it, on the Claude Code I actually run**,
so that **I answer it in minutes instead of finding, twenty minutes later, a run that timed out
in front of a question nobody posted**.

What lands (ADR-004): a bundled `PreToolUse` hook records the pending call beside the run's
heartbeats; the driver settles `needs-input` on it, the owner reads the question from it, and the
re-drive types the question ahead of the answer when the session never recorded it.

## Tasks

- [x] 00 [a question the transcript cannot show is still asked, answered and carried back](tasks/00_a-question-the-transcript-cannot-show-is-still-asked-answered-and-carried-back.feature)

## Notes

- Added at 136's verify (2026-10-03), after the live run measured the defect on Claude Code
  2.1.288 (VERIFICATION F-136-02). It carries 02's ask, and shares no file with it.
