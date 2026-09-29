// Transitional core composition for work-owned upgrade commands.
import { createUpgradeCommand } from "@aof/work/commands/upgrade";
import { runUpgrade, renderChangelog } from "../work/upgrade.mjs";

export const { upgradeCommand } = createUpgradeCommand({ runUpgrade, renderChangelog });
