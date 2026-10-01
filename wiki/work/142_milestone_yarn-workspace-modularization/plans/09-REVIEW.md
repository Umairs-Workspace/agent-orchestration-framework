# Plan 09 independent acceptance review

Reviewed 2026-10-01 at `dd8b610e`, on `refactor/yarn-workspace-modularization`.
The checkout was clean before review. This is an engineering review, not an AOF lifecycle transition.

**Verdict: signoff withheld.** Plan 09 has not been implemented in this checkout. Plans 07–08 have
substantial recorded evidence, but that evidence does not satisfy Plan 09's additional exit criteria.

## Blocking findings

1. **Test ownership cleanup is absent.** The required `09-test-ledger.json` does not exist; there are
   still 1,106 root `*.test.mjs` files, matching the plan's starting census. `apps/ui/test/` does not
   exist and `apps/ui/package.json` has no `test` script. For a concrete ownership violation,
   `test/ui/board-diagrams.test.mjs` imports UI diagram logic and third-party Markdown rendering only;
   it does not need another AOF workspace. Package suites passing cannot establish UI test isolation
   when that owner has no test entry. Complete the ledger, moves, registrations and case-preservation
   reconciliation before accepting Plan 09.
2. **The final whole-tree gate is not green.** Plan 08's original log records 11,537 cases and 12
   failures. Its 76-case rerun is green, but is a selection, not a whole-tree rerun of the fixed
   revision. The aggregate wave-ordering failure is explicitly neither diagnosed nor proven baseline.
   Four work-record tests remain red, but their identical names do not establish identical causes:
   the resolving-link floor now fails because of migration regressions (see the reconciliation below).
   Obtain the required final clean-worktree run after
   cleanup, diagnose/dispose its failures, and retain the platform limitations as open.
3. **Completion evidence has not been reconciled for Plan 09.** Its checklist and index still say
   pending, and no completed cleanup ledger or case-count reconciliation supports acceptance.
   The index's "What is already implemented" section also describes retired `ui/`, `app/desktop/`
   paths and pending compatibility-forward removal as current state. Update those statements when
   recording the actual final outcome.
4. **The reviewed HEAD deletes the required upgrade changelog.** `dd8b610e` deletes
   `UPGRADE-CHANGELOG.md` alongside its index wording change. The existing changelog suite now has
   five `ENOENT` failures out of nine cases. This regression postdates Plan 08's verified revision;
   describing the diff as documentation-only did not establish preservation of tested artifacts.
   Restore the required generated artifact and verify it against the generator before acceptance.

## Fresh verification

- `node scripts/supply-chain-audit.mjs` **inside the sandbox**: pass, zero warnings.
- `node scripts/test-workspace.mjs --all`, with an isolated `AOF_GLOBAL_HOME`: all 13 discovered
  package suites pass (255 registered cases and 247 native cases), **approved outside the sandbox**.
  This excludes the UI and Cargo
  app; it is not evidence that every application has an isolated test entry.
- `node scripts/workspace-boundaries.mjs` **inside the sandbox**: pass, empty findings.
- `node scripts/test.mjs --only test/ui/board-diagrams.test.mjs
  test/work/stream/work-this-tree-holds-what-is-live.test.mjs`, with an isolated global home:
  **approved outside the sandbox**, 29 cases, four failures. The UI cases pass; all four documented
  work-record test names reproduce as failures, with the link cause distinguished below.
  The link failure currently measures 1,413 resolving links against a 2,317 floor.
- Global Node installation's `node_modules/aof` junction inspection **inside the sandbox**:
  targets this checkout's `packages/core`.
- `git worktree list` **inside the sandbox**: only this checkout; no leftover sibling worktree was present.
- Follow-up `node scripts/test.mjs --only test/work/stream/work-upgrade-changelog.test.mjs`,
  with an isolated global home, **approved outside the sandbox**: nine cases, five failures, each
  reporting `ENOENT` for the deleted `UPGRADE-CHANGELOG.md` (`changelog.log`).

The workspace runner initially hit sandbox `spawnSync EPERM`; its successful run and the focused
root selection used approved execution outside the sandbox. Review logs are under ignored
`.tmp/signoff-142/`.

## Link-count reconciliation (follow-up, 2026-10-01)

**The 2,176 → 1,413 drop is predominantly a real migration regression, not a focused-run versus
whole-tree measurement difference.** `scanRelativeLinks` and its resolution rules are unchanged
between the Plan 03 checkpoint and the reviewed HEAD. Both runner modes scan the same real
`wiki/work` tree and use file existence; neither narrows the link census to selected suites.

A read-only census of Git trees and Markdown blobs, using the test's Latin-1 decoding, link regex,
relative-path resolution and file/directory existence rules, gives these comparable committed counts:

| Revision | Resolving links | Interpretation |
| --- | ---: | --- |
| `6a04b43` | 2,444 | Pre-142 baseline; above the 2,317 resolving-link floor |
| `6c1b2d87` | 2,171 | Plan 03 handoff; 281 previously resolving source citations broken, partly offset by document changes |
| `b3a17d63` | 2,175 | Immediately before the app relocation |
| `ada86aef` | 1,388 | App relocation breaks 787 more links: 742 into `ui`, 45 into `app/desktop` |
| `2cd5d915` | 1,388 | Plan 08 fixed code revision; matches the actual `plan08/full.log` link assertion |
| `dd8b610e` | 1,407 | Later documentation adds 19 resolving links; it does not repair the 787 |

All 787 newly broken app citations have existing destinations under `apps/ui` or `apps/desktop`
after the corresponding prefix substitution. For example, archived 127's `DESIGN.md:155` still
targets `../../../../ui/src/fleet/Fleet.tsx#L775`. No historical links or floors were edited here.

The original local 1,413 is exactly the committed HEAD's 1,407 plus six occurrences targeting two
ignored `observability/report.md` files in archived milestones 48 and 49. Similarly, Plan 08's prose
count of 1,394 is six above its committed/full-log 1,388; it should not be presented as the detached
whole-tree log's count. The actual scanner now reports 1,414 locally because the first review added
one resolving link from Plan 09 to this review.

Plan 03's `remainder-final.log` does record 2,176, five above its committed handoff's 2,171.
The receipt does not capture that working tree's exact Markdown and ignored-file state, so those
five cannot be assigned conclusively. This small residual does not change the diagnosed regression:
the comparable committed Plan 03-to-HEAD delta is -764, comprising -787 app links and +23 net
resolving links from documentation changes. The recorded local-count delta is -763.

The pre-142 `plan02/baseline-live-tree.log` failed a **later assertion in the same test**:
54 broken links into archived items against a maximum of 52. It passed the earlier resolving-link
floor. Calling the present floor failure merely "pre-existing" therefore hides a new regression.
Plan 09 must carry source-link reconciliation as an unresolved migration requirement, including
the earlier source moves, rather than treating a lower floor as the only outstanding decision.

These follow-up checks ran **approved outside the sandbox**, after Windows denied sandboxed
process creation. The diagnostic and per-link transition data are in ignored
`.tmp/signoff-142/link-history.mjs`, `link-history.log` and `link-history.json`; the diagnostic reads
Git objects without creating a worktree. The exported test scanner independently confirmed the
current local count, and every one of the 787 remapped destinations was checked for existence.

## Evidence scope

Inspected the Plan 07 asset record, Plan 08 verification record, completion audit, index, current
workspace test discovery and manifests, a concrete misplaced UI suite, and local Plan 08 logs.
The historical full-suite, 76-case rerun and Windows distribution logs support the counts and eight
distribution checks reported by Plan 08, with the link-count/cause correction above.
`git diff --name-status 2cd5d915..dd8b610e` confirms all 11 changed files are documentation,
including a deletion with test impact, not just plan edits:

- Deleted: root `UPGRADE-CHANGELOG.md`.
- Modified in the milestone: `COMPLETION.md`, `IMPLEMENTATION.md`, `STATE.md`.
- Modified in `plans/`: `04-app-workspaces-PLAN.md`, `05-DISTRIBUTION.md`,
  `07-assets-and-skills-PLAN.md`, `08-final-verification-PLAN.md`, `README.md`.
- Added in `plans/`: `08-VERIFICATION.md`, `09-cleanup-and-verify-PLAN.md`.

This review does not claim a complete inspection of all 2,343 changed files in `main..HEAD`, a new
whole-tree run, a fresh native distribution build, or desktop/platform acceptance. Those are not
substituted by the focused greens above. No production files, test expectations, work-item states,
dependency versions or platform dispositions were changed for this review.
