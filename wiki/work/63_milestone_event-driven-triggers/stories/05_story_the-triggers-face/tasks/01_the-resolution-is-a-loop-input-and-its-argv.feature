@executable @cli @work @work-stream
Feature: The whole answer is the loop's own input and the argv that carries it, one object rendered twice

  A trigger's entire job is to say which scope, at which level. The answer is therefore the input the
  loop already declares, plus the exact argv that would carry that input to it, and nothing else. Four
  sources converge on one command with one input shape: there is no cadence-shaped answer and no
  mesh-shaped answer, because four shapes that all end at one command are one shape with four
  producers, and the extra vocabulary would have to be kept in step with the loop's own.

  The argv is handed over as argv — a list of tokens — rather than as a line of shell a caller has to
  split. That distinction looks cosmetic and is not. A caller given a string must quote it, and
  quoting a scope or a level is where an unattended path breaks silently, at three in the morning, in
  a log nobody reads. A list a caller can execute as it stands cannot be mis-split.

  Two renderings of one object is a formatting choice; two derivations of one object is two answers,
  and the second one drifts the first time either is edited. So a figure present in the human face is
  present in the machine face, and neither states a value the other does not carry.

  What the answer may not carry is as much of the contract as what it must. A cap, a model, an effort
  or a set of review claims on a resolution would be a second home for a bound the loop already owns,
  and those flags remain the caller's to add to the argv it was handed. A phase would be a directive,
  which belongs to a different family. A slash command would make this a prompt author. A verdict
  about whether the run may proceed would be a second gate.

  The wrong implementation that survives review is the plausible one: a human face that prints a
  well-formed command line assembled independently of the object the machine face emits. It reads
  correctly on the day it is written, and the first edit to either side makes an operator's copied
  command line and their pipeline's parsed argv disagree about the level.

  ADR-001 §1, §3. ADR-003 §2. ADR-008 §9. FF-6301.

  Scenario: the answer names the command the loop already registers
    Given a trigger that resolves
    When its argv is read
    Then its leading tokens are the loop's own route
    And the command those tokens name is one the registry answers for
    And the scope and the level it carries are the ones the resolution states

  Scenario Outline: what a resolved trigger carries, and what it may not
    Given a trigger that resolves
    When its resolution is read
    Then <thing> is <presence>

    Examples: the loop's declared input, the argv that carries it, and no third thing
      | thing                                              | presence |
      | the scope the loop is to run over                  | present  |
      | the level the loop is to run at                    | present  |
      | the argv that carries them                         | present  |
      | the id of the trigger it resolved from             | present  |
      | the source that trigger declares                   | present  |
      | a per-attempt cap                                  | absent   |
      | a model or an effort                               | absent   |
      | review claims                                      | absent   |
      | a phase to drive                                   | absent   |
      | a slash command                                    | absent   |
      | a verdict about whether the run may proceed        | absent   |
      | any key the loop's own input does not declare      | absent   |

  Scenario: the argv is a list of tokens, not a line of shell
    Given a resolved trigger whose scope and level are read from the declaration
    When its argv is read
    Then it is a sequence of separate tokens
    And the scope is one token of it and the level another
    And no token carries a quote, an escape or a separator a caller would have to remove
    And executing that sequence as it stands needs no further parsing

  Scenario Outline: a fact stated by one rendering is stated the same way by the other
    Given a run carrying <fact>
    When both renderings are read
    Then <fact> reads the same in each
    And neither rendering states it in a form the other does not carry

    Examples: two faces over one object — neither derives a figure of its own
      | fact                                                 |
      | the scope a trigger resolved to                      |
      | the level a trigger resolved at                      |
      | the argv, token for token                            |
      | the trigger id each resolution came from             |
      | the code carried by each refusal                     |
      | the failing gate half named by a refused level       |
      | the source each declared trigger was declared under  |

  Scenario Outline: four sources, one answer shape
    Given a declaration whose triggers cover every declared source
    When the trigger declared under <source> resolves
    Then its answer carries the same keys as every other resolution in the run
    And its argv begins with the same two tokens as every other resolution in the run

    Examples: a source answers which scope, and never what shape the answer takes
      | source                    |
      | a cadence coming due      |
      | a mesh work-assignment    |
      | a signal from a build     |
      | an inbound finding        |

  Scenario: named with no trigger, the answer is every declared trigger
    Given a declaration carrying several triggers
    When the face is run with no trigger named
    Then every declared trigger appears in the answer, resolved or refused
    And each appears with the id it is declared under

  Scenario: named with one trigger, the answer is that one
    Given a declaration carrying several triggers
    When the face is run with one of their ids named
    Then the answer carries that trigger and no other
    And what it carries for that trigger reads the same as it did in the unnamed run

  Scenario: a signal resolves against the declaration rather than beside it
    Given a signal naming a source and the scope it points at
    When it is resolved
    Then the answer names the declared trigger the signal matched
    And its level is the one that trigger declares, not one the signal carried
    And a signal matching no declared trigger is refused by code rather than answered emptily
