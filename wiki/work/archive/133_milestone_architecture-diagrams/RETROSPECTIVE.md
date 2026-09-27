---
doc: retrospective
updated: 2026-09-23
---
# 133 · Architecture diagrams — Retrospective

## R1 — a checklist-conforming figure was useless, and only a human looking at it saw that

- **Kind:** mistake · **Area:** design · **Stage:** refine → verify · **Owner:** designer
- **Raised by:** the operator at `aof:verify 133` (`F-133-01`, `F-133-02`)

**What happened.** DESIGN's binding checklist was met line by line at 390, 768 and 1280. The figure
spanned the doc column, was never upscaled and never scrolled sideways. But the doc column is the
detail panel, about 350 px wide at EVERY viewport, so a 1000-wide diagram rendered at a third of its
size and could not be read. The pasted `Source · PNG` links were plain relative hrefs that 404 in the
board, and no scenario ever clicked one. The operator's verdict: "Looks crap in the browser … Too
small to be of any use".

**Why.** The checklist specified the frame, not whether its contents could be read. "Full width of
the doc column" was written without measuring the column. DESIGN also ruled out a lightbox in
advance ("a diagram too dense to read at 390 is a finding against the diagram"), which made
unreadability the diagram's fault by definition. The link line was tested as markup (the hrefs
stay as written), never as a link a browser follows.

**Lesson.** A design checklist for a surface that shows content must state a READABILITY criterion
measured in the real container, with the container's width taken at refine. A link a surface
renders must be followed at least once in the real surface, because a markup assertion cannot tell
a working href from a dead one. Fixed here: story 04 task 03, plus DESIGN's "Amended at verify".

## R2 — the gate inherits whatever the last accept left red

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product owner
- **Raised by:** `aof:verify 133` (`F-133-03`, `F-133-05`)

**What happened.** Two defects from 132's accept reached 133's gate. The `test/arch/mesh` budget row
was one short (FF-11904 was red at HEAD). One of 133's own run records still sat under the pre-rename
machine folder, which 132's new guard refuses as soon as it is tracked.

**Lesson.** A milestone that lands a guard must run the whole-tree gate before its accept commit,
not after it. When a later gate finds inherited reds, repair the mechanical ones in place and name
their origin milestone in the finding, as done here.

## R3 — a new board route has a namespace rule, and the first placement broke it

- **Kind:** mistake · **Area:** architecture · **Stage:** verify (fix) · **Owner:** architect
- **Raised by:** `arch/15 ADR-005`, the route/command bijection

**What happened.** The file route went in first as `/api/work/diagram-file`. The `/api/work`
namespace is in bijection with the `work:*` commands, so a `diagram:*` command could not live there.
It moved to `/api/diagram/file`, wired by one additive line in `setup-ui.mjs`.

**Lesson.** Before adding a board route, read which namespace maps to which command family:
`/api/work/<op>` is `work:<op>`, and nothing else. A route for another family gets its own
namespace beside it.
