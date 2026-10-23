// THE integration registry (169/ADR-003) — the ONE module under packages/core/src that names an
// integration package (FF-16901). Each integration reaches core through a single static contribution
// (169/ADR-002): its `work.integrations` id, the package whose `assets/bundle.json` core appends to
// its own descriptor (bundle.mjs), and its verbs (command-core.mjs). Adding an integration is one
// package plus one line here.
//
// Static imports, never a node_modules scan: esbuild bundles the packaged binary from them, and a
// runtime scan would break the embedded fallback.
import { contribution as hyperagent } from "@aof/integration-hyperagent/contribution";

export const INTEGRATIONS = Object.freeze([hyperagent]);

// Whether a project enables an integration (169/ADR-005): its `work.integrations.<id>` block is
// present — an empty object is enough. The switch Notion already uses: absent ≡ off.
export function integrationEnabled(config, id) {
  return config?.work?.integrations?.[id] != null;
}
