# 02 · The opt-out seam — Outcome

## Delivered

### One capability read
`aof diagram capability` and `GET /api/diagram/capability` answer `{ enabled, editor, generator }` through the one reader of `work.diagrams`, and the editor follows the generator switch.

### The opt-out holds at every door
With diagrams off, the board shows no Edit draft and fetches none of the editor. Every write action of `diagram:scene` refuses with `diagram-disabled`. A directly opened `/diagram` imports no editor and says the project's diagrams are off, or, on a server that does not serve them (the fleet), points to the project's board.
