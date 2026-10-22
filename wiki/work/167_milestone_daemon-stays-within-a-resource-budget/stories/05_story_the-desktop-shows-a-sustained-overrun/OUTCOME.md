# 05 · The desktop shows a sustained overrun — Outcome

## Delivered

### The desktop judges a sustained overrun from the OS's own sample
The supervisor reads each child's cumulative CPU time by its process handle on every 3 s poll tick (`cpu_sample.rs`). The core crate's `guard.rs` judges that share against the budget in the `cost` block of `mesh status --json`, over the budget's own 5-minute window: 60% from t0 enters overrun at exactly 5:00, a 40 s spike never does, and the overrun ends once the window has slid past the load. With no budget nothing is judged, a `not-reporting` daemon is judged against the viewer-open budget, and a daemon the OS cannot sample is never judged.

### An overrun is shown and logged, never acted on
An overrun turns the tray `degraded` and fills the footer's notice slot. It writes one JSON line on entering and one on leaving to the shared degrade log, with `proc: "desktop"`. A standing exit notice outranks the overrun, and the overrun is dropped while the window renders `error`. The guard has no path to stop, restart or kill a child (FF-16704).

## Assumptions

- **The judgement is proven over an injected sampler and clock** — the live sampler on a real busy child, for more than 5 minutes, has not been observed (m167/F-08).

## Gaps

### A live observation of the overrun
- **Status:** open
- **Discharge condition:** with the desktop app rebuilt (`install-local --desktop`) and restarted, a daemon held over budget for more than 5 minutes turns the tray degraded and logs its entering line.
The guard has run only inside `cargo test` (m167/F-08).
