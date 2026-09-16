@executable @cli @work @validate
Feature: Every refusal is a coded answer naming what exists, and the exit status is a two-sided rule

  The reader of this command is usually not a person. A crontab line, a build step or a dispatch tick
  reads the answer, and what it can act on is a code and the names beside it. So a source that cannot
  answer refuses by code rather than resolving to nothing: an empty resolution from an unattended
  caller is indistinguishable from "nothing to do today", which is exactly how a wake path dies
  quietly and stays dead for a month.

  A refusal also names what exists, because naming only what was wrong leaves the caller to guess.
  An unknown trigger id is worth little without the ids that are declared; an unknown source is worth
  little without the sources that are; a scope no form admits is worth little without the forms and an
  example of each. The refusal is the whole of what the caller gets, so it carries the whole of what
  the caller needs.

  The argument worth having is the exit status, and it is settled here as one sentence with two sides.
  A refusal about the declaration or the signal never moves it; a failure of this command's own
  machinery always does. The reason is the same one the sibling face settled a milestone ago. "The top
  level is not available on this workspace today" is a normal, expected, frequently-true state, and a
  command that reddened a build for it would become an alarm that fires most days — and an alarm that
  fires most days is switched off, taking the real failures with it.

  That has a consequence worth stating rather than discovering. A caller cannot tell "the trigger I
  named does not exist" from "the trigger I named refused" by looking at the exit status, because both
  are zero. It tells them apart by reading the code, which is precisely why every one of these
  outcomes is reported by code rather than by prose, and why the machine-readable face carries them
  without the caller parsing a sentence.

  The failures on the other side are the ones where there is no answer to report at all: a declaration
  that will not compile, so nothing is armed and the caller must not proceed as though something were;
  a registry that cannot be reached for a reading; and an invocation this command cannot read as an
  invocation. In each, the failure is stated first in the machine-readable face and the status is
  non-zero.

  ADR-007 §5. ADR-003 §2. ADR-004 §3. ADR-002 §2. FF-6303.

  Scenario Outline: every outcome, what it is reported as, and what it exits
    Given a run of the trigger face in which <outcome>
    When it finishes
    Then the answer carries <reported>
    And the run exits <status>

    Examples: one table, so no gate arrives by the back door
      | outcome                                                          | reported                                                     | status         |
      | a declared trigger resolves                                      | its scope, its level and its argv                            | successfully   |
      | a trigger id is named that the declaration does not declare      | a code, the id given, and every id that is declared          | successfully   |
      | a signal names a source that is not declared                     | a code, the source given, and every source that exists       | successfully   |
      | a declared trigger's scope matches no admitted loop scope form   | a code, the scope, and each admitted form with an example    | successfully   |
      | a signal names a story rather than something the loop admits     | a code, and the driver that story belongs to                 | successfully   |
      | a declared trigger asks for a level this workspace's gate refuses| a code, the level asked for, and the failing half by name    | successfully   |
      | a source is given a signal it cannot resolve to any scope        | a code naming the source and what it could not resolve       | successfully   |
      | the declaration declares no trigger at all                       | that it read the declaration and it declares nothing         | successfully   |
      | every declared trigger refuses and none resolves                 | each refusal, by code, with nothing reported as resolved     | successfully   |
      | the declaration does not compile                                 | a code, the member that would not compile, and why           | unsuccessfully |
      | the registry cannot be reached for a gate reading                | a code and the command nothing answered for                  | unsuccessfully |
      | the invocation carries a signal this command cannot read at all  | what it could not read in the invocation                     | unsuccessfully |

  Scenario Outline: a refusal names what exists, not only what was wrong
    Given a run in which <refusal>
    When that refusal is read
    Then it names <exists>

    Examples: the caller's next move has to be readable from the refusal alone
      | refusal                                   | exists                                                       |
      | a trigger id is unknown                   | every trigger id the declaration declares                    |
      | a source is unknown                       | every source the vocabulary declares                         |
      | a scope no admitted form matches          | each admitted form, with an example of each                  |
      | a level the gate refuses                  | the half of the gate that failed and the reading that failed |
      | a story-shaped scope                      | the driver the story belongs to, and the form the loop admits|

  Scenario: a refusal is a refusal, never an empty answer
    Given a run in which no declared trigger resolves
    When the answer is read
    Then it states, once for the run, that nothing resolved
    And every declared trigger appears in it carrying its own refusal code
    And no trigger is silently absent from the answer
    And the run does not read as a run with nothing to do

  Scenario: the resolved and the refused together account for every declared trigger
    Given a declaration in which some triggers resolve and others refuse
    When the answer is read
    Then each declared trigger appears exactly once
    And no trigger appears both as resolved and as refused
    And no trigger appears as neither

  Scenario: a level the gate refuses is refused, never quietly run at a lower one
    Given a trigger declaring a level this workspace's gate refuses
    When the answer is read
    Then it carries a refusal naming the failing half of the gate
    And no resolution for that trigger appears at any level
    And no argv for that trigger appears in the answer
    And the run exits successfully

  Scenario: a declaration that will not compile arms nothing, and says so first
    Given a declaration one of whose members does not compile
    When the machine-readable rendering is read
    Then it states that failure before it states anything else
    And it names the member and why it would not compile
    And no trigger from that declaration is reported as resolved
    And the run exits unsuccessfully

  Scenario: an empty declaration is an answer rather than a failure
    Given a declaration that declares no trigger at all
    When the run finishes
    Then it names the declaration it read
    And it states that the declaration declares nothing
    And nothing is reported as having failed
    And the run exits successfully

  Scenario: no option this face accepts turns a reported refusal into a gate
    Given a declaration whose every trigger refuses
    When a run is made with each option the face accepts, in turn
    Then every one of those runs exits successfully
    And each of them carries the same refusal codes as the others

  Scenario: the codes are stable enough to branch on
    Given two runs over the same declaration and the same readings
    When each refusal in both is read
    Then each refusal carries the same code in both runs
    And each code is carried machine-readably rather than only inside a sentence
    And the human rendering states the same code beside its message
