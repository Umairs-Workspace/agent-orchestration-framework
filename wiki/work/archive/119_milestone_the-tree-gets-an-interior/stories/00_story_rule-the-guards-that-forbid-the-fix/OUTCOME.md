# 119/00 · Rule the guards that forbid the fix — Outcome

## Delivered

### Purity is a claim about EXTERNAL dependencies
A purity guard in this tree resolves its subject as a **family** (`src/<name>/` when the directory
exists, else `src/<name>.mjs`), extracts every static and dynamic import specifier through the one
comment-stripping home, and classifies intra-family as admitted and everything else — bare specifier,
node builtin, or a relative path leaving the family — as a violation naming the file and the
specifier. No control under `test/arch/` asserts purity by banning the `import` token, and the claim
is held as a CLASS over `test/arch/**`, so a fourteenth purity guard cannot re-introduce the ban.

### A control derives its facts about the tree
No control asserts an exact equality against a set derivable from the tree — a file count, a member
census, a list of importers, an import allowlist — and no sweep can pass by going vacuous: every
sweep asserts its own non-vacuity, so a directory move reds the control instead of emptying it. A
stored literal is admitted only as a declared bound or a policy allowlist a reader cannot compute,
and each admitted literal carries its reason in its own comment.

### A cited path survives a rename
`src/cited-path-resolve.mjs` is the single home that resolves a `src/**.mjs` path cited in a
delivered document — at HEAD, or through the repository's own git rename records, with no hand-kept
redirect table. Two readers consume it: `aof work doctor`'s control probe and FF-11903's sweep over
`wiki/work/**`. Unresolvable citations are reported by name under a shrink-only ceiling whose
constant carries the command that measured it.

### `control-unresolved` means one thing again
`aof work doctor`'s `control-unresolved` finding reports only that a register declares a control that
does not exist. It no longer fires merely because somebody moved a file.

## Assumptions

- **The rename map is prospective** — exactly one of 357 cited tokens resolved through a rename
  record on landing day, so the map's value begins when later stories commit their moves AS renames;
  a delete-plus-add is not recorded as one.
- **The resolver reads COMMITTED history** — `git log --diff-filter=R` cannot see staged renames, so
  a move story's own citations do not resolve until that story commits (`m119/F-18`).
- **A purity family is a containment boundary, not a claim scope** — the family root admits the
  intra-family edge, while the purity legs stay scoped to the members the control actually claims
  about; `src/work-acceptor/` is the live case, four of whose six members legitimately open files.

## Gaps

### Item 81's four named carriers
- **Status:** open
- **Discharge condition:** chore **120** widens the detector to the four carriers item 81 names.
The ruling is landed and the class is detected for sweeps, but `test/bundle-asset-manifest-complete.test.mjs`,
`test/framework-stops-shipping-guard.test.mjs`, `test/frozen-set-compiled.test.mjs` and the session
door's `NAMES_THE_NEW_MODULE` are neither converted nor detected — and this story added a name to the
last of them (`m119/F-02`).

### The `existsSync`-guarded early return
- **Status:** open
- **Discharge condition:** a control that names a silent carrier with NO subject set, rather than one
  narrowed by a filename prefix.
FF-11902 is written over sweeps, so a control that returns green having asserted nothing when its
subject moves is outside it by construction (`m119/F-16`).
