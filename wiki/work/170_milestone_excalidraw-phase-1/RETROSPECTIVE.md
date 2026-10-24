---
doc: retrospective
---
# 170 · Excalidraw phase 1 — retrospective

What building phase 1 taught, for the import to carry.

## R1 · Every browser check was green while the accepted draft was clipped off the canvas

**Kind:** near-miss · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The first real-browser run of story 07 passed all 24 checks. The screenshots
showed the accepted Mermaid draft half-hidden under the canvas menu at the left edge, and the
accepted cache entirely off-screen. The checks read the scene file and the panel text, both of which
were right; nothing asserted what the operator would see.

**Why:** A draft lands where the converter places it and the SDK does not move the viewport, so an
accepted change can be invisible. A DOM- and disk-level check cannot see a viewport.

**Lesson:** A served-path smoke saves its screenshots and someone looks at them before the gate is
called green. Accept now scrolls to what it changed.

## R2 · The single-request review would have answered every note twice once it became a batch

**Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** In PR #13 a proposal never changed its request's status, which was harmless
while each review answered one request id. Writing the batch prose ("answer every open note")
exposed it: a note answered by a proposal stayed `open`, so the next batch run would propose for it
again and the operator could withdraw a note the architect had already acted on.

**Why:** A record's terminal states were defined for the flow that existed (respond closes a note)
and not for the flow the batch adds (propose and draft also answer one).

**Lesson:** When a one-shot action becomes a batch over records, list every action that should
take a record out of the batch's selection and make each one do it. Propose now marks the note
`proposed` (as the `draft` action did, before it was withdrawn with ADR-005).

## R3 · The smoke stands in for the architect, so the model's Mermaid is the unverified part

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** qa · **Raised by:** developer · **Promoted to:** none

**What happened:** The smoke drives the architect's side through the real CLI calls rather than a
live Claude session, which keeps it reproducible and free of a paid session. Everything aof owns
is proven; what a real model writes as Mermaid from a real ADR is not.

**Why:** A live review starts a billed agent session, which no unattended check should do.

**Lesson:** Acceptance of a feature whose input is model-written keeps one human-run live pass as
an explicit item, recorded in VERIFICATION's acceptance list rather than implied by a green smoke.

## R4 · A hand-numbered temporary milestone takes the stream's next number on import

**Kind:** misunderstanding · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** The folder was numbered 200 so it collided with nothing live. `aof migrate
--dry-run` reports it would land as the stream's next number, not 200.

**Why:** Migrate mints the number at import; the folder's own number is only its name until then.

**Lesson:** Cross-references to a temporary milestone use its slug, not its number, until it has
been imported.

**At import (2026-10-24):** With the folder still inside `wiki/work/`, the mint counted it and
offered 201, so it was moved out first and landed as 170. The code had cited "milestone 200" and
"200/NN" in about 30 places anyway, and they were renumbered by hand. The CLI's recovery also
re-sequenced the ADRs (010–013 became 007–010) and flattened the SPEC, so the source documents were
carried verbatim instead.

## R5 · A first draft was built as an import, and the operator saw three pictures of one diagram

**Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** operator · **Promoted to:** none

**What happened:** ADR-005 solved "the editor opens empty" with a one-shot Mermaid import into a
separate `.excalidraw` scene. It was built, verified 24/24 in a browser and set in-review. The
operator then asked why Mermaid was used at all, and the answer exposed the published HTML/SVG, the
Mermaid draft and the Excalidraw scene as three representations nothing kept in step, with edits in
a fourth (element operations). The milestone was reworked onto one format (ADR-006–ADR-009), and
then reworked again (R7).

**Why:** The draft was designed as a feature (fill the empty canvas) rather than asking what the
diagram IS. Each piece was locally right; the whole had no single source of truth.

**Lesson:** Before adding a representation of a thing, name the one artifact that is the thing and
derive the others from it. A design that needs a sync story is a design with two sources.

## R6 · Screenshots caught a frozen size that every check passed — the second time in this milestone

**Kind:** near-miss · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** On the one format, all checks passed while the published figure showed "Gateway"
wrapped letter by letter: saving had recorded every node's size, so the converter's size for the old
label "API" was pinned in the file. The converter's routed arrows were likewise saved as if bent.

**Why:** "Save what the canvas shows" saved what the converter chose as if a person had chosen it.

**Lesson:** Persist only what a person decided; let derived values stay derived. R1's rule — look at
the screenshots before calling a browser gate green — caught it again, and earns its place.

## R7 · The Mermaid file as the store had no room for the operator's own assets

**Kind:** misunderstanding · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** operator · **Promoted to:** none

**What happened:** ADR-006 made the `.mmd` the one stored format. The operator then asked about
custom styling and about templates such as Azure resources. A Mermaid file holds only what Mermaid
can say, so a library item would have had to be refused or re-described in the profile, which means
recreating the library. The milestone was reworked a second time: Excalidraw's scene is the store,
and Mermaid is the architect's view of it (ADR-010–ADR-013).

**Why:** R5's lesson was applied to the wrong side. One source of truth was right, but choosing the
agent's language as that source made the person's richer medium a lossy view of it.

**Lesson:** When two parties edit one artifact in different media, store the richer medium and
project the poorer one. Check a format against the user's real assets, such as their libraries and
styling, before building on it.

## R8 · Screenshots caught a relabel crowding its own arrow — the third time

**Kind:** near-miss · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** On the scene store, all 23 checks passed while the published figure showed
"Gateway" off-centre and its "writes" arrow buried under the grown box. The compile widened the box
rightwards and left the text to the SDK's normaliser, which re-centred it about the old centre. It
never re-routed the box's arrows, and the server's touch set for a relabel would have refused the
re-route anyway.

**Why:** The compile's round-trip property, that the scene reads back as the proposal, is blind to
geometry. A relabel's effect reaches past the node to its arrows.

**Lesson:** A change's touch set covers its geometric consequences, not only the facts it names: a
relabel can resize, so it reaches the arrows. R1's rule held for the third time.
