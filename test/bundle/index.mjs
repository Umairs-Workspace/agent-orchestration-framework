// THE BUNDLE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 55 / story 04 â€” declaration compilation, surgical permissions,
// coded tamper, and the human ownership-marker escape hatch (FF-5505/FF-5506).
import { frozenSetCompiledTests } from "./frozen-set-compiled.test.mjs";
import { opencodeHookTests } from "./opencode-hooks.test.mjs";
import { adapterWarningTests } from "./adapter-warnings.test.mjs";
import { packageTests } from "./packages.test.mjs";
import { bundleTests } from "./bundle.test.mjs";
import { toolProviderRegistryTests } from "./tool-provider-registry.test.mjs";
// milestone 12 — managed tool provisioning (story 01: the lifecycle surface —
// the project:provision command + CLI dispatch, ADR-003 task 00; the three
// store-aware doctorConfig checks superseding graphify-binary, ADR-003 task 01;
// @executable traceability)
import { toolProvisionCommandTests } from "./tool-provision-command.test.mjs";
import { toolDoctorChecksTests } from "./tool-doctor-checks.test.mjs";
// milestone 27 fleet issue/assign write-route tests are retired with the removed fleet write surface.
// story 30 — per-agent model selection (task 01: bundle default map; task 02:
// per-project config override wins + validation; task 03: solo-mode inert map)
import { bundleModelMapTests } from "./bundle-model-map.test.mjs";
import { adapterTests } from "./adapters.test.mjs";
import { cleanTests } from "./clean.test.mjs";
import { schemaTests } from "./schema.test.mjs";
// milestone 49 / story 07 — the DISTRIBUTED bundle wires the same three lifecycle
// events m38 hand-wired in this one repo, so a workspace `aof work update` provisions
// records Claude sessions instead of leaving the terminals home empty everywhere but
// here.
import { bundleClaudeSessionHookTests } from "./bundle-claude-session-hooks.test.mjs";
// milestone 28 — console-app (story 00: self-contained-binary — ADR-001/002/003/004).
// src/asset-base.mjs is the ONE SEA-safe asset-base seam (assetBase/readAssetText/
// listAssetMembers/packageVersionString, an injectable isPackaged sentinel +
// sidecar anchor mirroring terminal-ws.mjs's injected spawn); all 7 import.meta.url
// sites (work-bundle.mjs's bundleRoot + its readdir/readFile walkers, board-serve.mjs,
// setup-ui.mjs, mesh-ui-serve.mjs, work-bundle-manifest.mjs, commands/mesh-identity.mjs,
// and cli.mjs's dev-only vite re-exec) route through it — dev behaviour byte-for-byte
// unchanged. terminal-ws.mjs's node-pty load re-homes to createRequire(process.execPath)
// under a SEA (dev keeps the dynamic import), factored through the new
// createTerminalSpawn(ptyLoader) seam for in-process testability. cli.mjs gains a
// `--version` argv branch (ADR-004: node mode = everything but mesh relay, an argv
// branch of the SAME run(), never a fork). The greenfield SEA build recipe
// (scripts/sea-entry.mjs, scripts/sea-asset-manifest.mjs, scripts/build-sea.mjs) esbuild-
// bundles the ESM app to CJS (node-pty + the asset trees externalized, asserted from the
// esbuild --metafile), generates the sidecar asset tree, and blobs+postjects a real
// unsigned aof.exe on this reference OS (confirmed manually: --version, mesh relay
// --json, a live PTY over the sidecar, and the missing-sidecar degrade all ran clean).
// Four @executable task features (00_asset-base-seam / 02_native-addon-sidecar /
// 03_single-entry-two-mode @executable; 01_sea-build-recipe is @manual, no test file)
// + the four fitness/build units: acd-sea-safe-asset-base (#1), acd-single-entry-
// command-core (#2), acd-native-addon-degrades (#3), and the build-unit
// bundle-asset-manifest-complete (#4, a set-equality over the real trees vs the
// generator's output). acd-bundle-location is CO-TOUCHED (bundleRoot() now routes
// through assetBase(); the import.meta.url resolution assert re-points at
// src/asset-base.mjs; the cwd-independence asserts stay green).
import { assetBaseSeamTests } from "./asset-base-seam.test.mjs";
// TECH_DEBT item 1 — the launcher decouple: build-info (source/payload/embedded
// + the BUILD_ID.json stamp behind --version and the daemons' "Build:" line).
import { buildInfoTests } from "./build-info.test.mjs";
import { nativeAddonSidecarTests } from "./native-addon-sidecar.test.mjs";
import { bundleAssetManifestCompleteTests } from "./bundle-asset-manifest-complete.test.mjs";
// milestone 28 — console-app (story 01: signing-notarization). The
// @executable heart — the SHA256SUMS manifest generator/format/malformed-
// manifest rejection matrix (task 02_checksum-manifest.feature) — plus the
// CI-config lint rows a build agent can assert statically over the checked-in
// release workflow YAML (task 00_ci-build-matrix.feature /
// 01_per-os-signing.feature: declared legs, native-arm64 runners, no
// cross-compile, the Linux node-pty source-compile step, the load-bearing
// inject-before-codesign ordering, per-OS signing tool invocations, and
// secret-name-only references). The full cross-OS matrix run + OS-trust
// clearance (Gatekeeper/SmartScreen) are @uat/@manual, not exercised here.
import { releaseChecksumManifestTests } from "./release-checksum-manifest.test.mjs";
import { releaseWorkflowLintTests } from "./release-workflow-lint.test.mjs";
// milestone 28 — console-app (story 01: signing-notarization, PO pin
// 2026-07-03 resolving the sidecar shape gap): the node-pty sidecar archive
// (extensionless, node-pty's own platform token, gzip'd tar on darwin/linux /
// zip on win32) whose root entries reproduce build-sea.mjs's beside-the-exe
// layout exactly — a real archive-produce -> real-extractor round-trip,
// set-equality both directions.
import { releaseSidecarArchiveRoundtripTests } from "./release-sidecar-archive-roundtrip.test.mjs";
// milestone 28 — console-app (story 01: signing-notarization, craft-review
// F3 HIGH): install.sh's pinned GPG fingerprint is asserted against the CI
// signing key (scripts/release/assert-fingerprint-pin.mjs) — a real
// gpg-keypair round-trip over three fixture install.sh shapes (match,
// self-inconsistent, CI-key-mismatch) plus a check that the real, checked-in
// install.sh is self-consistent today.
import { releaseFingerprintPinTests } from "./release-fingerprint-pin.test.mjs";
import { bundleSpikeChoreMembershipTests } from "./bundle-spike-chore-membership.test.mjs";
import { capabilityRecallSurfacesTests } from "./capability-recall-surfaces.test.mjs";
// milestone 43 / story 03 — WRITE-TRIGGERED ARTIFACT SYNC (ADR-001/002/007 + ADR-013).
// REGISTERED 2026-08-03 by 43/04's structural review (ADR-014/E7): these four were imported
// by NEITHER runner, so an ACCEPTED story's behavioural proof had never once run in CI —
// the enqueue hook's derivation-free body, the daemon's batched drain, the two-kind artifact
// manifest, and the co-authored .claude/settings.json merge. All four were green on the day
// they were found; the gap was registration, not correctness. `acd-test-suite-registration`
// now makes the next orphan fail CI instead of waiting for a reviewer to notice.
import { artifactSyncEnqueueHookTests } from "./artifact-sync-enqueue-hook.test.mjs";
import { artifactSyncDrainTests } from "./artifact-sync-drain.test.mjs";
import { artifactSyncManifestTests } from "./artifact-sync-manifest.test.mjs";
import { claudeSettingsMergeTests } from "./claude-settings-merge.test.mjs";
import { bundleAsksRunnablePathTests } from "./bundle-asks-runnable-path.test.mjs";
import { bundleAsksUnnumberedFindingsTests } from "./bundle-asks-unnumbered-findings.test.mjs";
// story 125 — the loop graph gets a published face. Task 00's static lint over the Pages
// workflow (`.github/workflows/pages.yml`: one publishing workflow, deploy needs gate, the
// PR/push/dispatch split, permission scoping, concurrency, the shell-committed/content-not
// claim, and the lint's own comment-blindness, line-ending agnosticism and non-vacuity) plus
// task 01's rows driving the staging step (`scripts/site/build-site.mjs`: provenance per page,
// authored-as-authored, missing-source refusal, write scope, idempotence, the gate-runs-79's-
// control claim, the registry-edit-stops-the-deploy proof run the way the workflow runs it,
// and the pinned Mermaid promotion). The live site is @uat in both features.
import { siteBuildTests } from "./site-build.test.mjs";

// milestone 133 / story 05 — the architect draws, told how by `aof diagram plan` (ADR-008).
import { bundleArchitectDrawsTests } from "./bundle-architect-draws.test.mjs";
export const tests = [
  // milestone 55 / story 04 â€” frozen rules reach their declared boundaries or refuse
  ...frozenSetCompiledTests,
  ...opencodeHookTests,
  ...adapterWarningTests,
  ...packageTests,
  ...bundleTests,
  ...toolProviderRegistryTests,
  ...toolProvisionCommandTests,
  ...toolDoctorChecksTests,
  // story 30 — per-agent model selection
  ...bundleModelMapTests,
  ...adapterTests,
  ...cleanTests,
  ...schemaTests,
  ...bundleClaudeSessionHookTests,
  // milestone 28 — console-app (story 00: self-contained-binary)
  ...assetBaseSeamTests,
  ...buildInfoTests,
  ...nativeAddonSidecarTests,
  ...bundleAssetManifestCompleteTests,
  // milestone 28 — console-app (story 01: signing-notarization)
  ...releaseChecksumManifestTests,
  ...releaseWorkflowLintTests,
  ...releaseSidecarArchiveRoundtripTests,
  ...releaseFingerprintPinTests,
  ...bundleSpikeChoreMembershipTests,
  ...capabilityRecallSurfacesTests,
  // milestone 43 / story 03 — write-triggered artifact sync (registered by ADR-014/E7)
  ...artifactSyncEnqueueHookTests,
  ...artifactSyncDrainTests,
  ...artifactSyncManifestTests,
  ...claudeSettingsMergeTests,
  ...bundleAsksRunnablePathTests,
  ...bundleAsksUnnumberedFindingsTests,
  // story 125 — the published site: workflow lint + staging step
  ...siteBuildTests,
  // milestone 133 / story 05 — the one diagram step in the architect rule and refine Decide.
  ...bundleArchitectDrawsTests,
];
