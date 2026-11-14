---
doc: state
---
# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — State

## Progress

- 2026-11-12: captured, promoted as 193, and renumbered to 192 so it sits before operator-aware
  discovery (193), which waits on it.
- 2026-11-13: refined autonomously in solo mode (ADR-001–008, four stories). Built, reviewed and
  verified by the loop (`loop:autonomous-cascade`, run `632ce08e`); stories 00–03 were accepted at
  verify (02 after F-01, 03 after F-02). The loop ended after one more refine cycle, with the
  milestone gate and accept still owed.
- 2026-11-14: closed by hand. Leftover dispatch worktrees were removed, F-04 was filed in the
  backlog, and 192/00 and 192/01 gained their retrospectives. The first gate was red (F-05),
  its six cases were fixed in `2792403a`, and the second gate was green. Accepted. See
  VERIFICATION `## Milestone accept decision`.
- [x] `00_story_a-command-is-composed-from-slots-and-fragments` — accepted at verify 2026-11-13, done
- [x] `01_story_a-practice-ships-a-variant-of-a-template` — accepted at verify 2026-11-13, done
- [x] `02_story_the-gated-prose-leaves-core` — accepted at verify 2026-11-13 after F-01, done
- [x] `03_story_a-project-sees-its-practices-and-hears-of-a-stale-render` — accepted at verify 2026-11-13 after F-02, done

## Decisions (graduated)

- A slot is a marker line in a source, filled in `loadBundle`, so no reader of the bundle sees a
  marker. An empty slot leaves nothing behind (ADR-001).
- A practice declares its keys in its own bundle fragment, and its fragments name the practice.
  Order is declared by position, and a fragment may replace another of its own package (ADR-002).
- What is on is decided by the project's own config file and nothing else, through one resolver
  (ADR-003).
- A practice may ship a variant of a template, installed at the default's path (ADR-004).
- The first move: discovery's prose and the build brief are fragments, with two seam edits and
  nothing else changed (ADR-005).
- Each render records the practices it was built with. The work doctor reports a stale render: an
  error when a practice is on and not rendered, a warning the other way (ADR-006).
- `aof work update` lists every optional practice and the key that turns it on (ADR-007).
- The refine-time defaults taken in STATE (SPEC wording against ADR-002 §1 and §7, ADR-005 §4 and
  ADR-006 §3) stood through build and accept unchallenged.

## Archived

The refine notes, the build blow-by-blow, the per-story review routes and the
`## Feedback (for retro)` notes have graduated. The lessons are in the milestone's
`RETROSPECTIVE.md` (R1–R5) and in each story's own. The evidence is in VERIFICATION, and the open
follow-ups are in OUTCOME's Gaps and VERIFICATION's F-04. The full pre-compaction text is in git
at `2792403a`.

## Verification

- [x] `@executable` story lanes green for 00–03 (VERIFICATION, per story)
- [x] Fitness functions FF-19205–FF-19208 green, each with a red probe
- [x] `@manual` 192/02 E4/E5: the committed copies changed only at the two seams
- [x] Milestone regression gate: green at `2792403a`, run on a GitHub runner through `gate.yml`
  (`REGRESSION.md`), after the red run at `b0ea033c` (F-05)
