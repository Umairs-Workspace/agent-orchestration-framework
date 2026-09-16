---
type: story
number: 03
slug: the-supervisor-reconciles-a-supplied-set
title: "The supervisor reconciles a supplied set — declarations arrive from the poll, actual is made to match declared, and Rust learns no completion semantics"
parent: 126
depends: [02]
status: done
owner: product-owner
created: 2026-09-08
updated: 2026-09-10
adrs: [ADR-005, ADR-006]
reads:
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-005
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-006
  - wiki/work/36_milestone_mesh-desktop-app/ARCHITECTURE.md#ADR-002
  - wiki/work/36_milestone_mesh-desktop-app/ARCHITECTURE.md#ADR-004
  - app/desktop/Cargo.toml
  - app/desktop/crates/app/Cargo.toml
  - app/desktop/crates/core/src/lib.rs
  - app/desktop/crates/core/src/resolve.rs
  - app/desktop/crates/core/src/render_state.rs
  - app/desktop/crates/core/src/tray_menu.rs
  - app/desktop/crates/core/src/view_model.rs
  - src/commands/mesh/identity.mjs
  - src/loop-argv.mjs
  - src/run-store.mjs
  - scripts/test.mjs
  - test/arch/ui/acd-desktop-no-mesh-logic.test.mjs
  - test/arch/ui/acd-desktop-single-data-path.test.mjs
  - test/arch/ui/acd-desktop-trusted-spawn.test.mjs
files:
  - app/desktop/crates/core/src/supervision.rs
  - app/desktop/crates/core/src/poll.rs
  - app/desktop/crates/core/src/status.rs
  - app/desktop/crates/core/src/resolve.rs
  - app/desktop/crates/app/src/supervisor.rs
  - app/desktop/crates/app/src/main.rs
  - test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs
  - test/arch/ui/acd-desktop-read-only-fleet.test.mjs
  - test/arch/ui/index.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · The supervisor reconciles a supplied set

## User story

As **an operator whose desktop supervisor is already keeping two mesh daemons alive**,
I want **it to keep my supervised declarations alive the same way — reading which ones should be
running from the poll it already makes, starting what is declared and not running, stopping what is
running and no longer declared, and leaving alone anything I have started or stopped by hand**,
so that **work I declared resumes when the machine comes back without the supervisor ever learning
what a loop is, and a loop that stopped for a reason is not restarted into the same wall**.

The engine is reused verbatim — the watchdog, the jittered backoff, the crash-versus-clean-exit
classification, the Job Object. What changes is the shape of the set: `SupervisedChild` becomes
owned and carries a working directory, the two fixed signals become a map keyed by declaration id,
and the controllers are created and retired by a **pure reconcile plan in the core crate** that a
tick applies. A loop that exits 0 is simply not listed next tick; if it is listed, starting it is
right. Two things surface where the operator can see them: a fourth named clean exit for the store's
`duplicate-run` refusal, and a halted loop's last line through the notice the desktop window's
footer already shows (`last_clean_exit` → the view-model's `notice`; the tray menu never carried it).

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-declaration-is-an-owned-child-with-a-cwd.feature` — `SupervisedChild` gains an
      id, owned strings and an optional `cwd`; the two daemons keep their constructors; the poll
      parses `declarations` additively and ignores its absence
- [x] `tasks/01_the-reconcile-is-a-pure-plan.feature` — rows plus live controllers in, start/stop/
      retain out; an exited child whose row persists is started again; a held declaration is
      neither started nor stopped by a tick; `cargo test` runs it in the core crate
- [x] `tasks/02_the-poll-supplies-the-set-every-tenth-tick.feature` — one interval, one spawn, the
      flag every tenth tick; the role latch stays for the two daemons; every declaration spawn
      resolves the co-located `aof`, passes a shell-less argv and sets the row's `cwd`
- [x] `tasks/03_a-held-declaration-and-a-halted-loop-are-both-visible.feature` — operator Start/Stop
      is a hold by id; `duplicate-run` is the fourth named clean exit; an exit-0 child's last line
      surfaces through `last_clean_exit`; the spawn roster is an allow-list of exactly four
- [ ] `tasks/04_a-supervised-loop-relaunches-on-the-real-supervisor.feature` — `@manual`: a reclaimed
      supervised declaration comes back on the real supervisor with no console, drives a Claude
      session to completion, and stops appearing when it is done

## Notes

**`depends: [02]` is a document dependency, not a file collision.** This subtree shares no node with
`src/` in the graph; what it consumes is the `declarations` key `126/02`'s producer emits, and
building a parser and a reconciler against a document nobody emits yet is the speculative harness
change the arc's PRD refuses. Two entries in `reads:` are forward references to that story's files.

**Where the tests can run is measured, and it decides the design.** `scripts/test.mjs` runs `cargo
test` over `app/desktop/Cargo.toml`, whose workspace excludes `crates/app`, and only `cargo check`
over the shell — so a test in `supervisor.rs` would never run. The reconcile decision is a pure
function in `crates/core` with its `#[cfg(test)]` beside `supervision.rs`'s existing tests; the
shell keeps only the spawning.

**The roster is an argued extension of `36/acd-desktop-read-only-fleet`, never a sibling control.**
That control implements a deny-list today, so a `["work","loop",…]` spawn passes by silence; this
story turns it into a named allow-list in that control's own file, with `work loop` admitted in
writing as local process supervision. The three sibling desktop controls are depended on, not
restated, and every declaration spawn still satisfies them.

**A named clean exit places the hold an operator Stop places** (a default taken at the contract
beat, recorded in `STATE.md`): `duplicate-run` means a live run exists on that scope, and the
predicate keeps listing a live run, so a reconciler that restarted after every named clean exit
would re-attempt a refused mint every 30 s for as long as the operator's own terminal loop ran.
The daemons already behave this way — a named clean exit-1 is surfaced and not restarted until the
operator starts it — and declarations inherit exactly that: the hold is released when the row
disappears, or lifted by an operator Start. An exit-0 child whose row persists is still started
again; that is the level-triggered property and it is untouched.

**One `@manual` risk is named so nobody is surprised by it.** A supervisor-spawned `aof work loop`
runs with no console (`CREATE_NO_WINDOW`, piped stdio) and must drive a Claude PTY through
node-pty/ConPTY. The same-shaped precedent is the supervised `mesh serve --serve` daemon running the
session-spawn handler on this node; the story's manual scenario proves it on the real supervisor
rather than assuming it.
