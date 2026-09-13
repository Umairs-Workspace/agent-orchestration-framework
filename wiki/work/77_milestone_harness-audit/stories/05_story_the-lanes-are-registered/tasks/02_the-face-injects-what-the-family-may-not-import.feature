@executable @cli @work @validate
Feature: The face injects what the family may not import, and each code's rung is fixed before a build sees it

  The rule family may not reach outside its own directory, and there are three facts it needs from
  outside it: which marker says a hook entry was written by the framework, whether the audited
  project would SPAWN a given role or run it inline, and which tree is the subject. All three are
  handed in as arguments at the impure boundary, along with the instant the run is happening at.
  Injection is the seam, never a second implementation.

  That is not purity for its own sake. A fact read in two places has two expiry dates, and it is the
  second reader that goes stale — silently, because the first one is still right and nothing
  compares them.

  A lint that reddens a build merely by ARRIVING is a lint somebody turns off within the week, and a
  rule nobody runs is worth less than no rule at all. So each code's rung is fixed before any
  construction site can invent one, and every error-severity leg was measured at zero in this
  repository first; two of the three are held there by controls that already existed.

  Two of the seven take their rung from the AUDITED project rather than from the rule. An
  instruction to a role the project would spawn is an error, because a subagent is really being
  started without the verb it was told to use; the same instruction where the project routes that
  role inline is a warning, because nothing is spawned to be short of anything. This repository
  routes the product owner inline, which is why its one live gap is a warning.

  The strict setting changes the EXIT CODE and nothing else. The finding set is identical with and
  without it, so an advisory run and a gating run are two readings of one report rather than two
  reports of one tree.

  Clock-free is a testability claim as much as a purity one: the same inputs give the same answer
  twice in one process, so a finding about staleness is driven at a fixed instant instead of waited
  for.

  ADR-008 §3, §4, §5. ADR-010 §2. FF-7707, FF-7708.

  Scenario Outline: each fact the family may not read for itself arrives with the injected context
    Given a lane handed <fact> by the face
    When the audit is run again with that fact changed and nothing else
    Then the answer changes with it
    And the answer follows what was handed in, never what the repository the command was installed from declares

    Examples: the facts supplied at the impure boundary
      | fact                                                              |
      | the marker key saying which hook entries the framework authored   |
      | the audited project's resolved role routing                       |
      | the subject root the audit is running over                        |
      | the instant the run is happening at                               |

  Scenario Outline: a second route to an injected fact is reported by the file that holds it
    Given <route> planted in a module this milestone adds
    When those modules are read for a route to what the face injects
    Then the planted route is reported by the file that holds it
    And with nothing planted no route is found

    Examples: the routes that must not exist inside the family
      | route                                                             |
      | an import of the settings module                                  |
      | an import of the marker key, rather than a parameter carrying it  |
      | the marker key spelled as a literal                               |
      | a second reader of the role-routing configuration key             |
      | a read of the audited settings file from disk                     |
      | a wall-clock read                                                 |
      | a subject root derived from the module's own location             |

  Scenario Outline: the capability finding's rung is the audited project's own routing decision
    Given an audited project whose configuration <routing> the role an instruction names
    When the audit is run over it
    Then the capability finding is reported at <severity>
    And the rung is decided by the audited project's configuration, never by the repository the command was installed from

    Examples: the two routings, both driven
      | routing        | severity |
      | would spawn    | error    |
      | routes inline  | warn     |

  Scenario: this repository routes the product owner inline, so its live gap is a warning
    Given this repository as the audited project
    When the audit is run over it
    Then the capability gap it carries is reported at warn
    And it does not change the exit status under the strict setting

  Scenario Outline: each code's rung is fixed, and no lane emits a code outside the seven
    Given an audited project in which <condition>
    When the audit is run over it
    Then <code> is reported at <severity>
    And no lane this milestone adds reported a code outside the seven

    Examples: the ladder, one row per code
      | code                         | condition                                                                            | severity |
      | audit-agent-capability-gap   | an instruction names a verb the role was never granted, in a project that would spawn it | error    |
      | audit-instruction-duplicated | one rule is stated in two documents in the same words                                | warn     |
      | audit-hook-duplicated        | one hook is registered twice under one matcher                                       | error    |
      | audit-seam-unwired           | an exported seam no production caller reaches                                        | warn     |
      | audit-bound-undeclared       | a loop declares a ceiling that is uncapped or unknown                                | error    |
      | audit-bound-off-reference    | a declared bound sits outside the range the reference records                        | warn     |
      | audit-reference-stale        | the reference was last checked longer ago than its own window allows                 | warn     |

  Scenario: a bound the audited project declares nowhere is a warning, not an error
    Given an audited project that declares no bound at all for a row the reference carries
    When the audit is run over it
    Then audit-bound-undeclared is reported at warn
    And the exit status under the strict setting is unchanged by it

  Scenario Outline: the strict setting changes the exit code and nothing else
    Given one audited project whose audit reports <findings>
    When the audit is run over it without the strict setting, and again with it
    Then both runs report the same findings, each at the same severity
    And the run without it exits <lenient>
    And the run with it exits <strict>

    Examples: one project, both settings
      | findings                       | lenient | strict   |
      | nothing at all                 | zero    | zero     |
      | warnings only                  | zero    | zero     |
      | one error and no warning       | zero    | non-zero |
      | errors and warnings together   | zero    | non-zero |

  Scenario Outline: every error-severity leg measures zero in this repository on arrival
    Given this repository as the audited project
    When the audit is run over it with the strict setting
    Then <leg> is reported zero times
    And the exit status is zero

    Examples: the error legs, and what already holds each of them at zero here
      | leg                                                                                       |
      | a duplicate hook pair, the pairs this repository carried having been deleted before now   |
      | an uncapped or unknown loop ceiling, an existing gate covering this repository's registry |
      | a capability gap in a project that would spawn the role, this one routing it inline       |

  Scenario: the lanes are clock-free, so one process gives one answer twice
    Given an audited project and a fixed instant handed to the audit
    When the audit is run twice over it in one process, with time passing between the two runs
    Then both runs report the same findings, each at the same severity
    And no finding is reported against an instant later than the one handed in
