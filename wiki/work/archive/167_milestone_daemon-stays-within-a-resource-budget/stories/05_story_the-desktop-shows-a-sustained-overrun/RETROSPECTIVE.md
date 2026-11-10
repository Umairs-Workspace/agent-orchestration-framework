---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 05 · The desktop shows a sustained overrun — Retrospective

## R1 — the footer would have shown an overrun over the error state

- **Kind:** near-miss · **Area:** contract (design) · **Stage:** build (review) · **Owner:** designer · **Promoted to:** none
- **Raised by:** the 05 review

**What happened.** The footer showed any notice, even while the window rendered `error`. An overrun
would have stood over the error footer, which DESIGN.md's checklist says it never does. `notice()`
now drops the overrun in the error state, and the exit notice is unchanged.

**Why.** The precedence was built between the two notices (exit outranks overrun), not between a
notice and the render state.

**Lesson.** When a design states a precedence, test every pair it implies, including against the
render states, not only between the new notice and the old one.

**Refs:** STATE.md (167/05 build), DESIGN.md binding checklist.

## R2 — the app crate's lockfile is not the workspace's

- **Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** architect · **Promoted to:** none
- **Raised by:** the 05 build

**What happened.** `files:` named `apps/desktop/Cargo.lock`. The app crate sits outside the
workspace and keeps its own `crates/app/Cargo.lock`, which is the one that moved. `main.rs` was
outside `files:` as well.

**Why.** The write set assumed one Cargo workspace for the desktop crates.

**Lesson.** For a Rust change, check which lockfile the crate's `cargo` resolves before naming it.

**Refs:** STATE.md (167/05 build).
