<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/03, the TABLE: ADR-002's session source as a FROZEN two-entry
# DATA table. Two entries and only two — `local-pty` and `mirror` — each declaring, as
# values, the route it dials, the params that address it, whose origin it belongs to,
# whether it can carry a resize control frame, whether it can carry input, and its fixed
# geometry if it has one.
#
# THE TABLE IS SPIKE 44'S, NOT THIS TASK'S TO INVENT. Spike 44 §Sub-question 4 and its
# `## Outcome / Next` hand down two rows; ADR-002 freezes them and adds the one field the
# spike's summary table does not carry — `canInput` is the SOURCE's capability (can bytes
# travel up this lane at all), never a permission, and the permission half is the mount's
# posture, which task 04 owns. A third source later is a table ROW plus its own arch-test
# row, never a fourth `if` in three files — the reversibility the spike's timebox asked to
# preserve. A relayed `local-pty` is not a row at all: spike 44 §Sub-question 2 measured
# both directions and found input cannot arrive (`{ sent: false, code:
# "assignment-target-not-connected" }`) and output is never produced.
#
# LITMUS: every Then is a returned VALUE from the shared framework-free `.mjs` set ADR-001
# homes at `ui/src/terminal/`, loaded by `node:test` under plain `node` — no bundler, no
# DOM, no socket, no browser. The table is read as a MODEL: the entries it yields, the
# fields each entry declares, what a lookup of an unknown kind gives back. No source read,
# no `className` archaeology, no browser fact.
#
# WHAT A MODEL CANNOT SETTLE, AND WHERE IT GOES INSTEAD. What each field DRIVES is the
# next three tasks' — geometry mode is 02's, the socket URL is 03's, the input path is
# 04's. This task pins only that the fields are declared, frozen, and complete enough that
# those three derivations never have to name a kind. And whether the extracted control
# actually renders from the descriptor rather than from a `remote` boolean is a rendered
# fact judged at 46/04's design-conformance and `@uat` review; an `@executable` scenario
# here that needed a browser would be the failure mode, and there are none below.
#
# NOT ASSERTED HERE — deliberately left to a fitness function, per ARCHITECTURE §Fitness
# functions, which names these five as structural and forbids them as Gherkin: *no port
# literal on a terminal surface* (`acd-terminal-origin-not-port`); *exactly one xterm
# construction site* and *the shared set imports no React and nothing from `ui/src/fleet/`
# or `ui/src/board/`* (`acd-terminal-server-only`, `acd-terminal-control-boundary`); *one
# state vocabulary* (`acd-terminal-control-boundary`); *the descriptor's geometry equals
# the worker's* (`acd-terminal-mirror-geometry-pinned`). ALSO NOT ASSERTED: DG-46-2's
# ruling that the five dark hex literals (`#0b0f14`, `#0f1629`, `#1e2a44`, `#0b1120`,
# `#d7dde3`) get ONE named home in this set read by both consumers. The "one home" half is
# a value claim this set could carry, but the "read by BOTH consumers" half is a
# source-read with no gate on disk today — QA flags it as a recommended arch-test row
# rather than smuggling half of it in here as a behavioural Then.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED.

@executable @ui @work @distribution
Feature: the session source is a frozen table of exactly two entries, each declaring its own capabilities as data
  In order that one terminal control can serve a board PTY and a worker's mirrored TUI without a single `if (remote` between them — and so that a third source later costs a table row instead of a fourth edit in three files
  the session source must be a frozen two-entry table whose every entry declares its route, its params, its origin role, its control-frame and input capabilities and its fixed geometry as values; an unknown kind must be refused with its cause named rather than defaulted to either entry; and a relayed `local-pty` must not be constructible at all

  Background:
    Given the shared terminal core loaded under plain `node` — no bundler, no DOM, no socket, no clock
    And the session-source table read as DATA, the way the control reads it

  # HEADLINE. Six fields, both rows, and every one of them a VALUE. Today the same six
  # facts are spelled as a boolean plus three `if`s (`TerminalDock.tsx:90`, `:165-175`,
  # `:203`, `:177`) and a third source would need a fourth edit in each.
  Scenario Outline: each of the two entries declares its route, its params, its origin, its control-frame and input capabilities, and its geometry
    Given the session source <kind>
    When its descriptor is read
    Then its route path is exactly <path>
    And the params that address it are exactly <params> — those, in that order, and no others
    And it dials the <origin role> origin
    And its resize control frame is <resize control frame>
    And its input capability is <can input>
    And its fixed geometry is <fixed geometry>
    And all six answers come off the descriptor as values — a caller reads them without naming the kind and without a branch of its own

    Examples:
      | case                                          | kind      | path               | params            | origin role | resize control frame | can input | fixed geometry |
      | the PTY the board server owns                 | local-pty | /ws/terminal       | ref, provider     | self        | resize               | yes       | (none)         |
      | a worker's mirrored, absolutely-addressed TUI | mirror    | /ws/terminal-view  | nodeId, sessionId | fleet       | (none)               | yes       | 80x24          |
    # `resize` is the frozen m03/ADR-003 client→server envelope word, not a new one — the
    # lane either carries that frame or carries none, and "none" is what makes the mirror a
    # `scale` source (task 02). `canInput` is `yes` on BOTH rows and that is deliberate:
    # the mirror lane has carried input since m42, and the reason the fleet peek is still
    # read-only is the MOUNT's posture, not the source's capability (task 04). Reading
    # `canInput` as a permission is exactly how the fleet peek would quietly become
    # typeable — ADR-002 says so in terms.

  # ADR-002's word is FROZEN, so the table's size is part of the contract, not an
  # implementation detail. A frozen-by-convention table is one careless `push` from three.
  Scenario: the table is frozen at exactly two entries, and frozen in fact rather than by convention
    When the table's entries are listed
    Then there are exactly two, and their kinds are exactly `local-pty` and `mirror`
    And no third entry exists under any name — not a relayed variant, not a test double, not a placeholder
    And the two entries are told apart by their FIELDS alone: no two share a route path, and no two share a route-path-and-origin pair
    And a caller that writes to the table, or to either descriptor, changes nothing the next read can see — the values are frozen, so one consumer cannot mutate the contract another consumer reads
    And the same table object is yielded to every consumer, so the board surface and the fleet surface can never be reading two different tables

  # "An unknown source kind is refused legibly rather than defaulted to either entry." The
  # failure this prevents is not a crash — it is a typo resolving to a REAL descriptor and
  # dialling a real socket on the wrong route with the wrong geometry.
  Scenario Outline: an unknown source kind is refused with its cause named, and is never coerced or defaulted into either entry
    Given a caller asks the table for the source kind <requested kind>
    When the lookup is made
    Then no descriptor comes back — neither `local-pty`'s nor `mirror`'s
    And the refusal names the kind it was handed and the two kinds the table knows, so the caller can print a cause rather than an apology
    And nothing is coerced: a kind that merely resembles a known one is not resolved to it
    And no field of either entry leaks into the answer — no route, no origin, no geometry

    Examples:
      | case                                                  | requested kind      |
      | a third kind nobody built                             | relay-pty           |
      | the retired transport word ADR-003 exists to remove   | remote              |
      | the other half of the same retired pair               | local               |
      | a kind that differs only in case                      | MIRROR              |
      | a kind carrying surrounding whitespace                | " mirror "          |
      | a kind that is the empty string                       | ""                  |
      | no kind at all                                        | (absent)            |
      | an explicit null                                      | null                |
      | a value that is not a string                          | 7                   |
      | an object shaped like a descriptor                    | { kind: "mirror" }  |
    # The mechanism — a refusal VALUE or a throw carrying the same cause — is the build's
    # call and is deliberately not pinned here; what is pinned is that no descriptor comes
    # back and that the cause is nameable. The near-miss rows (case, whitespace,
    # descriptor-shaped object) are the ones worth having: a table that trims and
    # lower-cases is a table where `MIRROR ` silently dials a real worker's session.

  # Spike 44 §Sub-question 2, cited as AUTHORITY and not re-derived. ADR-002: "a story
  # proposing it is refused at review; overturning it needs a superseding ADR *and* a
  # change to the mesh admission model, in that order."
  Scenario: a relayed `local-pty` is not a session source, and the table offers no way to assemble one
    When the table is examined for a lane that would relay a board PTY through the fleet origin
    Then no entry routes `/ws/terminal` at any origin but the surface's own
    And no entry declares BOTH a resize control frame AND the fleet origin — a resizable far end reached over a lane that carries no resize is precisely the combination spike 44 measured as impossible in both directions
    And asking for it by name is refused exactly as any other unknown kind is, naming the two kinds the table knows
    And the table hands out whole rows, never fields to assemble: there is no supported way to take `local-pty`'s route and `mirror`'s origin and get a descriptor back
    And because that lane does not exist, `local-pty` never needs an origin it was not served from — its origin role is `self` on every surface that mounts it

  # ADR-002's "the control DERIVES; it does not branch", stated as the property that makes
  # a third row cheap. The litmus is the strongest one available to a black-box test: swap
  # the kind STRING for a word nothing recognises, leave the fields alone, and every
  # derivation must answer identically.
  Scenario Outline: every derivation is total over the table and keys on the descriptor's FIELDS, never on its kind
    Given the descriptor for <kind>
    When the geometry mode, the input policy and the socket URL are each derived from it
    Then each derivation yields a value — none of them is undefined for either entry
    And handing the same derivations a descriptor whose kind string is replaced by <disguised as> — every other field unchanged — yields byte-identical answers
    And handing them the same fields under a different origin, host or port yields the same geometry mode and the same input answer, because neither is a property of the transport

    Examples:
      | case                                                    | kind      | disguised as        |
      | the board PTY, wearing a name nothing recognises        | local-pty | some-future-source  |
      | the worker mirror, wearing the retired transport word   | mirror    | remote              |
    # This is ADR-003's forbidden-spellings clause (`if (remote`, `isRemote`, `kind ===
    # "mirror"`, `origin ===`) expressed as an OBSERVABLE consequence rather than as a grep
    # a reviewer has to remember to run. The per-derivation detail lives in task 02
    # (geometry), task 03 (the URL) and task 04 (input); what this row pins is that a
    # fourth source could be added without any of the three learning a new word.
