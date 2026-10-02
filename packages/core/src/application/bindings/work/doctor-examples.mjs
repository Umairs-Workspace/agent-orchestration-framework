// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDoctorExamples } from "@aof/work/doctor/examples";

export function assembleWorkDoctorExamples({ configInspectServices }) {
  // Core composition for work-owned doctor services.

  const { examplesEnabledFromConfig } = configInspectServices;

  const {
    EXAMPLE_LANE_CODES,
    examplesFindings,
    examplesGroup,
  } = createDoctorExamples({ examplesEnabledFromConfig });

  return { EXAMPLE_LANE_CODES, examplesFindings, examplesGroup };
}
