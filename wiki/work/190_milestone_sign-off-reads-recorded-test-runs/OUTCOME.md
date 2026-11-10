# 190 · A tree is tested once per change, and every sign-off door reads that run's record instead of running it again — Outcome

## Delivered

### A sign-off is evidenced by a recorded run, never a repeat of one
Every door that asks for tests gets an answer the command recorded against the tree's content, and a repeat on unchanged content launches nothing: the build terminator, the review lanes, `aof:review`, `aof:verify` and a UAT sweep. The stories hold each capability whole: m190/00 (the record), m190/02 (the gate's record and resume) and m190/03 (the doors' prose).

### A milestone closes on one whole-tree gate run, which may run on a hosted runner
190 itself closed on one `aof work regression-gate 190` run: green, sharded, in 15.7 min on a clean `ubuntu-latest` checkout through `gate.yml`. Its row was committed home unchanged. A stopped gate resumes rather than restarting (m190/02).

### Narrowing is positive and the project declares what it knows
`--scope impacted` narrows only on what it knows (m190/01). An existing project is told what its `work.test` declaration leaves out, and `/aof:map-tests` declares it and proves it by replay (m190/04). This repository declares its roots, suffixes, exclusions and resume templates.

## Assumptions

- **The gate runs on a machine that can host the whole tree** — on this MacBook the live control daemon holds `:4182` and the macOS tmpdir realpath reds 13 cases (m190/F-02, m190/F-03), so the gate runs on a GitHub runner.

## Gaps

### A narrowed source change is still near-total
- **Status:** open
- **Discharge condition:** a story that edits one ordinary source module and adds one test file selects a small fraction of the whole suite, because the walk stops at the composition root (`packages/core/src/application/default.mjs`) behind an import smoke test, or ADR-004 §3's cost-based split lands (VERIFICATION F-08).
A source module's transitive dependents reach about 1,119 of 1,273 suites through the composition root, so the SPEC's "an impacted set, not the whole tree" holds for leaf changes only (167/04: 13 suites).

### The SPEC's run-log measure has not been taken end to end
- **Status:** open
- **Discharge condition:** one story built and accepted after 190 leaves a run log with no two runs of the same scope on the same tree key, unless a run is labelled a deliberate repeat.
190's own stories were built before their doors read records, so the measure cannot be taken on them.
