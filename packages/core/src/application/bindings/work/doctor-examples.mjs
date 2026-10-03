// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDoctorExamples } from "@aof/specification-by-example/doctor-lane";

export function assembleWorkDoctorExamples({ configInspectServices }) {
  // Core composition for the specification-by-example doctor lane.

  const { examplesEnabledFromConfig } = configInspectServices;

  const {
    EXAMPLE_LANE_CODES,
    examplesFindings,
    examplesGroup,
  } = createDoctorExamples({ examplesEnabledFromConfig });

  return { EXAMPLE_LANE_CODES, examplesFindings, examplesGroup };
}
