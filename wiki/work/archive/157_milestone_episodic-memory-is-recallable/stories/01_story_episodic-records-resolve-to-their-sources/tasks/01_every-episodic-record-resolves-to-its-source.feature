Feature: Every episodic record resolves to the exact line or JSON value it came from

  WHY. A recalled record is only evidence if it can be checked against its source. m05/ADR-005
  located a source by path and line, which cannot name a value inside pretty-printed JSON. ADR-002
  grows the source string, not the record: Markdown is "<path>:<line>", JSON is "<path>#<pointer>",
  NDJSON is "<path>:<line>#<pointer>", and a resolver that answers them refuses anything that would
  leave the work tree. FF-15701 is this task's control.

  THE FIXTURE: the 157/01 task 00 temp stream, ingested under an isolated "AOF_GLOBAL_HOME".

  Rule: R4 · A record's source resolves to the exact value it came from

    @executable @cli @work @memory
    Scenario: E10 · a run source resolves to its record's root object
      Given milestone "39" has a failed run record at "39_milestone_x/runs/node-7297/20261011T183057623Z-0000.json"
      When its run record's source is resolved
      Then the source ends "runs/node-7297/20261011T183057623Z-0000.json#"
      And the resolver answers that path with pointer "" and line null
      And the value at that pointer is the run record's root object

    @executable @cli @work @memory
    Scenario Outline: each locator form resolves to its value
      Given an episodic record of type "<type>" with source "<source>"
      When the source is resolved
      Then the resolver answers path "<path>", line "<line>" and pointer "<pointer>"

      Examples:
        | type     | source                                          | path                                     | line | pointer              |
        | finding  | 39_milestone_x/VERIFICATION.md:42               | 39_milestone_x/VERIFICATION.md           | 42   |                      |
        | feedback | 39_milestone_x/FEEDBACK.ndjson:4#               | 39_milestone_x/FEEDBACK.ndjson           | 4    | (empty)              |
        | run      | 39_milestone_x/runs/r-0001.json#                | 39_milestone_x/runs/r-0001.json          | null | (empty)              |
        | run      | 39_milestone_x/observability/s.json#/agents/2   | 39_milestone_x/observability/s.json      | null | /agents/2            |
        | run      | 39_milestone_x/runs/r-0002.json#/brief/a~1b~0c  | 39_milestone_x/runs/r-0002.json          | null | /brief/a~1b~0c       |

    @executable @cli @work @memory
    Scenario: a legacy lesson or ADR source answers exactly as before
      Given a lesson record with source "39_milestone_x/RETROSPECTIVE.md:12"
      When the source is resolved
      Then the resolver's path, line and absPath are those it answered before this change
      And it carries no pointer

    @executable @cli @work @memory
    Scenario Outline: E11 · a source that would leave the work tree is refused
      Given an episodic record with source "<source>"
      When the source is resolved
      Then it is refused and no file is opened

      Examples:
        | example | source                              |
        | E11     | ../../etc/passwd#                   |
        | E11     | C:/Windows/win.ini#                 |
        |         | /etc/hosts:1                        |
        |         | 39_milestone_x/link-out/run.json#   |

    @executable @cli @work @memory
    Scenario: E12 · a store written before this change is stale until ingest
      Given a local store and a graphify store each written at index version 2
      When "aof work memory status --json" runs
      Then each reports its index stale against version 3
      And recall over each still answers from the existing records
      And after "aof work memory ingest" each reports version 3 and fresh

    @executable @cli @work @memory
    Scenario: local and graphify index the same episodic identities
      Given the stream holds findings, raw feedback and terminal runs on items "39", "39/02" and "41"
      When ingest runs once with backend "local" and once with backend "graphify"
      Then both stores hold the same set of (item, recordType, id) for types finding, feedback and run
      And every one of those records' sources resolves

    @executable @cli @work @memory
    Scenario: ingest writes nothing to a source it reads
      Given the stream holds findings, raw feedback, run records and an observability snapshot
      When ingest runs twice
      Then every VERIFICATION.md, SESSION.md, FEEDBACK.ndjson, run record and snapshot is byte-identical to before

    @manual @cli @work @memory
    Scenario: the live stream's episodic records resolve and the retrieval eval stays green
      Given an isolated copy of the live "wiki/work" ingested with this story's build
      When every finding, feedback and run record's source is resolved
      And the m148 retrieval eval runs over the same records
      Then every source resolves, and the count of each type is recorded in VERIFICATION
      And every m148 expected pair still ranks in the first five, with its expectations unedited
      And FF-15701's red probe is recorded in VERIFICATION
