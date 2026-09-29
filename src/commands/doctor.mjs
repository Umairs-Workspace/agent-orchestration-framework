// Transitional core composition for work-owned doctor commands.
import { createDoctorCommand } from "@aof/work/commands/doctor";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildSnapshot, doctorWork, staleWindowFromConfig, CONVENTION_DOCS } from "../work/doctor.mjs";
import { readCachedWorkFacts } from "../cache-read.mjs";
import { isMeshWorktree } from "../work/read.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { probeFabric, remediationForReason } from "../mesh/fabric.mjs";
import { effectsFor, knownEvents } from "../effects/table.mjs";
import {
  openEffectsJournal,
  effectsJournalPath,
  readEvents,
  readEventSteps,
  pendingSteps,
} from "../effects/journal.mjs";
import { drainEffects, reachableLoci } from "../effects/dispatch.mjs";
import { reconcileRunRecords } from "../effects/reconcile.mjs";
const execFileAsync = promisify(execFile);

const loadNodeIdentity = () => import("@aof/mesh/node-identity");
// Deferred by design: command-core imports every command module, including this
// one. A static import would close the registry ring at module scope.
const loadCommandCore = () => import("../command-core.mjs");

export const { doctorCommand, readRenameMap } = createDoctorCommand({ buildSnapshot, doctorWork, staleWindowFromConfig, CONVENTION_DOCS, readCachedWorkFacts, isMeshWorktree, meshNodeIdOf, probeFabric, remediationForReason, effectsFor, knownEvents, openEffectsJournal, effectsJournalPath, readEvents, readEventSteps, pendingSteps, drainEffects, reachableLoci, reconcileRunRecords, execFileAsync, loadNodeIdentity, loadCommandCore });
