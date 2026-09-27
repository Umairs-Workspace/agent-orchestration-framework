# 03 · Progress, not liveness — Outcome

## Delivered

### An attempt's progress is sampled from deterministic signals only
`src/loop-progress.mjs` samples files touched, lines changed, commits made and the failing-scenario
count from `git status --porcelain` inside the lane's own tree — the reader the lane sweep already
used — and nothing else. No model, prompt or agent surface is imported, so the sample is a
measurement rather than a judgement.

### The ledger is append-only and invisible to the run reader
Samples land in a `runs/[<node>/]<runId>.progress.ndjson` sibling through `appendFile`; nothing opens
an existing sample file for truncation. `readRuns` skips every entry that is not `*.json` in both the
flat and the node-partitioned branch, so the ledger is invisible to the god-node's reader by
construction, and `src/run-store.mjs` — seventeen `src/` dependents — gains no key.

### Consecutive no-progress samples reset the attempt, and repeated resets escalate
At `maxStalls` the policy resets the attempt and carries a summary forward; at `maxResets` it
escalates. Both bounds are declared in `work.loop.*` and resolved through [[69/00]]'s leaf.

### The build loop's ceiling is a failure-to-progress rule, not an iteration count
`decideBuildProgress` stops the build when consecutive measured rounds show no reduction in the
failing-scenario count — the derivative of the number the build loop already drives to zero — rather
than after an arbitrary N.

## Assumptions

- **Grinding is measurable without asking a model** — the worst recorded case (`Build story 49/05`,
  199 edits against 1 test run) is visible in edit counts and test-run counts, so the evaluator
  Magentic-One asks a model for is replaced by direct signals here.
- **The failing count comes from one source** — the rubric's own `cases.failed`, with an
  indeterminate grade read as an absent measurement rather than as zero.

## Gaps

### The leaf shipped with no production caller
- **Status:** discharged
- **Discharge condition:** a production path in `src/` samples, resets and escalates through this
  module.

All nine exports were unreferenced outside their own module at this story's accept, which
`aof:verify 69` raised as blocker F-69-V7. The caller is [[69/06]]'s subject and landed there:
`src/work-loop.mjs` and `src/commands/loop.mjs` are the production importers today. This story's own
three features were leaf-level by design and none demanded a caller; they were not edited.
