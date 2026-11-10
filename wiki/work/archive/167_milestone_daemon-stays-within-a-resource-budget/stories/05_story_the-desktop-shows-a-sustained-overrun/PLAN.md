# 167/05 · The desktop shows a sustained overrun — build plan

## Mechanism

**Core crate, pure.** `guard.rs` holds a `Guard` per daemon id:
`observe(cpu_100ns: u64, at_ms: u64, budget: Option<Budget>, state: DaemonState) -> Transition`.
It keeps a ring of samples spanning 60 s, computes the share of one core, and keeps
`over_since` and `under_since`. It answers `Entered`, `Left` or `Unchanged`. The sustained
duration is a constant named from Q1. `status.rs` learns to parse the `cost` block (budget, and
per-daemon state or `not-reporting`). An absent block parses to `None`, never an error.
`icon.rs` takes "any daemon in overrun" as one more input to `degraded`.

**App crate, impure.** `cpu_sample.rs` defines `trait CpuSampler { fn cpu_time(&self, child) ->
Option<u64> }`. Its Windows impl calls `GetProcessTimes` on `child.raw_handle()`, using
`windows-sys` features `Win32_System_Threading` and `Win32_Foundation`. Elsewhere it returns
`None`, so the guard judges nothing. The supervisor's `poll_loop` already holds both the parsed
status and the controllers. Each tick it samples each reserved child, feeds the guards, and on a
transition:
- sets or clears the overrun notice, with exit notices winning the slot;
- appends one JSON line to `~/.aof/mesh/logs/degrade.log` with `{ at, proc: "desktop", level:
  "degrade", code, message }`, the sink's own shape.

## Verification step

`cargo test` over `guard.rs` with a fake clock covers E1–E5. Then, live: with the operator's OK,
point a debug build's sampler at a busy-looping child for longer than the duration. The tray
turns degraded, the footer names it, one line lands in `degrade.log`, and the child is still
running.

## Out of scope

- Any automatic action on overrun (SPEC).
- macOS and Linux sampling (SPEC: the control node first). The sampler returns `None` there.
- The supervisor's own `mesh status` spawn cost (STATE, open item).
