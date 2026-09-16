@executable @cli @work @work-stream
Feature: Elapsed and heartbeat age come from an injected now — the derivation is 126/00's per-attempt rule reused, and the module reads no wall clock of its own

  `126/00` lands the attempt arithmetic in `src/work/loop.mjs`: a reclaimed attempt ends at
  `heartbeatAt ?? updatedAt`, a settled one at `updatedAt`, a running one at `now`. ADR-003 §2 rules
  that `run-status` reuses it rather than re-deriving it, so what the operator reads and what the
  deadline enforces cannot disagree. The heartbeat-age fallback is `20/ADR-004`'s, already stated
  once at `src/run-store.mjs:1011-1023`: a run that never beat is aged from `updatedAt`.

  WHAT THIS STORY NEEDS OF THAT EXPORT, stated once so both builders hold to the same thing: the
  PER-ATTEMPT term over ONE record — `(record, now)` → milliseconds, ISO-8601 UTC-Z in and a number
  out, pure, reading no clock of its own (that module is forbidden one:
  `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs:92`), which is the shape the engine's
  own deciders take their time in (`decideScheduleToClose` parses `input.now`,
  `src/work/loop.mjs:776`). `126/00`'s contract names the LINEAGE SUMMER, whose total is the sum of
  exactly those per-attempt terms and which returns 0 for an empty lineage; so whether the term is
  exported under its own name or reached as the summer over the single-record lineage `[record]`, it
  is the SAME number by that contract. This story imports one of them and authors neither.

  WHERE `now` COMES FROM (ruled at this contract's beat, recorded as an amendment to ADR-003 §2).
  The derivation lives in the RENDER, which `run()` never sees, and the only seam that reaches a
  render is `cli.render(result, faceCtx)` — ONE construction site (`src/spine/face.mjs:145`) and one
  call (`:181`). So `now` is one additive key on that `faceCtx`; the face reads the wall clock there
  and nowhere else (it reads none today — no `Date.` appears in that module); and a test injects an
  instant by calling the render with its own `faceCtx`, which is how every scenario below is driven.
  The command's declared input gains NO `now` and `run()` does not change — an instant that reached
  `run()` would be an input to the document, and the document is frozen (task 02). `mesh:status`
  takes its `now` through its INPUT (`src/commands/mesh/identity.mjs:243`, `:256`) because its
  staleness is computed in `run()`; this is the same `22/R2` inject-the-clock discipline applied at
  the seam that actually carries this derivation.

  TWO RULES, KEPT APART, because a builder who fuses them gets one of them wrong. ARITHMETIC: when a
  figure is shown, its value is exactly what the engine returns for that record and that `now` — no
  clamp, no rounding, no special case. PRESENCE: a figure is shown only when the record carries what
  it is derived from — `createdAt` for the elapsed, `heartbeatAt ?? updatedAt` for the age, the age
  only while the run is still running — and a `queued` run shows neither, because no verb mints one
  (`src/run-store.mjs:268`) and a state that never ran makes no claim about running time. That the
  engine still CHARGES a queued attempt against the lineage clock (`126/00`'s own table row) is the
  clock's business and not the line's; the exemption is a presence rule, never a second arithmetic.
  Also, how the tables below are read back off a line: the duration's human form is the builder's, with
  the one constraint these Examples need — the exact millisecond count is recoverable from the line,
  so each figure carries its number, and a friendlier form beside it is free.

  What would quietly undo this: a `Date.now()` in the renderer; a second `updatedAt − createdAt` in
  the render so a reclaimed run shows eleven hours where the clock charges thirty minutes; a
  heartbeat age computed from `updatedAt` when `heartbeatAt` is present; the reclaimed rule applied
  to every settled run, which would end a clean `done` at its last beat instead of its close; and a
  `now` smuggled onto the command's input so the instant arrives through `run()` and the frozen
  document grows an input key.

  ADR-003 §2. ADR-001 §2. FF-12603.

  Scenario Outline: the three attempt shapes, over concrete instants
    Given a run record whose instants are those of row <shape>, all on 2026-09-08 UTC unless the cell carries a date
    When the render is called with a result carrying that one record and a `faceCtx` whose `now` is <now>
    Then that run's line shows an elapsed of <elapsed> milliseconds and a heartbeat age of <last beat>
    And where a figure is shown it is exactly the number the engine's per-attempt term returns for that record and that `now`, and where the cell reads `—` the line carries no such figure at all

    Examples: `—` means the figure is absent from the line — not `0`, not `null`, not a dash of the render's own
      | shape                       | createdAt                | heartbeatAt   | updatedAt     | reclaimedAt   | now           | elapsed | last beat |
      | reclaimed (124/00 attempt 1)| 2026-09-07T23:32:33.272Z | 00:02:19.028Z | 11:02:13.985Z | 11:02:13.985Z | 12:00:00.000Z | 1785756 | —         |
      | reclaimed, never beat       | 10:00:00.000Z            | null          | 11:00:00.000Z | 11:00:00.000Z | 12:00:00.000Z | 3600000 | —         |
      | settled `done`, beat mid-run| 10:00:00.000Z            | 10:12:00.000Z | 10:18:00.000Z | null          | 12:00:00.000Z | 1080000 | —         |
      | settled `failed`, not reclaimed | 10:00:00.000Z        | 10:20:00.000Z | 10:30:00.000Z | null          | 12:00:00.000Z | 1800000 | —         |
      | settled `cancelled`         | 10:00:00.000Z            | null          | 10:03:00.000Z | null          | 12:00:00.000Z | 180000  | —         |
      | `queued` — a state no verb mints | 10:00:00.000Z       | null          | 10:00:00.000Z | null          | 10:25:00.000Z | —       | —         |
      | running, beating            | 10:00:00.000Z            | 10:10:00.000Z | 10:10:00.000Z | null          | 10:25:00.000Z | 1500000 | 900000    |
      | running, beating, later now | 10:00:00.000Z            | 10:10:00.000Z | 10:10:00.000Z | null          | 10:40:00.000Z | 2400000 | 1800000   |
      | running, never beat         | 10:00:00.000Z            | null          | 10:00:00.000Z | null          | 10:25:00.000Z | 1500000 | 1500000   |
      | running, never beat, updated later | 10:00:00.000Z     | null          | 10:05:00.000Z | null          | 10:25:00.000Z | 1500000 | 1200000   |
      | running, `now` at its creation | 10:00:00.000Z         | null          | 10:00:00.000Z | null          | 10:00:00.000Z | 0       | 0         |
      | a streamed record with no `createdAt` | absent          | null          | absent        | null          | 12:00:00.000Z | —       | —         |

  Scenario: a zero duration is a duration
    Given the row whose `now` is its own `createdAt`
    When the render runs
    Then both figures are shown as zero-length durations
    And neither is omitted, and neither reads `null`, `NaN` or `Invalid Date`

  Scenario: the eleven-hour reading is the one the render must never produce
    Given 124/00's first attempt, created 2026-09-07T23:32:33.272Z, last heartbeat 00:02:19.028Z, reclaimed and updated 11:02:13.985Z
    When it is rendered with any `faceCtx.now` after the reclaim
    Then the elapsed shown is 1785756 milliseconds — under 30 minutes
    And the line carries no figure for 41380713 milliseconds — the `createdAt`-to-`updatedAt` span of that same record — in the millisecond count or in any human form printed beside it

  Scenario: the arithmetic has one home and the render adds no rule of its own
    Given each record and `now` in the table above
    When the engine's per-attempt term is called directly with that record and that `now` — or, identically, its lineage summer is called with the single-record lineage `[record]` and that `now`
    Then the number it returns is the number the line shows, for every row that shows one
    And the render applies no clamp, rounding rule or special case the engine does not, to any figure it shows
    And a settled or reclaimed run's elapsed is the same figure for every `faceCtx.now`, while a running run's moves with it

  Scenario: the module reads no clock, and `now` arrives on the `faceCtx` the face hands the render
    Given the source of `src/commands/run-status.mjs`
    When it is inspected with its comments stripped
    Then it contains no `Date.now()`, no `new Date(` and no `readFile`
    And the per-attempt term it renders is imported from `src/work/loop.mjs`, not written a second time here
    And the command's declared input is what it is today — `ref` alone, required, `additionalProperties: false` — carrying no `now`, and `run()` takes none
    And the render reads its instant from `faceCtx.now`, on the second argument `cli.render(result, faceCtx)` already carries
    And `src/spine/face.mjs` supplies `now` on the `faceCtx` it hands every render, from ONE wall-clock read in that module and no other

  Scenario: no `now` is a missing figure, never a broken line
    Given a `running` run carrying a full loop envelope, rendered once with a `faceCtx` that has no `now` and once with no `faceCtx` argument at all
    When the render runs
    Then the line still shows the run id, the state, the phase and the cycle the record holds
    And the two time figures are absent rather than invented
    And nothing in the output reads `NaN`, `Invalid Date` or `undefined`
