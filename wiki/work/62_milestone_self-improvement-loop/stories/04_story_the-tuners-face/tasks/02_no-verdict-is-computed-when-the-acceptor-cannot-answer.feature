@executable @cli @work @validate
Feature: An acceptor that cannot answer yields no verdict at all, never one this command reached itself

  The whole partition rests on one sentence: this half of the loop generates changes and the other
  half decides them. That sentence is only observable at the moment the decider is unavailable,
  because that is the only moment a fallback would appear — and a fallback is precisely the second
  acceptance rule this milestone is forbidden to carry. Everywhere else the two designs look
  identical.

  There are several ways the decider can be unavailable and they are told apart because the operator's
  next move differs for each: the registry answers for no such command, obtaining the answer raises a
  failure, or an answer comes back in a shape this command cannot read. All of them are the same fact
  about the proposal — no verdict was obtained — and each names which one happened.

  They do not all mean the same thing about the RUN, though, and the exit code is where that shows.
  The acceptor is registered in the same place this command is, so a registry that cannot answer for
  it is a broken installation rather than a fact about the work stream: that run failed, it says so
  before anything else, and it exits non-zero. An acceptor that was reached and answered has spoken
  about the work — even to say it could not construct a ruling — and what it said is reported at exit
  zero. The line is one sentence: a refusal about the work never moves the exit code, and a failure
  of this command's own machinery always does.

  The change that turns this file green the wrong way is a rescue, and every version of it is
  comfortable to write. A catch that returns not-eligible. A default of report-only. An empty list of
  reasons, which a reader takes for nothing standing in the way. A verdict remembered from an earlier
  run. Each of those is this command deciding something the acceptor owns, and each is invisible on a
  day when the acceptor is answering normally.

  The advisory lane is the control on this criterion. Advisory proposals were never going to the
  acceptor, so an acceptor that cannot answer changes nothing about them; if they degrade too, then
  something is routing them through a path that is not supposed to exist.

  ADR-002 §1, §3. ADR-003 §1. ADR-009 §2. ADR-012 §7. FF-6201.

  Scenario Outline: no verdict is obtained, and the exit says whose failure it was
    Given a tunable-lane proposal whose verdict is sought
    And <situation>
    When the run finishes
    Then that proposal's line states that no verdict could be obtained for it
    And the report names <named>
    And the run exits <status>

    Examples: reaching the acceptor is this command's machinery; what a reached acceptor says is the work
      | situation                                                       | named                                                      | status         |
      | the registry answers for no such command                        | the command it asked for, and that nothing answers for it  | unsuccessfully |
      | obtaining the verdict raises a failure                          | the failure that was raised                                | unsuccessfully |
      | the answer comes back in a shape this command cannot read       | what it could not read in that answer                      | successfully   |
      | the answer carries no row for the proposal that was asked about | the proposal asked about, and that no row came back for it | successfully   |

  Scenario Outline: what a verdict that was never obtained may never be rendered as
    Given a tunable-lane proposal for which no verdict could be obtained
    When its line is read
    Then it does not read as <mistake>

    Examples: every one of these is a verdict this command reached on its own
      | mistake                                                              |
      | eligible                                                             |
      | not eligible                                                         |
      | report-only                                                          |
      | refused for want of evidence                                         |
      | refused for any reason in the acceptor's vocabulary                  |
      | an empty list of reasons, which reads as nothing standing against it |
      | the verdict the same proposal carried on an earlier run              |

  Scenario: nothing on the report is a verdict this command reached for itself
    Given a run in which no verdict could be obtained for any tunable proposal
    When the whole report is read
    Then no proposal is reported as eligible
    And no proposal is reported as ineligible
    And every one of them is reported as having no verdict, naming why
    And no proposal carries an evidence count
    And no proposal carries a reason from the acceptor's vocabulary

  Scenario: an acceptor that cannot be reached is a broken installation, and the run fails
    Given a run in which the registry answers for no such command as the acceptor
    When it finishes
    Then the machine-readable rendering states, before anything else, that the acceptor was unreachable
    And it names that failure acceptor-unreachable
    And it names the command it asked for
    And the report states once, for the run, that no tunable proposal could be given a verdict
    And no proposal on the report carries a verdict
    And the run exits unsuccessfully
    And the tree is unchanged

  Scenario: an acceptor that was reached has spoken about the work, whatever it said
    Given a run in which the acceptor answers, refusing to construct a ruling for a proposal
    When it finishes
    Then it produces a report
    And that proposal's line carries the construction refusal as the acceptor gave it
    And the run exits successfully
    And nothing about the run is reported as having failed

  Scenario: a proposal with no verdict still carries what stands between it and a commit
    Given a tunable proposal for which no verdict could be obtained
    When its line is read
    Then it states what stands between it and a commit
    And what stands there is that no verdict could be obtained, with what would obtain one
    And that statement is not a reason from the acceptor's vocabulary

  Scenario: one proposal losing its verdict does not cost the others theirs
    Given a run in which the acceptor answers for some tunable proposals and not for one of them
    When the report is read
    Then the answered proposals carry the verdicts they were given
    And the unanswered one is reported as having no verdict, naming why
    And the run exits successfully

  Scenario: the advisory lane is untouched, because it was never going to be asked
    Given a run carrying both lanes in which no verdict can be obtained
    When the report is read
    Then every advisory proposal appears with its evidence and its distance
    And each appears with its patch, or with its stated reason for carrying none
    And none of them states that a verdict could not be obtained
    And none of them is withheld, degraded or re-labelled by the failure in the other lane

  Scenario: an advisory proposal carries no verdict even when the acceptor is answering perfectly well
    Given a run in which every tunable proposal receives a verdict
    When an advisory proposal's line is read
    Then it carries no verdict, no eligibility and no reason from the acceptor's vocabulary
    And it states that its class can reach no commit at all

  Scenario: a stream declaring no tunable knob seeks no verdict, and still reports
    Given a work stream whose registry declares no tunable key at all
    When the report is produced
    Then every proposal is in the advisory lane
    And no verdict is sought for any of them
    And no proposal is reported as having failed to obtain one
    And the run exits successfully
