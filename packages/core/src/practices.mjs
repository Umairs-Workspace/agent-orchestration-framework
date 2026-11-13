// THE practices registry (179/ADR-004 §4) — the ONE module under packages/core/src that names a
// practice package whose `assets/bundle.json` the bundle appends to core's descriptor. A practice is
// not an integration: its members carry no `integration` key, so no `work.integrations` switch gates
// them (bundle-synthesis.mjs), and it is kept apart from `integrations.mjs`, which FF-16901 holds to
// integration packages. A practice's fragments are gated by its own declared keys (192/ADR-002 §8):
// specification by example's prose reaches a project only when `work.examples.enabled` is on. `readDescriptor` and `scripts/sea-asset-manifest.mjs` walk INTEGRATIONS, then
// PRACTICES. Array order is registration order.
//
// Static imports, never a node_modules scan: esbuild bundles the packaged binary from them.
import { contribution as learning } from "@aof/learning/contribution";
import { contribution as specificationByExample } from "@aof/specification-by-example/contribution";

export const PRACTICES = Object.freeze([learning, specificationByExample]);
