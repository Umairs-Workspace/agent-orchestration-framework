# 201/02 · Every recall leaves a record, and the PO asks by title — example map
<!--
Drafted 2026-11-17 by the PO at refine's discovery beat. Grounding, measured the same day:
- Refine's PO recall is scoped `--item <ref>` (packages/core/assets/commands/refine.md:169-170,
  :186). 177 measured it empty on 12 of 14 recalls.
- The retrospective runs two recalls and says of the second that it "records no recall
  observation" (packages/core/assets/commands/retrospective.md:31, :42, :56-57).
- A prompt edit lands in the command, the Codex variant, the manifest, three renders and the lock
  (commit b3cc77a7).
The rules are the SPEC's fourth and fifth scope bullets and ADR-006. No person was asked, so every
example is proposed.
-->

## R1 · The PO's refine recall asks by the item's title, with no item filter
- E1 · Refining milestone 201, the PO runs `aof memory recall "Recall hands an agent what applies — the lexical ranker shortlists 20, a model picks at most 5, and the block ends empty when nothing applies" --block`, with no `--item` and no `--area` [proposed]
- E2 · The PO's observation for that recall has edge `refine-po`, the title as its query and `{}` as its scope [proposed]
- E3 · The architect's recall in the same refine keeps `--area architecture` and its scope `{"area":"architecture"}` [proposed]

## R2 · The retrospective records both of its recalls, on the item it is written for
- E4 · A retrospective for item 157 whose domain recall returned 4 lessons and whose evidence recall returned 34 records appends two rows to 157's ledger: `retrospective-domain` with scope `{}` and 4 verdicts, and `retrospective-evidence` with scope `{"item":"157","area":"delivery"}` and 34 verdicts [proposed]
- E5 · A retrospective that finds no lesson and writes no document still appends both rows [proposed]
- E6 · With memory off both recalls return nothing, and both rows are appended with `"records": []` [proposed]

## R3 · Every runtime's command says the same thing
- E7 · After `aof work update`, the Claude, Codex and opencode refine commands all carry the title recall, and none carries `--item <ref> --block` [proposed]
- E8 · The same three retrospective commands all carry both captures, and none says the evidence step records no observation [proposed]
- E9 · The continue, verify and shatter commands render byte for byte as they did before this story [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-006 · What are the retrospective's edges called, and who is the actor? (`retrospective-domain` and `retrospective-evidence`; the actor is `product-owner`.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-006 · What does a verdict mean for a retrospective's evidence? (`honoured`: a lesson cites the record. `irrelevant`: it carried no lesson.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-006 · When are the two rows submitted? (After the lessons are written and before the ingest, once each, on the item the retrospective is for.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-006 · Does the ledger row gain a field saying the block was picked? (No. The row keeps 153's shape.)
