@executable @cli @work @work-stream
Feature: An epoch closes on the way INTO acceptance, whatever it came from

  An epoch is the span the criterion is frozen for. If its boundary never fires, the epoch never ends,
  the criterion never becomes revisable, and every ruling from then on is scored under a yardstick
  nobody is allowed to correct. Nothing reports that: an epoch that failed to close looks exactly like
  one still legitimately open, which is why the boundary is a task of its own.

  The whole of it turns on keying the decision to where an item LANDS rather than to where it came
  from. Every milestone accepted so far happened to arrive from the same state, so the narrower
  reading works today and would silently never close an epoch for a milestone parked in review before
  acceptance — and three of four spikes have already taken that other edge. The departed state is
  worth recording and is never worth consulting.

  The second distinction is the span itself. It is one milestone, and it is the same span the loop
  that audits this system's instruments already ticks on: an acceptor scoring on a clock of its own is
  trusting instruments audited on somebody else's. A span chosen at the moment of asking is worse
  still — it is the p-hack this story exists to refuse, one level up.

  ADR-004 §1, §2, §3. FF-6104.

  Scenario Outline: the lifecycle move decides, and only its destination does
    Given a milestone moving from <from> to <to>
    When the move is made
    Then an epoch <boundary>

    Examples: every legal move of the lifecycle — two land on acceptance, nine do not
      | from        | to          | boundary       |
      | in-progress | done        | closes         |
      | in-review   | done        | closes         |
      | not-started | in-progress | does not close |
      | not-started | blocked     | does not close |
      | in-progress | in-review   | does not close |
      | in-progress | blocked     | does not close |
      | in-progress | not-started | does not close |
      | in-review   | in-progress | does not close |
      | in-review   | blocked     | does not close |
      | blocked     | in-progress | does not close |
      | blocked     | not-started | does not close |

  Scenario: an item accepted from review closes its epoch exactly as one accepted from build does
    Given one milestone accepted straight from build and one accepted from review
    When each acceptance is made
    Then both close an epoch
    And neither outcome differs from the other

  Scenario: the state an item departed from is recorded and never consulted
    Given a milestone accepted from review
    When that acceptance is read
    Then it states the state the milestone came from
    And that state made no difference to whether the epoch closed

  Scenario: a move the lifecycle refuses never reaches the boundary
    Given a milestone nobody ever started
    When it is moved straight to acceptance
    Then the move is refused
    And no epoch closes

  Scenario: the boundary is the acceptance word itself, not a destination that resembles it
    Given a destination that merely resembles the acceptance word
    When the boundary is asked about it
    Then no epoch closes

  Scenario: the span of an epoch is one milestone
    Given an open epoch
    When it is identified
    Then it names exactly one milestone
    And the span it covers is that milestone's

  Scenario: the acceptor's epoch equals the cadence of the loop auditing its instruments
    Given the declared cadence of the loop that audits this system's instruments
    When the acceptor's declared epoch is read
    Then the two agree
    And each is read from its own declaration rather than restated inside the other

  Scenario: the span cannot be chosen at the moment of asking
    Given a request for a ruling
    When a span of its own is offered alongside that request
    Then no such span is accepted
    And the epoch resolves from the declared unit alone

  Scenario: an epoch that has closed is distinguishable from one still open
    Given one milestone that has reached acceptance and one that has not
    When the epoch of each is read
    Then the first is reported closed and the second open
