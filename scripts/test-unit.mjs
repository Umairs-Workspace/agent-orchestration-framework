import { adapterTests } from "../test/bundle/adapters.test.mjs";
import { opencodeHookTests } from "../test/bundle/opencode-hooks.test.mjs";
import { catalogTests } from "../test/ui/catalog.test.mjs";
import { pathTests } from "../test/work/paths.test.mjs";
import { promptTests } from "../test/command/prompt.test.mjs";
import { modelTests } from "../test/session/model.test.mjs";
import { workspaceTests } from "../test/work/workspace.test.mjs";
import { renderPlanTests } from "../test/ui/render-plan.test.mjs";
import { configInspectTests } from "../test/command/config-inspect.test.mjs";
import { configEditorTests } from "../test/command/config-editor.test.mjs";
import { frameworkTests } from "../test/work/frameworks.test.mjs";
import { cleanTests } from "../test/bundle/clean.test.mjs";
import { dslPrimitiveTests } from "../test/command/dsl-primitives.test.mjs";
import { setupUiTests } from "../test/ui/setup-ui.test.mjs";
import { schemaTests } from "../test/bundle/schema.test.mjs";
import { adapterWarningTests } from "../test/bundle/adapter-warnings.test.mjs";
import { packageTests } from "../test/bundle/packages.test.mjs";
import { workTests } from "../test/work/work.test.mjs";
import { globalWorkStoreTests } from "../test/store/global-work-store.test.mjs";
import { globalWorkPropagationTests } from "../test/store/global-work-propagation.test.mjs";
import { meshRepoPublishTests } from "../test/mesh/mesh-repo-publish.test.mjs";
import { globalNodeRegistryTests } from "../test/mesh/registry/global-node-registry.test.mjs";
import { resolveItemsTests } from "../test/work/lifecycle/work-resolve.test.mjs";
import { validateStreamTests } from "../test/work/gate/work-validate.test.mjs";
import { orderWorkTests } from "../test/work/lifecycle/work-next.test.mjs";
import { archTests as workContentFreeDiscoveryTests } from "../test/arch/work/work-content-free-discovery.test.mjs";
import { archTests as acdGlobalMeshPathsHomeTests } from "../test/arch/mesh/acd-global-mesh-paths-home.test.mjs";
import { archTests as acdGlobalStoreNoNativeDepTests } from "../test/arch/store/acd-global-store-no-native-dep.test.mjs";
import { archTests as acdGlobalPropagationSinglePredicateTests } from "../test/arch/store/acd-global-propagation-single-predicate.test.mjs";
import { archTests as acdGlobalPublisherSingleSeamTests } from "../test/arch/store/acd-global-publisher-single-seam.test.mjs";
import { archTests as acdGlobalNodeDescriptorsRedactSecretsTests } from "../test/arch/mesh/acd-global-node-descriptors-redact-secrets.test.mjs";
import { archTests as acdGlobalNodeRegistryProjectionOnlyTests } from "../test/arch/mesh/acd-global-node-registry-projection-only.test.mjs";
// milestone 34 / story 03 — mesh UI global scope (ADR-006): the global-mesh-query
// composition seam + its own tests, the mesh-ui-global-scope CLI/API behaviour
// tests, the pure fleet scope.mjs helper tests, and the story's 3 fitness units.
import { globalMeshQueryTests } from "../test/mesh/global-mesh-query.test.mjs";
import { meshUiGlobalScopeTests } from "../test/mesh/ui/mesh-ui-global-scope.test.mjs";
import { fleetScopeTests } from "../test/ui/fleet-scope.test.mjs";
import { archTests as acdMeshUiGlobalDefaultTests } from "../test/arch/mesh/acd-mesh-ui-global-default.test.mjs";
import { archTests as acdMeshUiLocalFilterPreservesStatusTests } from "../test/arch/mesh/acd-mesh-ui-local-filter-preserves-status.test.mjs";
import { archTests as acdMeshUiScopeVisibleTests } from "../test/arch/mesh/acd-mesh-ui-scope-visible.test.mjs";
// milestone 34 / story 04 — worker live-state stream to control node (ADR-007): the
// worker-role/control-address resolution, the persistent worker stream client
// (snapshot-first-then-deltas, reconnect+backoff, failure isolation), the always-on
// control-node stream server (tailnet-only admission, apply+redact, liveness), and
// the stream retry/reconciliation/freshness lanes, plus the story's 4 fitness
// units. Tasks 00–03 are @executable; task 04 (the real two-machine soak) is @manual
// and deliberately has no test file here.
import { workerRoleAddressTests } from "../test/work/worker-role-address.test.mjs";
import { workerStreamClientTests } from "../test/work/worker-stream-client.test.mjs";
import { controlStreamServerTests } from "../test/mesh/relay/control-stream-server.test.mjs";
import { meshLauncherStreamRoleTests } from "../test/mesh/launcher/mesh-launcher-stream-role.test.mjs";
import { meshLauncherLockTests } from "../test/mesh/launcher/mesh-launcher-lock.test.mjs";
import { globalNodeIdentityTests } from "../test/mesh/identity/global-node-identity.test.mjs";
import { archTests as acdGlobalNodeIdentityHomeTests } from "../test/arch/mesh/acd-global-node-identity-home.test.mjs";
import { archTests as acdWorkerStreamSinglePredicateTests } from "../test/arch/assignment/acd-worker-stream-single-predicate.test.mjs";
import { archTests as acdWorkerStreamFabricAddressedTests } from "../test/arch/assignment/acd-worker-stream-fabric-addressed.test.mjs";
import { archTests as acdWorkerStreamNonBlockingTests } from "../test/arch/assignment/acd-worker-stream-non-blocking.test.mjs";
import { archTests as acdControlStreamTailnetOnlyTests } from "../test/arch/mesh/acd-control-stream-tailnet-only.test.mjs";
import { archTests as acdControlStreamAddressBoundTests } from "../test/arch/mesh/acd-control-stream-address-bound.test.mjs";
import { bundleTests } from "../test/bundle/bundle.test.mjs";
import { workInitTests } from "../test/work/work-init.test.mjs";
import { workUpdateTests } from "../test/work/work-update.test.mjs";
import { archTests as acdBundleMembershipTests } from "../test/arch/bundle/acd-bundle-membership.test.mjs";
import { archTests as acdBundleLocationTests } from "../test/arch/bundle/acd-bundle-location.test.mjs";
import { archTests as acdBundleManifestHashesTests } from "../test/arch/bundle/acd-bundle-manifest-hashes.test.mjs";
import { archTests as acdCommandNamespaceTests } from "../test/arch/command/acd-command-namespace.test.mjs";
import { archTests as acdReusesRenderPlanTests } from "../test/arch/ui/acd-reuses-render-plan.test.mjs";
import { archTests as acdInstallManifestContractTests } from "../test/arch/bundle/acd-install-manifest-contract.test.mjs";
import { archTests as acdGeneratedStampTests } from "../test/arch/bundle/acd-generated-stamp.test.mjs";
import { archTests as acdCapabilityDelegationTests } from "../test/arch/bundle/acd-capability-delegation.test.mjs";
import { archTests as acdNoClobberWithoutForceTests } from "../test/arch/store/acd-no-clobber-without-force.test.mjs";
import { planningInitTests } from "../test/planning/planning-init.test.mjs";
import { planningPrdTests } from "../test/planning/planning-prd.test.mjs";
import { archTests as acdPlanningInstallCommandsTests } from "../test/arch/planning/acd-planning-install-commands.test.mjs";
import { archTests as acdPlanningProvenanceShaTests } from "../test/arch/planning/acd-planning-provenance-sha.test.mjs";
import { archTests as acdPlanningLockIsolationTests } from "../test/arch/planning/acd-planning-lock-isolation.test.mjs";
import { archTests as acdPlanningNoCodexInstallTests } from "../test/arch/planning/acd-planning-no-codex-install.test.mjs";
import { archTests as acdPlanningClonableRefTests } from "../test/arch/planning/acd-planning-clonable-ref.test.mjs";
import { archTests as acdUnifiedLockSectionsTests } from "../test/arch/store/acd-unified-lock-sections.test.mjs";
import { workMemorySeamTests } from "../test/work/lifecycle/work-memory-seam.test.mjs";
import { memoryIndexingTests } from "../test/memory/memory-indexing.test.mjs";
import { memoryRetrievalTests } from "../test/memory/memory-retrieval.test.mjs";
import { archTests as acdMemoryBackendSelectionTests } from "../test/arch/memory/acd-memory-backend-selection.test.mjs";
import { archTests as acdMemoryDerivedIndexTests } from "../test/arch/memory/acd-memory-derived-index.test.mjs";
import { archTests as acdMemoryIndexLocationTests } from "../test/arch/memory/acd-memory-index-location.test.mjs";
import { archTests as acdMemoryRankingTests } from "../test/arch/memory/acd-memory-ranking.test.mjs";
import { archTests as acdMemoryBackendInterfaceTests } from "../test/arch/memory/acd-memory-backend-interface.test.mjs";
import { archTests as acdMemoryRecallContractTests } from "../test/arch/memory/acd-memory-recall-contract.test.mjs";
import { memoryIntegrationTests } from "../test/memory/memory-integration.test.mjs";
import { memoryRecallBlockTests } from "../test/memory/memory-recall-block.test.mjs";
import { memoryHooksInertTests } from "../test/memory/memory-hooks-inert.test.mjs";
// milestone 03 — work board UI
import { workListTests } from "../test/work/lifecycle/work-list.test.mjs";
import { archTests as acdWorkListContractTests } from "../test/arch/work/acd-work-list-contract.test.mjs";
import { boardApiTests } from "../test/ui/board-api.test.mjs";
import { archTests as acdBoardWriteIsolationTests } from "../test/arch/ui/acd-board-write-isolation.test.mjs";
import { terminalDockTests } from "../test/session/terminal-dock.test.mjs";
import { terminalWsTests } from "../test/session/terminal-ws.test.mjs";
import { archTests as acdTerminalServerOnlyTests } from "../test/arch/session/acd-terminal-server-only.test.mjs";
import { archTests as acdVibeyardAttributionTests } from "../test/arch/ui/acd-vibeyard-attribution.test.mjs";
import { archTests as acdBoardSingleServerTests } from "../test/arch/ui/acd-board-single-server.test.mjs";
// milestone 04 — round-trip proof (story 00: the frozen harness)
import { roundtripHarnessTests } from "../test/work/roundtrip-harness.test.mjs";
import { archTests as acdRoundtripIsolationTests } from "../test/arch/work/acd-roundtrip-isolation.test.mjs";
import { archTests as acdRoundtripReusesShippedCodeTests } from "../test/arch/work/acd-roundtrip-reuses-shipped-code.test.mjs";
import { archTests as acdRoundtripHarnessContractTests } from "../test/arch/work/acd-roundtrip-harness-contract.test.mjs";
import { archTests as acdRoundtripRegistrationTests } from "../test/arch/work/acd-roundtrip-registration.test.mjs";
// milestone 04 — round-trip proof (story 01: install-proof, story 02: loop-proof)
import { installProofTests } from "../test/work/roundtrip-install-proof.test.mjs";
import { loopProofTests } from "../test/work/roundtrip-loop-proof.test.mjs";

const tests = [
  ...adapterWarningTests,
  ...packageTests,
  ...workTests,
  ...globalWorkStoreTests,
  ...globalWorkPropagationTests,
  ...meshRepoPublishTests,
  ...resolveItemsTests,
  ...validateStreamTests,
  ...orderWorkTests,
  ...workContentFreeDiscoveryTests,
  ...acdGlobalMeshPathsHomeTests,
  ...acdGlobalStoreNoNativeDepTests,
  ...acdGlobalPropagationSinglePredicateTests,
  ...acdGlobalPublisherSingleSeamTests,
  ...globalNodeRegistryTests,
  ...acdGlobalNodeDescriptorsRedactSecretsTests,
  ...acdGlobalNodeRegistryProjectionOnlyTests,
  ...globalMeshQueryTests,
  ...meshUiGlobalScopeTests,
  ...fleetScopeTests,
  ...acdMeshUiGlobalDefaultTests,
  ...acdMeshUiLocalFilterPreservesStatusTests,
  ...acdMeshUiScopeVisibleTests,
  ...workerRoleAddressTests,
  ...workerStreamClientTests,
  ...controlStreamServerTests,
  ...meshLauncherStreamRoleTests,
  ...meshLauncherLockTests,
  ...globalNodeIdentityTests,
  ...acdGlobalNodeIdentityHomeTests,
  ...acdWorkerStreamSinglePredicateTests,
  ...acdWorkerStreamFabricAddressedTests,
  ...acdWorkerStreamNonBlockingTests,
  ...acdControlStreamTailnetOnlyTests,
  ...acdControlStreamAddressBoundTests,
  ...bundleTests,
  ...workInitTests,
  ...workUpdateTests,
  ...acdBundleMembershipTests,
  ...acdBundleLocationTests,
  ...acdBundleManifestHashesTests,
  ...acdCommandNamespaceTests,
  ...acdReusesRenderPlanTests,
  ...acdInstallManifestContractTests,
  ...acdGeneratedStampTests,
  ...acdCapabilityDelegationTests,
  ...acdNoClobberWithoutForceTests,
  ...planningInitTests,
  ...planningPrdTests,
  ...acdPlanningInstallCommandsTests,
  ...acdPlanningProvenanceShaTests,
  ...acdPlanningLockIsolationTests,
  ...acdPlanningNoCodexInstallTests,
  ...acdPlanningClonableRefTests,
  ...acdUnifiedLockSectionsTests,
  ...workMemorySeamTests,
  ...memoryIndexingTests,
  ...memoryRetrievalTests,
  ...acdMemoryBackendSelectionTests,
  ...acdMemoryDerivedIndexTests,
  ...acdMemoryIndexLocationTests,
  ...acdMemoryRankingTests,
  ...acdMemoryBackendInterfaceTests,
  ...acdMemoryRecallContractTests,
  ...memoryIntegrationTests,
  ...memoryRecallBlockTests,
  ...memoryHooksInertTests,
  ...workListTests,
  ...acdWorkListContractTests,
  ...boardApiTests,
  ...acdBoardWriteIsolationTests,
  ...terminalDockTests,
  ...terminalWsTests,
  ...acdTerminalServerOnlyTests,
  ...acdVibeyardAttributionTests,
  ...acdBoardSingleServerTests,
  ...roundtripHarnessTests,
  ...acdRoundtripIsolationTests,
  ...acdRoundtripReusesShippedCodeTests,
  ...acdRoundtripHarnessContractTests,
  ...acdRoundtripRegistrationTests,
  ...installProofTests,
  ...loopProofTests,
  ...adapterTests,
  ...opencodeHookTests,
  ...renderPlanTests,
  ...configInspectTests,
  ...configEditorTests,
  ...frameworkTests,
  ...cleanTests,
  ...dslPrimitiveTests,
  ...setupUiTests,
  ...schemaTests,
  ...modelTests,
  ...workspaceTests,
  ...pathTests,
  ...promptTests,
  ...catalogTests
];

let failures = 0;

// Per-test hermetic global AOF home (34/story 00): the node identity is now MACHINE-WIDE
// (globalMeshPaths().identityPath, honoring AOF_GLOBAL_HOME). In a single-process runner a
// test that mints identity would otherwise pollute the real machine home AND override every
// later test's committed config.mesh.nodeId. Give each test its OWN empty global home so
// identity/global-store state never leaks across tests and the real machine is never touched.
// (A test that sets AOF_GLOBAL_HOME itself just overrides this for its own duration.)
const { tmpdir } = await import("node:os");
const { join } = await import("node:path");
const { rmSync } = await import("node:fs");
const ghRoot = join(tmpdir(), `aof-test-gh-${process.pid}`);
let ghIndex = 0;

for (const { name, run } of tests) {
  const prevHome = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = join(ghRoot, `t-${ghIndex++}`);
  try {
    await run();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error.stack ?? error.message);
  } finally {
    if (prevHome === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = prevHome;
  }
}
try { rmSync(ghRoot, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }

if (failures > 0) {
  process.exitCode = 1;
}
