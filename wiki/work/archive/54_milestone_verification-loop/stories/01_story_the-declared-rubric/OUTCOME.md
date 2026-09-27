# 01 · The declared rubric — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The rubric is a declaration in its own home
`work.rubric` is a config subtree of its own — `command` (an argv array), optional `args.ref`, `env`,
and `report {format, path, floor}` — read by `declaredRubric` and by nothing else.
`work.controls.runners` answers its unchanged question over its unchanged readers; neither key is
derived from the other, and removing either leaves the other's answer identical.

### The declared argv runs element for element, with no shell anywhere
`rubricSpawnOptions` passes `shell: false`, so the array reaches the child unsplit, unjoined and
unre-quoted, and an argument carrying shell metacharacters is one argument with its characters
verbatim — no redirection, no pipeline, no second command.

### A present-but-unusable declaration halts, and is never mistaken for an absent one
A `work.rubric` whose `command` is a string, an empty array, a non-program, or absent yields
`indeterminate` / `runner-spawn-failed` and launches nothing — never `rubric-unconfigured`, the one
`indeterminate` that proceeds. The two are distinguishable by code alone, without reading a message,
and no tenth code was coined for either.

### An unconfigured repo is an honest no-op at every door
No `work.rubric` yields `indeterminate` / `rubric-unconfigured` naming `work.rubric` as the key to
set, with `runner` and `report` null and the observed case counts zero rather than absent. It is
never read as `pass` and never as `fail`, through the read face, through `--run`, for a story or a
milestone, and on a repeat invocation.

### Scope is the project's choice, and a whole-suite run says so
An `args.ref` is appended to the argv exactly once, followed by the item's own ref. Absent, the plan
carries no scope argument and reports `whole: true` beside `scope: null` — a reader can tell the
whole-suite run was the declaration's choice rather than aof's.

### `aof work grade <ref>` — a read face that executes nothing
The bare verb reports the planned argv, its cwd, the report format, the absolute report path, the
floor and the deadline, plus the last recorded grade, and spawns nothing; the declared report path is
neither created, read nor deleted by planning. `--run` is the only door to execution. A
never-recorded grade reads as *no grade recorded yet* and is never reported as `pass`.

### The command is registered once, CLI-reachable, and served nowhere
`work:grade` appears exactly once in the registry with a cli adapter and no launcher seam, is
reachable as `aof work grade`, and is a documented `BOARD_DEFERRED` member with its reason recorded
beside it — no `/api/work/grade` route exists, so a board page load launches no process. `board-ui`,
`ui/` and `src/bundle/commands/**` are unedited.

### One bounded, fully-captured spawn per `--run`
`stdio: ["ignore", "pipe", "pipe"]` — a runner that reads stdin gets EOF rather than hanging, and
**both** streams are captured, so a runner whose failures go to stderr (this repo's own shape) cannot
read as an all-green report. The exit status is read before the report is: a non-zero exit is never
overridden by a green report. `launched` is 1 for a run that passes, fails or times out, and no retry
is attempted inside a single grade.

### The deadline force-kills, and is resolved rather than chosen
`timeout` + `killSignal: "SIGKILL"` bound the child; a run that reaches it yields `indeterminate` /
`runner-timeout` reporting the deadline that bound it and the duration observed, with nothing from
that run left alive. The value comes from `69/ADR-001`'s single home `src/loop-bounds.mjs` via
`work.loop.startToCloseMs` — 30 minutes by default, the declared value when one is set, the default
again when the declaration is not a number. No second home for the bound exists in `src/**`, and
`work.dispatch.concurrency` and `work.autonomous.maxAttempts` resolve exactly where they did.

### Re-entrancy is refused structurally
Every spawn sets `AOF_GRADE_RUNNING` in the child's environment — the only variable aof contributes
that the project did not declare — and a `--run` that finds it already set refuses with
`runner-spawn-failed` before any other check, launching nothing. The invoking process's own
environment is unchanged, so a later `--run` from it is not refused. A rubric that invokes aof cannot
fork a grader tree however deep it is attempted.

### The child inherits its environment, with the declaration overlaid
The ambient environment reaches the runner; the declared `env` overrides same-named ambient
variables; everything else stays visible. What is forbidden is aof inventing a variable the project
did not ask for, not the child having a `PATH`.

### Five armed fitness functions
`acd-grade-never-imports-the-suite` (FF-5401), `acd-grade-unconfigured-is-additive` (FF-5404),
`acd-grade-read-face-never-executes` (FF-5405), `acd-grade-bounded-single-spawn` (FF-5406) and the
extension of `acd-controls-never-execute` (FF-5407) are registered and each has been observed failing
against planted defects — eleven across the five, with FF-5406 re-probed at accept on the accepted
bytes.

## Assumptions

- **The report source is the declared path first, the captured output second** — ADR-005 §2(a) fixes
  that a report must exist after the run without fixing which of the two a runner emits is "it", so
  a runner that writes only to its streams is still graded and `report-missing` keeps its meaning of
  *nothing was emitted at all*.
- **Captured output is bounded at 32 MiB and an overflowing run is not graded on its capture** — a
  report cut off mid-stream is the vacuous green this milestone refuses, so the truncated text is
  discarded and only a report written at the declared path can carry such a run.
- **`work.loop.startToCloseMs` stays 69's single home** — the deadline is resolved through it, so a
  rival bound home anywhere else would silently change what bounds a grade.
- **The re-entrancy stamp is an environment variable, so it is refused only where the environment is
  inherited** — a rubric that deliberately scrubs its child's environment could re-enter.

## Gaps

### No writer for the recorded grade
- **Status:** open
- **Discharge condition:** 54/03 writes `brief.grade` onto the run through `transitionRunStart`'s
  `edge.brief`.
The reader is landed and `gradesFromRuns` scans every run for `brief.grade`; nothing writes it, so
every repo reads *no grade recorded yet* and the evidence ratchet has no history to ratchet against.

### The grade is declared in the gate and invoked by nothing
- **Status:** open
- **Discharge condition:** 54/03 wires the grade rung into `invokeGateLadder`.
`GATE_ORDER`'s fourth row names `work:grade` and the ladder invokes `work:validate` and `work:doctor`
only, so nothing in the loop launches a rubric and `grade-indeterminate` is a stop no path reaches.

### The grade does not reach the board yet
- **Status:** open
- **Discharge condition:** 54/03's writer lands, at which point `work:run-status` carries it
  unchanged.
The grade is designed to ride the run record and arrive through the existing read; with no writer,
`work:run-status` returns no verdict and no codes for any item.
