// Transitional application composition for the work-owned acceptor service.
import { createAcceptorObservations } from "@aof/work/acceptor/observations";
import { dispatchWorktreeSlug, isUnderMeshDispatchWorktreesRoot, meshDispatchWorktreesRoot } from "../mesh/worktree.mjs";
import { readEvents } from "../effects/journal.mjs";

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
} = createAcceptorObservations({ dispatchWorktreeSlug, isUnderMeshDispatchWorktreesRoot, meshDispatchWorktreesRoot, readEvents });
