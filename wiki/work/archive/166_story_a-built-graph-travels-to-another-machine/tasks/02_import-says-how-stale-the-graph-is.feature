@cli @work @distribution
Feature: aof graph import tells the receiver how stale the graph it laid down is, and the graph keeps the age it was built with

  WHY. A carried graph is a snapshot of another clone at another time. Every graph reader reports
  `builtAt`, the age that the agent prompts surface so a reused graph is never taken for a fresh
  one, and `builtAt` is the mtime of `graph.json` (`graphArtifactBuiltAt`). So an import that just
  writes the file makes a week-old graph look brand new. The receiver is told the graph's commit
  distance and its age, and a graphify version mismatch is a warning, not a refusal (166 Q3),
  because `graph.json` is still usable at once even when graphify will drop the carried cache.

  THE FIXTURE BELOW: the task 01 source repo and clone. The bundle was exported at commit
  "a816d6d" with "builtAt" "2026-10-13T09:00:00.000Z" and "graphifyVersion" "0.8.44". The
  graphify version on the receiving side is injected; no binary is spawned.

  Rule: R3 · The receiver is told how stale the graph it imported is

    @executable
    Scenario: E9 · a clone ahead of the bundle's commit is told how far behind the graph is
      Given the clone has 12 commits on top of "a816d6d"
      When "aof graph import <tmp>/carry/aof.graph --json" runs in the clone
      Then its result carries "sourceCommit" "a816d6d…", "builtAt" "2026-10-13T09:00:00.000Z" and "commitsBehind" 12
      And the text view says the graph is "12 commits behind HEAD" and names its age

    @executable
    Scenario Outline: commit distance at the edges
      Given the clone's HEAD is <head>
      When "aof graph import <tmp>/carry/aof.graph --json" runs in the clone
      Then its result carries "commitsBehind" <behind>
      And the text view says <says>

      Examples:
        | head                                     | behind | says                                       |
        | "a816d6d" itself                         | 0      | the graph is at HEAD                       |
        | a branch that diverged before "a816d6d"  | null   | "a816d6d" is not an ancestor of HEAD       |

    @executable
    Scenario: E10 · a source commit this clone has never fetched is named, never guessed
      Given the source repo has a commit "b2c3d4e" the clone never fetched, and the bundle was exported there
      When "aof graph import <tmp>/carry/aof.graph --json" runs in the clone
      Then it succeeds
      And its result carries "sourceCommit" "b2c3d4e…" and "commitsBehind" null
      And the text view says the commit is not in this clone, and still names the graph's age

    @executable
    Scenario Outline: E11 · a different graphify version is imported with a warning, never refused
      Given this machine's graphify reports version <local>
      When "aof graph import <tmp>/carry/aof.graph --json" runs in the clone
      Then it succeeds
      And its "warnings" <warning>

      Examples:
        | example | local   | warning                                                                                                   |
        | E11     | "0.9.5" | names "0.8.44" and "0.9.5", and says graphify will discard the carried cache so the next build re-extracts everything |
        |         | "0.8.44"| is empty                                                                                                  |
        |         | absent  | says graphify is not installed here, so the carried cache cannot be checked, and names "aof project provision graphify" |

    @executable
    Scenario: E14 · after the import, every graph reader reports the build time the bundle carried
      When "aof graph import <tmp>/carry/aof.graph --json" runs in the clone
      And "aof graph impact packages/a.mjs --json" then runs in the clone
      Then the impact result's "builtAt" is "2026-10-13T09:00:00.000Z", never the time of the import
