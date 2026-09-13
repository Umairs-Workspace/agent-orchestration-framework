# 01 · The level is a ceiling, not an admission — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A declared level is a ceiling request re-decided at every fire
`src/work-trigger/level.mjs` resolves a trigger's declared level by importing `resolveLoopLevel` and `resolveLoopLevelGate` from `src/work-loop.mjs` and being **handed** the two gate facts; the same trigger resolved twice across moved gate facts gives two different answers within one process, and no compiled trigger carries an admission verdict.

### A refused level is refused by name, never downgraded
A declared level that fails its gate resolves to a coded refusal naming the failing half — the score with its failing check ids, or the components that came back `self-referential` or `stale` — and the resolved set contains no entry for that trigger at any level, so a downgrade cannot hide as a successful resolution one rung lower.

### An absent level and a refused level are different answers
An absent level takes the loop's own default; a declared level that fails takes nothing. The two are never rendered as the same outcome, and a gate fact never **supplied** is its own coded refusal naming which one was missing, distinct from a fact that **failed**.

### Admission stays in one home
The leaf holds no score threshold, no `100`, no groundedness predicate, no component-state literal and no level literal beyond what it imports; it performs no filesystem read and no `invoke`, so it computes nothing the loop's own gate would have to agree with.

## Assumptions

- **`resolveLoopLevelGate` remains the single admission authority** — this leaf is a pre-flight; `src/commands/loop.mjs` still gates again at fire time, and the two can only agree because one imports the other.
