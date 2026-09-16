---
type: story
number: 00
slug: the-corpus-and-its-floor
title: "The corpus and its floor — three lanes over the material that exists, and a lane that read nothing is a finding"
parent: 62
status: done
owner: product-owner
created: 2026-08-31
updated: 2026-09-01
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-007, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-008, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-001, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-010, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-012, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-013, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-004, src/work-audit/reads.mjs, src/work-acceptor/observations.mjs, src/memory/local-indexing.mjs, src/run-store.mjs, src/work-observe.mjs, src/work-ref-scope.mjs, src/work.mjs, src/commands/audit.mjs, test/arch/acd-observation-census-filtered.test.mjs, test/arch/acd-audit-reports-what-it-read.test.mjs, scripts/test.mjs, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/work-tune/corpus.mjs, test/arch/acd-tune-corpus-declares-its-reads.test.mjs, test/tune-corpus.test.mjs, scripts/test.mjs]
---
# 00 · The corpus and its floor

## User story

As the operator who will be told that no harness change can be proposed today,
I want the analysis pass to say exactly what it read and what it failed to read,
so that "no proposals" and "no input" are two different sentences instead of the same silence.

This is the story that decides whether the whole milestone can be believed. An analysis pass whose
input is empty reports "nothing to propose" in precisely the words it would use if the harness were
already perfect, and those two states are the opposite of each other. The corpus therefore declares
three lanes — the `## R<n>` lesson sections of every retrospective in scope, the run records of every
item in scope, and the observability snapshot series — each with a floor, each emitted with a record
of what was walked and what was counted. A lane that came back under its floor is a **finding** naming
the lane, the root and the floor it missed.

The material is real and it was measured at refine: **392 lesson sections across 63 documents**, **61
run records across 52 items**, and **8 observability snapshot directories across 7 items, of which 6
carry an `agents.json`** (two under milestone 70 hold a `report.md` and nothing else). The declared
reader returns at most one reading per item, so this lane sees **7 series and 6 readings** — which is
why its floor is measured against **readings**, not directories (`ARCHITECTURE.md#ADR-012` §2).

The lane is also honestly uneven, and the shape of the unevenness matters. All 6 readings come back
successfully, so this lane is **not** `tune-ran-on-nothing` at full scope; what is zero is their
*content* — no reading carries an agent attribution, because attribution joins on a `sessionId` that
no record carries. Those are two different faults with two different fixes, which is why the lane
reports three numbers and why the zero third number reaches no lane code at all: it is limb (b), and
story 03 owns it. Reading a series that reports zero *is* consuming it; omitting it because it is empty
would be the milestone quietly declining to look.

Nothing here is a new reader. Every lane goes through the home that already owns its source —
`parseRetrospective`, `readRuns`, `readLatestSnapshot` — and the read record and floor discipline are
imported from `src/work-audit/reads.mjs` rather than restated. The repository has already paid for a
second run-record reader once (TECH_DEBT item 59) and for three scope parsers (item 49); this story is
where the third and the fourth would be born, and it is where they are refused.

## Tasks

- [x] `tasks/00_three-lanes-each-declaring-what-it-read.feature` — each lane reports the root it walked, the count it found and the floor it was measured against, in the record shape the audit family already owns
- [x] `tasks/01_a-lane-that-read-nothing-is-a-finding.feature` — a lane below its floor emits `tune-ran-on-nothing` naming the lane, the root and the floor, rather than contributing an empty result
- [x] `tasks/02_a-series-that-reads-zero-is-still-read.feature` — the observability lane reports series walked, readings counted and readings carrying an attribution, and a lane that read successfully is not reported as one that read nothing
- [x] `tasks/03_scope-is-the-one-the-stream-already-speaks.feature` — a scope resolves exactly as it does on `validate`, `doctor` and `audit`, and an unresolved scope matches nothing at exit 0

## Notes

- **Three lanes, driven from one registry with a floor each** (`ARCHITECTURE.md#ADR-007` §1). A lane
  added without a floor must fail CI — that is 61/FF-6107's shape and the reason it has it.
- **Every lane reads through the home that already owns its source** (`ARCHITECTURE.md#ADR-007` §2),
  and the raw-path ban covers `runs/*.json` and `snapshots/*/agents.json`. TECH_DEBT item 59 records
  that a second run-record reader already exists; this is not the third.
- **The lessons lane does its OWN join, and only the PARSE is mandated** (`#ADR-013` §6).
  `parseRetrospective` is a pure text parser, so this lane walks and reads. Routing through
  `buildRecords` instead would drop **34 of the 392** lesson sections — the 7 top-level `NN_story_*`
  items its `type === "milestone" && parent == null` filter excludes — and would break slug scoping.
  The shared thing is the grammar, not the walk.
- **The `tune-ran-on-nothing` finding shape is re-authored, not reused** (`#ADR-013` §11).
  `readFinding` hardcodes `audit-ran-on-nothing`; the two shapes are asserted to differ in the code
  string alone, key by key — 61/FF-6107's own resolution of the same case.
- **A test that needs mutated source reads a COPY** (`#ADR-013` §10): copy the tree to a temp
  directory, rewrite the copy, `import()` the copy. 62/00 and 62/02 build in parallel in one worktree,
  and 61/R5 is what happens when two of them rewrite shared modules in place.
- **The read record is imported, never restated** — `readRecord`, `sweepDeclarationProblems` and
  `SWEEP_BASES` from `src/work-audit/reads.mjs`, exactly as 61/02 imported them.
- **Scope resolves only through `src/work-ref-scope.mjs`** (`ARCHITECTURE.md#ADR-008`). The `NN-MM`
  range form is deliberately not introduced; TECH_DEBT item 49 is why.
- **The observations lane's floor is over READINGS** (`ARCHITECTURE.md#ADR-012` §2, §3), because
  `readLatestSnapshot` returns at most one per item. A floor over snapshot directories would be
  measured against a population the declared reader cannot produce.
- **No journal lane.** Anything counted off the effects journal comes back with the acceptor's own
  census (`ARCHITECTURE.md#ADR-002` §4), and 61/FF-6107 refuses a second classifier in `src/`.
- **Stage 1** — builds in parallel with 62/01, 62/02, 62/03 and 62/05; no edge to any of them.
- **The corpus-wide claim is not this story's.** Everything here is provable over this lane's own reads
  and over planted fixtures; "the pass says something about this repository" is `FF-6208`, which 62/04
  owns (`#ADR-013` §7).
