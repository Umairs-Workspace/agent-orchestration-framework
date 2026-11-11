Feature: memory.corpora names the corpora memory serves — absent is today's set, and only operator may be left out

  WHY. "memory.sources" named one extra corpus. "memory.corpora" names every corpus memory serves,
  from the four the knowledge-engine port knows. Changing what a key means is out of scope, so a
  config without "corpora" behaves exactly as today. "operator" is the one corpus that is opt-in,
  and leaving any other out has no meaning yet, so it is refused rather than silently ignored
  (180/ADR-002).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME" with a work stream of one
  milestone, and a temp "CLAUDE_CONFIG_DIR" whose auto-memory folder for the project holds one
  "feedback" entry, "pin-line-endings.md". The backend is "local" unless a scenario says otherwise.

  Rule: R2 · `corpora` names what memory serves: absent means work, imports and code, and only operator may be left out

    @executable @cli @adapter @memory
    Scenario: E5 · no corpora key means today's set
      Given a config with no "memory.corpora" and no "memory.sources"
      When the memory node is read
      Then its corpora are "work", "imports" and "code"
      And its corpora source is "default"
      And "aof memory ingest" indexes no auto-memory record

    @executable @cli @adapter @memory
    Scenario Outline: E6 · listing operator indexes the auto-memory entries exactly as the old source did
      Given a config whose memory node is <node>
      When "aof memory ingest" runs on the "<backend>" backend
      Then the index holds the lesson from "pin-line-endings.md" with item "operator:claude-auto-memory"

      Examples:
        | example | node                                                       | backend  |
        | E6      | {"corpora":["work","imports","code","operator"]}           | local    |
        | E6      | {"corpora":["work","imports","code","operator"]}           | graphify |
        |         | {"sources":["claude-auto-memory"]}                         | local    |

    @executable @cli @adapter @memory
    Scenario: the same records come from either spelling
      Given one project indexed with "memory.sources": ["claude-auto-memory"]
      And a second copy indexed with "memory.corpora": ["work","imports","code","operator"]
      Then the two indexes hold the same records, field for field

    @executable @cli @adapter @memory
    Scenario: E7 · leaving out an always-served corpus is refused and says why
      Given a config whose memory node is {"corpora":["work","code"]}
      When the memory node is read
      Then it is refused with code "invalid-memory-corpora" at path "memory.corpora"
      And the message names "imports" as always served
      And the message names memory.backend "none" as the way to turn memory off

    @executable @cli @adapter @memory
    Scenario Outline: an explicit list must hold work, imports and code
      Given a config whose memory node is {"corpora":<list>}
      When the memory node is read
      Then the answer is <answer>

      Examples:
        | list                                      | answer                                          |
        | ["work","imports","code"]                 | corpora work, imports and code, source "project setting" |
        | ["code","imports","work","operator"]      | corpora work, imports, code and operator         |
        | ["imports","code"]                        | refused "invalid-memory-corpora" naming "work"   |
        | ["work","imports"]                        | refused "invalid-memory-corpora" naming "code"   |
        | []                                        | refused "invalid-memory-corpora" naming "work", "imports" and "code" |
        | ["work","imports","code","work"]          | refused "invalid-memory-corpora" for a repeat    |
        | "work"                                    | refused "invalid-memory-corpora" for not an array |

    @executable @cli @adapter @memory
    Scenario: E8 · a corpus aof does not know is refused and the four it knows are listed
      Given a config whose memory node is {"corpora":["work","imports","code","planning"]}
      When the memory node is read
      Then it is refused with code "invalid-memory-corpora" at path "memory.corpora.3"
      And the message lists "work", "code", "operator" and "imports"

    @executable @cli @adapter @memory
    Scenario: an empty legacy source list reads as the default set
      Given a config whose memory node is {"sources":[]}
      When the memory node is read
      Then its corpora are "work", "imports" and "code"
      And its legacy list names "memory.sources" replaced by "memory.corpora"

    @executable @cli @adapter @memory
    Scenario: memory off still serves nothing, whatever corpora says
      Given a config whose memory node is {"backend":"none","corpora":["work","imports","code","operator"]}
      When "aof memory recall \"pin line endings\" --json" runs
      Then the answer is the empty, served answer memory off gives today
      And no auto-memory file is read
