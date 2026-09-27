<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/00, THE ONE HOP: a fact the system already produces,
# already persists and already carries through its shared row mapper stops being
# dropped one function before a browser can read it.
#
# THE SEAM, read at source in this working tree (2026-08-13).
#   `projectAssignment(row)` — src/global-mesh-query.mjs:132. It builds a literal
#   of EIGHT keys (:134-143 — assignmentId, state, targetNodeId, issuer, runId,
#   assignedAt, updatedAt, reclaimedAt) and then appends `sessionId` ONLY when the
#   row states one (:144-146, `typeof row.sessionId === "string" && length > 0`).
#   `code` is not among them. That literal is the whole hop.
#   Its TWO call sites are both in `shapeGlobalStatus`: the item attachment at
#   :505 (`{ ...item, assignment: projectAssignment(picked) }`) and the node
#   attachment at :514 (`rows.map(projectAssignment)`). ONE function, two
#   attachment points — edit the function, never the call sites.
#
# THE FACT IS ALREADY AT THE PROJECTION'S DOORSTEP, and that is what makes this a
# three-line change instead of a migration.
#   - PRODUCED: `mesh-worker-execution.mjs` reports a live blocked agent as
#     `sendAssignmentStatus(assignmentId, "running", { code: "needs-input" })` —
#     :2654, :2702, :3148, :3158 — off the `NEEDS_INPUT_SENTINEL` (:914) or an
#     unanswered human-input `tool_use` (:1186, :1201), while the assignment
#     legitimately stays `running`.
#   - PERSISTED: control-stream-server.mjs:346-351 reads `code` off the frame and
#     :362 hands it to the transition, which writes it through
#     effects/assignment-transitions.mjs:159 → assignment-record.mjs:183, :187-189.
#   - MAPPED: `mapAssignmentRow` (src/assignment-record.mjs:100) already returns
#     `code: row.code ?? null` (:116), and `listAllAssignments` (:308-312) maps
#     EVERY row through it — so the rows `shapeGlobalStatus` receives
#     (global-mesh-query.mjs:58) already carry the fact.
#   `src/assignment-record.mjs` IS NOT EDITED BY THIS STORY. The graph measures it
#   at 38 dependents — a god-node — and it already carries the field. This file
#   pins the mapper's OUTPUT shape (scenario 1) precisely so a "tidy it while I am
#   in there" edit fails a test rather than a review.
#
# NOT ASSERTED HERE, each with an owner:
#  - ANY RENDERING. The form, position and precedence of the `needs input` mark is
#    DESIGN §DG-49-3 and belongs to STORY 49/05, judged by the designer against
#    the connection ramp it must not compete with (PO ruling on 49/00's STORY.md).
#    A scenario here that asserts a chip appears is OUT OF CONTRACT. DESIGN also
#    rules that the mark ships fixture-driven and that its absence from a live
#    render is NOT a finding — the producer needs a worker genuinely blocked on a
#    human at the moment of observation.
#  - FREE-SESSION AGENT STATE. Out of milestone 49 entirely (ADR-004(c)). A
#    session with no assignment has no record to carry a `code`; nothing here
#    invents one, and no `unknown` badge is added.
#  - ANY DERIVATION FROM TERMINAL BYTES. Forbidden and CI-gated
#    (ui/src/terminal/source-table.mjs; acd-fleet-terminal-input-constrained).
#    This story adds a FIELD, not a sniffer.
#  - The `done`/`failed` reading — already owned by `assignmentChip`
#    (ui/src/fleet/assignments.mjs), untouched here.
#  - A SOURCE-TEXT sweep proving `src/assignment-record.mjs` was not edited. That
#    shape is a fitness function's, not a feature's; this file asserts the
#    observable consequence (the mapper's returned key set) instead.
#
# WHY THE WHOLE FILE IS `@cli` EVEN THOUGH SCENARIO 6 NAMES A `ui/` FILE: no
# scenario here observes a rendered surface. `WorkAssignment` is the wire's own
# declaration — the browser half of the SAME contract — asserted by a file's
# content and a build's exit code, never by a pixel. The rendering layer arrives
# with story 05 and carries its own tags.
#
# TRAPS A BUILDER WILL OTHERWISE HIT — all four measured:
#  1. `code` IS NOT A `needs-input` BOOLEAN. Production writes at least TWO values
#     on this column: `"needs-input"` (above) and `"resumed"` (:3077, :3140,
#     :3148 — the one sanctioned revival of a failed row). The projection COPIES;
#     it does not filter to one word, does not translate to a boolean, and does
#     not validate against a closed set. A reader that keys off truthiness would
#     read a `resumed` assignment as blocked — which is why story 05's mark must
#     key on the exact word.
#  2. "ABSENT, NOT FALSE" IS LOAD-BEARING FOR A GATE THAT IS GREEN TODAY.
#     test/fleet-terminal-view-surface.test.mjs:386 asserts
#     `Object.keys(uncaptured.assignment)` deep-equals the pre-existing EIGHT
#     (its list at :175-177). An unconditional `code: row.code ?? null` in the
#     projection turns that shipped green test RED. The rule is not a nicety.
#  3. THE GUARD MUST TEST THE VALUE, NOT THE KEY. Every row reaching the
#     projection came through `mapAssignmentRow`, which NORMALISES to
#     `code: null` (assignment-record.mjs:116) — so `"code" in row` is true for
#     every row ever projected. Mirror `sessionId`'s guard byte-for-byte
#     (`typeof === "string" && length > 0`, :144).
#  4. A CODE-LESS FRAME **CLEARS** THE COLUMN. control-stream-server.mjs:346-351
#     says so in terms and calls out that this is DELIBERATELY unlike
#     runId/sessionId's absent-is-not-a-clear: the code describes the CURRENT
#     posture, not a captured fact. So the wire key must VANISH again when the
#     human answers — "absent, not false" has to hold across the clear, not only
#     at rest. Scenario 4 is that dynamic.
#
# ISOLATION IS MANDATORY wherever a store is involved: a fresh `AOF_GLOBAL_HOME`
# temp dir per scenario. An unisolated run writes fixture records into the
# operator's live `~/.aof` and pollutes the running soak (hook-enforced). Focused
# runs only, NEVER the full suite — test/global-work-propagation.test.mjs binds
# `:4182`, held by the live control daemon on this machine, and `:4181` is held by
# the fleet daemon. No scenario here stands up a server or binds any port.
#
# WHERE IT LANDS: the two suites that already own these assertions and are already
# registered — test/assignment-fleet-status-shape.test.mjs (the pure shaper;
# scripts/test.mjs:377, :2726) and test/fleet-terminal-view-surface.test.mjs (the
# REAL frame handler over a REAL store into the REAL shaping; scripts/test.mjs:230,
# :2647). If a NEW suite is created instead, it MUST be registered in
# scripts/test.mjs (`acd-test-suite-registration`) — an unregistered suite is no
# gate at all.

@executable @cli @work @distribution
Feature: `needs-input` reaches the wire — the assignment projection carries the status-refinement code the worker already reports, absent when there is nothing to say
  In order that the operator can see WHICH agent is waiting for a human without opening its terminal and reading its output
  the fleet's read shape copies the assignment row's `code` onto the wire verbatim, at both attachment points, and omits the key entirely when the row states no code

  Background:
    Given a fresh `AOF_GLOBAL_HOME` temp dir and a real global work store opened under it
    And "the projected row" means what `shapeGlobalStatus` attaches as an item's `assignment` or as an element of a node's `assignments`
    And no server is started and no port is bound anywhere in this feature

  # SCENARIO 1 — THE PREMISE, and it is GREEN ON ARRIVAL BY DESIGN. It pins the
  # property that licenses a three-line diff: the fact is already at the shared
  # mapper's output, so nothing upstream of the projection needs to move. It can
  # still FAIL — it fails the moment anyone edits the 38-dependent god-node — which
  # is exactly the edit this story must not make.
  Scenario: the shared row mapper already hands the projection the fact, so the god-node needs no edit
    Given an assignment row stored with state `running` and code `needs-input`
    When I list every assignment through the shared reader the fleet shaping itself uses
    Then that row's `code` reads exactly `needs-input`
    And the mapped row's keys are exactly `assignmentId`, `itemRef`, `workspaceId`, `targetNodeId`, `issuer`, `state`, `runId`, `assignedAt`, `updatedAt`, `reclaimedAt`, `sessionId`, `code` — in that order
    And a row that has never carried a code maps to `code: null` — never `""`, never a fabricated word
    # The twelve-key order is asserted so that "while I am in the mapper" fails a
    # test, not a review. 38 dependents read this shape.

  # SCENARIO 2 — THE HEADLINE, driven end-to-end by the REAL producer path, never a
  # hand-built row (ADR-008's producer-fed rule, this codebase's most expensive
  # earned lesson).
  Scenario: a worker reporting a live blocked agent puts the word on the wire, at BOTH attachment points
    Given an assignment held by node `node-a` for item `49/00`
    When the worker sends its assignment-status frame reporting `running` with code `needs-input` through the real control-side frame handler
    And the fleet status payload is shaped from that store
    Then the item row's projected assignment carries `code` reading exactly `needs-input`
    And the node row's projected assignment for the same assignment carries `code` reading exactly `needs-input` — one function feeds both, so neither can be the one that was remembered
    And the assignment's `state` still reads `running` — the code REFINES a state, it never replaces one
    And the eight pre-existing projected keys keep their names, their order and their values byte-for-byte, and `sessionId` keeps its place among them
    And no other key appears on the projected row

  # SCENARIO 3 — "ABSENT, NOT FALSE", enumerated. The value axis is the one a
  # builder gets wrong, and every row is measured against `sessionId`'s own guard
  # (global-mesh-query.mjs:144) rather than against a newly-invented rule.
  Scenario Outline: the key is present only when the row states a code, and the word travels verbatim
    Given an assignment row whose stored `code` is <stored code>
    When the fleet status payload is shaped
    Then the projected row <outcome>
    And the projected row is never given a `code` of `null`, of `""`, or of a word the store did not hold

    Examples:
      | case                                    | stored code        | outcome                                                        |
      | the agent is blocked on a person        | "needs-input"      | carries `code` reading exactly `needs-input`                   |
      | the session was revived by a resume     | "resumed"          | carries `code` reading exactly `resumed`                       |
      | a code this build has never heard of    | "some-future-code" | carries `code` reading exactly `some-future-code`              |
      | nothing to refine — the normal case     | null               | has NO `code` key at all                                       |
      | a writer that stored an empty string    | ""                 | has NO `code` key at all                                       |
      | a non-string a hand-written row left    | 42                 | has NO `code` key at all                                       |
      | whitespace only                         | " "                | carries `code` reading exactly `" "`                           |
    # ROWS 2 AND 3 ARE THE ANTI-FILTER PROOF and they are why this table exists.
    # `code` is NOT a `needs-input` flag: `"resumed"` is written by production
    # today (mesh-worker-execution.mjs:3077, :3140, :3148). A projection that
    # copies only the one word it was told about would pass row 1 and fail these
    # two, and would silently become a second vocabulary authority on the wire.
    # ROW 7 IS DELIBERATE AND IS NOT A TYPO. The guard is length-based because
    # `sessionId`'s is (`typeof === "string" && length > 0`), and this story does
    # not invent a trimming rule its sibling key does not have. If the architect
    # wants whitespace normalised, that is ONE rule for BOTH keys in a separate
    # change — routed here, not smuggled in.
    # ROWS 5 AND 6 ARE THE ONES THAT KEEP A SHIPPED GATE GREEN
    # (test/fleet-terminal-view-surface.test.mjs:386).

  # SCENARIO 4 — THE DYNAMIC. "Absent, not false" across the CLEAR, not merely at
  # rest. This is the scenario the control node's own comment
  # (control-stream-server.mjs:346-351) demands and the one a static fixture test
  # would never reach.
  Scenario Outline: the wire key appears when the agent blocks and DISAPPEARS when the human answers
    Given an assignment already reported `running` with code `needs-input`
    When the worker sends a further status frame <frame>
    And the fleet status payload is re-shaped from the same store
    Then the projected row <outcome>

    Examples:
      | case                            | frame                                     | outcome                                              |
      | the human answered              | `running` with NO `code` key on the frame | has NO `code` key at all — the column was cleared    |
      | the agent blocked again         | `running` with code `needs-input`         | carries `code` reading exactly `needs-input`         |
      | the session was resumed instead | `running` with code `resumed`             | carries `code` reading exactly `resumed`             |
    # A code-less frame CLEARING the column is DELIBERATE and unlike
    # `runId`/`sessionId`'s absent-is-not-a-clear: the code names the CURRENT
    # posture of the session, not a captured fact. If the wire key survived the
    # clear, the fleet would report a human still being waited on after they
    # answered — a worse lie than showing nothing.

  # SCENARIO 5 — THE ADDITIVE-CHANGE REGRESSION. Adding an optional key must not
  # make an attachment appear where none existed.
  Scenario: nothing is attached where nothing was attached before
    Given an item with no assignment at all and a node holding no assignments
    When the fleet status payload is shaped
    Then that item row has no `assignment` key at all
    And that node row has no `assignments` key at all
    And an item whose assignment carries no code still HAS its `assignment` key — the ATTACHMENT is unconditional, only the `code` KEY inside it is conditional

  # SCENARIO 6 — THE BROWSER'S HALF. A wire field no type admits is a field the
  # next milestone reads and cannot compile against; a type that lags the wire is
  # the defect `acd-session-entry-frozen-wire` already exists for on the presence
  # entry.
  Scenario: the browser's own type admits the field, and the typed UI build stays green
    Then `ui/src/fleet/api.ts`'s `WorkAssignment` declares `code` as an OPTIONAL string member, appended AFTER `sessionId`
    And every pre-existing member of that type keeps its name, its type and its position
    And `code` is NOT declared `string | null` — the wire OMITS the key rather than shipping a null, so the type must say exactly what `sessionId` says
    And the typed UI build over `ui/` exits zero
    # This story adds NO reader. `grep -rn "needs-input" ui/src` returns nothing
    # today and may still return nothing when this lands — the rendering is story
    # 05's, and shipping a chip here would put a second author on a vocabulary
    # DESIGN deliberately gave one home.
