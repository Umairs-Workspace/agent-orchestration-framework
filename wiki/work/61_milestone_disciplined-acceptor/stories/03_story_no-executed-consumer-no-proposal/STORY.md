---
type: story
number: 03
slug: no-executed-consumer-no-proposal
title: "No executed consumer, no proposal — a bound nothing acts on may not be tuned"
parent: 61
status: done
owner: product-owner
created: 2026-08-30
updated: 2026-08-31
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-008, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-009, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012, test/arch/acd-progress-ledger-consumed.test.mjs, src/loop-bounds.mjs, src/agent-session-driver.mjs, src/bundle/loops/speed-thoroughness-autonomy.md, src/bundle/commands/continue.md, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/work-acceptor/admissibility.mjs, test/arch/acd-progress-ledger-consumed.test.mjs, test/arch/acd-tunable-set-is-the-registry.test.mjs, test/acceptor-admissibility.test.mjs, scripts/test.mjs]
---
# 03 · No executed consumer, no proposal

## User story

As the operator who does not want to pay for evidence about a number nothing reads,
I want a proposal on a knob whose value never reaches a decision refused before any evidence is
gathered,
so that a whole class of proposals leaves the multiple-testing stream entirely — because for a knob
nothing acts on, the null hypothesis is exactly true, and every commit it could ever produce is
false.

This is the cheapest control in the milestone and the highest-value one, and the wording is the whole
control. A check written on *readers* finds live readers for all three knobs and refuses none of
them: two of the three are resolved on paths that demonstrably execute, and then thrown away without
reaching any decision. A check written on *consumers* — a resolved value that actually reaches a
decision — refuses all three at HEAD, which is the correct answer and an uncomfortable one.

There is an honest limit to state rather than paper over. The path that built every delivered item is
a prompt, and a prompt names no configuration key at all, so for that harness the question is not
statically decidable. The implementable form is therefore fail-closed: while the harness is a prompt,
every proposal is refused. That is a switch rather than a discriminating control, and saying so is
part of shipping it.

## Tasks

- [ ] `tasks/00_a-bound-nothing-consumes-refuses-its-proposal.feature` — a bound that resolves but whose value reaches no decision refuses every proposal on it, and the refusal names the bound
- [ ] `tasks/01_the-check-is-fail-closed-while-the-harness-is-a-prompt.feature` — where consumption cannot be decided, the answer is refusal rather than a guess, and the report says which condition it fell back on
- [ ] `tasks/02_the-tunable-set-is-the-registrys.feature` — what may be proposed at all comes from the registry's own declaration, so a knob cannot be tuned by being added to a list this machinery writes

## Notes

- **This EXTENDS an existing guard rather than adding a sibling** (`ARCHITECTURE.md#ADR-008` §1).
  This is the third recorded instance of the species "a declared bound resolves but nothing consumes
  it" — it wants a ratchet, not another one-off — and the existing guard's own header already states
  this exact residue. Because it extends a guard already in service, the red probe is the only
  evidence the change is armed.
- **The wording is `consumer`, never `reader`** (`ARCHITECTURE.md#ADR-008` §2). On the reader wording
  the check refuses nothing, which is how this defect survived twice already.
- **Refusing all three knobs at HEAD is the correct answer**, not a bug to be tuned around
  (`ARCHITECTURE.md#ADR-008` §3).
- **Stage 1** — builds in parallel with 61/00, 61/01 and 61/02.
