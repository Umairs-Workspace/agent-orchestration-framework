
# 01 · The question is read and recorded — Outcome

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

### One reader of a session's question
`readLastAssistantTurn`, `askQuestionFromTurn` and `readAskQuestion` in `src/work/observe.mjs` are the only transcript scan that yields the question: the last assistant turn, or a pending `AskUserQuestion`'s questions and options. The driver's private scan maps over them, and its seventeen exports are unchanged.

### A four-line form of the ask
`NEEDS_INPUT_INSTRUCTION` asks a driven session to print `Decision needed:`, `Options:`, `I would pick:` and `What the answer changes:` before the sentinel. The threshold sentences for asking are byte-identical to before.

### One ask file per run in the aof home
`src/loop/ask-request.mjs` owns `<meshRoot>/loop-asks/<runId>.json`: a fifteen-key record, `ASK_STATES` (`waiting | parked | answered`), the owner's `openAsk`/`parkAsk`/`clearAsk`, the reads `readAsk`/`readAsks`, and `createAskPoll`. No other `src/` module spells `loop-asks` (FF-13101).

### An answer sanitised once
`answerAsk` is the only place an answer is checked. It refuses a blank answer, one over 8,000 code points, or one holding a C0 control other than TAB/LF/CR or DEL. Otherwise it stores the answer verbatim, and the first answer wins (`ask-already-answered`).

### `asks` as the run record's seventeenth key
Every run record carries `asks` last, defaulting to `[]`. Each entry holds seven keys (`question, phase, askedAt, parkedAt, answer, answeredAt, by`). It is written only by `openRunAsk`, `parkRunAsk` and `answerRunAsk` in `src/run-store.mjs`, and a retry starts a fresh `[]`.

### A waiting run is neither reclaimed nor charged
The stale-reclaim scan skips a run whose last ask is unanswered (FF-13103), and `attemptElapsedMs` subtracts the clipped, merged ask intervals.

## Assumptions

- **The session writes its question as its last message** — the reader takes the transcript's last assistant turn. A session that prints the sentinel and then says more is read by its last words.
- **One aof home per operator** — the ask file follows `AOF_GLOBAL_HOME`, so the verb must run under the same global home as the loop that asked.

## Gaps

### `createAskPoll` has no consumer
- **Status:** open
- **Discharge condition:** the operator's ruling on `m131/F-131-06`: either 01 task 02 is amended and the export removed, or a production reader adopts it with a ref'd timer.
`createAskPoll` is exported and tested, but no production path calls it. The owner's wait is 03's ref'd `setTimeout` over `readAsk`.
