// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAuditCensus } from "@aof/work/audit/census";
import { runBounded, DEFAULT_DEADLINE_MS } from "@aof/execution/bounded-process";
import { isToolkitRoot, toolkitProgram } from "../../../work-audit/toolkit.mjs";

export function assembleWorkAuditCensus({  } = {}) {
  // Core composition for work-owned audit services.

  const {
    AUDIT_FINDING_CODES,
    CENSUS_SWEEPS,
    LEDGER_PROJECT,
    LIMIT_KEYS,
    PROBE_PROGRAM,
    SWEEP_BASES,
    TEST_ROOTS,
    UNREGISTERED_BASELINE,
    assembledSuite,
    assertSweepsDeclared,
    baselineProblems,
    ledgerApplies,
    limitDeclarationProblems,
    limitRecord,
    readFinding,
    readRecord,
    readRegistrationIndexes,
    registrationDecision,
    registrationSources,
    runCensus,
    runnerBindings,
    runnerImportedSuites,
    runnerSpreadNames,
    spreadClaimLimit,
    sweepDeclarationProblems,
    sweepLimits,
    walkSuiteFiles,
  } = createAuditCensus({ runBounded, DEFAULT_DEADLINE_MS, isToolkitRoot, toolkitProgram });

  return { AUDIT_FINDING_CODES, CENSUS_SWEEPS, LEDGER_PROJECT, LIMIT_KEYS, PROBE_PROGRAM, SWEEP_BASES, TEST_ROOTS, UNREGISTERED_BASELINE, assembledSuite, assertSweepsDeclared, baselineProblems, ledgerApplies, limitDeclarationProblems, limitRecord, readFinding, readRecord, readRegistrationIndexes, registrationDecision, registrationSources, runCensus, runnerBindings, runnerImportedSuites, runnerSpreadNames, spreadClaimLimit, sweepDeclarationProblems, sweepLimits, walkSuiteFiles };
}
