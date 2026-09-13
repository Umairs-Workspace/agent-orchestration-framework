// Traceability wiring for milestone 03 / story 02 — the @executable UI-logic
// (protocol-shape) scenarios across the two task features. These import the
// framework-free `.mjs` protocol modules the React dock also imports, so the
// dock-state ramp, the exactly-one-selected picker, and the fit→resize emit are
// asserted headlessly — NO PTY, NO browser (per the feature comments: the wire
// EFFECT on dock state, not the frame bytes as spec).
//
//   00_run-agent-terminal.feature
//     @executable Scenario Outline: an exit control message drives the dock to
//         the matching exited state (0→clean, 1→failure, 130→failure)
//     @executable Scenario Outline: fitting the pane to <cols>x<rows> tells the
//         session the new size exactly once (80x24, 120x30, 200x50)
//   01_provider-picker-and-missing.feature
//     @executable the picker starts with exactly one selected
//     @executable Scenario Outline: selecting a provider makes it the only one
//
// RE-POINTED AT THE ONE CONTROL'S CORE (milestone 46 / story 04). The three modules this suite
// imported — `board/terminal/{dock-state,provider-picker,resize}.mjs` — are DELETED; their
// behaviour lives in `ui/src/terminal/{state-ramp,provider-picker,geometry}.mjs`. Every scenario
// below still asserts what it always asserted, because every distinction it asserts SURVIVED the
// merge; only the module specifier and two state WORDS changed, and both changes are DESIGN's:
//   · `DOCK_STATES.RUNNING` → `TERMINAL_STATES.STREAMING` (change 1 — `running` asserted a
//     far-end PROCESS state a browser can never observe; `streaming` names what it CAN see);
//   · the exit-code clean/failure reading now rides the DESCRIBER's `reads`, where the merged
//     ramp puts it, rather than the state value.
// This is the "nothing the two deleted modules knew is lost" regression list, in its oldest form.
import assert from "node:assert/strict";
import {
  applyControlFrame,
  bindSource,
  describeTerminalState,
  TERMINAL_EVENTS,
  TERMINAL_STATES,
  applyTerminalEvent,
} from "../../ui/src/terminal/state-ramp.mjs";
import {
  initialPicker,
  selectProvider,
  isSelected,
  selectedCount,
  PROVIDER_IDS,
} from "../../ui/src/terminal/provider-picker.mjs";
import { emitFit } from "../../ui/src/terminal/geometry.mjs";

// The dock's old `RUNNING` state, in the merged vocabulary: a BOUND source whose socket has
// delivered bytes. `idle` holds no socket, so a byte cannot reach it — binding is what leaves it.
function streaming() {
  return applyTerminalEvent(bindSource(), TERMINAL_EVENTS.BYTES);
}

export const terminalDockTests = [
  // ===== 00_run-agent-terminal.feature — exit control message → dock state =====
  ...[
    { code: 0, reads: "clean" },
    { code: 1, reads: "failure" },
    { code: 130, reads: "failure" },
  ].map(({ code, reads }) => ({
    name: `terminal-dock/00 an exit control message with code ${code} drives the dock to ended reading "${reads}"`,
    async run() {
      // Given the dock is in the running state — `streaming` in the merged vocabulary
      const live = streaming();
      assert.equal(live.state, TERMINAL_STATES.STREAMING);
      // When the server reports the session exited with code <code>
      const next = applyControlFrame(live, { type: "exit", exitCode: code });
      // Then the dock shows the exited state reporting code <code>
      assert.equal(next.state, TERMINAL_STATES.ENDED, "the pane is in the ended state");
      assert.equal(next.exitCode, code, "the ended state reports the exact code");
      // And the exited state reads as "<reads-as>" — carried on the DESCRIBER now, where the
      // merged ramp puts it, and still spelled `exited (N)` in the chip.
      const descriptor = describeTerminalState(next);
      assert.equal(descriptor.reads, reads, `code ${code} reads as ${reads}`);
      assert.equal(descriptor.text, `exited (${code})`, "…and the label still carries the code");
    },
  })),

  // ===== 00_run-agent-terminal.feature — fit → exactly one resize =====
  ...[
    { cols: 80, rows: 24 },
    { cols: 120, rows: 30 },
    { cols: 200, rows: 50 },
  ].map(({ cols, rows }) => ({
    name: `terminal-dock/00 fitting the pane to ${cols}x${rows} tells the session the new size exactly once`,
    async run() {
      // Given the dock has an open session (a sink that records emitted frames)
      const sent = [];
      const send = (frame) => sent.push(frame);
      // When the pane is fitted to <cols> columns and <rows> rows
      const result = emitFit(cols, rows, send, null);
      // Then the session is told to resize to <cols> columns and <rows> rows
      assert.equal(result.sent, true, "a resize was emitted for the fit");
      assert.equal(result.message.cols, cols, "the resize carries the fitted columns");
      assert.equal(result.message.rows, rows, "the resize carries the fitted rows");
      const parsed = sent.map((frame) => JSON.parse(frame));
      assert.deepEqual(parsed[0], { type: "resize", cols, rows }, "the resize message tells the session the new size");
      // And exactly one resize is sent for that fit
      assert.equal(sent.length, 1, "exactly one resize frame is sent for the fit");

      // And a no-change re-fit does not re-emit (one resize PER fit).
      const again = emitFit(cols, rows, send, result.message);
      assert.equal(again.sent, false, "an identical re-fit does not emit a second resize");
      assert.equal(sent.length, 1, "still exactly one resize for the unchanged geometry");
    },
  })),

  // ===== 01_provider-picker-and-missing.feature — exactly-one-selected =====
  {
    name: "terminal-dock/01 the provider picker starts with exactly one provider selected",
    async run() {
      const picker = initialPicker();
      // Then exactly one of claude, codex or gemini is selected
      assert.equal(selectedCount(picker), 1, "exactly one provider is selected by default");
      const selected = PROVIDER_IDS.filter((id) => isSelected(picker, id));
      assert.equal(selected.length, 1, "precisely one provider id reads as selected");
      // And the other two providers are not selected
      const unselected = PROVIDER_IDS.filter((id) => !isSelected(picker, id));
      assert.equal(unselected.length, 2, "the other two are not selected");
    },
  },

  // ===== 01_provider-picker-and-missing.feature — selecting moves the single selection =====
  ...[
    ["claude", "codex"],
    ["claude", "gemini"],
    ["codex", "claude"],
    ["codex", "gemini"],
    ["gemini", "claude"],
    ["gemini", "codex"],
  ].map(([from, to]) => ({
    name: `terminal-dock/01 selecting ${to} (from ${from}) makes ${to} the only selected provider`,
    async run() {
      // Given the provider "<from>" is currently selected
      let picker = selectProvider(initialPicker(), from);
      assert.ok(isSelected(picker, from), `${from} is selected to start`);
      // When I select the provider "<to>"
      picker = selectProvider(picker, to);
      // Then "<to>" is the selected provider
      assert.ok(isSelected(picker, to), `${to} is now selected`);
      // And "<from>" is no longer selected
      assert.ok(!isSelected(picker, from), `${from} is no longer selected`);
      // And exactly one provider is selected
      assert.equal(selectedCount(picker), 1, "exactly one provider remains selected");
    },
  })),
];
