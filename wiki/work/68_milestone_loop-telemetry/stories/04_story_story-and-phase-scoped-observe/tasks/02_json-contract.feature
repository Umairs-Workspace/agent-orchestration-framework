@executable @cli @work @validate
Feature: The scoped, per-phase answer lands through the registered `--json` door

  The milestone-08 spine holds: every new observable is a registered command with a stable `--json`
  contract, and the board is a thin face over it. `work:observe` is already that command
  (`src/commands/observe.mjs`), so this task widens the document it returns rather than opening a
  second door beside it.

  The SPEC is explicit that a `--json` contract and the existing board face are the surface, and
  that a hosted observability stack is out of scope — so this is the whole of the milestone's
  external interface. Everything stories 68/00 through 68/03 record has to be reachable here or it
  is unreadable.

  Two delivered behaviours are load-bearing and stay exactly as they are. The `--if-enabled`
  self-gate emits ONE `{ skipped: true }` document when observability is off
  (`src/commands/observe.mjs:41-47`) — the face's one-document discipline, so a machine caller
  always gets a parseable answer. And a direct `aof work observe` always runs, because an operator
  asked for it.

  ADR-002 (phase read from the declaration); ADR-006 (unattributed reported, not dropped);
  milestone-08 spine.

  Scenario: the document carries the scoped, per-phase answer
    Given an item with runs across several phases
    When observe is asked for that item with `--json`
    Then exactly one document is emitted
    And it is parseable
    And it carries the item's totals, its per-phase breakdown, and its per-agent rows

  Scenario: a story ref is answerable through the same door
    Given a story with its own runs
    When observe is asked for that story ref with `--json`
    Then the document reports on that story
    And its key set is the same as the one returned for a milestone

  Scenario Outline: the document states what it could not attribute
    Given an item observed with <situation>
    When the `--json` document is read
    Then it states <statement>

    Examples: absence is stated, never omitted
      | situation                                  | statement                                            |
      | runs that resolve to no item               | the count of unattributed runs                       |
      | runs with no declared phase                | the "no declared phase" grouping and its run count    |
      | runs whose spend was never measured        | that their spend is not measured, distinct from zero |

  Scenario: the disabled gate still returns one parseable document
    Given observability is disabled in configuration
    When observe is asked with `--if-enabled` and `--json`
    Then exactly one document is emitted
    And it reports that the run was skipped
    And no report is written

  Scenario: a direct request runs regardless of the gate
    Given observability is disabled in configuration
    When observe is asked for an item with `--json` and without the self-gate
    Then the item is observed
    And the document carries the full answer
