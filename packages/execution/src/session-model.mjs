// src/session-model.mjs — the SESSION model/effort resolver (milestone 70 / story 01,
// cache-stable-launch; ADR-005).
//
// WHY A SEPARATE LEAF. The milestone's architecture (70/ARCHITECTURE.md § Grounding)
// draws a hard line between TWO surfaces that both legitimately call themselves "the
// model":
//
//   - the ROLE model  — m30 ships `work.agents.models`, a `role -> model` map merged onto
//     the bundle resource before render so the rendered agent's `model:` frontmatter line
//     carries the override (src/work/bundle.mjs:238-272). It governs Task subagents INSIDE
//     a session. This module does not touch it and never reads it.
//   - the SESSION model — the `--model` / `--effort` argv of the `claude` process aof
//     itself spawns. That is what "no model reaches the spawn" actually means, and it is
//     this module's whole subject.
//
// ADR-005 keeps the two surfaces on DISTINCT config paths with no join: the session model
// resolves from `work.agents.session` (this module), never from `work.agents.models`.
// FF-7006 (an extension of the existing role-model source-map guard) makes that split
// structural.
//
// This is a PURE LEAF, the same shape as `otel-attribution.mjs` (68's precedent for
// exactly this problem): it imports nothing from `src/`, performs no filesystem read and
// reads no wall-clock. The spawn seam (`resolveInteractiveDriverLaunch`) merely SETS what
// the resolver returns; the caller (drive.mjs) hands in the already-read config and the
// phase by value.
//
// ABSENCE IS SILENCE — for the MODEL. A project with no `work.agents.session.models`, a phase
// with no routing entry, an empty model string, or a config value that is not an object at all —
// every one of those resolves no model, i.e. the launch passes no `--model`. A spawn must never be
// blocked (or guessed at) by a routing entry it cannot apply.
//
// THE EFFORT IS ALWAYS CHOSEN (story 141). An unset effort used to be silence too, which left a
// driven session thinking at the model's own default (`medium` on Opus 5.5) — the same work could
// come out thorough on one run and shallow on the next. The effort now resolves from the
// `--thinking` flag, then the phase's configured effort, then `DEFAULT_EFFORT`. A configured level
// the vocabulary does not know is not applied (the default is), for the same never-blocked reason;
// `aof project validate` is where it is reported.

// The one config path this resolver may read. Kept as a single constant so FF-7006 can
// pin it and so a future rename is one token, never a scatter.
export const SESSION_MODEL_CONFIG_PATH = "work.agents.session";

// ── THE EFFORT VOCABULARY (story 141) — its one home ──
//
// Claude Code's five `--effort` levels, plus `extra-high` as the operator's name for `xhigh`. Every
// door that takes a level (the drive's and the loop's `--thinking`, `work.agents.session.effort` and
// the role map `work.agents.effort`) reads it through `normalizeEffort`. It lives in this leaf rather
// than a new `src/` root file because the root is at its budget; importing a VOCABULARY is not
// reading another surface's config path, which is all FF-7006 forbids.
export const EFFORT_LEVELS = Object.freeze(["low", "medium", "high", "xhigh", "max"]);
export const EFFORT_ALIASES = Object.freeze({ "extra-high": "xhigh" });
export const DEFAULT_EFFORT = "high";
// The six spellings a door accepts, in the order a refusal names them.
export const EFFORT_SPELLINGS = Object.freeze(["low", "medium", "high", "xhigh", "extra-high", "max"]);

// normalizeEffort(value) -> a canonical level, or null for a refusal. Exact spellings only: a
// case variant (`Extra-High`) or a near miss (`x-high`) is refused rather than guessed at.
export function normalizeEffort(value) {
  if (typeof value !== "string") return null;
  if (EFFORT_LEVELS.includes(value)) return value;
  return Object.prototype.hasOwnProperty.call(EFFORT_ALIASES, value) ? EFFORT_ALIASES[value] : null;
}

// The refusal every door that takes `--thinking` answers for a level it does not know.
export const THINKING_UNKNOWN_LEVEL = "thinking-unknown-level";
export const thinkingUnknownLevelMessage = (value) =>
  `--thinking "${value}" is not a known effort level. Use one of: ${EFFORT_SPELLINGS.join(", ")}.`;

// resolveSessionLaunch(config, phase, { thinking, choice }) -> { model?, effort, effortSource, modelSource? }
//
// Resolves the phase session's chosen model and effort, each PART on its own (143/02, ADR-003 §5):
// the flag, then `work.agents.session.models` / `.effort`, then the default (no model; `DEFAULT_EFFORT`).
// `phase` is one of the loop's phase names; an unknown phase name contributes no configured route. A
// model route whose value is not a non-empty string is ignored.
//
// `choice` is the phase's entry from `parseSessionChoices` (`{ model?, modelFlag?, effort?, effortFlag? }`).
// `thinking` is 141's option, kept: the caller's already-validated UNPHASED `--thinking` level, read
// only when the choice sets no effort. `effortSource` names which rung answered the effort (`--model`,
// `--thinking`, `config` or `default`), and `modelSource` the model's (`--model` or `config`). It is
// appended last, and only when a model resolves, so an unrouted answer is byte-identical to 141's.
export function resolveSessionLaunch(config, phase, { thinking, choice } = {}) {
  const session = config?.work?.agents?.session;
  const routed = session && typeof session === "object" && !Array.isArray(session) ? session : {};
  const pick = (map) => {
    if (!map || typeof map !== "object" || Array.isArray(map)) return undefined;
    return Object.prototype.hasOwnProperty.call(map, phase) ? map[phase] : undefined;
  };
  const usableModel = (value) => typeof value === "string" && value.trim() !== "";
  const chosenModel = usableModel(choice?.model) ? choice.model : null;
  const configuredModel = usableModel(pick(routed.models)) ? pick(routed.models) : null;
  const out = {};
  if (chosenModel != null) out.model = chosenModel;
  else if (configuredModel != null) out.model = configuredModel;
  const chosen = normalizeEffort(choice?.effort);
  const flagged = normalizeEffort(thinking);
  const configured = normalizeEffort(pick(routed.effort));
  if (chosen != null) Object.assign(out, { effort: chosen, effortSource: choice.effortFlag ?? "--model" });
  else if (flagged != null) Object.assign(out, { effort: flagged, effortSource: "--thinking" });
  else if (configured != null) Object.assign(out, { effort: configured, effortSource: "config" });
  else Object.assign(out, { effort: DEFAULT_EFFORT, effortSource: "default" });
  if (out.model !== undefined) out.modelSource = chosenModel != null ? (choice.modelFlag ?? "--model") : "config";
  return out;
}

// ── THE PER-PHASE SESSION CHOICE GRAMMAR (143/02, ADR-003) — its one home ──
//
// `--model [<phase>=][<model>][:<effort>]` and `--thinking [<phase>=]<effort>`, both repeatable, read
// by ONE pure function so the loop and the drive cannot drift apart. A value it cannot read is
// refused with a code, never guessed at.

// The loop's phases, in the order a refusal names them.
export const SESSION_PHASES = Object.freeze(["refine", "continue", "verify"]);
export const SESSION_CHOICE_UNKNOWN_PHASE = "session-choice-unknown-phase";
export const SESSION_CHOICE_EMPTY = "session-choice-empty";
export const SESSION_CHOICE_CONFLICT = "session-choice-conflict";

const choiceRefusal = (code, message) => ({ refusal: { code, message } });

// One flag value → `{ phase, model?, effort?, flag, raw }`, or a refusal. `phase` is `null` for an
// unphased value. `--model` splits on the FIRST `=`, then on the LAST `:` only when the suffix is an
// effort spelling, so any other `:` (a Bedrock-style `…-v1:0`) stays part of the model id.
function readChoice(flag, raw) {
  const value = typeof raw === "string" ? raw : "";
  const at = value.indexOf("=");
  let phase = null;
  let rest = value;
  if (at >= 0) {
    phase = value.slice(0, at);
    rest = value.slice(at + 1);
    if (!SESSION_PHASES.includes(phase)) {
      return choiceRefusal(SESSION_CHOICE_UNKNOWN_PHASE, `${flag} "${value}": "${phase}" is not a phase. Use one of: ${SESSION_PHASES.join(", ")}.`);
    }
  }
  if (flag === "--thinking") {
    const effort = normalizeEffort(rest);
    if (effort == null) return choiceRefusal(THINKING_UNKNOWN_LEVEL, thinkingUnknownLevelMessage(rest));
    return { phase, effort, flag, raw: value };
  }
  let model = rest;
  let effort = null;
  const colon = rest.lastIndexOf(":");
  if (colon >= 0) {
    const level = normalizeEffort(rest.slice(colon + 1));
    if (level != null) {
      model = rest.slice(0, colon);
      effort = level;
    } else if (rest.startsWith(":")) {
      const named = rest.slice(colon + 1);
      return choiceRefusal(THINKING_UNKNOWN_LEVEL, `--model "${value}": "${named}" is not a known effort level. Use one of: ${EFFORT_SPELLINGS.join(", ")}.`);
    }
  }
  // A blank model is no model — the resolver would drop it and silently fall back to config, so the
  // grammar refuses it here rather than accept a value nothing will honour.
  const named = model.trim() !== "";
  if (!named && effort == null) {
    return choiceRefusal(SESSION_CHOICE_EMPTY, `--model "${value}" names neither a model nor an effort.`);
  }
  return { phase, ...(named ? { model } : {}), ...(effort == null ? {} : { effort }), flag, raw: value };
}

// parseSessionChoices({ model, thinking }) -> { choices } | { refusal: { code, message } }
//
// `choices` maps each phase something was chosen for to `{ model?, modelFlag?, effort?, effortFlag? }`.
// SPECIFICITY, NOT ORDER (ADR-003 §4): a phased value beats an unphased one for its phase, and two
// values at the SAME specificity that set the same part of the same phase refuse — even when they
// are equal, because nothing here picks a winner.
export function parseSessionChoices({ model = [], thinking = [] } = {}) {
  const read = [];
  for (const [flag, values] of [["--model", model], ["--thinking", thinking]]) {
    for (const raw of Array.isArray(values) ? values : [values]) {
      const choice = readChoice(flag, raw);
      if (choice.refusal) return choice;
      read.push(choice);
    }
  }
  // The writer of each (specificity, phase, part) slot, so a second writer is named with the first.
  const slots = new Map();
  for (const choice of read) {
    for (const part of ["model", "effort"]) {
      if (choice[part] === undefined) continue;
      const slot = `${choice.phase ?? "*"}:${part}`;
      const first = slots.get(slot);
      if (first) {
        const where = choice.phase == null ? "every phase" : choice.phase;
        return choiceRefusal(SESSION_CHOICE_CONFLICT, `${first.flag} "${first.raw}" and ${choice.flag} "${choice.raw}" both set the ${part} for ${where}. Give one.`);
      }
      slots.set(slot, choice);
    }
  }
  const choices = {};
  for (const phase of SESSION_PHASES) {
    const entry = {};
    for (const part of ["model", "effort"]) {
      const writer = slots.get(`${phase}:${part}`) ?? slots.get(`*:${part}`);
      if (writer) Object.assign(entry, { [part]: writer[part], [`${part}Flag`]: writer.flag });
    }
    if (Object.keys(entry).length > 0) choices[phase] = entry;
  }
  return { choices };
}
