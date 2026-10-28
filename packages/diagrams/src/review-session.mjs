// THE ARCHITECT'S REVIEW VOCABULARY (milestone 172 / ADR-002 §2) — its one home (FF-17202).
//
// What the architect's session is typed and which tools it may use, spelled once. The scene
// command's `session` action answers both to the board, which hands them to the headless
// conversation; the editor's copy-the-command fallback imports the same invocation. The tool list
// is the `diagram-review` command's own needs and nothing wider: it reads the design, writes its
// temp input files, and runs the scene command — every other tool is denied in the turn.
//
// Pure: no I/O, so the browser half (@aof/diagrams-ui) imports it as the node half does.

export const REVIEW_SESSION_TOOLS = Object.freeze(["Read", "Grep", "Glob", "Write", "Bash(aof diagram scene:*)"]);

// The slash command that asks the architect to review one recorded request, or — with no request id —
// every open note on the diagram (the batch form, 170/06).
export function reviewInvocation(ref, file, requestId) {
  return requestId ? `/aof:diagram-review ${ref} ${file} ${requestId}` : `/aof:diagram-review ${ref} ${file}`;
}
