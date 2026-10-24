// THE @aof/diagrams-ui SUITES — this package's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// The editor's pure state (scene draft and review state), moved here from apps/ui's board suite
// with its subject when the editor became its own package.
import { sceneDraftTests, reviewStateTests, notesAndDraftsTests } from "./editor-state.suite.mjs";
// milestone 200 / ADR-012 — a proposal compiled into the stored scene, read back as the proposal.
import { compileTests } from "./compile.suite.mjs";

export const tests = [
  ...sceneDraftTests,
  ...reviewStateTests,
  ...notesAndDraftsTests,
  ...compileTests,
];
