// Compatibility entry; construction belongs to core application assembly.
import { configInspect } from "./application/default.mjs";
export const {
  inspectConfig,
  inspectGlobalConfig,
  adapterWarningsForConfig,
  validateConfig,
  validateGlobalConfig,
  doctorConfig,
  notionAuthCheck,
  managedToolChecks,
  providerPrereqCheck,
  toolPlatformCheckFor,
  toolPlatformChecks,
  resolveWorkDiagrams,
  planEnabledFromConfig,
  examplesEnabledFromConfig,
} = configInspect;
