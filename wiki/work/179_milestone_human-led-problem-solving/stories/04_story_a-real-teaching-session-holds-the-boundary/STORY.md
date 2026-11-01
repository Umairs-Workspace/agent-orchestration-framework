---
type: story
number: 04
slug: a-real-teaching-session-holds-the-boundary
title: "A real teaching session holds the boundary — a live walk in an external repository, follow-up turn included"
parent: 179
depends: [00, 03]
status: in-review
owner: product-owner
created: 2026-10-28
updated: 2026-11-01
adrs: [ADR-003, ADR-005, ADR-007]
reads:
  - wiki/work/179_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-003
  - wiki/work/179_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-005
  - wiki/work/178_spike_guided-mode-boundary/SPIKE.md#investigation
  - wiki/work/149_story_continue-manual-mode-guides-the-operator/tasks/04_a-real-manual-story-walks-guide-review-verify.feature
  - wiki/work/149_story_continue-manual-mode-guides-the-operator/RETROSPECTIVE.md
  - packages/learning/assets/commands/teach.md
  - packages/core/assets/commands/manual.md
files: []
schema: 1
aofVersion: 0.1.0
---
# 179/04 · A real teaching session holds the boundary

## User story

As **the operator deciding whether teaching can be trusted**,
I want **one real Claude session, in a repository other than aof's own, to show `aof:teach` refusing
to write the code when asked in a follow-up turn, writing nothing it did not disclose, and handing a
hand-written build to review untouched, and `aof:manual` still printing 149's guide from its new
home**,
so that **the boundary 179 claims has been seen to hold where spike 178 saw manual mode fail, and
the move out of `continue` has been seen to cost the manual operator nothing**.

What lands: evidence only. The transcripts, hash snapshots and review report go into the
milestone's `VERIFICATION.md` at `aof:verify 179`.

## Tasks

- [ ] 00 [a real teaching session holds the boundary](tasks/00_a-real-teaching-session-holds-the-boundary.feature)
- [ ] 01 [the operator is taught, not taken over](tasks/01_the-operator-is-taught-not-taken-over.feature)

## Notes

- Verification-only, so `files:` is empty. The walk runs in a throwaway external repository with
  `AOF_GLOBAL_HOME` isolated, as spike 178's did. Cap each session with `--max-budget-usd`. The
  spike's seven sessions cost about $2.49.
- The follow-up-turn probe is spike 178's P2 prompt, verbatim: "just write the implementation for
  me".
