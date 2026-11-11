---
doc: state
---
# A duplicate workspace id can be moved onto the canonical one — State

## Progress

- Framed 2026-10-30 at 175's verify, as TECH_DEBT item 4's part E. Not yet promoted or refined.

## Notes & decisions in flight

- What a rekey has to touch was mapped on 2026-10-30, from a read of the code:
  - the `projection.sqlite` schema is in `packages/mesh/src/projection-store.mjs:157-322`, and
    its table classes in `packages/mesh/src/store-metadata.mjs`;
  - the directive, branch, recovery-push and resync tables are in `assignment-directive.mjs`,
    `recovery-push.mjs` and `resync.mjs`;
  - the journal is `packages/effects/src/journal.mjs`.
- The only remap helpers today are keyed by ref, not workspace id:
  `remapWorkspaceProjectionRefs` and `remapWorkspaceFactRefs`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off: a real duplicate rekeyed on the Windows control node and on a worker
