---
type: story
number: 00
slug: the-run-record-on-the-skills-path
title: "The run record on the phase-command path — so observe measures the path we actually drive"
parent: 96
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-07
reads:
  - wiki/work/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-001
  - wiki/work/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-002
  - wiki/work/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-003
  - src/run-store.mjs
  - src/run-session-capture.mjs
  - src/commands/run-complete.mjs
  - src/commands/mesh/session.mjs
  - src/effects/table.mjs
  - .claude/hooks/aof/run-heartbeat-enqueue.mjs
files:
  - src/mesh-session.mjs
  - src/commands/run-start.mjs
  - src/work-observe.mjs
  - src/bundle/commands/refine.md
  - src/bundle/commands/continue.md
  - src/bundle/manifest.json
  - test/run-mint-session-attribution.test.mjs
  - test/arch/acd-attribution-is-captured-or-absent.test.mjs
  - scripts/test.mjs
  - .claude/commands/aof/continue.md
  - .codex/skills/aof-continue/SKILL.md
  - .opencode/commands/aof/continue.md
  - .claude/commands/aof/refine.md
  - .codex/skills/aof-refine/SKILL.md
  - .opencode/commands/aof/refine.md
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 00 · The run record on the phase-command path

## User story

As the operator deciding whether a change to the agent layer paid for itself,
I want `aof work observe` to attribute agent runs on the `/aof:refine` and `/aof:continue` path,
so that the cost of a milestone is a committed number I can compare against the last one, rather than
something I re-derive by hand from raw transcripts every time I ask.

## Why

`aof work observe` is not broken. It is measuring a path nobody drives.

Attribution is deliberate and documented: *"an agent run belongs to exactly one item because it
belongs to exactly one session, which belongs to exactly one run — whose record carries that session
id"* (`work-observe.mjs:670-676`). The regex fallback that once pulled an unrelated milestone into a
snapshot on a hex substring is retired under FF-6805, correctly. `buildSessionItemIndex` builds the
`sessionId → itemRef` map by reading every item's `runs/` records.

**No run records exist.** `find wiki/work -type d -name runs` returns two hits in the whole stream —
milestones 38 and 40 — both from the mesh dispatch path. The records are minted where the loop
dispatches; `/aof:refine` and `/aof:continue` mint none. So the index is empty, every session resolves
to nothing, and the honest-absence discipline counts them all unattributed.

The result, in the two most recent milestones measured:

| | milestone 63 | a downstream milestone |
|---|---:|---:|
| `runs.count` | 0 | 0 |
| `totalOutputTokens` | 0 | 0 |
| `activeUnionMs` | 0 | 0 |
| `unattributedAgentRuns` | **408** | **216** |

Both snapshots are committed. Both are empty. `transcriptsFound` is `true` in both, so the miner found
the sessions and could say nothing about them.

**What it cost.** Establishing that story 83's read contract cut cache-creation per spawn from
3,082,276 to 936,394 required writing a standalone miner against
`~/.claude/projects/<slug>/<sessionId>/subagents/agent-*.jsonl` and running it by hand, twice, because
the first pass read the wrong directory level. Every number in this milestone's SPEC came from that.
None of it is reproducible by anyone else, and none of it is in the repository.

**Why this story is first.** Every other story here claims a saving. Without this one, each claim is
settled by argument.

## Tasks

- [x] `tasks/00_the-session-id-is-read-at-the-mint-or-it-is-absent.feature` — the fourth rung: `work:run-start` resolves the id from the live session store when `--session` is absent, taking the strictly-newest live record for this node and workspace, and resolving `null` on a tie, an empty store or a fault — never a guess
- [x] `tasks/01_the-phase-mints-at-its-top-and-closes-its-own-run.feature` — `/aof:refine` and `/aof:continue` mint before their first agent and complete at their close; the mint carries the item ref, moves a `not-started` item through the existing reactor, and a crashed phase's run is reclaimed by the next mint rather than heartbeated
- [x] `tasks/02_an-unattributed-run-reports-what-it-cost.feature` — the count keeps its meaning and gains a body: each unattributed run reported with its window and its spend, the `sessionId` join unwidened, and a snapshot over a phase-minted milestone reporting non-zero runs, tokens and active time

## Notes

**Refine confirmed the seam, and it is not where the story guessed.** Measured at refine:
`CLAUDE_SESSION_ID` is **unset** in a tool shell, so 48/ADR-001's env rung is unreachable from a
phase command; and the live session store the `UserPromptSubmit` hook writes is a LIVENESS store
with a 120-second TTL and a reaper at every write seam — this session's own record was absent from
`~/.aof/mesh/sessions/` while two records for another workspace, 60 seconds younger, were present.
So the id is readable at the top of the phase (seconds after the ping that invoked it) and not at
its close. That is ADR-001, and it is why the mint's position is a correctness requirement.

**The pieces already exist.** `work:run-start` already accepts `--session`; `recordSessionId`
already writes it; `readItemRuns` already reads the record; `effects/table.mjs`'s `run.started`
reactor already moves `not-started → in-progress`, so the mint REPLACES the phase prompt's
hand-written status step rather than adding one.

**Do not widen attribution to compensate.** The temptation, when the index is empty, is to fall back to
matching agent prose against the item — which is exactly FF-6805's retired path and the defect it was
retired for. Absence stays reported.

**Consider what `unattributedAgentRuns` should become.** Today it is a count with no detail, which is
honest but unusable. A run that resolves to no item could still be reported with its tokens and its
window, marked unattributed — the difference between "216 things happened that I cannot place" and
"216 things happened, here is what they cost". Refine's call; it is a face change, not a truth change.

**The standalone miner is the acceptance oracle.** It is committed at `.aof/mine-transcripts.mjs` and
`.aof/mine-toolwait.mjs`. When observe reports the same totals for the same window, this story is
done, and the scripts can be deleted or kept as a cross-check.
