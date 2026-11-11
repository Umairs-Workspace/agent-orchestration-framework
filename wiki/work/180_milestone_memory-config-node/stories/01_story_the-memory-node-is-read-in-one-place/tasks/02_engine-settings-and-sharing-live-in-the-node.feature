Feature: Engine settings live in memory.backends, the code graph's sharing in memory.graph, and no key configures egress

  WHY. "memory.graphify" was one engine's private setting at the memory root, and "graph" sat at the
  config root although it governs the code corpus's artifact. Both move into the node with their
  meanings unchanged: the same values, defaults, refusals and validation of an inactive block
  (180/ADR-003, ADR-004). Egress stays something aof reports, not something a key turns on
  (180/ADR-005).

  THE FIXTURE: the shipped "schemas/aof.schema.json" compiled with the project's JSON-schema
  validator, and a temp project under an isolated "AOF_GLOBAL_HOME" for the command scenarios.

  Rule: R3 · Engine settings sit under `backends`, the code graph's sharing under `memory.graph`, and no key configures egress

    @executable @cli @adapter @memory
    Scenario: E9 · the graphify extractor is read from backends and reported at its new path
      Given the config {"memory":{"backend":"graphify","backends":{"graphify":{"extractionBackend":"ollama"}}}}
      When "aof memory status --json" runs
      Then the status reports extractor "ollama" with source "project setting"
      And the extraction path is "memory.backends.graphify.extractionBackend"

    @executable @cli @adapter @memory
    Scenario: an absent extractor still reports claude-cli as the legacy default
      Given the config {"memory":{"backend":"graphify"}}
      When "aof memory status --json" runs
      Then the status reports extractor "claude-cli" with source "legacy default"
      And the extraction egress is "docs-media"

    @executable @cli @adapter @memory
    Scenario: E10 · an inactive engine block is still validated
      Given the config {"memory":{"backend":"local","backends":{"graphify":{"extractionBackend":"codex"}}}}
      When the memory node is read
      Then it is refused with code "invalid-memory-extraction-backend" at path "memory.backends.graphify.extractionBackend"

    @executable @cli @adapter @memory
    Scenario Outline: E11 · the schema admits only registered engines and their known settings
      Given a config whose memory node is <node>
      When it is validated against the schema
      Then the schema <verdict> it

      Examples:
        | example | node                                                          | verdict |
        |         | {"backends":{"graphify":{"extractionBackend":"claude-cli"}}}  | accepts |
        |         | {"backends":{"graphify":{}}}                                  | accepts |
        | E11     | {"backends":{"cognee":{}}}                                    | refuses |
        |         | {"backends":{"graphify":{"model":"x"}}}                       | refuses |
        |         | {"backends":{"graphify":{"extractionBackend":"codex"}}}       | refuses |

    @executable @cli @adapter @memory
    Scenario: the code graph shares through memory.graph exactly as it did through graph
      Given the config {"memory":{"graph":{"share":"git-refs","remote":"upstream"}}}
      And a remote "upstream" holding a published graph for HEAD
      When "aof graph build . --json" runs with no current graph
      Then the build takes the published graph from "upstream"

    @executable @cli @adapter @memory
    Scenario Outline: memory.graph keeps graph's values and refusals
      Given a config whose memory node is {"graph":<graph>}
      When "readShareSettings" reads it
      Then the answer is <answer>

      Examples:
        | graph                           | answer                                                   |
        | {"share":"off"}                 | share "off", remote "origin"                             |
        | {}                              | share absent, every build local                          |
        | {"share":"always"}              | refused "graph-share-unknown" at "memory.graph.share"    |
        | {"remote":""}                   | refused "graph-share-unknown" at "memory.graph.remote"   |

    @executable @cli @adapter @memory
    Scenario: a memory backend's work-graph build makes no remote call with sharing on in the new spelling
      Given the config {"memory":{"backend":"graphify","graph":{"share":"git-refs"}}}
      When "graph:build" runs under the memory work graph's own root, as the graphify memory backend invokes it
      Then no remote git command runs

    @executable @cli @adapter @memory
    Scenario Outline: E12 · the schema holds the new node, still admits the old spelling, and has no egress key
      Given the config <config>
      When it is validated against the schema
      Then the schema <verdict> it

      Examples:
        | example | config                                                                                                                       | verdict |
        |         | {"name":"p","resources":[],"memory":{"backend":"graphify","corpora":["work","imports","code"],"graph":{"share":"git-refs","remote":"origin"},"backends":{"graphify":{"extractionBackend":"claude-cli"}}}} | accepts |
        |         | {"name":"p","resources":[],"memory":{"backend":"local","sources":["claude-auto-memory"],"graphify":{"extractionBackend":"ollama"}},"graph":{"share":"off"}} | accepts |
        | E12     | {"name":"p","resources":[],"memory":{"graph":{"share":"git-refs"},"egress":"local-only"}}                                    | refuses |
        |         | {"name":"p","resources":[],"memory":{"corpora":["work","code"]}}                                                              | refuses |

    @executable @cli @adapter @memory
    Scenario: FF-18002 — the schema's vocabularies are the code's, and the never-shared rule is stated
      Given the shipped schema and the knowledge package's exports
      Then "$defs/memory" corpora items enum equals "KNOWLEDGE_CORPORA" and requires "work", "imports" and "code"
      And every "backends" property name is in the "backend" enum
      And "backends.graphify.extractionBackend"'s enum equals the "GRAPHIFY_BACKENDS" names
      And "memory.graph"'s description says the work graph and the memory index are never shared
      And no property named "egress" exists at any depth under "$defs/memory"
      And a schema planted with "corpora" item "planning" is reported by the control
