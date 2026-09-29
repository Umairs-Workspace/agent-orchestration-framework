// Transitional core composition for work-owned audit commands.
import { createAuditCommand } from "@aof/work/commands/audit";
import { loadLoops } from "../work/loops.mjs";
import { AUDIT_ENVELOPE_KEYS, escalates, runAudit } from "../work-audit/report.mjs";
import { AOF_HOOK_MARKER, claudeSettingsPath } from "../claude-settings.mjs";
import { ROLE_WORDS } from "../work-audit/prompt-layer.mjs";
import { declaredBoundValues } from "../work-audit/declared-bounds.mjs";

export const { DEFAULT_ANCHOR_STALE_DAYS, anchorWindowFromConfig, auditCommand, readAuditedSettings, registerItems, resolveRoleRouting } = createAuditCommand({ loadLoops, AUDIT_ENVELOPE_KEYS, escalates, runAudit, AOF_HOOK_MARKER, claudeSettingsPath, ROLE_WORDS, declaredBoundValues });
