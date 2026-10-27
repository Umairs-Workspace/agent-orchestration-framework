// milestone 172 / story 00 (ADR-002 §2) — the architect's review vocabulary, spelled once: the
// invocation the session is typed and the tools it may use. The `session` action that answers them
// is driven in test/diagrams/diagram-scene-review.test.mjs; the one-home rule is FF-17202's.
import assert from "node:assert/strict";
import { REVIEW_SESSION_TOOLS, reviewInvocation } from "@aof/diagrams/review-session";
import { diagramReviewInvocation } from "@aof/diagrams-ui/editor-state";

export const reviewSessionTests = [
  { name: "172/00 task02 · a request id is the single review invocation, and none is the batch review", run: () => {
    assert.equal(reviewInvocation("171", "ADR-003-push-stream.excalidraw", "a1b2c3d4"), "/aof:diagram-review 171 ADR-003-push-stream.excalidraw a1b2c3d4");
    assert.equal(reviewInvocation("171", "ADR-003-push-stream.excalidraw"), "/aof:diagram-review 171 ADR-003-push-stream.excalidraw");
    assert.equal(reviewInvocation("171", "ADR-003-push-stream.excalidraw", null), "/aof:diagram-review 171 ADR-003-push-stream.excalidraw");
  } },
  { name: "172/00 task02 · the session's tools are the review command's own needs, and frozen", run: () => {
    assert.deepEqual([...REVIEW_SESSION_TOOLS], ["Read", "Grep", "Glob", "Write", "Bash(aof diagram scene:*)"]);
    assert.ok(Object.isFrozen(REVIEW_SESSION_TOOLS));
  } },
  { name: "172/00 task02 · the editor's copy-the-command fallback is the same invocation", run: () => {
    assert.equal(diagramReviewInvocation, reviewInvocation, "editor-state imports it rather than spelling it");
  } },
];
