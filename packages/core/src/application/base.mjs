import { createFoundationServices } from './foundation.mjs';
import { createWorkspaceServices } from './workspace.mjs';
import { createSessionDriverServices } from './session-driver.mjs';
import { createSessionHooksServices } from './session-hooks.mjs';

export function createBaseServices({ env = process.env } = {}) {
  const foundation = createFoundationServices({ env });
  const workspace = createWorkspaceServices(foundation);
  const driver = createSessionDriverServices(foundation);
  const hooks = createSessionHooksServices({ ...foundation, ...workspace });
  return { ...foundation, ...workspace, ...driver, ...hooks };
}
