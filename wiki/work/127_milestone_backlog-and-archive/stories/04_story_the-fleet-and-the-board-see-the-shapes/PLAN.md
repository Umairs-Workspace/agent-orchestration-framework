# Build brief — 04 · The fleet and the board see the shapes

Advisory, the builder's own. The task features are the contract; this is the shape of the change.

## The mechanism

Two thin carriers and one partition. The store's row mapper copies the two new row fields through
unchanged, so a synced view is byte-for-byte what `listItems` produced on the owning node and
`findWork` over the view resolves a slug or an archived number with no new branch. The board API's
list route gains one query parameter, default excluded, and passes it to the listing. In the UI the
derivation partitions backlog rows out FIRST (`number === null`) and hands them to a new overview
section; archived rows are dropped unless the toggle is on, and when shown carry the one new mark
DESIGN.md defines. The chips count what is rendered; the archived subset states its own chip.

Build against a fixture view carrying all three row kinds — this story does not need 02 or 03 to
exist, only 01's shapes.

## The verification step

The store suite round-trips a backlog and an archived row through publish and read; the API suite
shows the default list excludes archived and the parameter includes them; the UI suite renders the
fixture and asserts DESIGN.md's checklists region by region (backlog section present and
subordinate, no backlog milestone painted as a card, toggle off hides, toggle on marks). The
design-conformance review at verify judges the two surfaces against the checklists at 1280 / 768 /
390.

## Out of scope

Promoting from the board (read-only by design); any new design token; the verbs (02, 03).
