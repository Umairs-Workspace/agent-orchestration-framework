@executable @cli @work @work-stream
Feature: A review is never resumed, however warm the alternative looks

  This is the scenario that exists to stop a plausible optimisation. Once task 00 makes resuming
  possible, resuming *everything* is the obvious next move — and the evidence says it is wrong.

  Cognition, after publicly reversing their anti-multi-agent position, report that code review
  *"works best when the coding and review agents do not share any context beforehand"*: a clean
  conversation reduces attention rot, and a reviewer who watched the code being written inherits the
  author's framing along with the author's blind spots. Anthropic's own guidance points the same
  way — *"a reviewer prompted to find gaps will usually report some, even when the work is sound."*
  A reviewer warmed with the builder's transcript is a reviewer agreeing with itself.

  Both the SPEC and STATE record this as out-of-scope, STATE explicitly *"because it is the
  obvious-looking move and the evidence says it is wrong."* A note in a document does not survive
  contact with a plausible refactor; this contract does.

  **The distinction is structural** — derived from the phase, never left to a caller's discretion.
  Reviewers still get every other saving: an identical static prefix (70/01), and a compiled brief
  (70/00). What they do not get is the builder's history.

  ADR-008. FF-7007 enforces it beyond this contract's reach.

  Scenario: a review phase resolves no resume target
    Given an item with a build run whose session was recorded and is resumable
    When a review phase is spawned for that item
    Then no resume target is resolved
    And the review is spawned as a fresh session

  Scenario: a reviewer still gets the cheap half of the milestone
    Given a review phase spawned for an item
    When its launch is inspected
    Then it carries the stable-prefix flag and its chosen model and effort
    And it is handed a compiled brief

  Scenario: the rule holds however rich the history is
    Given an item with several resumable sessions across build and fix runs
    When a review phase is spawned
    Then no resume target is resolved
    And no session id from any prior run reaches the review's launch

  Scenario: a caller cannot opt a review into a resume
    Given a caller that supplies a resume target for a review phase
    When the launch is resolved
    Then the review is spawned without resuming
    And the supplied target is not honoured

  Scenario Outline: which phases resume
    Given an item with a recorded, resumable build session
    When a <phase> is spawned
    Then it <behaviour>

    Examples: exactly one lane is warmed, and it is the one that shares the author's intent
      | phase             | behaviour                        |
      | fix               | resumes the build session        |
      | structural review | is spawned cold                  |
      | behavioural review| is spawned cold                  |
      | verify            | is spawned cold                  |
      | refine            | is spawned cold                  |
