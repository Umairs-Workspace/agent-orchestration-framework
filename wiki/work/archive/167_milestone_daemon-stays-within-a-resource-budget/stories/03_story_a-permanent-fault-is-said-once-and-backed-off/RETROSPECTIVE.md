---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 03 · A permanent fault is said once and backed off — Retrospective

## R1 — the declared write set was short again, with the lesson recalled

- **Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** architect · **Promoted to:** none
- **Raised by:** the 03 build

**What happened.** `files:` named four files. The build also touched the launcher and registry core
bindings, `assemble.mjs` (wiring `forgetNodeWorkspace`), FF-16405's arch test, and the kernels
allowlist in `yarn-installation.test.mjs`. m35/R2 was recalled and still bit. 00 and 06 had the
same gap in this milestone.

**Why.** The set was drawn from the modules the change lives in, not from their wiring (the core
bindings and the composition root) or from the controls that pin their imports.

**Lesson.** For a change to a `packages/` module, enumerate its core binding, `assemble.mjs`, and
every arch test that names the module, and put them in `files:` at refine.

**Refs:** STATE.md (167/03 build), m35/R2, 167/06 R2.

## R2 — two defects in sibling stories surfaced only here

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Promoted to:** none
- **Raised by:** the 03 build

**What happened.** 03's cases exposed 00's snapshot-order bug (167/00/R2). They also exposed a launcher
clock, injected as a function, being bound into the publisher's SQL as `published_at`. Both were
fixed at 03's close.

**Why.** A clock injected as a function was passed through to a layer that expected a value, and no
earlier case exercised that path.

**Lesson.** At a seam that crosses a layer (launcher → publisher), pass values, not providers, unless
the far side is written to call them.

**Refs:** STATE.md (167/03 build).
