// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createUpgradeCommand } from "@aof/work/commands/upgrade";

export function assembleCommandsUpgrade({ workUpgradeServices }) {
  // Core composition for work-owned upgrade commands.

  const { runUpgrade } = workUpgradeServices;
  const { renderChangelog } = workUpgradeServices;

  const { upgradeCommand } = createUpgradeCommand({ runUpgrade, renderChangelog });

  return { upgradeCommand };
}
