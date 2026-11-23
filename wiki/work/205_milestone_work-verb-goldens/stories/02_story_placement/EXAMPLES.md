# 205/02 · Promotion and insertion preserve the complete stream delta — example map

## R1 · Promotion mints a tail number or opens the requested slot
- E1 · Promoting queued at the tail mints 31 and waiting now depends on the minted number [proposed]
- E2 · Promoting queued at 11 with confirmation shifts nine live items and leaves archived ref 30 in place [proposed]
- E3 · Promoting waiting before queued refuses with promote-depends-backlog and preserves the stream [proposed]

## R2 · All four insert verbs record their complete stream changes
- E4 · Inserting trial as a UAT at 11 with dependency 12 creates UAT 11 with dependency 13 [proposed]
- E5 · Inserting wash at 10/00 moves both existing stories and updates the milestone checklist [proposed]
- E6 · Inserting a chore at 11 without confirmation refuses the nine-item shift and leaves no new backlog leaf [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001 · How are shifts, scaffold cleanup and unrelated files compared?
