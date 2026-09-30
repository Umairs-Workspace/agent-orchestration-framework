// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshDesktopPreflightCommands } from "@aof/mesh/commands/desktop-preflight";
import { readBuildInfo } from "../../../../build-info.mjs";
import { readSidecar } from "@aof/mesh/node-identity";
import { AOF_HOOK_MARKER, CLAUDE_SETTINGS_RELPATH, claudeHookDeclarations, claudeSettingsPath } from "../../../../claude-settings.mjs";

export function assembleCommandsMeshDesktopPreflight({ meshPresenceServices, workspaceServices }) {
  // Core composition for mesh-owned commands.

  const { resolveNodeWorkspaces } = meshPresenceServices;

  const { globalMeshPaths } = workspaceServices;
  const { workspacePaths } = workspaceServices;

  const { PREFLIGHT_CHECKS, HEARTBEAT_HOOK_ID, defaultRunner, PREFLIGHT_SEAMS, preflightSeams, runPreflight, renderPreflight } = createMeshDesktopPreflightCommands({ readBuildInfo, resolveNodeWorkspaces, readSidecar, globalMeshPaths, workspacePaths, AOF_HOOK_MARKER, CLAUDE_SETTINGS_RELPATH, claudeHookDeclarations, claudeSettingsPath });

  return { PREFLIGHT_CHECKS, HEARTBEAT_HOOK_ID, defaultRunner, PREFLIGHT_SEAMS, preflightSeams, runPreflight, renderPreflight };
}
