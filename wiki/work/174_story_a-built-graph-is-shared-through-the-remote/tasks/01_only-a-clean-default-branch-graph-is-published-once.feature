@cli @work @distribution
Feature: a graph is published only for a default-branch commit built from a clean tree, and the first publish of a commit stays

  WHY. Once a graph is on the remote it is fetchable by its hash for good, even after its ref is
  deleted (spike 173). So what may be published is decided before the push, and fails closed
  (ADR-003). A graph built over untracked files names their paths and symbols. A graph of a commit
  that is not on the default branch describes code the default branch does not hold. Neither is
  pushed. Two nodes that build the same commit never produce identical bundles (each stamps its own
  build time), so the first publish wins and the second is told so, never forced.

  THE FIXTURE BELOW: as in task 00 — a bare "origin.git" and a clone with "graph.share" set to
  "git-refs" — where "main" on "origin.git" is at "a816d6d…" and the clone is at that commit with a
  graph built there by the stubbed graphify.

  Rule: R2 · Only a graph of a default-branch commit, built from a clean tree, is published

    @executable
    Scenario: E6 · a clean build of a default-branch commit is published with no step by hand
      Given "origin.git" holds no ref under "refs/aof/graph/"
      And the clone has no "graphify-out/"
      When "aof graph build . --json" runs in the clone
      Then "origin.git" holds "refs/aof/graph/v1/<full sha of a816d6d>"
      And that ref points at a blob, not a commit
      And the blob is a bundle whose stamp carries "sourceCommit" "a816d6d…"
      And the JSON result reports the graph as published to "origin"

    @executable
    Scenario Outline: E7 · a build that may not be published says why, and pushes nothing
      Given "origin.git" holds no ref under "refs/aof/graph/"
      And <state>
      When "aof graph build . --json" runs in the clone
      Then it exits 0
      And "origin.git" holds no ref under "refs/aof/graph/"
      And the JSON result reports nothing published, with a reason that <reason>

      Examples:
        | example | state                                                                                  | reason                                       |
        | E7      | the clone has an untracked, non-ignored file "scratch.mjs"                              | names "scratch.mjs"                          |
        |         | the clone has a modified, uncommitted "src/a.mjs"                                       | names "src/a.mjs"                            |
        | E8      | the clone is at "c0ffee1", pushed only on branch "aof/mesh/174-a", not on "main"         | says the commit is not on the default branch |
        |         | the clone is at a local commit "d00d00d" that was never pushed                          | says the commit is not on the default branch |
        | E9      | the graph on disk was built at "a816d6d" and HEAD has moved to "b669097"                | names "a816d6d" and "b669097"                |

    @executable
    Scenario: an ignored file in the tree does not stop a publish
      Given the clone has a file "node_modules/x.js" matched by ".gitignore"
      When "aof graph build . --json" runs in the clone
      Then "origin.git" holds "refs/aof/graph/v1/<full sha of a816d6d>"

  Rule: R3 · The first graph published for a commit stays; nothing overwrites it

    @executable
    Scenario: E10 · a commit another node already published is left as it is
      Given "origin.git" holds a published graph for "a816d6d" pointing at blob "B1"
      When "aof graph publish --json" runs in the clone
      Then "refs/aof/graph/v1/<full sha of a816d6d>" on "origin.git" still points at "B1"
      And the JSON result reports the graph as already published

    @executable
    Scenario: E11 · a publish that loses the race is reported as already published, not as an error
      Given "origin.git" holds no ref under "refs/aof/graph/" when the clone checks
      And another clone publishes "a816d6d" after that check and before the clone's push
      When "aof graph publish --json" runs in the clone
      Then it exits 0
      And the ref on "origin.git" points at the other clone's blob
      And the JSON result reports the graph as already published
