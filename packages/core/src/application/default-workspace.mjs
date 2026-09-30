import { defaultFoundation } from './default-foundation.mjs';
import { createWorkspaceServices } from './workspace.mjs';
export const defaultWorkspace = createWorkspaceServices(defaultFoundation);
