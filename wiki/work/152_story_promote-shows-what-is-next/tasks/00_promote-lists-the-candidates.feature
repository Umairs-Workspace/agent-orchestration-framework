@cli @work @work-stream
Feature: aof work promote --show-candidates lists what can be promoted, in order

  WHY. To choose what to promote next, the operator reads every backlog record and traces its
  `depends:` by hand. `aof work promote` already decides "can THIS item go?" through its depends
  gate (`classifyDepends`, ADR-003 §6), but only once the operator has named an item.
  `--show-candidates` asks the same gate about every backlog item at once and writes nothing. It
  lists the items the gate accepts, in the order they should go, then the items it refuses, each
  with what it waits on. The gate is the one already used: a candidate is exactly an item that
  `aof work promote <slug>` would accept, and never a second copy of that rule.

  Background:
    Given a work tree holding live milestone 148 "in-progress" and archived milestone 129 "done"
    And these backlog items:
      | folder                                         | depends                                                 | created    |
      | milestone_memory-closes-the-loop               | [148]                                                   | 2026-09-27 |
      | milestone_episodic-memory-is-recallable        | [148, memory-closes-the-loop]                           | 2026-09-27 |
      | milestone_the-memory-wiki-stays-true           | [148, memory-closes-the-loop, episodic-memory-is-recallable] | 2026-09-27 |
      | milestone_operator-auto-memory-source          | [148]                                                   | 2026-09-27 |
      | story_a-halted-lane-is-reaped                  |                                                         | 2026-09-27 |
      | story_a-running-loop-is-visible-in-the-ui      |                                                         | 2026-09-27 |
      | story_every-command-runs-over-a-valid-config   | [129]                                                   | 2026-10-02 |
      | ideas/chore_orphan-edge                        | [no-such-item]                                          | 2026-10-01 |

  Rule: R1 · A candidate is a backlog item promote would accept right now

    @executable
    Scenario: E1 · an item whose dependency is in the stream but not done is a candidate
      When "aof work promote --show-candidates --json" runs
      Then "memory-closes-the-loop" is in "candidates"
      And "every-command-runs-over-a-valid-config", whose dependency 129 is archived, is in "candidates"

    @executable
    Scenario: E2 · an item that depends on another backlog item is not a candidate
      When "aof work promote --show-candidates --json" runs
      Then "episodic-memory-is-recallable" is not in "candidates"
      And "aof work promote episodic-memory-is-recallable" refuses with "promote-depends-backlog"

    @executable
    Scenario Outline: the candidate set is exactly the set a named promote accepts
      When "aof work promote --show-candidates --json" runs
      Then "<slug>" is <listed> in "candidates"
      And in a fresh copy of the work tree, "aof work promote <slug> --json" <outcome>

      Examples:
        | example | slug                                   | listed     | outcome                                   |
        |         | memory-closes-the-loop                 | listed     | succeeds                                  |
        |         | operator-auto-memory-source            | listed     | succeeds                                  |
        |         | a-halted-lane-is-reaped                | listed     | succeeds                                  |
        |         | episodic-memory-is-recallable          | not listed | refuses with "promote-depends-backlog"    |
        |         | the-memory-wiki-stays-true             | not listed | refuses with "promote-depends-backlog"    |
        | E3      | orphan-edge                            | not listed | refuses with "promote-depends-unresolved" |

    @executable
    Scenario: E11 · listing candidates writes nothing
      Given a snapshot of every file under the work tree and the effects journal
      When "aof work promote --show-candidates" runs, and then "aof work promote --show-candidates --json"
      Then every file under the work tree and the effects journal is byte-identical to the snapshot

  Rule: R2 · Candidates are listed in the order they should be promoted

    @executable
    Scenario: E4 · the item that unblocks the most backlog items comes first
      When "aof work promote --show-candidates --json" runs
      Then "candidates" lists these slugs in exactly this order:
        | slug                                   | unblocks |
        | memory-closes-the-loop                 | 2        |
        | a-halted-lane-is-reaped                | 0        |
        | a-running-loop-is-visible-in-the-ui    | 0        |
        | operator-auto-memory-source            | 0        |
        | every-command-runs-over-a-valid-config | 0        |

    @executable
    Scenario: E5 · among items that unblock the same number, the oldest comes first
      When "aof work promote --show-candidates --json" runs
      Then "a-halted-lane-is-reaped" (created 2026-09-27) is listed before "every-command-runs-over-a-valid-config" (created 2026-10-02)

    @executable
    Scenario: E6 · same unblock count and same created date order by slug
      When "aof work promote --show-candidates --json" runs
      Then "a-halted-lane-is-reaped", "a-running-loop-is-visible-in-the-ui" and "operator-auto-memory-source" are listed in that order

    @executable
    Scenario Outline: the ordering edges
      Given a work tree whose backlog holds exactly <backlog>
      When "aof work promote --show-candidates --json" runs
      Then "candidates" lists the slugs "<order>" in that order, with unblocks "<unblocks>"

      Examples:
        | backlog                                                                                                              | order       | unblocks |
        | spike_x (no depends, 2026-10-03), story_y (depends [x]), story_z (depends [y]), chore_w (no depends, 2026-09-01), story_v (depends [w]) | x, w        | 2, 1     |
        | story_a (no depends, no created line), story_b (no depends, 2026-10-03)                                              | b, a        | 0, 0     |
        | story_same (no depends, 2026-10-01), ideas/story_same (no depends, 2026-10-01)                                        | same, same  | 0, 0     |

      # Row 1: "unblocks" counts every backlog item that waits on the candidate, directly or
      # through another backlog item (Q6): x unblocks y and z, so x leads w although w is older.
      # Row 2: an item with no created date sorts after every dated one.
      # Row 3: two items with the same slug keep the backlog listing's order (group path, then
      # slug): the top-level one ("") comes before the one in ideas/, and each row carries its
      # "backlog" group so the two can be told apart.

  Rule: R3 · Items that cannot go yet are shown after the candidates, with what they wait on

    @executable
    Scenario: E7 · a blocked item names every backlog item it waits on
      When "aof work promote --show-candidates --json" runs
      Then "waiting" holds "the-memory-wiki-stays-true" with "waitsOn" equal to:
        | entry                         | code                    |
        | memory-closes-the-loop        | promote-depends-backlog |
        | episodic-memory-is-recallable | promote-depends-backlog |
      And "waiting" holds "episodic-memory-is-recallable" waiting on "memory-closes-the-loop" alone

    @executable
    Scenario: E8 · an entry that names nothing is shown as unresolved
      When "aof work promote --show-candidates --json" runs
      Then "waiting" holds "orphan-edge" with backlog group "ideas" and "waitsOn" equal to:
        | entry        | code                       |
        | no-such-item | promote-depends-unresolved |

    @executable
    Scenario: the human render shows candidates first, then the waiting items, and names the next step
      When "aof work promote --show-candidates" runs
      Then it exits 0
      And the output lists the five candidates numbered 1 to 5 in the R2 order, each with its type and unblock count
      And after them comes a waiting section that names each of the three waiting items and what it waits on
      And the last line names "aof work promote memory-closes-the-loop" and "--next-item" as the way to promote the first

    @executable
    Scenario Outline: an empty answer is said plainly
      Given a work tree whose backlog holds <backlog>
      When "aof work promote --show-candidates" runs
      Then it exits 0 and the output says "<says>"
      And "aof work promote --show-candidates --json" answers "candidates" <candidates> and "waiting" <waiting>

      Examples:
        | backlog                                       | says                                         | candidates | waiting |
        | nothing                                       | The backlog is empty.                         | []         | []      |
        | only story_b (depends [a]), story_a (depends [b]) | No backlog item can be promoted yet.     | []         | 2 rows  |
