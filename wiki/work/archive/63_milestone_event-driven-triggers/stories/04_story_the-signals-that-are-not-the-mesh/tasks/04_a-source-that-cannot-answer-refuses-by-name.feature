@executable @cli @work @validate
Feature: A source that cannot answer refuses with a code, and says which source and what it could not resolve

  The caller here is a crontab line, a CI step or a dispatch, and none of them is reading. That single
  fact decides the whole criterion: an empty resolution handed to an unattended caller is
  indistinguishable from "nothing to do", so a source that returns one has not failed loudly, it has
  succeeded at reporting nothing. The wake path dies, the trigger keeps being declared, and the first
  person to notice is whoever eventually asks why the loop stopped running months ago.

  So the answer to a signal that cannot be resolved is a refusal, and a refusal is a positive object
  with a code on it. The code is what an unattended caller branches on; the source name is what tells
  a reader which of the three failed, because a batch answer that merely says something went wrong
  sends them to read all three; and the description of what could not be resolved is what makes the
  refusal actionable rather than a shrug — the difference between "no scope" and "the scope field was
  absent from this cadence trigger" is the difference between a message and a diagnosis.

  A wrong implementation passes every test that only ever asserts the happy path, and it has several
  faces, all of them tidy. Returning an empty list. Returning a resolution whose scope is null.
  Dropping the signal from the answer entirely and letting the caller notice the missing entry.
  Falling back to a default scope, or to the last one that worked. Attaching a warning to an otherwise
  successful answer. The second table exists because each of those is somebody's idea of graceful,
  and each is the same silence wearing different clothes.

  The pair of sets is therefore accounted for exactly: every signal handed in has one answer, and it
  is a resolution or a refusal, never both and never neither. Nothing is dropped between them, and one
  signal that cannot be resolved does not cost another signal its answer.

  ADR-007 §5. 59/ADR-004 §1a. ADR-001 §3. FF-6307.

  Scenario Outline: what a source could not resolve, said by name
    Given <signal>
    When it is resolved
    Then no scope is resolved for it
    And the answer is a refusal carrying a code
    And the refusal names <named>

    Examples: which source, and what it could not resolve
      | signal                                                          | named                                                 |
      | a cadence trigger declaring no scope at all                     | the cadence source, and that no scope was declared    |
      | a cadence trigger whose scope is present and empty              | the cadence source, and the empty scope handed to it  |
      | a CI signal naming no ref                                       | the CI source, and the ref it could not find          |
      | a CI signal whose ref is blank                                  | the CI source, and the blank ref                      |
      | a CI signal that is not an object at all                        | the CI source, and the signal it could not read       |
      | a finding signal naming an item that carries no capture         | the finding source, and the item that carried none    |
      | a finding signal carrying no attribution                        | the finding source, and the missing attribution       |
      | a signal naming a source nobody declared                        | the unknown source, and the sources that are known    |
      | a signal whose scope matches no admitted form                   | the source that was asked, and the scope it refused   |

  Scenario Outline: an unresolvable signal is never any of the shapes that read as nothing to do
    Given a signal one of the sources cannot resolve
    When its answer is read by a caller that reads nothing else
    Then the answer is not <shape>

    Examples: each of these is a wake path dying quietly
      | shape                                                     |
      | an empty resolution                                       |
      | a resolution whose scope is null, empty or absent         |
      | a resolution carrying a default or fallback scope         |
      | a resolution carrying the last scope that did resolve     |
      | the signal's simple absence from the answer               |
      | a resolved answer with a warning attached to it           |
      | prose carrying no code a caller can branch on             |

  Scenario: every signal has exactly one answer
    Given a set of signals of which some resolve and some cannot
    When all of them are resolved
    Then every signal appears once, as a resolution or as a refusal
    And no signal appears as both
    And no signal appears as neither
    And the two sets together account for every signal handed in

  Scenario: one refusal does not cost another signal its answer
    Given one signal that cannot be resolved among several that can
    When all of them are resolved
    Then the refusal is present for the one that could not be resolved
    And every other signal still carries its own resolved scope
    And the run is not abandoned at the first signal that could not be answered

  Scenario: a refusal carries no more than a resolution does
    Given any refusal from any of the three sources
    When the whole refusal is read
    Then it carries no level, no bound, no gate verdict and nothing to execute
    And it carries no partially resolved scope
    And it suggests no scope the caller did not name

  Scenario: refusing and resolving-to-an-empty-stream are different answers
    Given one signal naming a well-formed driver no item bears
    And one signal whose scope cannot be resolved at all
    When both are resolved
    Then the first is a resolution carrying that driver as its scope
    And the second is a refusal carrying a code
    And the two answers are distinguishable without reading either as prose

  Scenario: a refusal says what failed, not merely that something did
    Given two signals the same source cannot resolve, unresolvable for different reasons
    When both are refused
    Then each refusal names what it could not resolve
    And the two refusals differ in what they name
    And neither is satisfied by a single catch-all sentence
