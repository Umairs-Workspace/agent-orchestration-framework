Feature: Every work record carries its item's origin, resolved to planning documents that exist

  WHY. Recall searches the work stream, and the operator chose to reach the planning documents
  through the `origin:` links the stream already carries rather than index them (STATE,
  2026-10-29). A link means something only once it is resolved: a doc-relative value is meaningless
  detached from its doc, and a path that names nothing would send an agent to a missing file
  (178/ADR-002). Archiving moved 43 linking folders one level down after their links were written,
  so an archived item also resolves from where it stood (ratified in this contract).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME" whose "wiki/planning/" holds
  "PRD-memory-engine.md", "PRD-acd-loop-engineering.md", "PRD-graph-engineering.md",
  "PRD-web-ui-restructure.md", "PRD-acd-loop-performance.md" and
  "research/RESEARCH-agent-memory-procedure.md", and whose "wiki/work/TECH_DEBT.md"
  exists. Each scenario adds the items it names, then runs "aof memory ingest" on the backend in
  the outline, or on both backends when none is named.

  Rule: R1 · A work record carries its item's declared origin, resolved to a project-root path, from where an archived item stood before archiving

    @executable @cli @work @memory
    Scenario Outline: E1 · a root-relative origin is carried as declared
      Given milestone "178" whose SPEC declares "origin: wiki/planning/PRD-memory-engine.md" and whose ARCHITECTURE.md holds ADR-001
      When "aof memory ingest" runs on the "<backend>" backend
      Then the record for ADR-001 on item "178" carries origin ["wiki/planning/PRD-memory-engine.md"]

      Examples:
        | example | backend  |
        | E1      | local    |
        | E1      | graphify |

    @executable @cli @work @memory
    Scenario: E2 · a doc-relative flow list resolves in declared order
      Given milestone "62" at "wiki/work/62_milestone_self-improvement-loop/" whose SPEC declares "origin: [../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]"
      And its RETROSPECTIVE.md holds lesson R1
      When ingest runs
      Then the record for R1 carries origin ["wiki/planning/PRD-acd-loop-engineering.md", "wiki/planning/PRD-graph-engineering.md"]

    @executable @cli @work @memory
    Scenario: E3 · a story with no origin inherits its milestone's
      Given milestone "153" whose SPEC declares "origin: wiki/planning/research/RESEARCH-agent-memory-procedure.md"
      And story "153/01" whose STORY.md declares no origin and whose RETROSPECTIVE.md holds lesson R1
      When ingest runs
      Then the record for R1 on item "153/01" carries origin ["wiki/planning/research/RESEARCH-agent-memory-procedure.md"]

    @executable @cli @work @memory
    Scenario: a story with its own origin keeps its own
      Given milestone "153" whose SPEC declares "origin: wiki/planning/PRD-memory-engine.md"
      And story "153/02" whose STORY.md declares "origin: wiki/planning/PRD-graph-engineering.md" and whose RETROSPECTIVE.md holds lesson R1
      When ingest runs
      Then the record for R1 on item "153/02" carries origin ["wiki/planning/PRD-graph-engineering.md"]

    @executable @cli @work @memory
    Scenario: E4 · records from outside the work stream carry an empty origin
      Given the import store holds one imported digest
      And "memory.sources" enables operator auto-memory holding one memory file
      When ingest runs over the whole stream
      Then the imported summary record carries origin []
      And the auto-memory record carries origin []

    @executable @cli @work @memory
    Scenario Outline: every record type from an item carries the item's origin
      Given milestone "178" whose SPEC declares "origin: wiki/planning/PRD-memory-engine.md" and which has a "<file>" yielding a "<recordType>" record
      When ingest runs
      Then every "<recordType>" record on item "178" carries origin ["wiki/planning/PRD-memory-engine.md"]

      Examples:
        | file             | recordType |
        | RETROSPECTIVE.md | lesson     |
        | ARCHITECTURE.md  | adr        |
        | AOF.md           | summary    |
        | OUTCOME.md       | capability |
        | VERIFICATION.md  | finding    |
        | FEEDBACK.ndjson  | feedback   |

    @executable @cli @work @memory
    Scenario Outline: E5 · an archived milestone's link resolves from its pre-archive folder
      Given archived milestone "<ref>" at "wiki/work/archive/<folder>/" whose SPEC declares "origin: <declared>"
      And its ARCHITECTURE.md holds ADR-001
      When ingest runs
      Then the record for ADR-001 on item "<ref>" carries origin ["<resolved>"]

      Examples:
        | example | ref | folder                                 | declared                                    | resolved                                  |
        | E5      | 48  | 48_milestone_fleet-session-identity    | ../../planning/PRD-web-ui-restructure.md    | wiki/planning/PRD-web-ui-restructure.md   |
        | E6      | 119 | 119_milestone_the-tree-gets-an-interior | [../TECH_DEBT.md]                          | wiki/work/TECH_DEBT.md                    |
        |         | 50  | 50_milestone_session-launcher          | wiki/planning/PRD-web-ui-restructure.md     | wiki/planning/PRD-web-ui-restructure.md   |

    @executable @cli @work @memory
    Scenario: a candidate is tried in order and the first existing file wins
      Given "wiki/work/planning/PRD-web-ui-restructure.md" also exists
      And archived milestone "48" at "wiki/work/archive/48_milestone_fleet-session-identity/" declares "origin: ../../planning/PRD-web-ui-restructure.md"
      When ingest runs
      Then its records carry origin ["wiki/work/planning/PRD-web-ui-restructure.md"], the doc-relative candidate
      And not "wiki/planning/PRD-web-ui-restructure.md", the pre-archive candidate tried after it

  Rule: R2 · A value that names no existing file is dropped and counted, never cited

    @executable @cli @work @memory
    Scenario: E7 · a moved file is dropped and its sibling kept
      Given archived milestone "72" at "wiki/work/archive/72_milestone_inner-loop/" whose SPEC declares "origin: [../../planning/PRD-acd-loop-performance.md, ../../planning/RESEARCH-agent-loop-economics.md]"
      And no "RESEARCH-agent-loop-economics.md" exists under "wiki/planning/"
      When ingest runs
      Then 72's records carry origin ["wiki/planning/PRD-acd-loop-performance.md"]
      And "aof memory status --json" reports "origin.unresolved" as 1

    @executable @cli @work @memory
    Scenario Outline: E8 · a value outside the project root is dropped and never read
      Given milestone "178" whose SPEC declares "origin: <declared>"
      When ingest runs
      Then 178's records carry origin []
      And "aof memory status --json" reports "origin.unresolved" as 1

      Examples:
        | example | declared                  |
        | E8      | ../../../../etc/hosts     |
        | E8      | /etc/hosts                |
        |         | wiki/planning             |

    @executable @cli @work @memory
    Scenario: status reports the unresolved count without breaking its sum
      Given two items, each declaring one value that names no file
      When "aof memory status --json" runs on each backend after ingest
      Then each reports "origin": { "unresolved": 2 }
      And the top-level type counts still sum to "recordCount"

    @executable @cli @work @memory
    Scenario: E9 · over the live stream every carried path exists
      Given an isolated copy of this repository's "wiki/" tree
      When ingest runs over it
      Then every record's origin is an array
      And every path in every origin is project-root-relative, forward-slashed, and names an existing file inside the project root
      And "aof memory status --json" reports "origin.unresolved" equal to an independent count of the declared values that name no file (6 on 2026-10-29)
      And this is FF-17803, whose red probe is a resolver that keeps an unresolved value
