// Compatibility entry; construction belongs to core application assembly.
import { defaultFoundation } from "./application/default-foundation.mjs";
export const readJson = defaultFoundation.fs.readJson;
export const writeText = defaultFoundation.fs.writeText;
export const normalizeId = defaultFoundation.fs.normalizeId;
export const sweepStaleTempFiles = defaultFoundation.fs.sweepStaleTempFiles;
