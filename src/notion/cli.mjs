// Core supplies tool identity and diagnostics; the package owns auth and CLI spawning.
import { createNotionCli } from '@aof/integration-notion/cli';
import { descriptorFor } from '../tool-store.mjs';
import { reportDegrade } from '../degrade.mjs';
export { DEFAULT_TOKEN_ENV, NOTION_KEYRING_OFF, resolveNotionAuth, buildSpawnEnv } from '@aof/integration-notion/cli';
export const { resolveNtnLauncher, makeNotionSpawn } = createNotionCli({ descriptorFor, reportDegrade });
