# 00 · Quit reaps the whole tree on macOS — build plan

## Mechanism

**Fill the seam m36 left; do not move it.**
- `create_job` and `assign_to_job` are the neutral containment seam. On unix, `create_job`
  returns a shared set of live process-group ids.
- `assign_to_job` records the child's pid as its group id. The spawn has already called
  `process_group(0)`, under `#[cfg(unix)]` beside the existing `creation_flags`.
- A child's exit removes its id from the set.
- `tree_kill` on unix becomes `killpg(pid, SIGKILL)`.

**The ladder is pure.** A new `reap.rs` in `mesh_desktop_core` decides what to signal, and when:
`reap_steps(groups, grace)` yields "TERM these", then "after the grace, KILL whichever of these
still live". `cargo test` drives it over a fake liveness answer, as `stop_step` is driven today.
The app crate only maps each step to `libc::killpg`, plus a `kill(pgid, 0)` liveness probe, and
waits.

**One exit point.** Run the reap in `RunEvent::Exit`; Quit's `app.exit(0)` already reaches it.
Add a tokio SIGTERM listener in `setup` that calls `app.exit(0)` on the main thread. Then measure
RESEARCH Q1: on a running app, send `osascript -e 'quit app id "com.aof.mesh.desktop"'` and log
out, and log which `RunEvent` and `code` arrive. Narrow the `prevent_exit` guard on macOS so that
an OS quit is never prevented, and write down what you measured in the story's Notes.

**The menu bar.** `TrayIconBuilder` already builds the item. 175/00 Q2's answer decides
`show_menu_on_left_click` on macOS, and the left-click handler, under `#[cfg(target_os = "macos")]`.

## Verification step

This needs a Mac with Rust, and story 01's bundle (or the raw release binary).
1. Run the app and let both daemons come up.
2. `ps -o pid,pgid,comm -ax | grep "aof"` shows each daemon leading its own group.
3. Choose Quit. `pgrep -fl "aof mesh"` is empty within the grace.
4. Repeat with `kill -TERM <app pid>`, then with a logout.

A daemon whose pgid equals the app's pid means `process_group(0)` was not applied. A survivor after
a SIGTERM to the app means the signal listener or the Exit hook is not wired.

## Out of scope

- A darwin CPU sampler for the guard: `cpu_sample.rs` stays `None` off Windows.
- Crash containment (ADR-001 §5): a ROADMAP item that story 04 records.
- Any change to Windows: the Job Object path stays exactly as it is.

## Known traps

- The `Exit` handler runs on the main thread. A blocking 5 s wait there is acceptable at quit,
  but do not hold the supervisor's state mutex across the wait, or the watchdogs deadlock on
  their exit bookkeeping.
- A watchdog that sees its child die during the reap must not restart it. Mark the engine as
  exiting before you signal anything.
