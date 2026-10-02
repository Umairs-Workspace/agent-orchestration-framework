// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDoctorDiagrams } from "@aof/work/doctor/diagrams";

export function assembleWorkDoctorDiagrams({ configInspectServices }) {
  // Core composition for work-owned doctor services.

  const { resolveWorkDiagrams } = configInspectServices;

  const {
    DIAGRAM_LANE_CODES,
    diagramsGroup,
  } = createDoctorDiagrams({ resolveWorkDiagrams });

  return { DIAGRAM_LANE_CODES, diagramsGroup };
}
