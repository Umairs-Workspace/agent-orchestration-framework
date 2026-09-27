<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/03, THE FOURTH HOST: the grid pane declares its own eight
# affordances — the two it offers and the six it refuses, each absence carrying its
# reason — so the control learns a new surface instead of being handed a lie about
# which surface it is on.
#
# THE SEAM, read at source in the working tree at this refine:
#  · `TERMINAL_HOSTS` — the frozen three at ui/src/terminal/host-model.mjs:38-41. A
#    FOURTH member lands here: ADR-007 names the constant `HOST_HOME_PANE`, DESIGN
#    §S2 (DESIGN.md:813-814) fixes its VALUE as `grid-pane`. (The two m46 members read
#    `HOST_BOARD_DOCK = "board-dock"` / `HOST_FLEET_CARD = "fleet-card"`, so the
#    constant name and the value differ in wording here for the first time. Named, not
#    discovered.)
#  · `hostAffordances(host)` — host-model.mjs:151-153. It FAILS CLOSED through
#    `NO_AFFORDANCES` (:144-146): a host the model does not know declares NOTHING,
#    which on screen is a pane with no controls at all.
#  · `affordance(form, cost, extra)` :87-89 and `notDeclared(reason)` :93-95 — an ON
#    affordance carries `{declared:true, form, cost, …}`; an OFF one carries
#    `{declared:false, form:null, cost:null, reason}`. That asymmetry is the whole
#    point: a reviewer can tell a decision from an omission.
#  · `AFFORDANCES` — the eight names, :56-65. `AFFORDANCE_CHANGE` :349-358 and
#    `changeForAffordance(name, engaged)` :363-367 pair each affordance with the change
#    it dispatches; `CHANGE_CATALOGUE` :274-289 prices every change.
#  · `affordanceFormViolations(hostOrTable)` — :175-204, and it is THREE clauses:
#    a chevron may cost only layout (:184-186); a worded subscribe/unsubscribe toggle
#    may not cost merely layout (:187-189); and the cost an affordance DECLARES must be
#    the cost of the change it DISPATCHES (:194-201). It loops over the table's own
#    keys (:181), so a ninth affordance is policed by the same rule. It takes a TABLE
#    as well as a host name, and :168-174 records why: m46's mutation review found the
#    one plant being fed to a copy re-implemented inside the suite, so the SHIPPED
#    detector had never once been driven to a violation and `return []` would have read
#    green everywhere.
#
# WHAT IS **NOT** ASSERTED HERE, each with its owner:
#  · the POSTURE, its narrowing by the feed axis, and the mount's frozen return shape —
#    task 01 of this story (`ui/src/home/session-mount.mjs`).
#  · invariant 4's amendment, the three-surface authorship table and the two sweeps —
#    task 02 of this story.
#  · WHERE each affordance sits, its glyph, its hit target and the reading order —
#    DESIGN §S2's binding checklist, judged in the milestone's `@uat` visual review.
#    This file asserts the DECLARATION; it asserts no pixel.
#  · the feed axis's three values and their derivation — story 02, task 00.
#  · "the fourth host's verdicts coincide with the fleet card's" AS A FITNESS FUNCTION
#    (ADR-007) — ARCHITECTURE §Fitness functions. What is asserted below is the same
#    fact as a VALUE comparison between two tables the test imports, which is behaviour
#    a scenario may read.
#
# THE TRAPS:
#  1. **`SET_POSTURE` COSTS THE SESSION.** host-model.mjs:287 prices it `COST_SESSION`
#     and names this milestone by name: *"stdin is fixed at xterm construction —
#     UNREACHABLE in m46, named so m49 does not discover it."* A pane that were
#     read-only inline and interactive expanded would rebuild the xterm and reopen the
#     socket, and because the mirror is ephemeral it would come back **EMPTY**. Hence
#     DESIGN DG-49-5: BOTH HOSTS SHARE ONE POSTURE, and taking the keyboard IS the
#     expand. The last scenario drives that through the shipped catalogue rather than
#     leaving it in a comment.
#  2. **TWO SHIPPED SUITES ENUMERATE THE HOSTS AND MUST MOVE IN THIS DIFF.**
#     test/terminal-collapse-is-not-hide.test.mjs:221 asserts
#     `TERMINAL_HOSTS.length === 3` and loops the form rule over every member (:222-224,
#     :297); test/terminal-one-implementation.test.mjs:245-248 enumerates the fleet
#     card's ON/OFF sets. m46/ADR-006 binds: every list moves in the SAME story as the
#     code. **A green run with those two untouched means the host did not land.**
#  3. **EVERY PLANT GOES TO THE SHIPPED `affordanceFormViolations`** (PO ruling;
#     host-model.mjs:168-174), and each plant asserts it LANDED — that it differs from
#     the clean table — before asserting the detector fires.
#  4. **CLAUSE 3 IS WHAT CATCHES DG-49-9's `✕`.** An `✕` that merely unsubscribes is an
#     icon-control, so clauses 1 and 2 are blind to it; it trips ONLY because
#     `changeForAffordance("close")` resolves to `close`, which the catalogue prices at
#     `COST_SESSION` (:283). An `✕` declared honestly AT session cost trips NOTHING —
#     what refuses that one is the table's own `notDeclared`. Both directions are
#     pinned below, so the detector is never mistaken for the whole guard.
#  5. No clause in this file reads source TEXT, so TECH_DEBT 24's strip order (LINE
#     comments first, BLOCK comments second) does not bind here. It binds on task 02's
#     new sweeps, where the reverse order turns an absence sweep into a silent PASS.
#
# ISOLATION: no store, no server, no port. Every scenario imports the framework-free
# `.mjs` and reads returned values. Where anything in this story does stand a server up
# it binds `port: 0` and runs under a throwaway `AOF_GLOBAL_HOME` — `:4181` and `:4182`
# are held by live daemons on this machine — and focused runs only, never the full
# suite.

@executable @ui @work @design
Feature: the control's FOURTH host — a grid pane that declares all eight affordances, absences with reasons, and inherits nothing from a surface it is not
  In order that a pane on the terminals home offers exactly the controls that surface can honestly perform
  The one terminal control gains a fourth host with its own affordance table, every declaration ON or OFF with a stated reason, policed by the shipped form/cost detector and failing closed for any host the model does not know

  Background:
    Given the shipped `ui/src/terminal/host-model.mjs`, imported directly under `node:test` — no React, no DOM, no socket, no clock
    And "the fourth host" means the member ADR-007 calls `HOST_HOME_PANE` and DESIGN §S2 values `grid-pane`
    And "the detector" means the SHIPPED `affordanceFormViolations` export, never a copy defined inside the suite

  # THE HEADLINE. A fourth host, not a fourth name for the fleet card's table.
  Scenario: the fourth host is a member of the frozen list and owns a whole table of its own
    When I read `TERMINAL_HOSTS` and `hostAffordances("grid-pane")`
    Then `TERMINAL_HOSTS` has exactly four members and the fourth is the string `grid-pane`
    And `TERMINAL_HOSTS` is frozen, and its first three members are still `board-dock`, `fleet-card`, `fullscreen` in that order
    And the table's key set is exactly `AFFORDANCES` — all eight present, and no key that is not one of them
    And `AFFORDANCES` still has exactly eight members: this host invents no ninth affordance
    And the table is frozen, and two calls return the SAME object rather than two equal copies
    And it is not the object `hostAffordances("fleet-card")` returns
    # `hostAffordances` hands out the module's own frozen table by reference
    # (host-model.mjs:152). A per-call copy would let one caller mutate one host's
    # declarations, and "the only things that differ between the hosts are their
    # declarations" would stop being checkable.

  # THE TWO IT OFFERS. Form and cost are the declaration; DESIGN §S2 rules both.
  Scenario Outline: an affordance declared ON names its FORM and its COST
    When I read `hostAffordances("grid-pane")[<affordance>]`
    Then `declared` is true, and `declaresAffordance("grid-pane", <affordance>)` agrees
    And `form` is `<form>` and `cost` is `<cost>`
    And <the extra declaration>

    Examples:
      | case                              | affordance   | form          | cost         | the extra declaration                                                                                                              |
      | spending the subscription budget  | watch-hide   | worded-toggle | subscription | `onLabel` is exactly `HIDE_LABEL` (`Hide terminal`) and `offLabel` is exactly `WATCH_LABEL` (`Watch terminal →`) — the shipped constants by identity, not re-typed strings |
      | expand is where the words are     | fullscreen   | icon-control  | layout       | there is no `alwaysVisible` flag on it — an always-visible exit belongs to the FULLSCREEN host (host-model.mjs:131), never to the opener |
    # The grid's live-socket budget IS a subscription budget (ADR-006), and the product
    # already owns the words for spending it. A second wording here would be a second
    # vocabulary for one operation, on the surface where sixteen of them are visible at
    # once.

  # THE SIX IT REFUSES. Each absence is a DECISION and says so — the `notDeclared`
  # discipline (host-model.mjs:93-95), which is the only thing that lets a reviewer
  # tell a ruling from a forgotten line.
  Scenario Outline: an affordance declared OFF carries no form, no cost, and a reason a reviewer can read
    When I read `hostAffordances("grid-pane")[<affordance>]`
    Then `declared` is false, and `declaresAffordance("grid-pane", <affordance>)` agrees
    And `form` is null and `cost` is null
    And `reason` is a non-empty string that says, in substance: <the reason>

    Examples:
      | case                                    | affordance       | the reason                                                                                                                     |
      | a hole in a uniform grid                | collapse         | a tile's box belongs to the grid track — a collapsed tile leaves a hole, and the affordance for wanting more of one pane is EXPAND |
      | there is no honest third meaning        | close            | this host cannot end another machine's session, and an `✕` that merely unsubscribes is a second form for the worded toggle's job |
      | one tile's width is every tile's width  | drag-resize      | the tile's width is the grid track's; resizing one tile reflows every sibling in its row                                        |
      | it never started this PTY               | restart          | this host cannot re-spawn another machine's PTY                                                                                 |
      | the session already exists elsewhere    | provider-picker  | there is nothing to pick — the session already exists, on another machine                                                       |
      | the overlay owns its own door           | exit-fullscreen  | only the fullscreen host offers its own exit                                                                                    |
    # `close` is DG-49-9, and it is the row that matters most: SPEC scopes "focus,
    # expand, close", and on this surface `close` resolves as `Hide terminal` at its
    # existing `COST_SUBSCRIPTION`. Layout persistence therefore persists the WATCHED
    # set and never a hidden set — the PO may overturn that, and if `close` is meant to
    # END a remote session it is a new write route and a new security question, neither
    # of which this milestone scopes.

  # NOT THE FLEET CARD WEARING ANOTHER NAME. ADR-007's whole argument: the verdicts
  # coincide, the REASONS do not, and passing `HOST_FLEET_CARD` from a surface that is
  # not the fleet would make the model report a lie onward to the identity line and the
  # control strip.
  Scenario: the verdicts coincide with the fleet card's and the reasons are this host's own
    When I compare `hostAffordances("grid-pane")` with `hostAffordances("fleet-card")`
    Then for all eight affordances `declaresAffordance` returns the same verdict for both hosts
    And the two tables are NOT deep-equal
    And the fleet card's `drag-resize` reason contains `192px` — the panel's constant height (host-model.mjs:114)
    And the grid pane's `drag-resize` reason does NOT contain `192px`, and names the grid track instead
    And the grid pane's `collapse` reason is not byte-identical to the fleet card's
    # Two of the six reasons ARE carried over verbatim by DESIGN (`restart` and
    # `provider-picker`), and that is fine: the ones that must differ are the ones whose
    # substance differs. A table that were byte-identical throughout would be evidence
    # the fourth host was copied rather than decided.

  # THE DETECTOR IS QUIET ON THE REAL TABLE — and quiet through BOTH doors, because the
  # component reads the host by name and a test reads it as a table.
  Scenario: the shipped form/cost detector reports nothing against the delivered table
    When I call the detector with the host name `grid-pane` and again with the table object itself
    Then both calls return an empty array
    And the same is true for every member of `TERMINAL_HOSTS`, all four
    And every affordance the grid pane declares ON dispatches a NAMED change whose catalogue cost IS the cost it declares, on both sides of the toggle
    # Four affordance/side pairs on this host (watch-hide engaged + idle, fullscreen
    # engaged + idle). The count is asserted so "checked them all" is a number rather
    # than a claim.

  # AND IT GENUINELY FIRES. Hand-written tables, each asserted to LAND before the
  # detector is asserted to trip on it. A detector only ever shown to stay quiet is one
  # mutation from asserting nothing — which is precisely what m46 found here.
  Scenario Outline: a planted declaration on this host trips the SHIPPED detector
    Given the delivered `grid-pane` table as the clean baseline, which the detector reports zero violations against
    And a hand-written copy of it with <the plant> applied
    When I feed the planted table to the SHIPPED `affordanceFormViolations`
    Then the planted table differs from the clean baseline — the plant landed
    And the detector returns at least one violation, and the message names `<affordance>`
    And the violation is <which clause>

    Examples:
      | case                                                        | the plant                                                                    | affordance   | which clause                                                                 |
      | DG-49-9's ✕ — an icon that quietly unsubscribes             | `close` declared as an icon-control costing `subscription`, glyph `✕`        | close        | clause 3 — it declares `subscription` but dispatches `close`, which costs `session` |
      | the chevron that takes the stream away                      | `watch-hide` re-declared as a chevron costing `subscription`                 | watch-hide   | clause 1 — a chevron means LAYOUT ONLY                                        |
      | the worded toggle that merely tidies                        | `watch-hide` declared as a worded toggle costing `layout`                    | watch-hide   | clause 2 — a worded subscribe/unsubscribe toggle may not cost merely layout   |
      | a chevron that ends the session                             | `collapse` declared as a chevron costing `session`                           | collapse     | clause 1                                                                      |
      | expand that secretly re-dials                               | `fullscreen` declared as an icon-control costing `subscription`              | fullscreen   | clause 3 — `present-fullscreen` costs `layout`                                |
      | a NINTH affordance smuggled in                              | a new key `pin-pane`, a worded toggle costing `layout`                       | pin-pane     | clause 2, reached because the detector loops the table's OWN keys (:181)      |
    # The first row is the one this surface would actually reach for, and it is the
    # exact form-cost lie DG-49-9 refuses: an `✕` beside a `Hide terminal` toggle is two
    # forms for one operation, and the operator cannot tell which one costs them the
    # stream.

  # WHAT THE DETECTOR CANNOT SEE, STATED SO NOBODY MISTAKES IT FOR THE WHOLE GUARD.
  Scenario: an HONEST ✕ trips nothing, and the table's own refusal is what stops it
    Given a hand-written table with `close` declared as an icon-control costing `session` — the board dock's own honest spelling (host-model.mjs:99)
    When I feed it to the SHIPPED detector
    Then it returns ZERO violations — the declared cost and the dispatched cost agree
    And the delivered `grid-pane` table nonetheless declares `close` OFF, with its reason
    And no affordance the grid pane declares ON dispatches `close`
    # This is the discrimination that keeps the previous scenario meaningful. The form
    # rule polices HOW an affordance is spelled, never WHETHER this host may have it —
    # a host that could end another machine's session by pressing `✕` is refused by the
    # declaration, and only by the declaration.

  # FAIL CLOSED. A mount naming a host the model does not know gets NO controls — which
  # on screen reads as a rendering bug rather than as a missing table, and that is why
  # the fourth host and its mount land together.
  Scenario Outline: a host the model does not know declares nothing, and inherits nothing
    When I call `hostAffordances(<the host>)`
    Then all eight affordances come back `declared: false`, with `form` and `cost` null
    And every one of the eight `reason` strings says `unrecognised host`
    And `declaresAffordance(<the host>, …)` is false for all eight
    And the table is NOT deep-equal to any of the four known hosts' tables — nothing falls open to a neighbour's controls
    And the detector reports zero violations against it: a table of pure absences violates nothing

    Examples:
      | case                                          | the host      |
      | the constant's name used as the value         | `home-pane`   |
      | camel-cased                                   | `gridPane`    |
      | a trailing space from a template literal      | `grid-pane `  |
      | the empty string                              | `""`          |
      | nothing passed                                | `undefined`   |
      | an explicit null                              | `null`        |
      | a number                                      | `42`          |
      | an object where a name was expected           | `{}`          |
    # Row 1 is the near-miss this milestone creates for itself: ADR-007 names the
    # CONSTANT `HOST_HOME_PANE` while DESIGN values it `grid-pane`, so `"home-pane"` is
    # the plausible typo, and its punishment is a pane with no controls at all.
    # NON-VACUITY, asserted alongside: each of the four known hosts declares at least
    # one affordance, so "declares nothing" is a discrimination rather than what this
    # function always answers.

  # THE TRAP, DRIVEN. DG-49-5 rests on one catalogue entry, and this is where it is
  # read rather than quoted.
  Scenario Outline: changing the posture costs the SESSION, so the tile and its expanded twin must share one
    Given a control state bound to the `mirror` source, addressed by `(node-a, sess-1)`, posture `interactive`, subscribed, with bytes already painted
    When I apply <the change> through the shipped `changeOutcome`
    Then `cost` is `<cost>` and `verdict` is `<verdict>` and `scrollback` is `<scrollback>`
    And the session identity after the change is <identity after>

    Examples:
      | case                                | the change                    | cost         | verdict     | scrollback | identity after            |
      | opening the pane fullscreen         | present-fullscreen            | layout       | survives    | intact     | identical to before       |
      | returning it home                   | dismiss-fullscreen            | layout       | survives    | intact     | identical to before       |
      | the host re-renders on a poll       | host-rerender                 | layout       | survives    | intact     | identical to before       |
      | the operator stops watching         | hide                          | subscription | tears-down  | gone       | null                      |
      | flipping the posture on expand      | set-posture (to `read-only`)  | session      | tears-down  | gone       | different from before     |
    And for the `set-posture` row the catalogue's own `why` still reads `stdin is fixed at xterm construction — UNREACHABLE in m46, named so m49 does not discover it`
    # THE WHOLE OF DG-49-5 IS IN THE LAST ROW. A tile that were read-only inline and
    # interactive expanded would take that row on every expand: the xterm is rebuilt,
    # the socket reopens, and because the mirror is ephemeral the pane returns EMPTY.
    # The first two rows are the contrast that makes the fifth mean something — expand
    # is layout, and it adopts the live node rather than re-creating it.

  Scenario: no host can reach SET_POSTURE, and the posture is part of what makes a session a session
    When I ask `changeForAffordance` for the change every affordance dispatches, over all four hosts and both sides of every toggle
    Then no affordance on any host ever dispatches `set-posture`
    And `SESSION_IDENTITY_FIELDS` still contains `posture` (host-model.mjs:233) — which is WHY a posture change is a new session rather than a restyle
    And `NON_IDENTITY_FIELDS` still contains `collapsed` and `expanded` — a layout fact is still not identity
    # `SET_POSTURE` stays unreachable from any host after this milestone, exactly as
    # ADR-007 rules: the fourth host's posture is DECLARED at its mount (task 01), once,
    # and never toggled while a session lives.
