// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshDesktopPreflightCommands } from "@aof/mesh/commands/desktop-preflight";
import { readBuildInfo } from "../../../../build-info.mjs";
import { readSidecar } from "@aof/mesh/node-identity";
import { AOF_HOOK_MARKER, CLAUDE_SETTINGS_RELPATH, claudeHookDeclarations, claudeSettingsPath } from "../../../../claude-settings.mjs";

export function assembleCommandsMeshDesktopPreflight({ meshPresenceServices, workspaceServices, meshTerminalRelayBridgeServices, meshRegistryServices }) {
  // Core composition for mesh-owned commands.

  const { resolveNodeWorkspaces } = meshPresenceServices;

  const { globalMeshPaths } = workspaceServices;
  const { workspacePaths } = workspaceServices;
  // 191/ADR-001 amendment 2026-11-14 §5 — `control-relay-loopback` reads the one relay derivation
  // and the one nomination predicate.
  const { loopbackRelayUrl } = meshTerminalRelayBridgeServices;
  const { isControlNode } = meshRegistryServices;

  const { PREFLIGHT_CHECKS, HEARTBEAT_HOOK_ID, defaultRunner, PREFLIGHT_SEAMS, preflightSeams, runPreflight, renderPreflight } = createMeshDesktopPreflightCommands({ readBuildInfo, resolveNodeWorkspaces, readSidecar, globalMeshPaths, workspacePaths, AOF_HOOK_MARKER, CLAUDE_SETTINGS_RELPATH, claudeHookDeclarations, claudeSettingsPath, loopbackRelayUrl, isControlNode });

  return { PREFLIGHT_CHECKS, HEARTBEAT_HOOK_ID, defaultRunner, PREFLIGHT_SEAMS, preflightSeams, runPreflight, renderPreflight };
}
