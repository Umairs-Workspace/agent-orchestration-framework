@cli @work @work-stream
Feature: aof work find resolves a work-tree folder path

  WHY. `aof:explain` takes a backlog folder path, and resolution goes through `aof work find`,
  never a hand glob. Today the resolver matches a number, a nested ref, a span, or free text
  against an item's slug or folder NAME, so a path answers `[]`. The one resolver
  (`findWork`, packages/work/src/discovery.mjs) gains a path branch instead of every caller
  stripping a path by hand: a query holding `/` or `\` that is not a nested ref or a span is
  resolved as a path from the working directory and matched on the item's folder. Every reader
  that resolves through `findWork` (`aof work doc`, `aof work tasks`, …) gains the same answer.

  The branch only touches queries that answer `[]` today: a slug holds no separator, so no
  current free-text answer changes.

  Rule: R2 · Every ref in the call is answered, in the order given, archived work included

    @executable
    Scenario Outline: a folder path resolves to the item whose folder it names
      Given a work tree holding live story 147, nested story 148/01, archived milestone 129 and backlog story "a-halted-lane-is-reaped"
      When "aof work find <query> --json" runs from the project root
      Then it answers exactly one row, whose ref is "<ref>"

      Examples:
        | example | query                                                                  | ref                     |
        | E5      | wiki/work/backlog/story_a-halted-lane-is-reaped                        | a-halted-lane-is-reaped |
        |         | wiki\work\backlog\story_a-halted-lane-is-reaped                        | a-halted-lane-is-reaped |
        |         | wiki/work/backlog/story_a-halted-lane-is-reaped/                       | a-halted-lane-is-reaped |
        |         | wiki/work/backlog/story_a-halted-lane-is-reaped/STORY.md               | a-halted-lane-is-reaped |
        |         | wiki/work/147_story_the-loop-hands-a-halt                              | 147                     |
        |         | wiki/work/148_milestone_memory/stories/01_story_the-ranking-is-held    | 148/01                  |
        |         | wiki/work/archive/129_milestone_loop-concurrency                       | 129                     |
        |         | <absolute path of the backlog story's folder>                          | a-halted-lane-is-reaped |

    @executable
    Scenario Outline: a path that names no item folder answers no row, never a partial match
      Given the same work tree
      When "aof work find <query> --json" runs from the project root
      Then it answers "[]" and exits 0
      And "aof work find <query>" without "--json" prints 'No work item matches "<query>".' and exits 1

      Examples:
        | query                                       |
        | wiki/work/backlog                           |
        | wiki/work/backlog/story_no-such-item        |
        | wiki/work/148_milestone_memory/stories      |
        | packages/work/src                           |

    @executable
    Scenario Outline: the forms that resolve today resolve exactly as before
      Given the same work tree
      When "aof work find <query> --json" runs from the project root
      Then the answer is byte-identical to the answer before this story

      Examples:
        | query                   |
        | 147                     |
        | 148/01                  |
        | 148/01-02               |
        | a-halted-lane           |
        | story_a-halted-lane     |

    @executable
    Scenario: a reader that resolves through findWork takes a path too
      Given the same work tree
      When "aof work doc wiki/work/backlog/story_a-halted-lane-is-reaped STORY" runs
      Then it prints that story's STORY.md
