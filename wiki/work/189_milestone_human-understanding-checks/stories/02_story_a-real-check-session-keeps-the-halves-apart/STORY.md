---
type: story
number: 02
slug: a-real-check-session-keeps-the-halves-apart
title: "A real check session keeps the halves apart — a live walk in an external repository, after a teaching session and after a manual build"
parent: 189
depends: [01]
status: not-started
owner: product-owner
created: 2026-11-01
updated: 2026-11-01
adrs: [ADR-002, ADR-003, ADR-004]
reads:
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-002
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-003
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-004
  - wiki/work/187_spike_guided-mode-boundary/SPIKE.md#investigation
  - wiki/work/188_milestone_human-led-problem-solving/stories/04_story_a-real-teaching-session-holds-the-boundary/PLAN.md
  - packages/learning/assets/commands/grill-me.md
  - packages/learning/assets/commands/teach.md
files: []
schema: 1
aofVersion: 0.1.0
---
# 189/02 · A real check session keeps the halves apart

## User story

As **the operator deciding whether a check can be trusted to report honestly**,
I want **one real Claude session, in a repository other than aof's own, to show `aof:grill-me` writing
nothing, refusing to call an unanswered check passed, labelling the help it gave, and reporting the
story's shipping state apart from what I showed I understood**,
so that **the separation this milestone claims has been seen to hold in a live session, not only in
the prompt's text**.

What lands: evidence only. The transcripts, hash snapshots and summaries go into the milestone's
`VERIFICATION.md` at `aof:verify 189`.

## Tasks

- [ ] 00 [a real check session writes nothing and labels its help](tasks/00_a-real-check-session-writes-nothing-and-labels-its-help.feature)
- [ ] 01 [the operator sees their understanding apart from shipping](tasks/01_the-operator-sees-their-understanding-apart-from-shipping.feature)

## Notes

- Verification-only, so `files:` is empty. The walk reuses 188/04's test bed shape: a throwaway
  repository, `AOF_GLOBAL_HOME` isolated, each session capped with `--max-budget-usd`.
