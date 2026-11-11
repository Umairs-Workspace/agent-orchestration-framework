Feature: aof memory answers every memory verb, and aof work memory answers the same bytes

  WHY. Memory sits under `work` because the work stream was its only corpus in milestone 05. Its
  config is already a top-level `memory` object (05/ADR-002), so its face moves to `aof memory`.
  Prompts paste `recall --block` output and hooks read `recall --json` as an array, so the old path
  must keep answering exactly as it does while the prompts move over (178/ADR-001).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME" with `memory.backend: local` and
  a work stream holding milestone "39" with one ARCHITECTURE.md ADR titled "pin line endings" and one
  RETROSPECTIVE.md near-miss lesson, ingested once before each scenario unless the scenario says
  otherwise. "both doors" means running the same argv after `aof memory` and after
  `aof work memory`, and comparing stdout, stderr and exit code.

  Rule: R1 · aof memory answers every memory verb through the one implementation

    @executable @cli @work @memory
    Scenario: E1 · the canonical door renders the recall block
      When "aof memory recall \"pin line endings\" --block" runs
      Then it exits 0
      And stdout holds one block line per recalled record, the ADR among them, each ending in its source

    @executable @cli @work @memory
    Scenario: E2 · status answers on a project with memory absent
      Given a project whose config declares no "memory" object
      When "aof memory status --json" runs
      Then it exits 0
      And stdout is the "none" backend's status document

    @executable @cli @work @memory
    Scenario: E3 · an empty recall block prints nothing at all
      When "aof memory recall \"no-such-term-xyzzy\" --kind no-such-kind --block" runs
      Then it exits 0
      And stdout is zero bytes

    @executable @cli @work @memory
    Scenario Outline: every verb is routed under aof memory
      When "aof memory <argv>" runs
      Then it exits <exit>
      And it is answered by the registered command at route "memory", never by the CLI ladder

      Examples:
        | argv                                      | exit |
        | recall "pin line endings" --json          | 0    |
        | ingest                                    | 0    |
        | reindex 39                                | 0    |
        | status --json                             | 0    |
        | recurrence "line endings drift" --json    | 0    |
        | record-recall 39 --input obs.json --json  | 0    |
        | help                                      | 1    |

  Rule: R2 · aof work memory answers byte for byte what aof memory answers

    @executable @cli @work @memory
    Scenario Outline: E4 · both doors print the same bytes for every verb and projection
      When "<argv>" runs through both doors
      Then the two stdouts are byte-identical
      And the two stderrs are byte-identical
      And the two exit codes are equal

      Examples:
        | example | argv                                        |
        | E4      | recall "seam" --json                        |
        |         | recall "pin line endings" --kind near-miss --block |
        |         | recall "pin line endings" --item 39 --limit 1 |
        |         | recall "no-such-term-xyzzy" --block         |
        |         | status                                      |
        |         | status --json --lessons                     |
        |         | reindex 39                                  |
        |         | recurrence "line endings drift" --json      |
        |         | -h                                          |

    @executable @cli @work @memory
    Scenario: an undeclared flag is refused alike through both doors, each naming its own command
      When "--undeclared-flag" runs through both doors
      Then both exit 1
      And the two stdouts are byte-identical
      And the two stderrs are byte-identical once the refused command's name is set aside
      And "aof memory" refuses it "for memory" and "aof work memory" refuses it "for work:memory"

    @executable @cli @work @memory
    Scenario: E5 · a replayed record-recall is idempotent across the two doors
      Given "obs.json" holds a completed recall observation with id "6f1c…" for item "39"
      When "aof memory record-recall 39 --input obs.json --json" runs
      And "aof work memory record-recall 39 --input obs.json --json" runs
      Then the second answer carries "replayed: true"
      And milestone 39's FEEDBACK.ndjson holds exactly one recall row with that id

    @executable @cli @work @memory
    Scenario: E6 · the alias prints nothing extra
      When "aof work memory status" runs
      Then stderr is empty
      And stdout holds no line mentioning "deprecated", "alias" or "aof memory"
