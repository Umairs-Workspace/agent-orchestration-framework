// packages/design-system/src/config.mjs — the ONE shape check of `work.ui.designSystem` (198/ADR-005).
//
// `work.ui.designSystem = { enabled, name | artifact, mode, source }` names the Design System a
// project draws on. Exactly one of `name` (the title the operator sees) and `artifact` (a claude.ai
// artifact link) names it; `mode` is `owned` or `reference`; `source` lists the CSS files an owned
// system is synced from, and a referenced one takes none.
//
// Two callers share this module, so the rule is written once: the config validator
// (`config-inspect.mjs`'s `validateWork`) reports `designSystemDiagnostics`, and `aof design-system
// use` builds its block with `designSystemBlock` and refuses anything the diagnostics flag. A pure
// leaf, in the manner of `@aof/contracts/operator-profile`: it imports nothing, reads no file and
// never throws. The CLI never resolves a `name`: that is the session's one list call (ADR-005 §4).

export const DESIGN_SYSTEM_PATH = "work.ui.designSystem";
export const DESIGN_SYSTEM_MODES = Object.freeze(["owned", "reference"]);
export const DESIGN_SYSTEM_KEYS = Object.freeze(["enabled", "name", "artifact", "mode", "source"]);

// Every code the validator can report, one per defect (198/01 Q9).
export const DESIGN_SYSTEM_CODES = Object.freeze({
  nameAndArtifact: "design-system-name-and-artifact",
  unnamed: "design-system-unnamed",
  emptyName: "design-system-empty-name",
  badArtifact: "design-system-bad-artifact",
  badMode: "design-system-bad-mode",
  sourceMissing: "design-system-source-missing",
  sourceStray: "design-system-source-stray",
  unknownKey: "design-system-unknown-key",
  badValue: "design-system-bad-value",
});

// The two link forms a system may be pinned by: an artifact id, or a Claude Code artifact uuid.
const ARTIFACT_LINK = /^https:\/\/claude\.ai\/(?:artifact\/[A-Za-z0-9_-]+|code\/artifact\/[0-9a-fA-F-]{36})\/?$/;

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

export const isArtifactLink = (value) => typeof value === "string" && ARTIFACT_LINK.test(value);

// The raw block a config holds, or undefined.
export function designSystemBlockOf(config) {
  const ui = isPlainObject(config) && isPlainObject(config.work) ? config.work.ui : undefined;
  return isPlainObject(ui) ? ui.designSystem : undefined;
}

/**
 * What the validator reports for a block, as `{ path, message, code }` entries. No block is no
 * entry. Every shape check applies whether or not the practice is on; only "unnamed" waits for
 * `enabled: true`, and a missing `mode` is a bad mode only then.
 */
export function designSystemDiagnostics(block) {
  if (block === undefined) return [];
  const P = DESIGN_SYSTEM_PATH;
  const C = DESIGN_SYSTEM_CODES;
  const entry = (at, code, message) => ({ path: at, code, message });
  if (!isPlainObject(block)) {
    return [entry(P, C.badValue, `${P} must be an object: {"enabled": true, "name": "<title>", "mode": "owned", "source": ["<file>"]}.`)];
  }
  const entries = [];
  for (const key of Object.keys(block)) {
    if (!DESIGN_SYSTEM_KEYS.includes(key)) {
      entries.push(entry(`${P}.${key}`, C.unknownKey, `${P}.${key} is not a known key; ${P} takes only ${DESIGN_SYSTEM_KEYS.map((name) => `"${name}"`).join(", ")}.`));
    }
  }
  const on = block.enabled === true;
  if (block.enabled !== undefined && typeof block.enabled !== "boolean") {
    entries.push(entry(`${P}.enabled`, C.badValue, `${P}.enabled must be true or false.`));
  }
  const hasName = block.name !== undefined;
  const hasArtifact = block.artifact !== undefined;
  if (hasName && hasArtifact) {
    entries.push(entry(P, C.nameAndArtifact, `${P} names its system by "name" or by "artifact", not both: keep the title, or the link.`));
  } else if (!hasName && !hasArtifact && on) {
    entries.push(entry(P, C.unnamed, `${P} is on but names no system: set "name" to the system's title, or "artifact" to its claude.ai link.`));
  }
  if (hasName && (typeof block.name !== "string" || block.name.trim() === "")) {
    entries.push(entry(`${P}.name`, C.emptyName, `${P}.name must be the system's title, a non-empty string.`));
  }
  if (hasArtifact && !isArtifactLink(block.artifact)) {
    entries.push(entry(`${P}.artifact`, C.badArtifact, `${P}.artifact must be a claude.ai artifact link: https://claude.ai/artifact/<id> or https://claude.ai/code/artifact/<uuid>.`));
  }
  const modeKnown = DESIGN_SYSTEM_MODES.includes(block.mode);
  if ((block.mode !== undefined || on) && !modeKnown) {
    entries.push(entry(`${P}.mode`, C.badMode, `${P}.mode must be "owned" or "reference".`));
  }
  const source = block.source;
  if (block.mode === "owned") {
    if (source !== undefined && !isSourceList(source)) {
      entries.push(entry(`${P}.source`, C.badValue, `${P}.source must be a list of project-relative paths.`));
    } else if (!Array.isArray(source) || source.length === 0) {
      entries.push(entry(`${P}.source`, C.sourceMissing, `${P}.source must list the CSS files an "owned" system is synced from.`));
    }
  } else if (block.mode === "reference" && source !== undefined) {
    entries.push(entry(`${P}.source`, C.sourceStray, `${P}.source is for an "owned" system; a "reference" system is synced by its owner, so remove "source".`));
  } else if (source !== undefined && !isSourceList(source)) {
    entries.push(entry(`${P}.source`, C.badValue, `${P}.source must be a list of project-relative paths.`));
  }
  return entries;
}

const isSourceList = (source) => Array.isArray(source) && source.every((item) => typeof item === "string" && item.trim() !== "");

// A path as the block stores it: forward slashes, no leading "./".
export function normaliseSourcePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^(?:\.\/)+/, "");
}

/**
 * The block `use` writes for its flags: `enabled: true`, exactly the naming form given, the mode,
 * and the sources (normalised) only for an owned system. Every other key the old block held is
 * dropped: `use` names the system whole, so writing one form removes the other.
 */
export function designSystemBlock({ name, artifact, mode, source } = {}) {
  return {
    enabled: true,
    ...(name !== undefined ? { name } : {}),
    ...(artifact !== undefined ? { artifact } : {}),
    ...(mode !== undefined ? { mode } : {}),
    ...(source !== undefined ? { source: source.map(normaliseSourcePath) } : {}),
  };
}
