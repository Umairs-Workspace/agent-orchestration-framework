# Plan 06 — Test ownership and boundary evidence

Implementation in progress, starting from `55bb9c41`. These are ordinary engineering
batches; no managed work state or generated assistant assets are changed.

## Public-forward removal

The pre-removal inventory in [06-removal-map.json](06-removal-map.json) records 301
candidate modules: 86 public forwards and 215 configured entries, with their exports,
static consumers, package test programs and the baseline case-name multiset hash.
The first batch removes 85 forwards with a single public package destination. Imports
now use those public APIs; structural readers inspect the owning implementations.
The remaining mixed forward and configured entries are addressed in subsequent batches.

All 11,533 aggregate case names and multiplicities match the baseline. The coupled
architecture, application and command checks execute 703 cases: 701 pass, with only the
previously recorded FF-5910 audit-export and FF-5810 defining-line failures remaining.
The four new package-native citation-history checks pass. The supply-chain audit passes
with zero warnings; no third-party dependencies or versions change.

Source-directory ceilings fall with the removals, with zero added allowance. Closure,
purity and registration guards retain their nonempty assertions and planted violations.
Synthetic grammar and closure fixtures remain synthetic rather than being mistaken for
production imports. The citation sweep now covers every package source root and retains
its shrink-only unresolved ceiling of 55.

Git records a forwarding-module deletion rather than a rename into an implementation
that already exists. A shared history reader derives that relationship from the deleted
committed source and current explicit public exports. Configured destinations derive
from actual imported constructor calls. These module links are separate from Git rename
records and are reported as `via: "module"`; a missing implementation still fails.
Neither the reader nor the pure resolver executes inspected project code, and no manual
redirect table or edits to delivered work records are used.

Local detailed receipts are under `.tmp/workspace-migration/plan06/`: `before.json`,
`forward-case-parity.log`, `forward-final.log`, `citations.log` and `forward-budgets.log`.
The UI and desktop remain in their current locations pending Plan 04.
