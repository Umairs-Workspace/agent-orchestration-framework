@executable @cli @work @planning
Feature: A story that writes a source file and does not name its owning suite has an incomplete write set

  This is the one leg that is pure convention rather than graph coupling, and it is the leg a
  downstream retrospective records missed **three stories running**: *"`files:` was short of the test
  lane three stories running."* An author recalling a write set remembers the code they are about to
  change and forgets the file that proves it; the graph cannot help, because at authoring time the
  suite may not exist yet.

  So it is derived from the repository's own root-and-extension rule — the same predicate shape
  `isSuiteFile` already applies — rather than inferred at build time by whoever is building. A write
  set short of the test lane is not a smaller contract; it is a contract that silently authorises a
  lane to leave its own evidence unwritten, and downstream it is the difference between a narrowed
  test run that selects the right suites and one that selects none.

  The rule is stated as a property of the DECLARATION, not of the diff, because that is where it can
  be checked before any code is written. A file already in `files:` is not proposed twice; a source
  file whose suite is already declared produces no finding; and a story that writes no source file at
  all owes no suite, which is what keeps a documentation-only story honest rather than padded.

  What would quietly undo this: reading the test roots from config in this module rather than
  receiving them; a second spelling of what counts as a suite file; and proposing a suite path for a
  file that is itself a suite, which turns one omission into an infinite regress of them.

  ADR-004 §4. FF-9602.

  Scenario: a source file with no declared suite proposes one
    Given a story whose `files:` names a source module and no suite
    When a proposal is derived for that story
    Then the suite owning that module is proposed for `files:`
    And it carries a reason naming the test lane as its source

  Scenario: a source file whose suite is already declared proposes nothing further
    Given a story whose `files:` names a source module and the suite that owns it
    When a proposal is derived for that story
    Then no additional suite is proposed for that module

  Scenario Outline: what owes a suite, and what does not
    Given a story whose `files:` names <declared>
    When a proposal is derived for that story
    Then <outcome>

    Examples: the rule applies to source, once, and to nothing else
      | declared                                    | outcome                                        |
      | one source module under a source root       | its owning suite is proposed                   |
      | two source modules under a source root      | a suite is proposed for each                   |
      | a suite file under a declared test root     | no suite is proposed for it                    |
      | a markdown document in the work tree        | no suite is proposed for it                    |
      | a bundle template                           | no suite is proposed for it                    |
      | nothing at all                              | no suite is proposed, and the set stays empty  |

  Scenario: the test roots are handed in, never read from config
    Given the module that derives the test lane
    When it is examined
    Then it accepts the test roots as a parameter
    And it reads no project configuration

  Scenario: what counts as a suite has one spelling
    Given the module that derives the test lane
    When it is examined
    Then it decides suite membership through the shipped path predicate
    And it holds no second definition of a suite file

  Scenario: a story that writes an existing module proposes the suite that exists, not a new one
    Given a story whose `files:` names a source module that an existing suite already covers
    When a proposal is derived for that story
    Then the existing suite's path is proposed
    And no new suite path is invented
