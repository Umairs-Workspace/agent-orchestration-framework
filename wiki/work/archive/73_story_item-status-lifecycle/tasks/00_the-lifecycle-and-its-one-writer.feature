@executable @cli @work @work-stream
Feature: the item lifecycle is a declared table with one home, and one surgical write serves both guarded faces

  Before this story the stream had a write-BACK and no write-FORWARD. `rollbackItemStatus`
  (20/ADR-005) was the ONLY programmatic item-status writer, bounded to
  `in-progress -> not-started|blocked`; nothing anywhere could set `in-progress`. That was true and
  it was also the bug, in both directions: an item read `not-started` while it was being built, and
  the rollback — which fires only FROM `in-progress` — could never fire at all.

  THE TABLE IS DECLARED, AND IT LIVES WITH THE VOCABULARY. `ITEM_STATUS_EDGES` is in
  `src/acceptance-horizon.mjs`, beside the frozen five status words that ARE its keys. Homing it in
  `src/work.mjs` would be a second spelling of the vocabulary — the ADR-009/F single-home rule that
  `acd-acceptance-horizon-single-predicate` enforces, and that `src/import/recovery.mjs` already had
  to be cured of. `work.mjs` remains the item-frontmatter AUTHORITY: it owns the write and imports
  its permission, so it can never permit a move the table does not declare.

  TWO FACES, ONE WRITE. `rollbackItemStatus` keeps its hard failure-path bound untouched — a bug on
  the failure path would falsely accept un-done work, so it must be PROVABLY unable to write forward,
  and a bound living in a general writer's argument list is a bound a caller can pass wrong. The new
  `setItemStatus` takes its permission from the table. Both go through one surgical status-line
  rewrite via the atomic `src/fs.mjs:writeText` temp+rename seam, so there is still exactly one place
  in the codebase that rewrites a status line.

  WHAT THE TABLE REFUSES IS THE GUARD. `done` is unreachable from `not-started` and from `blocked`.
  It IS reachable from both working states, because only a story passes through `in-review`: a
  milestone is accepted when all its stories are, a `uat` on its sign-off, a `spike` on its recorded
  finding, a `chore` on its ticked checklist. A lifecycle that describes one type gets worked around.

  Scenario Outline: every declared edge lands, touching only the status and updated lines
    Given an item whose record doc frontmatter status is "<from>"
    When I move it to "<to>" through the lifecycle writer
    Then item frontmatter status is "<to>"
    And the frontmatter `updated` line carries the move's date
    And every other frontmatter key is byte-unchanged, in its original order
    And the record-doc body is byte-unchanged
    And no .tmp- artifact remains beside the record doc

    Examples:
      | from        | to          |
      | not-started | in-progress |
      | not-started | blocked     |
      | in-progress | in-review   |
      | in-progress | done        |
      | in-progress | blocked     |
      | in-progress | not-started |
      | blocked     | in-progress |
      | blocked     | not-started |
      | in-review   | done        |
      | in-review   | in-progress |
      | in-review   | blocked     |

  # The self-edge is the one an at-least-once effect redelivery asks for: refusing it rather than
  # re-writing is how idempotence is expressed at the writer, and it is why the run-mint reactor
  # needs no dedup of its own.
  Scenario Outline: a move the table does not declare is refused status-edge-not-applicable and writes nothing
    Given an item whose record doc frontmatter status is "<from>"
    When I move it to "<to>" through the lifecycle writer
    Then the writer raises a "status-edge-not-applicable" error
    And the record doc is byte-unchanged

    Examples:
      | from        | to          |
      | not-started | in-review   |
      | not-started | done        |
      | blocked     | done        |
      | blocked     | in-review   |
      | done        | in-progress |
      | done        | not-started |
      | in-progress | in-progress |
      | done        | done        |

  Scenario: a word outside the lifecycle vocabulary is refused invalid-status, and the refusal names the legal five
    Given an item whose record doc frontmatter status is "not-started"
    When I move it to "started" through the lifecycle writer
    Then the writer raises an "invalid-status" error
    And the message names not-started, in-progress, blocked, in-review and done
    And the record doc is byte-unchanged

  # `expectFrom` is how a caller declares which from-states its own act legitimately covers — the
  # run-mint reactor advances only not-started|blocked, so a stray mint cannot reopen reviewed work.
  Scenario: expectFrom narrows the door, and the same move without it is still a declared edge
    Given an item whose record doc frontmatter status is "in-review"
    When I move it to "in-progress" expecting from not-started or blocked
    Then the writer raises a "status-edge-not-applicable" error
    And the record doc is byte-unchanged
    And moving it to "in-progress" without that expectation succeeds

  Scenario: the failure face cannot write forward, and its result contract is unchanged
    Given an item whose record doc frontmatter status is "in-progress"
    When I roll it back to "in-review" or to "done"
    Then the writer raises a "forbidden-rollback" error
    And the record doc is byte-unchanged
    And rolling back to "not-started" returns exactly `{ ref, status }`
    And that rollback leaves the `updated` line untouched

  Scenario: the legal moves are answerable without re-deriving the lifecycle
    Given the declared lifecycle table
    When I ask for the legal moves from a status
    Then "not-started" answers in-progress and blocked
    And "done" answers nothing, being terminal
    And a missing or unknown status answers nothing, so an item with no status line is refused rather than silently rewritten
