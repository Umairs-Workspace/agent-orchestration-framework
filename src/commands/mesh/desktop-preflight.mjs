// Transitional core composition for mesh-owned commands.
import { createMeshDesktopPreflightCommands } from "@aof/mesh/commands/desktop-preflight";
import { readBuildInfo } from "../../build-info.mjs";
import { resolveNodeWorkspaces } from "../../mesh/presence.mjs";
import { readSidecar } from "@aof/mesh/node-identity";
import { globalMeshPaths, workspacePaths } from "../../workspace.mjs";
import { AOF_HOOK_MARKER, CLAUDE_SETTINGS_RELPATH, claudeHookDeclarations, claudeSettingsPath } from "../../claude-settings.mjs";

export const { PREFLIGHT_CHECKS, HEARTBEAT_HOOK_ID, defaultRunner, PREFLIGHT_SEAMS, preflightSeams, runPreflight, renderPreflight } = createMeshDesktopPreflightCommands({ readBuildInfo, resolveNodeWorkspaces, readSidecar, globalMeshPaths, workspacePaths, AOF_HOOK_MARKER, CLAUDE_SETTINGS_RELPATH, claudeHookDeclarations, claudeSettingsPath });
