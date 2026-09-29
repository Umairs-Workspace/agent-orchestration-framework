// Transitional core composition for work-owned testing.
import { createTestSelector } from "@aof/work/testing/select";
import { computeImpact } from "../graph-impact.mjs";
import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "../graph-normalize.mjs";
import { registrationDecision } from "../work-audit/census.mjs";

export const { CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SELECTION_SCOPES, SINCE_REV_UNRESOLVABLE, WIDENING_REASONS, isSuiteFile, registrationReport, selectSuites, wideningRuleProblems } = createTestSelector({ computeImpact, graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph, registrationDecision });
