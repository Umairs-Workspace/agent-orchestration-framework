---
doc: research
---
# 209 · Evidence for the first board adapter

## What spike 206 established

| Question | Observed result | Consequence for the build |
|---|---|---|
| Can the adapter list the entire stream? | At 2,505 items the CLI returned at most 1,000. WIQL for IDs, 13 batched detail reads and a separate link query covered the stream. | Use HTTP and fetch every page and relation. Include a fixture larger than the CLI cap. |
| Can AOF detect a stale write? | A JSON Patch test of the work-item revision returned HTTP 412 after a competing write. The failed patch changed nothing. Even a rejected multi-item batch had already created one item. | Guard each affected item and reconcile individual results, including a lost reply after creation. |
| What does polling cost? | An idle reporting-revisions poll took 0.17 s. A change became visible within 0.2–0.5 s in the spike. | Use a five-second poll and retain its continuation token. Treat those timings as observations from one project. |
| How does a daemon authenticate? | On macOS, token minting worked with the daemon user's home and PATH. Raw HTTP for a personal Microsoft account also needed the pass-through header. | Mint through `az account get-access-token` in the node's own environment. Exercise the subsequent board read too. |
| Can Azure enforce AOF's lifecycle? | Azure accepted moves that AOF disallows. The spike created a custom type and a Blocked state in an inherited Agile process. | Validate the selected project's actual type/state and field mappings before use. Keep transition rules in AOF. |

Measurements and residual questions come from [spike 206](../206_spike_azure-devops-work-items/SPIKE.md).

The reporting API can include deletions and historical revisions. A saved feed token identifies a position in the feed. An individual item's revision guards its patch. They serve different purposes. [Microsoft reporting revisions API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/reporting-work-item-revisions/read-reporting-revisions-get?view=azure-devops-rest-7.1)

Attachment creation returns an attachment ID and URL. Successful upload alone cannot establish that the intended item carries the attachment. Verify the item link before acknowledging the copy. [Microsoft attachment API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/attachments/create?view=azure-devops-rest-7.1)

## Evidence still owed

Use recorded HTTP through the public CLI for repeatable checks. Reserve the live check for an operator-designated project on the inherited process. Record the platform, CLI version, process, work-item IDs, revisions and observed result, including a custom-type round trip. Keep credentials and raw authorization headers out of evidence.

Spike 206 did not test Windows or WSL daemon credentials, unattended token expiry, Entra header requirements, real throttling, server-side transition rules or a project switched onto the custom process. Record which of these a live run actually exercises. One machine's result supports a claim about that machine.
