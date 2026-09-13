---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: anchor:run-lifecycle-policy
kind: anchor
title: Run lifecycle policy
ground: frozen-rule
observes: module:src/run-store.mjs#isLegalTransition
target-setting: [loop:run-resilience]
---
# Run lifecycle policy

Framework record source: `src/bundle/loops/run-lifecycle-policy.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

**This edge is AUTHORED, not discovered — it is milestone 58's judgment and no citation is offered
for it.** RESEARCH §Q1.5 opened `src/run-store.mjs` and found that `loop:run-resilience`'s reference
is the closed transition and retry rules the code fixes, and that *nobody sets it at runtime*: no
actor, no command and no configuration key determines which state may follow which. There is no
artifact in this repository that declares who sets that loop's reference, so no artifact is cited
here for the relation. What ADR-001 §1 decided instead is that a reference no cycle revises is
carried by an anchor whose `ground:` is `frozen-rule`, because only a frozen rule is an authority
that by definition no cycle revises — and 55 shipped that vocabulary without ever instantiating it.
Inventing a supervising loop or a "code maintainer" actor for this reference would have been the
fabrication the registry has refused since it shipped.

**The rule itself is a fact, and it is the one thing here that is cited.** The authority this anchor
observes is the defining export `isLegalTransition` at `src/run-store.mjs:281`, whose sibling
`isRetryable` at `src/run-store.mjs:312` closes the retry half of the same policy; `shouldRetry` at
`src/run-store.mjs:325` combines that classification with the attempt ceiling. Those sets are
literals in source. The record points at the authority and restates none of its members, exactly as
`loop:run-resilience` does on its own reference axis. The distinction this record turns on is
therefore narrow and deliberate: *what the reference is* is discovered and cited; *that this anchor
is the node which sets it* is authored.

**No `data-feed` edge is declared.** `anchor:run-liveness` already carries the observation edge into
`loop:run-resilience`; this anchor supplies an authority, not a reading, and an extra edge added to
improve a groundedness verdict is the catch-all ADR-001 refuses in advance. `ground: frozen-rule` is
the honest class: this authority is neither a process exit, a build stamp, a landed commit, a live
soak, nor exogenous human contact — it is a rule fixed in code, and its only revision path is a
source change reviewed as source.
