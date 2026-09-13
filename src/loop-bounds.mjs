// The single declaration and resolution home for every `work.loop.*` key: the deadlines and
// loop caps of milestone 69, and the concurrency MODE of milestone 129. A pure leaf: callers
// pass it a workspace/config value and receive immutable policy facts.

export const DEFAULT_START_TO_CLOSE_MS = 30 * 60 * 1000;
export const DEFAULT_HEARTBEAT_MS = 15 * 60 * 1000;
export const DEFAULT_SCHEDULE_TO_START_MS = 10 * 60 * 1000;
export const DEFAULT_SCHEDULE_TO_CLOSE_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_STARTUP_GRACE_MS = 5 * 60 * 1000;
export const DEFAULT_REVIEW_ROUNDS = 1;
export const MAX_REVIEW_ROUNDS = 3;
export const DEFAULT_BUILD_NO_PROGRESS_ROUNDS = 2;
// 61/ADR-009 §3 — the one clamp this milestone lands. The floor was already
// enforced by `positiveInteger`; the ceiling was missing entirely, and a knob a
// tuning rule may step by one notch with no upper end is a ratchet that walks
// upward until somebody notices. 4 is derived, not chosen: the worst-case
// no-progress spend is `maxStalls x (maxResets + 1)` = 4 x 3 = 12 rounds, which at
// the $22.82 mean task build is ~$274 — half the most expensive single build ever
// measured here ($544.06), so the ceiling bounds no-progress waste below the
// costliest PRODUCTIVE build this repo has paid for.
export const MAX_BUILD_NO_PROGRESS_ROUNDS = 4;
export const DEFAULT_PROGRESS_MAX_RESETS = 2;

export const LOOP_BOUND_TERMINAL_BEHAVIOURS = Object.freeze({
  startToClose: "kill the attempt and retry it",
  heartbeat: "kill the attempt and retry it",
  scheduleToStart: "alert and escalate, never retry",
  scheduleToClose: "give up, escalate, preserve the tree",
  startupGrace: "suspend the heartbeat deadline only",
});

function positiveInteger(value, fallback) {
  return Number.isSafeInteger(value)
    && value > 0
    ? value
    : fallback;
}

export const resolveStartToCloseMs = (value) => positiveInteger(value, DEFAULT_START_TO_CLOSE_MS);
export const resolveHeartbeatMs = (value) => positiveInteger(value, DEFAULT_HEARTBEAT_MS);
export const resolveScheduleToStartMs = (value) => positiveInteger(value, DEFAULT_SCHEDULE_TO_START_MS);
export const resolveScheduleToCloseMs = (value) => positiveInteger(value, DEFAULT_SCHEDULE_TO_CLOSE_MS);
export const resolveStartupGraceMs = (value) => positiveInteger(value, DEFAULT_STARTUP_GRACE_MS);
export const resolveReviewRounds = (value) => Math.min(
  positiveInteger(value, DEFAULT_REVIEW_ROUNDS),
  MAX_REVIEW_ROUNDS,
);
export const resolveBuildNoProgressRounds = (value) => Math.min(
  positiveInteger(value, DEFAULT_BUILD_NO_PROGRESS_ROUNDS),
  MAX_BUILD_NO_PROGRESS_ROUNDS,
);
export const resolveProgressMaxResets = (value) => positiveInteger(value, DEFAULT_PROGRESS_MAX_RESETS);

const loopConfig = (workspace) => workspace?.config?.work?.loop;

export function startToCloseFromConfig(workspace) {
  return resolveStartToCloseMs(loopConfig(workspace)?.startToCloseMs);
}

export function heartbeatFromConfig(workspace) {
  return resolveHeartbeatMs(loopConfig(workspace)?.heartbeatMs);
}

// 81/00 — THE GRADE'S DEADLINE, DERIVED FROM TWO BOUNDS 69 ALREADY CHOSE.
//
// A grade that outlasts the window that supervises it is REAPED, not reported:
// `heartbeat`'s stated terminal behaviour is *"kill the attempt and retry it"*, so a
// healthy grade running past it comes back as a stranded run and a retry. The grade
// resolved `startToClose` — THIRTY minutes against a FIFTEEN minute window, twice the
// bound it must survive.
//
// So the deadline is `min(startToClose, heartbeat)`, DERIVED here in `69/ADR-001`'s single
// home. NO NEW CONFIG KEY, no new default and no new resolution site: it appears in neither
// `LOOP_BOUND_CONFIG_RESOLVERS` nor `LOOP_BOUND_VALUE_RESOLVERS`, so the tuner's declared
// ranges are unchanged and `compoundStepRefusal` is not provoked. It is a derivation over
// two knobs, not a knob.
//
// THE COST IS NAMED AND TAKEN (81/00). A repository whose declared rubric legitimately
// exceeds `heartbeatMs` now gets a legible `runner-timeout` -> `grade-indeterminate` halt
// carrying the deadline it exceeded, instead of a silent reap-and-retry. The remedy is the
// one EXISTING key `work.loop.heartbeatMs` — never a grade-specific knob.
export function gradeDeadlineFromConfig(workspace) {
  return Math.min(startToCloseFromConfig(workspace), heartbeatFromConfig(workspace));
}

export function scheduleToStartFromConfig(workspace) {
  return resolveScheduleToStartMs(loopConfig(workspace)?.scheduleToStartMs);
}

export function scheduleToCloseFromConfig(workspace) {
  return resolveScheduleToCloseMs(loopConfig(workspace)?.scheduleToCloseMs);
}

export function startupGraceFromConfig(workspace) {
  return resolveStartupGraceMs(loopConfig(workspace)?.startupGraceMs);
}

export function reviewRoundsFromConfig(workspace) {
  return resolveReviewRounds(loopConfig(workspace)?.reviewRounds);
}

export function buildNoProgressRoundsFromConfig(workspace) {
  return resolveBuildNoProgressRounds(loopConfig(workspace)?.buildNoProgressRounds);
}

export function progressMaxResetsFromConfig(workspace) {
  return resolveProgressMaxResets(loopConfig(workspace)?.progressMaxResets);
}

// ── THE CONCURRENCY MODE (129/ADR-001 §1) ────────────────────────────────────
//
// `work.loop.concurrency` is a MODE, not a number, and it lives here because every
// `work.loop.*` key lives here (69/ADR-001's single home; FF-6901 holds it). Two
// members: `sequential` — today's loop, one act per tick in the primary, and what an
// unset key means, byte-identically — and `refine_first` — refine every in-scope story
// first, then build the ready waves in lanes. A numeric "lanes at once" value was
// rejected (129/ADR-006): the bound on concurrent lanes is `work:dispatch`'s own, and a
// second number here would be the twin FF-6901's own text forbids the home from annexing.
//
// The resolver answers a member VERBATIM and the default for anything else — no trim,
// no case-fold, never a throw — so the range probe below (61/ADR-009 §2, `resolve(p)
// === p`) admits exactly the two modes and refuses every spelling variant. A one-notch
// step on a string is `from + step` → `"sequential1"`, which resolves to the default
// and is refused `outside-declared-range` by the same arithmetic, with no special case:
// the tuner already refuses a non-numeric step as `NOT_AN_ORDINAL_KNOB`.
export const LOOP_CONCURRENCY_MODES = Object.freeze(["sequential", "refine_first"]);
export const DEFAULT_LOOP_CONCURRENCY = LOOP_CONCURRENCY_MODES[0];

export const resolveLoopConcurrency = (value) => (
  LOOP_CONCURRENCY_MODES.includes(value) ? value : DEFAULT_LOOP_CONCURRENCY
);

export function loopConcurrencyFromConfig(workspace) {
  return resolveLoopConcurrency(loopConfig(workspace)?.concurrency);
}

// The registry's config-pointer authority is derived from callable resolvers,
// never from a parallel allow-list that can claim a key nobody actually reads.
export const LOOP_BOUND_CONFIG_RESOLVERS = Object.freeze({
  "work.loop.startToCloseMs": startToCloseFromConfig,
  "work.loop.heartbeatMs": heartbeatFromConfig,
  "work.loop.scheduleToStartMs": scheduleToStartFromConfig,
  "work.loop.scheduleToCloseMs": scheduleToCloseFromConfig,
  "work.loop.startupGraceMs": startupGraceFromConfig,
  "work.loop.reviewRounds": reviewRoundsFromConfig,
  "work.loop.buildNoProgressRounds": buildNoProgressRoundsFromConfig,
  "work.loop.progressMaxResets": progressMaxResetsFromConfig,
  // 129/ADR-001 §1 — the NINTH key, appended last so `LOOP_BOUND_CONFIG_KEYS` keeps the
  // eight in their order. A mode in a map of bounds: it joins so the registry loader can
  // admit `ceiling: [config:work.loop.concurrency]` and FF-6111's two-way key equality
  // holds; it is NOT in `loopBoundsFromConfig` below, which is the driver's deadline policy.
  "work.loop.concurrency": loopConcurrencyFromConfig,
});

export const LOOP_BOUND_CONFIG_KEYS = Object.freeze(Object.keys(LOOP_BOUND_CONFIG_RESOLVERS));

export function loopBoundsFromConfig(workspace) {
  return Object.freeze({
    startToCloseMs: startToCloseFromConfig(workspace),
    heartbeatMs: heartbeatFromConfig(workspace),
    scheduleToStartMs: scheduleToStartFromConfig(workspace),
    scheduleToCloseMs: scheduleToCloseFromConfig(workspace),
    startupGraceMs: startupGraceFromConfig(workspace),
    reviewRounds: reviewRoundsFromConfig(workspace),
    buildNoProgressRounds: buildNoProgressRoundsFromConfig(workspace),
    progressMaxResets: progressMaxResetsFromConfig(workspace),
  });
}

export function resolvesLoopBoundConfigKey(key) {
  return Object.prototype.hasOwnProperty.call(LOOP_BOUND_CONFIG_RESOLVERS, key)
    && typeof LOOP_BOUND_CONFIG_RESOLVERS[key] === "function";
}

// ── THE RANGE PROBE (61/ADR-009 §2) ──────────────────────────────────────────
//
// A tuning proposal moves one knob by one notch, and something has to say whether
// the proposed value is allowed. The tempting answer is a table of floors and
// ceilings the proposer reads — and that table would be a SECOND home for a bound
// that already exists where the knob is resolved. Two homes for one number become
// two different numbers the first time either is edited (F-6900 / F-69-V7 /
// F-69-V8 indict exactly that species).
//
// So admissibility is ASKED, not looked up: a proposed value `p` is in range iff
// `resolve(p) === p`. The knob answers for itself, per knob rather than shared, and
// nothing written down anywhere can widen a range because there is nothing written
// down to edit. Note the probe only becomes a bound once the ranges exist: over a
// knob with no ceiling an unbounded resolution returns whatever it is handed, so
// the probe admits everything — which is why the clamp above and this probe are one
// story.
//
// The probe needs a VALUE-shaped resolver and `LOOP_BOUND_CONFIG_RESOLVERS` holds
// workspace-shaped ones, so the same keys are mapped to the callables they already
// funnel through. It is DERIVED from those callables, never a parallel allow-list:
// a value-shaped resolver cannot name a key its config-shaped sibling does not.
export const LOOP_BOUND_VALUE_RESOLVERS = Object.freeze({
  "work.loop.startToCloseMs": resolveStartToCloseMs,
  "work.loop.heartbeatMs": resolveHeartbeatMs,
  "work.loop.scheduleToStartMs": resolveScheduleToStartMs,
  "work.loop.scheduleToCloseMs": resolveScheduleToCloseMs,
  "work.loop.startupGraceMs": resolveStartupGraceMs,
  "work.loop.reviewRounds": resolveReviewRounds,
  "work.loop.buildNoProgressRounds": resolveBuildNoProgressRounds,
  "work.loop.progressMaxResets": resolveProgressMaxResets,
  // 129/ADR-001 §1 — the mode's value-shaped twin, appended last to mirror its config-shaped
  // sibling above; `rangeProbe` answers for the key through this callable alone.
  "work.loop.concurrency": resolveLoopConcurrency,
});

export const LOOP_BOUND_VALUE_KEYS = Object.freeze(Object.keys(LOOP_BOUND_VALUE_RESOLVERS));

// The two ways a proposal fails, kept APART. A key that declares no range has
// nothing to ask, and the one thing the probe must never do with it is report it
// admissible by default: silence and "in range" are different answers.
export const OUTSIDE_DECLARED_RANGE = "outside-declared-range";
export const NO_DECLARED_RANGE = "no-declared-range";

// A step is one knob and one notch (61/ADR-001 §4). A key that resolves to more
// than one bound moves every one of them in a single write, so every step on it is
// compound BY CONSTRUCTION — the refusal is derived from that rule rather than
// invented for any particular key.
export const STEP_WOULD_BE_COMPOUND = "step-would-be-compound";

// The probe. `inEffect` is what the knob answered instead — a refusal reports the
// value that would take effect, and names the knob the answer came from. Pure: a
// read, never a write, and it consults nothing but the knob's own resolver.
export function rangeProbe(key, proposed) {
  const resolve = Object.prototype.hasOwnProperty.call(LOOP_BOUND_VALUE_RESOLVERS, key)
    ? LOOP_BOUND_VALUE_RESOLVERS[key]
    : null;
  if (typeof resolve !== "function") {
    return Object.freeze({ key, proposed, admissible: false, inEffect: null, code: NO_DECLARED_RANGE });
  }
  const inEffect = resolve(proposed);
  return Object.freeze(inEffect === proposed
    ? { key, proposed, admissible: true, inEffect, code: null }
    : { key, proposed, admissible: false, inEffect, code: OUTSIDE_DECLARED_RANGE });
}

// A one-notch step is taken FROM a value in effect, never from what the config file
// says: a knob configured above its ceiling is in effect at the ceiling, and a step
// down from it is one below the ceiling rather than one below the configured value.
export function stepProbe(key, from, step) {
  return Object.freeze({ ...rangeProbe(key, from + step), from, step });
}

export function stepProbeFromConfig(workspace, key, step) {
  const resolveFromConfig = Object.prototype.hasOwnProperty.call(LOOP_BOUND_CONFIG_RESOLVERS, key)
    ? LOOP_BOUND_CONFIG_RESOLVERS[key]
    : null;
  if (typeof resolveFromConfig !== "function") {
    return Object.freeze({ key, proposed: null, admissible: false, inEffect: null, code: NO_DECLARED_RANGE, from: null, step });
  }
  return stepProbe(key, resolveFromConfig(workspace), step);
}

// The refusal, computed from the COUNT of bounds the key resolves to and from
// nothing else — never recorded as a fact about a name. The day a key stops meaning
// two things the refusal stops on its own, with nothing to remember to delete; and
// no amount of evidence, no larger budget and no change to the configured value can
// lift it, because none of them changes how many bounds resolve from the key.
// Returns null when there is nothing to refuse.
export function compoundStepRefusal(proposal) {
  const bounds = Array.isArray(proposal?.bounds) ? [...proposal.bounds] : [];
  if (bounds.length <= 1) return null;
  return Object.freeze({
    code: STEP_WOULD_BE_COMPOUND,
    key: proposal?.key ?? null,
    bounds: Object.freeze(bounds.map((bound) => String(bound))),
  });
}

// Startup grace suppresses only the heartbeat deadline. The attempt and total
// wall clocks are active from the first instant and cannot be extended by grace.
export function deadlineApplicability(policy, attemptElapsedMs) {
  const elapsed = typeof attemptElapsedMs === "number" && Number.isFinite(attemptElapsedMs)
    ? Math.max(0, attemptElapsedMs)
    : 0;
  return Object.freeze({
    heartbeat: elapsed >= policy.startupGraceMs,
    startToClose: true,
    scheduleToClose: true,
  });
}
