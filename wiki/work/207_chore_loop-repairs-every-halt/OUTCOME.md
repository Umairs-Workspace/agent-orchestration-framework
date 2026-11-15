# 207 · The loop repairs every halt but the operator's own, before it stops — Outcome

## Delivered

### Repair of every non-operator halt
A loop halt on any stop other than `uat-gate`, `session-needs-input`, `operator-interrupt`, `retry-parked` or `deadline-exhausted` is handed to one `/aof:repair` session, and a repair that ends done resumes the loop in the same process.

### A repair that asks waits for the answer
A repair session's question is posted, notified and waited on like any driven session's, and the answer re-drives the same repair session with its hand-over; only an unanswered (parked) question stops the loop.

### Repair remit over story halts
`/aof:repair` fixes a story halt's cause in the story's lane (code, tests or rubric), proves it with validate, doctor and `grade --run`, and asks the operator before rubric, CI or operator-owned changes.

### An exit veto explains itself
A `report-vacuous` grade with no failing case and a non-zero runner exit names the exit and the runner's output tail in `work:grade --run` and in the loop's halt Details.

### The at-capacity cleanup retry keeps the process alive
The loop's spaced retry of refused lane cleanups waits on a ref'd timer and retries only the current checkout's refusals.
