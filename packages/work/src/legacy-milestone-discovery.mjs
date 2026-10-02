import path from "node:path";
import { readdirSync, existsSync } from "node:fs";

// Tolerant milestone-folder resolution for the integration verbs (associate/sync): a
// repo may name its milestone folders in the GSD `NN-slug` form (or `NN_slug`), not
// aof's `NN_milestone_slug`. The shared `listItems`/ITEM_RE only sees the aof form,
// so this is the FALLBACK the integration commands use when listItems misses — it
// scans the work dir for a folder whose name LEADS with the ref and carries a record
// doc (AOF.md/SPEC.md), synthesising a top-level milestone item so a GSD-managed
// repo's milestones are associable WITHOUT a rename. Mirrors the import reader's
// folder-name tolerance ([[aof-import-milestone-naming]]). Returns the item or null.
const NUMBERED_FOLDER_RE = /^(\d+)[-_]+(.+)$/;
export function resolveMilestoneFolderByRef(workDir, ref) {
  let entries;
  try {
    entries = readdirSync(workDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(NUMBERED_FOLDER_RE);
    if (!match || match[1] !== String(ref)) continue;
    const dir = path.join(workDir, entry.name);
    // Only a folder that actually carries a record doc is a milestone folder.
    if (!existsSync(path.join(dir, "AOF.md")) && !existsSync(path.join(dir, "SPEC.md"))) continue;
    return { ref: match[1], number: Number.parseInt(match[1], 10), type: "milestone", parent: null, dir, slug: match[2] };
  }
  return null;
}
