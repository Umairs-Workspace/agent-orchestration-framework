@executable @cli @work @validate
Feature: The snapshot reads a story's map and its answers, and budgets it, only when the gate is on and the map is there

  WHY. The lane is pure, so the one read it needs happens at the snapshot's impure edge, beside the
  `PLAN.md` probe in `src/work/doctor.mjs` (ADR-005 §2). The probe is bounded three ways, as the
  plan probe is: only for a story, only when `examplesEnabledFromConfig` answers on, and only when
  `EXAMPLES.md` is present. Stories that predate the gate own no map, and a probe that demanded
  one would report on the whole stream on the day the gate turns on (ADR-005 §3).

  The same read measures the map for the doc-budget lane. `EXAMPLES.md` joins `BUDGET_KEY` as the
  `examples` kind with a default of 50 lines, one screen (ADR-001 §1). It gets no length check of
  its own: a second rule over one question is a second authority, and `doc-over-budget` already
  refuses an over-budget document at the accepting item's door.

  RULINGS (PO, 2026-09-24).
  (1) The row carries the map as `examplesMap: { text, answers }`, or `null` when the probe did not
      run or found no file. `answers` is what `collectAnswers` returned for the story's ref. The
      line count rides the existing `docSizes` map as `docSizes["EXAMPLES.md"] = { lines }`, the
      plan probe's shape.
  (2) The file name is spelt once, by story 02's `EXAMPLES_DOC`; the probe and `BUDGET_KEY` both
      import it.
  (3) `work.doctor.budgets.examples` overrides the default through `budgetsFromConfig`, exactly as
      `plan` does. An absent or invalid value falls back to 50.
  (4) A story whose map is present while the gate is off is neither read nor measured: off means
      today (ADR-006 §3), budget lane included.

  RULINGS (QA, 2026-09-24).
  (1) "Present" means the file `EXAMPLES.md` directly in the story's own folder. An empty file is
      present (0 lines, text `""`) and reaches the lane, which reports it `empty-map`.
  (2) Every value `examplesEnabledFromConfig` resolves off (absent, `false`, a mistyped value, a
      misspelt key) behaves as absent here. The resolver's own diagnostics are 02's, not doctor's.

  RULINGS (developer feasibility, 2026-09-24).
  (1) The transcript directory is the option `projectsDir` of `doctorWork` and `buildSnapshot`,
      default null. The probe calls `collectAnswers(item, { projectsDir })` and names no workspace,
      so with null the engine reads stamped answers only and never reads the environment. The
      default is resolved at the command edge: `src/commands/doctor.mjs` passes
      `claudeProjectsDir({ cwd: ctx.workspace.projectRoot, env: process.env })`, the settle seam's
      resolution (03). The status door's accept preflight passes none; it runs the budget group only.
  (2) The gate reaches `buildSnapshot` as data, `examplesEnabled`, resolved once by
      `examplesEnabledFromConfig(config)` in `doctorWork` and again in `src/commands/doctor.mjs`,
      which builds its own snapshot and hands it to `doctorWork`. Both builders pass it.
  (3) `doctorWork` returns findings, not its snapshot, so a row is read from `buildSnapshot` called
      with the options `doctorWork` passes. That `doctorWork` passes them is seen in its findings.
  (4) A CLI run is handed the fixture store as `CLAUDE_CONFIG_DIR`; the directory is then
      `<store>/projects/<slug of the fixture root>`.
  (5) `examples: 50` joins the one `DEFAULT_BUDGETS` literal. FF-9603 and the config-sourced budget
      control read that literal and the budget group's source, and need no edit.

  Background:
    Given a fixture project in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And its work stream holds the milestone `134` and the stories `134/02` and `134/04`, all `in-progress`
    And a fixture transcript store in a third fresh temp directory, handed to `collectAnswers` as its transcript directory

  Scenario Outline: the probe reads a map only for a story, with the gate on, when the file is there — <case>
    Given the project's config sets `work.examples` to <gate>
    And <placed>
    When `buildSnapshot` builds the stream's snapshot with the options `doctorWork` passes it
    Then <row>

    Examples:
      | case | gate | placed | row |
      | on, story, present | `{ enabled: true }` | `134/04` holds an `EXAMPLES.md` | `134/04`'s row carries `examplesMap` with the file's text, and `docSizes["EXAMPLES.md"]` with its line count |
      | on, story, absent | `{ enabled: true }` | no story holds an `EXAMPLES.md` | every row's `examplesMap` is `null`, and no `docSizes` key is `EXAMPLES.md` |
      | on, milestone | `{ enabled: true }` | the milestone `134` folder holds an `EXAMPLES.md` | the milestone row's `examplesMap` is `null`, and its `docSizes` has no `EXAMPLES.md` |
      | on, one story of two | `{ enabled: true }` | `134/04` holds an `EXAMPLES.md` and `134/02` none | `134/04`'s row carries `examplesMap`, and `134/02`'s `examplesMap` is `null` |
      | on, empty file | `{ enabled: true }` | `134/04` holds an empty `EXAMPLES.md` | `134/04`'s row carries `examplesMap` with the text `""`, and `docSizes["EXAMPLES.md"]` with 0 lines |
      | on, a file in `tasks/` | `{ enabled: true }` | `134/04/tasks/` holds an `EXAMPLES.md` and the story folder none | `134/04`'s `examplesMap` is `null` |
      | off | absent | `134/04` holds an `EXAMPLES.md` | `134/04`'s `examplesMap` is `null`, and its `docSizes` has no `EXAMPLES.md` |
      | off, false | `{ enabled: false }` | `134/04` holds an `EXAMPLES.md` | `134/04`'s `examplesMap` is `null`, and its `docSizes` has no `EXAMPLES.md` |
      | off, mistyped | `{ enabled: "yes" }` | `134/04` holds an `EXAMPLES.md` | `134/04`'s `examplesMap` is `null`, and its `docSizes` has no `EXAMPLES.md` |
      | off, misspelt key | `{ enable: true }` | `134/04` holds an `EXAMPLES.md` | `134/04`'s `examplesMap` is `null`, and its `docSizes` has no `EXAMPLES.md` |

  Scenario: the row carries the story's own answers, read through the one collector
    Given the gate is on and `134/04` holds an `EXAMPLES.md`
    And a settled run of `134/04` is stamped with an answer for `134/04 Q1`, and a settled run of `134/02` with an answer for `134/02 Q1`
    When `buildSnapshot` builds the snapshot with the options `doctorWork` passes it
    Then `134/04`'s `examplesMap.answers` holds the `134/04 Q1` record and not the `134/02 Q1` one

  Scenario Outline: EXAMPLES.md is budgeted as the examples kind — <lines> lines
    Given the gate is on and `134/04`'s `EXAMPLES.md` is <lines> lines long
    And the project's config sets `work.doctor.budgets` to <budgets>
    When `aof work doctor 134/04 --json` is run from the fixture project's root
    Then the `doc-over-budget` findings for `134/04`'s `EXAMPLES.md` are <findings>

    Examples:
      | lines | budgets | findings |
      | 50 | nothing | none |
      | 51 | nothing | one warn, naming `EXAMPLES.md`, 51 lines and the 50-line budget |
      | 51 | `{ examples: 60 }` | none |
      | 61 | `{ examples: 60 }` | one warn, naming `EXAMPLES.md`, 61 lines and the 60-line budget |
      | 51 | `{ examples: 0 }` | one warn, naming `EXAMPLES.md`, 51 lines and the 50-line budget |
      | 51 | `{ examples: "sixty" }` | one warn, naming `EXAMPLES.md`, 51 lines and the 50-line budget |
      | 51 | `{ plan: 200 }` | one warn, naming `EXAMPLES.md`, 51 lines and the 50-line budget |

  Scenario: at the accepting door an over-budget map is an error
    Given the gate is on and `134/04`'s `EXAMPLES.md` is 51 lines long
    When `doctorWork` runs over the stream with `acceptingRef` `134/04`
    Then the `doc-over-budget` finding naming `134/04`'s `EXAMPLES.md` is at `error`

  Scenario: the examples kind resolves beside the plan kind
    When `budgetsFromConfig` is asked for `{}` and `budgetKeyFor` for `EXAMPLES.md`
    Then the budgets carry `examples: 50` beside the five existing kinds, which are unchanged
    And `budgetKeyFor("EXAMPLES.md")` answers `examples`

  Scenario: the doctor reports the gate's findings end to end
    Given the gate is on and `134/04`'s `EXAMPLES.md` holds R1 with E1 `[confirmed]`, and Q1 `business · open`
    And no run of `134/04` or `134` carries an answer
    When `aof work doctor 134/04 --json` is run from the fixture project's root
    Then the findings include one `example-question-open` error naming Q1 and one `example-provenance-unanchored` error naming E1
    And each is anchored at `134/04`'s `EXAMPLES.md`
    And the command exits non-zero, as it does for any error-severity finding

  Scenario: a map with warnings only does not change the doctor's exit code
    Given the gate is on and `134/04`'s `EXAMPLES.md` holds R1 with E1 `[proposed]`, and R2 with no example
    When `aof work doctor 134/04 --json` is run from the fixture project's root, once with that map and once with it removed
    Then the first run's findings include one `example-rule-no-example` warn and no `example-*` error
    And the two runs exit with the same code

  Scenario: the tenth lane is a stated raise of the src/work row
    When the source-directory budget control is run
    Then `src/work` counts 46 direct children against a ceiling of 46
    And the row's reason names `doctor-examples.mjs` as the tenth doctor lane, 45 -> 46
