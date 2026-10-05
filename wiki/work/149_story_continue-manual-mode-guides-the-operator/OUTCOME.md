# 149 · Manual mode: continue guides the operator who builds the work themselves — Outcome

## Delivered

### Manual continue
`aof:continue <story|task> --manual` starts the story through its run, runs the story's tests once, prints a terminal-only guide (what is still red, the user story, each task's scenarios, `reads:`/`files:` with why each matters, the tests and the gate command, the plan, and an order), spawns no builder, and hands off to `aof:review <ref>`.

### Manual is one story, at every door
`--manual` is refused when combined with `--solo`/`--orchestrated`, refused for a milestone or span, and refused by the CLI door for a non-story ref (`continue-manual-not-a-story`) or a remote decision (`continue-manual-remote`). It is a per-run flag only, so the loop never composes it.

### aof:review
`/aof:review <ref>` reviews a story the operator built. It runs the story's tests, continue's gate ladder, a blast-radius ranking and continue's architect and QA lenses, fixes nothing, reports every finding to the operator, and closes its run `done`. With no Blocker it moves the story to `in-review` and names `aof:verify <ref>` next.

### aof:code-review removed
The bundle has no `code-review` command, `aof:autonomous` has no `--ship`, and `work.codeReview.autoComplete` is gone. `aof work update` deletes the three code-review renders from a repository whose lock records them, and assimilate-code hands off to `aof:verify`.

## Assumptions

- **A declared test runner** — "still red" is what `aof test --scope impacted --story <ref>` reports. In a project with no `work.test`, both prompts fall back to the project's own runner and say so.

## Gaps

### graphify-out ignore on the codebase graph build
- **Status:** open
- **Discharge condition:** `aof graph build` writes the nested `graphify-out/.gitignore` the memory backend already writes.
The blast-radius step in `aof:review` runs `aof graph build .`, which leaves `graphify-out/` untracked in a repository that does not ignore it (VERIFICATION F-01).
