@executable @cli @work @distribution
Feature: The launch is one more field on a frame that already carries two, and nothing it travels beside grows a key

  The directive frame already carries two additive fields that were added the same way this one is: the
  base branch the run accumulates on, and the commit the worktree is built from. The launch joins them,
  and the test of whether it joined them properly is that both of its neighbours keep answering exactly
  what they answered before — for the phase that changed as much as for the three that did not.

  The assignment record is the thing that must not move at all. It is frozen at ten keys, in order, and
  it has been the place every worker-side concern has wanted to live at some point. The phase already
  rides a side table for exactly this reason; the launch rides the directive for the same one. Asserting
  the count rather than describing the intent is deliberate: "the record is unchanged" is a sentence a
  reviewer agrees with, and a count is a thing that fails.

  On the worker side the claim is that the field is read once. That is a structural statement, so what
  is contracted here is its observable shadow: whatever the control put on the launch arrives at the
  driver as it was sent, including a part of it this worker has no opinion about. A field read in three
  places is a field re-derived in two of them, and re-derivation shows up as something quietly dropped.

  How a wrong implementation slips past. It works, because the field it needed did arrive. What went
  wrong is beside it: a base branch no longer resolved for the phase that now takes a different path, a
  commit pin skipped for the one kind of launch that does not need a session, or a launch normalised on
  its way through the worker into something the envelope no longer recognises. Each of those is a
  correct-looking run on the wrong base — the exact failure this module's own history records.

  ADR-006 §2, §3. FF-6306.

  Scenario Outline: what each dispatched directive carries, field by field
    Given <assignment>
    When the directive for it is dispatched
    Then the loop launch on it is <launch>
    And the command on it is <command>
    And the base branch on it is <branch>
    And the base commit on it is <commit>

    Examples: the launch arrives without disturbing either of the fields it sits beside
      | assignment                                                       | launch      | command             | branch                     | commit           |
      | an assignment on the refine phase                                | none        | the refine command  | none                       | the pinned commit |
      | an assignment on the continue phase, for an item with a recorded branch | none  | the continue command | the item's recorded branch | the pinned commit |
      | an assignment on the verify phase, for an item with a recorded branch   | none  | the verify command   | the item's recorded branch | the pinned commit |
      | an assignment on the autonomous phase, for an item with a recorded branch | a loop launch | none      | the item's recorded branch | the pinned commit |
      | an assignment on the autonomous phase, for an item with no recorded branch | a loop launch | none    | none, so the worker derives it | the pinned commit |
      | an assignment on the autonomous phase whose checkout cannot be resolved  | a loop launch | none      | the item's recorded branch | none             |

  Scenario Outline: the assignment record is the same ten keys it has always been
    Given <moment>
    When the record is read
    Then it carries exactly ten keys, in the order it has always carried them
    And none of them is a scope, a level or a launch

    Examples: minted on every phase, and read again after the parts that could have widened it
      | moment                                                      |
      | a record minted for an assignment on the refine phase       |
      | a record minted for an assignment on the continue phase     |
      | a record minted for an assignment on the verify phase       |
      | a record minted for an assignment on the autonomous phase   |
      | a record minted for the autonomous phase, after its directive has been dispatched |

  Scenario: what a reader gets back from the store is unchanged too
    Given an assignment on the autonomous phase that has been dispatched and reported running
    When the row is read back through the reader every consumer shares
    Then the keys it answers with are the keys a delivered tree answers with, and no others
    And nothing about the launch has been persisted anywhere the record can be read from

  Scenario: the launch reaches the driver as it was sent
    Given a directive carrying a loop launch, including a part of it this worker has no opinion about
    When the worker builds the options it hands to the driver
    Then the launch arrives there as it was sent, that part intact
    And the worker has neither re-derived the scope nor re-decided the level on the way
    And nothing else in the options it builds differs from what a session-phase assignment builds

  Scenario: a directive with no launch behaves exactly as one always has
    Given a directive carrying a command and no launch
    When the worker acts on it
    Then it spawns the session and types that command, exactly as it does today
    And the absence of the field is not an error, a warning or a refusal

  Scenario: a launch the driver will not run is reported, never replaced
    Given a directive whose launch the driver refuses
    When the worker acts on it
    Then the refusal is reported for that assignment, carrying its code
    And no command is typed into a session in its place
    And no second run is started for that assignment
