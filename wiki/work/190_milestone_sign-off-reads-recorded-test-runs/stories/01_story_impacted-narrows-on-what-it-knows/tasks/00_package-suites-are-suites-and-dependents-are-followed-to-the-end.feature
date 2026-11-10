@executable @cli @work @validate
Feature: package suites are suites and dependents are followed to the end

  WHY. The selector cannot choose what its predicate does not call a suite. Today the predicate is
  `*.test.mjs` under `test/`, so the 265 package-owned suites are invisible to it. A change whose
  only covering suite is package-owned therefore widens to everything (41 of the 76 stories in
  RESEARCH Q1). The graph's dependents are direct importers only (RESEARCH Q2). The moment widening
  stops, a suite two imports away would be missed (ADR-003 §1, §2).
  The cases drive `selectSuites` with a planted relations port and planted suite paths. The
  transitive walk is driven against a planted `graph.json`.

  Rule: R1 · A suite the runner registers is a suite the selection can choose

    Scenario Outline: the declared roots and suffixes decide what a suite is
      Given `work.test.roots` is `["test", "packages/work/test"]` and `work.test.suiteSuffixes` is `[".test.mjs", ".suite.mjs"]`
      Then `<file>` <is> a suite

      Examples:
        | file                                          | is     |
        | test/work/lifecycle/work-test-select.test.mjs | is     |
        | packages/work/test/testing.test.mjs           | is     |
        | packages/work/test/domain.suite.mjs           | is     |
        | packages/work/src/testing/select.mjs          | is not |
        | packages/mesh/test/mesh.suite.mjs             | is not |
        | packages/work/node_modules/x/y.test.mjs       | is not |

    Scenario: an absent `suiteSuffixes` keeps today's predicate
      Given `work.test.suiteSuffixes` is not declared
      Then a file is a suite only when it ends `.test.mjs` under a declared root

    Scenario: E1 · a package-owned suite is selected beside the root suite
      Given the graph's dependents of `packages/work/src/testing/select.mjs` are `packages/work/test/testing.test.mjs` and `test/work/lifecycle/work-test-select.test.mjs`
      And both are suites by the declared predicate
      When `packages/work/src/testing/select.mjs` is the changed set
      Then the scope is `impacted`
      And both suites are selected, each with the reason `graph-dependent`

    Scenario: E2 · a suite two imports away is selected
      Given a planted graph where `item-status.mjs` imports `regression-record.mjs` and `status-gate.test.mjs` imports `item-status.mjs`
      When `regression-record.mjs` is the changed set
      Then `status-gate.test.mjs` is selected

    Scenario: a cycle in the import graph ends the walk
      Given a planted graph where `a.mjs` and `b.mjs` import each other and `a.test.mjs` imports `a.mjs`
      When `b.mjs` is the changed set
      Then `a.test.mjs` is selected and the walk returns

    Scenario: the transitive form is one read of the artifact
      Given a planted graph artifact and a counting file reader
      When `relations([three files], { projectRoot, transitive: true })` is asked
      Then the artifact is read once
      And each file's `dependents` holds every file that reaches it through import edges

    Scenario: FF-19005 · every registered suite is selectable
      When `test/arch/testing/acd-suite-registration-single-decider.test.mjs` runs
      Then it fails if a suite file the runner's registry assembles is not a suite by the declared `work.test.roots` and `work.test.suiteSuffixes`
