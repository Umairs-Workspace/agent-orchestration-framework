@executable @cli @work @validate
Feature: A full run leaves the workspace tree exactly as it found it, whatever it found

  This command is a read. Not "a read unless an option says otherwise": there is no write path into
  the workspace for an option to open, which is also why there is no dry run. A flag that withholds a
  wet path advertises that one exists, and an operator who reads the help learns something false about
  what this command can do to their repository.

  The claim is about the workspace under report, and that boundary is stated rather than assumed. A
  reader asking whether a report changed their repository means the tree they are reporting on: its
  files, its configuration, its ledger, its record of what has happened. Machinery this command
  reaches — a private scratch copy an underlying read takes so it does not mutate its own evidence
  source, a line about a degraded read in this machine's own log — lives outside that tree and is not
  what the question is about. It earns that exemption only for as long as nothing out there carries
  state back in, which is why the run-to-run scenario below is part of this criterion rather than a
  nicety beside it.

  The consequence a reader actually cares about is downstream. Running the tuner can never change what
  the acceptor would decide next. If it could, the half of the loop that generates changes and the
  half that decides them would be one half wearing two names, and every verdict after the first run
  would be a verdict about the tuner's own leavings.

  Auto-apply is absent for a structural reason rather than a cautious one. The single route from a
  proposal to a committed harness change is the explicit act the acceptor already ships, gated by its
  rule, recorded by its event and reverted by git. A second route opened here would be a decision this
  system has deliberately locked, taken by the one command that is not allowed to take it.

  The changes that turn this green the wrong way are all small and all plausible: a cache written
  beside the report, a snapshot of this run kept for the next one to compare against, a journal opened
  to count something that arrived already counted. Each is a write, and each makes the second run over
  an unchanged tree say something different from the first.

  ADR-005 §1, §1a, §2, §3. ADR-002 §4. ADR-009 §3. ADR-013 §8. FF-6207.

  Scenario Outline: whatever the run does, the tree is as it was
    Given a workspace tree and a tune run that <situation>
    When the run finishes
    Then no file in that tree exists that did not exist before it
    And no file in that tree that existed before it has changed
    And no file in that tree that existed before it has been removed

    Examples: the paths a writer would most plausibly appear on
      | situation                                                     |
      | emitted several proposals across both lanes                   |
      | emitted no proposal at all                                    |
      | was scoped to a reference that matched nothing                |
      | rendered its answer for a human reader                        |
      | rendered its answer machine-readably                          |
      | obtained a verdict for every tunable proposal                 |
      | could obtain no verdict at all                                |
      | demoted a candidate to a finding for a citation that failed   |
      | found a corpus lane below its floor                           |
      | ran twice in succession over the same tree                    |

  Scenario: no configuration value moves
    Given a work tree whose tunable knobs hold declared values
    When a tune run names every one of them in a proposal
    Then each knob holds the value it held before the run
    And nothing was applied on the operator's behalf

  Scenario: nothing is recorded as having happened
    Given a work tree carrying a record of what has happened and a ledger of harness rulings
    When a tune run finishes over it
    Then the record carries nothing the run added
    And the ledger holds exactly the rulings it held before

  Scenario: the population figures are the ones the run was handed
    Given a tune report carrying population figures over the record of what has happened
    When the figures are read
    Then they are the ones the acceptor's own census carried
    And no figure appears that the census did not carry
    And the record is unchanged by having been reported on

  Scenario: running the tuner cannot change what the acceptor would decide
    Given an acceptor report taken over a work tree
    When the tuner is run over that tree in both renderings
    And the acceptor report is taken again
    Then it reads the same, verdict for verdict and reason for reason
    And every evidence count is the number it was before

  Scenario: nothing accumulates between runs, inside the tree or outside it
    Given a tune report produced over a workspace tree
    When the command is run again over the same tree with nothing else changed
    Then the second report states the same proposals, verdicts and distances as the first
    And no record left by the first run exists for the second to read
    And nothing written outside that tree carries state from the first run into the second

  Scenario: there is no dry face, because there is no wet one
    Given a caller asking the tuner not to write
    When the invocation is read
    Then it is refused as an option this command does not accept
    And a run made without that option writes nothing into the tree either

  Scenario: the report is what it produces, and the only thing it produces
    Given a tune run over a work stream
    When it finishes
    Then its report is what it produced
    And nothing has been scheduled to run later
    And no proposal it emitted is stored in the tree; each exists in that report and nowhere else

  Scenario: the only route to a committed change stays the one the acceptor ships
    Given a tune report naming a proposal that could be committed
    When the report is followed to the end
    Then applying it takes an explicit act on the acceptor
    And the tuner performed no part of that act
    And the tree is unchanged until someone performs it
