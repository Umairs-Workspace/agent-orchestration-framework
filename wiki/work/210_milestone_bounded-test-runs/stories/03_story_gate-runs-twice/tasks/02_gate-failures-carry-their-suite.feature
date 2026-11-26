@cli @work @validate
Feature: a gate record's failures carry the suite that held them

  WHY. After a red gate, the fixes are checked with `aof test --failed`, which reruns the suites
  holding the failures (ADR-004). The gate already knows each failure's suite: the sharded report
  lists every failure under its unit. The gate hands that through to the record rather than
  dropping it (ADR-002).

  Rule: R3 · A gate record's failures carry their suite

    @executable
    Scenario: E6 · a failure listed under a unit carries that unit as its file
      Given a gate run whose sharded report lists the failure "work-ui-verb-rename/00 both usage surfaces read aof work ui" under unit "test/surfaces/work-ui-verb-rename.test.mjs"
      When the gate writes its test record
      Then that failure carries file "test/surfaces/work-ui-verb-rename.test.mjs"

    @executable
    Scenario Outline: every failure is attributed as the report attributes it
      Given a gate run whose sharded report lists <failures>
      When the gate writes its test record
      Then the record's failures carry <files>

      Examples:
        | failures                                                      | files                                    |
        | 2 cases under unit "test/a.test.mjs"                          | "test/a.test.mjs" for both               |
        | 1 case under "test/a.test.mjs" and 1 under "test/b.test.mjs"  | each its own unit                        |
        | a not-finished unit "test/c.test.mjs" and no failing cases    | no failures, and the run is not-finished |

    @executable
    Scenario: a gate without a sharded report keeps its failures unattributed
      Given a serial gate run (no sharded report) with one failing case
      When the gate writes its test record
      Then the failure carries file null
