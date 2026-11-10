# 153/01 · Recalls have complete verdict records — example map

## R1 · A completed recall has one verdict for each distinct returned identity
- E1 · An architect recalls 45/R13 and 68/R10 and submits honoured and departed: one recall row retains both identities and verdicts [proposed]
- E2 · A PO recalls no records with memory off: the completed observation still appends one row with an empty records array [proposed]
- E3 · A submitted record has no verdict: the entire observation is refused and ledger bytes stay unchanged [proposed]

## R2 · Retrying the same observation cannot duplicate or silently change it
- E4 · Two submissions of recall id c1 with the same payload leave exactly one row [proposed]
- E5 · A second c1 changes honoured to irrelevant: it is refused without replacing the first row [proposed]

## R3 · Recall evidence does not change raw feedback semantics
- E6 · A ledger with 2 raw, 1 classification and 3 recall rows still contributes 2 raw feedback records to counters [proposed]
- E7 · The retired brief verb is refused before any backend call while recall JSON remains a records array [proposed]

## Questions

<!-- No unresolved question. Examples remain proposed, not human-confirmed. -->
