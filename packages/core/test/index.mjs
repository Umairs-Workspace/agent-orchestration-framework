import { buildInfoTests } from "./build-info.suite.mjs";
import { bundleModelMapTests } from "./bundle-model-map.suite.mjs";
import { bundleSpikeChoreMembershipTests } from "./bundle-spike-chore-membership.suite.mjs";
import { bundleTests } from "./bundle.suite.mjs";
import { cleanTests } from "./clean.suite.mjs";
import { frozenSetCompiledTests } from "./frozen-set-compiled.suite.mjs";
import { opencodeHookTests } from "./opencode-hooks.suite.mjs";
import { packageTests } from "./packages.suite.mjs";
import { toolProviderRegistryTests } from "./tool-provider-registry.suite.mjs";
import { promptTests } from "./prompt.suite.mjs";
import { diagramGeneratorTests } from "./diagram-generator.suite.mjs";
import { notionDescriptorTests } from "./notion-descriptor.suite.mjs";
import { headroomStoreFirstTests } from "./headroom-store-first.suite.mjs";
import { planningInitTests } from "./planning-init.suite.mjs";
import { identitySidecarPersistTests } from "./identity-sidecar-persist.suite.mjs";
import { modelTests } from "./model.suite.mjs";
import { toolStorePathResolutionTests } from "./tool-store-path-resolution.suite.mjs";
import { catalogTests } from "./catalog.suite.mjs";
import { frameworkTests } from "./frameworks.suite.mjs";
import { workOrchestratorTests } from "./work-orchestrator.suite.mjs";
import { pathTests } from "./paths.suite.mjs";
import { recordsFollowTheStoryTests } from "./records-follow-the-story.suite.mjs";
import { workUpdateTests } from "./work-update.suite.mjs";
import { workspaceTests } from "./workspace.suite.mjs";

export const tests = [
  ...buildInfoTests,
  ...bundleModelMapTests,
  ...bundleSpikeChoreMembershipTests,
  ...bundleTests,
  ...cleanTests,
  ...frozenSetCompiledTests,
  ...opencodeHookTests,
  ...packageTests,
  ...toolProviderRegistryTests,
  ...promptTests,
  ...diagramGeneratorTests,
  ...notionDescriptorTests,
  ...headroomStoreFirstTests,
  ...planningInitTests,
  ...identitySidecarPersistTests,
  ...modelTests,
  ...toolStorePathResolutionTests,
  ...catalogTests,
  ...frameworkTests,
  ...workOrchestratorTests,
  ...pathTests,
  ...recordsFollowTheStoryTests,
  ...workUpdateTests,
  ...workspaceTests,
];
