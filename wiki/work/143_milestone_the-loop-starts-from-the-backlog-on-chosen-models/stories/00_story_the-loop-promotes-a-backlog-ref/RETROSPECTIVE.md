---
doc: retrospective
updated: 2026-10-03
---
# 00 · The loop promotes a backlog ref — Retrospective

## R1 — the contract launched the loop with `--json`, which never launches

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner
- **Raised by:** the developer, at build

**What happened.** Three scenarios in task 00 said `aof work loop widget-sync --json` runs and
promotes. Face policy (`spine/face.mjs`) makes `--json` the read-only probe, so through the CLI
that command answers `wouldPromote`, like `--dry-run`. The scenarios were exercised through
`runLoopBody`, and the wording was corrected at accept.

**Why.** The contract treated `--json` as an output format. In this CLI it is a door.

**Lesson.** A scenario that mutates state names the foreground launch. `--json` belongs only in a
scenario that reads.

**Refs:** F-143-01.

## R2 — ADR-005 named two declaration builders that build none

- **Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** architect
- **Raised by:** the developer, at build

**What happened.** ADR-005 said the mesh assignment directive and the trigger declaration build loop
declarations, so every new declaration key needed a `null` default for them. Both import only
`decideLoopScope` and hand the loop a numeric scope. The loop shell builds every declaration.

**Why.** The claim came from the graph's dependent list (they import `engine.mjs`), not from
reading what they call.

**Lesson.** A graph edge says a module imports another, not which function it uses. An ADR that
names a caller's obligation reads that caller first.

**Refs:** ADR-005; F-143-07.

## R3 — a resume assertion that ran over zero rows passed

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer
- **Raised by:** the independent reviewer

**What happened.** The resume case asserted `promotedFrom` on every drive the resume minted. The
resume halted at once, so the loop asserted nothing and passed. The fixture now launches at cap 1,
resumes at cap 3, and asserts the resume drove.

**Lesson.** An assertion inside a loop first asserts that the loop ran.
