---
doc: retrospective
promotionFrom: 1
---
# 00 · The architect answers in a headless session — retrospective

## R1 · The codex variant is a second source of the bundle prose, and refine missed it

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** FF-7106 named two tracked renders missing from `files:`, and the build wrote three
more files nobody declared. One of them, `packages/core/assets/variants/codex/workflow.md`, is a
fourth copy of the diagram-review prose: the source the codex skill renders from.

**Why:** Refine listed the command's tracked renders and took them for its only copies; the codex
variant is a source of its own, not a render.

**Lesson:** When a story changes bundle prose, list its sources (`src/bundle` and every
`assets/variants/*`) as well as its renders, and declare the derived manifest and lock with them.

**Refs:** STATE `## Feedback (for retro)` (172/00 close); FF-7106.

## R2 · Prose conditioned on "in a conversation" could not be read by the model it was written for

**Kind:** near-miss · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The first draft of the diagram-review paragraph applied only "in a conversation".
A session cannot tell that it is in one, because the invocation is identical, and the real run answered
with `respond` first and then wrote a different summary. The paragraph is now unconditional.

**Why:** The condition was written from the system's view of the session, which the model inside it
does not share.

**Lesson:** A command's prose may branch only on what the model can observe in its own turn; test it
against a real session before review closes (m171/R1), which is what caught this one.

**Refs:** 172/00 task 03; VERIFICATION `### 172/00 task 03`.

## R3 · A new module that spawns a process reddened four controls the lane never ran

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** verifier · **Recurs:** 172/R1 · **Promoted to:** none

**What happened:** `conversation-session.mjs` and `review-session.mjs` were found red at verify, in
controls outside the story's `files:`. The findings: an execution-kernel platform API and an
unaudited `taskkill` (F-172-03), a second home for a slash command (F-172-02), +2 modules on
`aof work find` (F-172-04), stale descriptor goldens (F-172-05), and the board's write census
(F-172-12).

**Why:** The story declared the suites it wrote, not the controls that census what it added: the
kernel's table, the runtime audit, the find ceiling and the command inventory.

**Lesson:** A new module in `@aof/execution` or a new `diagram:scene` action owes, on day one, the
kernel table, `scripts/workspace-runtime-audit.json`, the find-ceiling control and the command
inventory golden; grep `test/arch` for the package before the lane closes.

**Refs:** VERIFICATION `@finding-F-172-02` to `@finding-F-172-05`, `@finding-F-172-12`; 172/R1.
