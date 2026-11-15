# 193/01 · The gate accepts a cited finding, and nothing less — Outcome

## Delivered

### An open question is judged by who owns it
The doctor's examples lane reports `example-question-open` for every open question, a `domain` one included. A `domain` question is closed by a cited finding or by the operator's own answer. A `policy` or `business` question is closed only by a person's answer. A `business` question's message is byte-for-byte what it was before.

### A citation that leads nowhere stops the build
A `researched F<n>` example or question whose finding the research document does not hold exactly once, with a non-empty source line, is `example-research-unanchored`. The code is an error while the story is open, and `aof:continue`'s build door refuses the story on it.

### The probe and the door read the research document beside the map
With the examples gate on, the doctor's story row carries the cited research document's text as `extensions.examples.research`, and the build door reads the same document. Both locate it through one `researchDocOf`: the milestone's `RESEARCH.md` for a story under a milestone, and the story's own for a standalone story.

### A researched example is traced like an agreed one
A `researched` example that no scenario or Examples row carries inside its rule's group is `example-untraced`, and the message names the finding it cites.

### Off is still today
With `work.examples` absent or `enabled: false`, no research document is read, no `example-research-unanchored` is reported and no story is refused on one (FF-19202).
