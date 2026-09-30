// Compatibility entry; construction belongs to core application assembly.
import { notionCli } from "../application/default.mjs";
export const {
  DEFAULT_TOKEN_ENV,
  NOTION_KEYRING_OFF,
  resolveNotionAuth,
  buildSpawnEnv,
  resolveNtnLauncher,
  makeNotionSpawn,
} = notionCli;
