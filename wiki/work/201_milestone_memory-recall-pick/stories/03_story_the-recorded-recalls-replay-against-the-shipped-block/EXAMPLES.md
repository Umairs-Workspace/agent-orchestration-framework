# 201/03 · The recorded recalls replay against the shipped block — example map
<!--
Drafted 2026-11-17 by the PO at refine's discovery beat. Grounding, measured the same day:
- The ledgers hold 320 recorded recalls: 167 verify-finding, 96 continue-developer, 30
  refine-architect, 25 refine-po, 2 shatter-po (a count of every `kind: "recall"` row under
  wiki/work).
- 177 graded with an opus judge over pooled records, 0/1/2, and checked the judge against a human
  on 40 labels (90%). It found the ledger's own verdicts agree with that judge 73% of the time,
  and says the ledger "is not usable as ranking ground truth without this correction"
  (wiki/work/177_spike_memory-retrieval-precision/SPIKE.md, "Ground truth").
- 177's harness was throwaway code and no longer exists.
- A probe on 2026-11-17 handed haiku four cards as titles only, and it picked all four
  (ARCHITECTURE "Measured facts"). A pick that runs is not yet a pick that picks well.
Q1 was answered by the operator on 2026-11-17: a model judge, over a seeded sample.
-->

## R1 · The replay runs each recorded block recall twice, as the lexical block and as the shipped block
- E1 · With 320 recalls on the ledgers, `node scripts/memory-recall-replay.mjs --sample 40 --seed 177` replays 40 of them, and the same 40 on every run with that seed [proposed]
- E2 · A recorded `verify-finding` recall with scope `{"kind":"finding"}` is replayed with that scope, and both of its blocks hold only findings [proposed]
- E3 · `--edge continue-developer` replays only that edge's recalls [proposed]
- E4 · A recorded `continue-episodic` recall is left out, because it asked for a whole history and was never a block [proposed]
- E5 · After a replay, the ledgers and the memory index are byte for byte what they were [proposed]

## R2 · The report shows, per edge and overall, what each block handed over
- E6 · For 40 replayed recalls the report gives, for the lexical block and for the shipped block, the records shown per recall and the number of empty blocks, and for the shipped block the number of degraded recalls [proposed]
- E7 · On a node where `claude` does not resolve, every recall is reported as degraded, and the report says no direction can be read from it [proposed]

## R3 · A model judge grades every record either block showed, and the report names the direction
- E8 · A replayed recall's lexical block shows 5 records and its shipped block shows 2 of those 5: the judge is asked once, about those 5 records, and grades each 0, 1 or 2 [stated Q1]
- E9 · Over a sample the lexical block averages 2.0 records graded 0 and 1.3 graded 2 per recall, and the shipped block 0.7 and 1.6: the report says `direction: holds` [stated Q1]
- E10 · Over a sample the shipped block averages 0.4 records graded 0 but 0.9 graded 2, against the lexical block's 1.3: the report says `direction: does not hold`, and names the decision-changing records as what fell [stated Q1]
- E11 · With the pick and the judge both set to `opus`, the script refuses before any call: no model grades its own pick [proposed]
- E12 · On this project's ledgers, `--sample 40 --seed 177` reports `direction: holds` [proposed]

## Questions
- Q1 · business · answered · How should a replayed block be graded, so that "the same improvement in direction" can be read off the report? Answer: a model judge, over a seeded sample (default 40 recalls). An opus judge grades each record either block showed, 0/1/2, as 177 did. The direction holds when the shipped block shows less noise per recall and no fewer decision-changing records.
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-007 · Which recalls are replayed? (Every recorded recall whose edge hands out a block. `continue-episodic` and `retrospective-evidence` ask with `--all` and are left out.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-007 · Is a replay repeatable? (In which recalls it replays, by its seed. Not in what the model picks or how the judge grades.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-007 · Where does the script live, and what may it write? (`scripts/`, as project tooling. It writes its report and nothing else.)
- Q5 · technical · defaulted ARCHITECTURE.md#ADR-004 · How does the judge reach a model? (Through the same one-shot call the pick uses, at the judge's own model. The default is `opus`.)
