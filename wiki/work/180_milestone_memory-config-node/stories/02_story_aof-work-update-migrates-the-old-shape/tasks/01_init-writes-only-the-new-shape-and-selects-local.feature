Feature: aof work init writes only the new memory shape, and a new project's memory backend is local

  WHY. A fresh project should start in the new shape, with nothing to migrate. It should also start
  with a backend that sends nothing to a hosted model: the operator chose "local" over "graphify"
  for new projects (180/02 Q1, 2026-10-30). graphify's work-stream extraction sends the work stream
  to Claude on every ingest, and changed 0 of 200 recalls (177). An existing selection is never
  changed (180/ADR-005, ADR-006, 51's fill-the-hole rule).

  THE FIXTURE: a temp directory under an isolated "AOF_GLOBAL_HOME". "init-config" means
  "aof work init-config <dir> --layers @cli --json".

  Rule: R4 · `aof work init` writes only the new shape, and selects `local` for a new project

    @executable @cli @work @memory
    Scenario: E9 · a new project's config holds the new shape with backend local
      Given a directory with no ".aof/aof.config.json"
      When init-config runs
      Then the config's memory node is exactly {"backend":"local"}
      And the config has no root "graph" key
      And the envelope reports memoryBackend "local" with backendWritten true
      And the text output reads "memory.backend: local (set)"

    @executable @cli @work @memory
    Scenario Outline: an existing selection is kept
      Given a config whose memory node is <node>
      When init-config runs
      Then the config's memory backend is "<backend>"
      And the envelope reports backendWritten false

      Examples:
        | node                     | backend  |
        | {"backend":"graphify"}   | graphify |
        | {"backend":"none"}       | none     |
        | {"backend":"local"}      | local    |

    @executable @cli @work @memory
    Scenario: E10 · init leaves an old-shape config's old keys for update
      Given the config {"name":"p","resources":[],"graph":{"share":"git-refs","remote":"upstream"},"memory":{"backend":"local","sources":["claude-auto-memory"],"graphify":{"extractionBackend":"ollama"}}}
      When init-config runs
      Then the memory node and the root "graph" serialize exactly as before
      And the envelope reports backendWritten false

    @executable @cli @work @memory
    Scenario: init writes no old memory key in any path it takes
      Given each of: no config, an empty config {}, and a config created by "aof work init --with-headroom"
      When init-config runs over each
      Then no resulting config holds "memory.sources", "memory.graphify" or a root "graph"

    @manual @docs @work @memory
    Scenario: the /aof:init command says new projects get the local backend
      Given "packages/core/assets/commands/init.md" and its rendered copies after "aof work update" in this repository
      Then each describes "memory.backend: \"local\"" as the default a new project gets, and says that local sends nothing to a hosted model
      And none describes graphify as active by default
