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
// sweep of `ui/src/fleet/**` will read GREEN and VACUOUS once the control moves out of that
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
function headerModel(readOnly) {
  return Object.freeze({
    readOnlyLabel: readOnly ? READ_ONLY_LABEL : null,
    readOnlyLabelTitle: readOnly ? READ_ONLY_LABEL_TITLE : null,
  });
}

// mountModelFor({ source, mount }) — everything the posture decides, as values, so a caller
// cannot ship the posture as styling.
//
// The provider picker is interactive-only chrome, and whether it is offered is DERIVED: a
// source declares a `provider` param or it does not, and a mount permits input or it does
// not. There is nothing to pick for a session that already exists on another machine. Its
// ABSENCE is a consequence, never the signal — the label is the signal.
export function mountModelFor({ source, mount } = {}) {
  const policy = inputPolicyFor(source, mount);
  const declaresProvider = Array.isArray(source?.params) && source.params.includes("provider");
  const header = headerModel(policy.readOnly);
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
