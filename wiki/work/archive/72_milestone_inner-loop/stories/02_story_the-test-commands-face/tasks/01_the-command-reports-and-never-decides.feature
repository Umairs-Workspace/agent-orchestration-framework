@executable @cli @work @validate
Feature: The test command reports, and no door reads its answer as a verdict

  This project holds that no graph output feeds a gate, a merge, a status write or a work mutation.
  A command that selects tests from the graph is the first thing that looks like a breach, so the
  distinction has to be exact rather than reassuring: a gate DECIDES A TRANSITION; this command decides
  nothing. It runs a subset and says which subset it ran.

  Stated as a convention that lasts until someone finds it convenient, that is worth nothing. So it is
  held two ways. Every result carries a flag saying whether it may stand as a verdict, and it may only
  when the whole suite ran and nothing widened — the one case where the subset is not a subset. And
  the doors themselves are censused: no status, accept, merge, loop or audit path names this command
  at all, so a future author who wants to consume it has to add the edge in a file the control watches.

  The second hazard is quieter and has a measured precedent. aof must not import project test code,
  because importing it EXECUTES it — 880 modules in this repo. A command whose whole subject is test
  files is one convenience import away from doing exactly that, and the import that does it will look
  reasonable. The check must run in a FRESH process per module, because every in-suite probe reaches
  these modules through a warmed cache and would see nothing at all.

  The third is the launch shape. A command that declares a session launch is a command that hands a
  terminal to something; this one runs a bounded child and returns. That is read from the registered
  command rather than from source text, because what the registry says is what the runtime does.

  ADR-001 §4, ADR-002 §4. FF-7204.

  Scenario Outline: only an unwidened whole-suite run may stand as a verdict
    Given a run whose scope was <asked for>, which ran as <ran as>, in which <widening>
    When the result is read
    Then it reports that it <verdict> stand as a verdict

    Examples: the one combination that may, driven against the ones that may not
      | asked for | ran as   | widening                                   | verdict |
      | all       | all      | nothing widened                            | may     |
      | impacted  | impacted | nothing widened                            | may not |
      | impacted  | all      | one changed file the graph does not cover  | may not |
      | impacted  | all      | there was no graph artifact at all         | may not |
      | file      | file     | nothing widened                            | may not |

  Scenario Outline: no transition door invokes the test command
    Given <door>
    When it is read for the test command's id in an invocation, a route or a ladder
    Then none is found

    Examples: the doors where a selection must never be readable as a verdict
      | door                         |
      | src/commands/item-status.mjs |
      | src/work-doctor.mjs          |
      | src/work-loop.mjs            |
      | src/work-audit/**            |
      | src/bundle/**                |

  Scenario: a planted invocation in one of those doors is named
    Given a door module carrying an invocation of the test command, planted
    When the doors are read again
    Then that module is named and the census refuses

  Scenario Outline: no test module enters the aof process
    Given a fresh process that imports <module> and nothing else
    When every module specifier that process resolves is recorded
    Then no recorded specifier lies under a declared test root

    Examples: one fresh process per module the command reaches
      | module                        |
      | src/commands/test.mjs         |
      | src/command-core.mjs          |
      | src/work-toolchain.mjs        |
      | src/work-test-select.mjs      |
      | src/work-audit/spawn.mjs      |
      | src/work-audit/census.mjs     |
      | src/graph-normalize.mjs       |
      | src/commands/graph-impact.mjs |

  Scenario: the fresh process is the assertion, because an in-suite probe cannot see this
    Given a module that does import a test module
    When it is probed from inside the suite, where it is already cached
    And it is probed again alone in a fresh process
    Then the in-suite probe reports nothing
    And the fresh process reports the test module it loaded

  Scenario Outline: a session launch is read from the registry, never from source text
    Given the registered command <command>
    When its declaration is read
    Then it <declares> a session launch

    Examples: the test command, against one that does launch
      | command | declares    |
      | test    | declares no |
      | mesh:ui | declares a  |
