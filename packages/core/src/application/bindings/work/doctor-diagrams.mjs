// Core assembly: construct once per application; collaborators are supplied explicitly.
import { readdir } from "node:fs/promises";
import { createDoctorDiagrams } from "@aof/diagrams/doctor-lane";

export function assembleWorkDoctorDiagrams({ configInspectServices }) {
  // Core composition for the diagrams doctor lane (@aof/diagrams' own; the lane's directory reader
  // is node's, injected here so the package module imports no fs of its own).

  const { resolveWorkDiagrams } = configInspectServices;

  const {
    DIAGRAM_LANE_CODES,
    diagramsGroup,
    diagramListing,
  } = createDoctorDiagrams({ resolveWorkDiagrams, readdir });

  return { DIAGRAM_LANE_CODES, diagramsGroup, diagramListing };
}
