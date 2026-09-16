@docs @work @round-trip
Feature: The review loop is bounded — one round by default, a verified Blocker to earn another, a stall stop, and a hard cap of three

  THERE WAS NO ROUND BOUND ANYWHERE IN THE DIRECT COMMAND PATH. The story lane said "apply confirmed
  fixes" and stopped. What happens when the fixes produce new findings was unspecified, so it recursed
  until a model decided it was finished: five consecutive commits from one run each declaring itself
  final, and one aof:continue that ran 1h55m and delivered nothing.

  ROUND TWO IS WHERE THIS STOPS BEING FREE. Intrinsic self-correction without an external oracle is
  net-negative, and there is no oracle at review time — the @executable suite is green before the
  review lane starts. So every round after the first is exactly the unbounded-intrinsic case.

  THE CAP AND THE STALL DETECTOR DO DIFFERENT JOBS AND NEITHER SUBSTITUTES FOR THE OTHER. A cap of
  three stops the infinite case and does nothing about the converged-but-still-running case — five
  rounds each producing a new "final" hardening, none reducing the count. The monotone-decrease test
  catches that at round two.

  BLOCKERS ARE THE ESCALATION CURRENCY, WHICH IS WHY TASK 00 SHIPS ALONGSIDE. A round cap gated on
  Blocker count, with no discipline about what counts as a Blocker, is an invitation to inflate
  severity. And a Blocker must be reproduced against the actual branch before it earns a round: an
  unverified claim buys nothing.

  NOTHING IS DROPPED, IT IS SCHEDULED. An Important finding at round one's close is recorded as a
  finding or promoted to a chore. That pressure valve is what makes a one-round default survivable.

  THE OPERATOR IS OFFERED A CHOICE, NOT A FAILURE. A hard failure at a stall throws away a lane's
  work; force-proceeding with known, named findings is a legitimate call and it is the operator's.

  THE RUNTIME OWNS THE COUNTER. The existing configurable one-round default remains the single bound
  home, now clamped by an absolute maximum of three. Structured Blockers are validated and deduplicated;
  the admitted count survives resume and must decrease before another post-default round is spent.

  Background:
    Given the configured review bound and the code-owned review decision

  @executable
  Scenario: configured review rounds cannot exceed the absolute maximum
    When work.loop.reviewRounds is configured above three
    Then the resolved review bound is three

  @executable
  Scenario: the runtime caps the loop at three rounds
    Given three review rounds have completed
    When another valid structured Blocker is supplied
    Then the review decision halts at the hard cap
    And no fourth round is admitted

  @executable
  Scenario: a second round must be earned by a reproduced Blocker
    When the runtime evaluates another review round
    Then review runs once by default
    And a second round requires at least one Blocker from round one
    And Important findings and Nits do not earn another round
    And duplicate structured Blocker claims count once before round two

  @executable
  Scenario: a non-decreasing Blocker count stops the loop immediately
    When the runtime compares the verified Blocker count with the prior admitted count
    Then the round number and Blocker count are recorded at the end of every round
    And a count not strictly lower than the previous round stops the loop at any round number
    And each outstanding finding is named as file:line plus its input, state and outcome
    And the operator is offered exactly force-proceed, provide guidance, or abandon

  @executable
  Scenario: a bounded stop is reported as its own outcome, never as an accept
    When I read the continue command's output section
    Then it carries a stopped outcome for a stalled or capped review
    And that outcome forbids printing the accept hand-off

  @executable
  Scenario: non-blocking findings survive the bound as named work
    When I read the continue command's review-rounds section
    Then Important findings and Nits are recorded in the findings path or promoted to a chore
    And they are not silently dropped

  @manual
  Scenario: a real story's review converges in one round and the escapes do not rise
    Given stories reviewed before and after the bound
    When I compare rounds per story, fix and test commit share, wall-clock, and escapes to aof:verify
    Then rounds per story converges toward one
    And defects escaping to aof:verify holds flat
    And a rise in escapes moves the default to two rounds rather than moving the cap
