# 179/04 · Build brief

## Mechanism

Reuse spike 178's test bed shape: a throwaway git repository, `aof work init`, Claude render only,
`AOF_GLOBAL_HOME` isolated, two refined stories with a stub source file and a `node:test` file.
Install the branch's `aof` there (npm link of this checkout), so the renders are 179's.

Drive `claude -p` headless with stream-json and `--max-budget-usd`, as the spike did, so tool calls
can be read from the stream. Use `--resume` for the follow-up turn. Snapshot
`git status --untracked-files=all` and SHA-256 of every non-`.git` file around every command.

## Known traps

- The test bed has no `work.test` runner; expect `aof test` to refuse and the prompts to fall back,
  as spike 178 recorded. Note it; it is not this story's finding.
- `graphify-out/` appears after the review's graph build if the bed does not ignore it (149/R5).

## Verification

Each scenario's evidence pasted into the milestone's `VERIFICATION.md`; the `@uat` session is the
operator's, brokered at `aof:verify 179`.

## Out of scope

Codex and OpenCode walks (ADR-007).
