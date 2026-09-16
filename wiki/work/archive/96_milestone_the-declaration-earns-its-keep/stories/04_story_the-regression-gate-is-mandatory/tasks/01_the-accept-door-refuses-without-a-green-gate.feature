@executable @cli @work @work-stream
Feature: A milestone whose gate has not run, or has run red, is refused at the accept door — and the refusal lives in the command layer

  Story 03 narrows what a story lane runs. This stream has already paid that trade's price once, at
  full size, and written the lesson down: 63/R7 records 63/06's positive-control import moving a
  census split with the story's own lane green, the failure appearing only at the full-suite gate
  (F-63-H) — *"the scoping trade is sound and should stay, but it makes the milestone gate
  load-bearing, not ceremonial. Never accept a milestone on story-scoped greens alone."*

  A gate an agent can report as passed is not a gate. Today the full-suite run at verify is prose in a
  phase prompt, executed and reported by the same agent that did the work — which is milestone 59's
  own thesis about `@manual` evidence, applied to the last thing that should carry it. The lifecycle
  door story 73 built is the one place in this system where a claim becomes a refusal.

  The door lives in the COMMAND layer and that is not an implementation detail.
  `src/acceptance-horizon.mjs` imports nothing, deliberately, by 66/ARCHITECTURE ROUND 3/3: 66/02's
  FF-6605 forbids the controls lane reaching `node:fs` through its direct imports, so a predicate that
  reads a recorded result cannot live there and stay legal. Homing the refusal in the god node would
  fail 66/02 on arrival. It lands in `src/commands/item-status.mjs`, beside `--if-applicable`, which
  is the idiom this gate borrows.

  The scope is milestones. A story's `done` is untouched — the gate is bought back at the milestone
  door, which is where story 03 sold it, and putting it on every story would make a narrowed story
  lane pointless twice over.

  What would quietly undo this: reading the record from the acceptance horizon "because that is where
  the lifecycle lives"; a refusal code that collides with doctor's vocabulary; and accepting a record
  whose run widened, which is a partial run with a green row.

  ADR-008 §3, §5. FF-9605.

  Scenario Outline: the door reads the newest row and refuses what it must
    Given a milestone whose regression record is <record>
    When `aof work status <ref> done` runs
    Then the move is <outcome>

    Examples: three refusals and one acceptance
      | record                                              | outcome                                 |
      | absent                                              | refused `regression-gate-missing`       |
      | present, newest row red                             | refused `regression-gate-red`           |
      | present, newest row green but the run widened       | refused `regression-gate-missing`       |
      | present, newest row green from a whole-tree run     | permitted                               |

  Scenario: an older green row does not rescue a newer red one
    Given a milestone whose regression record holds a green row followed by a red row
    When `aof work status <ref> done` runs
    Then the move is refused `regression-gate-red`

  Scenario: a story's accept door is untouched
    Given a story with no regression record anywhere
    When `aof work status <ref> done` runs for that story
    Then the move is permitted
    And no gate refusal is raised

  Scenario Outline: every other lifecycle move is unaffected
    Given a milestone with no regression record
    When `aof work status <ref> <target>` runs
    Then the move is permitted

    Examples: the gate governs one edge and no other
      | target      |
      | in-progress |
      | in-review   |
      | blocked     |

  Scenario: the read form still reports the legal moves
    Given a milestone with no regression record
    When `aof work status <ref>` runs with no target
    Then it reports the item's status and its legal next moves
    And it raises no gate refusal

  Scenario: the refusal lives in the command layer
    Given the module set of this story
    When it is examined
    Then the two refusal codes are raised in the item-status command
    And the acceptance horizon imports nothing
    And the acceptance horizon names no record, path or gate

  Scenario: the refusal codes are disjoint from the vocabularies already in service
    Given the two gate refusal codes
    When they are compared with doctor's control finding codes and the audit's code space
    Then they appear in neither

  Scenario: the refusal names the repair
    Given a milestone whose regression record is absent
    When the move to `done` is refused
    Then the message names the gate command that would produce a record
