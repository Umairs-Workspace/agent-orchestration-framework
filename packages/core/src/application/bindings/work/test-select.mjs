// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTestSelector } from "@aof/work/testing/select";
import { computeImpact } from "@aof/knowledge/graph-impact";
import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "@aof/knowledge/graph-normalize";

export function assembleWorkTestSelect({ workAuditCensusServices }) {
  // Core composition for work-owned testing.

  const { registrationDecision } = workAuditCensusServices;

  const { CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SELECTION_SCOPES, SINCE_REV_UNRESOLVABLE, WIDENING_REASONS, isSuiteFile, registrationReport, selectSuites, wideningRuleProblems } = createTestSelector({ computeImpact, graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph, registrationDecision });

  return { CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SELECTION_SCOPES, SINCE_REV_UNRESOLVABLE, WIDENING_REASONS, isSuiteFile, registrationReport, selectSuites, wideningRuleProblems };
}
