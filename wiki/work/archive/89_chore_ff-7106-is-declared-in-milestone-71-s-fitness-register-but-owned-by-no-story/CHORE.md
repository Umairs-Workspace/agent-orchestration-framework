---
type: chore
number: 89
slug: ff-7106-is-declared-in-milestone-71-s-fitness-register-but-owned-by-no-story
title: "Ff 7106 Is Declared In Milestone 71 S Fitness Register But Owned By No Story"
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 89 · Ff 7106 Is Declared In Milestone 71 S Fitness Register But Owned By No Story

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Milestone 71 declared **FF-7106** in its fitness register and its four-story partition gave it no
owning story, so the control was declared and orphaned in one document (71/F-71-A). `aof work doctor 71`
reported it as `control-unresolved` and 71 could not be accepted with it standing. The invariant was
fully specified where it stood, so landing it needed no new acceptance criteria — only the file.

## Definition of Done

- [x] Land test/arch/acd-declared-writes-include-generated-siblings.test.mjs as specified in 71's ARCHITECTURE.md fitness register, and register it in scripts/test.mjs. Derive bundle membership from loadBundle()/renderBundleOutputs(), never a src/bundle/ string prefix (src/bundle/frozen-set.jsonc renders to .aof/frozen-set.jsonc and a prefix test misses it). Require src/bundle/manifest.json AND every git-tracked rendered output of each declared bundle member, computed as renderBundleOutputs() intersected with git ls-files rather than a hand-listed runtime set. Scope to OPEN items per 66/ADR-002. Omit the registration leg - acd-test-suite-registration already walks the tree. Bind what a story LANDS, not what it NAMES. Prove non-vacuity with the two plants the register names: an open story declaring a bundle member without the manifest, and one without its tracked rendered copies. Then confirm aof work doctor 71 no longer reports control-unresolved.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "FF-7106 is declared in milestone 71's fitness register but owned by no story" (`wiki/work/71_milestone_loop-discipline/ARCHITECTURE.md`)
- **Raised reviewing:** `71/03`, review round 1
- **Promotion key:** `finding:71/03:ff-7106 is declared in milestone 71's fitness register but owned by no story`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
