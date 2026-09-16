<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — THE HUMAN GATE. A person judges whether the two terminals now AGREE:
# one control, region by region, across the board dock (S1), the fleet card peek (S2) and
# the fullscreen overlay (S3), at every documented breakpoint and in every state DESIGN's
# render-target table names — over real browser renders.
#
# LITMUS: every Then is confirmable from a RENDERED SCREENSHOT, or from a NUMBER QA measures
# off that same render and hands over. Never from component source. Where no render exists,
# the honest verdict is INCONCLUSIVE naming the missing render.
#
# WHY THIS GATE EXISTS AND WHY IT IS `@uat`. The milestone's success condition is itself a
# perceptual claim: *"the operator should not be able to tell what changed except that the
# two terminals now agree."* Tasks 00-03 pin the MODEL — which source, which geometry mode,
# which URL, which state word, which input path, which absence — as values a pure `.mjs`
# returns headlessly. NONE of them can settle whether one control actually READS as one
# control in two places, whether an open dock covers the buttons the operator still needs,
# whether the four dark hexes are still the same four, or whether the `read-only` mark
# survives 390 pixels. Those are pixel and perceptual facts and they belong to a person.
#
# THE CONFORMANCE SOURCE IS WHICHEVER IS CURRENT AT REVIEW TIME. `mocks/s1-board-dock.png`,
# `mocks/s2-fleet-card-peek.png` and `mocks/s3-fullscreen-overlay.png` are named as the
# source of truth and THE OPERATOR IS SUPPLYING THEM — the generation prompt is committed at
# `mocks/PROMPT.md` and the folder holds only that today. Until each lands, DESIGN.md's
# binding checklist for that surface IS the baseline — mandatory, not a supplementary rubric
# — so a review that runs before the mocks arrive has something to judge and must NOT return
# INCONCLUSIVE on the grounds that no mock exists (07/ADR-003; the m03 lesson). When a mock
# lands it supersedes the checklist for ITS surface wherever the two differ, and DESIGN.md is
# amended in the same change: a checklist left contradicting a committed mock is a defect,
# not a nuance. A remote design-tool link is never a substitute — the reviewer is read-only
# and cannot open one. And no placeholder PNG is ever committed: an absent mock is honest, a
# stand-in one is indistinguishable from a real baseline.
#
# BROWSER LANE (QA-OWNED). QA runs the browser and drives the harness; the designer judges
# the renders it is handed and has no `Bash`. Per the house design-render discipline,
# `npx playwright` is POLICY-BLOCKED here — the render drives the cached ms-playwright
# Chromium directly (`--headless=new --screenshot=<ABSOLUTE forward-slash path>`). The FLEET
# is the fixed-port origin (`http://127.0.0.1:4181/fleet`); the BOARD is a per-workspace
# server on an EPHEMERAL port that changes on every daemon restart, so its base URL is
# supplied to the render AT CAPTURE TIME and NEVER hard-coded.
#
# THE a11y LANE IS OFF, AND THAT IS THE DECISION, NOT AN OVERSIGHT. `.aof/aof.config.json`'s
# `work.tags.domains` carries no `a11y` entry and the config has no `work.ui` block at all,
# so the opt-in automated lane is off: THERE IS NO axe-core RUN IN THIS STORY AND NO a11y
# FINDING WILL COME FROM ONE. DESIGN's thirteen accessibility requirements therefore bind
# this review as HUMAN judgement — which is why the non-colour, focus-order, hit-target,
# live-region and keyboard-resize clauses appear below rather than in an automated lane.
#
# DG-46-3 STANDING NOTE, so a reviewer does not spend a round-trip on it: the `unavailable`
# state has NO PRODUCTION PRODUCER in m46. It is judged from a FIXTURE render. Its absence
# from a production render is not a finding, and its row travels to milestone 49's gate when
# 49 produces it for real — re-pointed, never deleted.
#
# NOT JUDGED HERE: anything tasks 00-03 already pin as a model value. This review does not
# re-assert which URL is built, which state word follows which event, or whether the input
# policy fails closed; it judges whether the rendered result of those models reads right.
#
# ISOLATION (for any suite whose output this review's evidence is produced beside):
# `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the full suite
# (`global-work-propagation.test.mjs` binds :4182, which the live control daemon holds). No
# `node:test` drives a scenario below; a person does.

@uat @ui @work @design
Feature: the two terminals agree — a design-conformance judgement of ONE control across the board dock, the fleet card peek and the fullscreen overlay, at every documented breakpoint and state
  In order to confirm that an operator meeting the unified terminal sees the product they already know, with the two panes finally matching — and never a re-skin, a cropped mirror, a covered button, a lost `read-only` mark or a state without a word
  the control is rendered at 1280, 768, 390 and at the desktop app's own 760×520 window, in every state DESIGN's render-target table names, and judged region by region against the three committed mocks where they exist and DESIGN.md's binding checklists everywhere else (CONFORMS / GAPS)

  Background:
    Given the board origin is rendered at its EPHEMERAL per-workspace base URL, supplied to the render at capture time
    And the fleet origin is rendered at its fixed `http://127.0.0.1:4181/fleet`
    And each render is produced through the cached ms-playwright Chromium to an absolute screenshot path — never `npx playwright`
    And the render set covers DESIGN's targets: R-A (S1 at 1280 in nine states) · R-B (S1 at 760×520, streaming, at the clamped default height) · R-C (S1 at 390, streaming) · R-D (S2 at 1280 in seven states) · R-E (S2 at 390, collapsed and streaming) · R-F (S3 from S2, a mirror scaled UP) · R-G (S3 from S1, a local PTY fitted)
    And the `unavailable` frames in R-A and R-D are captured from a forced fixture, because m46 has no producer for them
    And the rendered screenshots are handed to the designer, who judges them against whichever conformance source is current

  # RENDER GATE — the review never guesses from code, and never returns INCONCLUSIVE for the
  # wrong reason. The m35/m43/m45 precedent, and it is what keeps the verdict honest when the
  # harness fails.
  Scenario: absent a render the review degrades to INCONCLUSIVE naming the missing render — but a missing MOCK is never grounds for it
    Given the render did not produce a screenshot of a required surface, breakpoint or state
    When the design-conformance review runs
    Then the verdict is INCONCLUSIVE
    And it names the missing render — the surface, the origin, the breakpoint and the state it was supposed to show
    And it does not infer a verdict from component source
    And it does NOT return INCONCLUSIVE on the grounds that the three `mocks/*.png` have not landed: DESIGN.md's binding checklists are the mandatory baseline until they do

  # WHICH BASELINE WAS JUDGED — recorded in the verdict, every time, per surface, because the
  # answer changes the moment the operator commits a file.
  Scenario Outline: the review names the conformance source it judged against, per surface, and a committed mock supersedes the checklist wherever the two differ
    Given `<mock>` is <mock status> at review time
    When the design-conformance review judges that surface
    Then the verdict names <source> as the conformance source for it
    And <what happens to the checklist>

    Examples:
      | case                          | mock                        | mock status                           | source                          | what happens to the checklist                                                                             |
      | before the operator's mocks   | mocks/s1-board-dock.png     | absent                                | DESIGN §S1's binding checklist  | it binds in full, and the review proceeds to a CONFORMS/GAPS verdict                                       |
      | after one lands, agreeing     | mocks/s2-fleet-card-peek.png| committed and consistent              | the committed mock              | it still binds wherever the mock is silent                                                                 |
      | after one lands, differing    | mocks/s3-fullscreen-overlay.png | committed and differing from a clause | the committed mock          | the differing clause is a GAP AGAINST DESIGN.md, raised so the document is amended in the same change      |
      | a link instead of a file      | any of the three            | offered as a remote design-tool link  | DESIGN's binding checklists     | the link is refused as a baseline — the reviewer is read-only and cannot open one                          |
      | a stand-in image             | any of the three            | committed but blank or placeholder    | DESIGN's binding checklists     | the placeholder is refused AND reported: a stand-in is indistinguishable from a real baseline, which is worse than an absent one |

  # THE THESIS. If this fails, the milestone has missed its point however many model
  # assertions are green.
  Scenario: the two terminals read as ONE control, and an outsider can see nothing else has changed
    When the designer judges S1, S2 and S3 side by side against DESIGN §Intent
    Then the three surfaces read as three HOSTS of one control, not as two components that were made to look similar
    And the header is the same lockup, the same identity line, the same posture pill, the same dot-plus-label state chip, in the same reading order, in all three
    And the same source behaves identically in all three hosts: a `local-pty` fits everywhere, a `mirror` scales everywhere
    And each surface's own content is where it was, at the colour it was: no colour, hex, radius or font has changed anywhere
    And nothing has been taken away: every control that was on either surface before is still on the surface that declared it
    And the verdict for this region is CONFORMS or names a specific GAP

  # S1 — THE BOARD DOCK, region by region against DESIGN §S1's binding checklist.
  Scenario Outline: the board dock's regions, in order, at every documented width
    Given R-A / R-B / R-C as they apply, rendered at <width>
    When the designer judges the dock against DESIGN §S1's binding checklist
    Then C0a is a 6px drag handle on the top edge, absent while collapsed
    And C1 is ONE row that never wraps to two and never scrolls, holding left to right: the lockup, the identity, the provider picker (`local-pty` only), the state chip, then `ml-auto` restart (on `ended`/`error` only), expand, collapse chevron and close
    And there is NO `remote ·` badge anywhere in it
    And C2 is the byte area on the dark viewport, holding exactly one terminal, and it is the only thing on the surface that scrolls
    And C3, when present, is one opaque in-flow bar and never two
    And <what to check hardest>
    And the verdict for this width is CONFORMS or names a specific GAP

    Examples:
      | case                       | width   | what to check hardest                                                                                                       |
      | the primary judgement width| 1280    | the nine states of R-A each render their WORD, and the dock's default height is the clamped `min(280, floor(box/2))`          |
      | the desktop app's window   | 760×520 | THE HIGHEST-RISK CELL — the content box is 432px, so max is 216px and the DEFAULT must be 216, not the shipped 280: an unclamped default opens at a height the operator is not allowed to drag it to |
      | mobile                     | 390     | the header must not wrap into two rows, and nothing in it may be truncated, ellipsised or shrunk by a scale factor            |

  # S2 — THE FLEET CARD PEEK. The one host where the header MAY wrap, and the one where the
  # `read-only` mark is load-bearing.
  Scenario Outline: the fleet card peek's regions and its yield order, at both documented widths
    Given R-D / R-E as they apply, rendered at <width>
    When the designer judges the peek against DESIGN §S2's binding checklist
    Then the panel's total height is a constant 192px whenever it is open, in every state, including when the non-live bar is present
    And at rest it is COLLAPSED and shows only C1: identity, the `read-only` pill and `Watch terminal →` — no state chip, no bytes
    And there is no provider picker, no restart and no close on this host
    And when the header cannot fit, it yields in DESIGN's declared order — the `session <id>` tail dropped WHOLE with its separator, then the `TERMINAL` word (the glyph stays), then the header wraps
    And the `read-only` pill, the state chip, the owner ref and the toggle are NEVER dropped at any width
    And <what to check hardest>
    And the verdict for this width is CONFORMS or names a specific GAP

    Examples:
      | case                        | width | what to check hardest                                                                                                  |
      | the primary judgement width | 1280  | the seven states of R-D, and that the panel's total height does not move by a pixel between `streaming` and `stream ended` |
      | mobile                      | 390   | the yield order actually happening in whole discrete drops — never a shrink factor, never an ellipsis, never an overprint  |

  # S3 — THE FULLSCREEN OVERLAY. It must look like the same pane, bigger.
  Scenario: the fullscreen overlay is a bigger box, not a different look
    Given R-F and R-G
    When the designer judges the overlay against DESIGN §S3's binding checklist
    Then its header is the SAME identity fragment as the inline one: lockup, identity, `read-only` pill on a read-only source, state chip — then `ml-auto` exit fullscreen
    And the exit control is visible in every capture: never hover-revealed, never auto-hiding, never fading with inactivity
    And the shell's chrome is GONE, not dimmed and not showing through — no light-theme bar is visible behind or around the dark terminal
    And there is no fullscreen-only state, no fullscreen-only copy and no second identity vocabulary
    And R-G's `local-pty` occupies the overlay with MORE rows and columns, while R-F's `mirror` shows the SAME 80 columns at a larger size
    And the verdict for this region is CONFORMS or names a specific GAP

  # THE TWELVE KNOWING CHANGES. Recorded so a reviewer can tell a ruled change from a
  # regression — exactly as m45 did for its three. A row missing is a GAP; a row present and
  # reported as a regression costs a round-trip, which is what this table exists to prevent.
  Scenario Outline: each of DESIGN's twelve knowing visible changes is present, on the surface that declares it, and is not logged as a regression
    Given the renders for <surface>
    When the designer looks for <change>
    Then it is present as ruled, and it is recorded as a DESIGNED change of kind <kind>
    And if it is absent, that is a GAP against DESIGN §What visibly changes, row <#>

    Examples:
      | #  | change                                                                                          | surface | kind                                   |
      | 1  | the state word `running` has become `streaming`                                                  | S1      | reconciliation-forced                  |
      | 2  | the `streaming` dot PULSES on the board dock, which it did not                                   | S1      | reconciliation-forced                  |
      | 3  | a connected-but-silent local session reads `waiting for output` instead of sitting on `connecting…` | S1   | reconciliation-forced, and it fixes a lie |
      | 4  | a dropped mirror stream reads `error` in the chip with `disconnected — the stream dropped` as its cause line | S2, S3 | reconciliation-forced        |
      | 5  | a `mirror` opened in the board dock is SCALED, aspect preserved and never cropped                | S1      | reconciliation-forced, and it fixes a crop |
      | 6  | the dock's error message is an opaque in-flow bar at the bottom of the byte area, not an overprint | S1     | reconciliation-forced, and it fixes an overprint |
      | 7  | the fullscreen overlay's message bar is in flow, not `absolute … bottom-0`                        | S3      | reconciliation-forced                  |
      | 8  | the `remote · <nodeId>` badge is GONE; the identity line already says `→ <nodeId>`                 | S1      | ruled — a mock may overrule            |
      | 9  | the dock's header type step is `text-[11px]`, matching the card                                   | S1      | ruled — a mock may overrule            |
      | 10 | every header control reaches a 24×24 hit target by PADDING; the card's header grows by about 6px   | S2, S3  | a11y-forced                            |
      | 11 | the board dock has an expand-to-fullscreen control                                                | S1      | ruled — the PO may decline it          |
      | 12 | the dock's drag max AND default clamp against the shell's content box, not the viewport            | S1      | shell-forced                           |
    # ROWS 5, 6 AND 7 ARE THE THREE LATENT BUGS the unification forces out. Their measured
    # halves are task 00's `@bug` scenarios; this table is where a reviewer confirms the
    # visible result and is told, in advance, that each is a FIX.

  # THE THREE DESIGN GAPS, one row each, as DESIGN requires. Each has its own close
  # condition and its own consequence if it is not met.
  Scenario Outline: each design gap is judged, and its close condition is either met or named as outstanding
    Given <render>
    When the designer judges it against <gap>
    Then <verdict rule>

    Examples:
      | gap      | render                                                              | verdict rule                                                                                                                                                                             |
      | DG-46-1  | the board at 1280 and at 760×520, with the dock OPEN at its default height, on an item whose detail panel is showing | the detail panel's ACTION STRIP is fully visible above the dock and every control the operator can still act on is reachable. NOTHING VISIBLE CHANGES ON THE BOARD WHEN THE DOCK OPENS — that is the point. A render in which an open dock overlaps the detail panel's actions is a GAP, not a designed change |
      | DG-46-2  | S1, S2 and S3 side by side at 1280                                  | the viewport, the chrome, the borders, the picker well and the terminal foreground are the SAME five values on all three surfaces — no second near-black, no second border blue, and no new `@theme` token has appeared anywhere |
      | DG-46-3  | the FIXTURE renders of the `unavailable` pane in R-A and R-D        | the state is judged like any other: header in full, dashed hollow dot, centred dashed block naming the cause and the recovery, never red, no socket. Its ABSENCE FROM A PRODUCTION RENDER IS NOT A FINDING, and this row is RE-POINTED TO MILESTONE 49's GATE when 49 produces it for real — never deleted |

  # THE HIGHEST-SEVERITY RULE IN THE MILESTONE, judged on its own because unification is what
  # raised its stakes: under one control NEITHER posture has an input row, so the old
  # "absent, not disabled" signal no longer distinguishes anything. The label and the cursor
  # are the only two signals of the posture that are left.
  Scenario: the `read-only` mark survives every width, every state and both headers
    Given every render of S2 and of S3 opened from S2 — at 1280, at 390, in every state including collapsed
    When the designer looks for the posture
    Then the `read-only` label is present, in TEXT, complete, in every single one of them — never dropped, truncated, abbreviated or hidden for space
    And it is present on the INLINE header and on the FULLSCREEN header alike
    And the cursor in a read-only pane does not blink, in any capture
    And there is NO input row anywhere, in either posture, on any of the three surfaces — not a text field, not a send control, not a greyed placeholder
    And a read-only pane rendered without its label is a GAP of the highest severity in this milestone, because the failure it permits is an operator believing a keystroke reached a worker

  # COLOUR IS THE FIFTH SIGNAL — judged the way the rule is written: take the colour away.
  Scenario: every state is legible without colour, and motion is confined to the two states that mean "expect this to change"
    Given every state capture of S1 and S2, judged in greyscale and under a colour-vision simulation
    When the designer reads the state of each pane
    Then every state renders its text WORD, in full, always — a dot with no word is a GAP
    And `unavailable` is identifiable from its DASHED HOLLOW dot alone, distinguishable from every filled one
    And `error` and a non-zero `exited (N)` are identifiable from their words and their cause lines, not from being red
    And exactly two states carry motion — `connecting` and `streaming` — and `waiting` carries none, so the honest cold start can never read as a spinner-forever
    And with `prefers-reduced-motion` set, the label and the dot still distinguish those two states: the pulse is never the only difference between them
    And the verdict for this region is CONFORMS or names a specific GAP

  # THE THREE THINGS A REVIEWER MUST NOT REPORT. Each is arithmetic or a designed trade, and
  # each has cost a round-trip somewhere in this product's history.
  Scenario Outline: the designed consequences, named in advance so they are not logged as defects
    Given <render>
    When the designer sees <what they see>
    Then it is <ruling>

    Examples:
      | case                        | render                                   | what they see                                                              | ruling                                                                                                       |
      | the letterbox band          | R-F, a mirror scaled up at 1280          | a band of empty terminal background at the right and/or bottom, roughly 250-300px wide | CORRECT and expected: the scale is the MIN of the two ratios, so the whole 80×24 screen fits and no column is ever cut. Cropping, stretching and re-fitting are all worse |
      | S2's small glyphs           | R-D, a mirror scaled down into 192px      | text too small to read word by word                                        | THE DESIGNED TRADE: the peek answers "is it moving, and what shape is it in"; the pane that answers "what does it say" is S3, which is why the expand control exists |
      | a capture caught mid-tick   | any surface                              | an UNSCALED screen at natural size, overflowing its box                    | a CAPTURE ARTIFACT of the zero-box guard, not a finding — ask QA for a re-capture rather than logging a gap    |

  # ACCESSIBILITY, JUDGED BY A PERSON — because the automated lane is OFF (see the header).
  # Two of these have NO precedent in either shipping implementation and must be BUILT.
  Scenario: the control's accessibility obligations are visible in the renders and in a keyboard pass
    When QA drives a keyboard pass over the rendered surfaces and hands the observations and measurements to the designer
    Then every header control measures at least 24×24 CSS pixels, achieved by PADDING and not by weight or fill, so the reading hierarchy survives
    And the state chip's region announces its changes politely — a screen-reader user learns that a session connected, ended or failed (NO PRECEDENT: this must be built, not inherited)
    And the drag handle is focusable and resizes with the arrow keys within its clamp (NO PRECEDENT: this must be built)
    And each pane's accessible name names the SESSION, not the widget class — `<posture> terminal for <identity>`, on the inline region and on the fullscreen dialog alike
    And the fullscreen occupant declares a modal dialog with an accessible name, traps focus, and returns focus to the opener rather than the document body
    And the provider picker keeps real radio semantics: a labelled group, one checked segment, the selected dot decorative, and the lock carrying a title naming why
    And the non-live bar is a status region, not an alert, and it is never clipped or truncated — if it cannot fit, it wraps
    And focus order follows visual order: drag handle, then the header controls in their declared order, then the terminal
    And the verdict for this region is CONFORMS or names a specific GAP

  # A MOCK THAT REACHES BEYOND THIS MILESTONE'S RAMP comes back as its own gap, never as a
  # silent build. DESIGN flags the dark shell by name as the plausible-and-implausible one.
  Scenario Outline: a mock that exceeds the ramp is raised, costed, and not absorbed
    Given a committed mock showing <what the mock shows>
    When the design-conformance review runs
    Then it is raised as a NAMED design gap with <consequence>
    And it is not absorbed into this milestone's build
    And this milestone continues to add no new token, no new hex and no new palette

    Examples:
      | case                    | what the mock shows                                   | consequence                                                                                              |
      | THE FLAGGED RISK        | the SHELL going dark around the terminals              | a theme decision beyond this ramp — its own token work and its own milestone (45/DESIGN open question 6)  |
      | a new terminal colour   | any value outside the five DESIGN reads at source      | a token decision, raised before it is painted                                                            |
      | an input row            | a text field or a send control in either posture       | REFUSED outright — there is no input region in either posture, and adding one is the failure the posture exists to prevent |
      | a re-skin               | new radii, shadows, gradients or a brand accent        | this is an EXTRACTION, not a re-skin: raised as a gap against DESIGN §Intent, never built quietly          |
      | a live word change      | `running` instead of `streaming`                       | the cheapest change in the document — one word in one ramp — and the most likely to attract an opinion; DESIGN's documented default 1 is amended and BOTH surfaces follow, never one |
      | a still `streaming` dot | no pulse on the live state                             | motion is dropped from BOTH surfaces, not one — the rule is ONE ramp                                      |

  # THE BASELINE HAND-OFF. Stated once, so the follow-on has somewhere to attach.
  Scenario: an approved render becomes the visual-regression baseline
    Given the designer has judged the renders CONFORMS on all three surfaces at every documented breakpoint and state
    When the approved renders are recorded
    Then each becomes the baseline QA's `toHaveScreenshot` visual-regression compares future renders against
    And a later render that drifts from an approved baseline is a QA finding, routed like any other
    And building those baselines out into a hard gate is a QA-owned follow-on, explicitly out of scope for this story
    And the two pulsing states are excluded from or sampled deterministically by any such baseline, since they are the only motion on these surfaces
