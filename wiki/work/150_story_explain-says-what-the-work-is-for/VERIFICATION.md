---
doc: verification
updated: 2026-10-05
---
<!--
  Story VERIFICATION.md — is story 150 truly done, and what is the evidence?
  Parentless story (parent: null): no milestone SPEC box to tick, no milestone regression gate.
  No sibling ARCHITECTURE.md: 150 declares no FF-NN of its own. No UI surface, no DESIGN.md: no
  design-conformance section.
-->
# 150 · aof:explain says what a work item is for, without writing anything — Verification

## Method

Lanes in scope: `@executable` (tasks 00–02), two `@manual` (task 01 E2, task 02's real call) and
one `@uat` (task 02 R3). Run inline by the product owner, who is also the single writer allocating
the finding ids below.

Every suite ran under a fresh `AOF_GLOBAL_HOME`, with exit codes and both streams read. The checkout
is shared with the sessions building 147 and 149, so every suite ran in the detached worktree
`aof-150`: first at `45ed566e` (150's build, whose code is identical to `0b4ed56d`), then at
`7e171087` (the branch HEAD, carrying 147 and 150 together), so the bundle census was checked with
both new commands in it. The `@manual` runs were real headless sessions
(`claude -p "/aof:explain …" --allowedTools Read Grep Glob Bash`, the parent's `CLAUDE*` variables
removed) in the repo root. `aof` on PATH is the npm link into this checkout (`packages/core`), so
those sessions ran 150's code; the installed payload (`0366a4fa.20261002T103106`) is not on that path
and was not reinstalled.

The one cited control, m00/ADR-001's content-free discovery (`test/arch/work/work-content-free-discovery.test.mjs`),
ran green in the story lane. Its fixture resolves a number, a pair and a slug, not a path, so it
does not reach 150's path branch. That branch is pinned by the 150/00 suite, which was seen red
(evidence below).

## Verification evidence

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story lane) | `scripts/test.mjs --only` over `packages/work/test/index.mjs`, `test/bundle/index.mjs`, `packages/core/test/index.mjs`, the content-free discovery control, the backlog/archive enumerate and archive-is-a-move suites, the autonomous shell-out and learning-edge censuses, every arch-test importing `@aof/work/discovery`, and the two `command-inventory.json` readers, at `45ed566e` | **1255 ok, 0 failing cases**, including all 4 `work/resolve (150/00)` cases and all 12 `150 task 01`/`150 task 02` cases. The only `not ok` line names `packages/work/test/discovery.test.mjs`, a `node:test` file the runner cannot load as an array | tasks 00–02 |
| `@executable` (native) | `node --test packages/work/test/discovery.test.mjs` | 6 tests, 6 pass, exit 0 | task 00 |
| `@executable` (workspace sweep) | `scripts/test-workspace.mjs aof`, then `@aof/work`, at `7e171087` (147 + 150) | `aof`: **344 registered + 2 native, failures 0**. `@aof/work`: **319 registered + 101 native, failures 0** | tasks 00–01 |
| red probe (150/00) | in `aof-150`, replaced the exact-folder match in `findWork`'s path branch with a case-folded `startsWith(folder)`, then ran `packages/work/test/index.mjs` | red: `not ok - work/resolve (150/00): a path that names no item folder answers no row …` with `AssertionError: "wiki/work/backlog" answers []`, actual: every backlog row. Reverted; worktree clean | task 00 |
| PLAN check: path resolves | from the repo root: `aof work find wiki/work/backlog/story_a-halted-lane-is-reaped --json`, then `aof work find wiki/work/backlog --json` | one row, `ref: a-halted-lane-is-reaped`, `number: null`; then `[]` | task 00 |
| PLAN check: from a subdirectory | from `packages/`: the absolute path, then `../wiki/work/backlog/story_a-halted-lane-is-reaped` | both answer the one row, with `dir` relative to the shell (`..\wiki\work\backlog\…`) | task 00 |
| `@manual` E2: setup | `git status --porcelain` recorded (36 lines, the 149 session's work); the `runs/` listings and `status:`/`updated:` of 147 and 149 recorded | 147: `done`, `2026-10-04`, 2 run files; 149: `in-progress`, `2026-10-04`, 3 run files | task 01 E2 Given |
| `@manual` E2: the run | `/aof:explain 147 149 --verbose` | exit 0. Both explained in order, each with the default paragraph, then scope, tasks by file, `Depends on:` (147: "nothing. The frontmatter has no `depends:` field") and `Still open:` (149: "all five tasks are unticked") | task 01 E2 When |
| `@manual` E2: the tree after | the same three records, re-taken | porcelain **unchanged** (`diff` empty); neither `runs/` folder gained a file; 147 still `done`/`2026-10-04`, 149 still `in-progress`/`2026-10-04` | task 01 E2 Then |
| `@manual`: the five-ref call | `/aof:explain 147 999 wiki/work/backlog/story_a-halted-lane-is-reaped 129 loop` | exit 0, answers in the order given. **147** first, in 5 sentences. **999**: "matches no work item." **The backlog story**: "(story, not-started, in the backlog and not yet scheduled)" then its purpose, citing the record's measured case. **129**: "(milestone, done, archived)", ending "It groups 7 stories, and all 7 are done", naming none. **loop**: "matches about 40 items, so none are explained. Ask again with one ref:" then 45 `ref \| title` lines. Porcelain unchanged after this run too | task 02 R2 `@manual` |
| `@uat` | see `## User sign-off` | pass | task 02 R3 `@uat` |
| gate | `aof work validate 150` | `PASS — 150 is well-formed.` exit 0 | step 4 |
| gate | `aof work doctor 150` | **No `control-unresolved`** at either severity. Warns only: `numbering-gap`, `rubric-join-unchecked`, `depends-edges-unchecked` (stream-wide) | step 4 |

## User sign-off

| scenario | procedure | result | signed off |
|---|---|---|---|
| task 02 R3 · the operator can decide from the answer | the operator ran `/aof:explain` in a Claude Code session in this repo over three items they did not remember, one with `--verbose`, and read the answers without opening a record doc | **Pass**: "I could decide" for each whether to schedule, refine or drop it | operator, 2026-10-05 |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-150-01 | The Claude renderer drops `allowed-tools` and `argument-hint` from every rendered command, not only this one. `.claude/commands/aof/explain.md` carries no `allowed-tools: [Read, Grep, Glob, Bash]`, so task 01's "offers no writing tool" holds in the source asset (which E1 reads) but not in the copy a session loads. In a live session, read-only rests on the command's prose, and the E2 run showed the prose held | gap | non-blocker | defer: renderer-wide, every command, outside 150's `files:` | OUTCOME `## Assumptions`; RETROSPECTIVE | open |
| F-150-02 | In the five-ref call the default answers ran past the 3–5 sentence bound: the backlog story got 7 sentences, 129 got 7 (its story count is one of them). 147 got 5. The `loop` listing said "about 40" over 45 rows. The prose states the bound; the session did not keep it on every item | defect | non-blocker | accepted as-is by the operator at the `@uat` (2026-10-05); the `@manual` bounds 147 only, and it held | RETROSPECTIVE | closed |

## Accept decision

**Accepted, 2026-10-05.** Tasks 00–02 are green on the story lane and on the `aof` and `@aof/work`
workspace runners at the branch HEAD, which carries 147's `repair` and 150's `explain` together. The
path branch's exact-folder rule was seen red. Both `@manual` scenarios held in real sessions: the
five refs were answered in order with every mark the contract names, and neither run changed
`git status`, a `runs/` folder, a status or an `updated:` date. The operator signed off the `@uat`.
Validate passes and doctor reports no unresolved control. No blocker is open: F-150-01 is deferred,
and F-150-02 was accepted as-is by the operator.
