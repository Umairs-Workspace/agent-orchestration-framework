// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAcceptorObservations } from "@aof/work/acceptor/observations";

export function assembleWorkAcceptorObservations({ meshWorktreeServices, effectsJournalServices }) {
  // Application composition for the work-owned acceptor service.

  const { dispatchWorktreeSlug } = meshWorktreeServices;
  const { isUnderMeshDispatchWorktreesRoot } = meshWorktreeServices;
  const { meshDispatchWorktreesRoot } = meshWorktreeServices;
  const { readEvents } = effectsJournalServices;

  const {
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

  return { CENSUS_EVENT_LIMIT, FLOOR_DIVISOR, JOURNAL_ROOT_PLACEHOLDER, OBSERVATION_DISPOSITIONS, OBSERVATION_FINDING_CODES, OBSERVATION_LOCATION_FIELDS, OBSERVATION_SWEEPS, OBSERVATION_WORKSPACE_FIELD, assertObservationSweepsDeclared, classifyObservation, countPopulation, fixtureRoots, floorFromMeasured, foldDispatchWorktree, isFixtureLocation, observationCensus, observationFinding, readObservationCensus, unfilteredFinding, workspaceKey };
}
