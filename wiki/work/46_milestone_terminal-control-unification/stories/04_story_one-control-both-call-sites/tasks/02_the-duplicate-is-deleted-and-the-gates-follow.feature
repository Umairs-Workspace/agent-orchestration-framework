<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/04's point of no return: after this task there is ONE terminal
# implementation. `ui/src/board/TerminalDock.tsx`, `ui/src/board/terminal/` and
# `ui/src/fleet/terminal-view/` are DELETED, both call sites render the control, and every
# gate whose file list named them names the new home instead — IN THIS SAME CHANGE.
#
# ══ WHAT IS A GATE HERE, AND WHICH GATE OWNS IT ══════════════════════════════════════════
# ARCHITECTURE §Fitness functions is explicit that these are structural assertions and that
# a story writing them as Gherkin has put a fitness function in the wrong home. NONE of them
# appears as a scenario below. Named here so the split is a decision, not an omission:
#   - "the old files are gone" and "exactly ONE `new Terminal(` construction site exists
#     under `ui/src`" → `test/arch/acd-terminal-server-only.test.mjs` (amended). Its third
#     assertion currently hard-codes `ui/src/board/TerminalDock.tsx`
#     ([acd-terminal-server-only.test.mjs:67-82], the path at [:70]) and becomes a sweep that
#     applies the `@xterm/*`-only rule to the site it FINDS. This is the gate that proves the
#     milestone's headline and it CANNOT be satisfied by a partial landing — deliberately.
#   - "no port literal on a terminal surface; one pure URL builder that reads no global" →
#     `test/arch/acd-terminal-origin-not-port.test.mjs` (new; RED today, which is its
#     non-vacuity proof — `TerminalDock.tsx:78`'s `FLEET_PORT = 4181` trips it).
#   - "the `.mjs` set imports no React and nothing from either surface folder; one state
#     vocabulary — neither `DOCK_STATES` nor `TERMINAL_VIEW_STATES` survives anywhere in
#     `ui/src`" → `test/arch/acd-terminal-control-boundary.test.mjs` (new).
#   - "the descriptor's mirror geometry equals the worker's `ptySpawn` geometry" →
#     `test/arch/acd-terminal-mirror-geometry-pinned.test.mjs` (new).
#   - the LICENCE obligation: `test/arch/acd-vibeyard-attribution.test.mjs`'s hard-coded
#     `ADAPTED_FILES` ([:14-27]) — COUNTED AT SOURCE AND ADR-006 IS OFF BY ONE: the list holds
#     SEVEN entries, FIVE of them under `ui/` (`TerminalDock.tsx`, `terminal/dock-state.mjs`,
#     `terminal/provider-picker.mjs`, `terminal/resize.mjs`,
#     `terminal-view/FleetTerminalView.tsx`), and ALL FIVE move or die here — not "4 of 6".
#     A `readFile` on a missing path throws, so a move without the update fails loudly, which
#     is correct and must NOT be "fixed" by deleting an entry.
#   - `test/arch/acd-shell-z-ladder-single-home.test.mjs`'s named `FleetTerminalView.tsx`
#     `z-50` exemption ([:48-53]) is REMOVED, not re-pointed — the entry says so in its own
#     reason text and the list is shrink-only.
#   - `test/arch/acd-ui-surface-file-budget.test.mjs` gains a BUDGETS entry for the control
#     at delivery, set just above its delivered size, and the ceiling may not be met by
#     deleting rationale (ADR-014/E3 — the 80×24 soak and the collapse-must-not-tear-down
#     comment survive the move).
#   - `test/support/{board,fleet,shell}-app-harness.mjs` re-point their module-path stub
#     filters, or all three try to render a real xterm; and
#     `test/{terminal-dock,fleet-terminal-view-surface,fleet-terminal-view-producer-fed}.test.mjs`
#     re-point their direct `.mjs` imports. Every new suite is registered in
#     `scripts/test.mjs` (m43/ADR-014 E7) — an unregistered suite is no gate at all.
#
# ══ ADR-006'S FINDING, WHICH IS THE SHARPEST THING IN THIS MILESTONE ══════════════════════
# "Update the file list, never the invariant" is NECESSARY AND NOT SUFFICIENT for invariant
# 4. That detector is a DIRECTORY SWEEP: it walks `ui/src/fleet/**` and fails if any file
# wires `onData`/`onKey`/`onBinary` or calls `.send(` on a socket
# ([acd-fleet-terminal-input-constrained.test.mjs:485-531], the sweep at [:490-502], the dirs
# at [:62-63]). Once the control lives in `ui/src/terminal/`, the fleet page will mount a
# component that genuinely DOES wire `onData` — and the sweep STAYS GREEN while asserting
# nothing about the property it names. A green gate is read as a satisfied contract, so that
# is worse than deleting it. Invariant 4 is therefore re-expressed at equal strength in three
# parts: (1) the CALL SITE, asserted structurally by the gate at `Fleet.tsx:759`'s mount;
# (2) the POLICY, `inputEnabled = source.canInput && !mount.readOnly`, driven behaviourally
# over the whole frozen source table × both postures — THAT IS SCENARIO 1 BELOW, and it is
# QA's half; (3) the sweep SURVIVES, still walking `ui/src/fleet/**`, still non-vacuous
# (`Fleet.tsx`, `api.ts`, `assignments.mjs`, `scope.mjs` remain), still proving no
# fleet-local module grows its own input path. A pure function driven exhaustively is a far
# stronger pin than an absence-of-string sweep.
#
# ══ FIVE CLAUSES OF THAT SAME DETECTOR ASSERT SPELLINGS THAT ARE ABOUT TO CHANGE ══════════
# QA flags these in advance because a naive re-point turns each into a gate that forbids
# what this milestone requires:
#   - [:521] asserts the dock's `remote ·` badge exists ("a remote session SAYS it is
#     remote"). DESIGN change 8 RETIRES that badge — the identity line already reads
#     `→ <nodeId>`. The invariant ("a remote session says so, never by colour alone")
#     survives in the identity line; its spelling does not.
#   - [:522-525] asserts the dock does NOT construct `disableStdin: true`. After the move
#     there is ONE control file, and the fleet's read-only mount must construct exactly that.
#     A needle re-pointed literally at the control would forbid the read-only posture the
#     same milestone is required to preserve. The invariant is "no half-disabled widget on an
#     interactive mount, and read-only IN FACT on a read-only one" — which is the POLICY's
#     job now, not a string's.
#   - [:500] and [:507-508] name `/ws/terminal-view` and the `FleetTerminalView` mount. Both
#     re-point; the mount assertion becomes "the fleet mounts the ONE control, read-only".
#   - [:520] reads the dock's RAW source for the `/ws/terminal-view` literal ("the dock's
#     remote lane dials the tuple-bound route"). Found by the developer's feasibility pass,
#     and it is the subtle one: after ADR-001 that literal lives in the `.mjs` SOURCE TABLE,
#     not in the `.tsx` at all — so a re-point of `BOARD_TERMINAL_DOCK` at the control
#     COMPONENT fails this clause for a reason that looks like a bug and is not. It must be
#     re-aimed at the descriptor module. (Note the comment-stripping caveat the existing test
#     already documents at [:515-517]: `ws://` inside a template literal reads as a line
#     comment to the stripper, which is why this one clause reads RAW source.)
#
# ══ THE `WebLinksAddon` QUESTION, RULED ═══════════════════════════════════════════════════
# [acd-terminal-server-only.test.mjs:75] requires the xterm construction site to import
# `@xterm/addon-web-links`. The dock loads it ([TerminalDock.tsx:20,163]); the peek does not.
# Once the sweep finds ONE site, the unified control must load it — which gives the fleet
# card peek clickable links it does not have today.
# PO RULING: LOAD IT ON BOTH, and the gate's clause stands. This is not new exposure — the
# dock ALREADY renders `mirror` sessions and already loads WebLinksAddon unconditionally
# ([TerminalDock.tsx:163] is outside the local/remote branch), so a worker's streamed output
# is already link-ified when watched from the dock. Making the peek match REMOVES an arbitrary
# difference between two views of the same bytes, which is the milestone's whole thesis.
# It is a render affordance and touches no input path: a clickable URL sends nothing to the
# worker and is invisible to ADR-014 invariant 4. Recorded as knowing visible change 13 —
# task 04's `@uat` matrix carries it so a reviewer does not log it as a regression.
#
# ══ LITMUS ═══════════════════════════════════════════════════════════════════════════════
# Every `@executable` Then is a value a pure `.mjs` returns under plain `node` — this repo
# has no React test harness, and the headless mount harness never builds an xterm at all
# (task 00's header measures why). Every `@manual` Then is something an operator can see or
# a devtools panel can show. No scenario below reads source; the gates above do that.
#
# THE TWO HALVES ARE DELIBERATE AND THEY DIFFER — the m45/04 precedent, restated: a
# hand-rolled second mount would fail scenario 2 without failing the gate, and a mount the
# gate cannot see structurally would fail the gate without failing scenario 2.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the
# full suite (`global-work-propagation.test.mjs` binds :4182, which the live control daemon
# holds).

@ui @work @design
Feature: one implementation, two call sites, and the gates moved with the code — the board and the fleet render the same control, speak the same state words, and the fleet still cannot type
  In order that the duplicate cannot come back, that a fix asked for on one surface lands on both, and that no gate is left reading green while asserting nothing
  the deletion and both call sites must land in one change — with invariant 4 re-expressed as an exhaustively-driven policy rather than left to a directory sweep that will shortly be scanning a directory the code has left

  Background:
    Given the one control from 46/03's core, mounted by the board and by the fleet
    And `ui/src/board/TerminalDock.tsx`, `ui/src/board/terminal/` and `ui/src/fleet/terminal-view/` no longer exist
    And the model scenarios below load the control's framework-free `.mjs` set under plain `node` — no bundler, no DOM, no browser

  # INVARIANT 4, RE-EXPRESSED — the half a directory sweep cannot carry across the move.
  # ADR-002: `canInput` is a property of the SOURCE (can bytes travel up this lane at all);
  # `readOnly` is a property of the MOUNT. `canInput` is NOT a permission and may not be used
  # as one — conflating them is how the fleet peek would quietly become typeable.
  @executable
  Scenario Outline: the input policy over the WHOLE frozen source table times BOTH postures, plus every malformed input it can be handed
    Given the source <source> and the mount <mount>
    When the input policy is applied
    Then `inputEnabled` is <input enabled>
    And `disableStdin` is <disable stdin>
    And an `onData` handler is <handler>
    And the cursor is <cursor>
    And the `read-only` label is <label>
    And the answer does not move when the same pair is evaluated in a different host, on a different origin, at a different box size, or with a different socket URL

    Examples:
      | case                                     | source     | mount              | input enabled | disable stdin | handler        | cursor                  | label   |
      | the board's own PTY                      | local-pty  | interactive        | true          | false         | registered     | blinking block          | absent  |
      | a worker mirror in the board dock (m42)  | mirror     | interactive        | true          | false         | registered     | blinking block          | absent  |
      | THE FLEET CARD — invariant 4             | mirror     | read-only          | false         | true          | NOT registered | underline, not blinking | present |
      | a local PTY mounted read-only (m49's shape) | local-pty | read-only        | false         | true          | NOT registered | underline, not blinking | present |
      | a source that declares `canInput: false` | (declares canInput false) | interactive | false      | true          | NOT registered | underline, not blinking | present |
      | an unrecognised source kind              | (not in the frozen table) | interactive | false      | true          | NOT registered | underline, not blinking | present |
      | no mount posture supplied at all         | mirror     | (absent)           | false         | true          | NOT registered | underline, not blinking | present |
      | a mount carrying an unrecognised key     | mirror     | { readonly: false } (wrong case) | false | true      | NOT registered | underline, not blinking | present |
    # ROWS 6-8 FAIL CLOSED, AND THAT IS QA'S CALL, ARGUED: the only reading consistent with
    # "`canInput` is NOT a permission" is that an unrecognised or absent POSTURE yields no
    # input path. The failure the posture exists to prevent is an operator believing a
    # keystroke reached a worker (T14; 38/DESIGN V2/V5) — so an unknown input may cost a
    # keystroke, never a lie. If the build wants a different answer for these three rows it
    # is a design decision to raise against DESIGN §Read-only is a posture, not a default to
    # pick in code.
    # ROW 4 is unreachable in m46 (no call site mounts a `local-pty` read-only) and is here
    # because the policy is a total function and m49 will reach it.

  # THE CALL SITES' DECLARATIONS, AS VALUES. The gate reads the JSX at `Fleet.tsx:759`
  # structurally; this reads the value the call site computes. Different halves, on purpose.
  @executable
  Scenario Outline: each call site declares one source and one posture, and the fleet's posture has no path to `interactive` in this milestone
    Given the call site <call site>
    When the mount it declares is read
    Then the source is <source> and the posture is <posture>
    And <capabilities> are declared, and everything else the control can do is declared OFF
    And no value the surface holds — no assignment field, no roster fact, no query parameter, no operator action — can turn <posture> into anything else within this milestone

    Examples:
      | case                        | call site                       | source                      | posture     | capabilities                                                        |
      | the board dock              | the board                       | local-pty or mirror         | interactive | drag-resize on, fullscreen on, collapse chevron, close              |
      | the fleet card peek         | a fleet assignment card         | mirror                      | read-only   | drag-resize off, fullscreen on, worded Watch/Hide toggle, no close  |
    # "No path to `interactive`" is the whole of invariant 4 from the operator's side.
    # Reversing it is milestone 49's job: ONE declaration at ONE call site, with the control
    # unchanged. If flipping it turns out to need a control change, the extraction did not
    # separate posture from source and that is a finding against this story.

  # NOTHING THE TWO DELETED MODULES KNEW IS LOST. This is the deletion's regression list:
  # every distinction the dock's ramp or the peek's ramp could make, made by the one ramp,
  # with the SAME word arriving on BOTH surfaces for the same far-end event. Driven through
  # the three re-pointed suites (`terminal-dock`, `fleet-terminal-view-surface`,
  # `fleet-terminal-view-producer-fed`). 46/03 proves the merged ramp is CORRECT; this
  # proves the merge DROPPED NOTHING. If the two collapse into one suite when the code
  # lands, say so and delete the duplicate rather than keeping both.
  @executable
  Scenario Outline: the same far-end event reads the same state word wherever the control is mounted, and every distinction the two ramps held survives
    Given a mounted control on <source> in state <from>
    When <event>
    Then the state is <state> and the chip reads <chip>
    And the pane's cause/reason line reads <reason>
    And the state reads as <reads>
    And the same event on the same source produces the identical word at the other call site

    Examples:
      | case                                  | source     | from       | event                                                   | state     | chip                | reason                                          | reads   |
      | a clean exit, code asserted           | local-pty  | streaming  | an `{type:'exit', exitCode:0}` control frame            | ended     | exited (0)          | (the same words in the bar)                     | clean   |
      | a failing exit                        | local-pty  | streaming  | an `{type:'exit', exitCode:1}` control frame            | ended     | exited (1)          | (the same words in the bar)                     | failure |
      | a named server refusal                | local-pty  | connecting | an `{type:'error', message}` frame (missing provider)   | error     | error               | the server's own message, verbatim and MANDATORY | failure |
      | a transport failure                   | local-pty  | connecting | the socket errors                                        | error     | error               | `connection failed`                             | failure |
      | a dropped mirror stream               | mirror     | streaming  | the socket errors                                        | error     | error               | `disconnected — the stream dropped`             | failure |
      | THE HONESTY THE DOCK LACKED           | local-pty  | connecting | the socket opens and no byte arrives                     | waiting   | waiting for output  | the same line, top-left in an empty pane        | normal  |
      | the socket is not open yet            | mirror     | idle       | the socket begins opening                                | connecting| connecting…         | (none)                                          | normal  |
      | a byte revives a dead pane            | mirror     | ended      | one byte arrives                                         | streaming | streaming           | (none — the bar is gone)                        | normal  |
      | a close after an error stays an error | mirror     | error      | the socket closes cleanly                                | error     | error               | unchanged — a failure is never laundered into a clean finish | failure |
      | an exit frame outranks a later close  | local-pty  | streaming  | an `{type:'exit'}` frame, then a socket close            | ended     | exited (N)          | the exit code, not `stream ended`               | per code|
      | a stream that just ends               | mirror     | streaming  | the socket closes cleanly                                | ended     | stream ended        | `stream ended`                                  | normal  |
      | an unrecognised state word            | mirror     | streaming  | a state neither ramp knows is applied                    | unknown   | unknown             | (none)                                          | normal  |
      | an unknown control type               | local-pty  | streaming  | a `{type:'banana'}` frame arrives                        | streaming | streaming           | (none)                                          | normal  |
      | V10 — a terminal assignment, no bytes | mirror     | waiting    | the fleet injects its assignment-derived reason          | waiting   | no live output      | `no live output — assignment failed · reclaimed` | normal |
    # ROW 14 IS THE COUPLING TEST. The wording is FLEET-domain (it comes from the m35
    # `assignmentChip`), so the shared describer takes an optional `reason` STRING and the
    # fleet call site computes it. A shared control importing `ui/src/fleet/assignments.mjs`
    # would re-couple the two surfaces this milestone exists to decouple — invisibly, inside
    # a module named for terminals. `acd-terminal-control-boundary` fails the build if
    # anyone tries; this row proves the behaviour survives the separation.
    # ROW 12 must never throw and must never be red: an unrecognised state LABELS ITSELF.
    # ROW 13 leaves the state unchanged — an unknown CONTROL FRAME is not an unknown STATE.

  # ────────────────────────── the browser half ──────────────────────────
  # THE OUTSIDER'S PROOF OF INVARIANT 4 — and the point is that it would still be true if
  # the directory sweep had gone vacuous. This is the scenario that catches what ADR-006
  # says a green gate would miss.
  @manual
  Scenario: after the move, the fleet page still cannot type — a keystroke burst reaches nothing
    Given a fleet assignment card watching a live worker session, streaming, in a real browser with the devtools WebSocket frames panel open
    When the operator clicks into the pane and types a burst including printable characters, Enter, Ctrl-C and Escape
    Then nothing appears in the pane and nothing is echoed
    And the frames panel shows ONLY inbound frames on that socket for the whole burst — not one outbound frame
    And the worker's `claude` screen is byte-identical before and after the burst, observed on the worker itself
    And the `read-only` pill is present in the header throughout, and its title still reads that keystrokes never reach the worker
    And the cursor in the pane does not blink
    # EVIDENCE RECORDED IN `VERIFICATION.md` (46), 46/04 section, at `aof:verify 46`: the
    # build stamp; the frames-panel capture for the burst; the node id and session id; and
    # the before/after of the worker's own screen. Run it against the WSL worker node.

  # ONE CONTROL, SEEN TWICE AT ONCE. The milestone's success condition made observable
  # without a mock: the same session, watched from both surfaces at the same moment.
  @manual
  Scenario: the same worker session watched from the fleet card and from the board dock shows one control twice, differing only in the two things the hosts declare
    Given a live worker session, opened in the board dock as a mirror AND watched on its fleet card, at the same time
    When the operator drives the far end so its state changes (bytes, then the session ends)
    Then both panes carry the SAME state word at the same time, from the same vocabulary — never `running` on one and `streaming` on the other
    And both panes carry the same identity facts: the owner ref, the node and the session
    And both render at the worker's own 80 columns, scaled to their own box, with no column cut off in either
    And the ONLY differences between them are the ones their hosts declare: the fleet's `read-only` pill and non-blinking cursor, and the dock's drag handle, collapse chevron and close control
    And neither pane's behaviour depends on which one was opened first, or on closing the other
