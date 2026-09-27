@executable @cli @work @validate
Feature: A settling period holds back a reversion, and never holds back a withdrawal on harm

  A change that is reverted the moment someone dislikes it teaches the machinery nothing — the value
  oscillates, and the ledger accrues pairs measured across two different settings. So a reversion
  waits out a declared settling period, measured in cycles of the loop receiving the change.

  Nothing in this system counts a cycle of that loop, and that is the fact this task is built around
  rather than papered over. Turning a cycle count into a moment a reversion becomes available would
  be a conversion between two units nobody measures — a number invented to make a gate look
  implemented. So the settling period is recorded exactly as declared, alongside the epoch the change
  landed at, and no expiry is derived from the two. A reversion is refused because the period cannot
  be shown discharged, and the refusal names the counter that does not exist rather than a date.

  The asymmetry is the load-bearing half, and it is the one thing here worth arguing about. Damping
  oscillation is a taste question; responding to harm is not. When the counter-metric paired with the
  trial metric degrades, the change is pulled at once — the settling period is not consulted, not
  shortened, and not waivable. A settling period that also delayed the harm response would convert a
  damping device into a window during which the system is knowingly worse and cannot be fixed. That
  asymmetry is operationally real here rather than decorative: one path acts today, and the other
  says precisely why it cannot.

  The settling length itself is a declaration, not a number in this machinery: it is read from the
  arbiter that governs these loops, so changing the declaration changes what is recorded and nothing
  else has to move. And a committing change carries its justification in the same working-tree
  change, so reverting it is one act rather than an archaeology exercise six months later — an act
  that is available whatever the settling period says.

  ADR-010 §4, §5. FF-6113.

  Scenario Outline: what a settling period does to each way a change can be pulled
    Given a committed change under a declared settling period of <declared>
    When it is pulled by <trigger>
    Then the outcome is <outcome>

    Examples: the period damps oscillation; it never stands between the system and its own harm
      | trigger                        | declared      | outcome                                          |
      | an operator asking to revert   | two cycles    | refused, naming the counter that does not exist  |
      | an operator asking to revert   | ten cycles    | refused, naming the counter that does not exist  |
      | a degraded counter-metric      | two cycles    | the change is withdrawn at once                  |
      | a degraded counter-metric      | ten cycles    | the change is withdrawn at once                  |

  Scenario: a reversion is refused because the period cannot be shown discharged
    Given a committed change whose settling period is declared in cycles of the loop receiving it
    When a reversion is requested
    Then it is refused
    And the refusal names the counter that would have to exist to show the period discharged
    And the configuration value is unchanged

  Scenario: the settling period is recorded as declared and never turned into a moment
    Given a ruling that committed a change
    When the record it left is read
    Then it carries the settling period exactly as the declaration states it
    And it carries the epoch at which the change landed
    And it names no date, duration or epoch count at which a reversion becomes available

  Scenario: a withdrawal on harm does not wait
    Given a committed change whose settling period cannot be shown discharged
    When the counter-metric paired with its trial metric degrades
    Then the change is withdrawn
    And the withdrawal names the counter-metric reading that triggered it

  Scenario: the settling length has no effect on the response to harm
    Given two work streams declaring settling periods of different lengths
    When a counter-metric degrades in each of them
    Then both changes are withdrawn without waiting
    And neither withdrawal mentions a settling period

  Scenario: no option offered by the command delays a withdrawal on harm
    Given the options the acceptor command accepts
    When they are read
    Then none of them delays or waives a withdrawal driven by the counter-metric

  Scenario: the settling length comes from the declaration that governs these loops
    Given an arbiter declaring the settling period for the loops the knob belongs to
    When a change on that knob is committed
    Then the period recorded against it is the one that declaration states

  Scenario: changing the declaration changes what is recorded and nothing else
    Given a work stream whose declared settling period is changed to a different number of cycles
    When a change is committed and a reversion is then refused
    Then the period recorded against the change follows the new declaration
    And the refusal is unchanged, still naming the counter that does not exist

  Scenario: a committing change and its justification are one working-tree change
    Given a proposal that is committed on request
    When the resulting working-tree change is read
    Then it carries both the new configuration value and the record justifying it
    And reverting that one change removes both
    And that revert is not gated on the settling period

  Scenario: a refused reversion leaves the change exactly as it was
    Given a committed change whose reversion has been refused
    When the working tree and the record are read
    Then the configuration value is the one the commit applied
    And the record still carries the period as declared and the epoch it landed at
