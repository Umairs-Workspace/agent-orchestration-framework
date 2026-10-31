Feature: Config inspection, project doctor and memory status print the new paths, and no other command's output changes

  WHY. An operator learns the new shape from what aof prints. The places that describe configuration
  name the new keys, and they flag an old key with its replacement. The commands that scripts and
  hooks parse ("recall", "ingest", "--block", the graph verbs) print exactly what they print today
  (180/ADR-001, ADR-005).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME" with a work stream holding one ADR,
  and the config each scenario names. The "legacy config" is
  {"name":"p","resources":[],"memory":{"backend":"local","sources":["claude-auto-memory"]},"graph":{"share":"off"}}
  and its "new-shape twin" is
  {"name":"p","resources":[],"memory":{"backend":"local","corpora":["work","imports","code","operator"],"graph":{"share":"off"}}}.

  Rule: R4 · The faces print the new paths, and no other command's output changes

    @executable @cli @adapter @memory
    Scenario: config inspection reports the node at its new paths
      Given the new-shape twin
      When the config is inspected
      Then the memory block reports corpora "work", "imports", "code" and "operator" with source "project setting"
      And its paths name "memory.backend", "memory.corpora", "memory.graph" and "memory.backends.graphify.extractionBackend"
      And its legacy list is empty

    @executable @cli @adapter @memory
    Scenario: E14 · project doctor warns of each old key and still calls the config valid
      Given the legacy config
      When "aof project doctor --json" runs
      Then the diagnostics hold a "warning" with code "memory-config-legacy" at path "memory.sources" naming "memory.corpora"
      And the diagnostics hold a "warning" with code "memory-config-legacy" at path "graph.share" naming "memory.graph.share"
      And each of those messages says "aof work update" rewrites the key
      And the "config-valid" check is "ok"

    @executable @cli @adapter @memory
    Scenario: a conflict is an error in config inspection
      Given the config {"name":"p","resources":[],"graph":{"share":"off"},"memory":{"graph":{"share":"off"}}}
      When the config is inspected
      Then the diagnostics hold an "error" with code "memory-config-conflict"
      And the "config-valid" check is "error"

    @executable @cli @adapter @memory
    Scenario Outline: E13 · memory status adds the corpora line, and one line per old key
      Given the <config>
      When "aof memory status" runs
      Then its text output is today's output plus <added>

      Examples:
        | example | config          | added                                                                                                                                 |
        | E13     | new-shape twin  | exactly the line "corpora: work, imports, code, operator"                                                                              |
        | E13     | legacy config   | the line "corpora: work, imports, code, operator" and one line each for "memory.sources → memory.corpora" and "graph.share → memory.graph.share" |

    @executable @cli @adapter @memory
    Scenario: memory status --json carries the node as a config object
      Given the legacy config
      When "aof memory status --json" runs
      Then the answer carries "config" with corpora "work", "imports", "code" and "operator", source "project setting", and two legacy entries
      And every other field of the answer is unchanged

    @executable @cli @adapter @memory
    Scenario Outline: E15 · a parsed output is the same whichever spelling the config uses
      Given the legacy config in one copy of the project and its new-shape twin in another
      When "<command>" runs in each copy
      Then the two outputs are byte-identical once each copy's own project root is written as "{root}"
      And neither carries a legacy warning

      Examples:
        | example | command                                     |
        | E15     | aof memory recall "pin line endings" --block |
        |         | aof memory recall "pin line endings" --json  |
        |         | aof memory ingest --json                     |
        |         | aof graph impact packages/a.mjs --json       |

    @manual @docs @adapter @memory
    Scenario: the documentation describes one memory node
      Given "README.md", "wiki/memory.md", "wiki/codex-support.md" and "packages/knowledge/README.md"
      Then each names the keys "memory.corpora", "memory.graph.share", "memory.graph.remote" and "memory.backends.graphify.extractionBackend"
      And none presents "memory.sources", "memory.graphify" or a root "graph" except as the old spelling "aof work update" rewrites
      And "wiki/work/TECH_DEBT.md" holds an entry naming the legacy read and the release that removes it
