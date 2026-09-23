<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/08, THE COUNT: `withTerminalControl` mounts N controls from a
# CALLER-SUPPLIED entry, each one independently addressable, and the single-control path it has
# served since m46 is untouched.
#
# WHY THIS IS A DELIVERABLE AND NOT A PARAGRAPH IN STORY 05. The developer's feasibility pass
# measured story 05 as NOT BUILDABLE AS WRITTEN, and named the mount arity as "the single biggest
# uncosted item in the milestone" (FEASIBILITY §2(i)). Four of story 05's seven contracts need a
# tree with more than one control in it before their first `Then` can be evaluated:
# `05/01` "a grid of three subscribed tiles holds three sockets", `05/03` "twenty rows and a cap
# of sixteen", `05/04` "twelve tiles", `05/05` "exactly one node in the whole rendered tree
# carries `aria-live`". None of them is reachable through a harness that mounts one.
#
# ═══ THE SEAM, READ AT SOURCE (verified 2026-08-13 against this working tree) ═══════════════════
#  - `withTerminalControl({ host, mount, origins = {} }, fn)` —
#    `test/support/terminal-control-harness.mjs:233`. ONE object, no entry key.
#  - THE ENTRY IS A MODULE CONSTANT: `const CONTROL_TSX = …/TerminalControl.tsx` (`:48`), read by
#    the single `bundleSurface({ entry: CONTROL_TSX, … })` call at `:234`.
#  - THE MOUNT IS ONE ELEMENT WITH A FIXED PROP SIGNATURE:
#    `renderer.mount({ $$el: ELEMENT, type: mod.TerminalControl, props: { host, mount, origins }, key: null })`
#    (`:301`), preceded by `if (typeof mod.TerminalControl !== "function") throw …` (`:299`) —
#    so the bundle's export NAME is fixed too.
#  - THE DRIVER IS SINGULAR BY CONSTRUCTION (`:316-357`): `socket()` is
#    `sockets[sockets.length - 1]` (`:321`), `terminal()` is `terminals[terminals.length - 1]`
#    (`:323`), `paneHost()` is `nodeWithClass("absolute inset-0")[0]` (`:329`), `chip()` reads the
#    FIRST `aria-live="polite"` node in the whole tree (`:334`). At N=1 "the last one constructed"
#    and "this pane's" are the same value. At N=12 they are not, and every one of those accessors
#    silently answers about the wrong pane rather than failing.
#  - THE RENDERER ALREADY SUPPORTS N — this is measured, not assumed. `createRuntime({ hostNode })`
#    keys host refs by TREE PATH, `` `${pathKey}/${String(type)}#${key ?? ""}` `` (mini-react.mjs:355),
#    reuses the node across passes and detaches it when the element leaves
#    (`:360-369`, `:395-401`). The harness already passes `hostNode`
#    (terminal-control-harness.mjs:244). So N distinct controls in one tree get N distinct pane
#    nodes today; the arity ceiling is the harness's mount call, NOT the renderer.
#  - THE GLOBALS ARE PROCESS-WIDE AND SHARED ACROSS ALL N: one `sockets` array (`:240`, installed
#    as `globalThis.WebSocket` at `:266`), one `globalThis.__AOF_TERMINALS__` (`:264`, pushed to by
#    the xterm stand-in at `:72`), one `frames` map (`:241`). Attribution to a pane is exactly what
#    does not exist yet.
#  - THE KNOWN ANSWER THIS IS PROVED AGAINST: `test/terminal-control-opens-its-socket.test.mjs`
#    — 13 lanes, 10 of which mount — pins the board dock's own PTY URL at `:163`, the dock's
#    mirror URL at `:191`, the fleet card peek at `:221`, the card's rest state at `:213-214`, its
#    read-only construction at `:225-226`, and the unbound dock's `idle` at `:317-321`.
#    `test/terminal-control-header-yield.test.mjs` is the second consumer — 9 lanes, 4 mount call
#    sites (`:107`, `:127`, `:164-165`, `:192-193`), every one of them `{ host, mount, origins }`.
#
# ═══ THE BINDING PO RULING: PROVE THE HARNESS AGAINST A KNOWN ANSWER, NEVER AGAINST THE GRID ════
# The trap this story exists inside is building the harness and the grid together so that each
# excuses the other's failures — a red assertion becomes "the grid isn't finished" on Monday and
# "the harness can't see it yet" on Tuesday, and nothing is ever wrong. So the new N-capable path
# is driven at behaviour that is ALREADY TRUE AND ALREADY ASSERTED: the shipping board dock and
# the shipping fleet card, which milestone 46 pinned exhaustively in the suite named above.
# **If the N-capable path cannot reproduce m46's own passing assertions at N=1, it is not ready to
# be believed at N=12.** Scenarios 1 and 2 are that proof, and they are the first two deliberately.
#
# NOT ASSERTED HERE, each with an owner:
#  - a shell, a focus model, `activeElement`, key dispatch, event propagation, `withMountedApp`'s
#    host nodes, and the stub opt-out — task 01 of THIS story.
#  - which rows become panes, what any pane says, the cap, the sort, `needs input`, the feed axis
#    — story 49/05 and story 49/02. NOTHING in this file may name a terminals-home behaviour: this
#    story adds no product code and no scenario about that screen.
#  - the fourth host constant and its affordance table — story 49/03. The scenarios below drive the
#    THREE SHIPPED hosts on purpose, because those are the ones with a known answer.
#  - every pixel fact — the milestone's design-conformance review (`05/06`).
#
# ═══ TRAPS, NAMED SO THE BUILD DOES NOT DISCOVER THEM ═══════════════════════════════════════════
#  (a) THE ONE FORBIDDEN FIX. `TerminalControl` must NEVER enter this harness's stub set. Its stub
#      set is `CONTROL_STUBS` (`:100-106`) and its resolver list is `CONTROL_RESOLVE` (`:107-113`);
#      the other three harnesses each stub the control by module path
#      (`fleet-app-harness.mjs:32,35`; `board-app-harness.mjs:42,60`;
#      `shell-app-harness.mjs:33-34,127,133`, all `/(^|\/)TerminalControl$/`). Making the entry a
#      caller-supplied value puts a second door in the same room: an entry that imports a stubbed
#      control would mount green and connect to nothing. That is TECH_DEBT 29 exactly, in the file
#      built to prevent it. Scenario 9 pins it.
#  (b) "THE LAST ONE CONSTRUCTED" IS A CORRECT ANSWER AT N=1 AND A WRONG ONE AT N=12, silently.
#      `socket()`/`terminal()`/`paneHost()`/`chip()` (`:321`, `:323`, `:329`, `:334`) must gain a
#      per-pane form; leaving the singular accessors pointing at "the last" and writing grid lanes
#      against them produces a suite that asserts twelve times about one pane.
#  (c) THE BUNDLE CACHE IS KEYED ON `(entry, stub names)` — `bundleSurface`'s
#      ``key = `${entry}::${Object.keys(stubs).sort().join(",")}` `` (react-app-harness.mjs:82).
#      A caller-supplied entry makes that key genuinely multi-valued for the first time; two
#      entries with the same stub set must not collide, and a lane must not be handed another
#      lane's bundle.
#  (d) THE INSTALLED-GLOBAL LIST IS A STRAIGHT WALK BY NAME (`:250-260`, restored at `:362-365`),
#      and its own comment says why: the runner is one sequential process, so a `document` left
#      standing changes what `typeof document === "undefined"` answers for every suite that runs
#      after. Anything new this task installs is added to that list by name, or the leak is
#      invisible until an unrelated suite fails.
#  (e) THE SETTLE LOOP IS BOUNDED AT 50 PASSES (`:306-311`, throwing "the control never settled").
#      Twenty controls settling in one tree is a different amount of work from one; a bound that
#      is too tight fails as a mysterious harness error rather than as a real defect, and a bound
#      raised without measurement hides a genuine render loop.
#
# ISOLATION: no store, no server, no port. The harness mounts in-process and its `WebSocket` is a
# stand-in that connects to nothing (`:179-198`). Any lane that stands a store up takes a fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)` — the repo's guard hook requires it; `:4181`/`:4182` are held by
# live daemons, so no scenario here binds a fixed port. Focused runs only, never the full suite
# (`test/global-work-propagation.test.mjs` binds `:4182`).
#
# REGISTRATION, AND THE COLLISION IS EXPECTED RATHER THAN DISCOVERED: any new suite is registered
# in `scripts/test.mjs` (import beside `:658`, spread beside `:2278`) and checked by
# `test/arch/acd-test-suite-registration.test.mjs`. FEASIBILITY §5.1 measured that stories 02, 03,
# 05 and 06 of this milestone ALSO each register a suite in that one file — with this story that is
# five stories editing `scripts/test.mjs`, and both it and the arch gate are DIRTY in this tree
# (uncommitted m47/m48 work that exists on no branch). Serialise the edit; never `git stash`,
# `git reset --hard` or `git checkout --` a dirty file to make room for it.
#
# WHAT THIS IS NOT: it is not a browser. No glyph is painted, no column is measured, no byte
# crosses a wire. It is the arity of a mount, and nothing else.

@executable @ui @work @validate
Feature: the harness mounts N controls from a caller-supplied entry — every pane independently addressable, the shipping single-control path untouched, and the whole capability believed only because it reproduces milestone 46's own passing assertions at N=1
  In order that story 49/05's contracts can be evaluated at all — three sockets, twenty panes, twelve live regions — instead of being written against a harness that mounts exactly one control and hard-codes its entry
  `withTerminalControl` takes the ENTRY and the PROPS from its caller, mounts however many controls that entry renders, and hands back a driver that addresses each pane on its own rather than "the last one constructed"

  Background:
    Given the REAL, UNMODIFIED `ui/src/terminal/TerminalControl.tsx` is what gets bundled — never a stub, by module path or by any other spelling
    And "a socket" means an entry in the harness's own record of every `WebSocket` the mounted tree constructed
    And "a pane host" means the `absolute inset-0` element the byte area renders only for a `bytes` pane, and the element an xterm is opened into
    And the three shipped hosts (`board-dock`, `fleet-card`, `fullscreen`) and their shipped mount builders are used throughout, because those are the ones whose answers are already known
    And no scenario in this file asserts anything about the terminals home, its rows, its states, its cap or its sort — this story adds no product code

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 1 · THE KNOWN ANSWER. The N-capable path is driven at N=1 against behaviour milestone 46
  #     already pins, and the values are m46's own — not new ones invented beside it.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario: the entry-parameterised path, at N=1, reproduces milestone 46's board-dock assertions value for value
    Given a caller-supplied entry that renders exactly ONE `TerminalControl` at the `board-dock` host
    And the mount is the shipped `boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" })`
    And the origins are `{ self: "http://127.0.0.1:41773", fleet: "http://127.0.0.1:4181" }`
    When the tree is mounted through the entry option
    Then exactly one socket was constructed
    And its URL is exactly `ws://127.0.0.1:41773/ws/terminal?ref=46%2F01&provider=claude`
    And exactly one pane host is present in the rendered tree
    And exactly one xterm was constructed, and its host's `parentElement.tagName` is `DIV`
    And the state chip reads exactly `connecting…`
    And the byte area does NOT read `No session. Press Run agent on an item.`
    And every one of those six values is the SAME value `test/terminal-control-opens-its-socket.test.mjs:160-172` already asserts through the single-control path
    # THE PO RULING, AS A LANE. These are not new claims; they are m46's claims, re-derived through
    # a path that did not exist. A builder who cannot make this scenario green has not built a
    # harness that can be believed about twelve panes — and finding that out here costs an hour,
    # while finding it out inside story 05 costs the milestone, because a red assertion there is
    # always explicable as unfinished grid logic.

  Scenario: the same path, at N=1, reproduces the fleet card's rest state and its read-only construction
    Given a caller-supplied entry that renders exactly ONE `TerminalControl` at the `fleet-card` host
    And the mount is the shipped `fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "46/01" })`
    And the origins are `{ self: "http://127.0.0.1:4181", fleet: "http://127.0.0.1:4181" }`
    When the tree is mounted through the entry option
    Then NO socket was constructed and NO pane host is present — a card at rest holds neither
    When the worded toggle `Watch terminal →` is pressed
    Then exactly one socket was constructed, and its URL is exactly `ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c`
    And that xterm was constructed with `disableStdin: true`
    And NO keystroke sink is registered on it — not one registered and ignored
    And all five values are the ones `test/terminal-control-opens-its-socket.test.mjs:213-226` already asserts
    # A SECOND known answer, chosen because it is the one host whose correct answer at rest is
    # ZERO sockets. A harness extension that made every mount dial would pass scenario 1 and fail
    # this one — which is why both are here and why this one asserts an absence first.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 2 · THE HEADLINE. N controls in one tree, each addressable on its own.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario: three controls mount in one tree and the driver addresses the THIRD, not "the last one constructed"
    Given a caller-supplied entry that renders three `TerminalControl`s at the `board-dock` host, in declared order
    And their mounts are the shipped `boardDockMount` for `(aof-wsl, s-1)`, `(aof-wsl, s-2)` and `(win-host-a, s-9)` respectively
    When the tree is mounted
    Then exactly three sockets were constructed and exactly three xterms were constructed
    And the driver answers, FOR THE PANE AT INDEX 2 SPECIFICALLY: its own socket, its own xterm, its own pane host and its own state chip
    And the socket the driver returns for index 2 carries `sessionId=s-9`, and neither `s-1` nor `s-2`
    And the socket the driver returns for index 0 carries `sessionId=s-1`
    And no pane's accessor returns another pane's socket, xterm, pane host or chip
    And a per-pane accessor asked for an index that was never mounted FAILS LOUDLY rather than answering about a neighbour
    # "ABOUT THE THIRD PANE" IS THE WHOLE DELIVERABLE. `05/01`, `05/03`, `05/04` and `05/05` each
    # assert about a NAMED pane in a set; a driver that can only say "the last socket constructed"
    # turns every one of those into an assertion about whichever pane happened to render last.

  Scenario Outline: the arity scales to every count story 49/05's contracts actually ask for
    Given a caller-supplied entry that renders <panes> `TerminalControl`s at the `board-dock` host
    And <bindable> of them carry a bindable shipped mount and the rest carry `boardDockMount(null)`
    When the tree is mounted
    Then exactly <panes> controls are addressable by index, and index <last> is the final one
    And exactly <bindable> sockets were constructed and exactly <bindable> xterms were constructed
    And exactly <bindable> pane hosts are present in the rendered tree
    And the tree settled without the harness's own settle bound being reached

    Examples:
      | case                                  | panes | bindable | last |
      | the shipping arity, unchanged         | 1     | 1        | 0    |
      | the smallest case that can cross-talk | 2     | 2        | 1    |
      | 05/01's three sockets                 | 3     | 3        | 2    |
      | 05/04 and 05/05's twelve              | 12    | 12       | 11   |
      | 05/03's twenty, sixteen of them fed   | 20    | 16       | 19   |
      | twenty, none of them fed              | 20    | 0        | 19   |
    # ROW 5's SHAPE comes from `05/03`'s scale and NOT from any rule about a cap: which panes are
    # bindable is the CALLER's fixture here, decided in the lane. The cap itself, and any claim
    # about which panes a cap subscribes, is story 49/05 task 03 and appears nowhere in this file.
    # ROW 6 IS THE NON-VACUITY ROW: twenty mounted panes and ZERO sockets proves the socket count
    # is a measurement of the tree rather than a count of the mounts. A harness that returned
    # `panes` for both would pass rows 1-5.
    # THE SETTLE BOUND IS A THEN, not a footnote: `terminal-control-harness.mjs:306-311` throws
    # "the control never settled" after 50 passes, and twenty controls is the first tree big
    # enough to find out whether that bound was sized for one.

  Scenario: what happens to one pane does not happen to its neighbours
    Given a mounted tree of three bindable panes, each holding exactly one constructed socket
    When the socket belonging to the pane at index 1 is opened and delivers `hello\r\n`
    Then the pane at index 1 reads `streaming` and its xterm holds exactly those bytes
    And the panes at index 0 and index 2 still read `connecting…`
    And their xterms hold nothing written at all
    And the total socket count is still three — driving one pane constructed nothing new anywhere
    # CROSS-TALK IS THE FAILURE MODE A SHARED `globalThis.__AOF_TERMINALS__` (`:264`, pushed at the
    # stand-in's `:72`) and a shared `sockets` array (`:240`) make easy and invisible. This lane
    # asserts a DIFFERENCE between panes, which is the only shape that catches it.

  Scenario: the same mount observed alone and observed as one of twelve produces the same answers
    Given the shipped `boardDockMount({ kind: "mirror", ref: "46/01", nodeId: "aof-wsl", sessionId: "7f3a91c" })` mounted alone at the `board-dock` host
    And the SAME mount mounted at index 7 of a tree of twelve panes, with the same origins
    Then the socket URL observed for the lone pane and the socket URL observed for index 7 are byte-identical
    And their state chips are byte-identical
    And each has exactly one pane host and exactly one xterm
    # THE ANTI-"EACH EXCUSES THE OTHER" LANE, in one comparison. If mounting twelve changes what
    # pane 7 does, then no N=12 assertion in story 49/05 measures the control — it measures the
    # harness, and every one of them will be debugged as a grid defect.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 3 · TEARDOWN. N panes means N sockets and N xterms to leak.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario: unmounting the tree closes every socket and disposes every xterm, and the harness can prove it
    Given a mounted tree of twelve bindable panes, each holding an open socket and a constructed xterm
    When the tree is unmounted
    Then zero of the twelve sockets are left open
    And zero of the twelve xterms are left undisposed
    And every global the harness installed by name is restored to the value it held before the lane
    And a lane running immediately afterwards observes `typeof document === "undefined"` again
    # THE RESTORE IS A STRAIGHT WALK OVER A LIST OF NAMES (`:250-260` → `:362-365`), and the list's
    # own comment says why it must be: one sequential runner, so a leaked global changes an
    # unrelated suite's behaviour far from its cause. Anything this task installs joins that list.

  Scenario: a pane removed from the tree while its neighbours stay takes only its own socket with it
    Given a mounted tree of three bindable panes, each holding an open socket
    When the entry re-renders with the pane at index 1 removed
    Then that pane's socket is closed and its xterm is disposed
    And the sockets of index 0 and index 2 are still open, and their xterms still hold their scrollback
    And their pane hosts are still present in the rendered tree
    And no socket was constructed by the re-render
    # This is `05/01`'s "one tile is unmounted" clause made a HARNESS capability rather than a
    # grid claim: mini-react detaches a departed host element's ref (`mini-react.mjs:395-401`), so
    # the machinery exists — what does not exist is a tree with a neighbour left in it to check.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 4 · THE REGRESSION BAR. Everything that works today still works, and the one forbidden fix.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario: the shipping single-control path is untouched — the two suites that use it are not edited to accommodate this change
    Given `withTerminalControl({ host, mount, origins }, fn)` called with NO entry key, exactly as both shipping suites call it
    When that call is made against the extended harness
    Then it mounts `ui/src/terminal/TerminalControl.tsx`, as `terminal-control-harness.mjs:48` names today
    And it yields a driver whose existing accessor names still answer: `sockets`, `socket`, `terminals`, `terminal`, `paneHosts`, `paneHost`, `paneText`, `chip`, `bar`, `button`, `buttonLabelled`, `click`, `render`, `runFrames`, `resizeObservers`, `tree`, `unmount`
    And the diff that lands this task changes NEITHER `test/terminal-control-opens-its-socket.test.mjs` NOR `test/terminal-control-header-yield.test.mjs` — both files are byte-identical before and after
    And all 13 lanes of the first and all 9 lanes of the second are green against the extended harness
    # THIS IS NOT VACUOUSLY GREEN TODAY, and the clause that makes it measurable is the third one:
    # there is no "extended harness" to run the suites against until this task lands, and the
    # cheapest way to make N work is to rewrite the two consumers around a new signature. The
    # byte-identical clause is what forbids that, and it is checkable from the diff.

  Scenario: `TerminalControl` is not in this harness's stub set, and a caller-supplied entry cannot smuggle it in
    Given the harness's stub set `CONTROL_STUBS` and its resolver list `CONTROL_RESOLVE`
    Then no key in the stub set and no `filter` in the resolver list matches `TerminalControl`, by module path or by any other spelling
    And the only substitutions are the environment a browser would provide: `@xterm/*` ×3, `react` and `react/jsx-runtime`, `react-dom`'s `createPortal`, `lucide-react`, and a DOM with a recording `WebSocket`
    And an entry supplied by a caller is bundled with its REAL siblings against that SAME stub set — a lane cannot pass a stub set of its own that adds one
    And a mounted tree whose control was substituted constructs no socket, so the scenarios above would go red rather than green if it ever were
    # THE SPECIFIC REGRESSION TO GUARD, stated as a scenario because it is the reason the whole
    # story exists. The other three harnesses stub this component by module path
    # (`fleet-app-harness.mjs:32,35`; `board-app-harness.mjs:42,60`;
    # `shell-app-harness.mjs:33-34,127,133`), and that is exactly how m46 shipped a control that
    # opened no socket past 537 green tests. Making the ENTRY a parameter opens a second door into
    # the same room: an entry that imports a stubbed control mounts green and connects to nothing.
    # Story 49/05's socket proof dies silently on the day this clause stops holding.

  Scenario: two entries with the same stub set get their own bundles, not each other's
    Given one lane mounts a caller-supplied entry A and a second lane mounts a different entry B, both with the harness's own stub set
    When both lanes run in the same process, in either order
    Then the tree lane A mounts is A's and the tree lane B mounts is B's
    And neither lane observes a control, a socket or a pane host belonging to the other
    # `bundleSurface` caches on `(entry, sorted stub names)` (react-app-harness.mjs:82). That key
    # has been effectively single-valued for this harness since m46 because the entry was a
    # constant; this task is what makes it genuinely multi-valued for the first time, and a cache
    # collision here would hand a lane another lane's component and still look green.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 5 · NON-VACUITY. Every count above must be a measurement that can come out wrong.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario Outline: the per-pane accessors are assertions that can FAIL
    Given a mounted tree of three panes where <the situation>
    Then <the observable>

    Examples:
      | case                        | the situation                                       | the observable                                                                       |
      | a pane that dials nothing   | the pane at index 1 carries `boardDockMount(null)`  | index 1 has NO socket and NO pane host, while indexes 0 and 2 have one each           |
      | a pane with no fleet origin | the pane at index 2 is a `mirror` mount and the origins carry `self` only | index 2 has no socket and reads `unavailable`, while indexes 0 and 1 are unaffected |
      | a chip that differs         | the socket at index 0 has been opened and index 1's has not | index 0 reads `waiting for output` and index 1 reads `connecting…`             |
    # A DETECTOR ONLY EVER SHOWN TO STAY QUIET IS ONE MUTATION FROM ASSERTING NOTHING. Each row
    # here is a case where the per-pane answer DIFFERS between panes in the same tree — the only
    # shape that catches an accessor which resolved to "the last one" and happened to be right.
    # Rows 1 and 2's expected values are m46's own (`:317-321`, `:362-365` of the socket suite):
    # this file introduces no new production behaviour to check them against.
