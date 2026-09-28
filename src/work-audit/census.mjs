// Transitional core composition for work-owned audit services.
import { createAuditCensus } from "@aof/work/audit/census";
import { runBounded, DEFAULT_DEADLINE_MS } from "./spawn.mjs";
import { isToolkitRoot, toolkitProgram } from "./toolkit.mjs";

export const {
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
