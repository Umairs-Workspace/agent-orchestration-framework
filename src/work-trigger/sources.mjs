// The three signals that are NOT the mesh — one question each, and the answer is a scope
// (milestone 63 / story 04 / ADR-007).
//
// A crontab line, a build's signal and an inbound `aof:feedback` capture arrive from three
// unrelated places and are put to ONE question: which scope. Everything else an unattended run
// needs — the level it may run at, the bound it stops at, the gate it must clear, the process that
// carries it — already has an owner, and a source that answered any of them would have become the
// coordinator this milestone was written to refuse, one plausible field at a time (ADR-001 §2).
// So the answer is enumerated rather than intended: `{ scope, source, resolvedFrom }` and a fourth
// key is a defect here, not a remark at review.
//
// FIVE PROPERTIES, AND EACH IS A DIFFERENT WAY THIS FILE COULD HAVE BEEN WRONG.
//
// 1 · A FINDING-TRIGGERED WAKE NEVER CLASSIFIES (ADR-007 §1, 55/ADR-005). Capture already refuses
//     this at the door: `src/commands/feedback.mjs` accepts raw text and attribution only and
//     refuses any classification key with `feedback-classification-deferred`. A trigger that woke
//     a loop *because a finding was a bug* would perform exactly that judgement one layer away,
//     where nothing is watching. So the finding source reads that a capture EXISTS and which item
//     it is attributed to, and nothing else — and it is structural rather than careful: the only
//     thing this module ever asks of a capture list is whether it is empty. No element is indexed,
//     iterated, measured, shortened or compared, so there is no expression here in which a body, a
//     severity, a later triage's answer, or a count could reach a decision. A body-reading source
//     and a body-blind one agree on every single-capture fixture ever written, which is why the
//     property is asserted comparatively and why it is enforced by SHAPE here.
//
// 2 · A CI SIGNAL IS A SIGNAL, NOT A VERDICT (ADR-007 §3). One field of a build's signal answers
//     the question this source was asked, and the rest is the input of a policy. "Wake only on
//     failure" is one comparison, it is what everybody assumes a CI trigger does, and it is a rule
//     about which outcomes matter living inside a layer whose whole job was to turn a signal into
//     a scope. The same is true of its quieter forms — an allow-list of pipelines, a failure-class
//     filter, a suppression for cancelled runs. This source reads `ref` and stops, and the answer
//     does not echo what it did not read: an echoed status is a status that was read, and once it
//     is in the answer it is one branch away from being read by the next caller.
//
// 3 · NO SCOPE GRAMMAR IS AUTHORED HERE (ADR-007 §2, 53/ADR-003, TECH_DEBT item 49). Every source
//     puts its string to `decideLoopScope` — the same decision `work:loop` makes when it receives
//     the scope — and carries its refusal through with the code, the admitted forms, their
//     examples in order, the reason and the alternative UNTOUCHED. A private copy passes every
//     test that only exercises today's forms and fails silently on the first day the original
//     moves: it keeps answering, just not the same answers as the command that will receive them.
//     A trim before the comparison, a tolerated trailing hyphen, a coercion of a number to its
//     digits — each is a rule about what a scope may look like, authored where the loop cannot
//     see it. There are none here, and this file holds no pattern machinery at all: no anchored
//     pattern, no `RegExp`, no `.test`/`.exec`/`.match`, no digit class, and no trim or repair
//     before a comparison. `FF-6307` bans each of those by name, over this file.
//
// 4 · A STORY-SHAPED SIGNAL IS REFUSED WITH ITS DRIVER NAMED, AND IS NEVER WIDENED TO IT. 53's
//     refusal stands, and the refusal names the driver the item belongs to so the caller can
//     declare that scope if it is what they meant. NAMING IT AND RESOLVING TO IT ARE DIFFERENT
//     ANSWERS: an implicit walk up to the milestone turns a signal about one story into an
//     unattended run over a whole stream, which is the largest blast radius this milestone can
//     produce by accident. A refusal therefore carries NO `scope` key at any time — the loop's own
//     `scope` is RE-KEYED to `requestedScope`, which is 63/01's idiom on its level exactly (a
//     caller reading only `scope` finds nothing on a refusal and cannot mistake it for an answer).
//     The driver is not parsed out either: the ref is split on its one separator and the HEAD is
//     put back to the loop, so the question "is that a driver" is answered by the same grammar as
//     everything else here.
//
// 5 · A SOURCE THAT CANNOT ANSWER REFUSES BY NAME (ADR-007 §5, 59/ADR-004 §1a). The caller is a
//     crontab line, a CI step or a dispatch, and none of them is reading. An empty resolution
//     handed to an unattended caller is indistinguishable from "nothing to do": the wake path
//     dies, the trigger keeps being declared, and the first person to notice is whoever asks why
//     the loop stopped running months ago. So a refusal is a positive object with a CODE on it,
//     naming the source that failed and what it could not resolve — and NOT SUPPLIED and SUPPLIED
//     BUT EMPTY are kept as different coded answers everywhere they occur, because collapsing them
//     turns "nobody looked" into "there is nothing there". The pair that matters most is a finding
//     signal whose captures were never handed in (`trigger-signal-not-supplied`) against an item
//     that genuinely carries none (`trigger-signal-no-capture`): the first is a caller that did
//     not read, the second is a fact about the item, and one answer for both would report a broken
//     wake path as a quiet item.
//
// AND WHAT IT IS NOT: this module LAUNCHES NOTHING. It holds no clock — a cadence source resolves
// a scope that was declared and the caller decides when to ask, so the answer does not move when
// the clock does and a cadence that has not come round yet is still answered; deciding that now is
// the wrong moment to fire is scheduling, and the scheduler is the crontab line, the CI step or
// the dispatch that already exists. It reads no file, no environment and no work tree: a source
// answers from what it is handed, so the same signal beside two different trees is the same
// answer. Whether an item bears a well-formed driver is a question about the tree and is
// `work:loop`'s, which reads the tree already.
//
// ITS ONLY IMPORT IS THE LOOP'S OWN DECISION, and that is deliberate. `src/work/loop.mjs` imports
// nothing at all (53's determinism contract), so this leaf's whole closure is two files that touch
// no filesystem — which is what makes "it reads nothing" a structural fact rather than a promise,
// and what lets a control copy the pair alone and MOVE the loop's forms to prove the grammar is
// imported rather than copied. The four declared source spellings live in `./declaration.mjs`
// (63/00) and are NOT re-exported or re-typed here; this module dispatches on the three it answers
// for, derives `SIGNAL_SOURCES` from that table rather than from a list, and the coupling to the
// declared vocabulary is asserted where an assertion belongs — in the controls, which read both.
import { decideLoopScope } from "../work/loop.mjs";

// The three sources this module answers for, spelled as `.aof/triggers.jsonc` declares them. The
// fourth declared source is the mesh assignment, and it is ADR-006's: it resolves in the worker
// that already owns the dispatch, not here.
const CRON = "cron";
const CI_SIGNAL = "ci-signal";
const FEEDBACK_FINDING = "feedback-finding";

// The one separator an item ref is written with. It is a string rather than a pattern on purpose:
// a pattern here would be the fourth scope parser property 3 refuses, and everything that could be
// mistaken for parsing — whether the head is a driver at all — is put back to `decideLoopScope`.
const ITEM_SEPARATOR = "/";

// This module's OWN refusal codes. `loop-scope-unsupported` is not among them: that one is the
// loop's, arrives on its own decision object, and is carried through rather than retyped.
export const TRIGGER_SIGNAL_NOT_SUPPLIED = "trigger-signal-not-supplied";
export const TRIGGER_SIGNAL_UNREADABLE = "trigger-signal-unreadable";
export const TRIGGER_SIGNAL_SOURCE_UNKNOWN = "trigger-signal-source-unknown";
export const TRIGGER_SIGNAL_NO_CAPTURE = "trigger-signal-no-capture";

export const TRIGGER_SIGNAL_REFUSALS = Object.freeze([
  TRIGGER_SIGNAL_NOT_SUPPLIED,
  TRIGGER_SIGNAL_UNREADABLE,
  TRIGGER_SIGNAL_SOURCE_UNKNOWN,
  TRIGGER_SIGNAL_NO_CAPTURE,
]);

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

const isSignal = (signal) => signal !== null && typeof signal === "object" && !Array.isArray(signal);

// What was handed in, said as a KIND rather than as a value: a refusal that echoed an unreadable
// input back would put unread content into the answer, which is the thing properties 1 and 2 exist
// to prevent. "Nothing" and "null" stay apart for the same reason everything else here does.
function describe(value) {
  if (value === undefined) return "nothing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  const kind = typeof value;
  return `${"aeiou".includes(kind[0]) ? "an" : "a"} ${kind}`;
}

const named = (value) => (typeof value === "string" ? `"${value}"` : describe(value));

// --- the answers ------------------------------------------------------------
// A RESOLUTION IS THREE KEYS: the scope, the source that answered, and what that source resolved
// the scope from. Nothing the signal offered passes through — not a level, not a bound, not a gate
// verdict, not an argv, not a phase, not a session — because there is no key here for any of them
// to live in. That is the enumerated form the criterion asks for: a fourth key fails a control.
function resolution(source, scope, resolvedFrom) {
  return deepFreeze({ scope, source, resolvedFrom });
}

// A required part of the signal was NEVER HANDED IN. This is not the same answer as a part that
// was handed in and could not be resolved, and the two never share a code.
function notSupplied(source, unresolved) {
  return deepFreeze({
    code: TRIGGER_SIGNAL_NOT_SUPPLIED,
    source,
    unresolved,
    reason: `the ${source} source was handed no ${unresolved} to resolve.`,
  });
}

// No source was named at all — as distinct from a source that was named and is not one this
// resolver answers for. A batch answer that merely said something went wrong would send a reader
// to all three.
function sourceNotSupplied() {
  return deepFreeze({
    code: TRIGGER_SIGNAL_NOT_SUPPLIED,
    source: null,
    unresolved: "source",
    sources: SIGNAL_SOURCES,
    reason: `the signal named no source; the sources that answer here: ${SIGNAL_SOURCES.join(", ")}.`,
  });
}

function sourceUnknown(source) {
  return deepFreeze({
    code: TRIGGER_SIGNAL_SOURCE_UNKNOWN,
    source: typeof source === "string" ? source : null,
    unresolved: "source",
    received: describe(source),
    sources: SIGNAL_SOURCES,
    reason: `no source answers for ${named(source)}; the sources that answer here: ${SIGNAL_SOURCES.join(", ")}.`,
  });
}

// No set of signals was handed in at all — as distinct from an empty one, which is an answer.
function signalsNotSupplied() {
  return deepFreeze({
    code: TRIGGER_SIGNAL_NOT_SUPPLIED,
    source: null,
    unresolved: "signals",
    reason: "no signals were handed in; a set that was never supplied and an empty one are different answers.",
  });
}

// …and a handle that is not a set at all, which is neither of those two.
function signalsUnreadable(signals) {
  return deepFreeze({
    code: TRIGGER_SIGNAL_UNREADABLE,
    source: null,
    unresolved: "signals",
    received: describe(signals),
    reason: `the signals handed in could not be read as a set: ${describe(signals)}.`,
  });
}

function unreadable(source, unresolved, received) {
  const who = source === null ? "a signal naming no source" : `the ${source} source`;
  return deepFreeze({
    code: TRIGGER_SIGNAL_UNREADABLE,
    source,
    unresolved,
    received: describe(received),
    reason: `${who} could not read the ${unresolved} it was handed: ${describe(received)}.`,
  });
}

// The item was named and it carries none. SUPPLIED AND EMPTY, which is a fact about the item —
// never confused with `notSupplied`, which is a caller that never looked.
function noCapture(item) {
  return deepFreeze({
    code: TRIGGER_SIGNAL_NO_CAPTURE,
    source: FEEDBACK_FINDING,
    unresolved: "capture",
    item: typeof item === "string" ? item : null,
    reason: `no capture is attributed to ${named(item)}; a finding-triggered wake keys on a capture existing.`,
  });
}

// The loop refused the scope, and this is that refusal WITH ITS `scope` RE-KEYED and nothing else
// touched — the code, the admitted forms with their examples in order, the reason and the
// alternative are the loop's own words, so a caller reading this refusal and a caller reading
// `work:loop`'s cannot be told two different things about one string. The re-key is the whole
// no-empty-resolution clause: a refusal answers to no `scope`.
function scopeRefusal(source, decision) {
  const { scope, ...rest } = decision;
  const driver = containingDriver(scope);
  return deepFreeze({
    ...rest,
    source,
    unresolved: "scope",
    // A STRING IS NAMED; ANYTHING ELSE IS DESCRIBED. `decideLoopScope` hands its refusal the value
    // it refused, and for a non-string that value is the caller's own object graph — a webhook
    // payload carrying a level, an argv, a score and a worktree, which a refusal that echoed it
    // would carry too. This is the same rule the other three refusals here already apply, and it
    // is the one place it was missing: the answer says WHAT it was handed, not what was in it.
    ...(typeof scope === "string" ? { requestedScope: scope } : { received: describe(scope) }),
    // NAMED, NEVER RESOLVED TO. There is no path from here to a resolution carrying this driver.
    ...(driver === null ? {} : { driver }),
  });
}

// The driver an item-shaped ref belongs to, or null. The ref is cut at its one separator and the
// HEAD IS PUT BACK TO THE LOOP: this function decides nothing about what a driver looks like, so
// the day the loop's forms move, what counts as a driver here moves with them.
function containingDriver(value) {
  if (typeof value !== "string") return null;
  const head = value.split(ITEM_SEPARATOR)[0];
  if (head === value) return null;
  const decided = decideLoopScope(head);
  return decided.admitted === true && decided.form === "driver" ? head : null;
}

// One scope string, put to the loop, in the one place every source reaches it.
function throughTheLoop(source, value, resolvedFrom) {
  const decided = decideLoopScope(value);
  return decided.admitted === true
    ? resolution(source, decided.scope, resolvedFrom)
    : scopeRefusal(source, decided);
}

// --- the three sources ------------------------------------------------------
/**
 * A cadence signal — a crontab line's declared scope. NO CLOCK IS READ AND NONE IS CARRIED: the
 * cadence a trigger declares is not consulted here, so a cadence that has not come round yet is
 * answered exactly as one that has, and two resolutions an instant or a year apart are the same
 * answer. Whether now is the moment to fire is the caller's, and the caller is a scheduler that
 * already exists.
 *
 * @param {{ scope?: unknown }} signal the declared trigger. Only `scope` is read.
 * @returns {Readonly<object>} a resolution or a coded refusal
 */
export function resolveCronSignal(signal) {
  if (!isSignal(signal)) return unreadable(CRON, "signal", signal);
  const scope = signal.scope;
  if (scope === undefined) return notSupplied(CRON, "scope");
  return throughTheLoop(CRON, scope, deepFreeze({ field: "scope" }));
}

/**
 * A build's signal. `ref` is the only field read — not the outcome, not the pipeline, not the
 * failure class, not the commit, not the author, not a label reading urgent. A green build is
 * answered exactly as a red one, because deciding which outcomes deserve a loop is a verdict and
 * it belongs where it can be reviewed.
 *
 * @param {{ ref?: unknown }} signal the CI signal. Only `ref` is read.
 * @returns {Readonly<object>} a resolution or a coded refusal
 */
export function resolveCiSignal(signal) {
  if (!isSignal(signal)) return unreadable(CI_SIGNAL, "signal", signal);
  const ref = signal.ref;
  if (ref === undefined) return notSupplied(CI_SIGNAL, "ref");
  return throughTheLoop(CI_SIGNAL, ref, deepFreeze({ field: "ref" }));
}

/**
 * An inbound finding. TWO FACTS ARE READ AND THERE IS NO THIRD: that a capture exists, and which
 * item it is attributed to. `captures` is asked one question — is it empty — and no element is
 * ever touched, so what a capture says, who raised it, what it referenced, when it landed, what
 * its record id was, where it sits in the record, how many there are, and what a later triage
 * attached to it are all unreachable from this answer by construction rather than by care.
 *
 * @param {{ attribution?: unknown, captures?: unknown }} signal the finding signal. The captures
 *        are HANDED IN — this module reads no record file — and only their EXISTENCE is read.
 * @returns {Readonly<object>} a resolution or a coded refusal
 */
export function resolveFindingSignal(signal) {
  if (!isSignal(signal)) return unreadable(FEEDBACK_FINDING, "signal", signal);
  const attribution = signal.attribution;
  if (attribution === undefined) return notSupplied(FEEDBACK_FINDING, "attribution");
  const captures = signal.captures;
  // NOBODY LOOKED and NOTHING IS THERE are different answers, and this is the seam they are told
  // apart at. A caller that never read the record and an item that carries no capture must not
  // arrive at one code, or a broken wake path reports as a quiet item.
  if (captures === undefined) return notSupplied(FEEDBACK_FINDING, "captures");
  if (!Array.isArray(captures)) return unreadable(FEEDBACK_FINDING, "captures", captures);
  if (captures.length === 0) return noCapture(attribution);
  return throughTheLoop(FEEDBACK_FINDING, attribution, deepFreeze({ field: "attribution", capture: "exists" }));
}

// THE TABLE IS THE VOCABULARY. `SIGNAL_SOURCES` is derived from it rather than declared beside it,
// so a source that is added and not wired, or wired and not named, cannot exist.
const RESOLVERS = Object.freeze({
  [CRON]: resolveCronSignal,
  [CI_SIGNAL]: resolveCiSignal,
  [FEEDBACK_FINDING]: resolveFindingSignal,
});

export const SIGNAL_SOURCES = Object.freeze(Object.keys(RESOLVERS));

/**
 * Resolve one signal, dispatching on the source it names.
 *
 * @param {{ source?: unknown }} signal
 * @returns {Readonly<object>} a resolution or a coded refusal
 */
export function resolveTriggerSignal(signal) {
  if (!isSignal(signal)) return unreadable(null, "signal", signal);
  const source = signal.source;
  if (source === undefined) return sourceNotSupplied();
  // OWN KEYS ONLY. A signal naming `toString` or `constructor` resolves to a function on
  // `Object.prototype` under a plain lookup, and a dispatcher that called it would have been
  // handed its behaviour by its input.
  if (typeof source !== "string" || !Object.hasOwn(RESOLVERS, source)) return sourceUnknown(source);
  return RESOLVERS[source](signal);
}

/**
 * Is this answer a resolution? The one discriminator, exported so no caller has to invent one —
 * and the one they would invent is a truthiness test on `.scope`, which is exactly the reading
 * that makes a refusal look like nothing to do.
 *
 * @param {unknown} answer an answer from this module
 * @returns {boolean}
 */
export function isResolvedSignal(answer) {
  return answer !== null && typeof answer === "object"
    && answer.code === undefined && typeof answer.scope === "string";
}

/**
 * Resolve a set of signals. EVERY SIGNAL HAS EXACTLY ONE ANSWER: `answers` is in the order handed
 * in and holds one entry per signal, and `resolved`/`refused` are the two halves of it — the SAME
 * objects, so the two sets are provably disjoint and provably account for everything. One signal
 * that cannot be resolved never costs another its answer, and nothing is dropped between the sets.
 *
 * A handle that was never supplied, one that cannot be read as a set, and an EMPTY set are three
 * different answers: the first two are single coded refusals in `refused`, the third is three
 * empty lists.
 *
 * @param {Iterable<object>} signals
 * @returns {Readonly<{ answers: readonly object[], resolved: readonly object[], refused: readonly object[] }>}
 */
export function resolveTriggerSignals(signals) {
  // THE HANDLE IS A SEAM, and it is the one this file's own header promised to hold "everywhere
  // they occur". An absent set and an empty set are different facts: `[]` is a caller that looked
  // and found nothing, while `undefined` is a caller whose gather FAILED — and answering both with
  // three empty lists is the `?? <empty>` species, here in its worst position, because the reader
  // of this answer is unattended and a code-free empty answer is "nothing to fire". A handle that
  // is not a set at all is a third fact again, and it refuses rather than throwing, so a batch is
  // never louder about a wrong type than about a missing one.
  if (signals === undefined || signals === null) return batchOf([signalsNotSupplied()]);
  if (typeof signals !== "object" || typeof signals[Symbol.iterator] !== "function") {
    return batchOf([signalsUnreadable(signals)]);
  }
  const answers = [];
  for (const signal of signals) answers.push(resolveTriggerSignal(signal));
  return batchOf(answers);
}

// The two halves are FILTERED VIEWS of one ordered list, never rebuilt, so they hold the same
// objects the list does and their disjointness is a fact about identity rather than about content.
function batchOf(answers) {
  return Object.freeze({
    answers: Object.freeze(answers),
    resolved: Object.freeze(answers.filter((answer) => isResolvedSignal(answer))),
    refused: Object.freeze(answers.filter((answer) => !isResolvedSignal(answer))),
  });
}
