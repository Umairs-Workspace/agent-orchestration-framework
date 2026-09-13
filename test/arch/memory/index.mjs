// THE ARCH/MEMORY SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdAnchorTaxonomyAdditiveTests } from "./acd-anchor-taxonomy-additive.test.mjs";
import { archTests as acdAnchorGroundingSeedTests } from "./acd-anchor-grounding-seed.test.mjs";
import { archTests as acdAnchorFreshnessDeclaredTests } from "./acd-anchor-freshness-declared.test.mjs";
import { archTests as acdMemoryBackendSelectionTests } from "./acd-memory-backend-selection.test.mjs";
import { archTests as acdMemoryDerivedIndexTests } from "./acd-memory-derived-index.test.mjs";
import { archTests as acdMemoryAofDigestTests } from "./acd-memory-aof-digest.test.mjs";
import { archTests as acdMemoryIndexLocationTests } from "./acd-memory-index-location.test.mjs";
import { archTests as acdMemoryRankingTests } from "./acd-memory-ranking.test.mjs";
import { archTests as acdMemoryBackendInterfaceTests } from "./acd-memory-backend-interface.test.mjs";
import { archTests as acdMemoryRecallContractTests } from "./acd-memory-recall-contract.test.mjs";
// milestone 13 — external milestone import (story 03: the SIX enforcing fitness
// functions of ADR-001..005 — artifact-shape (reuse the 05 doc shapes, no new
// parser/record shape, SPEC.md never indexed), read-only-source (registered command +
// no git write verb / no shell-string spawn / only read-only fetch), indexer-extends-scan
// (one index, no bespoke store, no direct index write) + no-graphify-spawn (graphify
// reached only by the backend via the 09 commands), not-a-work-item (the store is outside
// workDir, non-NN_type_slug, git-ignored via the nested ignore — the resolver never
// enumerates it), and derived-index (source resolves in the store, clean re-import
// snapshot, git-ignored). Arch-tests only; no .feature.)
import { archTests as acdImportArtifactShapeTests } from "./acd-import-artifact-shape.test.mjs";
import { archTests as acdImportReadOnlySourceTests } from "./acd-import-read-only-source.test.mjs";
import { archTests as acdImportIndexerExtendsScanTests } from "./acd-import-indexer-extends-scan.test.mjs";
import { archTests as acdImportNoGraphifySpawnTests } from "./acd-import-no-graphify-spawn.test.mjs";
import { archTests as acdImportNotAWorkItemTests } from "./acd-import-not-a-work-item.test.mjs";
import { archTests as acdImportDerivedIndexTests } from "./acd-import-derived-index.test.mjs";
// milestone 13 / story 04 — the AOF.md digest-on-import fitness (ADR-006): an
// intent-only import emits a recallable AOF.md digest indexed via the EXISTING
// parseAof; an ADR/retro import emits none; no new parser/record shape.
import { archTests as acdImportDigestRecallableTests } from "./acd-import-digest-recallable.test.mjs";
import { archTests as acdMemoryIndexNeverOnMeshTests } from "./acd-memory-index-never-on-mesh.test.mjs";
// milestone 124 / story 02 — FF-12405: the learning edge reaches every CUT-MAKING command.
// Four claims: shatter carries one PO recall keyed to the seam before the cut; every verb and flag
// a recall block spells resolves in `src/work/memory.mjs`'s own parse surface (never `--help`,
// never the registry, which has no entry to find); the cut roster is asserted in BOTH directions so
// a third cutter cannot arrive without one; and all three tracked renders of the edited member
// match a fresh re-render.
import { archTests as acdLearningEdgeReachesEveryCutTests } from "./acd-learning-edge-reaches-every-cut.test.mjs";

export const tests = [
  ...acdAnchorTaxonomyAdditiveTests,
  ...acdAnchorGroundingSeedTests,
  ...acdAnchorFreshnessDeclaredTests,
  ...acdMemoryBackendSelectionTests,
  ...acdMemoryDerivedIndexTests,
  ...acdMemoryAofDigestTests,
  ...acdMemoryIndexLocationTests,
  ...acdMemoryRankingTests,
  ...acdMemoryBackendInterfaceTests,
  ...acdMemoryRecallContractTests,
  ...acdImportArtifactShapeTests,
  ...acdImportReadOnlySourceTests,
  ...acdImportIndexerExtendsScanTests,
  ...acdImportNoGraphifySpawnTests,
  ...acdImportNotAWorkItemTests,
  ...acdImportDerivedIndexTests,
  ...acdImportDigestRecallableTests,
  ...acdMemoryIndexNeverOnMeshTests,
  // milestone 124 / story 02 — FF-12405 (see the import note).
  ...acdLearningEdgeReachesEveryCutTests,
];
