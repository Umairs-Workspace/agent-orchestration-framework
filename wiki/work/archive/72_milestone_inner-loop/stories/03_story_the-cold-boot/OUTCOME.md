# 03 · The cold boot — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A session verb boots without the command registry
`src/cli.mjs`'s static import closure holds neither `src/command-core.mjs` nor `src/spine/face.mjs` — 25 modules, down from 277 — and `src/commands/mesh-session.mjs`'s closure holds neither and no dynamic import of them. The registry and the generic face are reached by `await import()` only on the dispatch arms below the session arm and inside `helpText()`, which is `async` and awaited at both of its call sites.

### The session arm is the first statement of `run()`
`command === "session"` dispatches before `helpText()`, before the route table is resolved and before any registry binding is used; `src/work.mjs` stays a static import.

### `aof session start`, `ping` and `end` behave as they did
Each verb records, refreshes or removes its own session leaf exactly as before, and the refusals it made before — `invalid-input`, `unknown-subcommand`, `session-arg-missing-workspace`, `session-arg-missing-repo`, `session-cwd-not-workspace` — it still makes, with no record written.

### This repository's settings carry one session hook per event, and the survivor is the managed one
`.claude/settings.json` holds one `SessionStart`, one `UserPromptSubmit` and one `SessionEnd` entry, each carrying its `aofManaged` marker; the three hand-authored copies are gone (six `aof session …` commands at HEAD, three now), so the presence ping shells once per prompt. The unmanaged `Bash|PowerShell` guard entry is present character for character.

### No unmanaged settings entry may duplicate a managed one, and the merge is untouched
FF-7206 pairs entries by event AND matcher, compares resolved invocations (command plus args, `${CLAUDE_PROJECT_DIR}` unexpanded, either spelling), admits the operator's own guard with a managed neighbour beside it, and imports nothing from `src/claude-settings.mjs`. `isAofEntry` and `spliceSettings` are unchanged.

### FF-7205 asserts structure and never a duration
The control walks both closures through the shipped `importClosure`, proves the walk transitive and non-empty against a planted fixture and two-sided floors, and censuses its own source for clock readings, elapsed-time subtractions and duration bounds.

### The delivered drift lane pins a literal
`test/bundle-claude-session-hooks.test.mjs`'s reference for the hand-wired session command is the literal `"aof session start"`, so a bundle changed to another spelling still reds; the delivered feature `49/07/00` is untouched, the supersession of its premise recorded in `ARCHITECTURE.md#ADR-005` §5.

## Assumptions

- **The route-id collision check no longer runs on the session path** — `deriveRouteTable` (`src/spine/face.mjs`) is reached only below the session arm; it still fires on every other verb and throughout the arch suite, so a colliding route cannot ship.
- **The closure count is a floor, not a pin** — the control requires at least five modules in each closure and the named members present; the measured 25 is evidence for the decision, not an assertion.
- **`.claude/settings.json` is tracked** — FF-7206 is a repository control over a tracked file and does not travel with the bundle.
- **Whether the Claude Code harness de-duplicated identical blocks is unobservable from aof** — the deletion is justified on the registration being wrong, not on a doubling this milestone could measure.
