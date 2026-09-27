# 126/03 · The supervisor reconciles a supplied set — Outcome

## Delivered

### A supervised child is an owned specification carrying its own working directory
`SupervisedChild` in `app/desktop/crates/core/src/supervision.rs` is `{ id, label, argv, cwd }` with
owned strings; the two seeded daemons keep their `mesh_serve()` / `mesh_ui()` constructors and carry
`cwd: None`, and every declaration row carries `Some(projectRoot)`. `supervise_child` calls
`current_dir` only when the child itself carries one, so no spawn site supplies a default.

### The supervised set is composed, not matched
`compose_supervised_set` returns the two seeded daemons followed by the supplied rows in row order.
No `match` on `is_control_node` selects a supervised set; the role latch's single server start is the
one named exemption, asserted as a named exemption so a second cannot arrive silently.

### The reconcile is a pure plan in the core crate
`reconcile(rows, live) -> Plan { start, stop, retain }` is a pure function whose `#[cfg(test)]` sits
beside `supervision.rs`'s existing tests, where `cargo test` actually runs. A row with no controller
starts; a controller with no row stops; a held controller retains; a declared, unheld, non-running
child **starts again** — the level-triggered property. `LiveController` is `{ id, desired, held }` and
carries nothing about why a child stopped, so two inputs differing only in "did it exit 0" are the
same value and an exit-code rule cannot be added without changing the type. The two reserved daemon
ids are named in neither direction.

### One poll interval supplies the set every tenth tick
`poll_carries_declarations(tick)` is true on every tenth tick of the existing 3 s cadence — 30 s —
so the flag rides the one existing loop and no second cadence exists. The role latch still starts the
server once, a declaration row never does, and the UI daemon is still started immediately.

### The runtime gate is narrower than the source roster
`DECLARATION_ARGV_PREFIX` (`["work", "loop"]`) is the gate's one home and the parse in `status.rs` is
its only reader. A supplied row whose argv does not begin with that prefix — including a
string-instead-of-array argv — is dropped, and only that row: `nodes`, `boards`, `isControlNode` and
the surviving rows parse unchanged. A row's `scope`, `level` and `cap` are not projected into the
child at all, so the parse's gate reads exactly `id`, `argv`, `cwd` and `label`.

### The spawn roster is an allow-list of exactly four
`test/arch/ui/acd-desktop-read-only-fleet.test.mjs` now asserts that every argv-array spawn in the
Rust production source is one of `mesh status`, `mesh serve`, `mesh ui`, `work loop`, with `work loop`
admitted in writing as local process supervision. The five forbidden mutation verbs keep their
deny-list in the same file.

### A held declaration and a halted loop are both visible
An operator Start/Stop is a hold keyed by declaration id and survives every tick until its row
disappears. `duplicate-run` is the fourth named clean exit, classified from the child's emitted
message rather than a code token. An exit-0 child's last non-empty line reaches the operator through
`last_clean_exit`, which `get_view_model` copies into the IPC view-model's `notice` and the window
footer renders; the tray menu does not carry it. A notice is cleared per child rather than on any
child's start.

### Rust learns no completion semantics
No loop, scope, phase, run-status or declaration-as-a-decision vocabulary appears anywhere in
`app/desktop/**/*.rs` (comments stripped); the token `loop` appears only as the second element of the
admitted argv literal. A completed loop simply stops appearing in the answer, and nothing relaunches
it — reconciliation replaces restart-on-exit.

## Assumptions

- **A reconcile runs only on an ANSWER** — an unreadable store and an older `aof` that emits no
  `declarations` key both read as "not answered", and the supervised set is left alone rather than
  emptied; a supervisor that treated silence as "nothing is declared" would stop everything.
- **The producer is the only source of rows** — the runtime gate defends against a wrong or
  compromised producer, but a row it admits is spawned as given, so `aof mesh status --declarations`
  is the trusted boundary.
- **`aof` resolves co-located with the app** — every declaration spawn resolves the sibling `aof`
  by absolute path with no PATH search, the form `resolve.rs` already established.

## Gaps

### The two seeded daemons still inherit the supervisor's own launch directory
- **Status:** open
- **Discharge condition:** an item ratifies one of the two readings — either the shell supplies the
  resolved install dir as the daemons' `current_dir` (ADR-006 contract-beat §4), or the daemons keep
  `cwd: None` and workspace identity stops being cwd-derived (TECH_DEBT item 4).
Task 02's delivered Examples table says the daemons' working directory is "not set — inherited,
exactly as today" and its `one spawn site` scenario forbids the shell defaulting one, so the build
carries `cwd: None` for both. Under login autostart (`126/04`) that inherited directory is the logon
cwd. ADR-007's amendment lists this pin among three mitigations for the same hazard; the other two
hold and this one does not.
