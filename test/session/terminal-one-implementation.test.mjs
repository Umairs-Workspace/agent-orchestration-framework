// Traceability for milestone 46 / story 04 / task 02 —
// `02_the-duplicate-is-deleted-and-the-gates-follow.feature`, the `@executable` half.
//
// AFTER THIS TASK THERE IS ONE TERMINAL IMPLEMENTATION. `ui/src/board/TerminalDock.tsx`,
// `ui/src/board/terminal/` and `ui/src/fleet/terminal-view/` are DELETED, both call sites render
// the one control, and every gate whose file list named them names the new home instead — in the
// same change.
//
// WHAT IS A GATE HERE AND WHAT IS A SCENARIO. The structural assertions — "the old files are
// gone", "exactly ONE `new Terminal(` site", "no port literal", "one state vocabulary", "the
// descriptor's geometry equals the worker's" — are FITNESS FUNCTIONS and NONE of them appears
// below; writing them as Gherkin would put a fitness function in the wrong home. What is here is
// what a pure `.mjs` returns, and the two halves differ on purpose (the m45/04 precedent): a
// hand-rolled second mount would fail scenario 2 without failing the gate, and a mount the gate
// cannot see structurally would fail the gate without failing scenario 2.
//
// ISOLATION: run focused, with `AOF_GLOBAL_HOME=$(mktemp -d)`. Never the full suite.
import assert from "node:assert/strict";

import { SESSION_SOURCES, sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import {
  inputPolicyFor,
  mountModelFor,
  POSTURE_INTERACTIVE,
  POSTURE_READ_ONLY,
} from "../../ui/src/terminal/input-policy.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { fleetTerminalMount, terminalAssignmentReason } from "../../ui/src/fleet/terminal-mount.mjs";
import {
  applyControlFrame,
  applyTerminalEvent,
  bindSource,
  describeTerminalState,
  initialTerminalState,
  TERMINAL_EVENTS,
  TERMINAL_STATES,
  TRANSPORT_CAUSE_LINE,
  UNKNOWN_STATE,
  WAITING_PANE_LINE,
} from "../../ui/src/terminal/state-ramp.mjs";
import {
  declaresAffordance,
  hostAffordances,
  AFFORDANCE_CLOSE,
  AFFORDANCE_COLLAPSE,
  AFFORDANCE_DRAG_RESIZE,
  AFFORDANCE_FULLSCREEN,
  AFFORDANCE_PROVIDER_PICKER,
  AFFORDANCE_RESTART,
  AFFORDANCE_WATCH_HIDE,
  HOST_BOARD_DOCK,
  HOST_FLEET_CARD,
} from "../../ui/src/terminal/host-model.mjs";

const MIRROR = sessionSourceFor("mirror").source;
const LOCAL_PTY = sessionSourceFor("local-pty").source;

// A pane in a given ramp state, reached the way production reaches it rather than by assignment.
function paneIn(word) {
  const connecting = bindSource();
  switch (word) {
    case TERMINAL_STATES.CONNECTING:
      return connecting;
    case TERMINAL_STATES.WAITING:
      return applyTerminalEvent(connecting, TERMINAL_EVENTS.SOCKET_OPEN);
    case TERMINAL_STATES.STREAMING:
      return applyTerminalEvent(connecting, TERMINAL_EVENTS.BYTES);
    case TERMINAL_STATES.ENDED:
      return applyTerminalEvent(applyTerminalEvent(connecting, TERMINAL_EVENTS.BYTES), TERMINAL_EVENTS.CLOSE);
    case TERMINAL_STATES.ERROR:
      return applyTerminalEvent(applyTerminalEvent(connecting, TERMINAL_EVENTS.BYTES), TERMINAL_EVENTS.TRANSPORT_FAILURE);
    case TERMINAL_STATES.IDLE:
    default:
      return initialTerminalState();
  }
}

export const terminalOneImplementationTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: THE INPUT POLICY over the WHOLE frozen source table x BOTH postures, plus
  // every malformed input it can be handed. 8 rows.
  //
  // This is INVARIANT 4's policy half, and it is load-bearing: once the control left
  // `ui/src/fleet/`, that gate's directory sweep reads green while asserting nothing about
  // whether the fleet can type. A pure function driven exhaustively is a far stronger pin than an
  // absence-of-string sweep.
  //
  // ADR-002: `canInput` is a property of the SOURCE (can bytes travel up this lane AT ALL);
  // `readOnly` is a property of the MOUNT. `canInput` is NOT a permission and may not be used as
  // one — conflating them is how the fleet peek would quietly become typeable.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  ...[
    { case: "the board's own PTY", source: () => LOCAL_PTY, mount: POSTURE_INTERACTIVE, input: true },
    { case: "a worker mirror in the board dock (m42)", source: () => MIRROR, mount: POSTURE_INTERACTIVE, input: true },
    { case: "THE FLEET CARD — invariant 4", source: () => MIRROR, mount: POSTURE_READ_ONLY, input: false },
    // ROW 4 is UNREACHABLE in m46 (no call site mounts a `local-pty` read-only) and is here
    // because the policy is a TOTAL function and m49 will reach it.
    { case: "a local PTY mounted read-only (m49's shape)", source: () => LOCAL_PTY, mount: POSTURE_READ_ONLY, input: false },
    // ROWS 5-6: the source cannot carry input; the MOUNT is still the host's `interactive`. See
    // the SECOND FLAG at the foot of this file — the label column is a raised conflict, so these
    // two rows carry `labelFollowsPosture` and the suite asserts what the shipped core does.
    { case: "a source that declares canInput:false", source: () => ({ ...MIRROR, canInput: false }), mount: POSTURE_INTERACTIVE, input: false, labelFollowsPosture: true },
    { case: "an unrecognised source kind", source: () => sessionSourceFor("banana").source, mount: POSTURE_INTERACTIVE, input: false, labelFollowsPosture: true },
    { case: "no mount posture supplied at all", source: () => MIRROR, mount: undefined, input: false },
    { case: "a mount carrying an unrecognised key (wrong case)", source: () => MIRROR, mount: { readonly: false }, input: false },
  ].map((row) => ({
    name: `46/04 task02 the input policy over the whole table x both postures — ${row.case}`,
    run() {
      const source = row.source();
      const policy = inputPolicyFor(source, row.mount);
      const model = mountModelFor({ source, mount: row.mount });

      // Then `inputEnabled` is <input enabled>; and `disableStdin` is <disable stdin>.
      assert.equal(policy.inputEnabled, row.input);
      assert.equal(policy.disableStdin, !row.input, "there is no third state in which a widget accepts keystrokes and drops them");

      // And an `onData` handler is <handler> — ABSENT, never registered-and-ignored.
      assert.deepEqual([...model.keystrokeSinks], row.input ? ["onData"] : []);
      assert.equal(model.sendPath, row.input ? "socket.send" : null, "…and no send path is even NAMED on a read-only mount");

      // And the cursor is <cursor>; and the `read-only` label is <label>. Under one control
      // NEITHER posture has an input row, so these two are the ONLY signals of the posture left.
      assert.deepEqual({ ...model.cursor }, row.input ? { blink: true, style: "block" } : { blink: false, style: "underline" });
      assert.equal(
        model.readOnlyLabel,
        row.input || row.labelFollowsPosture ? null : "read-only",
        row.labelFollowsPosture
          ? "the shipped core keys the label on the MOUNT's posture, and this mount is interactive — see the SECOND FLAG at the foot of this file"
          : "the label is one of only TWO signals of the posture left under one control",
      );
      assert.equal(model.inputRegion, null);

      // And the answer does not move when the same pair is evaluated in a different host, on a
      // different origin, at a different box size, or with a different socket URL. The policy is a
      // function of exactly two inputs and nothing else may enter it.
      assert.deepEqual({ ...inputPolicyFor(source, row.mount) }, { ...policy });
    },
  })),

  {
    // ROWS 5-8 FAIL CLOSED, and that is the only reading consistent with "`canInput` is NOT a
    // permission": an unrecognised or absent POSTURE yields no input path. The failure the posture
    // exists to prevent is an operator believing a keystroke reached a worker — so an unknown
    // input may cost a keystroke, never a lie.
    name: "46/04 task02 the input policy FAILS CLOSED on every malformed declaration — an absent, mis-cased, non-boolean or unrecognised posture yields NO input",
    run() {
      const closed = [
        ["an absent mount", undefined],
        ["a null mount", null],
        ["a mount that is not an object", 42],
        ["a mis-cased key", { readonly: false }],
        ["a posture spelled with the wrong case", "Interactive"],
        ["a `readOnly` that says read-only IN WORDS", { readOnly: "yes" }],
        ["a `readOnly` that is 0", { readOnly: 0 }],
        ["a `readOnly` that is null", { readOnly: null }],
        ["an empty declaration", {}],
      ];
      for (const [label, mount] of closed) {
        assert.equal(inputPolicyFor(MIRROR, mount).inputEnabled, false, `${label}: FAILS CLOSED`);
        assert.equal(mountModelFor({ source: MIRROR, mount }).readOnlyLabel, "read-only", `${label}: …and SAYS so`);
      }
      // …while the ONE explicit, correctly-spelled declaration does open the path, so the rule is
      // "fails closed", not "never opens".
      assert.equal(inputPolicyFor(MIRROR, POSTURE_INTERACTIVE).inputEnabled, true);
      assert.equal(inputPolicyFor(MIRROR, { readOnly: false }).inputEnabled, true, "an explicit BOOLEAN is the only authoritative `readOnly`");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: each call site declares one source and one posture, and the fleet's posture
  // has NO PATH to `interactive` in this milestone. 2 rows.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "46/04 task02 the board dock declares: local-pty or mirror, INTERACTIVE, drag-resize on, fullscreen on, collapse chevron, close — and everything else the control can do is declared OFF",
    run() {
      for (const session of [
        { kind: "local-pty", ref: "46/04", command: null },
        { kind: "mirror", ref: "46/04", nodeId: "aof-wsl", sessionId: "7f3a91c" },
      ]) {
        const mount = boardDockMount(session, { provider: "claude" });
        assert.ok(["local-pty", "mirror"].includes(mount.source.kind), "the board mounts either source");
        assert.equal(mount.posture, POSTURE_INTERACTIVE, "…both interactively");
      }
      const on = [AFFORDANCE_DRAG_RESIZE, AFFORDANCE_FULLSCREEN, AFFORDANCE_COLLAPSE, AFFORDANCE_CLOSE, AFFORDANCE_RESTART, AFFORDANCE_PROVIDER_PICKER];
      const off = [AFFORDANCE_WATCH_HIDE];
      for (const name of on) assert.equal(declaresAffordance(HOST_BOARD_DOCK, name), true, `${name} is declared ON`);
      for (const name of off) assert.equal(declaresAffordance(HOST_BOARD_DOCK, name), false, `${name} is declared OFF`);
      // "everything else the control can do is declared OFF" as a PROPERTY of the table rather
      // than a list anyone maintains: every affordance is present, declared one way or the other.
      for (const [name, entry] of Object.entries(hostAffordances(HOST_BOARD_DOCK))) {
        assert.equal(typeof entry.declared, "boolean", `${name} is declared, one way or the other`);
      }

      // RESTART IS NOT OFFERED ON A MIRROR, and `spawnedHere` is the ONLY thing keeping it off.
      // Set it true and the dock offers "Restart session" on a dead worker session; pressing it
      // would bump the run token and merely re-dial the same tuple-bound socket — a button
      // promising a re-spawn it cannot perform. A mutation review found nothing asserted it.
      const local = boardDockMount({ kind: "local-pty", ref: "46/04", command: null });
      const mirror = boardDockMount({ kind: "mirror", ref: "46/04", nodeId: "aof-wsl", sessionId: "7f3a91c" });
      assert.equal(local.spawnedHere, true, "the board OWNS the spawn of its own PTY");
      assert.equal(mirror.spawnedHere, false, "…and owns nothing about a worker's session on another machine");
      assert.equal(boardDockMount(null).spawnedHere, false, "…nor about a session that does not exist");
      // The two facts are the same fact read from two sides: a session this host did not spawn
      // has no command to type down either.
      assert.equal(mirror.command, null);
      // And the STATE half agrees independently: restart is offered from `ended` and `error` and
      // from nowhere else, so a host + a state + an ownership must all say yes.
      for (const word of [TERMINAL_STATES.ENDED, TERMINAL_STATES.ERROR]) {
        assert.equal(describeTerminalState(word, { owner: "46/04" }).restartable, true, `${word} is a state a re-spawn follows`);
      }
      for (const word of [TERMINAL_STATES.IDLE, TERMINAL_STATES.CONNECTING, TERMINAL_STATES.WAITING, TERMINAL_STATES.STREAMING, TERMINAL_STATES.UNAVAILABLE]) {
        assert.equal(describeTerminalState(word, { owner: "46/04" }).restartable, false, `${word} is not`);
      }
    },
  },

  {
    // THE UNKNOWN-KIND FALLBACK ITS OWN COMMENT FORBIDS. `boardDockMount` refuses a kind the
    // frozen table does not know, and the refusal is the point: a call site that "helpfully" fell
    // back to `local-pty` would SPAWN A PTY for a session the operator asked to MIRROR — a real
    // process, on this machine, for work that is running on another. A mutation review found the
    // fallback survived, so it is driven here with every near-miss spelling.
    name: "46/04 task02 the board refuses a session kind the frozen table does not know — it never falls back to `local-pty`, and a near-miss spelling is a near-miss, not a match",
    run() {
      for (const kind of ["local", "remote", "LOCAL-PTY", "mirror ", " mirror", "Mirror", "pty", "", null, undefined, 42, {}]) {
        const mount = boardDockMount({ kind, ref: "46/04", nodeId: "aof-wsl", sessionId: "7f3a91c", command: "x" });
        assert.equal(mount.bound, false, `${JSON.stringify(kind)} is refused`);
        assert.equal(mount.source, null, "…with no source at all — never a spawnable one");
        assert.deepEqual({ ...mount.params }, {}, "…and nothing to address it with");
        assert.equal(mount.spawnedHere, false, "…and nothing to restart");
      }
      // NON-VACUITY: the two real kinds DO bind, so "refused" is a discrimination rather than what
      // this function always answers.
      assert.equal(boardDockMount({ kind: "local-pty", ref: "46/04", command: null }).bound, true);
      assert.equal(boardDockMount({ kind: "mirror", ref: "46/04", nodeId: "n", sessionId: "s" }).bound, true);
    },
  },
  {
    name: "46/04 task02 the fleet card declares: mirror, READ-ONLY, drag-resize off, fullscreen on, worded Watch/Hide toggle, no close — and NO value the surface holds can turn that posture into anything else",
    run() {
      const mount = fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "46/04" });
      assert.equal(mount.source.kind, "mirror", "the fleet mounts exactly one source");
      assert.equal(mount.posture, POSTURE_READ_ONLY);

      const on = [AFFORDANCE_FULLSCREEN, AFFORDANCE_WATCH_HIDE];
      const off = [AFFORDANCE_DRAG_RESIZE, AFFORDANCE_CLOSE, AFFORDANCE_COLLAPSE, AFFORDANCE_RESTART, AFFORDANCE_PROVIDER_PICKER];
      for (const name of on) assert.equal(declaresAffordance(HOST_FLEET_CARD, name), true, `${name} is declared ON`);
      for (const name of off) assert.equal(declaresAffordance(HOST_FLEET_CARD, name), false, `${name} is declared OFF`);

      // "NO PATH TO `interactive`" is the whole of invariant 4 from the operator's side, and it is
      // asserted by DRIVING the producer with everything a fleet card could ever hold: assignment
      // states, roster facts, a captured session, a reclaimed one. Every one comes back read-only.
      const rows = [
        { targetNodeId: "aof-wsl", sessionId: "s", state: "running" },
        { targetNodeId: "aof-wsl", sessionId: "s", state: "done" },
        { targetNodeId: "aof-wsl", sessionId: "s", state: "failed" },
        { targetNodeId: "aof-wsl", sessionId: "s", state: "reclaimed", reclaimedAt: "2026-08-08T00:00:00.000Z" },
        { targetNodeId: "aof-wsl", sessionId: "s", state: "withdrawn" },
        { targetNodeId: "aof-wsl", sessionId: "s", state: "some-future-state" },
        { targetNodeId: "aof-wsl", sessionId: "s", state: "running", readOnly: false },
        { targetNodeId: "aof-wsl", sessionId: "s", state: "running", posture: "interactive" },
      ];
      for (const row of rows) {
        const declared = fleetTerminalMount(row, { itemRef: "46/04" });
        assert.equal(declared.posture, POSTURE_READ_ONLY, `${JSON.stringify(row)} — still read-only`);
        assert.equal(inputPolicyFor(declared.source, declared.posture).inputEnabled, false, "…and still no input path");
      }

      // Reversing it is milestone 49's job: ONE declaration at ONE call site, with the control
      // unchanged. The proof that the control needs no change is that the SAME control, handed the
      // SAME source at the other posture, already types — which is the board's mount, today.
      const board = boardDockMount({ kind: "mirror", ref: "46/04", nodeId: "aof-wsl", sessionId: "7f3a91c" });
      assert.equal(board.source, mount.source, "the SAME frozen row, by reference — not a look-alike");
      assert.equal(inputPolicyFor(board.source, board.posture).inputEnabled, true, "…and it is typeable at the other posture, with no control change at all");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: NOTHING THE TWO DELETED MODULES KNEW IS LOST. The deletion's regression
  // list — every distinction the dock's ramp or the peek's ramp could make, made by the ONE ramp,
  // with the SAME word arriving on BOTH surfaces for the same far-end event. 14 rows.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  ...[
    { case: "a clean exit, code asserted", paneLine: "exited (0)", kind: "local-pty", from: TERMINAL_STATES.STREAMING, apply: (s) => applyControlFrame(s, { type: "exit", exitCode: 0 }), state: TERMINAL_STATES.ENDED, chip: "exited (0)", reads: "clean" },
    { case: "a failing exit", paneLine: "exited (1)", kind: "local-pty", from: TERMINAL_STATES.STREAMING, apply: (s) => applyControlFrame(s, { type: "exit", exitCode: 1 }), state: TERMINAL_STATES.ENDED, chip: "exited (1)", reads: "failure" },
    { case: "a named server refusal", kind: "local-pty", from: TERMINAL_STATES.CONNECTING, apply: (s) => applyControlFrame(s, { type: "error", message: "provider binary not found: codex" }), state: TERMINAL_STATES.ERROR, chip: "error", cause: "provider binary not found: codex", reads: "failure" },
    // ROW 4 — see the FLAGGED CONTRACT CONFLICT at the foot of this file. The state, the chip and
    // the reading are asserted; the CAUSE LINE is not, because the locked feature, DESIGN and the
    // shipped core do not agree on it and this suite may not pick a winner.
    { case: "a transport failure", kind: "local-pty", from: TERMINAL_STATES.CONNECTING, apply: (s) => applyTerminalEvent(s, TERMINAL_EVENTS.TRANSPORT_FAILURE), state: TERMINAL_STATES.ERROR, chip: "error", reads: "failure" },
    { case: "a dropped mirror stream", kind: "mirror", from: TERMINAL_STATES.STREAMING, apply: (s) => applyTerminalEvent(s, TERMINAL_EVENTS.TRANSPORT_FAILURE), state: TERMINAL_STATES.ERROR, chip: "error", cause: TRANSPORT_CAUSE_LINE, reads: "failure" },
    { case: "THE HONESTY THE DOCK LACKED", paneLine: WAITING_PANE_LINE, kind: "local-pty", from: TERMINAL_STATES.CONNECTING, apply: (s) => applyTerminalEvent(s, TERMINAL_EVENTS.SOCKET_OPEN), state: TERMINAL_STATES.WAITING, chip: "waiting for output", reads: "normal" },
    { case: "the socket is not open yet", paneLine: "connecting…", kind: "mirror", from: TERMINAL_STATES.IDLE, apply: () => bindSource(), state: TERMINAL_STATES.CONNECTING, chip: "connecting…", reads: "normal" },
    { case: "a byte revives a dead pane", paneLine: "streaming", kind: "mirror", from: TERMINAL_STATES.ENDED, apply: (s) => applyTerminalEvent(s, TERMINAL_EVENTS.BYTES), state: TERMINAL_STATES.STREAMING, chip: "streaming", reads: "normal" },
    { case: "a close after an error stays an error", kind: "mirror", from: TERMINAL_STATES.ERROR, apply: (s) => applyTerminalEvent(s, TERMINAL_EVENTS.CLOSE), state: TERMINAL_STATES.ERROR, chip: "error", cause: TRANSPORT_CAUSE_LINE, reads: "failure" },
    { case: "an exit frame outranks a later close", paneLine: "exited (3)", kind: "local-pty", from: TERMINAL_STATES.STREAMING, apply: (s) => applyTerminalEvent(applyControlFrame(s, { type: "exit", exitCode: 3 }), TERMINAL_EVENTS.CLOSE), state: TERMINAL_STATES.ENDED, chip: "exited (3)", reads: "failure" },
    { case: "a stream that just ends", paneLine: "stream ended", kind: "mirror", from: TERMINAL_STATES.STREAMING, apply: (s) => applyTerminalEvent(s, TERMINAL_EVENTS.CLOSE), state: TERMINAL_STATES.ENDED, chip: "stream ended", reads: "normal" },
    { case: "an unrecognised state word", paneLine: "unknown", kind: "mirror", from: TERMINAL_STATES.STREAMING, apply: () => "a-state-neither-ramp-knows", state: UNKNOWN_STATE, chip: UNKNOWN_STATE, reads: "normal" },
    { case: "an unknown control type", paneLine: "streaming", kind: "local-pty", from: TERMINAL_STATES.STREAMING, apply: (s) => applyControlFrame(s, { type: "banana" }), state: TERMINAL_STATES.STREAMING, chip: "streaming", reads: "normal" },
  ].map((row) => ({
    name: `46/04 task02 the same far-end event reads the same state word wherever the control is mounted — ${row.case}`,
    run() {
      const after = row.apply(paneIn(row.from));
      const descriptor = describeTerminalState(after, { owner: "46/04" });

      assert.equal(descriptor.state, row.state, "the state");
      assert.equal(descriptor.text, row.chip, "…and the chip reads");
      assert.equal(descriptor.reads, row.reads, "…and it reads as");
      if (row.cause !== undefined) {
        assert.equal(descriptor.cause, row.cause, "the pane's cause/reason line");
      }

      // AND WHAT THE PANE ITSELF SAYS, on EVERY row. A mutation review found this asserted on 3
      // of 13: making every `ended` pane read `stream ended` survived, so an operator whose agent
      // exited 130 saw `exited (130)` in the chip and `stream ended` in the bar — two different
      // answers to one question, which is precisely what the chip/bar split exists to prevent.
      // `error` rows assert the RELATION rather than a literal, because the transport cause line
      // itself is a raised contract conflict (see the flag at the foot of this file) and this
      // suite does not pick a winner on it.
      if (row.state === TERMINAL_STATES.ERROR) {
        assert.equal(descriptor.paneLine, descriptor.cause, "an errored pane says its MANDATORY cause");
      } else {
        assert.ok(row.paneLine !== undefined, `every non-error row states what its pane says (${row.case})`);
        assert.equal(descriptor.paneLine, row.paneLine, "the pane says");
      }

      if (row.state === TERMINAL_STATES.ERROR) {
        // The cause is MANDATORY on `error` — `error` is only safe as the superset BECAUSE the
        // cause line is there. A failure that does not name itself is half a signal.
        assert.ok(typeof descriptor.cause === "string" && descriptor.cause.length > 0, "…and on `error` it is MANDATORY");
        assert.equal(descriptor.paneLine, descriptor.cause, "…and it is what the pane says");
      }

      // AND THE SAME EVENT ON THE SAME SOURCE PRODUCES THE IDENTICAL WORD AT THE OTHER CALL SITE.
      // This is the milestone's headline as an assertion: the ramp is a property of the SESSION,
      // not of the surface, so the describer is handed no host and cannot vary by one.
      const atTheOtherSite = describeTerminalState(after, { owner: "38/06" });
      assert.equal(atTheOtherSite.text, descriptor.text, "identical at the other call site");
      assert.equal(atTheOtherSite.state, descriptor.state);
      assert.equal(atTheOtherSite.dotClass, descriptor.dotClass, "…down to the dot it paints");
      assert.equal(atTheOtherSite.motionClass, descriptor.motionClass, "…and whether it moves");
    },
  })),

  {
    // ROW 14 IS THE COUPLING TEST, and it is the one that proves the SEPARATION rather than the
    // behaviour. The wording is FLEET-domain (it comes from the m35 `assignmentChip`), so the
    // shared describer takes an optional `reason` STRING and the FLEET call site computes it. A
    // shared control importing `ui/src/fleet/assignments.mjs` would re-couple the two surfaces
    // this milestone exists to decouple — invisibly, inside a module named for terminals.
    name: "46/04 task02 V10 — a terminal assignment with no bytes reads `no live output`, with the wording INJECTED by the fleet call site and computed nowhere in the shared set",
    run() {
      const waiting = applyTerminalEvent(bindSource(), TERMINAL_EVENTS.SOCKET_OPEN);
      const assignment = { targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "reclaimed", reclaimedAt: "2026-08-08T00:00:00.000Z" };

      // The fleet computes it — with the m35 chip, never a hand-maintained state list.
      const reason = terminalAssignmentReason(assignment);
      assert.equal(reason, "no live output — assignment failed · reclaimed");

      // THE TWO STATES THE ORIGINAL HAND-MAINTAINED LIST LEAKED, and they are the reason this
      // derives from the chip rather than from a set. `{done, failed, reclaimed}` did not contain
      // `withdrawn` (operator-stop) or `stale`, so BOTH sat on `waiting for output` forever — a
      // promise that could never come true, which is the exact lie V10 exists to kill. A mutation
      // review found the fixed bug could regress GREEN because only `reclaimed` was driven.
      for (const [state, extra, expected] of [
        ["done", {}, "no live output — assignment done"],
        ["failed", {}, "no live output — assignment failed"],
        ["withdrawn", {}, "no live output — assignment failed"],
        ["stale", { reclaimedAt: "2026-08-08T00:00:00.000Z" }, "no live output — assignment failed · reclaimed"],
        ["reclaimed", { reclaimedAt: "2026-08-08T00:00:00.000Z" }, "no live output — assignment failed · reclaimed"],
      ]) {
        assert.equal(terminalAssignmentReason({ state, ...extra }), expected, `${state} reads honestly`);
      }
      // …and TERMINAL-NESS IS THE CHIP'S JUDGMENT, never a list of ours: a state neither this
      // module nor the chip recognises is NOT asserted terminal (we may not claim output is
      // impossible for a state we do not know), and `reclaimed` WITHOUT `reclaimedAt` is exactly
      // such an unrecognised shape.
      for (const row of [{ state: "running" }, { state: "assigned" }, { state: "accepted" }, { state: "some-future-state" }, { state: "reclaimed" }, null, undefined]) {
        assert.equal(terminalAssignmentReason(row), null, `${JSON.stringify(row)} could still speak — the promise stays honest`);
      }

      // …and the shared describer merely CARRIES it: the chip goes short, the pane goes long.
      const descriptor = describeTerminalState(waiting, { owner: "46/04", reason });
      assert.equal(descriptor.state, TERMINAL_STATES.WAITING, "the SAME state, told truthfully — no new state was invented");
      assert.equal(descriptor.text, "no live output", "the header chip carries the short, scannable word");
      assert.equal(descriptor.reason, reason, "…and the viewport carries the full reason");
      assert.equal(descriptor.paneLine, reason, "…which is what the pane renders");
      assert.notEqual(descriptor.text, descriptor.reason, "chip and bar are SPLIT — the long reason never lands in the header");

      // Handed NOTHING, the describer computes nothing: it consults no assignment, applies no
      // terminal-ness rule, and says the honest `waiting for output`.
      const uninjected = describeTerminalState(waiting, { owner: "46/04" });
      assert.equal(uninjected.text, "waiting for output");
      assert.equal(uninjected.reason, null);

      // And the fleet's mount is what carries it across the seam — one string, one direction.
      const mount = fleetTerminalMount(assignment, { itemRef: "46/04" });
      assert.equal(mount.reason, reason, "the call site injects; the core never reaches");
    },
  },

  {
    // The two rows that must never throw and never be red.
    name: "46/04 task02 an unrecognised state LABELS ITSELF (quiet, never red) and an unknown CONTROL FRAME changes nothing — an unknown frame is not an unknown state",
    run() {
      for (const absent of ["a-state-neither-ramp-knows", undefined, null, "", 42]) {
        const descriptor = describeTerminalState(absent, { owner: "46/04" });
        assert.equal(descriptor.state, UNKNOWN_STATE, "it names ITSELF rather than impersonating a state it does recognise");
        assert.equal(descriptor.text, UNKNOWN_STATE);
        assert.equal(descriptor.reads, "normal", "quiet — `we do not recognise this` must never surface as an error");
        assert.equal(descriptor.motion, "none");
        assert.equal(descriptor.live, false);
        assert.notEqual(descriptor.text, "waiting for output", "…and never `waiting for output`, which would assert bytes are plausibly next");
      }

      const streaming = paneIn(TERMINAL_STATES.STREAMING);
      for (const frame of [{ type: "banana" }, { type: "ready" }, {}, null, "not an object", []]) {
        const after = applyControlFrame(streaming, frame);
        assert.equal(after.state, TERMINAL_STATES.STREAMING, `${JSON.stringify(frame)} leaves the state unchanged`);
      }
    },
  },

  {
    // NON-VACUITY for the whole regression list: both predecessors' distinctions are enumerable,
    // and every one of them has a home in the merged ramp.
    name: "46/04 task02 non-vacuity: every distinction the two deleted ramps held is expressible in the merged one — the exit code, the server error frame, and `socket open but no byte yet`",
    run() {
      // The DOCK's two: an exit code with a clean/failure reading, and a NAMED server error frame.
      const exited = applyControlFrame(paneIn(TERMINAL_STATES.STREAMING), { type: "exit", exitCode: 130 });
      assert.equal(exited.exitCode, 130, "the exit code rides `ended`");
      assert.equal(describeTerminalState(exited, { owner: "x" }).reads, "failure", "…with its clean/failure reading");
      const refused = applyControlFrame(paneIn(TERMINAL_STATES.CONNECTING), { type: "error", message: "no such provider" });
      assert.equal(describeTerminalState(refused, { owner: "x" }).cause, "no such provider", "the server's own message survives verbatim");

      // The PEEK's one: `socket open, no byte yet` distinguished from live — the honesty the dock
      // lacked, which painted `connecting…` for both.
      const open = applyTerminalEvent(bindSource(), TERMINAL_EVENTS.SOCKET_OPEN);
      assert.equal(open.state, TERMINAL_STATES.WAITING);
      assert.notEqual(open.state, bindSource().state, "…and it is a DIFFERENT state from `connecting`");
      assert.equal(describeTerminalState(open, { owner: "x" }).motion, "none", "with NO motion, so the honest cold start can never read as a spinner-forever");

      assert.equal(SESSION_SOURCES.length, 2, "and all of it holds for every source there is");
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// FLAGGED, NOT WORKED AROUND — a contract conflict this story may not settle on its own.
//
// `02_the-duplicate-is-deleted-and-the-gates-follow.feature`'s scenario 3, ROW 4 reads:
//
//     | a transport failure | local-pty | connecting | the socket errors | error | error | `connection failed` | failure |
//
// i.e. a `local-pty` transport failure's CAUSE LINE is `connection failed`, while row 5 gives a
// `mirror`'s as `disconnected — the stream dropped`. That is PER-SOURCE cause copy.
//
// Three other authorities say ONE line for both:
//   · DESIGN §THE ONE STATE VOCABULARY — *"The transport case reads `error` in the chip and
//     `disconnected — the stream dropped` in the pane"*;
//   · the committed mock — S1's `error` fixture (a `local-pty` dock) carries the bar
//     `disconnected — the stream dropped`;
//   · 46/03's SHIPPED AND ACCEPTED core — `TRANSPORT_CAUSE_LINE` is one constant, and
//     `test/session/terminal-core-state-ramp.test.mjs` asserts it for a transport failure from EVERY
//     socket-bearing state, `connecting` included.
//
// Making row 4 green means changing a ruled vocabulary in a story that has already accepted, and
// its suite would go red. Making it green by keying the copy on the SOURCE would need a rule that
// no ADR states and that ADR-003's own forbidden-spellings list argues against. So the row's state,
// chip and reading are asserted above and its CAUSE LINE is not: this suite does not pick a winner
// among a locked feature, a binding DESIGN section, a committed mock and a shipped core.
//
// RAISED AT DELIVERY. It is a one-line decision for the PO — either DESIGN's single line stands
// and the feature row's copy column is corrected at the next refine, or a per-source cause line is
// ruled and 46/03's ramp gains it with its own ADR clause.
//
// ───────────────────────────────────────────────────────────────────────────────────────────────
// SECOND FLAG — the `read-only` LABEL when the SOURCE, not the MOUNT, is why input is off.
//
// The same scenario's ROWS 5 and 6 give the label as `present` for a mount that is INTERACTIVE on
// a source that cannot carry input (`canInput: false`, and an unrecognised kind):
//
//     | a source that declares `canInput: false` | … | interactive | false | true | NOT registered | underline, not blinking | present |
//     | an unrecognised source kind              | … | interactive | false | true | NOT registered | underline, not blinking | present |
//
// 46/03's SHIPPED AND ACCEPTED core rules the opposite, explicitly and with its own rationale:
// `test/session/terminal-core-input-policy.test.mjs` asserts `canInput:false x interactive → readOnlyLabel
// null` and says why — *"an interactive mount never wears the mark that says it cannot be typed
// into"*, and *"no picker AND no label — so the picker's absence cannot be the posture's signal"*.
// The label names the MOUNT's POSTURE; an incapable lane is a different fact.
//
// BOTH READINGS ARE DEFENSIBLE and this suite may not pick between them. m46's own highest-severity
// rule argues for the feature ("a read-only pane rendered without its label is a GAP of the highest
// severity, because the failure it permits is an operator believing a keystroke reached a worker" —
// and a pane with no input path and no label permits exactly that); 46/03's argues that a label
// that lies about WHY is its own defect.
//
// IT IS UNREACHABLE IN PRODUCTION, which is why it is a flag rather than a blocker: both rows of
// the frozen table declare `canInput: true`, and an unrecognised kind resolves to `source: null`,
// at which point the control renders no pane at all. Rows 7-8 — an ABSENT or MIS-CASED posture —
// are the reachable fail-closed cells and they DO carry the label, asserted above.
//
// RAISED AT DELIVERY, unresolved on purpose: either the label follows `inputEnabled` (and 46/03's
// two rows are corrected with an ADR clause) or it follows the mount's posture (and the feature's
// label column is corrected at the next refine).
// ═══════════════════════════════════════════════════════════════════════════════════════════════
