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

// resolveSessionLaunch(config, phase, { thinking }) -> { model?, effort, effortSource }
//
// Resolves the phase session's chosen model and effort. `phase` is one of the loop's phase names
// (refine / continue / verify); an unknown phase name contributes no configured route. A model
// route whose value is not a non-empty string is ignored. `thinking` is the caller's
// already-validated `--thinking` level (or absent); `effortSource` names which rung answered —
// `--thinking`, `config` or `default`.
export function resolveSessionLaunch(config, phase, { thinking } = {}) {
  const session = config?.work?.agents?.session;
  const routed = session && typeof session === "object" && !Array.isArray(session) ? session : {};
  const pick = (map) => {
    if (!map || typeof map !== "object" || Array.isArray(map)) return undefined;
    return Object.prototype.hasOwnProperty.call(map, phase) ? map[phase] : undefined;
  };
  const model = pick(routed.models);
  const out = {};
  if (typeof model === "string" && model.trim() !== "") out.model = model;
  const flagged = normalizeEffort(thinking);
  const configured = normalizeEffort(pick(routed.effort));
  if (flagged != null) Object.assign(out, { effort: flagged, effortSource: "--thinking" });
  else if (configured != null) Object.assign(out, { effort: configured, effortSource: "config" });
  else Object.assign(out, { effort: DEFAULT_EFFORT, effortSource: "default" });
  return out;
}
