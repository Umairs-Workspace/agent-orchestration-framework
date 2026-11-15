---
doc: examples
---
# 192/01 · A practice ships a variant of a template — example map
<!--
Drafted at refine's discovery beat, 2026-11-13. The fixture is a practice `notes`, keyed on
`work.notes.enabled`, that ships a variant of the story template's `EXAMPLES.md`.
Struck because the record answers it: that a variant is installed in place of the default when
its keys are on (SPEC Scope, "Variants of a template"). Relabelled technical: what happens when
two variants of one file are on, whether a variant is stamped, and what an update does to a
template a person edited.
-->

## R1 · A practice that is on installs its variant of a template in place of the default
- E1 · The project sets `work.notes.enabled` to `true` and updates: `.aof/templates/work/story/EXAMPLES.md` holds the variant's text under the bundle's stamp [proposed]
- E2 · The same project with the key absent: the file is the default template, byte for byte [proposed]
- E3 · The project turns the key on and updates, then turns it off and updates: the file is reported `updated` each time, and ends as the default [proposed]

## R2 · A variant that cannot be installed is refused, and nothing is written
- E4 · Two practices are on and each ships a variant of the story `EXAMPLES.md`: the update is refused, naming both variants, and no file changes [proposed]
- E5 · A variant names `story/NOTES.md`, a file the story template does not hold: the bundle does not load, and the message names the variant and its package [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-004 · What if two variants of one file are both on? (The update is refused and names both. A practice that means to supersede another's variant is a later question.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-004 · Is a variant stamped like a template? (Yes. It is rendered at the template's own path, the same way.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-004 · What does an update do to an installed template a person edited? (What it does to any managed file: a drift warning, and the file is kept.)
