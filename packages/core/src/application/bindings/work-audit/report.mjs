// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAuditReport } from "@aof/work/audit/report";
import { HOOK_WIRING_FINDING_CODES, HOOK_WIRING_SWEEPS, runHookWiring } from "@aof/work/audit/hook-wiring";
import {
  AUDIT_LANE_FINDING_CODES,
  assessAnchorFreshness,
  assessInstrumentSilence,
  assessLoopConsultation,
  assessMetricMovement,
} from "@aof/work-graph/checks";

export function assembleWorkAuditReport({ workAuditCensusServices, workAuditEvidenceServices, workAuditPromptLayerServices, workAuditSeamLivenessServices, workAuditDeclaredBoundsServices }) {
  // Core composition for work-owned audit services.

  const { AUDIT_FINDING_CODES } = workAuditCensusServices;
  const { runCensus } = workAuditCensusServices;
  const { EVIDENCE_FINDING_CODES } = workAuditEvidenceServices;
  const { runEvidence } = workAuditEvidenceServices;
  const { PROMPT_LAYER_FINDING_CODES } = workAuditPromptLayerServices;
  const { runPromptLayer } = workAuditPromptLayerServices;

  const { SEAM_LIVENESS_FINDING_CODES } = workAuditSeamLivenessServices;
  const { runSeamLiveness } = workAuditSeamLivenessServices;
  const { DECLARED_BOUNDS_FINDING_CODES } = workAuditDeclaredBoundsServices;
  const { runDeclaredBounds } = workAuditDeclaredBoundsServices;

  const {
    AUDITABLE_CODES,
    AUDIT_ENVELOPE_KEYS,
    AUDIT_FACE_CODES,
    ESCALATING_CODES,
    LANE_NEUTRAL_CODES,
    OWNING_KEYS,
    REPORT_LANES,
    addresseesFor,
    assertLaneLimits,
    assertLaneRead,
    assertLaneRunnersDistinct,
    auditableCodesFor,
    auditorFindings,
    auditorOf,
    auditorsOf,
    canReceive,
    declaredPointerRaws,
    escalates,
    escalationActorOf,
    instrumentFor,
    laneVocabularyCollisions,
    matchesScope,
    ownersOfInstrument,
    pointerFile,
    referenceSettersOf,
    resolveAddressees,
    runAudit,
    runRegistryChecks,
    unreportedFloorFindings,
  } = createAuditReport({ AUDIT_FINDING_CODES, runCensus, EVIDENCE_FINDING_CODES, runEvidence, PROMPT_LAYER_FINDING_CODES, runPromptLayer, HOOK_WIRING_FINDING_CODES, HOOK_WIRING_SWEEPS, runHookWiring, SEAM_LIVENESS_FINDING_CODES, runSeamLiveness, DECLARED_BOUNDS_FINDING_CODES, runDeclaredBounds, AUDIT_LANE_FINDING_CODES, assessAnchorFreshness, assessInstrumentSilence, assessLoopConsultation, assessMetricMovement });

  return { AUDITABLE_CODES, AUDIT_ENVELOPE_KEYS, AUDIT_FACE_CODES, ESCALATING_CODES, LANE_NEUTRAL_CODES, OWNING_KEYS, REPORT_LANES, addresseesFor, assertLaneLimits, assertLaneRead, assertLaneRunnersDistinct, auditableCodesFor, auditorFindings, auditorOf, auditorsOf, canReceive, declaredPointerRaws, escalates, escalationActorOf, instrumentFor, laneVocabularyCollisions, matchesScope, ownersOfInstrument, pointerFile, referenceSettersOf, resolveAddressees, runAudit, runRegistryChecks, unreportedFloorFindings };
}
