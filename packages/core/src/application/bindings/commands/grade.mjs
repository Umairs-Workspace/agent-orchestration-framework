// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGradeCommand } from "@aof/work/commands/grade";
import { spawnRubricAsync } from "@aof/execution/rubric-process";
import { deriveNodeId } from "@aof/mesh/node-identity";

export function assembleCommandsGrade({ commandsResolveServices, runStoreServices, meshWorktreeServices }) {
  // Core composition for work-owned grading.

  const { resolveItem } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { readRuns } = runStoreServices;

  const { headCommit } = meshWorktreeServices;

  const { GRADE_REENTRANCY_ENV, RUBRIC_CONFIG_KEY, declaredRubric, gatherClaimProvenance, gradeCommand, planRubric, reportObservation, rubricChildEnv, rubricSpawnOptions, usableCommand } = createGradeCommand({ spawnRubricAsync, resolveItem, requireLocalCheckout, readRuns, deriveNodeId, headCommit });

  return { spawnRubricAsync, GRADE_REENTRANCY_ENV, RUBRIC_CONFIG_KEY, declaredRubric, gatherClaimProvenance, gradeCommand, planRubric, reportObservation, rubricChildEnv, rubricSpawnOptions, usableCommand };
}
