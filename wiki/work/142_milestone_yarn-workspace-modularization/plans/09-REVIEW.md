# Plan 09 independent acceptance review

Latest recorded assessment: **final gate at `5035a225` — Plan 09 is complete for the verified scope (Windows x64)**. See
[the final gate](#final-gate--5035a225-2026-10-02). The only red is the accepted 142 record-doc finding; the desktop app,
Linux/WSL, macOS/arm64 and the hosted CI matrix remain open and are not claimed.
The earlier sections below preserve the review of `dd8b610e` and its follow-up evidence.

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

## Second review — d48bf751

Reviewed 2026-10-01, covering the Plan 09 changes from `dd8b610e` through `d48bf751`.
**Verdict: signoff withheld.** Findings below were open at the reviewed revision. Logged after the
review at checkout `b854ad5b`; later commits have not been reassessed by this logging update.

### Findings register

| ID | Severity | Finding | Status at reviewed revision | Required disposition |
| --- | --- | --- | --- | --- |
| P09-R2-01 | High | Timing-based sharding separates cases that share a fixture | Open | Preserve dependent cases in one process, or make the cases independently runnable |
| P09-R2-02 | Medium | The test-ownership ledger is invalid JSON after the folder rename | Open | Repair the malformed paths and validate the ledger |
| P09-R2-03 | Medium | The blanket assembled-application rationale retains package-owned tests at root | Open | Classify these suites individually and move convenience-assembled tests to their owning packages |

### P09-R2-01 — Sharding breaks dependent cases

Location at the reviewed revision: `scripts/test-sharded.mjs:83` (chunk sizing and slicing), and
`test/work/stream/work-this-tree-holds-what-is-live.test.mjs:458` (the dependent assertion).

The scheduler splits a suite's case positions using recorded timings without preserving shared
fixture dependencies. In the live-tree suite, position 4 creates a backlog item in a shared copy;
position 5 promotes that item. With the recorded 383.495 seconds for 19 cases and the supported
`--split-seconds 100` option, the scheduler creates chunks of five: positions 0–4 and 5–9 run in
different processes. The same boundary can arise with default settings when timings change.

Reproduction:

```text
node scripts/test-shard.mjs test/work/stream/work-this-tree-holds-what-is-live.test.mjs 5
```

Observed: one case executed, one failure, exit 1 — `the previous scenario left the item in the
copy's backlog`. Retrying the same chunk alone cannot restore the missing setup. This creates
false gate failures dependent on timing history and machine speed. Keep suites atomic unless
their cases are known to be independent, or remove the shared setup dependency before splitting.
Receipt: `.tmp/signoff-142/shard-dependent-case.log`.

### P09-R2-02 — Ownership ledger cannot be parsed

Location at the reviewed revision: `plans/09-test-ledger.json:1013` in this milestone.

The `fb9e8f4b` rename introduced 40 malformed path values, including:

```text
"now":"test/surfaces/"board-action.test.mjs"
```

`JSON.parse` fails at line 1013, column 65 (`Expected ',' or '}' after property value`). The
required acceptance artifact therefore cannot support automated path, ownership or case-count
reconciliation. Repair the stray quotes and validate both JSON syntax and the recorded paths.
The diagnostic removed the stray quotes only in memory to inspect classifications; it did not
modify the ledger on disk.

### P09-R2-03 — Convenience-assembled tests remain misclassified

Locations at the reviewed revision: `test/work/scope-flags-fields-agree.test.mjs:11` and its
ledger entry at `plans/09-test-ledger.json:1133`.

This suite loads the assembled application solely to compare `SCOPE_FLAGS` with `SCOPE_FIELDS`,
both owned by `@aof/knowledge`. Its ledger reason says a move requires rebuilding the collaborator
graph. A direct probe passed the same assertion using `createMemory` from `@aof/knowledge/memory`
with fail-on-use `loadLocalBackend` and `loadGraphifyBackend` stubs, and `SCOPE_FIELDS` from
`@aof/knowledge/memory/local-retrieval`. Neither backend was invoked; no application assembly was
needed.

This is a concrete exception to the blanket retention rationale, not a claim that all 505 retained
suites should move. Inspect their actual subjects individually. Construction cost alone does not
establish cross-package coverage under Plan 09's rule; move single-package cases or record a
specific integration subject that justifies retention.

### Verification for the second review

All fresh executions below ran approved outside the sandbox after Windows denied sandboxed
process creation. Results apply to `d48bf751`:

- `node scripts/supply-chain-audit.mjs`: pass, zero warnings.
- `node scripts/workspace-boundaries.mjs`: pass, empty findings.
- `node scripts/test-workspace.mjs --all`, with an isolated global home: all 14 workspaces pass,
  **1,344 registered cases and 247 native cases** (`workspaces-current.log`).
- The assembled registry contains **11,537 cases with 11,537 unique names**. This census alone
  does not claim historical name-multiset equivalence.
- Nine existing changelog cases and the existing live-tree link-ratchet case, executed through
  `runCases`: **10 cases, zero failures** (`repaired-findings.log`). The earlier missing-changelog
  and link-ratchet findings are repaired at this revision.
- The dependent-case shard reproduction fails as recorded in P09-R2-01; the package-only
  scope-flags probe passes as recorded in P09-R2-03.

Receipts are under ignored `.tmp/signoff-142/`. No new full-tree gate, native distribution build
or platform acceptance was performed for this review. No tracked files were changed during the
review itself; this subsequent update records its findings without changing implementation or
test expectations.

## Recheck and fixes — 2026-10-02

Rechecked the working tree based on `b854ad5b`, preserving the existing uncommitted fixes. The user
authorized direct fixes. This pass verifies and hardens the cited defects; it does not claim to
have completed the remaining 504-suite ownership migration or a new clean-worktree whole-tree gate.

| ID | Current disposition | Evidence and remaining work |
| --- | --- | --- |
| P09-R2-01 | Resolved in working tree | Suite files are atomic unless `independentCases === true`. The actual plan at `--split-seconds 100` keeps all 19 live-tree cases in one unit. The setup/promotion pair passes together. A registered regression covers the dependency at four thresholds and exact-once coverage for opted-in chunks. |
| P09-R2-02 | Resolved in working tree | The ledger parses; all 1,106 current paths exist and are unique. A registered regression checks the JSON, path confinement, file existence, stored name hashes and exactly-once registration. Restoring the malformed quote in memory makes parsing fail. |
| P09-R2-03 | Partial; broader finding open | The cited constant-agreement test is now owned by `@aof/knowledge`, with fail-on-use backend ports and the original case name. The remaining 504 suites have not all received the individual subject classification required by the finding; the construction-cost rationale remains insufficient to accept that group. |

Changes made in this pass:

- Extracted the scheduler's atomic-by-default chunk calculation into `suiteCaseChunks` in the
  existing test harness so the production scheduling decision is directly exercised by a test.
  Invalid split thresholds on opted-in suites fail explicitly.
- Added two cases to the existing workspace suite, rather than changing any existing case names:
  `workspace-tests/sharding keeps shared-fixture suites atomic unless cases explicitly opt into independence`
  and `workspace-tests/Plan 09 ownership ledger parses and matches current files and registered case names`.
  The registry is now **11,539**, the previous 11,537 plus exactly these two checks. The ledger
  records both names and the updated suite hash; its placement totals are **70 moved / 1,036 retained**.
- Refreshed the runtime audit for the reviewed scheduler change. FF-5311's residue digest was
  advanced only for the appended helper's **12 non-comment lines**. A byte comparison against
  `HEAD` confirms the pre-existing harness is unchanged; the three execution/isolation-region
  pins are unchanged and their planted-violation checks still pass.

Verification ran approved outside the sandbox, using isolated global homes for executable suites:

- Supply-chain audit: pass, zero warnings.
- Focused workspace, ledger, boundary, source-budget and runner-registration selection: 32 cases;
  31 initially passed and FF-5311 identified the helper's unrecorded digest change. After the
  measured digest update, all 12 runner-registration cases passed on rerun; the other 20 cases
  had passed unchanged. Logs: `recheck-focused.log`, `recheck-registration.log`.
- `node scripts/test-workspace.mjs @aof/knowledge`: **44 registered + 7 native cases**, zero failures
  (`recheck-knowledge.log`).
- `node scripts/test-sharded.mjs --plan --split-seconds 100`: **11,539 cases mapped**, seven
  explicitly chunkable files; the live-tree suite remains one 19-case unit (`recheck-plan.log`).
- `node scripts/test-shard.mjs test/work/stream/work-this-tree-holds-what-is-live.test.mjs 4,5`:
  **two cases, zero failures** (`recheck-dependent-pair.log`).
- In-memory red probes: the old malformed quote is rejected by `JSON.parse`; forcibly opting the
  dependent suite into splitting loses the promotion setup. No tracked file was mutated by a probe.

Receipts are in ignored `.tmp/signoff-142/`. No dependencies were installed or changed, no existing
acceptance threshold was lowered, and no repository work-item state was altered. Full Plan 09
acceptance still requires the remaining ownership work and the final gate/dispositions recorded
in the plan; this focused recheck does not replace those requirements.

## Final gate — e7addd1e (2026-10-02) — superseded by [5035a225](#final-gate--5035a225-2026-10-02)

Run from a clean detached worktree at the tested commit `e7addd1e` (`prepare-worktree`, isolated
`AOF_GLOBAL_HOME`, clean launch environment), Windows x64. Logs are in ignored `.tmp/gate-142/`. Docs-only commits
after it change no code.

| Check | Result |
| --- | --- |
| Supply-chain audit | pass, 0 warnings |
| Workspace boundaries | pass, 0 findings |
| UI production build | pass |
| Workspace suites (`test-workspace --all`) | 14 workspaces, 1,594 cases, 0 failures |
| Whole tree, sharded | **11,539 of 11,539** cases executed in 33.9 min; 2 failing units, 4 load flakes green alone |
| Integration and cargo lanes | green (`cargo test`, `cargo check` of `apps/desktop`) |
| Windows distribution | `build-sea` → `stage-release-assets` → `verify-distribution`: all 8 checks pass |

Failures, each diagnosed:

- **`work-this-tree-holds-what-is-live` cases 00 and 02** — one finding only: the 142 milestone's `SPEC.md`,
  "missing or empty record doc". This is the **accepted** 142 disposition ([09-CLEANUP](09-CLEANUP.md#work-stream-dispositions-and-what-stays-open)).
  Case 01 (the link floor) passes; story 141 is archived and the backlog story validates, so neither appears.
- **`fleet-terminal-view-producer-fed` case 38-06** — a real interactive-session case ("precondition: the interactive session was
  spawned and handed its command"). It failed in the pool and on the alone-retry, then passed two of three unloaded reruns, and the
  failing case differed between runs (38-06d once, 38-06e in the gate). The file and its fixture are unchanged since the
  `test/surfaces` rename. Recorded as an intermittent real-PTY race, not a regression of this change; not weakened.
- Four load flakes, green alone: `agent-session-driver-transcript`, `loop-diag`, `session-screen-verdicts`, `mesh-worker-completion-detection`.

What this does and does not establish:

- P09-R2-01 and P09-R2-02 are fixed and exercised by the registered regression cases. P09-R2-03 is fixed for the cited suite
  and for 29 further suites; every retained assembled-application suite now has a measured subject.
- **Not met:** 73 retained suites execute one feature package, or only core, and are package-owned in principle (listed in the
  ledger with the reasons `executes exactly one feature package…` and `executes only core…`). Plan 09's "every root test is
  cross-package or a repository-wide guard" is therefore false until they move.
- **Not verified:** the real desktop-app run, Linux/WSL on this revision, macOS/arm64 and the hosted CI matrix remain open.
- Signoff of the **verified scope** (Windows x64) is supportable on this evidence **only if** the 73 open suites and the accepted
  142 finding are accepted as a stated reduction; otherwise Plan 09 is incomplete.

## Final gate — 5035a225 (2026-10-02)

The ownership work the e7addd1e gate left open is done, and the gate was re-run from a clean detached worktree at the tested
commit `5035a225` (`prepare-worktree`, isolated `AOF_GLOBAL_HOME`, clean launch environment), Windows x64. Logs are in ignored
`.tmp/gate-142/`.

| Check | Result |
| --- | --- |
| Supply-chain audit | pass, 0 warnings |
| Workspace boundaries | pass, 0 findings |
| UI production build | pass |
| Workspace suites (`test-workspace --all`) | 14 workspaces, 1,959 registered + 247 native cases, 0 failures |
| Whole tree, sharded | **11,539 of 11,539** cases in 22.5 min; 1 failing unit (below), 2 load flakes green alone |
| Integration and cargo lanes | green (`cargo test`, `cargo check` of `apps/desktop`) |
| Windows distribution | `build-sea` → `stage-release-assets` → `verify-distribution`: all 8 checks pass |

The one red: `work-this-tree-holds-what-is-live` cases 00 and 02, each with the single finding "missing or empty record doc" on
142's `SPEC.md` — the **accepted** disposition ([09-CLEANUP](09-CLEANUP.md#work-stream-dispositions-and-what-stays-open)).

Against the findings:

- **P09-R2-01, P09-R2-02:** fixed and covered by registered regression cases.
- **P09-R2-03:** done. 131 of 1,106 root suites moved (case-name hashes identical to the ledger's for every one). Every retained
  assembled-application suite was measured under V8 coverage and carries a specific reason in the ledger; no entry is open.
  18 single-package suites stay only because they share a root fixture with staying suites or guards, and 3 because the delivered
  127/05 contract pins their directory's budget — each named, each movable only with those dependents.
- The intermediate gate at `c611275d` caught the 127/05 pin; the three suites were returned byte-identical in `5035a225`.

Open, and not claimed: the real desktop-app run, Linux/WSL on this revision, macOS/arm64, the hosted CI matrix, and 142's record
doc (an operator decision).
