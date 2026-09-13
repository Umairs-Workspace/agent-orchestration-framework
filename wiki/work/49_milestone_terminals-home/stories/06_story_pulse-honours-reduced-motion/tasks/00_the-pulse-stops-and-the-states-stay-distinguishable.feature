<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/06: the terminal's pulsing state dots stop when the operator's
# system asks for reduced motion — and the two states that pulse stay tellable apart once
# the pulse is gone.
#
# THIS IS NOT A GAP. IT IS A FALSE STATEMENT IN SHIPPED CODE, RE-MEASURED AT THIS REFINE.
#  · ui/src/terminal/palette.mjs:186-188 states, in a comment: *"Both pulses honour
#    `prefers-reduced-motion` through the existing scoping convention in `ui/src/index.css`,
#    which is why the class is the house's own and not a terminal-local animation."*
#  · The ONLY `prefers-reduced-motion` rule anywhere in `ui/` is ui/src/index.css:112-116,
#    and it names **`.aof-pending` alone** (`{ animation: none }`), which is the shimmer
#    defined at :99-110 over `@keyframes aof-shimmer` (:90). It is a DIFFERENT class and a
#    DIFFERENT animation.
#  · `TERMINAL_MOTION_CLASS` — ui/src/terminal/palette.mjs:189-192 — is exactly
#    `{ none: "", pulse: "animate-pulse" }`. Bare. No `motion-safe:` variant, no
#    `motion-reduce:` variant.
#  · It reaches a dot unconditionally: the ramp attaches `motionClass` at
#    ui/src/terminal/state-ramp.mjs:517, and ui/src/terminal/TerminalIdentity.tsx:119
#    renders `cn("inline-block shrink-0 rounded-full", TERMINAL_STATE_DOT_CLASS,
#    descriptor.dotClass, descriptor.motionClass)` with no condition on it.
#  · `MOTION_PULSE` is on exactly two rows: `connecting…` (state-ramp.mjs:382-390, dot
#    `bg-secondary`) and `streaming` (:402-410, dot `bg-primary`). The other five rows and
#    the unknown descriptor are `MOTION_NONE` (:378, :398, :416, :425, :436, :451).
#
# MEASURED IN A REAL BROWSER AT THIS REFINE — the defect, observed rather than reasoned.
# The cached headless Chromium was pointed at the REAL built stylesheet
# (`ui/dist/assets/index-jLLPM0v8.css`) carrying the REAL emitted class strings, and the
# page reported `getComputedStyle(dot)` back over a loopback port:
#
#   no preference   : connecting → animationName "pulse", 2s | streaming → "pulse", 2s
#                     waiting → "none", 0s | .aof-pending → "aof-shimmer", 0.9s
#   reduce FORCED   : connecting → animationName "pulse", 2s | streaming → "pulse", 2s
#                     waiting → "none", 0s | .aof-pending → "none", 0s
#
# So the escape works for the ONE class the CSS names and does nothing for the class the
# comment claims it covers. Read directly, the built bundle says the same thing: it contains
# `.animate-pulse{animation:var(--animate-pulse)}` over `@keyframes pulse`, and its only
# reduced-motion rule is `@media (prefers-reduced-motion:reduce){.aof-pending{animation:none}}`.
#
# THE MECHANISM IS THE ARCHITECT'S CHOICE AND THIS CONTRACT DOES NOT PICK ONE. DESIGN
# DG-49-6 clause 1 offers two: grow the reduce block at index.css:112-116 to silence this
# control's dots, or have `TERMINAL_MOTION_CLASS.pulse` emit the motion-safe variant. Every
# `Then` below is written to be satisfied by either — the browser scenarios read a COMPUTED
# animation rather than a class name, and the source scenario asserts a DISJUNCTION.
#
# NOT ASSERTED HERE, each with an owner:
#  · the `needs input` mark never pulsing, and the grid adding no tile-enter/exit/reflow
#    motion — DG-49-6 clause 3, which is STORY 49/04's and 49/05's rule, not this one's.
#  · the home's loading state not being a shimmer — STORY 49/04, task 01.
#  · per-pane `aria-live` on a grid — DG-49-7, folded into STORY 49/05. It is a different
#    accessibility defect on the same element (TerminalIdentity.tsx:117) and this story does
#    not touch it.
#  · `.aof-pending` itself, which is genuinely covered today and stays covered — the
#    scenarios below assert it does not REGRESS and change nothing about it.
#  · every other `animate-pulse` in `ui/`. Grepped at this refine there are eleven more
#    (ui/src/app/Shell.tsx:458,596,597; ui/src/board/BoardLanes.tsx:245;
#    ui/src/board/DetailPanel.tsx:838; ui/src/fleet/AssignmentChip.tsx:136;
#    ui/src/fleet/BoardDrillIn.tsx:78; ui/src/fleet/PageStates.tsx:44,45;
#    ui/src/fleet/SlotAids.tsx:81) and NONE has an escape either. **STORY.md's scope
#    discipline binds: this story fixes THIS motion escape and adds the gate that keeps it.**
#    The other eleven are a real finding and belong in VERIFICATION.md → TECH_DEBT, not in
#    this diff — but if the architect chooses the CSS-block mechanism, note that it may well
#    fix all twelve at once, and that would be a welcome side effect rather than scope creep.
#  · THE GATE ITSELF. The PO ruling requires a fitness function that can FIRE — a plant
#    emitting motion with no reduced-motion escape, driven against the SHIPPED module, in
#    m46's mutation-review discipline. That is a fitness function and ARCHITECTURE is
#    explicit that writing one as Gherkin puts it in the wrong home. **It is also not in
#    ARCHITECTURE §Fitness functions' table of eight** — flagged to the architect as a
#    missing gate, not authored here.
#
# THE TRAPS, and the first one is the reason the defect survived a whole milestone:
#  1. **A SWEEP THAT DOES NOT STRIP COMMENTS IS GREEN ON THIS DEFECT TODAY.** Grep
#     `prefers-reduced-motion` in `ui/src/terminal/palette.mjs` and you get a HIT — at :186,
#     inside the false comment. Any detector that reads source text here must strip LINE
#     comments FIRST and BLOCK comments SECOND (TECH_DEBT 24; the wrong order lets a line
#     comment containing `/*` delete the rest of the file, which on an absence sweep is a
#     silent PASS). Reuse the existing `stripComments` in the host suite; never write a
#     second copy.
#  2. **"FIXING" IT BY DELETING THE PULSE.** Removing `MOTION_PULSE` from the two rows would
#     satisfy "nothing animates under reduce" and destroy the signal for everyone else.
#     Scenario 2's no-preference column is the pin.
#  3. **SILENCING MOTION FOR EVERYONE.** The mirror image: a fix that drops the animation
#     unconditionally passes a reduce-only assertion. Same pin, other column.
#  4. **REMOVING THE DISTINCTION WITH THE MOTION.** m46's rule 12 says the pulse is never
#     the only difference between two states; a fix that also unified the two dots' colours
#     or words would honour clause 1 and break clause 2. Scenario 3.
#  5. **CORRECTING THE MECHANISM AND LEAVING THE COMMENT.** PO rule 3. A corrected mechanism
#     beside a comment that was already wrong leaves the next author trusting the wrong half
#     — and this defect is the proof that they will.
#
# ─────────────────────────── LANES, STATED HONESTLY ───────────────────────────
# This repo has NO React test harness and `prefers-reduced-motion` is a real browser
# condition — `test/support/mini-react.mjs` never assigns a node to a ref, has no layout, no
# CSSOM and no media queries, and the Tailwind bundle is not in play there at all. So a
# rendered-tree lane can read the CLASS STRING and can never answer "does it animate". The
# split below is therefore three ways, and each is measured rather than hoped:
#
#  · `@executable` AGAINST THE PURE `.mjs` + CSS SOURCE (scenarios 1 and 5) — returned
#    values from `ui/src/terminal/palette.mjs` and `ui/src/terminal/state-ramp.mjs` under
#    plain `node`, plus the text of `ui/src/index.css` with comments stripped. No browser.
#    This lane is the one that runs everywhere, including the WSL worker.
#  · `@executable` AGAINST A HEADLESS BROWSER (scenarios 2 and 3) — FEASIBILITY MEASURED AT
#    THIS REFINE, not assumed:
#      – the cached ms-playwright Chromium is driven DIRECTLY. **No dependency is added**:
#        test/arch/acd-conformance-verdict-contract.test.mjs:86-87 asserts package.json lists
#        neither `playwright` nor `@playwright/test`, and `npx playwright` is policy-blocked
#        on this machine. The binary is discovered, never hardcoded — the newest build here
#        is `chromium-1234/chrome-win64/chrome.exe` and older ones in the same cache use
#        `chromium-<n>/chrome-win/chrome.exe`.
#      – `--headless=new --force-prefers-reduced-motion` flips
#        `matchMedia("(prefers-reduced-motion: reduce)").matches` from false to true.
#        Verified both ways in one run.
#      – `--dump-dom` HANGS on this machine (measured: 45s wall, exit 124), so the page
#        reports its readings back over a **loopback POST to a `port: 0` node server**.
#        `:4181` and `:4182` are held by live daemons; no scenario binds a fixed port.
#      – it needs the BUILT stylesheet, because `animate-pulse` is generated by the Tailwind
#        build and does not exist in `ui/src` — the lane serves `ui/dist/assets/*.css` (or
#        builds `ui/` first). A source-only lane cannot see the animation at all.
#      – **This would be the FIRST browser-driven suite in this repo** (grepped: nothing
#        under `test/` drives a browser today). Whether the repo takes that on is the
#        ARCHITECT'S call. If the answer is no, scenarios 2 and 3 move to `@manual`
#        unchanged — their `Then`s are already written as things a person can read off
#        devtools — and scenarios 1 and 5 remain the automated guard. Stated here so the
#        decision is made rather than defaulted.
#  · `@manual` (scenario 4) — the REAL operating-system setting on a deployed build, which
#    is the condition the story is actually about; a Chromium switch is a proxy for it.
#  · `@uat` (scenario 6) — DG-49-6's own close condition: R-A captured twice, judged.
#
# ISOLATION. No store, no database, no mesh, no fixed port. Focused runs under a throwaway
# `AOF_GLOBAL_HOME=$(mktemp -d)` (the repo's guard hook requires it), never the full suite.
# Any new suite is registered in scripts/test.mjs (`acd-test-suite-registration`).

@ui @work @design
Feature: the pulsing state dots honour reduced motion — and `connecting` and `streaming` stay tellable apart once the pulse is gone
  In order that an operator whose system asks for reduced motion — because animation triggers migraine, nausea or vestibular symptoms — can leave a screen of a dozen live agents open all day
  the two motion-carrying connection states must emit no animation when `prefers-reduced-motion: reduce` is in force, must keep animating for everyone who has not asked, must remain distinguishable by their word and their dot colour either way, and must stop being described by a comment that says this was already true

  Background:
    Given the shipped `ui/src/terminal/palette.mjs` and `ui/src/terminal/state-ramp.mjs`, imported unedited under `node:test`
    And the shipped `ui/src/index.css`, read as text with LINE comments stripped first and BLOCK comments second
    And the browser scenarios render the REAL built stylesheet with the REAL class strings the ramp emits, in the cached headless Chromium, and read `getComputedStyle` back over a loopback port
    And "a state dot" means the element `ui/src/terminal/TerminalIdentity.tsx:119` renders, with the ramp's own `dotClass` and `motionClass` on it

  # ─────────────── 1 · the escape exists, wherever the architect put it ───────────────
  # THE IMPLEMENTATION-AGNOSTIC PIN, and the one that runs without a browser. It is a
  # DISJUNCTION on purpose: DESIGN leaves the mechanism open and this contract must not
  # narrow it.
  @executable
  Scenario: the motion class the ramp emits is one that a reduced-motion preference silences, by one of the two sanctioned mechanisms
    When I read `TERMINAL_MOTION_CLASS`, the ramp's `motionClass` for every state, and the text of `ui/src/index.css`
    Then AT LEAST ONE of these holds: `TERMINAL_MOTION_CLASS.pulse` carries a reduced-motion-conditional variant, OR a `prefers-reduced-motion: reduce` block in `ui/src/index.css` names the class `TERMINAL_MOTION_CLASS.pulse` resolves to
    And whichever holds, it is spelled ONCE — the class has one home and the stylesheet has one reduce block; there is no second copy of the pulse class at any render site
    And the check is made against the module's CODE, with comments stripped: a `prefers-reduced-motion` mention inside a comment satisfies nothing
    And `TERMINAL_MOTION_CLASS` still has exactly two members, `none` and `pulse`, and `none` is still the EMPTY string — an inert animation class is not the answer
    And `.aof-pending`'s own reduce rule at `ui/src/index.css:112-116` is still present and still names `.aof-pending`
    # RED TODAY, and it is the whole finding in one assertion: `TERMINAL_MOTION_CLASS.pulse`
    # is the bare string `animate-pulse` (palette.mjs:191), and the only reduce block in
    # `ui/` names `.aof-pending` (index.css:112-116). The disjunction is false in both
    # directions. The comment-stripping clause is what stops the fix being "the words are in
    # the file somewhere" — today they ARE, at palette.mjs:186, and they are a comment.

  # ─────────────── 2 · the dot actually stops, and only for those who asked ───────────────
  # THE HEADLINE. Both columns in one Outline deliberately: separated, the left column alone
  # is satisfied by deleting the pulse and the right column alone is satisfied by silencing
  # it for everyone (traps 2 and 3).
  # RETAGGED `@executable` → `@manual` at build, 2026-08-13 (PO, applying the ARCHITECT'S OWN
  # RECORDED RULING). ARCHITECTURE §Fitness functions declines the browser lane for milestone 49 —
  # "with the reduced-motion fix as one CSS rule, the source gate is a complete proof of the
  # invariant; a browser would only re-confirm that Chromium implements the media query" — and says
  # in terms: "The scenarios move to `@manual` unchanged." The tags were never updated, so this
  # feature has been asking for a lane the architecture forbids. The scenario TEXT is unchanged;
  # only the lane moves, which is exactly what that ruling prescribed.
  # THE OVERTURN CONDITION STANDS: this flips back to `@executable` the day an invariant here
  # depends on rendered geometry or computed style rather than on one CSS rule.
  # Caught by the developer, who followed the ruling and correctly refused to edit a locked
  # contract; the retag is the PO's. The build nonetheless MEASURED all 16 rows in headless
  # Chromium as one-off evidence (not a registered lane) — see VERIFICATION §49/06.
  @manual
  Scenario Outline: every state's dot, with no preference expressed and with reduced motion in force
    Given a state dot rendered for <state> against the real built stylesheet
    When the page is loaded with <the preference> and I read the dot's computed animation
    Then its computed `animation-name` is <animation-name> and its computed `animation-duration` is <duration>

    Examples: no preference expressed — motion stays exactly where it has always been
      | case                     | state       | the preference        | animation-name | duration |
      | the connecting pulse     | connecting  | no preference         | pulse          | 2s       |
      | the streaming pulse      | streaming   | no preference         | pulse          | 2s       |
      | the honest cold start    | waiting     | no preference         | none           | 0s       |
      | nothing bound            | idle        | no preference         | none           | 0s       |
      | the stream is over       | ended       | no preference         | none           | 0s       |
      | the transport failed     | error       | no preference         | none           | 0s       |
      | no origin to dial        | unavailable | no preference         | none           | 0s       |
      | a word the ramp does not know | unknown | no preference         | none           | 0s       |

    Examples: `prefers-reduced-motion: reduce` — nothing on the ramp animates
      | case                     | state       | the preference        | animation-name | duration |
      | the connecting pulse     | connecting  | reduce                | none           | 0s       |
      | the streaming pulse      | streaming   | reduce                | none           | 0s       |
      | the honest cold start    | waiting     | reduce                | none           | 0s       |
      | nothing bound            | idle        | reduce                | none           | 0s       |
      | the stream is over       | ended       | reduce                | none           | 0s       |
      | the transport failed     | error       | reduce                | none           | 0s       |
      | no origin to dial        | unavailable | reduce                | none           | 0s       |
      | a word the ramp does not know | unknown | reduce               | none           | 0s       |
    # THE TWO RED CELLS ARE MEASURED, NOT PREDICTED. Driven at this refine against
    # `ui/dist/assets/index-jLLPM0v8.css` with reduce forced, the connecting and streaming
    # dots both reported `animationName: "pulse", animationDuration: "2s"`. Every other row
    # in both tables already passes — they are here because a fix that changed any of them
    # has changed something it was not asked to change.
    # THE `unknown` ROWS ARE NOT PADDING: `UNKNOWN_STATE` is deliberately NOT a member of
    # `TERMINAL_STATES` (state-ramp.mjs:68) and takes its own descriptor
    # (:446-454), so a fix applied by iterating the RAMP table alone would leave it out.
    # READ AS A COMPUTED ANIMATION, never as a class name, so either mechanism satisfies it:
    # the CSS-block route leaves `animate-pulse` on the element and kills the animation; the
    # motion-safe route removes the animation by removing the class's applicability. The
    # observable is identical.

  # RETAGGED `@executable` → `@manual` at build, 2026-08-13 (PO) — same ruling as the scenario
  # above, and this one is the easiest to miss: every clause below is a COMPUTED-STYLE claim
  # ("computed `animation-name`", "`aof-shimmer` at `0.9s`", "in the SAME load"), so it is a
  # browser-lane scenario despite sitting between two source-lane ones. Its SOURCE-level half —
  # that the reduce block still names `.aof-pending` and still silences it — IS covered
  # `@executable`, inside scenario 1's lane; the computed-style half moves here.
  @manual
  Scenario: the reduced-motion escape that already works is not disturbed
    Given the shimmer element `.aof-pending` rendered against the real built stylesheet
    When the page is loaded with `prefers-reduced-motion: reduce`
    Then its computed `animation-name` is `none`
    And with no preference expressed its computed `animation-name` is `aof-shimmer` at `0.9s`
    And the state dots in the SAME document answer as scenario 2 requires, in the same load
    # `.aof-pending` is the one escape that exists today (measured: `none`/`0s` under reduce,
    # `aof-shimmer`/`0.9s` without) and STORY.md's scope discipline says this story does not
    # touch it. Asserting it in the SAME document as the dots is what makes this a
    # non-regression rather than a separate claim — a CSS-block fix edits the very rule this
    # element depends on.

  # ─────────────── 3 · the distinction survives the silence ───────────────
  # m46's rule 12, and the reason clause 2 is a clause at all: the pulse may never be the
  # only difference between two states, so removing it may never remove a distinction.
  # RETAGGED `@executable` → `@manual` at build, 2026-08-13 (PO) — same ruling. This is the
  # scenario the story's RISK actually lives in ("the states stay distinguishable"), so moving it
  # to `@manual` must not mean moving it to unmeasured: the build drove it in headless Chromium
  # against the REBUILT stylesheet with the real emitted class strings, and recorded that under
  # reduce both words differ, both dot colours differ and both label colours differ, with ZERO
  # differences across every other measured property. Evidence in VERIFICATION §49/06.
  @manual
  Scenario: with motion reduced, `connecting` and `streaming` are still told apart by their word and their dot colour
    Given both state dots and both state labels rendered in one document against the real built stylesheet
    When the page is loaded with `prefers-reduced-motion: reduce`
    Then neither dot animates
    And the two words differ and are exactly `connecting…` and `streaming`, each rendered as visible text beside its dot
    And the two dots' computed background colours differ from each other
    And each dot's computed background colour is the same value it has with no preference expressed — the escape removes MOTION and nothing else
    And each state's label colour is the same value it has with no preference expressed
    And neither dot's computed size, shape or border changes between the two loads
    # RED TODAY on its first Then alone. The rest are the anti-overreach half and they have
    # teeth: the two dots resolve to different colours today (`bg-secondary` vs `bg-primary`,
    # palette.mjs:141-142, measured as rgb(219,224,230) and rgb(19,118,109) on the light
    # resolution outside the terminal's dark chrome), and a fix that reached for the dot's
    # class string rather than its animation could easily flatten one of them.

  # ─────────────── 4 · the real condition, not a proxy ───────────────
  # A COMMAND-LINE SWITCH IS A PROXY FOR AN OPERATING-SYSTEM SETTING, and the operator in
  # this story's user story set the latter. This is the scenario that proves the fix
  # responds to the thing that actually causes the symptom.
  @manual
  Scenario: an operator who has asked their OPERATING SYSTEM for reduced motion sees no pulsing dots on a deployed build
    Given a deployed build (`node scripts/install-local.mjs`) and the fleet daemon restarted by the operator
    And the operating system's own reduced-motion setting turned ON (Windows: Settings → Accessibility → Visual effects → Animation effects OFF)
    When I open a surface carrying live terminal state dots in a real browser and watch it for thirty seconds
    Then no state dot pulses, fades, breathes or changes opacity at any point
    And the state words are still legible and still say which state each pane is in
    And turning the OS setting back OFF and reloading brings the pulse back on `connecting` and `streaming`, and on nothing else
    And nothing else on the page loses motion that it had before this change
    # EVIDENCE RECORDED IN VERIFICATION.md (49) under the 49/06 section at `aof:verify 49`:
    # the build stamp (`~/.aof/bin/aof.exe --version` → `0.1.0 (payload <buildId>)`), the OS
    # setting's state each way, the surface and states observed, and the DevTools computed
    # `animation-name` for one dot in each condition. **Never start a daemon by hand from an
    # agent shell** — the desktop supervisor spawns both and the operator restarts it.

  # ─────────────── 5 · the comment stops lying ───────────────
  # PO RULE 3, and it is the half that makes this a repair rather than a patch: the defect
  # survived because a comment told the next reader it was handled.
  @executable
  Scenario: the module's stated mechanism is the mechanism actually in force
    Given `ui/src/terminal/palette.mjs` and `ui/src/index.css` as they stand after this story
    When I read the comment above `TERMINAL_MOTION_CLASS` and the mechanism the code implements
    Then the comment no longer asserts that these pulses are covered by a scoping convention that names only `.aof-pending`
    And whatever mechanism it now describes is one a reader can verify from the two artefacts it points at, without running anything
    And it names the class or the rule that actually carries the escape, by the same spelling the code uses
    And it still says why motion is on exactly two states and why `none` is the empty string — the existing rationale is corrected, not deleted (ADR-014/E3: a ceiling met by removing explanation raises the real cost while lowering the measured one)
    # THIS SCENARIO READS SOURCE TEXT AND SAYS SO. It is here because the PO ruled it into
    # the same diff and because there is no other home for it: ARCHITECTURE's table of eight
    # fitness functions has no entry for reduced motion (flagged). The non-vacuity condition
    # is trap 1's: whatever checks this must strip LINE comments first and BLOCK comments
    # second, or it will read the comment as the mechanism — which is precisely how this
    # defect shipped.

  # ─────────────── 6 · the human's verdict ───────────────
  @uat
  Scenario: the terminals home at reduced motion
    Given render target R-A captured twice — once normally and once with `prefers-reduced-motion: reduce` forced — and handed to the reviewer
    When the reviewer compares the two frames against DESIGN DG-49-6
    Then in the reduced-motion frame no dot is mid-animation and no element reads as "about to move"
    And every state on screen is still distinguishable from every other state in that frame alone, by word and by colour
    And the two frames differ in motion and in nothing else — no colour, size, position, spacing or word moves between them
    And the verdict is CONFORMS or GAPS against DESIGN — never INCONCLUSIVE for want of a committed mock, because §Conformance source of truth makes the checklist the baseline until the PNGs land
    # **The reviewer does not run the browser** — the orchestration renders both frames and
    # hands them over. A still frame cannot show motion, which is exactly why the pairing is
    # the test: a pulse mid-cycle is visible as a difference in dot opacity between two
    # otherwise identical captures, and "the two frames differ in nothing else" is the clause
    # that catches a fix which silenced motion by changing something else.
