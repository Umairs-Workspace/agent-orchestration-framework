<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/05, THE HUMAN GATE: a person judges the GRID PANE (S2) and the EXPANDED
# PANE (S3) over real browser renders, region by region, in every state DESIGN's render targets
# name — plus the six design gaps that resolve on those two surfaces.
#
# LITMUS: every Then is confirmable from a RENDERED SCREENSHOT, or from a NUMBER or an OBSERVATION
# QA measures off that same render and hands over. Never from component source. Where no render
# exists, the honest verdict is INCONCLUSIVE naming the missing render.
#
# WHY THIS IS `@uat` AND NOT `@executable`. Tasks 00-05 of this story pin every fact a value can
# carry: which rows become tiles, which socket is constructed to which URL, which word the chip
# reads, how many live regions exist, what the cap's copy says, where focus returns. NONE of them
# can settle whether the tile READS as the same control one host over, whether the focus ring is
# actually visible on the tile's frame, whether the caret sits legibly inside the terminal once
# expanded, whether a grid row's tiles hold still when one of them ends, or whether a screen
# reader narrates one thing instead of twelve. Those are pixel and perceptual facts and they
# belong to a person. This task exists because those observables were correctly routed OUT of the
# six behavioural contracts and had nowhere to go.
#
# THE CONFORMANCE SOURCE IS WHICHEVER IS CURRENT AT REVIEW TIME. No mock is committed for either
# surface: `mocks/s2-grid-pane.png` and `mocks/s3-expanded-pane.png` are PENDING and the operator
# is generating them from the committed `mocks/PROMPT.md`. UNTIL A FILE LANDS, DESIGN §S2's AND
# §S3's BINDING CHECKLISTS ARE THE BASELINE — mandatory, not a supplementary rubric — so a review
# that runs before the mocks arrive HAS something to judge and must NOT return INCONCLUSIVE on the
# grounds that no mock exists (07/ADR-003; the m03 lesson). When a mock lands it SUPERSEDES the
# checklist FOR ITS SURFACE wherever the two differ, and DESIGN.md is amended in the same change:
# a checklist left contradicting a committed mock is a defect, not a nuance. A remote design-tool
# link is never a substitute — the reviewer is read-only and cannot open one. No placeholder PNG
# is ever committed: an absent mock is honest, a stand-in one is indistinguishable from a real
# baseline.
#
# AND ON TOP OF THAT, 46/mocks/CONFORMANCE.md BINDS EVERY REGION S2 AND S3 INHERIT. The grid pane
# is the SAME control: its header lockup, identity line, `read-only` pill, state chip, byte area,
# non-live bar and control cluster are m46's, not this document's. What milestone 49 adds is the
# TILE around them and the GRID around that.
#
# BROWSER LANE (QA-OWNED). QA runs the browser and drives the harness; the designer judges the
# renders it is handed and has no `Bash`. Per the house design-render discipline, `npx playwright`
# is POLICY-BLOCKED here — the render drives the cached ms-playwright Chromium directly
# (`--headless=new --screenshot=<ABSOLUTE forward-slash path>`). The terminals home is `/` on the
# FLEET origin, `http://127.0.0.1:4181` (fixed port). The review READS the running daemons; it
# never starts or restarts one — that is the operator's, on request.
#
# THE CAPTURE PROBLEM ON THIS MACHINE, NAMED IN ADVANCE BECAUSE IT WILL COST A ROUND-TRIP
# OTHERWISE. RESEARCH §Q1 measured all three roster nodes reporting `sessions: []` while two of
# them reported non-empty `activeRuns`, and the bundled session hooks are Codex-only (this repo's
# own Claude records come from a hand-authored `.claude/settings.json`). Story 49/07 lands the
# bundled hooks and lands LAST by ADR-005's ordering constraint. So a POPULATED S2 render may not
# be summonable from the live fleet at review time, and the fixture lane is then the honest source
# for the tiles themselves. Whichever was used is RECORDED in the verdict, per render.
#
# THE AUTOMATED a11y LANE IS OFF, AND THAT IS THE DECISION RATHER THAN AN OVERSIGHT. This
# workspace's `.aof/aof.config.json` declares `work.tags.domains` with no `a11y` entry and carries
# no `work.ui` block at all, so the opt-in axe-core lane is not enabled: THERE IS NO axe-core RUN
# IN THIS STORY AND NO a11y FINDING WILL COME FROM ONE. DESIGN's accessibility requirements
# therefore bind this review as HUMAN judgement, which is why the live-region, focus-order,
# hit-target, accessible-name and non-colour clauses appear below rather than in an automated lane.
#
# NOT JUDGED HERE, each with an owner:
#  - S1 — the PAGE: its chrome, the surface-slot summary, the grid container, and DG-49-1's two
#    empty states plus loading and error (renders R-A/R-B/R-C at the page level) — story 49/04.
#    Renders R-B and R-C are captured for that review; THIS review reads only the TILES in them.
#  - DG-49-6, reduced motion, and its second `prefers-reduced-motion: reduce` capture — story
#    49/06. What IS judged here is the one motion claim about this story's own mark: the
#    `needs input` pill never animates.
#  - DG-49-8, the `(session)` line's dedupe and its render R-G on the fleet node card — story 49/01.
#  - anything tasks 00-05 already pin as a value: which URL is dialled, which rows become tiles,
#    which word follows which event, how many live regions the tree carries, what the held copy
#    says. This review judges whether the rendered RESULT of those reads right — it does not
#    re-assert them, and it never infers a verdict from source.
#  - the shell's own chrome, z-rungs and skip link — milestone 45's, not re-baselined here.
#
# A CITATION NOTE, folded in from QA finding 9: DESIGN's `Fleet.tsx` line numbers have drifted
# because m47's edits are UNCOMMITTED in this working tree, and they will move again before this
# story is built. Cite the grid track BY ITS VALUE — `repeat(auto-fill, minmax(320px, 1fr))` with
# `gap-4` (around `Fleet.tsx:921` today, cited as `:914` in DESIGN) — and treat the line as a hint,
# never as the anchor.
#
# ISOLATION, for any suite whose evidence is produced beside this review:
# `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the full suite
# (`test/global-work-propagation.test.mjs` binds `:4182`, which the live control daemon holds). No
# scenario below binds a port and no `node:test` drives one; a person does.

@uat @ui @work @design
Feature: the grid pane and the expanded pane, judged by a person — one control in a fourth host, honest in every state it can reach, typeable where the words are, and never narrating the whole fleet
  In order to confirm that an operator meeting a screen of live terminals sees the product they already know — the same pane, in a grid — and that every honest state this milestone invented is legible, calm and impossible to mistake for a fault
  the tile is rendered at every documented track width in every state DESIGN's R-D and R-E name, the expanded pane is opened from a tile at R-F, and both are judged region by region against DESIGN §S2/§S3's binding checklists and 46/mocks/CONFORMANCE.md beneath them (CONFORMS / GAPS)

  Background:
    Given the terminals home is rendered at `http://127.0.0.1:4181/` through the cached ms-playwright Chromium to an absolute screenshot path — never `npx playwright`
    And the render set covers DESIGN's targets for this story: R-D (S2 at the 1280 track, ≈394px, in nine states) · R-E (S2 at the floor track, 320px, `streaming` and `waiting`) · R-F (S3 opened from a grid tile at 1280×800)
    And the tile is additionally read at 390 and at the desktop app's own 760×520 window, off the renders story 49/04 captures for the page
    And the frames with no production producer — `needs input`, `unavailable`, and the two held frames — are captured from a FIXTURE, and the verdict records which frames those were
    And QA drives the keyboard and screen-reader pass and hands the observations and measurements over; the designer judges what it is handed and runs no browser

  # RENDER GATE — the review never guesses from code, and never returns INCONCLUSIVE for the wrong
  # reason. The m35/m43/m45/m46 precedent, and it is what keeps the verdict honest when a capture
  # fails.
  Scenario: absent a render the review degrades to INCONCLUSIVE naming the missing render — but a missing MOCK is never grounds for it
    Given the render did not produce a screenshot of a required surface, width or state
    When the design-conformance review runs
    Then the verdict is INCONCLUSIVE
    And it names the missing render — the surface, the width and the state it was supposed to show
    And it does not infer a verdict from component source
    And it does NOT return INCONCLUSIVE on the grounds that `mocks/s2-grid-pane.png` and `mocks/s3-expanded-pane.png` have not landed: DESIGN §S2's and §S3's binding checklists are the mandatory baseline until they do
    And if the live fleet could not be made to hold a streaming session, that is named as the reason a fixture capture was used — never as a reason to skip the state

  # WHICH BASELINE WAS JUDGED — recorded per surface, every time, because the answer changes the
  # moment the operator commits a file.
  Scenario Outline: the review names the conformance source it judged against, per surface, and a committed mock supersedes the checklist wherever the two differ
    Given `<mock>` is <mock status> at review time
    When the design-conformance review judges that surface
    Then the verdict names <source> as the conformance source for it
    And <what happens to the checklist>

    Examples:
      | case                        | mock                       | mock status                            | source                                     | what happens to the checklist                                                                                  |
      | before the operator's mocks | mocks/s2-grid-pane.png     | absent                                 | DESIGN §S2's binding checklist              | it binds in full, and the review proceeds to a CONFORMS/GAPS verdict                                            |
      | after one lands, agreeing   | mocks/s2-grid-pane.png     | committed and consistent               | the committed mock                          | it still binds wherever the mock is silent                                                                      |
      | after one lands, differing  | mocks/s3-expanded-pane.png | committed and differing from a clause  | the committed mock                          | the differing clause is a GAP AGAINST DESIGN.md, raised so the document is amended in the same change            |
      | the inherited regions       | 46/mocks/Terminal Panel Spec.dc.html | committed                    | 46/mocks/CONFORMANCE.md                     | it binds every region S2 and S3 INHERIT — header lockup, identity, pills, chip, byte area, bar, control cluster  |
      | a link instead of a file    | either of the two          | offered as a remote design-tool link   | DESIGN's binding checklists                 | the link is refused as a baseline — the reviewer is read-only and cannot open one                                |
      | a stand-in image            | either of the two          | committed but blank or placeholder     | DESIGN's binding checklists                 | the placeholder is refused AND reported: a stand-in is indistinguishable from a real baseline, which is worse than an absent one |

  # THE THESIS. If this fails, the story has missed its point however many contracts are green.
  Scenario: the tile reads as the ONE control in a fourth host, not as a new component that resembles it
    When the designer judges S2 beside the shipped board dock and fleet card at 1280
    Then the tile is recognisably the same control: the same `▣` lockup, the same identity line, the same pill form, the same dot-plus-word state chip, in the same reading order
    And no colour, hex, radius, font, type step or `@theme` token on this surface is new
    And the tile invents no affordance the control does not already name — there is no ninth control on it
    And the tile's header is TWO declared rows at every width: identity above, status below, never merged and never wrapped into a third
    And the reading order is identity > `read-only` > `needs input` > state > repo > expand > toggle
    And the verdict for this region is CONFORMS or names a specific GAP

  # S2, REGION BY REGION, AT EVERY WIDTH THE GRID CAN PRODUCE.
  Scenario Outline: the grid pane's regions, in order, at <width>
    Given R-D / R-E and the tile as it renders at <width>
    When the designer judges it against DESIGN §S2's binding checklist
    Then T0 is the control's own non-dock frame — rounded, bordered, on the dark chrome — with the focus ring drawn on the FRAME when the tile is focused
    And C1a is ONE line that never wraps: the lockup glyph, the identity `<owner> → <nodeId>` truncating only when it must, then the `read-only` pill when the posture is read-only, then the `needs input` pill when it is asserted
    And C1b is ONE line that never wraps: the state chip (absent entirely when the tile is unsubscribed), the repo when it is not already the owner, then `ml-auto` expand and the worded toggle
    And C2 is the aspect-locked byte area holding exactly one scaled 80×24 screen, anchored top-left, never cropped and never re-wrapped
    And C3, when present, is ONE bar inside C2's box and never two
    And C4 IS ABSENT: there is no input row, no text field, no send control and no greyed placeholder, in either posture
    And <what to check hardest>
    And the verdict for this width is CONFORMS or names a specific GAP

    Examples:
      | case                        | width           | what to check hardest                                                                                                                       |
      | the primary judgement width | the 1280 track  | all nine R-D states render their WORD in full, and no header row is overprinted, ellipsised or shrunk by a scale factor                      |
      | THE HIGHEST-RISK CELL       | the 320px floor track | `streaming` and `waiting` are the two widest headers: both rows must stay intact and the identity must still be readable — the tail is already dropped at every grid width, so nothing else may yield except the identity's own truncation |
      | the desktop app's window    | 760×520         | the two-column grid inside a 432px content box — the tile's whole anatomy must still fit, and the grid scrolls while the shell chrome does not |
      | mobile                      | 390             | one column, and the tile header still TWO rows with nothing overprinted                                                                       |

  # THE STATES, ONE ROW EACH. This is R-D's nine, and it is where the milestone's honesty is
  # either visible or lost.
  Scenario Outline: each state the tile can reach renders its own signals, and none borrows another's
    Given the R-D frame for <state>
    When the designer reads the tile
    Then <what must be true>
    And the state's WORD is present in full — a dot with no word is a GAP
    And the verdict for this state is CONFORMS or names a specific GAP

    Examples:
      | state                  | what must be true                                                                                                                              |
      | connecting             | a pulsing secondary dot, the word `connecting…`, and C2 EMPTY — no line, because a sub-150ms flicker that prints two strings says nothing        |
      | waiting                | a muted dot with NO motion, the chip `waiting for output`, and C2's top-left line `connected · waiting for first output`                          |
      | streaming              | a pulsing primary dot, the word in its measured teal, C2 full and undimmed, and no bar                                                           |
      | ended                  | C2 dimmed with the bar reading `stream ended`, at UNCHANGED tile height                                                                          |
      | exited (N), N non-zero | the failure ramp: destructive dot, `exited (N)`, and its mandatory cause line in the bar                                                          |
      | error                  | a destructive dot, the chip `error`, the pane dimmed, and THE CAUSE LINE IS MANDATORY in the bar                                                  |
      | no live output         | the chip `no live output` and C2's top-left line `no live output — no assignment is relaying this session` — no motion, no dimming, nothing red   |
      | held, a slot free      | NO state chip at all, C2 holding one centred `not streaming`, and the worded toggle reading `Watch terminal →`                                    |
      | held, at the cap       | NO state chip, C2 holding one centred `not streaming — <N> live panes already · hide one to watch this`, and NO worded toggle beside it            |
      | needs input            | the quiet `needs input` pill on the IDENTITY row while the connection chip keeps its own form and position on the STATUS row — one chip, one mark, no competition |
    # The last three rows are FIXTURE-DRIVEN — see the fixture scenario below. The `no live output`
    # row is DG-49-2's close condition and the two held rows are DG-49-4's.

  # S3 — EXPAND. NOT REDESIGNED. Only what differs when a TILE opened it, plus the two things that
  # must be confirmed UNCHANGED.
  Scenario: the expanded pane opened from a tile is the same pane, bigger, with exactly three deltas
    Given R-F: the pane presented from a grid tile at 1280×800, streaming
    When the designer judges it against 46/DESIGN §S3 and DESIGN §S3's three deltas
    Then it is the same identity fragment as the tile's, with the `read-only` pill travelling as it always did and the `needs input` pill travelling WITH the identity
    And the exit control is visible in the capture: never hover-revealed, never auto-hiding, never fading — the occupant is interactive, so it CLAIMS `Escape` and the visible control is the only way out
    And focus is INSIDE the terminal, not on the exit control — the caret is legible at this size and QA reports which element holds focus
    And dismissing returns focus to the TILE, restoring the grid's roving stop — never to a button inside the tile and never to the document body
    And the shell's chrome is GONE, not dimmed and not showing through
    And there is no fullscreen-only state, no fullscreen-only copy and no second identity vocabulary
    And the verdict for this region is CONFORMS or names a specific GAP

  Scenario: presenting and dismissing cost LAYOUT only, and the capture is where that shows
    Given R-F, plus the tile's own frame captured immediately before presenting and immediately after dismissing
    When the designer compares the three frames and reads QA's measurements off them
    Then the expanded pane shows the SAME scrollback the tile held — an EMPTY pane on present is the visible tell that the session was re-subscribed, and it is a GAP of the highest severity in this family
    And the tile after dismissal holds the same scrollback it held before, in the same place in the grid
    And QA reports that the socket count and the terminal count did not change across either transition
    And a held tile offers NO expand control at all, because there is no pane to present

  # THE DESIGN GAPS THIS STORY OWNS — one row each, as DESIGN requires, each with its own verdict
  # rule and its own consequence if the close condition is not met.
  Scenario Outline: each design gap is judged, and its close condition is either met or named as outstanding
    Given <render>
    When the designer judges it against <gap>
    Then <verdict rule>

    Examples:
      | gap      | render                                                     | verdict rule                                                                                                                                                                                                                              |
      | DG-49-2  | R-D's `no live output` frame                                | the chip reads `no live output` and the pane carries the sentence ONCE, top-left, `mono text-xs`, with no motion, no dimming and nothing red. A pane that says it twice, or that sits on `waiting for output` instead, is a GAP              |
      | DG-49-3  | R-D's `needs input` frame beside its `streaming` frame      | ONE chip and ONE mark, in two rows, two forms, two positions. The mark never pulses and never carries colour alone. An `unknown` badge on any tile is a GAP; the mark's ABSENCE from a production render is NOT a finding                    |
      | DG-49-4  | R-D's two held frames                                       | listed, at rest, naming the limit, with no chip, no dot, no motion, nothing red and never the dashed `unavailable` block. At the cap the toggle is ABSENT and the line names the recovery. A held tile rendered as an error is a GAP          |
      | DG-49-5  | R-E's tiles beside R-F                                      | the tile is a picture and the expanded pane is where the words are: the blinking cursor on an interactive tile is honest because typing is one deliberate act away, and R-F proves the act lands somewhere readable                          |
      | DG-49-7  | R-D and R-A's grid, plus QA's screen-reader pass            | ONE narrator: the grid announces the focused tile's state changes, sessions arriving or leaving, and the `needs input` count — and nothing else. A dozen panes announcing from a dozen places is the GAP this gap exists to prevent           |
      | DG-49-9  | every R-D frame                                             | NO `✕` on any tile, and `Hide terminal` present on every subscribed one. A dismissal control on this surface is a GAP: `close` here can only honestly mean "stop watching"                                                                   |
      | DG-49-10 | every degraded frame the review can produce                  | NO `unavailable` pane renders on this surface at all. A build that maps ROSTER STALENESS onto `unavailable` is a GAP — it sends an operator after an origin fault that is not there. Its absence from a production render is NOT a finding    |
    # DG-49-10 CARRIES NO ROW OF ITS OWN IN DESIGN's list because m46's DG-46-3 row TRAVELS ONWARD
    # rather than being deleted. It is judged here as an ABSENCE plus a prohibition, which is the
    # only honest way to judge a state this milestone deliberately does not produce.

  # THE FIXTURE-RENDERED STATES, NAMED IN ADVANCE — because a reviewer that cannot tell "not built"
  # from "built and never triggered" costs a full review round-trip.
  Scenario Outline: a state with no production producer is judged from a fixture, and its absence from a live render is not a finding
    Given the FIXTURE render of <state>
    When the designer judges it
    Then it is judged exactly like any other state, region by region
    And its absence from a production render is NOT logged as a finding, for <the reason>
    And the verdict records that this frame was fixture-driven

    Examples:
      | state                 | the reason                                                                                                                              |
      | needs input           | the producer needs a worker genuinely blocked on a human AT THE MOMENT OF OBSERVATION, which is not reproducible on demand — and the wire hop it rides is story 49/00's |
      | unavailable           | it STILL has no production producer after this milestone: the index carries no `ref`, `provider` or board origin, so every pane resolves against `mirror` on this page's own origin |
      | held, a slot free     | it needs more addressable sessions than a cap the review can reach on a fleet that mostly reports none                                    |
      | held, at the cap      | the same, at the cap itself — and the cap is sixteen, which no live fleet here will produce                                              |
      | a populated grid      | RESEARCH measured every node reporting `sessions: []` while runs were in flight, and the bundled session hooks land LAST (story 49/07)    |

  # THE THINGS A REVIEWER MUST NOT LOG. Each is arithmetic or a designed trade, and each has cost a
  # round-trip somewhere in this product's history.
  Scenario Outline: the designed consequences, named in advance so they are not logged as defects
    Given <render>
    When the designer sees <what they see>
    Then it is <ruling>

    Examples:
      | case                          | render                        | what they see                                                     | ruling                                                                                                                                                        |
      | tiny glyphs in a tile         | R-D and R-E                   | text too small to read word by word — 6.1–7.6px effective          | THE DESIGNED TRADE (DG-49-5): at every documented width a tile's glyphs are below the 10px smallest asserted-readable step. The tile answers "is it moving, and what shape is it in"; EXPAND answers "what does it say" |
      | no caret ring in the tile     | R-D's `streaming` frame       | no focus ring inside the byte area, and no text caret focus target | CORRECT: the inline xterm is never a keyboard focus target. Focus lands on the TILE, and its ring is on the tile's FRAME                                        |
      | the band in the EXPANDED pane | R-F                           | a band of empty terminal background at the right and/or bottom     | CORRECT and expected: the scale is the MIN of the two ratios, so the whole 80×24 screen fits and no column is ever cut. Its magnitude is a review-time measurement, never a pinned number |
      | a sub-pixel band in a TILE    | R-D                           | a hairline of background inside the aspect-locked box              | EXPECTED — the box is aspect-locked to the screen it holds, so the residual is sub-pixel by construction. A VISIBLE band in a tile at any documented width IS a gap, and that is the opposite ruling to the row above |
      | a capture caught mid-tick     | any surface                   | an UNSCALED screen at natural size, overflowing its box            | a CAPTURE ARTIFACT of the zero-box guard, not a finding — ask QA for a re-capture rather than logging a gap                                                     |
      | the grid is empty             | a production render at `/`    | no tiles at all while agents are demonstrably working              | ORDINARY, and it is story 49/04's surface to judge (DG-49-1). Here it is a reason to capture from a fixture, never a GAP against S2                             |

  # THE HIGHEST-SEVERITY RULE IN THIS FAMILY, judged on its own — because this milestone is where
  # the fleet origin finally becomes typeable, so the mark now DISTINGUISHES rather than decorates.
  Scenario: the `read-only` mark survives every width and every state, on the tile and on the expanded pane alike
    Given every render of a read-only tile — at the 1280 track, at the 320 floor track, at 390 — and of the pane expanded from one
    When the designer looks for the posture
    Then the `read-only` label is present, in TEXT, complete, in every single one of them — never dropped, truncated, abbreviated or hidden for space
    And the cursor in that pane does not blink, in any capture
    And an INTERACTIVE tile carries NO pill and a blinking block cursor, so the mark's presence means something specific
    And there is no input row anywhere, in either posture, on either surface
    And a read-only pane rendered without its label is a GAP OF THE HIGHEST SEVERITY IN THIS MILESTONE, because the failure it permits is an operator believing a keystroke reached a worker

  # COLOUR IS NEVER ALONE, judged the way the rule is written: take the colour away.
  Scenario: every state and every mark is legible without colour
    Given every R-D and R-E frame, judged in greyscale and under a colour-vision simulation
    When the designer reads each tile's state
    Then every state renders its WORD, in full, always
    And the `needs input` mark is a WORD first and has no colour of its own
    And `error` and a non-zero `exited (N)` are identifiable from their words and their cause lines, not from being red
    And a held tile is identifiable from its line, not from an absence of colour
    And the two dots that miss a 3:1 contrast ratio remain tolerable precisely because no meaning ever rests on a dot alone

  # ACCESSIBILITY, JUDGED BY A PERSON — because the automated lane is OFF (see the header). Two of
  # these have no precedent at this scale and must be BUILT rather than inherited.
  Scenario: the grid's accessibility obligations are visible in the renders and in a keyboard and screen-reader pass
    When QA drives a keyboard pass and a screen-reader pass over the rendered grid and hands the observations and measurements to the designer
    Then a grid of twelve tiles is ONE tab stop: one roving stop per tile, arrows moving between tiles by rendered position, `Tab` reaching the focused tile's own controls and then leaving the grid
    And the focus ring is the house ring, drawn on the TILE's frame, unmistakable at a glance across a grid, and never removed without replacement
    And no xterm is a tab stop inline — `Tab` never lands inside a byte area
    And focus does not move when the 5s poll re-renders the grid: the same session keeps the stop, four polls running (NO PRECEDENT at this scale: this must be built)
    And the screen reader announces from ONE place, politely, naming the session it is talking about — not from twelve panes at once (NO PRECEDENT: this must be built)
    And each tile's accessible name names the SESSION and its posture, so twelve panes are tellable apart — `aria-label="Terminal"` on twelve tiles is a GAP
    And every control on the tile measures at least 24×24 CSS pixels, achieved by PADDING, including the worded toggle measured at the TILE's width rather than the card's
    And the non-live bar is a status region and never an alert, and it is never clipped or truncated — it wraps if it must
    And the expanded pane keeps its dialog contract: an accessible name naming the session, a focus trap, an always-visible exit, and focus returned to the opener
    And the verdict for this region is CONFORMS or names a specific GAP

  # A MOCK THAT REACHES BEYOND THIS MILESTONE'S RAMP comes back as its own gap, never as a silent
  # build. DESIGN flags four of these by name in its own open questions.
  Scenario Outline: a mock that exceeds the ramp is raised, costed, and not absorbed
    Given a committed mock showing <what the mock shows>
    When the design-conformance review runs
    Then it is raised as a NAMED design gap with <consequence>
    And it is not absorbed into this story's build
    And this milestone continues to add no new token, no new hex and no new palette

    Examples:
      | case                    | what the mock shows                                  | consequence                                                                                                                     |
      | THE FLAGGED RISK        | the SHELL going dark around the tiles                 | a theme decision beyond this ramp — its own token work and its own milestone (45/DESIGN open question 6)                          |
      | a one-row tile header   | identity, both pills, the chip and two controls on ONE line | it reopens DESIGN open question 1, and the mock must also say what yields — and the answer cannot be the identity            |
      | node group headers      | the grid grouped by node with a header row per node    | it reopens open question 3 and costs the grid its uniform reflow inside a 432px content box                                      |
      | a scope or repo filter  | a filter bar above the grid                            | a second home for a concept `/fleet` already owns — a design gap for a later milestone, never a silent build here                 |
      | an input row            | a text field or a send control in either posture       | REFUSED OUTRIGHT — there is no input region in either posture, and adding one is the exact failure the posture exists to prevent  |
      | a dismissal control     | an `✕` on a tile                                       | REFUSED against DG-49-9 unless the PO overturns it — and if `close` is meant to end a remote session, that is a new write route and a new security question, neither of which is in scope |

  # THE BASELINE HAND-OFF. Stated once, so the follow-on has somewhere to attach — and this seam is
  # QA's.
  Scenario: an approved render becomes the visual-regression baseline QA owns
    Given the designer has judged S2 and S3 CONFORMS at every documented width and in every state above
    When the approved renders are recorded
    Then each becomes the baseline QA's `toHaveScreenshot` visual-regression compares future renders against
    And a later render that drifts from an approved baseline is a QA finding, routed like any other
    And building those baselines out into a hard gate is a QA-OWNED FOLLOW-ON, explicitly out of scope for this story
    And the two pulsing states — `connecting` and `streaming` — are excluded from, or deterministically sampled by, any such baseline, since they are the only motion on this surface
    And every fixture-driven frame is recorded as such in the baseline set, so a future reviewer can tell a fixture from a production capture
