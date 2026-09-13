@executable @cli @work @validate
Feature: Four rules join the command, and each executes as itself

  Four modules nobody calls is the exact failure one of these four rules exists to catch. A
  milestone that shipped its own seam unwired would be caught by the thing it shipped, which is the
  most embarrassing shape a defect can take — so the claim that the rules RUN is driven here rather
  than assumed from the fact that they were written.

  The registry they join was, until recently, a frozen description dispatched by a chain whose final
  branch was the registry-checks lane. A fourth entry appended to it would have re-run the checks
  lane under its own name, duplicated every finding it raised, and reddened nothing. Each entry now
  carries its own runner, and an entry the registry cannot execute must fail by name rather than
  fall through — a fourth lane is what would have hit it, so a fourth lane is what drives it.

  A lane that FOUND nothing and a lane that LOOKED AT nothing are the same sentence in a finding
  list, and the second is the failure this command exists to catch. So every lane returns a read
  record with a floor above zero, no floor is ever defaulted, and a lane that returns none is
  REFUSED rather than reported clean.

  The same rule one field over: a sweep that read TEXT owes a statement of what it could not see,
  and a limit the face cannot render is refused rather than printed blank — a blank limit says a
  caveat exists and then withholds it.

  Every one of those requirements is driven FROM THE REGISTRY, over whatever is registered, never
  from a list of four. That is the difference between a contract this milestone satisfies and one
  the next milestone inherits: a fifth lane cannot arrive without a read record, a floor and a
  limit, because the drive does not know how many lanes there are.

  None of these four starts a child process. The command they ride does; the rules themselves
  are immune to that whole class by construction, and the absence is asserted rather than merely
  true today.

  ADR-001 §2. ADR-008 §3. ADR-010 §2, §4. FF-7707, FF-7708.

  Scenario Outline: every registered lane runs, and every finding it raises is attributed to it
    Given an audited project carrying a corpus each registered lane can read
    When the audit is run over it
    Then the lane over <subject> is reported as having run, with the size of what it read
    And every finding it raised is attributed to that lane
    And every code it raised is one of <its codes> and none belonging to another lane

    Examples: the four lanes this milestone adds, named by the subject each sweeps
      | subject                                  | its codes                                                              |
      | the installed prompt layer               | audit-agent-capability-gap, audit-instruction-duplicated               |
      | the audited hook wiring                  | audit-hook-duplicated                                                  |
      | the audited tree's exported seams        | audit-seam-unwired                                                     |
      | the audited project's declared bounds    | audit-bound-undeclared, audit-bound-off-reference, audit-reference-stale |

  Scenario: with every lane green the command closes clean and says what each one swept
    Given an audited project in which no registered lane finds anything to report
    When the audit is run over it
    Then every registered lane is reported as having run
    And each reports the count it read against the floor it required
    And the result states that what it read is healthy, rather than saying nothing at all
    And the exit status is zero

  Scenario Outline: an entry the registry cannot execute is refused by name, never run as another lane
    Given a registry in which <shape>
    When the audit is run
    Then the run is refused with a message naming <named>
    And no finding is reported under the affected entry's name
    And no other lane's result is reported under it

    Examples: the fall-through a fourth lane would have hit
      | shape                                | named          |
      | one entry declares no runner         | that entry     |
      | two entries declare the same runner  | both entries   |

  Scenario: with a well-formed registry each entry runs under its own name
    Given a registry in which every entry carries its own runner and no two share one
    When the audit is run
    Then each entry is reported once, under its own name
    And no two entries report the same findings as each other

  Scenario: every lane the audit assembles says what it read, with a floor above zero
    Given every lane the audit assembles
    When each is run in turn over a corpus it can read
    Then each returns a read record naming the sweep, the root it walked, what its population is, and whether it read disk, text or a runtime answer
    And every floor it declares is above zero
    And every sweep reports the count it actually read

  Scenario Outline: a lane whose read record is not declared is refused, never degraded to a clean pass
    Given a registry carrying a further lane that returns <read record>
    When the audit is run
    Then the run is refused with a message naming that lane
    And nothing is reported clean on its behalf

    Examples: what a fifth lane cannot arrive without
      | read record                                                            |
      | no read record at all                                                  |
      | a read record whose sweep declares no floor                            |
      | a read record whose sweep declares a floor of zero                     |
      | a read record whose sweep declares no root                             |
      | a read record whose sweep does not say how the population was read     |
      | a read record carrying no count                                        |

  Scenario Outline: a text sweep owes a limit, and one that cannot be rendered is refused rather than blanked
    Given a registry carrying a further lane whose sweep reads <basis> and which returns <limit>
    When the audit is run
    Then <outcome>

    Examples: what a fifth lane owes about its own blindness
      | basis | limit                                                          | outcome                                                                       |
      | text  | a limit stating its question, what answered it and the consequence | the run completes and that limit is reported against the lane, clean or not |
      | text  | a limit that states no question                                | the run is refused, naming the lane and the part it withheld                  |
      | text  | a limit that states no consequence                             | the run is refused, naming the lane and the part it withheld                  |
      | text  | no limit at all                                                | the run is refused, naming the lane and its text sweep                        |
      | disk  | no limit at all                                                | the run completes and no limit is reported for that lane                      |

  Scenario Outline: the machine face carries the new findings in doctor's envelope plus the audit's two addressing keys
    Given an audited project in which each of the four lanes raises at least one finding
    When the audit is run with the machine-readable option
    Then every finding carries <key>, holding <what it carries>
    And no finding carries a key outside the six
    And the machine output states the envelope it rendered them under

    Examples: doctor's four keys, and the two the audit adds to address a finding
      | key      | what it carries                                                    |
      | code     | the finding's own code                                             |
      | severity | the rung the ladder fixes for that code                            |
      | path     | the file the finding is about, relative to where the command ran   |
      | message  | what was found, in one sentence its owner can act on               |
      | about    | the instrument the finding is about                                |
      | to       | the reference-owners the finding is addressed to                   |

  Scenario Outline: no lane this milestone adds starts a child process
    Given <route> planted in a module this milestone adds
    When those modules are read for a route to a child process
    Then the planted route is reported by the file that holds it
    And with nothing planted no route is found

    Examples: the routes to a child process that must not exist
      | route                                                  |
      | an import of the child-process module                  |
      | a call to exec                                         |
      | a call to execFile                                     |
      | a call to execSync                                     |
      | a call to spawnSync                                    |
      | a call to fork                                         |
      | a child started through the family's own bounded seam  |
