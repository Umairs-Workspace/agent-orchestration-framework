# 104 · The Coherence Lane Is The Third Reader That Was Missed — Outcome

## Delivered

### One exported home for "which numbers a `depends:` edge may name"
`isDependTarget` is exported from [src/work.mjs](src/work.mjs#L458) and re-exported through the doctor spine at [src/work-doctor.mjs](src/work-doctor.mjs#L99), so every reader of the naming question reaches the same predicate instead of holding a module-local copy.

### Doctor's coherence lane resolves parentless stories
[src/work-doctor-coherence.mjs](src/work-doctor-coherence.mjs#L170) builds `driverStatusByNumber` and gates `depends-blocked-in-progress` ([:238](src/work-doctor-coherence.mjs#L238)) on `isDependTarget`, so a driver whose `depends:` names a `done` top-level story reports no unmet dependency, and an in-progress parentless story is itself judged for working ahead.

### `numbering-gap` counts a top-level story's number as filled
[src/work-doctor-freshness.mjs](src/work-doctor-freshness.mjs#L204) resolves the number sequence over `isDependTarget`: on the real stream the check reports `42` alone — the genuinely item-less `42_structural-overhaul/` — where it previously reported fifteen existing story folders as absences.

### `duplicate-driver-number` sees a milestone/story collision
[src/work-doctor.mjs](src/work-doctor.mjs#L619) resolves over `isDependTarget`, so a milestone and a top-level story sharing a number are reported as the ambiguous `findWork`/`nextWork` resolution the check's own message names.

### `isDriver` still answers the phase question alone
The predicate at [src/work.mjs](src/work.mjs#L442) and its spine mirror are byte-unchanged, and `nextWork`'s driver walk still filters on it — readiness and scheduling are unaffected by the widening.

## Gaps

### A parentless story's own `depends:` edges are validated by nothing
- **Status:** open
- **Discharge condition:** validate's cycle graph ([src/work.mjs:1091](src/work.mjs#L1091)) and its 3a resolution check ([:1167](src/work.mjs#L1167)) read a parentless story's own edges as a subject, closing the asymmetry against doctor.
Five real edges — `102 → [53, 78]`, `79 → [52]`, `81 → [54]`, `86 → [84]`, `87 → [55]` — are checked by neither validate gate, so a typo in any of them is silent; doctor now reads those edges as a subject while validate still does not.

### The doctor spine's `isDriver` re-export has no importer
- **Status:** open
- **Discharge condition:** a doctor lane needs the phase question, or the re-export is removed by a decision that records where the phase question lives for the doctor family.
Both coherence sites moved to `isDependTarget`, leaving [src/work-doctor.mjs:89](src/work-doctor.mjs#L89) a mirror of `work.mjs`'s predicate that nothing in the doctor family consumes.

### One message still carries two facts
- **Status:** open
- **Discharge condition:** `depends-blocked-in-progress` distinguishes "this dependency is not done" from "this dependency is not in my index".
`driverStatusByNumber.get(N)` returning `undefined` renders identically whether N is unfinished or absent from the index; the index is no longer a cause of the second, but the two facts remain one finding.
