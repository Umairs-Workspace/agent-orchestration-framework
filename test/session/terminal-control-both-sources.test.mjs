// Traceability for milestone 46 / story 04 / task 00 —
// `00_one-control-renders-both-sources.feature`, the `@executable` half.
//
// WHAT THIS ADDS OVER 46/03, because the two must not be one test written twice. 46/03 drives the
// CORE in isolation: the frozen table, `geometryModeFor`, `terminalSocketUrl`, the ramp, the input
// policy — each exhaustively, imported by nothing. THIS suite drives the COMPOSITION: what each
// CALL SITE hands the control, what the control derives from that, and what an operator would
// therefore see. Every lane below names a call site or a host; a lane that could be written
// without one belongs in 46/03.
//
// THE LIVE-DOM HALF IS `@manual` AND IS NOT HERE, for a measured reason. This repo has no React
// test harness; what it has is a headless MOUNT harness whose `useRef` returns a plain
// `{ current }` nothing ever assigns a node to, so `viewportRef.current` is null for the whole
// life of a mount and no xterm and no socket is ever constructed. One xterm instance, one socket,
// a keystroke that actually reaches a far end, 80 columns actually unwrapped — those are `@manual`
// with named evidence in the milestone's VERIFICATION.md.
//
// CORRECTION, 2026-08-09 — HALF OF THAT PARAGRAPH IS NO LONGER TRUE, and the half that was true
// is how a control that opened NO SOCKET shipped with every suite green. mini-react now attaches
// HOST NODES to refs on request (`createRuntime({ hostNode })`), so
// `test/session/terminal-control-opens-its-socket.test.mjs` mounts the REAL `TerminalControl.tsx` and
// asserts that a WebSocket is constructed, at all three call sites. What stays `@manual` is what
// a stand-in genuinely cannot answer: a painted glyph, an unwrapped 80th column, a byte that
// really crossed a wire.
//
// ISOLATION: run focused, with `AOF_GLOBAL_HOME=$(mktemp -d)`. Never the full suite.
import assert from "node:assert/strict";

import { SESSION_SOURCES, sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { fleetTerminalMount } from "../../ui/src/fleet/terminal-mount.mjs";
import {
  inputPolicyFor,
  mountModelFor,
  POSTURE_INTERACTIVE,
  POSTURE_READ_ONLY,
} from "../../ui/src/terminal/input-policy.mjs";
import {
  geometryPlanFor,
  GEOMETRY_FIT,
  GEOMETRY_SCALE,
  terminalFitScale,
} from "../../ui/src/terminal/geometry.mjs";
import { terminalSocketUrl } from "../../ui/src/terminal/socket-url.mjs";
import { terminalPaneIdentity, terminalPaneKey } from "../../ui/src/terminal/pane-identity.mjs";
import { initialPicker, selectProvider, withSelectedProvider, PROVIDER_IDS } from "../../ui/src/terminal/provider-picker.mjs";

const BOARD_PORT_ORIGIN = "http://127.0.0.1:41773"; // an EPHEMERAL board origin, as production has
const FLEET_ORIGIN = "http://127.0.0.1:4181";

export const terminalControlBothSourcesTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: each call site resolves its own state into a source descriptor and a
  // mount posture the one control accepts — 5 rows.
  //
  // ROWS 2 AND 3 ARE THE WHOLE ARGUMENT: `mirror` is ONE source, mounted typeable by the board
  // (m42's operator override) and read-only by the fleet (invariant 4, which survives this
  // milestone). One flag on the source cannot express that; two declarations can.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  ...[
    {
      // THE PRODUCTION CALL SHAPE, exactly: `Board.tsx` calls `boardDockMount(dockSession)` with
      // NO options. The `provider` half of the tuple is the PICKER's selection — chrome the
      // control holds — so the mount declares `ref` and the control completes it at the one seam
      // that owns that rule. The `completes` field below drives that second step.
      case: "Run agent on a board item",
      site: "the board",
      mount: () => boardDockMount({ kind: "local-pty", ref: "46/04", command: "/aof:build 46/04" }),
      source: "local-pty",
      posture: POSTURE_INTERACTIVE,
      params: ["ref"],
      completes: ["ref", "provider"],
      originRole: "self",
    },
    {
      case: "the board's mirror affordance",
      site: "the board",
      mount: () => boardDockMount({ kind: "mirror", ref: "46/04", nodeId: "aof-wsl", sessionId: "7f3a91c" }),
      source: "mirror",
      posture: POSTURE_INTERACTIVE,
      params: ["nodeId", "sessionId"],
      originRole: "fleet",
    },
    {
      case: "a fleet card with a captured session",
      site: "the fleet",
      mount: () => fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "46/04" }),
      source: "mirror",
      posture: POSTURE_READ_ONLY,
      params: ["nodeId", "sessionId"],
      originRole: "fleet",
    },
    {
      // ROW 4 renders NO PANEL AT ALL — not an empty one, not an `unavailable` one. That
      // distinction is task 03's subject and it is not relaxed here.
      case: "a fleet card whose worker has not captured",
      site: "the fleet",
      mount: () => fleetTerminalMount({ targetNodeId: "aof-wsl", state: "running" }, { itemRef: "46/04" }),
      source: null,
      posture: POSTURE_READ_ONLY,
      params: [],
      originRole: null,
      rendersPanel: false,
    },
    {
      // ROW 5 is `idle`: no source bound, no socket opened, the centred empty line in the byte
      // area. It is not an error and not a loading state — and the POSTURE is still the host's
      // own `interactive`, because a host does not stop being interactive when it has nothing
      // to show.
      case: "the dock open with nothing bound",
      site: "the board",
      mount: () => boardDockMount(null),
      source: null,
      posture: POSTURE_INTERACTIVE,
      params: [],
      originRole: null,
    },
  ].map((row) => ({
    name: `46/04 task00 the call site resolves its own state into a descriptor + posture — ${row.case}`,
    run() {
      const mount = row.mount();

      // Then the source is <source> and the mount posture is <posture>
      assert.equal(mount.source?.kind ?? null, row.source, "the SOURCE the call site declares");
      assert.equal(mount.posture, row.posture, "the POSTURE the call site declares");
      assert.equal(mount.rendersPanel, row.rendersPanel ?? true, "whether a panel is rendered at all");

      // And the params carried to the socket are exactly <params> — no more, and never a
      // defaulted or guessed one.
      assert.deepEqual(Object.keys(mount.params).sort(), [...row.params].sort(), "the params, exactly");
      for (const [name, value] of Object.entries(mount.params)) {
        assert.equal(typeof value, "string", `${name} is a real value, not a placeholder`);
        assert.ok(value.length > 0, `${name} is not empty`);
      }
      if (row.source != null) {
        // THE TUPLE IS COMPLETED AT ONE SEAM AND ONLY ONE. A `local-pty` declares `provider` as a
        // param the CHROME supplies, so the mount is deliberately short of it and
        // `withSelectedProvider` finishes it — the seam production uses, rather than a ternary in
        // the component beside a dead option on the mount.
        const addressed = withSelectedProvider(mount.source, mount.params, initialPicker());
        assert.deepEqual(Object.keys(addressed).sort(), [...(row.completes ?? row.params)].sort(), "the COMPLETED tuple is exactly the source's declared params");
        assert.deepEqual([...mount.source.params].sort(), [...(row.completes ?? row.params)].sort(), "…and they are exactly the ones the SOURCE declares");
        // NOTHING IS DEFAULTED IN THE MOUNT. Ask it without a picker and the tuple stays short —
        // a mount that quietly filled in `claude` would spawn it for an operator who had chosen
        // otherwise, and the tuple would look complete while it did it.
        assert.equal(mount.params.provider, undefined, "the mount does not invent the picker's selection");
      }

      // And the origin the source asks for is <origin role>.
      assert.equal(mount.source?.originRole ?? null, row.originRole);

      // And the descriptor is the control's ONLY input: no call site passes a geometry, a URL, a
      // port or an `isRemote` boolean beside it. Asserted as the SHAPE of what a mount carries —
      // eleven declared keys and not one of them is a derivation.
      assert.deepEqual(
        Object.keys(mount).sort(),
        [
          "bound",
          "command",
          // The identity line's TAIL — source-shaped COPY the call site owns, and the first thing
          // to yield when the header cannot fit.
          "detail",
          "farEnd",
          "params",
          "posture",
          "reason",
          "ref",
          "rendersPanel",
          "source",
          // WHO OWNS THE SPAWN — the only thing keeping Restart off a worker's mirror.
          "spawnedHere",
          // The FIXTURE door for DG-46-3's producer-less state.
          "unavailable",
          ...(row.site === "the fleet" ? ["noStream"] : []),
        ].sort(),
        "a mount declares WHICH SESSION and WHAT THE HOST OWNS — never a geometry, a URL, a port or an isRemote boolean",
      );
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: the control derives its socket, its geometry and its input path from the
  // descriptor — and gives the same answers in every host — 3 rows.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  ...[
    {
      case: "the board's own PTY",
      kind: "local-pty",
      posture: POSTURE_INTERACTIVE,
      path: "/ws/terminal",
      geometry: GEOMETRY_FIT,
      why: "the source declares a resize control frame",
      emits: true,
      input: true,
      cursor: { blink: true, style: "block" },
      label: null,
    },
    {
      case: "a worker mirror in the dock",
      kind: "mirror",
      posture: POSTURE_INTERACTIVE,
      path: "/ws/terminal-view",
      geometry: GEOMETRY_SCALE,
      why: "the source declares NO resize control frame",
      emits: false,
      input: true,
      cursor: { blink: true, style: "block" },
      label: null,
    },
    {
      case: "a worker mirror on a card",
      kind: "mirror",
      posture: POSTURE_READ_ONLY,
      path: "/ws/terminal-view",
      geometry: GEOMETRY_SCALE,
      why: "the source declares NO resize control frame",
      emits: false,
      input: false,
      cursor: { blink: false, style: "underline" },
      label: "read-only",
    },
  ].map((row) => ({
    name: `46/04 task00 the control derives socket + geometry + input from the descriptor — ${row.case}`,
    run() {
      const source = sessionSourceFor(row.kind).source;

      // Then the socket path is <path>
      assert.equal(source.path, row.path);

      // And the geometry mode is <geometry>, because <why>
      const plan = geometryPlanFor(source, {});
      assert.equal(plan.mode, row.geometry, row.why);
      assert.equal(source.resizeControlFrame != null, row.geometry === GEOMETRY_FIT, row.why);

      // And it emits <resize frames> up that socket.
      //
      // THE `scale` ROWS' "none at all" IS STRUCTURAL, NOT DEFENSIVE. Its predecessor stopped a
      // mirror with an early return inside the send path (`if (remote != null) return`). Here a
      // `scale` source declares no resize control frame and the plan offers NO EMITTER — there is
      // no path to guard, so there is nothing a later refactor can delete.
      assert.equal(plan.emitsResizeFrame, row.emits);
      assert.equal(plan.emitter == null, !row.emits, "a scale plan offers no emitter at all — the guard is structural");
      if (row.emits) {
        const sent = [];
        plan.emitter(120, 30, (frame) => sent.push(frame), null);
        assert.equal(sent.length, 1, "exactly ONE resize frame per fit");
        plan.emitter(120, 30, (frame) => sent.push(frame), { type: "resize", cols: 120, rows: 30 });
        assert.equal(sent.length, 1, "…and none at all on a no-change fit");
      }

      // And an input path <input>; and the cursor is <cursor>; and the `read-only` label is
      // <label>. Read-only is read-only IN FACT: `disableStdin: true` and NO handler registered.
      const model = mountModelFor({ source, mount: row.posture });
      assert.equal(model.inputEnabled, row.input);
      assert.equal(model.disableStdin, !row.input);
      assert.deepEqual([...model.keystrokeSinks], row.input ? ["onData"] : [], "the sink is ABSENT, never registered-and-ignored");
      assert.equal(model.sendPath, row.input ? "socket.send" : null);
      assert.deepEqual({ ...model.cursor }, row.cursor);
      assert.equal(model.readOnlyLabel, row.label);
      assert.equal(model.inputRegion, null, "NEITHER posture has an input row — which is why the label is mandatory");

      // And re-reading the same plan for the same descriptor in a DIFFERENT HOST, on a DIFFERENT
      // ORIGIN, at a DIFFERENT BOX SIZE returns every one of those answers unchanged. This is
      // ADR-003's forbidden spellings asserted as behaviour rather than as a grep.
      const boxes = [
        { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 1264, boxHeight: 222 }, // the dock
        { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 510, boxHeight: 192 }, // the card
        { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 1264, boxHeight: 739 }, // fullscreen
      ];
      for (const box of boxes) {
        const other = geometryPlanFor(source, box);
        assert.equal(other.mode, row.geometry, "the geometry MODE does not move with the box");
        assert.equal(other.emitsResizeFrame, row.emits, "nor does whether a resize frame travels");
        assert.equal(other.anchor, "top-left", "nor the anchor");
      }
      for (const origins of [{ self: BOARD_PORT_ORIGIN, fleet: FLEET_ORIGIN }, { self: "https://host", fleet: "https://host" }]) {
        const built = terminalSocketUrl(source, { ref: "46/04", provider: "claude", nodeId: "aof-wsl", sessionId: "7f3a91c" }, { origins });
        assert.equal(built.path, row.path, "the ROUTE does not move with the origin");
        assert.equal(built.originRole, source.originRole, "nor does whose origin it asks for");
      }
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: the socket URL is composed from the origins the surface was HANDED, and a
  // surface that was handed none opens nothing — 8 rows.
  //
  // 46/02 serves the fact; 46/03 builds the URL; THIS asserts the two meet correctly at the call
  // site — the single argument that is the whole interface between the two halves of m46.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  ...[
    {
      case: "the board's own PTY, as today",
      kind: "local-pty",
      origins: { self: BOARD_PORT_ORIGIN },
      url: "ws://127.0.0.1:41773/ws/terminal?ref=46%2F04&provider=claude",
      scheme: "ws",
    },
    {
      case: "the board mirroring a worker",
      kind: "mirror",
      origins: { self: BOARD_PORT_ORIGIN, fleet: FLEET_ORIGIN },
      url: "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c",
      scheme: "ws",
    },
    {
      // THE ROW THAT WOULD HAVE FAILED BEFORE THIS MILESTONE, and the operator story 46/02 was
      // written for: a fleet started on anything but 4181 was unreachable from the board, because
      // the board held the NUMBER rather than being TOLD.
      case: "the board started standalone (the command layer's default)",
      kind: "mirror",
      origins: { self: BOARD_PORT_ORIGIN, fleet: "http://127.0.0.1:4181" },
      url: "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c",
      scheme: "ws",
    },
    {
      case: "a non-default fleet port",
      kind: "mirror",
      origins: { self: BOARD_PORT_ORIGIN, fleet: "http://127.0.0.1:9999" },
      url: "ws://127.0.0.1:9999/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c",
      scheme: "ws",
    },
    {
      // ROWS 5-6 SUPPLY BOTH KEYS DELIBERATELY. On the fleet's own page the two origins happen to
      // be the same value, and that coincidence is exactly why it must be stated: a builder that
      // fell back to `self` when `fleet` was absent would pass these two and fail row 8.
      case: "the fleet's own card peek",
      kind: "mirror",
      origins: { self: FLEET_ORIGIN, fleet: FLEET_ORIGIN },
      url: "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c",
      scheme: "ws",
    },
    {
      case: "a page served over TLS",
      kind: "mirror",
      origins: { self: "https://host", fleet: "https://host" },
      url: "wss://host/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c",
      scheme: "wss",
    },
    {
      // THE `@bug` ROW, and it is a BEHAVIOUR CHANGE rather than an extraction. Its predecessor
      // took the PAGE's protocol and the FLEET's hostname, so an http board dialling an https
      // fleet built `ws://` and failed, and the reverse failed the other way. The scheme follows
      // the origin ACTUALLY BEING DIALLED.
      case: "an http page dialling an https fleet",
      kind: "mirror",
      origins: { self: BOARD_PORT_ORIGIN, fleet: "https://fleet.example" },
      url: "wss://fleet.example/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a91c",
      scheme: "wss",
    },
    {
      // ROW 8 opens NOTHING and renders the `unavailable` pane. Note the boundary it draws with
      // the ramp: an origin we do NOT HAVE is `unavailable`; an origin we have and cannot CONNECT
      // to is `error`. Different facts.
      case: "no fleet origin was ever handed",
      kind: "mirror",
      origins: { self: BOARD_PORT_ORIGIN },
      url: null,
      scheme: null,
    },
  ].map((row) => ({
    name: `46/04 task00 the socket URL is composed from the origins the surface was HANDED — ${row.case}`,
    run() {
      const source = sessionSourceFor(row.kind).source;
      const params = { ref: "46/04", provider: "claude", nodeId: "aof-wsl", sessionId: "7f3a91c" };
      const built = terminalSocketUrl(source, params, { origins: row.origins });

      assert.equal(built.url, row.url, "the URL");
      assert.equal(built.scheme, row.scheme, "…and its scheme, chosen from the protocol of the origin being DIALLED — never from the page's own");
      if (row.url == null) {
        assert.equal(built.reason, "missing-origin", "the refusal names its own cause");
        assert.deepEqual([...built.missing], [source.originRole], "…and which origin was missing");
      }

      // And the origins arrived as an ARGUMENT — the same call with the same arguments returns
      // the same URL with no `window` and no `location` in reach. This module is imported by
      // plain `node` in this very process, which is the strongest available form of that claim.
      assert.equal(terminalSocketUrl(source, params, { origins: row.origins }).url, row.url, "pure over its arguments");
      assert.equal(typeof globalThis.window, "undefined", "…and there is no `window` in this process for it to have read");
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // THE NON-LIVE BAR IS PAID FOR OUT OF THE BYTE AREA — asserted AS A PAIR, which is the row the
  // core's own geometry suite did not carry (`mocks/CONFORMANCE.md` §4a/§4b).
  //
  // The committed mock draws the consequence twice: the fleet peek's mirror goes 0.47x live to
  // 0.40x ended, and the fullscreen overlay's goes 1.83x to 1.76x.
  //
  // NONE OF THOSE FOUR IS A TARGET, and two of them do not even reproduce. They are OUTPUTS of
  // `terminalFitScale` at four particular boxes, and against the mock's OWN boxes the overlay
  // pair derives 1.811 and 1.740 rather than the drawn 1.83 and 1.76 — which is the designer's
  // own finding: on S3 the absolutes are illustrative and only the DIFFERENCE binds. So what is
  // asserted below is the DIFFERENCE: the same source in the same panel returns a SMALLER scale
  // when the bar is present, by exactly the bar's height over the intrinsic height, while the
  // host's total height does not move. The two peek numbers are checked only because they DO
  // reproduce exactly, and they are checked as outputs of the real call rather than as goals.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "46/04 task00 the non-live bar is paid for OUT OF the byte area — the same pane re-scales into the smaller box, by exactly the bar's height, and the host's total height does not move",
    run() {
      const mirror = sessionSourceFor("mirror").source;
      const INTRINSIC = { intrinsicWidth: 640, intrinsicHeight: 408 };
      const BAR = 29; // measured, not assumed: the bar's own content height

      for (const [host, boxWidth, boxHeight] of [
        ["the fleet card peek", 510, 192],
        ["the fullscreen overlay", 1264, 739],
        ["the board dock", 1264, 222],
      ]) {
        const live = geometryPlanFor(mirror, { ...INTRINSIC, boxWidth, boxHeight });
        const ended = geometryPlanFor(mirror, { ...INTRINSIC, boxWidth, boxHeight: boxHeight - BAR });

        assert.ok(ended.scale < live.scale, `${host}: the bar costs the picture, not the panel`);
        // …and it costs it EXACTLY the bar. Height binds on all three of these boxes, so the
        // scale delta is the bar's height over the intrinsic height — which is the arithmetic
        // form of "the byte area shrinks by the bar's height".
        assert.equal(
          Number(((live.scale - ended.scale) * INTRINSIC.intrinsicHeight).toFixed(6)),
          BAR,
          `${host}: the delta IS the bar's height`,
        );
        // The screen never reflows: a `scale` source renders at the far end's own geometry in
        // both cases, and only the picture changes size.
        assert.equal(ended.cols, live.cols, `${host}: the same 80 columns`);
        assert.equal(ended.rows, live.rows, `${host}: and the same 24 rows`);
        assert.equal(ended.mode, live.mode);
      }

      // NOT ONE OF THE MOCK'S FOUR LITERALS IS A TARGET. Two of them are only approximate against
      // the mock's own box (the overlay's 739px box derives 1.811, not 1.83), so the suite
      // asserts the DERIVATION and the DELTA and never the number.
      assert.equal(
        terminalFitScale({ ...INTRINSIC, boxWidth: 510, boxHeight: 192 }).toFixed(2),
        "0.47",
        "the peek's live scale is DERIVED from its measured box — 192/408, which happens to round to the mock's 0.47",
      );
      assert.equal(
        terminalFitScale({ ...INTRINSIC, boxWidth: 510, boxHeight: 163 }).toFixed(2),
        "0.40",
        "…and its ended scale from 163/408, the same 163 DESIGN's own constraint row records (163 bytes + 29 bar = 192, constant)",
      );
    },
  },

  // A `mirror` IN THE BOARD DOCK — the case the committed mock does not draw, and the single most
  // likely correct render to be reported as a defect. Asserted here so the number is on the
  // record before a reviewer meets it.
  {
    name: "46/04 task00 a mirror in the WIDE board dock scales to fit its HEIGHT and leaves a large empty band — correct by the min-ratio rule, and never a crop",
    run() {
      const mirror = sessionSourceFor("mirror").source;
      const plan = geometryPlanFor(mirror, { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 1264, boxHeight: 222 });

      // The MIN of the two ratios, which is the only ratio at which the WHOLE screen still fits.
      assert.equal(Number(plan.scale.toFixed(3)), 0.544, "height binds: 222/408, not 1264/640");
      assert.equal(Math.round(plan.scaledWidth), 348, "…so the picture is 348px wide");
      assert.equal(Math.round(1264 - plan.scaledWidth), 916, "…leaving ≈916px (72%) of empty terminal background on the right");
      assert.equal(plan.anchor, "top-left", "anchored top-left, as on every surface");
      assert.equal(plan.direction, "scaled down");

      // THE BAND IS CORRECT AND THE ALTERNATIVES ARE ALL WORSE: cropping loses output (which is
      // what the dock did before this milestone — it resized to 80x24 and painted at natural size
      // into a 280px dock), stretching makes glyphs illegible, and re-fitting is the unreadable
      // scatter this geometry exists to prevent. Paying with empty space is the cheapest of four.
      assert.ok(plan.scaledWidth <= 1264 && plan.scaledHeight <= 222, "no column and no row is ever cut off");
    },
  },

  {
    // THE PICKER'S OWN SELECTION TRAVELS — and it is asserted with a NON-DEFAULT one, which is the
    // whole point. Driving this seam with `initialPicker()` alone cannot tell "reads the picker"
    // from "returns `claude`", because the picker's default IS `claude`; a mutation review found
    // exactly that hole. An operator who chose `codex` and got `claude` would have a `claude` PTY
    // spawned for them by a tuple that looked complete.
    name: "46/04 task00 the PICKER's selection is what completes a local-pty's tuple — a non-default choice travels, and an invalid picker yields NO provider rather than a default one",
    run() {
      const local = sessionSourceFor("local-pty").source;
      const mirror = sessionSourceFor("mirror").source;
      const base = { ref: "46/04" };

      for (const id of PROVIDER_IDS) {
        const picker = selectProvider(initialPicker(), id);
        assert.equal(withSelectedProvider(local, base, picker).provider, id, `the operator's choice of ${id} is what addresses the session`);
      }
      // …and the ones that are not the default are the ones that prove it.
      assert.notEqual(PROVIDER_IDS.filter((id) => id !== "claude").length, 0, "non-vacuity: there ARE non-default providers to choose");

      // A source that does not DECLARE `provider` is untouched — the picker is a `local-pty`
      // concern and a mirror already exists, on another machine, with nothing to pick.
      const mirrorParams = { nodeId: "aof-wsl", sessionId: "7f3a91c" };
      assert.deepEqual({ ...withSelectedProvider(mirror, mirrorParams, selectProvider(initialPicker(), "codex")) }, mirrorParams);

      // AND NOTHING IS DEFAULTED WHEN THERE IS NOTHING TO READ. An absent or malformed picker
      // leaves the tuple SHORT — so the pane key is null and no socket opens — rather than
      // inventing a provider and dialling with it.
      for (const broken of [null, undefined, {}, { selected: "banana" }, { selected: 42 }, "claude"]) {
        assert.equal(withSelectedProvider(local, base, broken).provider, undefined, `${JSON.stringify(broken)} yields NO provider`);
        assert.equal(terminalPaneKey(local, withSelectedProvider(local, base, broken)), null, "…so the pane cannot be addressed, and nothing is opened");
      }
      // The complete tuple, by contrast, DOES address a pane — so "short" above is a
      // discrimination rather than what this function always produces.
      assert.ok(terminalPaneKey(local, withSelectedProvider(local, base, initialPicker())) != null);
    },
  },

  // The identity line is source-shaped, and it is what replaces the retired `remote ·` badge.
  {
    name: "46/04 task00 the identity line names the owner always and the far end only when the far end is elsewhere — the `remote ·` badge is retired, not lost",
    run() {
      const mirror = sessionSourceFor("mirror").source;
      const local = sessionSourceFor("local-pty").source;

      const remote = terminalPaneIdentity({ source: mirror, params: { nodeId: "aof-wsl", sessionId: "7f3a91c" }, ref: "46/04", farEnd: "aof-wsl" });
      assert.equal(remote.rendered, true);
      assert.equal(remote.label, "46/04 → aof-wsl", "a remote session SAYS it is remote, in words, in the identity line");

      const own = terminalPaneIdentity({ source: local, params: { ref: "46/04", provider: "claude" }, ref: "46/04" });
      assert.equal(own.rendered, true);
      assert.equal(own.label, "46/04", "a local PTY's far end is this server's own, so it names nobody");
      assert.ok(!own.label.includes("→"), "…and carries no arrow to a machine it is not on");

      // V1 — a terminal with no visible owner is NEVER rendered, and the refusal names its cause.
      const anonymous = terminalPaneIdentity({ source: mirror, params: { nodeId: "aof-wsl", sessionId: "7f3a91c" } });
      assert.equal(anonymous.rendered, false);
      assert.equal(anonymous.reason, "no-owner");
    },
  },

  // Non-vacuity for the whole file: the frozen table really is two rows, so "both sources" is a
  // claim about everything there is.
  {
    name: "46/04 task00 non-vacuity: the frozen table is exactly two sources, so BOTH call sites cover every source that exists",
    run() {
      assert.equal(SESSION_SOURCES.length, 2, "two sources — a third is a table row plus its own arch-test row");
      assert.deepEqual(SESSION_SOURCES.map((source) => source.kind), ["local-pty", "mirror"]);
      for (const source of SESSION_SOURCES) {
        assert.equal(inputPolicyFor(source, POSTURE_INTERACTIVE).canInput, true, `${source.kind} declares a capability the policy can read`);
      }
    },
  },
];
