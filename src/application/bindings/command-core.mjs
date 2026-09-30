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
import { createServerContribution } from "@aof/server/commands";
import { createResyncContribution } from "@aof/mesh/commands";
import { createWorkContribution } from "@aof/work/commands";
import { createWorkLoopContribution, createTriggerContribution, createDispatchContribution } from "@aof/work-loop/commands";
import { createWorkGraphContribution } from "@aof/work-graph/commands";
import { createKnowledgeContribution } from "@aof/knowledge/commands";
import { createCommandRegistry } from "@aof/contracts/commands";
// work:debt — see ./commands/debt.mjs's header.
import { debtCommand } from "@aof/work/commands/debt";
import { graphImpactCommand } from "@aof/knowledge/commands/graph-impact";
// project:provision — 12/ADR-003 — see ./commands/project-provision.mjs's header.
import { projectProvisionCommand } from "../../commands/project-provision.mjs";
import { createNotionContribution } from "@aof/integration-notion/commands";
import { useHeadroomCommand, unuseHeadroomCommand } from "../../commands/headroom.mjs";
// work:orchestrator / work:delegation / work:delegation-model — m42 — see ./commands/orchestrator-delegation.mjs's header.
import { workOrchestratorCommand, workDelegationCommand, workDelegationModelCommand } from "../../commands/orchestrator-delegation.mjs";
import { planningInitCommand } from "../../commands/planning-init.mjs";
import { assetsCleanCommand } from "../../commands/assets/clean.mjs";
import { packagesAddCommand } from "../../commands/packages-add.mjs";
import { packagesRemoveCommand } from "../../commands/packages-remove.mjs";

export function assembleCommandCore({ commandsMeshContributionServices, workServices, commandsListServices, commandsLoopsShowServices, commandsLoopsGraphServices, commandsLoopsValidateServices, commandsLoopsGroundednessServices, commandsLoopDocumentServices, commandsLoopRecordServices, commandsContinueServices, commandsDriveServices, commandsLoopServices, commandsResyncServices, commandsDocServices, commandsTasksServices, commandsValidateServices, commandsNextServices, commandsDispatchServices, commandsFeedbackServices, commandsDoctorServices, commandsAuditServices, commandsAcceptorServices, commandsTuneServices, commandsTriggerServices, commandsGradeServices, commandsRatchetServices, commandsCountersServices, commandsGraphBuildServices, commandsGraphQueryServices, commandsGraphTriageServices, commandsTestServices, commandsImportMilestoneServices, commandsMigrateFolderServices, commandsNotionSyncWorkServices, commandsNotionAssociateServices, commandsRunStartServices, commandsRunCompleteServices, commandsRunStatusServices, commandsItemStatusServices, commandsRegressionGateServices, commandsRunRetryServices, commandsResumeServices, commandsGraphServeServices, commandsDiagramPlanServices, commandsDiagramExportServices, commandsDiagramFileServices, commandsMessagingMessagingServices, commandsWorkUiServices, commandsAssetsUiServices, commandsFindServices, commandsObserveServices, commandsWorkMemoryServices, commandsInitUpdateServices, commandsProjectInitServices, commandsInsertMilestoneServices, commandsInsertUatServices, commandsInsertStoryServices, commandsInsertChoreServices, commandsPromoteServices, commandsArchiveServices, commandsPromoteGapToChoreServices, commandsPromoteFindingToChoreServices, commandsUpgradeServices, commandsAssetsListServices, commandsPackagesListServices, commandsProjectShowServices, commandsAssetsShowServices, commandsAssetsAddServices, commandsAssetsRemoveServices, commandsAssetsRefsServices, commandsAssetsValidateServices, commandsAssetsApplyServices, commandsPackagesShowServices, commandsPackagesValidateServices, commandsPackagesInstallServices, commandsProjectValidateServices, commandsProjectDoctorServices, commandsProjectMigrateServices }) {

  const { meshContribution } = commandsMeshContributionServices;
  const { loadWorkspace } = workServices;
  const { listCommand } = commandsListServices;
  const { loopsShowCommand } = commandsLoopsShowServices;
  const { loopsGraphCommand } = commandsLoopsGraphServices;
  const { loopsValidateCommand } = commandsLoopsValidateServices;
  const { createLoopsGroundednessCommand } = commandsLoopsGroundednessServices;
  // work:loop-document — 78/ADR-002, 52/FF-5201, chore 64, 52/FF-5202 — see ./commands/loop-document.mjs's header.
  const { loopDocumentCommand } = commandsLoopDocumentServices;
  // work:loop-record — 52/FF-5201, 78/ADR-008, 52/FF-5202 — see ./commands/loop-record.mjs's header.
  const { loopRecordCommand } = commandsLoopRecordServices;
  const { continueCommand } = commandsContinueServices;
  const { refineDoorCommand } = commandsContinueServices;
  const { verifyDoorCommand } = commandsContinueServices;
  // work:drive-refine / work:drive-continue / work:drive-verify — see ./commands/drive.mjs's header.
  const { refineDriverCommand } = commandsDriveServices;
  const { continueDriverCommand } = commandsDriveServices;
  const { verifyDriverCommand } = commandsDriveServices;
  const { loopCommand } = commandsLoopServices;
  // work:resync — m43 — see ./commands/resync.mjs's header.
  const { resyncCommand } = commandsResyncServices;

  const { docCommand } = commandsDocServices;
  const { tasksCommand } = commandsTasksServices;
  const { validateCommand } = commandsValidateServices;
  const { nextCommand } = commandsNextServices;
  // work:dispatch — see ./commands/dispatch.mjs's header.
  const { dispatchCommand } = commandsDispatchServices;
  const { feedbackCommand } = commandsFeedbackServices;
  // work:doctor — 15/ADR-001 — see ./commands/doctor.mjs's header.
  const { doctorCommand } = commandsDoctorServices;
  // work:audit — 66/ADR-004 §2, 54/ADR-003 §4, 59/ADR-008 §1 — see ./commands/audit.mjs's header.
  const { auditCommand } = commandsAuditServices;
  // work:acceptor — see ./commands/acceptor.mjs's header.
  const { acceptorCommand } = commandsAcceptorServices;
  // work:tune — see ./commands/tune.mjs's header.
  const { tuneCommand } = commandsTuneServices;
  // work:trigger — 63/ADR-001, 62/ADR-005 §1, 53/ADR-005, 63/ADR-008 §7, 59/ADR-008 §1 — see ./commands/trigger.mjs's header.
  const { triggerCommand } = commandsTriggerServices;
  // work:grade — 54/ADR-003 §2, 54/ADR-003 §4 — see ./commands/grade.mjs's header.
  const { gradeCommand } = commandsGradeServices;
  // work:ratchet — see ./commands/ratchet.mjs's header.
  const { ratchetCommand } = commandsRatchetServices;
  // work:counters — see ./commands/counters.mjs's header.
  const { countersCommand } = commandsCountersServices;
  // graph:build — see ./commands/graph/build.mjs's header.
  const { graphBuildCommand } = commandsGraphBuildServices;
  const { graphQueryCommand } = commandsGraphQueryServices;
  const { graphTriageCommand } = commandsGraphTriageServices;
  // graph:impact — see ./commands/graph/impact.mjs's header.

  // test — 72/ADR-008 §5, TECH_DEBT item 78, 72/ADR-002 §4, FF-7204 — see ./commands/test.mjs's header.
  const { testCommand } = commandsTestServices;

  // import:milestone — 13/ADR-002 — see ./commands/import-milestone.mjs's header.
  const { importMilestoneCommand } = commandsImportMilestoneServices;
  // migrate:folder — see ./commands/migrate-folder.mjs's header.
  const { migrateFolderCommand } = commandsMigrateFolderServices;
  // notion:sync-work — 17/ADR-002, 08/ADR-004 — see ./commands/notion-sync-work.mjs's header.

  const { notionSyncWorkCommand } = commandsNotionSyncWorkServices;
  // notion:associate — 18/ADR-003, 08/ADR-004 — see ./commands/notion-associate.mjs's header.
  const { notionAssociateCommand } = commandsNotionAssociateServices;
  // work:run-start — see ./commands/run-start.mjs's header.
  const { runStartCommand } = commandsRunStartServices;
  const { runCompleteCommand } = commandsRunCompleteServices;
  const { runStatusCommand } = commandsRunStatusServices;
  // work:status — see ./commands/item-status.mjs's header.
  const { itemStatusCommand } = commandsItemStatusServices;
  // work:regression-gate — see ./commands/regression-gate.mjs's header.
  const { regressionGateCommand } = commandsRegressionGateServices;
  // work:run-retry — m09, m19, m21, 08/ADR-004 — see ./commands/run-retry.mjs's header.
  const { runRetryCommand } = commandsRunRetryServices;
  // work:resume — see ./commands/resume.mjs's header.
  const { resumeCommand } = commandsResumeServices;
  const { answerCommand } = commandsResumeServices;
  // graph:serve — m42 — see ./commands/graph/serve.mjs's header.
  const { graphServeCommand } = commandsGraphServeServices;
  // diagram:plan — milestone 133 — see ./commands/diagram/plan.mjs's header.
  const { diagramPlanCommand } = commandsDiagramPlanServices;
  // diagram:export — milestone 133 — see ./commands/diagram/export.mjs's header.
  const { diagramExportCommand } = commandsDiagramExportServices;
  // diagram:file — milestone 133 — see ./commands/diagram/file.mjs's header.
  const { diagramFileCommand } = commandsDiagramFileServices;
  // messaging:init / messaging:enable / messaging:disable / messaging:status / messaging:test — 131/08 — see ./commands/messaging/messaging.mjs's header.
  const { messagingContribution } = commandsMessagingMessagingServices;
  const { workUiCommand } = commandsWorkUiServices;
  const { assetsUiCommand } = commandsAssetsUiServices;
  // work:find — m42, m12 — see ./commands/find.mjs's header.
  const { findCommand } = commandsFindServices;
  const { observeCommand } = commandsObserveServices;
  // work:memory — story 128, 05/ADR-003, 05/ADR-004 — see ./commands/work/memory.mjs's header.
  const { memoryCommand } = commandsWorkMemoryServices;

  // work:init / work:init-config / work:update — chore 51 — see ./commands/init-update.mjs's header.
  const { workInitCommand } = commandsInitUpdateServices;
  const { workInitConfigCommand } = commandsInitUpdateServices;
  const { workUpdateCommand } = commandsInitUpdateServices;

  const { projectInitCommand } = commandsProjectInitServices;
  // work:insert-milestone — 08/ADR-004 — see ./commands/insert-milestone.mjs's header.
  const { insertMilestoneCommand } = commandsInsertMilestoneServices;
  const { insertUatCommand } = commandsInsertUatServices;
  // work:insert-story — see ./commands/insert-story.mjs's header.
  const { insertStoryCommand } = commandsInsertStoryServices;
  // work:insert-chore — see ./commands/insert-chore.mjs's header.
  const { insertChoreCommand } = commandsInsertChoreServices;
  // work:promote — milestone 127 / ADR-003 — see ./commands/promote.mjs's header.
  const { promoteCommand } = commandsPromoteServices;
  // work:archive — milestone 127 / ADR-004 — see ./commands/archive.mjs's header.
  const { archiveCommand } = commandsArchiveServices;
  const { promoteGapToChoreCommand } = commandsPromoteGapToChoreServices;
  // work:promote-finding — see ./commands/promote-finding-to-chore.mjs's header.
  const { promoteFindingToChoreCommand } = commandsPromoteFindingToChoreServices;
  // work:upgrade — see ./commands/upgrade.mjs's header.
  const { upgradeCommand } = commandsUpgradeServices;
  // assets:list — m42 — see ./commands/assets/list.mjs's header.
  const { assetsListCommand } = commandsAssetsListServices;
  const { packagesListCommand } = commandsPackagesListServices;
  const { projectShowCommand } = commandsProjectShowServices;
  // assets:show — m42 — see ./commands/assets/show.mjs's header.
  const { assetsShowCommand } = commandsAssetsShowServices;
  const { assetsAddCommand } = commandsAssetsAddServices;
  const { assetsRemoveCommand } = commandsAssetsRemoveServices;
  const { assetsUseCommand } = commandsAssetsRefsServices;
  const { assetsUnuseCommand } = commandsAssetsRefsServices;

  const { assetsValidateCommand } = commandsAssetsValidateServices;
  const { assetsApplyCommand } = commandsAssetsApplyServices;
  const { packagesShowCommand } = commandsPackagesShowServices;

  const { packagesValidateCommand } = commandsPackagesValidateServices;
  const { packagesInstallCommand } = commandsPackagesInstallServices;
  const { projectValidateCommand } = commandsProjectValidateServices;
  const { projectDoctorCommand } = commandsProjectDoctorServices;
  const { projectMigrateCommand } = commandsProjectMigrateServices;

  // The registry is the ONLY door (ADR-004 inv. 3): the faces obtain the
  // `ctx.workspace` they pass to `invoke` THROUGH the registry, never by importing
  // `work.mjs` directly. Re-exporting `loadWorkspace` here keeps board-ui.mjs's
  // (and the CLI's) sole operation-bearing import the command core.

  const loopsGroundednessCommand = createLoopsGroundednessCommand({
    hasCommand: (id) => REGISTRY.hasCommand(id),
  });

  // Core assembles feature-owned contributions. Ordered groups retain the existing
  // command/help order while the remaining domains are extracted incrementally.
  const CONTRIBUTIONS = [
    createWorkContribution([
      listCommand,
    ]),
    createWorkGraphContribution({ show: loopsShowCommand, graph: loopsGraphCommand, validate: loopsValidateCommand, groundedness: loopsGroundednessCommand, document: loopDocumentCommand, record: loopRecordCommand }),
    createWorkContribution([
      debtCommand,
      docCommand,
      tasksCommand,
      validateCommand,
      nextCommand,
    ]),
    createDispatchContribution(dispatchCommand),
    createWorkContribution([
      feedbackCommand,
      doctorCommand,
      auditCommand,
      acceptorCommand,
      tuneCommand,
    ]),
    createTriggerContribution(triggerCommand),
    createWorkContribution([
      gradeCommand,
      ratchetCommand,
      countersCommand,
    ]),
    createKnowledgeContribution([
      graphBuildCommand,
      graphQueryCommand,
      graphTriageCommand,
      graphImpactCommand,
    ]),
    createWorkContribution([
      testCommand,
    ]),
    { name: "aof", commands: [
      projectProvisionCommand,
    ] },
    createKnowledgeContribution([
      importMilestoneCommand,
    ]),
    createWorkContribution([migrateFolderCommand]),
    createNotionContribution({ syncWork: notionSyncWorkCommand, associate: notionAssociateCommand }),
    createWorkContribution([
      runStartCommand,
      runCompleteCommand,
      runStatusCommand,
      itemStatusCommand,
      regressionGateCommand,
      runRetryCommand,
      resumeCommand,
      answerCommand,
    ]),
    meshContribution,
    createKnowledgeContribution([
      graphServeCommand,
    ]),
    createWorkContribution([diagramPlanCommand, diagramExportCommand, diagramFileCommand]),
    messagingContribution,
    createServerContribution(workUiCommand),
    { name: "aof", commands: [assetsUiCommand] },
    createWorkContribution([
      findCommand,
      observeCommand,
    ]),
    createKnowledgeContribution([
      memoryCommand,
    ]),
    { name: "aof", commands: [
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
    ] },
    createWorkContribution([
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
    ]),
    createWorkLoopContribution({ loop: loopCommand, refine: refineDriverCommand, continue: continueDriverCommand, verify: verifyDriverCommand }),
    createResyncContribution(resyncCommand),
    { name: "aof", commands: [
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
    ] },
  ];

  // Keyed by id for O(1) lookup; insertion order preserved for listCommands().
  const REGISTRY = createCommandRegistry(CONTRIBUTIONS);

  // The registry lookup both faces and the arch-tests use. A known id resolves to
  // its command object; an unknown id resolves to undefined.
  function getCommand(id) {
    return REGISTRY.getCommand(id);
  }

  // Every registered command (the full objects). The ADR-004 bijection arch-test
  // asserts each carries a `cli` adapter and a reachable CLI dispatch branch.
  function listCommands() {
    return REGISTRY.listCommands();
  }

  // The in-process call both faces make: look up the command, await its run with
  // the supplied input + ctx, and return the result VERBATIM (no projection — that
  // is the caller/face's job). An unknown id is a programmer error: throw an Error
  // naming the unknown id rather than silently returning undefined.
  async function invoke(id, input, ctx) {
    return await REGISTRY.invoke(id, input, ctx);
  }

  return { loadWorkspace, getCommand, listCommands, invoke };
}
