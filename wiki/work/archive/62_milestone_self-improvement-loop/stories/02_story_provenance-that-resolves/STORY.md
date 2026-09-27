---
type: story
number: 02
slug: provenance-that-resolves
title: "Provenance that resolves — which traces, which runs, which findings, checked against disk at emit time"
parent: 62
status: done
owner: product-owner
created: 2026-08-31
updated: 2026-09-01
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-006, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-007, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-010, wiki/work/14_milestone_aof-digest/ARCHITECTURE.md#ADR-001, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-011, wiki/work/66_milestone_controls-that-run/ARCHITECTURE.md#ADR-008, src/declared-id.mjs, src/work-doctor-controls.mjs, src/work-doctor.mjs, src/work-read.mjs, src/work-ref-scope.mjs, test/arch/acd-declared-id-single-home.test.mjs, test/arch/acd-no-staged-control.test.mjs, wiki/work/TECH_DEBT.md, scripts/test.mjs]
files: [src/work-tune/provenance.mjs, src/work-doctor-controls.mjs, test/arch/acd-proposal-provenance-resolves.test.mjs, test/work-doctor-controls.test.mjs, test/tune-provenance.test.mjs, scripts/test.mjs]
---
# 02 · Provenance that resolves

## User story

As the reviewer deciding whether a harness-change proposal has earned my attention,
I want every claim it makes about the past to point at something I can open,
so that a proposal is falsifiable by reading rather than persuasive by assertion.

This repository has already measured what happens when citations are written and never read.
TECH_DEBT item 68 records that nothing reads the `<path>:<line>` citations the loop registry is built
on and that **nine of them are wrong** — and its own status note records the count got *worse* after
the fix was scheduled. Every one of those nine is well-formed. Well-formedness is therefore not the
test; existence is. A citation resolves when the file is on disk and, where a line is given, when the
file has that line; an id citation resolves when the ref names an item on disk and the id is declared
in that item's documents.

The failure this story exists to prevent is quieter than a wrong citation, though. It is the proposal
that is *silently dropped* because one of its citations did not resolve — which hides a defect in the
proposer behind an output that looks merely modest. So there is a third answer: an unresolvable
citation **demotes** its proposal out of the emitted set and into `findings`, with the failing citation
named. Nothing disappears. That is the same move 59/ADR-004 §1a makes for a sweep that read nothing,
and the same instinct 14/ADR-001 encodes for the digest — a record *summarises and points*, and the
pointer is the part that must be true.

Neither citation grammar is written here — and at the Three Amigos pass it turned out that neither
could be *reached* either. The extractor the architecture first named, `controlPathsIn`, filters every
match through `isControlFileName`, so a `RETROSPECTIVE.md:150` citation is dropped on the way out; and
`normalizeCitedPath` strips the locator, so the line a citation names never survives. That filter is
deliberate and stays — a *control* citation and a *provenance* citation are different questions asked of
one grammar. So this story separates the grammar from the predicate at the home that holds both
(`ARCHITECTURE.md#ADR-011`), which is 66/ADR-008 ruling 2's move one level over, and it is the
milestone's single sole-writer exception. The document form is read through
`normalizeCitedPath`/`controlPathsIn` and the qualified-ref form through `qualifiedRefsIn`/
`QUALIFIED_REF`, both from the homes that already own them. 66/FF-6604 already refuses a second copy
of the heading grammar anywhere in `src/`; this story extends the same discipline to the citation
grammar by importing rather than restating. Purity is not worth a fourth copy of a pattern.

## Tasks

- [x] `tasks/00_a-citation-resolves-or-it-does-not.feature` — a document citation is checked for the file and, where given, the line; an id citation is checked for the item and the declaration
- [x] `tasks/01_an-unresolvable-citation-demotes-its-proposal.feature` — the proposal leaves the emitted set, appears in findings with the failing citation named, and appears in neither place twice
- [x] `tasks/02_the-grammars-come-from-their-homes.feature` — both citation forms are read through the modules that already own them, so a change to either grammar reaches this reader with nothing edited here
- [x] `tasks/03_provenance-is-a-set-over-documents.feature` — a proposal's provenance is counted in distinct source documents, so two lines of one retrospective are one source and not two

## Notes

- **Well-formed is not resolved** (`ARCHITECTURE.md#ADR-006` §2). TECH_DEBT item 68's nine wrong
  citations are all well-formed; existence checked at emit time is the whole control.
- **Demote, never drop** (`ARCHITECTURE.md#ADR-006` §3). Dropping hides a defect in the proposer;
  emitting puts an unfalsifiable claim in front of a reader; the finding is the honest third answer.
- **Both grammars are imported** (`ARCHITECTURE.md#ADR-006` §1, as amended by `#ADR-011` §1): the
  new `pathCitationsIn` / `splitPathLocator` from `src/work-doctor-controls.mjs`, and
  `qualifiedRefsIn` / `QUALIFIED_REF` from `src/declared-id.mjs`. A re-home reaching only one half is
  the failure 66/FF-6604's own history records.
- **The two new exports are ADDITIVE and `controlPathsIn` must come out BYTE-UNCHANGED**
  (`#ADR-011` §1, §3). That module has 16 importers and the doctor's control lane depends on it; the
  self-comparison over every register in `wiki/work` is what makes the edit safe to review, and it is
  the only evidence the split broke nothing.
- **The re-home to `src/declared-id.mjs` is NOT taken here** (`#ADR-011` §4) and is owed as debt; the
  trigger is a third consumer of the path grammar.
- **Two lanes of ordering are settled** (`#ADR-012` §11, §12): an id citation and a path citation on
  one document are ONE source for the floor, and demotion outranks the floor except where there is no
  citation to demote.
- **The evidence floor is two distinct source documents** (`ARCHITECTURE.md#ADR-007` §4), and it is
  **not** 61's `N`: `N = 8` is what it takes to *commit* a change, and a proposal is not a commit. The
  two numbers are reported side by side with their own names so no reader conflates them.
- **An id citation is QUALIFIED ONLY; the bare-id form is DROPPED** (`#ADR-013` §3). No exported
  bare-id *citation* extractor exists — `qualifiedRefsIn` matches `m?<itemRef>/<ID>` and
  `declaredIdOn` recognises a declaration at a heading or table row, not a citation in prose — so the
  bare form was unimplementable without authoring the pattern FF-6204 forbids. It is also the better
  rule: a bare id is addressable only inside its own item, and a provenance citation is read outside
  every item. 62 constructs its citations from records it read out of a known item, so it can always
  emit the qualified form.
- **A test that needs mutated source reads a COPY** (`#ADR-013` §10) — temp directory, rewritten
  copy, `import()` of the copy. This story and 62/00 build in parallel in one worktree, and both want
  to rewrite shared modules; 61/R5 is what that costs when it is done in place.
- **Stage 1** — builds in parallel with 62/00, 62/01, 62/03 and 62/05; no edge to any of them.
- **The corpus-wide claim moved to `FF-6208`** (`#ADR-013` §7): FF-6204 proves resolution, demotion
  and the two-document count over planted candidates, which this story can clear on its own.
