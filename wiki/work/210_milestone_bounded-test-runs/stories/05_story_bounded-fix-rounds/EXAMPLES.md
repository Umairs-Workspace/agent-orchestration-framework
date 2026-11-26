# 210/05 · Bounded fix rounds — example map

## R1 · A fix round reruns the failing suites plus everything the fix can reach
- E1 · The last red named run failed one case in suite A. The fix changed a module that suite B imports. `aof test --failed` runs A and B and nothing else [proposed]
- E2 · The last red was a gate run with failures in 3 suites. The fix changed nothing those suites do not already cover. The round runs those 3 suites [proposed]
- E3 · There is no red record for this worktree. `aof test --failed` is refused as `test-failed-no-red` and names a named run [proposed]
- E4 · Every red summary, named or failed, ends with the line `aof test --failed` [proposed]

## R2 · A fix loop that stops converging stops itself and hands over
- E5 · Rounds fail 5, then 3, then 1 cases, then go green. The chain never stops [proposed]
- E6 · Rounds fail 4, then 4, then 4 cases. The third run latches the chain, and the next `--failed` is refused as `test-fix-stopped` with the three counts [proposed]
- E7 · A round's fix makes suite C fail, and C failed in no earlier round. The chain stops at once [proposed]

- E11 · After the chain stopped at E6, a named run with reason "retry after reading the hand-over" runs. It is red with 4 failures and starts a new chain at round 0, and the next `--failed` follows it [stated Q1]
- E12 · After that stop, `aof test --failed` is still refused for the stopped chain while no newer red exists [stated Q1]

## R3 · A red that also fails on the work's base is pre-existing, and is not the story's
- E8 · Story 17/02's case X fails, and also fails in the baseline tree at the commit that added 17/02's STORY.md. X is labelled pre-existing, shown apart, and left out of the round's count [proposed]
- E9 · Case Y fails only in the working tree. It is not labelled [proposed]
- E10 · The baseline worktree cannot be prepared. Every failure is labelled `unmeasured` with the reason, and none is treated as pre-existing [proposed]

## Questions
- Q1 · business · answered · After the tool stops a fix loop, what lets `aof test --failed` rounds start again on that work?
- Q2 · technical · defaulted ADR-005 · How many rounds without progress stop the chain? `work.loop.buildNoProgressRounds`, default 2, so the third run stops it.
- Q3 · technical · defaulted ADR-004 · Does a round rerun failing cases or failing suites? Suites. A case's position shifts when its suite is edited.
- Q4 · technical · defaulted ADR-006 · What is "pre-existing" measured against? The commit that added the working item's record doc, run in its own prepared worktree.
