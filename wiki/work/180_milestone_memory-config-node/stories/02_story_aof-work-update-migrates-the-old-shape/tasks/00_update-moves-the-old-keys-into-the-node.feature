Feature: aof work update moves every old memory key into the memory node, writes only when something moved, and leaves a conflict as written

  WHY. The old shape is read for one release, so the upgrade has to reach every project through
  something its operator already runs. "aof work update" fills the new shape from the old one and
  never re-authors anything else: every other section keeps its bytes, a current config is not
  written at all, and a setting spelled both ways is reported for the operator to choose rather than
  guessed (180/ADR-006, 127/ADR-005).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME", initialised with "aof work init",
  whose ".aof/aof.config.json" is then replaced by the config each scenario names, written as
  2-space JSON. "the E1 config" is
  {"name":"p","resources":[],"graph":{"share":"git-refs","remote":"upstream"},"work":{"dir":"./wiki/work"},"memory":{"backend":"local","sources":["claude-auto-memory"],"graphify":{"extractionBackend":"ollama"}}}.

  Rule: R1 · `aof work update` moves every old memory key into the node, and touches nothing else

    @executable @cli @work @memory
    Scenario: E1 · every old key moves into the node, in the node's key order
      Given the E1 config
      When "aof work update --json" runs
      Then the config file is {"name":"p","resources":[],"work":{"dir":"./wiki/work"},"memory":{"backend":"local","corpora":["work","imports","code","operator"],"graph":{"share":"git-refs","remote":"upstream"},"backends":{"graphify":{"extractionBackend":"ollama"}}}}
      And the envelope's memoryConfig reports moves "memory.sources → memory.corpora", "memory.graphify → memory.backends.graphify" and "graph → memory.graph", and written true
      And the text output prints one "memory:" line per move

    @executable @cli @work @memory
    Scenario: E2 · with no memory node, the node takes the place where graph stood
      Given the config {"name":"p","resources":[],"graph":{"share":"off"},"work":{"dir":"./wiki/work"}}
      When "aof work update" runs
      Then the config file's root keys are "name", "resources", "memory", "work" in that order
      And its memory node is {"graph":{"share":"off"}}

    @executable @cli @work @memory
    Scenario Outline: each old key moves on its own
      Given the config {"name":"p","resources":[],"memory":<before>}
      When "aof work update" runs
      Then the config file's memory node is <after>

      Examples:
        | example | before                                                     | after                                                             |
        | E3      | {"backend":"local","sources":[]}                           | {"backend":"local"}                                               |
        |         | {"backend":"local","sources":["claude-auto-memory"]}       | {"backend":"local","corpora":["work","imports","code","operator"]} |
        |         | {"backend":"graphify","graphify":{}}                       | {"backend":"graphify","backends":{"graphify":{}}}                 |
        |         | {"graphify":{"extractionBackend":"claude-cli"}}            | {"backends":{"graphify":{"extractionBackend":"claude-cli"}}}      |

    @executable @cli @work @memory
    Scenario: E4 · every other section serializes exactly as before
      Given the E1 config with "work", "mesh" and "settings" sections set and a "$schema" key
      When "aof work update" runs
      Then "$schema", "name", "resources", "work", "mesh" and "settings" each serialize exactly as before
      And "memory.backend" is still "local"

  Rule: R2 · A config with nothing old is not written, a second run is a no-op, and a dry run writes nothing

    @executable @cli @work @memory
    Scenario: E5 · a new-shape config is not written
      Given the config {"name":"p","resources":[],"memory":{"backend":"local","corpora":["work","imports","code","operator"],"graph":{"share":"off"}}}
      When "aof work update --json" runs
      Then the config file's bytes and modification time are unchanged
      And the envelope's memoryConfig reports no moves, no conflicts and written false
      And the text output prints no "memory:" line

    @executable @cli @work @memory
    Scenario: E6 · a second run moves nothing
      Given the E1 config
      When "aof work update" runs twice
      Then the second run's memoryConfig reports no moves and written false
      And the second run leaves the file's bytes and modification time as the first run left them

    @executable @cli @work @memory
    Scenario: E7 · a dry run lists the moves and writes nothing
      Given the E1 config
      When "aof work update --dry-run --json" runs
      Then the envelope's memoryConfig lists the three moves with written false
      And the config file is byte-identical to the E1 config

    @executable @cli @work @memory
    Scenario: a project without a config still updates, and no config is created
      Given a project with no ".aof/aof.config.json"
      When "aof work update --json" runs
      Then the update completes and rewrites the lock
      And the envelope carries no memoryConfig
      And no ".aof/aof.config.json" exists afterwards

  Rule: R3 · A setting spelled both ways is reported and left exactly as written

    @executable @cli @work @memory
    Scenario: E8 · a conflicting pair stays as written while the other keys still move
      Given the config {"name":"p","resources":[],"graph":{"share":"off"},"memory":{"graph":{"share":"git-refs"},"sources":["claude-auto-memory"]}}
      When "aof work update --json" runs
      Then the config file's root "graph" is {"share":"off"} and its "memory.graph" is {"share":"git-refs"}
      And its memory node holds "corpora" ["work","imports","code","operator"] and no "sources"
      And the envelope's memoryConfig reports the conflict "graph" with "memory.graph" and the move "memory.sources → memory.corpora"
      And the text output names the conflict and says to choose one

    @executable @cli @work @memory
    Scenario: after the migration, project doctor reports no old key
      Given the E1 config
      When "aof work update" runs and then "aof project doctor --json" runs
      Then the doctor's diagnostics hold no "memory-config-legacy" warning
