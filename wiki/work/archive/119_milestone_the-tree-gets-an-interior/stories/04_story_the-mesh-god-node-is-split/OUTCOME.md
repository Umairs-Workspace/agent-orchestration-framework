# 119/04 · The mesh god-node is split — Outcome

## Delivered

### The mesh worker's two proven seams are their own modules
`src/mesh/worker-launch.mjs` (launch composition) and `src/mesh/worker-repo-admission.mjs` (repo
admission) hold the two of item 83's four seams that the module's own prior extraction proved
tractable. `src/mesh/worker-execution.mjs` fell from 2,462 lines to 1,957.

### The split SUBTRACTS
Each extracted symbol is absent from the parent as a DEFINITION and present only as a re-export, and
the extracted set is DERIVED from the children rather than retyped. No extracted module imports its
parent back — not directly, not through a third module — and none re-exports the parent's names. The
parent performs neither extracted concern any more: what it still calls, it imports inward.

### The exported surface did not move
`createMeshWorkerExecutionHandler`'s exported surface is identical across the split, asserted as a set
equality in both directions against the frozen names, so the 56 dependents are untouched by
construction rather than by inspection.

### The two security controls the split would have disarmed still bite
`acd-worker-clone-target-scoped` and `acd-worker-clone-no-credential-persisted` assert negatives over
the parent's source text, so moving the clone into a sibling would have made both pass over a subject
that no longer contains what they forbid — permanently, and invisibly, since their own self-checks
run over planted strings. Both moved with the seam, and the credential control's positive leg is now
pinned to the clone's own argv.

### `SINK_CEILING` fell
The sink ceiling is lowered to the post-split measured count, carries the command that produced it,
and stays shrink-only with no headroom — never softened, never deleted, which is item 83's explicit
"what not to do".

## Assumptions

- **Only two of four seams are in scope** — worktree lifecycle and run bracketing are not split here,
  leaving the ledger's own sequencing intact for a later item.
- **A control that stores a NUMBER about a file is invisible to that file's write-set declaration** —
  four controls pinning a count of, a reach through, or a constant measured from `src/mesh/` were
  found only by running the tree, not by reading the declaration (`m119/F-34`).

## Gaps

### `TECH_DEBT` item 83's remaining two seams
- **Status:** open
- **Discharge condition:** worktree lifecycle and run bracketing are extracted, at which point item 83
  is fully discharged.
Seams 2 and 1 landed; seams 3 and 4 did not, so the entry stays open. Its measured numbers are now
stale (2,462 → 1,957 lines) and its central argument — that growing this file correctly is cheaper
than splitting it — has been answered once. The entry was deliberately NOT updated: `TECH_DEBT.md`
sits at 4,082 lines against a `maxTotalLines` of exactly 4,082, and that control's own comment rules
that a debt entry's forensics belong in the reviewing item's register (`m119/F-37`).

### A positive control leg that goes quiet without going red
- **Status:** open
- **Discharge condition:** ADR-003's loud/silent/unfixable trichotomy covers a positive leg whose
  signature tokens are also spelled by a sibling concern in the same file.
The contract scored `acd-worker-clone-no-credential-persisted`'s positive leg as the safe half. It did
not red, because `pushWorktreeBranch` spells the same two tokens for its own reasons and stayed in the
parent. Repaired for this control; the general shape is not covered by the trichotomy, which assumes a
positive leg fails when its subject changes (`m119/F-36`).
