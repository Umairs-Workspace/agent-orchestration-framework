@cli @work @work-stream
Feature: `aof work status` is the one door for a lifecycle move, and the acts that start an item use it

  The automatic advance covers machine-driven starts. Everything past `in-progress` is a JUDGEMENT a
  run cannot infer — built (`in-review`), accepted (`done`), genuinely stuck (`blocked`) — so those
  moves get a door with the same shape as every other write verb: exact-ref resolution, a
  local-checkout refusal, the lifecycle table's coded refusals, and the transition seam that raises
  `item-status.changed` so the projection the board and the fleet read cannot be left behind by a
  status that only moved on disk.

  THE READ FACE EXISTS SO NOTHING GUESSES. "What may this item do next" is a question the table can
  answer and an agent would otherwise improvise — which is how the prose it replaces went wrong.

  BOARD-DEFERRED BY DESIGN, NOT BY DEFERRAL. `acd-board-write-isolation` asserts there is no
  `/api/work/status` route: the board DERIVES status and never writes it (03/ADR-004). So this verb is
  CLI/agent-only, and its carve-out in `acd-work-command-route-coverage` records a rule, not a gap.

  NOT ITEM-LOCKED, deliberately: an assignment holds an item's EXECUTION scope (no rival mint, no
  rival worktree), while a status correction is the operator's own record-keeping on their own
  checkout — and a worker's status write is made by its own mint, in its own checkout, never through
  this door.

  THE PHASE DOOR WRITES ONLY ON A LOCAL ACT. A control-side write for a remote act would mint a
  second authority for an item another node owns (ADR-010/R6.4). The remote path is already covered by
  the worker's mint (task 01), which resolves the item in the worker's PRIMARY checkout — so what
  reaches the operator there is the published projection, not a committed line.

  @executable
  Scenario: the read face reports the current status and the item's legal next moves
    Given an item whose record doc frontmatter status is "in-progress"
    When I run "aof work status <ref>"
    Then it reports status "in-progress"
    And it reports the legal moves in-review, done, blocked and not-started
    And nothing is moved

  @executable
  Scenario: the write face moves one legal edge and names the state it came from
    Given a story whose record doc frontmatter status is "in-progress"
    When I run "aof work status <ref> in-review"
    Then the story's frontmatter status is "in-review"
    And its `updated` line carries the move's date
    And the result names the from-state it moved out of

  @executable
  Scenario: an illegal move is refused with the legal moves named, and writes nothing
    Given a story whose record doc frontmatter status is "in-review"
    When I run "aof work status <ref> not-started"
    Then the command fails with "status-edge-not-applicable"
    And the refusal names the item's actual status and its legal moves
    And the record doc is byte-unchanged

  @executable
  Scenario: the write resolves by exact ref, so a typo never moves a plausible neighbour
    Given a milestone whose slug the read face would match on free text
    When I run "aof work status <that free text> in-review"
    Then the command fails with "ref-not-found"
    And neither the milestone nor its story is touched
    And the same free text still resolves for the read face

  @executable
  Scenario Outline: opening a LOCAL act starts its item, and verify does not
    Given a story with no prior run whose frontmatter status is "not-started"
    When I run "aof work <phase> <ref>" and it resolves local
    Then the story's frontmatter status is "<after>"

    Examples:
      | phase    | after       |
      | continue | in-progress |
      | refine   | in-progress |

  # `verify`'s move is the acceptance judgement at the END of its phase, never a consequence of
  # opening its door — so the door leaves an item's status exactly where it found it.
  @executable
  Scenario: opening a verify moves nothing
    Given a story whose record doc frontmatter status is "in-review"
    When I run "aof work verify <ref>" and it resolves local
    Then the story's frontmatter status is still "in-review"

  @executable
  Scenario: a status that cannot move never fails the act — the door still answers WHERE
    Given a story whose record doc frontmatter status is "in-review"
    When I run "aof work continue <ref>" and it resolves local
    Then the act is answered with where it will happen
    And the refused move is reported as data, carrying "status-edge-not-applicable"
    And the story is not dragged back to the bench

  # The prose surface is the other half of the cure: a bundle that still told an agent to hand-edit
  # frontmatter would keep producing the defect no matter what the seam does. Verified by reading the
  # rendered command surface for all three runtimes, plus the two derived stamps.
  @manual
  Scenario: the command bundles call the verb instead of hand-editing frontmatter
    Given the ACD bundle as rendered into this repo
    When I read the continue, refine, verify and assimilate-code command surfaces
    Then the status move is a numbered STEP of continue's Build lane, before any code is written
    And no bundle instructs an agent to set a `status:` line by hand
    And each judgement transition names `aof work status <ref> <status>`
    And the .claude commands, the .codex skills, the bundle manifest and the install lock all agree with the bundle source
