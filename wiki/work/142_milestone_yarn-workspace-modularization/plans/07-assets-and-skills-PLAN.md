# Plan 07 — Reconcile assets, citations and skill runtime compatibility

Status: pending. Update canonical assets alongside moves; perform the final pass after
[Plan 06](06-tests-and-boundaries-PLAN.md).

## Objective

Shipped templates, skills, commands, agents and hooks must reference the final implementation and
work with the complete base CLI installation. Preserve runtime output except for reviewed migration
path/citation changes. Keep canonical assets distinct from this checkout's generated runtime files.

## Work

- [ ] Inventory CLI invocations and source citations in canonical assets, currently `src/bundle/`
  and moving to `packages/core/assets/`. Include hook and child-process paths, command IDs, flags,
  positional forms and citations embedded in loops/rubrics.
- [ ] Compare every required operation with the final assembled contribution set. Exercise representative
  continue/verify/refine/loop operations in temporary projects without optional UI/desktop builds.
- [ ] Refresh canonical citations against the final owning files and meaningful code locations.
  Regenerate the shipped manifest with the repository tool and verify hashes/content after the move.
- [ ] Render Claude Code and Codex outputs into disposable installations and compare against the
  baseline. Cover any other already-supported runtime assets affected by changed canonical files,
  including existing OpenCode pay-debt output; do not add a new runtime in this migration.
- [ ] Enumerate the exact outstanding checked-in generated files and lock keys. The completion audit
  records eight loop copies (four earlier loop copies plus four watcher/rubric copies) and three
  pay-debt renders. Recompute the list rather than assuming historical counts are still current.
- [ ] Apply only citation/hash changes already authorized for the three approved loop copies if
  final relocation changes them again. Confirm no unrelated generated content or lock entries change.
- [ ] For any additional generated files, prepare the precise diff from fixture rendering, then obtain
  scope-specific approval before writing those checked-in copies/hashes. Existing approval covers
  only `autonomous-cascade`, `operator` and `speed-thoroughness-autonomy` loop files and their hashes.
- [ ] Update active developer documentation, package READMEs and `UPGRADE-CHANGELOG.md` with final
  ownership, entry commands, installation and build instructions. Preserve historical narrative unless
  a live link or executable instruction needs correction.

## Verification and exit

- [ ] Canonical manifest verification and fixture-generated parity pass at final source locations.
- [ ] Installed skills can invoke the required commands and flags from an unrelated working directory
  with no source checkout or UI dependency. Verify real operation dispatch, not just help strings.
- [ ] Hook/program paths work in source, copied and standalone distributions; hashes agree with bytes.
- [ ] Review the generated-file diff separately and confirm the authorized scope exactly.
- [ ] Record any still-pending generated-file approval explicitly. Fixture proof can complete while
  checked-in parity remains pending; do not silently waive that distinction in the completion audit.

No AOF lifecycle runs or milestone state transitions are needed to perform this plan. Product
rendering tests belong in fixtures, and the repository's current generated state is not a template source.
