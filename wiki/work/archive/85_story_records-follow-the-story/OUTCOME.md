# 85 · Records follow the story — Outcome

## Delivered

### Both accepting doors instruct both story records
`aof:verify` and `aof:assimilate-code` each instruct the session to instantiate `OUTCOME.md` from
`.aof/templates/work/shared/OUTCOME.md` and to author a `RETROSPECTIVE.md` in the story's own folder,
nested or standalone, over the same delivering-type partition.

### The one-writer rule is role-derived rather than filename-pinned
`test/verify-outcome-per-type.test.mjs` admits the commands that ACCEPT an item and refuses every
agent prompt, and asserts its own non-vacuity by requiring that the accepting set is exactly
`verify` + `assimilate-code` and that both match the rule the others must not.

### The spike and uat exclusions travel with the authoring permission
Each door names `spike` and `uat` as types that carry no `OUTCOME.md` and states the reason for each,
so neither omission reads as an oversight from either door.

### A delivered story missing its records is reported by name
`aof work doctor` emits `story-record-missing` (`warn`) for any `story` at `status: done` whose own
folder carries no `OUTCOME.md` or no `RETROSPECTIVE.md`, naming which record is absent; it judges a
story on its own folder, so no record above it in a milestone satisfies it, and it raises nothing
against a non-story item or against a story at any pre-`done` status.

### The new check cannot reach a gate
`story-record-missing` is disjoint from `CONTROL_FINDING_CODES` and is emitted only at `warn`, so no
severity change to it can fail `aof work validate` or the loop's doctor rung. Measured on its first
real run over this stream: **278** findings, none of them an error.

### The check is a pure function of the snapshot
It lives in `lifecycleCompletenessGroup` (`src/work-doctor-coherence.mjs`) and answers over a literal
snapshot with no filesystem and no clock, yielding byte-identical findings across runs and across
processes. It reads the disk that is the subject of its operation rather than the mesh cache, because
`OUTCOME.md` is not in the streamed artifact set and the cache answers for it 0 times out of 277.

### The record-completeness backlog is measured and visible
The stream reports **278** done stories carrying no `OUTCOME.md` and/or no `RETROSPECTIVE.md`, up from
an unreported condition; `81`, `84` and `85` are the stories that satisfy the rule.

## Assumptions

- **The bundle source is what reaches a consuming repo** — the delivered prompt text ships from
  `src/bundle/commands/`, and a repo receives it by running `aof work update`; a repo that has not
  re-rendered still runs its previously installed prompt.
- **The doctor lane stays advisory** — the check reports the backlog rather than blocking on it, which
  holds only while `story-record-missing` remains at `warn` and outside `CONTROL_FINDING_CODES`.

## Gaps

### This repo's own rendered bundle for `verify` and `assimilate-code`
- **Status:** open
- **Discharge condition:** `aof work update` re-renders `.claude/`, `.opencode/` and `.codex/` so all
  three runtimes carry the story-85 text for both commands, and a body comparison against
  `src/bundle/commands/` reports 25 of 25 in sync.

Six of this repo's eight rendered copies of `verify.md` and `assimilate-code.md` still hold the
`2026-08-29` render; only `retrospective.md` was re-rendered at build. Measured across the whole
bundle: 23 commands in sync, exactly 2 drifted. Routed to chore `108`.

### The record backlog itself
- **Status:** open
- **Discharge condition:** `aof work doctor` reports zero `story-record-missing` findings, at which
  point the code can be promoted from `warn` to a structural `validate` finding without reddening the
  stream.

278 done stories carry no `OUTCOME.md` and/or no `RETROSPECTIVE.md`. Reporting the backlog and filling
it are separate pieces of work, and this item delivered only the reporting.
