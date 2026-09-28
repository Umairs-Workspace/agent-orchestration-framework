// Transitional core composition for work-owned doctor services.
import { createDoctorDiagrams } from "@aof/work/doctor/diagrams";
import { resolveWorkDiagrams } from "../config-inspect.mjs";

export const {
  DIAGRAM_LANE_CODES,
  diagramsGroup,
} = createDoctorDiagrams({ resolveWorkDiagrams });
