@executable @cli @work @work-stream
Feature: the control writes a worker's ask on the assignment row, and the execution overlay carries it while the row waits

  ADR-010 §3. `global_assignments` gains a nullable `ask` column (JSON text). It is added by the
  house's idempotent, PRAGMA-checked `ALTER TABLE` in `src/global-work-store.mjs`, the idiom that
  added `session_id` and `code`. The `settle-assignment` reactor passes the payload's `ask` into
  `transitionAssignmentState`, and `updateAssignmentState` (`src/assignment-record.mjs`) writes it
  only when given one. The execution projection (`src/board-mesh-execution.mjs`) adds `ask`
  (parsed) to an execution row only when the column is set and the row `awaitsAnswer`.

  RULINGS (architect, 2026-09-25). (1) Absent is not a clear. A later `resumed` or `done` write
  leaves the column as it was, and the projection hides it because the row no longer awaits an
  answer. A new park overwrites it. (2) `GLOBAL_WORK_SCHEMA_VERSION` moves only if the
  `session_id`/`code` precedent moved it. If it moves, the two suites that pin 9 move with the
  reason "131/ADR-010: the ask column". (3) An `ask` column that holds unparseable JSON projects
  `ask: null` after one `assignment-ask-unreadable` degrade.

  RULINGS (QA, 2026-09-25). A store opened on a version-9 database gains the column and keeps
  every row.

  Scenario: a park fact's ask lands on the row and in the overlay
    Given a `running` assignment row for `131/03` on worker "node-2976"
    When the control applies a park fact with `code: "needs-input"` and `ask: { question: "Decision needed: …", phase: "build", askedAt: "2026-09-25T15:00:00.000Z" }`
    Then the row's `ask` column holds that object as JSON
    And the execution overlay for `131/03` carries `ask` equal to it

  Scenario Outline: when the overlay carries the ask
    Given the row's `ask` column is set, and the row's state and code are <row>
    When the execution overlay is read
    Then `execution.ask` is <present>

    Examples:
      | row                          | present           |
      | `running`, `needs-input`     | the parsed object |
      | `running`, `resumed`         | absent            |
      | `done`                       | absent            |

  Scenario: an older store gains the column without losing a row
    Given a version-9 projection database holding three assignment rows
    When the store opens
    Then `global_assignments` has an `ask` column, the three rows are unchanged, and opening it again changes nothing

  Scenario: a park with no ask leaves the column alone
    Given a row whose `ask` column holds an earlier question
    When a park fact with no `ask` is applied
    Then the column still holds the earlier question
