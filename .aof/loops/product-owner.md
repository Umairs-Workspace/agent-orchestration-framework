---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: actor:product-owner
kind: actor
title: Product owner
target-setting: [loop:verify-triage-accept]
---
# Product owner

Framework record source: `src/bundle/loops/product-owner.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

This is an agent role, represented as `actor:product-owner`, not exogenous contact with reality; that is
why the actor schema carries no `ground` key here (ADR-005 §1). Its title names the role used by the
verification process.

**`loop:verify-triage-accept` — DISCOVERED, and the artifact it was read from is cited.** The product
owner triages verification findings at `src/bundle/commands/verify.md:112-113`, and verify-triage-accept
is the only day-one loop with that named owner (RESEARCH §Q1.3). That artifact states the relation, so
this edge is read off the repository rather than decided here. It defends the single `target-setting`
endpoint `loop:verify-triage-accept`. No second target or other edge type is declared because the
repository supplies no further cited relation.
