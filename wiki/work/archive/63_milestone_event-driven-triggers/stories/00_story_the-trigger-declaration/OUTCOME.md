# 00 · The trigger declaration — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A reviewable trigger declaration at `.aof/triggers.jsonc`
Which signal may wake which scope at which level is one JSONC file in the repository, installed from `src/bundle/triggers.jsonc` through the existing hashed, drift-protected bundle path and byte-identical to its source.

### One compiler, and no partially-compiled set
`src/work-trigger/declaration.mjs` is the only module that parses the declaration; a member that fails validation raises a coded refusal and the whole compile refuses, so no trigger set is ever returned with a member silently skipped.

### The cadence grammar is imported rather than copied
`parseCadence` is an additive **function** export from `src/work-loops.mjs`; the trigger family authors no cadence regex, duration-unit table or `periodic:`/`event:` literal of its own, and `src/work-loops.mjs` still exports eleven frozen sets.

### A trigger faster than the loop it wakes is a computable contradiction
A trigger and the loop-registry entry it points at are compared on the operands the parsed cadence already carries (`ms` for a duration, `scopeRank` for an ordinal), and the faster trigger is reported by name.

### Every `.aof/**` bundle asset is line-ending pinned by a ratchet
`.gitattributes` pins `.aof/**/*.jsonc text eol=lf`, and the pin is asserted from the bundle's own asset list rather than a hand-kept path list, so the next `.aof/` declaration cannot arrive unpinned.

## Assumptions

- **The bundle install path is the only writer of `.aof/triggers.jsonc`** — byte-identity between the shipped source and the installed copy holds because `aof work update` is the sole route by which the installed file changes.
- **`parseCadence`'s answers are byte-unchanged** — the cadence contradiction check is only as good as the loader's grammar, which this story exports rather than reimplements.
