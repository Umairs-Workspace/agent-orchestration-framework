# 04 · The desktop stops what it supervises — build plan

## Mechanism

The desktop already holds everything a row needs: the reconcile creates a `ChildController` per
declaration, the signals map carries each child's ramp word, and the last answered declarations
tick carries the producer's `label`. The view model joins those two on id and hands `app.js` a
`loops[]` it renders as a second control bar in the daemon rows' own vocabulary. The Stop rides the
existing `SupervisorCommand::Stop(id)` channel; the command loop's one new branch is
`is_reserved_id` — the core's own predicate — so the two daemons keep their immediate kill and a
declaration takes the ladder.

The ladder is data in `core` (`stop_step`, `stop_argv`), the shape 36/ADR-002 gave the restart
backoff: `cargo test` reaches it, the shell only applies each step. Press 1 spawns the row's own
argv prefix plus `--stop` through the same resolved-absolute `aof` spawn form the declarations use;
press 2 spawns it again (the VERB escalates, the desktop only counts) and starts the grace; after
the grace `taskkill /PID <child> /T /F` — the driver's own tree-kill primitive — then
`child.wait()`. The controller's hold is placed at press 1, so `reconcile` retains the id while its
row persists.

On the node side, `supervisedDeclarations` (the disk-reading producer) asks story 01's module for
each candidate's request and hands the pure engine a `stopped` set of the honoured ones; the
engine's one destructure gains `stopped` with a frozen empty `Set` as the default-absent value and
skips a stopped id right after the `supervised` guard. With no row, the reconcile retires the
controller and the row leaves the window after its terminal `stopped` frame.

## Verification step

`node scripts/test.mjs` runs `cargo test` over `app/desktop/Cargo.toml` — run it with
`AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only test/loop/work-loop-declarations.test.mjs test/arch/loop/acd-declaration-predicate-is-composed.test.mjs test/arch/loop/acd-clock-counts-attempts.test.mjs test/arch/ui/acd-desktop-single-data-path.test.mjs test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs test/arch/ui/acd-desktop-trusted-spawn.test.mjs` plus `cargo test --manifest-path app/desktop/Cargo.toml`.
The end-to-end observation: `decideSupervisedDeclarations` over one supervised lineage whose
latest run is `failed/timeout` answers one row; the same input with `stopped: new Set([loopRunId])`
answers none; `supervisedDeclarations` over a fixture home holding a `honoured` request for that
id answers no row. In cargo: `stop_step(1, None, 30000, false)` is `Request`, `(2, None, …)` is
`Cancel`, `(2, Some(30000), …)` is `Kill`, `(2, Some(1000), …)` is `Wait`, `(_, _, _, true)` is
`Done`; `stop_argv` of a declaration row is `["work","loop","<scope>","--stop"]` and `None` for
`mesh-serve`. Then `node scripts/install-local.mjs --desktop` builds; the OPERATOR restarts the app
and story 06 reads the window.

A wrong build shows as: a declaration Stop calling `start_kill` (the tree orphaned), a grace
counted from the drain press (a live drive killed), a row that never leaves after the loop
halted, or `src/work/loop.mjs` gaining an import (`acd-clock-counts-attempts` reds).

## Out of scope

- The fleet's card and route — story 03; the desktop's node-row `current_work` cell is untouched.
- Re-parsing `scope`/`level`/`cap` into `SupervisedChild` — the argv already carries the scope.
- A Start control for a declaration — a declaration starts through the reconcile only.
- Restarting the desktop app — the operator's act, never the builder's.

## Known traps

- `taskkill` needs the CHILD's pid (`child.id()`), not the supervisor's; `CREATE_NO_WINDOW` on
  the spawn as every other desktop spawn.
- `SupervisorState.declared` must survive a failed poll (replaced only on an ANSWERED
  declarations tick) or every row's label blinks to nothing every third tick.
- The standing notice is keyed by child id and cleared by that child's next successful start; a
  declaration's stop notice must use the row's `label` (`loop <scope>`), the shape `app.js` reads.
- `src/work/loop.mjs` imports nothing and must stay that way — `Set` is a global.
