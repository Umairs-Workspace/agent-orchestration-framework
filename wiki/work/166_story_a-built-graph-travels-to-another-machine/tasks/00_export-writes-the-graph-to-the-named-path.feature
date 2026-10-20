@cli @work @distribution
Feature: aof graph export writes the codebase graph, with graphify's cache, to one bundle file at the path the operator names

  WHY. The codebase graph lives in the git-ignored "graphify-out/" and is derived, never committed
  (10/ADR-005). A second clone on another machine therefore pays for a full graphify extraction
  even when a current graph already exists one machine away. Export is the carrying half: one
  file the operator can copy over USB, scp or a synced drive. The path is always the operator's
  (166 Q1), and nothing they did not name is ever overwritten (166 Q2).

  THE FIXTURE BELOW: a temp git repo at commit "a816d6d" whose ".aof/aof.config.json" carries
  "mesh.workspaceId" "9db1fd84f5895e38", and a hand-written "graphify-out/" holding "graph.json"
  (stamped "built_at_commit"), "manifest.json", "GRAPH_REPORT.md", ".graphify_root",
  "cache/ast/v0.8.44/<key>.json" and "cache/stat-index.json". graphify reports version "0.8.44".
  No graphify binary is spawned by export.

  Rule: R1 · Export writes the codebase graph to the path the operator names

    @executable
    Scenario: E1 · a built graph is written to one bundle file, stamped for the receiver
      When "aof graph export <tmp>/carry/aof.graph --json" runs in the fixture repo
      Then exactly one file exists at "<tmp>/carry/aof.graph"
      And the bundle holds "graph.json", "manifest.json", "GRAPH_REPORT.md" and "cache/ast/v0.8.44/<key>.json" byte-identical to the fixture's
      And the bundle's stamp carries "sourceCommit" "a816d6d…", the "builtAt" of the fixture's "graph.json", "graphifyVersion" "0.8.44" and "workspaceId" "9db1fd84f5895e38"
      And the JSON result names the bundle path, its size in bytes and the number of files it holds

    @executable
    Scenario: E2 · export with no path is refused and writes nothing
      When "aof graph export --json" runs in the fixture repo
      Then it exits non-zero with code "graph-export-no-path"
      And no file has been created in the repo or its parent directory

    @executable
    Scenario: E3 · export before any graph is built is refused and names the build
      Given the fixture repo has no "graphify-out/graph.json"
      When "aof graph export <tmp>/carry/aof.graph --json" runs
      Then it exits non-zero with code "graph-export-no-graph"
      And the message names "aof graph build ."
      And no file exists at "<tmp>/carry/aof.graph"

    @executable
    Scenario Outline: E4 · an existing file at the target is replaced only with --force
      Given "<tmp>/carry/aof.graph" already holds the bytes "old"
      When "aof graph export <tmp>/carry/aof.graph <flag> --json" runs
      Then it <outcome>
      And "<tmp>/carry/aof.graph" <content>

      Examples:
        | example | flag    | outcome                                                 | content                         |
        | E4      |         | exits non-zero with code "graph-export-target-exists"   | still holds the bytes "old"     |
        |         | --force | succeeds                                                | holds a bundle of the fixture   |

    @executable
    Scenario: the target directory is created when it does not exist yet
      Given "<tmp>/new/deeper/" does not exist
      When "aof graph export <tmp>/new/deeper/aof.graph --json" runs
      Then it succeeds and the bundle exists at "<tmp>/new/deeper/aof.graph"

    @executable
    Scenario: a relative path resolves against the directory the command runs in
      When "aof graph export ../aof.graph --json" runs from the fixture repo's "packages/" folder
      Then the bundle exists at the fixture repo's root as "aof.graph"

    @executable
    Scenario: the verb is reachable through the registry and has a help line
      When "aof graph export --help" runs
      Then its usage reads "aof graph export <path> [--force] [--json]"
      And "graph:export" is in the command registry with a "cli" adapter
