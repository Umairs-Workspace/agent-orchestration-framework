// Compatibility composition; @aof/work-loop owns the implementation.
import { createLoopDiagnostics } from "@aof/work-loop/diagnostics";
import { globalMeshPaths } from "./workspace.mjs";
import { reportDegrade } from "./degrade.mjs";
import { buildInfoString, readBuildInfo } from "./build-info.mjs";

export { LOOP_DIAG_ENV, LOOP_DIAG_PREFIX, LOOP_DIAG_KEEP } from "@aof/work-loop/diagnostics";

const implementation = createLoopDiagnostics({
  runtimePaths: { globalMeshPaths },
  diagnostics: { reportDegrade },
  buildInfo: { buildInfoString, readBuildInfo },
});

export const formatLoopDiagLine = implementation.formatLoopDiagLine;
export const installLoopDiagnostics = implementation.installLoopDiagnostics;
export const loopDiagEnabled = implementation.loopDiagEnabled;
export const loopDiagLogDir = implementation.loopDiagLogDir;
export const loopDiagLogPath = implementation.loopDiagLogPath;
export const loopDiagScopeTag = implementation.loopDiagScopeTag;
export const pruneLoopDiagLogs = implementation.pruneLoopDiagLogs;
export const readLastLoopDiagEvent = implementation.readLastLoopDiagEvent;
