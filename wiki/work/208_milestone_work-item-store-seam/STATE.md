---
doc: state
---
# 208 · Work item store seam

## Progress

Milestone 205 is done. Its accepted fixture, read, placement and lifecycle lanes supply the file-store oracle. Refinement produced six story boundaries and four architecture decisions. Implementation and the acceptance replay are pending.

## Notes & decisions in flight

- Resolve the provider per workspace. The default and explicit file selector share the same adapter. Unsupported explicit settings surface a configuration error.
- The interface covers compound identity mutations as well as metadata reads and guarded status writes. Storage-neutral change tokens allow polling. Repository document homes and cache provenance retain their existing roles.
- The product-owner recall `092d40b1-b1e9-4ba7-9da0-3b3d4b79c82d` informed the 205 replay, remote-only row coverage and attention to operations the interface must express. An injected test double can demonstrate routing. A production provider other than files remains 209’s scope.
- No open business questions. Examples are proposed from the specification, the accepted behavior and the current implementation. Technical defaults are recorded in ADR-001 through ADR-004.
- ADR-001 diagram not drawn: `diagram-generator-missing`. The configured generator is unavailable in this checkout. The diagram brief and interface table are in ARCHITECTURE.md.

## Verification

- [x] All six example maps passed their pre-contract doctor checks. Milestone validation returned no findings. The final doctor reported zero errors and eleven warnings. The planner lists 208/00 as the first ready story.
- [ ] Build the registered story suites and compare all four accepted 205 lanes.
- [ ] Exercise FF-20801 in the ordinary runner and record its planted failures and green result.
- [ ] Check the baseline diff is empty for both supported selection forms. All behavioral checks are executable. There is no new human-facing surface requiring UAT.
