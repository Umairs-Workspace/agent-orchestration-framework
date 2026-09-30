// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshContribution } from "@aof/mesh/commands";

export function assembleCommandsMeshContribution({ commandsMeshIdentityServices, commandsMeshHeartbeatServices, commandsMeshRelayServices, commandsMeshInviteServices, commandsMeshJoinServices, commandsMeshRevokeServices, commandsMeshServeServices, commandsMeshLogsServices, commandsMeshTerminalResumeServices, commandsMeshAssignServices, commandsMeshRecoverPushServices, commandsMeshRepoServices, commandsMeshUiServices, commandsMeshDesktopServices }) {
  // Core composition for mesh-owned commands.

  const { meshIdentityCommand } = commandsMeshIdentityServices;
  const { meshStatusCommand } = commandsMeshIdentityServices;
  const { meshHeartbeatCommand } = commandsMeshHeartbeatServices;
  const { meshRelayCommand } = commandsMeshRelayServices;
  const { meshInviteCommand } = commandsMeshInviteServices;
  const { meshJoinCommand } = commandsMeshJoinServices;
  const { meshRevokeCommand } = commandsMeshRevokeServices;
  const { meshServeCommand } = commandsMeshServeServices;
  const { meshLogsCommand } = commandsMeshLogsServices;
  const { meshTerminalResumeCommand } = commandsMeshTerminalResumeServices;
  const { meshAssignCommand } = commandsMeshAssignServices;
  const { meshRecoverPushCommand } = commandsMeshRecoverPushServices;
  const { meshRepoPublishCommand } = commandsMeshRepoServices;
  const { meshUiCommand } = commandsMeshUiServices;
  const { meshDesktopInstallCommand } = commandsMeshDesktopServices;
  const { meshDesktopRunCommand } = commandsMeshDesktopServices;
  const { meshDesktopStopCommand } = commandsMeshDesktopServices;

  const { meshContribution } = createMeshContribution({ meshIdentityCommand, meshStatusCommand, meshHeartbeatCommand, meshRelayCommand, meshInviteCommand, meshJoinCommand, meshRevokeCommand, meshServeCommand, meshLogsCommand, meshTerminalResumeCommand, meshAssignCommand, meshRecoverPushCommand, meshRepoPublishCommand, meshUiCommand, meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand });

  return { meshContribution };
}
