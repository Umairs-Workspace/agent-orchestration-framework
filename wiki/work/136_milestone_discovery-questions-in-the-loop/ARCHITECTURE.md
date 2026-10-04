---
doc: architecture
---
# 136 · Discovery questions in the loop — Architecture

STATE expected this milestone might reduce to one story once 131's ask path was read. It nearly
does. 131 already carries a driven session's `AskUserQuestion` to the operator, waits in that lane
only, and resumes the same session with the answer. What does not connect is the record: 134's
provenance check reads only the harness's `toolUseResult`, and a loop's answer never lands there.
ADR-001 joins that record to the checker. ADR-002 is the prose a driven session needs so that its
ask carries exactly one token. ADR-003 is the break-down.

## Memory recall: what was surfaced, and what it changed

- The architect recall ("loop-driven refine asks business question through ask-and-wait, answer
  record as example provenance") surfaced 38/ADR-013 (the NEEDS_INPUT sentinel), 54/ADR-008,
  40/ADR-001, 53/ADR-013 and 126/ADR-002. None bears on this decision. No near-miss.
- The PO recall for the milestone domain came back empty.
- 134/ADR-003's own recall line, **69/ADR-007** ("a run waiting on a human releases its slot"), was
  deferred to here. **Superseded, not reopened:** 131/ADR-004 §2 decided that a waiting lane keeps
  its slot under `refine_first`, and this milestone changes none of 131's wait.

## Measured facts this document reasons from

Measured 2026-10-03 on `d733f548` (branch `134-discovery-example-map`). Graph: `aof graph build .`,
built `2026-10-03T17:18:10Z`, code only, no egress, 18,188 nodes.

| Fact | Where |
|---|---|
| A driven session's pending `AskUserQuestion` already settles `needs-input`, and the owner reads its question as each question's text, then its option labels as `- <label>` lines, blocks separated by a blank line | `packages/work/src/observe.mjs:147` (`askQuestionFromTurn`); 131/ADR-002 §2 |
| The owner writes the answer onto the run's `asks` entry (`answer`, `answeredAt`, `by`) BEFORE it re-drives | `packages/execution/src/runs.mjs:1167` (`answerRunAsk`); 131/ADR-003 §6 |
| `by` is `{ actor, via, node }`, and `via` is one of `cli`, `board`, `discord` | `packages/work/src/commands/resume.mjs:385`; `packages/messaging/src/replies.mjs:125`; `packages/server/src/board-ui.mjs:272` |
| The answer reaches the session as the typed input of `claude --resume`, not as a tool result, so the harness writes no `toolUseResult.answers` for it | 131/ADR-001 §1 |
| `collectAnswers` reads `run.brief.answers` for a settled run and the live transcript for a running one, and nothing else | `packages/specification-by-example/src/answers.mjs:141-155` |
| The doctor lane and the build door use only a record's `token` | `packages/specification-by-example/src/doctor-lane.mjs:77` |
| The token is read only at the very head of a text | `packages/specification-by-example/src/map.mjs:300` (`TOKEN_AT_HEAD`) |
| A driven session carries `AOF_RUN_ID` in its environment | `packages/execution/src/session-driver.mjs:859` |
| The phase word for a refine ask is `refine`, and the envelope's cost reads `(refine, <elapsed>)` | `packages/work-loop/src/ask.mjs:52`; `packages/messaging/src/form.mjs:80` |
| `answers.mjs` has one dependent (core's binding) and one dependency (`map.mjs`) | `aof graph impact` |
| `refine.md` is prose and is not in the code graph | `aof graph impact` (not covered) |

So the SPEC's "the envelope's `phase` says so" holds today, and "only that lane waits" is 131's
wait unchanged. Neither needs a story.

## ADR-001 — 131's answer is a second source in the one collector

### Context

SPEC: "134's provenance check accepts 131's recorded answer (verbatim, who, when) as the person's
record beside the interactive one. It is one more input to the same checker, not a second checker."
The checker reads records through `collectAnswers`, and the answer a loop collects sits on the run
record's `asks`, written by the run's owner.

### Decision

1. **`collectAnswers` reads `asks` too.** For every run of the story and of its parent milestone,
   in **any** state, each `asks` entry is a candidate. The owner writes the answer before it
   re-drives, so the resumed session's own doctor run sees it while the run is still `running`.
2. **An entry anchors only when it is unambiguous.** It counts when `answer` and `answeredAt` are
   non-empty strings, its `question` opens with a map token (`readMapToken`), and no later line
   of the question opens with a token. A question carrying two tokens anchors **neither**: 131's
   answer is one text, and nothing can say which part of it answered which token. That fails
   closed, as an unanchored claim. A parked, unanswered entry anchors nothing.
3. **The record.** An ask yields the same seven keys as a harness answer, plus `by`:
   `{ token, question, answer, toolUseId: null, sessionId, at, entrypoint: null, by }`.
   `sessionId` is the run's, `at` is `answeredAt`, and `by` is the entry's `{ actor, via, node }`,
   copied verbatim. De-duplication keys an ask on its run and `askedAt` where a harness answer keys
   on its `toolUseId`.
4. **No stamp, no new writer.** The answer is already on the run record, written by 131's
   `answerRunAsk`, so nothing copies it into `brief.answers` at settle. 134's stamp and its one
   writer are untouched. A mesh worker's answer reaches the worker's own run record through
   `park-resume.mjs` (131/ADR-003 §5c), so the same read covers it.
5. **Every channel 131 records counts** (the operator's ruling, 136/01 Q1, 2026-10-03): a terminal
   answer, the board's reply box, and a Discord reply from an allowlisted account. The reader
   filters on no `via`; the record carries `by`, so the channel and the account stay visible.

### Alternatives considered

- *Stamp the ask's answer into `brief.answers` at settle.* A second writer of a stamp that has one,
  and a copy of a record that already exists. Rejected.
- *Split a multi-token ask by parsing the answer (`Q1: … Q2: …`).* An operator typing on a phone
  will not keep a format, and a misread line would anchor an answer the person did not give.
  Rejected in favour of one token per ask (ADR-002).
- *Give the doctor lane its own read of `asks`.* That is the second checker the SPEC forbids.
  Rejected.

### Consequences

The doctor lane, the build door and the continue path are unchanged: they see one more record with
a `token`. What the anchor proves stays 134/ADR-003 §6's: a person was asked about this token and
answered. It does not prove the map's wording reflects the answer.

## ADR-002 — A driven refine asks one tokened question per ask, and never defaults it

### Context

The discovery beat already says the main session asks every business question through
`AskUserQuestion`, and the `--autonomous` cascade asks them at its one stop "in batches of four".
In a driven session that call becomes 131's ask: the session is stopped, its question is posted,
and the answer is typed back on resume. A batch of four becomes one ask with four tokens, which
ADR-001 §2 anchors to none of them.

### Decision

1. **A driven session is one whose environment carries `AOF_RUN_ID`.** The prose names that test
   and nothing else.
2. **One question per call.** In a driven session each `AskUserQuestion` call carries exactly one
   question. A cascade asks its questions one after another, each its own ask and its own wait.
   The cost is one notification and one answer per question, and the lane waits through each
   resume. It is a technical default under ADR-001 §2.
3. **The form of the ask.** The question opens with its token, then says that it is a discovery
   question, the rule it bears on (`R<n> · <rule>`), and the example it would settle (or that it
   would add a new one). Then come 131's four lines, `Decision needed:`, `Options:`,
   `I would pick:` and `What the answer changes:`, under 1,500 characters, with the options also
   given as the tool's options. The first line is what 131's one-line account and the Discord
   preview show, so the token and the discovery marker go on it.
4. **Never a default, never the sentinel.** A business question is asked, never defaulted, and
   never routed through the NEEDS_INPUT sentinel: the sentinel's text has no option list, and a
   free-form turn is where a token slips off the head. The question is marked `asked` before the
   call. A technical question keeps its documented default.
5. **After the answer.** The answer arrives as the next input of the resumed session. The session
   writes it into the map (`answered`, and `stated Q<n>` or `confirmed`), then runs the doctor as
   the beat already says. A question parked unanswered leaves the story at the Contract gate, with
   no `tasks/` written.
6. **What does not change:** 131's channel, wait, verb, envelope and producer paragraph; 134's
   grammar, token, lane and door; the interactive path, which may still batch up to four.

### Consequences

`refine.md` gains one paragraph in the story Contract's discovery bullets and one sentence in the
`--autonomous` block. The PO and architect briefs are unchanged: the main session asks, and a
spawned agent never does.

## ADR-003 — Two stories, and the live run is the milestone's

| Story | Owns | Depends |
|---|---|---|
| 01 a-loop-answer-anchors-the-example | ADR-001: the reader in `answers.mjs`, its suite, FF-13601 | none |
| 02 a-driven-refine-asks-through-the-loop | ADR-002: `refine.md`, its rendered copies and manifest hash, its prose suite | none |
| 03 a-pending-ask-is-read-from-the-hook (added at verify, 2026-10-03) | ADR-004: the hook, its bundle entries, `readPendingAsk`, the driver's settle, the owner's read and re-drive | none |

**Where the cut falls.** `answers.mjs` has one dependent and one dependency (`aof graph impact`), so
01 is local to the package and its existing suite `test/examples/example-answers.test.mjs`. 02
writes only bundle prose, which has no code edge, and its pins go in the existing
`test/examples/refine-discovery-beat.test.mjs`. Neither story adds a suite file, so neither writes
`test/examples/index.mjs`, and the two write sets are disjoint. One wave.

**The live run** (one loop, one story with a real business question, the message received, the
answer given with `aof work answer`, the map read at the source) is the milestone's `@manual`
verification in `STATE.md`. It needs both stories delivered and is not a story.

## ADR-004 — A pending question is read from a hook, because the transcript no longer shows it

### Context

The milestone's live run (verify, 2026-10-03) drove 136/02's refine on the test-bed. The session
asked exactly the question ADR-002 sets (its token first, the four lines, the options as the
tool's), and the loop never saw it: the run's `asks` stayed empty, the session sat in its picker
for twenty minutes, and the run failed on `timeout`, twice. The screen recorded at the timeout
shows the picker; the transcript holds no `AskUserQuestion` record at all. Claude Code 2.1.288
writes a pending human-input call to the transcript only once it is answered, so 131's detection
(`readLastAssistantTurn`, a pending `tool_use` with no `user` record behind it) cannot fire, and
nor can its question read. A `PreToolUse` hook does fire, before the picker draws, with the call's
`tool_input`, `tool_use_id` and `session_id` (measured the same night by an interactive probe).

### Decision

1. **The hook records the call.** A bundled `PreToolUse` hook, matched to `AskUserQuestion`,
   appends `{ runId, sessionId, toolUseId, name, input, at }` to `<item>/runs/.asks-pending.ndjson`
   when the session carries `AOF_RUN_ITEM_DIR` and `AOF_RUN_ID`. It is the heartbeat hook's
   discipline: no framework import, no store, no output, success on every path.
2. **One reader, in the transcript family.** `readPendingAsk` in `observe.mjs` answers the
   session's last record at or after a `since` instant whose `tool_use_id` has no result in the
   transcript, with the question composed as `askQuestionFromTurn` composes a pending tool's.
3. **The driver settles on it.** The completion watch reads the record first, scoped to records
   written after the drive began: a resumed session never answers a call it lost, so an older
   record is history. It settles `needs-input`, pending, exactly as a pending call on disk does.
4. **The owner reads the question from it.** `ask.mjs` and the mesh worker's `readWorkerAsk` read
   the record first, scoped past the run's last answer, and fall back to `readAskQuestion`.
5. **The re-drive carries the question when the session lost it.** A question read from the
   record never reached the transcript, so `claude --resume` cannot show it to the session. The
   typed input is then `You asked:` + the question + `The answer:` + the answer. An answer to a
   question the transcript holds stays verbatim (131/03 unchanged). The answer RECORDED on the run
   is verbatim either way, so ADR-001's anchor reads it unchanged.

### Alternatives considered

- *Read the question off the screen.* The picker is drawn, wraps at the terminal width and
  changes with every Claude Code release; the hook's input is the structured call. Rejected.
- *Time the session out faster.* It turns a twenty-minute silent failure into a five-minute one
  and still asks nobody. Rejected.

### Consequences

Every driven ask, not only discovery, reaches the operator again on the current Claude Code. A
session whose hook is not installed (a repo that has not run `aof work update`) keeps today's
transcript-only behaviour. A mesh worker records its answer with `question: null` (131/ADR-010),
so a worker's answer still anchors no example; that is 136/VERIFICATION F-136-03.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-13601 | **131's answer is read as provenance in one place.** In comment-stripped `packages/specification-by-example/src/**`, a run record's `asks` is read only in `answers.mjs`, and only inside `collectAnswers`; the reader names no token pattern of its own (it calls `readMapToken`). | `test/arch/examples/acd-example-answer-one-reader.test.mjs` (two cases beside FF-13401: the sweep, whose sanctioned region is `readAskAnswers`, the one helper `collectAnswers` calls, and its red probes), landed 136/01 | ADR-001 §1, §2 |
