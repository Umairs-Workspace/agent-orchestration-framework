Feature: Findings, raw feedback and terminal runs become episodic memory records on both backends

  WHY. Every run writes run records, raw feedback and verification findings, and none of them is a
  memory record, so an attempt cannot recall its predecessor and a triage cannot see the stream's
  history (157 SPEC). ADR-001 compiles the three types from the sources that already exist, in the
  walk both backends share, and writes nothing to those sources.

  THE FIXTURE: a temp work stream under an isolated "AOF_GLOBAL_HOME", ingested with
  "aof work memory ingest". Each scenario names the sources it adds to it.

  Rule: R1 · A declared finding becomes exactly one finding record

    @executable @cli @work @memory
    Scenario: E1 · a finding declared as a row and as a heading is one record
      Given milestone "39" has a VERIFICATION.md Findings register holding the row "| F-03 | major | open | the cap is read from a stale config |"
      And the same register holds a heading "### F-03 · the cap is read from a stale config" with an evidence paragraph
      When "aof work memory recall \"\" --item 39 --kind finding --json" runs after ingest
      Then exactly one record has id "F-03"
      And its recordType and kind are both "finding" and its area is "delivery"
      And its source cites the table row's line
      And its text holds the row's severity and status and the heading's evidence paragraph

    @executable @cli @work @memory
    Scenario: E2 · a citation outside the register and an id inside a fence create nothing
      Given milestone "39" has a VERIFICATION.md whose prose outside the Findings register cites "F-03"
      And its Findings register holds "F-04" only inside a fenced code block
      When ingest runs
      Then no finding record exists for "F-03" or "F-04" on item "39"

    @executable @cli @work @memory
    Scenario: E3 · the same finding id on two items is two records
      Given story "39/02" declares finding "F-01" in its VERIFICATION.md Findings register
      And milestone "41" declares finding "F-01" in its SESSION.md Findings register
      When ingest runs
      Then two finding records with id "F-01" exist, one with item "39/02" and one with item "41"

    @executable @cli @work @memory
    Scenario Outline: a finding's stage and status come only from what its source declares
      Given milestone "39" declares finding "F-05" in "<file>" with Stage "<declared stage>" and status "<declared status>"
      When ingest runs
      Then the record for "F-05" has stage "<stage>" and status "<status>"

      Examples:
        | file            | declared stage | declared status | stage  | status |
        | VERIFICATION.md | continue       | fixed           | build  | fixed  |
        | VERIFICATION.md |                | open            | verify | open   |
        | SESSION.md      | refine         |                 | refine |        |

  Rule: R2 · Only raw feedback becomes a feedback record

    @executable @cli @work @memory
    Scenario: E4 · classification and recall rows are not feedback records
      Given milestone "39" has a FEEDBACK.ndjson holding 2 raw rows, 1 classification row and 3 recall rows
      When ingest runs
      Then item "39" has exactly 2 feedback records
      And each holds its raw row's text verbatim and its actor as owner
      And each has an empty stage and an empty status

    @executable @cli @work @memory
    Scenario: E5 · a raw row keeps its physical line number
      Given milestone "39" has a FEEDBACK.ndjson whose line 3 is blank and whose line 4 is a raw row
      When ingest runs
      Then that row's feedback record has a source ending "FEEDBACK.ndjson:4#"

    @executable @cli @work @memory
    Scenario: a malformed ledger line is diagnosed, never turned into a record
      Given milestone "39" has a FEEDBACK.ndjson whose line 2 is not JSON
      When ingest runs
      Then the feedback reader's existing diagnostic for line 2 is reported
      And no feedback record cites line 2

  Rule: R3 · Only a terminal run becomes a run record, carrying its stalls when known

    @executable @cli @work @memory
    Scenario Outline: E6 · a run becomes a record only in a terminal state
      Given milestone "39" has a run record in state "<state>"
      When ingest runs
      Then item "39" has <records> run record(s)

      Examples:
        | example | state     | records |
        | E6      | done      | 1       |
        | E6      | failed    | 1       |
        | E6      | cancelled | 1       |
        | E6      | running   | 0       |
        | E6      | queued    | 0       |
        |         | parked    | 0       |

    @executable @cli @work @memory
    Scenario: E7 · a failed continue run shows its phase as build and its failure reason
      Given story "39/02" has a failed run, attempt 2, retryOf its attempt-1 run, phase "continue" and failureReason "cap-exhausted"
      When ingest runs
      Then its run record has stage "build" and status "failed"
      And its summary holds "cap-exhausted"
      And its text holds its attempt and its retryOf run id

    @executable @cli @work @memory
    Scenario Outline: a run's stage follows its loop phase
      Given milestone "39" has a done run whose loop phase is "<phase>"
      When ingest runs
      Then its run record has stage "<stage>"

      Examples:
        | phase    | stage    |
        | continue | build    |
        | refine   | refine   |
        | verify   | verify   |
        |          |          |

    @executable @cli @work @memory
    Scenario: E8 · a run with no matching observability agent has its stalls unavailable
      Given milestone "39" has a failed run for session "s-1"
      And the milestone's latest observability snapshot has no agent with sessionId "s-1" attributed to "39"
      When ingest runs
      Then the run record's text reports stalls unavailable
      And it never reports zero stalls

    @executable @cli @work @memory
    Scenario: E9 · a matched agent with no stalls is a known zero
      Given milestone "39" has a done run for session "s-2"
      And the latest snapshot's agent with sessionId "s-2" attributed to "39" has an empty stalls array
      When ingest runs
      Then the run record's text reports zero stalls

    @executable @cli @work @memory
    Scenario: a stall from another item's agent in the same session is never borrowed
      Given story "39/02" has a done run for session "s-3"
      And the parent milestone snapshot's agent with sessionId "s-3" is attributed to "39/01" and records 2 stalls
      When ingest runs
      Then the run record for "39/02" reports stalls unavailable

