<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/03, INVARIANT 4 AMENDED: the milestone's one deliberate
# reversal, made in exactly ONE of the gate's three parts, so that the moment the fleet
# origin becomes interactive is a reviewed act rather than a gate that went green
# because the code moved out from under it.
#
# WHAT THIS FILE IS, AND IS NOT. ARCHITECTURE §Fitness functions rules that structural
# invariants — *"the posture has one author per surface"* among them — belong there and
# NOT in a task `.feature`. This file does not restate that invariant as behaviour. Its
# subject is the amended GATE ITSELF, which this story delivers: what the detectors
# SWEEP, what they REPORT on a planted tree, what they stay QUIET on, and which of
# today's assertions still run afterwards. Every `Then` below reads a returned value, a
# reported offender, or a string in a file the test opens.
#
# THE SEAM, read at source in the working tree at this refine
# (test/arch/acd-fleet-terminal-input-constrained.test.mjs, 845 lines, registered at
# scripts/test.mjs:169 — an unregistered suite is no gate at all):
#  · THE PROSE. Invariant 4's subject sentence lives in the file header at :26-28 —
#    *"THE FLEET PAGE STAYS A MONITOR — the interactive surface is the one control
#    mounted by the BOARD DOCK …"* — beneath the m46/story-04 amendment note at :30-66.
#  · THE SEVEN LANES. `archTests` (:346) exports seven: invariant 1 (:348-439, the
#    tuple-bound route entry), invariant 2 (:442-510, session-exact delivery),
#    invariant 3 (:513-536, the pure mirror/bridge), part 1 (:544-628), part 2
#    (:634-680), part 3 (:687-756) and the behavioural route lane (:759-844).
#  · THE NEEDLES. `SOCKET_NAMED` :300, `ANY_SEND_CALL` :301, `TERMINAL_INPUT_SOURCE`
#    :302, `INTERACTIVE_DECLARATION` :308, `POSTURE_KEY_WRITE` :327 and
#    `FLEET_POSTURE_HOME` :328. `listSourceFiles` (:335-344) walks `.ts/.tsx/.mjs` and
#    EXCLUDES `.d.mts` (:341). `stripComments` (:123-125) strips LINE comments first and
#    BLOCK comments second; `lf` (:130-132) normalises CRLF before every probe.
#  · PART 1 TODAY: the fleet directory sweep + the single-author clause (:547-567); the
#    JSX bare-call clause over `Fleet.tsx` (:571-581); the positive `POSTURE_READ_ONLY`
#    read (:586-587); the adversarial rows driven through the REAL fleet mount
#    (:595-603); the real mount's model values (:605-618); and the board CONTRAST
#    (:623-626).
#  · PART 2 TODAY: the whole frozen table × both postures (:640-651) and seven malformed
#    declarations that must fail closed (:657-672).
#  · PART 3 TODAY: the `ui/src/fleet/**` input-source sweep with its `>= 5` file floor
#    (:690-704); the fleet-mounts-the-control pair (:709-711); the RAW, comment-unstripped
#    read of the source table's two routes (:719-721); the control's real interactive
#    lane (:726-728); the identity line's far-end needle (:741-742); the two
#    no-literal needles over the control (:743-750); and terminal-ws.mjs's own PTY write
#    (:753-754).
#  · THE MEASUREMENT THAT DECIDES THE AMENDMENT (ADR-008): because ADR-001 puts the home
#    in `ui/src/home/` rather than in `ui/src/fleet/`, all three parts stay literally
#    TRUE and non-vacuous after m49 with no edit at all. What breaks is the invariant's
#    own SUBJECT SENTENCE — and the property it was really protecting would then be
#    enforced on one of three surfaces, with the two that can type unconstrained. That
#    is m46/ADR-006's diagnosis one milestone later: *"the sweep will still be green,
#    because the code moved out of the swept directory … a green gate is read as a
#    satisfied contract, which is worse than deleting it."*
#
# WHAT IS **NOT** ASSERTED HERE, each with its owner:
#  · the fourth host and its affordance table — task 00 of this story.
#  · the mount's frozen shape, the feed-axis narrowing and the injected reason — task 01.
#  · the home's imports, its React-freedom, the `home →` EMPTY import baseline and the
#    call-site floor rising from `>= 2` to `>= 3` — `acd-terminal-control-boundary`
#    (:116-122, :392), ARCHITECTURE §Fitness functions. Note in particular that this
#    gate does NOT sweep `.d.mts` (:341), so the TYPE-ONLY import edge — the one that got
#    past a review last time — is that gate's, not this one's.
#  · the mirror's two-producer ceiling — `acd-terminal-output-signal-source`.
#  · the cap, the layout filter and the home's own state words — the three new gates in
#    §Fitness functions.
#  · how any of this LOOKS — DESIGN §S2 and the milestone's `@uat` visual review.
#
# THE TRAPS:
#  1. **TECH_DEBT 24 — LINE COMMENTS FIRST, BLOCK COMMENTS SECOND.** Every new
#     source-reading clause reuses the existing `stripComments` (:123-125) and never a
#     local copy. Strip blocks first and a LINE comment containing `/*` deletes the rest
#     of the file before any detector sees it — which on an ABSENCE sweep is a silent
#     PASS. There is a scenario for this, with a plant.
#  2. **THE FLEET'S ABSENCE SWEEP MUST NOT BE GENERALISED.** `INTERACTIVE_DECLARATION`
#     (:308) matches `POSTURE_INTERACTIVE`, the quoted word, `readOnly: false` and
#     `MOUNT_INTERACTIVE`. It stays scoped to `ui/src/fleet/**` and to nothing else:
#     `ui/src/board/dock-mount.mjs:27,48,99` names the interactive posture today, and the
#     home MUST name it. A build that "strengthened" the amendment by sweeping all three
#     directories with this needle would make the amendment unsatisfiable.
#  3. **AND THE AUTHORSHIP RULE MUST NOT REACH `ui/src/terminal/**`.** The shipped
#     control writes `posture: mount.posture` at TerminalControl.tsx:284 and :628 — a
#     READ-THROUGH of the mount's own value, which is the thing this gate wants. Sweep
#     that directory and the gate reports the product it is meant to protect.
#  4. **THE JSX EXTRACTOR IS NARROW, AND ITS SILENCE MUST BE A FAILURE.** The clause at
#     :572 matches `<TerminalControl` … `mount={…}` within 400 characters and requires
#     the prop to CLOSE ITS OWN LINE (`\}\s*\n`). Both shipping sites satisfy it —
#     Fleet.tsx:1185-1187 and Board.tsx:618-620 — but a home component that put another
#     prop after `mount=` on the same line would yield ZERO matches. Today's
#     `mountProps.length >= 1` (:573) is a whole-clause floor; after the amendment the
#     floor must be PER SURFACE, or the new site is checked by nothing while CI reads
#     green. That is this gate's own recorded failure mode, at the exact clause.
#  5. **THE THIRD MOUNT SITE IS DISCOVERED, NOT HARD-CODED.** m46/ADR-006's own rule:
#     *"A gate that cannot be broken by a file move is strictly better than one whose
#     list must be maintained."* The clause sweeps each surface directory for
#     `<TerminalControl` rather than naming a third `.tsx` — the home's component file
#     name is not fixed by any ADR.
#  6. **EVERY PLANT IS FED TO THE SHIPPED DETECTOR** (PO ruling; m46's mutation review
#     found a plant fed to a copy re-implemented inside the suite, so the real detector
#     had never once been driven to a violation). Each plant asserts it LANDED — that it
#     differs from the clean baseline — before the detector is asserted to fire, and
#     each detector is also shown QUIET on that clean baseline.
#  7. **WHAT "SURVIVES VERBATIM" MEANS HERE, stated so it is provable rather than
#     reviewed.** It is asserted as (a) each needle constant's literal VALUE unchanged
#     and (b) each existing assertion's VERDICT re-run on the same input — never by
#     reading a previous revision of the file, because a test that reads git history
#     rots the moment the history is rewritten. Offender MESSAGE wording is allowed to
#     change, since a single named author becomes a table.
#
# ISOLATION: the behavioural lane (:759-844) already stands `serveMeshUi` up correctly
# and must keep doing so — `port: 0` with `address().port` read back (:785), a throwaway
# `AOF_GLOBAL_HOME` under a fresh temp dir (:780), everything removed in `finally`.
# `:4181` and `:4182` are held by live daemons on this machine; no scenario may bind a
# fixed port, and the full suite is never run here (test/global-work-propagation.test.mjs
# binds `:4182`).

@executable @ui @work @design
Feature: invariant 4 amended — one part changes, two do not, and the replacement is strictly stronger than what it replaces
  In order that making the fleet origin interactive is a deliberate, reviewed, still-guarded act rather than a gate that reads green about a property it stopped asserting
  Part 1 generalises from "the fleet directory declares read-only" to a surface→posture-home table across three surfaces, three JSX mount sites and a fail-closed behavioural row; part 2 is untouched; part 3 is untouched and gains a `ui/src/home/**` sweep; the invariant's prose is rewritten and never deleted

  Background:
    Given the amended `test/arch/acd-fleet-terminal-input-constrained.test.mjs`, still registered in the runner
    And "the tree" means the real `ui/src/**` of this repository, read through the suite's own `stripComments` and CRLF-normalising `lf`
    And "a plant" means a hand-written synthesized snippet, never a string-replace on a real file, asserted to differ from the clean baseline before any detector is asked about it
    And every detector driven below is the suite's own shipped function, never a copy written inside the scenario

  # NOTHING IS REMOVED. The first thing a reviewer must be able to see.
  Scenario: the gate keeps all seven of its lanes and its registration
    When I import the amended suite and read `archTests`
    Then it exports exactly seven lanes, and the three invariants this milestone does not touch are among them by name — the tuple-bound route entry, session-exact worker delivery, and the pure mirror/bridge
    And the suite is still imported by the runner's registration list, so `acd-test-suite-registration` is unaffected
    And the behavioural route lane still stands its server up on `port: 0` under a throwaway `AOF_GLOBAL_HOME`, and still proves a payload-smuggled tuple arrives as opaque BYTES under the socket's own tuple
    And the three untouched invariants still FIRE on their existing plants: a handler with no message seam, a `JSON.parse`-routed handler, a first-live-PTY fallback, and a planted durable write of streamed bytes each still produce at least one problem
    # The plants are re-run rather than assumed. A lane that survives a diff but stopped
    # discriminating is the same failure as a deleted one, arriving quieter.

  # THE PROSE IS REWRITTEN, NEVER DELETED — and the trail survives.
  Scenario: the invariant's subject sentence names the surfaces as they now are
    When I read the amended suite's file header
    Then invariant 4's sentence no longer claims the fleet page is the only monitor and the board dock the only interactive surface
    And it names BOTH interactive surfaces — the board dock and the terminals home — and states that the fleet page stays a monitor
    And it states that no render site in any of the three assembles the value that decides whether an operator can type into another machine
    And the m46/story-04 amendment note is still present, unedited, with the m49 note added BENEATH it
    # Two amendments, one trail. The next reviewer meets the decision rather than a
    # confusing red, which is exactly what the m46 note was written to provide.

  # ══ PART 1 · THE AUTHORSHIP TABLE — three surfaces, three modules ══
  Scenario Outline: each surface has exactly ONE module that may write the `posture:` key
    When the amended clause sweeps <the surface directory> over the real tree
    Then the only file that writes a `posture:` key is `<the one module>`, and it declares `<what it declares>`
    And the sweep reports zero offenders against the tree as it stands
    And the directory is non-vacuous: it holds at least <files> swept source files

    Examples:
      | case                    | the surface directory | the one module                    | what it declares                          | files |
      | the monitor             | `ui/src/fleet/**`     | `ui/src/fleet/terminal-mount.mjs` | `POSTURE_READ_ONLY`                       | 5     |
      | the dock                | `ui/src/board/**`     | `ui/src/board/dock-mount.mjs`     | `POSTURE_INTERACTIVE`                     | 5     |
      | the terminals home      | `ui/src/home/**`      | `ui/src/home/session-mount.mjs`   | `POSTURE_INTERACTIVE`, narrowed by the feed axis | 2 |
    # MEASURED AT THIS REFINE, so the two added rows are green on arrival for a reason
    # rather than by luck: `ui/src/fleet/` holds 14 swept files of its 20 entries (six
    # `.d.mts` are excluded at :341) and only `terminal-mount.mjs:138,178` writes the
    # key; `ui/src/board/` holds 16 and only `dock-mount.mjs:48,99` writes it. The home
    # row is the one that is RED until task 01 lands, and it is red LOUDLY: the swept
    # directory does not exist, so the walk throws rather than passing over nothing.

  Scenario Outline: a second author for the posture is reported, wherever it is spelled
    Given the clean tree, against which the clause reports zero offenders
    And <the plant> added to <the surface directory>
    When the amended clause sweeps that directory
    Then the plant differs from the clean baseline — it landed
    And an offender is reported naming the planted file AND the module that is allowed to author the value there

    Examples:
      | case                                                     | the plant                                                                       | the surface directory |
      | the spelling a word sweep cannot see                     | a component with `mount={{ ...homeSessionMount(row), posture: { readOnly: !!0 } }}` | `ui/src/home/**`   |
      | a helper module that decides it too                      | a `.mjs` returning `{ posture: POSTURE_INTERACTIVE }`                            | `ui/src/home/**`      |
      | the same move, one directory over                        | a board component writing `posture: dockPosture`                                 | `ui/src/board/**`     |
      | and the clause it already had                            | a fleet component writing `posture: peekPosture`                                 | `ui/src/fleet/**`     |
    # ROW 1 IS THE EXACT SPELLING m46's own structural review found walking past the
    # word sweep, and this milestone's own feature is what would reach for it. Nothing
    # in that line says `interactive`; measured through the real modules it produces
    # `inputEnabled: true`, a registered `onData`, a blinking cursor and NO `read-only`
    # label — every posture signal gone, CI silent.

  # THE SCOPE OF THE OLD ABSENCE SWEEP DOES NOT MOVE. If it did, the amendment would be
  # unsatisfiable — which is a worse failure than the one it fixes, because it looks
  # like the feature is wrong.
  Scenario Outline: `INTERACTIVE_DECLARATION` still sweeps the fleet, and only the fleet
    When the amended gate is run against the real tree
    Then a file naming the interactive posture in <the directory> is <verdict>

    Examples:
      | case                              | the directory        | verdict                                                                 |
      | the monitor may not name it       | `ui/src/fleet/**`    | an offender — reversing the fleet card's posture is not this milestone   |
      | the dock has named it since m42   | `ui/src/board/**`    | not an offender — `dock-mount.mjs` declares `POSTURE_INTERACTIVE` today  |
      | the home must name it             | `ui/src/home/**`     | not an offender — that declaration IS the milestone                      |
      | the control is not a call site    | `ui/src/terminal/**` | not swept at all by either part-1 clause                                 |
    And the needle's own value is unchanged: it still matches `POSTURE_INTERACTIVE`, the quoted word `interactive`, `readOnly: false` and `MOUNT_INTERACTIVE`
    And the swept set of the authorship clause is exactly the three surface directories, and `ui/src/terminal/` is not among them
    # ROW 4 IS THE TRAP. `TerminalControl.tsx:284,628` writes `posture: mount.posture` —
    # a read-through of the value this gate protects. A sweep extended over `ui/src/**`
    # would report the shipped control, and the natural "fix" would be an exemption
    # list, which is precisely what ADR-001 rejected the fleet-absorption option to
    # avoid.

  # ══ PART 1 · THE JSX CLAUSE — one prop, three sites, and silence is a FAILURE ══
  Scenario Outline: every mount site hands the control its own module's return value, bare
    When the amended clause sweeps <the surface directory> for the control's JSX mount sites
    Then at least ONE mount prop is FOUND there — a directory where none is found fails the clause, it never passes it
    And every prop found matches `<the bare call>` at its start
    And no prop contains a spread

    Examples:
      | case               | the surface directory | the bare call          |
      | the fleet card     | `ui/src/fleet/**`     | `fleetTerminalMount(`  |
      | the board dock     | `ui/src/board/**`     | `boardDockMount(`      |
      | the grid tile      | `ui/src/home/**`      | `homeSessionMount(`    |
    # Verified at this refine: `Fleet.tsx:1185-1187` and `Board.tsx:618-620` both put the
    # prop on its own line, which is what the extractor at :572 requires, so the two
    # added rows are satisfiable today. TODAY ONE JSX PROP IS CHECKED; AFTER, THREE.

  Scenario: a mount site the extractor cannot see fails the gate rather than passing it
    Given a home component whose `mount=` prop is followed by another prop on the same line, so the extractor finds nothing there
    When the amended clause runs
    Then the clause FAILS, naming the surface whose mount site it could not find
    And the failure message says that zero mount sites in a surface directory is a defect in this clause's reach, never evidence of a compliant surface
    # This is the whole lesson of this gate's own history, applied to its newest clause:
    # a detector that reports nothing because it looked nowhere reads exactly like a
    # detector that reports nothing because the code is clean.

  # ══ PART 1 · THE BEHAVIOURAL CLAUSE — one source, three postures, driven through the
  #    REAL modules. This is the clause a source-grep cannot write. ══
  Scenario Outline: the real mounts answer, and they do not all answer the same
    Given the REAL producer for <the surface>, imported by the gate
    When I run the shipped `inputPolicyFor` over the mount it returns for <the row>
    Then `posture` is `<posture>` and `inputEnabled` is <input>
    And the mount's `source.kind` is `mirror`, and the source object is reference-identical across all four rows

    Examples:
      | case                                      | the surface        | the row                                     | posture     | input |
      | the fleet card, unchanged                 | fleet              | a resolved assignment with a captured session | read-only   | false |
      | the board dock, unchanged since m42       | board              | a `mirror` session on `node-a`               | interactive | true  |
      | the grid tile an assignment feeds         | home               | a row whose feed axis reads `producer-known` | interactive | true  |
      | the grid tile nothing will ever feed      | home               | a row carrying `workItem: null`              | read-only   | false |
    And not all four answers are equal — the clause proves a DIFFERENCE rather than a constant
    # THE CONTRAST IS PRESERVED AND EXTENDED: one source, now THREE postures across three
    # surfaces. If every surface answered the same way this gate would be green for a
    # control that simply never types, which is not the product.

  Scenario Outline: the home's mount is driven with the same adversarial rows the fleet's is, in the fail-closed direction
    Given the REAL `ui/src/home/session-mount.mjs`, imported by the gate
    When I drive it with a row carrying <the decoy> whose feed axis reads <the axis value>
    Then `posture` is `<posture>` and the shipped policy yields `inputEnabled: <input>`

    Examples:
      | case                                   | the axis value | the decoy                      | posture     | input |
      | the word on the row                    | no-producer    | `posture: "interactive"`       | read-only   | false |
      | the constant on the row                | no-producer    | `posture: POSTURE_INTERACTIVE` | read-only   | false |
      | the field the word sweep cannot see    | no-producer    | `readOnly: false`              | read-only   | false |
      | a session that left the roster         | roster-gone    | `state: "running"`             | read-only   | false |
      | positively established, and typeable   | producer-known | nothing                        | interactive | true  |
    # These are the same three shapes part 1 already drives through the fleet's mount
    # (:595-603), aimed at the surface that CAN type. A plant that read the posture off
    # the row names no `interactive` literal anywhere and sails past every word sweep in
    # this file; this is the clause that catches it. The last row is the non-vacuity: a
    # mount hard-coded to read-only would pass the first four and fail this one.

  # ══ PART 2 · UNTOUCHED. Not one character, and it is re-proved rather than assumed. ══
  Scenario: the policy lane is unchanged and still exhaustive
    When I run part 2 against the shipped modules
    Then it still drives the WHOLE frozen source table × both postures, with no sampling, and `SESSION_SOURCES` still has at least two rows
    And for every cell `disableStdin` is the exact negation of `inputEnabled`, the keystroke sink is present exactly when input is, the cursor blinks exactly when input is, and the `read-only` label is mandatory whenever it is not
    And `ui/src/terminal/input-policy.mjs` and `ui/src/terminal/source-table.mjs` are untouched by this milestone, so the lane passes without a single edit to it or to them

  Scenario Outline: the seven malformed declarations still fail closed, exactly as they do today
    When I call the shipped `inputPolicyFor` with the `mirror` source and <the declaration>
    Then `inputEnabled` is false and `disableStdin` is true
    And `mountModelFor` registers no keystroke sink at all

    Examples:
      | case                                                | the declaration                     |
      | a source that declares it cannot input              | `{ ...mirror, canInput: false }` at the interactive posture |
      | an unrecognised source kind                         | the lookup for `banana` at the interactive posture |
      | no mount posture supplied at all                    | `undefined`                         |
      | a null mount                                        | `null`                              |
      | a key in the wrong case                             | `{ readonly: false }`               |
      | a non-boolean that SAYS read-only in words          | `{ readOnly: "yes" }`               |
      | a mis-spelled posture                               | `"Interactive"`                     |
    # These seven are the shipped list at :657-666 and they are enumerated here so that
    # "part 2 is untouched" is a checkable claim rather than a promise. `canInput` is a
    # CAPABILITY and is never a permission; an unknown input may cost a keystroke, it may
    # never cost a lie.

  # ══ PART 3 · UNTOUCHED, AND IT GAINS A DIRECTORY ══
  Scenario Outline: neither surface directory grows an input path or a socket of its own
    Given the clean tree, against which the sweep reports zero offenders
    When <the plant> is added to <the directory> and the sweep runs
    Then the plant differs from the clean baseline — it landed
    And an offender is reported naming the planted file and what it wired

    Examples:
      | case                                | the plant                                                       | the directory     |
      | a home module taking keystrokes     | a `.mjs` calling `term.onData(` on a terminal it holds          | `ui/src/home/**`  |
      | a home module with its own wire     | a file naming `WebSocket` and calling `.send(` on it            | `ui/src/home/**`  |
      | a home module keying off the DOM    | a file calling `attachCustomKeyEventHandler(`                   | `ui/src/home/**`  |
      | the fleet clause, unchanged         | a fleet `.mjs` calling `term.onKey(`                            | `ui/src/fleet/**` |
    And on the clean tree both directories are non-vacuous: the fleet sweep still walks at least five swept files (14 today) and the home sweep at least two
    And an ABSENT `ui/src/home/` fails the lane loudly rather than passing it over nothing
    # The home is interactive THROUGH THE ONE CONTROL and only through it. A home module
    # that grew a private socket would be a second input seam beside the tuple-bound one,
    # which is invariant 1's whole subject — and `ui/src/home/` is a new top-level
    # directory that would otherwise sit outside the only sweep that catches it.

  Scenario: the six surviving clauses about the ONE control still hold, and the control still genuinely types
    When part 3 runs against the real tree
    Then the fleet page still mounts the ONE control by name, and still hands it `fleetTerminalMount(`
    And the source table still declares `/ws/terminal-view` and `/ws/terminal`, read RAW because a `ws://` inside a template literal reads as a line comment to the stripper
    And the one control still wires a terminal input source and still sends on its socket — the interactive lane is real, on a surface this gate is not sweeping
    And the identity line still names the far end in WORDS
    And the control still spells neither `disableStdin` nor `cursorBlink` as a literal
    And `src/terminal-ws.mjs` still writes its own PTY, untouched by this feature
    # If the read-only clauses could be satisfied by a control that can never type at
    # all, this gate would be green about a product that does not exist. That is why the
    # positive half is asserted beside every negative one.

  # THE COMMENT-STRIP ORDER, WITH A PLANT — because on an absence sweep the wrong order
  # is a silent PASS, and silence is what this whole file is written against.
  Scenario: a line comment containing a block-comment opener cannot blind the new sweeps
    Given a synthesized home file whose FIRST line is a line comment containing `/*`, and which wires `term.onData(` twenty lines below it
    When the new `ui/src/home/**` sweep reads it through the suite's shipped `stripComments`
    Then the `onData` wiring IS reported as an offender
    And with the strip order reversed the same file would report nothing at all — which is why the order is asserted and not merely commented
    And a `term.onData(` that appears ONLY inside a genuine block comment is NOT reported
    And every new clause in this file uses that same shipped `stripComments`; no second copy is defined anywhere in the suite

  # ══ STRICTLY STRONGER — the checklist a reviewer can run ══
  Scenario Outline: every assertion the gate makes today still runs and still answers the same way
    When the amended gate runs against the real tree
    Then <the surviving assertion> still holds

    Examples:
      | # | the surviving assertion                                                                                             |
      | 1 | `INTERACTIVE_DECLARATION`'s literal value is unchanged, and it still fires on a fleet file that names the posture     |
      | 2 | `POSTURE_KEY_WRITE`'s literal value is unchanged, and it still fires on a fleet file other than `terminal-mount.mjs`  |
      | 3 | `TERMINAL_INPUT_SOURCE`, `SOCKET_NAMED` and `ANY_SEND_CALL` are unchanged in value                                    |
      | 4 | the fleet's JSX mount prop is still required to be a bare `fleetTerminalMount(` call with no spread                    |
      | 5 | `ui/src/fleet/terminal-mount.mjs` is still read positively for `POSTURE_READ_ONLY` by name                             |
      | 6 | the three adversarial fleet rows still yield `read-only` and `inputEnabled: false`                                     |
      | 7 | the real fleet mount still yields `rendersPanel: true`, no keystroke sink, `sendPath: null`, the `read-only` label and a non-blinking cursor |
      | 8 | the board's `mirror` mount is still `interactive`, still typeable, and still the SAME source row as the fleet's        |
      | 9 | part 2's whole-table drive and its seven fail-closed rows still run                                                    |
      |10 | part 3's `ui/src/fleet/**` sweep still runs, still with a file floor, still finding zero offenders                     |
      |11 | the six control-side clauses of part 3 still run                                                                       |
      |12 | invariants 1, 2 and 3 still run and still fire on their plants                                                         |

  Scenario Outline: and these are the additions, which is what makes the replacement stronger rather than equal
    When the amended gate runs against the real tree
    Then <the added assertion> holds, and it did not exist before this story

    Examples:
      | # | the added assertion                                                                                       |
      | 1 | `ui/src/board/**` has exactly one posture author, and it is `dock-mount.mjs`                               |
      | 2 | `ui/src/home/**` has exactly one posture author, and it is `session-mount.mjs`                             |
      | 3 | the board's JSX mount site is checked for the bare call, per surface, with a floor of one                  |
      | 4 | the home's JSX mount site is checked the same way, discovered by sweep rather than named                  |
      | 5 | the home's REAL mount is driven with adversarial rows and must fail closed to `read-only`                  |
      | 6 | the home's REAL mount must yield `interactive` for a positively-established `producer-known` row           |
      | 7 | `ui/src/home/**` is swept for input sources and browser sockets                                            |
      | 8 | the contrast clause now proves three postures across three surfaces rather than two across two             |
    And nothing is exempted anywhere: no file, directory or clause is added to a skip list in this diff
    # ADR-008's own checklist, made runnable. Where m46's amendment had to trade a sweep
    # for a policy, this one trades nothing — and a reviewer who wants to know whether
    # the reversal cost anything can read these two tables instead of a diff.
