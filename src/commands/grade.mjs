// Transitional core composition for work-owned grading.
import { createGradeCommand } from "@aof/work/commands/grade";
import { spawnRubricAsync } from "@aof/execution/rubric-process";
import { resolveItem, requireLocalCheckout } from "./resolve.mjs";
import { readRuns } from "../run-store.mjs";
import { deriveNodeId } from "../node-identity.mjs";
import { headCommit } from "../mesh/worktree.mjs";

export { spawnRubricAsync };
export const { GRADE_REENTRANCY_ENV, RUBRIC_CONFIG_KEY, declaredRubric, gatherClaimProvenance, gradeCommand, planRubric, reportObservation, rubricChildEnv, rubricSpawnOptions, usableCommand } = createGradeCommand({ spawnRubricAsync, resolveItem, requireLocalCheckout, readRuns, deriveNodeId, headCommit });
