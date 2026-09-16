<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 50/04, LANE C part 2 (DESIGN §The state machine, §The failure map,
# §DG-50-2, §DG-50-3; ADR-008 decisions 1, 5 and 7): what the operator is told between
# clicking "Start session" and a terminal existing — or not existing.
#
# WHAT IT IS DRIVEN THROUGH. The state machine, the two deadlines and the code→language map
# live in the framework-free launcher module under `ui/src/home/` (ADR-008 decision 10),
# driven by an injected clock and injected responses. DESIGN's failure map alone is a
# thirteen-row table, which is why it must be a MODULE and not a component: "a rule that can
# only be exercised through a component is a rule with no test" (feed-axis.mjs:6-9).
#
# THE FACTS THIS MACHINE WAITS ON, READ AT SOURCE:
#  - `POST /api/mesh/session` answers optimistically. It mints `sessionId` control-side with
#    `randomUUID()` and returns `200 { ok:true, sessionId, nodeId, workspaceId }` BEFORE any
#    worker has been reached (mesh-ui-serve.mjs:770-797). **A 200 proves the dispatch was
#    accepted; it never proves a session exists.**
#  - A coded refusal's body is `{ ok:false, error, code, path? }` (sendApiError,
#    mesh-ui-serve.mjs:1162-1165) — so a control-side refusal DOES carry a server sentence.
#  - The worker-side outcomes arrive on ADR-008's lane as `{ state, code, at }` from
#    `GET /api/mesh/session-outcome`, and the ack frame they are built from is exactly
#    `{ kind, sessionId, nodeId, ok }` + `code` (mesh-session-spawn-directive.mjs:22-26).
#    **There is NO message on that path.** The worker's own sentence goes to the worker's
#    local log (mesh-session-spawn-handler.mjs:210-213) and never crosses the wire. So
#    DESIGN §DG-50-3 rule 3's "the server's own sentence … carried verbatim" is satisfiable
#    for the POST's own codes and NOT for the four worker codes or for
#    `spawn-outcome-lane-unavailable`. This file states that split rather than pretending
#    otherwise, and it is routed as a finding.
#  - `HOME_POLL_MS` = 5000 (page-state.mjs:357). Both deadlines are expressed in it.
#    `ui/src/home/` may import nothing from `ui/src/fleet/` (49/ADR-001, gated), so
#    `POLL_MS`/`ASSIGN_TIMEOUT_MS` are NOT reachable and the home declares its own.
#  - The grid renders `status.sessions[]` and nothing else (grid.mjs:141-164). The launcher
#    cannot put a tile on screen, and must not try.
#  - Every code below was verified against the shipped source at this refine:
#    `invalid-body` (mesh-ui-serve.mjs:644,656,660,684,688,700), `workspace-not-found`
#    (:712), `workspace-not-local` (:720), `control-identity-unknown` (:727-736),
#    `session-target-not-connected` (:752), `session-dispatch-unavailable` (:761-769),
#    `session-dispatch-failed` (:794), `session-route-failed` (:805),
#    `cross-origin-refused` (:631), `invalid-content-type` (:636);
#    `session-repo-unavailable` (mesh-session-spawn-handler.mjs:227,244,260,270,278),
#    `session-already-active` (:235), `session-worktree-failed` (:290),
#    `session-spawn-failed` (:311,315,340). **No code in this file is invented.**
#
# ONE MEASURED TRAP THE MAP MUST SURVIVE: the catch-all is spelled
# `sendApiError(response, error.status ?? 500, error.message, error.code ?? "session-route-failed")`
# (:805) — so a thrown fs/store error that carries its OWN `code` surfaces THAT code (e.g.
# `ENOENT`) with a 500. An unmapped code is therefore REACHABLE in production, not
# hypothetical, which is what makes DG-50-3 rule 4 a behaviour rather than a courtesy.
#
# NOT ASSERTED HERE, each with an owner:
#  - the options, the groups and the empty cases — task 01.
#  - the lane the outcome travels on — task 00.
#  - tone, tint, wrap, `role="status"`, the 390 bar and the panel's geometry — DESIGN
#    §S1/§S2/§S3 and the `@uat` visual review.
#
# ISOLATION. Pure module, injected clock, injected fetch. `node:test` with a fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)`, focused runs only; no scenario binds a port. Registered in
# `scripts/test.mjs` (`acd-test-suite-registration`).

@executable @ui @work-stream @design
Feature: the operator-visible state machine — a promise that is held, bounded, and answered in words
  In order that a dispatch never ends in an indefinite spinner, a silent no-op, or a raw code, and that a session which never appears is a stated reason rather than an empty grid slot
  the launcher holds the 200 as a named `dispatched` state resolved by the GRID, bounds the wait with TWO different numbers waiting on TWO different facts, clears "no answer" when a late session appears, mints a NEW id on every retry, and renders every coded refusal as operator-facing language that names the machine the fault is about

  Background:
    Given the launcher's framework-free decision module under `ui/src/home/`, driven with an injected clock and injected route answers
    And "the state" means the state value the module returns, and "the line" means the outcome region's rendered sentence
    And "the title" means the long-form text the module attaches to that line
    And the grid is fed from `status.sessions[]` and the module never adds a row to it

  # ═══ THE STATES ══════════════════════════════════════════════════════════════════════

  Scenario: the state set is closed and every member is one of DESIGN's own rows
    When I read the module's declared state set
    Then it is exactly `rest`, `open`, `dispatching`, `dispatched`, `started`, `refused`, `failed`, `no answer`
    And the module returns nothing outside that set for any input driven anywhere in this file
    And `refused` and `no answer` are different values that never substitute for one another
    # A QA RULING, FLAGGED. DESIGN §The state machine's heading says "Seven states" while its
    # own table and its own diagram enumerate EIGHT rows/nodes. The TABLE governs here — each
    # of the eight carries distinct copy, distinct field behaviour and a distinct hold — and
    # the heading's count is routed to the designer as a miscount, not resolved by dropping a
    # row that has observable behaviour.

  Scenario: the happy path is held, then handed to the grid, then let go
    Given an open panel with n1 and ws-aof chosen
    When the operator submits
    Then the state is `dispatching` and the chosen values are frozen rather than cleared
    And when the route answers `200 { ok: true, sessionId: "s-1" }` the state becomes `dispatched`
    And the line names the node and states what is being waited on
    And the submit action is disabled while `dispatched` holds
    And when a later poll's `sessions[]` carries a row whose `sessionId` is "s-1" the state becomes `started`
    And `started` holds for exactly one poll interval and then returns to `rest` with nothing left over
    And at no point did the module contribute a row, a tile or a placeholder to the grid

  # RAIL 1, AS ARITHMETIC. ADR-008 decision 7 is explicit: the GRID is the success
  # authority and the lane is the failure authority.
  Scenario: an `ok: true` outcome corroborates the dispatch but does not end the wait
    Given a `dispatched` state holding on sessionId "s-1"
    When the outcome route answers `state: "started"` and no session has appeared in `sessions[]`
    Then the state is STILL `dispatched` — the launcher does not claim a session the grid does not show
    And when the session then appears in `sessions[]` the state becomes `started`
    # DESIGN's table row for `dispatched` reads "until the session appears, AN ACK ARRIVES, or
    # the outcome window expires", which taken literally would end the hold on `ok:true`.
    # ADR-008 decision 7 rules the other way and gives the reason; this file follows the ADR
    # and the contradiction is routed to the designer.

  # ═══ TWO DEADLINES, TWO FACTS, TWO NUMBERS ═══════════════════════════════════════════

  Scenario: the deadlines are derived from the home's own cadence and are not one number
    When I read the module's two deadlines
    Then the POST deadline is exactly 2 × `HOME_POLL_MS` (10000ms) and the outcome window is exactly 3 × `HOME_POLL_MS` (15000ms)
    And both are expressed in terms of `HOME_POLL_MS` — neither is a second literal `10000`, `15000`, `10` or `15` anywhere in `ui/src/home/`
    And neither is imported from `ui/src/fleet/`
    And the outcome poll's own cadence is likewise derived from `HOME_POLL_MS`, lives in ONE home, and stops when the window closes
    # THE WINDOW IS THREE AND NOT TWO BECAUSE OF WHAT IT WAITS ON: the worker's presence
    # ticker (~5s) plus the page poll (5s) plus one poll of margin. A launched session reaches
    # the grid in ~10-12s worst case, so a two-interval window would render a SUCCESSFUL
    # spawn as a failure.

  Scenario Outline: each deadline answers for the fact it waits on, and neither answers for the other
    Given an open panel with n1 and ws-aof chosen
    When the operator submits and <what happens>
    Then at <at> the state is <state>
    And the line is <the line's subject>
    And no request was aborted and no request was re-sent by the module itself

    Examples:
      | case                                          | what happens                                                    | at     | state      | the line's subject          |
      | the POST hangs                                | the route never answers                                         | 9999ms | dispatching| (nothing — the action is the state) |
      | the POST hangs past its deadline              | the route never answers                                         | 10000ms| no answer  | no answer                   |
      | the POST answers late, after its deadline     | the route answers 200 at 12000ms                                | 12000ms| no answer  | no answer                   |
      | a 200, then nothing                           | 200 at 200ms, no session, no outcome                            | 15000ms after the 200 | no answer | no answer |
      | a 200, then the session appears               | 200 at 200ms, the session appears at 11000ms                    | 11000ms| started    | started                     |
      | a 200, then a worker refusal                  | 200 at 200ms, the outcome route answers failed at 2000ms        | 2000ms | failed     | the coded line              |
      | a 200, then a synthesised refusal             | 200 at 200ms, outcome failed/`session-target-not-connected` at 900ms | 900ms | failed | the coded line              |
      | a coded 4xx                                   | the route answers 404 at 200ms                                  | 200ms  | refused    | the coded line              |
    # THE POST DEADLINE ABANDONS THE WAIT, NEVER THE CALL — no abort and no retry — because a
    # possibly-successful server-side mint must not be made ambiguous. Row 3 is the proof: a
    # late 200 does not resurrect `dispatched`, and the module does not fire a second POST.

  # ═══ A LATE ARRIVAL WINS ═════════════════════════════════════════════════════════════

  Scenario: a session that appears after the window clears the "no answer" line
    Given a `no answer` state holding the minted sessionId "s-1"
    When a later poll's `sessions[]` carries a row whose `sessionId` is "s-1"
    Then the line is cleared and the state moves to `started`, then decays to `rest`
    And the launcher never contradicts a tile that is on screen
    And the page needed no operator action to notice — it re-polls on its own cadence and the grid resolves late arrivals by itself

  # ═══ A NEW ID ON EVERY RETRY ═════════════════════════════════════════════════════════

  Scenario: re-submission is permitted from every terminal state and always mints a new id
    Given a terminal state of `refused`, `failed` or `no answer`, each in turn
    When the operator submits again
    Then a fresh `POST /api/mesh/session` is issued and the answer's `sessionId` differs from the previous one
    And the module waits on the NEW tuple — the outcome route is polled with the new sessionId, never the stranded one
    And the stranded id is never rendered as a live thing: it appears only in the title
    And a re-click into a projection that has not caught up simply draws an ordinary coded refusal, which is a correct answer rather than a new failure mode

  # ═══ THE FAILURE MAP — ONE ROW PER CODE ══════════════════════════════════════════════

  Scenario Outline: every coded refusal renders operator-facing language that names its machine
    Given a dispatch for node "n1" and workspace "ws-aof"
    When <the phase> answers with code <code>
    Then the state is <state>
    And the line is <the operator reads>, with <the next action> appended when one exists
    And the line names <the machine>
    And the raw code never appears alone as the message, and never renders as a blank line or a silent no-op
    And the title carries the raw code <code>

    Examples: control-side — the POST answered, and its body carries a server sentence
      | code                         | the phase | state   | the machine | the operator reads                                            | the next action                        |
      | invalid-body                 | the POST  | refused | this machine| incomplete request — this build and the route disagree        | —                                      |
      | workspace-not-found          | the POST  | refused | this machine| ws-aof is not in the mesh any more                            | · reopen the picker to refresh         |
      | workspace-not-local          | the POST  | refused | this machine| ws-aof is not checked out on this machine                     | · pick a repo this machine holds       |
      | control-identity-unknown     | the POST  | refused | this machine| this machine has no mesh identity yet                         | —                                      |
      | session-target-not-connected | the POST  | refused | n1          | n1 is not connected to this machine                           | · it must be online to open a session  |
      | session-dispatch-unavailable | the POST  | refused | this machine| this machine cannot reach its workers — no relay is configured| —                                      |
      | session-dispatch-failed      | the POST  | refused | this machine| the request never left this machine                           | · the relay is not answering           |
      | session-route-failed         | the POST  | refused | this machine| this machine could not answer                                 | · the daemon log has the fault         |
      | cross-origin-refused         | the POST  | refused | this machine| this page was refused by its own daemon                       | —                                      |
      | invalid-content-type         | the POST  | refused | this machine| this page was refused by its own daemon                       | —                                      |

    Examples: worker-side — the 200 was already sent; these arrive on the outcome lane
      | code                     | the phase     | state  | the machine | the operator reads                        | the next action                          |
      | session-repo-unavailable | the lane      | failed | n1          | n1 does not have ws-aof                   | · pick a node that carries it            |
      | session-worktree-failed  | the lane      | failed | n1          | n1 could not make a worktree for 50/04    | · start without an item to open the repo root |
      | session-spawn-failed     | the lane      | failed | n1          | n1 could not open a terminal              | · the node's own log has the fault       |
      | session-already-active   | the lane      | failed | n1          | that session is already open on n1        | · it is in the grid                      |

    Examples: the lane itself, and the code nobody wrote a row for
      | code                            | the phase | state   | the machine | the operator reads                        | the next action |
      | spawn-outcome-lane-unavailable  | the lane  | (see the note) | this machine | (the module's own sentence for a lane that cannot hear) | — |
      | ENOENT (a 500 catch-all's own code) | the POST | refused | this machine | (the server's own sentence, kept verbatim) | — |
    # THREE THINGS THIS TABLE MAKES EXPLICIT, EACH MEASURED:
    #  (1) `session-target-not-connected` is the SAME code on BOTH phases — minted pre-200 by
    #      the route's presence check and synthesised post-200 by ADR-008 decision 3 — so the
    #      operator reads the same true sentence whichever phase caught it. It is the one row
    #      whose `state` differs by phase (`refused` pre-200, `failed` post-200) while the
    #      words do not.
    #  (2) `spawn-outcome-lane-unavailable` is NOT in DESIGN's map and its state is unruled:
    #      it says "this control node cannot hear answers at all", which is neither a refusal
    #      of the dispatch nor a worker failure. Whatever the build chooses, it may NOT render
    #      as blank and may NOT be mistaken for `no answer` about the SESSION. Routed to the
    #      designer with K50-12's problem below.
    #  (3) THE UNMAPPED-CODE ROW IS REACHABLE, NOT HYPOTHETICAL (the `error.code ?? …`
    #      catch-all at :805). DG-50-3 rule 4 governs: an unknown code keeps the server's own
    #      sentence rather than being re-worded on a guess, and it still renders its code.

  Scenario: the title carries what the answer actually carried, and never invents a sentence
    Given a control-side refusal whose body is `{ ok:false, error: "Workspace \"ws-aof\" is not in the mesh projection.", code: "workspace-not-found" }`
    And a worker-side failure whose lane answer is `{ state: "failed", code: "session-repo-unavailable", at: "…" }`
    When I read each title
    Then the control-side title carries the server's sentence VERBATIM plus the raw code
    And the worker-side title carries the raw code and the module's own mapped sentence — because no sentence crossed the wire to carry
    And no title fabricates a server sentence that was never sent
    # MEASURED, AND IT IS A REAL SPLIT IN DESIGN §DG-50-3 rule 3 / §S3's "the `title` always
    # carries the server's own sentence". True for the POST's coded body; FALSE for the four
    # worker codes and the lane code, because `buildSessionSpawnAckFrame` carries no message
    # field and the outcome route answers `{ state, code, at }`. Routed as a finding: either
    # the ack grows a message (an ADR-002 wire change) or DESIGN's rule is narrowed to the
    # phase that has one. This file locks the honest behaviour in the meantime.

  Scenario: an idempotency refusal is not painted as the operator's fault
    Given a `failed` state carrying `session-already-active` for sessionId "s-1"
    When the grid's `sessions[]` holds a row for "s-1"
    Then the line says the session is already open on that node and points at the grid
    And the launcher says it once and stops speaking about that session — the tile is the record from that moment on
    And the module does not re-dispatch, does not clear the tile and does not contradict it

  # ═══ THE TWO WORDS THAT MUST NOT BLUR ════════════════════════════════════════════════

  Scenario: silence and refusal are different facts, and neither reads as the other
    Given a dispatch that timed out with no answer, and a dispatch refused with a code, each in turn
    Then the timed-out one reports `no answer` and never `failed`, and its long form states that the request may still have succeeded
    And the refused one reports a stated reason and never `no answer`
    And the `no answer` outcome is not marked as a fault — nothing failed and nothing was confirmed
    And neither outcome is distinguished from the other by colour alone: the WORDS state the outcome
    # K50-12's LONG FORM IS AMBIGUOUS AFTER ADR-008 AND THIS IS THE SCENARIO THAT SURFACES IT.
    # It asserts "…and the node has reported nothing", which is FALSE in the case where the
    # lane delivered `ok: true` and no session ever appeared. So this file asserts only what
    # is true in both cases — the state is `no answer`, the outcome is unknown rather than
    # negative — and requires the module to keep the two expiry CAUSES distinguishable in its
    # returned value, so the designer can render the distinction without a wire change. The
    # copy itself is the designer's and is routed.

  # ═══ THE PANEL'S DISMISSAL NEVER CANCELS A SPAWN ═════════════════════════════════════

  Scenario Outline: closing the panel abandons the form, never the dispatch
    Given a state of <state> for sessionId "s-1"
    When the panel is dismissed
    Then the module still holds <state> and still resolves it on its own deadlines
    And the trigger carries the unresolved outcome in its compact form: <compact form>
    And `started` NEVER appears in that compact form — it decays into the grid

    Examples:
      | case                     | state       | compact form  |
      | mid-flight               | dispatching | starting…     |
      | waiting for the session  | dispatched  | starting…     |
      | a worker failure         | failed      | failed        |
      | the window expired       | no answer   | no answer     |
      | a successful spawn       | started     | (nothing)     |
      | nothing in flight        | rest        | (nothing)     |

  # ═══ TOTALITY ════════════════════════════════════════════════════════════════════════

  Scenario Outline: every answer the route can give resolves to a state, and none throws
    Given a dispatch in flight
    When the route answers <the answer>
    Then the state is one of the declared eight and the line is a non-empty sentence unless the state is one that renders nothing
    And no error is thrown and no state is left un-rendered

    Examples:
      | case                                | the answer                                                   |
      | a 200 with no sessionId             | `200 { ok: true }`                                           |
      | a 200 with a null sessionId         | `200 { ok: true, sessionId: null }`                          |
      | a coded body with no code           | `409 { ok: false, error: "…" }`                              |
      | a coded body with no error sentence | `503 { ok: false, code: "session-dispatch-failed" }`         |
      | a body that will not parse          | `500` with an HTML error page                                |
      | a network failure                   | the fetch rejects                                            |
      | an outcome answer with no state     | `200 { ok: true, nodeId: "n1", sessionId: "s-1" }`           |
      | an outcome state nobody declared    | `200 { … state: "queued" }`                                  |
    # ROWS 1-2 MATTER BECAUSE THE WHOLE MACHINE IS KEYED ON THE MINTED ID: a 200 with no
    # usable sessionId cannot be waited on, and pretending otherwise would hold `dispatched`
    # against a tuple that can never resolve. ROW 8 is the forward-compatibility row — an
    # unknown state from a newer daemon must not silently read as `started`.

  Examples: the state machine, as a case matrix a run can be checked against
    | subject              | the observable                                                             |
    | the state set        | exactly eight declared values; nothing outside it is ever returned         |
    | dispatching          | fields frozen, action labelled, no second indicator                        |
    | dispatched           | holds; the line names the node and what is awaited; no tile is minted      |
    | started              | fixed on the GRID, not on the ack; one poll hold; then rest                |
    | POST deadline        | 2 × HOME_POLL_MS; abandons the wait, not the call; no abort, no retry      |
    | outcome window       | 3 × HOME_POLL_MS; expiry is `no answer`, never `failed`                    |
    | late arrival         | clears `no answer`; the grid is the authority                              |
    | retry                | a NEW sessionId every time; the stranded id lives only in the title        |
    | 14 coded rows        | a stated sentence, the machine named, the code in the title, never blank   |
    | an unmapped code     | the server's sentence kept; the code still shown; never a vanished failure |
    | dismissal            | abandons the form, never the dispatch; the trigger carries the residue     |
