// THE methodology registry (chore 207) — the ONE module under packages/core/src that names the
// methodology package. A methodology is neither a practice (gated by its own keys) nor an
// integration (gated by `work.integrations`): it is the base every project renders, so there is
// exactly one, and it is not switched. Its `assets/bundle.json` is appended to core's own
// descriptor, which holds only runtime plumbing (bundle.mjs); its assets are the `bundle` asset
// class (asset-base.mjs); and the files core reads by role are named on its contribution, so no
// other core module spells an ACD asset's path (the methodology registry's fitness function).
//
// A static import, never a node_modules scan: esbuild bundles the packaged binary from it.
import { contribution as acd } from "@aof/acd/contribution";

export const METHODOLOGY = acd;

// The path of one of the methodology's by-role files, relative to its asset root.
export function methodologyFile(role) {
  const file = METHODOLOGY.files?.[role];
  if (!file) throw new Error(`methodology: ${METHODOLOGY.name} declares no "${role}" file`);
  return file;
}
