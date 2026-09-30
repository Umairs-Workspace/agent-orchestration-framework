import { defaultFoundation } from './default-foundation.mjs';
import { createSessionDriverServices } from './session-driver.mjs';
export const defaultSessionDriver = createSessionDriverServices(defaultFoundation);
