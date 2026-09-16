---
type: story
number: 01
slug: the-instrument-census
title: "The instrument census — a gate that is registered, non-vacuous and actually assembled, decided at runtime rather than by reading the runner"
parent: 59
status: done
owner: product-owner
created: 2026-08-29
updated: 2026-08-29
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-002, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-003, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-004, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-008, wiki/work/56_spike_gate-probe-feasibility/SPIKE.md, wiki/work/66_milestone_controls-that-run/ARCHITECTURE.md, scripts/test.mjs, scripts/test-unit.mjs, src/work-doctor-controls.mjs, test/support/source-slice.mjs, wiki/work/TECH_DEBT.md]
files: [src/work-audit/census.mjs, src/work-audit/spawn.mjs, src/work-audit-probe.mjs, test/arch/acd-test-suite-registration.test.mjs, test/arch/acd-roundtrip-registration.test.mjs, test/arch/acd-audit-never-imports-project-code.test.mjs, test/instrument-census.test.mjs, test/audit-spawn-bounded.test.mjs, test/mesh-node-identity.test.mjs, test/mesh-registry-store-seam.test.mjs, src/node-identity.mjs, scripts/test.mjs, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md, wiki/work/TECH_DEBT.md]
---
# 01 · The instrument census

## User story

As the person who has to trust this repository's fitness gate,
I want a census that decides whether a gate is actually wired in by asking the runner what it
assembled, not by searching the runner's source text for a filename,
so that the failure that has already happened here — twenty-six suites carrying a hundred and
seventeen test entries de-armed in one commit, with the imports left behind so the files still looked
registered — fails on the day it happens instead of a month later, in a spike.

Spike 56 measured this and its verdict was blunt: no mutation campaign could have caught it, because
every one of those gates is *correct* and would fire happily if anyone ran them. The gate policing
registration validates **import** and never **spread**, and it validates it by substring, which is a
claim about text rather than about what CI will execute. Re-measured at HEAD on 2026-08-29 the number
is unchanged: twenty-seven imported bindings in `scripts/test.mjs` are never spread.

The fix is not another text check — a commented `// ...someTests,` would satisfy one exactly as a
comment satisfied the import lane. The right instrument already ships in this repo for one family of
tests, and this story widens it to the whole tree, retires the substring lane, re-arms the twenty-six,
and gives the CLI the same answer through the one bounded child process that every later lane will
reuse.

## Tasks

- [x] `tasks/00_registration-is-membership-not-text.feature` — a suite is registered when the assembled suite contains its tests, and a suite that is imported and never spread is named
- [x] `tasks/01_the-de-armed-suites-are-re-armed.feature` — the twenty-six bindings are spread; a suite that rots red on re-arming is repaired or ledgered with its reason, never quietly left de-armed
- [x] `tasks/02_the-census-reports-what-it-read.feature` — every sweep names its population and its floor, and a sweep that read nothing is a finding rather than a clean pass
- [x] `tasks/03_the-audit-runs-code-in-a-child-and-never-in-itself.feature` — one bounded spawn seam with a deadline, a kill and a captured exit code, and no module in the family reaches project code by import

## Notes

- **The authority is the assembled array, and the mechanism already exists.**
  `acd-roundtrip-registration` (m04/00/03) imports the assembled `tests` array from the runner and
  asserts runtime name-set membership for one family. ADR-003 §2: widen that to the whole tree, retire
  the substring lane in `acd-test-suite-registration`, and recurse into `test/integration/**`. This is
  an extension of a guard in service, not a sibling beside it — FF-5903.
- **Re-arming is in scope and its cost is stated.** Two of the twenty-six have rotted red while dead.
  A red suite is repaired or ledgered **with its reason and its origin**; the shrink-only baseline is
  where that is recorded, and it may only ever shrink. Leaving a suite de-armed to keep the board green
  is the exact move this story exists to make impossible.
- **The CLI census is static; the arch gate is the authority.** ADR-003 §4. Where the census needs
  runtime membership it asks a child process, and where it can only make a text-level claim it says so
  in the finding rather than overstating. It does **not** add a hundred-and-twenty-fourth hand-rolled
  comment stripper (TECH_DEBT 57).
- **The spawn seam is this story's, and 59/02 imports it.** That is the milestone's one ordering edge
  out of stage 1 (ADR-008 §3). It carries a deadline, a kill on expiry, a captured exit code and
  captured output, and it takes an argument vector — never a shell string.
- **Nothing here imports project code into the aof process.** 66/ADR-004 §2's refusal: a dynamic
  `import()` of a cited module executes its module scope, which is ACD running a project's test code.
  FF-5904 makes that structural for the whole `src/work-audit/` family.
- **`src/work-audit/` is a new directory with no dependents** (`aof graph impact`, 2026-08-29), which
  is why this story shares no production file with any other and may land in stage 1.
