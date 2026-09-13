// THE ARCH/AUDIT SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 59 / story 00 — the SIXTH node kind and the anchor's declared freshness: the auditor's
// frozen declaration vocabulary and its ten omissions (FF-5901), and `checked:` on the anchor alone
// (FF-5902). The story's behavioural scenarios extend the loader's own record suite and the anchor
// taxonomy suite, already registered by milestone 52's story-05 and milestone 55's blocks above —
// 59/00 adds no behavioural suite of its own, exactly as 58/00 did not.
import { archTests as acdAuditorTaxonomyAdditiveTests } from "./acd-auditor-taxonomy-additive.test.mjs";
import { archTests as acdAuditNeverImportsProjectCodeTests } from "./acd-audit-never-imports-project-code.test.mjs";
import { archTests as acdAuditReportsWhatItReadTests } from "./acd-audit-reports-what-it-read.test.mjs";
import { archTests as acdAuditReportsToTheOwnerTests } from "./acd-audit-reports-to-the-owner.test.mjs";
import { archTests as acdDuplicationRuleStatesItsBlindnessTests } from "./acd-duplication-rule-states-its-blindness.test.mjs";
// milestone 77 / story 04 — THE TWO ROOTS: `repoRoot` was doing two jobs, and in this repository
// that is invisible, because the workspace under audit IS the aof checkout. Anywhere else both
// child programs resolved to files that were never going to be there, every register row reported
// `evidence-unrunnable`, and `aof work audit --strict` failed in every governed project on aof's own
// file layout. So the roots are NAMED APART: `repoRoot` keeps its meaning (the register, the cited
// controls, the runner, the suite population, each child's working directory) and the TOOLKIT root —
// where aof was installed — is derived once, in `src/work-audit/toolkit.mjs`, and nowhere else.
// Deriving it is only half the fix and TECH_DEBT 72's own prescription stopped there: the payload is
// a copy of `src/` and carries no `scripts/` at all, so the driver MOVED to
// `src/work/audit-drive.mjs`, beside its exact precedent — which also closes item 70's enumeration
// hole, since clause (E) of FF-5904 skips a named path that does not resolve under `src/`. The
// evidence fixture stops planting a driver inside the subject repository, and that absence is the
// proof: a real driver still runs, from the toolkit. Both @executable task features plus FF-7706,
// whose root claims are driven with the two roots FORCED APART — the one shape this repository
// cannot produce on its own.
import { archTests as acdAuditTravelsTwoRootsTests } from "./acd-audit-travels-two-roots.test.mjs";
// milestone 77 / story 05 — THE LANES ARE REGISTERED: four modules nobody calls is the exact failure
// one of these four rules exists to catch, so the claim that they RUN is driven rather than assumed
// from the fact that they were written. `REPORT_LANES` gains four entries, each with its OWN runner —
// the registry was once a description dispatched by a ternary chain whose final branch was the
// checks lane, so a fourth entry would have re-run that lane under its own name and duplicated every
// finding; both fall-through shapes (no runner, a shared runner) are now refused BY NAME before any
// lane runs. The audit's code space stops being two constants enumerated by name and becomes a fold
// over the registry: measured here, the by-name version would have run green over all seven of this
// milestone's codes without ever having looked at one. Pairwise disjointness INSIDE the audit is a
// new claim, with `audit-ran-on-nothing` carved out as the read contract's and lane-neutral. A TEXT
// sweep now OWES a limit — until now that was a sentence in `reads.mjs` rather than a refusal, and a
// lane reading text and stating nothing reported clean in exactly the case where it is blind. And
// the face injects what `FF-5904` forbids the family importing: the marker key, the audited settings
// object, the resolved role routing and what this project declares for each reference bound. All
// three @executable task features plus FF-7708 (and FF-7707, carried by the extension of
// `acd-controls-never-execute`).
import { archTests as acdAuditLaneRegistryCompleteTests } from "./acd-audit-lane-registry-complete.test.mjs";
import { archTests as acdObserveSnapshotsAppendOnlyTests } from "./acd-observe-snapshots-append-only.test.mjs";
import { archTests as acdObserveAttributionByJoinTests } from "./acd-observe-attribution-by-join.test.mjs";
import { archTests as acdObservationCensusFilteredTests } from "./acd-observation-census-filtered.test.mjs";
// TECH_DEBT item 24 (paid 2026-09-05) — the stripper-order ratchet: a hand-rolled comment
// stripper must remove LINE comments first, or a line comment carrying a block opener blinds
// every source-reading assertion over that file. Four deliberate red probes are baselined.
import { archTests as acdCommentStripperOrderTests } from "./acd-comment-stripper-order.test.mjs";
// m42 wave (a) / TECH_DEBT item 3 — the silent-catch RATCHET: per-file shrink-only
// baseline; a NEW statement-empty catch (or .catch(() => {})) fails the build.
import { archTests as acdNoNewSilentCatchTests } from "./acd-no-new-silent-catch.test.mjs";
import { archTests as acdControlsNeverExecuteTests } from "./acd-controls-never-execute.test.mjs";
import { archTests as acdControlsFindingEnvelopeTests } from "./acd-controls-finding-envelope.test.mjs";
import { archTests as acdNoStagedControlTests } from "./acd-no-staged-control.test.mjs";
// milestone 119 / story 00 — the three guards that forbid the fix, ruled BEFORE any file moves.
// FF-11901 (purity constrains a module's EXTERNAL dependencies, asserted as a CLASS over
// `test/arch/**` so a tenth token-ban guard cannot re-open it), FF-11902 (a control stores a
// DECISION and derives a FACT; no sweep can pass by going vacuous) and FF-11903 (a cited path
// resolves at HEAD or through a rename the repository itself recorded). The nine purity carriers
// this story converted, `test/session/agent-session-driver-door.test.mjs`'s derived census and
// `test/arch/mesh/acd-mesh-ui-single-data-command.test.mjs`'s de-silenced sweep are all registered by
// their own milestones' blocks above — this story EXTENDS controls in service rather than joining
// them with siblings, and for those the red probe is the only evidence the change is armed.
import { archTests as acdPurityIsExternalTests } from "./acd-purity-is-external.test.mjs";
import { archTests as acdControlDerivesItsCensusTests } from "./acd-control-derives-its-census.test.mjs";

export const tests = [
  // milestone 59 / story 00 — the auditor kind, its ten omissions, and the anchor's checked date
  ...acdAuditorTaxonomyAdditiveTests,
  ...acdAuditNeverImportsProjectCodeTests,
  ...acdAuditReportsWhatItReadTests,
  ...acdAuditReportsToTheOwnerTests,
  ...acdDuplicationRuleStatesItsBlindnessTests,
  // milestone 77 / story 04 - the two roots (tasks 00-01) plus FF-7706.
  ...acdAuditTravelsTwoRootsTests,
  // milestone 77 / story 05 - the lanes are registered (tasks 00-02) plus FF-7708; FF-7707 rides
  // the extended acd-controls-never-execute, and the behavioural half rides test/audit-command.
  ...acdAuditLaneRegistryCompleteTests,
  ...acdObserveSnapshotsAppendOnlyTests,
  ...acdObserveAttributionByJoinTests,
  ...acdObservationCensusFilteredTests,
  ...acdCommentStripperOrderTests,
  ...acdNoNewSilentCatchTests,
  ...acdControlsNeverExecuteTests,
  ...acdControlsFindingEnvelopeTests,
  ...acdNoStagedControlTests,
  // milestone 119 / story 00 — the three blockers ruled before the tree moves (see the import note).
  ...acdPurityIsExternalTests,
  ...acdControlDerivesItsCensusTests,
];
