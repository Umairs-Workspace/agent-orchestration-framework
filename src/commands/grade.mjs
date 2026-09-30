// Compatibility entry; construction belongs to core application assembly.
import { commandsGrade } from "../application/default.mjs";
export const {
  spawnRubricAsync,
  GRADE_REENTRANCY_ENV,
  RUBRIC_CONFIG_KEY,
  declaredRubric,
  gatherClaimProvenance,
  gradeCommand,
  planRubric,
  reportObservation,
  rubricChildEnv,
  rubricSpawnOptions,
  usableCommand,
} = commandsGrade;
