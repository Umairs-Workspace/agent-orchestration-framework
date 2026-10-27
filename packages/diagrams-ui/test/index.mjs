// THE @aof/diagrams-ui SUITES — this package's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// The editor's pure state (scene draft and review state), moved here from apps/ui's board suite
// with its subject when the editor became its own package.
import { sceneDraftTests, reviewStateTests, notesAndDraftsTests } from "./editor-state.suite.mjs";
// milestone 170 / ADR-012 — a proposal compiled into the stored scene, read back as the proposal.
import { compileTests } from "./compile.suite.mjs";
// milestone 171 / story 00 — Ask architect at the selection: the overlay's anchor and the one ask path.
import { canvasAnchorTests } from "./canvas-anchor.suite.mjs";
// milestone 171 / story 01 — Find in libraries: the filter, both roots, the panel's own insertion.
import { librarySearchTests } from "./library-search.suite.mjs";
// milestone 171 / story 02 — the editor follows the review stream; the poll is its fallback.
import { reviewStreamTests } from "./review-stream.suite.mjs";
// milestone 172 / story 01 — the conversation panel's one model: threads, their states and proposals,
// and 171/05's pins and replies, which it took over.
import { conversationModelTests } from "./conversation-model.suite.mjs";

export const tests = [
  ...sceneDraftTests,
  ...reviewStateTests,
  ...notesAndDraftsTests,
  ...compileTests,
  ...canvasAnchorTests,
  ...librarySearchTests,
  ...reviewStreamTests,
  ...conversationModelTests,
];
