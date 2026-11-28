# 210/00 · A project tells its agents how to test, in its own words — Outcome

## Delivered

### The testing-instructions key
`work.test.instructions` names a project file of plain-words testing guidance. The doctor's `test-instructions` check reports it `ok` when the file exists, an error when the declared file is missing, and a warning pointing at `/aof:map-tests` when the key is not declared.

- **The file is guidance, not input to a runner** — nothing executes or parses the file's text; agents read it, and a run's base reruns without it (210/05).

### The test step every testing skill reads
continue, review, verify, manual, teach, repair and add-uat, in the Claude Code, Codex and OpenCode renders, read the instructions file before they test, choose suites by name with `--reason`, check a fix with `aof test --failed`, and leave the whole tree to the regression gate. The structural review lane raises a finding for a suggested importer left unrun with no stated reason.

### `/aof:map-tests` drafts the instructions
`/aof:map-tests` drafts the project's instructions file from its test roots, runners, native tests and known hazards, sets `work.test.instructions`, and hands the draft to the operator to edit.

### This repo's instructions
`wiki/TESTING.md` maps this repo's areas to suites, lists the changes that need no run, says how to run the native `node:test` files, names the `:4182` and `recall-replay` hazards, and leaves the whole tree to the gate.

### The narrower test-layout doctor family
The doctor's test-layout family is `test-instructions`, `test-layout-suites` and `test-layout-resume`; the coupling, work-dir and graph-freshness checks are gone.

## Gaps

### `--suggest` scoped to a story's files
- **Status:** open
- **Discharge condition:** `aof test --suggest` accepts files, or the structural lane's prose names the bare form and its whole-working-tree scope (210 F-04).
The structural lane's prose compares a run with "`aof test --suggest` for the story's changed files", but `--suggest` takes no files and reads the whole working tree against HEAD, so another session's uncommitted work in the same checkout widens the suggestion.
