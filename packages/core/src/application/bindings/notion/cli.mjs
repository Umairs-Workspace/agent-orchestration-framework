// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createNotionCli } from "@aof/integration-notion/cli";
import { descriptorFor } from "../../../tool-store.mjs";
import * as api0 from "@aof/integration-notion/cli";

export function assembleNotionCli({ degradeServices }) {
  // Core supplies tool identity and diagnostics; the package owns auth and CLI spawning.

  const { reportDegrade } = degradeServices;

  const { resolveNtnLauncher, makeNotionSpawn } = createNotionCli({ descriptorFor, reportDegrade });

  return { "DEFAULT_TOKEN_ENV": api0.DEFAULT_TOKEN_ENV, "NOTION_KEYRING_OFF": api0.NOTION_KEYRING_OFF, "resolveNotionAuth": api0.resolveNotionAuth, "buildSpawnEnv": api0.buildSpawnEnv, resolveNtnLauncher, makeNotionSpawn };
}
