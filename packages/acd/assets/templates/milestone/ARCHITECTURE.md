---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. Conditional (only if a non-trivial decision was made). Shared by the milestone's
  stories. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain: observable behaviour (→ task .feature files). "Returns URL ending ?tab=workflows"
  is an outcome; "we source it from the shared registry" is the ADR behind it.
-->
# NN · <Milestone Title> — Architecture Decisions

## ADR-001: <decision title>

**Status:** Accepted <!-- | Superseded by ADR-NNN | Proposed -->
**Date:** <date>

**Context.** <The forces at play — what makes this a decision, what constrains it (cite RESEARCH findings).>

**Decision.** <What we chose, stated plainly.>

**Alternatives considered.**
- <alternative> — <why rejected>

**Consequences.** <What this makes easy, hard, or impossible downstream.>

**Invariant (if any).** <A structural rule this implies, e.g. "no provider conditionals in the
machinery." Becomes a FITNESS FUNCTION below — not a Gherkin scenario.>

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     These replace "invariant-as-scenario" — they belong here, never in a task feature.

     THIS BLOCK IS THE DECLARING REGISTER, so its form is what makes it checkable. **The id stands
     ALONE in the first cell** (`FF-NN`, optionally emphasised) — an id sharing its cell with prose is
     a citation, not a declaration, and declares nothing. Then, the two rules the checks answer:

     **A declared control must resolve to a path a runner can see** — the fitness register names the arch-test's INTENDED PATH in the runnable test tree, registered in a runner; a test-shaped file under the work tree is NOT that place, and a control whose file has not landed yet carries the token `pending` in its own entry rather than being parked anywhere.

     **Cite another item's id as `m?<itemRef>/<ID>`** — the `m` prefix is optional, because both spellings are real — **and cite only ids that resolve**: a bare id is addressable only inside its own item's documents, so a cross-item citation carries the ref.

     **When you QUOTE an id that does not resolve, write it APART (`item` + `id`), never joined** — a joined specimen is not a specimen: the grammar reads it as a real citation and plants it in your own register.

     `pending` is the TOKEN, so no cell position or bullet shape is prescribed. It reports at warn
     while the item is open, and it is not admitted once the item is `done`. Every declared control
     owes a RED PROBE in the item's `VERIFICATION.md` fitness register: what was changed to make it
     fail, and the message observed.

     **Do not accept an item whose `ARCHITECTURE.md` register declares a control that does not resolve** — marker or no marker. Nothing refuses the transition for you: `aof work doctor <ref>` reports each one as `control-unresolved`, a standing `pending` marker downgrades it to `warn`, and a warn-only doctor result does not fail `aof:validate`. What clears it is landing the file or dropping the declaration, never re-marking it `pending`. -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| <FF-NN> | <e.g. zero `=== PROVIDER` branches in the machinery> | `test/arch/<name>.test.ts` (grep/AST) | ADR-001 |
| <FF-NN> | <an invariant whose guard is authored ahead of its subject> | `test/arch/<name>.test.ts` — **pending** | ADR-001 |
