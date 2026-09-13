// The declared level is a CEILING REQUEST, never an admission (milestone 63 / story 01 / ADR-004).
//
// A declaration file that could ADMIT the unattended rung would be the config key this arc has
// already refused twice — 53/ADR-006 rejected `work.loop.allowL3` in terms ("it makes the most
// dangerous rung reachable by editing a JSON file, with no diff a reviewer sees"), and 55/ADR-006
// restated the rejection "because this is the milestone where the temptation actually arrives". A
// `level:` line in `.aof/triggers.jsonc` is not spelled like a config key, but if it admitted
// anything it would be one. So it REQUESTS, and this module is where the request meets the gate
// that already exists.
//
// FOUR PROPERTIES, AND EACH IS A SEPARATE WAY THIS FILE COULD HAVE BEEN WRONG:
//
// 1 · ADMISSION STAYS IN ONE HOME. `resolveLoopLevel` and `resolveLoopLevelGate`
//     (`src/work/loop.mjs`) decide; this leaf imports them and decides nothing. There is no
//     threshold here, no score arithmetic, no component verdict and no rung spelled out — not even
//     to ask "is this the gated rung?", which is asked of the gate itself (see THE PROBE below).
//     The failing-half payload is carried through VERBATIM rather than re-phrased, because a
//     re-phrasing is a second opinion that drifts silently.
//
// 2 · RESOLUTION HAPPENS AT FIRE TIME, ON EVERY FIRE. A workspace's anchors, its Loop-Ready score
//     and its groundedness all move, so a verdict computed when the declaration was COMPILED is a
//     permission with no expiry handed to the one caller that will never notice it went stale. This
//     is a pure function of `(trigger, facts)`: nothing is memoised, nothing is written back to the
//     trigger, and two readings of one workspace give two answers inside one process.
//
// 3 · A REFUSED LEVEL IS REFUSED BY NAME AND NEVER DOWNGRADED. `resolveLoopLevel` defaults an
//     ABSENT level to the loop's own default; a DECLARED level that fails its gate is a different
//     case entirely, and running it one rung down would be this milestone's whole failure mode
//     wearing a friendly face — the caller asked for a run nobody would attend and would get an
//     attended run with nobody attending. A refusal therefore carries NO `level` key at all. The
//     requested rung is reported under `requestedLevel`, so a caller that reads only `level` finds
//     nothing on a refusal and cannot mistake it for the defaulted answer. That single re-key is
//     the difference between three outcomes and the two a collapse would leave.
//
// 4 · THE GATE FACTS ARE HANDED IN. Nothing here reads a file, a clock, a workspace or the
//     registry; the face gathers `loopReady` and the groundedness report at the command boundary
//     exactly as `src/commands/loop.mjs` already does (53/ADR-007's rule), and hands them over. A
//     pre-flight that consulted the workspace it happened to be standing in would answer from the
//     disk — and would answer differently in a different directory, which is precisely what an
//     unattended caller resolving for a workspace it is not inside cannot afford.
//
// AND WHAT IT IS NOT: this is a PRE-FLIGHT, not an authority. `src/commands/loop.mjs` gates the
// level again when the loop is entered, so an answer here is a prediction about a moment that has
// not happened yet, and the answer says so in its machine form. What it buys is that an unattended
// caller learns BEFORE the launch, in a machine-readable refusal, that the rung it declared is
// unavailable — instead of discovering it inside a launched process whose output nobody reads.
//
// AN ABSENT FACT AND A FAILED FACT ARE DIFFERENT ANSWERS. The gate renders both identically (a
// reading that is missing and a reading that is bad both come back as a failing half), so this leaf
// is the only place the difference survives, and it checks presence BEFORE delegating. "Your
// workspace does not qualify" and "you did not give me the readings" send an operator to two
// different places, and guessing has two shapes that are both bad: missing-means-passing admits the
// dangerous rung on no evidence, and missing-means-failing sends the operator to fix a score that
// was never read.
import { resolveLoopLevel, resolveLoopLevelGate } from "../work/loop.mjs";

// 63's own refusal, and the only code this module authors. The other codes a resolution can carry
// (`loop-level-unknown`, `loop-level-locked`, `loop-level-gate`) are the gate's own and arrive on
// its own decision object — they are members of `LOOP_REFUSALS` and are never retyped here.
export const TRIGGER_LEVEL_FACTS_NOT_SUPPLIED = "trigger-level-facts-not-supplied";

// The two gate facts, BY THE NAMES `resolveLoopLevelGate` ITSELF READS THEM UNDER. They are named
// here for one reason only: a refusal owes the caller which reading was missing, and a caller
// cannot be told "one of them" and go fix it. This is a pair of field names — not a threshold, not
// a predicate and not a verdict — and `acd-trigger-level-is-a-ceiling` drives a recording proxy
// through the real gate to assert this list is still exactly what that gate consults, so the pair
// cannot drift into a private copy.
export const TRIGGER_GATE_FACTS = Object.freeze(["loopReady", "groundedness"]);

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

// An answer says which moment it belongs to, because a resolution that did not would be
// indistinguishable from a stored admission — which is the thing §2 above forbids existing.
function answer(triggerId, level) {
  return deepFreeze({
    triggerId,
    resolved: true,
    level,
    preflight: true,
    resolvedFor: "this-fire",
    gatedAgainAt: "work:loop",
  });
}

// The gate's decision, carried through with its `level` RE-KEYED and nothing else touched. The
// re-key is the whole no-collapse clause (§3): a refusal must not answer to `level`, or a caller
// reading only that key would read a refused L3 as a run at some level.
function refusalFrom(triggerId, decision) {
  const { level, ...rest } = decision;
  return deepFreeze({ triggerId, ...rest, requestedLevel: level });
}

// A reading that was never handed in is its OWN refusal, and it names which one. It reports no
// score and no component, because it read neither — a refusal that quoted a score nobody supplied
// would be the guess this module exists to refuse.
function factsNotSupplied(triggerId, level, missing) {
  return deepFreeze({
    triggerId,
    code: TRIGGER_LEVEL_FACTS_NOT_SUPPLIED,
    requestedLevel: level,
    missing,
    reason: `${level} is gated, and the gate facts were not handed in: ${missing.join(", ")}.`,
  });
}

const triggerIdOf = (trigger) =>
  (typeof trigger?.id === "string" && trigger.id.length > 0 ? trigger.id : null);

/**
 * Resolve one trigger's declared level against gate facts handed in by the caller.
 *
 * @param {{ id?: string, level?: unknown }} trigger the trigger as declared. Only `id` and `level`
 *        are read; nothing is written back to it, and no verdict is ever cached on it.
 * @param {{ loopReady?: unknown, groundedness?: unknown }} [facts] the two gate facts, gathered at
 *        the command boundary and HANDED IN — `src/commands/loop.mjs` gathers exactly this pair.
 * @returns {Readonly<object>} an answer (`resolved: true`, carrying `level`) or a coded refusal
 *          (carrying `code` and `requestedLevel`, and NEVER `level`).
 */
export function resolveTriggerLevel(trigger, facts) {
  const triggerId = triggerIdOf(trigger);

  // ONE — the LADDER decides whether the declared token is a level at all, and it decides BEFORE
  // any workspace fact is consulted. A bad spelling over a failing workspace must report the bad
  // spelling; reporting a gate failure would send the author to fix the wrong thing entirely. The
  // ladder matches as declared — no trim, no case fold, no repair — so an empty string and an
  // absent key stay the two different callers they are.
  const declared = resolveLoopLevel(trigger?.level);
  if (declared.admitted !== true) return refusalFrom(triggerId, declared);
  const level = declared.level;

  // TWO — THE PROBE. Whether this rung is gated at all is a question for the gate, not for a rung
  // spelled out here: put the level to the gate with no facts, and a rung that needs none answers
  // admitted while a gated one refuses. That keeps the gated-rung fact where §1 says it lives, and
  // is why this file contains no level literal — including the one a "if (level === the top rung)"
  // branch would have needed. A rung that needs no facts is not blocked by facts it never needed.
  if (resolveLoopLevelGate(level, {}).admitted === true) return answer(triggerId, level);

  // THREE — the rung IS gated, so the readings must actually have been handed in. This is a
  // presence check and nothing more: it compares no number, applies no threshold and reads no
  // component verdict, so it is a precondition rather than the second gate ADR-004 forbids.
  const missing = TRIGGER_GATE_FACTS.filter((fact) => facts?.[fact] === undefined || facts?.[fact] === null);
  if (missing.length > 0) return factsNotSupplied(triggerId, level, missing);

  // FOUR — the one gate home decides, over the facts it was handed, at this fire.
  const gated = resolveLoopLevelGate(level, facts);
  return gated.admitted === true ? answer(triggerId, level) : refusalFrom(triggerId, gated);
}

/**
 * Resolve a whole compiled set. The two sides are DISJOINT and a refused trigger appears in
 * neither the resolved side nor at any level anywhere in the answer — a downgrade has nowhere to
 * hide as a successful resolution one rung down, and nothing downstream can build a launch for a
 * trigger that was refused.
 *
 * @param {Iterable<object>} triggers
 * @param {{ loopReady?: unknown, groundedness?: unknown }} [facts]
 * @returns {Readonly<{ resolved: readonly object[], refused: readonly object[] }>}
 */
export function resolveTriggerLevels(triggers, facts) {
  const resolved = [];
  const refused = [];
  for (const trigger of triggers ?? []) {
    const decision = resolveTriggerLevel(trigger, facts);
    (decision.resolved === true ? resolved : refused).push(decision);
  }
  return Object.freeze({ resolved: Object.freeze(resolved), refused: Object.freeze(refused) });
}

// --- the rendered form ------------------------------------------------------
// The machine form and the human form must not collapse where the other does not: a defaulted
// level and a refused one are two different sentences here for the same reason they are two
// different objects above. Every figure printed is one the GATE reported — the threshold below is
// read off the refusal's own payload, never held here.
function scoreParticulars(score) {
  const value = score?.score ?? null;
  const reading = value === null ? "no score was read" : `score ${value}/${score.threshold}`;
  const clears = typeof score?.clears === "string" ? `, clears ${score.clears}` : "";
  const blocking = Array.isArray(score?.blocking) && score.blocking.length > 0
    ? `, blocked by ${score.blocking.map((row) => (typeof row === "string" ? row : row?.id ?? JSON.stringify(row))).join(", ")}`
    : "";
  return `${reading}${clears}${blocking}`;
}

function groundednessParticulars(groundedness) {
  const state = `report ${groundedness?.state ?? "unavailable"}`;
  const components = Array.isArray(groundedness?.components) && groundedness.components.length > 0
    ? `, ${groundedness.components.map((row) => `${row.verdict} (${[...(row.members ?? []), ...(row.groundClasses ?? [])].join(", ")})`).join("; ")}`
    : "";
  return `${state}${components}`;
}

function refusalSentence(resolution) {
  const requested = typeof resolution.requestedLevel === "string"
    ? resolution.requestedLevel
    : JSON.stringify(resolution.requestedLevel ?? null);
  if (resolution.code === TRIGGER_LEVEL_FACTS_NOT_SUPPLIED) {
    return `${requested} could not be pre-flighted: the gate facts were not handed in (${resolution.missing.join(", ")})`;
  }
  if (Array.isArray(resolution.failingHalves)) {
    const halves = resolution.failingHalves.join(" and ");
    const particulars = [
      ...(resolution.score ? [scoreParticulars(resolution.score)] : []),
      ...(resolution.groundedness ? [groundednessParticulars(resolution.groundedness)] : []),
    ].join("; ");
    return `${requested} refused on ${halves} — ${particulars}`;
  }
  const known = Array.isArray(resolution.known) ? ` — the ladder carries ${resolution.known.join(", ")}` : "";
  return `${requested} is not a level this ladder carries${known}`;
}

/**
 * One resolution as one line for a human. A resolved trigger says the level it WILL RUN AT; a
 * refused one says it will NOT RUN and names the half that refused it — and never names a level it
 * will run at, because there is none.
 *
 * Takes a resolution THIS MODULE PRODUCED, and reads it as one: every access below is unguarded,
 * including `refusalSentence`'s. Guarding the first two reads and not the rest would say the
 * argument might be absent while depending on it not being, which is a claim about the contract
 * that the next reader has to resolve by testing it.
 *
 * @param {Readonly<object>} resolution an answer or a refusal from `resolveTriggerLevel`
 * @returns {string}
 */
export function renderTriggerLevelResolution(resolution) {
  const label = resolution.triggerId ?? "(unnamed trigger)";
  if (resolution.resolved === true) {
    return `${label}: will run at ${resolution.level} (pre-flight — ${resolution.gatedAgainAt} gates it again at launch)`;
  }
  return `${label}: will not run — ${refusalSentence(resolution)} [${resolution.code}]`;
}
