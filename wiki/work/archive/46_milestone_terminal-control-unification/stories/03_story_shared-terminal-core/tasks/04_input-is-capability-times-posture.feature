<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 46/03, the INPUT POLICY: ADR-002's `inputEnabled = source.canInput
# && !mount.readOnly`, with `disableStdin = !inputEnabled`. Two independent axes —
# CAPABILITY is the source's (can bytes travel up this lane at all) and POSTURE is the
# mount's (may they, here). One boolean cannot express what the product already does: the
# SAME `mirror` source is typeable in the board dock (`TerminalDock.tsx:150-155`, `:261-263`)
# and read-only on the fleet card (`FleetTerminalView.tsx:170-173`), today, in shipped code.
#
# THIS IS ARCH-TEST INVARIANT 4'S POLICY HALF, AND IT IS LOAD-BEARING. ADR-006 re-expresses
# invariant 4 as three assertions because a directory sweep of `ui/src/fleet/**` will read
# GREEN and VACUOUS once the control moves out of that directory — "worse than deleting it,
# because a green gate is read as a satisfied contract". Assertion 2 is this feature: the
# policy driven BEHAVIOURALLY over the whole frozen source table × both postures, which is
# a far stronger pin than an absence-of-string sweep. Making the fleet's panes typeable is
# milestone 49; this milestone changes WHERE the read-only posture is enforced, never
# WHETHER.
#
# LITMUS: every Then is a returned VALUE from the shared framework-free `.mjs` set ADR-001
# homes at `ui/src/terminal/`, loaded by `node:test` under plain `node` — no bundler, no
# DOM, no xterm, no socket. The policy and the mount model are read as values: what
# `inputEnabled` answers, what the mount model declares, which labels it carries, which
# chrome it offers. No source read, no `className` archaeology, no browser fact.
#
# WHAT A MODEL CANNOT SETTLE, AND WHERE IT GOES INSTEAD. That the `read-only` pill is
# actually PAINTED on both the inline and the expanded header, at 390 and on a narrow card,
# never truncated and never yielding to anything else, is a pixel fact — 46/04's
# design-conformance review and its `@uat` render verdict, where DESIGN calls a read-only
# pane rendered without its label "a GAP of the highest severity in this milestone". That
# the fleet page's MOUNT declares the read-only posture at its call site is 46/04's story
# and `acd-fleet-terminal-input-constrained`'s first re-expressed assertion.
#
# NOT ASSERTED HERE — deliberately left to a fitness function: the CALL SITE half of
# invariant 4 (`ui/src/fleet/Fleet.tsx:759` mounts the control read-only) and the surviving
# `ui/src/fleet/**` directory sweep are both `acd-fleet-terminal-input-constrained`'s;
# *exactly one xterm construction site* is `acd-terminal-server-only`'s; and *the shared set
# imports no React* is `acd-terminal-control-boundary`'s. ALSO NOT ASSERTED HERE: which
# hosts declare fullscreen, drag-resize or a restart control — those are per-host
# DECLARATIONS made at the call site (DESIGN documented default 13) and belong to 46/04 and
# 46/05, not to the shared policy.
#
# ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED.

@executable @ui @work @design
Feature: input is the source's capability times the mount's posture, and a read-only mount has no input path at all
  In order that the same worker mirror stays typeable in the board dock and stays read-only on a fleet card until milestone 49 flips one declaration at one call site — and that an operator can never believe a keystroke reached a worker when it did not
  input must be decided by a pure function of the source's capability and the mount's posture, a read-only mount must wire no input path rather than a disabled one, and the read-only posture must travel as an explicit text label rather than as colour or as the absence of an input box

  Background:
    Given the shared terminal core loaded under plain `node` — no bundler, no DOM, no xterm, no socket
    And the input policy and the mount model read as values, with no surface mounted

  # HEADLINE 1 — THE TRUTH TABLE, EXHAUSTIVE. Four rows, and the whole point is that one
  # boolean cannot express them: two of the four differ only in the MOUNT.
  Scenario Outline: input is enabled only when the source can carry it and the mount permits it
    Given a source whose input capability is <can input>
    And a mount whose posture is <posture>
    When the input policy is applied
    Then input is <input enabled>
    And stdin is <stdin>
    And the two answers are exact negations of each other — there is no third state in which a widget accepts keystrokes and drops them

    Examples:
      | case                                                          | can input | posture   | input enabled | stdin    |
      | a lane that carries input, mounted interactively              | yes       | interactive | enabled     | enabled  |
      | the SAME lane, mounted read-only                              | yes       | read-only   | disabled    | disabled |
      | a lane that cannot carry input, mounted interactively         | no        | interactive | disabled    | disabled |
      | a lane that cannot carry input, mounted read-only             | no        | read-only   | disabled    | disabled |
    # Rows 3 and 4 need a synthesized descriptor — both entries of the frozen table declare
    # `canInput: yes` (the mirror lane has carried input since m42). They are here because
    # the AND is the contract: a future read-only-by-construction source must not become
    # typeable by being mounted in the dock, and only rows 3 and 4 can catch that.

  # HEADLINE 2 — the same table over the REAL two sources and the REAL two mounts. This is
  # the state the milestone must ship in, and it is the reason `isRemote` cannot express it.
  Scenario Outline: the same `mirror` source is interactive in the dock and read-only on a fleet card
    Given the source <source>
    And it is mounted <mount>
    When the input policy is applied
    Then input is <input enabled>
    And the source's own capability is unchanged by the mount — the posture never mutates the descriptor it is applied to
    And reading the source's capability alone never answers whether input is wired: `canInput` is a capability and the permission is the mount's

    Examples:
      | case                                                        | source    | mount                        | input enabled |
      | the board dock's own PTY                                    | local-pty | in the board dock            | enabled       |
      | a worker mirror opened in the board dock                    | mirror    | in the board dock            | enabled       |
      | the fleet card's peek at the same worker                    | mirror    | on a fleet card, read-only   | disabled      |
      | a local PTY on a read-only mount — the POSTURE decides      | local-pty | read-only                    | disabled      |
    # Rows 2 and 3 are the same descriptor with two answers, which is precisely what a single
    # `interactive` flag on the source cannot do — ADR-002 rejects that alternative by name.
    # Row 4 is the mirror image and it is what makes milestone 49 a one-line change at one
    # call site: the control does not change when the posture flips.

  # ADR-002, verbatim: "Read-only means read-only IN FACT, not by omission." The failure this
  # prevents is the one m38 refused in the other direction — a half-disabled widget that
  # swallows keystrokes silently.
  Scenario: a read-only mount yields no input path at all, rather than a disabled one
    Given a source that can carry input
    And a read-only mount
    When the mount model is derived
    Then it declares stdin disabled
    And it registers no keystroke sink whatsoever — no data handler, no key handler, no binary handler, absent rather than present-and-ignored
    And it names no send path for keystrokes, so there is nothing for a later refactor to re-enable by deleting a guard
    And its cursor does not blink and is an underline — the "you can type here" affordance is absent, which is the posture's second non-colour signal
    And every one of those is a value on the model, so a caller cannot ship the posture as styling

  Scenario: an interactive mount is the only one that carries an input path, and it carries a blinking cursor
    Given a source that can carry input
    And an interactive mount
    When the mount model is derived
    Then it declares stdin enabled
    And it registers exactly one keystroke sink and names exactly one send path
    And its cursor blinks — the affordance and the capability agree
    And it carries no `read-only` label, because a pane that accepts keystrokes must never wear the mark that says it does not

  # DESIGN §Read-only is a posture, and the escalation that makes this the highest-severity
  # rule in the milestone: "Under one control NEITHER posture has an input row… So the
  # absence no longer distinguishes anything, and the `read-only` label plus the
  # non-blinking cursor are the ONLY two signals of the posture."
  Scenario: the read-only posture is carried as an explicit label, and the absence of an input box no longer distinguishes anything
    Given a read-only mount of any source
    When the mount model is derived
    Then it carries the label `read-only`, as text
    And the label carries its explanatory title: "This view mirrors the worker's terminal. It cannot type: keystrokes never reach the worker."
    And the same label is on the inline header model and on the expanded header model — one posture, both headers, because fullscreen is a bigger box and not a different pane
    And the posture is never carried by colour, and never by a dimmed or greyed treatment alone
    And the model declares NO input region in either posture, so the absence of an input row signals nothing and the label is doing all the work
    And the two postures' models differ in the input path, in the cursor and in this label — and in nothing that only a colour could carry
    # Preserves `ui/src/fleet/terminal-view/stream.mjs:104-107`, which names `readOnlyLabel`
    # in the model precisely "so the component cannot ship the posture as styling only"
    # (m38 DESIGN V2/V6). Under one control that helper's reason gets stronger, not weaker:
    # the interactive dock has no input box either (`TerminalDock.tsx:412-425`), so the
    # signal V2 originally rested on is gone.

  # DESIGN §Read-only is a posture, point 4: "No interactive-only chrome… Their absence is a
  # CONSEQUENCE, never the signal."
  Scenario Outline: interactive-only chrome follows the derivation, and its absence is a consequence rather than the posture's signal
    Given the source <source> mounted <mount>
    When the mount model is derived
    Then the provider picker is <picker>
    And whether the picker is offered is derived from the source's declared params and the mount's posture, not from a conditional at the call site
    And the picker's absence is never the thing that tells an operator the pane is read-only — the label is

    Examples:
      | case                                                     | source    | mount                      | picker      |
      | a local session the operator is about to start           | local-pty | in the board dock          | offered     |
      | a worker mirror in the dock — the session already exists | mirror    | in the board dock          | not offered |
      | the fleet card's read-only peek                          | mirror    | on a fleet card, read-only | not offered |
      | a local PTY on a read-only mount                         | local-pty | read-only                  | not offered |
    # Row 2 is DESIGN S2's reasoning applied in the dock as well: there is nothing to pick,
    # because the session already exists on another machine. The picker becomes a property of
    # the descriptor's own params (ADR-002), not the component-level conditional at
    # `TerminalDock.tsx:326-331`.

  # The picker itself moves in this story, so its coverage moves with it. Preserved from
  # `test/terminal-dock.test.mjs`: exactly one selected at all times, and selecting moves the
  # single selection — never two on, never zero on.
  Scenario Outline: the provider picker keeps exactly one selection at all times
    Given a picker whose selection is <starting selection>
    When the provider <selected> is chosen
    Then the selected provider is <selection after>
    And exactly one provider reads as selected
    And the other two read as unselected — never two on, and never zero on

    Examples:
      | case                                            | starting selection | selected           | selection after |
      | the default, before anything is chosen          | (the default)      | (nothing)          | claude          |
      | claude to codex                                 | claude             | codex              | codex           |
      | claude to gemini                                | claude             | gemini             | gemini          |
      | codex to claude                                 | codex              | claude             | claude          |
      | codex to gemini                                 | codex              | gemini             | gemini          |
      | gemini to claude                                | gemini             | claude             | claude          |
      | gemini to codex                                 | gemini             | codex              | codex           |
      | re-selecting the one already selected           | codex              | codex              | codex           |
      | a provider id nothing recognises                | codex              | some-future-agent  | codex           |
      | an empty id                                     | codex              | ""                 | codex           |
      | a selection applied to an absent picker state   | (absent)           | (nothing)          | claude          |
    # The six from→to pairs are `test/terminal-dock.test.mjs`'s lane, preserved through the
    # move. The last four are QA's edges on the same invariant: an unknown id is a no-op that
    # leaves the selection VALID rather than clearing it (`provider-picker.mjs:20-23`), because
    # a picker that can reach zero-on is a picker that can start a session with no provider.

  # ADR-006's assertion 2, stated as the sweep it replaces: the policy is driven over the
  # WHOLE frozen table × BOTH postures, so no entry and no posture is left unasserted.
  Scenario: the policy is exercised over every entry of the frozen table in both postures, and only one combination in the table yields an input path per source
    When the input policy is applied to every entry of the frozen source table in both postures
    Then every combination yields an answer — the policy is total over the table, not a lookup with a hole in it
    And for every entry, the read-only posture yields no input path
    And no entry becomes typeable by being read at a different origin, at a different geometry, or under a different socket URL
    And the count of combinations that yield an input path is exactly the count of interactive mounts of input-capable sources — which is what makes this pin stronger than an absence-of-string sweep over a directory the control no longer lives in
