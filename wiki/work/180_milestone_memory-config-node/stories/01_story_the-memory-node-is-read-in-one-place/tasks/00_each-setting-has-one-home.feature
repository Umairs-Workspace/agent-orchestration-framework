Feature: Each memory setting has one home — the new spelling is read, the old one still works and names its replacement, and both at once is refused

  WHY. Memory settings live in three places today: "memory.sources", "memory.graphify" and the
  root "graph", each with its own reader. One module, "memory-config.mjs", now reads all three in
  the new shape or the old. A config that keeps the old shape works for one release and is told the
  new key, and a config that spells one setting twice is refused, because the next edit would change
  one copy and silently lose (180/ADR-001).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME" whose ".aof/aof.config.json" is
  the config each scenario names. "read" means calling "readMemoryConfig" on that config.

  Rule: R1 · Each setting has one home: the new spelling is read, the old one is read with a warning naming the new key, and both at once is refused

    @executable @cli @adapter @memory
    Scenario: E1 · the new spelling is read and nothing is legacy
      Given the config {"memory":{"backend":"local","graph":{"share":"git-refs"}}}
      When the memory node is read
      Then its graph share is "git-refs" through remote "origin"
      And its legacy list is empty

    @executable @cli @adapter @memory
    Scenario: E2 · the old spelling is read and each old key names its replacement
      Given the config {"graph":{"share":"git-refs","remote":"upstream"},"memory":{"backend":"local"}}
      When the memory node is read
      Then its graph share is "git-refs" through remote "upstream"
      And its legacy list is exactly "graph.share" replaced by "memory.graph.share" and "graph.remote" replaced by "memory.graph.remote"

    @executable @cli @adapter @memory
    Scenario Outline: every old key is read and reported with its new path
      Given the config <config>
      When the memory node is read
      Then the node reads <reads>
      And its legacy list names "<old>" replaced by "<new>"

      Examples:
        | config                                                                      | reads                                             | old                                | new                                         |
        | {"memory":{"backend":"local","sources":["claude-auto-memory"]}}             | corpora work, imports, code and operator          | memory.sources                     | memory.corpora                              |
        | {"memory":{"backend":"graphify","graphify":{"extractionBackend":"ollama"}}} | graphify extractor "ollama"                       | memory.graphify.extractionBackend  | memory.backends.graphify.extractionBackend  |
        | {"graph":{"share":"off"}}                                                   | graph share "off"                                 | graph.share                        | memory.graph.share                          |

    @executable @cli @adapter @memory
    Scenario: E3 · a setting spelled both ways is refused even when the values agree
      Given the config {"graph":{"share":"off"},"memory":{"graph":{"share":"off"}}}
      When the memory node is read
      Then it is refused with code "memory-config-conflict"
      And the refusal names both "graph" and "memory.graph"

    @executable @cli @adapter @memory
    Scenario Outline: each pair of spellings is a conflict
      Given the config <config>
      When the memory node is read
      Then it is refused with code "memory-config-conflict" naming "<old>" and "<new>"

      Examples:
        | config                                                                                                              | old             | new                      |
        | {"memory":{"sources":["claude-auto-memory"],"corpora":["work","imports","code","operator"]}}                         | memory.sources  | memory.corpora           |
        | {"memory":{"graphify":{"extractionBackend":"ollama"},"backends":{"graphify":{"extractionBackend":"ollama"}}}}        | memory.graphify | memory.backends.graphify |

    @executable @cli @adapter @memory
    Scenario Outline: E4 · an invalid value is refused at the path the author wrote
      Given the config <config>
      When the memory node is read
      Then it is refused with code "<code>" at path "<path>"

      Examples:
        | example | config                                                          | code                               | path                                        |
        | E4      | {"memory":{"sources":["claude-autosave"]}}                      | invalid-memory-sources             | memory.sources.0                            |
        |         | {"memory":{"corpora":["work","imports","code","claude-autosave"]}} | invalid-memory-corpora          | memory.corpora.3                            |
        |         | {"graph":{"remote":"-x"}}                                       | graph-share-unknown                | graph.remote                                |
        |         | {"memory":{"graph":{"remote":"-x"}}}                            | graph-share-unknown                | memory.graph.remote                         |
        |         | {"memory":{"graphify":{"extractionBackend":"codex"}}}           | invalid-memory-extraction-backend  | memory.graphify.extractionBackend           |

    @executable @cli @adapter @memory
    Scenario: the three readers answer the same through either spelling
      Given a legacy config and its new-shape twin, each enabling operator auto-memory, extractor "ollama" and sharing through "upstream"
      When "resolveMemorySources", "resolveGraphifyExtraction" and "readShareSettings" are asked of each
      Then each reader answers the two configs identically, apart from the path it reports

    @executable @cli @adapter @memory
    Scenario: the selection keeps its single read
      Given the source of every module under "packages/*/src"
      Then "memory-config.mjs" reads no "backend" key
      And "selectBackendName" is still the only reader of the memory backend

    @executable @cli @adapter @memory
    Scenario: FF-18001 — only memory-config.mjs reads the node's keys, and it imports no index, backend or transport
      Given the source of every module under "packages/*/src"
      Then only "packages/knowledge/src/memory-config.mjs" reads "corpora", "sources", "graphify", "backends" or "graph" off a memory object, or "graph" off the root config
      And "memory-config.mjs" imports only "@aof/contracts/error" and "engine.mjs"
      And a module planted with "config.memory.sources" is reported by the control
