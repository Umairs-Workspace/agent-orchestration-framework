# 189/02 · Build brief

## Mechanism

Rebuild 188/04's test bed: a throwaway git repository, `aof work init --runtime claude` from this
checkout, `AOF_GLOBAL_HOME` isolated, and two refined standalone stories with a small source file
and a `node:test` file each. Give the bed an `.aof/aof.config.json` and a `work.test` runner: 188/04
found that without them the SessionEnd hook fails, run records land flat, and `aof test` refuses
(188 F-08).

Story `00` is made green by hand before the walk, so E1 and E2 check a finished build. Story `01`
is built in a teaching session that gives at least one conceptual hint, then checked in that same
session (`--resume`) and again in a fresh one (E3).

Drive `claude -p` headless with stream-json and `--max-budget-usd 1.50`, as 188/04 did, so tool
calls can be read from the stream. Snapshot `git status --untracked-files=all` and a SHA-256 of
every non-`.git` file around every `/aof:grill-me`.

## Known traps

- 188 F-02: a teaching session that ends without stop, green or hand-off leaves its run `running`.
  Close the `/aof:teach 01` session's run, or end it green, before E3's fresh-session check. A check
  mints nothing, so it never meets `duplicate-run` itself.
- The teach session's own writes (status, run record) happen before the check's snapshot, so they
  are not the check's.

## Verification

Each scenario's evidence goes in the milestone's `VERIFICATION.md`. The `@uat` session is the
operator's, at `aof:verify 189`.

## Out of scope

Codex and OpenCode, and any judgement of learning efficacy (04).
