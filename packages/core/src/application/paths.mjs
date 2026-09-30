import * as paths from '../workspace.mjs';

// A supplied environment belongs to this application, never to process.env. Per-call
// overrides still win, as they did on the original path APIs.
export function createPathPolicy(env) {
  return {
    ...paths,
    globalMeshPaths: (options = {}) => paths.globalMeshPaths({ env, ...options }),
    globalWorkspacePaths: (options = {}) => paths.globalWorkspacePaths({ env, ...options }),
    findProjectConfig: (cwd, config, options = {}) => paths.findProjectConfig(cwd, config, { env, ...options }),
  };
}
