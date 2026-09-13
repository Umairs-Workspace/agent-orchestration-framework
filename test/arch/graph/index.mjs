// THE ARCH/GRAPH SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 09 — graphify command core (story 03: the SIX enforcing fitness
// functions of ADR-006 — registration+CLI bijection, no-face-spawn, binary-absent
// clean failure, privacy-no-widening, result-from-graph.json, no-npx-install)
import { archTests as acdGraphCommandCliBijectionTests } from "./acd-graph-command-cli-bijection.test.mjs";
import { archTests as acdGraphNoFaceSpawnTests } from "./acd-graph-no-face-spawn.test.mjs";
import { archTests as acdGraphBinaryAbsentTests } from "./acd-graph-binary-absent.test.mjs";
import { archTests as acdGraphPrivacyBoundaryTests } from "./acd-graph-privacy-boundary.test.mjs";
import { archTests as acdGraphJsonNormalizationTests } from "./acd-graph-json-normalization.test.mjs";
import { archTests as acdGraphifyNoNpxInstallTests } from "./acd-graphify-no-npx-install.test.mjs";
// milestone 10 — graphify memory backend (story 03: the SIX enforcing fitness
// functions of ADR-006 — records-from-the-05-parsers, derived-index (records + graph
// git-ignored), reach-graphify-only-via-the-09-command, selection-enum + single-read,
// claude-cli-classified-honestly, binary-absent-degrades-not-crashes)
import { archTests as acdGraphifyRecordsFromParsersTests } from "./acd-graphify-records-from-parsers.test.mjs";
import { archTests as acdGraphifyDerivedIndexTests } from "./acd-graphify-derived-index.test.mjs";
import { archTests as acdGraphifyBackendViaCommandTests } from "./acd-graphify-backend-via-command.test.mjs";
import { archTests as acdGraphifyBackendSelectionTests } from "./acd-graphify-backend-selection.test.mjs";
import { archTests as acdGraphifyBackendClassifiedTests } from "./acd-graphify-backend-classified.test.mjs";
import { archTests as acdGraphifyBinaryAbsentDegradesTests } from "./acd-graphify-binary-absent-degrades.test.mjs";
// milestone 11 — graphify codebase intelligence (story 03: the FOUR enforcing fitness
// functions of ADR-006 — no-parse/legible-output (the agent reads command OUTPUT, aof
// never parses; no NEW src/ module reads graph.json), reached-only-via-the-09-commands
// (no new spawn site / no new graph-reaching module; the seams invoke `aof graph
// build/query/triage`), advisory-only (no graph output feeds a gate/merge/status-write/
// work-mutation; the triage queue is ranking context, never an auto-block), and
// derived+git-ignored (graphify-out/ git-ignored at the REPO ROOT; the freshness step
// builds-then-queries). Pure prompt-wiring + spawn/parse-surface assertions — no .feature.)
import { archTests as acdCodebaseGroundingNoParseTests } from "./acd-codebase-grounding-no-parse.test.mjs";
import { archTests as acdCodebaseGroundingViaCommandsTests } from "./acd-codebase-grounding-via-commands.test.mjs";
import { archTests as acdCodebaseGroundingAdvisoryTests } from "./acd-codebase-grounding-advisory.test.mjs";
import { archTests as acdCodebaseGraphDerivedTests } from "./acd-codebase-graph-derived.test.mjs";

export const tests = [
  ...acdGraphCommandCliBijectionTests,
  ...acdGraphNoFaceSpawnTests,
  ...acdGraphBinaryAbsentTests,
  ...acdGraphPrivacyBoundaryTests,
  ...acdGraphJsonNormalizationTests,
  ...acdGraphifyNoNpxInstallTests,
  ...acdGraphifyRecordsFromParsersTests,
  ...acdGraphifyDerivedIndexTests,
  ...acdGraphifyBackendViaCommandTests,
  ...acdGraphifyBackendSelectionTests,
  ...acdGraphifyBackendClassifiedTests,
  ...acdGraphifyBinaryAbsentDegradesTests,
  ...acdCodebaseGroundingNoParseTests,
  ...acdCodebaseGroundingViaCommandsTests,
  ...acdCodebaseGroundingAdvisoryTests,
  ...acdCodebaseGraphDerivedTests,
];
