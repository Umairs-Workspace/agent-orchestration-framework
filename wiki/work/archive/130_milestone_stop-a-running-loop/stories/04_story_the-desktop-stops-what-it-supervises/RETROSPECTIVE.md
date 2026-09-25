---
type: story
doc: retrospective
number: 04
slug: the-desktop-stops-what-it-supervises
parent: 130
title: "Retrospective — the desktop stops what it supervises"
created: 2026-09-24
updated: 2026-09-24
---
# 130/04 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced, never
restated (`../../VERIFICATION.md`).

## R1 — "Not a regression" in an ADR is a claim to measure, not a reason to skip

- **Kind:** defect · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** m130/F-02

**What happened.** ADR-004 §6 read "a foreground `--supervised` loop already yields a row the desktop
starts a controller for — 126's design, not a regression". Measured at 130/06, that controller was a
relaunch that walled on the foreground loop's own run every time, so the desktop could never stop a
loop it had not started — which is how every live loop on this machine was started. ADR-007 fixed it.

**Lesson.** When an ADR waves off an interaction as pre-existing, the story that ships next to it
should carry one scenario exercising that interaction end to end; the waiver is where the defect hid.

## R2 — A write set with Rust or desktop UI has no impacted scope

- **Kind:** process · **Area:** tests · **Stage:** build · **Owner:** developer · **Raised by:** 130/04 build

**What happened.** `aof test --scope impacted --story 130/04` widened every `.rs` and `app.js` path to
the full suite and launched it at once, against the live `:4182` daemon; it was killed within a minute.

**Lesson.** For a story whose `files:` names paths outside the JS import graph, run
`scripts/test.mjs --only` over the JS suites plus `cargo test`; `--story` should refuse rather than widen.
