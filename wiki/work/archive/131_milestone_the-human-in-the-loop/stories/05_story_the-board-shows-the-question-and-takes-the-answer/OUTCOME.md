
# 05 · The board shows the question and takes the answer — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### The ask fact on a list row
With `mesh: true`, `work:list` applies `applyAskOverlay` outermost and sets a thirteen-key `ask` fact (with `scope` last) on a row whose item has a waiting, parked or answered ask. A local lane's fact is read from its ask file. A mesh worker's comes from its `needs-input` assignment, through `awaitsAnswer` in `src/board-mesh-execution.mjs`, the same predicate the answer verb reads. The CLI's `--json` is byte-identical.

### An ask card in the detail panel
`ui/src/board/AskCard.tsx` shows `WAITING ON YOU`, the phase and elapsed wait, the question as plain text (never Markdown, clamped at six lines with a toggle), and a free-text reply box. It has one `Send answer` button, disabled while the box is empty, and no default or "continue" button. It also shows the answered, parked and refused states, and a worker's ask as "question unreadable". It is keyed per ask, and `DetailPanel.tsx` gains only its import and mount.

### One pure decision and one client
`askCardState` in `ui/src/board/action.mjs` decides everything the card shows. The header relabels to `Open terminal — <node>` for a worker's ask. `workApi.answer` in `api.ts` is the card's only fetch, and it posts `{ ref, text, actor }` to `POST /api/work/answer`.

### A shown card tracks its answer
While any row carries an ask, the board's silent 5 s list poll is armed. The card's receipt holds until the ask leaves the wire.

### The `ui/` freeze moved with its reason
53/FF-5307's `ui/` digest is lifted into `assertUiFrozen` over (path, content) pairs. It is re-pinned with 05's measured diff, and a one-character edit to any `ui/src` file turns it red.

## Assumptions

- **The operator reaches the board from the Discord ping** — the card is found by opening the item. Nothing on the board draws attention to a new ask on a quiet board.

## Gaps

### A new ask on a quiet board
- **Status:** open
- **Discharge condition:** 07's live run observes how the operator reaches the card, and the retro rules whether the board's sync-gated refresh should also watch for asks (`m131/F-131-09`).
On a board with nothing executing and no resync watching, a new ask appears only on the next load or sync. The silent poll arms only once a row already carries one.
