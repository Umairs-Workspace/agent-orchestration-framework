


// Core supplies configured services; constructing command definitions performs no I/O.
export function createMeshContribution({ meshIdentityCommand, meshStatusCommand, meshHeartbeatCommand, meshRelayCommand, meshInviteCommand, meshJoinCommand, meshRevokeCommand, meshServeCommand, meshLogsCommand, meshTerminalResumeCommand, meshAssignCommand, meshRecoverPushCommand, meshRepoPublishCommand, meshUiCommand, meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand }) {
// The mesh feature owns its complete command surface; core only assembles this contribution.

const meshContribution = Object.freeze({
  name: '@aof/mesh',
  commands: Object.freeze([
    meshIdentityCommand,
    meshStatusCommand,
    meshHeartbeatCommand,
    meshRelayCommand,
    meshInviteCommand,
    meshJoinCommand,
    meshRevokeCommand,
    meshServeCommand,
    meshLogsCommand,
    meshTerminalResumeCommand,
    meshAssignCommand,
    meshRecoverPushCommand,
    meshRepoPublishCommand,
    meshUiCommand,
    meshDesktopInstallCommand,
    meshDesktopRunCommand,
    meshDesktopStopCommand,
  ]),
});

return { meshContribution };
}
