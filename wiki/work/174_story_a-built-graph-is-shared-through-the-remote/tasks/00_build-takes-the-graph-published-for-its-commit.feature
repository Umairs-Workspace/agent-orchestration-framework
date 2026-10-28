@cli @work @distribution
Feature: aof graph build takes the graph already published for its commit instead of running graphify

  WHY. A full graphify build of this repo costs ~300 s, and every clone, worktree and node pays it
  again for a commit some other machine already built (166 carried the graph, but only by hand).
  With sharing on, a build that finds no current local graph asks the project's own remote for the
  graph of HEAD first (ADR-001). The remote is advisory: it can make a build faster, never make one
  fail (ADR-001 "Failure is soft"), and it never sees the memory work graph (ADR-002).

  THE FIXTURE BELOW: a bare git repo "origin.git" in a temp dir, and a clone of it at commit
  "a816d6d…" on "main" whose ".aof/aof.config.json" sets "graph.share" to "git-refs". graphify is
  stubbed through the injected driver: it reports version "0.8.44", writes a "graphify-out/" for
  the tree it is given, and counts its runs. "a published graph" means a bundle written by
  "aof graph export" for that commit and pushed as the blob behind
  "refs/aof/graph/v1/<full sha of a816d6d>".

  Rule: R1 · A clone with no current graph takes the one already published for its commit

    @executable
    Scenario: E1 · a clone with no graph fetches and imports the published one, and graphify does not run
      Given "origin.git" holds a published graph for "a816d6d"
      And the clone has no "graphify-out/"
      When "aof graph build . --json" runs in the clone
      Then graphify has run 0 times
      And "graphify-out/graph.json" is byte-identical to the published bundle's
      And the JSON result reports the graph as fetched from "origin" at "a816d6d"
      And the clone has no local ref under "refs/aof/"

    @executable
    Scenario: E2 · with nothing published for the commit, the build runs graphify as before
      Given "origin.git" holds no ref under "refs/aof/graph/"
      When "aof graph build . --json" runs in the clone
      Then graphify has run 1 time
      And the JSON result reports no fetch

    @executable
    Scenario: E3 · a clone whose own graph is current makes no network call
      Given the clone's own graph is current for its tree
      And the clone's "origin" remote URL is changed to a path that does not exist
      When "aof graph build . --json" runs in the clone
      Then it reports "Already current"
      And graphify has run 0 times
      And the JSON result carries no warning about the remote

    @executable
    Scenario Outline: E4 · a remote that cannot be used never fails the build
      Given the clone has no "graphify-out/"
      And <remote state>
      When "aof graph build . --json" runs in the clone
      Then it exits 0
      And graphify has run 1 time
      And the JSON result carries a warning that names "origin" and says <reason>

      Examples:
        | example | remote state                                                                                | reason                               |
        | E4      | the clone's "origin" remote URL is a path that does not exist                                | the remote was unreachable           |
        |         | "origin.git" holds a ref "refs/aof/graph/v1/<sha>" pointing at a blob that is not a bundle   | the published graph was not a bundle |

    @executable
    Scenario: a fetched graph whose inputs do not match this tree is rebuilt
      Given "origin.git" holds a published graph for "a816d6d"
      And the clone has an untracked, non-ignored file "scratch.mjs"
      When "aof graph build . --json" runs in the clone
      Then graphify has run 1 time
      And the JSON result reports the graph as fetched and then rebuilt because its inputs differ

    @manual
    Scenario: a real GitHub remote carries a graph from one clone to another
      Given this repo's checkout at a commit on "origin/main", with "graph.share" set to "git-refs" and a clean tree
      When "aof graph publish --json" runs there, and then "aof graph fetch --force --json" runs in a second, fresh clone at the same commit
      Then the second clone's "graphify-out/graph.json" is byte-identical to the first's
      And "git ls-remote origin 'refs/aof/graph/*'" lists the commit's ref
      And a plain "git clone" of the repository holds no ref under "refs/aof/"
      And the evidence records the timings, and the ref is deleted afterwards unless it is among the newest 20

    @executable
    Scenario: E5 · the memory work graph never fetches, whatever graph.share says
      Given "origin.git" holds a published graph for "a816d6d"
      When "graph:build" is invoked with "outRoot" ".aof/memory-graph" over the work folder
      Then "origin.git" receives no fetch and no push for that build
      And nothing is written under "graphify-out/" at the project root
