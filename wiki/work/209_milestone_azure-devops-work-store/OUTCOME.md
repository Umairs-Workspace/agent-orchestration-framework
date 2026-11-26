# 209 · A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files — Outcome

## Delivered

### `WorkItemStore` has a second production implementation: a board the project defines
With `work.store.manifest` set, the work verbs, the loop and dispatch track items on a board described by a YAML definition and an adapter under the project's own `.aof/`. AOF holds the schema, the validation and the shared execution, and no provider code (FF-20901). Azure DevOps is the shipped example, and a second board runs through the same entry point unchanged (m209/00, m209/01, m209/05).

### In board mode AOF writes the tracked values, and the repository stays the document home
Board items are created when refinement completes. Each local folder keeps its documents and its link to one verified board ID through completion. A tracked edit by anyone else stops the workflow until an operator resyncs from AOF to the board, and archiving remains a local file mode operation (m209/02, m209/03).

### Board mode is proven against recorded and live boards
The 150 accepted 205 captures pass over the recorded Azure board and the alternate board, as over files. A real Azure DevOps project ran publish, status, a stale write refused by Azure with 412, conflict and resync (m209/05).

## Assumptions

- **An MSA-backed Azure organization** — the live run used a Microsoft-account organization with `X-VSS-ForceMsaPassThrough`. An Entra-backed organization was not exercised.
- **A daemon node with its own `az login`** — each node signs in for itself, and `aof work board-access` checks that in the daemon's environment (m209/04).

## Gaps

### Board mode on Windows and WSL nodes, and under sustained daemon use
- **Status:** open
- **Discharge condition:** a board-backed workspace passes `board-access` and a publish–status–resync run on the Windows control node and the WSL worker, and a daemon keeps its board access past `az`'s refresh-token lifetime.
Spike 206 left `az` on Windows and WSL, refresh-token expiry, throttling and a current `az` unmeasured, and the live run measured none of them.

### ADR-003's diagram
- **Status:** open
- **Discharge condition:** `aof:add-diagram 209 ADR-003` draws it once the configured diagram generator is available in this checkout.
ARCHITECTURE.md carries ADR-003's diagram brief but no picture. Refinement recorded `diagram-generator-missing`.
