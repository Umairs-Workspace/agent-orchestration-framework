# Build brief — 04 · The fleet and the board see the shapes

Advisory, the builder's own. The task features are the contract; this is the shape of the change.

## The mechanism

Three carriers and two partitions. The STORE carrier: the disk projection copies the enumerator's
two new facts onto the row it builds (only where the row has them), two new columns hold them
(schema v9, the same in-place ALTER v8 used), the upsert maps the boolean at the bind and the
read maps it back — after that the frame doors and the fleet payload carry them with no code of
their own. The SEAM carrier: the cache-first read's rebuild of a cache-only row stops deriving
`number` from the ref's shape and reads the store's fact instead; when the disk holds the folder,
location stays the disk's (status and title are still the only overlay). The FACE carrier: one
query parameter on the list route, threaded to the flag `work:list` already has.

In the UI the derivation partitions `number === null` rows out FIRST and hands them to the new
overview region; the toggle is a `useState` that flips the parameter on the next request and
commits only when the response lands (in flight: disabled + busy, list unchanged; failure: no
commit, the existing toast). One pill component, painted in six contexts; one chip; one legend
row. The fleet's milestone list gets the same partition and nothing visible.

Build against the face fixture's two new stream members — this story does not need 02 or 03 to
exist, only 01's shapes on disk. The store and UI suite directories are both at their ceilings: extend the
two existing store suites; the ONE new UI suite raises the UI directory's row with a stated why.

## The verification step

The store suite round-trips a backlog and an archived row through publish, frame and read, and
migrates a hand-built v8 store; the seam suite drives every cache-first reader over a disk that
lacks the item and the CLI agrees row for row; the API suite shows the default list excludes and
the parameter includes; the UI suite mounts the real `<Board/>` and reads DESIGN's two checklists
region by region — backlog section present and subordinate, no backlog milestone as a card, toggle
off hides, toggle on marks in every context, chip even at zero, failure reverts. Run the four as
focused suites (the runner's `--only` selection) plus `fleet-scope`, `board-face-contract` and
the three `cache-read-*` suites for the frozen-shape pins; `tsc -b` in `ui/`. The
design-conformance review at verify judges the two surfaces at 1280 / 768 / 390.

## Out of scope

Promoting from the board (read-only by design); a fleet backlog region or a fleet pill (no
design baseline — partition only); any new design token; the verbs (02, 03); the real tree (05).
