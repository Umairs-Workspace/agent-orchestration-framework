# 198/02 · Mocks are drawn on the system and committed as the baseline — Outcome

## Delivered

### Refine draws on the configured system
With `work.ui.designSystem` on, Claude's refine draws a milestone's mocks on that milestone's page of the project's one canvas, with the system installed, starting from the boards already there, and asks only "Approve these mocks?"; it never offers a checklist-only or hand-made route and never publishes to the system.

### A milestone's canvas page
`aof design-system canvas pages` decides a milestone's page: it sorts an unpaged canvas once by each board title's milestone number, takes a page the operator named for the milestone, spells ids as the stream spells the ref, and adds a missing page.

### The approved canvas as an offline baseline
`aof design-system mocks import` commits the approved page's boards, every component they mount, the runtime and the system's tokens under `mocks/` with the canvas, page, versions and approval in its README, and refuses anything incomplete; `mocks capture` frames each board at its own size from the mocks folder served on loopback (FF-19805).

- **The portal's milestone 37 holds the first live baseline** — eleven frames, imported from the approved version `1795814732-d099`.

### Verify pulls back an awaiting canvas
Claude's verify puts a canvas still awaiting approval to the operator before the fidelity judge, and on approval imports and captures it as the judge's baseline.

## Gaps

### Refine and verify paths not yet run live
**Status:** open
**Discharge condition:** the first live run of an ambiguous title, Revise, Later, a reference system's gap, verify's pull-back and a loop-driven refine, each recorded in 198's VERIFICATION.md (F-08).
