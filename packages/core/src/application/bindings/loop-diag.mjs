// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopDiagnostics } from "@aof/work-loop/diagnostics";
import { buildInfoString, readBuildInfo } from "../../build-info.mjs";
import * as api0 from "@aof/work-loop/diagnostics";

export function assembleLoopDiag({ workspaceServices, degradeServices }) {
  // Core composition; @aof/work-loop owns the implementation.

  const { globalMeshPaths } = workspaceServices;
  const { reportDegrade } = degradeServices;

  const implementation = createLoopDiagnostics({
    runtimePaths: { globalMeshPaths },
    diagnostics: { reportDegrade },
    buildInfo: { buildInfoString, readBuildInfo },
  });

  const formatLoopDiagLine = implementation.formatLoopDiagLine;
  const installLoopDiagnostics = implementation.installLoopDiagnostics;
  const loopDiagEnabled = implementation.loopDiagEnabled;
  const loopDiagLogDir = implementation.loopDiagLogDir;
  const loopDiagLogPath = implementation.loopDiagLogPath;
  const loopDiagScopeTag = implementation.loopDiagScopeTag;
  const pruneLoopDiagLogs = implementation.pruneLoopDiagLogs;
  const readLastLoopDiagEvent = implementation.readLastLoopDiagEvent;

  return { "LOOP_DIAG_ENV": api0.LOOP_DIAG_ENV, "LOOP_DIAG_PREFIX": api0.LOOP_DIAG_PREFIX, "LOOP_DIAG_KEEP": api0.LOOP_DIAG_KEEP, formatLoopDiagLine, installLoopDiagnostics, loopDiagEnabled, loopDiagLogDir, loopDiagLogPath, loopDiagScopeTag, pruneLoopDiagLogs, readLastLoopDiagEvent };
}
