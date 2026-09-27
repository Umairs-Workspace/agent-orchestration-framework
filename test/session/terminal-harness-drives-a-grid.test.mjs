// THE HARNESS MOUNTS A GRID (milestone 49 / story 08 / task 00).
//
// ═══ WHAT THIS SUITE IS ABOUT, AND WHAT IT IS DELIBERATELY NOT ═══════════════════════════════
// It is about the ARITY OF A MOUNT and nothing else. `withTerminalControl` mounted exactly ONE
// control from a hard-coded entry, and four of story 49/05's seven contracts need a tree with
// more than one control in it before their first `Then` can be evaluated at all — three
// subscribed tiles holding three sockets, twenty rows under a cap of sixteen, twelve tiles,
// "exactly one node in the whole rendered tree carries `aria-live`". None of them is reachable
// through a harness that mounts one.
//
// NOTHING HERE ASSERTS A TERMINALS-HOME BEHAVIOUR. No row becomes a pane, no cap is applied, no
// sort is claimed, no state word is invented. This story adds no product code, and every value
// below is either milestone 46's own or a count of what the harness built.
//
// ═══ THE BINDING PO RULING: PROVE THE HARNESS AGAINST A KNOWN ANSWER, NEVER AGAINST THE GRID ══
// The trap this story exists inside is building the harness and the grid together so each excuses
// the other's failures — a red assertion is "the grid isn't finished" on Monday and "the harness
// can't see it yet" on Tuesday, and nothing is ever wrong. So the new N-capable path is driven
// first at behaviour that is ALREADY TRUE AND ALREADY ASSERTED: the shipping board dock and the
// shipping fleet card, which `test/session/terminal-control-opens-its-socket.test.mjs` pins exhaustively.
// **If the entry-parameterised path cannot reproduce m46's own passing assertions at N=1, it is
// not ready to be believed at N=12.** Lanes `grid/01` and `grid/02` are that proof, and they are
// first deliberately. Every value in them is copied from that suite rather than invented beside
// it, and the copy is the point.
//
// ISOLATION: no store, no server, no port. The harness mounts in-process and its `WebSocket` is a
// stand-in that connects to nothing. Run focused, with `AOF_GLOBAL_HOME=$(mktemp -d)`; never the
// full suite (`test/store/global-work-propagation.test.mjs` binds `:4182`, held by the live daemon).
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  withTerminalControl,
  CONTROL_STUBS,
  CONTROL_RESOLVE,
  CONTROL_TSX,
  findAll,
} from "../support/terminal-control-harness.mjs";
import { bundleCacheKey, bundleSurface } from "../support/react-app-harness.mjs";
import { TERMINAL_CONTROL_STUB } from "../support/terminal-dom.mjs";
import { terminalControlOpensItsSocketTests } from "./terminal-control-opens-its-socket.test.mjs";
import { terminalControlHeaderYieldTests } from "./terminal-control-header-yield.test.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { fleetTerminalMount } from "../../ui/src/fleet/terminal-mount.mjs";
import { HOST_BOARD_DOCK, HOST_FLEET_CARD, WATCH_LABEL } from "../../ui/src/terminal/host-model.mjs";
import { IDLE_PANE_LINE } from "../../ui/src/terminal/state-ramp.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GRID_ENTRY = path.join(repoRoot, "test", "support", "terminal-grid-entry.tsx");
const FOCUS_ENTRY = path.join(repoRoot, "test", "support", "terminal-focus-entry.tsx");

// An EPHEMERAL board origin, as production has, and the fleet's fixed one — m46's own values.
const BOARD_ORIGIN = "http://127.0.0.1:41773";
const FLEET_ORIGIN = "http://127.0.0.1:4181";
const ORIGINS = { self: BOARD_ORIGIN, fleet: FLEET_ORIGIN };

// A bindable board-dock pane, one per index, distinguishable by its own session id — which is
// what makes "the driver answered about the THIRD pane" an assertion rather than a coincidence.
const mirrorPane = (key, sessionId, extra = {}) => ({
  key,
  host: HOST_BOARD_DOCK,
  mount: boardDockMount({ kind: "mirror", ref: "49/08", nodeId: "aof-wsl", sessionId }),
  origins: ORIGINS,
  ...extra,
});
const unboundPane = (key) => ({ key, host: HOST_BOARD_DOCK, mount: boardDockMount(null), origins: ORIGINS });

const gridOf = (panes) => ({ entry: GRID_ENTRY, exportName: "TerminalGrid", props: { panes } });
// The second entry, and it declares in terms that it mounts NO terminal — which is what costs it
// the pane driver. `terminals: false` is not a convenience: it is the other half of the entry
// guard, so a fixture that renders whatever it likes cannot be counted as panes.
const focusFixtureOptions = { entry: FOCUS_ENTRY, exportName: "FocusFixture", terminals: false };

// The two shipping consumers of this harness, read as SOURCE. The regression bar is not only
// "they still pass" — it is that they were not rewritten around a new signature to make N work,
// which is the cheapest way to break the promise this story makes to every existing lane.
const SHIPPING_CONSUMERS = [
  "test/session/terminal-control-opens-its-socket.test.mjs",
  "test/session/terminal-control-header-yield.test.mjs",
];
const sourceOf = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

export const terminalHarnessDrivesAGridTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 1 · THE KNOWN ANSWER. The N-capable path at N=1, against values milestone 46 already pins.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "grid/01 the ENTRY-PARAMETERISED path, at N=1, reproduces milestone 46's board-dock assertions value for value — the same socket, the same URL, the same pane host, the same xterm, the same chip",
    run: async () => {
      await withTerminalControl(
        gridOf([
          {
            key: "dock",
            host: HOST_BOARD_DOCK,
            mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" }),
            origins: ORIGINS,
          },
        ]),
        (app) => {
          // EVERY ONE OF THESE SIX IS `terminal-control-opens-its-socket.test.mjs`'s OWN VALUE,
          // re-derived through a path that did not exist. They are not new claims.
          assert.equal(app.sockets().length, 1, "the control constructed exactly one WebSocket for a bindable mount");
          assert.equal(app.socket().url, "ws://127.0.0.1:41773/ws/terminal?ref=46%2F01&provider=claude");
          assert.equal(app.paneHosts().length, 1, "the pane host `absolute inset-0` is in the tree");
          assert.equal(app.terminals().length, 1, "…and exactly one xterm was constructed");
          assert.equal(app.terminal().host?.parentElement?.tagName, "DIV", "…and opened into a pane the byte-area host owns");
          assert.equal(app.chip(), "connecting…");
          assert.ok(!app.paneText().includes(IDLE_PANE_LINE), `the dock no longer claims "${IDLE_PANE_LINE}" for a session it has bound`);

          // …and the PER-PANE driver answers the same six about the only pane there is, which is
          // what makes the accessors below comparable with the singular ones at all.
          const pane = app.pane(0);
          assert.equal(pane.sockets().length, 1);
          assert.equal(pane.socket().url, "ws://127.0.0.1:41773/ws/terminal?ref=46%2F01&provider=claude");
          assert.equal(pane.paneHosts().length, 1);
          assert.equal(pane.terminals().length, 1);
          assert.equal(pane.chip(), "connecting…");
          assert.equal(app.paneCount(), 1, "one entry, one control, one pane");
        },
      );
    },
  },

  {
    name: "grid/02 the same path, at N=1, reproduces the fleet card's REST STATE and its read-only construction — a card at rest holds neither socket nor pane, and `Watch terminal →` opens exactly one",
    run: async () => {
      await withTerminalControl(
        gridOf([
          {
            key: "card",
            host: HOST_FLEET_CARD,
            mount: fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "46/01" }),
            // The fleet page IS the fleet origin: both keys are the same value, which is exactly
            // why they are both supplied — a builder falling back to `self` would pass here.
            origins: { self: FLEET_ORIGIN, fleet: FLEET_ORIGIN },
          },
        ]),
        (app) => {
          // THE ABSENCE IS ASSERTED FIRST, and that is why this lane is here beside the one
          // above: an extension that made every mount dial would pass `grid/01` and fail this.
          assert.equal(app.sockets().length, 0, "a card at rest holds no socket");
          assert.equal(app.paneHosts().length, 0, "…and renders no byte area at all");
          assert.equal(app.pane(0).sockets().length, 0);
          assert.equal(app.pane(0).paneHosts().length, 0);

          const watch = app.pane(0).buttonLabelled(WATCH_LABEL);
          assert.ok(watch != null, `the card offers its worded toggle (${WATCH_LABEL})`);
          app.click(watch);

          assert.equal(app.sockets().length, 1, "pressing Watch opens exactly one socket");
          assert.equal(app.socket().url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c");
          assert.equal(app.paneHosts().length, 1, "…and the byte area's pane host is now in the tree");
          assert.equal(app.pane(0).paneHosts().length, 1);
          assert.equal(app.pane(0).socket().url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c");
          assert.equal(app.terminal().options.disableStdin, true);
          assert.equal(app.terminal().dataHandler, null, "a read-only mount registers no `onData` handler at all");
          assert.equal(app.pane(0).terminal().dataHandler, null, "…and the per-pane accessor says the same");
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 2 · THE HEADLINE. N controls in one tree, each addressable on its own.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "grid/03 three controls mount in one tree and the driver addresses the THIRD, not `the last one constructed` — and an index that was never mounted FAILS LOUDLY",
    run: async () => {
      await withTerminalControl(
        gridOf([
          mirrorPane("p0", "s-1"),
          mirrorPane("p1", "s-2"),
          {
            key: "p2",
            host: HOST_BOARD_DOCK,
            mount: boardDockMount({ kind: "mirror", ref: "49/08", nodeId: "win-host-a", sessionId: "s-9" }),
            origins: ORIGINS,
          },
        ]),
        (app) => {
          assert.equal(app.paneCount(), 3);
          assert.equal(app.sockets().length, 3, "three bindable panes, three sockets");
          assert.equal(app.terminals().length, 3, "…and three xterms");

          const [a, b, c] = app.panes();
          // "ABOUT THE THIRD PANE" IS THE WHOLE DELIVERABLE.
          assert.ok(c.socket().url.includes("sessionId=s-9"), `index 2 answers about ITS session (${c.socket().url})`);
          assert.ok(!c.socket().url.includes("sessionId=s-1"));
          assert.ok(!c.socket().url.includes("sessionId=s-2"));
          assert.ok(a.socket().url.includes("sessionId=s-1"), `index 0 answers about ITS session (${a.socket().url})`);
          assert.ok(b.socket().url.includes("sessionId=s-2"));
          assert.ok(c.socket().url.includes("nodeId=win-host-a"), "…and about its own node, not its neighbours'");

          // No accessor returns a neighbour's anything.
          const distinct = (name, values) =>
            assert.equal(new Set(values).size, 3, `${name}: each pane answers with its own, never a neighbour's`);
          distinct("socket", [a.socket(), b.socket(), c.socket()]);
          distinct("terminal", [a.terminal(), b.terminal(), c.terminal()]);
          distinct("paneHost", [a.paneHost(), b.paneHost(), c.paneHost()]);
          distinct("pane-host node", [a.paneHost().hostNode, b.paneHost().hostNode, c.paneHost().hostNode]);
          distinct("section", [a.section, b.section, c.section]);
          for (const pane of [a, b, c]) {
            assert.equal(pane.sockets().length, 1, `pane ${pane.index} holds exactly its own one socket`);
            assert.equal(pane.terminals().length, 1);
            assert.equal(pane.paneHosts().length, 1);
            assert.equal(pane.chip(), "connecting…");
          }

          assert.throws(
            () => app.pane(3),
            /no pane at index 3/,
            "a per-pane accessor asked for an index that was never mounted FAILS rather than answering about a neighbour",
          );
          assert.throws(() => app.pane(-1), /no pane at index -1/);
        },
      );
    },
  },

  {
    name: "grid/04 the arity scales to every count story 49/05's contracts actually ask for — 1, 2, 3, 12, 20-of-which-16-are-fed, and 20 fed by nothing",
    run: async () => {
      // ROW 6 IS THE NON-VACUITY ROW: twenty mounted panes and ZERO sockets proves the socket
      // count is a MEASUREMENT OF THE TREE rather than a count of the mounts. A harness that
      // returned `panes` for both would pass rows 1-5.
      const rows = [
        { case: "the shipping arity, unchanged", panes: 1, bindable: 1, last: 0 },
        { case: "the smallest case that can cross-talk", panes: 2, bindable: 2, last: 1 },
        { case: "05/01's three sockets", panes: 3, bindable: 3, last: 2 },
        { case: "05/04 and 05/05's twelve", panes: 12, bindable: 12, last: 11 },
        { case: "05/03's twenty, sixteen of them fed", panes: 20, bindable: 16, last: 19 },
        { case: "twenty, none of them fed", panes: 20, bindable: 0, last: 19 },
      ];
      const passesByRow = [];
      for (const row of rows) {
        // WHICH panes are bindable is the CALLER's fixture, decided here. No rule about a cap is
        // claimed, implied or exercised — that is story 49/05 task 03 and appears nowhere here.
        const panes = Array.from({ length: row.panes }, (_, index) =>
          index < row.bindable ? mirrorPane(`p${index}`, `s-${index}`) : unboundPane(`p${index}`),
        );
        await withTerminalControl(gridOf(panes), (app) => {
          assert.equal(app.paneCount(), row.panes, `${row.case}: ${row.panes} controls are addressable by index`);
          assert.equal(app.pane(row.last).index, row.last, `${row.case}: index ${row.last} is the final one`);
          assert.throws(() => app.pane(row.panes), /no pane at index/, `${row.case}: and there is no pane past it`);
          assert.equal(app.sockets().length, row.bindable, `${row.case}: exactly ${row.bindable} sockets`);
          assert.equal(app.terminals().length, row.bindable, `${row.case}: exactly ${row.bindable} xterms`);
          assert.equal(app.paneHosts().length, row.bindable, `${row.case}: exactly ${row.bindable} pane hosts`);
          // …and each bindable pane holds exactly ITS one socket, which is what makes the totals
          // above a statement about attribution rather than about a running total.
          for (let index = 0; index < row.panes; index += 1) {
            assert.equal(app.pane(index).sockets().length, index < row.bindable ? 1 : 0, `${row.case}: pane ${index}`);
          }
          // EVERY SOCKET LANDED ON A PANE. The per-pane counts above partition the total only if
          // nothing fell outside them — and the failure mode this closes is not a socket going
          // MISSING, it is a socket being ADOPTED by whichever pane opened the last xterm, which
          // leaves every count looking plausible and one of them wrong.
          assert.deepEqual(app.unattributedSockets(), [], `${row.case}: no socket landed outside a pane`);
          passesByRow.push([row.case, app.settlePasses(), app.settleBound()]);
        });
      }

      // THE SETTLE BOUND IS A THEN, NOT A FOOTNOTE, and the assertion is the VALUE rather than the
      // inequality: `settlePasses() < settleBound()` cannot fail if the reporter under-reports or
      // if someone raises the bound, which is exactly what trap (e) warns about ("a bound raised
      // without measurement hides a genuine render loop"). The real claim is that a pass renders
      // the WHOLE tree, so twenty controls settle in the SAME number of passes as one — what
      // scales is the work inside a pass, not the count of them.
      const counts = passesByRow.map(([, passes]) => passes);
      assert.ok(counts[0] >= 1, `the settle is a real measurement, not a constant zero (measured: ${JSON.stringify(passesByRow)})`);
      assert.deepEqual(
        counts,
        counts.map(() => counts[0]),
        `the settle count does NOT grow with the pane count — 1 pane and 20 panes take the same number of passes (measured: ${JSON.stringify(passesByRow)})`,
      );
      assert.equal(passesByRow[0][2], 50, "…and the bound is still 50, so this measurement was taken against the bound it is meant to justify");
    },
  },

  {
    name: "grid/04b an UNATTRIBUTABLE socket is loud rather than adopted by a neighbour — a socket built outside the session effect's one synchronous body lands NOWHERE, and no pane's count moves",
    run: async () => {
      // THE PAIRING IS SOUND ONLY INSIDE THAT BODY. The control appends the xterm's host into the
      // pane it holds a ref to, constructs the `Terminal`, calls `term.open(pane)`, and only then
      // reaches `new WebSocket(url)` — so at construction time "the terminal most recently opened"
      // is this socket's. The day a socket is built anywhere else (an async effect, a reconnect
      // timer, a pooled subscription in the cap arbiter) that sentence stops being true, and the
      // socket used to land on whichever pane opened the last xterm — a NEIGHBOUR's plausible,
      // wrong answer rather than no answer at all.
      await withTerminalControl(
        gridOf([mirrorPane("p0", "s-1"), mirrorPane("p1", "s-2"), mirrorPane("p2", "s-3")]),
        (app) => {
          const before = app.panes().map((pane) => pane.sockets().length);
          assert.deepEqual(before, [1, 1, 1], "each pane holds exactly its own one socket");
          assert.deepEqual(app.unattributedSockets(), []);

          // A socket built by nobody's session effect — the shape of every out-of-band
          // subscription this harness will meet next.
          const stray = new globalThis.WebSocket("ws://127.0.0.1:4181/ws/terminal-view?nodeId=x&sessionId=stray");

          assert.deepEqual(
            app.panes().map((pane) => pane.sockets().length),
            [1, 1, 1],
            "NO pane adopted it — every per-pane count is exactly where it was",
          );
          assert.equal(app.sockets().length, 4, "…while the total records it, because it really was constructed");
          assert.deepEqual(app.unattributedSockets(), [stray], "…and it announces itself as unattributable");
          assert.equal(stray.hostNode, null, "an environment that cannot attribute a socket must not guess");
        },
      );
    },
  },

  {
    name: "grid/05 what happens to ONE pane does not happen to its neighbours — the middle pane streams, the outer two are still connecting, and nothing new was constructed anywhere",
    run: async () => {
      await withTerminalControl(
        gridOf([mirrorPane("p0", "s-1"), mirrorPane("p1", "s-2"), mirrorPane("p2", "s-3")]),
        (app) => {
          assert.equal(app.sockets().length, 3);
          const middle = app.pane(1);
          middle.socket().accept();
          app.render();
          middle.socket().deliver("hello\r\n");
          app.render();

          // CROSS-TALK IS THE FAILURE MODE a shared `__AOF_TERMINALS__` and a shared socket list
          // make easy and invisible. This lane asserts a DIFFERENCE between panes, which is the
          // only shape that catches it.
          assert.equal(app.pane(1).chip(), "streaming");
          assert.deepEqual(app.pane(1).terminal().written, ["hello\r\n"], "the bytes landed in the middle pane's own xterm");
          assert.equal(app.pane(0).chip(), "connecting…");
          assert.equal(app.pane(2).chip(), "connecting…");
          assert.deepEqual(app.pane(0).terminal().written, [], "index 0's xterm holds nothing written at all");
          assert.deepEqual(app.pane(2).terminal().written, []);
          assert.equal(app.sockets().length, 3, "driving one pane constructed nothing new anywhere");
          assert.equal(app.terminals().length, 3);
        },
      );
    },
  },

  {
    name: "grid/06 the SAME mount observed alone and observed as one of twelve produces byte-identical answers — if mounting twelve changed what pane 7 does, no N=12 assertion in story 49/05 would measure the control",
    run: async () => {
      const subject = boardDockMount({ kind: "mirror", ref: "46/01", nodeId: "aof-wsl", sessionId: "7f3a91c" });
      let loneUrl = null;
      let loneChip = null;
      await withTerminalControl(
        gridOf([{ key: "only", host: HOST_BOARD_DOCK, mount: subject, origins: ORIGINS }]),
        (app) => {
          loneUrl = app.pane(0).socket().url;
          loneChip = app.pane(0).chip();
          assert.equal(app.pane(0).paneHosts().length, 1);
          assert.equal(app.pane(0).terminals().length, 1);
        },
      );

      const twelve = Array.from({ length: 12 }, (_, index) =>
        index === 7
          ? { key: "p7", host: HOST_BOARD_DOCK, mount: subject, origins: ORIGINS }
          : mirrorPane(`p${index}`, `s-${index}`),
      );
      await withTerminalControl(gridOf(twelve), (app) => {
        assert.equal(app.paneCount(), 12);
        assert.equal(app.pane(7).socket().url, loneUrl, "the socket URL observed for index 7 is byte-identical to the lone pane's");
        assert.equal(app.pane(7).chip(), loneChip, "…and so is its state chip");
        assert.equal(app.pane(7).paneHosts().length, 1, "…and it has exactly one pane host");
        assert.equal(app.pane(7).terminals().length, 1, "…and exactly one xterm");
        assert.equal(app.sockets().length, 12);
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 3 · TEARDOWN. N panes means N sockets and N xterms to leak.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "grid/07 unmounting a tree of twelve closes EVERY socket and disposes EVERY xterm, and every global the harness installed by name is restored — a following lane sees `typeof document === \"undefined\"` again",
    run: async () => {
      const before = new Map();
      let installedNames = [];
      let sockets = [];
      let terminals = [];
      await withTerminalControl(
        gridOf(Array.from({ length: 12 }, (_, index) => mirrorPane(`p${index}`, `s-${index}`))),
        (app) => {
          installedNames = app.installedGlobals();
          for (const name of installedNames) before.set(name, undefined);
          sockets = app.sockets();
          terminals = app.terminals();
          assert.equal(sockets.length, 12);
          assert.equal(terminals.length, 12);
          for (const socket of sockets) socket.accept();
          app.render();
          app.unmount();
        },
      );
      assert.equal(sockets.filter((socket) => !socket.closed).length, 0, "zero of the twelve sockets are left open");
      assert.equal(terminals.filter((terminal) => !terminal.disposed).length, 0, "zero of the twelve xterms are left undisposed");

      // THE RESTORE IS A STRAIGHT WALK OVER A LIST OF NAMES, and its own comment says why: one
      // sequential runner, so a leaked global changes an unrelated suite's behaviour far from
      // its cause. Anything this story installed joins that list, which is why the list itself is
      // read off the driver rather than retyped here.
      assert.ok(installedNames.includes("document"), `the installed list names \`document\` (${installedNames.join(", ")})`);
      assert.ok(installedNames.includes("WebSocket"));
      assert.ok(installedNames.includes("__AOF_TERMINALS__"));
      assert.equal(typeof document, "undefined", "a lane running immediately afterwards observes `typeof document === \"undefined\"` again");
      assert.equal(typeof globalThis.__AOF_TERMINALS__, "undefined");
      assert.equal(typeof globalThis.ResizeObserver, "undefined");
      assert.equal(typeof globalThis.getComputedStyle, "undefined");
      assert.equal(typeof globalThis.requestAnimationFrame, "undefined");
      // `WebSocket` is node's OWN global on this runtime, so "restored" means restored to what it
      // held — not deleted. A restore that deleted it would be a leak in the other direction.
      assert.equal(typeof globalThis.WebSocket, "function", "…and node's own `WebSocket` is back, rather than deleted");
    },
  },

  {
    name: "grid/08 a pane removed from the tree while its neighbours stay takes ONLY its own socket with it — the other two keep their sockets, their scrollback and their pane hosts, and the re-render constructs nothing",
    run: async () => {
      await withTerminalControl(
        gridOf([mirrorPane("p0", "s-1"), mirrorPane("p1", "s-2"), mirrorPane("p2", "s-3")]),
        (app) => {
          const captured = app.panes().map((pane) => ({ socket: pane.socket(), terminal: pane.terminal() }));
          for (const { socket } of captured) socket.accept();
          app.render();
          captured[0].socket.deliver("zero\r\n");
          captured[2].socket.deliver("two\r\n");
          app.render();
          assert.equal(app.sockets().length, 3);

          // The ENTRY re-renders with the pane at index 1 removed. Keys are what make this a
          // removal rather than a re-key of everything after it.
          app.setProps({ panes: [mirrorPane("p0", "s-1"), mirrorPane("p2", "s-3")] });

          assert.equal(app.paneCount(), 2, "two panes are left in the tree");
          assert.equal(captured[1].socket.closed, true, "the departed pane's socket is closed");
          assert.equal(captured[1].terminal.disposed, true, "…and its xterm is disposed");
          assert.equal(captured[0].socket.closed, false, "index 0's socket is still open");
          assert.equal(captured[2].socket.closed, false, "index 2's socket is still open");
          assert.deepEqual(captured[0].terminal.written, ["zero\r\n"], "…and index 0's xterm still holds its scrollback");
          assert.deepEqual(captured[2].terminal.written, ["two\r\n"]);
          assert.equal(captured[0].terminal.disposed, false);
          assert.equal(captured[2].terminal.disposed, false);
          assert.equal(app.paneHosts().length, 2, "their pane hosts are still present in the rendered tree");
          assert.equal(app.sockets().length, 3, "no socket was constructed by the re-render");
          assert.equal(app.terminals().length, 3, "…and no xterm either");
          // The survivors are still addressable, and still their own.
          assert.equal(app.pane(0).socket(), captured[0].socket);
          assert.equal(app.pane(1).socket(), captured[2].socket, "the pane that was index 2 is now index 1, and it is still ITS socket");
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 4 · THE REGRESSION BAR. Everything that works today still works, and the one forbidden fix.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "grid/09 the SHIPPING single-control path is untouched — no entry key mounts `TerminalControl.tsx`, every existing accessor name still answers, and neither consumer was rewritten around a new signature",
    run: async () => {
      assert.equal(
        path.relative(repoRoot, CONTROL_TSX).split(path.sep).join("/"),
        "ui/src/terminal/TerminalControl.tsx",
        "the default entry is the REAL control, exactly as milestone 46 named it",
      );
      await withTerminalControl(
        {
          host: HOST_BOARD_DOCK,
          mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" }),
          origins: ORIGINS,
        },
        (app) => {
          // The driver's shipping vocabulary, name by name. A rename would be a silent break for
          // every lane in both consumers.
          for (const name of [
            "sockets", "socket", "terminals", "terminal", "paneHosts", "paneHost", "paneText",
            "chip", "bar", "button", "buttonLabelled", "click", "render", "runFrames",
            "resizeObservers", "tree", "unmount",
          ]) {
            assert.equal(typeof app[name], "function", `the driver still answers \`${name}\``);
          }
          assert.equal(app.sockets().length, 1, "…and the default call still mounts a real, dialling control");
          assert.equal(app.paneCount(), 1);
        },
      );

      // THE CLAUSE THAT MAKES THIS NON-VACUOUS: the cheapest way to make N work is to rewrite the
      // two consumers around a new signature. Every `withTerminalControl(` call site in both
      // files still passes the shipping `{ host, mount, origins }` object and nothing else.
      for (const relative of SHIPPING_CONSUMERS) {
        const source = sourceOf(relative);
        const calls = source.match(/withTerminalControl\(/g) ?? [];
        assert.ok(calls.length > 0, `${relative} still drives this harness (non-vacuous): ${calls.length} call sites`);
        for (const forbidden of ["entry:", "exportName:", "props:", "shell:", "panes:", ".pane("]) {
          assert.ok(
            !source.includes(forbidden),
            `${relative} was NOT rewritten around the extended signature — it must not mention \`${forbidden}\``,
          );
        }
      }
      assert.equal(terminalControlOpensItsSocketTests.length, 13, "all 13 lanes of the socket suite are still there");
      assert.equal(terminalControlHeaderYieldTests.length, 9, "…and all 9 of the header-yield suite");
    },
  },

  {
    name: "grid/10 `TerminalControl` is NOT in this harness's stub set, and a caller-supplied entry cannot smuggle it in — the substitutions are only the environment a browser would provide",
    run: async () => {
      // THE SPECIFIC REGRESSION TO GUARD, stated as a lane because it is the reason the whole
      // story exists. Making the ENTRY a parameter opens a second door into the room TECH_DEBT 29
      // is about: an entry that imported a stubbed control would mount green and connect to
      // nothing.
      const spellings = [
        "TerminalControl",
        "./TerminalControl",
        "../terminal/TerminalControl",
        "ui/src/terminal/TerminalControl",
        "ui/src/terminal/TerminalControl.tsx",
        "@/terminal/TerminalControl",
      ];
      for (const key of Object.keys(CONTROL_STUBS)) {
        assert.ok(!/terminalcontrol/i.test(key), `no key in the stub set names the control (${key})`);
      }
      for (const entry of CONTROL_RESOLVE) {
        for (const spelling of spellings) {
          assert.ok(
            !entry.filter.test(spelling),
            `no resolver filter matches \`${spelling}\` — ${entry.filter} → ${entry.to}`,
          );
        }
      }
      // The set is EXACTLY the environment, and nothing else — asserted as a set so a member
      // added later has to be argued for here.
      assert.deepEqual(
        Object.keys(CONTROL_STUBS).sort(),
        ["__icons__", "__react_dom__", "__xterm__", "__xterm_fit__", "__xterm_web_links__"],
        "the only substitutions are `@xterm/*` ×3, `react-dom`'s createPortal and the icon pack (plus `react`/`react/jsx-runtime`, which `bundleSurface` supplies for every surface)",
      );
      // NON-VACUITY: the filters really do match the things they are FOR, so the assertions above
      // are a statement about the control rather than about an inert list.
      const matched = (specifier) => CONTROL_RESOLVE.some((entry) => entry.filter.test(specifier));
      for (const specifier of ["@xterm/xterm", "@xterm/addon-fit", "@xterm/addon-web-links", "react-dom", "lucide-react"]) {
        assert.ok(matched(specifier), `the resolver list DOES substitute \`${specifier}\``);
      }

      // A LANE CANNOT PASS A STUB SET OF ITS OWN. Refused by name, not by convention.
      await assert.rejects(
        () => withTerminalControl({ ...gridOf([mirrorPane("p0", "s-1")]), stubs: { __x__: "" } }, () => {}),
        /a lane supplies an ENTRY, never a stub set/,
      );
      await assert.rejects(
        () => withTerminalControl({ ...gridOf([mirrorPane("p0", "s-1")]), resolve: [] }, () => {}),
        /a lane supplies an ENTRY, never a stub set/,
      );

      // AND THE MECHANISM BY WHICH A SUBSTITUTED CONTROL WOULD GO QUIET, named: the module-path
      // stub the three SURFACE harnesses share renders NOTHING, so there is no `absolute inset-0`
      // element, so no ref binds, so the session effect early-returns and no socket is ever
      // constructed. That chain is MEASURED both ways in `terminal-harness-shell-focus-keyboard`
      // (`shell/13`); here it is pinned at its source.
      assert.equal(TERMINAL_CONTROL_STUB, "export const TerminalControl = () => null;\n");
    },
  },

  {
    name: "grid/10b THE SECOND DOOR: an ENTRY that renders panes without bundling the real control is REFUSED — a fake that mounts green, reports twenty panes and constructs nothing satisfies every ABSENCE assertion story 49/05 is made of",
    run: async () => {
      // REFUSING A CALLER-SUPPLIED STUB SET CLOSES ONE DOOR. Making the ENTRY a parameter opens a
      // second into the same room, and this is QA's own plant, verbatim in shape: no stub set is
      // supplied, so nothing is refused; the entry imports NOTHING; it renders twenty `<section>`s
      // with an `aria-label`. Before the guard it reported `paneCount() = 20`, `sockets() = 0`,
      // `terminals() = 0` — and "the panes beyond the cap hold NO socket" was TRUE, vacuously.
      // That is milestone 46's failure with a new coat on.
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-fake-entry-"));
      try {
        const fake = path.join(tmp, "fake-terminal-entry.tsx");
        await writeFile(
          fake,
          [
            "export const TerminalControl = () => <section aria-label=\"fake pane\" />;",
            "export function TerminalGrid({ panes = [] }: { panes?: unknown[] }) {",
            "  return <>{panes.map((_, index) => <TerminalControl key={index} />)}</>;",
            "}",
            "",
          ].join("\n"),
          "utf8",
        );

        const twentyPanes = { panes: Array.from({ length: 20 }, (_, i) => i) };
        await assert.rejects(
          () => withTerminalControl({ entry: fake, exportName: "TerminalGrid", props: twentyPanes }, () => {}),
          /does not carry the REAL ui\/src\/terminal\/TerminalControl/,
          "an entry that claims to mount terminals must be an entry that bundled the real control",
        );

        // …AND DECLARING `terminals: false` DOES NOT BUY THE FAKE ITS WAY BACK IN. That is the
        // second half of the guard: the only reason to declare an entry terminal-free is to drive
        // a shape with no panes in it, so the pane driver is withheld outright. A fake that says
        // it mounts no terminal cannot then be counted as twenty of them.
        await withTerminalControl(
          { entry: fake, exportName: "TerminalGrid", props: twentyPanes, terminals: false },
          (app) => {
            assert.equal(findAll(app.tree(), (node) => node.type === "section").length, 20, "the fake really does render twenty sections");
            assert.equal(app.sockets().length, 0, "…and constructs nothing, which is what made it dangerous");
            for (const ask of ["paneCount", "panes"]) {
              assert.throws(() => app[ask](), /declared `terminals: false`, so it has no panes to address/, `\`${ask}()\` is withheld`);
            }
            assert.throws(() => app.pane(0), /declared `terminals: false`, so it has no panes to address/);
          },
        );

        // NON-VACUITY, THREE WAYS.
        // (a) the plant really does bundle — the guard is what stops it, not a bundle error.
        const fakeBundle = await bundleSurface({ entry: fake, stubs: CONTROL_STUBS, resolve: CONTROL_RESOLVE });
        assert.ok(fakeBundle.length > 0, "the fake entry bundles cleanly — nothing else was going to refuse it");
        assert.ok(
          !fakeBundle.includes("Expand terminal to full screen"),
          "…and its bundle carries none of the real control's own literals, which is exactly what the guard reads",
        );
        // (b) the declared no-terminal FIXTURE keeps working, so the guard is not simply refusing
        //     every entry that is not the control.
        await withTerminalControl({ ...focusFixtureOptions, props: {} }, (app) => {
          assert.ok(findAll(app.tree(), (node) => node.props?.["data-fixture"] === "a").length === 1, "the focus fixture still mounts");
        });
        // (c) the REAL entries pass it and DO get the pane driver.
        await withTerminalControl(gridOf([mirrorPane("p0", "s-1")]), (app) => assert.equal(app.paneCount(), 1));
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grid/10c the four literals the entry guard reads are EMITTED BY FOUR DIFFERENT SHIPPED MODULES — deleting any one of them from the product fails here rather than silently downgrading the guard",
    run: async () => {
      // A GUARD THAT READS A LITERAL IS ONLY AS GOOD AS THE LITERAL'S TENURE. Each of the four is
      // load-bearing in its own module — the pane host the xterm opens into, the fullscreen door,
      // the keyboard-operable separator, and `idle`'s own copy — so this lane is where a rename
      // announces itself, instead of the guard quietly matching three of four and then none.
      for (const [literal, home] of [
        ["absolute inset-0 overflow-hidden", "ui/src/terminal/TerminalByteArea.tsx"],
        ["Expand terminal to full screen", "ui/src/terminal/TerminalControls.tsx"],
        ["Resize terminal dock", "ui/src/terminal/TerminalDragHandle.tsx"],
        ["No session. Press Run agent on an item.", "ui/src/terminal/state-ramp.mjs"],
      ]) {
        assert.ok(sourceOf(home).includes(literal), `${home} still emits ${JSON.stringify(literal)} — the entry guard reads it`);
      }
      // …and the real control's bundle carries all four, which is what the guard measures.
      const realBundle = await bundleSurface({ entry: CONTROL_TSX, stubs: CONTROL_STUBS, resolve: CONTROL_RESOLVE });
      for (const literal of [
        "absolute inset-0 overflow-hidden",
        "Expand terminal to full screen",
        "Resize terminal dock",
        "No session. Press Run agent on an item.",
      ]) {
        assert.ok(realBundle.includes(literal), `the real control's bundle carries ${JSON.stringify(literal)}`);
      }
    },
  },

  {
    name: "grid/11 two entries with the same stub set get their OWN bundles, not each other's — in either order, in one process",
    run: async () => {
      // `bundleSurface` caches on `(entry, sorted stub names)`. That key has been effectively
      // single-valued for this harness since m46 because the entry was a module constant; a
      // caller-supplied entry is what makes it genuinely multi-valued for the first time.
      const read = (app) => ({
        sections: findAll(app.tree(), (node) => node.type === "section").length,
        sockets: app.sockets().length,
        fixtures: findAll(app.tree(), (node) => node.props?.["data-fixture"] != null).length,
      });
      const mountA = () => withTerminalControl(gridOf([mirrorPane("p0", "s-1")]), (app) => read(app));
      const mountB = () =>
        withTerminalControl({ ...focusFixtureOptions, props: {} }, (app) => read(app));

      for (const order of [[mountA, mountB], [mountB, mountA]]) {
        const first = await order[0]();
        const second = await order[1]();
        const [a, b] = order[0] === mountA ? [first, second] : [second, first];
        assert.deepEqual(a, { sections: 1, sockets: 1, fixtures: 0 }, "lane A mounts A's tree — one control, one socket, no fixture nodes");
        assert.deepEqual(b, { sections: 0, sockets: 0, fixtures: 4 }, "lane B mounts B's tree — no control, no socket, its own four fixture nodes");
      }
    },
  },

  {
    name: "grid/11b the bundle cache keys on the stub SOURCES and the resolver LIST, not only on their names — two substitution sets that differ in what they substitute get two bundles",
    run: async () => {
      // THE ENTRY WAS NEVER THE DIMENSION AT RISK, and `grid/11` varies only that one. The key was
      // `entry + the stub NAMES`, so two sets with the same names and different SOURCES returned
      // one another's bundle — harmless while every substitution builder in the repo had a unique
      // name-set, and no longer harmless now that `realTerminalControl` swaps the SOURCES behind an
      // overlapping name set and a caller supplies the entry.
      // The icon pack is a substitution the entry REALLY IMPORTS (the control imports `X` from
      // `lucide-react`), and the difference is in the body of an export that is really USED — an
      // unused one is tree-shaken out and the two bundles would be byte-identical for a reason
      // that has nothing to do with the cache. What is measured here is the BUNDLE.
      const iconsA = { ...CONTROL_STUBS };
      const iconsB = {
        ...CONTROL_STUBS,
        __icons__: CONTROL_STUBS.__icons__.replace("export const X = () => null;", 'export const X = () => "variant-b";'),
      };
      const one = await bundleSurface({ entry: GRID_ENTRY, stubs: iconsA, resolve: [...CONTROL_RESOLVE] });
      const two = await bundleSurface({ entry: GRID_ENTRY, stubs: iconsB, resolve: [...CONTROL_RESOLVE] });
      assert.deepEqual(Object.keys(iconsA).sort(), Object.keys(iconsB).sort(), "the two sets carry the SAME names…");
      assert.notEqual(iconsA.__icons__, iconsB.__icons__, "…and different sources");
      assert.notEqual(one, two, "so they get two bundles, never one another's");

      // …and the RESOLVER LIST is the third input. Read off the key itself, because a resolver
      // that nothing imports changes no output text while still changing which real import would
      // have reached which substitution — the dimension a text comparison cannot see.
      const base = { entry: GRID_ENTRY, stubs: { ...CONTROL_STUBS }, resolve: [...CONTROL_RESOLVE] };
      assert.notEqual(
        bundleCacheKey(base),
        bundleCacheKey({ ...base, resolve: [...CONTROL_RESOLVE, { filter: /^some-module$/, to: "__icons__" }] }),
        "a different resolver list is a different bundle key",
      );
      assert.notEqual(bundleCacheKey(base), bundleCacheKey({ ...base, stubs: iconsB }), "…as is a different stub source");
      assert.equal(bundleCacheKey(base), bundleCacheKey({ ...base }), "…and an identical request is an identical key");
      // The OLD key was `entry + the stub NAMES`, and these two differ in neither.
      assert.notEqual(
        bundleCacheKey({ entry: GRID_ENTRY, stubs: iconsA, resolve: [] }),
        bundleCacheKey({ entry: GRID_ENTRY, stubs: iconsB, resolve: [] }),
        "the name-only key would have collided here — that is the regression this closes",
      );

      // NON-VACUITY: an IDENTICAL request still hits the cache, so the key was tightened and not
      // simply made unique per call — a cache that never hits is an esbuild build per lane.
      const again = await bundleSurface({ entry: GRID_ENTRY, stubs: iconsA, resolve: [...CONTROL_RESOLVE] });
      assert.equal(again, one, "the same (entry, substitutions, resolvers) still returns the cached bundle");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 5 · NON-VACUITY. Every count above must be a measurement that can come out wrong.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "grid/12 the per-pane accessors are assertions that can FAIL — three trees in which the answer DIFFERS between panes, which is the only shape that catches an accessor resolving to `the last one`",
    run: async () => {
      // ROW 1 — a pane that dials nothing. Its expected values are m46's own (`boardDockMount(null)`
      // is `idle`: the centred empty line, no pane host, no socket).
      await withTerminalControl(
        gridOf([mirrorPane("p0", "s-1"), unboundPane("p1"), mirrorPane("p2", "s-3")]),
        (app) => {
          assert.equal(app.pane(1).socket(), null, "index 1 has NO socket");
          assert.equal(app.pane(1).paneHost(), null, "…and NO pane host");
          assert.equal(app.pane(1).chip(), "idle");
          assert.ok(app.pane(1).paneText().includes(IDLE_PANE_LINE));
          assert.equal(app.pane(0).sockets().length, 1, "…while indexes 0 and 2 have one each");
          assert.equal(app.pane(2).sockets().length, 1);
          assert.equal(app.pane(0).paneHosts().length, 1);
          assert.equal(app.pane(2).paneHosts().length, 1);
          assert.equal(app.sockets().length, 2);
        },
      );

      // ROW 2 — a pane with no fleet origin. `mirror` declares `originRole: fleet`, so a board
      // that was handed only its own origin cannot compose the URL: `unavailable`, never a dead
      // `idle` pane. Again m46's own value.
      await withTerminalControl(
        gridOf([
          mirrorPane("p0", "s-1"),
          mirrorPane("p1", "s-2"),
          { ...mirrorPane("p2", "s-3"), origins: { self: BOARD_ORIGIN } },
        ]),
        (app) => {
          assert.equal(app.pane(2).socket(), null, "index 2 has no socket");
          assert.equal(app.pane(2).chip(), "unavailable");
          assert.ok(app.pane(2).paneText().includes("no fleet origin"), "…and its pane names the cause");
          assert.equal(app.pane(0).chip(), "connecting…", "…while indexes 0 and 1 are unaffected");
          assert.equal(app.pane(1).chip(), "connecting…");
          assert.equal(app.pane(0).sockets().length, 1);
          assert.equal(app.pane(1).sockets().length, 1);
          assert.equal(app.sockets().length, 2);
        },
      );

      // ROW 3 — a chip that DIFFERS because one socket was opened and its neighbour's was not.
      await withTerminalControl(
        gridOf([mirrorPane("p0", "s-1"), mirrorPane("p1", "s-2"), mirrorPane("p2", "s-3")]),
        (app) => {
          app.pane(0).socket().accept();
          app.render();
          assert.equal(app.pane(0).chip(), "waiting for output");
          assert.equal(app.pane(1).chip(), "connecting…");
          assert.equal(app.pane(2).chip(), "connecting…");
        },
      );
    },
  },
];
