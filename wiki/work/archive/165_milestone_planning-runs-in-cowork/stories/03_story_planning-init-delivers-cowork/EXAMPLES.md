# 165/03 · Planning init delivers Cowork — example map

## R1 · One command writes the packages, says how to install them, and never claims the install happened
- E1 · Claude is recorded; I run `aof planning init --runtime cowork`: it writes `<aof home>/cowork/aof.plugin` and `<aof home>/cowork/pm-skills/pm-execution.plugin`, `pm-product-discovery.plugin` and `pm-product-strategy.plugin`, prints the upload steps (Customize › Plugins › Add › Upload plugin) naming each file by its full path and saying to start a new Cowork task afterwards, writes nothing under the repo's `.aof/cowork/`, and exits 0 [stated Q4]
- E2 · I run `aof planning init --runtime cowork --dry-run`: it prints the four paths and the upload steps; nothing is written, nothing is cloned, nothing is spawned [proposed]
- E3 · The planner clone fails mid-run: it exits non-zero, no `.plugin` file is written, and no cowork lock entry is recorded [proposed]
- E4 · After a successful run, the lock's cowork entry says `installConfirmed: false`, and the output says the install is not confirmed; no line says the plugins were installed [proposed]
- E5 · I install the packages in Cowork, connect the repo folder, write a PRD with the planner and run `/aof:shatter`: the milestone SPECs land in `wiki/work/backlog/`, and `aof work validate` run from Windows passes [proposed]

## R2 · Cowork is recorded beside claude and codex
- E6 · Claude is recorded; the cowork run adds a cowork entry without `--force`, and the claude entry is exactly what it was [proposed]
- E7 · Cowork is recorded; a second `--runtime cowork` without `--force` is refused, and with `--force` the packages are rewritten and only the cowork entry is re-pinned [proposed]

## R3 · `--scope` has no meaning for Cowork
- E8 · I run `aof planning init --runtime cowork --scope user`: it is refused, exits non-zero, writes nothing, and says `--scope` applies only to claude [stated Q1]
- E9 · I run `aof planning init --runtime cowork` without `--scope`: it runs, and the lock's cowork entry carries no scope [proposed]

## R4 · The packages live once in the aof home, never in the project
- E10 · After a cowork run, `git status` lists only `.aof/aof.lock.json`, and the cowork entry names each package by a relative path under `cowork/` (no absolute path enters the committed lock) [stated Q4]
- E11 · A second project's cowork run writes the same packages, with the same bytes, to the same place in the aof home [stated Q4]

## R5 · Without the aof CLI, a check a skill cannot run is reported unvalidated, never as a failure
- E12 · In Cowork (no `aof`), shatter's step 6 says validate must pass. The run finishes with its report marked unvalidated, naming the skipped validate as one to run from Claude Code or Codex, instead of ending in a state the skill calls blocking (found at E5, 2026-10-20) [proposed]

## Questions
- Q1 · business · answered · `--scope` chooses which Claude Code settings file holds the planner (user, project or local). It means nothing in Cowork, because a Cowork plugin is saved to your Claude account. If someone runs `aof planning init --runtime cowork --scope user`, should aof (a) **refuse**: exit non-zero, write nothing, and say `--scope` applies only to claude (E8 as written), or (b) **run**, ignore `--scope`, and print a note that it was ignored (how codex's marketplace step treats it today)? Answer: (a) refuse.
- Q2 · business · answered · The `.plugin` files under `.aof/cowork/` (about 0.5 MB, 4–5 files) can be rebuilt at any time from the commit the lock records, and they change on every aof upgrade or `--force`. Should they (a) **stay out of git**: aof writes `.aof/cowork/.gitignore`, and each person who plans in Cowork runs the init once (E10 as written), or (b) **be committed**, so a teammate can upload them without running aof? Answer: (a) stay out of git; aof writes `.aof/cowork/.gitignore`. Superseded by Q4: nothing is written in the project any more, so there is nothing to ignore.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-001 · What marks the install unconfirmed? `cowork.installConfirmed: false` on the entry. aof never writes `true`, because it cannot see Cowork.
- Q4 · business · answered · Where do the packages go? Refine defaulted `.aof/cowork/` in each project (ADR-005). The operator asked at verify (2026-10-20): the packages are the same for every project and Cowork installs to the account, so should they live once in the global aof home? Answer: yes, `<aof home>/cowork/aof.plugin` and `<aof home>/cowork/pm-skills/<plugin>.plugin` (ARCHITECTURE.md#adr-006).
