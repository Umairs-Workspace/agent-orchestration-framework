<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/04: a pane whose ORIGIN cannot be resolved renders a labelled
# `unavailable` state that NAMES ITS CAUSE — `not checked out on this machine` /
# `board unreachable` — never a blank pane, never a silently dead one. Spike 44
# sub-question 5 binds the state and DESIGN §The unavailable pane specifies it; the wording
# in the Examples below is quoted from there and is not this task's to invent.
#
# ══ DG-46-3, READ THIS BEFORE LOGGING A FINDING ══════════════════════════════════════════
# THE STATE SHIPS IN m46 WITH NO PRODUCTION PRODUCER. It is built, unit-driven, and rendered
# from a FIXTURE. The board dock is always same-origin with its own PTY; and a fleet card
# whose tuple does not resolve renders NO panel at all, not an unavailable one. The producer
# is MILESTONE 49, which dials a per-pane origin and must first copy `assign`'s
# `workspace-not-local` guard onto `/api/mesh/board-url` (spike 44 §Outcome). So:
#   - a conformance reviewer must NOT log the state's absence from a PRODUCTION render as a
#     fresh finding — it is named in advance precisely so "not built" can be told from
#     "built and never triggered" (the round-trip m45's DG-45-5 cost by being named in
#     arrears);
#   - the `@uat` visual row for this pane TRAVELS to milestone 49's gate when 49 produces it
#     for real. It is RE-POINTED, NOT DELETED. Deleting it would retire the only check that
#     the state an operator finally meets is the one that was designed.
#
# ══ THE DISTINCTION THIS TASK EXISTS TO PROTECT ══════════════════════════════════════════
# Two absences, two meanings, and they must not converge:
#   - NO PANEL AT ALL — a card whose assignment carries no resolvable (nodeId, sessionId)
#     tuple renders nothing: not an empty frame, not a disabled toggle, and NOT an
#     `unavailable` pane. ADR-014 invariant 4 / V1, enforced structurally today at
#     [stream.mjs:60-67] (the resolve), [stream.mjs:91-94] (no owner, no header) and
#     [FleetTerminalView.tsx:282] (`if (header == null) return null`). THAT RULE IS NOT
#     RELAXED HERE, and the story that unifies the two components is exactly where it would
#     be relaxed by accident — an `unavailable` state is a tempting home for "we have
#     nothing to show".
#   - UNAVAILABLE — there IS an owner and there IS a session; what cannot be resolved is
#     WHERE to reach it. The pane keeps its header so that, in a grid of panes (m49), the
#     operator can tell WHICH one is unavailable.
# And one more boundary, which the origin seam creates for the first time: an origin we do
# not HAVE is `unavailable`; an origin we have and cannot CONNECT to is `error`.
# `unavailable` is entered BEFORE any socket exists and is never entered from a live state
# (DESIGN §The transitions, rule 4) — a pane that was live and then died is `error`.
#
# ══ LITMUS ═══════════════════════════════════════════════════════════════════════════════
# The MODEL half — which state, which copy, which ramp, and that no URL is produced — is
# `@executable` over the framework-free `.mjs` set under plain `node`. The RENDER half is
# `@manual`: an agent drives the fixture in a real browser and records what it sees, because
# this repo's headless mount harness never builds an xterm or opens a socket at all (task
# 00's header measures why). The PIXEL judgement is task 04's `@uat` row, which is the one
# that travels to 49.
#
# NOT ASSERTED HERE: that the URL builder reads no global and holds no port literal — that
# is `test/arch/acd-terminal-origin-not-port.test.mjs`. What IS asserted is the observable
# consequence: an unresolved origin yields no URL, so there is nothing to open.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the
# full suite (`global-work-propagation.test.mjs` binds :4182, which the live control daemon
# holds).

@ui @work @design
Feature: a pane that cannot resolve its origin says so, says why, and says what to run — and a pane with nothing to show renders nothing at all
  In order that an operator who opens a terminal on a machine that does not hold the work sees an answer rather than a dead rectangle, and can tell "elsewhere" from "broken"
  the control must render a labelled `unavailable` state naming its cause and its recovery command, must open no socket to do it, must never paint it red or animated, and must never use it for a pane that simply has no session to show

  Background:
    Given the one control from 46/03's core, handed an origins argument by whichever surface mounts it
    And the model scenarios below load the control's framework-free `.mjs` set under plain `node` — no bundler, no DOM, no browser
    And the state has NO production producer in this milestone (DG-46-3), so every render below is driven from a forced fixture

  # THE CAUSES, AND THE WORDING IS DESIGN'S. Row 3 is the case this milestone's own origin
  # seam creates and for which DESIGN fixes no line — it is enumerated here deliberately
  # rather than resolved in the build.
  @executable
  Scenario Outline: an origin that cannot be resolved yields `unavailable`, naming its cause and the operator's way forward
    Given a pane whose origin cannot be resolved because <why>
    When the control's state for that mount is read
    Then the state is `unavailable` and the chip label is `unavailable`
    And line 1 of the pane reads <cause> — verbatim
    And line 2 carries <recovery>
    And the state reads as `blocked`, never as a failure
    And it carries no motion at all
    And the header is still fully populated: the lockup, the identity line, the posture pill where the mount declares one, and the state chip

    Examples:
      | case                                     | why                                                          | cause                             | recovery                                                  |
      | the work is on another machine           | the workspace is not checked out on this machine              | `not checked out on this machine` | the workspace path, mono and muted — the operator's own answer to "where is it, then" |
      | the board's origin did not answer        | the board's origin was asked for and did not answer           | `board unreachable`               | the command that opens it, mono: `aof work ui`            |
      | NO FLEET ORIGIN WAS EVER HANDED OVER     | the surface was handed no fleet origin at all — nothing served it and no default resolved | a named cause and the command that produces the missing server | the same, mono |
    # ROW 3 IS A RAISED GAP, NOT A COPY DECISION. DESIGN §The unavailable pane fixes exactly
    # two causes, both from spike 44 sub-question 5, and neither covers "the board holds no
    # fleet origin" — which is precisely the case ADR-004's seam introduces. The build must
    # NOT invent a third line: if this row cannot be satisfied with wording DESIGN fixes, it
    # is a design gap raised against DESIGN §The unavailable pane and settled there, in the
    # same change. (In practice m46's command layer always resolves a default, so the row is
    # reachable only from a fixture — which is exactly what this task renders from.)

  # THE BOUNDARY. Three different "there is nothing to look at" situations with three
  # different answers. Getting these confused is how a blank pane or a red "elsewhere" ships.
  @executable
  Scenario Outline: what is NOT unavailable — the three neighbouring cases, each with its own answer
    Given <situation>
    When the control's state for that mount is read
    Then the answer is <answer>
    And it is specifically NOT <not this>
    And <extra>

    Examples:
      | case                                    | situation                                                        | answer                                        | not this                          | extra                                                                 |
      | the origin resolved, the socket refused | an origin the surface HAS, whose socket is refused                | `error`, with `connection failed` as its cause | `unavailable`                     | a refusal on a resolved origin is a failure, and failures are named as failures |
      | a pane that was live and then died      | a streaming pane whose socket drops                               | `error`, with `disconnected — the stream dropped` | `unavailable`                  | unavailability is a statement about an ORIGIN, never about a session that ended |
      | no target node on the assignment        | an assignment carrying no target node                             | no panel at all                               | `unavailable`, and not an empty frame | no socket, no header, no toggle — the card simply has no terminal region |
      | no session captured yet                 | an assignment with a target node and no session id                | no panel at all                               | `unavailable`, and not a disabled toggle | this is the NORMAL not-yet-captured case, and it must stay silent |
      | a stream with no nameable owner         | a resolved tuple with neither an item ref nor an assignment id    | no panel at all                               | an anonymous terminal             | V1 — a terminal with no visible owner is never rendered |
      | the dock with nothing bound             | the board dock open with no session                               | `idle` and the centred empty line              | `unavailable`                     | nothing is wrong; nothing has been asked for yet |
    # ROWS 3-5 ARE THE RULE THIS TASK IS PROTECTING, NOT RELAXING (ADR-014 invariant 4 / V1).
    # ROWS 1-2 are the ramp's own boundary, and they are why `unavailable` can never be
    # reached from a live state.

  # NO SOCKET, AND NO WAY BACK EXCEPT A REAL ORIGIN. The structural half is the same one the
  # fleet already keeps: an unresolved source yields no URL, so there is nothing to open.
  @executable
  Scenario: an unavailable pane opens no socket, and no transition can talk it into one
    Given a pane whose origin cannot be resolved
    When the control builds its socket URL
    Then there is no URL to build — the builder yields nothing for an unresolved origin
    And no socket is opened, so the pane never passes through `connecting` and never sits on `waiting for output`
    And no byte, no close and no error can arrive, because nothing is connected
    And the pane cannot transition to any other state from within itself: the only exit is a re-mount whose origin resolves
    And an `unavailable` pane is never reached FROM `streaming`, `waiting`, `ended` or `error` — it is entered before any socket exists or not at all

  # ────────────────────────── the fixture render ──────────────────────────
  # THE ONLY WAY TO SEE IT IN m46. Named as a fixture render so nobody reports the fixture
  # itself as a defect, and so nobody reports its absence from production as one either.
  @manual
  Scenario Outline: the unavailable pane, rendered from a forced fixture in a real browser, looks like an absence and not like a failure
    Given the control mounted at <host> and forced into `unavailable` with cause <cause> by a fixture
    When the surface is rendered in a real browser with the network panel recording
    Then the header renders in FULL — the lockup, the identity line, the posture pill where the host declares one, and the state chip
    And the chip reads `unavailable`, with a DASHED, HOLLOW dot — not a filled one
    And the byte area holds a centred dashed block carrying the cause on its first line and the recovery on its second
    And nothing on the pane is red, and nothing pulses, spins or animates
    And there is no dimmed terminal underneath it — there is no terminal
    And the network panel shows ZERO WebSocket connections opened for that pane
    And the pane offers no control: no Retry, no "open on its own origin" link — text only in m46, because nothing on this surface can fix it

    Examples:
      | case                        | host                    | cause                             |
      | the board dock              | the board dock          | `not checked out on this machine` |
      | a fleet assignment card     | a fleet assignment card | `board unreachable`               |
    # EVIDENCE RECORDED IN `VERIFICATION.md` (46), 46/04 section, at `aof:verify 46`: the
    # build stamp; how the fixture was forced (so the render is reproducible); the absolute
    # screenshot path per row; and the network-panel excerpt showing no socket for the pane.
    # THE REVIEWER'S STANDING NOTE, repeated because it is the whole point of naming DG-46-3
    # in advance: this state has no production producer in m46. Its absence from a live
    # render is NOT a finding. Its producer, and the `@uat` row's new home, is milestone 49.
