// THE ARCH/NOTION SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 17 — Notion work-board sync (story 03: the SEVEN fitness functions —
// ADR-005's structural invariants, each a test/arch/acd-notion-*.test.mjs arch-test,
// now GREEN over the as-built stories 00/01/02 modules: mapping-sidecar-only (ADR-001),
// one-way / Notion-never-authoritative (ADR-003), opt-in-no-op (ADR-004), auth-env-ref /
// no-committed-secret (ADR-004), never-touch-board-schema (ADR-003), CLI-not-MCP
// (ADR-004), fail-honestly / never-half-write (ADR-003/004).)
import { archTests as acdNotionMappingSidecarTests } from "./acd-notion-mapping-sidecar.test.mjs";
import { archTests as acdNotionOneWayTests } from "./acd-notion-one-way.test.mjs";
import { archTests as acdNotionOptInNoopTests } from "./acd-notion-opt-in-noop.test.mjs";
import { archTests as acdNotionAuthEnvRefTests } from "./acd-notion-auth-env-ref.test.mjs";
import { archTests as acdNotionNoSchemaWriteTests } from "./acd-notion-no-schema-write.test.mjs";
import { archTests as acdNotionCliNotMcpTests } from "./acd-notion-cli-not-mcp.test.mjs";
import { archTests as acdNotionFailHonestlyTests } from "./acd-notion-fail-honestly.test.mjs";
import { archTests as acdIntegrationsDescriptorCommittedTests } from "./acd-integrations-descriptor-committed.test.mjs";
import { archTests as acdIntegrationsReaderIsJsonTests } from "./acd-integrations-reader-is-json.test.mjs";
import { archTests as acdIntegrationsBoardResolutionTests } from "./acd-integrations-board-resolution.test.mjs";
import { archTests as acdIntegrationsNoNotionReadTests } from "./acd-integrations-no-notion-read.test.mjs";
import { archTests as acdIntegrationsDescriptorExtensibleTests } from "./acd-integrations-descriptor-extensible.test.mjs";
import { archTests as acdIntegrationsBoardsSchemaTests } from "./acd-integrations-boards-schema.test.mjs";
// m42 wave (d) leg d4 (port 4) — the Notion status sync is a ledgered consequence
// (one body, one door; autoSync decides who pays), and the applicability predicate
// keeps a consequence that can never apply from being owed at all.
import { archTests as acdNotionSyncLedgeredTests } from "./acd-notion-sync-ledgered.test.mjs";

export const tests = [
  ...acdNotionMappingSidecarTests,
  ...acdNotionOneWayTests,
  ...acdNotionOptInNoopTests,
  ...acdNotionAuthEnvRefTests,
  ...acdNotionNoSchemaWriteTests,
  ...acdNotionCliNotMcpTests,
  ...acdNotionFailHonestlyTests,
  ...acdIntegrationsDescriptorCommittedTests,
  ...acdIntegrationsReaderIsJsonTests,
  ...acdIntegrationsBoardResolutionTests,
  ...acdIntegrationsNoNotionReadTests,
  ...acdIntegrationsDescriptorExtensibleTests,
  ...acdIntegrationsBoardsSchemaTests,
  ...acdNotionSyncLedgeredTests,
];
