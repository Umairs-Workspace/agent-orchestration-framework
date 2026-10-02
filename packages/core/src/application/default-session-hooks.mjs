import { defaultFoundation } from './default-foundation.mjs';
import { defaultWorkspace } from './default-workspace.mjs';
import { createSessionHooksServices } from './session-hooks.mjs';
export const defaultSessionHooks = createSessionHooksServices({ ...defaultFoundation, ...defaultWorkspace });
