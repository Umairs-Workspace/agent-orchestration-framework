---
type: story
number: 01
slug: declaration-form
title: "Declaration Form"
parent: 66
depends: []
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-16
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · Declaration Form

## User story

As ACD itself, reading the registers it asks projects to keep,
I want one machine-recognisable answer to *"is this line declaring an id, or citing one?"*,
so that a duplicate id and a citation that resolves to nothing become checkable facts at all —
for every register at once, rather than one register at a time.

<!-- This is the enabling story, and `STATE.md` names why: "the declaration form is the hard part,
     not the check". The finding measured the check at **33% precision as worded** and **100% once
     two conventions were added**, and unbuildable for two of three registers without them, because
     each register declares its entries differently (§5b). No consumer of this story ships here — the
     checks land in 66/02 — which is exactly why it is its own story and why 66/02 depends on it. -->

## Tasks

- [x] `tasks/00_the-declaration-grammar.feature` — a new leaf `src/declared-id.mjs` freezes the
      grammar, the id namespace and the register-block heading set: an id in **first position** on a
      block-level line **inside a register block** is a declaration, everything else is a citation,
      and fenced regions are skipped
- [x] `tasks/01_memory-parsers-share-the-one-home.feature` — `src/memory/local-indexing.mjs` builds
      both its `headerRe`s from the leaf instead of two inline literals, and the records it produces
      are byte-identical across the extraction

## Notes

**Read `ARCHITECTURE.md` ADR-001 before building.** This story is that ADR, and the rule is about
**position, not prefix** — which is what dissolves the finding's two false positives as *consequences*
of one rule rather than two special cases: `### D-17 is now LIVE…` in a `STATE.md` is outside a
register block, and `**Next free id is D-37.**` has the id not in first position. A reservation needs
no special case.

**ACD already owns a declaration grammar and already parses it.** `parseRetrospective`
(`src/memory/local-indexing.mjs:107`) and `parseArchitecture` (`:160`) have accepted
`#{2,3} <ID> [:·—–-]? <title>` since m05/ADR-007. Inventing a second grammar would put a **third**
copy of "what a declared id looks like" into a codebase whose umbrella debt is *"nothing has one
home"* (`TECH_DEBT.md` item 0). Writing the recogniser where it is used is precisely the outcome this
story exists to prevent.

**The memory module is the regression net, not the risk.** `src/memory/local-indexing.mjs` has **24
dependents — 2 source (`local-backend`, `graphify-backend`) and 22 test suites** (`aof graph impact`,
2026-08-15). The two source dependents consume records whose bytes must not change; the 22 suites are
an unusually strong net for a mechanical extraction, and FF-6604's differential assertion over a
frozen fixture corpus is the direct proof.

**Existing registers are grandfathered, never migrated** (ADR-001 rule 6). Nothing rewrites 47
`ARCHITECTURE.md`s or 50 `VERIFICATION.md`s. Measured today, the corpus is genuinely plural: the
`VERIFICATION.md` findings register alone is written four ways (`| F-NN` ×101, `| **F-NN` ×49,
`### F-NN` ×33, `- **F-NN` ×26), and **40 of 43** fitness tables carry no ids at all — which under this
rule declares nothing and is compliant by construction. A rule whose first act made 43 accepted
registers non-compliant would be silenced within a week; that is the finding's own C0 lesson (§5a —
ACD's own tree holds six *legitimate* control characters), applied to markdown.

**The bullet form is deliberately not admitted.** Tolerating `- **F-28 · ⛔ BLOCKER…**` is exactly the
33%-precision configuration the finding measured. It is grandfathered, and it is not what new work
uses — 66/03 ships the ask.

**This story shares no file with 66/00, 66/02 or 66/03** and starts immediately, concurrently with
them.

**Fitness functions owned here** (ADR-007 §1): **FF-6603**
`test/arch/acd-register-declaration-form.test.mjs` — set-equality against the frozen ADR-001 literals
plus five planted negatives (four drawn from measured cases, one prospective) and two positives;
**FF-6604** `test/arch/acd-declared-id-single-home.test.mjs`.
