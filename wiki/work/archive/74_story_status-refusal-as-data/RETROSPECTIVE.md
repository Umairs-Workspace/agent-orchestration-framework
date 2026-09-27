---
type: story
doc: retrospective
number: 74
slug: status-refusal-as-data
title: "Retrospective — a refused status move is data, not a failure"
created: 2026-08-20
updated: 2026-08-20
---
# 74 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson.

## R1 — When a prompt has to tell an agent to ignore a failure, the interface is the defect

This whole story existed because one sentence of prose stood between an unattended run and a spurious
failure: the phase door treated a refused status move as data, the write door threw, and `continue.md`
covered the gap by telling the agent to carry on past a non-zero exit. That instruction was correct,
and it was also training agents to discount a channel whose OTHER codes (`ref-not-found`,
`invalid-status`, `item-not-local`) mean stop and look. **A workaround written into a prompt is a
design note about the interface: the fix belongs at the door, not in the reader.** The test of the fix
is that the prose could be DELETED rather than qualified — and `refine.md`'s "nothing to fix" sentence
was, replaced by a flag, while `continue.md` was free to invert the habit into "a non-zero exit from a
work verb is a stop signal, always."

## R2 — Narrowing an error channel is only honest if the thing you narrow is the thing you mean

`--if-applicable` could not be added safely until the three doc-shape faults stopped wearing the
lifecycle refusal's code, because a flag that swallows `status-edge-not-applicable` would have
swallowed a malformed record doc with it — the fault F-73-G had already shown being absorbed once, as
the run-mint reactor's sanctioned no-op. The sequencing was the design: give the DOCUMENT's fault its
own code at the one place that detects it, then narrow. **Before making any refusal quieter, enumerate
everything that currently arrives under that code. If the set is wider than the sentence you are
about to write, the re-coding comes first and the quieting comes second** — and the re-coding pays for
itself at both callers, not just the one you were looking at.

## R3 — A contract can cite an identifier the system has stopped using

Task 00's Examples name `no-local-checkout`; the write door has raised `item-not-local` since
m43/ADR-010 R6.4, while the phase door still reports the old spelling. The developer built to the
REQUIREMENT (that refusal still fails under the flag and writes nothing), asserted the code the system
actually raises, left the delivered `.feature` unedited, and raised it for the accepting item —
which is exactly right, and is why it survived to become F-74-A instead of quietly becoming either a
bent implementation or an edited contract. **A delivered acceptance criterion is immutable, so a stale
citation inside one has exactly three honest moves: build to the requirement, assert reality, record
the divergence in the accepting record.** The residue worth fixing is not the string — it is that one
refusal has two spellings across two doors.

## R4 — A gate nobody can run is not a gate

Two `src/work.mjs` ratchets from m66/00 — shrink-only line count, frozen export set — have been RED
since story 73 landed a whole commit ago, and nothing surfaced them, because the full suite cannot be
run on this machine (it binds a port the live control daemon holds) and story-scoped verification
never selects them. They were found here only because the sweep was widened by IMPORTER rather than by
name. **Scoped verification has a blind spot with a shape: everything that guards a module you changed
but that no lane you selected imports. Select by "who imports what I touched", not by "what looks
related" — and when the full suite is unrunnable, say so in the record instead of letting the words
"tests green" imply it ran.**

## R5 — A byte-comparing guard must own the bytes, line endings included

`.gitattributes` pins LF on `src/bundle/**` — the bytes the manifest hashes — but not on the RENDERED
`.claude/**`, `.codex/**`, `.opencode/**` trees that are compared against those hashes. With
`core.autocrlf=true`, a fresh checkout therefore hands the comparator CRLF for content that is
otherwise identical, all 59 members classify drift-warning, and a plain `aof work update` KEEPS the
stale file — so a bundle fix silently never lands and needs `--force` to render at all. **Whenever a
guard compares bytes, ask which working-tree transformations sit between the writer and the
comparator; EOL is the one that costs nothing to pin and is invisible until it isn't.** The pin was
already applied six times in this repo for exactly this reason — to the source tree, and not to the
tree rendered from it.
