// Compatibility entry; construction belongs to core application assembly.
import { workAcceptorObservations } from "../application/default.mjs";
export const {
  CENSUS_EVENT_LIMIT,
  FLOOR_DIVISOR,
  JOURNAL_ROOT_PLACEHOLDER,
  OBSERVATION_DISPOSITIONS,
  OBSERVATION_FINDING_CODES,
  OBSERVATION_LOCATION_FIELDS,
  OBSERVATION_SWEEPS,
  OBSERVATION_WORKSPACE_FIELD,
  assertObservationSweepsDeclared,
  classifyObservation,
  countPopulation,
  fixtureRoots,
  floorFromMeasured,
  foldDispatchWorktree,
  isFixtureLocation,
  observationCensus,
  observationFinding,
  readObservationCensus,
  unfilteredFinding,
  workspaceKey,
} = workAcceptorObservations;
