// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDoctorExamples } from "@aof/specification-by-example/doctor-lane";
import { createOperatorLane } from "@aof/specification-by-example/operator-lane";

export function assembleWorkDoctorExamples({ configInspectServices }) {
  // Core composition for the specification-by-example doctor lanes: the examples lane, and the
  // operator lane after it (193/ADR-006 §5).

  const { examplesEnabledFromConfig, operatorAwareFromConfig, operatorProfileFromConfig } = configInspectServices;

  const {
    EXAMPLE_LANE_CODES,
    examplesFindings,
    examplesGroup,
  } = createDoctorExamples({ examplesEnabledFromConfig });

  const {
    OPERATOR_LANE_CODES,
    operatorProfileWarnings,
    operatorGroup,
  } = createOperatorLane({ operatorAwareFromConfig, operatorProfileFromConfig });

  return { EXAMPLE_LANE_CODES, examplesFindings, examplesGroup, OPERATOR_LANE_CODES, operatorProfileWarnings, operatorGroup };
}
