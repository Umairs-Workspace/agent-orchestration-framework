@executable @cli @work @validate
Feature: With a registry, the five composed rows ARE `work:loops-validate`'s `summary.checks` — read verbatim, never recomputed

  *"It cannot disagree because it does not compute"* (ADR-007 §3). When `.aof/loops/` exists,
  the five composed rows are not a second opinion about the loop graph — they are 52's own answer,
  transcribed. The single input is `work:loops-validate`'s `summary.checks[<id>]`, whose shape is
  `{ran: boolean, findings: integer}` (`src/commands/loops-validate.mjs:35`, measured 2026-08-15),
  and the decision procedure is total and reads nothing else: `ran:false` ⇒ `not-applicable`;
  `ran:true` and `findings === 0` ⇒ `pass`; `ran:true` and `findings > 0` ⇒ `fail`. No count is
  recomputed, no finding is re-classified, no severity is re-decided — 52's five checks emit
  `severity:"warn"` only (`src/work-loops-checks.mjs:89-91`) and the score neither promotes nor
  demotes one, because it never reads a severity at all. `registry.error` and `registry.warn` are
  `summary.error` and `summary.warn` verbatim, which is what makes the loader's OWN findings
  visible: a `loop-record-unparseable` is `severity:"error"` (`src/work-loops.mjs:517`) and lands
  in `summary.error` without touching any of the five check rows — a deliberate consequence of
  reading verbatim rather than inventing a tenth row, and the reason `registry.error`/`warn` are
  in the frozen shape at all. The one fault the composition must survive is a registry that cannot
  be READ: `loadLoops` rethrows anything that is not ENOENT (`work-loops.mjs:502-504`), and a
  `.aof/loops` that is a regular FILE raises ENOTDIR (measured 2026-08-15) — doctor degrades
  to `present:false` with the five rows `not-applicable` and the fault NAMED in their evidence,
  and its own findings and exit code are untouched, because a broken loop registry must never be
  able to break the health command. Mechanised as `test/loop-ready-composed.test.mjs` — a NEW suite
  reusing `test/doctor-command-core.test.mjs`'s harness SHAPE, that file's ONLY edit being
  ADR-014's one-line envelope widening (superseding ADR-011 §3) — by driving BOTH registered
  commands over the SAME fixture in one
  run (`invoke("work:doctor", …)` and `invoke("work:loops-validate", …)`) and asserting field
  equality, plus a spawned `aof work doctor --json` / `aof work loops validate --json` pair for the
  CLI faces, under an isolated `AOF_GLOBAL_HOME`, and imported AND spread in `scripts/test.mjs`
  inside this story's own labelled `// milestone 53 / story 03` block so the evidence lands with
  the contract (ADR-011 §1, TECH_DEBT item 48).
  ADR-007 §2, §3, §4; 52/ADR-007 §5; 52/ADR-011 §12; RESEARCH §Q6.

  Scenario: each composed row's state is decided by that id's finding count and nothing else
    Given a fixture work stream with a `.aof/loops/` registry
    When `aof work doctor --json` and `aof work loops validate --json` are both driven over it
    Then for each of the five frozen ids, `loopReady.checks[<id>].state` is `pass` exactly when `summary.checks[<id>].findings` is 0
    And it is `fail` exactly when that count is greater than 0
    And no other field of the loops document is consulted to decide a state

  Scenario: the composed evidence carries the same integer, verbatim
    Given a fixture work stream with a `.aof/loops/` registry producing findings
    When both commands are driven over it
    Then each composed row's `evidence` names the same finding count `work:loops-validate` reported for that id
    And no count is re-derived from the findings array
    And no count is capped, bucketed or rounded

  Scenario: `registry.error` and `registry.warn` equal `summary.error` and `summary.warn` exactly
    Given a fixture work stream with a `.aof/loops/` registry
    When both commands are driven over it
    Then `loopReady.registry.error` equals `summary.error`
    And `loopReady.registry.warn` equals `summary.warn`
    And the equality holds when the counts are 0 and when they are non-zero

  Scenario: a registry with zero findings passes all five composed rows
    Given a fixture whose `.aof/loops/` directory exists and whose five checks each report 0 findings
    When `aof work doctor --json` runs
    Then all five composed rows have state `pass`
    And `registry.present` is `true` and `registry.composed` is `true`
    And `applicable` is 9
    And with the four base checks also passing, `score` is 100 and `clears` is `L2`

  Scenario: a registry with findings fails exactly the rows whose counts are non-zero
    Given a fixture whose `summary.checks` reports grounding 9, pairing 3, reference-ownership 5, actuator-arbitration 3, timescale 0
    When `aof work doctor --json` runs
    Then `grounding`, `pairing`, `reference-ownership` and `actuator-arbitration` have state `fail`
    And `timescale` has state `pass`
    And `applicable` is 9
    And `blocking` names those four ids in `CHECK_IDS` order

  Scenario: the count is a threshold, not a weight — many findings on one check cost exactly one row
    Given fixture A whose `grounding` reports 1 finding and fixture B whose `grounding` reports 12
    And the other four checks reporting 0 in both
    When `aof work doctor --json` runs over each
    Then both score identically
    And both fail exactly one composed row
    And `passed` is the same integer in both
    And no finding count is ever summed into the score

  Scenario: no severity is re-decided — the score never reads one
    Given a fixture whose five checks together produce 20 `warn`-severity findings and no `error`-severity finding
    When `aof work doctor --json` runs
    Then `registry.warn` is 20 and `registry.error` is 0
    And the failing rows fail because their COUNT is non-zero, never because of a severity
    And no composed row carries a severity
    And promoting one of those findings to `error` in 52 would change `registry.error` and change no row state

  Scenario: the loader's own findings are recorded, never re-decided into a check row
    Given a fixture whose `.aof/loops/` holds a `.md` file with no frontmatter block
    When both commands are driven over it
    Then `work:loops-validate` reports a `loop-record-unparseable` finding of severity `error`
    And `loopReady.registry.error` counts it
    And all five composed rows still read exactly `summary.checks[<id>]` — the loader's finding changes none of them
    And no tenth check row is invented to carry it

  Scenario: `registry.composed` is true exactly when all five checks ran
    Given a fixture work stream
    When `aof work doctor --json` runs
    Then `registry.composed` is `true` when every `summary.checks[<id>].ran` is `true`
    And `registry.composed` is `false` when `registry.present` is `false`
    And `registry.present:false` never coexists with `registry.composed:true`

  Scenario: an unreadable registry degrades to the absent result and names the fault
    Given a fixture in which `.aof/loops` exists as a regular FILE rather than a directory
    When `aof work doctor --json` runs
    Then the command still returns its document and does not throw
    And `registry.present` is `false` and `registry.composed` is `false`
    And `registry.error` is 0 and `registry.warn` is 0
    And the five composed rows have state `not-applicable`
    And their `evidence` names that the loop registry could not be read, and the reason
    And `applicable` is 4

  Scenario: an unreadable registry never moves doctor's own findings or exit code
    Given the same file-shaped `.aof/loops`
    When `aof work doctor --json` runs
    Then `findings`, `errors`, `warnings`, `healthy` and `strict` are identical to the run with no `loops` path at all
    And the exit code is identical
    And no doctor finding is emitted about the loop registry — the score reports, it never adds a check group

  Scenario: the composed rows are registry-wide and therefore scope-invariant
    Given a fixture work stream with a `.aof/loops/` registry producing findings
    When `aof work doctor --json`, `aof work doctor 00 --json` and `aof work doctor 00/01 --json` each run
    Then the five composed rows carry identical states across all three
    And `registry.error` and `registry.warn` are identical across all three
    And a scope narrows the base checks, never the graph

  Scenario: the composition reaches 52 through the command id, never through a module
    Given the real registry
    When `aof work doctor --json` runs over a fixture with a registry
    Then the answer arrives from `work:loops-validate`'s own `run()`
    And replacing that command's answer in the registry changes the composed rows accordingly
    And no `work-loops*.mjs` export is read directly to reach the same fact

  Examples: `summary.checks[<id>]` decides the row, totally
    | `ran`  | `findings` | row state       | counts toward `applicable` | can appear in `blocking` |
    | false  | 0          | not-applicable  | no                         | no                       |
    | true   | 0          | pass            | yes                        | no                       |
    | true   | 1          | fail            | yes                        | yes                      |
    | true   | 3          | fail            | yes                        | yes                      |
    | true   | 12         | fail            | yes                        | yes                      |

  Examples: the five composed rows over their finding counts
    | grounding | pairing | reference-ownership | actuator-arbitration | timescale | composed rows passing | applicable |
    | 0         | 0       | 0                   | 0                    | 0         | 5                     | 9          |
    | 1         | 0       | 0                   | 0                    | 0         | 4                     | 9          |
    | 0         | 1       | 0                   | 0                    | 0         | 4                     | 9          |
    | 0         | 0       | 1                   | 0                    | 0         | 4                     | 9          |
    | 0         | 0       | 0                   | 1                    | 0         | 4                     | 9          |
    | 0         | 0       | 0                   | 0                    | 1         | 4                     | 9          |
    | 12        | 0       | 0                   | 0                    | 0         | 4                     | 9          |
    | 9         | 3       | 5                   | 3                    | 0         | 1                     | 9          |
    | 1         | 1       | 1                   | 1                    | 1         | 0                     | 9          |

  Examples: what the loops document contributes, field by field
    | loops document field           | `loopReady` field                | relationship            |
    | `present`                      | `registry.present`               | verbatim                |
    | `summary.error`                | `registry.error`                 | verbatim                |
    | `summary.warn`                 | `registry.warn`                  | verbatim                |
    | `summary.checks[<id>].ran`     | `checks[<id>].state`             | false ⇒ not-applicable  |
    | `summary.checks[<id>].findings`| `checks[<id>].state`             | 0 ⇒ pass, >0 ⇒ fail     |
    | `summary.checks[<id>].findings`| `checks[<id>].evidence`          | named verbatim          |
    | `findings[]` (the array)       | nothing                          | never read row by row   |
    | `findings[].severity`          | nothing                          | never read at all       |
    | `source`                       | nothing                          | never read              |
