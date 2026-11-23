# 208/03 · Promotion, insertion and moves preserve the work stream — example map

## R1 · Placement preserves number spaces and dependency targets
- E1 · Given queued is in the backlog and the highest archived number is 30, when the operator promotes queued, it becomes 31 and waiting now depends on 31 [proposed]
- E2 · Given the operator supplies 12 as the dependency of a new UAT, when the operator inserts trial at 11 with confirmation, trial occupies 11 and depends on the spike now at 13 [proposed]

## R2 · Archive and renumber preserve identity and evidence
- E3 · Given live chore 11 links to done chore 19, when the operator archives 19, 19 resolves in the archive, disappears from the live list and the link in 11 reaches the moved receipt [proposed]
- E4 · Given a verification attachment quotes the original 10/00, when the operator renumbers milestone 10 to 22, 22/00 resolves, live citations follow the move and the attachment still quotes 10/00 [proposed]

## R3 · Other managed-item writers preserve existing identities
- E5 · Given a fresh orchard stream ends at archived 30, when the operator starts a new prototype with the slug fruit-crate, the new item is active at 31, its intent document is readable and no existing item moves [proposed]
- E6 · Given every managed record is at the current schema and the stream validates, when the operator applies the existing upgrade twice, both runs leave all record bytes and identities unchanged [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · Where should a multi-item move coordinate references and document homes?
