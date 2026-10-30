Feature: The config editor's Memory section shows the memory node in the new shape, and names each old key the config still uses

  WHY. The config editor offers every expanded section but memory. The Memory section lets an
  operator see what memory serves without opening the file. It shows the new shape even over an old
  config, so the editor never teaches the old spelling, and it lists each old key it will replace
  before anything is saved (180/DESIGN Surface 1, 180/ADR-001).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME" whose ".aof/aof.config.json" is
  the config each scenario names, served by the setup UI and mounted in the real App, with the
  project scope selected.

  Rule: R1 · The Memory section shows the node in the new shape, and names each old key the config still uses

    @executable @ui @adapter @memory
    Scenario: E1 · a new-shape node is shown as written
      Given the config {"name":"p","resources":[],"memory":{"backend":"local"}}
      When the operator opens the "Memory" section
      Then the textarea holds {"backend":"local"}
      And the sidebar count for "Memory" is "1"
      And no legacy notice is shown

    @executable @ui @adapter @memory
    Scenario: E2 · an old-shape node is shown rewritten, with a notice naming each old key
      Given the config {"name":"p","resources":[],"graph":{"share":"git-refs"},"memory":{"backend":"local","sources":["claude-auto-memory"]}}
      When the operator opens the "Memory" section
      Then the textarea holds {"backend":"local","corpora":["work","imports","code","operator"],"graph":{"share":"git-refs"}}
      And the legacy notice lists "memory.sources → memory.corpora" and "graph.share → memory.graph.share"
      And the legacy notice ends "Saving writes the new shape."

    @executable @ui @adapter @memory
    Scenario: E3 · a config without a memory node shows an empty object
      Given the config {"name":"p","resources":[]}
      When the operator opens the "Memory" section
      Then the textarea holds {}
      And the sidebar count for "Memory" is "0"

    @executable @ui @adapter @memory
    Scenario: E7 · a conflicting node is shown as written, with the conflict in the validation panel
      Given the config {"name":"p","resources":[],"graph":{"share":"off"},"memory":{"graph":{"share":"off"}}}
      When the operator opens the "Memory" section
      Then the textarea holds {"graph":{"share":"off"}}
      And the validation panel shows "memory-config-conflict" naming "graph" and "memory.graph"
      And no legacy notice is shown

    @executable @ui @adapter @memory
    Scenario: the section sits in the Expanded DSL group in project scope only
      Given the config {"name":"p","resources":[],"memory":{"backend":"local"}}
      When the editor shows the project scope
      Then the "Expanded DSL" group lists "MCP Servers", "Hooks", "Project Docs", "Settings" and "Memory" in that order
      And when the editor shows the global scope the group does not list "Memory"

    @manual @ui @adapter @design
    Scenario: the section conforms to DESIGN Surface 1
      Given screenshots of the Memory section in its empty, populated new-shape, populated legacy, conflict and saved states, at above and below 1050 px
      When the designer judges them against DESIGN.md Surface 1's binding checklist
      Then the verdict is CONFORMS
