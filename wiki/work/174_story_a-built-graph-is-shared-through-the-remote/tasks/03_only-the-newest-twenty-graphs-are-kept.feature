@cli @work @distribution
Feature: only the graphs of the newest 20 default-branch commits are kept on the remote

  WHY. Without pruning, every default-branch commit leaves a ~1.3 MB ref on the remote, and the
  ref list a mirror clone pulls grows without bound. Clones and worktrees start from recent
  default-branch commits, so older graphs are rarely fetched. Every publish prunes, so the list
  stays bounded without anyone remembering to (174 Q3, ADR-003). Pruning bounds the list, not
  exposure: a deleted ref's blob stays fetchable by hash (spike 173).

  THE FIXTURE BELOW: a bare "origin.git" whose "main" has 25 first-parent commits, "m01" (oldest)
  to "m25" (newest), and a clone of it with "graph.share" set to "git-refs". "a published graph for
  mNN" is a bundle blob behind "refs/aof/graph/v1/<full sha of mNN>".

  Rule: R5 · Only the newest 20 default-branch commits keep a published graph

    @executable
    Scenario: E16 · a successful publish prunes the oldest graph past twenty
      Given "origin.git" holds published graphs for "m05" to "m24"
      And the clone is at "m25" with no "graphify-out/"
      When "aof graph build . --json" runs in the clone
      Then "origin.git" holds published graphs for exactly "m06" to "m25"
      And the JSON result lists "m05" as pruned

    @executable
    Scenario: E17 · a graph of a commit that is not on the default branch is pruned
      Given "origin.git" holds published graphs for "m20" to "m24"
      And "origin.git" holds a published graph for "c0ffee1", a commit only on branch "aof/mesh/174-a"
      When "aof graph prune --json" runs in the clone
      Then "origin.git" holds published graphs for exactly "m20" to "m24"
      And the JSON result lists "c0ffee1" as pruned

    @executable
    Scenario: E18 · prune with nothing to delete says so and pushes nothing
      Given "origin.git" holds published graphs for "m20" to "m25"
      When "aof graph prune --json" runs in the clone
      Then it exits 0
      And the JSON result reports nothing pruned
      And "origin.git" received no push

    @executable
    Scenario: prune never deletes a ref outside refs/aof/graph/
      Given "origin.git" holds a ref "refs/aof/other/keep" and the branch "aof/mesh/174-a"
      And "origin.git" holds a published graph for "m01"
      When "aof graph prune --json" runs in the clone
      Then "origin.git" still holds "refs/aof/other/keep" and the branch "aof/mesh/174-a"
      And the JSON result lists "m01" as pruned

    @executable
    Scenario: a publish whose prune fails is still a successful publish
      Given "origin.git" refuses ref deletions
      And "origin.git" holds published graphs for "m05" to "m24"
      And the clone is at "m25" with no "graphify-out/"
      When "aof graph build . --json" runs in the clone
      Then "origin.git" holds "refs/aof/graph/v1/<full sha of m25>"
      And the JSON result reports the graph as published, with a warning that the prune failed
