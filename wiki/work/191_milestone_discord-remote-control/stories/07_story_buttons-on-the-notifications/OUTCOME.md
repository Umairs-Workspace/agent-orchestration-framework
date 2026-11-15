# 191/07 · Buttons on the notifications — Outcome

## Delivered

### The right notifications carry buttons
`loop-halted` and `loop-died` carry **Resume** and **Open a session here**. A question with two to five fixed choices carries one button per choice. Buttons appear only when the channel has an `allow` list.

### A Claude question keeps its choices
An ask raised by a Claude session records its option labels as `choices`, so the question can be rendered with buttons.

### A tap is checked and dispatched like a reply
`discord-buttons.mjs` holds the one `custom_id` grammar and the press handler. A tap is checked against the `allow` list, reads what to act on from the message index, never from the id, and reaches only `work:answer`, `work:loop` or `mesh:session-start` (FF-19107). A choice is answered once: the first answer wins and the buttons are disabled.

## Assumptions

- **Resume needs a supervised loop and a running desktop app** — the button writes the same hand-off as `/loop resume`, and is refused the same way for a loop started without `--supervised`.
