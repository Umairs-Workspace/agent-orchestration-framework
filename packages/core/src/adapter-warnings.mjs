import path from "node:path";
import { RUNTIMES, supportedRuntimes, mergeRuntimeOverride, codexGuidanceScope, codexAgentModel } from "./model.mjs";
import { targetForProjectDocRuntime } from "./runtime-config.mjs";

export const ADAPTER_WARNING_CODES = {
  unsupportedRuntimeFeature: "adapter.unsupported-runtime-feature",
  skippedRuntimeOutput: "adapter.skipped-runtime-output",
  lossyRuntimeMapping: "adapter.lossy-runtime-mapping"
};

const RUNTIME_EXTENSION_KEYS = new Set(supportedRuntimes());
const COMMON_HOOK_FIELDS = new Set(["id", "event", "type", "command", "matcher", "runtimes", ...RUNTIME_EXTENSION_KEYS]);
const NEUTRAL_SETTING_FIELDS = new Set(["model", "trust", "autoCompact"]);

export function collectAdapterWarnings(config, options = {}) {
  if (!config || typeof config !== "object") return [];
  const requestedRuntimes = normalizeRequestedRuntimes(options.runtimes);
  const warnings = [
    ...hookWarnings(config.hooks ?? [], requestedRuntimes),
    ...projectDocWarnings(config.projectDocs ?? [], requestedRuntimes),
    ...settingsWarnings(config.settings ?? {}, requestedRuntimes),
    ...resourceWarnings(config.resources ?? [], requestedRuntimes, options),
    ...(config.packages ?? []).flatMap((pkg, index) => resourceWarnings(
      (pkg.resources ?? []).map(resource => ({ ...resource, id: `${pkg.namespace}-${resource.id}` })),
      requestedRuntimes, options, `packages[${index}].resources`))
  ];
  return sortAdapterWarnings(warnings);
}

export function sortAdapterWarnings(warnings) {
  return [...warnings].sort((a, b) => (
    String(a.path).localeCompare(String(b.path))
    || String(a.runtime).localeCompare(String(b.runtime))
    || String(a.code).localeCompare(String(b.code))
    || String(a.id).localeCompare(String(b.id))
  ));
}

export function hasUnsupportedCommonHookFields(hook) {
  return unsupportedCommonHookFields(hook).length > 0;
}

function hookWarnings(hooks, requestedRuntimes) {
  const warnings = [];
  for (const [index, hook] of hooks.entries()) {
    const unsupportedFields = unsupportedCommonHookFields(hook);
    if (unsupportedFields.length === 0) continue;

    for (const runtime of selectedPrimitiveRuntimes(hook, requestedRuntimes)) {
      warnings.push(adapterWarning({
        code: ADAPTER_WARNING_CODES.skippedRuntimeOutput,
        path: `hooks[${index}]`,
        kind: "hook",
        id: hook.id,
        runtime,
        generatedPath: runtimeHookPath(runtime),
        reason: `Common hook field(s) ${unsupportedFields.map((field) => `"${field}"`).join(", ")} cannot be represented directly by the ${runtime} adapter.`,
        remediation: `Move runtime-specific hook fields under "${runtime}" or remove "${runtime}" from this hook's runtimes.`
      }));
    }
  }
  return warnings;
}

function projectDocWarnings(projectDocs, requestedRuntimes) {
  const warnings = [];
  for (const [index, doc] of projectDocs.entries()) {
    for (const runtime of selectedPrimitiveRuntimes(doc, requestedRuntimes)) {
      const target = targetForProjectDocRuntime(runtime);
      if (!target || doc.targets.includes(target)) continue;

      warnings.push(adapterWarning({
        code: ADAPTER_WARNING_CODES.skippedRuntimeOutput,
        path: `projectDocs[${index}].targets`,
        kind: "project-doc",
        id: doc.id,
        runtime,
        generatedPath: target,
        reason: `${runtime} project docs render to ${target}, but this project doc only targets ${doc.targets.join(", ")}.`,
        remediation: `Add "${target}" to this project doc's targets or remove "${runtime}" from its runtimes.`
      }));
    }
  }
  return warnings;
}

function settingsWarnings(settings, requestedRuntimes) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return [];
  const warnings = [];

  for (const field of Object.keys(settings).filter((key) => NEUTRAL_SETTING_FIELDS.has(key))) {
    for (const runtime of requestedRuntimes) {
      warnings.push(adapterWarning({
        code: ADAPTER_WARNING_CODES.unsupportedRuntimeFeature,
        path: `settings.${field}`,
        kind: "settings",
        id: field,
        runtime,
        generatedPath: runtimeSettingsPath(runtime),
        reason: `Vendor-neutral setting "${field}" has no safe direct ${runtime} mapping.`,
        remediation: `Move "${field}" under "settings.${runtime}" using the runtime-native option name, or remove it from top-level settings.`
      }));
    }
  }

  return warnings;
}

function resourceWarnings(resources, requestedRuntimes, options, prefix = "resources") {
  const warnings = [];
  for (const [index, source] of resources.entries()) {
    for (const runtime of selectedPrimitiveRuntimes(source, requestedRuntimes)) {
      const resource = mergeRuntimeOverride(source, runtime);
      if (resource.kind === "rule" && runtime === "codex") {
        const scope = codexGuidanceScope(resource.paths);
        if (scope.unsafe || scope.advisory) warnings.push(adapterWarning({
          code: scope.unsafe ? ADAPTER_WARNING_CODES.skippedRuntimeOutput : ADAPTER_WARNING_CODES.lossyRuntimeMapping,
          path: `${prefix}[${index}].paths`, kind: "rule", id: resource.id, runtime,
          generatedPath: scope.path,
          reason: scope.unsafe ? "Unsafe Codex guidance scope refused; no output is planned."
            : "Codex glob enforcement unavailable: path selectors are advisory conditions in root AGENTS.md.",
          remediation: "Use one safe project-relative directory for native scoped guidance."
        }));
      }
      if (resource.kind !== "agent" || runtime !== "codex") continue;
      if (resource.model && resource.model !== "inherit" && codexAgentModel(resource.model) === undefined) {
        warnings.push(adapterWarning({
          code: ADAPTER_WARNING_CODES.lossyRuntimeMapping, path: `${prefix}[${index}].model`,
          kind: "agent", id: resource.id, runtime, generatedPath: generatedResourcePath(resource, runtime, options),
          reason: "Claude model alias is omitted because it is not a native Codex model id; the agent inherits its native session model.",
          remediation: "Set overrides.codex.model to a native Codex model id. No alias translation is performed."
        }));
      }
      if (Array.isArray(resource.tools) && resource.tools.length > 0) {
        warnings.push(adapterWarning({
          code: ADAPTER_WARNING_CODES.lossyRuntimeMapping,
          path: `${prefix}[${index}].tools`,
          kind: "agent",
          id: resource.id,
          runtime,
          generatedPath: generatedResourcePath(resource, runtime, options),
          reason: "Claude tool allow-list is omitted because Codex agent files do not use Claude Code tools frontmatter; this restriction is not enforced.",
          remediation: "Move tool restrictions to a Codex-native configuration surface if one is available, or remove them from Codex-targeted agent resources."
        }));
      }
    }
  }
  return warnings;
}

export function adapterWarning({ code, path: pathName, kind, id, runtime, generatedPath = null, reason, remediation }) {
  return {
    code,
    severity: "warning",
    path: pathName,
    kind,
    id,
    runtime,
    generatedPath,
    reason,
    remediation
  };
}

function unsupportedCommonHookFields(hook) {
  return Object.keys(hook ?? {}).filter((field) => !COMMON_HOOK_FIELDS.has(field));
}

function selectedPrimitiveRuntimes(value, requestedRuntimes) {
  const primitiveRuntimes = Array.isArray(value.runtimes) ? value.runtimes : supportedRuntimes();
  const requested = new Set(requestedRuntimes);
  return primitiveRuntimes.filter((runtime) => requested.has(runtime));
}

function normalizeRequestedRuntimes(runtimes) {
  if (!Array.isArray(runtimes) || runtimes.length === 0) return supportedRuntimes();
  const valid = new Set(supportedRuntimes());
  return [...new Set(runtimes)].filter((runtime) => valid.has(runtime));
}

function runtimeHookPath(runtime) {
  if (runtime === "claude") return portablePath(".claude", "settings.json");
  if (runtime === "codex") return portablePath(".codex", "hooks.json");
  return null;
}

function runtimeSettingsPath(runtime) {
  if (runtime === "claude") return portablePath(".claude", "settings.json");
  if (runtime === "codex") return portablePath(".codex", "config.toml");
  return null;
}

function generatedResourcePath(resource, runtime, options = {}) {
  const adapter = RUNTIMES[runtime];
  if (!adapter) return null;
  const root = options.global ? adapter.globalRoot : adapter.localRoot;
  if (resource.kind === "agent") return portablePath(root, "agents", `${resource.id}.${runtime === "codex" ? "toml" : "md"}`);
  return null;
}

function portablePath(...parts) {
  return path.join(...parts).replaceAll(path.sep, "/");
}
