# 05 · A blocked run releases its slot — Outcome

## Delivered

### A run waiting on a human ends its process and releases capacity
A pending human-input tool call is detected directly, so the park does not wait out the idle window:
the PTY exits, the park is published, and the row leaves the counted set — so a machine no longer
sits idle behind a question nobody has answered. `createMeshParkResume` (`src/mesh-park-resume.mjs`)
is reached from `src/mesh-worker-execution.mjs:132`.

### The park is published once, after a confirmed exit, and releases nothing until the row carries it
No assignment-status frame carrying the `needs-input` code is constructed from a path holding a live
PTY handle; every park publish sits on an exit-confirmed settle path; and the durable
`assignment.reported` reactor names the park edge (`running` + `needs-input`) in its admitted set
rather than refusing it as non-terminal. A process whose exit cannot be confirmed is not reported as
parked, and the reason is recorded.

### Answering resumes the same conversation and the same run record
The park's code is cleared before a resumed process is spawned, never after; the resume is admitted
before a process exists; and the run stays `running` with no new state, no new failure reason and no
retry lineage — a needs-input park is the same run resuming, never a second record.

### Silence is not a park signal
The explicit detector is the whole of the park. A block the detector misses is observationally just
"no tool results", which is [[69/02]]'s liveness deadline — killed and retried — and exhaustion
preserves the worktree under `on-max-attempts: pause`. One signal carries one terminal behaviour, and
no fifth deadline was introduced.

## Assumptions

- **The park is exactly as good as its detector** — a human block the detector does not see costs an
  attempt rather than parking, because the runtime cannot read human intent out of silence.
- **The park fact rides a column that already exists** — the worker already wrote the `needs-input`
  code, and [[69/04]]'s counted set already excluded it.

## Gaps

### The in-place answer is superseded, not preserved
- **Status:** open
- **Discharge condition:** none planned — this is the chosen trade, recorded so it is not
  rediscovered as a regression.

A human typing into a still-live PTY while the question is pending no longer reaches that session:
detection leads to exit, and the answer comes back through the resume. That path is what the
pre-exit publish existed to serve, and it is why it existed at all.

### Escalation has no destination
- **Status:** open
- **Discharge condition:** a notification ladder exists (explicitly out of this milestone's scope).

Releasing the slot is delivered; reminding or escalating to the human who owes the answer is not.
