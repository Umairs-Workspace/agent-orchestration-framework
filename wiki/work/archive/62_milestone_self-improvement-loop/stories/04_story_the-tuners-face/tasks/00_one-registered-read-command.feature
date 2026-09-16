@executable @cli @work @work-stream
Feature: One registered command reads the stream, renders one answer, and exits on whether it ran

  Every observable in this system is a registered command, and the verb an operator types is a thin
  adapter over it. The tuner joins that set rather than becoming a script beside it: one id in the
  registry, one route on the command line, one object produced by the run and rendered twice. Two
  renderings of one answer is a formatting choice; two derivations of one answer is two answers, and
  the second one drifts the first time either is edited.

  The scope it takes is the one the stream already speaks. Validate, doctor and audit all resolve the
  same reference the same way, including the part that is easy to get wrong: a reference matching no
  item is not an error, it is an empty result reported as such. A grammar invented here would be a
  fourth reader of a scope this repository has already paid for three separate parsers of.

  The argument worth having is the exit code, and it is the one the acceptor settled a milestone ago.
  This command's honest steady state is that nothing can be committed today. If that reddens a build,
  the report becomes an off switch, and an off switch that blocks real improvements gets routed
  around. So no refusal, finding, demotion or empty result ever moves the exit status. What moves it
  is this command's own machinery failing: the material it must read being unreadable, or the
  acceptor it must reach — registered in the same place this command is — not being answered for at
  all, which is a broken installation rather than a fact about the work stream.

  The options it does not offer are as much of the contract as the two it does. Strictness would turn
  a finding into a gate; a dry run would imply a wet path being withheld; an apply or commit option
  would be a second route from a proposal to a changed harness, around the one gate this whole arc
  exists to keep. A change that turns this file green by adding any of them has not improved the
  command, it has replaced it with a different one.

  ADR-005 §1, §1a. ADR-008 §1, §2. ADR-009 §3. ADR-012 §7. FF-6207.

  Scenario: the command is registered where every other work command is registered
    Given the command registry
    When it is read
    Then the tuner is a member of it
    And the verb an operator types resolves to it

  Scenario: one answer, rendered twice
    Given a tune run over a work stream carrying proposals
    When the human and the machine-readable renderings are compared
    Then every proposal, verdict, distance and finding present in one is present in the other
    And neither states a figure the other does not carry

  Scenario Outline: a fact stated by one rendering is stated the same way by the other
    Given a tune report carrying <fact>
    When both renderings are read
    Then <fact> reads the same in each

    Examples: two faces over one object — neither derives a figure of its own
      | fact                                                             |
      | the verdict on a tunable-lane proposal                           |
      | the distance standing between a proposal and a commit            |
      | the lane each proposal is in                                     |
      | what each corpus lane read and the floor it was measured against |
      | the count of distinct documents a proposal cites                 |
      | each candidate demoted to a finding, and why                     |

  Scenario Outline: the scope is the one the rest of the stream already speaks
    Given a tune run asked for <scope>
    When it finishes
    Then it reads <read>
    And it exits successfully

    Examples: scope-as-filter, with the semantics validate, doctor and audit already ship
      | scope                       | read                                        |
      | nothing at all              | the whole work stream                       |
      | a milestone number          | that milestone and the stories beneath it   |
      | a story reference           | that one story                              |
      | a slug that matches an item | the items whose reference carries that slug |
      | a reference nothing carries | nothing, reported as having matched nothing |

  Scenario: an unresolved scope is an empty answer rather than a failure
    Given a tune run scoped to a reference no item of the stream carries
    When it finishes
    Then it states the reference it was asked for and that nothing matched it
    And it emits no proposal
    And it exits successfully
    And it does not report the run as having failed

  Scenario Outline: the exit status is a fact about running, not about finding
    Given a tune run that <situation>
    When it finishes
    Then it exits <status>

    Examples: a refusal about the work never moves the exit code; a failure of this command's machinery does
      | situation                                                      | status         |
      | emitted several proposals, every one of them refused           | successfully   |
      | emitted no proposal at all                                     | successfully   |
      | found a corpus lane below its floor and said so                | successfully   |
      | matched nothing under the reference it was given               | successfully   |
      | demoted every candidate it formed to a finding                 | successfully   |
      | reached the acceptor, which returned no verdict for a proposal | successfully   |
      | could not reach the acceptor at all                            | unsuccessfully |
      | could not read the material it was asked to read               | unsuccessfully |

  Scenario: nothing to propose is an answer rather than a failure
    Given a tune run over a stream from which no proposal can be formed
    When it finishes
    Then it states what it read and what stopped a proposal being formed
    And it exits successfully

  Scenario: a run that cannot read what it needs fails, and names what it could not read
    Given a tune run whose corpus cannot be read at all
    When it finishes
    Then it exits unsuccessfully
    And it names what it could not read

  Scenario: a run that cannot reach the acceptor fails, and says so before it says anything else
    Given a tune run for which the registry answers for no such command as the acceptor
    When it finishes
    Then it exits unsuccessfully
    And the failure it names is that the acceptor was unreachable
    And no proposal it formed is reported as refused for want of a verdict

  Scenario Outline: the options this command offers, and the ones it does not
    Given a caller invoking the tuner with <option>
    When the invocation is read
    Then it is <outcome>

    Examples: each absent option would imply a capability that does not exist
      | option                             | outcome                                                 |
      | machine-readable output            | accepted, and renders the object the human face renders |
      | a scope                            | accepted, and narrows what is read                      |
      | strictness                         | refused as an option this command does not accept       |
      | a dry run                          | refused as an option this command does not accept       |
      | an instruction to apply a proposal | refused as an option this command does not accept       |
      | an instruction to commit a key     | refused as an option this command does not accept       |

  Scenario: no option offered turns a reported refusal into a gate
    Given a work stream on which every proposal is refused
    When a run is made with each option the tuner accepts, in turn
    Then every one of those runs exits successfully

  Scenario: the only route from a proposal to a committed change is the one already shipped
    Given a tune report naming a proposal the acceptor reported as eligible
    When the report is read for what to do next
    Then it names an explicit commit on the acceptor as the act that would apply it
    And the tuner offers no way to perform that act itself
