@executable @cli @work @validate
Feature: A key that resolves to two bounds is refused by name rather than given an invented range

  How many times a failed run may be retried, and how many drive cycles one item's phase may spend,
  are two different questions — different quantities, different units, exhausted by different
  events. One configured key answers both. So a single notch on that key moves two unrelated bounds
  in one write, and whichever of them moved the outcome, both are credited for it.

  That makes every step on this key compound by construction, and a compound step is already
  refused. The refusal is therefore derived from the rule that a step is one knob and one notch,
  rather than invented for this case — and it is the only refusal in the vocabulary that no larger
  budget and no extra instrumentation can lift, because neither changes how many bounds the key
  resolves to. Giving it a floor and a ceiling anyway, so that it would have a range like its
  neighbours, is the p-hack this milestone exists to refuse, wearing a clamp.

  Refusing a step is not a narrowing of what may be tuned. The key stays in the declared tunable set
  and stays proposable; what is refused is committing a step on it. And the refusal is computed from
  the number of bounds the key actually resolves to, never recorded as a fact about its name — so
  the day the key stops meaning two things the refusal stops on its own, with nothing to remember to
  delete.

  The last thing this task is held to is what it does NOT do. No ceiling is added to this key,
  nothing it governs moves, and every value configured for it takes effect at both doors exactly as
  it does today. Splitting the key is separate work, ledgered as debt.

  ADR-009 §4, §4a. ADR-001 §4. FF-6111.

  Scenario: the key resolves to more than one bound, which is why no range is declarable for it
    Given the admitted key work.autonomous.maxAttempts
    When the bounds that resolve from it are counted
    Then there is more than one
    And they are exhausted by different events — a run being retried, and a phase being driven again
    And no floor and no ceiling are declared for the key anywhere

  Scenario Outline: what a one-notch step on each admitted key is answered with
    Given a proposed one-notch step on <key>
    When the step is put forward to be committed
    Then it is <outcome>

    Examples: three admitted keys, and only the one that is two bounds is refused for being so
      | key                             | bounds it resolves to | outcome                        |
      | work.loop.reviewRounds          | one                   | not refused as a compound step |
      | work.loop.buildNoProgressRounds | one                   | not refused as a compound step |
      | work.autonomous.maxAttempts     | two                   | refused as a compound step     |

  Scenario: the refusal is reported by its own name
    Given a step refused for moving more than one bound
    When the refusal is read
    Then it is named step-would-be-compound
    And it is not reported as a value that fell outside a range
    And it names the bounds the one write would have moved

  Scenario: the refusal is computed from the count of bounds, not from the key's name
    Given a system in which that key resolves to exactly one bound
    When a one-notch step on it is put forward to be committed
    Then it is not refused as a compound step
    And nothing has to be edited anywhere for the refusal to stop applying

  Scenario: any key resolving to more than one bound earns the same answer
    Given a key this machinery has never been told about that resolves to two bounds
    When a one-notch step on it is put forward to be committed
    Then it is refused as a compound step
    And the answer is the one the named key gets, from the same reasoning

  Scenario: only the number of bounds can lift the refusal
    Given a key refused as a compound step
    When more evidence is gathered on it, a larger budget is allowed, and its configured value moves
    Then it is still refused as a compound step
    And the refusal lifts only where the key comes to resolve a single bound

  Scenario: the key stays proposable
    Given the declared set of keys that may be tuned
    When that set is read
    Then work.autonomous.maxAttempts is still in it
    And this task removes nothing from that set
    And what is refused is committing a step on the key, not proposing one

  Scenario Outline: refusing the step changes nothing about what the key does at either door
    Given a workspace that configures work.autonomous.maxAttempts to <configured>
    When <door> is decided
    Then the bound in effect is <in effect>

    Examples: both bounds behave exactly as they did before this task
      | configured | door                                             | in effect |
      | 99         | how many times a failed run may be retried       | 99        |
      | 99         | how many drive cycles one phase may spend        | 99        |
      | 4          | how many times a failed run may be retried       | 4         |
      | 4          | how many drive cycles one phase may spend        | 4         |
      | unset      | how many times a failed run may be retried       | 3         |
      | unset      | how many drive cycles one phase may spend        | 3         |

  Scenario: a drive ceiling asked for explicitly is still exactly what was asked for
    Given a drive ceiling of 5 asked for at the moment of driving
    When the loop is asked what it would drive under
    Then the ceiling it reports is 5
    And no bound derived from an attempt count has lowered it
