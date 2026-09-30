// Compatibility entry; construction belongs to core application assembly.
import { commandsAudit } from "../application/default.mjs";
export const {
  DEFAULT_ANCHOR_STALE_DAYS,
  anchorWindowFromConfig,
  auditCommand,
  readAuditedSettings,
  registerItems,
  resolveRoleRouting,
} = commandsAudit;
