@executable @cli @work @work-stream
Feature: `--if-applicable` makes the expected refusal data, and narrows exactly one code

  THE TWO DOORS DISAGREE, AND ONLY ONE OF THEM IS RIGHT FOR A SCRIPTED CALLER. The phase door
  already treats this refusal as data — `startedHere` (`src/commands/continue.mjs`) returns
  `{ statusMoved: false, statusCode }` and the act still succeeds, under a bound its own comment
  calls NEVER FATAL. The write door (`src/commands/item-status.mjs`) throws: a
  `status-edge-not-applicable` is a 409 and a non-zero exit. Same refusal, two answers.

  AND THE REFUSAL IS THE COMMON CASE ON THE PATH THE PROMPTS DESCRIBE. Any item that reached the
  board's Continue button was already moved to `in-progress` by the phase door (`STARTING_PHASES`,
  `continue.mjs:148`), and the `run.started` reactor moves it on a run mint (`effects/table.mjs:73`,
  bounded `expectFrom: ["not-started","blocked"]`). So `continue.md`'s step 2 — *"Mark it started —
  before any code"* — routinely runs a verb that exits non-zero, and the only thing standing between
  that and a spurious failure is a sentence of prose telling the agent to carry on. Under `set -e`,
  or a hook that reads an exit code, that prose is not read at all.

  THE BARE VERB KEEPS THROWING. A refusal an operator typed by hand is worth surfacing loudly; it is
  only the scripted, EXPECTED refusal that wants to be data. The flag is the caller's declaration
  that it knows the item may already be there — the same declaration `expectFrom` makes at the
  writer, one layer out.

  ONE CODE, AND NO MORE. `ref-not-found` (404), `invalid-status` (400) and the `no-local-checkout`
  refusal all mean "stop and look", and they arrive through the same channel. Narrowing more than
  the single code would put the interesting failures back into the bucket this flag exists to empty
  — which is the harm the story names, not a hypothetical: it trains agents to discount a verb whose
  other codes are load-bearing.

  Scenario Outline: under the flag, a move that cannot be made reports where the item already is, and exits 0
    Given a story whose record doc frontmatter status is "<from>"
    When I run "aof work status <ref> <to> --if-applicable"
    Then the command exits 0
    And it reports the item's actual status "<from>" and its legal moves from there
    And the report does not claim a move was made
    And the record doc is byte-unchanged
    And no `item-status.changed` event is appended to the effects journal

    # Row 1 is THE case the prompts hit: the item was already started by the phase door or the
    # run-mint reactor, and the self-edge is refused rather than re-written. The rest prove the
    # narrowing is the code's, not one hard-coded pair's.
    Examples:
      | from        | to          |
      | in-progress | in-progress |
      | in-review   | in-review   |
      | done        | in-progress |
      | not-started | done        |
      | in-review   | not-started |
      | blocked     | done        |

  Scenario: --json reports the refusal as a result, not an error envelope
    Given a story whose record doc frontmatter status is "in-progress"
    When I run "aof work status <ref> in-progress --if-applicable --json"
    Then the JSON carries `moved: false`
    And it carries the refusal's code "status-edge-not-applicable"
    And it carries the item's current status "in-progress" and its legal moves
    And no error envelope is emitted on stderr
    And the same run without --if-applicable emits the error envelope and exits non-zero

  Scenario: the flag changes nothing about a move that IS applicable
    Given a story whose record doc frontmatter status is "not-started"
    When I run "aof work status <ref> in-progress --if-applicable"
    Then the story's frontmatter status is "in-progress"
    And the result carries `moved: true` and names the from-state it moved out of
    And its `updated` line carries the move's date
    And `item-status.changed` is raised exactly as it is without the flag

  Scenario: without the flag the same refusal fails exactly as it does today
    Given a story whose record doc frontmatter status is "in-review"
    When I run "aof work status <ref> not-started"
    Then the command fails with "status-edge-not-applicable"
    And it exits non-zero
    And the refusal names the item's actual status and its legal moves
    And the record doc is byte-unchanged

  # The narrowing is the whole design. Each of these means "stop and look", and each must still say
  # so through the exit code — under the flag as without it.
  Scenario Outline: every other refusal still fails under the flag
    Given <given>
    When I run "aof work status <that ref> <target> --if-applicable"
    Then the command fails with "<code>"
    And it exits non-zero
    And nothing on disk is changed

    Examples:
      | given                                                              | target      | code                       |
      | a story whose frontmatter status is "not-started"                  | started     | invalid-status             |
      | a ref that resolves to no item in this checkout                    | in-progress | ref-not-found              |
      | an item the cache knows whose folder is not on this node           | in-progress | no-local-checkout          |
      | a milestone whose slug only the free-text read face would match    | in-progress | ref-not-found              |

  # The flag is meaningless without a target — the read never moves and so never raises the code it
  # narrows. Stated here so nobody later adds a special case for it.
  Scenario: on the read face the flag is inert
    Given an item whose record doc frontmatter status is "in-progress"
    When I run "aof work status <ref> --if-applicable"
    Then the output is identical to the same read without the flag
    And it exits 0
    And nothing is moved

  Scenario: the flag is declared on the verb's own usage, so it is discoverable without reading source
    Given the CLI spec for "work:status"
    When I read its usage line and declared flags
    Then `--if-applicable` is declared a boolean flag with a description
    And the usage line shows it on the move form
