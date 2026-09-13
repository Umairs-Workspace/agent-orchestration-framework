// milestone 49 / story 03 / task 01 — THE MOUNT DECLARES THE POSTURE (@executable).
//
// Every scenario and every Examples ROW of
// `wiki/work/49_milestone_terminals-home/stories/03_story_pane-declaration-and-invariant-4/tasks/01_the-mount-declares-the-posture.feature`,
// driven against the SHIPPED `ui/src/home/session-mount.mjs` and read through the SHIPPED
// `inputPolicyFor` / `mountModelFor` / `sessionSourceFor` — never a policy re-implemented here.
// ADR-003 states `input-policy.mjs` is not edited by this milestone; the home CONSUMES that
// model, and these scenarios are what make "consumes" checkable rather than claimed.
//
// ISOLATION: no store, no server, no port, no clock, no global. Literal rows in, values out.
import assert from "node:assert/strict";
import {
  HOME_NO_STREAM,
  READ_ONLY_CAUSE_REASON,
  ROSTER_GONE_REASON,
  homeSessionMount,
} from "../../ui/src/home/session-mount.mjs";
import { FEED_NO_PRODUCER, FEED_PRODUCER_KNOWN, FEED_ROSTER_GONE, NO_LIVE_OUTPUT_REASON } from "../../ui/src/home/feed-axis.mjs";
import { fleetTerminalMount } from "../../ui/src/fleet/terminal-mount.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import {
  KEYSTROKE_SINK,
  POSTURE_INTERACTIVE,
  POSTURE_READ_ONLY,
  READ_ONLY_LABEL,
  SEND_PATH,
  inputPolicyFor,
  mountModelFor,
} from "../../ui/src/terminal/input-policy.mjs";
import { HOST_FULLSCREEN } from "../../ui/src/terminal/host-model.mjs";
import { TERMINAL_STATE_LIST } from "../../ui/src/terminal/state-ramp.mjs";

// A row as the session index publishes it (m48): `nodeId`, `sessionId`, `workspaceId`, `repo`,
// `assistant`, `lastPingAt`, `workspaceHasRun`, `workItem`.
const row = (extra = {}) =>
  JSON.parse(
    JSON.stringify({
      nodeId: "node-a",
      sessionId: "sess-1",
      workspaceId: "ws-1",
      repo: "aof",
      assistant: "claude",
      lastPingAt: "2026-08-13T12:00:00.000Z",
      workspaceHasRun: false,
      ...extra,
    }),
  );
// …and one whose `workItem` is what `sessionWorkItem` actually publishes: `{ ref, assignmentId }`.
const producerRow = (extra = {}) => row({ workItem: { ref: "49/03", assignmentId: "asg-1" }, ...extra });

const modelOf = (declared) => mountModelFor({ source: declared.source, mount: declared.posture });

const stringsIn = (value, seen = new Set()) => {
  if (typeof value === "string") return [value];
  if (value == null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value).flatMap((entry) => stringsIn(entry, seen));
};

export const homeSessionMountTests = [
  // ══ Scenario: the declaration is the same frozen shape the two shipping producers return
  {
    name: "49/03 task01 — the declaration is the same frozen shape the two shipping producers return",
    run: async () => {
      const subject = producerRow();
      const snapshot = JSON.parse(JSON.stringify(subject));
      const home = homeSessionMount(subject, { axis: FEED_PRODUCER_KNOWN });
      const fleet = fleetTerminalMount({ targetNodeId: "node-a", sessionId: "sess-1", state: "running" }, { itemRef: "49/03" });
      const board = boardDockMount({ kind: "mirror", ref: "49/03", nodeId: "node-a", sessionId: "sess-1" });

      assert.deepEqual(Object.keys(home).sort(), Object.keys(fleet).sort(), "the key set is deep-equal to `fleetTerminalMount`'s — the THIRTEEN, `noStream` included");
      assert.equal(Object.keys(home).length, 13, "…and it is thirteen: one shape, three producers, so a reader of one has read all three");
      const boardKeys = Object.keys(board);
      assert.equal(boardKeys.length, 12, "…the board returns ADR-002's twelve");
      for (const key of boardKeys) {
        assert.ok(key in home, `${key}: present on the home's declaration too — it is a SUPERSET of the board's twelve`);
        assert.ok(key in fleet, `${key}: …and on the fleet's`);
      }

      assert.ok(Object.isFrozen(home), "the returned object is frozen");
      assert.ok(Object.isFrozen(home.params), "…and its `params` object is frozen too");
      assert.equal(home.source, sessionSourceFor("mirror").source, "`source` is the SAME OBJECT the table hands out — reference-identical, not a look-alike assembled here");
      assert.deepEqual({ ...home.params }, { nodeId: "node-a", sessionId: "sess-1" }, "`params` is exactly the two the `mirror` row declares it is addressed by");
      assert.deepEqual([...home.source.params], ["nodeId", "sessionId"], "…which are the source's OWN declared params, read back from the frozen table");

      const again = homeSessionMount(subject, { axis: FEED_PRODUCER_KNOWN });
      assert.deepEqual(again, home, "calling it twice with the same row yields deep-equal values");
      assert.notEqual(again, home, "…that are NOT the same object identity — there is no memoised cache handing back a stale answer");
      assert.deepEqual(subject, snapshot, "and the row handed in is untouched: the producer mutates nothing");
    },
  },

  // ══ Scenario Outline: the posture is narrowed by the feed axis, and fails closed. 9 rows.
  ...[
    { case: "an assignment owns this tuple", axis: FEED_PRODUCER_KNOWN, posture: POSTURE_INTERACTIVE, input: true },
    { case: "listed, and nothing will ever feed it", axis: FEED_NO_PRODUCER, posture: POSTURE_READ_ONLY, input: false },
    { case: "the mesh no longer lists this session", axis: FEED_ROSTER_GONE, posture: POSTURE_READ_ONLY, input: false },
    { case: "the axis word mis-spelled", axis: "producer_known", posture: POSTURE_READ_ONLY, input: false },
    { case: "the axis word in the wrong case", axis: "PRODUCER-KNOWN", posture: POSTURE_READ_ONLY, input: false },
    { case: "the posture word smuggled into the axis slot", axis: "interactive", posture: POSTURE_READ_ONLY, input: false },
    { case: "a boolean where a value was expected", axis: true, posture: POSTURE_READ_ONLY, input: false },
    { case: "no axis value at all", axis: undefined, posture: POSTURE_READ_ONLY, input: false },
    { case: "an explicit null", axis: null, posture: POSTURE_READ_ONLY, input: false },
  ].map((example) => ({
    name: `49/03 task01 — the posture is narrowed by the feed axis, and fails closed — ${example.case}`,
    run: async () => {
      // THE ROW IS BARE for the malformed rows: an axis nobody could read is not an axis, and
      // the derivation from a row with no work item is `no-producer` either way. The point of
      // rows 4-7 is that a STATED-but-unreadable axis may never PROMOTE a pane.
      const subject = example.axis === FEED_PRODUCER_KNOWN ? producerRow() : row();
      const declared = homeSessionMount(subject, example.axis === undefined ? {} : { axis: example.axis });

      assert.equal(declared.posture, example.posture, "the posture");
      const policy = inputPolicyFor(declared.source, declared.posture);
      assert.equal(policy.inputEnabled, example.input, "…run through the SHIPPED policy");
      assert.equal(policy.disableStdin, !example.input, "…and `disableStdin` is its exact negation");

      const model = modelOf(declared);
      assert.deepEqual([...model.keystrokeSinks], example.input ? [KEYSTROKE_SINK] : [], "the keystroke sinks — ABSENT on a read-only mount, not registered-and-ignored");
      assert.equal(model.sendPath, example.input ? SEND_PATH : null, "…the send path, so there is nothing for a later refactor to re-enable by deleting a guard");
      assert.equal(model.readOnlyLabel, example.input ? null : READ_ONLY_LABEL, "…the mandatory label");
      assert.equal(model.cursor.blink, example.input, "…and the cursor blink, the posture's second non-colour signal");
    },
  })),

  // ══ Scenario Outline: an ordinary polled row gets the posture its own wire fact earns. 3 rows.
  ...[
    { case: "an assignment execution", subject: () => producerRow(), posture: POSTURE_INTERACTIVE, input: true },
    { case: "a free session — hand-run or hooked", subject: () => row({ workItem: null }), posture: POSTURE_READ_ONLY, input: false },
    { case: "a payload that omits the key entirely", subject: () => row(), posture: POSTURE_READ_ONLY, input: false },
  ].map((example) => ({
    name: `49/03 task01 — an ordinary polled row gets the posture its own wire fact earns — ${example.case}`,
    run: async () => {
      const declared = homeSessionMount(example.subject());
      assert.equal(declared.posture, example.posture, "the posture, derived from the row's own wire fact rather than from a value handed in");
      assert.equal(inputPolicyFor(declared.source, declared.posture).inputEnabled, example.input, "…and the input path that follows from it");
    },
  })),

  // ══ Scenario Outline: a row carrying something posture-shaped is still ruled by the axis. 10 rows.
  ...[
    { case: "the word, on the row", axis: FEED_NO_PRODUCER, decoy: { posture: "interactive" }, posture: POSTURE_READ_ONLY, input: false },
    { case: "the constant, on the row", axis: FEED_NO_PRODUCER, decoy: { posture: POSTURE_INTERACTIVE }, posture: POSTURE_READ_ONLY, input: false },
    { case: "the field the word sweep cannot see", axis: FEED_NO_PRODUCER, decoy: { readOnly: false }, posture: POSTURE_READ_ONLY, input: false },
    { case: "a mount object riding along", axis: FEED_NO_PRODUCER, decoy: { mount: { readOnly: false } }, posture: POSTURE_READ_ONLY, input: false },
    { case: "a capability read as a permission", axis: FEED_NO_PRODUCER, decoy: { canInput: true }, posture: POSTURE_READ_ONLY, input: false },
    { case: "a dispatch state that looks alive", axis: FEED_NO_PRODUCER, decoy: { state: "running" }, posture: POSTURE_READ_ONLY, input: false },
    { case: "a workspace that has a run", axis: FEED_NO_PRODUCER, decoy: { workspaceHasRun: true }, posture: POSTURE_READ_ONLY, input: false },
    { case: "and the OTHER direction — a decoy that would silence a real pane", axis: FEED_PRODUCER_KNOWN, decoy: { posture: "read-only" }, posture: POSTURE_INTERACTIVE, input: true, producer: true },
    { case: "…spelled as the field", axis: FEED_PRODUCER_KNOWN, decoy: { readOnly: true }, posture: POSTURE_INTERACTIVE, input: true, producer: true },
    { case: "…spelled as an absent capability", axis: FEED_PRODUCER_KNOWN, decoy: { canInput: false }, posture: POSTURE_INTERACTIVE, input: true, producer: true },
  ].map((example) => ({
    name: `49/03 task01 — a row that carries something posture-shaped is still ruled by the axis alone — ${example.case}`,
    run: async () => {
      const base = example.producer ? producerRow() : row();
      const withDecoy = { ...base, ...example.decoy };
      const declared = homeSessionMount(withDecoy, { axis: example.axis });

      assert.equal(declared.posture, example.posture, "the posture is the AXIS's, never the row's");
      assert.equal(inputPolicyFor(declared.source, declared.posture).inputEnabled, example.input, "…and so is the input path");
      assert.equal(
        JSON.stringify(declared),
        JSON.stringify(homeSessionMount(base, { axis: example.axis })),
        "…and the answer is byte-identical to the same row with the decoy removed: not one field of it was read",
      );
    },
  })),

  // ══ Scenario Outline: a half-tuple renders no panel, honestly, and invents no failure. 6 rows.
  ...[
    { case: "never captured a session id", subject: () => ({ nodeId: "node-a", repo: "aof" }), cause: HOME_NO_STREAM.NO_SESSION },
    { case: "an empty string, not a missing key", subject: () => row({ sessionId: "" }), cause: HOME_NO_STREAM.NO_SESSION },
    { case: "a non-string id", subject: () => row({ sessionId: 42 }), cause: HOME_NO_STREAM.NO_SESSION },
    { case: "no node", subject: () => ({ sessionId: "sess-1", repo: "aof" }), cause: HOME_NO_STREAM.NO_NODE },
    { case: "nothing at all", subject: () => null, cause: HOME_NO_STREAM.NO_ROW },
    { case: "not an object", subject: () => "node-a/sess-1", cause: HOME_NO_STREAM.NO_ROW },
  ].map((example) => ({
    name: `49/03 task01 — a half-tuple renders no panel, honestly, and invents no failure — ${example.case}`,
    run: async () => {
      const declared = homeSessionMount(example.subject());
      assert.equal(declared.rendersPanel, false, "no panel at all — not an empty frame and not a disabled toggle");
      assert.equal(declared.bound, false, "…nothing is bound");
      assert.equal(declared.source, null, "…there is no source");
      assert.deepEqual({ ...declared.params }, {}, "…and nothing to address it with");
      assert.equal(declared.noStream, example.cause, "`noStream` NAMES the cause");
      assert.equal(declared.reason, null, "…and `reason` is null: there is no pane to say why about");
      assert.equal(declared.posture, POSTURE_READ_ONLY, "the declaration fails closed even where there is nothing to type into");
      assert.equal(declared.unavailable, null, "`unavailable` is null…");
      assert.ok(
        !stringsIn(declared).includes("unavailable"),
        "…and NO value anywhere in the returned object equals the string `unavailable`: a stale or unconnected node is `no live output`, never an origin fault (DG-49-10)",
      );
    },
  })),

  // ══ Scenario Outline: the injected reason is decided here, once. 3 rows.
  ...[
    {
      case: "nothing relays this session",
      axis: FEED_NO_PRODUCER,
      subject: () => row(),
      check: (declared) => {
        assert.equal(declared.reason, "no live output — no assignment is relaying this session", "DESIGN K6, verbatim");
        assert.equal(declared.reason, NO_LIVE_OUTPUT_REASON, "…and it is the axis module's own constant by identity, never a re-typed copy");
      },
    },
    {
      case: "an assignment owns this tuple",
      axis: FEED_PRODUCER_KNOWN,
      subject: () => producerRow(),
      check: (declared) => assert.equal(declared.reason, null, "null — a pane that may receive bytes keeps the ramp's own word"),
    },
    {
      case: "the mesh no longer lists it",
      axis: FEED_ROSTER_GONE,
      subject: () => row(),
      check: (declared) => {
        assert.ok(typeof declared.reason === "string" && declared.reason.length > 0, "non-null");
        assert.equal(declared.reason, ROSTER_GONE_REASON, "…with exactly one author, so DESIGN's eventual sentence changes in one place");
        // IT DOES NOT CLAIM THE SESSION IS STILL LISTED OR LIVE. Asserted as the CLAIM rather
        // than as a substring: `no live output` is a NEGATION and is honest here, while any
        // positive assertion of listing or liveness would be a sentence the roster contradicts.
        assert.ok(!/\bis (?:still )?(?:listed|live|streaming|running)\b/i.test(declared.reason), "…it asserts no liveness");
        assert.ok(!/\bstill (?:listed|live|running|streaming)\b/i.test(declared.reason), "…and no continued listing");
        assert.match(declared.reason, /no longer lists/, "…what it says is the one thing measured: the mesh stopped listing this tuple");
      },
    },
  ].map((example) => ({
    name: `49/03 task01 — the injected reason is decided here, once, and the shared vocabulary gains no word — ${example.case}`,
    run: async () => {
      const declared = homeSessionMount(example.subject(), { axis: example.axis });
      example.check(declared);

      // NO EIGHTH RAMP WORD. `unfed`, `silent` and `orphaned` would each be a second vocabulary
      // describing a PRODUCER fact — the exact defect m46 spent a milestone deleting.
      const strings = stringsIn(declared);
      for (const invented of ["unfed", "silent", "orphaned", "dead", "stale"]) {
        assert.ok(!strings.includes(invented), `no field holds the invented connection word \`${invented}\``);
      }
      for (const value of strings) {
        if (!TERMINAL_STATE_LIST.includes(value)) continue;
        assert.ok(TERMINAL_STATE_LIST.includes(value), `${value} is one of the ramp's seven`);
      }
    },
  })),

  // ══ Scenario Outline: the identity line's three fields. 2 rows.
  ...[
    {
      case: "an assignment's session",
      subject: () => producerRow(),
      owner: "49/03",
      farEnd: "node-a",
      detail: "session sess-1",
    },
    {
      case: "a free session",
      subject: () => row({ workItem: null, repo: "aof" }),
      owner: "aof",
      farEnd: "node-a",
      detail: "session sess-1",
    },
  ].map((example) => ({
    name: `49/03 task01 — the declaration names an owner, a far end and a tail, and never invents an owner — ${example.case}`,
    run: async () => {
      const declared = homeSessionMount(example.subject());
      assert.equal(declared.ref, example.owner, "the OWNER — V1 honoured without inventing one: a free session's owner is its REPO, which is a fact on the wire");
      assert.equal(declared.farEnd, example.farEnd, "…the far end");
      assert.equal(declared.detail, example.detail, "…and the tail, the first thing to yield when the header cannot fit");
      assert.equal(declared.command, null, "`command` is null…");
      assert.equal(declared.spawnedHere, false, "…and `spawnedHere` is false: the same fact read twice, and why RESTART is ABSENT rather than present-and-refusing");
    },
  })),

  // …and a row that names NOBODY renders no panel rather than a bare session hash (V1).
  {
    name: "49/03 task01 — a row with neither a work item nor a repo names nobody, so it renders no panel rather than a bare session hash",
    run: async () => {
      const declared = homeSessionMount({ nodeId: "node-a", sessionId: "sess-1" });
      assert.equal(declared.rendersPanel, false, "V1: a terminal with no visible owner is never rendered");
      assert.equal(declared.noStream, HOME_NO_STREAM.NO_OWNER, "…and the cause is named rather than guessed");
      assert.equal(declared.posture, POSTURE_READ_ONLY, "…still failing closed");
    },
  },

  // ══ Scenario: the declaration does not vary with the host that renders it
  {
    name: "49/03 task01 — the declaration does not vary with the host that renders it: one posture, both hosts, because the alternative costs the SESSION",
    run: async () => {
      const subject = producerRow();
      const plain = homeSessionMount(subject, { axis: FEED_PRODUCER_KNOWN });
      const withHost = homeSessionMount(subject, { axis: FEED_PRODUCER_KNOWN, host: HOST_FULLSCREEN });
      assert.deepEqual(withHost, plain, "the two returned values are deep-equal — the posture is the ROW's, never the host's");

      // …and the SESSION IDENTITY computed from the declaration is unchanged between an inline
      // tile and its expanded twin, which is the property DG-49-5 actually buys.
      const identity = (declared) => `${declared.source.kind}::${declared.params.nodeId}::${declared.params.sessionId}::${declared.posture}`;
      assert.equal(identity(withHost), identity(plain), "the session identity is unchanged between an inline tile and its expanded twin — nothing is rebuilt, nothing reopens, and the pane does not come back empty");
    },
  },

  // ══ Scenario: a read-only pane says so, in words, and carries the cause
  {
    name: "49/03 task01 — a read-only pane says so, in words, and carries the CAUSE that made it read-only",
    run: async () => {
      const declared = homeSessionMount(row(), { axis: FEED_NO_PRODUCER });
      const model = modelOf(declared);
      assert.equal(model.readOnlyLabel, READ_ONLY_LABEL, "`readOnlyLabel` is exactly `read-only`");
      assert.equal(model.readOnlyLabel, "read-only", "…the shipped string");
      assert.ok(typeof model.readOnlyLabelTitle === "string" && model.readOnlyLabelTitle.length > 0, "…and `readOnlyLabelTitle` is a non-empty sentence");

      // THE CAUSE TRAVELS ON THE DECLARATION, as a readable VALUE rather than as styling: the
      // sentence is the feed-axis value's own, and the mapping is exported so a consumer can read
      // back WHICH axis value cost this pane its keyboard.
      assert.equal(declared.reason, READ_ONLY_CAUSE_REASON[FEED_NO_PRODUCER], "the cause is the axis value's own sentence");
      const recovered = Object.entries(READ_ONLY_CAUSE_REASON).find(([, sentence]) => sentence === declared.reason)?.[0];
      assert.equal(recovered, FEED_NO_PRODUCER, "…and the axis value that made it read-only is recoverable FROM the declaration");
      assert.equal(homeSessionMount(row(), { axis: FEED_ROSTER_GONE }).reason, READ_ONLY_CAUSE_REASON[FEED_ROSTER_GONE], "…and the other read-only axis carries its own cause, not this one's");

      const interactive = homeSessionMount(producerRow(), { axis: FEED_PRODUCER_KNOWN });
      assert.equal(modelOf(interactive).readOnlyLabel, null, "…and the interactive case yields NO label, so the label's presence means something specific on this surface");
      assert.equal(READ_ONLY_CAUSE_REASON[FEED_PRODUCER_KNOWN], undefined, "…because there is no cause to carry: nothing cost it anything");
    },
  },
];
