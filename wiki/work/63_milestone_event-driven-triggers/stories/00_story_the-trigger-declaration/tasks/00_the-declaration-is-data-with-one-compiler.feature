@executable @cli @work @validate
Feature: A declared trigger compiles through one compiler it is handed, and a source outside the closed vocabulary is refused by name

  A trigger vocabulary spread across a config key, a scheduler entry and a call site is one nobody
  reviews, because there is no artifact to review; the first time anyone assembles it is after an
  unattended run did something surprising. What refuses that is not a document about triggers — it is a
  file a reviewer reads in a diff, and one compiler that turns it into the thing the machine runs.

  The compiler is HANDED its declaration, and that is the difference between a compiler and a loader. It
  is also what makes every case below reachable: a declaration nobody has written to disk compiles
  exactly as the shipped one does, and compiling the same declaration twice answers the same twice. An
  implementation that reached for the installed file whenever it was asked to compile would pass every
  scenario written against the shipped declaration and fail none, while being untestable against any
  case the shipped declaration does not happen to contain — which is every case that matters.

  The SOURCE axis is closed and it is this milestone's own. The loop registry already carries a
  vocabulary that looks like it — `per-item`, `per-phase`, `per-milestone`, `per-run-start` — and those
  are scope ordinals standing in a containment relation, not places a signal came from. An
  implementation that admitted one as a source would have merged two axes that were separated on
  purpose, and it would pass any test that only ever declares the four sources that are real. So the
  near-misses are declared here deliberately: an ordinal in the source field, a cadence in the source
  field, and a source differing from a real one only by its case or by a space.

  Absence is not a value either. A member that declares no cadence compiles and carries none; a member
  declaring the sentinel compiles and carries the sentinel. An implementation that filled the first in
  with the second would make every uncadenced trigger comparable against the loop it points at, which
  is a comparison nobody declared, and it would read as agreement rather than as silence.

  ADR-002 §1, §2, §4. FF-6302.

  Scenario: the declaration is data a reviewer reads, and every compiled trigger traces to its member
    Given a workspace with a declared trigger set
    When its members are read
    Then each member is readable from the working tree
    And each names what it protects, the source it answers to, the scope it wakes and the level it asks for
    When the declaration is compiled
    Then every compiled trigger names the member that declared it
    And every compiled trigger carries that member's scope, level, source and what it protects
    And no compiled trigger exists that no member declared

  Scenario: the compiler is handed its declaration and reads nothing to answer
    Given a declaration that exists nowhere on disk
    When it is compiled
    Then it compiles
    And nothing about the answer depends on what is installed in the workspace
    When the same declaration is compiled a second time
    Then the second answer equals the first

  Scenario: the answer is one whole object, or one refusal, and never both
    Given a declaration whose members all compile
    When it is compiled
    Then the answer carries the compiled triggers and the ids it accepted
    And the answer cannot be mutated after it is handed back
    And no member is applied while another is still being validated

  Scenario: a member that declares no cadence carries none, and that is not the sentinel
    Given a member declaring no cadence
    And a second member declaring the cadence sentinel
    When the declaration is compiled
    Then the first compiled trigger carries no cadence at all
    And the second carries the sentinel
    And the two are distinguishable from each other in the answer

  Scenario Outline: the sources a member may name, and the near-misses that are not among them
    Given a member naming <source> as its source
    When the declaration is compiled
    Then it is <outcome>

    Examples: the four that exist
      | source                                        | outcome  |
      | the source a cron cadence declares            | accepted |
      | the source a mesh work-assignment declares    | accepted |
      | the source a PR or CI signal declares         | accepted |
      | the source an inbound feedback finding declares | accepted |

    Examples: a closed vocabulary is only closed if these are refused
      | source                                          | outcome                                    |
      | a fifth source no member has ever declared      | refused                                    |
      | "per-item", an event trigger from the loop registry | refused — an ordinal is not a source    |
      | "per-milestone", likewise                       | refused — an ordinal is not a source       |
      | "periodic:1h", a cadence in the source field    | refused — a cadence is not a source        |
      | a real source differing only in its case        | refused, and never read as its neighbour   |
      | a real source with surrounding whitespace       | refused, and never trimmed into a real one |
      | the empty string                                | refused                                    |
      | a source that is not a string                   | refused                                    |

  Scenario: the refusal for an unknown source names the member and lists the sources that exist
    Given a member naming a source that does not exist
    When the declaration is compiled
    Then it is refused with a code
    And the refusal names the member that declared it
    And the message lists the sources that do exist
    And the listed sources are the ones a member may actually name, not a retyped copy of them

  Scenario: the source field and the cadence field are checked against different vocabularies
    Given a member whose source is one of the four and whose cadence is "event:per-item"
    And a second member whose source is "per-item" and whose cadence is "event:per-item"
    When the declaration is compiled
    Then the compile is refused, and the refusal names the second member
    And the refusal is about the source it named, not about its cadence
    And the same declaration without the second member compiles
