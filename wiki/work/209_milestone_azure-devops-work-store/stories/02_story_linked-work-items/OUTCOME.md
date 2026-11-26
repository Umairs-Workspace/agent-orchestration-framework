# 02 · An operator can publish and continue working in the local folder — Outcome

## Delivered

### Completing refinement publishes the item to the selected board
`aof work publish-board <ref> --refinement-complete [--descendants]` runs when refinement closes successfully. Unfinished refinement, local file mode and ordinary promotion create no board item.

### Each local item is linked to one verified board ID
A per-project journal records the association, and the item's folder carries an `.aof-board-key`. Publication completes only after readback. A lost create response is recovered once by its correlation key, concurrent processes issue a single create, and a partially accepted plan resumes at the outstanding member.

### The local folder stays the document home
Status moves are guarded writes on the board and leave the document body unchanged. Insert, renumber and move preserve each linked item's board ID and rank. A completed board-backed item stays in place, and `archive` in board mode is refused with `work-board-archive-local-only`.

### Artifact copies are optional, verified uploads
An eligible repository file is copied by content, producing one verified link for that content. A copy stays pending until its item relation is verified. A board without attachment support still tracks the item.
