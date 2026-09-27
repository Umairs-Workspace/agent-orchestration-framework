---
type: story
number: 02
slug: the-four-deadlines
title: "Deadlines aof enforces itself — because the CLI's own caps are unreachable on this path"
parent: 69
status: done
owner: product-owner
depends: [69/00]
schema: 1
created: 2026-08-21
updated: 2026-08-23
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · Deadlines aof enforces itself — because the CLI's own caps are unreachable on this path

## User story

As an operator who has paid 22 hours of wall clock for 32 minutes of work,
I want each attempt to have a deadline **aof itself enforces against a process it is holding**,
so that a run that has hung is killed and retried in half an hour instead of burning eleven.

Runs `47/01` and `47/02` each burned **11h07m before failing**, then each succeeded in **15.9
minutes** on retry — a 42:1 ratio. That is not a hard-problem signature. It is a missing deadline.
A 30-minute per-attempt ceiling with three attempts bounds that pair at ≤46 minutes each.

**The SPEC asked for in-process caps and the spawn path supports none.** Measured at refine on the
installed binary (`claude 2.1.233`): `--max-turns` does not appear in `claude --help` at all, and
`--max-budget-usd`'s own help reads *"(only works with `--print`)"* — while `-p` / `--print` /
`--output-format` are **forbidden** in the worker launch by a shipped, currently-green fitness
function, on measured evidence that a `-p` turn cannot pause to ask a human. So the wall-clock kill
is not a fallback here; it is the whole enforcement story, exactly as STATE anticipated.

## Tasks

- [x] `tasks/00_the-attempt-has-a-deadline.feature` — the session driver arms the per-attempt and liveness deadlines against the process handle it holds, and expiry resolves a retryable timeout
- [x] `tasks/01_the-total-ceiling-escalates.feature` — the total-across-attempts ceiling gives up rather than retrying, and preserves the worktree for triage
- [x] `tasks/02_no-bound-is-spoken-to-the-model.feature` — no bound argv is constructed for the interactive driver, and the one-shot print form stays absent

## Notes

- **Only one function in this repo holds a live process handle:** `driveInteractiveClaudeSession`.
  Every design decision in ADR-004 follows from that fact. The reaper (69/01) is the backstop for a
  run whose *supervisor* died; the driver is the primary.
- **No vocabulary is invented.** `timeout` is already classified retryable ("no verdict in time"),
  and `timeout` / `stall` / `max_turns` / `budget_exceeded` are already members of 68's exit
  vocabulary — fixed there *"precisely so that 69 has a stable thing to enforce against"*. This
  story makes several of them reachable for the first time.
- **The startup grace suspends the liveness deadline and nothing else.** A full `git clone` (no
  `--depth`, no `--filter`) plus a dependency install produces no tool-result events at all. A
  grace that also paused the wall clock would turn a 5-minute allowance into an unbounded one.
- **codex is untouched.** Its headless `execFile` path already carries a 10-minute timeout, it was
  never the problem this milestone names, and no task here edits it.
- **Named overlap with 69/01 and milestone 70/01** — three distinct halves of
  `src/agent-session-driver.mjs`: this story the **session lifetime**, 69/01 the spawn **env**,
  70/01 the launch **argv**. See ARCHITECTURE § Story partition.
- **What this story does NOT do:** tell the agent about its budget. That is 71's subject, and
  ADR-004 is what a reviewer refuses a prompt-layer edit here on.
