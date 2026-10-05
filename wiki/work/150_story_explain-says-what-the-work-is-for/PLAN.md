# 150 · aof:explain says what a work item is for — build plan

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## Mechanism

**The path branch lives in the one resolver.** `findWork` in `discovery.mjs` tries, in order: a
bare number, `NN/SS`, a span, then free text. Add the path branch AFTER the pair and span tests
(so `148/01` and `148/01-02` never reach it) and BEFORE free text: a query holding `/` or `\` is
`path.resolve`d against a `cwd` option (default `process.cwd()`), a trailing separator dropped,
and a final `*.md` segment replaced by its folder. Match it against each item's `dir`,
normalised the same way and compared case-insensitively on win32. An exact folder match is the
only match: `wiki/work/backlog` must answer `[]`, never every backlog item. Nothing here reads a
file's content, so FF content-free-discovery still holds. `find.mjs`'s usage line gains
`<path>`; its render, json and exit faces are unchanged.

**The command is prose over existing reads.** `explain.md` follows `recent.md`'s shape:
`argument-hint: "<ref…> [--verbose]"`, `allowed-tools: [Read, Grep, Glob, Bash]`. For each ref,
in order: `aof work find "<ref>" --json`; zero rows → "matches no work item", go on; several
rows → list ref + title, explain none, go on; one row → `aof work doc <ref> <DOC>` for the type's
record doc, and under `--verbose` `aof work list <ref>` (a milestone's stories) and `aof work tasks
<ref>` (a story's tasks). Name per type where the purpose lives (story → `## User story`,
milestone → objective, spike → question, chore → intent, uat → scope). Mark `number: null` rows
as backlog and `archived: true` rows as archived and done. State the read-only promise once, in
one place, and mention write verbs only inside it.

**The bundle census moves with the command.** Add the member to `bundle.json` in its sorted
place, regenerate `manifest.json`, then `aof work update` renders the three runtime copies and
the lock. Every literal command census moves in the same diff: `bundle.suite.mjs` COMMAND_IDS,
the autonomous shell-out list, the learning-edge `EXCLUDED` map ("explains items; reads only,
cuts nothing") and the README table.

## Verification step

With `AOF_GLOBAL_HOME` in a fresh temp dir, run `scripts/test.mjs --only` over
`packages/work/test/work-resolve.suite.mjs` (through its index), `test/bundle/explain-command.test.mjs`,
the census suites above, and every importer of `discovery.mjs` that `aof graph impact` lists. Then
install the payload and, from the repo root, run `aof work find
wiki/work/backlog/story_a-halted-lane-is-reaped --json` (one row) and `aof work find
wiki/work/backlog --json` (`[]`). Record `git status --porcelain`, run `/aof:explain 147 999
wiki/work/backlog/story_a-halted-lane-is-reaped 129 loop`, and check the porcelain is unchanged.

## Out of scope

- A CLI `aof work explain` (Q3), and any stored copy of an answer.
- Explaining a single task `.feature`: a task is explained through its story.
- Ranking or recommending what to schedule: the operator decides.

## Known traps

- `aof work find` matches free text with `includes`, so a slug fragment can hit several items;
  that is E6's listing, not a bug to narrow.
- Census lists on this branch may already carry `repair` from 147; rebase before editing them.
