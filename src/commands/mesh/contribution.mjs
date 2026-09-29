// Transitional core composition for mesh-owned commands.
import { createMeshContribution } from "@aof/mesh/commands";
import { meshIdentityCommand, meshStatusCommand } from "./identity.mjs";
import { meshHeartbeatCommand } from "./heartbeat.mjs";
import { meshRelayCommand } from "./relay.mjs";
import { meshInviteCommand } from "./invite.mjs";
import { meshJoinCommand } from "./join.mjs";
import { meshRevokeCommand } from "./revoke.mjs";
import { meshServeCommand } from "./serve.mjs";
import { meshLogsCommand } from "./logs.mjs";
import { meshTerminalResumeCommand } from "./terminal-resume.mjs";
import { meshAssignCommand } from "./assign.mjs";
import { meshRecoverPushCommand } from "./recover-push.mjs";
import { meshRepoPublishCommand } from "./repo.mjs";
import { meshUiCommand } from "./ui.mjs";
import { meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand } from "./desktop.mjs";

export const { meshContribution } = createMeshContribution({ meshIdentityCommand, meshStatusCommand, meshHeartbeatCommand, meshRelayCommand, meshInviteCommand, meshJoinCommand, meshRevokeCommand, meshServeCommand, meshLogsCommand, meshTerminalResumeCommand, meshAssignCommand, meshRecoverPushCommand, meshRepoPublishCommand, meshUiCommand, meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand });
