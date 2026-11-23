# 205/03 · Archive, status and renumber preserve mutations and refusals — example map

## R1 · Archiving preserves item identity and the links that cross its move
- E1 · Archiving done chore 19 moves its documents and the relative link to its archive location without changing its number [proposed]
- E2 · Bulk archive with confirmation moves done prototype 17 and done chore 19 together [proposed]
- E3 · Archiving 13 refuses with archive-not-done and leaves the stream intact [proposed]

## R2 · Status moves follow the lifecycle of the requested item
- E4 · Moving chore 11 from not-started to in-progress changes its recorded status [proposed]
- E5 · Moving prototype 16 from paused to active succeeds [proposed]
- E6 · Moving chore 11 straight to done refuses with status-edge-not-applicable [proposed]

## R3 · Renumbering preserves the observed changes in each number space
- E7 · Renumbering milestone 10 to 22 moves the parent and both child refs while retaining their statuses [proposed]
- E8 · Renumbering 10/00 to 10/03 leaves the bare dependency [00] in the sibling record [proposed]
- E9 · Renumbering 10 to occupied 11 refuses with renumber-target-occupied [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-002 · How is the observed bare dependency after a nested renumber treated?
