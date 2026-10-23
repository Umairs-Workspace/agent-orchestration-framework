import { CAPABILITIES, CAPABILITY_STATUS, mergeRuntimeOverride } from "../model.mjs";

export const ACD_BUNDLE_CAPABILITIES = {
  ...CAPABILITIES,
  command: {
    ...CAPABILITIES.command,
    codex: CAPABILITY_STATUS.mapped
  }
};

const RENDERABLE_STATUSES = new Set([CAPABILITY_STATUS.native, CAPABILITY_STATUS.mapped]);

// The one command-to-skill mapping (165/ADR-002). Each runtime's entry carries its own
// preamble wording; `commandAsSkill` puts that preamble in front of the command's body.
// cowork is not a bundle runtime (it has no CAPABILITIES entry, so partitionByCapability
// never reaches it): the aof plugin renders through it directly.
const RESOURCE_MAPPINGS = {
  command: {
    codex: {
      kind: "skill",
      idPrefix: "aof-",
      invocationPrefix: "$aof-",
      sourceInvocationPrefix: "/",
      argumentToken: "$ARGUMENTS",
      preamble: ({ invocation, hint, sourceInvocation, mapping }) => [
        `Use this skill when the user asks for \`${invocation}${hint ? ` ${hint}` : ""}\`, or asks to run the AOF \`${sourceInvocation}\` procedure in Codex.`,
        "",
        `Where this procedure mentions \`${mapping.argumentToken}\`, use the text the user supplied after the skill name.`,
        `Where it mentions Claude slash command \`${mapping.sourceInvocationPrefix ?? ""}${sourceInvocation}\`, treat that as this Codex skill invocation.`
      ]
    },
    cowork: {
      kind: "skill",
      idPrefix: "",
      // The plugin is named `aof`, so a skill's invocation is the command's own
      // `/aof:<id>` and needs no translation line.
      invocationPrefix: "/aof:",
      argumentToken: "$ARGUMENTS",
      preamble: ({ invocation, hint, mapping }) => [
        `Use this skill only when the user invokes \`${invocation}${hint ? ` ${hint}` : ""}\`.`,
        "",
        `Where this procedure mentions \`${mapping.argumentToken}\`, use the text the user supplied after the skill name.`,
        "",
        "The `aof` CLI may be absent here. Before the first `aof` step, run `command -v aof`. If aof is absent, skip each `aof` step and list the skipped steps in your report.",
        "Without aof, never imitate a verb that changes state by hand: never mint a number, never promote, never write a `number:` line and never change a `status:` line by hand. Any driver written without aof stays in the backlog, to be promoted from Claude Code or Codex.",
        "Without aof, a check this procedure says must pass (such as `aof work validate`) cannot run here, and a check that did not run is not a failed one: finish, mark the report unvalidated, name each check you skipped, and say it runs from Claude Code or Codex.",
        "",
        "Write Markdown only, and never commit."
      ]
    }
  }
};

// The mapping a runtime renders a command through, or null when it has none.
export function commandSkillMapping(runtime) {
  return RESOURCE_MAPPINGS.command[runtime] ?? null;
}

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
      : commandAsSkill(resource, mapping),
    _aofMappedFrom: { id: resource.id, kind: resource.kind }
  };
}

// A command's body as a skill body: the mapping's preamble, a blank line, then the
// command's own body (trimmed) unchanged.
export function commandAsSkill(resource, mapping) {
  const invocation = `${mapping.invocationPrefix ?? ""}${resource.id}`;
  const hint = normalizeArgumentHint(resource.argumentHint);
  const sourceInvocation = resource.commandNamespace
    ? `${resource.commandNamespace}:${resource.id}`
    : resource.id;
  return [
    ...mapping.preamble({ invocation, hint, sourceInvocation, mapping }),
    "",
    resource.body?.trim() ?? "",
    ""
  ].join("\n");
}

export function normalizeArgumentHint(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/^['"]|['"]$/g, "");
}
