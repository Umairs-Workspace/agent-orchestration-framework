import { assembleMeshStore } from './bindings/mesh/store.mjs';
import { assembleMeshSession } from './bindings/mesh/session.mjs';
import { assembleCommandsMeshSession } from './bindings/commands/mesh/session.mjs';

export function createSessionHooksServices({ workspace, degrade, work }) {

  const meshStore = assembleMeshStore({ workspaceServices: workspace });
  const meshSession = assembleMeshSession({ meshStoreServices: meshStore, degradeServices: degrade });
  const commandsMeshSession = assembleCommandsMeshSession({ workServices: work, meshSessionServices: meshSession, degradeServices: degrade });
  return { meshStore, meshSession, commandsMeshSession };
}
