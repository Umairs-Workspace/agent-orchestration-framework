# 210/02 · Attributed test records — build plan

## Mechanism

**Attribution** lives in `normaliseTap` (`grade.mjs`). While reading the stream, remember each
failing case since the last `# file <path> …` line. When that line arrives, stamp `file: <path>`
on them. A case still pending at the end of the stream keeps `file: null`. Every other consumer of
`normaliseTap` (`aof work grade`) ignores the extra field, so the existing grade normaliser cases
must stay green unchanged.

**The record** (`record.mjs`) widens `writeRecord`'s field set. It takes `reason`, `mode`,
`parent` and `round` from the caller. The `failures[].file` values come from the runner's
normalised report, never from a caller-supplied result (FF-19001 is about results, not the
caller's metadata). `worktree` is stamped from `rev-parse --git-dir`, which `treeKey` already runs
and currently discards. Add one query, `findLatestRed(ledger, { worktree })`: the newest record
with `result: red` and the same worktree and environment. Name-sorted files make it a reverse scan
that stops at the first hit.

**The match rule.** Extend `recordAnswers`. A red now answers a question when `covers(ran, asked)`
holds and every failure has a non-null `file`. The answer filters failures to the asked files, and
its result is recomputed: green when none remain. `answeredFrom` in the test command already takes
the record's failures, so the filtering belongs in the record leaf, not the face.

Read old records defensively: an absent field is `null`, never an error. That is the backwards
compatible store rule.

## Verification step

In a temporary repository with two worktrees, write a red over `a`, `b` and `c` with a `b` failure
from worktree 1. Then ask about `a` and `c` from worktree 1 (answered green), from worktree 2 on the
same content (also answered: the content key matches, and that is intended), and ask worktree 2
for `findLatestRed` (none). Feed `normaliseTap` real `scripts/test-shard.mjs` output from two
suites, one with a planted failure, and check the attribution.

## Out of scope

Passing `reason`, `mode` and the chain fields from the command (04, 05). The gate's unit
attribution (03).
