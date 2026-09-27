# 97 · `validate` refuses a story's honest forward reference — Outcome

## Delivered

### A `reads:` entry may name a sibling story's declared write
`aof work validate` accepts a story `reads:` path that does not exist yet when some story under the same milestone claims it in its own `files:`, and still reports `story reads path "<p>" does not exist` for a path no story claims.

### The forward-reference exemption is claim-bounded, not existence-bounded
The claim set is the milestone's own story `files:` declarations, matched case-sensitively on the resolved project path, so a wrong-case or cross-milestone read borrows no claim and stays a finding.

### The two stories that had to under-declare now declare in full
`62/04` carries all five `src/work-tune/*.mjs` modules in its `reads:` and `77/05` carries `src/work-audit/declared-bounds.mjs` and `src/work-audit/toolkit.mjs` unedited, and the work stream validates PASS.

## Assumptions

- **A declared write is a reliable claim** — a story's `files:` entry is treated as sufficient evidence the path will exist, so a milestone that abandons a declared write leaves a read of it validating clean until that story's own contract is corrected.
