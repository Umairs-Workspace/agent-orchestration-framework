// THE MEMORY SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 55 / story 00 — the additive anchor node + ground taxonomy, the day-one
// framework anchors, and FF-5501. Kept outside 52's frozen `acd-loop-*` roster.
import { anchorTaxonomyTests } from "./anchor-taxonomy.test.mjs";
import { memoryIndexingTests } from "./memory-indexing.test.mjs";
import { memoryRetrievalTests } from "./memory-retrieval.test.mjs";
import { memoryIntegrationTests } from "./memory-integration.test.mjs";
import { memoryRecallBlockTests } from "./memory-recall-block.test.mjs";
import { memoryHooksInertTests } from "./memory-hooks-inert.test.mjs";
// milestone 13 — external milestone import (story 00: the spine — the registered
// import:milestone command + `aof import milestone` dispatch, the read-only
// source-access seam, and the FROZEN materialize artifact pair + .aof/ import-store
// layout, ADR-001/002/004/005; @executable traceability — the @manual live-remote
// rows are deferred)
import { importCommandCoreTests } from "./import-command-core.test.mjs";
// milestone 13 — external milestone import (story 01: source-shape recovery — the
// REAL recovery heuristics behind story 00's frozen recoverMilestone seam: an
// aof-structured source's own SPEC/ARCHITECTURE/RETROSPECTIVE, an arbitrary repo's
// README/docs/ADRs/git-log, and "absence is information" — recover what is present,
// mark what is absent, never fabricate, ADR-001/005; @executable traceability — the
// @manual real-world-repo recovery row is deferred)
import { importRecoveryTests } from "./import-recovery.test.mjs";
// milestone 13 — external milestone import (story 02: import reaches memory — the
// EXTENDED buildRecords scan over the .aof/ import store (the existing parsers into
// the existing index, leg-aware source) + the import command's backend reindex
// trigger so imported precedent is recall-able through the unchanged `aof work
// memory` verbs, ADR-003/001/005; @executable traceability — the @manual
// graphify-backend recall row is deferred, it needs the live binary)
import { importIntoMemoryTests } from "./import-into-memory.test.mjs";
// milestone 13 — external milestone import (story 04: the AOF.md digest-on-import
// follow-up — an intent-only import (no decisions/outcomes) also emits an AOF.md
// digest indexed via the EXISTING parseAof, so a zero-record import gains a recallable
// `summary` presence; ADR-006, the deferred 13×14 follow-up)
import { importDigestTests } from "./import-digest.test.mjs";

export const tests = [
  // milestone 55 / story 00 — anchor schema, compatibility, delivery and structural gate
  ...anchorTaxonomyTests,
  ...memoryIndexingTests,
  ...memoryRetrievalTests,
  ...memoryIntegrationTests,
  ...memoryRecallBlockTests,
  ...memoryHooksInertTests,
  ...importCommandCoreTests,
  ...importRecoveryTests,
  ...importIntoMemoryTests,
  ...importDigestTests,
];
