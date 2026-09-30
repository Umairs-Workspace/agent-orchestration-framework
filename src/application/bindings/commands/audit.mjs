// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAuditCommand } from "@aof/work/commands/audit";
import { AOF_HOOK_MARKER, claudeSettingsPath } from "../../../claude-settings.mjs";

export function assembleCommandsAudit({ workLoopsServices, workAuditReportServices, workAuditPromptLayerServices, workAuditDeclaredBoundsServices }) {
  // Core composition for work-owned audit commands.

  const { loadLoops } = workLoopsServices;
  const { AUDIT_ENVELOPE_KEYS } = workAuditReportServices;
  const { escalates } = workAuditReportServices;
  const { runAudit } = workAuditReportServices;

  const { ROLE_WORDS } = workAuditPromptLayerServices;
  const { declaredBoundValues } = workAuditDeclaredBoundsServices;

  const { DEFAULT_ANCHOR_STALE_DAYS, anchorWindowFromConfig, auditCommand, readAuditedSettings, registerItems, resolveRoleRouting } = createAuditCommand({ loadLoops, AUDIT_ENVELOPE_KEYS, escalates, runAudit, AOF_HOOK_MARKER, claudeSettingsPath, ROLE_WORDS, declaredBoundValues });

  return { DEFAULT_ANCHOR_STALE_DAYS, anchorWindowFromConfig, auditCommand, readAuditedSettings, registerItems, resolveRoleRouting };
}
