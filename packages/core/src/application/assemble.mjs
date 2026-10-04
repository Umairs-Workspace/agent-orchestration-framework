// Explicit first-party construction order. No factory receives the whole application.
import { createBaseServices } from './base.mjs';
import { createApplicationLifetime } from './lifetime.mjs';
import { assembleGlobalWorkStore } from './bindings/global-work-store.mjs';
import { assembleBoardMeshExecution } from './bindings/board-mesh-execution.mjs';
import { assembleDsl } from './bindings/dsl.mjs';
import { assembleConfigInspect } from './bindings/config-inspect.mjs';
import { assembleConfigEditor } from './bindings/config-editor.mjs';
import { assembleBoardUi } from './bindings/board-ui.mjs';
import { assembleTerminalSessions } from './bindings/terminal-sessions.mjs';
import { assembleTerminalWs } from './bindings/terminal-ws.mjs';
import { assembleSetupUi } from './bindings/setup-ui.mjs';
import { assembleBoardServe } from './bindings/board-serve.mjs';
import { assembleCacheRead } from './bindings/cache-read.mjs';
import { assembleWorkLoops } from './bindings/work/loops.mjs';
import { assembleWorkAcceptorCriterion } from './bindings/work-acceptor/criterion.mjs';
import { assembleMeshWorktree } from './bindings/mesh/worktree.mjs';
import { assembleEffectsJournal } from './bindings/effects/journal.mjs';
import { assembleWorkAcceptorObservations } from './bindings/work-acceptor/observations.mjs';
import { assembleEffectsTable } from './bindings/effects/table.mjs';
import { assembleEffectsDispatch } from './bindings/effects/dispatch.mjs';
import { assembleWorkAcceptorStore } from './bindings/work-acceptor/store.mjs';
import { assembleEffectsHarnessTransitions } from './bindings/effects/harness-transitions.mjs';
import { assembleCommandsAcceptor } from './bindings/commands/acceptor.mjs';
import { assembleRunStore } from './bindings/run-store.mjs';
import { assembleWorkContentRead } from './bindings/work/content-read.mjs';
import { assembleLoopStopRequest } from './bindings/loop/stop-request.mjs';
import { assembleMeshPresence } from './bindings/mesh/presence.mjs';
import { assembleGlobalNodeRegistry } from './bindings/global-node-registry.mjs';
import { assembleGlobalWorkPublisher } from './bindings/global-work-publisher.mjs';
import { assembleItemLock } from './bindings/item-lock.mjs';
import { assembleEffectsStreamTransitions } from './bindings/effects/stream-transitions.mjs';
import { assembleCommandsArchive } from './bindings/commands/archive.mjs';
import { assembleWorkAuditCensus } from './bindings/work-audit/census.mjs';
import { assembleWorkAuditEvidence } from './bindings/work-audit/evidence.mjs';
import { assembleWorkAuditPromptLayer } from './bindings/work-audit/prompt-layer.mjs';
import { assembleWorkAuditSeamLiveness } from './bindings/work-audit/seam-liveness.mjs';
import { assembleWorkAuditDeclaredBounds } from './bindings/work-audit/declared-bounds.mjs';
import { assembleWorkAuditReport } from './bindings/work-audit/report.mjs';
import { assembleCommandsAudit } from './bindings/commands/audit.mjs';
import { assembleWorkRead } from './bindings/work/read.mjs';
import { assembleEffectsOutbox } from './bindings/effects/outbox.mjs';
import { assembleEffectsAssignmentTransitions } from './bindings/effects/assignment-transitions.mjs';
import { assembleMeshAssignment } from './bindings/mesh/assignment.mjs';
import { assembleCommandsResolve } from './bindings/commands/resolve.mjs';
import { assembleEffectsItemTransitions } from './bindings/effects/item-transitions.mjs';
import { assembleCommandsContinue } from './bindings/commands/continue.mjs';
import { assembleRunHeartbeatConsumption } from './bindings/run-heartbeat-consumption.mjs';
import { assembleEffectsRunTransitions } from './bindings/effects/run-transitions.mjs';
import { assembleCommandsRunRetry } from './bindings/commands/run-retry.mjs';
import { assembleCommandsCounters } from './bindings/commands/counters.mjs';
import { assembleDiagramsRasterize } from './bindings/diagrams/rasterize.mjs';
import { assembleCommandsDiagramExport } from './bindings/commands/diagram/export.mjs';
import { assembleCommandsDiagramFile } from './bindings/commands/diagram/file.mjs';
import { assembleCommandsDiagramPlan } from './bindings/commands/diagram/plan.mjs';
import { assembleMeshLauncherLock } from './bindings/mesh/launcher-lock.mjs';
import { assembleWorkDispatch } from './bindings/work/dispatch.mjs';
import { assembleCommandsDispatch } from './bindings/commands/dispatch.mjs';
import { assembleCommandsDoc } from './bindings/commands/doc.mjs';
import { assembleWorkDoctorDiagrams } from './bindings/work/doctor-diagrams.mjs';
import { assembleWorkDoctor } from './bindings/work/doctor.mjs';
import { assembleWorkDoctorExamples } from './bindings/work/doctor-examples.mjs';
import { assembleEffectsReconcile } from './bindings/effects/reconcile.mjs';
import { assembleCommandsDoctor } from './bindings/commands/doctor.mjs';
import { assembleLoopAskRequest } from './bindings/loop/ask-request.mjs';
import { assembleRunSessionCapture } from './bindings/run-session-capture.mjs';
import { assembleRunSpendIngest } from './bindings/run-spend-ingest.mjs';
import { assembleCommandsDrive } from './bindings/commands/drive.mjs';
import { assembleEffectsDocTransitions } from './bindings/effects/doc-transitions.mjs';
import { assembleCommandsFeedback } from './bindings/commands/feedback.mjs';
import { assembleCommandsFind } from './bindings/commands/find.mjs';
import { assembleCommandsGrade } from './bindings/commands/grade.mjs';
import { assembleGraphify } from './bindings/graphify.mjs';
import { assembleCommandsGraphBuild } from './bindings/commands/graph/build.mjs';
import { assembleCommandsGraphQuery } from './bindings/commands/graph/query.mjs';
import { assembleGraphMcpServer } from './bindings/graph-mcp-server.mjs';
import { assembleCommandsGraphServe } from './bindings/commands/graph/serve.mjs';
import { assembleCommandsGraphTriage } from './bindings/commands/graph/triage.mjs';
import { assembleImportStore } from './bindings/import/store.mjs';
import { assembleImportRecovery } from './bindings/import/recovery.mjs';
import { assembleImportMaterialize } from './bindings/import/materialize.mjs';
import { assembleWorkMemory } from './bindings/work/memory.mjs';
import { assembleCommandsImportMilestone } from './bindings/commands/import-milestone.mjs';
import { assembleCommandsInsertShared } from './bindings/commands/insert-shared.mjs';
import { assembleCommandsPromote } from './bindings/commands/promote.mjs';
import { assembleCommandsInsertChore } from './bindings/commands/insert-chore.mjs';
import { assembleCommandsInsertMilestone } from './bindings/commands/insert-milestone.mjs';
import { assembleCommandsInsertStory } from './bindings/commands/insert-story.mjs';
import { assembleCommandsInsertUat } from './bindings/commands/insert-uat.mjs';
import { assembleNotifySecret } from './bindings/notify/secret.mjs';
import { assembleNotifyAskMessages } from './bindings/notify/ask-messages.mjs';
import { assembleNotifyNotify } from './bindings/notify/notify.mjs';
import { assembleCommandsItemStatus } from './bindings/commands/item-status.mjs';
import { assembleCommandsList } from './bindings/commands/list.mjs';
import { assembleCommandsLoopDocument } from './bindings/commands/loop-document.mjs';
import { assembleCommandsLoopRecord } from './bindings/commands/loop-record.mjs';
import { assembleLoopProgress } from './bindings/loop-progress.mjs';
import { assembleLoopChildDrive } from './bindings/loop/child-drive.mjs';
import { assembleLoopAsk } from './bindings/loop/ask.mjs';
import { assembleLoopCycle } from './bindings/loop/cycle.mjs';
import { assembleLoopWave } from './bindings/loop/wave.mjs';
import { assembleLoopDiag } from './bindings/loop-diag.mjs';
import { assembleLoopStop } from './bindings/loop/stop.mjs';
import { assembleCommandsLoop } from './bindings/commands/loop.mjs';
import { assembleCommandsLoopsGraph } from './bindings/commands/loops-graph.mjs';
import { assembleCommandsLoopsGroundedness } from './bindings/commands/loops-groundedness.mjs';
import { assembleCommandsLoopsShow } from './bindings/commands/loops-show.mjs';
import { assembleCommandsLoopsValidate } from './bindings/commands/loops-validate.mjs';
import { assembleCommandsMeshAssign } from './bindings/commands/mesh/assign.mjs';
import { assembleMeshRegistry } from './bindings/mesh/registry.mjs';
import { assembleCommandsMeshIdentity } from './bindings/commands/mesh/identity.mjs';
import { assembleCommandsMeshHeartbeat } from './bindings/commands/mesh/heartbeat.mjs';
import { assembleMeshRelay } from './bindings/mesh/relay.mjs';
import { assembleCommandsMeshRelay } from './bindings/commands/mesh/relay.mjs';
import { assembleCommandsMeshInvite } from './bindings/commands/mesh/invite.mjs';
import { assembleCommandsMeshJoin } from './bindings/commands/mesh/join.mjs';
import { assembleCommandsMeshRevoke } from './bindings/commands/mesh/revoke.mjs';
import { assembleMeshTerminalRelayBridge } from './bindings/mesh/terminal-relay-bridge.mjs';
import { assembleMeshRecoveryPush } from './bindings/mesh/recovery-push.mjs';
import { assembleMeshResync } from './bindings/mesh/resync.mjs';
import { assembleWorkerStreamClient } from './bindings/worker-stream-client.mjs';
import { assembleMeshRelayClient } from './bindings/mesh/relay-client.mjs';
import { assembleControlStreamServer } from './bindings/control-stream-server.mjs';
import { assembleMeshParkResume } from './bindings/mesh/park-resume.mjs';
import { assembleMeshWorkerLaunch } from './bindings/mesh/worker-launch.mjs';
import { assembleMeshWorkerRepoAdmission } from './bindings/mesh/worker-repo-admission.mjs';
import { assembleMeshWorkerExecution } from './bindings/mesh/worker-execution.mjs';
import { assembleMeshSessionSpawnHandler } from './bindings/mesh/session-spawn-handler.mjs';
import { assembleMeshTerminalMirror } from './bindings/mesh/terminal-mirror.mjs';
import { assembleMeshTerminalInput } from './bindings/mesh/terminal-input.mjs';
import { assembleMeshAssignmentReclaim } from './bindings/mesh/assignment-reclaim.mjs';
import { assembleMeshCloneCredentialProvider } from './bindings/mesh/clone-credential-provider.mjs';
import { assembleMeshLauncher } from './bindings/mesh/launcher.mjs';
import { assembleCommandsMeshServe } from './bindings/commands/mesh/serve.mjs';
import { assembleCommandsMeshLogs } from './bindings/commands/mesh/logs.mjs';
import { assembleCommandsMeshTerminalResume } from './bindings/commands/mesh/terminal-resume.mjs';
import { assembleCommandsMeshRecoverPush } from './bindings/commands/mesh/recover-push.mjs';
import { assembleCommandsMeshRepo } from './bindings/commands/mesh/repo.mjs';
import { assembleGlobalMeshQuery } from './bindings/global-mesh-query.mjs';
import { assembleMeshUiServe } from './bindings/mesh/ui-serve.mjs';
import { assembleCommandsMeshUi } from './bindings/commands/mesh/ui.mjs';
import { assembleCommandsMeshDesktopPreflight } from './bindings/commands/mesh/desktop-preflight.mjs';
import { assembleCommandsMeshDesktop } from './bindings/commands/mesh/desktop.mjs';
import { assembleCommandsMeshContribution } from './bindings/commands/mesh/contribution.mjs';
import { assembleCommandsMessagingMessaging } from './bindings/commands/messaging/messaging.mjs';
import { assembleCommandsMigrateFolder } from './bindings/commands/migrate-folder.mjs';
import { assembleCommandsNext } from './bindings/commands/next.mjs';
import { assembleIntegrationsRouting } from './bindings/integrations/routing.mjs';
import { assembleCommandsNotionAssociate } from './bindings/commands/notion-associate.mjs';
import { assembleNotionMapping } from './bindings/notion/mapping.mjs';
import { assembleNotionSync } from './bindings/notion/sync.mjs';
import { assembleNotionCli } from './bindings/notion/cli.mjs';
import { assembleNotionSyncWork } from './bindings/notion/sync-work.mjs';
import { assembleCommandsNotionSyncWork } from './bindings/commands/notion-sync-work.mjs';
import { assembleCommandsObserve } from './bindings/commands/observe.mjs';
import { assembleCommandsPromoteFindingToChore } from './bindings/commands/promote-finding-to-chore.mjs';
import { assembleCommandsPromoteGapToChore } from './bindings/commands/promote-gap-to-chore.mjs';
import { assembleCommandsRatchet } from './bindings/commands/ratchet.mjs';
import { assembleWorkTestSelect } from './bindings/work/test-select.mjs';
import { assembleWorkTestChanged } from './bindings/work/test-changed.mjs';
import { assembleWorkToolchain } from './bindings/work/toolchain.mjs';
import { assembleCommandsTest } from './bindings/commands/test.mjs';
import { assembleCommandsRegressionGate } from './bindings/commands/regression-gate.mjs';
import { assembleCommandsResume } from './bindings/commands/resume.mjs';
import { assembleCommandsResync } from './bindings/commands/resync.mjs';
import { assembleCommandsRunComplete } from './bindings/commands/run-complete.mjs';
import { assembleCommandsRunStart } from './bindings/commands/run-start.mjs';
import { assembleCommandsRunStatus } from './bindings/commands/run-status.mjs';
import { assembleCommandsTasks } from './bindings/commands/tasks.mjs';
import { assembleWorkTriggerDeclaration } from './bindings/work-trigger/declaration.mjs';
import { assembleCommandsTrigger } from './bindings/commands/trigger.mjs';
import { assembleMemoryLocalIndexing } from './bindings/memory/local-indexing.mjs';
import { assembleWorkTuneCorpus } from './bindings/work-tune/corpus.mjs';
import { assembleWorkTuneProposal } from './bindings/work-tune/proposal.mjs';
import { assembleCommandsTune } from './bindings/commands/tune.mjs';
import { assembleWorkUpgrade } from './bindings/work/upgrade.mjs';
import { assembleCommandsUpgrade } from './bindings/commands/upgrade.mjs';
import { assembleCommandsValidate } from './bindings/commands/validate.mjs';
import { assembleCommandsWorkMemory } from './bindings/commands/work/memory.mjs';
import { assembleCommandsWorkUi } from './bindings/commands/work-ui.mjs';
import { assembleDiscordCommands } from './bindings/discord/commands.mjs';
import { assembleDiscordGateway } from './bindings/discord/gateway.mjs';
import { assembleDiscordReplies } from './bindings/discord/replies.mjs';
import { assembleDiscordBot } from './bindings/discord/bot.mjs';
import { assembleMemoryGraphifyBackend } from './bindings/memory/graphify-backend.mjs';
import { assembleMemoryLocalBackend } from './bindings/memory/local-backend.mjs';
import { assembleMeshDeclarations } from './bindings/mesh/declarations.mjs';
import { assembleStoryContractDerive } from './bindings/story-contract-derive.mjs';
import { assembleWorkExamplesAnswers } from './bindings/work-examples/answers.mjs';
import { assembleWorkInit } from './bindings/work/init.mjs';
import { assembleCommandsInitUpdate } from './bindings/commands/init-update.mjs';
import { assembleCommandsAssetsUi } from './bindings/commands/assets/ui.mjs';
import { assembleSpineFace } from './bindings/spine/face.mjs';
import { assembleScaffold } from './bindings/scaffold.mjs';
import { assembleCommandsAssetsShow } from './bindings/commands/assets/show.mjs';
import { assembleCommandsAssetsRemove } from './bindings/commands/assets/remove.mjs';
import { assembleCommandsAssetsAdd } from './bindings/commands/assets/add.mjs';
import { assembleCommandsValidateShared } from './bindings/commands/validate-shared.mjs';
import { assembleCommandsAssetsApply } from './bindings/commands/assets/apply.mjs';
import { assembleCommandsAssetsList } from './bindings/commands/assets/list.mjs';
import { assembleCommandsAssetsRefs } from './bindings/commands/assets/refs.mjs';
import { assembleCommandsPackagesInstall } from './bindings/commands/packages-install.mjs';
import { assembleCommandsPackagesList } from './bindings/commands/packages-list.mjs';
import { assembleCommandsPackagesShow } from './bindings/commands/packages-show.mjs';
import { assembleCommandsProjectDoctor } from './bindings/commands/project-doctor.mjs';
import { assembleWorkspaceWriter } from './bindings/workspace-writer.mjs';
import { assembleCommandsProjectMigrate } from './bindings/commands/project-migrate.mjs';
import { assembleCommandsProjectShow } from './bindings/commands/project-show.mjs';
import { assembleSync } from './bindings/sync.mjs';
import { assembleCommandsAssetsValidate } from './bindings/commands/assets/validate.mjs';
import { assembleCommandsPackagesValidate } from './bindings/commands/packages-validate.mjs';
import { assembleCommandsProjectInit } from './bindings/commands/project-init.mjs';
import { assembleCommandsProjectValidate } from './bindings/commands/project-validate.mjs';
import { assembleCommandCore } from './bindings/command-core.mjs';

export function assembleApplication({ env = process.env, base = createBaseServices({ env }) } = {}) {
  const lifetime = createApplicationLifetime();
  const { workspace, diagnosticsLog, degrade, claudeTrust, workObserve, terminalProviders, terminalScreen, terminalSessionScreen, agentSessionDriver, fs, workDigestTemplate, work, meshStore, meshSession, commandsMeshSession } = base;
  // Transports and recursive work operations may invoke the registry after registration.
  const commandPort = {
    invoke: (...args) => { lifetime.assertReady(); return commandCore.invoke(...args); },
    getCommand: (...args) => { lifetime.assertReady(); return commandCore.getCommand(...args); },
    listCommands: (...args) => { lifetime.assertReady(); return commandCore.listCommands(...args); },
    loadWorkspace: (...args) => { lifetime.assertReady(); return work.loadWorkspace(...args); },
  };
  const globalWorkStore = assembleGlobalWorkStore({ workspaceServices: workspace, workServices: work, degradeServices: degrade });
  globalWorkStore.openGlobalWorkProjectionStore = lifetime.open(globalWorkStore.openGlobalWorkProjectionStore);
  const boardMeshExecution = assembleBoardMeshExecution({ globalWorkStoreServices: globalWorkStore, workspaceServices: workspace, degradeServices: degrade });
  const dsl = assembleDsl({ fsServices: fs, workspaceServices: workspace });
  const configInspect = assembleConfigInspect({ dslServices: dsl, fsServices: fs, workspaceServices: workspace, degradeServices: degrade });
  const configEditor = assembleConfigEditor({ configInspectServices: configInspect, dslServices: dsl, fsServices: fs, workspaceServices: workspace });
  const boardUi = assembleBoardUi({ commandCoreServices: commandPort });
  const terminalSessions = assembleTerminalSessions({ degradeServices: degrade });
  const terminalWs = assembleTerminalWs({ workServices: work, claudeTrustServices: claudeTrust, terminalProvidersServices: terminalProviders, terminalSessionsServices: terminalSessions, degradeServices: degrade });
  const setupUi = assembleSetupUi({ configEditorServices: configEditor, boardUiServices: boardUi, terminalWsServices: terminalWs });
  setupUi.serveSetupUi = lifetime.server(setupUi.serveSetupUi);
  const boardServe = assembleBoardServe({ setupUiServices: setupUi, claudeTrustServices: claudeTrust });
  const cacheRead = assembleCacheRead({ globalWorkStoreServices: globalWorkStore, workspaceServices: workspace, degradeServices: degrade });
  const workLoops = assembleWorkLoops({  });
  const workAcceptorCriterion = assembleWorkAcceptorCriterion({  });
  const meshWorktree = assembleMeshWorktree({ degradeServices: degrade, workServices: work, provideWorkToolchain: async () => { lifetime.assertReady(); return workToolchain; } });
  const effectsJournal = assembleEffectsJournal({ workspaceServices: workspace, degradeServices: degrade });
  effectsJournal.openEffectsJournal = lifetime.open(effectsJournal.openEffectsJournal);
  const workAcceptorObservations = assembleWorkAcceptorObservations({ meshWorktreeServices: meshWorktree, effectsJournalServices: effectsJournal });
  const effectsTable = assembleEffectsTable({ degradeServices: degrade, provideWork: async () => { lifetime.assertReady(); return work; }, provideRunStore: async () => { lifetime.assertReady(); return runStore; }, provideWorkAcceptorStore: async () => { lifetime.assertReady(); return workAcceptorStore; }, provideGlobalWorkPublisher: async () => { lifetime.assertReady(); return globalWorkPublisher; }, provideGlobalWorkStore: async () => { lifetime.assertReady(); return globalWorkStore; }, provideEffectsAssignmentTransitions: async () => { lifetime.assertReady(); return effectsAssignmentTransitions; }, provideMeshParkResume: async () => { lifetime.assertReady(); return meshParkResume; }, provideNotionSyncWork: async () => { lifetime.assertReady(); return notionSyncWork; }, provideNotionMapping: async () => { lifetime.assertReady(); return notionMapping; } });
  const effectsDispatch = assembleEffectsDispatch({ effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, degradeServices: degrade });
  const workAcceptorStore = assembleWorkAcceptorStore({ workAcceptorCriterionServices: workAcceptorCriterion });
  const effectsHarnessTransitions = assembleEffectsHarnessTransitions({ effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, degradeServices: degrade, workAcceptorStoreServices: workAcceptorStore });
  const commandsAcceptor = assembleCommandsAcceptor({ workLoopsServices: workLoops, workAcceptorCriterionServices: workAcceptorCriterion, workAcceptorObservationsServices: workAcceptorObservations, effectsJournalServices: effectsJournal, effectsHarnessTransitionsServices: effectsHarnessTransitions });
  const runStore = assembleRunStore({ degradeServices: degrade, provideWorkExamplesAnswers: async () => { lifetime.assertReady(); return workExamplesAnswers; } });
  const workContentRead = assembleWorkContentRead({ runStoreServices: runStore });
  const loopStopRequest = assembleLoopStopRequest({ workspaceServices: workspace, degradeServices: degrade });
  const meshPresence = assembleMeshPresence({ meshStoreServices: meshStore, runStoreServices: runStore, loopStopRequestServices: loopStopRequest, meshSessionServices: meshSession, globalWorkStoreServices: globalWorkStore, workspaceServices: workspace });
  const globalNodeRegistry = assembleGlobalNodeRegistry({ workspaceServices: workspace, meshStoreServices: meshStore, meshPresenceServices: meshPresence, degradeServices: degrade });
  const globalWorkPublisher = assembleGlobalWorkPublisher({ workspaceServices: workspace, globalWorkStoreServices: globalWorkStore, workContentReadServices: workContentRead, globalNodeRegistryServices: globalNodeRegistry, degradeServices: degrade });
  const itemLock = assembleItemLock({ workspaceServices: workspace, globalWorkStoreServices: globalWorkStore, globalWorkPublisherServices: globalWorkPublisher });
  const effectsStreamTransitions = assembleEffectsStreamTransitions({ itemLockServices: itemLock, effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, degradeServices: degrade });
  const commandsArchive = assembleCommandsArchive({ effectsStreamTransitionsServices: effectsStreamTransitions });
  const workAuditCensus = assembleWorkAuditCensus({  });
  const workAuditEvidence = assembleWorkAuditEvidence({  });
  const workAuditPromptLayer = assembleWorkAuditPromptLayer({  });
  const workAuditSeamLiveness = assembleWorkAuditSeamLiveness({ workAuditCensusServices: workAuditCensus });
  const workAuditDeclaredBounds = assembleWorkAuditDeclaredBounds({  });
  const workAuditReport = assembleWorkAuditReport({ workAuditCensusServices: workAuditCensus, workAuditEvidenceServices: workAuditEvidence, workAuditPromptLayerServices: workAuditPromptLayer, workAuditSeamLivenessServices: workAuditSeamLiveness, workAuditDeclaredBoundsServices: workAuditDeclaredBounds });
  const commandsAudit = assembleCommandsAudit({ workLoopsServices: workLoops, workAuditReportServices: workAuditReport, workAuditPromptLayerServices: workAuditPromptLayer, workAuditDeclaredBoundsServices: workAuditDeclaredBounds });
  const workRead = assembleWorkRead({ cacheReadServices: cacheRead, degradeServices: degrade, meshWorktreeServices: meshWorktree });
  const effectsOutbox = assembleEffectsOutbox({ effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, degradeServices: degrade });
  const effectsAssignmentTransitions = assembleEffectsAssignmentTransitions({ effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, effectsOutboxServices: effectsOutbox, degradeServices: degrade });
  const meshAssignment = assembleMeshAssignment({ globalWorkStoreServices: globalWorkStore, workReadServices: workRead, effectsAssignmentTransitionsServices: effectsAssignmentTransitions, itemLockServices: itemLock });
  const commandsResolve = assembleCommandsResolve({ workReadServices: workRead, runStoreServices: runStore });
  const effectsItemTransitions = assembleEffectsItemTransitions({ workServices: work, effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, degradeServices: degrade });
  const workDoctorExamples = assembleWorkDoctorExamples({ configInspectServices: configInspect });
  const commandsContinue = assembleCommandsContinue({ meshAssignmentServices: meshAssignment, commandsResolveServices: commandsResolve, effectsItemTransitionsServices: effectsItemTransitions, boardMeshExecutionServices: boardMeshExecution, cacheReadServices: cacheRead, configInspectServices: configInspect, workDoctorExamplesServices: workDoctorExamples, provideWorkExamplesAnswers: async () => { lifetime.assertReady(); return workExamplesAnswers; } });
  const runHeartbeatConsumption = assembleRunHeartbeatConsumption({ degradeServices: degrade, runStoreServices: runStore });
  const effectsRunTransitions = assembleEffectsRunTransitions({ runStoreServices: runStore, runHeartbeatConsumptionServices: runHeartbeatConsumption, effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, degradeServices: degrade, itemLockServices: itemLock, workObserveServices: workObserve });
  const commandsRunRetry = assembleCommandsRunRetry({ commandsResolveServices: commandsResolve, effectsRunTransitionsServices: effectsRunTransitions, itemLockServices: itemLock });
  const commandsCounters = assembleCommandsCounters({ runStoreServices: runStore, commandsResolveServices: commandsResolve, commandsRunRetryServices: commandsRunRetry });
  const diagramsRasterize = assembleDiagramsRasterize({ degradeServices: degrade });
  const commandsDiagramExport = assembleCommandsDiagramExport({ configInspectServices: configInspect, commandsResolveServices: commandsResolve, diagramsRasterizeServices: diagramsRasterize });
  const commandsDiagramFile = assembleCommandsDiagramFile({ commandsResolveServices: commandsResolve });
  const meshLauncherLock = assembleMeshLauncherLock({ workspaceServices: workspace, degradeServices: degrade });
  const workDispatch = assembleWorkDispatch({ meshWorktreeServices: meshWorktree, workServices: work, degradeServices: degrade, meshLauncherLockServices: meshLauncherLock });
  const commandsDiagramPlan = assembleCommandsDiagramPlan({ configInspectServices: configInspect, commandsResolveServices: commandsResolve, workDispatchServices: workDispatch });
  const commandsDispatch = assembleCommandsDispatch({ workReadServices: workRead, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, workDispatchServices: workDispatch });
  const commandsDoc = assembleCommandsDoc({ commandsResolveServices: commandsResolve, cacheReadServices: cacheRead, workReadServices: workRead });
  const workDoctorDiagrams = assembleWorkDoctorDiagrams({ configInspectServices: configInspect });
  const workDoctor = assembleWorkDoctor({ runStoreServices: runStore, workDoctorDiagramsServices: workDoctorDiagrams, workDoctorExamplesServices: workDoctorExamples, configInspectServices: configInspect, provideWorkExamplesAnswers: async () => { lifetime.assertReady(); return workExamplesAnswers; } });
  const effectsReconcile = assembleEffectsReconcile({ workServices: work, runStoreServices: runStore, effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, degradeServices: degrade });
  const commandsDoctor = assembleCommandsDoctor({ workDoctorServices: workDoctor, cacheReadServices: cacheRead, workReadServices: workRead, effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, effectsReconcileServices: effectsReconcile, workObserveServices: workObserve, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const loopAskRequest = assembleLoopAskRequest({ workspaceServices: workspace, degradeServices: degrade });
  const runSessionCapture = assembleRunSessionCapture({ runStoreServices: runStore, degradeServices: degrade });
  const runSpendIngest = assembleRunSpendIngest({ runStoreServices: runStore });
  const commandsDrive = assembleCommandsDrive({ agentSessionDriverServices: agentSessionDriver, claudeTrustServices: claudeTrust, degradeServices: degrade, runStoreServices: runStore, loopAskRequestServices: loopAskRequest, runHeartbeatConsumptionServices: runHeartbeatConsumption, effectsRunTransitionsServices: effectsRunTransitions, runSessionCaptureServices: runSessionCapture, commandsResolveServices: commandsResolve, workObserveServices: workObserve, runSpendIngestServices: runSpendIngest });
  const effectsDocTransitions = assembleEffectsDocTransitions({ effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, degradeServices: degrade });
  const commandsFeedback = assembleCommandsFeedback({ commandsResolveServices: commandsResolve, effectsDocTransitionsServices: effectsDocTransitions, globalWorkPublisherServices: globalWorkPublisher });
  const commandsFind = assembleCommandsFind({ workReadServices: workRead });
  const commandsGrade = assembleCommandsGrade({ commandsResolveServices: commandsResolve, runStoreServices: runStore, meshWorktreeServices: meshWorktree });
  const graphify = assembleGraphify({  });
  const commandsGraphBuild = assembleCommandsGraphBuild({ graphifyServices: graphify });
  const commandsGraphQuery = assembleCommandsGraphQuery({ graphifyServices: graphify });
  const graphMcpServer = assembleGraphMcpServer({ commandCoreServices: commandPort });
  const commandsGraphServe = assembleCommandsGraphServe({ graphMcpServerServices: graphMcpServer, workServices: work });
  const commandsGraphTriage = assembleCommandsGraphTriage({ graphifyServices: graphify });
  const importStore = assembleImportStore({ workspaceServices: workspace });
  const importRecovery = assembleImportRecovery({ importStoreServices: importStore });
  const importMaterialize = assembleImportMaterialize({ importStoreServices: importStore, workDigestTemplateServices: workDigestTemplate, workServices: work });
  const workMemory = assembleWorkMemory({ provideMemoryLocalBackend: async () => { lifetime.assertReady(); return memoryLocalBackend; }, provideMemoryGraphifyBackend: async () => { lifetime.assertReady(); return memoryGraphifyBackend; } });
  const commandsImportMilestone = assembleCommandsImportMilestone({ importRecoveryServices: importRecovery, importMaterializeServices: importMaterialize, importStoreServices: importStore, workMemoryServices: workMemory });
  const commandsInsertShared = assembleCommandsInsertShared({ effectsStreamTransitionsServices: effectsStreamTransitions });
  const commandsPromote = assembleCommandsPromote({ effectsStreamTransitionsServices: effectsStreamTransitions, commandsInsertSharedServices: commandsInsertShared });
  const commandsInsertChore = assembleCommandsInsertChore({ commandsInsertSharedServices: commandsInsertShared, commandsPromoteServices: commandsPromote });
  const commandsInsertMilestone = assembleCommandsInsertMilestone({ commandsInsertSharedServices: commandsInsertShared, commandsPromoteServices: commandsPromote });
  const commandsInsertStory = assembleCommandsInsertStory({ commandsInsertSharedServices: commandsInsertShared });
  const commandsInsertUat = assembleCommandsInsertUat({ commandsInsertSharedServices: commandsInsertShared, commandsPromoteServices: commandsPromote });
  const notifySecret = assembleNotifySecret({  });
  const notifyAskMessages = assembleNotifyAskMessages({ notifySecretServices: notifySecret });
  const notifyNotify = assembleNotifyNotify({ degradeServices: degrade, notifyAskMessagesServices: notifyAskMessages, notifySecretServices: notifySecret });
  const commandsItemStatus = assembleCommandsItemStatus({ commandsResolveServices: commandsResolve, effectsItemTransitionsServices: effectsItemTransitions, globalWorkPublisherServices: globalWorkPublisher, workDoctorServices: workDoctor, meshWorktreeServices: meshWorktree, notifyNotifyServices: notifyNotify });
  const commandsList = assembleCommandsList({ workReadServices: workRead, boardMeshExecutionServices: boardMeshExecution, cacheReadServices: cacheRead, loopAskRequestServices: loopAskRequest, degradeServices: degrade });
  const commandsLoopDocument = assembleCommandsLoopDocument({ provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const commandsLoopRecord = assembleCommandsLoopRecord({ workLoopsServices: workLoops, runStoreServices: runStore, commandsResolveServices: commandsResolve });
  const loopProgress = assembleLoopProgress({ degradeServices: degrade, workDispatchServices: workDispatch });
  const loopChildDrive = assembleLoopChildDrive({ workspaceServices: workspace });
  const loopAsk = assembleLoopAsk({ loopAskRequestServices: loopAskRequest, runStoreServices: runStore, runHeartbeatConsumptionServices: runHeartbeatConsumption, workObserveServices: workObserve, notifyNotifyServices: notifyNotify, degradeServices: degrade });
  const loopCycle = assembleLoopCycle({ commandsResolveServices: commandsResolve, loopChildDriveServices: loopChildDrive, loopAskServices: loopAsk, loopAskRequestServices: loopAskRequest, workDispatchServices: workDispatch, meshWorktreeServices: meshWorktree, loopProgressServices: loopProgress, commandsGradeServices: commandsGrade, itemLockServices: itemLock, runStoreServices: runStore, effectsRunTransitionsServices: effectsRunTransitions, degradeServices: degrade, runSpendIngestServices: runSpendIngest, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const loopWave = assembleLoopWave({ workServices: work, runStoreServices: runStore, runHeartbeatConsumptionServices: runHeartbeatConsumption, effectsRunTransitionsServices: effectsRunTransitions, degradeServices: degrade, workDispatchServices: workDispatch, meshWorktreeServices: meshWorktree, loopChildDriveServices: loopChildDrive, loopAskServices: loopAsk, loopCycleServices: loopCycle, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const loopDiag = assembleLoopDiag({ workspaceServices: workspace, degradeServices: degrade });
  const loopStop = assembleLoopStop({ workServices: work, runStoreServices: runStore, loopStopRequestServices: loopStopRequest });
  const commandsLoop = assembleCommandsLoop({ workServices: work, loopProgressServices: loopProgress, loopCycleServices: loopCycle, commandsResolveServices: commandsResolve, commandsGradeServices: commandsGrade, runStoreServices: runStore, effectsRunTransitionsServices: effectsRunTransitions, degradeServices: degrade, meshWorktreeServices: meshWorktree, loopWaveServices: loopWave, loopChildDriveServices: loopChildDrive, loopAskServices: loopAsk, loopDiagServices: loopDiag, notifyNotifyServices: notifyNotify, loopStopServices: loopStop, loopStopRequestServices: loopStopRequest, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const commandsLoopsGraph = assembleCommandsLoopsGraph({ workLoopsServices: workLoops });
  const commandsLoopsGroundedness = assembleCommandsLoopsGroundedness({ workLoopsServices: workLoops });
  const commandsLoopsShow = assembleCommandsLoopsShow({ workLoopsServices: workLoops });
  const commandsLoopsValidate = assembleCommandsLoopsValidate({ workLoopsServices: workLoops });
  const commandsMeshAssign = assembleCommandsMeshAssign({ meshAssignmentServices: meshAssignment });
  const meshRegistry = assembleMeshRegistry({ meshStoreServices: meshStore });
  const commandsMeshIdentity = assembleCommandsMeshIdentity({ meshStoreServices: meshStore, meshPresenceServices: meshPresence, meshRegistryServices: meshRegistry, provideMeshDeclarations: async () => { lifetime.assertReady(); return meshDeclarations; } });
  const commandsMeshHeartbeat = assembleCommandsMeshHeartbeat({ workReadServices: workRead, cacheReadServices: cacheRead, commandsMeshIdentityServices: commandsMeshIdentity, meshPresenceServices: meshPresence });
  const meshRelay = assembleMeshRelay({ meshRegistryServices: meshRegistry, meshStoreServices: meshStore, degradeServices: degrade });
  const commandsMeshRelay = assembleCommandsMeshRelay({ meshRelayServices: meshRelay });
  const commandsMeshInvite = assembleCommandsMeshInvite({ meshRegistryServices: meshRegistry, meshRelayServices: meshRelay });
  const commandsMeshJoin = assembleCommandsMeshJoin({ workspaceServices: workspace, meshStoreServices: meshStore, degradeServices: degrade });
  const commandsMeshRevoke = assembleCommandsMeshRevoke({ meshRegistryServices: meshRegistry });
  const meshTerminalRelayBridge = assembleMeshTerminalRelayBridge({ degradeServices: degrade });
  const meshRecoveryPush = assembleMeshRecoveryPush({ meshWorktreeServices: meshWorktree, provideGlobalWorkStore: async () => { lifetime.assertReady(); return globalWorkStore; } });
  const meshResync = assembleMeshResync({ provideGlobalWorkStore: async () => { lifetime.assertReady(); return globalWorkStore; } });
  const workerStreamClient = assembleWorkerStreamClient({ meshTerminalRelayBridgeServices: meshTerminalRelayBridge, meshRecoveryPushServices: meshRecoveryPush, meshResyncServices: meshResync, degradeServices: degrade });
  const meshRelayClient = assembleMeshRelayClient({ degradeServices: degrade });
  const controlStreamServer = assembleControlStreamServer({ globalWorkStoreServices: globalWorkStore, globalNodeRegistryServices: globalNodeRegistry, meshPresenceServices: meshPresence, effectsAssignmentTransitionsServices: effectsAssignmentTransitions, effectsTableServices: effectsTable, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, meshTerminalRelayBridgeServices: meshTerminalRelayBridge, meshRelayClientServices: meshRelayClient, meshRecoveryPushServices: meshRecoveryPush, meshResyncServices: meshResync, degradeServices: degrade });
  const meshParkResume = assembleMeshParkResume({ runStoreServices: runStore, workObserveServices: workObserve, effectsAssignmentTransitionsServices: effectsAssignmentTransitions, effectsRunTransitionsServices: effectsRunTransitions, degradeServices: degrade, provideMeshPresence: async () => { lifetime.assertReady(); return meshPresence; }, provideWork: async () => { lifetime.assertReady(); return work; }, provideNotifyNotify: async () => { lifetime.assertReady(); return notifyNotify; } });
  const meshWorkerLaunch = assembleMeshWorkerLaunch({  });
  const meshWorkerRepoAdmission = assembleMeshWorkerRepoAdmission({ workServices: work, workspaceServices: workspace, globalWorkStoreServices: globalWorkStore });
  const meshWorkerExecution = assembleMeshWorkerExecution({ workServices: work, runStoreServices: runStore, runSessionCaptureServices: runSessionCapture, effectsRunTransitionsServices: effectsRunTransitions, effectsAssignmentTransitionsServices: effectsAssignmentTransitions, meshParkResumeServices: meshParkResume, meshWorktreeServices: meshWorktree, workDispatchServices: workDispatch, meshPresenceServices: meshPresence, agentSessionDriverServices: agentSessionDriver, degradeServices: degrade, runHeartbeatConsumptionServices: runHeartbeatConsumption, meshWorkerLaunchServices: meshWorkerLaunch, meshWorkerRepoAdmissionServices: meshWorkerRepoAdmission });
  const meshSessionSpawnHandler = assembleMeshSessionSpawnHandler({ terminalWsServices: terminalWs, meshWorktreeServices: meshWorktree, meshSessionServices: meshSession, workServices: work, degradeServices: degrade });
  const meshTerminalMirror = assembleMeshTerminalMirror({ meshRelayServices: meshRelay, meshTerminalRelayBridgeServices: meshTerminalRelayBridge, workerStreamClientServices: workerStreamClient, degradeServices: degrade });
  const meshTerminalInput = assembleMeshTerminalInput({ meshTerminalRelayBridgeServices: meshTerminalRelayBridge, degradeServices: degrade });
  const meshAssignmentReclaim = assembleMeshAssignmentReclaim({ meshPresenceServices: meshPresence, runStoreServices: runStore, runHeartbeatConsumptionServices: runHeartbeatConsumption, workReadServices: workRead, effectsAssignmentTransitionsServices: effectsAssignmentTransitions, effectsRunTransitionsServices: effectsRunTransitions, globalWorkStoreServices: globalWorkStore, meshWorktreeServices: meshWorktree, degradeServices: degrade, workDispatchServices: workDispatch });
  const meshCloneCredentialProvider = assembleMeshCloneCredentialProvider({ controlStreamServerServices: controlStreamServer });
  const meshLauncher = assembleMeshLauncher({ workspaceServices: workspace, meshStoreServices: meshStore, meshPresenceServices: meshPresence, workServices: work, workReadServices: workRead, cacheReadServices: cacheRead, globalWorkPublisherServices: globalWorkPublisher, workerStreamClientServices: workerStreamClient, controlStreamServerServices: controlStreamServer, meshWorkerExecutionServices: meshWorkerExecution, meshSessionSpawnHandlerServices: meshSessionSpawnHandler, meshRecoveryPushServices: meshRecoveryPush, meshResyncServices: meshResync, meshRelayServices: meshRelay, meshRegistryServices: meshRegistry, meshLauncherLockServices: meshLauncherLock, meshTerminalRelayBridgeServices: meshTerminalRelayBridge, meshTerminalMirrorServices: meshTerminalMirror, meshTerminalInputServices: meshTerminalInput, meshAssignmentReclaimServices: meshAssignmentReclaim, meshCloneCredentialProviderServices: meshCloneCredentialProvider, degradeServices: degrade, effectsJournalServices: effectsJournal, effectsOutboxServices: effectsOutbox, effectsAssignmentTransitionsServices: effectsAssignmentTransitions, provideNotifyNotify: async () => { lifetime.assertReady(); return notifyNotify; }, provideDiscordBot: async () => { lifetime.assertReady(); return discordBot; } });
  meshLauncher.startLauncher = lifetime.start(meshLauncher.startLauncher);
  const commandsMeshServe = assembleCommandsMeshServe({ meshLauncherServices: meshLauncher, meshLauncherLockServices: meshLauncherLock, diagnosticsLogServices: diagnosticsLog, workspaceServices: workspace, workServices: work, fsServices: fs });
  const commandsMeshLogs = assembleCommandsMeshLogs({ diagnosticsLogServices: diagnosticsLog, globalWorkStoreServices: globalWorkStore, workspaceServices: workspace });
  const commandsMeshTerminalResume = assembleCommandsMeshTerminalResume({ globalWorkStoreServices: globalWorkStore, meshAssignmentReclaimServices: meshAssignmentReclaim, workDispatchServices: workDispatch, workspaceServices: workspace, meshTerminalRelayBridgeServices: meshTerminalRelayBridge, effectsJournalServices: effectsJournal, degradeServices: degrade });
  const commandsMeshRecoverPush = assembleCommandsMeshRecoverPush({ globalWorkStoreServices: globalWorkStore, workspaceServices: workspace, meshRecoveryPushServices: meshRecoveryPush });
  const commandsMeshRepo = assembleCommandsMeshRepo({ globalWorkPublisherServices: globalWorkPublisher });
  const globalMeshQuery = assembleGlobalMeshQuery({ workspaceServices: workspace, globalWorkStoreServices: globalWorkStore, globalNodeRegistryServices: globalNodeRegistry, globalWorkPublisherServices: globalWorkPublisher });
  const meshUiServe = assembleMeshUiServe({ boardServeServices: boardServe, globalMeshQueryServices: globalMeshQuery, workServices: work, meshAssignmentServices: meshAssignment, loopStopServices: loopStop, meshTerminalMirrorServices: meshTerminalMirror, meshTerminalRelayBridgeServices: meshTerminalRelayBridge, terminalProvidersServices: terminalProviders, degradeServices: degrade });
  meshUiServe.serveMeshUi = lifetime.server(meshUiServe.serveMeshUi);
  const commandsMeshUi = assembleCommandsMeshUi({ meshUiServeServices: meshUiServe, meshTerminalMirrorServices: meshTerminalMirror, meshTerminalRelayBridgeServices: meshTerminalRelayBridge, diagnosticsLogServices: diagnosticsLog, workServices: work });
  const commandsMeshDesktopPreflight = assembleCommandsMeshDesktopPreflight({ meshPresenceServices: meshPresence, workspaceServices: workspace });
  const commandsMeshDesktop = assembleCommandsMeshDesktop({ commandsMeshDesktopPreflightServices: commandsMeshDesktopPreflight });
  const commandsMeshContribution = assembleCommandsMeshContribution({ commandsMeshIdentityServices: commandsMeshIdentity, commandsMeshHeartbeatServices: commandsMeshHeartbeat, commandsMeshRelayServices: commandsMeshRelay, commandsMeshInviteServices: commandsMeshInvite, commandsMeshJoinServices: commandsMeshJoin, commandsMeshRevokeServices: commandsMeshRevoke, commandsMeshServeServices: commandsMeshServe, commandsMeshLogsServices: commandsMeshLogs, commandsMeshTerminalResumeServices: commandsMeshTerminalResume, commandsMeshAssignServices: commandsMeshAssign, commandsMeshRecoverPushServices: commandsMeshRecoverPush, commandsMeshRepoServices: commandsMeshRepo, commandsMeshUiServices: commandsMeshUi, commandsMeshDesktopServices: commandsMeshDesktop });
  const commandsMessagingMessaging = assembleCommandsMessagingMessaging({ notifyNotifyServices: notifyNotify, notifySecretServices: notifySecret });
  const commandsMigrateFolder = assembleCommandsMigrateFolder({ importRecoveryServices: importRecovery, importStoreServices: importStore });
  const commandsNext = assembleCommandsNext({ workReadServices: workRead, itemLockServices: itemLock });
  const integrationsRouting = assembleIntegrationsRouting({ degradeServices: degrade });
  const commandsNotionAssociate = assembleCommandsNotionAssociate({ workReadServices: workRead, commandsResolveServices: commandsResolve, integrationsRoutingServices: integrationsRouting });
  const notionMapping = assembleNotionMapping({ workspaceServices: workspace });
  const notionSync = assembleNotionSync({ notionMappingServices: notionMapping });
  const notionCli = assembleNotionCli({ degradeServices: degrade });
  const notionSyncWork = assembleNotionSyncWork({ workServices: work, workReadServices: workRead, notionMappingServices: notionMapping, notionSyncServices: notionSync, notionCliServices: notionCli, integrationsRoutingServices: integrationsRouting });
  const commandsNotionSyncWork = assembleCommandsNotionSyncWork({ notionSyncWorkServices: notionSyncWork, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, degradeServices: degrade });
  const commandsObserve = assembleCommandsObserve({ workObserveServices: workObserve, workServices: work });
  const commandsPromoteFindingToChore = assembleCommandsPromoteFindingToChore({ commandsPromoteServices: commandsPromote, workReadServices: workRead });
  const commandsPromoteGapToChore = assembleCommandsPromoteGapToChore({ commandsInsertSharedServices: commandsInsertShared, commandsPromoteServices: commandsPromote });
  const commandsRatchet = assembleCommandsRatchet({ commandsResolveServices: commandsResolve });
  const workTestSelect = assembleWorkTestSelect({ workAuditCensusServices: workAuditCensus });
  const workTestChanged = assembleWorkTestChanged({ workTestSelectServices: workTestSelect });
  const workToolchain = assembleWorkToolchain({  });
  const commandsTest = assembleCommandsTest({ workAuditCensusServices: workAuditCensus, workTestChangedServices: workTestChanged, commandsResolveServices: commandsResolve, workTestSelectServices: workTestSelect, workToolchainServices: workToolchain });
  const commandsRegressionGate = assembleCommandsRegressionGate({ meshWorktreeServices: meshWorktree, commandsResolveServices: commandsResolve, commandsTestServices: commandsTest, workToolchainServices: workToolchain });
  const commandsResume = assembleCommandsResume({ commandsResolveServices: commandsResolve, runStoreServices: runStore, effectsRunTransitionsServices: effectsRunTransitions, workReadServices: workRead, itemLockServices: itemLock, loopAskRequestServices: loopAskRequest, loopAskServices: loopAsk, boardMeshExecutionServices: boardMeshExecution, notifyNotifyServices: notifyNotify, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const commandsResync = assembleCommandsResync({ globalWorkStoreServices: globalWorkStore, workspaceServices: workspace, meshResyncServices: meshResync });
  const commandsRunComplete = assembleCommandsRunComplete({ commandsResolveServices: commandsResolve, effectsRunTransitionsServices: effectsRunTransitions, runStoreServices: runStore, globalWorkPublisherServices: globalWorkPublisher });
  const commandsRunStart = assembleCommandsRunStart({ commandsResolveServices: commandsResolve, workReadServices: workRead, runStoreServices: runStore, meshPresenceServices: meshPresence, effectsRunTransitionsServices: effectsRunTransitions, globalWorkPublisherServices: globalWorkPublisher, itemLockServices: itemLock, meshSessionServices: meshSession });
  const commandsRunStatus = assembleCommandsRunStatus({ commandsResolveServices: commandsResolve, runStoreServices: runStore, cacheReadServices: cacheRead, boardMeshExecutionServices: boardMeshExecution });
  const commandsTasks = assembleCommandsTasks({ commandsResolveServices: commandsResolve, cacheReadServices: cacheRead, workReadServices: workRead });
  const workTriggerDeclaration = assembleWorkTriggerDeclaration({ workLoopsServices: workLoops });
  const commandsTrigger = assembleCommandsTrigger({ workTriggerDeclarationServices: workTriggerDeclaration, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const memoryLocalIndexing = assembleMemoryLocalIndexing({ workReadServices: workRead, importStoreServices: importStore, importMaterializeServices: importMaterialize });
  const workTuneCorpus = assembleWorkTuneCorpus({ memoryLocalIndexingServices: memoryLocalIndexing, runStoreServices: runStore, workObserveServices: workObserve, workLoopsServices: workLoops });
  const workTuneProposal = assembleWorkTuneProposal({  });
  const commandsTune = assembleCommandsTune({ workTuneCorpusServices: workTuneCorpus, workTuneProposalServices: workTuneProposal, workLoopsServices: workLoops, commandsDoctorServices: commandsDoctor, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const workUpgrade = assembleWorkUpgrade({  });
  const commandsUpgrade = assembleCommandsUpgrade({ workUpgradeServices: workUpgrade });
  const commandsValidate = assembleCommandsValidate({ commandsDoctorServices: commandsDoctor, workServices: work });
  const commandsWorkMemory = assembleCommandsWorkMemory({ workMemoryServices: workMemory });
  const commandsWorkUi = assembleCommandsWorkUi({ boardServeServices: boardServe, meshUiServeServices: meshUiServe });
  const discordCommands = assembleDiscordCommands({ degradeServices: degrade, notifyAskMessagesServices: notifyAskMessages, loopStopRequestServices: loopStopRequest, provideLoopStop: async () => { lifetime.assertReady(); return loopStop; } });
  const discordGateway = assembleDiscordGateway({ degradeServices: degrade });
  const discordReplies = assembleDiscordReplies({ loopAskRequestServices: loopAskRequest, notifyAskMessagesServices: notifyAskMessages });
  const discordBot = assembleDiscordBot({ degradeServices: degrade, discordCommandsServices: discordCommands, discordGatewayServices: discordGateway, discordRepliesServices: discordReplies, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; }, provideWork: async () => { lifetime.assertReady(); return work; }, provideMeshPresence: async () => { lifetime.assertReady(); return meshPresence; }, provideWorkAcceptorObservations: async () => { lifetime.assertReady(); return workAcceptorObservations; } });
  const memoryGraphifyBackend = assembleMemoryGraphifyBackend({ commandCoreServices: commandPort, memoryLocalIndexingServices: memoryLocalIndexing });
  const memoryLocalBackend = assembleMemoryLocalBackend({ memoryLocalIndexingServices: memoryLocalIndexing });
  const meshDeclarations = assembleMeshDeclarations({ meshPresenceServices: meshPresence, runStoreServices: runStore, commandsRunRetryServices: commandsRunRetry, workServices: work, loopStopRequestServices: loopStopRequest, provideCommandCore: async () => { lifetime.assertReady(); return commandCore; } });
  const storyContractDerive = assembleStoryContractDerive({  });
  const workExamplesAnswers = assembleWorkExamplesAnswers({ agentSessionDriverServices: agentSessionDriver, degradeServices: degrade, runStoreServices: runStore, runSpendIngestServices: runSpendIngest, workObserveServices: workObserve });
  const workInit = assembleWorkInit({ workspaceServices: workspace, workMemoryServices: workMemory });
  const commandsInitUpdate = assembleCommandsInitUpdate({ workInitServices: workInit, workMemoryServices: workMemory });
  const commandsAssetsUi = assembleCommandsAssetsUi({ provideSetupUi: async () => { lifetime.assertReady(); return setupUi; } });
  const spineFace = assembleSpineFace({ commandCoreServices: commandPort, effectsJournalServices: effectsJournal, effectsDispatchServices: effectsDispatch, degradeServices: degrade, provideGlobalWorkStore: async () => { lifetime.assertReady(); return globalWorkStore; }, applicationEnv: env });
  const scaffold = assembleScaffold({ fsServices: fs, workspaceServices: workspace });
  const commandsAssetsShow = assembleCommandsAssetsShow({ fsServices: fs, workspaceServices: workspace });
  const commandsAssetsRemove = assembleCommandsAssetsRemove({ fsServices: fs, workspaceServices: workspace });
  const commandsAssetsAdd = assembleCommandsAssetsAdd({ provideScaffold: async () => { lifetime.assertReady(); return scaffold; } });
  const commandsValidateShared = assembleCommandsValidateShared({ configInspectServices: configInspect });
  const commandsAssetsApply = assembleCommandsAssetsApply({ fsServices: fs, dslServices: dsl, workspaceServices: workspace, configInspectServices: configInspect, commandsValidateSharedServices: commandsValidateShared });
  const commandsAssetsList = assembleCommandsAssetsList({ configInspectServices: configInspect });
  const commandsAssetsRefs = assembleCommandsAssetsRefs({ configEditorServices: configEditor, workspaceServices: workspace });
  const commandsPackagesInstall = assembleCommandsPackagesInstall({ dslServices: dsl, workspaceServices: workspace });
  const commandsPackagesList = assembleCommandsPackagesList({ dslServices: dsl, workspaceServices: workspace });
  const commandsPackagesShow = assembleCommandsPackagesShow({ dslServices: dsl, workspaceServices: workspace });
  const commandsProjectDoctor = assembleCommandsProjectDoctor({ configInspectServices: configInspect, commandsValidateSharedServices: commandsValidateShared });
  const workspaceWriter = assembleWorkspaceWriter({ fsServices: fs, configEditorServices: configEditor, workspaceServices: workspace });
  const commandsProjectMigrate = assembleCommandsProjectMigrate({ dslServices: dsl, fsServices: fs, workspaceServices: workspace, workspaceWriterServices: workspaceWriter });
  const commandsProjectShow = assembleCommandsProjectShow({ configInspectServices: configInspect });
  const sync = assembleSync({ dslServices: dsl, workspaceServices: workspace });
  const commandsAssetsValidate = assembleCommandsAssetsValidate({ commandsValidateSharedServices: commandsValidateShared });
  const commandsPackagesValidate = assembleCommandsPackagesValidate({ fsServices: fs, workspaceServices: workspace, commandsValidateSharedServices: commandsValidateShared });
  const commandsProjectInit = assembleCommandsProjectInit({ fsServices: fs, workspaceWriterServices: workspaceWriter, workspaceServices: workspace });
  const commandsProjectValidate = assembleCommandsProjectValidate({ commandsValidateSharedServices: commandsValidateShared });
  const commandCore = assembleCommandCore({ commandsMeshContributionServices: commandsMeshContribution, workServices: work, commandsListServices: commandsList, commandsLoopsShowServices: commandsLoopsShow, commandsLoopsGraphServices: commandsLoopsGraph, commandsLoopsValidateServices: commandsLoopsValidate, commandsLoopsGroundednessServices: commandsLoopsGroundedness, commandsLoopDocumentServices: commandsLoopDocument, commandsLoopRecordServices: commandsLoopRecord, commandsContinueServices: commandsContinue, commandsDriveServices: commandsDrive, commandsLoopServices: commandsLoop, commandsResyncServices: commandsResync, commandsDocServices: commandsDoc, commandsTasksServices: commandsTasks, commandsValidateServices: commandsValidate, commandsNextServices: commandsNext, commandsDispatchServices: commandsDispatch, commandsFeedbackServices: commandsFeedback, commandsDoctorServices: commandsDoctor, commandsAuditServices: commandsAudit, commandsAcceptorServices: commandsAcceptor, commandsTuneServices: commandsTune, commandsTriggerServices: commandsTrigger, commandsGradeServices: commandsGrade, commandsRatchetServices: commandsRatchet, commandsCountersServices: commandsCounters, commandsGraphBuildServices: commandsGraphBuild, commandsGraphQueryServices: commandsGraphQuery, commandsGraphTriageServices: commandsGraphTriage, commandsTestServices: commandsTest, commandsImportMilestoneServices: commandsImportMilestone, commandsMigrateFolderServices: commandsMigrateFolder, commandsNotionSyncWorkServices: commandsNotionSyncWork, commandsNotionAssociateServices: commandsNotionAssociate, commandsRunStartServices: commandsRunStart, commandsRunCompleteServices: commandsRunComplete, commandsRunStatusServices: commandsRunStatus, commandsItemStatusServices: commandsItemStatus, commandsRegressionGateServices: commandsRegressionGate, commandsRunRetryServices: commandsRunRetry, commandsResumeServices: commandsResume, commandsGraphServeServices: commandsGraphServe, commandsDiagramPlanServices: commandsDiagramPlan, commandsDiagramExportServices: commandsDiagramExport, commandsDiagramFileServices: commandsDiagramFile, commandsMessagingMessagingServices: commandsMessagingMessaging, commandsWorkUiServices: commandsWorkUi, commandsAssetsUiServices: commandsAssetsUi, commandsFindServices: commandsFind, commandsObserveServices: commandsObserve, commandsWorkMemoryServices: commandsWorkMemory, commandsInitUpdateServices: commandsInitUpdate, commandsProjectInitServices: commandsProjectInit, commandsInsertMilestoneServices: commandsInsertMilestone, commandsInsertUatServices: commandsInsertUat, commandsInsertStoryServices: commandsInsertStory, commandsInsertChoreServices: commandsInsertChore, commandsPromoteServices: commandsPromote, commandsArchiveServices: commandsArchive, commandsPromoteGapToChoreServices: commandsPromoteGapToChore, commandsPromoteFindingToChoreServices: commandsPromoteFindingToChore, commandsUpgradeServices: commandsUpgrade, commandsAssetsListServices: commandsAssetsList, commandsPackagesListServices: commandsPackagesList, commandsProjectShowServices: commandsProjectShow, commandsAssetsShowServices: commandsAssetsShow, commandsAssetsAddServices: commandsAssetsAdd, commandsAssetsRemoveServices: commandsAssetsRemove, commandsAssetsRefsServices: commandsAssetsRefs, commandsAssetsValidateServices: commandsAssetsValidate, commandsAssetsApplyServices: commandsAssetsApply, commandsPackagesShowServices: commandsPackagesShow, commandsPackagesValidateServices: commandsPackagesValidate, commandsPackagesInstallServices: commandsPackagesInstall, commandsProjectValidateServices: commandsProjectValidate, commandsProjectDoctorServices: commandsProjectDoctor, commandsProjectMigrateServices: commandsProjectMigrate });
  lifetime.ready();
  const application = Object.freeze({
    ...commandPort,
    cli: spineFace,
    paths: workspace,
    work: Object.freeze({
      records: work,
      items: effectsItemTransitions,
      documents: effectsDocTransitions,
      streams: effectsStreamTransitions,
      harness: effectsHarnessTransitions,
      digestTemplate: workDigestTemplate,
      observe: workObserve,
      acceptor: Object.freeze({
        criterion: workAcceptorCriterion,
        observations: workAcceptorObservations,
        store: workAcceptorStore,
      }),
      commandTools: Object.freeze({
        acceptor: Object.freeze({
          DWELL_UNCOUNTED: commandsAcceptor.DWELL_UNCOUNTED,
          REFUSAL_REMOVALS: commandsAcceptor.REFUSAL_REMOVALS,
          RULING_REFUSAL_ORDER: commandsAcceptor.RULING_REFUSAL_ORDER,
          YIELD_BOUND: commandsAcceptor.YIELD_BOUND,
          buildAcceptorReport: commandsAcceptor.buildAcceptorReport,
          reversionDecision: commandsAcceptor.reversionDecision,
          withdrawalOnHarm: commandsAcceptor.withdrawalOnHarm,
        }),
        archive: Object.freeze({
          ARCHIVE_FLAGS: commandsArchive.ARCHIVE_FLAGS,
          renderArchive: commandsArchive.renderArchive,
          runArchive: commandsArchive.runArchive,
        }),
        audit: Object.freeze({
          DEFAULT_ANCHOR_STALE_DAYS: commandsAudit.DEFAULT_ANCHOR_STALE_DAYS,
          anchorWindowFromConfig: commandsAudit.anchorWindowFromConfig,
          readAuditedSettings: commandsAudit.readAuditedSettings,
          registerItems: commandsAudit.registerItems,
          resolveRoleRouting: commandsAudit.resolveRoleRouting,
        }),
        resolve: Object.freeze({
          requireLocalCheckout: commandsResolve.requireLocalCheckout,
          resolveDrivenRun: commandsResolve.resolveDrivenRun,
          resolveItem: commandsResolve.resolveItem,
          resolveItemExact: commandsResolve.resolveItemExact,
        }),
        continue: Object.freeze({
          createPhaseDoorCommand: commandsContinue.createPhaseDoorCommand,
          resolveContinueDecision: commandsContinue.resolveContinueDecision,
          resolveDirectivePhase: commandsContinue.resolveDirectivePhase,
        }),
        runRetry: Object.freeze({
          resolveAttemptCeiling: commandsRunRetry.resolveAttemptCeiling,
        }),
        counters: Object.freeze({
          observeCounters: commandsCounters.observeCounters,
        }),
        doctor: Object.freeze({
          readRenameMap: commandsDoctor.readRenameMap,
        }),
        grade: Object.freeze({
          spawnRubricAsync: commandsGrade.spawnRubricAsync,
          GRADE_REENTRANCY_ENV: commandsGrade.GRADE_REENTRANCY_ENV,
          RUBRIC_CONFIG_KEY: commandsGrade.RUBRIC_CONFIG_KEY,
          declaredRubric: commandsGrade.declaredRubric,
          gatherClaimProvenance: commandsGrade.gatherClaimProvenance,
          planRubric: commandsGrade.planRubric,
          reportObservation: commandsGrade.reportObservation,
          rubricChildEnv: commandsGrade.rubricChildEnv,
          rubricSpawnOptions: commandsGrade.rubricSpawnOptions,
          usableCommand: commandsGrade.usableCommand,
        }),
        insertShared: Object.freeze({
          INSERT_FLAGS: commandsInsertShared.INSERT_FLAGS,
          guardSlotOpenCount: commandsInsertShared.guardSlotOpenCount,
          normalizeSlug: commandsInsertShared.normalizeSlug,
          parseDependsInput: commandsInsertShared.parseDependsInput,
          parsePosition: commandsInsertShared.parsePosition,
          renderBlankTemplate: commandsInsertShared.renderBlankTemplate,
          runInsertStory: commandsInsertShared.runInsertStory,
          scaffoldBacklogDriver: commandsInsertShared.scaffoldBacklogDriver,
          stripBundleMarker: commandsInsertShared.stripBundleMarker,
        }),
        promote: Object.freeze({
          archivedCollisions: commandsPromote.archivedCollisions,
          classifyDepends: commandsPromote.classifyDepends,
          numbersWritten: commandsPromote.numbersWritten,
          prefixFirstHeading: commandsPromote.prefixFirstHeading,
          runInsertTopLevel: commandsPromote.runInsertTopLevel,
          runPromote: commandsPromote.runPromote,
          stampNumber: commandsPromote.stampNumber,
        }),
        itemStatus: Object.freeze({
          GATE_MISSING: commandsItemStatus.GATE_MISSING,
          GATE_RED: commandsItemStatus.GATE_RED,
          OVERRIDE_REASON_REQUIRED: commandsItemStatus.OVERRIDE_REASON_REQUIRED,
        }),
        list: Object.freeze({
          applyAskOverlay: commandsList.applyAskOverlay,
        }),
        next: Object.freeze({
          mergeSkipped: commandsNext.mergeSkipped,
        }),
        promoteFindingToChore: Object.freeze({
          runPromoteFindingToChore: commandsPromoteFindingToChore.runPromoteFindingToChore,
        }),
        promoteGapToChore: Object.freeze({
          runPromoteGapToChore: commandsPromoteGapToChore.runPromoteGapToChore,
        }),
        ratchet: Object.freeze({
          observeRatchet: commandsRatchet.observeRatchet,
          resolveRatchetBase: commandsRatchet.resolveRatchetBase,
        }),
        test: Object.freeze({
          NO_FILES_NAMED: commandsTest.NO_FILES_NAMED,
          NO_SCOPE: commandsTest.NO_SCOPE,
          SCOPE_UNRECOGNISED: commandsTest.SCOPE_UNRECOGNISED,
          STORY_AND_SINCE: commandsTest.STORY_AND_SINCE,
          STORY_OUTSIDE_IMPACTED: commandsTest.STORY_OUTSIDE_IMPACTED,
          TEST_SCOPES: commandsTest.TEST_SCOPES,
          runTest: commandsTest.runTest,
        }),
        regressionGate: Object.freeze({
          DIRTY_TREE: commandsRegressionGate.DIRTY_TREE,
          JOBS_INVALID: commandsRegressionGate.JOBS_INVALID,
          JOBS_UNDECLARED: commandsRegressionGate.JOBS_UNDECLARED,
          SETTINGS_CONFLICT: commandsRegressionGate.SETTINGS_CONFLICT,
          regressionGateCommand: commandsRegressionGate.regressionGateCommand,
          runRegressionGate: commandsRegressionGate.runRegressionGate,
        }),
        tune: Object.freeze({
          buildTuneReport: commandsTune.buildTuneReport,
        }),
        validate: Object.freeze({
          validateWork: commandsValidate.validateWork,
        }),
      }),
      contentRead: workContentRead,
      audit: Object.freeze({
        census: workAuditCensus,
        evidence: workAuditEvidence,
        promptLayer: workAuditPromptLayer,
        seamLiveness: workAuditSeamLiveness,
        declaredBounds: workAuditDeclaredBounds,
        report: workAuditReport,
      }),
      read: workRead,
      doctorDiagrams: workDoctorDiagrams,
      doctorExamples: workDoctorExamples,
      doctor: workDoctor,
      integrations: Object.freeze({
        routing: integrationsRouting,
      }),
      testSelect: workTestSelect,
      testChanged: workTestChanged,
      toolchain: workToolchain,
      tune: Object.freeze({
        corpus: workTuneCorpus,
        proposal: workTuneProposal,
      }),
      upgrade: workUpgrade,
      storyContractDerive: storyContractDerive,
      examples: Object.freeze({
        answers: workExamplesAnswers,
      }),
    }),
    execution: Object.freeze({
      runs: runStore,
      sessions: agentSessionDriver,
      transitions: effectsRunTransitions,
      terminal: Object.freeze({
        screen: terminalScreen,
        sessionScreen: terminalSessionScreen,
        providers: terminalProviders,
      }),
      claudeTrust: claudeTrust,
      terminalSessions: terminalSessions,
      runHeartbeatConsumption: runHeartbeatConsumption,
      diagrams: Object.freeze({
        rasterize: diagramsRasterize,
      }),
      runSessionCapture: runSessionCapture,
      runSpendIngest: runSpendIngest,
    }),
    effects: Object.freeze({
      journal: effectsJournal,
      reactors: effectsTable,
      dispatcher: effectsDispatch,
      outbox: effectsOutbox,
      reconcile: effectsReconcile,
    }),
    mesh: Object.freeze({
      store: globalWorkStore,
      worker: meshWorkerExecution,
      assignments: meshAssignment,
      transitions: effectsAssignmentTransitions,
      launcher: meshLauncher,
      locks: itemLock,
      nodes: meshStore,
      sessions: meshSession,
      sessionHooks: commandsMeshSession,
      boardMeshExecution: boardMeshExecution,
      cacheRead: cacheRead,
      worktree: meshWorktree,
      presence: meshPresence,
      globalNodeRegistry: globalNodeRegistry,
      globalWorkPublisher: globalWorkPublisher,
      launcherLock: meshLauncherLock,
      registry: meshRegistry,
      commandTools: Object.freeze({
        mesh: Object.freeze({
          identity: Object.freeze({
            resolveInstallSalt: commandsMeshIdentity.resolveInstallSalt,
            keyedByOldId: commandsMeshIdentity.keyedByOldId,
          }),
          recoverPush: Object.freeze({
            recoverPush: commandsMeshRecoverPush.recoverPush,
          }),
          repo: Object.freeze({
            publishRepoToMesh: commandsMeshRepo.publishRepoToMesh,
          }),
          desktopPreflight: Object.freeze({
            PREFLIGHT_CHECKS: commandsMeshDesktopPreflight.PREFLIGHT_CHECKS,
            HEARTBEAT_HOOK_ID: commandsMeshDesktopPreflight.HEARTBEAT_HOOK_ID,
            defaultRunner: commandsMeshDesktopPreflight.defaultRunner,
            PREFLIGHT_SEAMS: commandsMeshDesktopPreflight.PREFLIGHT_SEAMS,
            preflightSeams: commandsMeshDesktopPreflight.preflightSeams,
            runPreflight: commandsMeshDesktopPreflight.runPreflight,
            renderPreflight: commandsMeshDesktopPreflight.renderPreflight,
          }),
          desktop: Object.freeze({
            DESKTOP_APP_EXE: commandsMeshDesktop.DESKTOP_APP_EXE,
            WEBVIEW2_BOOTSTRAPPER: commandsMeshDesktop.WEBVIEW2_BOOTSTRAPPER,
            resolveDesktopInstallDir: commandsMeshDesktop.resolveDesktopInstallDir,
            installDesktopApp: commandsMeshDesktop.installDesktopApp,
            discoverDesktopApp: commandsMeshDesktop.discoverDesktopApp,
            launchDesktopApp: commandsMeshDesktop.launchDesktopApp,
            desktopProcessName: commandsMeshDesktop.desktopProcessName,
            parseTasklistPids: commandsMeshDesktop.parseTasklistPids,
            parsePgrepPids: commandsMeshDesktop.parsePgrepPids,
            findDesktopProcesses: commandsMeshDesktop.findDesktopProcesses,
            stopDesktopApp: commandsMeshDesktop.stopDesktopApp,
            AUTOSTART_RUN_KEY: commandsMeshDesktop.AUTOSTART_RUN_KEY,
            AUTOSTART_VALUE_NAME: commandsMeshDesktop.AUTOSTART_VALUE_NAME,
            resolveAutostartAction: commandsMeshDesktop.resolveAutostartAction,
            applyAutostart: commandsMeshDesktop.applyAutostart,
            renderAutostart: commandsMeshDesktop.renderAutostart,
          }),
          contribution: Object.freeze({
            meshContribution: commandsMeshContribution.meshContribution,
          }),
        }),
      }),
      relay: meshRelay,
      terminalRelayBridge: meshTerminalRelayBridge,
      recoveryPush: meshRecoveryPush,
      resync: meshResync,
      workerStreamClient: workerStreamClient,
      relayClient: meshRelayClient,
      controlStreamServer: controlStreamServer,
      parkResume: meshParkResume,
      workerLaunch: meshWorkerLaunch,
      workerRepoAdmission: meshWorkerRepoAdmission,
      sessionSpawnHandler: meshSessionSpawnHandler,
      terminalMirror: meshTerminalMirror,
      terminalInput: meshTerminalInput,
      assignmentReclaim: meshAssignmentReclaim,
      cloneCredentialProvider: meshCloneCredentialProvider,
      globalMeshQuery: globalMeshQuery,
      uiServe: meshUiServe,
      declarations: meshDeclarations,
    }),
    server: Object.freeze({
      board: boardUi,
      mcp: graphMcpServer,
      serve: boardServe,
      terminalWs: terminalWs,
      setupUi: setupUi,
      commandTools: Object.freeze({
        workUi: Object.freeze({
          resolveStandaloneFleetOrigin: commandsWorkUi.resolveStandaloneFleetOrigin,
        }),
      }),
    }),
    foundation: Object.freeze({
      files: fs,
      degrade: degrade,
      diagnostics: diagnosticsLog,
    }),
    assets: Object.freeze({
      dsl: dsl,
      configInspect: configInspect,
      configEditor: configEditor,
      work: Object.freeze({
        init: workInit,
      }),
      scaffold: scaffold,
      commandTools: Object.freeze({
        validateShared: Object.freeze({
          buildProjectValidationReport: commandsValidateShared.buildProjectValidationReport,
          buildGlobalValidationReport: commandsValidateShared.buildGlobalValidationReport,
          adapterWarningLines: commandsValidateShared.adapterWarningLines,
          renderValidationReport: commandsValidateShared.renderValidationReport,
          VALIDATE_FLAGS: commandsValidateShared.VALIDATE_FLAGS,
        }),
      }),
      workspaceWriter: workspaceWriter,
      sync: sync,
    }),
    graph: Object.freeze({
      work: Object.freeze({
        loops: workLoops,
      }),
      commandTools: Object.freeze({
        loopDocument: Object.freeze({
          createLoopDocumentCommand: commandsLoopDocument.createLoopDocumentCommand,
        }),
        loopRecord: Object.freeze({
          EXECUTION_RECORD_BASENAME: commandsLoopRecord.EXECUTION_RECORD_BASENAME,
          SIGNOFF_DIVIDER: commandsLoopRecord.SIGNOFF_DIVIDER,
          SIGNOFF_HEADER: commandsLoopRecord.SIGNOFF_HEADER,
          SIGNOFF_HEADING: commandsLoopRecord.SIGNOFF_HEADING,
          SIGNOFF_PLACEHOLDER: commandsLoopRecord.SIGNOFF_PLACEHOLDER,
          SIGNOFF_VERDICTS: commandsLoopRecord.SIGNOFF_VERDICTS,
          composeSignoffBlock: commandsLoopRecord.composeSignoffBlock,
          createLoopRecordCommand: commandsLoopRecord.createLoopRecordCommand,
          parseSignoffRows: commandsLoopRecord.parseSignoffRows,
        }),
        loopsGraph: Object.freeze({
          KIND_SHAPES: commandsLoopsGraph.KIND_SHAPES,
          createLoopsGraphCommand: commandsLoopsGraph.createLoopsGraphCommand,
          renderLoopGraph: commandsLoopsGraph.renderLoopGraph,
        }),
        loopsGroundedness: Object.freeze({
          createLoopsGroundednessCommand: commandsLoopsGroundedness.createLoopsGroundednessCommand,
          resolveAnchorAuthorities: commandsLoopsGroundedness.resolveAnchorAuthorities,
        }),
        loopsShow: Object.freeze({
          createLoopsShowCommand: commandsLoopsShow.createLoopsShowCommand,
        }),
        loopsValidate: Object.freeze({
          createLoopsValidateCommand: commandsLoopsValidate.createLoopsValidateCommand,
        }),
      }),
    }),
    loop: Object.freeze({
      stopRequest: loopStopRequest,
      work: Object.freeze({
        dispatch: workDispatch,
      }),
      commandTools: Object.freeze({
        dispatch: Object.freeze({
          settleLaneProjectionEffects: commandsDispatch.settleLaneProjectionEffects,
        }),
        drive: Object.freeze({
          PHASE_MODE_FLAGS: commandsDrive.PHASE_MODE_FLAGS,
          composeFixInput: commandsDrive.composeFixInput,
          createPhaseDriverCommand: commandsDrive.createPhaseDriverCommand,
          phaseCommand: commandsDrive.phaseCommand,
          resolvePhaseResumeTarget: commandsDrive.resolvePhaseResumeTarget,
        }),
        loop: Object.freeze({
          DOCTOR_GATE_CODES: commandsLoop.DOCTOR_GATE_CODES,
          LOOP_FIX_TRANSPORT_KEYS: commandsLoop.LOOP_FIX_TRANSPORT_KEYS,
          SHELL_LOOP_ID: commandsLoop.SHELL_LOOP_ID,
          admitResumeBuildRun: commandsLoop.admitResumeBuildRun,
          admittedDoctorFindings: commandsLoop.admittedDoctorFindings,
          applyGradeBaseline: commandsLoop.applyGradeBaseline,
          failingCountFromGrade: commandsLoop.failingCountFromGrade,
          fixTransport: commandsLoop.fixTransport,
          gradeFindings: commandsLoop.gradeFindings,
          gradeRoute: commandsLoop.gradeRoute,
          gradeStopCode: commandsLoop.gradeStopCode,
          gradeStopProducer: commandsLoop.gradeStopProducer,
          gradeSummary: commandsLoop.gradeSummary,
          mergeGateFindings: commandsLoop.mergeGateFindings,
          readGradeBaseline: commandsLoop.readGradeBaseline,
          recordBuildProgress: commandsLoop.recordBuildProgress,
          renderLoopState: commandsLoop.renderLoopState,
          runLoopBody: commandsLoop.runLoopBody,
          runLoopLaunch: commandsLoop.runLoopLaunch,
        }),
        trigger: Object.freeze({
          LEVEL_FLAG: commandsTrigger.LEVEL_FLAG,
          LOOP_INPUT_KEYS: commandsTrigger.LOOP_INPUT_KEYS,
          RESOLVED_TRIGGER_KEYS: commandsTrigger.RESOLVED_TRIGGER_KEYS,
          TRIGGER_GATE_READING_FAILED: commandsTrigger.TRIGGER_GATE_READING_FAILED,
          TRIGGER_GATE_READING_UNOBTAINED: commandsTrigger.TRIGGER_GATE_READING_UNOBTAINED,
          TRIGGER_GATE_READING_UNREACHABLE: commandsTrigger.TRIGGER_GATE_READING_UNREACHABLE,
          TRIGGER_LOOP_UNREGISTERED: commandsTrigger.TRIGGER_LOOP_UNREGISTERED,
          TRIGGER_SIGNAL_UNMATCHED: commandsTrigger.TRIGGER_SIGNAL_UNMATCHED,
          TRIGGER_SIGNAL_UNREADABLE: commandsTrigger.TRIGGER_SIGNAL_UNREADABLE,
          TRIGGER_SOURCE_UNDECLARED_GAP: commandsTrigger.TRIGGER_SOURCE_UNDECLARED_GAP,
          TRIGGER_SOURCE_UNKNOWN: commandsTrigger.TRIGGER_SOURCE_UNKNOWN,
          TRIGGER_SOURCE_UNRESOLVABLE_HERE: commandsTrigger.TRIGGER_SOURCE_UNRESOLVABLE_HERE,
          TRIGGER_SOURCE_UNRESOLVED_GAP: commandsTrigger.TRIGGER_SOURCE_UNRESOLVED_GAP,
          TRIGGER_UNKNOWN: commandsTrigger.TRIGGER_UNKNOWN,
          buildTriggerReport: commandsTrigger.buildTriggerReport,
        }),
      }),
      askRequest: loopAskRequest,
      loopProgress: loopProgress,
      childDrive: loopChildDrive,
      ask: loopAsk,
      cycle: loopCycle,
      wave: loopWave,
      loopDiag: loopDiag,
      stop: loopStop,
      workTrigger: Object.freeze({
        declaration: workTriggerDeclaration,
      }),
    }),
    knowledge: Object.freeze({
      graphify: graphify,
      commandTools: Object.freeze({
        graph: Object.freeze({
          build: Object.freeze({
            isNetworkBackend: commandsGraphBuild.isNetworkBackend,
            isKnownNetworkBackend: commandsGraphBuild.isKnownNetworkBackend,
            classifyEgress: commandsGraphBuild.classifyEgress,
            readBuiltGraph: commandsGraphBuild.readBuiltGraph,
          }),
        }),
      }),
      import: Object.freeze({
        store: importStore,
        recovery: importRecovery,
        materialize: importMaterialize,
      }),
      work: Object.freeze({
        memory: workMemory,
      }),
      memory: Object.freeze({
        localIndexing: memoryLocalIndexing,
        graphifyBackend: memoryGraphifyBackend,
        localBackend: memoryLocalBackend,
      }),
    }),
    messaging: Object.freeze({
      secret: notifySecret,
      askMessages: notifyAskMessages,
      notify: notifyNotify,
      commandTools: Object.freeze({
        messaging: Object.freeze({
          messaging: Object.freeze({
            messagingContribution: commandsMessagingMessaging.messagingContribution,
          }),
        }),
      }),
      discord: Object.freeze({
        commands: discordCommands,
        gateway: discordGateway,
        replies: discordReplies,
        bot: discordBot,
      }),
    }),
    integrations: Object.freeze({
      notion: Object.freeze({
        commandTools: Object.freeze({
          notionAssociate: Object.freeze({
            CLEAR_SENTINEL: commandsNotionAssociate.CLEAR_SENTINEL,
          }),
          notionSyncWork: Object.freeze({
            NOTION_SETUP_HINT: commandsNotionSyncWork.NOTION_SETUP_HINT,
            defaultNotionSpawnFor: commandsNotionSyncWork.defaultNotionSpawnFor,
          }),
        }),
        mapping: notionMapping,
        sync: notionSync,
        cli: notionCli,
        syncWork: notionSyncWork,
      }),
    }),
    async close() {
      try { await lifetime.close(); }
      finally { for (const entry of meshWorkerExecution.listActiveWorktrees()) meshWorkerExecution.clearActiveWorktree(entry.assignmentId); }
    },
  });
  return { application };
}

export function createApplication(options) {
  return assembleApplication(options).application;
}
