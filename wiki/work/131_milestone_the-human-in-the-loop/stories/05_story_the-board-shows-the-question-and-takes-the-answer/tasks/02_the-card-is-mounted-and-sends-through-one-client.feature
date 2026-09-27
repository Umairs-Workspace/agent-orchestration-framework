@executable @ui @work @board
Feature: the card is its own module, mounted first in the panel's body, and sends the operator's words through one client onto the one route

  ADR-006 §4; DESIGN §1. `ui/src/board/AskCard.tsx` is the one new file. It renders
  `askCardState`'s answer (task 01) and holds only the card's local state — the textarea's text,
  the send phase, the error, the sent document and the expanded flag — so every word it shows is
  one task 01 already proved. `workApi.answer({ ref, text, actor })` in `ui/src/board/api.ts`
  POSTs `/api/work/answer` (04's route) as `resync` does, and throws `codedError` so the card
  shapes its sentence from the code. `WorkItem` gains `ask?`, the thirteen-key fact (task 00).
  `DetailPanel.tsx` gains two lines: the import, and `<AskCard …/>` as the body scroll region's
  first child, above `<DocBody>`, on every tab. The question is plain text and never reaches
  `Markdown.tsx`, which renders unsanitised HTML and trusts only local doc files: a session's last
  message is model output that may echo a hostile repo's text.

  RULINGS (PO, 2026-09-23).
  (1) The card keys on `item.ask` and never reads `item.execution`. It renders nothing when
  `askCardState` answers `null`, so a panel with no ask is byte-identical to today's.
  (2) The component is remounted per ask: its React `key` is `${ask.runId}:${ask.askedAt}` (a
  worker's ask, `runId: null`, keys on its `askedAt`), so a NEW question after a resumed session
  asks again never inherits the last answer's text or receipt.
  (3) The textarea is controlled, empty on mount, and carries no `placeholder`, no `defaultValue`
  and no `onKeyDown` — Enter is a newline and nothing sends on a key. There is ONE `<button>` that
  sends, plus the `Show the full question` text toggle, which is a `<button type="button">` too;
  "one button" in ADR-006 §4 counts the SEND affordance, and this ruling states the count as two
  `<button` elements, of which one calls `workApi.answer`. No chip, badge, quick reply or
  template exists.
  (4) Sending: phase `sending`, then on resolve `sent` = the document, on reject phase `error` with
  `{ code, message }` from the thrown `codedError`. The text is never cleared by an error. The
  actor is the board's existing `actor` prop, the same one `ActionsStrip` sends with feedback.
  (5) The message slot is always present with `aria-live="polite"`. Amber is border, tint and
  dot only: no `text-amber-*` class appears in the card.
  (6) `DetailPanel.tsx` stays at or under its 1,000-line ceiling (`acd-ui-surface-file-budget`):
  at 995 it takes exactly the two lines. The header's `Answer on` wording lives only in
  `action.mjs` (task 01), so the panel needs no other edit.

  RULINGS (QA, 2026-09-23).
  (1) The send `<button>` is `type="button"` too, and the card holds no `<form`: nothing can
  submit implicitly. For the PO to ratify.
  (2) "No fast path" is read in the source, so each fact is one textual check over
  `AskCard.tsx`, comments stripped; a word the card shows is `askCardState`'s, never a literal.

  RULINGS (developer, 2026-09-23).
  (7) Feasible with two scenarios amended. The source cases join `test/ui/board-action.test.mjs`,
  which reads the three sources as text: no new suite, no `test/ui/index.mjs` edit.
  (8) "Compared with its base" has no stable base in a suite: a lane's merge-base moves, and the
  next story to edit the panel would red it. The executable scenario now reads HEAD. The base
  diff, 2 added lines and 0 removed, moved to task 04 as an accept-time `@manual` check, since a
  scenario here inherits `@executable`.
  (9) Measured: `DetailPanel.tsx` is 995 lines by `wc -l` and 996 by the budget's own
  `split(/\r?\n/)`, so two lines make 998 of 1,000. The mount is one line carrying `key`, `item`,
  `actor` and `now`, all three props the panel already holds. No formatter is enforced.
  (10) `npm run ui:build` is `scripts/ui-build.mjs`, which runs `tsc -b` and then `vite build` in
  `ui/`. The suite runs only the type pass, as `board-api.test.mjs`'s `tsc -b` case does, because
  `vite build` rewrites `ui/dist`, which a running `aof work ui` serves. The last scenario is
  amended to `tsc -b`. The full build's exit 0 is PLAN's verification step, in `VERIFICATION.md`.
  (11) PO 2's key is stable for a local ask, since `openAsk` writes `askedAt` once. A worker's
  `askedAt` is the assignment row's `updated_at`, and `transitionAssignmentState` rewrites it on
  every applied `running` frame, with no same-state skip. A re-sent frame would remount the card
  and drop the typed text. Proposed: a `runId: null` ask keys on `mesh:<sessionId>`. A new ask
  after a resume is a new mount anyway, because the row turns `resumed` and the ask leaves the
  wire. For the PO to ratify.

  RULINGS (PO, ratifying, 2026-09-23). QA (1)–(2) and developer (7)–(11) RATIFIED. (11) AMENDS PO
  ruling (2): a worker ask (`runId: null`) keys on `mesh:<sessionId>`; a local ask keeps
  `${runId}:${askedAt}`.

  Background:
    Given the source of `ui/src/board/AskCard.tsx`, `ui/src/board/DetailPanel.tsx` and `ui/src/board/api.ts`, comments stripped

  Scenario: the panel holds exactly the import and the mount, first in its body
    When `DetailPanel.tsx` is read
    Then it holds exactly one `import { AskCard } from "./AskCard"` line and exactly one `<AskCard` element, on one line
    And that element is the line directly after the `min-h-0 flex-1 overflow-y-auto p-4` body region's opening tag and directly before `<DocBody`, so no tab conditional encloses it
    And `acd-ui-surface-file-budget` reads the file at most 1,000 lines

  Scenario: the card reads the ask fact and the pure state, and nothing else decides a word
    When `AskCard.tsx` is read
    Then it imports `askCardState` from `./action.mjs` and `workApi` from `./api`, reads `item.ask`, and never reads `.execution`
    And it imports nothing from `./Markdown`, renders no `dangerouslySetInnerHTML`, and renders the question inside an element classed `whitespace-pre-wrap`

  Scenario Outline: the reply has no fast path
    When `AskCard.tsx` is read
    Then <fact>

    Examples:
      | fact |
      | no element carries a `placeholder` attribute |
      | nothing sets `defaultValue`, and the text state is initialised `""` and set only from the textarea's `onChange` |
      | no element carries `onKeyDown`, `onKeyUp` or `onKeyPress`, and nothing calls `addEventListener` |
      | there is no `<form` element and no `onSubmit` |
      | it holds exactly two `<button` elements, both `type="button"`, and exactly one `onClick` path reaches `workApi.answer` |
      | the one `<textarea` is controlled (`value` and `onChange`), is `readOnly` while sending, and its `id` is the `htmlFor` of the `<label` reading `Your answer` |
      | the send button's `disabled` and `aria-busy` are bound to `button.disabled` and `button.busy` |
      | no `className` holds a `text-amber-` class; its amber classes are only `border-amber-500/40`, `bg-amber-500/5` and the dot's `bg-amber-500` |
      | the message slot carries `aria-live="polite"` and is rendered on every path, never behind a `&&` or a ternary |
      | it imports none of `./Markdown`, `marked`, `remark` or `react-markdown`, and assigns no `innerHTML` |
      | it spells none of `Send answer`, `WAITING ON YOU`, `Not sent`, `Answered by` or `Delivered to`: every such word comes from `askCardState` |

  Scenario: the client posts the three keys to the one route and keeps the refusal's code
    When `workApi.answer` is read in `api.ts`
    Then it `fetch`es `"/api/work/answer"` with `method: "POST"`, `content-type: application/json` and `body: JSON.stringify({ ref, text, actor })`, and on a non-OK response throws `await codedError(response)`
    And `ui/src/**` holds exactly one `fetch("/api/work/answer"`

  Scenario: the wire type carries the ask fact
    When `WorkItem` is read in `api.ts`
    Then it declares an optional `ask` whose thirteen keys are those of task 00 in that order, with `local: boolean` and `state` typed as the three ask states

  Scenario: the board type-checks with the card
    When `tsc -b` runs in `ui/`, the type pass `npm run ui:build` runs first (ruling 10)
    Then it exits 0, and `tsc` reports no error in `AskCard.tsx`, `DetailPanel.tsx`, `api.ts` or `action.d.mts`
