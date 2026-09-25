// The in-process command registry — the single source of truth for every work
// operation, the SPINE both faces couple through (ADR-002). The CLI is a thin
// `argv → invoke → render`/`--json` face; each UI server is a thin
// `transport → invoke → project` face. Both call this SAME core in-process —
// never a per-request subprocess (ADR-001).
//
// A Command is the frozen shape:
//   {
//     id:    string,                       // the registry key, e.g. "work:doc"
//     input: <JSONSchema>,                 // plain serialisable data only
//     run:   async (input, ctx) => result, // the operation; returns basis-NEUTRAL
//                                          //   data (raw absolute paths, or list's
//                                          //   dir as listStream emits it) — NO
//                                          //   displayPath/relativise inside run.
//     cli:   { argv, render, json },       // the CLI face adapter (argv → input,
//                                          //   human render, --json projection).
//   }
//
//   ctx = { workspace } where workspace is the loadWorkspace result
//   { workDir, config, projectRoot, configPath }.
//
// Path-display projection is a FACE adapter, NOT command logic: the board face
// relativises raw paths to projectRoot + forward-slash; the CLI face relativises
// to process.cwd() (path.relative, OS separators). Basis-neutral results let each
// face project losslessly — the keystone that makes byte-for-byte on both faces
// achievable on Windows separators (ADR-002).
import { loadWorkspace } from "./work.mjs";
import { listCommand } from "./commands/list.mjs";
import { loopsShowCommand } from "./commands/loops-show.mjs";
import { loopsGraphCommand } from "./commands/loops-graph.mjs";
import { loopsValidateCommand } from "./commands/loops-validate.mjs";
import { createLoopsGroundednessCommand } from "./commands/loops-groundedness.mjs";
// work:loop-document — 78/ADR-002, 52/FF-5201, chore 64, 52/FF-5202 — see ./commands/loop-document.mjs's header.
import { loopDocumentCommand } from "./commands/loop-document.mjs";
// work:loop-record — 52/FF-5201, 78/ADR-008, 52/FF-5202 — see ./commands/loop-record.mjs's header.
import { loopRecordCommand } from "./commands/loop-record.mjs";
import { continueCommand, refineDoorCommand, verifyDoorCommand } from "./commands/continue.mjs";
// work:drive-refine / work:drive-continue / work:drive-verify — see ./commands/drive.mjs's header.
import {
  refineDriverCommand,
  continueDriverCommand,
  verifyDriverCommand,
} from "./commands/drive.mjs";
import { loopCommand } from "./commands/loop.mjs";
// work:resync — m43 — see ./commands/resync.mjs's header.
import { resyncCommand } from "./commands/resync.mjs";
// work:debt — see ./commands/debt.mjs's header.
import { debtCommand } from "./commands/debt.mjs";
import { docCommand } from "./commands/doc.mjs";
import { tasksCommand } from "./commands/tasks.mjs";
import { validateCommand } from "./commands/validate.mjs";
import { nextCommand } from "./commands/next.mjs";
// work:dispatch — see ./commands/dispatch.mjs's header.
import { dispatchCommand } from "./commands/dispatch.mjs";
import { feedbackCommand } from "./commands/feedback.mjs";
// work:doctor — 15/ADR-001 — see ./commands/doctor.mjs's header.
import { doctorCommand } from "./commands/doctor.mjs";
// work:audit — 66/ADR-004 §2, 54/ADR-003 §4, 59/ADR-008 §1 — see ./commands/audit.mjs's header.
import { auditCommand } from "./commands/audit.mjs";
// work:acceptor — see ./commands/acceptor.mjs's header.
import { acceptorCommand } from "./commands/acceptor.mjs";
// work:tune — see ./commands/tune.mjs's header.
import { tuneCommand } from "./commands/tune.mjs";
// work:trigger — 63/ADR-001, 62/ADR-005 §1, 53/ADR-005, 63/ADR-008 §7, 59/ADR-008 §1 — see ./commands/trigger.mjs's header.
import { triggerCommand } from "./commands/trigger.mjs";
// work:grade — 54/ADR-003 §2, 54/ADR-003 §4 — see ./commands/grade.mjs's header.
import { gradeCommand } from "./commands/grade.mjs";
// work:ratchet — see ./commands/ratchet.mjs's header.
import { ratchetCommand } from "./commands/ratchet.mjs";
// work:counters — see ./commands/counters.mjs's header.
import { countersCommand } from "./commands/counters.mjs";
// graph:build — see ./commands/graph/build.mjs's header.
import { graphBuildCommand } from "./commands/graph/build.mjs";
import { graphQueryCommand } from "./commands/graph/query.mjs";
import { graphTriageCommand } from "./commands/graph/triage.mjs";
// graph:impact — see ./commands/graph/impact.mjs's header.
import { graphImpactCommand } from "./commands/graph/impact.mjs";
// test — 72/ADR-008 §5, TECH_DEBT item 78, 72/ADR-002 §4, FF-7204 — see ./commands/test.mjs's header.
import { testCommand } from "./commands/test.mjs";
// project:provision — 12/ADR-003 — see ./commands/project-provision.mjs's header.
import { projectProvisionCommand } from "./commands/project-provision.mjs";
// import:milestone — 13/ADR-002 — see ./commands/import-milestone.mjs's header.
import { importMilestoneCommand } from "./commands/import-milestone.mjs";
// migrate:folder — see ./commands/migrate-folder.mjs's header.
import { migrateFolderCommand } from "./commands/migrate-folder.mjs";
// notion:sync-work — 17/ADR-002, 08/ADR-004 — see ./commands/notion-sync-work.mjs's header.
import { notionSyncWorkCommand } from "./commands/notion-sync-work.mjs";
// notion:associate — 18/ADR-003, 08/ADR-004 — see ./commands/notion-associate.mjs's header.
import { notionAssociateCommand } from "./commands/notion-associate.mjs";
// work:run-start — see ./commands/run-start.mjs's header.
import { runStartCommand } from "./commands/run-start.mjs";
import { runCompleteCommand } from "./commands/run-complete.mjs";
import { runStatusCommand } from "./commands/run-status.mjs";
// work:status — see ./commands/item-status.mjs's header.
import { itemStatusCommand } from "./commands/item-status.mjs";
// work:regression-gate — see ./commands/regression-gate.mjs's header.
import { regressionGateCommand } from "./commands/regression-gate.mjs";
// work:run-retry — m09, m19, m21, 08/ADR-004 — see ./commands/run-retry.mjs's header.
import { runRetryCommand } from "./commands/run-retry.mjs";
// work:resume — see ./commands/resume.mjs's header.
import { resumeCommand, answerCommand } from "./commands/resume.mjs";
// mesh:identity / mesh:status — see ./commands/mesh/identity.mjs's header.
import { meshIdentityCommand, meshStatusCommand } from "./commands/mesh/identity.mjs";
// mesh:heartbeat — see ./commands/mesh/heartbeat.mjs's header.
import { meshHeartbeatCommand } from "./commands/mesh/heartbeat.mjs";
// mesh:relay — see ./commands/mesh/relay.mjs's header.
import { meshRelayCommand } from "./commands/mesh/relay.mjs";
// mesh:invite — see ./commands/mesh/invite.mjs's header.
import { meshInviteCommand } from "./commands/mesh/invite.mjs";
import { meshJoinCommand } from "./commands/mesh/join.mjs";
// mesh:revoke — see ./commands/mesh/revoke.mjs's header.
import { meshRevokeCommand } from "./commands/mesh/revoke.mjs";
// mesh:serve — see ./commands/mesh/serve.mjs's header.
import { meshServeCommand } from "./commands/mesh/serve.mjs";
// mesh:logs — m42, TECH_DEBT item 2 — see ./commands/mesh/logs.mjs's header.
import { meshLogsCommand } from "./commands/mesh/logs.mjs";
// mesh:terminal-resume — m42 — see ./commands/mesh/terminal-resume.mjs's header.
import { meshTerminalResumeCommand } from "./commands/mesh/terminal-resume.mjs";
// mesh:assign — m42 — see ./commands/mesh/assign.mjs's header.
import { meshAssignCommand } from "./commands/mesh/assign.mjs";
import { meshRecoverPushCommand } from "./commands/mesh/recover-push.mjs";
import { meshRepoPublishCommand } from "./commands/mesh/repo.mjs";
// mesh:ui — m42 — see ./commands/mesh/ui.mjs's header.
import { meshUiCommand } from "./commands/mesh/ui.mjs";
import { meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand } from "./commands/mesh/desktop.mjs";
// graph:serve — m42 — see ./commands/graph/serve.mjs's header.
import { graphServeCommand } from "./commands/graph/serve.mjs";
// diagram:plan — milestone 133 — see ./commands/diagram/plan.mjs's header.
import { diagramPlanCommand } from "./commands/diagram/plan.mjs";
// diagram:export — milestone 133 — see ./commands/diagram/export.mjs's header.
import { diagramExportCommand } from "./commands/diagram/export.mjs";
// diagram:file — milestone 133 — see ./commands/diagram/file.mjs's header.
import { diagramFileCommand } from "./commands/diagram/file.mjs";
// messaging:init / messaging:enable / messaging:disable / messaging:status — 131/08 — see ./commands/messaging/messaging.mjs's header.
import { messagingInitCommand, messagingEnableCommand, messagingDisableCommand, messagingStatusCommand } from "./commands/messaging/messaging.mjs";
import { workUiCommand } from "./commands/work-ui.mjs";
import { assetsUiCommand } from "./commands/assets/ui.mjs";
// work:find — m42, m12 — see ./commands/find.mjs's header.
import { findCommand } from "./commands/find.mjs";
import { observeCommand } from "./commands/observe.mjs";
// work:memory — story 128, 05/ADR-003, 05/ADR-004 — see ./commands/work/memory.mjs's header.
import { memoryCommand } from "./commands/work/memory.mjs";
import { useHeadroomCommand, unuseHeadroomCommand } from "./commands/headroom.mjs";
// work:init / work:init-config / work:update — chore 51 — see ./commands/init-update.mjs's header.
import { workInitCommand, workInitConfigCommand, workUpdateCommand } from "./commands/init-update.mjs";
// work:orchestrator / work:delegation / work:delegation-model — m42 — see ./commands/orchestrator-delegation.mjs's header.
import { workOrchestratorCommand, workDelegationCommand, workDelegationModelCommand } from "./commands/orchestrator-delegation.mjs";
import { planningInitCommand } from "./commands/planning-init.mjs";
import { projectInitCommand } from "./commands/project-init.mjs";
// work:insert-milestone — 08/ADR-004 — see ./commands/insert-milestone.mjs's header.
import { insertMilestoneCommand } from "./commands/insert-milestone.mjs";
import { insertUatCommand } from "./commands/insert-uat.mjs";
// work:insert-story — see ./commands/insert-story.mjs's header.
import { insertStoryCommand } from "./commands/insert-story.mjs";
// work:insert-chore — see ./commands/insert-chore.mjs's header.
import { insertChoreCommand } from "./commands/insert-chore.mjs";
// work:promote — milestone 127 / ADR-003 — see ./commands/promote.mjs's header.
import { promoteCommand } from "./commands/promote.mjs";
// work:archive — milestone 127 / ADR-004 — see ./commands/archive.mjs's header.
import { archiveCommand } from "./commands/archive.mjs";
import { promoteGapToChoreCommand } from "./commands/promote-gap-to-chore.mjs";
// work:promote-finding — see ./commands/promote-finding-to-chore.mjs's header.
import { promoteFindingToChoreCommand } from "./commands/promote-finding-to-chore.mjs";
// work:upgrade — see ./commands/upgrade.mjs's header.
import { upgradeCommand } from "./commands/upgrade.mjs";
// assets:list — m42 — see ./commands/assets/list.mjs's header.
import { assetsListCommand } from "./commands/assets/list.mjs";
import { packagesListCommand } from "./commands/packages-list.mjs";
import { projectShowCommand } from "./commands/project-show.mjs";
// assets:show — m42 — see ./commands/assets/show.mjs's header.
import { assetsShowCommand } from "./commands/assets/show.mjs";
import { assetsAddCommand } from "./commands/assets/add.mjs";
import { assetsRemoveCommand } from "./commands/assets/remove.mjs";
import { assetsUseCommand, assetsUnuseCommand } from "./commands/assets/refs.mjs";
import { assetsCleanCommand } from "./commands/assets/clean.mjs";
import { assetsValidateCommand } from "./commands/assets/validate.mjs";
import { assetsApplyCommand } from "./commands/assets/apply.mjs";
import { packagesShowCommand } from "./commands/packages-show.mjs";
import { packagesAddCommand } from "./commands/packages-add.mjs";
import { packagesRemoveCommand } from "./commands/packages-remove.mjs";
import { packagesValidateCommand } from "./commands/packages-validate.mjs";
import { packagesInstallCommand } from "./commands/packages-install.mjs";
import { projectValidateCommand } from "./commands/project-validate.mjs";
import { projectDoctorCommand } from "./commands/project-doctor.mjs";
import { projectMigrateCommand } from "./commands/project-migrate.mjs";

// The registry is the ONLY door (ADR-004 inv. 3): the faces obtain the
// `ctx.workspace` they pass to `invoke` THROUGH the registry, never by importing
// `work.mjs` directly. Re-exporting `loadWorkspace` here keeps board-ui.mjs's
// (and the CLI's) sole operation-bearing import the command core.
export { loadWorkspace };

const loopsGroundednessCommand = createLoopsGroundednessCommand({
  hasCommand: (id) => REGISTRY.has(id),
});

// The six work-surface commands (08/ADR-002) PLUS the three graph commands
// (09/ADR-001), all in the SAME registry — so listCommands() returns the six
// work + three graph commands, and every face couples through this one core.
const COMMANDS = [
  listCommand,
  loopsShowCommand,
  loopsGraphCommand,
  loopsValidateCommand,
  loopsGroundednessCommand,
  loopDocumentCommand,
  loopRecordCommand,
  debtCommand,
  docCommand,
  tasksCommand,
  validateCommand,
  nextCommand,
  dispatchCommand,
  feedbackCommand,
  doctorCommand,
  auditCommand,
  acceptorCommand,
  tuneCommand,
  triggerCommand,
  gradeCommand,
  ratchetCommand,
  countersCommand,
  graphBuildCommand,
  graphQueryCommand,
  graphTriageCommand,
  graphImpactCommand,
  testCommand,
  projectProvisionCommand,
  importMilestoneCommand,
  migrateFolderCommand,
  notionSyncWorkCommand,
  notionAssociateCommand,
  runStartCommand,
  runCompleteCommand,
  runStatusCommand,
  itemStatusCommand,
  regressionGateCommand,
  runRetryCommand,
  resumeCommand,
  answerCommand,
  meshIdentityCommand,
  meshStatusCommand,
  meshHeartbeatCommand,
  meshRelayCommand,
  meshInviteCommand,
  meshJoinCommand,
  meshRevokeCommand,
  meshServeCommand,
  meshLogsCommand,
  meshTerminalResumeCommand,
  meshAssignCommand,
  meshRecoverPushCommand,
  meshRepoPublishCommand,
  meshUiCommand,
  meshDesktopInstallCommand,
  meshDesktopRunCommand,
  meshDesktopStopCommand,
  graphServeCommand,
  diagramPlanCommand,
  diagramExportCommand,
  diagramFileCommand,
  messagingInitCommand,
  messagingEnableCommand,
  messagingDisableCommand,
  messagingStatusCommand,
  workUiCommand,
  assetsUiCommand,
  findCommand,
  observeCommand,
  memoryCommand,
  useHeadroomCommand,
  unuseHeadroomCommand,
  workInitCommand,
  workInitConfigCommand,
  workUpdateCommand,
  workOrchestratorCommand,
  workDelegationCommand,
  workDelegationModelCommand,
  planningInitCommand,
  projectInitCommand,
  insertMilestoneCommand,
  insertUatCommand,
  insertStoryCommand,
  insertChoreCommand,
  promoteCommand,
  archiveCommand,
  promoteGapToChoreCommand,
  promoteFindingToChoreCommand,
  upgradeCommand,
  // work:continue — see ./commands/continue.mjs's header.
  continueCommand,
  // work:refine — m42 — see ./commands/continue.mjs's header.
  refineDoorCommand,
  verifyDoorCommand,
  // work:loop — see ./commands/loop.mjs's header.
  loopCommand,
  refineDriverCommand,
  continueDriverCommand,
  verifyDriverCommand,
  resyncCommand,
  assetsListCommand,
  packagesListCommand,
  projectShowCommand,
  assetsShowCommand,
  assetsAddCommand,
  assetsRemoveCommand,
  assetsUseCommand,
  assetsUnuseCommand,
  assetsCleanCommand,
  assetsValidateCommand,
  assetsApplyCommand,
  packagesShowCommand,
  packagesAddCommand,
  packagesRemoveCommand,
  packagesValidateCommand,
  packagesInstallCommand,
  projectValidateCommand,
  projectDoctorCommand,
  projectMigrateCommand,
];

// Keyed by id for O(1) lookup; insertion order preserved for listCommands().
const REGISTRY = new Map(COMMANDS.map((command) => [command.id, command]));

// The registry lookup both faces and the arch-tests use. A known id resolves to
// its command object; an unknown id resolves to undefined.
export function getCommand(id) {
  return REGISTRY.get(id);
}

// Every registered command (the full objects). The ADR-004 bijection arch-test
// asserts each carries a `cli` adapter and a reachable CLI dispatch branch.
export function listCommands() {
  return [...REGISTRY.values()];
}

// The in-process call both faces make: look up the command, await its run with
// the supplied input + ctx, and return the result VERBATIM (no projection — that
// is the caller/face's job). An unknown id is a programmer error: throw an Error
// naming the unknown id rather than silently returning undefined.
export async function invoke(id, input, ctx) {
  const command = REGISTRY.get(id);
  if (!command) {
    throw new Error(`Unknown command id "${id}".`);
  }
  return await command.run(input, ctx);
}
