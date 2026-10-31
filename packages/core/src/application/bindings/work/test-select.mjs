// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTestSelector } from "@aof/work/testing/select";

export function assembleWorkTestSelect({ workAuditCensusServices, codeRelationsServices }) {
  // Core composition for work-owned testing. The graph is the code corpus's `relations`, asked
  // through the port over the graphify code backend's read half (179/ADR-004), which reaches no
  // graphify process.

  const { registrationDecision } = workAuditCensusServices;
  const { relations } = codeRelationsServices;

  const { CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SELECTION_SCOPES, SINCE_REV_UNRESOLVABLE, WIDENING_REASONS, isSuiteFile, registrationReport, selectSuites, wideningRuleProblems } = createTestSelector({ relations, registrationDecision });

  return { CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SELECTION_SCOPES, SINCE_REV_UNRESOLVABLE, WIDENING_REASONS, isSuiteFile, registrationReport, selectSuites, wideningRuleProblems };
}
