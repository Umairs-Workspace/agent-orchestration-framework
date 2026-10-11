import os from "node:os";
import path from "node:path";

export const RUNTIMES = {
  claude: {
    id: "claude",
    name: "Claude Code",
    localRoot: ".claude",
    globalRoot: path.join(os.homedir(), ".claude"),
    commandPrefix: "/"
  },
  codex: {
    id: "codex",
    name: "Codex",
    localRoot: ".codex",
    globalRoot: path.join(os.homedir(), ".codex"),
    assetRoots: { skill: ".agents", agent: ".codex", rule: "." },
    globalAssetRoots: { skill: path.join(os.homedir(), ".agents") },
    commandPrefix: "$"
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    localRoot: ".opencode",
    globalRoot: path.join(os.homedir(), ".config", "opencode"),
    commandPrefix: "/"
  }
};

export const RESOURCE_KINDS = {
  skill: {
    id: "skill",
    plural: "skills",
    defaultBodyFile: "SKILL.md"
  },
  command: {
    id: "command",
    plural: "commands",
    defaultBodyFile: "COMMAND.md"
  },
  agent: {
    id: "agent",
    plural: "agents",
    defaultBodyFile: "AGENT.md"
  },
  rule: {
    id: "rule",
    plural: "rules",
    defaultBodyFile: "RULE.md"
  }
};

export const WORKFLOW_KIND = {
  id: "workflow",
  plural: "workflows",
  defaultBodyFile: "WORKFLOW.md"
};

export const CAPABILITY_STATUS = {
  native: "native",
  mapped: "mapped",
  unsupportedWarning: "unsupported-warning",
  unsupportedFail: "unsupported-fail",
  future: "future"
};

export const CAPABILITIES = {
  skill: {
    claude: CAPABILITY_STATUS.native,
    codex: CAPABILITY_STATUS.native,
    opencode: CAPABILITY_STATUS.native
  },
  command: {
    claude: CAPABILITY_STATUS.native,
    codex: CAPABILITY_STATUS.unsupportedFail,
    opencode: CAPABILITY_STATUS.native
  },
  agent: {
    claude: CAPABILITY_STATUS.native,
    codex: CAPABILITY_STATUS.native,
    opencode: CAPABILITY_STATUS.native
  },
  rule: {
    claude: CAPABILITY_STATUS.native,
    codex: CAPABILITY_STATUS.mapped,
    opencode: CAPABILITY_STATUS.native
  },
  pathScopedRule: {
    claude: CAPABILITY_STATUS.native,
    codex: CAPABILITY_STATUS.mapped,
    opencode: CAPABILITY_STATUS.mapped
  },
  codexExecutionPolicyRule: {
    claude: CAPABILITY_STATUS.unsupportedFail,
    codex: CAPABILITY_STATUS.future,
    opencode: CAPABILITY_STATUS.unsupportedFail
  }
};

export const MCP_TRANSPORTS = {
  stdio: "stdio",
  http: "http",
  sse: "sse"
};

export const HOOK_EVENTS = {
  PreToolUse: "PreToolUse",
  PostToolUse: "PostToolUse",
  Notification: "Notification",
  Stop: "Stop",
  SubagentStop: "SubagentStop",
  UserPromptSubmit: "UserPromptSubmit",
  SessionStart: "SessionStart",
  SessionEnd: "SessionEnd",
  PreCompact: "PreCompact"
};

export const HOOK_TYPES = {
  command: "command"
};

export const PROJECT_DOC_TARGETS = {
  agents: "AGENTS.md",
  claude: "CLAUDE.md"
};

export const TRUST_MODES = {
  readOnly: "read-only",
  workspace: "workspace",
  full: "full"
};

export const IDENTITY_FIELDS = new Set(["id", "kind"]);

export function supportedRuntimes() {
  return Object.keys(RUNTIMES);
}

// Native discovery roots are per asset kind; runtime configuration keeps its own root.
export function runtimeAssetRoot(runtime, kind, { global = false } = {}) {
  const adapter = RUNTIMES[runtime];
  if (!adapter) throw new Error(`Unsupported runtime "${runtime}".`);
  return global ? adapter.globalAssetRoots?.[kind] ?? adapter.globalRoot
    : adapter.assetRoots?.[kind] ?? adapter.localRoot;
}

// Claude aliases are not native Codex model ids. Omission means native inheritance,
// with the capability gap reported by the warning collector, never an alias translation.
export function codexAgentModel(model) {
  return ["opus", "sonnet", "haiku", "inherit"].includes(model) ? undefined : model;
}

export function codexGuidanceScope(paths = []) {
  if (!Array.isArray(paths)) return { path: null, unsafe: true, advisory: false };
  const scopes = paths.map(scope => typeof scope === "string" ? scope.replaceAll("\\", "/").trim() : "");
  const unsafe = scopes.some(scope => !scope || /[\x00-\x1f\x7f:]/u.test(scope)
    || scope.startsWith("/") || scope.split("/").includes(".."));
  if (unsafe) return { path: null, unsafe: true, advisory: false };
  const advisory = scopes.length > 1 || scopes.some(scope => /[*?[\]{}]/u.test(scope));
  const directory = !advisory && scopes.length ? path.posix.normalize(scopes[0]) : ".";
  return { path: path.posix.join(directory, "AGENTS.md"), unsafe: false, advisory };
}

export function supportedResourceKinds() {
  return Object.keys(RESOURCE_KINDS);
}

export function supportedGlobalRefKinds() {
  return [...supportedResourceKinds().filter((kind) => kind !== "command"), WORKFLOW_KIND.id];
}

export function supportedMcpTransports() {
  return Object.values(MCP_TRANSPORTS);
}

export function supportedHookEvents() {
  return Object.values(HOOK_EVENTS);
}

export function supportedHookTypes() {
  return Object.values(HOOK_TYPES);
}

export function supportedProjectDocTargets() {
  return Object.values(PROJECT_DOC_TARGETS);
}

export function supportedTrustModes() {
  return Object.values(TRUST_MODES);
}

export function defaultBodyFile(kind) {
  const definition = RESOURCE_KINDS[kind];
  if (!definition) {
    throw new Error(`Invalid resource kind "${kind}". Expected ${supportedResourceKinds().join(", ")}.`);
  }
  return definition.defaultBodyFile;
}

export function defaultWorkflowBodyFile() {
  return WORKFLOW_KIND.defaultBodyFile;
}

// One override-file resolver for DSL assets and bundled project customizations.
// The existing JSON reader is lent by the caller; this model owns no filesystem.
export async function resolveResourceOverrides(resource, baseDir, readJson) {
  const overrides = {};
  const configured = resource.overrides ?? {};
  for (const runtime of supportedRuntimes()) {
    const value = configured[runtime];
    if (typeof value === "string") {
      overrides[runtime] = await readJson(path.resolve(baseDir, value));
    } else if (value && typeof value === "object") {
      overrides[runtime] = value;
    } else if (resource.path) {
      const overridePath = path.resolve(baseDir, path.dirname(resource.path), "overrides", `${runtime}.json`);
      try { overrides[runtime] = await readJson(overridePath); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
  return overrides;
}

export function mergeRuntimeOverride(resource, runtime) {
  const override = resource.overrides?.[runtime];
  if (!override) return resource;
  if (typeof override !== "object" || Array.isArray(override)) {
    throw new Error(`Runtime override for "${resource.id}" (${runtime}) must be a resolved object.`);
  }

  for (const field of IDENTITY_FIELDS) {
    if (Object.hasOwn(override, field) && override[field] !== resource[field]) {
      throw new Error(`Runtime override for "${resource.id}" cannot change identity field "${field}".`);
    }
  }

  const merged = {
    ...resource,
    ...override,
    id: resource.id,
    kind: resource.kind,
    runtimes: resource.runtimes,
    overrides: resource.overrides
  };

  if (Object.hasOwn(override, "body") || Object.hasOwn(override, "prompt") || Object.hasOwn(override, "instructions")) {
    merged.body = override.body ?? override.prompt ?? override.instructions ?? "";
  }

  return merged;
}
