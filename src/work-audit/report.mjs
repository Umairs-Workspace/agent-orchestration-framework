// Transitional core composition for work-owned audit services.
import { createAuditReport } from "@aof/work/audit/report";
import { AUDIT_FINDING_CODES, runCensus } from "./census.mjs";
import { EVIDENCE_FINDING_CODES, runEvidence } from "./evidence.mjs";
import { PROMPT_LAYER_FINDING_CODES, runPromptLayer } from "./prompt-layer.mjs";
import { HOOK_WIRING_FINDING_CODES, HOOK_WIRING_SWEEPS, runHookWiring } from "@aof/work/audit/hook-wiring";
import { SEAM_LIVENESS_FINDING_CODES, runSeamLiveness } from "./seam-liveness.mjs";
import { DECLARED_BOUNDS_FINDING_CODES, runDeclaredBounds } from "./declared-bounds.mjs";
import {
  AUDIT_LANE_FINDING_CODES,
  assessAnchorFreshness,
  assessInstrumentSilence,
  assessLoopConsultation,
  assessMetricMovement,
} from "@aof/work-graph/checks";

export const {
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
