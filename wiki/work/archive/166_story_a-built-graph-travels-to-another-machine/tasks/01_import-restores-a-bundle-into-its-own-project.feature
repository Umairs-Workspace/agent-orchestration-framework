@cli @work @distribution
Feature: aof graph import lays a bundle out as this clone's codebase graph, only in the project it was built from, and never leaves half a graph behind

  WHY. Import is the receiving half of the carry. What it lays down is what every graph reader
  already resolves (`<projectRoot>/graphify-out/graph.json`, read by impact, query, test
  selection, story-contract derive and the seam-liveness audit), so a successful import is
  usable at once, with no build in between. An existing graph is replaced only on --force, and
  whole, never merged (166 Q2). A graph of another codebase would answer impact with wrong
  coupling, so a bundle from a different project is refused with no override (166 Q4).

  THE FIXTURE BELOW: a source repo and a second clone of it, both at commit "a816d6d" and both
  carrying "mesh.workspaceId" "9db1fd84f5895e38". "<tmp>/carry/aof.graph" is a bundle exported
  from the source repo by task 00. Import spawns no graphify binary.

  Rule: R2 · Import restores a bundle from the path the operator names, into the project it was built from

    @executable
    Scenario: the bundle is laid out as the clone's graph and is readable at once
      Given the clone has no "graphify-out/"
      When "aof graph import <tmp>/carry/aof.graph --json" runs in the clone
      Then the clone's "graphify-out/graph.json", "manifest.json", "GRAPH_REPORT.md" and "cache/ast/v0.8.44/<key>.json" are byte-identical to the source repo's
      And the clone's "graphify-out/.gitignore" is the one aof writes
      And "aof graph impact packages/a.mjs --json" in the clone answers with "present": true

    @manual
    Scenario: E5 · the next build reuses the carried cache and re-extracts no file
      Given a real graph built by "aof graph build ." on one clone and exported
      And a second clone at the same commit with no "graphify-out/"
      When the bundle is imported there and "aof graph build . --json" runs
      Then the build reports "unchanged": true ("Already current")
      And no entry is added to the clone's "graphify-out/cache/ast/" during that build
      And the build takes a fraction of the source clone's first full build, both times recorded in VERIFICATION.md

    @executable @bug @finding-F-01
    Scenario Outline: F-01 · a build runs graphify only when a file the graph was built from has changed
      Given "aof graph build ." stamped the source repo's graph with the files it read
      And the clone imported "<tmp>/carry/aof.graph" and holds the same files with LF line endings
      When <change>
      And "aof graph build . --json" runs in the clone
      Then graphify <runs>

      Examples:
        | change                                                         | runs                                                     |
        | nothing changes                                                | is not run, and the build reports "unchanged": true       |
        | "packages/a.mjs" is edited                                     | runs                                                     |
        | a new file "packages/c.mjs" is added                           | runs                                                     |
        | a file graphify never read is deleted                          | runs                                                     |
        | the clone's "graphify-out/graph.json" is rewritten             | runs                                                     |
        | this machine's graphify version differs from the stamp's       | runs                                                     |

    @executable
    Scenario Outline: E6 · an existing graph is replaced only with --force, and whole
      Given the clone already has a "graphify-out/" holding "graph.json" and a file "cache/ast/v0.8.44/stale.json" that is not in the bundle
      When "aof graph import <tmp>/carry/aof.graph <flag> --json" runs
      Then it <outcome>
      And the clone's "graphify-out/" <content>

      Examples:
        | example | flag    | outcome                                               | content                                                   |
        | E6      |         | exits non-zero with code "graph-import-graph-exists"  | is byte-identical to before                               |
        | E6      | --force | succeeds                                              | holds the bundle's files and no "cache/ast/v0.8.44/stale.json" |

    @executable
    Scenario Outline: E7 · a path that is not an aof graph bundle is refused and the clone's graph is untouched
      Given the clone already has a "graphify-out/"
      When "aof graph import <path> --force --json" runs in the clone
      Then it exits non-zero with code "graph-import-not-a-bundle"
      And the message names "<path>"
      And the clone's "graphify-out/" is byte-identical to before

      Examples:
        | example | path                           |
        | E7      | <tmp>/carry/missing.graph      |
        | E7      | <tmp>/carry/README.md          |
        |         | <tmp>/carry/                   |
        |         | <tmp>/carry/plain.gz           |

    @executable
    Scenario: E8 · a bundle truncated mid-copy is refused and leaves nothing half-written
      Given "<tmp>/carry/cut.graph" is the first half of the bytes of "<tmp>/carry/aof.graph"
      And the clone has no "graphify-out/"
      When "aof graph import <tmp>/carry/cut.graph --json" runs in the clone
      Then it exits non-zero with code "graph-import-not-a-bundle"
      And the clone has no "graphify-out/"
      And no staging folder is left beside where "graphify-out/" would be

    @executable
    Scenario Outline: E13 · a bundle from another project is refused, and --force does not override it
      Given the clone's "mesh.workspaceId" is "0f0f0f0f0f0f0f0f"
      When "aof graph import <tmp>/carry/aof.graph <flag> --json" runs in the clone
      Then it exits non-zero with code "graph-import-wrong-project"
      And the message names "9db1fd84f5895e38" and "0f0f0f0f0f0f0f0f"
      And the clone has no "graphify-out/"

      Examples:
        | example | flag    |
        | E13     |         |
        | E13     | --force |

    @executable
    Scenario: a project with no workspaceId is identified by its root commit
      Given neither repo carries "mesh.workspaceId"
      And the clone was made from the source repo, so both share root commit "R"
      When "aof graph import <tmp>/carry/aof.graph --json" runs in the clone
      Then it succeeds
      But into an unrelated repo with a different root commit it exits non-zero with code "graph-import-wrong-project"

    @executable
    Scenario: import with no path is refused and touches nothing
      When "aof graph import --json" runs in the clone
      Then it exits non-zero with code "graph-import-no-path"

    @executable
    Scenario: the verb is reachable through the registry and has a help line
      When "aof graph import --help" runs
      Then its usage reads "aof graph import <path> [--force] [--json]"
      And "graph:import" is in the command registry with a "cli" adapter
