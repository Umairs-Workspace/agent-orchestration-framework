// THE GRID OF LIVE PANES (milestone 49 / story 05 — tasks 00-05).
//
// ═══ THE ONE THING THIS SUITE IS FOR ═════════════════════════════════════════════════════════
// A TILE OPENS A REAL SOCKET, and it is proved by mounting the PRODUCT — `ui/src/home/
// SessionGrid.tsx` → `SessionPane.tsx` → the real, unmodified `ui/src/terminal/TerminalControl.tsx`
// — through story 08's harness and reading the sockets the component constructed. Milestone 46
// shipped a control that opened NO socket at all past 537 green tests, a 71-mutant battery and
// five reviews, because every harness stubbed the control by module path (TECH_DEBT 29). Nothing
// here asserts "a component rendered".
//
// ═══ HOW TO READ A CHIP HERE ═════════════════════════════════════════════════════════════════
// The harness's `chip()` accessor finds the state chip by `aria-live="polite"`, and task 05
// REMOVES that attribute in the grid host — so `chip()` answers `null` for a grid pane, by design.
// This suite addresses the chip by its rendered structure (the dot's own class, then the word
// beside it). "Fixing" it by restoring the per-pane region would silently undo task 05.
//
// ISOLATION: no store, no server, no port — the harness mounts in-process and its `WebSocket` is a
// stand-in that connects to nothing. Focused runs only, with `AOF_GLOBAL_HOME=$(mktemp -d)`.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { withTerminalControl, ancestryOf, findAll, visibleTextOf } from "../support/terminal-control-harness.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { fleetTerminalMount } from "../../ui/src/fleet/terminal-mount.mjs";
import {
  hostAnnouncesState,
  terminalPaneStanding,
  HIDE_LABEL,
  HOST_BOARD_DOCK,
  HOST_FLEET_CARD,
  HOST_FULLSCREEN,
  HOST_GRID_PANE,
  WATCH_LABEL,
} from "../../ui/src/terminal/host-model.mjs";
import { terminalPaneKey } from "../../ui/src/terminal/pane-identity.mjs";
import { sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import { describeTerminalState, IDLE_PANE_LINE, TERMINAL_STATES, TERMINAL_STATE_LIST, WAITING_PANE_LINE } from "../../ui/src/terminal/state-ramp.mjs";
import { TERMINAL_FOCUS_RING_CLASS, TERMINAL_FOCUS_RING_INSET_CLASS, TERMINAL_STATE_DOT_CLASS } from "../../ui/src/terminal/palette.mjs";
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY } from "../../ui/src/terminal/input-policy.mjs";
import {
  fullscreenOpenerFor,
  terminalFullscreenRequest,
  FOCUS_PRESENTS_EXIT,
  FOCUS_PRESENTS_TERMINAL,
} from "../../ui/src/terminal/fullscreen-request.mjs";
import { FORM_ICON_CONTROL, FORM_PANE_ACTIVATION } from "../../ui/src/terminal/host-model.mjs";
import { homeGridAnnouncement, homeGridFocus, homeGridFocusAfterPoll, homeGridRows, MARK_NEEDS_INPUT } from "../../ui/src/home/grid.mjs";
import { heldPaneLine, homePageOrigins, homeSessionMount, HELD_LINE } from "../../ui/src/home/session-mount.mjs";
import { HELD_AT_CAP, MAX_LIVE_PANES } from "../../ui/src/home/socket-cap.mjs";
import { NO_LIVE_OUTPUT_REASON } from "../../ui/src/home/feed-axis.mjs";
import { homeSlotSummary, HOME_EMPTY_CARD_CLASS, HOME_E2_WHY, HOME_PAGE_STATE_POPULATED } from "../../ui/src/home/page-state.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOME_ENTRY = path.join(repoRoot, "test", "support", "terminals-home-entry.tsx");

// The terminals home IS the fleet origin — it is served by the same face — and BOTH keys are
// supplied so a builder that fell back to `self` for a `fleet`-role source would still be caught.
const FLEET = "http://127.0.0.1:4181";
const ORIGINS = { self: FLEET, fleet: FLEET };
const MIRROR = sessionSourceFor("mirror").source;

const row = (nodeId, sessionId, extra = {}) => ({
  nodeId,
  sessionId,
  workspaceId: "ws-1",
  repo: "demo",
  assistant: "claude",
  lastPingAt: "2026-08-13T12:00:00.000Z",
  workspaceHasRun: true,
  workItem: { ref: "49/05", assignmentId: `a-${sessionId}` },
  ...extra,
});
const free = (nodeId, sessionId, extra = {}) => row(nodeId, sessionId, { workItem: null, ...extra });
const payload = (sessions, extra = {}) => ({ scope: "global", workspaces: [], items: [], nodes: [], sessions, diagnostics: {}, ...extra });
const keyOf = (nodeId, sessionId) => terminalPaneKey(MIRROR, { nodeId, sessionId });

const home = (status, props = {}) => ({
  entry: HOME_ENTRY,
  exportName: "TerminalsHome",
  props: { status, origins: ORIGINS, ...props },
});

// THE CHIP, BY ITS RENDERED STRUCTURE rather than by the live region it no longer carries: the
// dot's own class, then the word rendered beside it.
function chipWord(app, pane) {
  const dot = findAll(pane.section, (node) => typeof node.props?.className === "string" && node.props.className.includes(TERMINAL_STATE_DOT_CLASS))[0];
  if (dot == null) return null;
  const chain = ancestryOf(app.tree(), dot);
  return chain.length > 1 ? visibleTextOf(chain[1]) : null;
}
// EVERY LIVE REGION, EXPLICIT **AND IMPLICIT** (F6). `role="status"` is a polite live region by
// the platform's own mapping, so a clause that counted only `aria-live` could not see a dozen
// ended tiles narrating the fleet — which is the defect DG-49-7 exists to remove, wearing markup
// that reads clean.
const liveRegions = (tree) =>
  findAll(tree, (node) => node.props?.["aria-live"] != null || node.props?.role === "status" || node.props?.role === "alert");

export const terminalsHomeGridTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // TASK 00 — THE ROW SET: which sessions become tiles, and which emphatically do not.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "49/05 task00 — every addressable live session is ONE tile, addressed by its tuple through the frozen `mirror` row, and nothing on the payload but `sessions[]` may put a tile on the grid",
    run: async () => {
      const tiles = homeGridRows(payload([row("aof-wsl", "s-2"), row("aof-wsl", "s-1"), row("win-host-a", "s-9")]));
      assert.equal(tiles.length, 3, "three entries, three tiles");
      for (const tile of tiles) {
        assert.equal(tile.key, keyOf(tile.nodeId, tile.sessionId), "the pane key is the CORE's own `terminalPaneKey`");
        const mount = homeSessionMount(tile.row, { axis: tile.axis });
        assert.deepEqual({ ...mount.params }, { nodeId: tile.nodeId, sessionId: tile.sessionId }, "byte-identical to the entry's two values");
        assert.equal(mount.source, MIRROR, "the WHOLE frozen row, resolved through `sessionSourceFor('mirror')` — never assembled");
        assert.equal(mount.source.kind, "mirror");
        assert.equal(mount.unavailable, null, "every mount carries `unavailable: null` (DG-49-10)");
        assert.equal(mount.params.ref, undefined, "no `ref` param…");
        assert.equal(mount.params.provider, undefined, "…no `provider` param, and no board origin");
      }

      // AN ASSIGNMENT IS NOT A SESSION. Five payload shapes that are tempting and contribute ZERO.
      const item = { workspaceId: "ws-1", ref: "49/05", assignment: { assignmentId: "a-1", state: "running", targetNodeId: "aof-wsl", sessionId: "s-1" } };
      const node = (freshness, assignments = [], presence = null, activeRuns = []) => ({ nodeId: "aof-wsl", freshness, assignments, presence, activeRuns });
      for (const [name, decoy] of [
        ["the tempting union", { items: [item] }],
        ["dispatch lifecycle is not liveness", { nodes: [node("stale", [{ state: "running", sessionId: "s-1" }])] }],
        ["the node panel's own copy", { nodes: [node("live", [{ state: "running", sessionId: "s-1" }, { state: "running", sessionId: "s-2" }])] }],
        ["a run is not a session", { nodes: [node("live", [], null, ["r-1"]), node("live", [], null, ["r-2"])] }],
        ["presence without an index entry", { nodes: [node("live", [], { sessions: [{ sessionId: "s-7" }] })] }],
      ]) {
        const status = payload([], decoy);
        assert.equal(homeGridRows(status).length, 0, `${name}: ZERO tiles`);
        assert.deepEqual(status, payload([], decoy), `${name}: the payload is returned unedited — nothing is marked dropped, filtered or degraded`);
      }
    },
  },

  {
    name: "49/05 task00 — an anonymous session is not a tile and is not lost either; a tile requires a NON-EMPTY STRING id, tested as one (`\"0\"` is a legitimate id)",
    run: async () => {
      const presence = { sessions: [{ sessionId: "sess-A" }, { sessionId: null }] };
      const status = payload([row("aof-wsl", "sess-A")], { nodes: [{ nodeId: "aof-wsl", freshness: "live", presence }] });
      const tiles = homeGridRows(status);
      assert.equal(tiles.length, 1, "exactly one tile, for `sess-A`");
      assert.equal(tiles[0].sessionId, "sess-A");
      assert.equal(status.nodes[0].presence.sessions.length, 2, "`nodes[].presence.sessions[]` still contains BOTH records, unchanged");
      assert.deepEqual(status.nodes[0].presence.sessions[1], { sessionId: null }, "…and the anonymous one is unchanged and unmarked");

      // The six-row table, and the last row is the whole reason it exists.
      for (const [name, value, tiles_] of [
        ["absent", undefined, 0],
        ["explicitly null", null, 0],
        ["the empty string", "", 0],
        ["a number the wire malformed", 0, 0],
        ["a boolean", false, 0],
        ["AN ID THAT IS FALSY AS TEXT", "0", 1],
      ]) {
        const composed = homeGridRows(payload([{ ...row("aof-wsl", "x"), sessionId: value }]));
        assert.equal(composed.length, tiles_, `${name}: ${tiles_} tile(s)`);
        // …and the same six rows apply to `nodeId`: a half-tuple is not addressable in either half.
        assert.equal(homeGridRows(payload([{ ...row("aof-wsl", "s-1"), nodeId: value }])).length, tiles_ === 1 ? 1 : 0, `${name}: the same answer for nodeId`);
      }
    },
  },

  {
    name: "49/05 task00 — the tiles are ordered `(nodeId, repo, sessionId)` by PLAIN CODEPOINT comparison, an unstated repo sorts LAST, and the ORDER CONFLICT is pinned to DESIGN's rule rather than the index's",
    run: async () => {
      const order = (tiles) => tiles.map((tile) => `${tile.nodeId}/${tile.repo ?? "-"}/${tile.sessionId}`);

      assert.deepEqual(
        order(homeGridRows(payload([row("win-host-a", "s-9"), row("aof-wsl", "s-2"), row("win-host-a", "s-1")]))),
        ["aof-wsl/demo/s-2", "win-host-a/demo/s-1", "win-host-a/demo/s-9"],
        "scrambled input sorts by node then session",
      );
      assert.deepEqual(
        order(homeGridRows(payload([row("aof-wsl", "s-1", { repo: "alpha" }), row("aof-wsl", "s-2", { repo: "Beta" })]))),
        ["aof-wsl/Beta/s-2", "aof-wsl/demo/s-1".replace("demo", "alpha")],
        "codepoint, never locale: uppercase `Beta` sorts before lowercase `alpha`",
      );
      // THE CONFLICT ROW. The index's own `(nodeId, sessionId)` puts `s-1` first; DESIGN rule 7
      // puts `alpha` first, and DESIGN is what ADR-006 amendment (3) ruled.
      assert.deepEqual(
        order(homeGridRows(payload([row("aof-wsl", "s-1", { repo: "zeta" }), row("aof-wsl", "s-2", { repo: "alpha" })]))),
        ["aof-wsl/alpha/s-2", "aof-wsl/zeta/s-1"],
        "THE ORDER CONFLICT, PINNED: `(s-2, alpha)` before `(s-1, zeta)`",
      );
      assert.deepEqual(
        order(homeGridRows(payload([row("aof-wsl", "s-1", { repo: "" }), row("aof-wsl", "s-2", { repo: "zeta" })]))),
        ["aof-wsl/zeta/s-2", "aof-wsl/-/s-1"],
        "a row with no STATED repo sorts LAST within its node — never first, never under a fabricated ''",
      );

      // Nothing in the order keys on connection state, agent state, `lastPingAt` or recency.
      const scrambled = homeGridRows(payload([row("aof-wsl", "s-2", { lastPingAt: "2999-01-01T00:00:00.000Z" }), row("aof-wsl", "s-1")]));
      assert.deepEqual(order(scrambled), ["aof-wsl/demo/s-1", "aof-wsl/demo/s-2"], "recency does not move a tile");

      // …and the SERVER's order is not this function's business: it is handed one and re-sorts.
      const arrival = payload([row("aof-wsl", "s-2"), row("aof-wsl", "s-1")]);
      const first = homeGridRows(arrival);
      const second = homeGridRows(payload([...arrival.sessions].reverse()));
      assert.deepEqual(order(first), order(second), "a DIFFERENT arrival order yields the same tile list");
    },
  },

  {
    name: "49/05 task00 — the same payload twice yields deep-equal tiles with identical keys and NO memo, a work item contributes a LABEL and never a row, and a row that can name no owner renders NO PANEL",
    run: async () => {
      const status = payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2"), row("win-host-a", "s-3"), free("win-host-a", "s-4"), free("aof-wsl", "s-5")]);
      const one = homeGridRows(status);
      const two = homeGridRows(status);
      assert.deepEqual(one, two, "the two tile lists are deep-equal");
      assert.notEqual(one, two, "…and the second call did not hand back the first call's object identity: no memo to go stale");
      const added = homeGridRows(payload([...status.sessions, row("aof-wsl", "s-0")]));
      for (const tile of one) {
        assert.ok(added.some((next) => next.key === tile.key), `every surviving tile's pane key is unchanged (${tile.key})`);
      }

      // `items[]` is JOINED, never enumerated.
      const items = [
        { ref: "49/05", assignment: { assignmentId: "a-s-1", state: "running", code: "needs-input" } },
        ...[1, 2, 3, 4].map((n) => ({ ref: `49/0${n}`, assignment: { assignmentId: `x-${n}`, state: "running" } })),
      ];
      const joined = homeGridRows(payload([row("aof-wsl", "s-1")], { items }));
      assert.equal(joined.length, 1, "exactly ONE tile — the four other items contribute none");
      assert.equal(homeSessionMount(joined[0].row, { axis: joined[0].axis }).ref, "49/05", "the tile's owner is the work-item ref");
      assert.equal(joined[0].mark, MARK_NEEDS_INPUT, "…and the item's assignment contributed a MARK");
      const unjoined = homeGridRows(payload([row("aof-wsl", "s-1", { workItem: { ref: "99/99", assignmentId: "a-9" } })], { items }));
      assert.equal(unjoined.length, 1, "a session whose ref matches NOTHING still renders its tile");
      assert.equal(homeSessionMount(unjoined[0].row, { axis: unjoined[0].axis }).ref, "99/99", "…still owned by that ref: a missing join loses a mark, never a session");

      // THE IDENTITY LINE, source-shaped — V1 satisfied without inventing an owner.
      const assigned = homeSessionMount(row("aof-wsl", "7f3a91c", { repo: "demo" }), { axis: "producer-known" });
      assert.equal(assigned.ref, "49/05");
      assert.equal(assigned.farEnd, "aof-wsl");
      assert.equal(assigned.detail, "session 7f3a91c");
      const freeMount = homeSessionMount(free("aof-wsl", "7f3a91c", { repo: "demo" }), { axis: "no-producer" });
      assert.equal(freeMount.ref, "demo", "a free session's owner is its REPO — a real field, never an invented one");
      assert.equal(freeMount.farEnd, "aof-wsl");

      // V1's other direction: no owner ⇒ NO PANEL, and it is not `unavailable`.
      const nameless = homeSessionMount(free("aof-wsl", "s-1", { repo: "" }), {});
      assert.equal(nameless.rendersPanel, false);
      assert.equal(nameless.bound, false);
      assert.equal(nameless.source, null);
      assert.deepEqual({ ...nameless.params }, {});
      assert.equal(nameless.noStream, "no-owner", "it names WHY through its own no-stream reason");
      assert.equal(nameless.unavailable, null, "…and `no stream` and `unavailable` stay different facts");

      // NOTHING ADDRESSABLE MEANS NO TILES, CALMLY — including the two fail-closed rows.
      for (const [name, status_] of [
        ["an empty mesh", payload([])],
        ["the measured live fleet", payload([], { nodes: [{ nodeId: "a", freshness: "live", activeRuns: ["r"] }, { nodeId: "b", freshness: "live", activeRuns: ["r"] }] })],
        ["every node gone quiet", payload([], { nodes: [{ nodeId: "a", freshness: "stale" }] })],
        ["the key is missing entirely", { scope: "global", items: [], nodes: [] }],
        ["the key is not an array", { scope: "global", sessions: {} }],
      ]) {
        assert.deepEqual(homeGridRows(status_), [], `${name}: the tile list is empty, and nothing is thrown`);
      }
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // TASK 01 — THE ONE THAT MATTERS MOST: a grid pane CONSTRUCTS A WEBSOCKET.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "49/05 task01 — a subscribed grid tile constructs exactly ONE socket, to `ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c`, and renders the pane host the xterm paints into",
    run: async () => {
      await withTerminalControl(home(payload([row("aof-wsl", "7f3a91c")])), (app) => {
        assert.equal(app.paneCount(), 1, "one addressable row, one tile");
        assert.equal(app.sockets().length, 1, "EXACTLY ONE socket was constructed — the milestone's headline");
        assert.equal(app.socket().url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c");
        assert.equal(app.paneHosts().length, 1, "the pane host `absolute inset-0` is in the tree — its ABSENCE was the shipped defect's whole outside signature");
        assert.equal(app.terminals().length, 1, "exactly one xterm was constructed");
        assert.equal(app.terminal().host?.parentElement?.tagName, "DIV", "…and it was opened into a pane that host owns");
        assert.equal(chipWord(app, app.pane(0)), "connecting…", "a bound pane that is not yet connected — never `idle`");
        assert.ok(!app.paneText().includes(IDLE_PANE_LINE), "the byte area does NOT read the dock's own idle line");
        assert.deepEqual(app.unattributedSockets(), [], "every socket landed on a pane");
      });
    },
  },

  {
    name: "49/05 task01 — the dialled URL follows the ORIGIN the surface was handed, scheme and authority both, and a `fleet`-role source with NO fleet origin dials nothing rather than borrowing `self`",
    run: async () => {
      for (const [name, origins, sockets, expected] of [
        ["the fleet on this machine", { self: FLEET, fleet: FLEET }, 1, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c"],
        ["a TLS fleet", { self: "https://fleet.example", fleet: "https://fleet.example" }, 1, "wss://fleet.example/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c"],
        ["a fleet on a named port", { self: "http://fleet.example:8080", fleet: "http://fleet.example:8080" }, 1, "ws://fleet.example:8080/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c"],
        ["NO FLEET ORIGIN AT ALL", { self: FLEET }, 0, null],
      ]) {
        await withTerminalControl(home(payload([row("aof-wsl", "7f3a91c")]), { origins }), (app) => {
          assert.equal(app.sockets().length, sockets, `${name}: ${sockets} socket(s)`);
          if (expected != null) assert.equal(app.socket().url, expected, `${name}: the scheme is MAPPED from the dialled origin, never defaulted, and no port is invented`);
        });
      }
    },
  },

  {
    name: "49/05 task01 — a grid of three subscribed tiles holds THREE sockets, one per tuple, with no cross-talk; an unaddressable row dials nothing; and the ramp moves on the socket's own events",
    run: async () => {
      await withTerminalControl(
        home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2"), row("win-host-a", "s-9")])),
        (app) => {
          assert.equal(app.sockets().length, 3, "three subscribed tiles, three sockets");
          assert.equal(app.terminals().length, 3, "…and three xterms, one per tile");
          const urls = app.panes().map((pane) => pane.socket().url);
          assert.deepEqual(
            urls,
            [
              "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=s-1",
              "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=s-2",
              "ws://127.0.0.1:4181/ws/terminal-view?nodeId=win-host-a&sessionId=s-9",
            ],
            "each URL carries its OWN nodeId and its OWN sessionId — none is a node-only subscription",
          );
          assert.deepEqual(app.unattributedSockets(), []);

          // THE RAMP, DRIVEN THROUGH THE MOUNTED COMPONENT.
          const pane = app.pane(0);
          pane.socket().accept();
          app.render();
          assert.equal(chipWord(app, app.pane(0)), "waiting for output");
          assert.ok(app.pane(0).paneText().includes(WAITING_PANE_LINE), "the byte area's top-left line reads `connected · waiting for first output`");
          assert.deepEqual(pane.socket().sent, [], "NO resize control frame was sent up it — a `mirror` is a `scale` source and declares none");
          pane.socket().deliver("hello\r\n");
          app.render();
          assert.equal(chipWord(app, app.pane(0)), "streaming");
          assert.deepEqual(app.pane(0).terminal().written, ["hello\r\n"], "exactly those bytes were written into the xterm");
          assert.equal(chipWord(app, app.pane(1)), "connecting…", "…and its neighbours are untouched");
          pane.socket().hangUp();
          app.render();
          assert.equal(chipWord(app, app.pane(0)), "stream ended");
          // THE BAR IS THERE, IN THE BYTE AREA'S OWN BOX, and it carries the word — so the tile's
          // height is not a function of whether a stream has ended.
          //
          // ⚠ CONTRACT CLASH, FLAGGED RATHER THAN SILENTLY RESOLVED. Task 01 says this bar is "in
          // a `role=\"status\"` region" and task 05 says it "stays `role=\"status\"`"; the
          // architect's F6 requires the opposite IN THIS HOST, because `role="status"` IS an
          // implicit polite live region and a dozen ended tiles is the very narration DG-49-7
          // exists to remove — while task 05's own headline forbids ANY `aria-live` inside a tile,
          // which rules out muting it with `aria-live="off"`. The three hosts that hold ONE pane
          // keep the role (asserted in the F5/F6 lane). The two clauses need an amendment.
          const bar = findAll(app.pane(0).section, (node) => String(node.props?.className ?? "").includes("shrink-0 border-t"))[0];
          assert.ok(bar != null, "the bar renders INSIDE the byte area's own box, as a sibling of the pane");
          assert.equal(visibleTextOf(bar), "stream ended", "…carrying the state's own word");
          assert.equal(bar.props?.role, undefined, "…and in THIS host it is not an implicit live region (F6)");

          // 80×24 AND NO RESIZE FRAME EVER.
          assert.equal(app.pane(1).terminal().cols, 80);
          assert.equal(app.pane(1).terminal().rows, 24);
          for (const socket of app.sockets()) {
            assert.ok(!socket.sent.some((frame) => String(frame).includes('"type":"resize"')), "no resize frame was ever sent up any socket");
          }
        },
      );

      // A HALF TUPLE OPENS NOTHING — and it is NOT the dashed `unavailable` block.
      for (const [name, bad] of [
        ["no session id", { sessionId: undefined }],
        ["an empty session id", { sessionId: "" }],
        ["a malformed session id", { sessionId: 42 }],
        ["no node", { nodeId: undefined }],
        ["neither half", { nodeId: undefined, sessionId: undefined }],
      ]) {
        await withTerminalControl(home(payload([{ ...row("aof-wsl", "7f3a91c"), ...bad }])), (app) => {
          assert.equal(app.sockets().length, 0, `${name}: NO socket was constructed`);
          assert.equal(app.terminals().length, 0, `${name}: no xterm either`);
          assert.equal(app.paneHosts().length, 0, `${name}: the pane host is absent from the tree`);
          assert.ok(!app.paneText().includes("unavailable"), `${name}: the pane is NOT the dashed \`unavailable\` block — this surface produces none`);
        });
      }
    },
  },

  {
    name: "49/05 task01 — an interactive grid pane registers exactly ONE keystroke sink and a keystroke reaches the socket verbatim, while the shipped fleet-card peek through the same harness registers NONE",
    run: async () => {
      await withTerminalControl(home(payload([row("aof-wsl", "7f3a91c")])), (app) => {
        const terminal = app.terminal();
        assert.equal(terminal.options.disableStdin, false, "the xterm was constructed with `disableStdin: false`…");
        assert.equal(terminal.options.cursorBlink, true, "…and a BLINKING…");
        assert.equal(terminal.options.cursorStyle, "block", "…BLOCK cursor");
        assert.equal(typeof terminal.dataHandler, "function", "exactly one keystroke sink is registered");
        app.socket().accept();
        app.render();
        terminal.dataHandler("ls\r");
        assert.deepEqual(app.socket().sent, ["ls\r"], "the keystroke appears on the socket's sent frames VERBATIM — never wrapped in a JSON envelope, and nothing else was sent");
      });

      // THE CONTRAST, so the clause above proves a DIFFERENCE rather than a constant: same
      // control, same source, same harness — only the MOUNT's posture differs.
      await withTerminalControl(
        {
          entry: path.join(repoRoot, "test", "support", "terminal-grid-entry.tsx"),
          exportName: "TerminalGrid",
          props: {
            panes: [
              {
                key: "card",
                host: HOST_FLEET_CARD,
                mount: fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "49/05" }),
                origins: ORIGINS,
              },
            ],
          },
        },
        (app) => {
          app.click(app.pane(0).buttonLabelled(WATCH_LABEL));
          assert.equal(app.sockets().length, 1, "exactly one socket, to the same tuple-bound route");
          assert.equal(app.socket().url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c");
          assert.equal(app.terminal().options.disableStdin, true, "the xterm was constructed with `disableStdin: true`");
          assert.equal(app.terminal().dataHandler, null, "NO keystroke sink is registered on it — not one registered and ignored");
        },
      );

      // …and the one declared thing that differs is the posture their MOUNT names.
      assert.equal(homeSessionMount(row("aof-wsl", "7f3a91c"), { axis: "producer-known" }).posture, POSTURE_INTERACTIVE);
      assert.equal(fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "49/05" }).posture, POSTURE_READ_ONLY);
    },
  },

  {
    name: "49/05 task01 — unmounting one tile closes ONLY its socket and disposes ONLY its xterm, and unmounting the grid leaves zero sockets open and zero xterms undisposed",
    run: async () => {
      await withTerminalControl(home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2"), row("win-host-a", "s-9")])), (app) => {
        const captured = app.panes().map((pane) => ({ socket: pane.socket(), terminal: pane.terminal() }));
        for (const { socket } of captured) socket.accept();
        app.render();
        captured[0].socket.deliver("zero\r\n");
        captured[2].socket.deliver("two\r\n");
        app.render();

        app.setProps({ status: payload([row("aof-wsl", "s-1"), row("win-host-a", "s-9")]), origins: ORIGINS });
        assert.equal(captured[1].socket.closed, true, "the departed tile's socket is closed…");
        assert.equal(captured[1].terminal.disposed, true, "…and its xterm disposed");
        assert.equal(captured[0].socket.closed, false, "the other two sockets are still open…");
        assert.equal(captured[2].socket.closed, false);
        assert.deepEqual(captured[0].terminal.written, ["zero\r\n"], "…and their terminals still hold their scrollback");
        assert.deepEqual(captured[2].terminal.written, ["two\r\n"]);

        app.unmount();
        assert.equal(app.sockets().filter((socket) => !socket.closed).length, 0, "zero sockets remain open");
        assert.equal(app.terminals().filter((terminal) => !terminal.disposed).length, 0, "zero xterms remain undisposed");
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // TASK 02 — THE HONEST FEED STATES.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "49/05 task02 — a session with a real tuple and NO assignment relaying it opens NO socket and says `no live output`, while a pane with a producer whose socket is open and silent says something different",
    run: async () => {
      await withTerminalControl(home(payload([free("aof-wsl", "7f3a91c")])), (app) => {
        assert.equal(app.sockets().length, 0, "NO socket was constructed — the wire already said this tuple has no feeder");
        assert.equal(app.terminals().length, 0, "no xterm was constructed");
        assert.equal(chipWord(app, app.pane(0)), "no live output", "the chip reads exactly `no live output`");
        assert.ok(app.pane(0).paneText().includes(NO_LIVE_OUTPUT_REASON), "the pane line reads the injected sentence verbatim");
        assert.equal(app.pane(0).bar(), null, "there is no `role=\"status\"` bar");
        const motion = findAll(app.pane(0).section, (node) => typeof node.props?.className === "string" && node.props.className.includes("animate-"));
        assert.deepEqual(motion, [], "the pane carries no motion class at all");
        assert.ok(!app.pane(0).paneText().includes("unavailable"), "…and it is NOT the dashed `unavailable` block");
        // The state behind that chip is one of the seven the shipped ramp already declares.
        const descriptor = describeTerminalState(TERMINAL_STATES.IDLE, { owner: "demo", reason: NO_LIVE_OUTPUT_REASON });
        assert.ok(TERMINAL_STATE_LIST.includes(descriptor.state), "no eighth word exists anywhere in the tree");
        assert.equal(descriptor.opensSocket, false, "…and `idle` now carries the structural half of `no socket is opened`");
      });

      await withTerminalControl(home(payload([row("aof-wsl", "7f3a91c")])), (app) => {
        assert.equal(app.sockets().length, 1, "a row WITH a producer constructs exactly one socket");
        app.socket().accept();
        app.render();
        assert.equal(chipWord(app, app.pane(0)), "waiting for output", "…and says the socket is open and the far end is silent");
        assert.ok(app.pane(0).paneText().includes(WAITING_PANE_LINE));
      });
    },
  },

  {
    name: "49/05 task02 — the injected sentence is honoured on `waiting`/`idle` ALONE: a pane that received bytes keeps its own, stronger, observed fact",
    run: async () => {
      const reason = NO_LIVE_OUTPUT_REASON;
      const rows = [
        ["nothing has arrived", TERMINAL_STATES.WAITING, {}, "no live output", reason],
        ["nothing is BOUND", TERMINAL_STATES.IDLE, {}, "no live output", reason],
        ["bytes actually arrived", TERMINAL_STATES.STREAMING, {}, "streaming", "streaming"],
        ["the stream ended", TERMINAL_STATES.ENDED, {}, "stream ended", "stream ended"],
        ["the stream failed", TERMINAL_STATES.ERROR, { cause: "transport" }, "error", "disconnected — the stream dropped"],
        ["the far end exited badly", TERMINAL_STATES.ENDED, { exitCode: 1 }, "exited (1)", "exited (1)"],
      ];
      for (const [name, state, facts, chip, line] of rows) {
        const descriptor = describeTerminalState({ state, ...facts }, { owner: "49/05", reason, ...facts });
        assert.equal(descriptor.text, chip, `${name}: the chip reads ${chip}`);
        assert.equal(descriptor.paneLine, line, `${name}: the pane's own line`);
      }
    },
  },

  {
    name: "49/05 task02 — no degraded roster condition produces an `unavailable` pane here, a pane whose row LEAVES the index keeps its socket and its word and gains an annotation, and `needs input` is a quiet mark keyed on the EXACT word",
    run: async () => {
      // DG-49-10: five conditions, no `unavailable`, and no home module names one of its causes.
      for (const [name, status] of [
        ["a machine gone quiet", payload([], { nodes: [{ nodeId: "aof-wsl", freshness: "stale" }] })],
        ["a machine never seen", payload([], { nodes: [{ nodeId: "aof-wsl", freshness: "unknown" }] })],
        ["the relay never fed this tuple", payload([free("aof-wsl", "s-1")])],
      ]) {
        for (const tile of homeGridRows(status)) {
          assert.equal(homeSessionMount(tile.row, { axis: tile.axis }).unavailable, null, `${name}: every mount carries \`unavailable: null\``);
        }
      }

      // A TUPLE THAT LEAVES THE INDEX WHILE ITS PANE HOLDS BYTES: the socket stays open, the chip
      // keeps the word the pane can OBSERVE, and the tile gains an annotation naming the ROSTER.
      await withTerminalControl(home(payload([row("aof-wsl", "7f3a91c"), row("win-host-a", "s-9")])), (app) => {
        const socket = app.pane(0).socket();
        socket.accept();
        app.render();
        socket.deliver("work\r\n");
        app.render();
        assert.equal(chipWord(app, app.pane(0)), "streaming");

        app.setProps({ status: payload([row("win-host-a", "s-9")]), origins: ORIGINS });
        assert.equal(app.paneCount(), 2, "the tile is NOT removed from the grid while it holds bytes");
        assert.equal(socket.closed, false, "the socket is still open — no poll closes a stream");
        assert.equal(chipWord(app, app.pane(0)), "streaming", "the chip still reads `streaming`, because that is what the pane can observe");
        const text = app.pane(0).paneText();
        assert.ok(text.includes("the mesh no longer lists this session"), "the tile carries an annotation naming the ROSTER");
        for (const word of ["board unreachable", "no fleet origin", "not checked out on this machine"]) {
          assert.ok(!text.includes(word), `…and never an origin, a board or a workspace (${word})`);
        }
        socket.hangUp();
        app.render();
        assert.equal(chipWord(app, app.pane(0)), "stream ended", "…and when the stream itself ends it reads `stream ended`, in place");
      });

      // AGENT STATE — the second axis, fixture-rendered, keyed on the EXACT word.
      const marks = [
        ["the agent is blocked", "needs-input", MARK_NEEDS_INPUT],
        ["nothing is asserted", undefined, null],
        ["an unfamiliar code", "something-new", null],
        ["a RESUMED session", "resumed", null],
      ];
      for (const [name, code, mark] of marks) {
        const items = [{ ref: "49/05", assignment: { assignmentId: "a-s-1", state: "running", ...(code == null ? {} : { code }) } }];
        assert.equal(homeGridRows(payload([row("aof-wsl", "s-1")], { items }))[0].mark, mark, `${name}: the mark is ${mark ?? "ABSENT"}`);
      }
      assert.equal(homeGridRows(payload([free("aof-wsl", "s-1")]))[0].mark, null, "a free session has no assignment to carry a code, so NO mark renders");

      await withTerminalControl(
        home(payload([row("aof-wsl", "s-1")], { items: [{ ref: "49/05", assignment: { assignmentId: "a-s-1", state: "running", code: "needs-input" } }] })),
        (app) => {
          assert.ok(app.pane(0).paneText().includes(MARK_NEEDS_INPUT), "the pill renders on the identity row");
          const pills = findAll(app.pane(0).section, (node) => visibleTextOf(node) === MARK_NEEDS_INPUT && typeof node.props?.className === "string");
          assert.equal(pills.length, 1, "exactly ONE pill, carrying no motion class");
          assert.ok(!pills[0].props.className.includes("animate-"));
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // TASK 03 — THE CAP HOLDS THE REST.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "49/05 task03 — twenty addressable rows at a cap of sixteen render TWENTY tiles and construct SIXTEEN sockets; each held tile keeps its identity, renders a box with ONE centred line naming the limit, no chip, and NO toggle",
    run: async () => {
      const rows = Array.from({ length: 20 }, (_, index) => row("aof-wsl", `s-${String(index).padStart(2, "0")}`));
      await withTerminalControl(home(payload(rows)), (app) => {
        assert.equal(app.paneCount(), 20, "there are twenty tiles");
        assert.equal(app.sockets().length, MAX_LIVE_PANES, `exactly ${MAX_LIVE_PANES} sockets were constructed`);
        assert.equal(app.terminals().length, MAX_LIVE_PANES);
        const held = app.pane(19);
        assert.ok(held.paneText().includes("49/05"), "the held tile renders its identity line…");
        assert.ok(held.paneText().includes("aof-wsl"), "…and its far end");
        assert.equal(held.sockets().length, 0, "…and holds no socket");
        assert.equal(chipWord(app, held), null, "no held tile renders a state chip at all");
        assert.equal(held.buttonLabelled(WATCH_LABEL), null, "at the cap NO worded toggle is rendered on that tile");
        assert.ok(
          held.paneText().includes(`${HELD_LINE} — ${MAX_LIVE_PANES} live panes already · hide one to watch this`),
          "…and its ONE line names the limit and the exact recovery, from the CONFIGURED number",
        );
        assert.equal(held.paneHosts().length, 0, "no held tile renders a terminal, a dimmed last frame or an invented one");
        const decoration = findAll(held.section, (node) => typeof node.props?.className === "string" && /animate-|border-dashed|text-red|opacity-60/.test(node.props.className));
        assert.deepEqual(decoration, [], "nothing about a held tile is red, dotted, animated or dashed");
      });
    },
  },

  {
    name: "49/05 task03 — the number of constructed sockets NEVER exceeds the configured cap (0, 1, 16, 20), the held line follows whether a slot is free, and nothing is demoted behind the operator's back",
    run: async () => {
      // The line and the toggle, at the two held forms — driven through the sentence's own author.
      assert.equal(heldPaneLine({ subscribed: false, cause: null, cap: MAX_LIVE_PANES }), HELD_LINE, "a slot is free: the line is the bare fact");
      assert.equal(heldPaneLine({ cause: HELD_AT_CAP, cap: 16 }), `${HELD_LINE} — 16 live panes already · hide one to watch this`);
      assert.equal(heldPaneLine({ cause: HELD_AT_CAP, cap: 4 }), `${HELD_LINE} — 4 live panes already · hide one to watch this`, "a smaller configured cap changes the sentence — a hard-coded 16 fails here");

      await withTerminalControl(home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2"), row("aof-wsl", "s-3")])), (app) => {
        assert.equal(app.sockets().length, 3, "fewer rows than the cap: every row streams");
        // THE EXCHANGE IS THE OPERATOR'S: hiding frees a slot and its socket closes.
        const socket = app.pane(0).socket();
        const terminal = app.pane(0).terminal();
        app.click(app.pane(0).buttonLabelled(HIDE_LABEL));
        assert.equal(socket.closed, true, "that tile's socket is closed…");
        assert.equal(terminal.disposed, true, "…and its xterm disposed");
        assert.equal(app.pane(0).buttonLabelled(WATCH_LABEL) != null, true, "…and it now renders the held treatment with a free slot");
        assert.ok(app.pane(0).paneText().includes(HELD_LINE));
        assert.equal(app.sockets().filter((s) => !s.closed).length, 2, "the other two are untouched — nothing stops streaming that the operator did not release");

        app.click(app.pane(0).buttonLabelled(WATCH_LABEL));
        assert.equal(app.sockets().length, 4, "watching again constructs exactly ONE new socket");
        assert.equal(app.sockets().filter((s) => !s.closed).length, 3, "…and the total open is still at most the cap");
        assert.notEqual(app.pane(0).socket(), socket, "the pane starts from whatever bounded tail the mirror still holds, never the operator's earlier scrollback");
      });
    },
  },

  {
    name: "49/05 task03 — no tile offers a dismissal: the only subscribe/unsubscribe control is the worded toggle, a held tile offers NO expand control and a subscribed one DOES",
    run: async () => {
      await withTerminalControl({ ...home(payload([row("aof-wsl", "s-1")])), shell: true }, (app) => {
        assert.equal(app.pane(0).button("Close terminal dock"), null, "no tile renders an `✕` or any other close control");
        assert.equal(app.pane(0).button("Restart session"), null, "…and no restart, which cannot re-spawn another machine's PTY");
        assert.ok(app.pane(0).button("Expand terminal to full screen") != null, "a subscribed tile DOES offer an expand control");
        assert.ok(app.pane(0).buttonLabelled(HIDE_LABEL) != null, "…and the worded toggle, carrying its subscription cost");
      });

      const rows = Array.from({ length: 17 }, (_, index) => row("aof-wsl", `s-${String(index).padStart(2, "0")}`));
      await withTerminalControl({ ...home(payload(rows)), shell: true }, (app) => {
        assert.equal(app.pane(16).button("Expand terminal to full screen"), null, "a held tile offers NO expand control, because there is no pane to present");
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // TASK 04 — FOCUS AND EXPAND.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "49/05 task04 — a grid of twelve tiles is ONE tab stop: exactly one tile carries `tabindex=\"0\"`, every other carries `-1`, and no xterm host or byte-area element is in the tab order",
    run: async () => {
      const rows = Array.from({ length: 12 }, (_, index) => row("aof-wsl", `s-${String(index).padStart(2, "0")}`));
      await withTerminalControl({ ...home(payload(rows)), shell: true }, (app) => {
        const stops = app.panes().filter((pane) => pane.section.props?.tabIndex === 0);
        assert.equal(stops.length, 1, "exactly one tile is in the page tab order");
        assert.equal(stops[0].index, 0, "…and with nothing focused yet it is the first");
        for (const pane of app.panes()) {
          if (pane.index === stops[0].index) continue;
          assert.equal(pane.section.props?.tabIndex, -1, `tile ${pane.index} carries tabindex="-1"`);
        }
        for (const host of app.paneHosts()) {
          assert.equal(host.props?.tabIndex, -1, "no xterm host anywhere in the grid is in the tab order");
        }
        // …and the focused tile's own controls follow IT in DOM order: the tile itself is the
        // stop, then the expand control, then the worded toggle. Nothing inside the byte area is
        // focusable at all.
        const focusables = app.pane(0).focusables().map((node) => node.props?.["aria-label"] ?? visibleTextOf(node));
        assert.deepEqual(
          focusables,
          [app.pane(0).label(), "Expand terminal to full screen", HIDE_LABEL],
          "the tile, then the expand control, then the worded toggle",
        );
      });
    },
  },

  {
    name: "49/05 task04 — arrows traverse the grid by its RENDERED geometry (at one column `→` and `↓` are the same move), and the answer is always a key that is in the rendered list",
    run: async () => {
      const keys = Array.from({ length: 12 }, (_, index) => `k-${index}`);
      for (const [name, columns, from, key, to] of [
        ["next in reading order", 3, 4, "ArrowRight", 5],
        ["previous in reading order", 3, 4, "ArrowLeft", 3],
        ["down a column", 3, 4, "ArrowDown", 7],
        ["up a column", 3, 4, "ArrowUp", 1],
        ["one column at 390", 1, 4, "ArrowRight", 5],
        ["one column, down", 1, 4, "ArrowDown", 5],
        ["first", 3, 7, "Home", 0],
        ["last", 3, 2, "End", 11],
      ]) {
        const answer = homeGridFocus(keys, keys[from], columns, key);
        assert.equal(answer, keys[to], `${name}: focus moves to index ${to}`);
        assert.ok(keys.includes(answer), `${name}: focus never leaves the grid by an arrow`);
      }
      // At an EDGE the answer is still a rendered key (clamped — the design gap is routed, and
      // what is pinned is only the invariant).
      for (const key of ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]) {
        assert.ok(keys.includes(homeGridFocus(keys, keys[0], 3, key)));
        assert.ok(keys.includes(homeGridFocus(keys, keys[11], 3, key)));
      }
      // FOCUS SURVIVES THE POLL, because it is stored as a PANE KEY and never as an index.
      assert.equal(homeGridFocusAfterPoll(["a", "b", "c"], "b", ["b", "c"]), "b", "a row that sorts ABOVE the focused one does not move the stop");
      assert.equal(homeGridFocusAfterPoll(["a", "c"], "b", ["a", "b", "c"]), "c", "…and if the focused tile is genuinely removed, the stop moves to the nearest surviving tile in grid order");
    },
  },

  {
    name: "49/05 task04 — `Enter` on a focused tile presents THAT pane fullscreen for the price of a layout change: one present request, the pane's own id, the SAME live node, and not one socket or xterm more",
    run: async () => {
      await withTerminalControl({ ...home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2")])), shell: true }, (app) => {
        const pane = app.pane(1);
        pane.socket().accept();
        app.render();
        pane.socket().deliver("painted scrollback\r\n");
        app.render();
        const sockets = app.sockets().length;
        const terminals = app.terminals().length;
        const scrollback = [...pane.terminal().written];

        app.focus(app.pane(1).section);
        app.press("Enter");

        const presents = app.shell.presents();
        assert.equal(presents.length, 1, "the shell received exactly ONE present request");
        assert.ok(presents[0].id.startsWith("terminal:"), "its id is `terminal:` plus the pane's own session key");
        assert.equal(typeof presents[0].node, "object", "the request's `node` is a live DOM element handed for adoption");
        assert.equal(presents[0].node.tagName, "DIV");
        assert.equal(app.sockets().length, sockets, "the number of constructed sockets is unchanged");
        assert.equal(app.terminals().length, terminals, "…and so is the number of constructed xterms");
        assert.deepEqual(app.pane(1).terminal().written, scrollback, "…and the written scrollback: presenting re-subscribed nothing");

        // THE MOUSE EQUIVALENT REACHES THE SAME DOOR, and the header's own controls do not.
        app.click(app.pane(0).paneHost());
        const second = app.shell.presents();
        assert.equal(second.length, 2, "a click into the byte area presents through the same request");
        app.click(app.pane(0).buttonLabelled(HIDE_LABEL));
        assert.equal(app.shell.presents().length, 2, "clicking the header's own controls does NOT present the pane");
      });
    },
  },

  {
    name: "49/05 task04 — the three deltas: an occupant opened from a tile claims `Escape` exactly when it can type, the request NAMES where focus presents, and `opener` is the TILE for a pane-activation form",
    run: async () => {
      // DELTA 1 and DELTA 2, from the request itself — one derivation, two fields.
      const interactive = terminalFullscreenRequest({ source: MIRROR, posture: POSTURE_INTERACTIVE, sessionKey: "k", label: "l" });
      const readOnly = terminalFullscreenRequest({ source: MIRROR, posture: POSTURE_READ_ONLY, sessionKey: "k", label: "l" });
      assert.equal(interactive.claimsEscape, true, "the ordinary grid tile claims `Escape` — it is a live keystroke for the far end's TUI");
      assert.equal(readOnly.claimsEscape, false, "a pane with no input route does not, so `Escape` still dismisses");
      assert.equal(interactive.focusOnPresent, FOCUS_PRESENTS_TERMINAL, "opened to type: focus presents in the terminal itself");
      assert.equal(readOnly.focusOnPresent, FOCUS_PRESENTS_EXIT, "opened to read: focus presents on the exit control");

      // DELTA 3 — the return target is the element carrying the PRESENTING affordance's form.
      const button = { tagName: "BUTTON" };
      const tile = { tagName: "SECTION" };
      // WHERE A HOST DECLARES ITS PANE A DOOR, THE PANE IS THE RETURN TARGET WHICHEVER DOOR WAS
      // USED — corrected against a measurement: the expand BUTTON returned focus to itself, and
      // §S3 delta 3 forbids returning "to a button inside the tile" because the tile is the roving
      // stop. A caller passes `pane` only for a pane-activation host, so the icon control's own
      // hosts are byte-identical.
      assert.equal(fullscreenOpenerFor(FORM_PANE_ACTIVATION, { control: button, pane: tile }), tile, "the TILE for pane-activation");
      assert.equal(fullscreenOpenerFor(FORM_ICON_CONTROL, { control: button, pane: tile }), tile, "…and for the icon control ON THAT SAME HOST, because the stop is what focus must come back to");
      assert.equal(fullscreenOpenerFor(FORM_ICON_CONTROL, { control: button, pane: null }), button, "…while a host with no pane door returns to its button, exactly as the dock and the card always did");

      // …and the shell is handed the tile when `Enter` opened it.
      await withTerminalControl({ ...home(payload([row("aof-wsl", "s-1")])), shell: true }, (app) => {
        app.focus(app.pane(0).section);
        app.press("Enter");
        const request = app.shell.presents()[0];
        assert.equal(request.opener, app.nodeFor(app.pane(0).section), "the value the shell carries as `restoreFocusTo` is the TILE element, not the expand control");
        assert.equal(request.focusOnPresent, FOCUS_PRESENTS_TERMINAL, "…and the request names where focus presents");
      });

      // `Escape` ON THE GRID ITSELF IS INERT.
      await withTerminalControl({ ...home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2")])), shell: true }, (app) => {
        app.focus(app.pane(0).section);
        app.press("Escape");
        assert.deepEqual(app.shell.events(), [], "no present request and no dismiss was issued");
        assert.equal(app.paneCount(), 2, "no tile was removed, hidden or unsubscribed");
        assert.equal(app.pane(0).section.props?.tabIndex, 0, "…and the focused pane key is unchanged");
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // TASK 05 — ONE LIVE REGION, NOT N.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "49/05 task05 — a grid of twelve subscribed tiles carries EXACTLY ONE live region, it is the grid's own and outside every tile, and every tile still renders its state word",
    run: async () => {
      const rows = Array.from({ length: 12 }, (_, index) => row("aof-wsl", `s-${String(index).padStart(2, "0")}`));
      await withTerminalControl(home(payload(rows)), (app) => {
        const regions = liveRegions(app.tree());
        assert.equal(regions.length, 1, "exactly one node in the whole rendered tree carries an `aria-live` attribute");
        assert.equal(regions[0].props["aria-live"], "polite", "…and its value is `polite`");
        for (const pane of app.panes()) {
          assert.deepEqual(liveRegions(pane.section), [], `tile ${pane.index} carries no live region…`);
          assert.deepEqual(findAll(pane.section, (node) => node.props?.["aria-atomic"] != null || node.props?.role === "alert"), [], "…and no `aria-atomic` or `role=\"alert\"`");
          // SIGNAL 1 IS UNTOUCHED: the word still renders.
          assert.equal(chipWord(app, pane), "connecting…", `tile ${pane.index} still renders its state chip`);
        }
        assert.deepEqual(findAll(app.tree(), (node) => node.props?.["aria-live"] === "assertive"), [], "nothing anywhere is `assertive`");
        // TWELVE PANES MUST BE TELLABLE APART.
        const names = app.panes().map((pane) => pane.label());
        assert.equal(new Set(names).size, names.length, "no two tiles share an accessible name");
        for (const name of names) assert.notEqual(name, "Terminal", "no tile's accessible name is the bare word `Terminal`");
      });
    },
  },

  {
    name: "49/05 task05 — the control's other three hosts KEEP their own per-pane announcement, and it is still the state chip's own span",
    run: async () => {
      assert.equal(hostAnnouncesState(HOST_BOARD_DOCK), true, "the board's own PTY announces");
      assert.equal(hostAnnouncesState(HOST_FLEET_CARD), true, "the fleet card peek announces");
      assert.equal(hostAnnouncesState(HOST_FULLSCREEN), true, "the expanded pane announces — one pane, in a dialog, as it always was");
      assert.equal(hostAnnouncesState(HOST_GRID_PANE), false, "…and the grid tile is the ONE host that does not");

      const cases = [
        ["the board's own PTY", HOST_BOARD_DOCK, boardDockMount({ kind: "local-pty", ref: "46/01", command: "x" })],
        ["the board mirroring a worker", HOST_BOARD_DOCK, boardDockMount({ kind: "mirror", ref: "46/01", nodeId: "aof-wsl", sessionId: "7f3a91c" })],
      ];
      for (const [name, host, mount] of cases) {
        await withTerminalControl({ host, mount, origins: { self: "http://127.0.0.1:41773", fleet: FLEET } }, (app) => {
          const regions = liveRegions(app.tree());
          assert.equal(regions.length, 1, `${name}: exactly one node carries \`aria-live="polite"\``);
          assert.equal(regions[0].props["aria-live"], "polite");
          assert.equal(app.chip(), "connecting…", `${name}: it is the state chip's own span, exactly where it has always been`);
        });
      }
      // The fleet card, driven through its own mount and its own toggle.
      await withTerminalControl(
        {
          host: HOST_FLEET_CARD,
          mount: fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "49/05" }),
          origins: ORIGINS,
        },
        (app) => {
          app.click(app.buttonLabelled(WATCH_LABEL));
          assert.equal(liveRegions(app.tree()).length, 1, "the fleet card peek keeps its own announcement");
          assert.equal(app.chip(), "connecting…");
        },
      );
    },
  },

  {
    name: "49/05 task05 — the grid announces exactly THREE kinds of change, each naming its session, and is SILENT for an unfocused pane, an unchanged poll and bytes",
    run: async () => {
      const tiles = (sessions, items) => homeGridRows(payload(sessions, items == null ? {} : { items }));
      const before = tiles([row("aof-wsl", "s-1"), row("aof-wsl", "s-2")]);
      const focusedKey = before[0].key;

      assert.equal(
        homeGridAnnouncement(before, before, { focusedKey, previousState: "waiting", state: "streaming" }),
        "49/05 → aof-wsl: streaming",
        "the focused pane's state change names that tile's identity and its new state word",
      );
      assert.equal(
        homeGridAnnouncement(before, tiles([row("aof-wsl", "s-1")]), { focusedKey }),
        "session ended: 49/05 → aof-wsl",
        "a session that left is named",
      );
      assert.equal(
        homeGridAnnouncement(tiles([row("aof-wsl", "s-1")]), before, { focusedKey }),
        "session appeared: 49/05 → aof-wsl",
        "…and so is one that arrived",
      );
      const marked = tiles(
        [row("aof-wsl", "s-1"), row("aof-wsl", "s-2")],
        [{ ref: "49/05", assignment: { assignmentId: "a-s-1", state: "running", code: "needs-input" } }],
      );
      assert.equal(homeGridAnnouncement(before, marked, { focusedKey }), "1 pane needs input", "the blocked count is announced as a NUMBER");
      assert.equal(
        marked.filter((tile) => tile.mark === MARK_NEEDS_INPUT).length,
        1,
        "…and it equals the number of tiles rendering the mark, derived from the same rows rather than counted from the DOM",
      );

      // ROWS 5-7 — THE POINT OF THE WHOLE TASK.
      assert.equal(
        homeGridAnnouncement(before, before, { focusedKey: before[1].key, previousState: null, state: null }),
        null,
        "an UNFOCUSED pane changing state announces NOTHING",
      );
      assert.equal(homeGridAnnouncement(before, before, { focusedKey }), null, "an unchanged poll is silent");
      assert.equal(homeGridAnnouncement(before, before, { focusedKey, previousState: "streaming", state: "streaming" }), null, "…and bytes arriving move nothing");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE NON-REGRESSION BAR: these are edits to the SHARED control, so the other hosts are driven.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "49/05 — the three shared-core edits leave the board dock and the fleet card BYTE-IDENTICAL: the default idle line survives, the rest-pane declarations are unchanged, and the standing is inert when absent",
    run: async () => {
      // The DEFAULT line survives verbatim for a caller that injects nothing.
      const idle = describeTerminalState(TERMINAL_STATES.IDLE, { owner: "46/01" });
      assert.equal(idle.paneLine, IDLE_PANE_LINE, "an `idle` pane with no injected reason still reads the dock's own line");
      assert.equal(idle.text, "idle", "…and its chip is still the ramp's own word");
      assert.equal(idle.opensSocket, false, "…while gaining the structural half of `no socket is opened`");

      // THE STANDING IS INERT WHEN ABSENT — every host m46 shipped is unchanged, by value.
      for (const host of [HOST_BOARD_DOCK, HOST_FLEET_CARD, HOST_FULLSCREEN]) {
        const stance = terminalPaneStanding(host, null, true);
        assert.equal(stance.subscribed, true, `${host}: the control's own state decides`);
        assert.equal(stance.offersToggle, true, `${host}: no control is withheld`);
        assert.equal(stance.tabIndex, undefined, `${host}: no tabindex is added to the rendered props`);
        assert.equal(stance.activatesPane, false, `${host}: the byte area activates nothing`);
        assert.equal(stance.mark, null);
        assert.equal(stance.note, null);
      }

      // …and the dock still opens its socket, paints its pane and renders one header row.
      await withTerminalControl(
        { host: HOST_BOARD_DOCK, mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "/aof:build 46/01" }), origins: { self: "http://127.0.0.1:41773", fleet: FLEET } },
        (app) => {
          assert.equal(app.sockets().length, 1, "the dock still constructs its socket");
          assert.equal(app.socket().url, "ws://127.0.0.1:41773/ws/terminal?ref=46%2F01&provider=claude");
          assert.equal(app.paneHosts().length, 1);
          assert.equal(app.chip(), "connecting…", "…and its chip still announces from its own span");
          assert.equal(findAll(app.tree(), (node) => node.type === "header").length, 1, "…in ONE header row");
        },
      );

      // …and the fleet card's rest state is still HEADER-ONLY: the byte-area presence is a host
      // declaration, so giving the grid a box did not give the card one.
      await withTerminalControl(
        { host: HOST_FLEET_CARD, mount: fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "49/05" }), origins: ORIGINS },
        (app) => {
          assert.equal(app.sockets().length, 0, "a card at rest holds no socket…");
          assert.equal(app.paneHosts().length, 0, "…and renders no byte area at all");
          assert.equal(app.paneText().includes(IDLE_PANE_LINE), false, "…and no idle line either");
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE ARCHITECT'S SIX (F1-F6), each with the measurement that now holds where it did not.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "49/05 F1 — a socket is a socket: under four-leave/four-arrive CHURN the grid holds at most MAX_LIVE_PANES sockets, because a RETAINED tile is an argument to the arbiter and not invisible to it",
    run: async () => {
      const first = Array.from({ length: MAX_LIVE_PANES }, (_, index) => row("aof-wsl", `s-${String(index).padStart(2, "0")}`));
      await withTerminalControl(home(payload(first)), (app) => {
        assert.equal(app.sockets().length, MAX_LIVE_PANES, "sixteen rows at a cap of sixteen: sixteen sockets");
        // Every pane paints, so every departing tile earns retention — the worst case for I1.
        for (const pane of app.panes()) {
          pane.socket().accept();
        }
        app.render();
        for (const pane of app.panes()) {
          pane.socket().deliver("work\r\n");
        }
        app.render();

        // FOUR LEAVE, FOUR ARRIVE, in one poll.
        const next = [...first.slice(4), ...Array.from({ length: 4 }, (_, index) => row("aof-wsl", `n-${index}`))];
        app.setProps({ status: payload(next), origins: ORIGINS });

        const open = app.sockets().filter((socket) => !socket.closed).length;
        assert.ok(
          open <= MAX_LIVE_PANES,
          `ADR-006 I1 holds under churn: ${open} open sockets at a cap of ${MAX_LIVE_PANES} (it was 20 before this fix)`,
        );
        assert.equal(app.paneCount(), MAX_LIVE_PANES + 4, "…and the four retained tiles are still LISTED — they were not removed, they were counted");
      });
    },
  },

  {
    name: "49/05 F2 — retention EXPIRES: a retained tile whose socket ends is gone on the next poll, rather than a ghost pane that outlives its row forever",
    run: async () => {
      await withTerminalControl(home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2")])), (app) => {
        const socket = app.pane(0).socket();
        socket.accept();
        app.render();
        socket.deliver("work\r\n");
        app.render();

        app.setProps({ status: payload([row("aof-wsl", "s-2")]), origins: ORIGINS });
        assert.equal(app.paneCount(), 2, "the tile is retained while it holds bytes…");

        socket.hangUp();
        app.render();
        assert.equal(app.paneCount(), 2, "…it ENDS IN PLACE rather than vanishing mid-sentence…");
        assert.equal(chipWord(app, app.pane(0)), "stream ended");

        app.setProps({ status: payload([row("aof-wsl", "s-2")]), origins: ORIGINS });
        assert.equal(app.paneCount(), 1, "…and the NEXT poll spends the courtesy: no ghost pane (it stayed forever before this fix)");
      });
    },
  },

  {
    name: "49/05 F3/F4 — a RETAINED tile offers no fullscreen door (its only typing path), and `Hide terminal` on a `no-producer` tile really hides it",
    run: async () => {
      await withTerminalControl({ ...home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2")])), shell: true }, (app) => {
        const socket = app.pane(0).socket();
        socket.accept();
        app.render();
        socket.deliver("work\r\n");
        app.render();
        assert.ok(app.pane(0).button("Expand terminal to full screen") != null, "a listed tile offers the door…");
        app.setProps({ status: payload([row("aof-wsl", "s-2")]), origins: ORIGINS });
        assert.equal(
          app.pane(0).button("Expand terminal to full screen"),
          null,
          "…and a RETAINED tile does not: the door is this surface's only typing path, so withholding it withholds the keyboard from a session the mesh no longer lists — at zero identity cost",
        );
        assert.equal(socket.closed, false, "…and the socket it is annotating is still open, because the posture never moved");
      });

      // F4 — ONE AUTHORITY PER POPULATION, each keyed on a STATED input. The fall-through this
      // replaced hard-coded `true` for every tile the arbiter is never asked about, so the
      // control's own write was discarded and the operator's spend vanished.
      //
      // RE-AIMED by the designer's GAP-1 ruling, which landed after this fix and REMOVED the
      // toggle from that population entirely (a pane that binds nothing has no subscription to
      // release). So the authority is asserted where it now lives — the declaration — rather than
      // through a control that is correctly no longer offered.
      assert.equal(terminalPaneStanding(HOST_GRID_PANE, { subscribed: false }, true, true).subscribed, false, "a stated answer wins over the control's own state…");
      assert.equal(terminalPaneStanding(HOST_GRID_PANE, {}, true, true).subscribed, true, "…and where the surface states none, the control decides — never a hard-coded literal in between");
    },
  },

  {
    name: "49/05 SEVERE — the browser's OWN sequential focus order never enters a tile's terminal: xterm's helper textarea is not a tab stop, no keystroke reaches a far end from a tile that was merely tabbed to, and presenting puts focus IN the terminal",
    run: async () => {
      // WHY THIS LANE EXISTS AND THE OLD ONE COULD NOT CATCH IT. Counting `tabindex="0"` on the
      // RENDERED tree measures the roving stop and nothing else — and the element a browser
      // actually lands on is created by xterm INSIDE the pane, with `tabIndex = 0` set in its own
      // `open()`. Measured on the deployed build: Tab reached that textarea, ten further presses
      // never left it, Shift+Tab did not either, and EIGHT TAB CHARACTERS were relayed to the far
      // end. So this lane walks every element a sequential-focus algorithm would visit — the
      // rendered focusables AND the terminal's own helper textarea — rather than counting an
      // attribute.
      await withTerminalControl({ ...home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2")])), shell: true }, (app) => {
        const stops = [];
        for (const pane of app.panes()) {
          for (const node of pane.focusables()) stops.push(node.props?.["aria-label"] ?? visibleTextOf(node));
          const textarea = pane.terminal()?.textarea ?? null;
          assert.ok(textarea != null, `pane ${pane.index} really has an xterm helper textarea to be wrong about`);
          assert.equal(textarea.tabIndex, -1, `pane ${pane.index}: the inline xterm is NOT a keyboard focus target (DG-49-5) — it was 0, by xterm's own construction`);
          if (textarea.tabIndex >= 0) stops.push("TERMINAL INPUT");
        }
        assert.ok(!stops.includes("TERMINAL INPUT"), `the browser's own focus order never enters a byte area: ${JSON.stringify(stops)}`);

        // …AND NOTHING IS RELAYED FROM A TILE THAT WAS MERELY TABBED TO.
        app.pane(0).socket().accept();
        app.render();
        app.focus(app.pane(0).section);
        app.press("Tab");
        assert.deepEqual(app.pane(0).socket().sent, [], "a tile that was tabbed to relays NOTHING to the far end");

        // …while PRESENTING puts focus inside the terminal, which is where the keystrokes go.
        app.press("Enter");
        app.runFrames();
        assert.equal(app.pane(0).terminal().textarea.focused, true, "focus presents INSIDE the terminal (S3 delta 2) — it was on the pane host div, and typing sent nothing");
        assert.equal(app.shell.presents()[0].focusOnPresent, FOCUS_PRESENTS_TERMINAL, "…which is what the request named all along");
      });

      // THE OPENER IS THE TILE WHICHEVER DOOR WAS USED, on a surface whose pane is the roving stop.
      await withTerminalControl({ ...home(payload([row("aof-wsl", "s-1")])), shell: true }, (app) => {
        app.click(app.pane(0).button("Expand terminal to full screen"));
        assert.equal(
          app.shell.presents()[0].opener,
          app.nodeFor(app.pane(0).section),
          "pressing the expand BUTTON still returns focus to the TILE — never to a button inside it (§S3 delta 3)",
        );
      });

      // …and a MOUSE click moves the surface's roving stop with it.
      await withTerminalControl(home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2")])), (app) => {
        assert.equal(app.pane(1).section.props?.tabIndex, -1, "the second tile is not the stop…");
        app.focus(app.pane(1).section);
        app.dispatch(app.pane(1).section, "focus");
        assert.equal(app.pane(1).section.props?.tabIndex, 0, "…and focusing it makes it the stop, so the next arrow moves from where the operator IS");
        assert.equal(app.pane(0).section.props?.tabIndex, -1, "…and the first tile gave the stop up");
      });
    },
  },

  {
    name: "49/05 F5/F6 — DG-49-2's line renders TOP-LEFT (DESIGN governs), the held line stays CENTRED, and a grid of ended tiles carries NO implicit live region beside the grid's one",
    run: async () => {
      // F5 — the placement is a descriptor field, and the two uses of `idle` are two treatments.
      const emptyTerminal = describeTerminalState(TERMINAL_STATES.IDLE, { owner: "demo", reason: NO_LIVE_OUTPUT_REASON, emptyTerminal: true });
      assert.equal(emptyTerminal.paneLinePlacement, "top-left", "a terminal that is EMPTY says so where the first byte would have appeared");
      assert.equal(emptyTerminal.showsTopLeftLine, true);
      const held = describeTerminalState(TERMINAL_STATES.IDLE, { owner: "demo", reason: `${HELD_LINE} — 16 live panes already · hide one to watch this` });
      assert.equal(held.paneLinePlacement, "centred", "…and a host with nothing in it says so in the middle of its box (DG-49-4)");
      assert.equal(held.showsTopLeftLine, false);
      assert.equal(describeTerminalState(TERMINAL_STATES.IDLE, { owner: "46/01" }).paneLinePlacement, "centred", "…as the dock's own idle always has");

      await withTerminalControl(home(payload([free("aof-wsl", "7f3a91c")])), (app) => {
        const topLeft = findAll(app.pane(0).section, (node) => String(node.props?.className ?? "").includes("absolute inset-x-0 top-0"));
        assert.equal(topLeft.length, 1, "the never-fed pane renders its line ONCE, top-left");
        assert.ok(visibleTextOf(topLeft[0]).includes(NO_LIVE_OUTPUT_REASON));
        const centred = findAll(app.pane(0).section, (node) => String(node.props?.className ?? "").includes("place-items-center"));
        assert.equal(centred.filter((node) => visibleTextOf(node) !== "").length, 0, "…and not twice");
      });

      // F6 — three ENDED tiles used to carry three implicit polite regions beside the grid's one.
      await withTerminalControl(home(payload([row("aof-wsl", "s-1"), row("aof-wsl", "s-2"), row("aof-wsl", "s-3")])), (app) => {
        for (const pane of app.panes()) {
          pane.socket().accept();
        }
        app.render();
        for (const pane of app.panes()) {
          pane.socket().hangUp();
        }
        app.render();
        for (const pane of app.panes()) {
          assert.ok(pane.paneText().includes("stream ended"), `pane ${pane.index} still RENDERS its bar's words`);
        }
        const regions = liveRegions(app.tree());
        assert.equal(regions.length, 1, `exactly ONE live region, implicit ones counted (it was 4 before this fix: 1 + 3 × role="status")`);
        assert.equal(regions[0].props["aria-live"], "polite", "…and it is the grid's own");
      });

      // …and the three hosts that hold ONE pane keep the bar's own `role="status"`.
      await withTerminalControl(
        { host: HOST_BOARD_DOCK, mount: boardDockMount({ kind: "mirror", ref: "46/01", nodeId: "aof-wsl", sessionId: "7f3a91c" }), origins: { self: "http://127.0.0.1:41773", fleet: FLEET } },
        (app) => {
          app.socket().accept();
          app.render();
          app.socket().hangUp();
          app.render();
          assert.equal(app.bar(), "stream ended", "the dock's bar is still a `role=\"status\"` region, exactly where it has always been");
        },
      );
    },
  },

  {
    name: "49/05 GAP-1 (rule R-1) — an affordance is offered IFF there is something to act on: a never-fed pane offers NO worded toggle (there is no subscription to release) while a held tile and a streaming tile both do",
    run: async () => {
      // THE FALSE AFFORDANCE, measured on the live build and present in the only tile the
      // production capture had: `Hide terminal` on a pane that holds no socket. DG-49-2 gives that
      // pane none; DG-49-9 forbids the toggle meaning "remove this tile"; DG-49-4's own precedent
      // is that a control which cannot do its job is ABSENT, not disabled.
      await withTerminalControl(home(payload([free("aof-wsl", "s-1")])), (app) => {
        assert.equal(app.sockets().length, 0, "the never-fed pane holds no socket…");
        assert.equal(app.pane(0).buttonLabelled(HIDE_LABEL), null, "…so it offers no `Hide terminal` — there is nothing to release");
        assert.equal(app.pane(0).buttonLabelled(WATCH_LABEL), null, "…and no `Watch terminal →` either: watching would open nothing");
        assert.ok(app.pane(0).paneText().includes(NO_LIVE_OUTPUT_REASON), "…while the pane line still names the cause");
      });

      // NON-VACUITY, BOTH DIRECTIONS: the toggle is present wherever there IS something to act on.
      await withTerminalControl(home(payload([row("aof-wsl", "s-1")])), (app) => {
        assert.ok(app.pane(0).buttonLabelled(HIDE_LABEL) != null, "a streaming tile has a subscription to release");
      });
      const rows = Array.from({ length: 17 }, (_, index) => row("aof-wsl", `s-${String(index).padStart(2, "0")}`));
      await withTerminalControl(home(payload(rows.slice(0, 3))), (app) => {
        app.click(app.pane(0).buttonLabelled(HIDE_LABEL));
        assert.ok(app.pane(0).buttonLabelled(WATCH_LABEL) != null, "…and a tile the operator hid keeps the way back: it BINDS, it is merely unsubscribed");
      });
      // …and the rule is the declaration's, not a branch: it answers from the mount's own `bound`.
      assert.equal(terminalPaneStanding(HOST_GRID_PANE, null, true, false).offersToggle, false, "nothing binds ⇒ no toggle");
      assert.equal(terminalPaneStanding(HOST_GRID_PANE, null, false, true).offersToggle, true, "unsubscribed but bindable ⇒ the way back");
      assert.equal(terminalPaneStanding(HOST_BOARD_DOCK, null, true, true).offersToggle, true, "…and every host m46 shipped is unchanged");
    },
  },

  {
    name: "49/05 GAP-2 — the focus indicator is the HOUSE ring (`--color-ring`, 2px, offset), asserted as the computed token rather than judged from a screenshot, and the expanded byte area's is INSET",
    run: async () => {
      // The UA default was what shipped: 1px, no offset, no token — the identical treatment a nav
      // text link gets, so a focused tile was indistinguishable from an unfocused one across a
      // grid, and invisible by construction on the expanded pane's `#0b0f14`.
      const css = await readFile(path.join(repoRoot, "ui", "src", "index.css"), "utf8");
      assert.match(css, /--color-ring:\s*hsl\(174 72% 27%\)/, "the token this ring names is the house's own, defined in index.css");
      for (const [name, className] of [["the tile frame", TERMINAL_FOCUS_RING_CLASS], ["the expanded byte area", TERMINAL_FOCUS_RING_INSET_CLASS]]) {
        assert.match(className, /outline-\[var\(--color-ring\)\]/, `${name}: the ring is the TOKEN, never the user agent's default`);
        assert.match(className, /outline-2/, `${name}: 2px — "unmistakable at a glance across a grid"`);
        assert.match(className, /outline-offset-2/, `${name}: with an offset`);
      }
      assert.match(TERMINAL_FOCUS_RING_INSET_CLASS, /-outline-offset-2/, "…and the expanded one is INSET, because its box is the viewport's own edge (BASELINE §S3)");

      await withTerminalControl(home(payload([row("aof-wsl", "s-1")])), (app) => {
        const frame = String(app.pane(0).section.props?.className ?? "");
        assert.ok(frame.includes(TERMINAL_FOCUS_RING_CLASS), `the ring is on the TILE'S FRAME, where DESIGN §focus model 5 puts it: ${frame}`);
      });
      await withTerminalControl(
        { host: HOST_BOARD_DOCK, mount: boardDockMount({ kind: "local-pty", ref: "46/01", command: "x" }), origins: { self: "http://127.0.0.1:41773", fleet: FLEET } },
        (app) => {
          const frame = String(findAll(app.tree(), (node) => node.type === "section")[0]?.props?.className ?? "");
          assert.ok(!frame.includes("outline-[var(--color-ring)]"), "…and a host with no roving stop is unchanged");
        },
      );
    },
  },

  {
    name: "49/05 GAP-3/4/5 + E2 — the summary pluralises PER COUNT, the empty card is bounded at 520px and centred, the failed state is top-anchored like its siblings, and E2's why-line no longer describes a world story 07 ended",
    run: async () => {
      // The state argument is R-3's (GAP-7, below); these four rows are about the WORDS, so they
      // ask in the state the renders were taken in.
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 1, live: 0, needInput: 0 }), "1 session · 0 live", "`1 sessions` was on the live build");
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 6, live: 5, needInput: 1 }), "6 sessions · 5 live · 1 needs input", "…and `1 need input` disagreed with DG-49-7's own `1 pane needs input`");
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 2, live: 2, needInput: 2 }), "2 sessions · 2 live · 2 need input", "…while the plural verb still agrees with a plural number");
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 0, live: 0, needInput: 0 }), "0 sessions · 0 live", "…and zero is plural, as English has it");

      assert.match(HOME_EMPTY_CARD_CLASS, /max-w-\[520px\]/, "the card is BOUNDED (GAP-5) — E2's why-line was one ~150-character line at the content region's full width");
      assert.match(HOME_EMPTY_CARD_CLASS, /mx-auto/, "…and centred in the container");
      assert.ok(!/\bmono\b|text-\[13px\]/.test(HOME_EMPTY_CARD_CLASS), "…and NOT mono: forking the light shell's type ramp for one string is what the ruling rejected");
      assert.match(HOME_EMPTY_CARD_CLASS, /rounded-lg border border-dashed border-border bg-card\/40 p-6 text-sm text-muted-foreground/, "…the house primitive itself is verbatim");

      const home_ = await readFile(path.join(repoRoot, "ui", "src", "home", "Home.tsx"), "utf8");
      const failed = home_.match(/data-home-state=\{HOME_PAGE_STATE_ERROR\}[^\n]*/)?.[0] ?? "";
      assert.ok(!failed.includes("items-center"), `the failed state is TOP-ANCHORED like E1, E2 and loading (GAP-4): ${failed}`);
      assert.ok(failed.includes("justify-center"), "…still horizontally centred, still the fleet's own treatment");

      assert.ok(!HOME_E2_WHY.includes("Codex"), "E2 no longer names Codex as the only wired runtime — story 07 shipped the Claude hooks and the live capture reports one");
      assert.ok(HOME_E2_WHY.includes("the bundle wires the session hooks that report it"), "…and it states the fact that is still true");
      assert.ok(!/`|aof |npm |\$ /.test(HOME_E2_WHY), "…printing no command, which is DESIGN's own restraint");
    },
  },

  {
    name: "49/05 GAP-6 — the count rule reaches the GRID's two interpolations: K8 reads `1 live pane already` at a cap of one, and the live region says `1 pane needs input` / `<K> panes need input`",
    run: async () => {
      // ── K8. ITS SINGULAR IS UNREACHABLE AT TODAY'S CAP AND THE RULE STILL COVERS IT ─────────
      // `MAX_LIVE_PANES` is 16, so `1 live pane already` cannot be rendered by the shipped build
      // — it becomes reachable the day the cap is configured to 1, which is the same trap the
      // sentence's own `<N>` already refuses for the NUMBER (a hard-coded 16 lies at 4). No
      // rendered string changes today; the string that WOULD change is written correctly before
      // anyone can read it wrongly.
      assert.equal(
        heldPaneLine({ cause: HELD_AT_CAP, cap: 1 }),
        "not streaming — 1 live pane already · hide one to watch this",
        "at a cap of ONE the noun agrees with it — the singular the current cap makes unreachable",
      );
      assert.equal(heldPaneLine({ cause: HELD_AT_CAP, cap: 2 }), `${HELD_LINE} — 2 live panes already · hide one to watch this`, "…and two takes the plural");
      assert.equal(heldPaneLine({ cause: HELD_AT_CAP, cap: MAX_LIVE_PANES }), `${HELD_LINE} — ${MAX_LIVE_PANES} live panes already · hide one to watch this`, "…and the CONFIGURED cap is unchanged by the fix");
      // …and the two cases that name no number at all still name none: agreement is a property of
      // a count that is rendered, and this sentence renders one only at the cap.
      assert.equal(heldPaneLine({ cause: HELD_AT_CAP, cap: null }), HELD_LINE, "a cap nobody stated is still not invented");
      assert.equal(heldPaneLine({ subscribed: false, cause: null, cap: 1 }), HELD_LINE, "…and a free slot is still the bare fact");

      // ── DG-49-7's LIVE REGION. Its singular already shipped; its PLURAL was unwritten in
      // DESIGN's own template, and both forms are now spelled in one place. ─────────────────────
      const tiles = (sessions, items) => homeGridRows(payload(sessions, items == null ? {} : { items }));
      const two = [row("aof-wsl", "s-1"), row("aof-wsl", "s-2")];
      const before = tiles(two);
      const blocked = (ids) =>
        tiles(two, ids.map((id) => ({ ref: "49/05", assignment: { assignmentId: `a-${id}`, state: "running", code: "needs-input" } })));

      const one = blocked(["s-1"]);
      const both = blocked(["s-1", "s-2"]);
      assert.equal(one.filter((tile) => tile.mark === MARK_NEEDS_INPUT).length, 1, "the fixture really marks ONE tile (non-vacuous)");
      assert.equal(both.filter((tile) => tile.mark === MARK_NEEDS_INPUT).length, 2, "…and the other really marks TWO");

      assert.equal(homeGridAnnouncement(before, one, { focusedKey: before[0].key }), "1 pane needs input", "one blocked pane: the singular DG-49-7 already shipped");
      assert.equal(homeGridAnnouncement(before, both, { focusedKey: before[0].key }), "2 panes need input", "two: the plural DESIGN's template had never written");
      // ZERO IS PLURAL AND IT IS REACHABLE — it is what the region says when the LAST blocked pane
      // unblocks, which is the announcement an operator most wants to be right.
      assert.equal(homeGridAnnouncement(both, before, { focusedKey: before[0].key }), "0 panes need input", "…and back to none reads as a plural zero");

      // ── THE SHAPE PROPERTY, on this suite's two phrases: blank the digits and the WORDS must
      // change between one and two, and not change between any two plural values. ─────────────
      const words = (line) => String(line).replace(/\d+/g, "N");
      // N tiles, all N of them blocked, announced through the SHIPPED composer — never through
      // `countedPhrase` with the phrase re-spelled, which would only ask the helper about itself.
      const announceAt = (n) => {
        const rows = Array.from({ length: n }, (_, index) => row("aof-wsl", `s-${String(index).padStart(2, "0")}`));
        const items = rows.map((entry) => ({ ref: "49/05", assignment: { assignmentId: entry.workItem.assignmentId, state: "running", code: "needs-input" } }));
        return homeGridAnnouncement(homeGridRows(payload(rows)), homeGridRows(payload(rows, { items })), { focusedKey: null });
      };
      assert.equal(announceAt(4), "4 panes need input", "the shape driver really drives the composer (non-vacuous)");
      const shapes = [
        ["K8 — the held pane's line", (n) => heldPaneLine({ cause: HELD_AT_CAP, cap: n })],
        ["DG-49-7 — the live region", announceAt],
      ];
      for (const [label, render] of shapes) {
        assert.notEqual(words(render(1)), words(render(2)), `${label}: the WORDS change with the number — ${JSON.stringify([render(1), render(2)])}`);
        assert.equal(words(render(2)), words(render(3)), `${label}: …and every plural value takes the same words`);
        assert.equal(words(render(2)), words(render(MAX_LIVE_PANES)), `${label}: …at the configured cap too`);
        assert.ok(String(render(1)).includes("1"), `${label}: the count really is interpolated (non-vacuous): ${render(1)}`);
      }

      // …AND THE CHROME AND THE ANNOUNCEMENT AGREE, at BOTH forms. This is the argument GAP-3 was
      // settled on — DG-49-7's region already said `1 pane needs input` while G0 said `1 need
      // input`, two spellings of one fact — and it is the same fact GAP-6 found one string over.
      for (const [count, chrome, announced] of [[1, "needs input", "1 pane needs input"], [2, "need input", "2 panes need input"]]) {
        assert.ok(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: count, live: count, needInput: count }).endsWith(chrome), `${count}: the chrome's verb`);
        assert.equal(announceAt(count), announced, `${count}: …and the live region's, agreeing with it`);
      }
    },
  },

  {
    name: "49/05 — the home's own page origins are the SAME value under both keys, taken as an argument, and the grid mounts the REAL control (this suite's socket proof is not a fixture's)",
    run: async () => {
      assert.deepEqual({ ...homePageOrigins({ origin: FLEET }) }, { self: FLEET, fleet: FLEET }, "the terminals home IS the fleet origin");
      assert.deepEqual({ ...homePageOrigins(null) }, { self: null, fleet: null }, "…and an unstated origin is null under both, never a guess");

      // NON-VACUITY OF THE WHOLE SUITE: the entry really does bundle the real control, which is
      // what story 08's guard measures — a substitute would be refused before anything mounted.
      await withTerminalControl(home(payload([row("aof-wsl", "s-1")])), (app) => {
        assert.equal(app.paneCount(), 1, "the pane driver was handed over, which only happens for an entry carrying the REAL control");
        assert.equal(app.sockets().length, 1);
      });
    },
  },
];
