# 153/04 · Workflow edges close their memory observations — Outcome

## Delivered

### Captured decision-recall edges
Four edges submit one `record-recall` observation each, with their own edge, actor and scope: shatter (`shatter-po`, owned by the first driver, never replayed per driver), refine architect and PO (`refine-architect`, `refine-po`), and continue (`continue-developer`, near-miss scope). The Claude, Codex and OpenCode procedures do this, and an empty recall is still submitted with `records: []`. FF-15303 holds the roster at exactly these four edges, with render parity.

### Retrospective records recurrence and promotion
The retrospective procedure writes the `promotionFrom` watermark first. For each new lesson it runs `memory recurrence` before writing, stamps `Recurs` only on a qualifying match, gives every new lesson an honest `Promoted to`, writes no document for a clean pass, and ingests only after authoring.
