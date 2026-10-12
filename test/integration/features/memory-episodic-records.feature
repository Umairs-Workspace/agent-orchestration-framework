Feature: Episodic memory records — findings, raw feedback and terminal runs resolve to their sources
  157/01 binds its two task features (00_findings-feedback-and-terminal-runs-become-records,
  01_every-episodic-record-resolves-to-its-source) to the REAL CLI. Each scenario writes the
  sources it names into a temp stream under an isolated AOF_GLOBAL_HOME, runs
  `aof work memory ingest`, and reads what the backend wrote. The task's Scenario Outlines are
  expanded here one row per scenario, because this runner has no Examples support. The @manual
  live-corpus scenario is the verifier's: its counts and FF-15701's red probe land in the
  milestone VERIFICATION. 157/02's two task features (the episodic layer in status, `--all` and the
  block line on recall, and the lesson-only consumers left untouched) are bound below them.

  Rule: R1 · A declared finding becomes exactly one finding record

  Scenario: E1 · a finding declared as a row and as a heading is one record
    Given milestone "39" has a VERIFICATION.md Findings register holding the row "| F-03 | major | open | the cap is read from a stale config |"
    And the same register holds a heading "### F-03 · the cap is read from a stale config" with an evidence paragraph
    When "aof work memory recall \"\" --item 39 --kind finding --json" runs after ingest
    Then exactly one record has id "F-03"
    And its recordType and kind are both "finding" and its area is "delivery"
    And its source cites the table row's line
    And its text holds the row's severity and status and the heading's evidence paragraph

  Scenario: E2 · a citation outside the register and an id inside a fence create nothing
    Given milestone "39" has a VERIFICATION.md whose prose outside the Findings register cites "F-03"
    And its Findings register holds "F-04" only inside a fenced code block
    When ingest runs
    Then no finding record exists for "F-03" or "F-04" on item "39"

  Scenario: E3 · the same finding id on two items is two records
    Given story "39/02" declares finding "F-01" in its VERIFICATION.md Findings register
    And milestone "41" declares finding "F-01" in its SESSION.md Findings register
    When ingest runs
    Then two finding records with id "F-01" exist, one with item "39/02" and one with item "41"

  Scenario: a finding's stage and status come only from what its source declares · VERIFICATION.md continue fixed
    Given milestone "39" declares finding "F-05" in "VERIFICATION.md" with Stage "continue" and status "fixed"
    When ingest runs
    Then the record for "F-05" has stage "build" and status "fixed"

  Scenario: a finding's stage and status come only from what its source declares · VERIFICATION.md no stage open
    Given milestone "39" declares finding "F-05" in "VERIFICATION.md" with Stage "" and status "open"
    When ingest runs
    Then the record for "F-05" has stage "verify" and status "open"

  Scenario: a finding's stage and status come only from what its source declares · SESSION.md refine no status
    Given milestone "39" declares finding "F-05" in "SESSION.md" with Stage "refine" and status ""
    When ingest runs
    Then the record for "F-05" has stage "refine" and status ""

  Rule: R2 · Only raw feedback becomes a feedback record

  Scenario: E4 · classification and recall rows are not feedback records
    Given milestone "39" has a FEEDBACK.ndjson holding 2 raw rows, 1 classification row and 3 recall rows
    When ingest runs
    Then item "39" has exactly 2 feedback records
    And each holds its raw row's text verbatim and its actor as owner
    And each has an empty stage and an empty status

  Scenario: E5 · a raw row keeps its physical line number
    Given milestone "39" has a FEEDBACK.ndjson whose line 3 is blank and whose line 4 is a raw row
    When ingest runs
    Then that row's feedback record has a source ending "FEEDBACK.ndjson:4#"

  Scenario: a malformed ledger line is diagnosed, never turned into a record
    Given milestone "39" has a FEEDBACK.ndjson whose line 2 is not JSON
    When ingest runs
    Then the feedback reader's existing diagnostic for line 2 is reported
    And no feedback record cites line 2

  Rule: R3 · Only a terminal run becomes a run record, carrying its stalls when known

  Scenario: E6 · a run becomes a record only in a terminal state · done
    Given milestone "39" has a run record in state "done"
    When ingest runs
    Then item "39" has 1 run record(s)

  Scenario: E6 · a run becomes a record only in a terminal state · failed
    Given milestone "39" has a run record in state "failed"
    When ingest runs
    Then item "39" has 1 run record(s)

  Scenario: E6 · a run becomes a record only in a terminal state · cancelled
    Given milestone "39" has a run record in state "cancelled"
    When ingest runs
    Then item "39" has 1 run record(s)

  Scenario: E6 · a run becomes a record only in a terminal state · running
    Given milestone "39" has a run record in state "running"
    When ingest runs
    Then item "39" has 0 run record(s)

  Scenario: E6 · a run becomes a record only in a terminal state · queued
    Given milestone "39" has a run record in state "queued"
    When ingest runs
    Then item "39" has 0 run record(s)

  Scenario: E6 · a run becomes a record only in a terminal state · parked
    Given milestone "39" has a run record in state "parked"
    When ingest runs
    Then item "39" has 0 run record(s)

  Scenario: E7 · a failed continue run shows its phase as build and its failure reason
    Given story "39/02" has a failed run, attempt 2, retryOf its attempt-1 run, phase "continue" and failureReason "cap-exhausted"
    When ingest runs
    Then its run record has stage "build" and status "failed"
    And its summary holds "cap-exhausted"
    And its text holds its attempt and its retryOf run id

  Scenario: a run's stage follows its loop phase · continue
    Given milestone "39" has a done run whose loop phase is "continue"
    When ingest runs
    Then its run record has stage "build"

  Scenario: a run's stage follows its loop phase · refine
    Given milestone "39" has a done run whose loop phase is "refine"
    When ingest runs
    Then its run record has stage "refine"

  Scenario: a run's stage follows its loop phase · verify
    Given milestone "39" has a done run whose loop phase is "verify"
    When ingest runs
    Then its run record has stage "verify"

  Scenario: a run's stage follows its loop phase · no phase
    Given milestone "39" has a done run whose loop phase is ""
    When ingest runs
    Then its run record has stage ""

  Scenario: E8 · a run with no matching observability agent has its stalls unavailable
    Given milestone "39" has a failed run for session "s-1"
    And the milestone's latest observability snapshot has no agent with sessionId "s-1" attributed to "39"
    When ingest runs
    Then the run record's text reports stalls unavailable
    And it never reports zero stalls

  Scenario: E9 · a matched agent with no stalls is a known zero
    Given milestone "39" has a done run for session "s-2"
    And the latest snapshot's agent with sessionId "s-2" attributed to "39" has an empty stalls array
    When ingest runs
    Then the run record's text reports zero stalls

  Scenario: a stall from another item's agent in the same session is never borrowed
    Given story "39/02" has a done run for session "s-3"
    And the parent milestone snapshot's agent with sessionId "s-3" is attributed to "39/01" and records 2 stalls
    When ingest runs
    Then the run record for "39/02" reports stalls unavailable

  Rule: R4 · A record's source resolves to the exact value it came from

  Scenario: E10 · a run source resolves to its record's root object
    Given milestone "39" has a failed run record at "39_milestone_x/runs/node-7297/20261011T183057623Z-0000.json"
    When its run record's source is resolved
    Then the source ends "runs/node-7297/20261011T183057623Z-0000.json#"
    And the resolver answers that path with pointer "" and line null
    And the value at that pointer is the run record's root object

  Scenario: each locator form resolves to its value · finding
    Given an episodic record of type "finding" with source "39_milestone_x/VERIFICATION.md:42"
    When the source is resolved
    Then the resolver answers path "39_milestone_x/VERIFICATION.md", line "42" and pointer ""

  Scenario: each locator form resolves to its value · feedback
    Given an episodic record of type "feedback" with source "39_milestone_x/FEEDBACK.ndjson:4#"
    When the source is resolved
    Then the resolver answers path "39_milestone_x/FEEDBACK.ndjson", line "4" and pointer "(empty)"

  Scenario: each locator form resolves to its value · run root
    Given an episodic record of type "run" with source "39_milestone_x/runs/r-0001.json#"
    When the source is resolved
    Then the resolver answers path "39_milestone_x/runs/r-0001.json", line "null" and pointer "(empty)"

  Scenario: each locator form resolves to its value · snapshot agent
    Given an episodic record of type "run" with source "39_milestone_x/observability/s.json#/agents/2"
    When the source is resolved
    Then the resolver answers path "39_milestone_x/observability/s.json", line "null" and pointer "/agents/2"

  Scenario: each locator form resolves to its value · escaped pointer
    Given an episodic record of type "run" with source "39_milestone_x/runs/r-0002.json#/brief/a~1b~0c"
    When the source is resolved
    Then the resolver answers path "39_milestone_x/runs/r-0002.json", line "null" and pointer "/brief/a~1b~0c"

  Scenario: a legacy lesson or ADR source answers exactly as before
    Given a lesson record with source "39_milestone_x/RETROSPECTIVE.md:12"
    When the source is resolved
    Then the resolver's path, line and absPath are those it answered before this change
    And it carries no pointer

  Scenario: E11 · a source that would leave the work tree is refused · traversal
    Given an episodic record with source "../../etc/passwd#"
    When the source is resolved
    Then it is refused and no file is opened

  Scenario: E11 · a source that would leave the work tree is refused · drive path
    Given an episodic record with source "C:/Windows/win.ini#"
    When the source is resolved
    Then it is refused and no file is opened

  Scenario: E11 · a source that would leave the work tree is refused · rooted Markdown path
    Given an episodic record with source "/etc/hosts:1"
    When the source is resolved
    Then it is refused and no file is opened

  Scenario: E11 · a source that would leave the work tree is refused · link out of the tree
    Given an episodic record with source "39_milestone_x/link-out/run.json#"
    When the source is resolved
    Then it is refused and no file is opened

  Scenario: E12 · a store written before this change is stale until ingest
    Given a local store and a graphify store each written at index version 2
    When "aof work memory status --json" runs
    Then each reports its index stale against version 3
    And recall over each still answers from the existing records
    And after "aof work memory ingest" each reports version 3 and fresh

  Scenario: local and graphify index the same episodic identities
    Given the stream holds findings, raw feedback and terminal runs on items "39", "39/02" and "41"
    When ingest runs once with backend "local" and once with backend "graphify"
    Then both stores hold the same set of (item, recordType, id) for types finding, feedback and run
    And every one of those records' sources resolves

  Scenario: ingest writes nothing to a source it reads
    Given the stream holds findings, raw feedback, run records and an observability snapshot
    When ingest runs twice
    Then every VERIFICATION.md, SESSION.md, FEEDBACK.ndjson, run record and snapshot is byte-identical to before

  # ── 157/02 · every consumer accounts for the episodic pool ─────────────────────────────────────
  # Tasks 00_status-counts-the-episodic-layer and 01_recall-returns-and-renders-episodic-records,
  # bound here rather than on work-memory.feature, which story 128 pins at its three rows. The task
  # fixture is milestone "39" holding 2 architecture lessons, 3 findings, 2 raw feedback rows and 3
  # terminal runs (one failed with "cap-exhausted"); task 01 adds 4 findings.

  Rule: R1 · Status counts every episodic record once, under the episodic layer

  Scenario: E1 · the three types are counted as episodic and every count sums
    Given the 157/02 status fixture is ingested
    When "aof work memory status --json" runs over the ingested store
    Then its "types" holds finding 3, feedback 2 and run 3, each with layer "episodic"
    And its "layers" is {"episodic": 8, "semantic": 0, "procedural": 2}
    And no type is reported with layer "unmapped"
    And its legacy counters "findings", "feedback" and "runs" read 3, 2 and 3
    And its legacy counters sum to its "recordCount" of 10

  Scenario: E2 · local and graphify report the same partition
    Given the 157/02 status fixture
    When "aof work memory status --json" runs once with backend "local" and once with backend "graphify", each after its own ingest
    Then both carry the same "types" and the same "layers"
    And graphify's legacy "lessons" and "adrs" still read 2 and 0

  Scenario: a scope filter selects episodic records by its existing meaning · --kind finding
    Given the 157/02 status fixture is ingested
    When "aof work memory recall \"\" --kind finding --all --json" runs
    Then it returns 3 records

  Scenario: a scope filter selects episodic records by its existing meaning · --kind feedback
    Given the 157/02 status fixture is ingested
    When "aof work memory recall \"\" --kind feedback --all --json" runs
    Then it returns 2 records

  Scenario: a scope filter selects episodic records by its existing meaning · --kind run
    Given the 157/02 status fixture is ingested
    When "aof work memory recall \"\" --kind run --all --json" runs
    Then it returns 3 records

  Scenario: a scope filter selects episodic records by its existing meaning · --area delivery
    Given the 157/02 status fixture is ingested
    When "aof work memory recall \"\" --area delivery --all --json" runs
    Then it returns 8 records

  Scenario: a scope filter selects episodic records by its existing meaning · --item 39 --area delivery
    Given the 157/02 status fixture is ingested
    When "aof work memory recall \"\" --item 39 --area delivery --all --json" runs
    Then it returns 8 records

  Scenario: a scope filter selects episodic records by its existing meaning · --item 41 --area delivery
    Given the 157/02 status fixture is ingested
    When "aof work memory recall \"\" --item 41 --area delivery --all --json" runs
    Then it returns 0 records

  Scenario: the none backend still reports an empty partition
    Given the 157/02 status fixture
    When "aof work memory status --json" runs with backend "none"
    Then its "types" is {} and every "layers" count is 0

  Rule: R2 · A recall returns an item's whole episodic history when asked

  Scenario: E3 · --all returns every scoped record
    Given the 157/02 recall fixture is ingested
    When "aof work memory recall \"\" --item 39 --area delivery --all --json" runs
    Then it returns 12 records
    And each carries the frozen record fields plus "score"

  Scenario: E4 · without --all the limit still applies · no flag
    Given the 157/02 recall fixture is ingested
    When "aof work memory recall \"\" --item 39 --area delivery --json" runs
    Then it returns 5 records

  Scenario: E4 · without --all the limit still applies · --limit 3
    Given the 157/02 recall fixture is ingested
    When "aof work memory recall \"\" --item 39 --area delivery --limit 3 --json" runs
    Then it returns 3 records

  Scenario: E4 · without --all the limit still applies · --limit 3 --all
    Given the 157/02 recall fixture is ingested
    When "aof work memory recall \"\" --item 39 --area delivery --limit 3 --all --json" runs
    Then it returns 12 records

  Scenario: E5 · a failed run's block line shows its failure reason
    Given the 157/02 recall fixture is ingested
    When "aof work memory recall \"cap-exhausted\" --item 39 --kind run --block" runs
    Then the run's line holds "cap-exhausted", its kind, its area and its tags
    And the line's last field is its source

  Scenario: an ingest with --all still rebuilds the whole stream
    Given the 157/02 recall fixture is ingested
    When "aof work memory ingest --all" runs
    Then the whole stream is rebuilt exactly as before this change

  Rule: R3 · Indexing episodes changes no lesson-only consumer

  Scenario: E6 · tune counts each lesson once over an ingested stream
    Given the 157/02 status fixture
    And the stream's tune corpus is assembled with no memory index
    When the memory index is ingested with 3 findings, 2 feedback and 3 runs and the corpus is assembled again
    Then its lesson population, lineage counts and recall accounting are equal to the first assembly

  Scenario: E7 · a lesson's block line is unchanged
    Given the 157/02 status fixture is ingested
    And a lesson "R2" on milestone "39" and its block line rendered before this change
    When "aof work memory recall \"<the lesson's title>\" --item 39 --block" runs
    Then the lesson's line is byte-identical to the line rendered before

  Scenario: lesson recurrence never matches an episodic record
    Given the 157/02 status fixture
    And a finding on milestone "41" whose text repeats lesson "39/R2" word for word
    When "aof work memory recurrence \"<that text>\" --json" runs
    Then it matches "39/R2" and no finding record
