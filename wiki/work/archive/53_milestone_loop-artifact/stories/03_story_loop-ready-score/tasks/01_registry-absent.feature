@executable @cli @work @validate
Feature: No loop graph, no penalty — the five 52 rows read `not-applicable`, leave the denominator, and the repo scores four out of four

  The story's headline, and the promise `SPEC §Scope` makes in prose that ADR-007 §6 makes in
  arithmetic: *"never a reason a plain loop cannot run"*. A repo with no `.aof/loops/`
  directory has no loop graph to be wrong about, and the score must say so rather than score it
  down. `loadLoops` answers the question cheaply and synchronously — a missing directory is the
  ENOENT branch at `src/work-loops.mjs:503`, `{present:false, nodes:[], findings:[]}`, and
  `work:loops-validate` then reports `{ran:false, findings:0}` for all five ids
  (`src/commands/loops-validate.mjs:34-35`, measured 2026-08-15). That `ran:false` is the driver:
  a row whose check did not run is `not-applicable`, its evidence names the absence, and it is
  excluded from `applicable` — so `applicable` is 4, `score` is `round(100 * passed / 4)`, and a
  repo that is otherwise in order reads 100 / `clears: "L2"` / `blocking: []`. The rows are
  PRESENT and marked, never omitted: an omitted row is indistinguishable from a forgotten one,
  which is the reporting discipline 52/ADR-011 §11/D2 ruled. The boundary that must not be
  confused with absence is an EMPTY directory: `readdir` succeeds on it, so `present` is `true`,
  all five checks RUN over an empty model and report zero findings, and the score is 9 of 9 —
  measured, not assumed. Mechanised as `test/loop-ready-registry-absent.test.mjs` — a NEW suite
  reusing `test/doctor-command-core.test.mjs`'s harness SHAPE, that file's ONLY edit being
  ADR-014's one-line envelope widening (superseding ADR-011 §3) — over a `mkdtemp` fixture repo
  driven through `loadWorkspace` +
  `invoke("work:doctor", …)` on the real registry, with `.aof/loops/` created, emptied or
  removed between runs, under an isolated `AOF_GLOBAL_HOME`, and imported AND spread in
  `scripts/test.mjs` inside this story's own labelled `// milestone 53 / story 03` block so the
  evidence lands with the contract (ADR-011 §1, TECH_DEBT item 48).
  ADR-007 §4, §5, §6; 52/ADR-007 §5; RESEARCH §Q6.

  Scenario: no `loops/` directory reports the registry absent
    Given a fixture work stream with no `.aof/loops/` directory
    When `aof work doctor --json` runs
    Then `loopReady.registry.present` is `false`
    And `loopReady.registry.composed` is `false`
    And `loopReady.registry.error` is 0
    And `loopReady.registry.warn` is 0

  Scenario: the five 52 check ids are PRESENT as rows, marked `not-applicable`
    Given a fixture work stream with no `.aof/loops/` directory
    When `aof work doctor --json` runs
    Then `checks` carries rows for `grounding`, `pairing`, `reference-ownership`, `actuator-arbitration` and `timescale`
    And each of those five rows has state `not-applicable`
    And they appear in `CHECK_IDS` order, after the four base rows
    And none of the five is omitted — an absent row and a forgotten row would read the same

  Scenario: each `not-applicable` row's evidence names the absence
    Given a fixture work stream with no `.aof/loops/` directory
    When `aof work doctor --json` runs
    Then every `not-applicable` row's `evidence` is a non-empty string
    And it names that no loop registry is declared
    And it does not report a finding count of zero as if a check had run

  Scenario: `not-applicable` rows are excluded from the denominator
    Given a fixture work stream with no `.aof/loops/` directory
    When `aof work doctor --json` runs
    Then `applicable` is 4
    And `applicable` counts exactly the rows whose state is `pass` or `fail`
    And `passed` never exceeds 4
    And the five `not-applicable` rows contribute to neither number

  Scenario: a repo with no loop graph and everything else in order scores four out of four
    Given a fixture work stream with no `.aof/loops/` directory
    And its config declaring `work.autonomous.maxAttempts` and `memory.backend`
    And every in-scope story carrying at least one task feature
    And zero `error`-severity doctor findings
    When `aof work doctor --json` runs
    Then `passed` is 4 and `applicable` is 4
    And `score` is 100
    And `clears` is `L2`
    And `blocking` is empty
    And the repo is not penalised for a graph it has no reason to have

  Scenario: `not-applicable` never appears in `blocking`, at any base-check state
    Given a fixture work stream with no `.aof/loops/` directory
    When the four base checks are driven through every one of their 16 pass/fail combinations
    Then `blocking` never names `grounding`, `pairing`, `reference-ownership`, `actuator-arbitration` or `timescale`
    And `blocking` names only ids whose row state is `fail`
    And `applicable` is 4 in every one of the 16 combinations

  Scenario: an EMPTY `loops/` directory is PRESENT, not absent — the boundary
    Given a fixture work stream whose `.aof/loops/` directory exists and holds no files
    When `aof work doctor --json` runs
    Then `loopReady.registry.present` is `true`
    And `loopReady.registry.composed` is `true`
    And all five 52 rows have state `pass` — the checks RAN over an empty model and found nothing
    And `applicable` is 9
    And an empty registry is a declared-and-clean registry, never an absent one

  Scenario: a `loops/` directory holding only non-`.md` files behaves as an empty one
    Given a fixture whose `.aof/loops/` directory holds `README.txt` and `notes.json` and no `.md` file
    When `aof work doctor --json` runs
    Then `loopReady.registry.present` is `true`
    And all five 52 rows have state `pass`
    And `applicable` is 9

  Scenario: adding or removing the registry changes nothing about doctor's own findings
    Given a fixture work stream
    When `aof work doctor --json` runs with `.aof/loops/` absent
    And then again with `.aof/loops/` present
    Then the `findings` array is byte-identical across the two runs
    And `errors`, `warnings`, `healthy` and `strict` are identical across the two runs
    And the exit code is identical across the two runs
    And only `loopReady` differs

  Scenario: the registry-absent path still performs the composition, and reports its answer
    Given a fixture work stream with no `.aof/loops/` directory
    When `aof work doctor --json` runs
    Then `work:loops-validate` is invoked exactly once
    And its `present:false` answer is what marks the five rows `not-applicable`
    And no loop module is read, parsed or imported to reach that answer

  Scenario: the registry-absent case is scope-invariant
    Given a fixture work stream with no `.aof/loops/` directory and two milestones
    When `aof work doctor --json`, `aof work doctor 00 --json` and `aof work doctor 00/01 --json` each run
    Then `registry.present` is `false` in all three
    And the five 52 rows are `not-applicable` in all three
    And `applicable` is 4 in all three

  Examples: what the on-disk shape of `.aof/loops` produces
    | `.aof/loops` on disk             | present | composed | the five 52 rows   | applicable |
    | no such path                     | false   | false    | not-applicable × 5 | 4          |
    | a directory, empty               | true    | true     | pass × 5           | 9          |
    | a directory, only non-`.md` files| true    | true     | pass × 5           | 9          |
    | a directory with loop records    | true    | true     | per `summary.checks`| 9         |

  Examples: registry absent — the four base checks decide everything
    | stream-coherent | cap-declared | memory-on | tasks-authored | passed | applicable | score |
    | pass            | pass         | pass      | pass           | 4      | 4          | 100   |
    | pass            | pass         | pass      | fail           | 3      | 4          | 75    |
    | pass            | pass         | fail      | pass           | 3      | 4          | 75    |
    | pass            | pass         | fail      | fail           | 2      | 4          | 50    |
    | pass            | fail         | pass      | pass           | 3      | 4          | 75    |
    | pass            | fail         | pass      | fail           | 2      | 4          | 50    |
    | pass            | fail         | fail      | pass           | 2      | 4          | 50    |
    | pass            | fail         | fail      | fail           | 1      | 4          | 25    |
    | fail            | pass         | pass      | pass           | 3      | 4          | 75    |
    | fail            | pass         | pass      | fail           | 2      | 4          | 50    |
    | fail            | pass         | fail      | pass           | 2      | 4          | 50    |
    | fail            | pass         | fail      | fail           | 1      | 4          | 25    |
    | fail            | fail         | pass      | pass           | 2      | 4          | 50    |
    | fail            | fail         | pass      | fail           | 1      | 4          | 25    |
    | fail            | fail         | fail      | pass           | 1      | 4          | 25    |
    | fail            | fail         | fail      | fail           | 0      | 4          | 0     |
