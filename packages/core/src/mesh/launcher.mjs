// Compatibility entry; construction belongs to core application assembly.
import { meshLauncher } from "../application/default.mjs";
export const {
  createResolveWorkspaceCloneUrl,
  resolveGithubAppPrivateKey,
  createResolveWorkspaceAppIdentity,
  assembleActiveRunsAndSubsumedWorkspaces,
  launcherProbe,
  startLauncher,
} = meshLauncher;
