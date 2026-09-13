// Traceability for milestone 46 / story 04 / task 03 —
// `03_the-unavailable-pane-names-its-cause.feature`, the `@executable` half.
//
// A pane whose ORIGIN cannot be resolved renders a labelled `unavailable` state that NAMES ITS
// CAUSE — `not checked out on this machine` / `board unreachable` — never a blank pane, never a
// silently dead one. Spike 44 sub-question 5 binds the state; DESIGN §The unavailable pane fixes
// the wording, and the wording is not this task's to invent.
//
// ═══ DG-46-3, READ THIS BEFORE LOGGING A FINDING ══════════════════════════════════════════════
// THE STATE SHIPS IN m46 WITH NO PRODUCTION PRODUCER. It is built, unit-driven, and rendered from
// a FIXTURE. The board dock is always same-origin with its own PTY; a fleet card whose tuple does
// not resolve renders NO PANEL AT ALL, not an unavailable one. The producer is MILESTONE 49, which
// dials a per-pane origin. A conformance reviewer must NOT log the state's absence from a
// production render as a fresh finding — it is named in advance precisely so "not built" can be
// told from "built and never triggered".
//
// ═══ THE DISTINCTION THIS TASK EXISTS TO PROTECT ══════════════════════════════════════════════
// Two absences, two meanings, and they must not converge:
//   · NO PANEL AT ALL — a card whose assignment carries no resolvable (nodeId, sessionId) tuple
//     renders nothing: not an empty frame, not a disabled toggle, and NOT an `unavailable` pane.
//     THAT RULE IS NOT RELAXED HERE, and the story that unifies two components is exactly where it
//     would be relaxed by accident — an `unavailable` state is a tempting home for "we have
//     nothing to show".
//   · UNAVAILABLE — there IS an owner and there IS a session; what cannot be resolved is WHERE to
//     reach it. The pane keeps its HEADER so that, in a grid of panes (m49), the operator can tell
//     WHICH one is unavailable.
// And one more boundary the origin seam creates: an origin we do not HAVE is `unavailable`; an
// origin we have and cannot CONNECT to is `error`.
//
// ISOLATION: run focused, with `AOF_GLOBAL_HOME=$(mktemp -d)`. Never the full suite.
import assert from "node:assert/strict";

import { sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import { terminalSocketUrl } from "../../ui/src/terminal/socket-url.mjs";
import { terminalPaneIdentity } from "../../ui/src/terminal/pane-identity.mjs";
import { fleetTerminalMount, NO_STREAM, resolveTerminalStream } from "../../ui/src/fleet/terminal-mount.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import {
  applyControlFrame,
  applyTerminalEvent,
  bindSource,
  describeTerminalState,
  holdsSocket,
  initialTerminalState,
  terminalStateUnavailable,
  SOCKET_BEARING_STATES,
  TERMINAL_EVENTS,
  TERMINAL_STATES,
  TERMINAL_STATE_LIST,
  TRANSPORT_CAUSE_LINE,
  UNAVAILABLE_CAUSES,
} from "../../ui/src/terminal/state-ramp.mjs";

const MIRROR = sessionSourceFor("mirror").source;
const WORKSPACE_PATH = "~/source/lark-guard";

export const terminalUnavailablePaneTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: an origin that cannot be resolved yields `unavailable`, naming its cause
  // and the operator's way forward. 3 rows — and row 3 is a RAISED DESIGN GAP, not a copy
  // decision (see the flag at the foot of this file).
  // ══════════════════════════════════════════════════════════════════════════════════════════
  ...[
    {
      case: "the work is on another machine",
      cause: UNAVAILABLE_CAUSES.WORKSPACE_NOT_LOCAL,
      workspacePath: WORKSPACE_PATH,
      line1: "not checked out on this machine",
      // The recovery is the workspace's OWN PATH — the operator's answer to "where is it, then" —
      // supplied by the caller, because only the caller knows it.
      recovery: WORKSPACE_PATH,
    },
    {
      case: "the board's origin did not answer",
      cause: UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE,
      workspacePath: null,
      line1: "board unreachable",
      // The command that opens it — the same command m45's unavailable nav item carries.
      recovery: "aof work ui",
    },
    {
      // THE THIRD CAUSE, ruled by the designer on 2026-08-08 after this story RAISED it as a gap
      // rather than inventing copy. It is the one this milestone's own origin seam created, and
      // neither existing pair fits: `board unreachable` / `aof work ui` names the WRONG SERVER
      // and gives a command that does not produce a fleet, and `not checked out on this machine`
      // asserts something unknown. A refusal naming the wrong cause is worse than one naming none.
      //
      // The WORD is `no fleet origin` and not `fleet unreachable`, on the same discipline that
      // made `streaming` beat `running`: the client asked the fleet nothing and was handed
      // nothing, so asserting a far-end state it never observed would be a lie.
      case: "no fleet origin was ever handed over",
      cause: UNAVAILABLE_CAUSES.NO_FLEET_ORIGIN,
      workspacePath: null,
      line1: "no fleet origin",
      recovery: "aof mesh ui",
    },
  ].map((row) => ({
    name: `46/04 task03 an unresolved origin yields \`unavailable\`, naming its cause and the way forward — ${row.case}`,
    run() {
      const state = terminalStateUnavailable({ cause: row.cause, workspacePath: row.workspacePath });
      const descriptor = describeTerminalState(state, { owner: "46/04" });

      // Then the state is `unavailable` and the chip label is `unavailable`.
      assert.equal(descriptor.state, TERMINAL_STATES.UNAVAILABLE);
      assert.equal(descriptor.text, "unavailable");

      // And line 1 of the pane reads <cause> — VERBATIM, and it is DESIGN's wording, not this
      // task's to invent.
      assert.equal(descriptor.cause, row.line1);
      // And line 2 carries <recovery>.
      assert.equal(descriptor.recovery, row.recovery);

      // And the state reads as `blocked`, NEVER as a failure. `destructive` says *something
      // broke*; a workspace that is not checked out on this machine is not broken, it is
      // elsewhere. This is m25's stale-is-never-red rule at a new address.
      assert.equal(descriptor.reads, "blocked");
      assert.notEqual(descriptor.reads, "failure");
      assert.ok(!/destructive|red/.test(descriptor.dotClass), "the dot is not a failure treatment");
      assert.ok(!/red/.test(descriptor.labelClass), "…and neither is the word");

      // And it carries NO MOTION at all — never a spinner, never `connecting…`. Nothing is coming.
      assert.equal(descriptor.motion, "none");
      assert.equal(descriptor.motionClass, "");

      // And the dot is the house's ABSENT/NOT-YET primitive: dashed and hollow, distinguishable
      // from every filled one without colour.
      assert.equal(descriptor.dot, "dashed-hollow");
      assert.match(descriptor.dotClass, /dashed/);
      assert.match(descriptor.dotClass, /bg-transparent/);

      // And the header is still FULLY POPULATED — an unavailable pane still HAS an owner, and a
      // pane that goes blank INCLUDING its header is the failure mode this state exists to
      // prevent. In a grid of panes (m49) the operator must be able to tell WHICH one is out.
      assert.equal(descriptor.rendersHeader, true);
      assert.equal(descriptor.rendersPane, true);
      assert.equal(descriptor.owner, "46/04");
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: what is NOT unavailable — the three neighbouring cases, each with its own
  // answer. 6 rows. Getting these confused is how a blank pane or a red "elsewhere" ships.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    // AN UNRECOGNISED CAUSE BORROWS NOBODY'S PAIR — and this is the rule the design gap itself
    // taught. Defaulting to a wrong-but-plausible pair is exactly what produced the gap: a pane
    // saying `board unreachable` about a FLEET sends the operator to run `aof work ui` on a board
    // that is already running. A mutation review found BOTH bad fallbacks survived — pointing the
    // unknown-cause default at `WORKSPACE_NOT_LOCAL` (wrong cause, and a null recovery, because
    // its recovery is a workspace path nobody supplied) and at `{ causeLine: null, recovery: null }`
    // (A BLANK UNAVAILABLE PANE — precisely what DESIGN §The unavailable pane exists to prevent).
    name: "46/04 task03 an unrecognised cause borrows NO named pair, and is never blank — the three named pairs are the total set, and a fourth cause gets the state's own word",
    run() {
      const named = new Map([
        [UNAVAILABLE_CAUSES.WORKSPACE_NOT_LOCAL, ["not checked out on this machine", null]],
        [UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE, ["board unreachable", "aof work ui"]],
        [UNAVAILABLE_CAUSES.NO_FLEET_ORIGIN, ["no fleet origin", "aof mesh ui"]],
      ]);
      assert.equal(Object.keys(UNAVAILABLE_CAUSES).length, 3, "THREE is the total set for m46 (non-vacuity)");

      const claimedLines = new Set([...named.values()].map(([line]) => line));
      const claimedCommands = new Set([...named.values()].map(([, recovery]) => recovery).filter(Boolean));

      for (const unknown of ["some-future-cause", "workspace-not-local ", "", null, undefined, 42]) {
        const descriptor = describeTerminalState(terminalStateUnavailable({ cause: unknown }), { owner: "46/04" });
        assert.equal(descriptor.state, TERMINAL_STATES.UNAVAILABLE, `${JSON.stringify(unknown)} is still the unavailable STATE`);
        // NEVER BLANK. The chip reads `unavailable`, the header renders in full, and the cause
        // line names the fact the module does have.
        assert.equal(descriptor.text, "unavailable");
        assert.equal(descriptor.rendersHeader, true, "a pane that goes blank INCLUDING its header is the failure this state exists to prevent");
        assert.ok(typeof descriptor.cause === "string" && descriptor.cause.length > 0, "…and the cause line is never null");
        // …AND NEVER ONE OF THE THREE. It may not claim a machine, a board or a fleet.
        assert.ok(!claimedLines.has(descriptor.cause), `${JSON.stringify(unknown)} does not borrow a named cause line — got "${descriptor.cause}"`);
        assert.ok(descriptor.recovery == null || !claimedCommands.has(descriptor.recovery), "…nor a named command, which is the half that would send an operator to the wrong terminal");
        assert.equal(descriptor.reads, "blocked", "…and it is still quiet, never a failure");
      }

      // The three NAMED causes still answer, exactly, so the fallback above is a discrimination
      // and not what this branch always does.
      for (const [cause, [line, recovery]] of named) {
        const descriptor = describeTerminalState(terminalStateUnavailable({ cause }), { owner: "46/04" });
        assert.equal(descriptor.cause, line, `${cause} names its own cause`);
        assert.equal(descriptor.recovery, recovery, `${cause} names its own recovery`);
      }
      // …and WORKSPACE_NOT_LOCAL's recovery is the workspace's OWN PATH when the caller supplies
      // one, which is the only reason its table entry carries none.
      assert.equal(
        describeTerminalState(terminalStateUnavailable({ cause: UNAVAILABLE_CAUSES.WORKSPACE_NOT_LOCAL, workspacePath: WORKSPACE_PATH }), { owner: "46/04" }).recovery,
        WORKSPACE_PATH,
      );
    },
  },

  {
    // THE PRODUCER SIDE OF CAUSE 3, and the pin the designer asked for: a board-hosted `mirror`
    // whose fleet origin was never handed over yields cause 3 and NEVER cause 2. This is the
    // pane's only path in m46 and it is fixture-only — the board's command layer always resolves
    // a default — which is why it is asserted as a MODEL fact here rather than rendered anywhere.
    name: "46/04 task03 a board-hosted mirror with NO fleet origin resolves cause 3 (`no fleet origin` / `aof mesh ui`) and never cause 2 (`board unreachable` / `aof work ui`)",
    run() {
      // The board HAS its own origin — the page it is served from — and has been handed no fleet.
      const refusal = terminalSocketUrl(MIRROR, { nodeId: "aof-wsl", sessionId: "7f3a91c" }, { origins: { self: "http://127.0.0.1:41773" } });
      assert.equal(refusal.url, null, "no URL, so no socket");
      assert.deepEqual([...refusal.missing], ["fleet"], "and the refusal names WHICH origin — which is what makes the right cause selectable");

      const descriptor = describeTerminalState(
        terminalStateUnavailable({ cause: UNAVAILABLE_CAUSES.NO_FLEET_ORIGIN }),
        { owner: "46/04" },
      );
      assert.equal(descriptor.cause, "no fleet origin");
      assert.equal(descriptor.recovery, "aof mesh ui", "the command that produces the MISSING server, not the one that is already running");
      assert.notEqual(descriptor.cause, "board unreachable", "the board is fine — it is the surface doing the rendering");
      assert.notEqual(descriptor.recovery, "aof work ui");
    },
  },

  {
    name: "46/04 task03 the origin resolved and the socket was REFUSED — that is `error` with `connection failed`'s own cause line, specifically NOT `unavailable`",
    run() {
      // An origin the surface HAS: the URL builds, so a socket genuinely existed to be refused.
      const built = terminalSocketUrl(MIRROR, { nodeId: "aof-wsl", sessionId: "7f3a91c" }, { origins: { fleet: "http://127.0.0.1:4181" } });
      assert.ok(built.url != null, "precondition: the origin RESOLVED — this is not the unavailable case");

      const refused = applyTerminalEvent(bindSource(), TERMINAL_EVENTS.TRANSPORT_FAILURE);
      const descriptor = describeTerminalState(refused, { owner: "46/04" });
      assert.equal(descriptor.state, TERMINAL_STATES.ERROR);
      assert.notEqual(descriptor.state, TERMINAL_STATES.UNAVAILABLE);
      // A refusal on a resolved origin is a FAILURE, and failures are named as failures.
      assert.equal(descriptor.reads, "failure");
      assert.ok(typeof descriptor.cause === "string" && descriptor.cause.length > 0, "…and it names its own cause, mandatorily");
    },
  },
  {
    name: "46/04 task03 a pane that was LIVE and then died is `error` — unavailability is a statement about an ORIGIN, never about a session that ended",
    run() {
      const dropped = applyTerminalEvent(applyTerminalEvent(bindSource(), TERMINAL_EVENTS.BYTES), TERMINAL_EVENTS.TRANSPORT_FAILURE);
      const descriptor = describeTerminalState(dropped, { owner: "46/04" });
      assert.equal(descriptor.state, TERMINAL_STATES.ERROR);
      assert.notEqual(descriptor.state, TERMINAL_STATES.UNAVAILABLE);
      assert.equal(descriptor.cause, TRANSPORT_CAUSE_LINE);
      assert.equal(descriptor.reads, "failure");
    },
  },
  ...[
    {
      case: "no target node on the assignment",
      assignment: { sessionId: "7f3a91c", state: "running" },
      reason: NO_STREAM.NO_NODE,
      why: "no socket, no header, no toggle — the card simply has no terminal region",
    },
    {
      case: "no session captured yet",
      assignment: { targetNodeId: "aof-wsl", state: "running" },
      reason: NO_STREAM.NO_SESSION,
      why: "this is the NORMAL not-yet-captured case, and it must stay silent",
    },
    {
      case: "no assignment at all",
      assignment: null,
      reason: NO_STREAM.NO_ASSIGNMENT,
      why: "an honest outcome, never an error",
    },
  ].map((row) => ({
    name: `46/04 task03 what is NOT unavailable — ${row.case}: NO PANEL AT ALL, and specifically not an empty frame or a disabled toggle`,
    run() {
      const stream = resolveTerminalStream(row.assignment);
      assert.equal(stream.resolved, false);
      assert.equal(stream.reason, row.reason, "the refusal names WHICH half was missing");

      const mount = fleetTerminalMount(row.assignment, { itemRef: "46/04" });
      // Then the answer is NO PANEL AT ALL.
      assert.equal(mount.rendersPanel, false, row.why);
      assert.equal(mount.bound, false);
      assert.equal(mount.source, null, "…so there is no source to open a socket on either");

      // And it is specifically NOT `unavailable`, and not an empty frame. The two absences must
      // not converge, and this is the assertion that stops them.
      assert.notEqual(mount.noStream, TERMINAL_STATES.UNAVAILABLE);
      assert.equal(terminalSocketUrl(mount.source, mount.params, { origins: { fleet: "http://127.0.0.1:4181" } }).url, null, "no URL, so nothing to open");
    },
  })),
  {
    name: "46/04 task03 a stream with no nameable owner renders NO PANEL — V1: a terminal with no visible owner is never rendered, and it is never an anonymous terminal",
    run() {
      // A RESOLVED tuple — the stream is real — with neither an item ref nor an assignment id.
      const stream = resolveTerminalStream({ targetNodeId: "aof-wsl", sessionId: "7f3a91c" });
      assert.equal(stream.resolved, true, "precondition: the TUPLE resolves; only the OWNER cannot be named");

      const mount = fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c" }, {});
      assert.equal(mount.rendersPanel, false, "V1 — no visible owner, no terminal");

      // And the core says the same thing, structurally, with its cause named — so a caller that
      // renders on `rendered` cannot accidentally paint a pane nothing can name.
      const identity = terminalPaneIdentity({ source: MIRROR, params: { nodeId: "aof-wsl", sessionId: "7f3a91c" } });
      assert.equal(identity.rendered, false);
      assert.equal(identity.reason, "no-owner");
      assert.equal(identity.label, null, "…and there is no bare session hash to put on the screen");
    },
  },
  {
    name: "46/04 task03 the dock with nothing bound is `idle` and the centred empty line — nothing is wrong; nothing has been asked for yet",
    run() {
      const mount = boardDockMount(null);
      assert.equal(mount.bound, false);
      assert.equal(mount.rendersPanel, true, "the DOCK still renders its frame — that rule is the fleet's, not the dock's");

      const descriptor = describeTerminalState(initialTerminalState(), { owner: "46/04" });
      assert.equal(descriptor.state, TERMINAL_STATES.IDLE);
      assert.notEqual(descriptor.state, TERMINAL_STATES.UNAVAILABLE);
      assert.equal(descriptor.text, "idle");
      assert.equal(descriptor.reads, "normal", "not an error, and not a loading state");
      assert.equal(descriptor.motion, "none", "…and nothing suggests something is loading");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario: an unavailable pane opens no socket, and no transition can talk it into one.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "46/04 task03 an unavailable pane opens NO socket, and no transition can talk it into one — the only exit is a re-mount whose origin resolves",
    run() {
      // Then there is no URL to build — the builder yields nothing for an unresolved origin.
      const refusal = terminalSocketUrl(MIRROR, { nodeId: "aof-wsl", sessionId: "7f3a91c" }, { origins: { self: "http://127.0.0.1:41773" } });
      assert.equal(refusal.url, null);
      assert.equal(refusal.reason, "missing-origin");
      assert.deepEqual([...refusal.missing], ["fleet"], "…and the refusal names WHICH origin it did not have");
      // Nothing is guessed on the way: no `localhost`, no page origin substituted for a missing
      // fleet origin, no default port.
      assert.equal(refusal.authority, null);
      assert.equal(refusal.scheme, null);

      const unavailable = terminalStateUnavailable({ cause: UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE });
      const descriptor = describeTerminalState(unavailable, { owner: "46/04" });
      assert.equal(descriptor.opensSocket, false, "the structural half of `no socket is opened`, as a value");

      // And no socket is opened, so the pane never passes through `connecting` and never sits on
      // `waiting for output`. `unavailable` HOLDS NO SOCKET, which is why no transport event can
      // be delivered to it at all.
      assert.equal(holdsSocket(unavailable), false);
      assert.ok(!SOCKET_BEARING_STATES.includes(TERMINAL_STATES.UNAVAILABLE));

      // And no byte, no close and no error can arrive, because nothing is connected: the pane
      // cannot transition to any other state FROM WITHIN ITSELF.
      for (const event of Object.values(TERMINAL_EVENTS)) {
        const after = applyTerminalEvent(unavailable, event);
        assert.equal(after.state, TERMINAL_STATES.UNAVAILABLE, `${event} cannot move an unavailable pane`);
      }
      for (const frame of [{ type: "exit", exitCode: 0 }, { type: "error", message: "x" }, { type: "banana" }]) {
        assert.equal(applyControlFrame(unavailable, frame).state, TERMINAL_STATES.UNAVAILABLE, `${frame.type} cannot move it either`);
      }

      // And an `unavailable` pane is NEVER REACHED FROM a live state — it is entered before any
      // socket exists or not at all. Unavailability is a statement about the ORIGIN, not about a
      // session, so no event from any state can produce it.
      for (const word of TERMINAL_STATE_LIST.filter((state) => state !== TERMINAL_STATES.UNAVAILABLE)) {
        for (const event of Object.values(TERMINAL_EVENTS)) {
          assert.notEqual(
            applyTerminalEvent(word, event).state,
            TERMINAL_STATES.UNAVAILABLE,
            `no event reaches \`unavailable\` from \`${word}\` — a pane that was live and then died is \`error\``,
          );
        }
      }
      // (`unavailable` itself is excluded from that sweep for the reason asserted just above: it
      // holds no socket, so every event leaves it exactly where it was. Staying is not reaching.)
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE THIRD CAUSE — RAISED BY THIS STORY, RULED BY THE DESIGNER, AND NOW BUILT.
//
// `03_the-unavailable-pane-names-its-cause.feature`'s first scenario has a third Examples row for
// the case this milestone's own origin seam created, and the row's own note ruled how to handle
// it: *"THE BUILD MUST NOT INVENT A THIRD LINE: if this row cannot be satisfied with wording
// DESIGN fixes, it is a design gap raised against DESIGN §The unavailable pane and settled
// there."* It could not be, so it was raised. The designer settled it on 2026-08-08:
//
//     line 1 (cause)     no fleet origin
//     line 2 (recovery)  aof mesh ui
//
// WHY NOT A MAPPING ONTO ONE OF THE OTHER TWO, in the designer's own terms: `board unreachable`
// / `aof work ui` names the WRONG SERVER and gives the WRONG COMMAND — the board is fine, it is
// the surface doing the rendering, and `aof work ui` does not produce a fleet. `not checked out
// on this machine` asserts something unknown. And a single generalised "origin unresolved" pair
// cannot be written, because the RECOVERY LINE differs per origin kind.
//
// THREE IS THE TOTAL SET FOR m46, and the rule that came with it is asserted above: a cause
// outside the three may never BORROW one of their pairs. There is deliberately no "origin handed,
// fleet did not answer" cause — a resolved origin that will not connect is `error`.
//
// FOR A REVIEWER: cause 3 has NO FIXTURE ROW. The locked `@manual` scenario keeps its two
// Examples and the committed mock is silent on it, so its absence from ANY render is NOT a
// finding — and on the fleet card it is structurally impossible, because that page IS the fleet
// origin. In m46 it is reachable only from a fixture on the board; the command layer always
// resolves a default for a real one.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
