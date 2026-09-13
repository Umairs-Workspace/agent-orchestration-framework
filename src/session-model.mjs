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
// ABSENCE IS SILENCE. A project with no `work.agents.session` config, a phase with no
// routing entry, an empty model string, or a config value that is not an object at all —
// every one of those resolves to `{}`, i.e. the launch passes no `--model`/`--effort` and
// is byte-identical to today's spawn. A spawn must never be blocked (or guessed at) by a
// routing entry it cannot apply.

// The one config path this resolver may read. Kept as a single constant so FF-7006 can
// pin it and so a future rename is one token, never a scatter.
export const SESSION_MODEL_CONFIG_PATH = "work.agents.session";

// resolveSessionLaunch(config, phase) -> { model?, effort? }
//
// Resolves the phase session's chosen model and effort from the project config. Both are
// OPTIONAL and INDEPENDENT: a config may route a model for one phase and an effort for
// another, either without the other, or neither. `phase` is one of the loop's phase names
// (refine / continue / verify); an unknown phase name (or a phase the config does not
// route) contributes nothing. A route whose value is not a non-empty string is ignored —
// an empty model string passes no `--model`, exactly as if it were absent.
export function resolveSessionLaunch(config, phase) {
  const session = config?.work?.agents?.session;
  if (!session || typeof session !== "object" || Array.isArray(session)) {
    return {};
  }
  const pick = (map) => {
    if (!map || typeof map !== "object" || Array.isArray(map)) return undefined;
    const value = map[phase];
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
  };
  const model = pick(session.models);
  const effort = pick(session.effort);
  const out = {};
  if (model !== undefined) out.model = model;
  if (effort !== undefined) out.effort = effort;
  return out;
}
