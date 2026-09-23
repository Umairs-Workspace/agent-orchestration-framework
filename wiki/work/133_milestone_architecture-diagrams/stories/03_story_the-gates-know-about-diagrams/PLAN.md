# 133/03 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

A ninth doctor lane, shaped like the eighth (`doctor-depends.mjs`): a pure
`(snapshot, ctx) => Finding[]` function appended to `CHECK_GROUPS`, named in
`DOCTOR_LANE_MODULES`, with its codes in its own frozen array.

**The lane reads no disk.** This refines ADR-006's wording in the authoring beat. The engine's
per-item enrichment in `doctor.mjs` already keeps `ARCHITECTURE.md`'s text as
`docTexts["ARCHITECTURE.md"]`. Add ONE new snapshot fact beside it: the item's `diagrams/` listing
(file names, or `null` when the folder is absent), from one `readdir` per item. The lane parses
with `parseDiagramLinks` from the layout, and compares links against the listing and against the
owed exports from `resolveWorkDiagrams`.

**Severity follows the acceptance horizon.** The three link codes take `severityFor(item.status)`:
`error` while the item is open, `warn` once it is `done`. The orphan code is always `warn`. This is
the other refinement ratified here. Without it, a delivered item with a broken link would be a
permanent red that no legal edit could clear.

**Owed exports.** For each linked stem, the SVG is always owed. The PNG is owed when diagrams are
enabled and `formats` includes `png`. A file is an orphan when no link names its stem.

Skip rows this node does not hold on disk (cache-only rows). Raise the `src/work` budget row
43 → 44 with its reason.

Check `acd-advisory-lane-never-gates` for how it classifies lanes. This lane DOES gate, because its
errors are real errors, so make sure that control does not expect every new lane to be advisory.

## The verification step

Run task 00's last scenario for real: a temp project with a broken block, `aof work doctor 07 --json`
unpiped, then fix it and see it clean. Then run `aof work doctor --json` from THIS repo's root (never
a subdirectory, memory `aof-doctor-subdir-false-green`) and confirm there are zero `diagram-*`
findings. Focused suites through the runner's `--only` selection under a fresh `AOF_GLOBAL_HOME`,
including `acd-controls-never-execute` and the directory-budget arch-test.

## Out of scope

- Any fix-it behaviour. The lane reports and never rewrites a block or deletes an orphan.
- Validating the drawing's content. That is story 06's human judgement.
