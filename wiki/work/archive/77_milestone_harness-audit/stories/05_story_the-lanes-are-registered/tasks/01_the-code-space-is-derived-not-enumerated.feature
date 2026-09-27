@executable @cli @work @validate
Feature: The audit's code space is derived from its lanes, so a new rule cannot arrive outside the check

  The guard that keeps this command's finding codes apart from the doctor's ENUMERATES two code sets
  by name. That is a stored fact about the tree: it was true the day it was written, and nothing
  tells it when it stops being true. Measured here, it would have run green over all seven codes
  this milestone adds without ever having looked at one of them — the species the debt register
  already names, caught this time before it cost anything.

  The repair is not a third name in the list, because that only moves the expiry date one milestone
  out. The checked set is DERIVED from the registered lanes, so registering a lane puts its
  vocabulary inside the check and there is no enumeration left to forget.

  Why the check is worth having at all: two commands sharing one finding code means one command's
  severity table decides the other command's meaning, and a reader who looks the code up finds two
  answers with nothing to choose between them.

  Pairwise disjointness INSIDE the audit is a new claim, never made before. A code two lanes both
  emit is a code whose fix is ambiguous — the finding says what is wrong and the reader cannot tell
  which of two rules to satisfy.

  Floors first, and they are not ceremony. Two empty sets are trivially disjoint, so a check run
  over an emptied set passes while asserting nothing — which is exactly the failure this command
  exists to catch, one directory over. Each side is measured before any claim is made about it.

  The guard being extended also holds that a control is re-read and never executed. Extending it
  must weaken no leg of that, so the standing claims are driven here beside the new one rather than
  trusted to survive the edit.

  ADR-001 §4. ADR-008 §4. ADR-010 §4. FF-7707.

  Scenario Outline: the checked code space answers the registry rather than a list
    Given a registry carrying <registered>
    When the audit's checked code space is read
    Then it carries <carried>

    Examples: register a lane and its codes are inside the check
      | registered                                                   | carried                                                        |
      | the lanes that shipped before this milestone                 | each of their codes, and none of the seven this milestone adds |
      | those lanes and the four this milestone adds                 | each of their codes, and all seven                             |
      | those lanes and one further lane carrying a code of its own  | that further lane's code as well                               |
      | those lanes with one of the four absent                      | no code belonging to the absent lane                           |

  Scenario Outline: each of the seven codes this milestone adds is inside the checked set, owned by one lane
    Given the audit's checked code space
    When <code> is looked for in it
    Then it is found
    And exactly one registered lane declares it

    Examples: the seven codes this milestone adds
      | code                       |
      | audit-agent-capability-gap |
      | audit-instruction-duplicated |
      | audit-hook-duplicated      |
      | audit-seam-unwired         |
      | audit-bound-undeclared     |
      | audit-bound-off-reference  |
      | audit-reference-stale      |

  Scenario Outline: a collision is refused, and both holders of the code are named
    Given <collision> planted
    When the audit's code space is checked against the doctor's and against itself
    Then the check refuses, naming <named>

    Examples: the two ways one code can come to mean two things
      | collision                                                            | named                                                      |
      | a lane vocabulary carrying a code the doctor's control codes already carry | the shared code, the lane holding it, and the doctor's set |
      | one code declared by two of the audit's own lanes                     | the shared code and both lanes                             |

  Scenario: the shared read-floor code belongs to NO lane, and the pairwise check declares it so
    Given the code the audit's read contract raises when a sweep reads below its floor
    And that code already sits in two lane vocabularies, and every lane raises it structurally
    When the pairwise check across the registered lanes is run
    Then that code is not counted against any lane's vocabulary
    And the result states that it is lane-neutral, and why
    And with that carve-out removed the check refuses, naming the lanes that share it

  Scenario: with nothing planted the check passes and reports how much it read on each side
    Given the code spaces as this repository declares them
    When they are checked against each other
    Then no collision is reported
    And the check reports how many codes it read on each side

  Scenario Outline: a check that would pass over an empty set is itself refused
    Given <side> carrying no code at all
    When the disjointness check is run
    Then it is refused before any claim of disjointness is made
    And the refusal names the side that was empty

    Examples: the non-vacuity floors, one per side
      | side                             |
      | the doctor's control codes       |
      | the audit's derived code space   |
      | a registered lane's own vocabulary |

  Scenario Outline: the guard's standing claims are unweakened by the change
    Given <planted> in the tree
    When the guard is run
    Then the planted thing is reported by the file that holds it
    And with nothing planted none is found

    Examples: the legs an extension of this guard must not weaken
      | planted                                                                            |
      | a child process started from the doctor's controls module                          |
      | a wall-clock read in the doctor's controls module                                  |
      | a cited control that a doctor lane executes rather than re-reads                   |
      | an edge from a doctor lane into the audit family, two hops away through a helper   |
      | an import from the audit family into a doctor module that is not a register extractor |
      | a doctor lane added by this milestone                                              |
