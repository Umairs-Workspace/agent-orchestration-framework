// Regenerates the shipped ACD bundle manifest (packages/core/assets/manifest.json).
//
// The manifest is DERIVED from the bundle, never hand-maintained (ADR-002).
// Run after changing any bundle body; a fitness function
// (acd-bundle-manifest-hashes) fails CI if the shipped manifest drifts from the
// rendered bundle, so a stale manifest cannot ship.
import { writeFileSync } from "node:fs";
import { generateBundleManifest, serializeBundleManifest, manifestPath } from "aof/bundle-manifest";

const manifest = generateBundleManifest();
const target = manifestPath();
writeFileSync(target, serializeBundleManifest(manifest), "utf8");
console.log(`wrote ${target} (${manifest.entries.length} entries, bundleVersion ${manifest.bundleVersion})`);
