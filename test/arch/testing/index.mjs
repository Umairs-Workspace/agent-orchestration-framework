// THE ARCH/TESTING SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { archTests as acdTestSelectionWidensNeverNarrowsTests } from "./acd-test-selection-widens-never-narrows.test.mjs";
import { archTests as acdSuiteRegistrationSingleDeciderTests } from "./acd-suite-registration-single-decider.test.mjs";
import { archTests as acdTestCommandReportsNotDecidesTests } from "./acd-test-command-reports-not-decides.test.mjs";
// ADR-015/F2 (43/04's UI structural review) — `global-work-store.mjs`'s trajectory, one layer
// over: `DetailPanel.tsx` took +284 lines in THIS ONE STORY, more than in the whole month
// before it, and crossed 1,000. Answered the way ADR-012/B4 answered the store — a ceiling
// that fails CI rather than a comment hoping someone splits it later. `Board.tsx` is
// deliberately exempt as the composition root, with the reason recorded in the test itself.
import { archTests as acdUiSurfaceFileBudgetTests } from "./acd-ui-surface-file-budget.test.mjs";
import { archTests as acdDebtLedgerBudgetTests } from "./acd-debt-ledger-budget.test.mjs";
// ADR-014/E7 (43/04's structural review) — a test suite imported by NEITHER runner is no
// gate at all. Measured: six orphans, four of them milestone 43/03's accepted behavioural
// proof. Shrink-only with a NAMED baseline, so the seventh fails CI. (TECH_DEBT item 17.)
import { archTests as acdTestSuiteRegistrationTests } from "./acd-test-suite-registration.test.mjs";
//     · acd-ui-directory-budget — TECH_DEBT 28/33 fix (b), landing with the diff that creates the
//       8th directory, because a ratchet authored after the growth it questions RATIFIES it. Six
//       per-file ceilings cannot see a tree that grows by ADDING files, which is what `ui/src`
//       did four milestones running (54 -> 71 -> 91 -> 99) with every per-file gate green.
import { archTests as acdUiDirectoryBudgetTests } from "./acd-ui-directory-budget.test.mjs";
import { archTests as acdOneSelectorOneChangedSetTests } from "./acd-one-selector-one-changed-set.test.mjs";
// milestone 119 / story 01 — `src/` gets an interior, and the two controls that make the move
// checkable rather than merely green. FF-11904 (ONE directory-budget table with a row per flat
// layer, ceiling EQUAL to the measured count and shrink-only — three separate ratchets would
// have rebuilt the blind spot item 78 measured) and FF-11905 (no route, command id, registry
// key, lane membership, bundle target or registry ordering is derived from a path, plus the
// sixth subject this story's own build found live: a root resolved by counting directory hops
// from a module's own location). The controls this story RE-POINTED rather than authored —
// `acd-controls-never-execute`'s doctor roster, the five `existsSync`-gated silent carriers —
// are registered by their own milestones' blocks above, because a re-pointed control is the
// same control.
import { archTests as acdSourceDirectoryBudgetTests } from "./acd-source-directory-budget.test.mjs";

export const tests = [
  ...acdTestSelectionWidensNeverNarrowsTests,
  ...acdSuiteRegistrationSingleDeciderTests,
  ...acdTestCommandReportsNotDecidesTests,
  ...acdUiSurfaceFileBudgetTests,
  ...acdDebtLedgerBudgetTests,
  ...acdTestSuiteRegistrationTests,
  ...acdUiDirectoryBudgetTests,
  ...acdOneSelectorOneChangedSetTests,
  // milestone 119 / story 01 — the directory budget and the path-is-not-behaviour guard (see the import note).
  ...acdSourceDirectoryBudgetTests,
];
