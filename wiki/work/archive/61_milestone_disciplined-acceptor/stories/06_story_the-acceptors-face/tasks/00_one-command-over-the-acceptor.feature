@executable @cli @work @validate
Feature: One command shows every proposal, its evidence, and every reason it did not commit

  Five lanes of machinery exist by the time this runs — a range each admitted knob resolves inside, an
  epoch with its frozen criterion, a census of what could be observed, an admissibility check, and a
  rule with a ledger — and no way to ask any of them what they currently say. This is the verb that
  does, and it is deliberately the same shape as the audit an operator already runs, because a report
  in a different envelope is a report that gets read differently.

  It renders those lanes; it does not recompute them. The census in particular is counted elsewhere
  and arrives with what it excluded already attached, so the face states the numbers it was handed
  rather than deriving its own — two derivations of one population is two populations.

  The distinction worth arguing about is the exit code. This command's honest steady state is silence:
  at HEAD every knob is refused, and that is the machinery working rather than the machinery failing.
  A gate flag here would turn the honest answer into a red build, and a build that is always red is an
  off switch wearing a gate's clothes. So the command carries no strictness option at all, and its
  exit status is a fact about whether it could run — never about what it found.

  It reports, and that is the whole of its effect. It moves no configuration value, it invents no
  proposal, and it schedules nothing for later; the report is what it produces and the only thing it
  produces.

  ADR-010 §3. ADR-011 §2, §3. ADR-009 §2. ADR-006 §6. FF-6112.

  Scenario: the command is registered where every other work command is registered
    Given the command registry
    When it is read
    Then the acceptor command is a member
    And the verb the operator types resolves to it

  Scenario: the report covers every lane the acceptor has
    Given a work stream carrying pending proposals over several knobs
    When the acceptor report is produced
    Then each proposal appears with the knob it would move and the step it would take
    And each one states the range that step has to stay inside
    And each one carries its evidence count, its verdict, and every reason it did not commit
    And the population each verdict was read from is stated with what it excluded

  Scenario: the census is rendered as it was counted, not recounted by the face
    Given a census of observations carrying both what it counted and what it excluded
    When the acceptor report is produced
    Then the report states both of those as the census recorded them
    And it states no population figure the census did not carry

  Scenario: the machine-readable face carries everything the human one does
    Given an acceptor report over pending proposals
    When it is asked for machine-readable output
    Then every proposal, verdict and reason in the human output is present
    And no proposal, verdict or reason is present that the human output omits

  Scenario Outline: a fact stated by one face is stated the same way by the other
    Given an acceptor report carrying <fact>
    When the human and the machine-readable faces are compared
    Then <fact> reads the same in both

    Examples: two renderings of one answer — neither face derives a number the other does not carry
      | fact                                        |
      | the verdict on a proposal                   |
      | the evidence count and the threshold        |
      | each reason a proposal did not commit       |
      | the distance still to be covered            |
      | what each population counted and excluded   |

  Scenario: the command offers no way to turn its report into a gate
    Given the options the acceptor command accepts
    When they are read
    Then none of them makes a reported refusal change the exit status

  Scenario Outline: the exit status does not depend on what was found
    Given an acceptor run that <situation>
    When it finishes
    Then it exits successfully

    Examples: exiting is a fact about running, not about findings
      | situation                                       |
      | found no proposal at all                        |
      | refused every proposal it found                 |
      | reported a population that fell below its floor |
      | found a proposal eligible to commit             |

  Scenario: a run that cannot read what it needs fails, and says what it could not read
    Given an acceptor run whose evidence cannot be read
    When it finishes
    Then it exits unsuccessfully
    And it names what it could not read

  Scenario: the report changes nothing and creates nothing
    Given a work stream carrying knobs the acceptor watches
    When the acceptor report is produced
    Then no configuration value has changed
    And no proposal exists that did not exist before the run
    And nothing has been scheduled to run later
