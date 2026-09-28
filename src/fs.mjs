// Compatibility adapter for the shared filesystem API. Core supplies diagnostics only.
import { createTempFileSweeper } from '@aof/foundation/fs';
import { reportDegrade } from './degrade.mjs';
export { readJson, writeText, normalizeId } from '@aof/foundation/fs';
export const sweepStaleTempFiles = createTempFileSweeper({ reportDegrade });
