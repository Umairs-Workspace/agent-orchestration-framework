<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/02, THE LAYOUT FILTER: a persisted per-operator layout that
# can FILTER the live index and can never CONTRIBUTE to it, behind one pure module that
# takes its storage as an argument.
#
# THE LOAD-BEARING NEGATIVE, stated first because everything else follows from it: a
# persisted layout that can contribute a row is a screen showing sessions that no longer
# exist. Storage is the ONE place in this whole milestone where that lie can be
# manufactured locally, with no producer, no node and no wire involved at all — which is
# why the subset property below is the headline rather than a footnote.
#
# THE SEAM, READ AT SOURCE.
#  - The live rows are `buildSessionIndex`'s projection (src/global-mesh-query.mjs:197),
#    which contributes a session only from a node the registry calls `live` (:261) and
#    holds no entry for an anonymous session (:280). The wire type is `MeshSession`
#    (ui/src/fleet/api.ts:219-228) and THE ORDER IS THE CONTRACT (:204-208).
#  - The addressing tuple is `(nodeId, sessionId)` and nothing else on the entry is
#    addressing-shaped (ui/src/fleet/api.ts:219-228), so a stored layout has exactly two
#    strings per pane to hold.
#  - Focus is stored as a PANE KEY, never as an index or a position — the control's own
#    `terminalPaneKey(source, params)` (ui/src/terminal/pane-identity.mjs:55), which is
#    also the tile's render key (DESIGN §The focus model rule 6). A tile arriving above
#    the focused one would otherwise silently move focus to a different agent.
#  - STORAGE AS AN ARGUMENT IS THE HOUSE PATTERN, not a new one. `withScopeParam` /
#    `scopeFromSearch` take a `location.search`-shaped STRING and say why in terms —
#    "PURE — the caller wires this into history.pushState/replaceState; this module
#    touches no `window`/`location` itself (headless-testable)"
#    (ui/src/fleet/scope.mjs:40-54). This repo has no browser harness, so a module that
#    reached for `window.localStorage` would be a module no `node:test` could drive.
#  - PURITY OVER A SHARED READ-MODEL IS ALSO ALREADY HOUSE LAW: `historyOrder` sorts "a
#    pure, non-mutating sort over a COPY (the read-model is shared — never sort it in
#    place)" (ui/src/board/runs.mjs:74-79).
#
# NOT ASSERTED HERE, each with an owner:
#  - anything RENDERED — the grid's tiles, the empty states E1/E2, the focus ring, the
#    roving tab stop, the live region — STORIES 49/04 and 49/05 and the designer's
#    `@uat` rows. This story renders nothing.
#  - which pane holds a socket: the cap arbiter's, task 01. The composer produces order
#    and focus; it does not decide subscription, and ADR-009 refuses to persist the
#    subscribed SET at all (a restored subscription could exceed the cap or name rows
#    that are gone).
#  - the structural clauses — no `localStorage`/`window`/`document` reference anywhere
#    under `ui/src/home/**.mjs`, and the persisted shape carrying only tuples and focus —
#    `acd-home-layout-is-a-filter`. Every `Then` below reads a returned value or the raw
#    string a storage double was handed.
#  - that no route, mutation or wire key is added: true BY CONSTRUCTION here, and held by
#    `acd-mesh-ui-write-isolation` and `mesh-ui-read-only-contract`, which this task does
#    not touch.
#
# THE TRAPS:
#  1. A GHOST PANE. A stored tuple not in the live rows must be dropped SILENTLY — not a
#     placeholder, not a greyed tile, not "session ended". The subset scenario is written
#     as an IDENTITY assertion for exactly this reason: a composer that reconstructs a row
#     from a stored tuple passes a deep-equal check and fails an identity one.
#  2. A HIDDEN SET. ADR-009 and DG-49-9: what is persisted is the WATCHED set. A stored
#     hidden set means a session appearing for the first time can be pre-suppressed by a
#     preference set weeks ago, on the one screen built so an operator does not lose track
#     of an agent.
#  3. PERSISTING A ROW instead of a tuple. A stored `repo` still says `demo` after the
#     session moved — the browser becomes a second, stale authority over what the mesh
#     says exists.
#  4. REACHING FOR A GLOBAL. Private modes and some embeddings throw on ACCESS, not on
#     write, so `typeof localStorage` is not a safe probe either. The module takes it.
#  5. REPORTING a corrupt value. A parse failure is treated as ABSENT, never as a
#     corruption to surface: never an error, never a blank grid, never a retry.
#
# ISOLATION. The module is pure and the storage is a hand-written double — no `~/.aof`,
# no store, no server, no port (:4181/:4182 are held by the live daemons). A fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)` on every run regardless, per the guard hook. Focused
# runs only, never the full suite. The suite is registered in scripts/test.mjs
# (`acd-test-suite-registration`).

@executable @ui @work @design
Feature: the persisted layout is a FILTER over the live index and never a SOURCE of rows — storage is an argument, absence and corruption degrade to index order, and what is stored is a watched set
  In order that a screen I trust to tell me the truth about my fleet can never show me a session that no longer exists, and never hide one that just appeared
  the home composes order and focus from a per-origin browser preference that is handed in as an argument, drops every stored tuple the live index does not carry, degrades silently to the index's own order on every failure, and persists nothing but tuples and focus

  Background:
    Given the pure layout composer under `ui/src/home/`, called with the live rows and a storage object as ARGUMENTS
    And a hand-written storage double whose `getItem` and `setItem` can each be made to throw, to return a non-string, or to be absent entirely
    And the test process has no DOM: `globalThis.window`, `globalThis.document` and `globalThis.localStorage` are all undefined
    And "the composed rows" means the composer's returned array, and "the live rows" means the array it was handed

  # THE HEADLINE, and it is written as an IDENTITY assertion on purpose.
  Scenario: every composed row is one of the live rows it was handed — by object identity, not by shape
    Given three live rows and a stored layout naming those three tuples plus two that are not live
    When I compose
    Then the composed rows contain exactly three entries
    And every composed entry is `===`-identical to an element of the live rows array — the composer selects, it never constructs
    And no composed entry corresponds to either of the two stored-but-not-live tuples
    And the live rows array is deep-equal to what it was before the call, and was not sorted in place
    # Identity is what makes "never a SOURCE" checkable. A composer that rebuilt a row
    # from a stored tuple — `{ nodeId, sessionId }` with the rest filled in — would
    # satisfy a subset-by-tuple check and would be manufacturing exactly the ghost this
    # milestone exists to remove.

  # THE GHOST PANE, DROPPED SILENTLY. Both halves in ONE scenario so a build cannot
  # satisfy "dropped" by rendering a tombstone.
  Scenario: a stored tuple for a session the mesh no longer lists leaves no trace at all
    Given a stored layout naming five tuples of which only two are in the live rows
    When I compose
    Then the composed rows are exactly those two, in the stored order
    And the result carries no ghost, placeholder, tombstone, `missing`, `dropped` or `ended` entry that a render site could turn into a tile
    And nothing in the result reports the three absences as an error, a warning or a degraded state
    And composing again after the three tuples return to the live rows yields all five, in the stored order — the preference was FILTERED, not erased
    # The last clause is the one that keeps this a filter rather than a reaper: a session
    # that goes away for one poll and comes back must come back where the operator put it.
    # A composer that PRUNED storage on every compose would silently rewrite the
    # operator's layout from a 5-second network blip.

  # THE WATCHED SET, NEVER A HIDDEN SET. The fail-open-for-VISIBILITY direction, which is
  # the opposite direction from every other fail-closed rule in this milestone and is
  # deliberately so.
  Scenario Outline: a live row is never suppressed by anything storage can hold
    Given the live rows carry a session with tuple ("worker-1", "sess-NEW")
    And a stored layout in which <the stored state>
    When I compose
    Then the composed rows contain that session
    And no stored value of any shape removed a live row from the output

    Examples:
      | case                                        | the stored state                                                     |
      | a brand new session, never seen before      | the tuple is absent from the stored list                             |
      | an empty stored list                        | the stored list is `[]`                                              |
      | a stored list naming only other sessions    | three unrelated tuples are stored                                    |
      | a stored key that looks like a hidden set   | the payload additionally carries `hidden: [["worker-1","sess-NEW"]]` |
      | a stored key spelled `excluded`             | the payload additionally carries `excluded: [["worker-1","sess-NEW"]]` |
      | a stored per-tuple visible flag             | the stored entry for that tuple carries `visible: false`             |
      | a stored per-tuple subscribed flag          | the stored entry for that tuple carries `subscribed: false`          |
      | a stored layout from a different origin     | a payload written under another origin's key shape                   |
    # ROWS 4-7 ARE ADVERSARIAL BY DESIGN and they are the ones that would otherwise be
    # discovered in production. Each is a shape a well-meaning later change might write;
    # each must be inert. `subscribed:false` is the subtle one — ADR-009 refuses to
    # persist the subscribed set at all, so a stored subscription flag is not a
    # preference the composer honours, it is a stale answer to a question the arbiter
    # owns (task 01) against a cap and a live row set it cannot see.
    # `close` on this surface can only honestly mean "stop watching" (DG-49-9), and stop
    # watching is a SUBSCRIPTION fact, not a layout one.

  # DEGRADE. Absent, empty, corrupt, unparseable, wrong-shaped, throwing — all one
  # answer, and the answer is the index's own order.
  Scenario Outline: every way storage can fail degrades to the live rows, unchanged and in the order they arrived
    Given live rows handed in a deliberately non-alphabetical order
    And <the storage situation>
    When I compose
    Then the composed rows are deep-equal AND identity-equal to the live rows array, element for element, in the SAME order
    And no error is thrown and nothing is reported to the caller as an error state
    And the composed focus is null
    And a subsequent compose with the same arguments returns the same answer — no retry, no backoff, no repair attempt

    Examples: nothing is stored
      | case                                    | the storage situation                                        |
      | no storage object at all                | storage is `undefined`                                       |
      | a null storage object                   | storage is `null`                                            |
      | a storage object with no `getItem`      | storage is `{}`                                              |
      | the key has never been written          | `getItem` returns `null`                                     |
      | the key holds an empty string           | `getItem` returns `""`                                       |

    Examples: something is stored and it cannot be used
      | case                                    | the storage situation                                        |
      | truncated JSON                          | `getItem` returns `"{"`                                      |
      | the literal string null                 | `getItem` returns `"null"`                                   |
      | a JSON number                           | `getItem` returns `"7"`                                      |
      | a JSON string                           | `getItem` returns `"\"worker-1\""`                           |
      | a JSON array of strings                 | `getItem` returns `"[\"worker-1\",\"sess-A\"]"`              |
      | an object with none of the known keys   | `getItem` returns `"{\"theme\":\"dark\"}"`                   |
      | the right keys, the wrong types         | `getItem` returns `"{\"panes\":7,\"focus\":[]}"`             |
      | tuples that are not pairs               | the stored list holds `["worker-1"]` and `["a","b","c"]`     |
      | tuples whose halves are not strings     | the stored list holds `[1,2]` and `[null,null]`              |
      | a value written by an older schema      | the payload's schema version is one behind                   |
      | a value written by a NEWER schema       | the payload's schema version is one ahead                    |
      | a 5 MB stored value                     | `getItem` returns 5 MB of valid JSON with 200,000 tuples     |

    Examples: storage itself refuses
      | case                                    | the storage situation                                        |
      | reading throws (private mode)           | `getItem` throws a SecurityError                             |
      | reading returns a non-string            | `getItem` returns an object                                  |
      | reading returns undefined               | `getItem` returns `undefined`                                |
      | the property access itself throws       | the `getItem` property getter throws when read               |
    # A NEWER SCHEMA IS IN THE TABLE ON PURPOSE and it is the row a build will not think
    # of: ADR-009 fixes that the key carries a schema version so a shape change is a
    # SILENT RESET rather than a crash, and the version that has not been written yet is
    # the one that arrives when an operator opens an older tab against a newer build.
    # Both directions are a reset. The 5 MB row is the denial-of-service shape: a
    # composer that filtered 200,000 stored tuples against 3 live rows in O(n*m) would
    # hang the first render, and the honest answer is still just the three live rows.
    # THE PROPERTY-GETTER ROW is the one that catches a build probing storage with
    # `typeof storage.getItem === "function"` before a try/catch.

  # STORAGE IS AN ARGUMENT — proven by BEHAVIOUR, in a process where a global would be a
  # crash rather than a convenience.
  Scenario: two storages in one process do not see each other, and a poisoned global is never touched
    Given two independent storage doubles holding two different layouts
    And `globalThis.localStorage` is defined as a poisoned object that throws on ANY property access
    And `globalThis.window` and `globalThis.document` are likewise poisoned
    When I compose twice, once with each storage double
    Then the two results reflect their own storage's layout and differ from each other
    And neither call threw
    And the poisoned globals were never touched — a module that reached for one would have thrown, so this scenario fails loudly rather than silently
    And composing with no storage argument at all still returns the live rows in the order they arrived
    # This is the behavioural half of `acd-home-layout-is-a-filter`'s no-globals clause,
    # and it catches what a text sweep cannot: a global reached through a computed
    # property, an aliased binding, or a helper imported from elsewhere.

  # WHAT IS WRITTEN. A sentinel round-trip, so a whole-row spread cannot hide.
  Scenario: saving persists tuples and focus and nothing else, proven with sentinel values
    Given three live rows whose every non-tuple field holds a unique sentinel — repo `SENTINEL-REPO`, assistant `SENTINEL-ASSISTANT`, workspaceId `SENTINEL-WORKSPACE`, lastPingAt `SENTINEL-PING`, and a workItem whose ref is `SENTINEL-REF`
    When I save a layout for those rows and read the raw string the storage double was handed
    Then the raw string contains each row's `nodeId` and `sessionId`
    And the raw string contains NONE of the five sentinels
    And the parsed payload's top-level keys are exactly the ordered tuple list, the focused tuple and the schema version — no sixth key
    And the parsed payload holds no bytes, no scrollback, no terminal state word, no subscription flag and no timestamp
    And saving twice with the same rows writes a byte-identical string — the payload carries no clock and no nonce
    # Sentinels rather than a key-name check because the defect is a SPREAD: `{...row}`
    # writes `repo` under its own name and passes any assertion that only looks for keys
    # it thought to name. A `repo` persisted here is precisely the field that would still
    # say `demo` after the session moved (ADR-009).

  Scenario Outline: a save that cannot be written is a no-op, and the grid stays fully functional
    Given a storage double in which <the write situation>
    When I save a layout and then compose
    Then no error is thrown by either call
    And the composed rows are the live rows, and the grid is fully functional
    And nothing is reported to the caller as an error state

    Examples:
      | case                          | the write situation                              |
      | a quota error                 | `setItem` throws a QuotaExceededError            |
      | a security error              | `setItem` throws a SecurityError                 |
      | no `setItem` at all           | storage is `{ getItem }` only                    |
      | a read-only storage           | `setItem` silently does nothing                  |
      | storage is absent             | storage is `undefined`                           |
    # "The grid is fully functional with storage unavailable — which is also how every
    # headless test drives it" (ADR-009). That is not a fallback path; it is the default
    # path, and it is the one this whole suite runs on.

  # ORDER. The composer permutes survivors and appends newcomers; it never sorts.
  Scenario: the stored order applies to the rows that survive, and rows the layout has never seen keep the index's order behind them
    Given live rows in the index's own order: A, B, C, D, E
    And a stored layout naming D, then B, then a tuple that is not live
    When I compose
    Then the composed rows begin D, B
    And the remaining rows follow as A, C, E — the order they were handed in, unchanged and un-re-sorted
    And no comparison of `repo`, `assistant`, `lastPingAt`, connection state or recency entered the result
    And composing the same inputs with the live rows supplied in a different order changes only the tail, never the stored head
    # THE COMPOSER NEVER SORTS, and that is a deliberate narrowing worth flagging:
    # ADR-009 says the degrade is to "`buildSessionIndex`'s deterministic (nodeId,
    # sessionId) order" while DESIGN §The focus model rule 7 fixes the grid's order as
    # "nodeId, then repo, then sessionId". Those differ. Consuming the handed order makes
    # the composer correct under either and leaves the sort key exactly one question,
    # owned wherever the ordered array is produced — FLAGGED FOR THE ARCHITECT AND THE
    # DESIGNER, not settled here.

  # FOCUS. Stored as a tuple, and it is only ever answered with something on screen.
  Scenario Outline: the composed focus is always null or a tuple that is in the composed rows
    Given live rows A, B, C
    And a stored focus of <the stored focus>
    When I compose
    Then the composed focus is <the composed focus>
    And the composed focus, when it is not null, names a tuple that is present in the composed rows
    And no error is thrown

    Examples:
      | case                                | the stored focus                       | the composed focus       |
      | the focused session is live         | B's tuple                              | B's tuple                |
      | the focused session has gone        | a tuple absent from the live rows      | null or a composed row   |
      | nothing was focused                 | null                                   | null                     |
      | the key is absent                   | (no focus key in the payload)          | null                     |
      | focus stored as a position          | the number 1                           | null or a composed row   |
      | focus stored as a bare session id   | the string "sess-B"                    | null or a composed row   |
      | focus stored as a half tuple        | ["worker-1"]                           | null or a composed row   |
      | focus names a row with a blank id   | ["worker-1", ""]                       | null or a composed row   |
    # THE "null or a composed row" ANSWER IS DELIBERATE AND IS ROUTED. DESIGN §The focus
    # model rule 8 fixes what happens when a focused tile is REMOVED while rendered
    # (focus moves to the nearest surviving tile in grid order, and the live region says
    # which session went) — but nothing fixes cold start, where a stored focus names a
    # session that was already gone before the first render and there is no "nearest
    # surviving tile" to move from. This table pins the property that is safe and
    # sufficient — focus is never a dangling reference — and routes the exact fallback as
    # a design gap rather than letting the build's first guess become the contract.
    # Row 5 is the anti-index pin: storing a POSITION is the defect rule 6 exists to
    # prevent, and a build that accepted a number here would silently focus a different
    # agent the first time a tile arrived above the focused one.

  # PURITY AND IDEMPOTENCE.
  Scenario: composing twice changes nothing, and reading never writes
    Given a storage double that records every `getItem` and `setItem` call it receives
    And live rows and a stored layout naming two of them
    When I compose three times in a row
    Then the three results are deep-equal
    And the second and third results are not the first result's object identity — there is no memoised cache handing back a stale answer
    And the storage double recorded ZERO `setItem` calls — composing is a read, and a read that repairs storage is a write nobody asked for
    And the raw stored string is byte-identical to what it was before the three calls
