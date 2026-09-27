@executable @cli @assets @validate
Feature: One node owns the standing speed-versus-thoroughness-versus-autonomy trade-off

  Four loops reach for the same three agents and nothing in the registry says whose demand wins. The
  validate run reports that as three shared actuators with nobody entitled to decide, and the way it
  actually gets decided is whichever of speed, thoroughness or autonomy the operator has front of
  mind that evening.

  One node now owns it. It names the conflict it resolves, vetoes every loop contending for the
  shared agents — a veto that misses one contender resolves nothing — orders those loops
  most-important-first, names the knobs it owns and which of the three concerns each one serves, and
  says how long an adjustment stands before a reversion is considered.

  The restraint is severe and deliberate: a node that resolves a conflict is not party to it. The
  arbiter declares no way to act, nothing it measures, no cadence and no authority of its own, and it
  sets nobody's reference. Nothing in this milestone executes its order or its dwell; it is a policy
  written where it can be read and argued with, before the thing that would act on it exists.

  ADR-003, ADR-004. FF-5805, FF-5806.

  Scenario: the registry declares one arbiter and it names the conflict it resolves
    Given the registry as it ships
    When the arbiter record is read
    Then it names the standing conflict over how much of the same agent's effort each loop may spend

  Scenario: it vetoes every loop contending for every shared actuator
    Given the registry as it ships
    When the loops sharing each actuator are listed
    Then the arbiter vetoes every one of them, and is itself none of them

  Scenario: the shared-actuator findings are gone
    Given the registry as it ships
    When the validate run completes
    Then no shared-actuator finding is reported

  Scenario: a veto that misses one contender clears nothing
    Given a registry whose arbiter vetoes all but one of the loops sharing an actuator
    When the validate run completes
    Then that actuator is still reported as shared with nobody entitled to decide

  Scenario: its order accounts for exactly the loops it vetoes
    Given the registry as it ships
    When the arbiter's order is compared with the loops it vetoes
    Then each vetoed loop appears exactly once, and no loop it does not veto appears at all

  Scenario: it declares no way to act
    Given the registry as it ships
    When the arbiter record is read
    Then it declares no actuator, nothing it measures, no cadence and no authority of its own

  Scenario: it sets nobody's reference
    Given the registry as it ships
    When the arbiter record is read
    Then it declares no target-setting edge

  Scenario: it claims no knob outside the bounds the loops it orders run within
    Given the registry as it ships
    When each knob the arbiter owns is read
    Then it bounds one of the loops the arbiter orders, and no knob that bounds none of them is claimed

  Scenario: the dwell is counted in cycles of the loop that receives the adjustment
    Given the registry as it ships
    When the arbiter's dwell is read
    Then it says how many cycles of the receiving loop an adjustment stands before a reversion is considered

  Scenario: nothing acts on the order or the dwell today
    Given a project with the arbiter installed
    When the loops it orders are run
    Then each runs in the order and within the bounds it ran in before the arbiter existed

  Scenario Outline: every shared actuator and the loops contending for it
    Given the registry as it ships
    When the contenders for <actuator> are listed
    Then they are <contenders>, and the actuator is <outcome>

    Examples: three shared actuators, four distinct contenders, one veto set covering all four — a set covering fewer would clear none of the three
      | actuator                                     | contenders                                                                                      | outcome |
      | prose:src/bundle/agents/aof-developer.md     | loop:autonomous-cascade, loop:build-to-green, loop:review-fix-rereview, loop:verify-triage-accept | cleared |
      | prose:src/bundle/agents/aof-product-owner.md | loop:autonomous-cascade, loop:verify-triage-accept                                                | cleared |
      | prose:src/bundle/agents/aof-qa.md            | loop:autonomous-cascade, loop:verify-triage-accept                                                | cleared |

  Scenario Outline: the recorded trade-off, in order
    Given the registry as it ships
    When the arbiter's order is read
    Then <loop> is <rank>, because <reason>

    Examples: four vetoed loops, four ranks, no omission and no extra — the evening's mood written down as something a reader can disagree with
      | rank | loop                      | reason                                                                     |
      | 1st  | loop:verify-triage-accept | its human-acceptance lane structurally cannot be waived                    |
      | 2nd  | loop:review-fix-rereview  | confirmed findings are applied before anything reclaims the agent          |
      | 3rd  | loop:build-to-green       | the build keeps iterating inside its own no-progress tolerance             |
      | 4th  | loop:autonomous-cascade   | an unattended pass that skips a gate is the failure this system prevents   |

  Scenario Outline: the knobs it owns
    Given the registry as it ships
    When <knob> is read
    Then the arbiter owns it, it serves <concern>, and it bounds <loop>

    Examples: four knobs the contending loops themselves cite as bounds — three buy thoroughness, one buys autonomy, speed is what every one of them is spent against, and the loop that wins first owns none of them because its thoroughness is not a number
      | knob                                   | concern      | loop                     |
      | config:work.loop.reviewRounds          | thoroughness | loop:review-fix-rereview |
      | config:work.loop.buildNoProgressRounds | thoroughness | loop:build-to-green      |
      | config:work.loop.progressMaxResets     | thoroughness | loop:build-to-green      |
      | config:work.autonomous.maxAttempts     | autonomy     | loop:autonomous-cascade  |
