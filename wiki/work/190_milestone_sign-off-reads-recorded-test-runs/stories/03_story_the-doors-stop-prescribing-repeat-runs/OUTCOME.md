# 190/03 · The doors stop prescribing repeat runs — Outcome

## Delivered

### Each door asks `aof test` once and reads an answer from the record as evidence
The `aof:continue` build terminator and review lanes, `aof:review`'s test step and `aof:verify` now ask `aof test` at their scope, rather than telling each party to run the suite again. Each says that an answer from the record is the command's own evidence. Reviewers judge the diff and do not re-run.

### A UAT session sweeps once
The `aof:verify` UAT path and the UAT command and templates run one `aof test --scope all` for the whole session, answered from the newest gate run's record when the content has not changed.

### A stopped gate's repair is the resume
`verify.md` names `aof work regression-gate <NN> --resume` as a `not-finished` row's repair, and re-running or speeding up the gate as the repair when the content has changed. Never a code repair.

### The prose names no tiers and one deliberate repeat
No command names a unit, integration or end-to-end tier (ADR-004). `--fresh` is named once, in `<build_terminator>`, for a suspected flake.

### Every runtime render carries it
The Claude, Codex, OpenCode and `.agents` renders and `.aof/templates/` match the bundle (`aof work update`: 0 drift).
