## Feedback (for retro)

- refine placed both arch controls under test/arch/bundle/, which 124/02's FF-12405 leg 10 freezes at 23 with a ceiling that may only fall; the build had to re-home them (test/arch/loop, test/arch/command). Refine should check the budget table AND any freeze control over a directory before writing files:. — Raised by: architect
