# 208/00 · A workspace selects the file store and exposes its tracking data — example map

## R1 · Workspace configuration selects a tracking provider
- E1 · Given an existing orchard workspace with no work.store setting, when the operator lists its items, the file provider answers and the listing equals that of the same workspace configured with files [proposed]
- E2 · Given an orchard workspace with work.store set to typo, when the operator requests its first tracking operation, the request fails naming work.store, typo and files before any record changes [proposed]

## R2 · A snapshot exposes item facts independently of folder parsing
- E3 · Given the orchard seed with pack at 10/01 depending on sibling 00, when a client requests the story from the selected store, its title is pack, parent is 10, number is 01 and its recorded dependency remains 00 [proposed]
- E4 · Given an injected store returns an item titled Pear from a workspace without tracking files, when a client reads its logical identity and metadata, the answer comes from the injected store and no tracking directory is opened [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001 · Which setting selects a provider for one workspace?
