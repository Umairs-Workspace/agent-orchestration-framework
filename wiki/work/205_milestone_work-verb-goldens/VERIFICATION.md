---
doc: verification
---
# 205 · Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-20501 | `test/arch/work/acd-work-stream-golden-boundary.test.mjs` | 5/5 registered control cases passed on 2026-11-23 | The actual loader rejected a planted direct edit with `trial/probe: unknown fixture field path`. Calling setItemStatus as a verb yielded `trial/probe: expected public work argv`. |

## Manual verification

On 2026-11-23 a scratch copy of the seed baseline changed the receipt quantity from 10 to 11. Both ordinary comparisons exited 1. Both named `work-stream-fixture/seed` and `project/stream/files/19_chore_receipt/evidence/note.txt`, with `-Receipt for 11 apples.` and `+Receipt for 10 apples.` in the diff. The repository baseline retained its original bytes. The checkout was 2fa9bdd7 with the 205 changes applied.


## Story build and review

Reviews were performed inline in solo mode. Each row reports the declared impacted test run and the structural, behavioural and craft review.

| Story | Gate evidence | Review |
|---|---|---|
| 205/00 | Build and final review each passed 521 cases across 19 suites. Neither selection widened. Validation returned no findings and doctor reported zero errors. | Round 1, zero blockers. Reviewed fixture isolation, byte-level comparison, refusal immutability and both entry points for the lane. The portability control also rejects a path supplied as a post-write find query. |
| 205/01 | 161/161 cases across four suites. Review reused the green result. Validation returned no findings and doctor reported zero errors. | Round 1, zero blockers. Checked 76 captures across both CLI formats, all 14 stream diagnostic witnesses and unchanged before/after exports. Scratch changes to list order and the final document newline each failed on the expected output path. |
| 205/02 | 187/187 cases across four suites. Review reused the green result. Validation returned no findings and doctor reported zero errors. | Round 1, zero blockers. Inspected the six successful deltas, including the rewritten backlog dependency, shifted UAT dependency and reordered parent checklist. All twenty refusal captures reproduced the full before-image. |
| 205/03 | 225/225 cases across four suites on the final fixture. Review reused the green result. Validation returned no findings and doctor reported zero errors. | Round 1, zero outstanding blockers. Checked archive visibility, status lookup, parent and child identity, preserved evidence and the unchanged bare sibling dependency. The registered suite parses the normalized post-write JSON. A scratch edit to an untouched sibling failed comparison. |

## Accept decision

**2026-11-23 · product owner (inline) · `aof:verify 205`.**

The suites re-ran on the working tree before acceptance. 337 cases passed with no failures, across the work-stream suite (160), FF-20501 (5), the golden harness (56), the baseline line-ending control (4), the source-directory budget (10), the bundle suite (36) and `codex-ownership` (66). `aof work validate 205` passed. `aof work doctor 205` exited 0 and reported no `control-unresolved` at either severity. No `@uat` scenario exists, and the one `@manual` scenario is recorded above.

- **205/00 · accepted.** Every scenario green. FF-20501 green, with its recorded red probe. The manual diff was recorded. No open blocker.
- **205/01 · accepted.** Every scenario green across 76 read captures. No open blocker.
- **205/02 · accepted.** Every scenario green across 26 placement captures. No open blocker.
- **205/03 · accepted.** Every scenario green across 38 lifecycle captures. No open blocker.
- **205 (milestone) · accepted on a green regression gate at `6e12ab63`.** Every gate run is in
  REGRESSION.md. Each ran in a clean detached worktree of this branch, because the main checkout
  holds an untracked backlog draft (`milestone_autonomous-mode`) that is not 205's.
  - **`8eae3808`: red on 51 cases, none of them 205's.** 47 were red by name in 204's gate row at
    `c92ac877`. Four came from the worktree's symlinked `node_modules` ("Installed package escapes
    repository") and passed in the main checkout. 205's gate repair had already fixed three of
    204's reds: the bundle descriptor, `codex-ownership` "156" and FF-11904.
  - **`d71d94ac` fixed the 46 inherited reds at their causes.** The causes were macOS's symlinked
    temp directory (two of these were product guards in migrate and the config walk), controls
    left behind by the loop-recovery chores 195 to 197, and stale pins and machine state (the
    fingerprint script read `~/.gnupg`, the sharded pool misread a unit's count, a case bound the
    live `:4183` relay). That gate was red on one case only: 81/00's pinned 500 ms window lost a
    race with node's boot under load.
  - **`6e12ab63` measures that window as grade/03 does (F-54-01-1).** The run finished with no
    failures but `not-finished`: `test/memory/recall-replay.test.mjs` ran past the 45-minute unit
    limit under load. That suite takes 142 s alone. `--resume` re-ran that one unit on the same
    content and recorded the row green.
