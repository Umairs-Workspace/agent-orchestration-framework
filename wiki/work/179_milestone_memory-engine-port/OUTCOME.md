# 179 · One knowledge engine behind both memory faces — Outcome

## Delivered

### One engine seam behind both memory faces
`aof memory` (with its `aof work memory` alias), `aof graph build`, `aof graph impact` and the three code-graph readers reach the work records and the code graph only through the one knowledge-engine port (m179/01/the-knowledge-engine-port), so the code graph has one reader (m179/04/the-code-graph-has-one-reader) and every face answers as it did before the port (m179/02/graph-impact-is-relations-paths, m179/03/aof-memory-dispatches-through-the-port).

### A second engine plugs in as one declaring module
A later engine joins aof by exporting `corpora` and the methods it declares (m179/01/the-capability-declaration), and a corpus it does not serve is reported as `corpus-unserved` rather than answered by whichever backend is present (m179/01/the-corpus-unserved-miss).

## Assumptions

- **graphify is the only engine** — no second backend exists, so the port's routing and miss are proven against stub backends and graphify alone.
- **The graphify memory backend is still present** — it rides `ingest("code")` for its `.aof/memory-graph/` build and is FF-17904's named exception until `retire-graphify-memory-backend` deletes it.

## Gaps

### No corpus is selectable from a face
- **Status:** open-by-decision
- **Discharge condition:** an item such as `memory-config-node` gives a face a `--corpus` flag or config key that names a corpus.
No face asks the port for a corpus by name, so `corpus-unserved` is reachable only through the port itself.
