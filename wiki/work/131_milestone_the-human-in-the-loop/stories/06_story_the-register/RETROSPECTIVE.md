---
type: story
doc: retrospective
number: 06
parent: 131
slug: the-register
title: "Retrospective — the register"
created: 2026-09-25
updated: 2026-09-25
---
# 131/06 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — A probe whose mutation a backstop absorbs needs a leg upstream of the backstop

- **Kind:** insight · **Area:** testing · **Stage:** build · **Owner:** architect · **Raised by:** 06's red-probe run

FF-13106's register probe, "log the URL in the failure degrade", left a fixture-only control green.
`degrade()`'s redaction pass stripped the URL before the fixture could see it. The control gained a
structural degrade-message leg, and that is the leg the probe reds.

**Lesson.** When a control's probe mutates a value that a later layer sanitises, the control
asserts at the mutation's own site as well as at the output. Otherwise the probe proves the
backstop, not the rule.

**Refs:** VERIFICATION FF-13106's register row.

## R2 — Probe scripts over CRLF subjects must honour the line ending

- **Kind:** near-miss · **Area:** tooling · **Stage:** build · **Owner:** developer · **Raised by:** 06's red-probe run

Three probe subjects (`run-store.mjs`, `wave.mjs`, `board-ui.mjs`) are CRLF. A probe script that
matches `\n`-only text fails to apply its mutation and reports nothing, which reads as a green
control. The subjects carried uncommitted 01–05 work, so each was restored from memory, not
with `git checkout`, and a sha1 check confirmed each was byte-identical.

**Lesson.** A probe asserts that its mutation applied (the subject's hash changed) before it reads
the control's result, and it restores against a recorded hash.

**Refs:** STATE `(continue 131/06)` (3).
