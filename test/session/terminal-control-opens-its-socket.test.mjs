// THE ONE TERMINAL CONTROL, MOUNTED FOR REAL, OPENING A REAL SOCKET (milestone 46 — the
// regression suite for the BLOCKER found on the running system, 2026-08-09).
//
// ═══ THE DEFECT THIS SUITE EXISTS TO CATCH ═══════════════════════════════════════════════════
// The control rendered correctly and never opened a socket, at both call sites, for both
// sources. A closed loop, entirely inside the `.tsx`:
//
//   state = idle → the descriptor's pane treatment is `empty-host` → the byte area renders the
//   centred `<p>` INSTEAD of the pane host div that carries the ref → `inlineRef.current` is
//   null → the session effect early-returns → no socket is ever created → `setState(bindSource())`
//   (the ONE line that moves the ramp off `idle`) never runs → the state stays `idle` ↺
//
// Measured on the live system by QA: zero `Network.webSocketCreated` for the control over 21s
// against a harness control proving CDP sees sockets the page opens; no `.xterm` node ever
// mounted; the pane host `div.absolute.inset-0` had count 0; board dock `local-pty`, board dock
// `mirror` and the fleet card peek `mirror` all stayed `idle` forever, headless AND headful. The
// server half was healthy throughout — dialling the board's `/ws/terminal` by hand opened in
// 11ms and streamed first bytes at 150ms.
//
// ═══ WHY 537 GREEN TESTS SAID NOTHING ════════════════════════════════════════════════════════
// All three surface harnesses stub this component out by module path
// (`export const TerminalControl = () => null;` in board-app-harness.mjs:42,
// fleet-app-harness.mjs:32, shell-app-harness.mjs:124), and every other suite in the milestone
// drives the framework-free `.mjs` model. NOTHING rendered the real component and asserted a
// socket — so the whole defect lived in the one place the milestone's own ADR-001 says is
// untestable here, and a 71-mutant battery and two structural reviews walked past it.
//
// That gap is what this suite closes, and it is closed at the LOWEST LEVEL THAT GENUINELY BITES:
// `test/support/terminal-control-harness.mjs` bundles the REAL, UNMODIFIED
// `ui/src/terminal/TerminalControl.tsx` with its real siblings and mounts it on mini-react with
// HOST NODES ATTACHED TO REFS (the harness capability whose absence made this untestable — see
// mini-react.mjs's `createRuntime({ hostNode })`). The assertion is the OBSERVABLE — a WebSocket
// was constructed, to the URL the origins compose, and the pane host exists — never an internal.
//
// IT IS NOT A BROWSER AND DOES NOT REPLACE THE `@manual` EVIDENCE. No glyph is painted, no column
// is measured, no byte crosses a wire; 46/04's `@manual` browser scenarios still own those. What
// this proves is exactly the fact that was false on the running system and true in every suite:
// a bindable mount reaches `new WebSocket(url)` at all.
//
// ═══ WHAT THE FIX WAS ════════════════════════════════════════════════════════════════════════
// The entry state is DERIVED FROM BINDABILITY rather than assumed to be `idle`
// (`terminalEntryState` in state-ramp.mjs). `idle` means what DESIGN's own copy says it means —
// *"No session. Press Run agent on an item."* — so a session that IS bound but not yet connected
// is `connecting`, which is `emptyByDefinition` and therefore yields `bytes` + the top-left line:
// the host div renders, the effect runs, `bindSource()` proceeds. The negative lanes below are
// the other half of that claim and are not optional: an unbound dock is STILL `idle`, still shows
// the centred line, and still opens nothing.
//
// ISOLATION: run focused, with `AOF_GLOBAL_HOME=$(mktemp -d)`. Never the full suite.
import assert from "node:assert/strict";

import { withTerminalControl } from "../support/terminal-control-harness.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { fleetTerminalMount } from "../../ui/src/fleet/terminal-mount.mjs";
import { HOST_BOARD_DOCK, HOST_FLEET_CARD, WATCH_LABEL } from "../../ui/src/terminal/host-model.mjs";
import {
  applyTerminalEvent,
  bindSource,
  describeTerminalState,
  initialTerminalState,
  terminalEntryState,
  terminalStateUnavailable,
  IDLE_PANE_LINE,
  PANE_BYTES,
  PANE_EMPTY_HOST,
  TERMINAL_EVENTS,
  TERMINAL_STATES,
  UNAVAILABLE_CAUSES,
  WAITING_PANE_LINE,
} from "../../ui/src/terminal/state-ramp.mjs";

// An EPHEMERAL board origin, as production has, and the fleet's fixed one.
const BOARD_ORIGIN = "http://127.0.0.1:41773";
const FLEET_ORIGIN = "http://127.0.0.1:4181";
const ORIGINS = { self: BOARD_ORIGIN, fleet: FLEET_ORIGIN };

export const terminalControlOpensItsSocketTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE DERIVATION ITSELF, at the model. These live here rather than in 46/03's core suite
  // because that suite's header maps one-to-one onto its `.feature`'s scenarios and the contract
  // is locked; `terminalEntryState` is this fix's, so its lanes are this fix's too.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "terminal-entry-state/46 a BINDABLE pane enters on `connecting`, and an unbindable one is still `idle` — the entry state is derived, never assumed",
    run: () => {
      assert.equal(terminalEntryState(initialTerminalState(), { bindable: true }).state, TERMINAL_STATES.CONNECTING);
      assert.deepEqual(terminalEntryState(initialTerminalState(), { bindable: true }), bindSource(), "…and it is the SAME value binding produces, not a second spelling of it");
      assert.equal(terminalEntryState(initialTerminalState(), { bindable: false }).state, TERMINAL_STATES.IDLE);
      // No options at all is the honest default: a caller that says nothing about bindability has
      // not asserted that anything is bound.
      assert.equal(terminalEntryState(initialTerminalState()).state, TERMINAL_STATES.IDLE);
    },
  },

  {
    name: "terminal-entry-state/46 an OBSERVED state outranks the derivation — bindability speaks only for `idle`, and never revives a pane that ended or failed",
    run: () => {
      const observed = [
        bindSource(),
        applyTerminalEvent(bindSource(), TERMINAL_EVENTS.SOCKET_OPEN),
        applyTerminalEvent(bindSource(), TERMINAL_EVENTS.BYTES),
        applyTerminalEvent(bindSource(), { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: 0 }),
        applyTerminalEvent(bindSource(), TERMINAL_EVENTS.TRANSPORT_FAILURE),
        terminalStateUnavailable({ cause: UNAVAILABLE_CAUSES.NO_FLEET_ORIGIN }),
      ];
      for (const value of observed) {
        assert.deepEqual(
          terminalEntryState(value, { bindable: true }),
          value,
          `${value.state} is a fact the pane OBSERVED — a still-bindable ended pane must not read as connecting again`,
        );
      }
    },
  },

  {
    name: "terminal-entry-state/46 the derived entry state is what makes the pane HOST render — `idle` yields the empty-host line, `connecting` yields the byte pane (and, since design GAP G5, an EMPTY one)",
    run: () => {
      // This is the whole mechanism of the blocker, as two descriptors: the pane treatment is
      // what decides whether the host div (and therefore the ref, and therefore the socket)
      // exists at all.
      const idle = describeTerminalState(terminalEntryState(initialTerminalState(), { bindable: false }), { owner: "46/01" });
      assert.equal(idle.pane, PANE_EMPTY_HOST);
      assert.equal(idle.paneLine, IDLE_PANE_LINE);
      assert.equal(idle.showsTopLeftLine, false);

      const bound = describeTerminalState(terminalEntryState(initialTerminalState(), { bindable: true }), { owner: "46/01" });
      assert.equal(bound.pane, PANE_BYTES, "a bound pane renders the byte area's HOST — the element the xterm is opened into");
      // THE PANE TREATMENT IS THE BLOCKER'S MECHANISM; THE LINE IS NOT, AND CONFLATING THEM IS HOW
      // THIS LANE CAME TO ASSERT A DESIGN GAP. It read `showsTopLeftLine === true` here, which was
      // true of the code and wrong of the design: DESIGN §S1 fixes `connecting` as "C2 empty", and
      // the line it was painting was its own chip word echoed back (design GAP G5, ruled by
      // `aof-designer` 2026-08-09 against a real render). `waiting` is the state that earns a line,
      // because its line says what the chip cannot — the socket IS open and the far end is silent.
      assert.equal(bound.showsTopLeftLine, false, "`connecting` renders the HOST but no line — C2 is empty, and a line there would only echo the chip");
      const waiting = describeTerminalState(applyTerminalEvent(bindSource(initialTerminalState()), TERMINAL_EVENTS.SOCKET_OPEN), { owner: "46/01" });
      assert.equal(waiting.pane, PANE_BYTES, "…and `waiting` still renders the host");
      assert.equal(waiting.showsTopLeftLine, true, "…and IS the state that carries a top-left line (non-vacuous: the assertion above is not true of every empty pane)");
      assert.equal(waiting.paneLine, WAITING_PANE_LINE, "…whose copy is the one thing the chip does not say");
      assert.equal(bound.text, "connecting…");
      assert.notEqual(bound.paneLine, IDLE_PANE_LINE, "…and it never tells an operator to press a button they have already pressed");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE THREE CALL SITES QA MEASURED DEAD, one lane each. Each asserts the same three
  // observables: a socket was constructed, its URL is the one the origins compose, and the pane
  // host the xterm paints into exists in the rendered tree.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "terminal-control/46 the board dock on its own PTY opens exactly ONE socket, to the board's own origin, and renders the pane host (BLOCKER 2026-08-09: it opened none)",
    run: async () => {
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" }),
          origins: ORIGINS,
        },
        (app) => {
          assert.equal(app.sockets().length, 1, "the control constructed exactly one WebSocket for a bindable mount");
          // The URL is composed from the origins the surface was HANDED — the provider half of
          // the tuple completed by the control's own picker, which is the seam that owns it.
          assert.equal(app.socket().url, "ws://127.0.0.1:41773/ws/terminal?ref=46%2F01&provider=claude");
          // …and the pane host exists: the div the byte area renders ONLY for a `bytes` pane and
          // the element the xterm is opened into. Its absence WAS the defect, from the outside.
          assert.equal(app.paneHosts().length, 1, "the pane host `absolute inset-0` is in the tree");
          assert.equal(app.terminals().length, 1, "…and exactly one xterm was constructed");
          assert.equal(app.terminal().host?.parentElement?.tagName, "DIV", "…and opened into a pane the byte-area host owns");
          // The state the operator is shown while that socket is opening is `connecting…`, not a
          // sentence telling them to press a button they have already pressed.
          assert.equal(app.chip(), "connecting…");
          assert.ok(!app.paneText().includes(IDLE_PANE_LINE), `the dock no longer claims "${IDLE_PANE_LINE}" for a session it has bound`);
        },
      );
    },
  },

  {
    name: "terminal-control/46 the board dock mirroring a worker opens ONE socket to the FLEET origin's tuple-bound route",
    run: async () => {
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          mount: boardDockMount({ kind: "mirror", ref: "46/01", nodeId: "aof-wsl", sessionId: "7f3a91c" }),
          origins: ORIGINS,
        },
        (app) => {
          assert.equal(app.sockets().length, 1);
          // The `mirror` source declares `originRole: fleet`, so it dials the FLEET origin from a
          // page the BOARD served — the cross-origin case, composed from the handed fact.
          assert.equal(app.socket().url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c");
          assert.equal(app.paneHosts().length, 1);
          assert.equal(app.chip(), "connecting…");
        },
      );
    },
  },

  {
    name: "terminal-control/46 the fleet card peek opens ONE socket when the operator presses `Watch terminal →` — and none before",
    run: async () => {
      await withTerminalControl(
        {
          host: HOST_FLEET_CARD,
          mount: fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "46/01" }),
          // The fleet page IS the fleet origin: both keys are the same value, which is exactly
          // why they are both supplied — a builder falling back to `self` would pass here.
          origins: { self: FLEET_ORIGIN, fleet: FLEET_ORIGIN },
        },
        (app) => {
          // The card rests CLOSED: its subscription costs a socket, so nothing is opened until
          // the worded toggle asks for one.
          assert.equal(app.sockets().length, 0, "a card at rest holds no socket");
          assert.equal(app.paneHosts().length, 0, "…and renders no byte area at all");

          const watch = app.buttonLabelled(WATCH_LABEL);
          assert.ok(watch != null, `the card offers its worded toggle (${WATCH_LABEL})`);
          app.click(watch);

          assert.equal(app.sockets().length, 1, "pressing Watch opens exactly one socket");
          assert.equal(app.socket().url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c");
          assert.equal(app.paneHosts().length, 1);
          // READ-ONLY IN FACT survives the fix: stdin is disabled at construction and NO input
          // sink is registered — not one registered and ignored.
          assert.equal(app.terminal().options.disableStdin, true);
          assert.equal(app.terminal().dataHandler, null, "a read-only mount registers no `onData` handler at all");
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE RAMP, DRIVEN THROUGH THE REAL COMPONENT. The entry state is only half the claim: the
  // component must also COMMIT it, or every transport event would land on a state that holds no
  // socket and be discarded by the ramp's own `holdsSocket` guard — a second, quieter deadlock.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "terminal-control/46 the socket's own events move the mounted control along the ramp — connecting → waiting → streaming → ended",
    run: async () => {
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" }),
          origins: ORIGINS,
        },
        (app) => {
          assert.equal(app.chip(), "connecting…");

          // The socket opens. The far end has said nothing yet, and the pane says exactly that —
          // the honest cold start, top-left inside the byte area, never a spinner-forever.
          app.socket().accept();
          app.render();
          assert.equal(app.chip(), "waiting for output");
          assert.ok(app.paneText().includes(WAITING_PANE_LINE), `the pane reads "${WAITING_PANE_LINE}"`);
          // …and the on-open resize frame the board's PTY route accepts really was sent up it.
          assert.ok(
            app.socket().sent.some((frame) => typeof frame === "string" && frame.includes(`"type":"resize"`)),
            `the control sent its resize control frame on open (sent: ${JSON.stringify(app.socket().sent)})`,
          );

          // A byte arrives.
          app.socket().deliver("hello from the pty\r\n");
          app.render();
          assert.equal(app.chip(), "streaming");
          assert.deepEqual(app.terminal().written, ["hello from the pty\r\n"], "the bytes were written into the xterm");

          // The frozen m03/ADR-003 envelope, read on a lane that carries control frames.
          app.socket().deliver(JSON.stringify({ type: "exit", exitCode: 0 }));
          app.render();
          assert.equal(app.chip(), "exited (0)");
          assert.equal(app.bar(), "exited (0)", "a pane holding the operator's last output line gets the opaque in-flow bar");
        },
      );
    },
  },

  {
    name: "terminal-control/46 a socket that never connects becomes `error` with its cause — and the dock's Restart re-spawns, opening a SECOND socket",
    run: async () => {
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" }),
          origins: ORIGINS,
        },
        (app) => {
          // The other edge of the entry point: `connecting` → `error`, an origin we HAVE and
          // cannot connect to. Never `unavailable`, which is a statement about the origin.
          app.socket().fail();
          app.render();
          assert.equal(app.chip(), "error");
          assert.equal(app.bar(), "disconnected — the stream dropped", "the retired fleet WORD survives as the mandatory cause line");

          // RESTART is a deliberate re-spawn, offered because this host owns the spawn. It bumps
          // the run token, which is a different session — so a second socket is exactly right.
          const restart = app.button("Restart session");
          assert.ok(restart != null, "the dock offers Restart on a failed session it spawned");
          app.click(restart);
          assert.equal(app.sockets().length, 2, "a re-spawn opens ONE new socket");
          assert.equal(app.chip(), "connecting…");
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE OTHER HALF OF THE FIX, and it is not optional: `idle` must still MEAN `idle`. A fix that
  // made every pane bindable would pass every lane above and quietly delete the one state DESIGN
  // gives its own copy to.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "terminal-control/46 a dock with NOTHING bound is still `idle`: the centred empty line, no pane host, and no socket at all",
    run: async () => {
      await withTerminalControl(
        { host: HOST_BOARD_DOCK, mount: boardDockMount(null), origins: ORIGINS },
        (app) => {
          assert.equal(app.sockets().length, 0, "nothing is bound, so nothing is dialled");
          assert.equal(app.terminals().length, 0, "…and no xterm is constructed");
          assert.equal(app.paneHosts().length, 0, "…and the byte area holds the centred line, not the pane host");
          assert.equal(app.chip(), "idle");
          assert.ok(app.paneText().includes(IDLE_PANE_LINE), `the byte area reads "${IDLE_PANE_LINE}"`);
        },
      );
    },
  },

  {
    name: "terminal-control/46 an `unavailable` mount opens no socket — the state is entered BEFORE any socket exists, and the pane names its cause and its recovery",
    run: async () => {
      const bound = boardDockMount({ kind: "mirror", ref: "46/01", nodeId: "aof-wsl", sessionId: "7f3a91c" });
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          // DG-46-3: the state has no production producer in m46, so the mount's own fixture
          // field is the path — the same one `terminal-unavailable-pane` drives at the model.
          mount: { ...bound, unavailable: { cause: UNAVAILABLE_CAUSES.NO_FLEET_ORIGIN } },
          origins: ORIGINS,
        },
        (app) => {
          assert.equal(app.sockets().length, 0, "nothing is coming, so nothing is opened");
          assert.equal(app.paneHosts().length, 0, "there is no dimmed terminal underneath — there IS no terminal");
          assert.equal(app.chip(), "unavailable");
          const text = app.paneText();
          assert.ok(text.includes("no fleet origin"), `the pane names its cause (${text})`);
          assert.ok(text.includes("aof mesh ui"), "…and the command that fixes it");
        },
      );
    },
  },

  {
    name: "terminal-control/46 a mount whose fleet origin was never handed over opens no socket and is `unavailable`, not a dead `idle` pane",
    run: async () => {
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          mount: boardDockMount({ kind: "mirror", ref: "46/01", nodeId: "aof-wsl", sessionId: "7f3a91c" }),
          // The board started standalone: it was handed its own origin and no fleet.
          origins: { self: BOARD_ORIGIN },
        },
        (app) => {
          assert.equal(app.sockets().length, 0);
          assert.equal(app.chip(), "unavailable");
          assert.ok(app.paneText().includes("no fleet origin"));
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // COLLAPSING MUST NOT TEAR THE SESSION DOWN — the rule the milestone made structural, now read
  // back through the MOUNTED component rather than through the identity string alone.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "terminal-control/46 collapsing the dock keeps the ONE socket and the ONE xterm — the byte area is hidden, never unmounted",
    run: async () => {
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" }),
          origins: ORIGINS,
        },
        (app) => {
          app.socket().accept();
          app.render();
          app.socket().deliver("first line\r\n");
          app.render();
          const socket = app.socket();
          const terminal = app.terminal();

          app.click(app.button("Collapse terminal dock"));
          assert.equal(app.sockets().length, 1, "collapsing opened no second socket");
          assert.equal(socket.closed, false, "…and closed the one that was open");
          assert.equal(terminal.disposed, false, "…and disposed no xterm");
          assert.equal(app.paneHosts().length, 1, "the byte area is HIDDEN, not unmounted");

          app.click(app.button("Expand terminal dock"));
          assert.equal(app.sockets().length, 1, "expanding re-subscribed nothing");
          assert.deepEqual(terminal.written, ["first line\r\n"], "…and the scrollback is the same terminal's");
          assert.equal(app.chip(), "streaming");
        },
      );
    },
  },

  {
    name: "terminal-control/46 unmounting closes the socket and disposes the xterm — zero of both are left behind",
    run: async () => {
      let socket = null;
      let terminal = null;
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" }),
          origins: ORIGINS,
        },
        (app) => {
          socket = app.socket();
          terminal = app.terminal();
          app.unmount();
        },
      );
      assert.equal(socket.closed, true, "the session effect's cleanup closed the socket");
      assert.equal(terminal.disposed, true, "…and disposed the xterm");
    },
  },
];
