@executable @cli @work @validate
Feature: The rule cannot claim an operator's own hook, and it writes nothing at all

  This is the leg the story exists for. A duplicate detector that over-claims points at a hook its
  operator wrote on purpose, and the person who finds out is whoever it broke. Over-claiming here is
  the exact shape 72/ADR-005 §3 refused when it declined to change the merge.

  The hook that makes it concrete is in this repository. An unmarked pre-tool entry, under its own
  matcher, invoking the test-isolation guard — the thing that blocks an unisolated test run from
  writing into the real global home. aof does not manage it, aof must never adopt it, and the merge
  carries it through every update precisely because it carries the marker of nothing. It pairs with
  no managed entry, and a rule that reported it would be arguing for the deletion two milestones
  have now refused.

  The matcher and the event are part of the pairing, not context around it. Where aof manages an
  entry whose command matches an operator's under a DIFFERENT matcher, or in a different event,
  those are two rules that happen to run one program, and one of them is not aof's to name. This
  repository cannot feel that distinction — its own session entries all share the empty matcher —
  which is why the refusals are written from the installed case and driven from fixtures.

  A marked pair is refused for the opposite reason. Two entries both carrying the marker are a merge
  defect, not an operator fact; nothing an operator did produced them and no finding addressed to an
  operator would help.

  The writes are all of them refusals too. The lane is a pure function over an injected
  settings object and an injected marker key: it reaches no merge, imports nothing that merges, and
  opens no settings file for writing. It adopts nothing — stamping a marker onto an entry the
  operator wrote makes aof its owner, which is deletion with a delay. The repair that will one day
  be admissible is non-destructive suppression, and it is not in this story or this milestone.

  Every refusal is driven POSITIVELY: each gets its own row and each must come back with no finding.
  A table of things that must not happen passes just as happily when nothing is wired at all, so the
  same fixtures are driven back the other way — move the twin under the managed entry's own event and
  matcher and one finding must appear.

  ADR-005 §1, §2, §3, §4. FF-7703. 72/ADR-005 §3.

  Background:
    Given a settings object, a marker key and the path that settings object was read from, all three handed to the lane
    And the resolved invocation of a hook entry is its command plus its arguments, with the project-directory variable left exactly as written and every argument normalised by the same portable-path rule the merge applies — restated in the lane, which may not import the merge, and asserted here only through the behaviour below

  Scenario Outline: the entries the lane must not claim, each planted and each required clean
    Given a settings object carrying <planted>
    When the lane runs over that object
    Then it returns no audit-hook-duplicated finding
    And it names that entry in no finding of any kind
    And the lane's result is clean

    Examples: the four refusals — three the operator owns, one the framework owns
      | planted                                                                                          |
      | the operator's unmarked pre-tool guard entry, under its own matcher, pairing with no marked entry |
      | an unmarked entry equivalent to a marked one in the same event but under a different matcher      |
      | an unmarked entry equivalent to a marked one under the same matcher but in a different event      |
      | two marked entries equivalent to each other under one event and one matcher                       |

  Scenario Outline: the same fixtures, driven the other way, so the refusals are not vacuous
    Given the fixture in which <planted> is moved under the marked entry's own event and matcher
    When the lane runs over that object
    Then one audit-hook-duplicated finding is returned
    And it names that event, that matcher and the resolved command

    Examples: the two unmarked refusals become findings when the pairing conditions are met
      | planted                                                                    |
      | the unmarked entry that sat under a different matcher                      |
      | the unmarked entry that sat in a different event                           |

  Scenario: a marked entry planted beside the operator's guard does not implicate it
    Given a settings object in which a marked entry is planted in the guard's own event and matcher, invoking a different program
    When the lane runs over that object
    Then it returns no audit-hook-duplicated finding
    And the guard entry is reported in nothing

  Scenario: the injected settings object comes back exactly as it went in
    Given a settings object carrying a duplicate pair, and a record of that object taken before the run
    When the lane runs over that object
    Then the object is deep-equal to the record taken before the run
    And every entry's keys are in the order they were in before the run
    And the run still returned the finding for that pair, so it read the object it left alone

  Scenario: nothing is adopted and nothing is disowned
    Given a settings object carrying a duplicate pair, an operator's unmarked entry, and marked entries
    When the lane runs over that object
    Then every entry that carried the marker key still carries it, with the value it had
    And every entry that lacked the marker key still lacks it
    And no entry gained, lost or changed a command or an argument

  Scenario Outline: no route to a settings write exists on the lane's path
    Given <route> planted in a module this story adds
    When the modules this story adds are read for a route to a settings write
    Then the planted route is reported by the file that holds it
    And with nothing planted no route is found

    Examples: the routes that must not exist
      | route                                                        |
      | a file write naming a settings path                          |
      | a synchronous file write naming a settings path              |
      | an import of the module that merges settings                 |
      | a call to the settings merge or its splice                   |
      | an import of the module that declares the marker key         |
      | a child process of any kind                                  |

  Scenario: the lane leaves no trace on disk
    Given a settings file on disk and its bytes recorded before the run
    When the lane runs over a settings object carrying a duplicate pair
    Then the file's bytes are unchanged
    And its modification time is unchanged
    And no file is created beside it

  Scenario: two runs over one object give one answer, and neither writes
    Given a settings object carrying a duplicate pair
    When the lane runs over that object twice in one process
    Then the two results carry the same findings, the same read record and the same limits
    And a run over a second object carrying no duplicate pair, made between the two, returns no finding
    And the third run over the first object returns that same finding again
    And no settings file was written by either run

  Scenario: the lane reaches no merge and proposes no repair
    Given a settings object carrying a duplicate pair
    When the lane runs over that object
    Then the finding it returns says which pair was found
    And it carries no instruction to delete, collapse, adopt or suppress an entry
    And no result the lane returns is a settings object to be written
