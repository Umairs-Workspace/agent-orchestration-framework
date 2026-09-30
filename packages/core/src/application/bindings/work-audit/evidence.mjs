// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAuditEvidence } from "@aof/work/audit/evidence";
import { runBounded, DEFAULT_DEADLINE_MS, attemptedCommand } from "@aof/execution/bounded-process";
import { toolkitProgram, toolkitNode } from "../../../work-audit/toolkit.mjs";

export function assembleWorkAuditEvidence({  } = {}) {
  // Core composition for work-owned audit services.

  const {
    DRIVE_PROGRAM,
    DRIVE_RESULT_SENTINEL,
    EVIDENCE_FINDING_CODES,
    EVIDENCE_SWEEP,
    EVIDENCE_VERDICTS,
    MESSAGE_NORMALISATIONS,
    REGISTRATION_LIMIT,
    REPRODUCED_VERDICTS,
    SIZE_KINDS,
    cellUnder,
    dispositionOf,
    driveControl,
    findingsForRow,
    messagesAgree,
    normalizeMessage,
    observeControl,
    observedMessage,
    parseDriveOutput,
    recordedCasesIn,
    recordedMessageIn,
    recordedResultIn,
    recordedRowsFor,
    runEvidence,
    sizeFor,
    verdictFor,
  } = createAuditEvidence({ runBounded, DEFAULT_DEADLINE_MS, attemptedCommand, toolkitProgram, nodeExecutable: toolkitNode });

  return { DRIVE_PROGRAM, DRIVE_RESULT_SENTINEL, EVIDENCE_FINDING_CODES, EVIDENCE_SWEEP, EVIDENCE_VERDICTS, MESSAGE_NORMALISATIONS, REGISTRATION_LIMIT, REPRODUCED_VERDICTS, SIZE_KINDS, cellUnder, dispositionOf, driveControl, findingsForRow, messagesAgree, normalizeMessage, observeControl, observedMessage, parseDriveOutput, recordedCasesIn, recordedMessageIn, recordedResultIn, recordedRowsFor, runEvidence, sizeFor, verdictFor };
}
