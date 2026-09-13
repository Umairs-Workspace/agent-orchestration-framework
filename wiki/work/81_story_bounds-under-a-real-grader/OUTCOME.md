# 81 · The loop's bounds survive a grader that takes real time — Outcome

## Delivered

### A grade that runs without stopping the loop
`aof work grade <ref> --run` spawns the declared rubric through `spawnRubricAsync`
(`src/commands/grade.mjs`), an asynchronous child that resolves the same
`{ status, stdout, stderr, error, signal }` shape `spawnSync` answered, so the event loop keeps
turning for the whole time a runner works: `SIGINT` reaches `onSigint` and becomes an
`operator-interrupt` halt naming the item being graded, queued timers fire, and every other run's
heartbeat consumption keeps draining. The spawn stamps no heartbeat of its own.

### A grade deadline derived from the window that supervises it
`gradeDeadlineFromConfig` (`src/loop-bounds.mjs`) returns `min(startToCloseMs, heartbeatMs)`, and
`src/commands/grade.mjs` resolves its deadline only through that function — it hard-codes no timeout,
reads neither `work.loop.startToCloseMs` nor `work.loop.heartbeatMs` behind their resolvers, and
declares no `work.loop.*` key of its own, so `LOOP_BOUND_CONFIG_KEYS`, `LOOP_BOUND_VALUE_RESOLVERS`
and the tuner's declared ranges are unchanged. On this repository the derived deadline is
**900,000 ms**, down from the 1,800,000 ms `startToClose` the grade used to resolve.

### A runner that outlasts its deadline is graded, not reaped
A child that exceeds the derived deadline is force-killed and reported as `ETIMEDOUT`, which reaches
`compileGrade` as the existing `runner-timeout` code and an `indeterminate` verdict; the loop halts
on `grade-indeterminate` naming `work:grade:runner-timeout` as its producer and carrying the deadline
that was exceeded, and no run is left `running` to be reclaimed as stranded. A child that out-talks
the capture ceiling is a distinct outcome — `ENOBUFS`, classified ahead of the shared `SIGKILL` — so
an overflow is never reported as a deadline.

### A capture ceiling counted in bytes
`spawnRubricAsync` keeps both streams as buffers and decodes the concatenation once at the end, so
the ceiling is the bytes its name and `maxBuffer` claim rather than UTF-16 code units, and a
multi-byte character split across a chunk boundary is settled rather than left to where the kernel
cut it.

### One bound on every grade payload that is written
`boundGradeFailures` (`src/work-grade.mjs`) is the single function that bounds a grade payload. It
lives in the pure leaf, imports nothing from `src/`, takes its ceilings and its measure from the
caller, refuses to return an over-ceiling payload, never returns an empty one, and appends a
`truncation` entry — a key, not prose — naming how many failures were dropped and whether a message
was cut. All four write surfaces call it: the re-driven run's `brief.grade`, the cap-exhausted report
line, the fix transport's `## REVIEW FINDINGS` block, and the operator's rendered verdict, whose
former `failures.slice(0, 20)` is replaced by the call rather than left beside it. The entry ceiling
is `GRADE_FAILURE_MAX_ENTRIES = 20` (the operator render's own literal, promoted) and the character
ceiling is `70`'s `PHASE_BRIEF_MAX_CHARS`; each surface measures the payload as it will be written,
including the `gate` key a statement entry gains after the bound returns.

### The GradeRecord itself is unbounded, and still carries the whole truth
`compileGrade` returns the runner's failures verbatim and whole, `aof work grade <ref> --run --json`
carries every one of them, the record's key set is exactly the one it carried before, no tenth
`GRADE_CODES` entry is coined, and `54/ADR-005 §2`'s ratchet is untouched.

### A re-drive the resume path reconstructed declares that it carries no grade
`drivenRow` (`src/commands/loop.mjs`) emits `graded: false` and
`gradeAbsence: "reconstructed-on-resume"` for a drive the resume path rebuilt — a key a consumer
branches on rather than prose it parses — and only where a rubric is declared, so a repository with
no `work.rubric` gains no byte. No grade is fabricated, the pre-interruption grade is not carried
forward onto the new tree (it stays readable where it was recorded), and a resume launches no child
process. `LoopState` keeps its ten top-level keys in their order and `actShape()`'s whitelist is
untouched.

### The fix transport carries the transport's own keys, and the grade rides beside it
`pendingFixes` is `70/04`'s declared shape verbatim, and `ctx.loopDrive.fix` is that shape — no
`GradeRecord` is among its keys and the driver's registered input schema is unchanged. The grade
travels in a separate `pendingGrades` map keyed by ref, read at exactly one place: the seam that
writes `brief.grade` on the run being started, through `transitionRunStart`'s `edge.brief`.
`src/effects/run-transitions.mjs` and `src/run-store.mjs` are passed through and unedited. All four
sites that prepare a pending fix — the gate re-drive, the progress `reset`, the progress `continue`
and the resume reconstruction — now prepare it the same way, so every graded entry names `work:grade`
as its producing gate on every branch and a validate finding is told from a graded case by a key.

## Assumptions

- **The declared rubric finishes inside the liveness window** — a consumer repository whose rubric
  legitimately exceeds `work.loop.heartbeatMs` now gets a named `grade-indeterminate` halt rather
  than a silent reap-and-retry, and the only remedy is raising that one existing key. This is the
  trade the story takes deliberately: a slow suite is refused loudly rather than killed quietly.
- **The two ceilings are the right ones for a payload nobody has yet overflowed in production** — the
  entry count reuses the operator render's declared 20 and the character ceiling reuses `70`'s
  `PHASE_BRIEF_MAX_CHARS`; neither number was measured against a real over-ceiling grade, because no
  declared rubric on this repository has produced one.
- **The capture ceiling and the payload bound are separate budgets** — `maxBuffer` bounds what is
  captured from the runner, `boundGradeFailures` bounds what is written from the record, and neither
  derives the other.
- **`gradeAbsence` is written for consumers that do not yet read it** — 62, 63 and 78 consume
  `LoopState` unchanged; the key is delivered and declared, and branching on it is theirs to do.

## Gaps

### The derived deadline has never been reached on this repository
- **Status:** open
- **Discharge condition:** a declared rubric measured against `work.loop.heartbeatMs` where the ratio approaches 1, or a recorded `grade-indeterminate` halt carrying `runner-timeout` produced by a real child rather than an injected stub.
The timeout path is mechanised over injected spawn seams and proven at the unit level, but this
repository's declared rubric finishes far inside the 900,000 ms deadline, so the halt has never been
observed against a real runner. The fault the story closes stays latent here by margin, exactly as it
was before — what changed is that the margin is now measured against the window that supervises the
grade rather than against twice it.

### No over-ceiling grade payload has been written by a real runner
- **Status:** open
- **Discharge condition:** a declared rubric emits more than 20 failing cases, or one failure message longer than the character ceiling, and the truncation statement is observed on a real re-drive.
Every one of the four write surfaces is proven bounded against constructed records. None has yet
bounded a payload a real rubric produced, so the ceilings are proven enforced and unproven
well-chosen.

### `gradeAbsence` is declared to three consumers that do not read it
- **Status:** open
- **Discharge condition:** 62, 63 or 78 branches on `graded`/`gradeAbsence` rather than treating `brief.grade` as unconditional.
The key that tells a consumer which drives carry a grade exists on the `driven` row and is asserted
there. The three milestones the declaration was written for consume `LoopState` unchanged, so the
ambiguity is removed from the document without yet being removed from any reader.
