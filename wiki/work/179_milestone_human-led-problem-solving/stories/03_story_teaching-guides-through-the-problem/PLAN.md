# 179/03 · Build brief

## Mechanism

Write `vocabulary.mjs` first: three frozen arrays, `TRAPS` as `{ trap, control }`. Then write the
guidance section of `teach.md` in plain prose that uses each entry's exact words, in this order:
grounding (what the session reads), thinking first (restate, predict, propose, each skippable), the
help ladder (pulled, labelled, one question at a time, rung 1 per task), the stage map (navigable,
never approvals), and the traps (taught through their controls, never as labels).

The FF-17903 arch test reads the arrays and the prompt file, and fails on any missing entry. The
"no other asset names Forming or Dislodging" leg walks the core bundle's assets and every
contributor's.

## Known traps

- Don't paste the arrays into the prompt as a list for the parity test's sake; it has to read as
  teaching, not as a schema.
- "Implement" is a stage name and a common word, so the parity check matches the stage phrase as a
  whole, not single words.

## Verification

`aof test --scope impacted --story 179/03` green, then read the rendered
`.claude/commands/aof/teach.md` end to end as a learner would and check it asks before it tells.

## Out of scope

Understanding checks and pilots (milestone 180); any change to `manual.md`.
