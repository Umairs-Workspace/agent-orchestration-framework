---
doc: retrospective
promotionFrom: 1
---
# 02 · graphify serves the code corpus behind the port, and aof graph build and impact answer through it unchanged — retrospective

## R1 · Two contract rows disagreed with the ADR they rested on

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** Task 00 requires `git status --porcelain` to list nothing under `graphify-out/`.
But the nested ignore that 10/ADR-005 prescribes (`*` plus `!.gitignore`) leaves the ignore file
itself untracked, and that shows as `?? graphify-out/`. The build met the row by writing `*` alone
on the code corpus's ingest. Task 01's "valid JSON with no links key" row named "the normaliser's
message" as the cause. ADR-002 says it is the read error's `code`, which the build followed. Both
features were left unedited.

**Why:** The rows were written against the observable the story wanted, and the mechanism was not
run once at refine to check it produces that observable. ADR-002 and the feature were authored
side by side without being diffed against each other.

**Lesson:** When a contract row asserts an observable that rests on a mechanism an ADR prescribes,
run that mechanism once at refine, or quote the ADR's wording into the row.

**Refs:** milestone STATE `## Feedback (for retro)` (179/02 contract flag, contract decision);
179/ADR-002; 10/ADR-005.
