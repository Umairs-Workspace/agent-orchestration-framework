Feature: Saving the Memory section writes only the new shape, keeps every other section, and refuses an invalid node with the reader's own diagnostic

  WHY. A save from the editor is a config write. It writes the node the operator saw, which is
  always the new shape, removes the old keys that node replaced, and leaves every section it was not
  asked to change exactly as it was. A node the memory reader would refuse is refused before
  anything is written, with that reader's own code and path (180/ADR-001, ADR-006, DESIGN Surface 1).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME" whose ".aof/aof.config.json" is
  the config each scenario names. "Saving" means "PUT /api/config/sections" with body
  {"memory": <node>}, driven either by the mounted App's Save button or by "saveEditableSections"
  directly.

  Rule: R2 · Saving writes only the new shape and leaves every other section as it was

    @executable @ui @adapter @memory
    Scenario: E4 · saving an old-shape config's shown node writes the new shape and drops the old keys
      Given the config {"name":"p","resources":[],"graph":{"share":"git-refs"},"memory":{"backend":"local","sources":["claude-auto-memory"]}}
      When the operator opens the "Memory" section and presses Save without editing
      Then the file's memory node is {"backend":"local","corpora":["work","imports","code","operator"],"graph":{"share":"git-refs"}}
      And the file has no root "graph" key
      And the message reads "Saved Memory"
      And reopening the section shows no legacy notice

    @executable @cli @adapter @memory
    Scenario: E5 · a memory save leaves every other section byte for byte as it was
      Given a config whose "work", "mesh", "resources" and "settings" sections are set
      When the memory node {"backend":"local","corpora":["work","imports","code","operator"]} is saved
      Then "work", "mesh", "resources" and "settings" each serialize exactly as before the save
      And the file's memory node is the saved node

    @executable @cli @adapter @memory
    Scenario: removing the graph key from the node turns sharing off
      Given the config {"name":"p","resources":[],"graph":{"share":"git-refs"},"memory":{"backend":"local"}}
      When the memory node {"backend":"local"} is saved
      Then the file has no root "graph" key and no "memory.graph" key

  Rule: R3 · An invalid or conflicting node is refused with the reader's own diagnostic, and nothing is written

    @executable @ui @adapter @memory
    Scenario: E6 · an invalid node is refused and the draft is kept
      Given the config {"name":"p","resources":[],"memory":{"backend":"local"}}
      When the operator edits the Memory textarea to {"corpora":["work","code"]} and presses Save
      Then the message reads the "invalid-memory-corpora" refusal naming "imports"
      And the textarea still holds {"corpora":["work","code"]}
      And the file is byte-identical to before

    @executable @cli @adapter @memory
    Scenario Outline: the save refuses what the memory reader refuses, with its code and path
      Given the config {"name":"p","resources":[],"memory":{"backend":"local"}}
      When the memory node <node> is saved
      Then the save answers ok false with a diagnostic of code "<code>" at path "<path>"
      And the file is byte-identical to before

      Examples:
        | node                                                          | code                              | path                                       |
        | {"corpora":["work","imports","code","planning"]}              | invalid-memory-corpora            | memory.corpora.3                           |
        | {"backends":{"graphify":{"extractionBackend":"codex"}}}       | invalid-memory-extraction-backend | memory.backends.graphify.extractionBackend |
        | {"graph":{"share":"always"}}                                  | graph-share-unknown               | memory.graph.share                         |
        | {"sources":["claude-auto-memory"]}                            | memory-config-legacy-write        | memory.sources                             |
        | ["work"]                                                      | invalid-memory-section            | memory                                     |

    @executable @cli @adapter @memory
    Scenario: a save from a conflicting config keeps the saved node and removes the root graph
      Given the config {"name":"p","resources":[],"graph":{"share":"off"},"memory":{"graph":{"share":"git-refs"}}}
      When the memory node {"graph":{"share":"git-refs"}} is saved
      Then the file's memory node is {"graph":{"share":"git-refs"}}
      And the file has no root "graph" key
