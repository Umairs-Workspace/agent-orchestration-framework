// packages/contracts/src/local-config.mjs — the ONE home of the per-person local config (story 199).
//
// `.aof/aof.config.local.json` is one person's settings for one checkout: never committed, laid over
// the project's `.aof/aof.config.json`, which lies over the machine-wide `~/.aof/aof.config.json`.
// Two people in one repository otherwise share one operator profile, or overwrite each other's.
//
// It holds an ALLOW-LIST of per-person keys and nothing else (199 Q1). A local value for any other
// key would make one person's aof behave unlike a teammate's — discovery switched on locally runs a
// beat the committed commands do not describe — so it is refused, reported, and never loaded. No
// allow-listed key reaches a render, which reads the project's own file only (192/ADR-003).
//
// Everything that knows the file lives here: its name, the allow-list, the filter that splits a
// parsed file into what is honoured and what is refused, the block-by-block layer, and the record of
// which file each per-person value came from. A pure leaf, like `operator-profile.mjs`, whose merge
// and provenance it composes: it reads no file and never throws.
import { describeOperatorProfile, overlayOperatorProfile } from "./operator-profile.mjs";

export const LOCAL_CONFIG_FILE = "aof.config.local.json";
// The paths the local file may hold, each a whole block. Anything else is refused.
export const LOCAL_CONFIG_KEYS = Object.freeze(["work.operator", "work.notify.channels", "work.agents.session.effort"]);

export const LOCAL_KEY_NOT_ALLOWED = "config-local-key-not-allowed";
export const LOCAL_UNREADABLE = "config-local-unreadable";

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

// The value at a dotted path, or undefined.
function valueAt(config, dotted) {
  let value = config;
  for (const key of dotted.split(".")) {
    if (!isPlainObject(value) || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}

// A copy of `config` with `value` at a dotted path, every object on the way copied rather than shared.
function withValueAt(config, dotted, value) {
  const [key, ...rest] = dotted.split(".");
  const base = isPlainObject(config) ? config : {};
  return { ...base, [key]: rest.length === 0 ? value : withValueAt(base[key], rest.join("."), value) };
}

const refusal = (at) => ({
  path: at,
  code: LOCAL_KEY_NOT_ALLOWED,
  message: `${at} is not a per-person key, so .aof/${LOCAL_CONFIG_FILE} cannot hold it: it belongs in the project's .aof/aof.config.json, where it is the same for everyone. The local file holds only ${LOCAL_CONFIG_KEYS.join(", ")}.`,
});

/**
 * Split a parsed local file into `{ allowed, refused }`: `allowed` holds exactly the allow-listed
 * blocks the file sets, and `refused` one `{ path, message, code }` entry per value it may not hold,
 * at the leaf (`work.examples.enabled`, never `work.examples`), so the entry names what was written.
 * A file that is not an object is one `config-local-unreadable` entry. The blocks' own values are
 * not judged here: the validator hands them to each block's validator.
 */
export function filterLocalConfig(raw) {
  if (!isPlainObject(raw)) {
    return { allowed: {}, refused: [{ path: "config", code: LOCAL_UNREADABLE, message: `.aof/${LOCAL_CONFIG_FILE} must be a JSON object.` }] };
  }
  let allowed = {};
  const refused = [];
  const walk = (value, at) => {
    if (LOCAL_CONFIG_KEYS.includes(at)) {
      allowed = withValueAt(allowed, at, structuredClone(value));
      return;
    }
    // An object is descended into, so a refusal names the leaf; an empty one holds nothing to refuse.
    if (isPlainObject(value)) {
      for (const [key, inner] of Object.entries(value)) walk(inner, `${at}.${key}`);
      return;
    }
    refused.push(refusal(at));
  };
  for (const [key, value] of Object.entries(raw)) walk(value, key);
  return { allowed, refused };
}

/**
 * The loaded config with a local file's ALLOWED blocks laid on top, each by the merge it already
 * has: the operator profile through the profile's own merge (`role` wins whole, `expertise` merges
 * per domain); `work.notify.channels` replaced whole, as the project's replace the machine's; and
 * `work.agents.session.effort` merged per phase. A block that is not an object is left for the
 * validator to report and is not laid. In memory only.
 */
export function layerLocalConfig(config, allowed) {
  let layered = overlayOperatorProfile(config, allowed);
  const channels = valueAt(allowed, "work.notify.channels");
  if (isPlainObject(channels)) layered = withValueAt(layered, "work.notify.channels", structuredClone(channels));
  const effort = valueAt(allowed, "work.agents.session.effort");
  if (isPlainObject(effort)) {
    const beneath = valueAt(layered, "work.agents.session.effort");
    layered = withValueAt(layered, "work.agents.session.effort", { ...(isPlainObject(beneath) ? beneath : {}), ...effort });
  }
  return layered;
}

/**
 * Where each per-person value came from, as `{ "<dotted path>": { layer, configPath } }`, `layer`
 * one of `global`, `project` and `local`: the operator's `role` and each `expertise.<domain>`,
 * `work.notify.channels` whole, and each `work.agents.session.effort.<phase>`. Each layer is
 * `{ config, configPath }`, the local one's config being its allowed blocks only. A value no file
 * sets has no entry. Its answers are exactly what `layerLocalConfig` over the loaded config holds.
 */
export function perPersonSources({ global, project, local }) {
  const fileOf = { global: global?.configPath ?? null, project: project?.configPath ?? null, local: local?.configPath ?? null };
  const at = (layer) => (layer == null ? null : { layer, configPath: fileOf[layer] });
  const sources = {};
  const operator = describeOperatorProfile(global?.config ?? {}, project?.config ?? {}, local?.config ?? {});
  if (operator.roleSource != null) sources["work.operator.role"] = at(operator.roleSource);
  for (const entry of operator.expertise) sources[`work.operator.expertise.${entry.domain}`] = at(entry.source);
  // Channels replace whole: the local file's when it sets them, then the project's when its
  // `work.notify` holds the key at all (`{}` switches the machine's off), then the machine's.
  const globalChannels = valueAt(global?.config, "work.notify.channels");
  const channelsLayer = valueAt(local?.config, "work.notify.channels") !== undefined ? "local"
    : valueAt(project?.config, "work.notify.channels") !== undefined ? "project"
      : isPlainObject(globalChannels) && Object.keys(globalChannels).length > 0 ? "global" : null;
  if (channelsLayer != null) sources["work.notify.channels"] = at(channelsLayer);
  // Effort merges per phase, and the machine-wide file is not layered for it.
  const projectEffort = valueAt(project?.config, "work.agents.session.effort");
  const localEffort = valueAt(local?.config, "work.agents.session.effort");
  const phases = new Set([projectEffort, localEffort].flatMap((effort) => (isPlainObject(effort) ? Object.keys(effort) : [])));
  for (const phase of [...phases].sort()) {
    sources[`work.agents.session.effort.${phase}`] = at(isPlainObject(localEffort) && Object.hasOwn(localEffort, phase) ? "local" : "project");
  }
  return sources;
}
