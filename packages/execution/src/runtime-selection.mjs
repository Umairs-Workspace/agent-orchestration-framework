import { EXECUTION_RUNTIMES, resolveLoopRuntime, loopRuntimeSettingFromConfig } from "@aof/contracts/loop-bounds";
import { EFFORT_LEVELS, SESSION_PHASES, normalizeEffort, resolveSessionLaunch } from "./session-model.mjs";

const own = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const named = value => typeof value === "string" && value.trim().length > 0;
export const EXECUTION_PROFILES = Object.freeze({
  claude: Object.freeze({ transport: "pty", profile: "claude-pty-v1", profileVersion: 1 }),
  codex: Object.freeze({ transport: "app-server-stdio", profile: "codex-app-server-v1", profileVersion: 1 }),
});

function fail(code, path, source, detail) {
  const error = new Error(`${path} (${source}): ${detail}`);
  Object.assign(error, { code, path, source });
  throw error;
}
function closed(value, keys, path, source = "project") {
  if (!object(value)) fail("invalid-runtime-settings", path, source, "must be an object");
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) fail("invalid-runtime-settings", `${path}.${key}`, source, "unknown setting");
  }
}

export function validateRuntimeSettings(config, { roles = null } = {}) {
  const agents = config?.work?.agents;
  const configuredRuntime = loopRuntimeSettingFromConfig({ config });
  if (configuredRuntime.present && resolveLoopRuntime(configuredRuntime.value) === null) {
    fail("unsupported-runtime", "work.loop.runtime", "project", "expected claude or codex");
  }
  if (!own(agents, "runtimes")) return;
  const root = "work.agents.runtimes";
  closed(agents.runtimes, EXECUTION_RUNTIMES, root);
  for (const [runtime, settings] of Object.entries(agents.runtimes)) {
    const base = `${root}.${runtime}`;
    closed(settings, ["session", "models", "effort"], base);
    if (own(settings, "session")) {
      closed(settings.session, ["models", "effort"], `${base}.session`);
      for (const [part, map] of Object.entries(settings.session)) {
        closed(map, SESSION_PHASES, `${base}.session.${part}`);
        for (const [phase, value] of Object.entries(map)) {
          if (!named(value)) fail("invalid-runtime-settings", `${base}.session.${part}.${phase}`, "project", "must be a non-empty string");
        }
      }
    }
    for (const part of ["models", "effort"]) {
      if (!own(settings, part)) continue;
      if (!object(settings[part])) fail("invalid-runtime-settings", `${base}.${part}`, "project", "must be a role map");
      for (const [role, value] of Object.entries(settings[part])) {
        if (roles !== null && !roles.includes(role)) fail("invalid-runtime-settings", `${base}.${part}.${role}`, "project", "unknown AOF role");
        if (!named(value)) fail("invalid-runtime-settings", `${base}.${part}.${role}`, "project", "must be a non-empty string");
      }
    }
  }
}

export function resolveExecution(config, { runtime: flagged, choices = {}, capabilities = {}, roles = null, allowUnproven = false } = {}) {
  validateRuntimeSettings(config, { roles });
  closed(choices, SESSION_PHASES, "choices", "flag");
  for (const [phase, choice] of Object.entries(choices)) {
    closed(choice, ["model", "modelFlag", "effort", "effortFlag"], `choices.${phase}`, "flag");
    for (const part of ["model", "effort"]) if (own(choice, part) && !named(choice[part])) fail(`unsupported-${part}`, choice[`${part}Flag`] ?? `choices.${phase}.${part}`, "flag", "must be a non-empty choice");
  }
  const configuredRuntime = loopRuntimeSettingFromConfig({ config });
  const project = configuredRuntime.value;
  const runtime = resolveLoopRuntime(flagged === undefined ? project : flagged);
  const runtimeSource = flagged !== undefined ? "flag" : configuredRuntime.present ? "project" : "default";
  if (runtime === null) fail("unsupported-runtime", flagged !== undefined ? "--runtime" : "work.loop.runtime", runtimeSource, "expected claude or codex");
  const agents = config?.work?.agents ?? {};
  const scoped = agents.runtimes?.[runtime] ?? {};
  const legacy = runtime === "claude" ? agents.session ?? {} : {};
  const session = Object.fromEntries(["models", "effort"].map(part => [part, { ...(legacy[part] ?? {}), ...(scoped.session?.[part] ?? {}) }]));
  const catalog = capabilities[runtime]?.models;
  if (catalog !== undefined && (!Array.isArray(catalog) || catalog.some(model => !object(model) || !named(model.id) || !named(model.model) || !Array.isArray(model.supportedReasoningEfforts) || model.supportedReasoningEfforts.some(value => !named(typeof value === "string" ? value : value?.reasoningEffort))))) {
    fail("invalid-runtime-capabilities", `execution.${runtime}.models`, "native", "malformed native model catalog");
  }
  const proven = Array.isArray(catalog) && catalog.length > 0;
  const unprovenEfforts = runtime === "codex" && !proven && allowUnproven
    ? [...Object.values(session.effort ?? {}), ...Object.values(scoped.effort ?? {}), ...Object.values(choices).map(choice => choice.effort)].filter(named) : [];
  const levels = [...new Set([...EFFORT_LEVELS, ...unprovenEfforts, ...(catalog ?? []).flatMap(model => model.supportedReasoningEfforts?.map(value => typeof value === "string" ? value : value.reasoningEffort) ?? [])])];
  const diagnostics = [];
  if (runtime === "codex" && !proven) {
    if (!allowUnproven) fail("runtime-capabilities-unavailable", "execution.codex.models", runtimeSource, "native model capabilities are required before launch");
    diagnostics.push({ code: "runtime-capabilities-unavailable", path: "execution.codex.models", source: runtimeSource, message: "Native model capabilities are unproven; no launch compatibility is claimed." });
  }
  function compatible(entry, modelPath, effortPath) {
    const rawEffort = entry.effort;
    if (rawEffort !== null) {
      const canonical = normalizeEffort(rawEffort, { levels });
      if (canonical === null) fail("unsupported-effort", effortPath, entry.effortSource, `unsupported effort ${rawEffort}`);
      entry.effort = canonical;
    }
    if (!proven) return entry;
    const defaults = catalog.filter(value => value.isDefault === true);
    if (entry.model === null && defaults.length > 1) fail("invalid-runtime-capabilities", modelPath, "native", "native default model is ambiguous");
    const model = entry.model === null ? defaults[0] : catalog.find(value => value.id === entry.model || value.model === entry.model);
    if (!model) fail("unsupported-model", modelPath, entry.modelSource ?? "runtime-default", "model is not advertised by the selected runtime");
    const supported = model.supportedReasoningEfforts?.map(value => typeof value === "string" ? value : value.reasoningEffort) ?? [];
    if (entry.effort !== null && !supported.includes(entry.effort)) fail("unsupported-effort", effortPath, entry.effortSource, `effort is not advertised for ${model.model}`);
    if (entry.model === null) entry.modelSource = "runtime-default";
    entry.model = model.model;
    return entry;
  }
  const phases = Object.fromEntries(SESSION_PHASES.map(phase => {
    const entry = resolveSessionLaunch({ work: { agents: { session } } }, phase, { choice: choices[phase], effortLevels: levels });
    const modelPath = own(scoped.session?.models, phase) ? `work.agents.runtimes.${runtime}.session.models.${phase}` : `work.agents.session.models.${phase}`;
    const effortPath = own(scoped.session?.effort, phase) ? `work.agents.runtimes.${runtime}.session.effort.${phase}` : `work.agents.session.effort.${phase}`;
    if (entry.modelSource === "config") entry.modelSource = modelPath;
    if (entry.effortSource === "config") entry.effortSource = effortPath;
    // A scoped value must never disappear into the legacy resolver's tolerant fallback.
    const raw = choices[phase]?.effort ?? session.effort?.[phase];
    if (raw !== undefined && (choices[phase]?.effort !== undefined || own(scoped.session?.effort, phase)) && normalizeEffort(raw, { levels }) === null) {
      fail("unsupported-effort", choices[phase]?.effortFlag ?? effortPath, choices[phase]?.effortFlag ?? effortPath, `unsupported effort ${raw}`);
    }
    return [phase, compatible({ model: entry.model ?? null, modelSource: entry.modelSource ?? null, effort: entry.effort, effortSource: entry.effortSource }, choices[phase]?.modelFlag ?? modelPath, choices[phase]?.effortFlag ?? effortPath)];
  }));
  const legacyRoles = runtime === "claude" ? agents : {};
  const roleModels = { ...(legacyRoles.models ?? {}), ...(scoped.models ?? {}) };
  const roleEffort = { ...(legacyRoles.effort ?? {}), ...(scoped.effort ?? {}) };
  const roleKeys = [...new Set([...(roles ?? []), ...Object.keys(roleModels), ...Object.keys(roleEffort)])];
  const resolvedRoles = Object.fromEntries(roleKeys.map(role => {
    const modelPath = own(scoped.models, role) ? `work.agents.runtimes.${runtime}.models.${role}` : `work.agents.models.${role}`;
    const effortPath = own(scoped.effort, role) ? `work.agents.runtimes.${runtime}.effort.${role}` : `work.agents.effort.${role}`;
    const entry = { model: roleModels[role] ?? null, modelSource: roleModels[role] ? modelPath : "inherit-session", effort: roleEffort[role] ?? null, effortSource: roleEffort[role] ? effortPath : "inherit-session" };
    // Check inheritance against every resolved phase rather than guessing one phase.
    if (entry.model !== null || entry.effort !== null) {
      for (const phase of Object.values(phases)) {
        const checked = compatible({ ...entry, model: entry.model ?? phase.model, effort: entry.effort ?? phase.effort }, modelPath, effortPath);
        if (entry.model !== null) entry.model = checked.model;
      }
      if (entry.effort !== null) entry.effort = normalizeEffort(entry.effort, { levels });
    }
    return [role, entry];
  }));
  return { version: 1, runtime, runtimeSource, ...EXECUTION_PROFILES[runtime], phases, roles: resolvedRoles,
    ...(diagnostics.length ? { unproven: true, diagnostics } : {}) };
}

export function inspectExecution(config, options = {}) {
  try { return { execution: resolveExecution(config, { ...options, allowUnproven: true }), diagnostics: [] }; }
  catch (error) { return { execution: null, diagnostics: [{ code: error.code, path: error.path, source: error.source, message: error.message }] }; }
}

export function validateExecutionEnvelope(value) {
  const invalid = (path, message) => fail("invalid-record", `execution.${path}`, "recorded", message);
  if (!object(value)) invalid("", "must be a versioned execution envelope");
  const keys = ["version", "runtime", "runtimeSource", "transport", "profile", "profileVersion", "phases", "roles"];
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !own(value, key))) invalid("", "missing or unknown envelope field");
  if (value.version !== 1 || !EXECUTION_RUNTIMES.includes(value.runtime)) invalid("version", "unknown execution version or runtime");
  const expected = EXECUTION_PROFILES[value.runtime];
  if (value.profile !== expected.profile || value.profileVersion !== expected.profileVersion || value.transport !== expected.transport) {
    fail("unsupported-profile", "execution.profile", "recorded", "unsupported runtime transport/profile");
  }
  if (!["flag", "project", "default"].includes(value.runtimeSource)) invalid("runtimeSource", "unknown provenance");
  if (!object(value.phases) || Object.keys(value.phases).length !== SESSION_PHASES.length || SESSION_PHASES.some(phase => !own(value.phases, phase))) invalid("phases", "all three phases are required");
  if (!object(value.roles)) invalid("roles", "must be a role map");
  for (const [path, entry] of [...Object.entries(value.phases).map(([key, entry]) => [`phases.${key}`, entry]), ...Object.entries(value.roles).map(([key, entry]) => [`roles.${key}`, entry])]) {
    const role = path.startsWith("roles.");
    if (!object(entry) || Object.keys(entry).length !== 4 || !["model", "modelSource", "effort", "effortSource"].every(key => own(entry, key))) invalid(path, "invalid resolved entry");
    if (entry.model !== null && !named(entry.model)) invalid(`${path}.model`, "invalid model");
    if (!role && value.runtime === "codex" && entry.model === null) invalid(`${path}.model`, "Codex requires a resolved native model");
    if (entry.modelSource !== null && !named(entry.modelSource)) invalid(`${path}.modelSource`, "invalid provenance");
    if (entry.model !== null && entry.modelSource === null) invalid(`${path}.modelSource`, "a chosen model requires provenance");
    if (!(role && entry.effort === null) && !named(entry.effort)) invalid(`${path}.effort`, "invalid effort");
    if (!named(entry.effortSource)) invalid(`${path}.effortSource`, "invalid provenance");
  }
  return structuredClone(value);
}

export function resolveExecutionResume(record, { runtime, choices = {}, execution } = {}) {
  if (!own(record, "execution")) {
    if (runtime !== undefined && runtime !== "claude") fail("execution-resume-conflict", "--runtime", "flag", "legacy records resume on Claude; start a fresh run to change runtime");
    if (execution !== undefined) fail("execution-resume-conflict", "execution", "flag", "legacy record has no execution envelope to replace");
    return null;
  }
  const pinned = validateExecutionEnvelope(record.execution);
  if (runtime !== undefined && runtime !== pinned.runtime) fail("execution-resume-conflict", "--runtime", "flag", "runtime differs from the recorded choice");
  for (const [phase, choice] of Object.entries(choices)) {
    if (!SESSION_PHASES.includes(phase)) fail("execution-resume-conflict", `choices.${phase}`, "flag", "unknown phase");
    for (const part of ["model", "effort"]) {
      if (choice[part] !== undefined && choice[part] !== pinned.phases[phase][part]) fail("execution-resume-conflict", choice[`${part}Flag`] ?? `choices.${phase}.${part}`, "flag", "choice differs from the recorded value");
    }
  }
  if (execution !== undefined && JSON.stringify(validateExecutionEnvelope(execution)) !== JSON.stringify(pinned)) fail("execution-resume-conflict", "execution", "flag", "recorded envelope cannot be replaced on resume");
  return pinned;
}
