---
type: story
number: 05
slug: the-desktop-shows-a-sustained-overrun
title: "The desktop shows a sustained overrun — the supervisor samples each daemon's CPU from the OS, and a daemon over budget for long enough is shown in the tray and the window footer and logged, never killed"
parent: 167
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [00, 02]
reads: [wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-006, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-002, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/DESIGN.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/05_story_the-desktop-shows-a-sustained-overrun/EXAMPLES.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/05_story_the-desktop-shows-a-sustained-overrun/PLAN.md, packages/mesh/src/commands/identity.mjs, packages/foundation/src/degrade.mjs, apps/desktop/crates/core/src/poll.rs, apps/desktop/crates/core/src/supervision.rs, apps/desktop/crates/app/src/main.rs, apps/desktop/ui/app.js, test/arch/ui/acd-desktop-trusted-spawn.test.mjs, test/arch/ui/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
files: [apps/desktop/crates/core/src/guard.rs, apps/desktop/crates/core/src/lib.rs, apps/desktop/crates/core/src/status.rs, apps/desktop/crates/core/src/icon.rs, apps/desktop/crates/app/src/supervisor.rs, apps/desktop/crates/app/src/cpu_sample.rs, apps/desktop/crates/app/Cargo.toml, apps/desktop/Cargo.lock, test/arch/ui/acd-desktop-guard-never-kills.test.mjs, test/arch/ui/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 05 · The desktop shows a sustained overrun

## User story

As **the operator, whose desktop app supervised a daemon burning a core for 17 hours and showed
a healthy tray the whole time**,
I want **the app to watch its daemons' CPU from outside, and to tell me, in the tray and the
window, when one has been over budget for long enough to matter**,
so that **a runaway daemon is something I see the same day, with what it is spending its time on,
and decide about myself. The app never kills it behind my back, and a short spike from a big
sync does not cry wolf.**

## Tasks

- [x] [00 · The guard judges a sustained overrun from the OS's own sample](tasks/00_the-guard-judges-a-sustained-overrun.feature)
- [x] [01 · An overrun is shown and logged, never acted on](tasks/01_an-overrun-is-shown-and-logged.feature)

## Notes

- **The sample** (ADR-006) is the OS's cumulative CPU time per child, read by its process handle
  each 3 s poll tick, behind a trait in `cpu_sample.rs`. The judgement is pure in the core crate's
  `guard.rs`, tested over fake samples.
- **The budget is handed in** by the `cost` block `status.rs` already parses from `mesh status
  --json`. A `not-reporting` daemon is judged against the viewer-open budget. No budget literal
  lives in Rust (FF-16702, which 00 lands, and which this story keeps green).
- **Sustained means 5 minutes** over budget (Q1, answered 2026-10-20). There is no mock (Q2):
  DESIGN.md's binding checklist is the source of truth, including the footer's exact wording.
- **Shown** in the tray's existing `degraded` state and the footer's one notice slot. A standing
  exit notice outranks it. **Logged** as one JSON line entering and one leaving, to the shared
  degrade log, with `proc: "desktop"`.
- **Never kills** (FF-16704).
- **`windows-sys` 0.61.2** is already in the lockfile. Declaring it directly adds no package, and
  the supply-chain audit confirms that.
- It follows 02 only because both write the `test/arch/ui` budget row.

## Accept decision

2026-10-22 — **ACCEPTED** by `aof:verify 167`. `cargo test` over the core crate passes (132,
every guard scenario a case), `cargo check` on the app crate is clean, and the supply-chain audit
reports 0 warnings. FF-16704 is green with a recorded red probe. Design conformance is INCONCLUSIVE:
the surface declares no `Route`. `aof work validate 167/05` passes, and doctor reports no
`control-unresolved`. No `@manual` or `@uat` scope. F-08 (no live overrun observed) is a
non-blocking OUTCOME gap for the operator. Evidence is in the parent `VERIFICATION.md`.
