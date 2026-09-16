---
type: story
doc: retrospective
number: 02
parent: 119
slug: commands-gets-an-interior
title: "Retrospective — src/commands/ gets an interior, and the registry stops explaining itself twice"
created: 2026-09-07
updated: 2026-09-07
---
# 119/02 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A non-recursive walk of a directory you have just given an interior is a whole species, and every control in this milestone was blind to it

- **Kind:** blind spot · **Area:** controls · **Stage:** build · **Owner:** developer · **Raised by:** `m119/F-20`, found by reading the readers

`acd-command-layer-imports-downward.test.mjs:99` walked the command layer with a NON-RECURSIVE
`readdir` and no floor. After the move it asserted "nothing a command imports imports `commands/`
back" over 67 of 99 modules and read green — over the boundary it exists to guard, and over the very
family (`commands/mesh/repo.mjs`) its own failure message names as the measured cycle.

**Lesson.** FF-11902 did not catch it and is not wrong to have missed it: its subject is *a walk
narrowed by a filename PREFIX*, and this walk narrows by nothing — it is simply flat. **Giving a
directory an interior silently halves every non-recursive walk of it.** The carryable check, owed
before any story that adds a directory level: enumerate the readers that `readdir` the directory
being restructured, not just the ones that name its files. `119/03` gave `test/` an interior one
directory over, where every flat `readdir("test/arch")` was the same hazard.

## R2 — The stored-path species has a SECOND SPELLING, and a resolver that reads paths cannot see it

- **Kind:** blind spot · **Area:** controls · **Stage:** build · **Owner:** architect · **Raised by:** `m119/F-21`, found by seven reds

Item 81's species was swept as the token `commands/<flat>.mjs`, which found 40 sites. It did not find
`path.join(repoRoot, "src", "commands", "mesh-session.mjs")` — the same fact spelled as argument
segments — of which there were **25 more in 16 controls**.

**Lesson.** ADR-004's resolver reads a path, so a segment-spelled citation is outside it by
construction rather than by oversight. When ruling a class by its SPELLING, the ruling inherits the
extractor's blind spots; `119/00`'s R3 is the same lesson arriving from the other direction. Either
sweep both spellings or state in the ADR which one the resolver does not reach.

## R3 — Solving the PATH axis made the LINE axis visible, and the line axis has no legal repair

- **Kind:** blind spot · **Area:** records · **Stage:** build · **Owner:** architect · **Raised by:** `m119/F-24`

This story changes no behaviour and moves no module, but shortening `src/command-core.mjs` from 582
to 323 lines drifted **307 of 361** stored `<path>:<line>` citations naming files it touched, and put
8 past EOF. Two were gated and went red and were fixed in-story. The other six are in delivered,
immutable records — so the repair is forbidden and the decay is unreported.

**Lesson.** It is NOT this story's defect, and the reason is the lesson: one of the six pointed at the
wrong thing *before* this story and was merely still in range. Every commit to that file since m52 had
been moving them silently. A rule that made this story answer for them would forbid editing the
registry at all. **What is owed is an instrument, not a repair** — and it was owed BEFORE `119/03`,
which stranded line citations at a much larger scale.

## R4 — Three repairs across two stories for one missing call is the signal to land the row

- **Kind:** process · **Area:** loop · **Stage:** build · **Owner:** the gate · **Raised by:** `m119/F-19`

`aof work validate` probes each story's `reads:` entry with a bare existence check, so this story's 32
renames turned three older stories' `reads:` lists into stream findings (`72/03`, `96/00`, `77/02`).
Repaired here the way `119/01` repaired its own — `reads:` is frontmatter on a mutable record, not
acceptance criteria.

**Lesson.** That is three hand-repairs across two consecutive stories for one missing call: the ADR-004
resolver is already exported and the probe is four lines from using it. The threshold worth naming —
**the second time the same fix is paid by hand, land the row instead** — because `119/03` moved
`test/**`, where `reads:` entries are dense, and would have paid it a third time.
