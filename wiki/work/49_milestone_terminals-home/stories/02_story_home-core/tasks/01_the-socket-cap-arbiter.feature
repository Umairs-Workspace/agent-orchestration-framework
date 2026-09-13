<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/02, THE SOCKET-CAP ARBITER: ONE pure function over the WHOLE
# row set that decides which panes hold a live socket, so the count SPEC calls "explicit
# and configured, not emergent" is a value a test can read rather than a property of
# whichever React child committed first.
#
# THE SEAM, READ AT SOURCE, AND THE FIRST THING TO SAY IS WHAT THE CONSTRAINT IS NOT.
#  - IT IS NOT A BROWSER LIMIT. RESEARCH §Q3 measured it at this refine: one headless
#    Chromium page held 255 concurrent WebSockets to ONE origin, the 256th refused, with
#    the server independently reporting `peak=255`. The commonly-cited "6 per origin" is
#    the HTTP/1.1 per-host cap and does not govern WebSocket upgrades — RESEARCH keeps
#    its own first-pass claim struck through rather than deleted. Every `mirror` pane
#    dials the SAME fleet origin, so the platform is ~16x any grid an operator reads. A
#    build that re-derives this number from a browser ceiling has got it wrong, and so
#    has any scenario written against one.
#  - IT IS NOT THE SERVER EITHER. `serveMeshUi` creates ONE
#    `WebSocketServer({ noServer: true })` (src/mesh-ui-serve.mjs:672) and accepts every
#    valid tuple at :706 with no admission cap; the `ws.send(bytes)` at :735 is
#    unconditional, with no `bufferedAmount` gate. Nothing upstream will refuse for us.
#  - WHAT IS BINDING is the mirror's own cost, and it is in ONE file this build cannot
#    import. `src/mesh-terminal-mirror.mjs` keeps a bounded per-tuple tail and REPLAYS
#    it to each new subscriber BEFORE live frames (:20-33, the revision forced by the
#    live two-machine soak F-38.06g), at `MAX_TAIL_BYTES_PER_KEY = 256 * 1024` over at
#    most `MAX_TAIL_KEYS = 64` tuples (:58-59), LRU-evicted head-first (:96-99). Past 64
#    distinct tuples the control drops the least-recently-fed tail — and a pane whose
#    tail was evicted is byte-indistinguishable, from the browser, from a genuinely
#    silent worker.
#  - SUBSCRIPTION IS ALREADY FIRST-CLASS AND IS NOT REBUILT HERE:
#    `subscribed: input.subscribed !== false` (ui/src/terminal/host-model.mjs:217),
#    `terminalSessionIdentity` returning `null` for an unsubscribed pane (:246), and the
#    worded `Watch terminal →` / `Hide terminal` toggle already declaring
#    `COST_SUBSCRIPTION` with the honest note that hide closes the socket and a fresh
#    subscribe opens one onto an EMPTY pane (:281-282).
#
# THE CROSS-BUILD TIE, AND WHY IT IS A GATE RATHER THAN AN IMPORT. `ui/src/**` is
# bundled by vite for a browser and `src/**` runs under node; there is no runtime at
# which one reads the other's constant. The only place the pair can be compared is a
# test that reads BOTH FILES AS TEXT — the technique
# test/arch/acd-terminal-mirror-geometry-pinned.test.mjs:50-91 invented for exactly this
# class of pair (it extracts each side's literal by regex, asserts the descriptor
# genuinely USES the constant rather than carrying a second copy, and then compares the
# numbers). `acd-home-socket-cap-single-arbiter` is that technique's second instance.
#
# NOT ASSERTED HERE, each with an owner:
#  - the tile's FORM when it is held: the centred line, the `<N> live panes already ·
#    hide one to watch this` copy, whether the worded toggle is present, and that none
#    of it reads as an error — DESIGN DG-49-4, delivered by STORIES 49/04 and 49/05 with
#    the designer's `@uat` row. This story renders nothing.
#  - the VALUE 16 and its justification — ADR-006's, argued from the replay burst, the
#    64-tuple budget and DOM-renderer main-thread contention. This file pins that the
#    number is an ARGUMENT, is in ONE place, and is tied to `MAX_TAIL_KEYS`; it does not
#    re-argue the number.
#  - the structural clauses: that `MAX_LIVE_PANES` is declared in exactly one module and
#    that no component holds a cap literal — `acd-home-socket-cap-single-arbiter`. The
#    scenarios below DRIVE that shipped detector rather than restating it in Gherkin.
#  - first-grid-open performance against a real multi-session fleet — ADR-006 routes it
#    to a `@manual` lane, and it is worth more there than any headless assertion.
#
# THE TRAPS:
#  1. A per-pane "am I allowed" check. N independent decisions can disagree, and the
#     count becomes emergent again — the thing SPEC forbids in terms.
#  2. A stateless arbiter. See the QA ruling on the no-auto-demote scenario: an arbiter
#     over (rows, cap, intents) ALONE cannot honour "nothing auto-demotes", because a
#     newly-arrived higher-priority row displaces an incumbent silently.
#  3. Reading the cap from module scope instead of the argument. It passes every
#     scenario that uses the shipped number and fails the moment a cap of 4 is handed in.
#  4. A `.tsx` holding `slice(0, 16)`. The number would then live in two places, one of
#     which no gate reads.
#  5. Treating an over-cap pane as a refusal, an error or an `unavailable` — that block
#     means the ORIGIN could not be resolved, which is false here (DG-49-4, DG-49-10).
#
# ISOLATION. The arbiter is pure; the detector reads files as TEXT. No store, no server,
# no port — :4181 and :4182 are held by the live daemons and no scenario binds anything.
# A fresh `AOF_GLOBAL_HOME=$(mktemp -d)` on every run regardless (guard-hook enforced).
# Focused runs only, never the full suite. The suite is registered in scripts/test.mjs
# (`acd-test-suite-registration`).
#
# PLANTS GO TO THE SHIPPED DETECTOR, AND THEY ARE SYNTHESIZED TEXT. m46's mutation
# review found a plant fed to a locally re-implemented copy of `affordanceFormViolations`,
# so the real detector was never once driven to a violation. Every plant below is handed
# to the exported violations function of `acd-home-socket-cap-single-arbiter` itself, as
# hand-written source TEXT — never by editing a real file, never by string-replacing one
# — and every plant asserts it LANDED (planted !== clean) before the detector is asked.

@executable @ui @work @design
Feature: the live-socket ceiling — one pure, set-valued arbiter over the whole row set, with the cap as an argument and the tie to the mirror's tail budget held across the build boundary
  In order that the number of live terminal sockets is a decision I can read, argue with and test, rather than a number that emerges from mounting order
  the home arbitrates subscription ONCE over every row, never exceeds the configured cap, leaves an over-cap pane listed and identified and unsubscribed rather than refused or hidden, demotes nothing on its own, and fails CI if the cap ever rises past the mirror's own `MAX_TAIL_KEYS`

  Background:
    Given the pure arbiter under `ui/src/home/`, called with an ORDERED row set, a cap, and the operator's focus and watch intents as ARGUMENTS
    And rows shaped exactly as the session index serves them, ordered as it hands them over
    And "the subscribed set" means the arbiter's returned set of rows holding a live socket, and "a decision" means the arbiter's returned per-row answer
    And no scenario constructs a socket, a component or a DOM node

  # THE HEADLINE. One call, one answer, over everything.
  Scenario: twenty rows and a cap of sixteen — one function decides, and every row is still there
    Given 20 ordered rows and a cap of 16
    When I call the arbiter once
    Then the subscribed set has exactly 16 members
    And the arbiter returned a decision for all 20 rows — nothing was dropped, filtered or hidden
    And the 4 rows outside the subscribed set carry `subscribed: false` and name the cap as their cause
    And the returned decisions are in the same order as the rows handed in — the arbiter decides subscription and re-orders nothing
    And calling the arbiter a second time with the identical arguments returns a deep-equal answer that is not the same object identity

  # THE CAP IS AN ARGUMENT. This is the scenario that fails a build reading a module
  # constant, and it is why the arbiter is drivable at every value including 0 and 1.
  Scenario Outline: the subscribed set is exactly min(cap, rows), at every cap the arbiter is handed
    Given <rows> ordered rows and a cap of <cap>
    When I call the arbiter
    Then the subscribed set has exactly <subscribed> members
    And the number of decisions returned is <rows>
    And no error is thrown

    Examples: the boundary around the configured number
      | case                            | rows | cap | subscribed |
      | an empty grid                   | 0    | 16  | 0          |
      | one row, room to spare          | 1    | 16  | 1          |
      | one under the cap               | 15   | 16  | 15         |
      | exactly at the cap              | 16   | 16  | 16         |
      | one over the cap                | 17   | 16  | 16         |
      | four full rotations of the cap  | 64   | 16  | 16         |
      | the mirror's whole tail budget  | 65   | 16  | 16         |

    Examples: the cap is an argument, so the degenerate values are reachable and must answer
      | case                            | rows | cap | subscribed |
      | a cap of zero                   | 5    | 0   | 0          |
      | a cap of one                    | 5    | 1   | 1          |
      | a cap of one, one row           | 1    | 1   | 1          |
      | a cap of one, no rows           | 0    | 1   | 0          |
      | a cap smaller than the shipped  | 20   | 4   | 4          |
      | a cap larger than the shipped   | 20   | 40  | 20         |

    Examples: a malformed cap fails CLOSED — an unreadable ceiling is not an absent one
      | case                            | rows | cap       | subscribed |
      | a negative cap                  | 5    | -1        | 0          |
      | a fractional cap                | 5    | 2.5       | 2          |
      | a numeric string                | 5    | "4"       | 0          |
      | NaN                             | 5    | NaN       | 0          |
      | Infinity                        | 5    | Infinity  | 0          |
      | absent entirely                 | 5    | (omitted) | 0          |
      | null                            | 5    | null      | 0          |
    # THE MALFORMED BLOCK IS A QA CALL AND IT FAILS CLOSED DELIBERATELY. The tempting
    # alternative — fall back to the module's own `MAX_LIVE_PANES` — is exactly the
    # spelling that makes the "the cap is an argument" scenario above unprovable, because
    # every malformed call would then quietly produce the shipped number and look right.
    # Zero live sockets is a visible, recoverable, honest failure; a silent fallback to a
    # module constant is the emergent count SPEC forbids, wearing an argument's clothes.
    # `2.5 -> 2` is the one coercion allowed and it is a truncation, never a round: a cap
    # is a count of sockets and half a socket is not one.

  # PRIORITY, AND IT IS NOT ARRIVAL ORDER. Mounting order is the nondeterminism m48
  # removed one layer down; re-introducing it here would make which panes stream depend
  # on which React child committed first.
  Scenario: who gets the sockets is focus, then explicit watches, then the order the rows were handed in
    Given 20 ordered rows, a cap of 3, a focused row that sits 19th in the handed order, and two explicit watches sitting 12th and 20th
    When I call the arbiter
    Then the subscribed set is exactly the focused row and the two explicitly watched rows
    And the first three rows in the handed order are NOT subscribed — an explicit intent outranks position
    And calling the arbiter again with the same rows supplied in a deliberately scrambled array yields the same subscribed SET of tuples
    And the arbiter never sorted, mutated or copied-with-reordering the row array it was handed — its returned decisions follow the handed order exactly
    # The arbiter consumes an ORDERED row set; it does not produce one. That keeps the
    # sort key a single question owned by the layout composer (task 02) rather than a
    # second comparison here — and it is why this file pins priority, not sorting.
    # FLAGGED FOR THE ARCHITECT: ADR-006 names the fallback tier as "the index's own
    # deterministic (nodeId, sessionId) ascending order" while DESIGN §The focus model
    # rule 7 names "nodeId, then repo, then sessionId". They differ. Consuming the handed
    # order makes the arbiter correct under either, and routes the disagreement to the
    # one place it belongs.

  # UNSUBSCRIBED, NOT REFUSED — and the two held cases are DIFFERENT, because the surface
  # has to tell them apart to know whether it may offer the toggle (DG-49-4).
  Scenario Outline: an unsubscribed pane says why, and a pane held by the cap is not the same as a pane the operator hid
    Given <the situation>
    When I call the arbiter
    Then that row's decision carries `subscribed: false`
    And its stated cause is <cause>
    And the decision reports whether a live slot is free as <slot free>
    And the decision carries the configured cap as a VALUE, so no render site types the number into its copy
    And the decision carries nothing shaped like an error: no failure cause, no `unavailable` cause, no recovery command
    And the row is still present in the returned decisions, in its handed position, carrying its identity — it is listed, not hidden

    Examples:
      | case                                  | the situation                                                       | cause      | slot free |
      | held because the grid is at its cap   | 20 rows, a cap of 16, the 17th row                                  | at-cap     | no        |
      | hidden by the operator, room to spare | 5 rows, a cap of 16, one row the operator explicitly hid            | hidden     | yes       |
      | hidden by the operator, grid at cap   | 20 rows, a cap of 16, a hidden row while 16 others are subscribed   | hidden     | no        |
    # The `slot free` column is what DG-49-4 needs and what a naive boolean
    # `subscribed:false` cannot give: with a slot free the tile offers `Watch terminal →`;
    # at the cap the toggle is absent and the line names the recovery instead. Two
    # different tiles, one arbiter, and the distinction must be a returned value or the
    # render site will re-derive it — sixteen times.

  # NOTHING AUTO-DEMOTES. The whole reason the cap is safe: hide closes the socket
  # (host-model.mjs:281), the mirror's replay is BOUNDED, and a re-watch does not restore
  # what was evicted — so a silent demotion takes scrollback the product cannot give back.
  Scenario Outline: a poll never takes a socket away from a pane that is still in the row set
    Given a first poll of 16 rows with a cap of 16, all 16 subscribed
    And a second poll in which <the delta>
    When I call the arbiter for the second poll, handing it the currently-subscribed set
    Then every row that was subscribed in the first poll and is still in the row set is STILL subscribed
    And nothing was unsubscribed by the arbiter's own choice
    And the subscribed set still has at most 16 members

    Examples:
      | case                                      | the delta                                                        |
      | a new session sorts above every incumbent | one row arrives whose tuple sorts first in the handed order      |
      | a new session sorts below every incumbent | one row arrives whose tuple sorts last                           |
      | ten new sessions arrive at once           | ten rows arrive, scattered through the order                     |
      | a session's work item appears             | an incumbent's `workItem` goes from null to a real pair          |
      | a session's work item disappears          | an incumbent's `workItem` goes from a real pair to null          |
      | a session's ping time moves               | every incumbent's `lastPingAt` advances                          |
      | the rows are handed in a different order  | the same 16 rows, deliberately scrambled                         |
      | a row leaves and a row arrives            | one incumbent leaves the index and one new row arrives           |
    # A QA RULING FLAGGED FOR THE ARCHITECT, and it is the sharpest thing in this file.
    # ADR-006 lists the arbiter's arguments as "the ordered row set, the cap and the
    # operator's focus/watch intents". Driven, that argument list CANNOT satisfy row 1:
    # with 16 incumbents at a cap of 16 and a new row that sorts first, a pure function of
    # (rows, cap, intents) must either subscribe the newcomer — silently unsubscribing an
    # incumbent whose scrollback is then unrecoverable, which DG-49-4 forbids in terms —
    # or refuse it, which is only expressible if the arbiter knows who is already
    # subscribed. So the CURRENTLY-SUBSCRIBED SET is a fourth argument, and the rule it
    # implements is: PRIORITY ALLOCATES FREE SLOTS; IT NEVER EVICTS. Row 8 is the pin that
    # makes it non-trivial — one slot genuinely frees up, and it goes to the newcomer.
    # Recorded here rather than assumed, because a build that reads ADR-006 literally
    # ships the silent-demotion defect and every scenario except this table stays green.

  # THE OPERATOR'S OWN REQUEST, AT THE CAP. The one case the two documents do not agree
  # on, pinned only where they DO agree.
  Scenario: watching a pane while the grid is at its cap is never answered with a silent nothing
    Given 20 rows, a cap of 16, 16 subscribed, and an explicit operator watch on an over-cap row
    When I call the arbiter
    Then the subscribed set still has at most 16 members — the cap is never exceeded, whatever the operator asks for
    And the answer is not silence: either the requested row is subscribed AND the arbiter names the exactly-one pane that stopped watching, or the request is declined AND the arbiter names the recovery the operator can take
    And in the first case exactly ONE pane changed, and it is the lowest-priority subscribed pane, and it is named in the result so the surface can say so
    And in neither case does any pane change without appearing in the result
    # A QA RULING FLAGGED FOR THE ARCHITECT AND THE PO — deliberately NOT settled here,
    # and it is a genuine contradiction between two binding documents rather than an
    # ambiguity:
    #   ADR-006: "WATCHING ONE OVER THE CAP EVICTS THE LOWEST-PRIORITY SUBSCRIBED PANE.
    #            The operator is never told 'no'; something else stops watching and says so."
    #   DESIGN DG-49-4: at the cap "the worded toggle is ABSENT — a control that cannot do
    #            its job is not offered" and "There is NO auto-demotion ... The exchange is
    #            the operator's to make, and the copy tells them how."
    # Under DESIGN the request in this scenario cannot be made from the UI at all; under
    # ADR-006 it is made and something is evicted. The scenario above pins the three
    # properties both readings share — the cap holds, nothing changes invisibly, and at
    # most one pane moves — and refuses to let the build's first guess become the
    # contract. Whichever way it resolves, the resolution is one line in this scenario.

  # THE CROSS-BUILD TIE, DRIVEN AT THE SHIPPED DETECTOR. Green on arrival is not the
  # question; whether it can go RED is.
  Scenario: on the tree as it stands, the gate is quiet and provably read both builds
    Given the SHIPPED `acd-home-socket-cap-single-arbiter` violations function
    When I run it over the real `ui/src/home/` module and the real `src/mesh-terminal-mirror.mjs`
    Then it returns no violations
    And it reports the two numbers it actually read — the client cap and the mirror's `MAX_TAIL_KEYS`
    And the mirror number it reports is exactly the 64 that `src/mesh-terminal-mirror.mjs:59` declares
    And the client cap it reports is a positive integer no greater than that mirror number
    And it reports that the arbiter's cap argument is fed from that declared constant at the one call site that supplies it, rather than from a second copy of the number
    # The "reports the numbers it read" clause is the non-vacuity that
    # acd-terminal-mirror-geometry-pinned buys with its `assert.equal(uiCols, 80)` at
    # :89-90: a gate that compares two values it silently failed to extract compares
    # `undefined` with `undefined` and passes.

  Scenario Outline: the gate FIRES — every plant is fed to the shipped detector, as synthesized text
    Given the SHIPPED `acd-home-socket-cap-single-arbiter` violations function
    And clean source text for both sides of the boundary
    And a planted copy in which <the plant>
    When I assert the plant LANDED — the planted text differs from the clean text — and then run the detector over the planted pair
    Then it returns at least one violation
    And the violation names <what the refusal must name>
    And running the same detector over the CLEAN pair in the same test returns no violations

    Examples:
      | case                                          | the plant                                                              | what the refusal must name              |
      | the cap rises past the mirror's tail budget   | the client declares `MAX_LIVE_PANES = 128`                             | `MAX_TAIL_KEYS` and milestone 49/ADR-006 |
      | the cap rises to exactly one over             | the client declares `MAX_LIVE_PANES = 65`                              | `MAX_TAIL_KEYS` and both numbers         |
      | the MIRROR's budget is lowered instead        | the client stays at its shipped value; `MAX_TAIL_KEYS = 8` on the node side | which client constant that invalidates   |
      | the client constant is deleted                | the client module exports no cap constant at all                       | that the client half could not be read   |
      | the client constant is renamed                | `MAX_LIVE_PANES` becomes `PANE_LIMIT`                                  | that the client half could not be read   |
      | the mirror constant is deleted                | `MAX_TAIL_KEYS` is gone from the node side                             | that the node half could not be read     |
      | a component holds the number                  | a home `.tsx` carries `rows.slice(0, 16)`                              | the file and the literal                 |
      | a second module declares a cap                | a second home `.mjs` also declares `MAX_LIVE_PANES`                    | both declaring files                     |
      | the arbiter ignores its argument              | the arbiter reads the cap from module scope, not from its parameter    | that the cap must be an argument         |
      | a second copy of the number                   | the constant still exists and the arbiter re-types `rows.length > 16`  | the file and the re-typed literal        |
      | the cap is justified by the browser           | the client comment derives the number from a per-origin socket limit   | RESEARCH §Q3's measured 255              |
    # ROW 3 IS THE ROW THAT PROVES THE GATE IS A TIE AT ALL, and it is the one a build
    # will not write for itself. Every other plant fires just as well against a detector
    # that hard-codes 64 on the client side — which would be a gate that reads ONE build
    # and believes it read two. Lowering the NODE side while the client stays legal is
    # the only plant that distinguishes them. This is the same failure
    # acd-terminal-mirror-geometry-pinned was written against: a cross-build constant
    # believed tested, where the tying file had never existed (:22-29).
    # ROW 10 is a deliberately textual clause and it is the one the PO named: the number
    # may NOT be justified by a browser limit. RESEARCH's first pass did exactly that and
    # produced a completely different product — a 6-pane grid.

  # NON-VACUITY OF THE ARBITER ITSELF, over the whole matrix this file drives.
  Scenario: the arbiter is total, and it never exceeds the cap on any input this file drives
    Given every combination of rows, caps and intents named in the Examples above
    When I call the arbiter for each in turn
    Then no call throws
    And in every single call the subscribed set's size is less than or equal to the cap the call was handed, treating a malformed cap as zero
    And in every single call each returned decision belongs to a row that was handed in — the arbiter never invents a pane
    And in every single call the row array handed in is deep-equal to what it was before the call — the arbiter mutates nothing
    # The never-mutate clause is the discipline `ui/src/board/runs.mjs:74-79` already
    # states in terms for the shared read-model ("never sort it in place"), applied to a
    # row set sixteen live sockets are keyed off.
