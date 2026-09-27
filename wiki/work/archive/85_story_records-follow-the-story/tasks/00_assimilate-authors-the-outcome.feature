@docs @work @work-stream
Feature: A story carries a retrospective and an outcome, whichever door created it

  ONE RULE, BOTH DOORS. A story arrives either through the forward loop (`aof:add-story` → refine →
  continue → `aof:verify`) or through assimilation (`aof:assimilate-code`, which drives the item to
  `status: done` in its own step and never hands off to verify). Both must leave the same two records
  behind. Today neither door reliably does: assimilate authors a retrospective but no outcome, and the
  forward loop authors a per-story retrospective for a standalone story only.

  A COMMAND THAT ACCEPTS MUST LEAVE BEHIND WHAT ACCEPTANCE LEAVES BEHIND. `aof:assimilate-code` can
  reach the terminal state having never met the only prompt allowed to author an outcome. Story 84 is
  the demonstration: assimilated, accepted, and missing its outcome until it was authored by hand.

  THE ONE-WRITER RULE IS KEPT, NOT REPEALED. 39/ADR-004 exists to stop a developer/evidence subagent
  with `Write` from clobbering records and fabricating decisions — the template says so in its own
  header. That threat model names a SUBAGENT; the contract test implements it as "only verify.md".
  The two are not the same statement, and this task closes the distance: a main-session govern command
  that accepts may author, and a subagent still may not, ever.

  THE EXCLUSIONS TRAVEL WITH THE PERMISSION. `verify.md` states which types get an outcome and which
  do not, with a reason for each, precisely so a later reader does not "fix" an omission. Whatever
  authors an outcome applies that same table — a spike still carries none, a uat still carries none —
  or two doors will disagree about a spike inside one milestone.

  EVERY STORY GETS ITS OWN RETROSPECTIVE — nesting is not a reason to skip it. Measured before this
  change: 57 `RETROSPECTIVE.md` at driver level, zero under `stories/`. A story's lessons are the
  story's, and a reader of one story should find them there.

  @executable
  Scenario Outline: each door that accepts a story instructs both records
    When the shipped <prompt> is read
    Then it instructs the session to instantiate an OUTCOME.md from the shared template
    And it instructs the session to author a RETROSPECTIVE.md for the story
    And it names the same delivering types the verify prompt names

    Examples:
      | prompt                  |
      | assimilate-code command |
      | verify command          |

  @executable
  Scenario: a spike and a uat still carry no outcome, from whichever door
    When a door that authors outcomes reaches a spike or a uat
    Then it authors none
    And it states the reason rather than omitting the type

  @executable
  Scenario: the one-writer contract admits the govern commands and still refuses every subagent
    When the bundle prompts are scanned for a record-authoring instruction
    Then the commands that accept an item may carry one
    And no agent prompt carries one
    And the scan is non-vacuous because a known authoring prompt still matches

  @executable
  Scenario: a nested story carries both records in its own folder
    When a story nested under a milestone is accepted
    Then that story's folder carries its own RETROSPECTIVE.md
    And that story's folder carries its own OUTCOME.md

  @manual
  Scenario: an assimilated story is indistinguishable from a verified one in its record set
    Given a story assimilated through aof:assimilate-code
    When its folder is compared with a story accepted through aof:verify
    Then both carry an OUTCOME.md and a RETROSPECTIVE.md
