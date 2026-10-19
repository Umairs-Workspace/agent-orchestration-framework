import { CAPABILITIES, CAPABILITY_STATUS, mergeRuntimeOverride } from "../model.mjs";

export const ACD_BUNDLE_CAPABILITIES = {
  ...CAPABILITIES,
  command: {
    ...CAPABILITIES.command,
    codex: CAPABILITY_STATUS.mapped,
    hyperagent: CAPABILITY_STATUS.mapped
  }
};

// The status a mapped member reports when its runtime renders only an authored SUBSET of the
// bundle (`requiresVariant`) and this member carries no variant for it. Not a capability gap —
// the runtime can render the kind — but a deliberate scope: Hyperagent renders the PLANNING
// commands only, and the build/verify procedures stay with the execution runtimes.
export const OUTSIDE_RUNTIME_SUBSET = "outside-runtime-subset";

const RENDERABLE_STATUSES = new Set([CAPABILITY_STATUS.native, CAPABILITY_STATUS.mapped]);

const RESOURCE_MAPPINGS = {
  command: {
    codex: {
      kind: "skill",
      idPrefix: "aof-",
      invocationPrefix: "$aof-",
      sourceInvocationPrefix: "/",
      argumentToken: "$ARGUMENTS"
    },
    // Hyperagent imports skills (SKILL.md) and has no slash commands. Only members that author
    // a `hyperagent` variant are rendered (`requiresVariant`): the variant is a full rewrite of
    // the procedure for an agent that reaches the repository through the GitHub MCP and opens a
    // pull request, rather than running the `aof` CLI in a checkout.
    hyperagent: {
      kind: "skill",
      idPrefix: "aof-",
      invocationPrefix: "aof-",
      sourceInvocationPrefix: "/",
      argumentToken: "$ARGUMENTS",
      requiresVariant: true
    }
  }
};

function capabilityStatus(kind, runtime) {
  return ACD_BUNDLE_CAPABILITIES[kind]?.[runtime];
}

function isRenderable(kind, runtime) {
  return RENDERABLE_STATUSES.has(capabilityStatus(kind, runtime));
}

function mappingFor(kind, runtime) {
  return RESOURCE_MAPPINGS[kind]?.[runtime] ?? null;
}

export function partitionByCapability(resources, runtimes) {
  const installable = [];
  const notInstallable = [];
  for (const resource of resources) {
    const declaredRuntimes = resource.runtimes ?? runtimes;
    const renderRuntimes = [];
    for (const runtime of runtimes) {
      const status = capabilityStatus(resource.kind, runtime) ?? "unknown";
      if (!isRenderable(resource.kind, runtime)) {
        notInstallable.push({
          id: resource.id,
          kind: resource.kind,
          runtime,
          status
        });
        continue;
      }

      const mapping = mappingFor(resource.kind, runtime);
      if (mapping?.requiresVariant && !Object.hasOwn(resource.runtimeVariants ?? {}, runtime)) {
        notInstallable.push({
          id: resource.id,
          kind: resource.kind,
          runtime,
          status: OUTSIDE_RUNTIME_SUBSET
        });
        continue;
      }
      if (mapping) {
        installable.push(mappedResource(resolveBundleVariant(resource, runtime), runtime, mapping));
        continue;
      }

      if (declaredRuntimes.includes(runtime)) {
        if (resource.runtimeVariants || resource.overrides) {
          installable.push({ ...resolveBundleVariant(resource, runtime), runtimes: [runtime] });
        } else renderRuntimes.push(runtime);
      }
    }
    if (renderRuntimes.length > 0) {
      installable.push({ ...resource, runtimes: renderRuntimes });
    }
  }
  return { installable, notInstallable };
}

// Resolve logical identity before the adapter changes a command into a skill.
// Common metadata/body → authored runtime variant → existing project override.
export function resolveBundleVariant(resource, runtime) {
  let resolved = resource;
  if (resource.runtimeVariants) {
    if (!Object.hasOwn(resource.runtimeVariants, runtime)) {
      throw new Error(`Missing bundle variant for ${resource.kind}:${resource.id} (${runtime}).`);
    }
    resolved = mergeRuntimeOverride({ ...resource, overrides: resource.runtimeVariants }, runtime);
  }
  resolved = mergeRuntimeOverride({ ...resolved, overrides: resource.overrides }, runtime);
  return { ...resolved, overrides: undefined, _aofNativeVariant: Boolean(resource.runtimeVariants) };
}

export function installableBundleResources(resources, runtimes) {
  return partitionByCapability(resources, runtimes).installable;
}

function mappedResource(resource, runtime, mapping) {
  const id = `${mapping.idPrefix ?? ""}${resource.id}`;
  return {
    ...resource,
    id,
    kind: mapping.kind,
    name: id,
    runtimes: [runtime],
    body: resource._aofNativeVariant
      ? `${normalizeArgumentHint(resource.argumentHint) ? `Arguments: ${normalizeArgumentHint(resource.argumentHint)}\n\n` : ""}${resource.body}`
      : mappedBody(resource, mapping),
    _aofMappedFrom: { id: resource.id, kind: resource.kind }
  };
}

function mappedBody(resource, mapping) {
  const invocation = `${mapping.invocationPrefix ?? ""}${resource.id}`;
  const hint = normalizeArgumentHint(resource.argumentHint);
  const sourceInvocation = resource.commandNamespace
    ? `${resource.commandNamespace}:${resource.id}`
    : resource.id;
  return [
    `Use this skill when the user asks for \`${invocation}${hint ? ` ${hint}` : ""}\`, or asks to run the AOF \`${sourceInvocation}\` procedure in Codex.`,
    "",
    `Where this procedure mentions \`${mapping.argumentToken}\`, use the text the user supplied after the skill name.`,
    `Where it mentions Claude slash command \`${mapping.sourceInvocationPrefix ?? ""}${sourceInvocation}\`, treat that as this Codex skill invocation.`,
    "",
    resource.body?.trim() ?? "",
    ""
  ].join("\n");
}

function normalizeArgumentHint(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/^['"]|['"]$/g, "");
}
