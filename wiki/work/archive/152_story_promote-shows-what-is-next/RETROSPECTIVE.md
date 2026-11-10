---
doc: retrospective
updated: 2026-10-06
---
# 152 · Promote shows what to promote next — Retrospective

The story was loop-driven: one refine run and one continue run. Review fixed two defects, and verify
fixed two more. Three of them carry a lesson.

## R1 — A review probe of a mutating verb promoted a real backlog item

- **Kind:** near-miss · **Area:** code · **Stage:** build (review) · **Owner:** builder, reviewer · **Raised by:** reviewer
- **What happened:** During review, `aof work promote -h` reached free-text slug resolution and promoted `a-halted-lane-is-reaped` by substring match on the real work tree. It was restored from git. The fix makes a flag-shaped argument refuse as `promote-flag-conflict`.
- **Why:** The verb's argument parser forwarded anything it did not recognise to the resolver, and a substring resolver will match almost any short token. The probe ran against the live tree because that is where `aof` runs by default.
- **Lesson:** A verb that resolves free text refuses any argument that starts with `-` before resolving it. Probe a mutating verb in a temp copy of the tree, never at the repo root. PLAN.md already said "do NOT run `--next-item` on the real tree"; the same rule applies to every unknown flag.
- **Refs:** STORY.md Notes, review close

## R2 — A step was narrowed below its scenario instead of the gap being fixed

- **Kind:** mistake · **Area:** contract · **Stage:** build → verify · **Owner:** builder · **Raised by:** verifier
- **What happened:** Task 02's last scenario says the claude, opencode and codex copies carry the new argument hint. The claude renderer dropped `argument-hint` for every command, so the step was written to check only the codex copy, and review recorded the gap as "Flagged". The scenario then read as met when it was not.
- **Why:** The renderer gap predated the story, so it looked out of scope. Narrowing the step was cheaper than touching a renderer that writes 32 files.
- **Lesson:** When a step cannot assert what its scenario says, that is a finding to fix in the item, not a note. A step narrowed below its scenario changes the contract without anyone seeing it. Here the fix was one frontmatter line, and the sweep measured its reach (1,194 cases).
- **Refs:** VERIFICATION F-01

## R3 — The story lane again missed a stream-wide control (140/R1, 141/R1 recurring)

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** refine → verify · **Owner:** product owner (refine), builder · **Raised by:** verifier
- **What happened:** 152's own PLAN.md restated a path its `files:` declares, which 96/02-00 (`story-plan-document`) bans. The story lane was green (548/0) because it held only code importers. The red surfaced only because verify's renderer sweep happened to include that file.
- **Why:** The importer sweep that 141/R1 prescribes is keyed on changed `src/` modules. The PLAN.md ban is keyed on the story's record documents, so no code-import grep reaches it.
- **Lesson:** A story that writes a PLAN.md (or any record doc) puts `test/work/story-plan-document.test.mjs` in its lane. Record-keyed controls are part of the sweep, beside the code importers.
- **Refs:** VERIFICATION F-02 · m141/R1 · m140/R1
