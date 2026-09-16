@executable @cli @work @work-stream
Feature: The acceptance horizon — a check may gate only on a record somebody may still edit

  ACD holds a delivered record IMMUTABLE: an accepted `.feature` gets no edit, no annotation, no
  `@superseded` tag. A gate that fires on one is therefore a permanent red that no legal act can
  clear — and a gate nobody can clear is a gate that gets silenced, which is the finding's own C0
  lesson (§5a) arriving one layer up.

  MEASURED 2026-08-15, RE-RUN BY THE ARCHITECT AFTER QA'S CATCH. Over all 653 `.feature` files in
  `wiki/work`: 14 files carry 40 lines a strict Gherkin parse rejects, across 9 milestones — 2.1%,
  against the investigated downstream milestone's 89% (33 of 37). The corpus is healthy and the
  gate is STILL unlandable without this rule, because 13 of the 14 belong to milestones whose
  status is `done` (00, 04, 27, 37, 38, 43, 49, 52). The fourteenth is
  `53/01/tasks/04_gate-order-and-cap.feature` — 18 of the 40 lines, under an `in-progress`
  milestone, live and fixable. That one file is the whole argument: it is exactly where a contract
  gate should bite, and the other thirteen are exactly where it must not.

  WHY IT IS A MILESTONE RULE AND NOT A CLAUSE INSIDE ONE CHECK. Every check milestone 66 lands asks
  the same question, and story 66/02 imports the answer. Two copies of "is this item still open" is
  how `ITEM_RE` came to exist in four places — a scar `src/work-doctor.mjs:37-43` narrates in its
  own comment.

  SEVERITY IS WHERE THE TWO COMMANDS DIFFER, AND THE FACE OWNS THE EXIT (ADR-009/G). `aof work
  validate` has no severity and exits 1 on any finding (`src/commands/validate.mjs:71`; envelope
  `{path, problem}`, `src/work.mjs:793`). `work:doctor` carries `{code, severity, path, message}`,
  taking any error to a non-zero exit regardless of `--strict` (m15/ADR-002, pinned by
  `test/arch/acd-doctor-strict-exit.test.mjs`). The horizon owns severity and the face owns the
  exit code, so a `warn` under `--strict` exits non-zero as doctor's policy rather than as a
  contradiction.

  THE WARN TIER IS DOCTOR-LANE FACTS, AND THE PARSE FACT IS NOT ONE (ADR-009/E). There is no ninth
  code: a doctor parse code would make doctor a second reader of `.feature` files — TECH_DEBT item
  51's shape, rejected in ADR-003 — so the thirteen grandfathered files are SILENT in the gating
  lane by design, never advisory in it. The cost is named rather than discovered: a defect that
  lands and is accepted is invisible to the gating lane forever.

  THE STATUS VOCABULARY IS FROZEN, AND THE GRANULARITY IS SETTLED (ADR-009/F). `VALID_STATUS` is
  exactly five values — `not-started`, `in-progress`, `blocked`, `in-review`, `done`
  (`src/work.mjs:49`) — and the tree holds 229 `done`, 22 `not-started`, 4 `in-progress`, 1
  `blocked`. The horizon follows the OWNING item's own status: a task feature's is its story, a
  milestone record document's is the milestone. Ten items already carry a status their parent does
  not (m53 ×6, m66 ×4, all `in-progress` over `not-started`), which is why the granularity scenario
  is written rather than assumed.

  Scenario: the horizon has exactly one implementation
    Given every check this milestone lands must decide whether a record is still editable
    When the predicate ships
    Then it is exported from exactly one module and imported by every caller
    And no second implementation of the same decision exists anywhere under `src/`

  Scenario Outline: the predicate closes on one word and on nothing else
    Given an item whose `status` frontmatter is <status>
    When the horizon is asked about a record under it
    Then the item is <horizon>

    Examples: the frozen five (`src/work.mjs:49`), plus the three ways a value arrives outside them
      | status          | horizon | why                                                                                |
      | `not-started`   | open    | nothing has been delivered, so nothing is immutable                                |
      | `in-progress`   | open    | the live case the gate exists for                                                  |
      | `blocked`       | open    | blocked is unfinished, never delivered                                             |
      | `in-review`     | open    | review is exactly where a finding is still cheap to clear                           |
      | `done`          | closed  | delivered, immutable, therefore un-actionable                                      |
      | absent (no key) | open    | the horizon closes on the word itself, so a missing status never grandfathers       |
      | `Done`          | open    | a case-insensitive match would let one capital letter silence a live record         |
      | `complete`      | open    | outside the frozen five; validate reports the invalid value separately, as it does today |

  Scenario Outline: one predicate, two renderings, and the face owns the exit
    Given a check whose violation sits under an item that is <horizon>
    When <command> runs
    Then the finding is <finding>
    And the exit is <exit>
    And the findings set is byte-identical with and without `--strict`, because the gate is the face and never the check

    Examples: every doctor row is a doctor-lane fact — the parse fact has no doctor code (ADR-009/E) — and the `--strict` cells are m15/ADR-002's pinned matrix
      | horizon | command                    | finding                                              | exit                                                                          |
      | open    | `aof work validate`        | reported — validate has no severity to express doubt | non-zero                                                                      |
      | open    | `aof work doctor`          | `severity: "error"`                                  | non-zero                                                                      |
      | open    | `aof work doctor --strict` | `severity: "error"`, unchanged                       | non-zero                                                                      |
      | closed  | `aof work validate`        | not reported at all                                  | 0                                                                             |
      | closed  | `aof work doctor`          | `severity: "warn"`                                   | 0 — advisory, so the fact survives without gating                             |
      | closed  | `aof work doctor --strict` | `severity: "warn"`, unchanged                        | non-zero — the m15 warn-gate at the face, never an error the horizon produced |

  Scenario: the deciding status belongs to the item that owns the record, and a story is not its milestone
    Given a task feature inside a story's own `tasks/` folder
    When the horizon is asked about it
    Then the answer follows the STORY's `status`, settled in ADR-009/F, because the story is the item that owns `tasks/`
    And a milestone record document follows the MILESTONE's status, so 66 stays open while 66/00 freezes at its own accept
    And a `done` story under an `in-progress` milestone is closed — the state story 66/00 itself enters at accept, while 66/02 is still building against it
    And a story that is not `done` under a `done` milestone is open, so accepting a parent never silences a record its own story never delivered

  Scenario: inside a closed item validate goes quiet about the whole file, not merely about severity
    Given a `.feature` under a `done` item carrying BOTH free text in step position AND a tag outside the closed vocabulary
    When I run `aof work validate`
    Then neither is reported
    And the tag finding milestone 00 delivered is silenced along with the parse finding, which is a widening this contract states rather than one a reader discovers
    And neither fact resurfaces at `warn` under `aof work doctor`, because this milestone lands no parse code there
    And the cost this contract names is that a defect which lands and is accepted is invisible to the gating lane forever

  Scenario: the horizon is the lifecycle, never a date and never a hand-kept list
    Given two items created on the same day, one `done` and one `in-progress`
    When each is checked
    Then the answer follows `status` alone
    And no exemption list of file paths is consulted, because a list that can never be paid down is a lifecycle fact wearing a baseline's clothes

  Scenario: ACD never rewrites a contract an author already wrote
    Given the horizon exists to protect records ACD may not edit
    Then no code path under `src/` opens an EXISTING `.feature` for writing
    And the single admitted write site — the create-only migrate scaffold at `src/commands/migrate-folder.mjs:225-229` — only ever writes a file that did not exist, which is the exception this contract names rather than one a red fitness function discovers
