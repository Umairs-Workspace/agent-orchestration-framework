# 119/03 · The test tree gets an interior — Outcome

## Delivered

### `test/` and `test/arch/` have interiors
1,030 suites live in subject directories: `test/` went 591 flat siblings to 0 across 35 directories,
`test/arch/` 439 to 0 across 17. The largest directory is now 68.

### The registry spreads an INDEX instead of growing a line per suite
`scripts/test.mjs` fell from 5,193 lines to 333 and names directories rather than suites; 52
`index.mjs` files own their own membership. The assembled registry is **membership-identical** across
the restructure — 9,203 entries at the base commit and at the tip, 0 added and 0 removed.
`registrationDecision` is untouched and still the single decider; only the text handed to it is wider.

### "Registered" is TRANSITIVE, through one home
`test/support/registration-surface.mjs` is the single home the three readers of "is this suite
registered?" consume — the runner's text plus every index's — so a suite imported by its directory's
index and spread by the runner reads as registered rather than as an orphan.

### A cited SUITE path resolves at HEAD or through a recorded rename
ADR-004 is amended to a THIRD reader: `test/support/cited-suite-path.mjs` resolves suite paths cited
in delivered `.feature` files, which is what admits a move that would otherwise strand 489 citations
across 156 immutable records. FF-11903 asserts that reader.

## Assumptions

- **Contiguity was the instrument, never the invariant** — `53/FF-5311`'s eleven gates span three
  subject directories, so a subject partition cannot hold one contiguous block. The CENSUS is
  untouched (one import and one spread per alias); contiguity is replaced by OWNERSHIP: a gate is
  imported and spread by the index of the directory that holds it. Same amendment for `52/FF-5209`
  and coverage-ledger leg 8 (`m119/F-26`).
- **A fully partitioned layer measures zero** — FF-11904's rows for `test/` and `test/arch/` were
  lowered to 0, the control having been taught that a layer with no flat siblings is a legitimate
  measurement rather than a missing subject.

## Gaps

### The hop-counted repo root in `test/`
- **Status:** open
- **Discharge condition:** FF-11905's "no path is load-bearing" claim extended from `src/` to `test/`.
The test tree derives its repo root by counting directory hops 616 times (509 `path.resolve`, 107
`new URL`). Every one was a level too shallow after the move and was re-depthed here, but the CLASS is
unguarded — FF-11905 forbids exactly this in `src/` and says nothing about `test/` (`m119/F-29`).

### A cited path in a SHIPPED asset
- **Status:** open
- **Discharge condition:** a control that resolves the paths a bundle member's PROSE names, not only
  that the manifest hash content-addresses the member.
`src/bundle/commands/pay-debt.md` told the operator to run a suite at a path this move invalidated,
and reached three rendered trees as well as the source. It was found by a SWEEP, not by a control:
the bundle's gates say nothing about whether a path its prose names still resolves, so a move can
silently break an instruction this framework ships to every consuming repo (`m119/F-33`).

### The pre-existing orphan
- **Status:** open
- **Discharge condition:** `test/integration/cli-child-process.test.mjs` is imported by a runner or an
  index, or is deleted.
It is imported by neither and by no index — green, red or deleted with identical effect on CI. Not
added to the shrink-only baseline, which may only shrink (`m119/F-28`).
