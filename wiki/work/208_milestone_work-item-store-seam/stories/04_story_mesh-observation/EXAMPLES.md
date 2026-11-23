# 208/04 · Mesh refresh and publication observe the selected store — example map

## R1 · Projection refresh uses the workspace tracking source
- E1 · Given the projection says 11 is not-started and the selected store now says blocked, when the publisher refreshes after its token changes, the projected row for 11 says blocked and its source record is untouched [proposed]
- E2 · Given a watched workspace has a complete remembered snapshot and the safety interval has not expired, when the launcher performs another idle sweep, the workspace has the same digest and no additional full item walk [proposed]

## R2 · Observation works across change mechanisms and workspace lifetimes
- E3 · Given a test provider reports token A and later token B without an operating-system watcher, when the normal launcher refreshes the workspace, the changed row reaches the publication path [proposed]
- E4 · Given workspaces Orchard and Grove both have active observers, when the launcher retains only Grove, Orchard releases its handle and a later Grove change is still observed [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-003 · How should consumers recognize a change without inspecting files?
