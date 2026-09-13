@executable @cli @work @validate
Feature: An applier is a command the registry answers for, and anything else is refused and said so

  The set of things that can change this system is the command registry. An applier that is anything
  else — a shell line, a path to a file, a sentence telling someone what to do — is unresolvable and
  undiffable, and it puts a reader in the position of guessing what was meant while believing that a
  machine checked it. The registry is asked, and it either answers for the id or it does not.

  What matters to the reader is what a refusal does NOT do. It does not delete the proposal and it
  does not take away its patch. It means this change is a hand-edit, and the surface has to say that
  word rather than name something that sounds runnable. A proposal naming an applier outside the
  registry is naming a hand-edit whether or not it admits it; the only question is whether the reader
  finds out from the report or from the shell.

  The wrong-green here is a helpful one, which is what makes it likely. Fill the applier with the
  nearest registered command, or with the shell line that would do the job, and every proposal renders
  with something actionable beside it. Both are wrong in the same way: the reader runs something no
  one checked, on the authority of a report that implied someone had.

  ADR-004 §3, §4. FF-6203.

  Scenario Outline: the registry answers, or the proposal has no applier
    Given a proposal carrying a complete patch
    And an applier named as <named>
    When the proposal is emitted
    Then <outcome>

    Examples:
      | named                                                   | outcome                                     |
      | an id the registry answers for                          | it carries that command as its applier      |
      | an id the registry does not know                        | it carries no applier, naming what it asked |
      | an id differing from a registered one only in case      | it carries no applier, naming what it asked |
      | an id differing from a registered one by trailing space | it carries no applier, naming what it asked |
      | a shell command line                                    | it carries no applier, naming what it asked |
      | a path to the file a human would edit                   | it carries no applier, naming what it asked |
      | a sentence telling a human what to do                   | it carries no applier, naming what it asked |
      | an empty name                                           | it carries no applier, naming what it asked |

  Scenario: every applier on an emitted proposal is a command the registry answers for
    Given the proposals emitted over a corpus spanning all four classes
    When each applier is put to the registry
    Then the registry answers for every one of them
    And no applier is a shell line, a file path or an instruction addressed to a human

  Scenario: a refused applier removes neither the proposal nor its patch
    Given a proposal with a complete before→after whose applier id the registry does not know
    When the proposal is emitted
    Then it appears in the emitted set
    And its patch is rendered in full
    And it carries no applier
    And it says the change must be made by hand

  Scenario: the surface never implies a command that does not exist
    Given a proposal refused its applier
    When the proposal is read
    Then no command is offered for a reader to run
    And the id that the registry did not answer for is named
    And a nearby registered command is not offered in its place

  Scenario: a refused applier is told apart from having no patch to apply
    Given a proposal whose applier id the registry does not know
    And a story-sizing hint, which has no patch at all
    When each is read
    Then neither carries an applier
    And each states its own reason
    And the two reasons are distinguishable

  Scenario: registering the command changes the answer, with nothing else edited
    Given a proposal refused its applier because the registry does not know its id
    When that id is registered as a command
    And the proposal is emitted again
    Then it carries that command as its applier
    And the only thing that changed is the registry

  Scenario: naming an applier does not run it
    Given a proposal carrying an applier the registry answered for
    When the proposal set is produced
    Then the named command has not been run
    And nothing the applier would have changed has changed
    And the proposal is addressed to a human who will decide whether to run it
