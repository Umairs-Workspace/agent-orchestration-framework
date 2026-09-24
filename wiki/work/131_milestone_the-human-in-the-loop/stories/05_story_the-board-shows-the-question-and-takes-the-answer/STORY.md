---
type: story
number: 05
slug: the-board-shows-the-question-and-takes-the-answer
title: "The board shows the question and takes the answer — work:list rows carry an ask fact for a local lane too, the amber AskCard shows the verbatim ask with phase and elapsed wait and a free-text reply box onto the one route, with no default answer"
parent: 131
depends: [1, 2, 4]
status: in-progress
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-003, ADR-006]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/DESIGN.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - src/loop/ask-request.mjs
  - src/notify/form.mjs
  - src/notify/form.d.mts
  - src/board-mesh-execution.mjs
  - src/board-ui.mjs
  - src/cache-read.mjs
  - src/workspace-identity.mjs
  - src/assignment-record.mjs
  - src/global-work-store.mjs
  - src/degrade.mjs
  - src/work/read.mjs
  - src/commands/list.mjs
  - ui/src/board/action.mjs
  - ui/src/board/action.d.mts
  - ui/src/board/api.ts
  - ui/src/board/DetailPanel.tsx
  - ui/src/board/Board.tsx
  - ui/src/board/ActionsStrip.tsx
  - ui/src/board/Markdown.tsx
  - ui/tsconfig.app.json
  - ui/vite.config.ts
  - test/ui/board-mesh-execution.test.mjs
  - test/ui/board-action.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/testing/acd-ui-directory-budget.test.mjs
  - test/arch/testing/acd-ui-surface-file-budget.test.mjs
  - test/arch/audit/acd-no-new-silent-catch.test.mjs
  - wiki/work/131_milestone_the-human-in-the-loop/stories/01_story_the-question-is-read-and-recorded/tasks/02_the-ask-file-lives-in-the-aof-home.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/02_story_the-notifier-and-its-channels/tasks/01_one-form-for-every-face.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/04_story_the-answer-reaches-the-session/tasks/00_one-verb-answers-the-waiting-ask.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/04_story_the-answer-reaches-the-session/tasks/01_the-board-answers-through-the-same-verb.feature
  - wiki/work/131_milestone_the-human-in-the-loop/stories/04_story_the-answer-reaches-the-session/tasks/03_a-workers-ask-takes-the-answer-through-terminal-resume.feature
files:
  - src/commands/list.mjs
  - ui/src/board/AskCard.tsx
  - ui/src/board/action.mjs
  - ui/src/board/action.d.mts
  - ui/src/board/api.ts
  - ui/src/board/DetailPanel.tsx
  - test/ui/board-mesh-execution.test.mjs
  - test/ui/board-action.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/testing/acd-ui-directory-budget.test.mjs
  - wiki/work/131_milestone_the-human-in-the-loop/VERIFICATION.md
  - wiki/work/131_milestone_the-human-in-the-loop/stories/05_story_the-board-shows-the-question-and-takes-the-answer/evidence/
schema: 1
aofVersion: 0.1.0
---
# 05 · The board shows the question and takes the answer

## User story

As **the operator looking at the board when a session is waiting on me**,
I want **the item's detail panel to show the waiting ask — verbatim, as plain text, with the phase it asked from and how long it has waited — and a free-text reply box (no Continue/Approve button, no prefilled text, no Enter-to-send) that sends my answer through `POST /api/work/answer`, keeps my text on a refusal and names what happened, and resumes a parked lane the same way**,
so that **I can answer from the board as well as the terminal, a local lane's ask is visible at all (today it shows nothing), and the answer I give is a recorded decision rather than a one-click nudge**.

What lands (ADR-006 §2, §4-§5; DESIGN §2): `applyAskOverlay` on `work:list` rows with `mesh: true` (the CLI's `--json` byte-identical); `ui/src/board/AskCard.tsx` with its logic (`askCardState`) in `action.mjs`, `workApi.answer` in `api.ts`, the header button's relabel (`Open terminal — <node>`) in `action.mjs`, and the mount in `DetailPanel.tsx`; the question never rendered through `Markdown.tsx`; `53/FF-5307`'s `ui/` digest re-pinned; the `ui/src/board` row 24 → 25 with its reason.

## Tasks

- [ ] `00_the-list-row-carries-the-ask` — `applyAskOverlay` in `list.mjs`: the thirteen-key fact (`scope` added), local and mesh asks, the CLI byte-identical
- [ ] `01_the-card-decides-in-one-pure-function` — `askCardState` and the relabel in `action.mjs`, words from `form.mjs`
- [ ] `02_the-card-is-mounted-and-sends-through-one-client` — `AskCard.tsx`, `workApi.answer`, `WorkItem.ask`, the two-line mount, no fast path
- [ ] `03_the-board-row-and-the-ui-pin-move-with-their-reasons` — `board` 24 → 25 and `53/FF-5307`'s `ui/` re-pin
- [ ] `04_the-card-renders-to-its-checklist` (`@manual`) — the card rendered in Chromium at both frames, judged by the designer, answered end to end

## Notes

- `DetailPanel.tsx` sits at 995 of its 1,000-line ceiling — the card is its own module; the panel gains only the mount.
- Amber is border, tint and dot only, never text (contrast; DESIGN).
