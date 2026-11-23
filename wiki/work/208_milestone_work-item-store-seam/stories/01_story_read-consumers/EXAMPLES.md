# 208/01 · Readers retain the same answers and source attribution — example map

## R1 · Public reads preserve identity, order and diagnostics
- E1 · Given archived chore 30 and live chore 11 depending on it, when the operator lists the stream and finds 30, the default listing omits 30, the all-items listing includes it and find resolves its archived identity [proposed]
- E2 · Given story 10/01 depends on the unfinished sibling 00, when the operator asks what is next for 10/01, the JSON reply reports blocked and waits on 10/00 [proposed]

## R2 · Local and projected records keep their provenance
- E3 · Given the local record for 11 is blocked and its earlier projection says not-started, when the operator reads 11, the local status wins with the existing local provenance and no file is overwritten [proposed]
- E4 · Given the cache reports a story from another node with no local checkout, when the operator lists the workspace, the remote row appears with its existing reporting provenance and the reader does not invent a directory [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-003 · Where should local tracking and projected answers be combined?
