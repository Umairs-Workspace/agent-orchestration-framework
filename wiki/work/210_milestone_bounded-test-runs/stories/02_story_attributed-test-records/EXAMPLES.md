# 210/02 · Attributed test records — example map

## R1 · Each failure carries the suite that held it
- E1 · A light-entry run over two suites fails one case in the second. The case is reported with `file` set to the second suite [proposed]
- E2 · The runner crashes before any `# file` line is printed. The failure is kept with `file: null` [proposed]

## R2 · A record keeps why it ran, where it ran, and the round it belongs to
- E3 · A run written with reason "record.mjs changed", mode `named` and round 0 reads back with those three values and this worktree's git dir [proposed]
- E4 · A record written before this milestone, with none of the new fields, still reads. Its failures read as `file: null` and its reason and worktree as unknown [proposed]
- E5 · Two worktrees of one clone each have a red run. Asking for the newest red for worktree B returns B's run, never A's newer one [proposed]

## R3 · A red answers a narrower question when every failure is attributed
- E6 · A red over suites A, B and C, with one failure in B. A question about A and C on the same content is answered green from it [proposed]
- E7 · The same red. A question about B alone is answered red, with B's one failure [proposed]
- E8 · A red over A and B with one failure whose `file` is null. A question about A alone launches a run [proposed]

## Questions
- Q1 · technical · defaulted ADR-002 · Is a failure's suite read from the TAP stream or from a separate report? From the light entry's `# file <path>` lines in the TAP stream.
