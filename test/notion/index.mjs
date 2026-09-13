// THE NOTION SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 17 — Notion work-board sync (story 00: the spine — notion:sync-work
// registered on the command core + `aof work integrations notion sync-work`
// dispatch (ADR-002); the opt-in no-op gate when work.integrations.notion is absent
// (ADR-004); the `.aof/notion.work-map.json` mapping sidecar round-trip (ADR-001);
// @executable traceability — the projection/apply + arch-tests are later stories)
import { notionSpineCommandTests } from "./notion-spine-command.test.mjs";
import { notionSpineOptinNoopTests } from "./notion-spine-optin-noop.test.mjs";
import { notionMappingSidecarTests } from "./notion-mapping-sidecar.test.mjs";
// milestone 17 — Notion work-board sync (story 01: the projection + one-way sync —
// the PURE projectMilestone plan (00_projection-plan), the --dry-run zero-call
// preview (02_dry-run-zero-calls), and the statusMap projection + honest skip
// (03_status-map-and-honest-skip); ADR-003. @executable traceability — the
// live-Notion create/resync/one-way rows (01/04) are @manual, deferred to verify.)
import { notionProjectionPlanTests } from "./notion-projection-plan.test.mjs";
import { notionApplyIdempotentTests } from "./notion-apply-idempotent.test.mjs";
import { notionDryRunTests } from "./notion-dry-run.test.mjs";
import { notionStatusMapSkipTests } from "./notion-status-map-skip.test.mjs";
// milestone 17 — Notion work-board sync (story 02: the managed Notion CLI + opt-in
// config + doctor — the work.integrations.notion schema block (00_config-block-validates),
// the npx-lane NOTION_DESCRIPTOR (01_descriptor-registered), the env-var-reference
// auth spawn (02_auth-env-reference), and the project-doctor surface
// (03_doctor-surfaces-notion); ADR-004. @executable traceability — the live `ntn`
// install / auth round-trip rows are @manual, deferred to verify.)
import { notionConfigSchemaTests } from "./notion-config-schema.test.mjs";
import { notionDescriptorTests } from "./notion-descriptor.test.mjs";
import { notionAuthEnvTests } from "./notion-auth-env.test.mjs";
import { notionDoctorTests } from "./notion-doctor.test.mjs";
// milestone 18 — per-folder integration descriptor (story 00: the AUTHORING SPINE —
// the new src/integrations/routing.mjs reader/resolver (ADR-001/002/003), the boards
// registry schema oneOf with the flat m17 back-compat arm at the Ajv-2020 seam
// (ADR-002), and the notion:associate rewrite writing/clearing the per-folder
// .integrations.json descriptor as its ONLY mutation (ADR-004/006); all @executable).
// NOTE: the prior frontmatter-mechanism tests (notion-associate*, notion-parents-schema)
// were superseded here and the arch-test FFs (FF-A..F) are authored in story 02.
import { integrationsRoutingReaderTests } from "./integrations-routing-reader.test.mjs";
import { integrationsBoardsRegistryTests } from "./integrations-boards-registry.test.mjs";
import { integrationsAssociateTests } from "./integrations-associate.test.mjs";
// milestone 18 — per-folder integration descriptor (story 01: the CONSUMPTION side —
// the projection reads routing via story 00's resolver and addresses the chosen board's
// dataSourceId, nesting the milestone under its resolved parent via that board's
// relationProperty (ADR-003); no descriptor/parent ⇒ byte-for-byte the m17 projection
// (the no-regression invariant); the v2 multi-board per-data-source sidecar (ADR-005),
// with v1 migration; all @executable. The STRUCTURAL invariants (FF-A/FF-C/FF-D) are
// arch-tests authored in story 02 — the frontmatter-projection tests they supersede
// (notion-parent-projection, acd-notion-parent-projection, acd-notion-association-committed)
// are deleted+unwired HERE as their mechanism is removed by the projection rewrite.)
import { integrationsProjectionBoardRoutingTests } from "./integrations-projection-board-routing.test.mjs";
import { integrationsProjectionParentNestingTests } from "./integrations-projection-parent-nesting.test.mjs";
import { integrationsMultiboardSidecarTests } from "./integrations-multiboard-sidecar.test.mjs";
// milestone 18 — per-folder integration descriptor (story 02: the CLEANUP + FITNESS
// story — the src/work.mjs parseScalarOrCollection revert (drop the `{}` inline-flow-map
// branch, ADR-007) + the notion-top-level `parents` removal, locked by the two task
// feature tests; and the SIX milestone fitness invariants FF-A..F authored here, atomically
// with deleting the five superseded arch-tests (acd-notion-associate-frontmatter-only,
// -association-committed, -parent-no-read, -parent-projection, -parents-schema) and their
// behavioural tests. FF-A descriptor-committed (supersedes -association-committed); FF-B
// reader-is-JSON + the revert (new); FF-C board-resolution + the m17 no-regression arm
// (subsumes -parent-projection); FF-D no-Notion-read + the one-way snapshot (supersedes
// -parent-no-read); FF-E descriptor-extensible (supersedes -parents-schema's extensibility);
// FF-F boards-registry schema at the Ajv-2020 seam (supersedes -parents-schema). KEPT:
// acd-notion-one-way (reaffirmed by FF-D) + acd-notion-mapping-sidecar (re-pointed by story 01).
import { integrationsParserRevertedTests } from "./integrations-parser-reverted.test.mjs";
import { integrationsLegacyRemovedTests } from "./integrations-legacy-removed.test.mjs";

export const tests = [
  ...notionSpineCommandTests,
  ...notionSpineOptinNoopTests,
  ...notionMappingSidecarTests,
  ...notionProjectionPlanTests,
  ...notionApplyIdempotentTests,
  ...notionDryRunTests,
  ...notionStatusMapSkipTests,
  ...notionConfigSchemaTests,
  ...notionDescriptorTests,
  ...notionAuthEnvTests,
  ...notionDoctorTests,
  ...integrationsRoutingReaderTests,
  ...integrationsBoardsRegistryTests,
  ...integrationsAssociateTests,
  ...integrationsProjectionBoardRoutingTests,
  ...integrationsProjectionParentNestingTests,
  ...integrationsMultiboardSidecarTests,
  ...integrationsParserRevertedTests,
  ...integrationsLegacyRemovedTests,
];
