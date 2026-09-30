// Compatibility entry; construction belongs to core application assembly.
import { loopDiag } from "./application/default.mjs";
export const {
  LOOP_DIAG_ENV,
  LOOP_DIAG_PREFIX,
  LOOP_DIAG_KEEP,
  formatLoopDiagLine,
  installLoopDiagnostics,
  loopDiagEnabled,
  loopDiagLogDir,
  loopDiagLogPath,
  loopDiagScopeTag,
  pruneLoopDiagLogs,
  readLastLoopDiagEvent,
} = loopDiag;
