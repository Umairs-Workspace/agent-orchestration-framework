import { defaultFoundation } from './default-foundation.mjs';
import { defaultWorkspace } from './default-workspace.mjs';
import { defaultSessionDriver } from './default-session-driver.mjs';
import { defaultSessionHooks } from './default-session-hooks.mjs';
export const defaultBase = { ...defaultFoundation, ...defaultWorkspace, ...defaultSessionDriver, ...defaultSessionHooks };
