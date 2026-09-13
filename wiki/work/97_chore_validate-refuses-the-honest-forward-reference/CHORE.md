---
type: chore
number: 97
slug: validate-refuses-the-honest-forward-reference
title: "`validate` refuses a story's honest forward reference, and teaches the author to under-declare"
status: done
owner: developer
created: 2026-09-03
updated: 2026-09-04
depends: []
origin: [../62_milestone_self-improvement-loop/RETROSPECTIVE.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the chore record. A small, self-contained unit of work with no user story.
-->
# 97 · `validate` refuses a story's honest forward reference

## What

`aof work validate` reports `story reads path "<p>" does not exist` for a `reads:` entry naming a file
the story's own milestone has not built yet — so a stage-2 story cannot declare the stage-1 modules it
composes.

Measured, from 62's retrospective:

> **62/R8.** *"`aof work validate` rejects a story `reads:` entry naming a path the story's own
> milestone has not built yet, so a stage-2 story cannot declare the stage-1 modules it composes.
> 62/04 had to drop four `src/work-tune/*.mjs` entries and stand sibling `STORY.md` paths in their
> place to reach validate PASS at refine. … That is 61/R6's measured failure mode — read contracts
> systematically short, every escape load-bearing — re-created by the validation contract itself
> rather than by an author. The read contract that would have been most useful to 62/04 is the one
> validate refused. **Lesson.** … A gate that makes the honest declaration impossible teaches authors
> to under-declare."*

The check is in `validate.mjs`: for `reads:` only, the entry is resolved and read, and a missing file
is a finding. `files:` is deliberately exempt — *"writes may name files the story has not created
yet"* — and the same reasoning applies to a read of a sibling's declared write.

**It is red in the stream right now.** `aof work validate` reports two findings on
`77/05_story_the-lanes-are-registered`, for `src/work-audit/declared-bounds.mjs` and
`src/work-audit/toolkit.mjs` — both named in that story's `reads:`, both to be created by a sibling
story in milestone 77. That is the honest declaration, and the gate calls it a defect.

## Why it matters

Milestone 96 derives the read set from the graph and the citations. A derivation that produces the
honest set while the gate refuses it teaches the author to under-declare faster than hand-authoring
did, so this lands **before** 96/01. It is also the exact defect 96 exists to cure — a short read set —
manufactured by the framework rather than by a person.

## Definition of Done

- [x] A `reads:` entry naming a path claimed by a sibling story's `files:` under the same milestone
      validates clean, or reports a **warning naming the story that will create it** — 62/R8 leaves the
      choice open and it is this chore's to make. **Chosen: clean.** The findings envelope carries no
      severity channel, so a "warning" would still be a finding, still red the gate ladder, and still
      teach the author to drop the entry — which is the defect, not a softer form of it.
- [x] A `reads:` entry naming a path nothing will create is still a finding. The check keeps its teeth.
      The claim must come from a story under the SAME milestone, and the match is case-sensitive.
- [x] The behaviour is covered in `test/story-context-contract.test.mjs`, beside the existing
      reads/files cases.
- [x] 62/04's four `src/work-tune/*.mjs` entries can be restored and validate passes — its `reads:`
      carries all five `src/work-tune/*.mjs` modules today and `aof work validate` is green.
- [x] `77/05`'s two open findings clear without that story editing its `reads:` — both entries stand
      unedited and the stream validates PASS.

## Notes

Two adjacent defects in the same check, found while measuring and worth closing in the same pass
rather than filing twice:

- **A YAML comment on a block entry is swallowed into the value.** `- src/a.mjs # the entry point`
  parses to that whole string, so validate reports a path that does not exist. The story template
  itself teaches comments inside frontmatter.
- **A backslash path resolves on Windows and fails everywhere else.** `src\a.mjs` passes here and reds
  on the Mac and WSL nodes. `ready-wave.mjs` is unaffected — its collision key normalises separators —
  so this is a validate-only defect, and the fix is to refuse it with a message naming forward slashes
  rather than let the platform decide.

Both are one-line fixes in `story-contract.mjs` with cases in the existing suite.

## Accept decision

**Accepted** on the chore criterion (ADR-003) — the ticked checklist and a green `validate`, both
confirmed at source rather than read off the boxes:

- **Checklist** — every box under `## Definition of Done` is `- [x]`, none left `- [ ]`.
- **`aof work validate`** — `PASS — work stream is well-formed.` over the whole stream.
- The exemption is in `src/commands/validate.mjs` (`declaredWriteClaims`), claim-bounded to the
  milestone's own story `files:` and case-sensitive on the resolved project path — a read of an
  unclaimed path is still a finding.
- The two stories the gate had forced short now declare in full and unedited: `62/04` carries all
  five `src/work-tune/*.mjs` modules, `77/05` carries `declared-bounds.mjs` and `toolkit.mjs`.
- `test/story-context-contract.test.mjs` is green (exit 0, 18 assertions, none failing), carrying
  `chore-97/a reads entry a sibling story will create validates clean, and nothing else does`.

No `.feature` and no behavioural-verify step applies — a chore carries no acceptance scenarios.
