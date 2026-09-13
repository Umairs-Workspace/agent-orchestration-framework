@executable @cli @work @work-stream
Feature: `aof work next` answers with every currently-ready item, not just the first

  A dispatcher cannot run two things at once if the only question it can ask returns one thing.
  `nextWork` returns on the first not-done story (`src/work.mjs:999`), so the answer's shape — not
  the scheduler — is what pins the loop to one lane.

  THE SHAPE IS CONSUMED, SO THE READY SET IS ADDITIVE. Measured at HEAD 2026-08-15, the readers of
  this answer are: `src/commands/next.mjs` (the command itself, plus its human `render` and its
  `json` path-relativiser at `:103-138`), `src/board-ui.mjs:157` (the board's `/api/work/next`
  route), and `src/work-read.mjs:325` — whose `nextWorkCacheFirst` stamps cache attribution only
  `if (typeof result?.ref === "string")` (`:330`), so an answer that moved its ref into a
  collection would silently lose `answeredFrom` and `reportedBy`. Two frozen contract tests hold
  the shape: `test/command-core-contract.test.mjs:606` (a NextResult whose `path` is a raw
  absolute) and `test/board-face-contract.test.mjs:335,390` (the envelope, and `path` projected
  projectRoot-relative). Eleven `src/bundle/commands/*.md` prompts name `aof work next`.

  So the existing single-item keys stay exactly where they are and keep meaning exactly what they
  mean, and the set arrives beside them. A caller that reads `result.ref` today reads the same ref
  after this task.

  THE SET IS THE SAFE SET, NOT EVERY NOT-DONE ITEM. A ready item is one this walk would offer:
  its driver's `depends` are met, its own sibling `depends` are met (task 00), and it is not
  passed over by the candidacy view — `routed: "elsewhere"` and `leased-live` are skipped exactly
  as today, `leased-stale` is offered annotated exactly as today (`src/work.mjs:975-1000`). The
  held-scope skip-and-report (`src/commands/next.mjs:69-86`) applies to every member, not just the
  head. Ordering is the existing positional walk, so the head of the set is the item the
  pre-change command would have returned.

  Scenario: the first member of the ready set is the item next returns today
    Given any stream and any scope
    When I run "aof work next --json"
    Then `ref`, `type`, `slug`, `status`, `path` and `state` describe the same item as before this task
    And the ready set's first member is that same item

  Scenario: two independent stories are both offered
    Given a milestone with stories "00" and "01", neither done and neither depending on the other
    When I run "aof work next --json"
    Then the ready set holds both "00" and "01"
    And they appear in positional order

  Scenario: a story waiting on a sibling is not in the set
    Given a milestone with stories "00" (not-started), "01" (not-started) and "02" (`depends: [00]`)
    When I run "aof work next --json"
    Then the ready set holds "00" and "01"
    And it does not hold "02"

  Scenario: the set spans milestones when the range allows it
    Given milestones "53" and "54" both actionable within the requested range, with no depends between them
    When I run "aof work next 53-54 --json"
    Then the ready set holds ready items from both

  Scenario: a blocked or done answer carries no set to act on
    Given a scope whose only driver waits on an unmet dependency
    When I run "aof work next --json"
    Then `state` is "blocked" with `waitingOn` exactly as today
    And the ready set is empty, so "blocked" can never be mistaken for "one thing is ready"

  Scenario Outline: candidacy and the item lock apply to every member, not just the head
    Given a milestone whose stories "00" and "01" are both otherwise ready, and "<condition>" holds for "01"
    When I run "aof work next --json"
    Then "01" is <treatment>

    Examples:
      | condition                              | treatment                                          |
      | routed elsewhere                       | absent from the set, and reported in `skipped`     |
      | leased live by a peer                  | absent from the set, and reported in `skipped`     |
      | leased stale by a peer                 | present, annotated `reclaimable` with its holder   |
      | its execution scope held by an assignment | absent from the set, and reported in `skipped`  |

  Scenario: a cache-answered member keeps its attribution
    Given a stream where a ready item is answered from the mesh cache rather than local disk
    When I run "aof work next --json"
    Then that member carries `answeredFrom` and `reportedBy`
    And the stamp is applied per member, so a set-shaped answer cannot drop it

  Scenario: the two frozen contract tests still pass unchanged
    Given `test/command-core-contract.test.mjs:606` and `test/board-face-contract.test.mjs:335,390`
    When the suite runs
    Then both pass without amendment
    And the board's `/api/work/next` envelope still projects `path` projectRoot-relative and forward-slashed

  Scenario: the human render still answers the operator's question first
    Given a scope with three ready items
    When I run "aof work next" without `--json`
    Then the first line is the same two-line ready form the operator reads today
    And the additional ready items are reported beneath it rather than replacing it
