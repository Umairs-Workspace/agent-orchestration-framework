import { createPathPolicy } from './paths.mjs';
import { assembleDiagnosticsLog } from './bindings/diagnostics/log.mjs';
import { assembleDegrade } from './bindings/degrade.mjs';
import { assembleFs } from './bindings/fs.mjs';

export function createFoundationServices({ env = process.env } = {}) {
  const workspace = createPathPolicy(env);
  const diagnosticsLog = assembleDiagnosticsLog({ workspaceServices: workspace });
  const degrade = assembleDegrade({ diagnosticsLogServices: diagnosticsLog, env });
  const fs = assembleFs({ degradeServices: degrade });
  return { env, workspace, diagnosticsLog, degrade, fs };
}
