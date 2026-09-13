// Traceability wiring for milestone 46 / story 05, task 02 —
// `stories/05_story_dock-shell-host/tasks/02_fullscreen-adopts-the-live-node.feature`.
//
// THIS FILE CARRIES THE `@executable` HALF ONLY, AND THE SPLIT IS THE POINT. The shell's
// DECISIONS are framework-free models this repo drives under plain `node` — what the control asks
// the shell for, whether `Escape` is claimed, what the presented state declares, what a layout
// tick asks of each source. The IDENTITY claims — ONE xterm instance, ONE socket, ONE scrollback,
// across two transitions — are exactly the claims a model cannot make: they are about OBJECTS
// SURVIVING, and only a real DOM with a real xterm and a real PTY can show it.
//
// FOUR SCENARIOS IN THAT FEATURE ARE THEREFORE `@manual` AND ARE DELIBERATELY ABSENT HERE:
//   · present and dismiss move the SAME xterm instance, on the SAME socket, with the SAME
//     scrollback;
//   · on dismissal the node goes back to its home and focus back to the control that opened it;
//   · every exit from fullscreen leaves the session untouched (six rows, including the stale
//     dismisser with a real PTY behind it);
//   · a session does NOT survive navigation between surfaces.
// Each needs a deployed build, a real browser and a real board origin, and its evidence is an
// object identity, a server-side upgrade count and two buffer reads — recorded at `aof:verify`.
// FAKING ANY OF THEM HERE WOULD PROVE THE FAKE, NOT THE SHELL; m45 said so in terms when it
// deferred the adoption half to this milestone, and writing a green stand-in would be the exact
// green-and-vacuous shape ADR-006 exists to end.
//
// ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the full
// suite (`global-work-propagation.test.mjs` binds :4182, which the live control daemon holds).
import assert from "node:assert/strict";
import {
  Z_LADDER,
  fullscreenReducer,
  fullscreenState,
  presentedStateModel,
  rungFor,
} from "../../ui/src/app/shell-layout.mjs";
import { sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY, mountModelFor } from "../../ui/src/terminal/input-policy.mjs";
import {
  FULLSCREEN_EXIT_ANCHOR,
  terminalFullscreenExits,
  terminalFullscreenId,
  terminalFullscreenRequest,
} from "../../ui/src/terminal/fullscreen-request.mjs";
import { GEOMETRY_FIT, GEOMETRY_SCALE, emitFit, geometryPlanFor } from "../../ui/src/terminal/geometry.mjs";

const LOCAL_PTY = sessionSourceFor("local-pty").source;
const MIRROR = sessionSourceFor("mirror").source;
const SOURCES = { "local-pty": LOCAL_PTY, mirror: MIRROR };

// The box a presented occupant gets, and the box it goes back to. Numbers a lane can state.
const OVERLAY_BOX = { cols: 158, rows: 46, intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 1264, boxHeight: 739 };
const INLINE_BOX = { cols: 78, rows: 12, intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 1264, boxHeight: 222 };

export const terminalFullscreenAdoptsLiveNodeTests = [
  // ======================================================================
  // Scenario Outline: the fullscreen request the control builds, and the exits the presented
  // state then declares — four rows, source × posture
  // ======================================================================
  ...[
    {
      case: "the board dock, a local PTY",
      source: "local-pty",
      posture: POSTURE_INTERACTIVE,
      inputEnabled: true,
      claimsEscape: true,
      escape: "reaches the far end as a keystroke; the shell does not dismiss on it",
    },
    {
      case: "the board dock mirroring a worker",
      source: "mirror",
      posture: POSTURE_INTERACTIVE,
      inputEnabled: true,
      claimsEscape: true,
      escape: "reaches the far end as a keystroke; the shell does not dismiss on it",
    },
    {
      case: "the fleet card's read-only peek",
      source: "mirror",
      posture: POSTURE_READ_ONLY,
      inputEnabled: false,
      claimsEscape: false,
      escape: "dismisses — nothing is listening for it on the far end",
    },
    {
      // ROW 4 HAS NO CALL SITE IN THIS MILESTONE and is here deliberately: the policy is a pure
      // function over the whole table × both postures, so the combination nobody mounts is
      // exactly the one a later story would get wrong for free.
      case: "a read-only mount of a local PTY — no call site in this milestone",
      source: "local-pty",
      posture: POSTURE_READ_ONLY,
      inputEnabled: false,
      claimsEscape: false,
      escape: "dismisses",
    },
  ].map((row) => ({
    name: `terminal-fullscreen/02 a ${row.source} mounted ${row.posture}: input ${row.inputEnabled ? "enabled" : "disabled"}, claims Escape = ${row.claimsEscape}, and Escape ${row.escape} (${row.case}) (02 scenario 1)`,
    run() {
      const source = SOURCES[row.source];

      // INPUT IS `source.canInput && !mount.readOnly`, AND NEVER ONE FLAG. Rows 2 and 3 are the
      // pair that proves the two axes are independent: the SAME source, claiming the key from one
      // host and not from the other, because posture is a property of the CALL SITE and
      // capability is a property of the SOURCE (ADR-002).
      const model = mountModelFor({ source, mount: row.posture });
      assert.equal(model.inputEnabled, row.inputEnabled);
      assert.equal(model.inputEnabled, source.canInput === true && row.posture === POSTURE_INTERACTIVE, "…and it is exactly that conjunction");

      // THE REQUEST THE CONTROL BUILDS — from the session it is already running, never a second
      // one constructed to present.
      const request = terminalFullscreenRequest({
        source,
        posture: row.posture,
        sessionKey: "session-key",
        label: `${row.posture} terminal for 46/05`,
      });
      assert.ok(request, "a running session can be presented");
      assert.equal(request.id, terminalFullscreenId("session-key"), "the id is the SESSION's");
      assert.equal(request.claimsEscape, row.claimsEscape, "the request claims `Escape` = …");
      assert.equal(request.claimsEscape, model.inputEnabled, "…which is EXACTLY whether input is enabled");
      assert.equal(request.label, `${row.posture} terminal for 46/05`, "the label names the session, not the widget class");

      // …AND WHAT THE PRESENTED STATE THEN DECLARES. Driven with the request the control actually
      // builds, through the shell's own reducer — not with a hand-written occupant.
      const presenting = fullscreenReducer(fullscreenState(), { type: "present", occupant: request });
      const presented = presentedStateModel(presenting);
      assert.equal(presenting.status, "presenting");

      // A VISIBLE EXIT CONTROL, IN EVERY ROW WITHOUT EXCEPTION, anchored where the way in was.
      assert.equal(presented.exitControl.visible, true);
      assert.equal(presented.exitControl.anchor, FULLSCREEN_EXIT_ANCHOR);
      assert.equal(presented.exitControl.anchor, "ml-auto", "the same anchor as the control that entered fullscreen");
      // This control paints its own header (DESIGN §S3 requires the identity fragment verbatim),
      // so the exit is the OCCUPANT's — `renderedBy` says who paints it, never whether.
      assert.equal(presented.exitControl.renderedBy, "occupant");
      assert.equal(presented.occupantOwnsChrome, true);
      const exits = terminalFullscreenExits({ source, posture: row.posture });
      assert.equal(exits.exitControl.visible, true);
      assert.equal(exits.exitControl.alwaysVisible, true, "never hover-revealed, never auto-hiding, never faded by inactivity");
      assert.equal(exits.exitControl.onlyExit, row.claimsEscape, "…and where the key is claimed it is the ONLY exit, which is what makes the claim safe");

      // AND `Escape` DOES WHAT THE ROW SAYS.
      assert.equal(presented.escapeDismisses, !row.claimsEscape);
      assert.equal(presented.escapeClaimedByOccupant, row.claimsEscape);
      assert.equal(exits.escapeReachesFarEnd, row.claimsEscape);
      const afterEscape = fullscreenReducer(presenting, { type: "escape" });
      assert.equal(
        afterEscape.status,
        row.claimsEscape ? "presenting" : "empty",
        row.claimsEscape ? "the occupant claimed it, so the shell does not take it" : "nothing is listening for it on the far end, so it dismisses",
      );
      // The visible control still works in BOTH cases — the exit that is never negotiable.
      assert.equal(fullscreenReducer(presenting, { type: "dismiss", id: request.id, via: "control" }).status, "empty");

      // AND THE OCCUPANT SITS ON THE LADDER'S `fullscreen` RUNG, TAKEN FROM THE LADDER BY NAME.
      assert.equal(presented.rung, "fullscreen");
      assert.equal(presented.z, Z_LADDER.fullscreen);
      assert.equal(presented.z, rungFor("fullscreen"));
      assert.ok(presented.z > rungFor("dock"), "…above the dock it covers");
      assert.equal(presented.chrome, "hidden", "the chrome is HIDDEN, not overlaid");
    },
  })),

  {
    name: "terminal-fullscreen/02 a control with no running session builds NO request — the refusal lives in one place, and the shell's own reducer refuses an idless occupant too (02 scenario 1, the boundary)",
    run() {
      for (const sessionKey of [null, undefined, "", 0, {}]) {
        assert.equal(terminalFullscreenId(sessionKey), null);
        assert.equal(
          terminalFullscreenRequest({ source: LOCAL_PTY, posture: POSTURE_INTERACTIVE, sessionKey }),
          null,
          `${JSON.stringify(sessionKey) ?? "(absent)"} has nothing to present`,
        );
      }
      // …and the shell refuses one anyway, so the two agree rather than one covering for the
      // other: a present with no usable occupant is a no-op that yields the SAME state object.
      const empty = fullscreenState();
      assert.equal(fullscreenReducer(empty, { type: "present", occupant: { id: "" } }), empty);
    },
  },

  // ======================================================================
  // Scenario Outline: the post-transition layout tick is CONSUMED, and what it asks for is a
  // property of the SOURCE
  // ======================================================================
  ...[
    {
      case: "a local PTY — it can be resized",
      source: "local-pty",
      mode: GEOMETRY_FIT,
      response: "re-FIT into the new box: more rows and columns, glyphs unchanged",
      frames: 1,
    },
    {
      case: "a mirrored worker TUI",
      source: "mirror",
      mode: GEOMETRY_SCALE,
      response: "re-SCALE the fixed 80×24 to the new box, aspect preserved, top-left",
      frames: 0,
    },
  ].map((row) => ({
    name: `terminal-fullscreen/02 the shell's post-transition tick asks a ${row.source} to ${row.response.split(":")[0]} and the far end is told ${row.frames === 1 ? "exactly one" : "no"} resize frame per re-measure — identically after PRESENT and after DISMISS (${row.case}) (02 scenario 2)`,
    run() {
      const source = SOURCES[row.source];

      // FIT ⇔ THE SOURCE DECLARES A RESIZE CONTROL FRAME; SCALE OTHERWISE (ADR-003). Never keyed
      // on transport, on an origin, or on an `isRemote` boolean — a `local-pty` in fullscreen
      // still fits (it gets more columns) and a `mirror` still scales (a bigger picture of the
      // same 80). That the same source behaves identically in all three hosts is the clearest
      // single demonstration that the extraction worked.
      const presented = geometryPlanFor(source, OVERLAY_BOX);
      const dismissed = geometryPlanFor(source, INLINE_BOX);
      assert.equal(presented.mode, row.mode);
      assert.equal(presented.reflows, row.mode === GEOMETRY_FIT, row.response);
      assert.equal(presented.anchor, "top-left");

      // THE RESPONSE IS IDENTICAL AFTER PRESENT AND AFTER DISMISS — the box changed either way,
      // and the second change is not a special case.
      assert.equal(dismissed.mode, presented.mode, "the same response on the way back");
      assert.equal(dismissed.emitsResizeFrame, presented.emitsResizeFrame);
      assert.equal(dismissed.reflows, presented.reflows);
      assert.equal(dismissed.anchor, presented.anchor);
      assert.equal(typeof dismissed.emitter, typeof presented.emitter);

      // THE FAR END IS TOLD <frames> PER RE-MEASURE.
      if (row.frames === 0) {
        // A `scale` SOURCE EMITS NO FRAME BECAUSE IT DECLARES NO RESIZE CONTROL FRAME, not
        // because of an early return in the send path — the guard is STRUCTURAL, so a fourth
        // host cannot forget it.
        assert.equal(presented.emitsResizeFrame, false);
        assert.equal(presented.emitter, null, "there is no emitter to send through");
        assert.equal(presented.controlFrame, null);
        assert.equal(dismissed.emitter, null);
        // …and its screen is the far end's own geometry in both boxes: a smaller box scales the
        // PICTURE and never reflows the SCREEN.
        assert.equal(presented.cols, 80);
        assert.equal(presented.rows, 24);
        assert.equal(dismissed.cols, 80);
        assert.ok(presented.scale > dismissed.scale, "a bigger box is a bigger picture of the same 80×24");
      } else {
        assert.equal(presented.emitsResizeFrame, true);
        assert.equal(typeof presented.emitter, "function");
        const sent = [];
        const first = presented.emitter(presented.cols, presented.rows, (frame) => sent.push(frame), null);
        assert.equal(sent.length, 1, "exactly ONE resize frame per fit");
        assert.equal(first.sent, true);
        assert.deepEqual(JSON.parse(sent[0]), { type: "resize", cols: OVERLAY_BOX.cols, rows: OVERLAY_BOX.rows });

        // AND A RE-MEASURE THAT CHANGES NOTHING EMITS NOTHING AT ALL.
        const again = emitFit(presented.cols, presented.rows, (frame) => sent.push(frame), first.message);
        assert.equal(again.sent, false);
        assert.equal(again.reason, "no-change");
        assert.equal(sent.length, 1, "still one frame on the wire");

        // …and the dismiss's own re-measure DOES emit, because that box really is different.
        const back = emitFit(dismissed.cols, dismissed.rows, (frame) => sent.push(frame), first.message);
        assert.equal(back.sent, true);
        assert.equal(sent.length, 2);
        assert.deepEqual(JSON.parse(sent[1]), { type: "resize", cols: INLINE_BOX.cols, rows: INLINE_BOX.rows });
      }
    },
  })),

  {
    name: "terminal-fullscreen/02 the control CONSUMES the shell's tick rather than adding a timer beside it — the request carries `onLayout`, and the shell fires it after present AND after dismiss (02 scenario 2, the clause ADR-009 puts in the contract)",
    run() {
      const ticks = [];
      const request = terminalFullscreenRequest({
        source: LOCAL_PTY,
        posture: POSTURE_INTERACTIVE,
        sessionKey: "session-key",
        label: "interactive terminal for 46/05",
        onLayout: () => ticks.push("tick"),
      });
      // The control hands the shell a re-measure to call; it does not schedule one of its own for
      // the transition. Both shipping implementations independently discovered the one-frame
      // defer, and m45 put it in the contract so 46 and 49 would not each re-derive it against a
      // shell they do not own and get it subtly different.
      assert.equal(typeof request.onLayout, "function");
      request.onLayout();
      assert.deepEqual(ticks, ["tick"]);

      // The state machine's half of the same clause: a tick on present AND a tick on dismiss.
      const presenting = fullscreenReducer(fullscreenState(), { type: "present", occupant: request });
      assert.equal(presenting.layoutTick, 1, "one tick on present");
      const gone = fullscreenReducer(presenting, { type: "dismiss", id: request.id, via: "control" });
      assert.equal(gone.layoutTick, 2, "and a second on dismiss — the box changed back");
      // …and nothing ticks for a transition that did not happen.
      assert.equal(fullscreenReducer(presenting, { type: "dismiss", id: "someone-else" }).layoutTick, 1);
    },
  },

  {
    name: "terminal-fullscreen/02 the request carries the LIVE node and its home, and the control declares it paints its own chrome — the shape ADR-009 fixed for this caller, read back as a value (02 background)",
    run() {
      const node = { nodeName: "DIV" };
      const home = { nodeName: "DIV" };
      const opener = { focus() {} };
      const dismissals = [];
      const request = terminalFullscreenRequest({
        source: MIRROR,
        posture: POSTURE_INTERACTIVE,
        sessionKey: "46/05:mirror",
        label: "interactive terminal for 46/05 → aof-wsl",
        node,
        home,
        opener,
        onDismiss: () => dismissals.push("told"),
      });

      // THE NODE ITSELF, not a React element to be re-rendered somewhere else — that is what
      // guarantees one xterm, one socket, one PTY through both transitions.
      assert.equal(request.node, node, "the LIVE node travels in the request");
      assert.equal(request.home, home, "…and where it came from, so dismissal puts it back exactly there");
      assert.equal(request.opener, opener, "…and the control that opened it, so focus returns THERE");

      // THE OCCUPANT OWNS ITS CHROME. DESIGN §S3 requires the fullscreen header to be the inline
      // header's identity fragment verbatim; a second light-theme shell bar above a dark terminal
      // is the residual chrome DESIGN forbids by name.
      assert.equal(request.ownsChrome, true);
      assert.equal(presentedStateModel(fullscreenReducer(fullscreenState(), { type: "present", occupant: request })).exitControl.renderedBy, "occupant");

      // AND THE OCCUPANT IS TOLD when the shell dismisses it. Two of the three ways out are the
      // shell's — `Escape` on a read-only occupant, and being REPLACED, since occupants never
      // stack — and without this the caller would keep rendering into a node the shell had
      // already sent home.
      assert.equal(typeof request.onDismiss, "function");
      request.onDismiss();
      assert.deepEqual(dismissals, ["told"]);
    },
  },
];
