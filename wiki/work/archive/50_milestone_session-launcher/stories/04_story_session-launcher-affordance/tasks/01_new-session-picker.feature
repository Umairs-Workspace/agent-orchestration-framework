<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 50/04, LANE C part 1 (ADR-008 decision 10; DESIGN §The picker's
# shape, §DG-50-4, §DG-50-5, §DG-50-7): the new-session picker on the terminals home.
#
# WHAT IT IS DRIVEN THROUGH. The decisions below live in the framework-free launcher
# module under `ui/src/home/` (ADR-008 decision 10 names `ui/src/home/session-launcher.mjs`
# + its `.d.mts`), because this repo has no React test harness and "a rule that can only be
# exercised through a component is a rule with no test" (feed-axis.mjs:6-9). Every `Then`
# below reads a RETURNED VALUE or the REQUEST BODY the module produces — never a pixel.
# The `ui/src/home/` directory is at ceiling 15 / allowance 0 today (measured: 15 files);
# ADR-008 decision 10 raises it to 18 AT the delivered count.
#
# THE PAYLOAD, READ AT SOURCE (this is the whole input; nothing new goes on the wire):
#  - `status.nodes[]` — `{ nodeId, role, freshness: "live"|"stale"|"unknown",
#    workspaceIds: string[], workspaces: [...] , … }`. `workspaceIds` is
#    `global_node_workspaces WHERE node_id = ?`, ordered by workspace id
#    (global-node-registry.mjs:193-199); `freshness` is a 60-second ramp with `unknown` for
#    a never-beat node (:153, :303-309). Types at ui/src/fleet/api.ts:170-191.
#  - `status.workspaces[]` — `{ workspaceId, projectRoot, workDir, name, … }` where `name`
#    is NULLABLE (api.ts:93-101).
#  - `status.items[]` — `{ workspaceId, ref, type, slug, status, title, … }`, `title`
#    NULLABLE (api.ts:141-150).
#  - The surface polls `/api/mesh/status` every `HOME_POLL_MS` = 5000
#    (page-state.mjs:357,360). `ui/src/home/` may import NOTHING from `ui/src/fleet/`
#    (49/ADR-001, gated), so every constant it needs is declared locally with the
#    duplication named — the idiom `HOME_POLL_MS` already follows.
#  - The route accepts `{ nodeId, workspaceId, assistant?, itemRef? }`; both required
#    fields are trimmed and refused BY NAME when blank (mesh-ui-serve.mjs:655-661); a
#    present-but-wrong-typed `assistant`/`itemRef` is a 400 `invalid-body` (:683-690); a
#    present `assistant` outside `PROVIDER_IDS` is a 400 (:699-701); absent/null/blank fall
#    through to the frame builder's own defaults (mesh-session-spawn-directive.mjs:10-20).
#
# THE TWO RULES THIS TASK EXISTS FOR, both measured elsewhere in this tree:
#  1. NEVER FILTER AN OPTION BY ELIGIBILITY. The fleet's own picker is a pure pass-through
#     — "no liveness/eligibility filter … a coded refusal on the response, never a hidden
#     picker filter here" (scope.mjs:590-604). The picker ANNOTATES; the route REFUSES.
#  2. NEVER NAME ONE TARGET AND POST ANOTHER. Measured on the assign row and fixed by
#     DERIVING the target (Fleet.tsx:1235-1249: "the <select>'s DOM value coerces to the
#     first surviving option while React state kept the departed id, so the operator read
#     one name and the POST carried another"). DG-50-7 goes one step further here: the
#     launcher does not coerce at all — it says the value left and lets the operator re-aim.
#
# NOT ASSERTED HERE, each with an owner:
#  - the states, the deadlines, the outcome region and the coded refusals — task 02.
#  - the ack lane and the producer fact — task 00.
#  - geometry, tint, ramp, `title` placement, the 40px bar's yield order — DESIGN §S1/§S2
#    and the `@uat` visual review (DG-50-6 is a render judgement, not a returned value).
#
# ISOLATION. Pure module, no store, no port, no clock. Run under `node:test` with a fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)` anyway (the guard hook requires it), focused, never the
# full suite. The new suite is registered in `scripts/test.mjs`
# (`acd-test-suite-registration`).

@executable @ui @work-stream
Feature: the new-session picker — three fields, options from the payload alone, nothing hidden and nothing swapped
  In order that an operator can start a session from the terminals home without `curl`, and can see every machine and repo the fleet knows rather than a list quietly narrowed on their behalf
  the picker offers every node and every workspace the payload carries — annotated, never filtered — resolves the chosen target against the CURRENT payload so the value it names is the value it posts, takes the item ref as a PICK from `items[]`, and offers no assistant control at all

  Background:
    Given the launcher's framework-free decision module under `ui/src/home/`, called with literal `/api/mesh/status` payloads
    And "the options" means the value the module returns for a field, in order
    And "the request body" means the object the module produces for `POST /api/mesh/session`
    And no scenario reads a DOM node, a React state or a rendered string

  # ═══ F1 · THE NODE FIELD ═════════════════════════════════════════════════════════════

  Scenario Outline: every node on the payload is an option, whatever its liveness
    Given a payload whose roster is <the roster>
    When I read F1's options
    Then the options are exactly <the options>, in codepoint-ascending order by nodeId
    And no node was dropped for its freshness, its role, its workspace membership or its capabilities
    And each option carries its own `freshness` verbatim from the payload

    Examples:
      | case                                  | the roster                                              | the options        |
      | one live worker                       | n1 live                                                 | n1                 |
      | live and stale together               | n2 stale, n1 live                                       | n1, n2             |
      | a never-beat node                     | n1 live, n3 unknown                                     | n1, n3             |
      | the control node itself               | control live, n1 live                                   | control, n1        |
      | a node holding no workspaces          | n1 live (workspaceIds: [])                              | n1                 |
      | an empty roster                       | (none)                                                  | (none)             |
      | a malformed row beside a good one     | n1 live, and a row that is not an object                | n1                 |
      | a row with a blank nodeId             | n1 live, and a row whose nodeId is ""                   | n1                 |
    # THE CONTROL-NODE ROW IS A QA CALL, and it is the sharpest test of rule 1. The control
    # node is in `status.nodes[]`, and a node whose role is not `worker` runs no worker stream
    # client (mesh-launcher.mjs:1039), so it holds no dispatch target: a spawn aimed at it ends
    # in `session-target-not-connected` — pre-200 from the route's presence check, or post-200
    # from the control's own synthesis, the SAME code either way. A stated refusal is a better
    # answer than a picker that silently drops a machine the operator can see in the fleet, and
    # hiding it would make the picker's population a second, undocumented eligibility authority.

  Scenario: node liveness borrows the three words the product already has, and `live` earns no mark
    Given a payload carrying n1 `live`, n2 `stale` and n3 `unknown`
    When I read F1's options
    Then the annotation for n2 is exactly `stale` and for n3 is exactly `unknown`
    And n1 carries NO annotation — only a deviation is marked
    And no fourth liveness word appears anywhere in the module's output

  Scenario Outline: the default selection depends only on how many nodes there are
    Given a payload whose roster is <the roster>
    When the panel opens
    Then F1's chosen value is <chosen>
    And the submit action is enabled only once both F1 and F2 hold a value

    Examples:
      | case                     | the roster        | chosen        |
      | one node                 | n1                | n1            |
      | more than one node       | n1, n2            | (none)        |
      | more than one, one live  | n1 live, n2 stale | (none)        |
    # A PRE-PICKED TARGET ON A FLEET-WIDE CONTROL IS HOW WORK LANDS ON THE WRONG MACHINE.
    # With one node there is nothing to get wrong; with two there is, and the operator names
    # the machine. Pre-selecting the only LIVE node would be an eligibility filter wearing a
    # default's clothes.

  # ═══ F2 · THE REPO FIELD ═════════════════════════════════════════════════════════════

  Scenario: every workspace on the payload is an option, in two groups, with nothing hidden
    Given a payload carrying workspaces ws-aof, ws-test and ws-remote
    And node n1 whose `workspaceIds` are exactly ws-aof and ws-test
    When I read F2's options with n1 chosen
    Then all three workspaces are options
    And ws-aof and ws-test are in the "on this node" group and ws-remote is in the second group, annotated with the group label naming n1
    And within each group the order is codepoint-ascending by workspaceId and never keyed on liveness, recency or session count
    And a workspace whose `name` is null still renders an option identified by its workspaceId — never omitted
    # NOTHING IS HIDDEN because the two membership stores can disagree: `workspaceIds` comes
    # from `global_node_workspaces` on the CONTROL's projection, while the worker re-checks
    # its own membership at spawn time and answers `session-repo-unavailable` if it differs.
    # The grouping is the PRE-EMPTIVE half; the route is the AUTHORITATIVE one.

  Scenario: changing the node regroups the repos without resetting a still-valid choice
    Given a payload where n1 holds ws-aof and n2 holds ws-test
    And ws-aof chosen with n1 chosen
    When the operator changes F1 to n2
    Then F2 still holds ws-aof — it is still an option, now in the "not on n2" group
    And no field was cleared and the panel did not close
    And the request body would carry `workspaceId: "ws-aof"` and `nodeId: "n2"`

  # ═══ F3 · THE ITEM FIELD — A PICK, NEVER A TEXT BOX ══════════════════════════════════

  Scenario: the item field offers the chosen workspace's items and defaults to the repo root
    Given a payload whose `items[]` carries 50/04 and 49/02 in ws-aof, and 12 in ws-test
    And ws-aof chosen
    When I read F3's options
    Then the FIRST option is always the "none — open the repo root" default, present in every state
    And the remaining options are exactly the ws-aof items, each identified by its `ref`, with its `title` beside it and a null title rendering nothing rather than the word "null"
    And no ws-test item appears
    And there is NO free-text input anywhere in the panel: an item ref can only be chosen from this list
    # AN UNVALIDATED REF BECOMES A WORKTREE FAILURE ON ANOTHER MACHINE, SECONDS LATER. The
    # route forwards `itemRef` unvalidated (mesh-ui-serve.mjs:686-690 refuses only a
    # wrong-TYPED value), so a typo is only discovered when `addWorktree` throws on the
    # worker and comes back as `session-worktree-failed`.

  Scenario Outline: the request body carries exactly what the panel holds, and nothing else
    Given a chosen node <nodeId>, a chosen repo <workspaceId> and an item selection <item>
    When I read the request body
    Then it is exactly <the body>
    And it has NO `assistant` key at all
    And every value in it is a string the payload itself carried — no id was constructed, trimmed into existence or defaulted from a remembered value

    Examples:
      | case                        | nodeId | workspaceId | item                        | the body                                          |
      | the default, no item        | n1     | ws-aof      | none — open the repo root   | { nodeId: "n1", workspaceId: "ws-aof" }           |
      | an item chosen              | n1     | ws-aof      | 50/04                       | { nodeId: "n1", workspaceId: "ws-aof", itemRef: "50/04" } |
      | a numeric-looking ref       | n1     | ws-aof      | 50                          | { nodeId: "n1", workspaceId: "ws-aof", itemRef: "50" } |
      | a stale node, still posted  | n2     | ws-aof      | none — open the repo root   | { nodeId: "n2", workspaceId: "ws-aof" }           |
      | a repo not on this node     | n1     | ws-remote   | none — open the repo root   | { nodeId: "n1", workspaceId: "ws-remote" }        |
    # ROW 3 IS THE ONE THAT ALMOST SHIPPED WRONG ONE STORY OVER. The route measured, and
    # fixed, a `itemRef: 50` (a NUMBER) being silently dropped to `null` and answered `200`
    # — an operator asking for item 50 got a bare checkout-root shell and was told it
    # worked. The picker's contract is the other half of that fix: a ref chosen from
    # `items[]` is always sent as the STRING the payload carried.
    # ROWS 4 AND 5 ARE THE RULE-1 PROOF: the panel posts an ineligible-looking combination
    # rather than refusing to offer it, and the route answers with a code (task 02).

  # ═══ NO ASSISTANT CONTROL (DG-50-4, ruled by the PO 2026-08-14) ══════════════════════

  Scenario: the panel has three fields and never claims to start an assistant
    Given any payload
    When I read the panel's fields and every string the module returns
    Then there are exactly three fields — node, repo, item — and no fourth
    And no returned string contains "claude", "codex", "gemini" or the word "assistant"
    And the request body omits `assistant`, so the wire's own `"claude"` default applies untouched
    And the module exposes no way for a caller to set `assistant` on the body
    # THE FIELD WOULD BE DISHONEST IN BOTH DIRECTIONS: rendered, it labels a `cmd.exe` shell
    # `claude`; unrendered, its only effect is a filename segment on another machine.
    # `assistant` is rendered NOWHERE in `ui/src` today, and ADR-007 decision 3 made it a
    # LABEL that selects no binary.

  # ═══ THE PANEL SURVIVES A POLL IT CANNOT SEE (DG-50-7) ═══════════════════════════════

  # THE MEASURED DEFECT, AT THIS CONTROL. This is the scenario that guards it.
  Scenario: the value the panel names is the value it posts, across a poll
    Given n1 and n2 on the payload and n2 chosen
    When a poll arrives in which n2 has left the roster and the panel is still open
    Then the module's rendered value for F1 and the `nodeId` in its request body are the SAME string
    And that string is still "n2" — the departed choice is NOT swapped to the first surviving option
    And the field says the value is no longer in the mesh and invites the operator to pick another
    And nothing was auto-selected on the operator's behalf

  Scenario Outline: a poll changes nothing about an open panel
    Given an open panel with n1 and ws-aof chosen and the cursor in <the field>
    When a poll arrives that <the change>
    Then the panel is still open and every field holds its value
    And the option order is unchanged for every option that is present in both polls
    And no option row moved position under the cursor

    Examples:
      | case                                 | the field | the change                                       |
      | a new node appears                   | node      | adds n0, which sorts BEFORE n1                   |
      | a node's freshness changes           | node      | flips n1 from live to stale                      |
      | a session count changes              | repo      | adds four sessions on n1                         |
      | a workspace appears                  | repo      | adds ws-alpha, which sorts before ws-aof         |
      | an item's status changes             | item      | moves 50/04 from `in-progress` to `done`         |
      | the payload is byte-identical        | node      | changes nothing at all                           |
    # A LIST THAT RE-SORTS EVERY 5s UNDER A CURSOR IS THE TILE-MOVES-UNDER-THE-HAND DEFECT,
    # IN A MENU. Codepoint-ascending is the comparison the grid and `runs.mjs` already use,
    # for the same locale-independence reason; a new option takes its sorted place, and no
    # existing option moves relative to another.

  # ═══ THE FOUR EMPTY CASES, EACH STATING ITS OWN REASON ═══════════════════════════════

  Scenario Outline: an unavailable control explains itself rather than disappearing
    Given <the situation>
    When I read the module's answer for the trigger and the fields
    Then <what the module reports>
    And a control that cannot be used is never silently absent and never merely greyed without a reason
    And the disabled trigger is still reachable by the keyboard — an element the keyboard skips hides its explanation from exactly the users who need it

    Examples:
      | case                        | the situation                                              | what the module reports                                                       |
      | no payload yet              | the first fetch has not answered                           | the trigger is disabled with the "the mesh has not answered yet" reason        |
      | the last fetch failed       | a payload failure with no last-known payload               | the trigger is disabled with the same not-answered-yet reason                  |
      | a payload with no nodes     | `nodes: []`                                                | the trigger is disabled with the "no nodes have published" reason              |
      | the node holds no workspaces| n1 chosen, `workspaceIds: []`, three workspaces on payload | F2 offers all three, ALL in the "not on n1" group — nothing hidden             |
      | the repo has no items       | ws-aof chosen, no items in ws-aof                          | F3 is disabled showing only its repo-root row, with the no-items reason        |
    # "ABSENT, NOT DISABLED" (m49's tile rule) AND "DISABLED, NOT HIDDEN" (this picker's)
    # ARE ONE RULE: an unavailable control must have its reason on screen. m49 may withhold
    # a tile control because the line above it names the cause; in a FORM nothing else on
    # screen would explain a missing field. A reviewer must not log either as an
    # inconsistency.

  Scenario: with no payload the panel has no state of its own
    Given no payload
    Then the panel cannot be opened at all
    And the module returns no field options, no default selection and no submit-enabled answer
    # A PANEL THAT OPENED ONTO THREE EMPTY SELECTS WOULD BE A FORM THAT CANNOT BE COMPLETED
    # AND DOES NOT SAY WHY.

  # ═══ TOTALITY ════════════════════════════════════════════════════════════════════════

  Scenario Outline: the module is total — every payload answers, none throws
    Given <the payload>
    When I read every field's options, the default selection and the request body
    Then no error is thrown
    And every returned option list is an array, possibly empty
    And the request body is either a complete `{ nodeId, workspaceId }` pair or is withheld — never a partial object with a missing required field

    Examples:
      | case                              | the payload                                            |
      | null                              | `null`                                                 |
      | an empty object                   | `{}`                                                   |
      | nodes is not an array             | `{ nodes: "n1", workspaces: [], items: [] }`           |
      | workspaces absent                 | `{ nodes: [n1], items: [] }`                           |
      | items absent                      | `{ nodes: [n1], workspaces: [ws-aof] }`                |
      | a node whose workspaceIds is null | `{ nodes: [{ nodeId: "n1", workspaceIds: null }] }`    |
      | duplicate node ids               | two rows both `nodeId: "n1"`                            |
      | duplicate workspace ids          | two rows both `workspaceId: "ws-aof"`                   |
      | a deeply frozen payload           | the populated payload, deep-frozen                     |
    # DUPLICATES RESOLVE TO ONE OPTION PER ID — a picker that offered the same machine twice
    # would make the operator's choice ambiguous at the exact moment it must not be.

  Examples: the picker's contract, as a case matrix a run can be checked against
    | field | rule                                    | the observable                                                |
    | F1    | every node, never filtered              | options == payload roster, codepoint order                    |
    | F1    | annotate, don't hide                    | stale/unknown annotated; live unmarked; no fourth word        |
    | F1    | no pre-pick on a multi-node fleet       | chosen is none unless there is exactly one node               |
    | F2    | every workspace, two groups             | membership groups the list; it never shortens it              |
    | F2    | a valid choice survives a node change   | the value is kept, the group is recomputed                    |
    | F3    | a PICK, never a text box                | options from items[], repo-root row always first              |
    | body  | derived, never remembered               | rendered value === posted value, always                       |
    | body  | no assistant                            | the key is absent; no provider word is ever returned          |
    | panel | a poll changes nothing                  | open, values held, order stable, cursor undisturbed           |
    | panel | four empty cases                        | each disabled-with-a-reason, none silently absent             |
