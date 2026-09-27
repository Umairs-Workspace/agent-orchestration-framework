@cli @work @work-stream
Feature: A delivered story missing its outcome or its retrospective is reported

  A RULE THAT LIVES ONLY IN A PROMPT IS NOT ENFORCED, AND THIS ONE PROVES IT. `aof:verify` has
  instructed outcome authoring since story 80 and `aof:assimilate-code` authors a retrospective, yet
  a story reached `done` through a govern command carrying neither, and nothing said so — not
  `validate`, not `doctor`, not the accept verb. The gap was found by a person reading a folder.

  THE CHECK IS ABOUT A STORY. It asks one question of one item: this story is `done` — does its own
  folder carry `OUTCOME.md` and `RETROSPECTIVE.md`? No inheritance, no delegation to a parent, no
  exemption for nesting.

  WHERE IT LANDS IS THE OPEN DESIGN QUESTION, AND THE MEASUREMENT DECIDES IT. 193 of 228 done stories
  carry no outcome and 222 carry no retrospective, almost all predating the rules that now require
  them. A `validate` finding is STRUCTURAL and would redden the whole stream at once, taking every
  gate that runs validate down with it — including the loop's first rung. A `doctor` finding is
  advisory and lands today against the real backlog. Refine settles which, and a `validate` answer
  must arrive with a backfill plan rather than without one.

  THE BACKLOG IS NOT THIS STORY'S JOB TO FILL. Reporting it and fixing it are different pieces of
  work, and conflating them is how a check that could land now waits for a migration that never
  starts.

  @executable
  Scenario: a done story carrying both records is clean
    Given a story whose status is done
    And its folder carries an OUTCOME.md and a RETROSPECTIVE.md
    When the stream is checked
    Then that story raises no finding

  @executable
  Scenario Outline: a done story missing a record is named, and the missing one is named with it
    Given a story whose status is done
    And its folder is missing <record>
    When the stream is checked
    Then it reports one finding against that story
    And the finding names <record>

    Examples:
      | record           |
      | OUTCOME.md       |
      | RETROSPECTIVE.md |
      | both             |

  @executable
  Scenario Outline: an undelivered story owes nothing yet
    Given a story whose status is <status>
    When the stream is checked
    Then that story raises no finding for a missing record

    Examples:
      | status      |
      | not-started |
      | in-progress |
      | in-review   |
      | blocked     |

  @executable
  Scenario: a story is judged on its own folder, and nesting grants no exemption
    Given a nested story whose own folder carries neither record
    When the stream is checked
    Then that story is reported
    And no record outside its own folder satisfies it

  @executable
  Scenario: the check judges stories only
    When the stream is checked
    Then no finding is raised against any item that is not a story
