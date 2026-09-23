<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/05, THE ONE THAT MATTERS MOST: a grid pane CONSTRUCTS A WEBSOCKET to
# the composed URL. Not "the tile rendered". Not "the mount resolved". A socket.
#
# WHY THIS IS THE MILESTONE'S MOST IMPORTANT CONTRACT (ARCHITECTURE bad cut 3 / TECH_DEBT 29,
# measured 2026-08-09). Milestone 46 shipped a control that opened NO SOCKET AT ALL, at both call
# sites, for both sources — past 537 green tests, a 71-mutant battery and five reviews. The whole
# defect was a closed loop inside the `.tsx`, and every suite walked past it because all three
# surface harnesses stub the control by module path: `export const TerminalControl = () => null;`
# (test/support/fleet-app-harness.mjs:32-35 is the shipped example). A stubbed control renders,
# resolves, composes, asserts green — and connects to nothing.
#
# THE SEAM, read at source.
#  - `test/support/terminal-control-harness.mjs` was built for exactly this. `withTerminalControl
#    ({ host, mount, origins }, fn)` (`:233`) bundles the REAL, UNMODIFIED
#    `ui/src/terminal/TerminalControl.tsx` (`:48`) with its real siblings, mounts it on mini-react
#    with HOST NODES ATTACHED TO REFS, installs a recording `WebSocket` (`:266`, class at
#    `:179-198`) and yields `sockets()` / `socket()` / `terminals()` / `paneHosts()` / `chip()` /
#    `bar()` / `buttonLabelled()` / `click()` / `unmount()` (`:316-357`).
#  - The production path it drives: `binding` is the ONE value both the effect and the render read
#    (TerminalControl.tsx:317-323); the session effect commits `bindSource()` (`:344`), creates
#    the pane element and the xterm (`:349-374`), and reaches `new WebSocket(url)` at `:391`.
#  - The URL is composed by `terminalSocketUrl(source, params, { origins })`
#    (ui/src/terminal/socket-url.mjs:85), which maps the SCHEME from the DIALLED origin through a
#    table with no default cell (`:51-56`), refuses a missing param by name (`:104-130`) and a
#    missing origin by role (`:132-142`), and returns `url` only on success (`:174-184`).
#  - `mirror` declares `path: "/ws/terminal-view"`, `params: ["nodeId","sessionId"]`,
#    `originRole: "fleet"` (ui/src/terminal/source-table.mjs:75-85), so the composed URL is
#    `ws://<fleet authority>/ws/terminal-view?nodeId=<n>&sessionId=<s>` — the exact string the m46
#    regression suite already pins for the two shipped call sites
#    (test/terminal-control-opens-its-socket.test.mjs:191, :221).
#  - Input: `term.onData` is registered ONLY when the policy enables it, and its handler is
#    `ws.send(input)` (TerminalControl.tsx:463-467) — so "a keystroke reaches the worker" is an
#    observable on the recording socket's own `sent` array.
#
# NOT ASSERTED HERE, each with an owner:
#  - which rows become tiles at all — task 00 of this story.
#  - what a pane with no producer does (it opens NO socket, and says `no live output`) — task 02.
#  - which tiles the cap subscribes — task 03 (and the arbiter itself is story 49/02).
#  - the posture literal, the fourth host's table and invariant 4's amendment — story 49/03.
#  - "the home wires no `onData`/`onKey`/`onBinary` of its own and sends on no socket of its own"
#    — invariant 4 part 3's new `ui/src/home/**` sweep (ARCHITECTURE ADR-008). Structural, not
#    behavioural: it belongs to the gate, not to a Then here.
#  - every PIXEL fact: that a tile's height does not move when its stream ends, that the letterbox
#    band is ≈0, that a glyph is legible. Those belong to the milestone's design-conformance
#    review against DESIGN's render targets — and that review has no task in this milestone's
#    break-down, which is raised as a QA finding at refine.
#
# THREE HARNESS TRAPS, NAMED SO THE BUILD DOES NOT DISCOVER THEM:
#  (a) THE ENTRY IS HARD-CODED. `CONTROL_TSX` (`:48`) is a module constant, so the grid-level
#      lanes below need the harness to take the ENTRY as an option. Extending it is in scope; what
#      is NOT in scope, ever, is adding `TerminalControl` to its stub set — that is the exact
#      defect this task exists to prevent, in the file built to prevent it.
#  (b) THE `chip()` ACCESSOR KEYS ON `aria-live="polite"` (`:333-336`), which is TODAY's per-pane
#      live region (ui/src/terminal/TerminalIdentity.tsx:117). Task 05 of this story REMOVES that
#      attribute in the grid host, so `chip()` will answer `null` for a grid pane. The fix is to
#      address the chip by its rendered word; "fix" it by leaving the per-pane region in place and
#      task 05 is silently undone.
#  (c) THE EXPAND CONTROL NEEDS A SHELL HOST. `hasShellHost()` is read once at mount
#      (TerminalControl.tsx:244) and gates `offersFullscreen` (`:739`); the bundle carries its OWN
#      copy of `shell-bus.mjs`, so a lane importing `ui/src/app/shell-bus.mjs` in the test process
#      registers on a DIFFERENT module instance and the expand control never renders. The harness
#      must expose the bundled bus (task 04 needs it too).
#
# ISOLATION: no store, no server, no port — the harness mounts in-process and its `WebSocket` is
# a stand-in that connects to nothing. Any lane that stands a store up takes a fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)`; `:4181`/`:4182` are held by live daemons, so no scenario binds a
# fixed port. Focused runs only, never the full suite. The suite is registered in
# `scripts/test.mjs` beside its siblings (import at `:658`, spread at `:2278`).
#
# WHAT THIS IS NOT: it is not a browser. No glyph is painted, no column is measured, no byte
# crosses a wire. It proves the one fact that was false on the running system and true in every
# suite — that a bindable pane reaches `new WebSocket(url)` at all.

@executable @ui @work @board
Feature: a grid pane opens a real socket — every subscribed tile constructs exactly one WebSocket, to the URL its own tuple and the page's own fleet origin compose, and a tile that is not addressable opens none
  In order that the grid is a screen of live terminals rather than a screen of terminal-shaped components, and so that milestone 46's dead-on-arrival control cannot ship a second time behind a stub
  each tile mounts the REAL control through the harness TECH_DEBT 29 built, and the assertion is the constructed socket, its URL and the pane host the xterm paints into — never that a component rendered

  Background:
    Given the REAL `ui/src/terminal/TerminalControl.tsx` is mounted through `withTerminalControl`, never a stub
    And the grid pane host is the milestone's FOURTH host, declared in `host-model.mjs` (story 49/03)
    And the mount is whatever `homeSessionMount(row)` returns for a real `MeshSession` row, handed as a BARE call with no spread
    And the page's origins are `{ self: "http://127.0.0.1:4181", fleet: "http://127.0.0.1:4181" }` — the terminals home IS the fleet origin, and both keys are supplied so a builder that fell back to `self` would still be caught elsewhere
    And "a socket" means an entry in the harness's own record of every `WebSocket` the component constructed

  # THE HEADLINE. Four observables, and the first one is the milestone.
  Scenario: a subscribed grid pane constructs exactly ONE socket, to the composed URL, and renders the host the xterm paints into
    Given a row `{ nodeId: "aof-wsl", sessionId: "7f3a91c", repo: "demo", workItem: { ref: "49/05", assignmentId: "a-1" } }`
    When the tile is mounted
    Then exactly one socket was constructed
    And its URL is exactly `ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c`
    And the pane host `absolute inset-0` is present in the rendered tree — its ABSENCE was the shipped defect's whole outside signature
    And exactly one xterm was constructed, and it was opened into a pane that host owns
    And the chip reads `connecting…` — a bound pane that is not yet connected, never `idle`
    And the byte area does NOT read `No session. Press Run agent on an item.`

  # THE URL IS COMPOSED FROM THE HANDED ORIGIN. No port literal, no page-protocol guess, no
  # fallback to `self` for a `fleet`-role source.
  Scenario Outline: the dialled URL follows the origin the surface was handed, scheme and authority both
    Given a row `{ nodeId: "aof-wsl", sessionId: "7f3a91c" }`
    And the page's origins are <the origins>
    When the tile is mounted
    Then <the sockets> constructed
    And <the URL rule>

    Examples:
      | case                          | the origins                                        | the sockets    | the URL rule                                                                        |
      | the fleet on this machine     | `{ self: F, fleet: F }` where F = `http://127.0.0.1:4181` | exactly one is | it is `ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c`        |
      | a TLS fleet                   | `{ self: H, fleet: H }` where H = `https://fleet.example`  | exactly one is | it is `wss://fleet.example/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c` — no port is invented |
      | a fleet on a named port       | `{ self: P, fleet: P }` where P = `http://fleet.example:8080` | exactly one is | the authority carries the port exactly as handed                                     |
      | NO FLEET ORIGIN AT ALL        | `{ self: "http://127.0.0.1:4181" }`                | NO socket is   | nothing is dialled: `mirror` resolves against `fleet` ALONE and no origin is guessed, defaulted or borrowed from `self` |
    # ROW 4 CANNOT ARISE ON THE HOME PAGE — it is served from the fleet origin, so `origins.fleet`
    # always resolves (ADR-002 / DG-49-10). It is here as the ANTI-FALLBACK proof: a builder that
    # quietly used `self` when `fleet` was absent would pass rows 1-3 and fail only in a browser,
    # which is the class of defect this repo has no harness to catch.
    # The scheme comes from the DIALLED origin and is mapped, never defaulted
    # (socket-url.mjs:51-56): `wss://` handed in is never downgraded to `ws://`.

  # N TILES, N SOCKETS, NO CROSS-TALK. The grid-level claim, and it needs the entry-parameterised
  # harness (trap (a) in the header).
  Scenario: a grid of three subscribed tiles holds three sockets, one per tuple
    Given three rows: `(aof-wsl, s-1)`, `(aof-wsl, s-2)` and `(win-host-a, s-9)`
    When the grid is mounted with the real control for every tile
    Then exactly three sockets were constructed
    And their URLs are exactly the three tuples' own, each carrying its own `nodeId` and its own `sessionId`
    And no URL carries another row's `sessionId`, and none is a node-only subscription
    And exactly three xterms were constructed, one per tile
    And the socket count equals the number of SUBSCRIBED tiles — never the number of rows

  # A HALF TUPLE OPENS NOTHING. "No URL" is the structural half of "no socket is opened", and the
  # refusal names which half was missing without naming a value it did not have.
  Scenario Outline: an unaddressable row dials nothing at all
    Given a row whose <what is wrong>
    When the tile is mounted
    Then NO socket was constructed
    And no xterm was constructed
    And the pane host `absolute inset-0` is absent from the tree
    And the pane is NOT the dashed `unavailable` block — this surface produces none (DG-49-10)

    Examples:
      | case                         | what is wrong                                  |
      | no session id                | `sessionId` is absent                          |
      | an empty session id          | `sessionId` is `""`                            |
      | a malformed session id       | `sessionId` is `42`                            |
      | no node                      | `nodeId` is absent                             |
      | neither half                 | both are absent                                |
    # A missing param and a MALFORMED one are different causes and the builder names the true one
    # (socket-url.mjs:99-130) — reporting a present-but-wrong value as "missing" sends the caller
    # looking for something that is sitting right there.

  # THE RAMP, DRIVEN THROUGH THE MOUNTED COMPONENT. The socket's own events must move the pane,
  # or every transport fact would land on a state that holds no socket and be discarded.
  Scenario: the socket's events move the pane along the ramp — connecting → waiting → streaming → ended
    Given a subscribed tile whose socket has been constructed
    When the socket opens
    Then the chip reads `waiting for output` and the byte area's top-left line reads `connected · waiting for first output`
    And NO resize control frame was sent up it — a `mirror` is a `scale` source and declares none
    When a byte arrives
    Then the chip reads `streaming` and exactly those bytes were written into the xterm
    When the far end closes the socket
    Then the chip reads `stream ended` and the non-live bar carries it, announced by the surface's ONE live region
    # AMENDED at build, 2026-08-13 (PO), on the architect's F6. This read "…carries it in a
    # `role="status"` region". `role="status"` IS an implicit polite live region — so on a grid of
    # twelve tiles this clause and task 05's headline ("exactly ONE live region") are unsatisfiable
    # together, and measurement proved it: 1 `aria-live` node **and 3 `role="status"` nodes** on three
    # ended tiles, i.e. four regions where the story promises one. The suite could not see it because
    # its clause counted only `props["aria-live"]`.
    # THE INTENT OF BOTH CLAUSES IS THE SAME — the bar announces — and it survives: the bar still
    # RENDERS ITS WORDS on every host, and on the grid the grid-level region does the announcing. Only
    # the per-tile region goes, and only where `hostAnnouncesState(host)` says the host does not
    # announce for itself. The board dock and the fleet card keep their own bar role, asserted.
    And that bar renders INSIDE the byte area's own box, as a sibling of the pane — so the tile's height is not a function of whether a stream has ended
    # The mirror lane's end-of-stream IS a transport close by explicit design
    # (source-table.mjs:123-128): it carries opaque bytes both ways and speaks no control envelope,
    # so a `{"type":"exit"}` arriving on it is BYTES and is painted, never parsed.
    # The PIXEL half of the height claim — that a grid row's tiles do not move when one of them
    # ends — is the design review's measurement, never a number pinned here.

  # INTERACTIVE IN FACT — the observable ARCHITECTURE names as belonging in a feature: "a
  # keystroke into a worker's pane reaches it".
  Scenario: an interactive grid pane registers exactly one keystroke sink and a keystroke reaches the socket
    Given a subscribed tile for a `producer-known` row, mounted interactive
    When the socket opens and a keystroke is delivered to the terminal
    Then the xterm was constructed with `disableStdin: false` and a BLINKING BLOCK cursor
    And exactly one keystroke sink is registered on that terminal
    And the keystroke appears on the socket's sent frames, verbatim, as raw input — never wrapped in a JSON envelope
    And nothing else was sent up that socket

  # THE CONTRAST, so the clause above proves a DIFFERENCE rather than a constant. Same control,
  # same source, same harness — the only thing that differs is the MOUNT's posture.
  Scenario: the shipped fleet card peek, mounted through the same harness, registers no sink at all
    Given the fleet card's own `fleetTerminalMount(...)` mounted at the fleet-card host, with the same origins
    When the operator presses `Watch terminal →` and the socket opens
    Then exactly one socket was constructed, to the same tuple-bound route
    And the xterm was constructed with `disableStdin: true`
    And NO keystroke sink is registered on it — not one registered and ignored
    And the grid pane above and this peek differ in exactly one declared thing: the posture their mount names
    # A half-disabled widget that swallows keystrokes silently is a worse lie than no terminal
    # (ui/src/terminal/input-policy.mjs:20-30), and `canInput` is a CAPABILITY of the source, never
    # a permission (`source-table.mjs:25-28`): `mirror.canInput` is TRUE on both of these.

  # GEOMETRY: the pane is driven to the worker's own screen and scaled. A tile that re-fits would
  # re-wrap a TUI painted with absolute cursor addressing for 80 columns.
  Scenario: the tile's terminal is 80×24 and never sends a resize frame
    Given a subscribed tile whose socket is open and streaming
    Then the terminal was resized to exactly 80 columns and 24 rows
    And no frame containing `"type":"resize"` was ever sent up that socket
    And the same is true after the tile's box changes size — a `scale` source has no emitter at all, so there is no path to send one down
    # 80×24 is a PAIR with the worker's own `ptySpawn` and is held across the build boundary by
    # `acd-terminal-mirror-geometry-pinned`; here we assert only what the mounted pane does.

  # TEARDOWN. N panes means N sockets to leak.
  Scenario: unmounting a tile closes its socket and disposes its terminal, and a grid leaves nothing behind
    Given a grid of three subscribed tiles, each holding an open socket and a painted terminal
    When one tile is unmounted
    Then that tile's socket is closed and its xterm is disposed
    And the other two tiles' sockets are still open and their terminals still hold their scrollback
    When the whole grid is unmounted
    Then zero sockets remain open and zero xterms remain undisposed

  # NON-VACUITY. If every mount opened a socket, every assertion above would be a tautology.
  Scenario Outline: the same harness, driven at a pane that must open nothing, opens nothing
    Given <the pane>
    When the tile is mounted
    Then NO socket was constructed
    And no xterm was constructed

    Examples:
      | case                      | the pane                                                              |
      | over the cap              | a tile the cap left unsubscribed — it is listed and at rest (task 03)  |
      | nothing will ever feed it | a `no-producer` row — the socket is refused on purpose (task 02)       |
      | no owner to name          | a mount whose `rendersPanel` is false — the V1 answer (task 00)        |
    # These three are the proof that "a socket was constructed" is an assertion that can FAIL. A
    # detector only ever shown to stay quiet is one mutation from asserting nothing.

  # THE STUB CLAUSE, stated as a scenario because it is the whole reason this task exists.
  Scenario: the evidence is a socket the REAL component constructed, and a stubbed control cannot produce it
    Given the suite's mount goes through the bundled `ui/src/terminal/TerminalControl.tsx`
    Then `TerminalControl` is not in the harness's stub set, by module path or by any other spelling
    And the only substitutions are the environment a browser would provide: `@xterm/*`, `react`, `react-dom`'s `createPortal`, `lucide-react`, and a DOM with a recording `WebSocket`
    And every claim in this feature is read off that recorded socket, that recorded terminal or the rendered tree — never off component source, and never off "the component was rendered"
