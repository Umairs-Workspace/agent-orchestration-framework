@executable @cli @work @work-stream
Feature: The override is a recorded reason, not a flag — and an agent's word that the gate passed is not a form the door admits

  This is the first hard gate on the accept door in this stream, and the arguments against it are real
  and have precedent here. Milestone 66 faced the same choice for the observability report and
  declined — *"the measure→decide path already works through a human"*. And 63/R12 records a milestone
  accepted with two Outline rows unobserved because the environment could not host them, which a hard
  gate would have blocked.

  So the refusal ships with the escape those two argue for, in the idiom this stream already
  established. `--if-applicable` (74/00) made an expected refusal DATA rather than a 409 while every
  other refusal kept failing. The same move here: `--gate-override "<reason>"` permits the accept and
  writes the reason into the record as its own row.

  The reason is the whole mechanism. An override with no reason is refused, because a silent override
  is indistinguishable from no gate at all within two milestones — the gate would be present, always
  satisfied, and nobody would be able to say when it had last actually run. A recorded reason is
  readable at the next accept and diffable against the last one, which is the same property the green
  rows have.

  What is NOT admitted is the shape this story exists to close: an agent stating that the gate passed.
  There is no flag, no environment variable and no phase-prompt sentence that substitutes a claim for
  a run. The two admissible inputs are a recorded run and a recorded reason, and both are written by
  the command rather than by the party being checked.

  What would quietly undo this: an override that permits the move without writing a row; a
  default-empty reason accepted as a reason; an override row that a later green run erases; and a
  phase prompt that offers the override as the ordinary way past a slow gate rather than as the
  environment-cannot-host-it escape it is.

  ADR-008 §4. FF-9605.

  Scenario: an override permits the accept and records why
    Given a milestone whose regression record is absent
    When `aof work status <ref> done --gate-override "the WSL node cannot host the browser lane"` runs
    Then the move is permitted
    And a row is appended to the regression record carrying that reason
    And the row is marked as an override rather than as a gate run

  Scenario Outline: an override with no reason is refused
    Given a milestone whose regression record is absent
    When the move to `done` is attempted with an override whose reason is <reason>
    Then the move is refused
    And no row is appended

    Examples: a reason is required, and blank is not one
      | reason            |
      | absent            |
      | an empty string   |
      | whitespace only   |

  Scenario: an override over a red gate is permitted and recorded as such
    Given a milestone whose regression record's newest row is red
    When the move to `done` runs with a reason
    Then the move is permitted
    And the override row names the red row it overrode

  Scenario: an override row survives a later gate run
    Given a milestone whose regression record holds an override row
    When the gate later runs green and appends a row
    Then both rows are present
    And the override row is unchanged

  Scenario: an override is not a gate result
    Given a milestone accepted through an override
    When the record is read
    Then the override row is distinguishable from a gate run row
    And the milestone reports no green gate run

  Scenario: no path admits a claim in place of a run
    Given the module set of this story
    When it is examined for ways past the door
    Then the only inputs are a recorded gate run and a recorded override reason
    And no flag, environment variable or configuration key permits the move on a claim

  Scenario: the verify phase names both paths and prefers the run
    Given the shipped verify command document
    When its acceptance instructions are read
    Then they name the gate command as the ordinary path
    And they name the override as the escape for an environment that cannot host the run
    And they state that reporting the gate as passed is not a form of evidence
