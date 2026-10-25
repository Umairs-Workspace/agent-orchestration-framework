// The ONE terminal control's INPUT POLICY and MOUNT MODEL (milestone 46 / story 03 /
// task 04 — ADR-002's `inputEnabled = source.canInput && !mount.readOnly`). A framework-free
// ESM module — no React, no DOM, no xterm, no socket.
//
// TWO INDEPENDENT AXES, AND ONE BOOLEAN CANNOT EXPRESS THEM.
//   · CAPABILITY is the SOURCE's: can bytes travel up this lane at all.
//   · POSTURE is the MOUNT's: may they, here.
// The SAME `mirror` source is typeable in the board dock and read-only on a fleet card,
// today, in shipped code. An `isRemote` boolean cannot express that, and a control that
// derived posture from source would either make the fleet page typeable — which is milestone
// 49's job, not this one's — or take typing away from the board dock, which m42 deliberately
// added. Milestone 49 flips ONE declaration at ONE call site; this control does not change.
//
// THIS IS ARCH-TEST INVARIANT 4'S POLICY HALF, AND IT IS LOAD-BEARING. That gate's directory
// sweep of `apps/ui/src/fleet/**` will read GREEN and VACUOUS once the control moves out of that
// directory — worse than deleting it, because a green gate is read as a satisfied contract.
// A pure function driven exhaustively over the whole frozen source table x both postures is
// a far stronger pin than an absence-of-string sweep.
//
// READ-ONLY MEANS READ-ONLY IN FACT, NOT BY OMISSION. `disableStdin: true`, NO keystroke sink
// registered at all (not one that is registered and ignored), and NO send path named — so
// there is nothing for a later refactor to re-enable by deleting a guard. A half-disabled
// widget that swallows keystrokes silently is a worse lie than no terminal.
//
// AND THE POSTURE TRAVELS AS A LABEL. Under one control NEITHER posture has an input row —
// xterm takes keystrokes directly, and the interactive dock has no input box either — so the
// ABSENCE of an input box no longer distinguishes anything. The `read-only` label and the
// non-blinking cursor are the ONLY two signals of the posture, which makes the label
// mandatory: a read-only pane rendered without it permits exactly the failure the posture
// exists to prevent, an operator believing a keystroke reached a worker.

import { PASTE_SUBMIT_SETTLE_MS, SUBMIT_KEY, createTuiReadyGate, pasteFrame } from "@aof/contracts/tui-ready";

export const POSTURE_INTERACTIVE = "interactive";
export const POSTURE_READ_ONLY = "read-only";
export const POSTURES = Object.freeze([POSTURE_INTERACTIVE, POSTURE_READ_ONLY]);

// The one keystroke sink an interactive mount registers, and the one send path it names.
export const KEYSTROKE_SINK = "onData";
export const SEND_PATH = "socket.send";

export const READ_ONLY_LABEL = "read-only";
export const READ_ONLY_LABEL_TITLE =
  "This view mirrors the worker's terminal. It cannot type: keystrokes never reach the worker.";

// mountPosture(posture) — a mount declaration. Anything that is not explicitly `interactive`
// is READ-ONLY: the permission is the mount's, and an absent permission is not a permission.
export function mountPosture(posture) {
  const declared = posture === POSTURE_INTERACTIVE ? POSTURE_INTERACTIVE : POSTURE_READ_ONLY;
  return Object.freeze({ posture: declared, readOnly: declared === POSTURE_READ_ONLY });
}

export const MOUNT_INTERACTIVE = mountPosture(POSTURE_INTERACTIVE);
export const MOUNT_READ_ONLY = mountPosture(POSTURE_READ_ONLY);

// isReadOnly(mount) — THE COERCION, AND IT FAILS SAFE IN EVERY DIRECTION.
//
// Read-only is the DEFAULT and interactive is the thing that must be declared, unambiguously.
// A mount that is absent, that is not an object, that carries a non-boolean `readOnly`, or
// that declares no posture at all is READ-ONLY — never typeable. The permission is the
// mount's, and an absent or malformed permission is not a permission.
//
// The near-miss this closes, found by a mutation probe: `mount.readOnly === true` read
// `{ readOnly: "yes" }` as INTERACTIVE. A mount that says read-only in words was typeable.
// 46/04 mounts this control at two call sites, so a hand-written mount object or a forgotten
// argument is exactly the route to a typeable fleet peek — the failure the whole posture
// exists to prevent, and the one m38 refused in the other direction.
function isReadOnly(mount) {
  if (mount == null) return true;
  if (typeof mount === "string") return mount !== POSTURE_INTERACTIVE;
  if (typeof mount !== "object") return true;
  // An explicit BOOLEAN is the only authoritative `readOnly`.
  if (typeof mount.readOnly === "boolean") return mount.readOnly;
  // A `readOnly` that is present but not a boolean is a MALFORMED declaration, not a false
  // one. Nothing about `"yes"`, `0` or `null` says "this mount may be typed into".
  if (mount.readOnly !== undefined) return true;
  return mount.posture !== POSTURE_INTERACTIVE;
}

// inputPolicyFor(source, mount) — ADR-002's rule, as one pure function of two inputs.
// `disableStdin` is the exact negation of `inputEnabled`: there is no third state in which a
// widget accepts keystrokes and drops them.
//
// `canInput` is a CAPABILITY and is NEVER a permission. Reading it as one is exactly how the
// fleet peek would quietly become typeable.
export function inputPolicyFor(source, mount) {
  const canInput = source?.canInput === true;
  const readOnly = isReadOnly(mount);
  const inputEnabled = canInput && !readOnly;
  return Object.freeze({
    canInput,
    readOnly,
    posture: readOnly ? POSTURE_READ_ONLY : POSTURE_INTERACTIVE,
    inputEnabled,
    disableStdin: !inputEnabled,
  });
}

// The label is TEXT on the model, and only text. Its pill styling lives in palette.mjs and
// is read by the component — the model may not ship the posture as styling, which is the
// whole reason the label is a value here at all.
//
// The label's title is the mount's own read-only cause when it states one (162 verify, F-06): a
// loop-driven pane says a loop drives it and to answer with `aof work answer`, rather than the
// generic mirror sentence, which speaks of a "worker" even over the control's own session.
function headerModel(readOnly, reason) {
  const title = typeof reason === "string" && reason.length > 0 ? reason : READ_ONLY_LABEL_TITLE;
  return Object.freeze({
    readOnlyLabel: readOnly ? READ_ONLY_LABEL : null,
    readOnlyLabelTitle: readOnly ? title : null,
  });
}

// mountModelFor({ source, mount, reason }) — everything the posture decides, as values, so a caller
// cannot ship the posture as styling. `reason` is the mount's read-only cause, when it states one.
//
// The provider picker is interactive-only chrome, and whether it is offered is DERIVED: a
// source declares a `provider` param or it does not, and a mount permits input or it does
// not. There is nothing to pick for a session that already exists on another machine. Its
// ABSENCE is a consequence, never the signal — the label is the signal.
export function mountModelFor({ source, mount, reason = null } = {}) {
  const policy = inputPolicyFor(source, mount);
  const declaresProvider = Array.isArray(source?.params) && source.params.includes("provider");
  const header = headerModel(policy.readOnly, reason);
  return Object.freeze({
    posture: policy.posture,
    readOnly: policy.readOnly,
    inputEnabled: policy.inputEnabled,
    disableStdin: policy.disableStdin,
    stdin: policy.inputEnabled ? "enabled" : "disabled",
    // ABSENT, not present-and-ignored. An interactive mount registers exactly one.
    keystrokeSinks: Object.freeze(policy.inputEnabled ? [KEYSTROKE_SINK] : []),
    sendPath: policy.inputEnabled ? SEND_PATH : null,
    // A blinking cursor is the universal "you can type here"; its absence is the posture's
    // second non-colour signal.
    cursor: Object.freeze({
      blink: policy.inputEnabled,
      style: policy.inputEnabled ? "block" : "underline",
    }),
    ...header,
    inlineHeader: header,
    expandedHeader: header,
    // NEITHER posture has an input region — fullscreen is a bigger box, not a different pane,
    // and the absence of an input row therefore signals nothing at all.
    inputRegion: null,
    providerPickerOffered: declaresProvider && policy.inputEnabled,
  });
}

// LATER INPUT (milestone 171 / ADR-005) — further input a surface types into its live session, such as
// a note's review invocation. It travels the raw path a keystroke takes (never a JSON frame), once per
// sequence number and in the order handed. Only a READY session takes it: input enabled by the
// posture, the socket open, and the mount's own first command already typed, so a later input never
// lands ahead of it. Anything else is answered as not delivered, here, and is never queued by the
// control — holding input for later is the surface's call, not the terminal's. `data` is the text to
// type; HOW it is typed (a paste, then its Enter) is the record's outbox below.
export const LATER_INPUT_TYPED = "type";
export const LATER_INPUT_SKIPPED = "skip";
export const LATER_INPUT_REFUSED = "refuse";
export function laterInputDecision({ lastSeq = 0, input, inputEnabled, ready } = {}) {
  if (input == null || typeof input.text !== "string" || input.text.length === 0 || !Number.isInteger(input.seq)) {
    return Object.freeze({ action: LATER_INPUT_SKIPPED, reason: "no-input" });
  }
  if (input.seq <= lastSeq) return Object.freeze({ action: LATER_INPUT_SKIPPED, reason: "already-answered" });
  // A session not yet connected (or gone) is that, whatever its posture.
  if (ready !== true) return Object.freeze({ action: LATER_INPUT_REFUSED, reason: "not-connected" });
  if (inputEnabled !== true) return Object.freeze({ action: LATER_INPUT_REFUSED, reason: "read-only" });
  return Object.freeze({ action: LATER_INPUT_TYPED, reason: null, data: input.text });
}

// WHAT THE LIVE SESSION IS TYPED — the mount's own command and a surface's later inputs, from ONE
// record the control holds across renders (moved out of `TerminalControl.tsx` with 171/ADR-005, under
// `acd-ui-surface-file-budget`'s remedy). The control wires its socket's events to these functions;
// WHAT is typed, and WHEN, is decided here, where a suite reads it without React.
//
// The state-aware command, typed ONCE per session as ordinary input on the same raw path a
// keystroke takes (never a JSON frame — the envelope is unchanged). A mount with no input
// path cannot type it, which is the honest consequence of the posture rather than a guard.
// Once it is typed — or at the socket's open, for a mount with none — the session is READY, and the
// later inputs handed so far are typed through `laterInputDecision`.
//
// 171 F-171-01 — TYPED AS THE SESSION DRIVER TYPES (`@aof/contracts/tui-ready`). The command was
// written as `text\r` on the session's FIRST painted bytes, before claude's REPL mounted, and its
// carriage return was lost; written as `text\r` once the REPL was up, the carriage return landed as a
// new line. So the command waits for the TUI's own readiness (or `COMMAND_READY_CAP_MS`, for a
// program that never signals it), and every input goes through ONE serial outbox: the text as a
// bracketed paste (raw, when the program never turned paste mode on), then — after
// `PASTE_SUBMIT_SETTLE_MS` — its Enter as a separate write, and only then the next input, so two
// notes never land in one input box as one message.
export const COMMAND_READY_CAP_MS = 30_000;
export function sessionInputs() {
  return { send: null, command: null, commandSent: true, inputEnabled: false, ready: false, lastSeq: 0, inputs: [], onLaterInput: null, onSessionReady: null, gate: createTuiReadyGate(), decoder: null, outbox: [], submitTimer: null };
}
// The socket opened. Answers whether a command is owed, so the control can arm its cap timer.
export function sessionOpened(record, { send, command, inputEnabled }) {
  stopOutbox(record);
  record.send = send;
  record.inputEnabled = inputEnabled === true;
  record.command = record.inputEnabled && typeof command === "string" && command.length > 0 ? command : null;
  record.commandSent = record.command == null;
  record.gate = createTuiReadyGate();
  record.decoder = null;
  if (record.commandSent) markSessionReady(record, true);
  return !record.commandSent;
}
// The session's output, read for its TUI's readiness: the control hands every painted chunk here.
export function sessionOutput(record, data) {
  if (record.commandSent || record.gate.ready) return record.gate.ready;
  if (typeof data === "string") return record.gate.feed(data);
  record.decoder ??= new TextDecoder();
  return record.gate.feed(record.decoder.decode(data, { stream: true }));
}
// Types the command once the TUI is ready; `force` is the cap's, typing it whatever the gate says.
export function typeCommand(record, { force = false } = {}) {
  if (record.commandSent || record.command == null || record.send == null) return;
  if (!force && !record.gate.ready) return;
  record.commandSent = true;
  enqueue(record, record.command);
  markSessionReady(record, true);
}
export function sessionClosed(record) {
  stopOutbox(record);
  record.send = null;
  markSessionReady(record, false);
}
// Every later input not yet answered: typed, or answered as not delivered — never held here.
export function flushLaterInputs(record) {
  for (const input of record.inputs ?? []) {
    const decision = laterInputDecision({ lastSeq: record.lastSeq, input, inputEnabled: record.inputEnabled, ready: record.ready });
    if (decision.action === LATER_INPUT_SKIPPED) continue;
    record.lastSeq = input.seq;
    if (decision.action === LATER_INPUT_TYPED) enqueue(record, decision.data);
    record.onLaterInput?.({ seq: input.seq, delivered: decision.action === LATER_INPUT_TYPED, reason: decision.reason });
  }
}
function markSessionReady(record, ready) {
  if (record.ready === ready) return;
  record.ready = ready;
  record.onSessionReady?.(ready);
  if (ready) flushLaterInputs(record);
}
// The outbox: one input at a time — its text, then its Enter once the paste has settled.
function enqueue(record, text) {
  record.outbox.push(text);
  if (record.submitTimer == null) pumpOutbox(record);
}
function pumpOutbox(record) {
  const text = record.outbox.shift();
  if (text === undefined || record.send == null) return;
  record.send(record.gate.pasteModeOn ? pasteFrame(text) : text);
  record.submitTimer = setTimeout(() => {
    record.submitTimer = null;
    record.send?.(SUBMIT_KEY);
    pumpOutbox(record);
  }, PASTE_SUBMIT_SETTLE_MS);
}
function stopOutbox(record) {
  if (record.submitTimer != null) clearTimeout(record.submitTimer);
  record.submitTimer = null;
  record.outbox = [];
}
