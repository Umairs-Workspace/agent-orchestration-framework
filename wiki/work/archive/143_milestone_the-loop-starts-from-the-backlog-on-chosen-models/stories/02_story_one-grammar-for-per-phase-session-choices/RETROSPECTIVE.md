---
doc: retrospective
updated: 2026-10-03
---
# 02 · One grammar for per-phase session choices — Retrospective

## R1 — a blank model parsed, then fell back to config without a word

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer
- **Raised by:** the independent reviewer

**What happened.** `--model verify=  ` parsed as "no model", and the resolver then fell back to the
configured model. That is the silent wrong-model run this grammar exists to prevent. It now refuses
`session-choice-empty`, unless an effort suffix makes it effort-only.

**Why.** The case matrix covered unknown values but not an empty one.

**Lesson.** A parser whose job is to refuse rather than guess gets an empty-value row for every
part it reads.

## R2 — the defect the grammar fixed was also in two other parsers

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer
- **Raised by:** the independent reviewer

**What happened.** `split("=", 2)` drops everything after a second `=` in an inline value. The
reviewer found the same call in `knowledge/src/memory.mjs` and `mesh/src/commands/session.mjs`, which
parse argv by hand. Both were fixed. Moving them onto `parseSpecArgv` is a story of its own.

**Lesson.** When fixing a parsing defect, grep for the same idiom across the tree before closing it.

**Refs:** F-143-04.
