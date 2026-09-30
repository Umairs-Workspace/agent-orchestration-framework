import path from "node:path";
import { fileURLToPath } from "node:url";

// The installed package location, independent of the subject workspace. Source
// and copied ESM payloads locate their declared manifest. The embedded SEA build
// replaces import.meta.url with undefined; its manifest lives beside the binary.
// Kept separate from asset/UI resolution so audit programs need no module loader.
export function coreRoot() {
  if (import.meta.url) {
    return path.dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));
  }
  return path.dirname(process.execPath);
}
