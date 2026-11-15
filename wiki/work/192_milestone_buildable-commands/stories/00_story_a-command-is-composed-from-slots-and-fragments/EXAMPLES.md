---
doc: examples
---
# 192/00 · A command is composed from slots and fragments — example map
<!--
Drafted at refine's discovery beat, 2026-11-13. Every example runs on a fixture: a command `demo`
whose source carries the slot `demo.notes`, and a practice `notes` keyed on `work.notes.enabled`.
Struck because the record answers them: that only the boolean `true` turns a key on and that
every key must be on; that the machine-wide config is never asked; that an empty slot leaves no
heading, marker or "skip this" sentence; that a fragment can replace another so a practice can
ship a variant of its own beat (SPEC Scope). Relabelled technical: what the marker looks like,
where composition happens, what decides the order, and how a body is found for a runtime.
-->

## R1 · A slot holds the prose of the practices that are on, and leaves nothing behind when none is
- E1 · The project's config sets `work.notes.enabled` to `true`: the rendered `demo` command holds the fragment's lines where the marker stood, and no marker [proposed]
- E2 · The same project with no `work.notes`: the rendered command is its source without the marker line and without the blank line above it [proposed]
- E3 · The project sets `work.notes.enabled` to the string `"true"`: the practice is off, and the command renders as in E2 [proposed]

## R2 · Fragments fill a slot in a declared order, and a fragment can replace another from its own package
- E4 · Two practices are on, each with a fragment in `demo.notes`: the fragment of the contributor registered first comes first, with one blank line between them [proposed]
- E5 · A practice's fragment `replaces` another fragment of the same package and both are on: only the replacing one is rendered [proposed]
- E6 · The replacing fragment's practice is off and the replaced one's is on: the replaced one renders as if nothing replaced it [proposed]

## R3 · Each runtime is given the body written for it
- E7 · The fixture command has a Codex variant whose procedure file carries the slot: Claude and opencode hold the common body, and the Codex skill's `procedure.md` holds the Codex body [proposed]
- E8 · A fragment for a slot in an agent brief: the Codex `.toml` holds the Codex body in its developer instructions [proposed]

## R4 · What a render includes is decided by the project's own config file
- E9 · The machine-wide config sets `work.notes.enabled` to `true` and the project's file does not: the rendered command holds no fragment [proposed]
- E10 · The project turns the key on and runs `aof work update`: the command is reported `updated` and now holds the fragment; turning it off and updating again restores the first render byte for byte [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001 · What does a slot look like in a source? (The line `<!-- slot:<name> -->`, alone on its line, in two shapes: block and inline.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-001 · Where is a slot filled? (In `loadBundle`, so no reader of the bundle ever sees a marker.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-002 · What decides the order within a slot? (The contributor's place in the registries, then the member's place in its bundle fragment.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-002 · How is a body found for a runtime? (A common body, and one per runtime that renders the target from an authored variant.)
