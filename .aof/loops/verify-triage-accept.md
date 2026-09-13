---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: loop:verify-triage-accept
kind: loop
title: Verify, triage, and accept an item
controlled: findings triaged and item accepted
reference: [prose:src/bundle/commands/verify.md]
measurement: [prose:src/bundle/commands/verify.md]
actuator: [prose:src/bundle/agents/aof-developer.md, prose:src/bundle/agents/aof-qa.md, prose:src/bundle/agents/aof-product-owner.md]
cadence: event:per-item
ceiling: none
owner: actor:product-owner
optimizing: false
layer: management
---
# Verify, triage, and accept

Framework record source: `src/bundle/loops/verify-triage-accept.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

The controlled state, acceptance reference, and automated/manual/human measurement lanes are defined
at `src/bundle/commands/verify.md:64-93` and summarized in RESEARCH §Q1.3. The authorities are prompt
judgments rather than deterministic exported graders, so the reference and measurement remain `prose:`.

The narrowest acting artifacts are the developer, QA, and product-owner agent definitions: verify sends
executable/manual work to the developer at `src/bundle/commands/verify.md:69-71`, QA and human acceptance
through QA at `src/bundle/commands/verify.md:84-86`, and finding triage to the product owner at
`src/bundle/commands/verify.md:92`. Those acts are represented by the corresponding files under
`src/bundle/agents/`, not by the orchestration prompt.

The item argument at `src/bundle/commands/verify.md:3` establishes `event:per-item`. A triggered pass is
a terminal gate and terminates by construction, so its ceiling is `none`. The product owner is the one
explicit owner RESEARCH found (`src/bundle/commands/verify.md:92`). `optimizing: false` records a
regulator: this gate holds acceptance evidence at its reference rather than iteratively changing work to
minimize findings. That is the boundary from review-fix-rereview even though both inspect findings.

**`layer: management`, corroborated by its own cadence.** The trigger is `event:per-item`, whose
scope is one item, and the layer declared here is the one that scope implies. It is an ordinal on a
second axis and no interval is derived from it.

**Its reference is set by `actor:product-owner`, and that edge was DISCOVERED.** The product owner's
record declares it and names the artifact it was read from: the triage step the verify command
assigns to the product owner. This is also the one loop where the two ownership claims meet —
`owner: actor:product-owner` names the role accountable for the loop, and the same actor declares
the target-setting edge to it. The two are different facts and they are required to agree; they do.
