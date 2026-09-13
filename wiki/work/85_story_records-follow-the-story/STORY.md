---
type: story
number: 85
slug: records-follow-the-story
title: "A delivered story carries its records whatever authored it — the outcome is not verify's privilege"
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-09-04
depends: []
schema: 1
aofVersion: 0.1.0
reads: [src/bundle/commands/assimilate-code.md, src/bundle/commands/verify.md, src/bundle/commands/retrospective.md, test/verify-outcome-per-type.test.mjs, test/arch/acd-outcome-authored-by-verify.test.mjs, .aof/templates/work/shared/OUTCOME.md, src/work-doctor.mjs, wiki/work/84_story_story-span-ref/STORY.md]
files: [src/bundle/commands/assimilate-code.md, src/bundle/commands/verify.md, src/bundle/commands/retrospective.md, src/bundle/templates/shared/OUTCOME.md, src/bundle/manifest.json, src/work-doctor.mjs, src/work-doctor-coherence.mjs, src/commands/doctor.mjs, test/verify-outcome-per-type.test.mjs, test/records-follow-the-story.test.mjs, test/delivered-story-records-reported.test.mjs, scripts/test.mjs, .aof/templates/work/shared/OUTCOME.md, .aof/aof.lock.json, .claude/settings.json, .claude/commands/aof/retrospective.md, .codex/skills/aof-retrospective/SKILL.md, .opencode/commands/aof/retrospective.md]
---
# 85 · Records follow the story

## User story

As someone reading a delivered item months later,
I want every accepted story to carry its own outcome and its own retrospective, regardless of which
command accepted it or whether it sits under a milestone,
so that "what does the system now do" and "what did building it teach" are both answerable at the
story I am reading, rather than depending on which door the work came through or on opening a
milestone that may not be accepted yet.

## Why

`aof:assimilate-code` accepts a story — it drives the item to `status: done` in its own step 6 — but
authors **no `OUTCOME.md`**, because `aof:verify` is the only prompt permitted to author one. The
result is an accepted item that structurally cannot carry the record every other accepted item
carries. Story 84 is the demonstration: assimilated, accepted, and missing its outcome until it was
authored by hand afterwards.

**The prohibition is real and enforced**, which is why this is not a prose fix.
`test/verify-outcome-per-type.test.mjs` scans every bundle prompt — commands, agents *and* skills —
for `/(write|author|fill|edit|instantiate)[^\n]{0,60}OUTCOME\.md/i` and asserts the offender list is
empty apart from `verify.md`. Adding the instruction to `assimilate-code.md` reddens it.

**But the rule protects something narrower than it forbids.** The template states its own reason:
authored *"never at insert, never by a developer/evidence subagent (verify owns record docs)"* — the
failure mode is a subagent with `Write` clobbering records and fabricating decisions. `assimilate-code`
is a main-session govern command in the same class as `verify`, not a subagent. The rule's INTENT is
"not a subagent"; its IMPLEMENTATION is "only verify.md". This story reconciles the two.

**The cost is measurable, not theoretical.** `OUTCOME.md` feeds `parseOutcome` →`buildRecords` in the
memory index. Authoring story 84's outcome took the reindex from 1,271 to 1,278 records: seven
recallable facts about a delivered capability that did not exist while the file was missing.

## Scope

**The rule is one line: a story has an `OUTCOME.md` and a `RETROSPECTIVE.md`.** Nested or standalone,
newly created or assimilated. There is no case where a story has one and not the other, and no case
where another item carries them on its behalf.

Measured before this change: **193 of 228** done stories carry no outcome, and **222** carry no
retrospective — `RETROSPECTIVE.md` appears 57 times at driver level and **zero** times under
`stories/`. Both doors are short today: `aof:assimilate-code` authors a retrospective but no outcome,
and the forward loop authors a per-story retrospective only when the story is standalone.

**Milestones are OUT OF SCOPE.** A milestone's outcome and retrospective are aggregated artifacts with
their own rules, and they are irrelevant to this story. Nothing here touches a milestone template, a
milestone branch of any prompt, or any milestone code path — the only prompt edits are to the story
lane, and the only check added judges a story on its own folder.

**The backlog is out of scope and must stay out.** 193 of 228 done stories carry no outcome and 222
carry no retrospective, almost all predating story 80 (which widened outcomes to stories). A hard
`validate` gate would redden the entire stream at once. Whether the deterministic check belongs in
`doctor` (advisory, and therefore landable now) or in `validate` (structural, and therefore needing a
backfill plan first) is the one open design question — see `tasks/01`.

## Tasks

- [x] `tasks/00_assimilate-authors-the-outcome.feature` — an assimilated story carries the same
      outcome an accepted one does, and the one-writer rule is restated as what it protects.
- [x] `tasks/01_a-delivered-story-without-its-records-is-reported.feature` — the rule stops being
      prompt-only: a deterministic check names a delivered story missing the records its type owes.

## Notes

The `files:` list was empty deliberately — this story's write set was to be decided at refine,
once `tasks/01`'s doctor-vs-validate question was settled. It was declared at BUILD instead,
because the item went straight from scaffold to `aof:continue`; the gap is recorded as a
contract finding rather than papered over.

**`tasks/01`'s open question, and the measurement that settled it: `doctor`, advisory, at
`warn`.** Re-measured at build over this stream: **199 of 283** done stories carry no
`OUTCOME.md` and **275** carry no `RETROSPECTIVE.md`. A `validate` finding is STRUCTURAL and
would have reddened the whole stream at once — taking every gate that runs validate down with
it, including the loop's first rung — and the feature's own text requires a `validate` answer
to arrive with a backfill plan rather than without one. There is no backfill plan, and filling
the backlog is explicitly out of scope, so the check reports the backlog instead of blocking on
it.

**Where it landed:** `lifecycleCompletenessGroup` (`src/work-doctor-coherence.mjs`), the group
that has asked a milestone "you are `done` — where are your deliverables?" since story 01, and
that already owns `missing-retrospective`, the per-fact cache suppression and the `warn`
severity this check needs. A `work-doctor-records.mjs` sibling was written first and then
withdrawn: it would have been an eighth `work-doctor-*` module re-spelling this group's
`cacheDegraded()` predicate, against a ratchet 66/ARCHITECTURE.md already records ("doctor's
lane modules go 4 → 5; the SIXTH folds the family into `src/work-doctor/`").
