---
doc: verification
updated: 2026-10-03
---
<!--
  Story VERIFICATION.md — is story 146 truly done, and what is the evidence?
  Parentless story (parent: null): there is no milestone SPEC box to tick and no milestone
  regression gate at this door.
  No sibling ARCHITECTURE.md: 146 declares no FF-NN of its own. Its scope is held by two declared at
  127 (FF-12703, FF-12704), recorded under ## Fitness functions citing the declaring item.
  No UI surface and no DESIGN.md: no design-conformance section. No @uat: no user sign-off.
-->
# 146 · A capture can skip the backlog — Verification

## Method

Lanes in scope: `@executable` (task 00) and one `@manual` (task 01). Run inline by the product owner,
who is also the single writer allocating the finding ids below.

The first runs went into a detached worktree at `9e6ff7fb` (`aof-verify-146`), because 145's merge
was in progress in the shared checkout. Once that merge landed (`69b6d5e0`), every run was repeated
at the branch head. Every suite ran through the repo test runner's `--only` under a fresh
`AOF_GLOBAL_HOME`, with exit codes read unpiped. The lane widened from the story's suite to every
test that reads the bundle manifest or the add prompts, plus the directory budget and the plan
restatement ban.

## Verification evidence

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | `work-add-in-stream`, `acd-one-mint`, `acd-intake-write-side-only` | **16 ok, exit 0** | task 00 |
| `@executable` (importer sweep, at `9e6ff7fb`) | the story lane plus `autonomous-shell-out-prompt`, `acd-learning-edge-reaches-every-cut`, `acd-source-directory-budget`, `adapters`, `asset-base-seam`, `acd-bundle-membership`, `acd-prompt-bounds-name-their-home`, `acd-declared-writes-include-generated-siblings`, `refine-discovery-beat`, `story-plan-document` | **175 cases, 17 failures**: 6 are the directory budget (F-146-01), 1 is the plan ban (F-146-02), and 10 are `asset-base-seam` (the worktree had no `apps/ui/dist`; with it copied in, **11 ok, exit 0**) | task 00 |
| `@executable` (after the fixes, at the branch head) | the same 13 files | **175 ok, 1 failure** before the plan fix, the plan ban only; then `story-plan-document` + `acd-source-directory-budget` **25 ok, exit 0**, and every `PLAN.md` in the tree (72) admitted by the ban's own detector | task 00 |
| `@manual`: in-stream capture | scratch project (`git init`, `aof work init --runtime claude`, config `work.dir: ./work`, `work.intake: "backlog"`), four seed chores promoted to 00–03. The rendered `add-story` prompt was followed for `probe-capture --in-stream`: the switch was stripped, `work/backlog/story_probe-capture/` scaffolded from the template, then `aof work promote probe-capture --json` | promote exit 0: `{"at": 4, "space": "top-level", "created": {"ref": "04", "type": "story", "dir": ".../work/04_story_probe-capture"}, "from": {"ref": "probe-capture", "dir": ".../work/backlog/story_probe-capture"}}`. The work root lists `00_chore_alpha … 03_chore_delta`, `04_story_probe-capture`, `backlog`; `backlog/` holds no `story_probe-capture`. `aof work find probe-capture --json` → `"ref": "04"`. `aof work validate` → exit 1, a single finding: `story declares neither reads nor files` on `04_story_probe-capture` (F-146-03) | task 01 scenario 1 |
| `@manual`: capture without the switch | same project: `probe-later` scaffolded from the same prompt with no switch, so step 3 keeps it under the backlog intake | `work/backlog/story_probe-later` exists; `aof work find probe-later --json` → `"ref": "probe-later"`, `"number": null`, `"dir": "work\\backlog\\story_probe-later"` | task 01 scenario 2 |
| gate | `aof work validate 146` | `PASS — 146 is well-formed.` exit 0 | step 4 |
| gate | `aof work doctor 146` | exit 0; **no `control-unresolved`** at either severity. Warns only: `numbering-gap`, `rubric-join-unchecked`, `depends-edges-unchecked` | step 4 |

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| m127/FF-12703 | `test/arch/work/acd-one-mint.test.mjs`, leg (e) over the add prompts | green: no add prompt computes a top-level number | in the throwaway worktree, appended ``1. Next top-level number `NN` = max `NN` across `work.dir` + 1`` to `add-story.md`: leg (e) red, `add-story.md as a prompt that computes a number (max) — an item is born un-numbered on the intake…`; reverted |
| m127/FF-12704 | `test/arch/work/acd-intake-write-side-only.test.mjs` | green: `intake` appears only in the allow-listed writers and the bundle prompts | in the throwaway worktree, appended `export const __probeIntake = "work.intake";` to `packages/work/src/validation.mjs`: legs (1) and (2) red, `validation.mjs carries the token \`intake\` … and is not on the write side`; reverted. (A comment-only probe stays green: the suite strips comments by design) |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-146-01 | `test/work/` held 46 counted children against a ceiling of 45 (45 against 44 before 145 merged): 146 added `work-add-in-stream.test.mjs` with no stated rise, which red 6 FF-11904 / 138/00 cases | defect | blocker | fixed in the item | 146: the `test/work` row rises 45 → 46 with its reason stated (`acd-source-directory-budget.test.mjs`) | closed |
| F-146-02 | the plan restatement ban (96/02-00) refused three `PLAN.md` on this branch: 146's and 136/01's verification steps named several test paths, and 136/02's named the runner and one test (`scripts/test.mjs` is itself a path) | defect | blocker | fixed in the item | 146 (136/01 and 136/02 too, as they share the branch): each verification step names the contract's sets, not the paths | closed |
| F-146-03 | task 01's `Then "aof work validate" is green` could not hold: validate deliberately reds an untouched `reads: []` + `files: []` scaffold (`validate.mjs`, the template-signature rule), and it fired equally on the no-switch capture | contract defect | blocker | fixed in the item | 146: the Then now reads "reports no finding other than the fresh scaffold's empty reads/files signature", which is what was observed | closed |
| F-146-04 | PLAN.md said `aof work update` refreshes `manifest.json`; it does not | doc defect | non-blocker | fixed in the item | 146: PLAN.md names the bundle-manifest generator | closed |

## Accept decision

**Accepted, 2026-10-03.** Task 00 is green, and both task 01 scenarios hold as observed in a scratch
project under a backlog intake. Validate passes, and doctor reports no unresolved control. No
blocker finding is open: F-146-01, -02 and -03 were fixed in the item at verify.
