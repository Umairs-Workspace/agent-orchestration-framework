---
type: story
number: 05
slug: candidate-formation
title: "Candidate formation — what turns 392 lesson sections and 61 run records into something worth proposing"
parent: 62
status: done
owner: product-owner
created: 2026-08-31
updated: 2026-09-01
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-013, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-007, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-001, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-003, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-010, src/memory/local-indexing.mjs, src/run-store.mjs, wiki/work/61_milestone_disciplined-acceptor/RETROSPECTIVE.md, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/work-tune/formation.mjs, test/arch/acd-candidate-formation-is-lossless.test.mjs, test/tune-formation.test.mjs, scripts/test.mjs]
---
# 05 · Candidate formation

## User story

As the operator who will be shown a handful of harness-change proposals rather than 392 lessons,
I want the rule that decides a recurring class is worth proposing about to be a module with an owner,
so that the one step this milestone exists to perform is a thing somebody built rather than a thing
everybody assumed.

This story exists because the first partition did not have it, and the omission was structural rather
than clerical. Every other leaf takes a *candidate* handed in — 62/01 shapes and lanes it, 62/02 checks
its citations, 62/03 measures its distance, 62/04 composes them — and 62/00 produces lane records at the
other end. Between a lane record and a candidate there is a real decision, and it was described as "the
build's to choose". That was true of the **similarity criterion** and it was quietly read as true of the
**module, its owner and its seam**, which is a different abstention. The result was that the one
deliverable making ADR-001 §4's acceptance condition satisfiable was the one nobody had been given.

What formation does is narrow and can be stated in a sentence: it groups source records into clusters,
carries **every** source that contributed to each one, and attaches the citations and the target the
downstream leaves will need. What it must not do is anticipate anyone else's answer — it attaches no
lane, no patch, no applier, no verdict and no distance, because each of those has a home and a module
that guessed one would be the second home this milestone refuses everywhere else.

The losslessness is not fastidiousness; it is what makes the evidence floor measurable. ADR-007 §4
counts **distinct source documents** behind a proposal, so a cluster that kept a representative sample
and dropped the rest would leave the floor counting something that is not the evidence. Two lessons that
say the same thing are two sources, and the whole discipline of this milestone is that a proposal knows
how many independent times the world told it something.

The similarity criterion itself is deliberately still open, and this story is where it gets chosen —
against the real corpus, which is the only place it can be chosen honestly. The constraint on that
choice is that it must be a **named parameter the test can read and vary**, never a bare number buried
in an expression, so a future reader can disagree with it without reverse-engineering it.

## Tasks

- [x] `tasks/00_a-cluster-carries-every-source-behind-it.feature` — the union of sources on the emitted candidates equals the records that entered, with none absorbed into a neighbour and none counted twice
- [x] `tasks/01_a-candidate-is-formed-from-records-handed-in.feature` — formation reads no file, takes no clock and asks nothing of the registry; the same records in yield the same candidates out
- [x] `tasks/02_formation-answers-no-other-storys-question.feature` — a candidate carries its sources, its citations and its target, and no lane, patch, applier, verdict or distance
- [x] `tasks/03_the-criterion-is-a-parameter-not-a-constant.feature` — what makes two records one cluster is a named value a caller can read and vary, and varying it visibly changes the clustering
- [x] `tasks/04_a-lone-record-still-becomes-a-candidate.feature` — a cluster of one is formed and carried with its single source, because the evidence floor is 62/01's and 62/02's answer to give, not formation's to pre-empt

## Notes

- **This is ADR-013 §1's story**, and §1a is the line between what is fixed here (the module, its owner,
  its seam, its output shape, losslessness) and what is genuinely still open (the similarity criterion).
- **Formation does not apply the evidence floor.** A cluster of one is a candidate; whether it is
  emitted is ADR-007 §4's question, answered downstream where the resolved sources are counted. A
  formation module that filtered would make the `below-evidence-floor` finding unreachable, and that
  finding is how the surface says what it declined to do.
- **Pure, and inside FF-6201's family-wide ring ban** (`ARCHITECTURE.md#ADR-013` §2): no static import
  of `src/command-core.mjs`, and the fresh-process import probe runs over this module too.
- **Numbered 05, built at stage 1** (`#ADR-013` §1b). The number is later than the face's because 23
  task features were already addressed by story number; the stage table is the authority on order.
- **Formation is a PARTITION** (`ARCHITECTURE.md#ADR-014` §4): every source record lands on exactly
  one candidate. Overlap is refused because it lets one observation stand behind two proposals —
  the multiple-testing inflation spike 60 indicts, arriving one stage upstream of the only gate that
  would catch it. A lesson bearing on two changes lands on one of them, and the other does not get to
  claim it.
- **The tie-break is FIXED, and `#ADR-013` §1a's abstention does not reach it** (`#ADR-014` §5). It is
  a function of CONTENT, never of ARRIVAL: no input index, position or iteration order may reach it.
  The admitted default is the candidate whose lexicographically least source citation sorts first.
- **The criterion declares an ORDERED RANGE** (`#ADR-014` §6) — a loosest and a tightest admitted
  value, and a coded refusal outside it. This does not ban the categorical design the corpus invites:
  *how many of `Kind`/`Area`/`Stage`/`Owner` must agree* is scalar, ordered, 1 to 4.
- **A target is a BARE REF, or `null`** (`#ADR-014` §7). No typed vocabulary — it would be a constant
  shared between two stage-1 stories, which is an edge the partition says does not exist.
- **Every lane the registry declares reaches formation, and none is rejected** (`#ADR-014` §8).
  Formation knows no lane semantics; at HEAD the observations lane contributes 6 readings carrying 0
  attributed agents, and they cluster poorly, which is a result rather than a special case.
- **Stage 1** — builds in parallel with 62/00, 62/01, 62/02 and 62/03; no edge to any of them.
