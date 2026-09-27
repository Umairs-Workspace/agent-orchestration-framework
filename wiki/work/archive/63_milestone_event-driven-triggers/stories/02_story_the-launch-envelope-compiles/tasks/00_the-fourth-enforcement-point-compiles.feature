@executable @cli @assets @distribution
Feature: Every enforcement point the declaration may name is a point that compiles

  Four enforcement points are declared and three compile. The fourth has carried a spelling since the
  frozen set shipped, and the compiler reports it by name in its own deferred list — which is the only
  honest way to carry a gap, and also the reason the gap survived. A point that reports itself deferred
  is a point nobody has to argue with: it does not fail, it does not warn, and the set it belongs to
  still reads as installed.

  The claim here is therefore a census rather than a count. "Four points compile" is satisfiable by a
  check that retypes four names, and a compiler that still handled three would pass it unchanged. What
  must hold is that the set of points which compile and the set of points a member may declare are the
  same set — so a point added later arrives either compiled or failing, never quietly deferred.

  The second thing that would slip past is a compiled artifact that ignores the member which produced
  it. An enforcement point whose output would be the same if its rule were deleted is decoration with a
  compile step in front of it, and that is precisely what the fourth point has been. So the artifact is
  required to move when the declared shape moves.

  The third is a member that lands in no set at all. Widening the compiler and forgetting the report
  leaves a member reported neither installed, nor deferred, nor as an entry aof does not own — armed or
  not, nobody outside can tell, which is worse than the gap it replaced.

  The envelope member is held to the same malformed-input discipline as the other three points — one
  coded refusal, never a partially compiled set — and to 55's sanctioned exit: an entry nobody marked as
  aof's is left exactly as it is rather than reasserted.

  ADR-005 §1. FF-6305.

  Scenario: the shipped declaration compiles with nothing left deferred
    Given the frozen set aof ships
    When it is compiled
    Then no member is reported deferred
    And the envelope member is reported installed
    And every declared member is reported in exactly one of installed, deferred, or not owned by aof

  Scenario: the points that compile are the points the declaration may name
    Given the enforcement points a member is allowed to declare
    When the points that compile are read
    Then the two are the same set
    And neither holds a point the other does not

  Scenario Outline: a marked member naming a point produces the artifact that point carries
    Given a marked member naming the <point> enforcement point
    When the declaration is compiled
    Then the member is reported installed
    And the compiled set carries <artifact>

    Examples: four declared points, four compiled artifacts, and no deferral among them
      | point                      | artifact                   |
      | tool-call hook entries     | a hook entry               |
      | permission denials         | a permission denial        |
      | agent tool scope           | an agent tool scope        |
      | the worker launch envelope | an unattended launch shape |

  Scenario: the compiled launch shape answers to the member that declared it
    Given two declarations whose envelope members name different launches
    When each is compiled
    Then each compiled launch shape is the one its own member declared
    And neither is a value the compiler would have produced with the rule removed

  Scenario Outline: the envelope member's own malformed cases are refused by name
    Given an envelope member <defect>
    When the declaration is compiled
    Then the whole compile is refused
    And the refusal carries a code and names the member
    And no compiled set is returned, not even one holding the members that were well formed

    Examples: the discipline the other three points already keep, applied to the fourth
      | defect                                              |
      | with no rule at all                                 |
      | whose rule is not an object                         |
      | whose rule names no program                         |
      | whose rule names a program that is not a string     |
      | whose rule names no arguments                       |
      | whose rule names an argument that is not a string   |
      | whose rule carries a shape this point does not know |

  Scenario: one malformed envelope member refuses the whole set rather than most of it
    Given a declaration holding one malformed envelope member among well-formed members
    When the declaration is compiled
    Then it is refused
    And no enforcement point receives a rule from that compile

  Scenario: an envelope entry nobody marked as aof's is left alone rather than reasserted
    Given an envelope member with its ownership marker removed
    When the declaration is compiled
    Then the entry is reported as one aof does not own
    And it is not reported installed
    And it is not reported deferred
    And no unattended launch shape is produced from it
    And the entry in the working tree is unchanged
