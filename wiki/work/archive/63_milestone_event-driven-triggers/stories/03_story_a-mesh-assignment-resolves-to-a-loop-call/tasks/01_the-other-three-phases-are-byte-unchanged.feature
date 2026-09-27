@executable @cli @work @distribution
Feature: Three of the four phases answer exactly what they answer today, and one phase is the only thing that moves

  Four phases are dispatchable and only one of them has an orchestrator session to remove. The other
  three each run a single named step, so moving them would change three live paths to buy nothing this
  milestone scopes. The table below is therefore the spine of the whole story: three rows must come back
  from a changed tree with the same bytes they leave a delivered one with, and exactly one row is
  allowed to differ.

  The `refine` row is the one that reads like an exception and is not. Its command carries an
  `--autonomous` flag, so it looks like the phase this story is about; it is not. That flag cascades
  *within* the refine step, the gate order has no rung for it and the loop has no scope form that
  expresses it, so it stays a session on purpose and its string stays exactly as delivered. An
  implementation that moved every spelling of the word "autonomous" to a loop would break a live path
  and would look, from the outside, like thoroughness.

  The fourth column is not decoration. Every phase except `refine` accumulates on the branch the refine
  minted, and the measured cost of spelling that rule anywhere but its one home was a whole milestone
  built in a fresh worktree off main with none of its refined stories in it. Adding a fifth kind of
  launch is exactly the moment someone re-spells the phase list at the call site that needs it, so the
  branch answer for all five rows is asserted in the same pass as the command.

  How a wrong implementation slips past: the three session phases still work. They spawn, they type,
  they finish — so a smoke test says nothing. What drifts is a space, a flag, a re-ordered argument or a
  base-branch answer that is now computed one call site away, and each of those is invisible until the
  run it breaks is already on another machine.

  ADR-006 §1, §1a, §2. FF-6306.

  Scenario Outline: every dispatchable phase, its directive and the branch it runs on
    Given an item assigned to a worker on the <phase> phase
    When the directive for it is dispatched
    Then the directive's kind is <kind>
    And the session is told to type <command>
    And whether it runs on the item's existing branch is <branch>

    Examples: three rows are the delivered bytes, one row is this story, and the unknown degrades as it always has
      | phase                | kind      | command                          | branch |
      | refine               | a session | `/aof:refine <ref> --autonomous` | no     |
      | continue             | a session | `/aof:continue <ref>`            | yes    |
      | verify               | a session | `/aof:verify <ref>`              | yes    |
      | autonomous           | a loop    | nothing at all                   | yes    |
      | an unrecognised one  | a session | `/aof:refine <ref> --autonomous` | no     |

  Scenario: an assignment with no phase recorded is byte-identical to what it is today
    Given an item assigned from the command line, with no phase chosen
    When the directive for it is dispatched
    Then it carries the refine command exactly as a delivered tree sends it
    And it carries no loop launch
    And it resolves no base branch, exactly as a refine does not

  Scenario: the two spellings of "autonomous" are different things and stay different
    Given one assignment on the refine phase and one on the autonomous phase
    When both directives are dispatched
    Then the refine one is a session told to type its delivered command, flag included
    And the autonomous one is a loop launch that types nothing
    And neither answer has been reached by matching the word in the other's command

  Scenario: the three session directives are otherwise indistinguishable from today's
    Given the same assignment dispatched from a delivered tree and from a changed one, for each of refine, continue and verify
    When the two directives are compared field by field
    Then every field a worker reads is the same in both
    And no loop launch appears on any of the three
    And a worker that predates this story would behave identically on either

  Scenario: the phase vocabulary is still closed, and a fifth member cannot arrive by the side door
    Given the assign face offered every phase it accepts
    When a phase outside that set is submitted
    Then it is refused or coerced to the refine default exactly as it is today
    And the set the face accepts is the same set the dispatch answers for, with no member answered in one and not the other
    And no phase acquires a different branch answer at the dispatch than the one this table states
