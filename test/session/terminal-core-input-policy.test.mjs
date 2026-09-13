// Traceability wiring for milestone 46 / story 03 / task 04 —
// tasks/04_input-is-capability-times-posture.feature (@executable).
//
// THE CHANNEL. `ui/src/terminal/input-policy.mjs` and `ui/src/terminal/provider-picker.mjs`
// are PURE, so the policy and the mount model are read as VALUES under plain `node` — what
// `inputEnabled` answers, what the mount model declares, which labels it carries, which
// chrome it offers. No bundler, no DOM, no xterm, no socket, no source read.
//
// THIS IS ARCH-TEST INVARIANT 4'S POLICY HALF, AND IT IS LOAD-BEARING. ADR-006 re-expresses
// invariant 4 as three assertions because a directory sweep of `ui/src/fleet/**` will read
// GREEN and VACUOUS once the control moves out of that directory — "worse than deleting it,
// because a green gate is read as a satisfied contract". Assertion 2 is this suite: the
// policy driven BEHAVIOURALLY over the whole frozen source table x both postures.
//
// The CALL-SITE half (`ui/src/fleet/Fleet.tsx` mounts the control read-only) and the
// surviving directory sweep are `acd-fleet-terminal-input-constrained`'s; whether the pill is
// PAINTED on both headers is 46/04's design-conformance review.
//
//   Scenario Outline: input is enabled only when the source can carry it and the mount
//     permits it (4 rows — the exhaustive truth table)
//   Scenario Outline: the same `mirror` source is interactive in the dock and read-only on a
//     fleet card (4 rows)
//   Scenario: a read-only mount yields no input path at all, rather than a disabled one
//   Scenario: an interactive mount is the only one that carries an input path
//   Scenario: the read-only posture is carried as an explicit label
//   Scenario Outline: interactive-only chrome follows the derivation (4 rows)
//   Scenario Outline: the provider picker keeps exactly one selection at all times (11 rows)
//   Scenario: the policy is exercised over every entry of the frozen table in both postures
import assert from "node:assert/strict";
import {
  POSTURE_INTERACTIVE,
  POSTURE_READ_ONLY,
  POSTURES,
  KEYSTROKE_SINK,
  SEND_PATH,
  READ_ONLY_LABEL,
  READ_ONLY_LABEL_TITLE,
  MOUNT_INTERACTIVE,
  MOUNT_READ_ONLY,
  mountPosture,
  inputPolicyFor,
  mountModelFor,
} from "../../ui/src/terminal/input-policy.mjs";
import {
  PROVIDER_IDS,
  initialPicker,
  selectProvider,
  isSelected,
  selectedCount,
} from "../../ui/src/terminal/provider-picker.mjs";
import { SESSION_SOURCES, sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";

const LOCAL_PTY = sessionSourceFor("local-pty").source;
const MIRROR = sessionSourceFor("mirror").source;
const SOURCES = { "local-pty": LOCAL_PTY, mirror: MIRROR };

// Both entries of the frozen table declare `canInput: true` (the mirror lane has carried
// input since m42), so a source that CANNOT carry input has to be synthesized. It is here
// because the AND is the contract: a future read-only-by-construction source must not become
// typeable by being mounted in the dock, and only these rows can catch that.
const CANNOT_CARRY_INPUT = {
  kind: "synthesized-read-only-lane",
  path: "/ws/elsewhere",
  params: [],
  originRole: "fleet",
  resizeControlFrame: null,
  canInput: false,
  fixedGeometry: { cols: 80, rows: 24 },
};

function flatten(value, prefix = "", out = {}) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) flatten(inner, prefix ? `${prefix}.${key}` : key, out);
    return out;
  }
  out[prefix] = Array.isArray(value) ? JSON.stringify(value) : value;
  return out;
}

function differingPaths(a, b) {
  const left = flatten(a);
  const right = flatten(b);
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => left[key] !== right[key])
    .sort();
}

const LOOKS_LIKE_A_CLASS = /(^|\s)(text|bg|border|opacity|ring|fill|stroke)-/;

export const terminalCoreInputPolicyTests = [
  // ======================================================================
  // Scenario Outline: input is enabled only when the source can carry it AND the mount permits it
  // ======================================================================
  //
  // THE `read-only label` COLUMN IS CARRIED HERE TOO, and it is not decoration. The label is
  // a property of the MOUNT's posture, never of the input OUTCOME — and rows 3 and 4 are the
  // only two rows in the whole feature that can tell those two readings apart, because they
  // are the only ones where a mount is interactive and input is nevertheless disabled. A
  // build that derived the label from `!inputEnabled` would put the `read-only` mark on an
  // INTERACTIVE pane (row 3) and pass every other assertion in this file. DESIGN calls the
  // mirror of that "a GAP of the highest severity in this milestone", and this outline is
  // where the frozen table's own rows make it visible. (Traced to feature 04's "the read-only
  // posture is carried as an explicit label" scenario — "a read-only mount of ANY source" —
  // applied over the truth table's four combinations. No Examples row was edited.)
  ...[
    { case: "a lane that carries input, mounted interactively", canInput: true, posture: POSTURE_INTERACTIVE, inputEnabled: true, readOnlyLabel: null },
    { case: "the SAME lane, mounted read-only", canInput: true, posture: POSTURE_READ_ONLY, inputEnabled: false, readOnlyLabel: READ_ONLY_LABEL },
    { case: "a lane that cannot carry input, mounted interactively", canInput: false, posture: POSTURE_INTERACTIVE, inputEnabled: false, readOnlyLabel: null },
    { case: "a lane that cannot carry input, mounted read-only", canInput: false, posture: POSTURE_READ_ONLY, inputEnabled: false, readOnlyLabel: READ_ONLY_LABEL },
  ].map((row) => ({
    name: `terminal-core/04 canInput=${row.canInput} x ${row.posture} → input ${row.inputEnabled ? "enabled" : "disabled"}, read-only label ${row.readOnlyLabel ?? "(none)"} (${row.case})`,
    run() {
      // Given a source whose input capability is <can input> / And a mount whose posture is <posture>
      const source = { ...CANNOT_CARRY_INPUT, canInput: row.canInput };
      const mount = mountPosture(row.posture);

      // When the input policy is applied / Then input is <input enabled> / And stdin is <stdin>
      const policy = inputPolicyFor(source, mount);
      assert.equal(policy.inputEnabled, row.inputEnabled);
      assert.equal(policy.disableStdin, !row.inputEnabled);

      // And the two answers are EXACT NEGATIONS of each other — there is no third state in
      // which a widget accepts keystrokes and drops them.
      assert.equal(policy.disableStdin, !policy.inputEnabled);
      assert.equal(typeof policy.inputEnabled, "boolean");
      assert.equal(typeof policy.disableStdin, "boolean");

      // The mount model agrees with the policy, so the two cannot drift.
      const model = mountModelFor({ source, mount });
      assert.equal(model.inputEnabled, row.inputEnabled);
      assert.equal(model.disableStdin, !row.inputEnabled);
      assert.equal(model.stdin, row.inputEnabled ? "enabled" : "disabled");

      // And the `read-only` label follows the POSTURE, on all three header models — never the
      // input outcome. Row 3 is the one that matters: input is disabled and the pane must
      // still NOT wear the read-only mark, because the mount permits typing and it is the
      // LANE that cannot carry it.
      assert.equal(model.readOnlyLabel, row.readOnlyLabel);
      assert.equal(model.inlineHeader.readOnlyLabel, row.readOnlyLabel);
      assert.equal(model.expandedHeader.readOnlyLabel, row.readOnlyLabel);
      assert.equal(model.readOnlyLabelTitle, row.readOnlyLabel == null ? null : READ_ONLY_LABEL_TITLE);
      assert.equal(
        model.readOnlyLabel != null,
        row.posture === POSTURE_READ_ONLY,
        "the label is a property of the mount's posture and of nothing else",
      );
      if (row.posture === POSTURE_INTERACTIVE) {
        assert.equal(model.readOnlyLabel, null, "an interactive mount never wears the mark that says it cannot be typed into");
      }
    },
  })),

  // ======================================================================
  // The POSTURE COERCION — every malformed or absent mount is READ-ONLY.
  // Feature 04: "input must be decided by a pure function of the source's capability and the
  // mount's posture, [and] a read-only mount must wire no input path". A mount nobody declared
  // has declared no permission, and a `readOnly` that is not a boolean is a MALFORMED
  // declaration rather than a false one.
  // ======================================================================
  ...[
    { case: "no mount argument at all — a forgotten second argument at a call site", mount: undefined, readOnly: true },
    { case: "an explicitly null mount", mount: null, readOnly: true },
    { case: "the posture as a bare string, read-only", mount: "read-only", readOnly: true },
    { case: "the posture as a bare string, interactive", mount: "interactive", readOnly: false },
    { case: "a bare string nothing recognises", mount: "readonly", readOnly: true },
    { case: "an empty mount object declaring no posture", mount: {}, readOnly: true },
    { case: "a hand-written mount whose readOnly is the STRING yes", mount: { readOnly: "yes" }, readOnly: true },
    { case: "a hand-written mount whose readOnly is the STRING false", mount: { readOnly: "false" }, readOnly: true },
    { case: "a readOnly that is 0", mount: { readOnly: 0 }, readOnly: true },
    { case: "a readOnly that is explicitly null", mount: { readOnly: null }, readOnly: true },
    { case: "a mount that is not an object at all", mount: 7, readOnly: true },
    { case: "the real interactive declaration, so the rule is not read-only-always", mount: { readOnly: false }, readOnly: false },
    { case: "the real read-only declaration", mount: { readOnly: true }, readOnly: true },
    { case: "the posture field alone, interactive", mount: { posture: "interactive" }, readOnly: false },
  ].map((row) => ({
    name: `terminal-core/04 the mount ${JSON.stringify(row.mount) ?? "(absent)"} is read as ${row.readOnly ? "READ-ONLY (fail-safe)" : "interactive"} (${row.case})`,
    run() {
      // The source CAN carry input in every row, so the only thing deciding the answer is the
      // mount — which is the whole point.
      const policy = inputPolicyFor(MIRROR, row.mount);
      assert.equal(MIRROR.canInput, true, "the lane can carry input, so the mount is the only decider here");

      assert.equal(policy.readOnly, row.readOnly);
      assert.equal(policy.posture, row.readOnly ? POSTURE_READ_ONLY : POSTURE_INTERACTIVE);
      assert.equal(policy.inputEnabled, !row.readOnly);
      assert.equal(policy.disableStdin, row.readOnly);

      // And a read-only reading is read-only IN FACT: no sink, no send path, no blinking
      // cursor, and the label present — not merely a boolean that some render site might
      // ignore.
      const model = mountModelFor({ source: MIRROR, mount: row.mount });
      if (row.readOnly) {
        assert.deepEqual([...model.keystrokeSinks], [], "a mount that is not clearly interactive wires NO input path");
        assert.equal(model.sendPath, null);
        assert.equal(model.cursor.blink, false);
        assert.equal(model.readOnlyLabel, READ_ONLY_LABEL);
      } else {
        assert.deepEqual([...model.keystrokeSinks], [KEYSTROKE_SINK], "an explicit interactive declaration is honoured");
        assert.equal(model.sendPath, SEND_PATH);
        assert.equal(model.cursor.blink, true);
        assert.equal(model.readOnlyLabel, null);
      }
    },
  })),

  // ======================================================================
  // Scenario Outline: the SAME `mirror` source is interactive in the dock and read-only on a card
  // ======================================================================
  ...[
    { case: "the board dock's own PTY", source: "local-pty", mount: POSTURE_INTERACTIVE, mountLabel: "in the board dock", inputEnabled: true },
    { case: "a worker mirror opened in the board dock", source: "mirror", mount: POSTURE_INTERACTIVE, mountLabel: "in the board dock", inputEnabled: true },
    { case: "the fleet card's peek at the same worker", source: "mirror", mount: POSTURE_READ_ONLY, mountLabel: "on a fleet card, read-only", inputEnabled: false },
    { case: "a local PTY on a read-only mount — the POSTURE decides", source: "local-pty", mount: POSTURE_READ_ONLY, mountLabel: "read-only", inputEnabled: false },
  ].map((row) => ({
    name: `terminal-core/04 ${row.source} mounted ${row.mountLabel} has input ${row.inputEnabled ? "enabled" : "disabled"} (${row.case})`,
    run() {
      const source = SOURCES[row.source];
      const before = JSON.parse(JSON.stringify(source));
      const policy = inputPolicyFor(source, mountPosture(row.mount));

      // Then input is <input enabled>
      assert.equal(policy.inputEnabled, row.inputEnabled);

      // And the source's own capability is unchanged by the mount — the posture never mutates
      // the descriptor it is applied to.
      assert.deepEqual(JSON.parse(JSON.stringify(source)), before);
      assert.equal(source.canInput, true, "the capability is untouched");

      // And reading the source's capability ALONE never answers whether input is wired:
      // `canInput` is a capability and the permission is the mount's.
      if (!row.inputEnabled) {
        assert.equal(source.canInput, true, "the lane CAN carry input and still is not wired — so the capability alone could not have told you");
        assert.notEqual(policy.inputEnabled, source.canInput, "capability and permission are genuinely different answers here");
      }
      assert.equal(
        inputPolicyFor(source, MOUNT_INTERACTIVE).inputEnabled !== inputPolicyFor(source, MOUNT_READ_ONLY).inputEnabled,
        true,
        "one descriptor, two answers — which is exactly what a single `interactive` flag on the source cannot do",
      );
    },
  })),

  // ======================================================================
  // Scenario: a read-only mount yields NO input path at all
  // ======================================================================
  {
    name: "terminal-core/04 a read-only mount yields no input path at all, rather than a disabled one",
    run() {
      // Given a source that can carry input / And a read-only mount / When the mount model is derived
      const model = mountModelFor({ source: MIRROR, mount: MOUNT_READ_ONLY });

      // Then it declares stdin disabled
      assert.equal(model.disableStdin, true);
      assert.equal(model.stdin, "disabled");
      assert.equal(model.inputEnabled, false);

      // And it registers NO keystroke sink whatsoever — no data handler, no key handler, no
      // binary handler, ABSENT rather than present-and-ignored.
      assert.deepEqual([...model.keystrokeSinks], [], "no sink is registered");
      const keys = Object.keys(flatten(model));
      for (const handler of ["onData", "onKey", "onBinary"]) {
        assert.ok(!keys.some((key) => key.includes(handler)), `${handler} is absent from the model, not present and ignored`);
        assert.ok(!JSON.stringify(model).includes(handler), `${handler} appears nowhere in the model`);
      }

      // And it names NO send path for keystrokes, so there is nothing for a later refactor to
      // re-enable by deleting a guard.
      assert.equal(model.sendPath, null);

      // And its cursor does not blink and is an underline — the "you can type here"
      // affordance is absent, which is the posture's second non-colour signal.
      assert.equal(model.cursor.blink, false);
      assert.equal(model.cursor.style, "underline");

      // And every one of those is a VALUE on the model, so a caller cannot ship the posture
      // as styling.
      for (const field of ["disableStdin", "stdin", "inputEnabled", "keystrokeSinks", "sendPath", "cursor", "readOnlyLabel"]) {
        assert.ok(field in model, `${field} is on the model`);
      }
    },
  },

  {
    name: "terminal-core/04 an interactive mount is the only one that carries an input path, and it carries a blinking cursor",
    run() {
      // Given a source that can carry input / And an interactive mount
      const model = mountModelFor({ source: MIRROR, mount: MOUNT_INTERACTIVE });

      // Then it declares stdin enabled
      assert.equal(model.disableStdin, false);
      assert.equal(model.stdin, "enabled");
      assert.equal(model.inputEnabled, true);

      // And it registers EXACTLY ONE keystroke sink and names EXACTLY ONE send path.
      assert.deepEqual([...model.keystrokeSinks], [KEYSTROKE_SINK]);
      assert.equal(model.keystrokeSinks.length, 1);
      assert.equal(model.sendPath, SEND_PATH);

      // And its cursor blinks — the affordance and the capability agree.
      assert.equal(model.cursor.blink, true);

      // And it carries no `read-only` label, because a pane that accepts keystrokes must
      // never wear the mark that says it does not.
      assert.equal(model.readOnlyLabel, null);
      assert.equal(model.inlineHeader.readOnlyLabel, null);
      assert.equal(model.expandedHeader.readOnlyLabel, null);
    },
  },

  // ======================================================================
  // Scenario: the read-only posture is carried as an explicit label
  // ======================================================================
  {
    name: "terminal-core/04 the read-only posture is carried as an explicit label, and the absence of an input box no longer distinguishes anything",
    run() {
      // Given a read-only mount of any source / When the mount model is derived
      const readOnly = mountModelFor({ source: MIRROR, mount: MOUNT_READ_ONLY });
      const interactive = mountModelFor({ source: MIRROR, mount: MOUNT_INTERACTIVE });

      // Then it carries the label `read-only`, AS TEXT, with its explanatory title.
      assert.equal(readOnly.readOnlyLabel, READ_ONLY_LABEL);
      assert.equal(readOnly.readOnlyLabel, "read-only");
      assert.equal(readOnly.readOnlyLabelTitle, READ_ONLY_LABEL_TITLE);
      assert.equal(
        readOnly.readOnlyLabelTitle,
        "This view mirrors the worker's terminal. It cannot type: keystrokes never reach the worker.",
      );

      // And the SAME label is on the inline header model and on the expanded header model —
      // one posture, both headers, because fullscreen is a bigger box and not a different pane.
      assert.equal(readOnly.inlineHeader.readOnlyLabel, READ_ONLY_LABEL);
      assert.equal(readOnly.expandedHeader.readOnlyLabel, READ_ONLY_LABEL);
      assert.equal(readOnly.inlineHeader.readOnlyLabelTitle, READ_ONLY_LABEL_TITLE);
      assert.equal(readOnly.expandedHeader.readOnlyLabelTitle, READ_ONLY_LABEL_TITLE);

      // And the model declares NO input region in EITHER posture, so the absence of an input
      // row signals nothing and the label is doing all the work.
      assert.equal(readOnly.inputRegion, null);
      assert.equal(interactive.inputRegion, null);

      // And the posture is never carried by colour, and never by a dimmed or greyed treatment
      // alone: the two postures' models differ in the INPUT PATH, in the CURSOR and in this
      // LABEL (plus the declaration itself) — and in nothing that only a colour could carry.
      const differing = differingPaths(readOnly, interactive);
      const families = {
        declaration: ["posture", "readOnly"],
        "the input path": ["inputEnabled", "disableStdin", "stdin", "keystrokeSinks", "sendPath"],
        "the cursor": ["cursor.blink", "cursor.style"],
        "the label": [
          "readOnlyLabel",
          "readOnlyLabelTitle",
          "inlineHeader.readOnlyLabel",
          "inlineHeader.readOnlyLabelTitle",
          "expandedHeader.readOnlyLabel",
          "expandedHeader.readOnlyLabelTitle",
        ],
      };
      const accounted = Object.values(families).flat().sort();
      assert.deepEqual(differing, accounted, "every difference between the two postures belongs to the input path, the cursor, the label or the declaration itself");
      for (const family of ["the input path", "the cursor", "the label"]) {
        for (const path of families[family]) assert.ok(differing.includes(path), `${family} genuinely differs at ${path}`);
      }
      // And none of the differing values is a class / colour treatment.
      const readOnlyFlat = flatten(readOnly);
      const interactiveFlat = flatten(interactive);
      for (const path of differing) {
        for (const value of [readOnlyFlat[path], interactiveFlat[path]]) {
          if (typeof value !== "string") continue;
          assert.ok(!LOOKS_LIKE_A_CLASS.test(value), `${path} carries meaning, not a colour class: ${value}`);
        }
      }
    },
  },

  // ======================================================================
  // Scenario Outline: interactive-only chrome follows the derivation
  // ======================================================================
  ...[
    { case: "a local session the operator is about to start", source: "local-pty", posture: POSTURE_INTERACTIVE, mountLabel: "in the board dock", offered: true },
    { case: "a worker mirror in the dock — the session already exists", source: "mirror", posture: POSTURE_INTERACTIVE, mountLabel: "in the board dock", offered: false },
    { case: "the fleet card's read-only peek", source: "mirror", posture: POSTURE_READ_ONLY, mountLabel: "on a fleet card, read-only", offered: false },
    { case: "a local PTY on a read-only mount", source: "local-pty", posture: POSTURE_READ_ONLY, mountLabel: "read-only", offered: false },
  ].map((row) => ({
    name: `terminal-core/04 the provider picker is ${row.offered ? "offered" : "not offered"} for ${row.source} mounted ${row.mountLabel} (${row.case})`,
    run() {
      const source = SOURCES[row.source];
      const model = mountModelFor({ source, mount: mountPosture(row.posture) });

      // Then the provider picker is <picker>
      assert.equal(model.providerPickerOffered, row.offered);

      // And whether the picker is offered is DERIVED from the source's declared params and
      // the mount's posture, not from a conditional at the call site.
      const declaresProvider = source.params.includes("provider");
      assert.equal(model.providerPickerOffered, declaresProvider && model.inputEnabled);
      // There is nothing to pick for a session that already exists on another machine.
      if (row.source === "mirror") assert.equal(declaresProvider, false, "a mirror declares no provider param at all");

      // And the picker's absence is never the thing that tells an operator the pane is
      // read-only — the LABEL is.
      if (row.posture === POSTURE_READ_ONLY) {
        assert.equal(model.readOnlyLabel, READ_ONLY_LABEL, "the label is the signal");
        assert.equal(model.providerPickerOffered, false);
      }
      // The mirror in the DOCK proves the point in the other direction: no picker, and no
      // read-only label either, so the picker's absence signals nothing about posture.
      if (row.source === "mirror" && row.posture === POSTURE_INTERACTIVE) {
        assert.equal(model.providerPickerOffered, false);
        assert.equal(model.readOnlyLabel, null, "no picker AND no label — so the picker's absence cannot be the posture's signal");
      }
    },
  })),

  // ======================================================================
  // Scenario Outline: the provider picker keeps exactly one selection at all times
  // ======================================================================
  ...[
    { case: "the default, before anything is chosen", start: null, select: undefined, after: "claude" },
    { case: "claude to codex", start: "claude", select: "codex", after: "codex" },
    { case: "claude to gemini", start: "claude", select: "gemini", after: "gemini" },
    { case: "codex to claude", start: "codex", select: "claude", after: "claude" },
    { case: "codex to gemini", start: "codex", select: "gemini", after: "gemini" },
    { case: "gemini to claude", start: "gemini", select: "claude", after: "claude" },
    { case: "gemini to codex", start: "gemini", select: "codex", after: "codex" },
    { case: "re-selecting the one already selected", start: "codex", select: "codex", after: "codex" },
    { case: "a provider id nothing recognises", start: "codex", select: "some-future-agent", after: "codex" },
    { case: "an empty id", start: "codex", select: "", after: "codex" },
    { case: "a selection applied to an absent picker state", start: "absent", select: undefined, after: "claude" },
  ].map((row) => ({
    name: `terminal-core/04 the picker starting at ${row.start ?? "(the default)"} and choosing ${JSON.stringify(row.select) ?? "(nothing)"} settles on ${row.after} (${row.case})`,
    run() {
      // Given a picker whose selection is <starting selection>
      let picker;
      if (row.start === "absent") picker = undefined;
      else if (row.start == null) picker = initialPicker();
      else picker = selectProvider(initialPicker(), row.start);
      if (row.start != null && row.start !== "absent") assert.ok(isSelected(picker, row.start), "the starting selection was actually reached");

      // When the provider <selected> is chosen
      const after = selectProvider(picker, row.select);

      // Then the selected provider is <selection after>, and exactly one reads as selected.
      assert.ok(isSelected(after, row.after), `${row.after} is selected`);
      assert.equal(selectedCount(after), 1, "exactly one provider reads as selected");

      // And the other two read as unselected — never two on, and never zero on. (An unknown
      // id is a no-op that leaves the selection VALID rather than clearing it: a picker that
      // can reach zero-on is a picker that can start a session with no provider.)
      const unselected = PROVIDER_IDS.filter((id) => !isSelected(after, id));
      assert.equal(unselected.length, 2, "the other two are unselected");
      assert.deepEqual(unselected.sort(), PROVIDER_IDS.filter((id) => id !== row.after).sort());
    },
  })),

  // ======================================================================
  // Scenario: the policy over EVERY entry of the frozen table in BOTH postures
  // ======================================================================
  {
    name: "terminal-core/04 the policy is total over the frozen source table x both postures, and only interactive mounts of input-capable sources yield an input path",
    run() {
      // When the input policy is applied to every entry of the frozen source table in both postures
      const combinations = [];
      for (const source of SESSION_SOURCES) {
        for (const posture of POSTURES) {
          const mount = mountPosture(posture);
          combinations.push({ source, posture, policy: inputPolicyFor(source, mount), model: mountModelFor({ source, mount }) });
        }
      }

      // Then every combination yields an answer — the policy is TOTAL over the table, not a
      // lookup with a hole in it.
      assert.equal(combinations.length, SESSION_SOURCES.length * POSTURES.length);
      assert.equal(combinations.length, 4, "two entries x two postures, and the table is frozen at two");
      for (const { source, posture, policy } of combinations) {
        assert.equal(typeof policy.inputEnabled, "boolean", `${source.kind} x ${posture} is answered`);
        assert.equal(policy.disableStdin, !policy.inputEnabled);
      }

      // And for EVERY entry, the read-only posture yields NO input path.
      for (const { source, posture, policy, model } of combinations) {
        if (posture !== POSTURE_READ_ONLY) continue;
        assert.equal(policy.inputEnabled, false, `${source.kind} is not typeable when mounted read-only`);
        assert.deepEqual([...model.keystrokeSinks], [], `${source.kind} registers no sink when mounted read-only`);
        assert.equal(model.sendPath, null);
        assert.equal(model.cursor.blink, false);
        assert.equal(model.readOnlyLabel, READ_ONLY_LABEL);
      }

      // And no entry becomes typeable by being read at a different origin, at a different
      // geometry, or under a different socket URL.
      for (const source of SESSION_SOURCES) {
        for (const twist of [
          { originRole: "self" },
          { originRole: "fleet" },
          { fixedGeometry: null },
          { fixedGeometry: { cols: 200, rows: 50 } },
          { resizeControlFrame: "resize" },
          { resizeControlFrame: null },
          { socketUrl: "wss://elsewhere.test:9443/ws/terminal-view?nodeId=a&sessionId=b" },
        ]) {
          const twisted = { ...source, ...twist };
          assert.equal(inputPolicyFor(twisted, MOUNT_READ_ONLY).inputEnabled, false, `${source.kind} stays read-only under ${JSON.stringify(twist)}`);
          assert.equal(
            inputPolicyFor(twisted, MOUNT_INTERACTIVE).inputEnabled,
            source.canInput === true,
            `${source.kind} is unchanged by ${JSON.stringify(twist)} on an interactive mount`,
          );
        }
      }

      // And the COUNT of combinations that yield an input path is exactly the count of
      // interactive mounts of input-capable sources — which is what makes this pin stronger
      // than an absence-of-string sweep over a directory the control no longer lives in.
      const withInput = combinations.filter(({ policy }) => policy.inputEnabled);
      const expected = combinations.filter(({ source, posture }) => source.canInput === true && posture === POSTURE_INTERACTIVE);
      assert.equal(withInput.length, expected.length);
      assert.equal(withInput.length, 2, "the board dock's PTY and a mirror opened in the dock — and nothing else");
      assert.deepEqual(
        withInput.map(({ source, posture }) => `${source.kind}@${posture}`).sort(),
        ["local-pty@interactive", "mirror@interactive"],
      );
    },
  },
];
