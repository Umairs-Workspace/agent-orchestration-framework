## Feedback (for retro) — ARCHIVED 2026-09-13 at accept

The one note has graduated into [RETROSPECTIVE.md](RETROSPECTIVE.md) and is kept here only as
the trail back to who raised it.

- refine placed both arch controls under test/arch/bundle/, which 124/02's FF-12405 leg 10 freezes at 23 with a ceiling that may only fall; the build had to re-home them (test/arch/loop, test/arch/command). Refine should check the budget table AND any freeze control over a directory before writing files:. → **R1**. — Raised by: architect
