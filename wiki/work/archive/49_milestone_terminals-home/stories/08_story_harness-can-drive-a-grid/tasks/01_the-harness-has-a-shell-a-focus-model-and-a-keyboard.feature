<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/08, THE ENVIRONMENT: a shell that is really there, an `activeElement`
# that really moves, keystrokes and clicks that really arrive at the handlers the components
# attached, and host refs that really bind in the app-level harness too.
#
# WHY EACH OF THESE IS A BLOCKER RATHER THAN A CONVENIENCE. The developer's feasibility pass found
# that six of story 05's eight blockers are harness capability. Task 00 of this story closes the
# arity; this task closes the other four, and each one turns a whole family of `Then`s from
# unreachable into observable:
#  - NO SHELL → `offersFullscreen` is false in every harness lane, so the expand control never
#    renders and EVERY expand/present/dismiss scenario in the milestone is unreachable
#    (FEASIBILITY §2(h)). Worse than unreachable: the assertions become `null` checks that pass
#    for the wrong reason.
#  - NO FOCUS MODEL → `05/04`'s `Enter`-to-present, `Escape` and roving traversal cannot be driven.
#  - NO KEY OR EVENT DELIVERY → the same, plus every "clicking X does NOT do Y" clause, which is a
#    claim about PROPAGATION and cannot be made by calling a prop.
#  - NO HOST NODES IN `withMountedApp` → refs never bind, the control's session effect
#    early-returns, and no socket can ever be constructed through the app-level lane.
#
# ═══ THE SEAM, READ AT SOURCE (verified 2026-08-13 against this working tree) ═══════════════════
#
# THE SHELL DOOR, and it is one flag behind four conjuncts.
#  - `let shellPresent = false;` is MODULE STATE (ui/src/app/shell-bus.mjs:56), set only by
#    `declareShellPresent()` (`:68-70`) and read by `hasShellHost()` (`:72-74`). The module also
#    exports `attachFullscreenHost(handler)` (`:140-145`), `requestFullscreen(request)` (`:176-181`)
#    and a test-only `resetShellBus()` (`:115-119`).
#  - The control imports BOTH names from that module (ui/src/terminal/TerminalControl.tsx:61) and
#    reads the flag ONCE at first render: `const [shellHosted] = useState(hasShellHost);` (`:244`).
#  - The gate is a FOUR-WAY CONJUNCTION:
#    `offersFullscreen={declaresAffordance(host, AFFORDANCE_FULLSCREEN) && shellHosted && subscribed && mount.bound}`
#    (`:739`). Every conjunct is independently observable on a shipped host, which is what makes
#    the Outline below a real table rather than one row and three guesses.
#  - The expand control is a `<button ref={openerRef} … aria-label="Expand terminal to full screen">`
#    (ui/src/terminal/TerminalControls.tsx:73-80), dispatching `act(AFFORDANCE_FULLSCREEN)` (`:75`).
#  - The present effect fires on `expanded && subscribed && fullscreenHost != null`
#    (TerminalControl.tsx:625), builds `terminalFullscreenRequest({…})` (`:626`) and calls
#    `requestFullscreen(request)` (`:641`). `fullscreenHost` is a real `document.createElement("div")`
#    held in state (`:219-226`), so the harness's DOM stand-in already supplies it.
#  - The request's own fields are exactly `{ id, label, node, home, opener, claimsEscape,
#    ownsChrome, onLayout, onDismiss }` (ui/src/terminal/fullscreen-request.mjs:66-81), with
#    `id = terminal:<sessionKey>` (`:43-46`) and `claimsEscape = model.inputEnabled` (`:76`).
#  - THE BUNDLE CARRIES ITS OWN COPY. `withTerminalControl` esbuild-bundles the control with its
#    real siblings (`terminal-control-harness.mjs:234`), so the `shell-bus.mjs` inside that bundle
#    is a DIFFERENT module instance from the one a lane imports in the test process. Declaring the
#    shell present on the test process's copy changes nothing the mounted control can see.
#
# THE FOCUS MODEL, and there is none.
#  - The DOM stand-in's `focus()` is `focus() {}` — a literal no-op (terminal-control-harness.mjs:165),
#    on nodes built by `createNode` (`:129-169`). Its `documentStub` (`:121-127`) has
#    `createElement`, `addEventListener`, `removeEventListener`, `querySelector`, `querySelectorAll`
#    and nothing else: **there is no `activeElement` anywhere in this harness.**
#  - `addEventListener() {}` / `removeEventListener() {}` on every node (`:163-164`) are no-ops too,
#    and no node has a `dispatchEvent` at all. Nothing can be delivered to anything.
#  - The ONLY driver is `click: (node) => { node?.props?.onClick?.({ stopPropagation() {},
#    preventDefault() {} }); return render(); }` (`:345-348`) — it invokes ONE prop on ONE node
#    directly. It does not bubble, so `stopPropagation()` is handed in as a no-op that nothing
#    consults, and "a click on the header control does NOT also do X" is not expressible.
#  - The app-level harness has the shape but not the substance: `react-app-harness.mjs`'s
#    `documentStub` declares `activeElement: null` (`:296`) and NOTHING EVER ASSIGNS IT, and its
#    `press(key, init)` (`:540-552`) dispatches only at the DOCUMENT, to document-scoped listeners.
#
# THE REFS THAT DO NOT BIND.
#  - `withMountedApp` builds its renderer as `const renderer = createRuntime();` — with NO
#    `hostNode` (react-app-harness.mjs:144). **NOTE: the milestone's own documents cite this as
#    `:143`; it is `:144` in this tree — the tree carries uncommitted m47/m48 work and this anchor
#    has already moved once. Cite by value.**
#  - `createRuntime({ hostNode })` is OPT-IN BY DESIGN and the reason is written down
#    (mini-react.mjs:167-186): a stand-in node answers only the DOM calls its caller declares, and
#    "every existing harness mounts surfaces that pass refs they never dereference — a default-on
#    factory would hand those surfaces an object where they expect `null` and change what they do,
#    in suites this change has no business touching." So the capability is added as an OPT-IN, or
#    this task breaks the suites it exists to protect.
#  - It is already proved to work: `terminal-control-harness.mjs:244` passes `hostNode` and
#    `test/terminal-control-opens-its-socket.test.mjs` is the suite that needed it.
#
# THE STUB, AND WHAT MAY AND MAY NOT CHANGE ABOUT IT.
#  - All three surface harnesses stub the control by module path, every one
#    `export const TerminalControl = () => null;` behind `/(^|\/)TerminalControl$/`:
#    `fleet-app-harness.mjs:32,35`; `board-app-harness.mjs:42,60`; `shell-app-harness.mjs:33-34,127,133`.
#  - Those filters EXIST FOR A GOOD REASON — the control alone pulls `@xterm/*`, which wants a real
#    DOM — and the suites that rely on them are not this story's to change. This task makes the
#    stub **opt-out for the terminal control where a test asks for the real one** and changes
#    NOTHING for the suites that do not ask.
#
# THE KNOWN ANSWERS THIS IS PROVED AGAINST (the binding PO ruling — never prove the harness against
# the grid, always against behaviour that is already true and already shipped):
#  - THE SHELL DOOR: the four conjuncts of `TerminalControl.tsx:739` against the shipped host
#    table — `board-dock` declares `AFFORDANCE_FULLSCREEN` (host-model.mjs:102) and so does
#    `fleet-card` (`:116`), while `fullscreen` declares it `notDeclared("it is already fullscreen")`
#    (`:127`). In production every route mounts inside the shell, so "the dock offers expand" is
#    shipped behaviour that no suite in this repo has ever been able to see.
#  - THE KEYBOARD: `TerminalDragHandle` is a `role="separator"`, `tabIndex={0}`,
#    `aria-label="Resize terminal dock"`, `aria-valuenow={value}` element (TerminalDragHandle.tsx:55-61)
#    whose `onKeyDown` (`:83-91`) moves the dock by `DRAG_KEY_STEP = 16` (`:35`) on `ArrowUp` /
#    `ArrowDown`, calls `preventDefault()` for exactly those two keys and RETURNS for every other.
#    It is rendered only where the host declares drag-resize (TerminalControl.tsx:765;
#    `board-dock` declares it at host-model.mjs:100, `fleet-card` refuses it at `:114`). Its source
#    names DESIGN §Accessibility 8 as its reason: "a separator only a pointer can move is a control
#    a keyboard user cannot reach." **It is shipped, it is keyboard-operable, and this repo has
#    never once observed it working**, because there is no focus and no key delivery. That makes it
#    the perfect known answer for this task: focus, dispatch, `preventDefault` and a rendered
#    observable, in one shipped loop, with no grid anywhere near it.
#
# NOT ASSERTED HERE, each with an owner:
#  - the arity, the caller-supplied entry and the per-pane accessors — task 00 of THIS story.
#  - the grid's roving tabstop, which key moves focus where, `Enter`-to-present, the `opener`
#    being the tile, and the new present-time focus field — story 49/05 task 04. This file proves
#    only that a key ARRIVES at the handler that was attached; what any component decides to do
#    with it is that component's contract, not the harness's.
#  - the fourth host and its affordance table — story 49/03. Every lane below drives a SHIPPED
#    host on purpose.
#  - what a screen reader says, what a person can read, and every pixel — the milestone's
#    design-conformance review (`05/06`) and DG-49-5/DG-49-7's `@uat` passes.
#  - the automated a11y lane. This workspace's `.aof/aof.config.json` declares `work.tags.domains`
#    with no `a11y` entry and no `work.ui` block, so the opt-in axe-core lane is OFF: **there is no
#    axe-core run in this story and no a11y finding will come from one.** Absence of the opt-in is
#    the decision, not an oversight.
#
# ═══ TRAPS, NAMED SO THE BUILD DOES NOT DISCOVER THEM ═══════════════════════════════════════════
#  (a) THE WRONG MODULE INSTANCE. A lane that imports `ui/src/app/shell-bus.mjs` and calls
#      `declareShellPresent()` sets the flag on the TEST PROCESS's copy. The mounted control reads
#      the BUNDLE's copy. Both calls "succeed"; only one is observable. Scenario 3 pins the
#      difference, because a builder who takes the easy path gets a green `declareShellPresent()`
#      and an expand control that still never renders — and will look for the bug in the control.
#  (b) THE FLAG IS MODULE STATE AND THE FLAG IS STICKY. `shellPresent` is never reset except by
#      `resetShellBus()` (shell-bus.mjs:115-119). If a lane's bundle instance is ever reused across
#      lanes, one lane declaring a shell silently declares it for the next — and the "no shell"
#      rows below would pass for the wrong reason. Scenario 4 pins it.
#  (c) `declareShellPresent()` MUST GAIN NO `ui/src` CALL SITE.
#      `test/arch/acd-shell-bus-single-host.test.mjs` asserts it is called EXACTLY ONCE across the
#      whole `ui/src` tree, at module scope, from `ui/src/app/Shell.tsx:74` and nowhere else — and
#      it scans the ui tree only, so a call from `test/` is out of its scope and a call from
#      `ui/src/` is a CI failure. The harness reaches the bundled export; it does not add a
#      declarer to the product.
#  (d) `focus()` AND `activeElement` ARE TWO HALVES OF ONE FACT. A `focus()` that records "I was
#      called" without moving a document-level `activeElement` satisfies a naive test and cannot
#      express "focus MOVED from a to b", which is the only assertion `05/04` actually needs.
#  (e) A DIRECT PROP CALL IS NOT AN EVENT. Adding `keyDown(node, key)` in the shape of today's
#      `click` (`:345-348`) would deliver keys the same way clicks are delivered — one prop, one
#      node, no propagation — and every "…does NOT also…" clause in `05/04` would be unwritable.
#      Propagation and `stopPropagation()` are pinned as observables below for that reason.
#  (f) MAKING `hostNode` DEFAULT-ON IN `withMountedApp` IS THE TEMPTING ONE-LINE FIX AND IT IS
#      FORBIDDEN by mini-react's own documented reason (`:178-181`). Opt-in, or the fleet, board
#      and shell suites change behaviour underneath this milestone.
#  (g) EVERY NEW GLOBAL JOINS THE `INSTALLED` LIST BY NAME (terminal-control-harness.mjs:250-260,
#      restored by the walk at `:362-365`). The runner is one sequential process; a leaked
#      `document` or a leaked `activeElement` changes an unrelated suite far from its cause.
#
# ISOLATION: no store, no server, no port — everything here is in-process, and the harness's
# `WebSocket` is a stand-in that connects to nothing. Any lane that stands a store up takes a fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)` (the repo's guard hook requires it); `:4181`/`:4182` are held by
# live daemons, so no scenario binds a fixed port. Focused runs only, never the full suite.
#
# REGISTRATION, AND THE COLLISION IS EXPECTED RATHER THAN DISCOVERED: any new suite is registered
# in `scripts/test.mjs` (import beside `:658`, spread beside `:2278`) and checked by
# `test/arch/acd-test-suite-registration.test.mjs`. Stories 02, 03, 05 and 06 of this milestone
# each register a suite in that same file (FEASIBILITY §5.1) — with this story that is five
# stories editing one file, and both it and the arch gate are DIRTY in this tree. Serialise the
# edit; never `git stash`, `git reset --hard` or `git checkout --` a dirty file.
#
# WHAT THIS IS NOT: it is not a browser. No glyph is painted, no column is measured, no focus ring
# is seen. `activeElement` here is a value the harness maintains honestly; whether a person can
# SEE where focus is remains DG-49-5's `@uat` row.

@executable @ui @work @validate
Feature: the harness has a shell, a focus model and a keyboard — the bundled `shell-bus` is genuinely present so the fullscreen door opens, `focus()` moves a live `activeElement`, keys and clicks arrive at the handlers components actually attached, and host refs bind in the app-level harness too
  In order that milestone 49's expand, focus and keyboard contracts can be evaluated against a running component instead of being deferred, stubbed or asserted as `null` checks that pass for the wrong reason
  the harness declares the shell on the BUNDLE the control reads, maintains a real `activeElement` that `focus()` moves, delivers keyboard and pointer events that propagate and can be stopped, and offers host nodes to `withMountedApp` as an opt-in that changes nothing for the suites that do not ask

  Background:
    Given the REAL, UNMODIFIED `ui/src/terminal/TerminalControl.tsx` and its real siblings are what get bundled — never a stub
    And every lane drives a SHIPPED host (`board-dock`, `fleet-card` or `fullscreen`) with a shipped mount builder, because those are the ones whose correct answers are already known
    And "the shell is declared" means the flag was set on the module instance INSIDE the bundle the mounted control reads, never on a copy imported in the test process
    And no scenario in this file asserts anything about the terminals home, its rows, its states, its cap or its focus order — this story adds no product code

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 1 · THE SHELL DOOR. Four conjuncts, each varied on its own, all against shipped hosts.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario Outline: the expand control appears exactly when all four of the shipped gate's conjuncts hold
    Given the shell is <shell> on the bundle the control reads
    And a control mounted at the <host> host with <the mount>, in state <the state>
    When the rendered tree is read
    Then a button whose accessible name is `Expand terminal to full screen` is <present>
    And the conjunct that decides it is <the deciding conjunct>

    Examples:
      | case                              | shell        | host        | the mount                        | the state          | present | the deciding conjunct                          |
      | the shipped dock, in a shell      | declared     | board-dock  | a bound `boardDockMount(...)`    | subscribed         | PRESENT | all four hold                                  |
      | today's ONLY reachable answer     | NOT declared | board-dock  | a bound `boardDockMount(...)`    | subscribed         | ABSENT  | `shellHosted` is false                         |
      | nothing bound                     | declared     | board-dock  | `boardDockMount(null)`           | subscribed         | ABSENT  | `mount.bound` is false                         |
      | the card at rest                  | declared     | fleet-card  | a bound `fleetTerminalMount(...)`| NOT subscribed     | ABSENT  | `subscribed` is false                          |
      | the card, watching                | declared     | fleet-card  | a bound `fleetTerminalMount(...)`| subscribed via `Watch terminal →` | PRESENT | all four hold                     |
      | the host that is already there    | declared     | fullscreen  | a bound mount                    | subscribed         | ABSENT  | the host declares the affordance OFF           |
    # ROW 2 IS THE STATE OF THE WORLD TODAY and it is the only row today's harness can produce —
    # which is precisely why every expand scenario in this milestone is currently unreachable, and
    # why an assertion written against today's harness would read `null` and pass.
    # ROWS 3, 4 AND 6 ARE WHAT STOP THE FIX BEING "force the button on". A harness that declared
    # the shell and also made the control render its expand control unconditionally would pass
    # rows 1, 2 and 5 and fail these three. Each varies exactly ONE conjunct of
    # `TerminalControl.tsx:739`; none of them is a new product rule, and every expected value is
    # read straight off the shipped host table.

  Scenario: presenting through the bundled bus hands the lane the real request, and costs a layout change and nothing else
    Given the shell is declared on the bundle, and the lane is attached to the bundled bus's fullscreen host
    And a bound, subscribed `board-dock` control that is streaming, holding exactly one socket and one xterm with painted scrollback
    When the `Expand terminal to full screen` button is pressed
    Then the lane received exactly ONE present request
    And its `id` is `terminal:` followed by that pane's own session key
    And its `node` is the live element the control created for the presentation, not a React element
    And its `ownsChrome` is true and its `claimsEscape` equals that mount's own `inputEnabled`
    And the number of constructed sockets is unchanged and the number of constructed xterms is unchanged
    And the xterm's written scrollback is unchanged
    # ALL OF THIS IS SHIPPED m46 BEHAVIOUR (`TerminalControl.tsx:625-646`,
    # `fullscreen-request.mjs:66-81`) that no suite has ever been able to observe, because the
    # button that starts it has never rendered in a harness. `05/04` needs to count present
    # requests, read their ids and prove nothing was rebuilt — none of which is expressible until a
    # lane can be handed one. The unchanged socket/xterm/scrollback clauses are the same
    # `COST_LAYOUT` claim m46 already makes about collapse, asserted here about present.

  Scenario: declaring the shell on the test process's own copy of the module changes nothing the mounted control can see
    Given a lane imports `ui/src/app/shell-bus.mjs` directly and calls `declareShellPresent()` on it
    When a bound, subscribed `board-dock` control is mounted
    Then no `Expand terminal to full screen` button is in the rendered tree
    And `hasShellHost()` read from that same directly-imported module answers true — the call did happen, on the wrong instance
    When the shell is instead declared on the bundle the control reads
    Then the `Expand terminal to full screen` button IS in the rendered tree
    # THE TWO HALVES ARE THE POINT. A builder who takes the obvious path gets a call that succeeds,
    # a flag that reads true, and a control that still offers nothing — and will go looking for the
    # defect inside `TerminalControl.tsx`. This scenario makes the module-instance boundary an
    # asserted fact rather than a comment someone might read.

  Scenario: the shell flag does not leak from one lane to the next
    Given one lane declares the shell present and mounts a bound, subscribed `board-dock` control
    When a SECOND lane in the same process mounts the same host and mount WITHOUT declaring a shell
    Then the second lane's tree carries no `Expand terminal to full screen` button
    And the order the two lanes run in does not change either answer
    # `shellPresent` is module state (shell-bus.mjs:56) with a test-only reset (`:115-119`), and
    # the bundle SOURCE is cached across lanes (react-app-harness.mjs:73-82). A "no shell" row that
    # passes only because it ran first is a row that will start passing for the wrong reason the
    # day someone reorders a suite.

  Scenario: no declarer is added to the product tree
    Given the whole `ui/src` tree, with comments stripped
    Then `declareShellPresent(` is called exactly once in it, at module scope, from `ui/src/app/Shell.tsx`
    And nothing under `ui/src/` gained a call to it in the diff that lands this task
    And the harness reaches the declaration through the BUNDLED module, from `test/`
    # `test/arch/acd-shell-bus-single-host.test.mjs` scans the ui tree only, so a `test/` caller is
    # out of its scope by construction and a `ui/src/` caller is a CI failure. The flag means "a
    # shell exists in this bundle"; only the module that renders the shell root may assert it.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 2 · THE FOCUS MODEL. A live `activeElement` that `focus()` moves — both halves of one fact.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario Outline: `focus()` moves a document-level `activeElement`, and the previous holder loses it
    Given a mounted tree with focusable elements A and B
    And <the starting point>
    When <the act>
    Then the document's `activeElement` is <the holder>
    And <the other observable>

    Examples:
      | case                       | the starting point           | the act                       | the holder    | the other observable                                          |
      | nothing focused yet        | nothing has been focused     | the tree is read              | NOT A and NOT B | no element of the mounted tree holds focus by default        |
      | focus lands                | nothing has been focused     | `focus()` is called on A      | A             | B does not hold focus                                         |
      | focus MOVES                | A holds focus                | `focus()` is called on B      | B             | A no longer holds focus — this is the assertion `05/04` needs |
      | re-focusing is idempotent  | A holds focus                | `focus()` is called on A again| A             | nothing else changed in the tree                              |
      | the holder leaves the tree | A holds focus                | the element A is removed by a re-render | NOT A | `activeElement` does not point at an element the renderer no longer renders |
    # EVERY ROW IS RED TODAY AND THE REASON IS ONE LINE: `focus() {}`
    # (terminal-control-harness.mjs:165) is a literal no-op, and there is no `activeElement`
    # anywhere in the harness's `documentStub` (`:121-127`). The app-level harness declares the
    # field and never assigns it (react-app-harness.mjs:296).
    # ROW 3 IS WHY "focus() records that it was called" IS NOT AN ACCEPTABLE IMPLEMENTATION: a
    # recorder satisfies rows 2 and 4 and cannot express row 3 at all.
    # ROW 5 MATCHES THE RENDERER'S EXISTING DISCIPLINE — mini-react already detaches a departed
    # host element's ref rather than leaving it dangling (`mini-react.mjs:395-401`); focus follows
    # the same rule for the same reason.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 3 · THE KEYBOARD. Driven at a shipped handler with a shipped, rendered observable.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario Outline: keys reach the shipped drag separator's own handler, and it responds exactly as it ships
    Given a bound, subscribed, uncollapsed `board-dock` control, whose separator is at a height with at least one step of headroom in both directions
    And the separator — `role="separator"`, `aria-label="Resize terminal dock"` — holds focus
    When <the key> is pressed
    Then the separator's `aria-valuenow` <the value>
    And `preventDefault()` <the default>

    Examples:
      | case                   | the key    | the value                                  | the default        |
      | grow the dock          | ArrowUp    | is exactly 16 greater than before          | was called         |
      | shrink the dock        | ArrowDown  | is exactly 16 less than before             | was called         |
      | a key it does not own  | Enter      | is unchanged                               | was NOT called     |
      | another it does not own| Escape     | is unchanged                               | was NOT called     |
      | a printable character  | a          | is unchanged                               | was NOT called     |
    # THIS IS THE KNOWN ANSWER FOR THE KEYBOARD, and it is deliberately not a grid. The handler is
    # shipped (`TerminalDragHandle.tsx:83-91`), the step is a shipped constant
    # (`DRAG_KEY_STEP = 16`, `:35`), the observable is a shipped rendered attribute
    # (`aria-valuenow={value}`, `:59`), and the component's source names DESIGN §Accessibility 8 as
    # its reason for existing. **It has shipped keyboard-operable and this repo has never once
    # observed it working**, because there is no focus and no key delivery. If the harness cannot
    # make these five rows green against a control nobody is changing, no keyboard claim in
    # `05/04` can be believed.
    # ROWS 3-5 ARE THE NON-VACUITY HALF: the handler returns without calling `preventDefault()` for
    # every key that is not an arrow (`:89`), so a harness that reported "handled" for everything —
    # or a `preventDefault` that nothing records — fails here and passes rows 1-2.

  Scenario: a key goes to the focused element, and to nothing else
    Given a mounted tree with two independently focusable elements, each carrying its own key handler
    And the first holds focus
    When a key is pressed
    Then the first element's handler received an event whose `key` is exactly the pressed key
    And the second element's handler received nothing
    When focus moves to the second element and the same key is pressed again
    Then the second element's handler received it and the first received nothing further
    # "PRESS A KEY" MUST BE ROUTED BY FOCUS RATHER THAN ADDRESSED BY NODE, or `05/04`'s whole model
    # — one roving stop, keys going to whatever holds it — is being asserted by the test rather
    # than by the component.

  Scenario Outline: an event dispatched at a descendant reaches its ancestors, and a handler can stop it
    Given a mounted tree where an ancestor and a descendant each carry a <handler kind> handler
    When the event is dispatched at the descendant and <what the descendant does>
    Then the descendant's handler ran
    And the ancestor's handler <the ancestor>

    Examples:
      | case                    | handler kind | what the descendant does      | the ancestor       |
      | it bubbles              | click        | its handler does nothing else | ALSO ran           |
      | it can be stopped       | click        | its handler calls `stopPropagation()` | did NOT run |
      | keys bubble too         | keydown      | its handler does nothing else | ALSO ran           |
      | and can be stopped too  | keydown      | its handler calls `stopPropagation()` | did NOT run |
    # PROPAGATION IS A CAPABILITY, NOT A DETAIL, and today it does not exist: `click(node)` invokes
    # ONE prop on ONE node (`terminal-control-harness.mjs:345-348`) and hands in a
    # `stopPropagation()` that is a no-op nothing consults. Every "…does NOT also…" clause in
    # `05/04` — "clicking the header's own controls does NOT present the pane", "a click into the
    # byte area DOES" — is a claim about which handlers a single gesture reaches. A harness that
    # calls props directly can assert the first half of each of those and never the second, which
    # is the shape of a test that agrees with whatever the code does.

  Scenario: the existing direct-invocation driver keeps working for the suites that use it
    Given the two shipping suites that call `click(node)` on a button they located by accessible name
    When those calls run against the extended harness
    Then each one still reaches that button's own handler and still settles the tree
    And the diff that lands this task changes neither `test/terminal-control-opens-its-socket.test.mjs` nor `test/terminal-control-header-yield.test.mjs`
    And all 13 lanes of the first and all 9 lanes of the second are green
    # Making clicks real events must not make the existing call sites wrong. A button clicked
    # through a bubbling dispatch still runs its own `onClick` first — the m46 socket suite's own
    # `click` call sites (`:218`, `:298`, `:391`, `:397`) are the check.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 4 · REFS THAT BIND IN THE APP-LEVEL HARNESS — as an OPT-IN, because the alternative is banned.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario: a surface mounted through `withMountedApp` can be given host nodes, and then its refs bind
    Given a surface mounted through `withMountedApp` WITH the host-node option asked for
    And that surface passes a `ref` to a host element and guards an effect on `ref.current`
    Then `ref.current` is a node rather than `null` at the moment that effect runs
    And the guarded effect ran rather than early-returning
    And a host element that leaves the tree has its ref set back to `null`
    # `createRuntime()` at `react-app-harness.mjs:144` takes NO `hostNode` today — so `useRef`
    # hands back a `{ current }` nothing ever assigns, and `if (!ref.current) return;` early-returns
    # for the whole life of the mount. That is the exact guard the terminal control opens its
    # WebSocket behind. **The milestone's documents cite this line as `:143`; it is `:144` here.**

  Scenario: a caller that does NOT ask for host nodes gets exactly today's behaviour
    Given a surface mounted through `withMountedApp` WITHOUT the host-node option
    Then its refs behave exactly as they do today — a `{ current }` the renderer does not assign
    And every suite that mounts through `withMountedApp` without asking passes unedited
    And the diff that lands this task adds no call site that asks for host nodes on behalf of a suite that did not
    # mini-react says why in terms (`:178-181`): "a default-on factory would hand those surfaces an
    # object where they expect `null` and change what they do, in suites this change has no
    # business touching." The fleet, board and shell suites are exactly those surfaces, three of
    # their harness files are DIRTY in this tree, and story 49/04 has to move ~50 references
    # through them. Opt-in is not caution here; it is the difference between this story helping
    # milestone 49 and destabilising it.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 5 · THE STUB BECOMES OPT-OUT, AND NOTHING ELSE ABOUT IT MOVES.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario: a surface suite that asks for the real terminal control gets one that opens a socket
    Given a surface harness lane that opts OUT of the `TerminalControl` module-path stub
    When the surface is mounted with a bound, subscribed terminal in it, and host nodes asked for
    Then the real control is in the tree — the pane host `absolute inset-0` is present
    And exactly one socket was constructed
    When the SAME lane runs without opting out
    Then no pane host is present and NO socket was constructed
    # THE TWO HALVES IN ONE SCENARIO ARE THE PROOF, because one half alone is satisfiable by
    # accident: the second half is what the stub does today and the first is what it must be able
    # to do on request. One flag, one surface, one measured difference.

  Scenario: every suite that relies on the stub is unaffected
    Given the three surface harnesses' `/(^|\/)TerminalControl$/` filters
    Then each still stubs the control BY DEFAULT, for every caller that does not opt out
    And `export const TerminalControl = () => null;` is still what a defaulting caller gets
    And the suites driving `fleet-app-harness.mjs`, `board-app-harness.mjs` and `shell-app-harness.mjs` pass with no change to their expectations
    # The filters exist for a measured reason — the control alone pulls `@xterm/*`, which wants a
    # real DOM. This story makes stubbing opt-OUT; it does not make it optional-by-default, and it
    # removes nothing.

  Scenario: `TerminalControl` never enters the stub set of the harness built to prevent exactly that
    Given `test/support/terminal-control-harness.mjs`'s `CONTROL_STUBS` and `CONTROL_RESOLVE`
    Then no key and no `filter` in either matches `TerminalControl`, by module path or by any other spelling
    And no option this task adds — a shell handle, a focus model, a key driver, a host-node factory — can be used to substitute it
    And the substitutions remain exactly the environment a browser would provide
    # RESTATED HERE AS WELL AS IN TASK 00 BECAUSE THE TWO TASKS OPEN DIFFERENT DOORS INTO THE SAME
    # ROOM, and story 49/05's socket proof dies quietly the day either one is left open. Milestone
    # 46 shipped a control that opened no socket at all past 537 green tests and five reviews for
    # precisely this reason.

  # ═════════════════════════════════════════════════════════════════════════════════════════════
  # 6 · WHAT THE HARNESS LEAVES BEHIND.
  # ═════════════════════════════════════════════════════════════════════════════════════════════

  Scenario: every global this task installs is named in the restore list and is really restored
    Given a lane that declared a shell, focused an element, dispatched keys and mounted host nodes
    When the lane ends
    Then every global the harness installed by name is restored to the value it held before it
    And a lane running immediately afterwards observes `typeof document === "undefined"` again
    And that following lane observes no `activeElement`, no declared shell and no attached fullscreen host
    # The `INSTALLED` list (`:250-260`) is a straight walk restored at `:362-365`, and its own
    # comment says why: the real runner is a single sequential process, so a leaked global changes
    # what an unrelated suite does, far from the cause. Anything this task installs joins that list
    # by name, or the leak is invisible until something else fails for no reason.
