<!-- Build brief — advisory, the builder's alone. The task features are the contract. -->
# 190/00 · A repeat `aof test` is answered from its record — build plan

## Mechanism

The seam is `runTest` in `packages/work/src/commands/test.mjs`, between the selection and the
`run(toolchain, selectionFiles, …)` launch. The selection is computed exactly as today. The new
leaf, `packages/work/src/testing/record.mjs`, then answers three calls:
- `key(projectRoot)`: the throwaway-index `git add -A` + `git write-tree`, or `null` outside git;
- `find({ key, env, selection })`: the ADR-002 §1 match;
- `claim(...)` / `write(...)`: the single-flight lock and the record itself.

When `find` answers, `runTest` returns the recorded report through the same `result(...)` object,
with `reused` set and `launched: false`. When it does not, it claims, launches, writes and releases.

Follow the shape the test command already uses: the leaf is created by a factory that takes its git
spawn and its clock as injected services, as `createTestSelector({ relations, … })` does. The suites
then drive it against a temp repo, or against the git fake that `acd-git-fake-parity` keeps honest,
and never against this repo's own `.git`. The binding in
`packages/core/src/application/bindings/commands/test.mjs` composes it.

The record is plain JSON, one file per record, named `<instant>-<short key>-<pid>.json`. The lock is
`<key>.<selection digest>.lock`, created with an exclusive open (`wx`) and holding the owner's pid
and its start instant.

## Verification step

In a scratch clone with an isolated `AOF_GLOBAL_HOME`:
1. run `aof test --scope file` on the test-command contract suite twice. The first launches
   and the second prints `answered from the run of …`, in well under a second;
2. `touch` an untracked file and run it a third time. It launches again;
3. start two of the same `--fresh`-less calls together. One launches and the other waits and then
   reports `reused`.

A failure looks like the third run being answered, which is the m167/01 R1 near-miss. Or like two
runners in `ps` at once for the paired call.

## Out of scope

- The selector's narrowing — 190/01.
- The gate writing records, and resuming — 190/02.
- Any prose change in the commands — 190/03. The `--fresh` flag is added here, and its doc string
  is the only text this story writes about it.

## Known traps

- `git add -A` into the REAL index stages the operator's work. The throwaway index must be a copy
  of the real one (for speed), named by `GIT_INDEX_FILE`, and removed afterwards.
- On Windows, a lock file held open by a dead process cannot always be unlinked at once. Reclaim
  through rename-then-unlink, and treat a failed reclaim as "run anyway, record not single-flighted",
  never as a pass.
