# 190/02 · A gate that did not finish resumes — Outcome

## Delivered

### A stopped gate resumes on the same content
`aof work regression-gate <NN> --resume` re-runs only the units a `not-finished` run left: its killed units, its unstarted units and the whole of any killed packed unit. It skips finished lanes, and appends one row for the whole, reading `resumed from <instant>: n of m units re-run`.

### A resume refuses what is not a resume
A resume is refused with `regression-gate-resume-tree-changed` when the content key differs from the stopped run's, and with `regression-gate-nothing-to-resume` when the newest row is not `not-finished`. A gate that declares no `reportArgs`/`filesArgs` refuses with `regression-gate-resume-undeclared`.

### The gate tells its program what to do through declared templates
`work.test.gate` carries `reportArgs` (`{report}`), `filesArgs` (`{files}`) and `noLanesArgs` beside `jobsArgs` and `budgetArgs`. `scripts/test-sharded.mjs` plans only the files a `--files` list names, and reports `units`, `lanes`, `notFinished` and `notStarted`.

### Every gate run is also a test record
The gate writes an ADR-001 record through 190/00's writer, keyed after its row is appended, with its sharded report attached. A later `aof test --scope all` on that content is answered from it (measured live: `launched: false`).

## Assumptions

- **A resume runs under the stopped run's budget** — `work.test.gate.budgetMinutes` is tracked content, so lifting it changes the key and refuses the resume.
- **Resume is local only** — CI's git dir does not survive the job, so CI has no stored report to resume from.

## Gaps

### A resume clobbers the stored timings
- **Status:** open
- **Discharge condition:** a `--files` or `--shard` run of `scripts/test-sharded.mjs` merges its per-file timings into `.tmp/test-timings.json` rather than replacing it (VERIFICATION F-04).
After a resume, the stored timings hold only the resumed files, in this checkout and in the main checkout, so the next whole-tree gate plans without its longest-first packing.
