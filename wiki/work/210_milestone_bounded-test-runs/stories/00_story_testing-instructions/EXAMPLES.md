# 210/00 · Testing instructions — example map

## R1 · Every skill that tests reads the project's instructions before it chooses suites
- E1 · A project names `wiki/TESTING.md` in `work.test.instructions`. The rendered continue, review, verify, manual, teach and repair skills each tell the agent to read that file at their test step, before running anything [proposed]
- E2 · The Codex variant of continue carries the same instruction as the Claude Code render [proposed]
- E3 · No rendered skill still says "never name suite files" or "`--scope file` wearing prose" [proposed]

## R2 · A project with no instructions file is told how to get one
- E4 · A project with `work.test` declared and no `work.test.instructions` runs `aof work doctor`. It gets one `test-instructions` warning naming `/aof:map-tests` [proposed]
- E5 · `work.test.instructions` names `docs/TESTS.md`, which does not exist. `aof test` refuses as `test-instructions-missing` and names the path [proposed]
- E6 · `/aof:map-tests` on a repository with two test roots and a native `node:test` package drafts a file that names both roots and says how to run the native package, sets the key, and asks the operator to edit it [proposed]

## R3 · The skills keep every run bounded, and the review lane checks the choice
- E7 · The continue skill's build terminator says: after a fix, run `aof test --failed`; never run `aof test --all` in story work [proposed]
- E8 · The continue skill says that when `aof test` refuses as `test-fix-stopped`, the agent writes a blocker in `STATE.md` (or, in a driven session, asks through the loop) and stops [proposed]
- E9 · A pre-existing failure reported by `aof test` is recorded by case name under `STATE.md` `## Feedback (for retro)`, not fixed by the story [proposed]
- E12 · Story 17/02 changed `src/record.mjs`. Suite `test/record.test.mjs` imports it and is in none of the story's recorded runs, and no reason names it. The structural lane raises a finding naming the suite and the file [stated Q1]
- E13 · The same, but a recorded reason says "test/record.test.mjs left out: it binds :4182". No finding is raised [stated Q1]

## R4 · This repo's instructions cover what an agent here needs
- E10 · `wiki/TESTING.md` says a change to only `wiki/work/**` records needs no run [proposed]
- E11 · It says `test/store/global-work-propagation.test.mjs` binds `:4182`, which the live control daemon holds, so it is not run on the control node [proposed]

## Questions
- Q1 · business · answered · Should a review lane challenge a named run's reason? It would compare the story's recorded runs with what the story changed, and raise a finding when a suite that imports or names a changed file was left out with no reason given.
- Q2 · technical · defaulted ADR-001 · Is the instructions file a path in config, or a fixed name? A path in `work.test.instructions`.
- Q3 · technical · defaulted ADR-008 · Do the suites and resume layout checks stay? `test-layout-suites` (without couplings) and `test-layout-resume` stay; the other four go.
