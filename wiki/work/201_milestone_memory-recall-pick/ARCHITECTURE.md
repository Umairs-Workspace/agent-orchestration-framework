---
doc: architecture
---
# 201 · Recall hands an agent what applies — Architecture

The SPEC asks for one new piece, the pick, and four things around it: a soft failure, a ledger
answer, two edges that change, and promoted lessons kept out of the shortlist. ADR-001 decides who
picks. ADR-002 says where the pick sits. ADR-003 is the soft failure. ADR-004 is the model call
and its settings. ADR-005 is the promoted-lesson filter. ADR-006 is the ledger and the edges.
ADR-007 is the replay. ADR-008 is the break-down.

## Memory recall: what was surfaced, and what it changed

Architect recall `75d35e79-fc52-4601-8975-9daa98d7a3c9` ("recall block shortlist model pick lexical
ranker ledger", `--area architecture`) returned five ADRs and no near-miss:

- **153/ADR-001**, "Complete recall observations enter the existing ledger". **Honoured.** The
  ledger row keeps its shape, and the agent still submits what it was handed (ADR-006).
- **148/ADR-005**, "A fixed retrieval eval holds the base ranking over the live corpus".
  **Honoured.** `rankRecords` is not touched, so the eval and its top-5 pass line stand (ADR-002).
- **124/ADR-007**, "The learning edge reaches shatter as a one-per-PRD, PO-only recall".
  **Honoured.** The shatter edge keeps its form, and its control gains cases (ADR-006).
- 69/ADR-005 and 10/ADR-006 do not bear on these decisions.

The PO recalled twice. The recall the refine command prescribes
(`3cb2d413-fcfc-4afa-afec-8b4bde519c1c`, `--item 201`) came back empty, as 177 measured it does
for an item with no records yet. The same words with no item filter
(`d51f97fd-e46f-4c27-8a9c-e184a1041509`) returned five records. Three were honoured:

- **157/02**, "Recall returns an item's whole history". `--all` keeps returning the whole scoped
  result and is never picked (ADR-002 §5).
- **128**, "A null render prints nothing". A block the pick leaves empty prints nothing (ADR-002 §4).
- **124/ADR-007** again, honoured as above.

The other two, a 54 capability and a 124/02 capability, do not bear on the break-down.

One operator rule from the session's own memory was checked: a config key whose absence keeps the
old behaviour owes its adoption path. The pick's keys do not have that shape. Their absence is the
new behaviour, and ADR-004 §6 says what an existing project sees.

## Measured facts this document reasons from

Measured 2026-11-17 on `d5a8d9ae`. Graph: `aof graph build .`, built `2026-11-17T12:49:52Z`, code
only, no egress, 22,084 nodes and 48,682 edges.

| Fact | Where |
|---|---|
| The block's cap is 5, applied when the block is rendered | `packages/knowledge/src/memory.mjs:280`, `:303` |
| The ranker filters by scope first, then scores, then cuts at `opts.limit` (default 5) | `packages/knowledge/src/memory/local-retrieval.mjs:151`, `:325-349` |
| Both doors run one core path. `recurrence` and `status` already ask the port for the whole ranking | `packages/knowledge/src/memory.mjs:559`, `:529`, `:540` |
| `record-recall` reaches the ledger through a capability that core injects, because knowledge may not import work's commands | `packages/knowledge/src/memory.mjs:562-568`; `packages/core/src/application/bindings/commands/work/memory.mjs:24` |
| The graphify backend reports a lost graph signal as a non-enumerable property and one text line | `packages/knowledge/src/memory/graphify-backend.mjs:312`, `:366` |
| A lesson's `Promoted to` is indexed as its `status`. An ADR's `status` is `Accepted`, and a gap's is its lifecycle | `packages/knowledge/src/memory/local-indexing.mjs:172`, `:192` |
| **No recall path filters on a lesson's promotion.** Those two lines are the only ones under `packages/knowledge/src` that mention it | `grep -rni promot packages/knowledge/src` |
| A ledger row has an exact key set, and a row with any other key is refused on read | `packages/work/src/feedback-records.mjs:24`, `:98`, `:163` |
| Six runtime modules read the ledger module | `aof graph impact packages/work/src/feedback-records.mjs` |
| The seam has two runtime dependents and 13 suites. The ranker has four runtime dependents and 31 suites. The command door has one dependent, core's binding | `aof graph impact` |
| `claude` is resolved through the provider seam. The board's headless conversation refuses a shell shim and scrubs the parent session's keys | `packages/execution/src/providers.mjs:92`; `packages/core/src/application/bindings/board-ui.mjs:36-41`; `packages/execution/src/session-model.mjs:51` |
| `claude --bare` never reads OAuth or the keychain | `claude --help`, 2.1.326 |
| The retrospective runs two recalls and records neither | `packages/core/assets/commands/retrospective.md:31`, `:42`, `:56-57` |
| The PO's refine recall is scoped `--item <ref>` | `packages/core/assets/commands/refine.md:169-170`, `:186` |
| A prompt edit lands in the command, the Codex variant, the manifest, three renders and the lock | commit `b3cc77a7` |
| Every child process is audited, keyed by its expression and the source of its whole file | `scripts/workspace-runtime-audit.json` (127 entries) |
| The schema's memory node is closed: six keys, no others | `schemas/aof.schema.json:797` |

One call was measured for this document. From an empty directory outside the project, with the
parent session's keys removed:

```
claude -p --model haiku --output-format json --tools "" --no-session-persistence \
  --strict-mcp-config --disable-slash-commands --permission-prompts none \
  --system-prompt "<instruction>"  < prompt
```

It exited 0 in 8 s of wall time (2.1 s in the API), read 856 input tokens, cost $0.00018
API-equivalent, used the subscription sign-in, and left no transcript directory. 177 measured p50
8.9 s and a mean of 38,866 input tokens per call, so most of what 177 paid was the CLI's own
context. The same probe is also a warning. Given four cards as titles only, haiku picked all four,
two of them unrelated ADRs. The pick's quality depends on what a card carries and on the
instruction, and 177's prompt was throwaway code that no longer exists.

## ADR-001 — The pick is a separate model call, made by the recall command

**Status:** Accepted · **Date:** 2026-11-17

### Context

The SPEC leaves two shapes open. A separate cheap model call chooses from the shortlist, which is
what 177 measured. Or the recalling agent is handed a 20-card block and chooses for itself, which
nobody measured.

| | a separate call | the recalling agent picks |
|---|---|---|
| Measured | 127 judged recalls (177) | not measured |
| Decision-changing records per block | 1.67, against 1.31 for today's ranker | unknown. The nearest measured relative is 177's candidate 3, a sonnet choosing from an index it reads: 1.56 |
| Noise per block | 0.69, against 2.02 | all 20 cards are in the agent's context whatever it chooses. Candidate 3 showed 1.21 |
| Cost | one haiku call, about 8 s, under 1,000 input tokens when launched lean | about 15 more lines in the context of the session's own, larger model, at eight call sites |
| The block ends empty | yes | no, 20 cards always arrive |
| Replayable | yes, the block is one command's output | no, there is no shipped block to replay |
| Ledger | the block's lines, as 153 records them | 20 verdicts per recall, or a second kind of row |

### Decision

`aof memory recall --block` makes the pick itself, with one model call. The recalling agent is
handed at most 5 records and never sees the shortlist.

### Alternatives considered

- **The recalling agent picks from 20 cards.** It needs no extra process. It is rejected because
  it is unmeasured, it cannot end empty, it cannot be replayed, and it puts the noise this
  milestone exists to remove into the context of every recalling agent.
- **Both, chosen per edge.** Two shapes to measure and to keep. Nothing measured asks for it.

### Consequences

Recall now needs a `claude` that resolves and is signed in wherever it runs. ADR-003 makes its
absence a soft failure, and ADR-004 says how the call is made.

## ADR-002 — The pick sits in the seam, over the port's ranking, and the picker is injected

**Status:** Accepted · **Date:** 2026-11-17

### Decision

1. **One place.** `runMemoryVerb` is the core path both doors run, so the pick lives there, for
   `recall` with `--block`. Nothing else is picked.
2. **Shortlist.** The seam asks the port for the whole ranked scope (`limit: Infinity`, as
   `recurrence` and `status` already do), drops promoted lessons (ADR-005), and keeps the first 20.
   The backend still applies the scope filter before it scores, and every record keeps its
   `source`. No backend method, no `MemoryRecord` field and no `RecallResult` key changes
   (05/ADR-003, 05/ADR-004).
3. **The picker is a capability.** The seam calls an injected `pickRecords`, as it calls the
   injected `recordRecall`. Knowledge starts no process and imports nothing from execution.
4. **What comes back.** The result is a `RecallResult` whose `records` are the picked ones, in the
   order the picker gave them, and whose `text` is rendered from them. The cap is 5. A pick of
   nothing is an empty block, which prints nothing. An empty shortlist asks no model.
5. **The edges of `--block`.**
   - `--limit N` sets the cap to N. The shortlist is 20, or N when N is larger.
   - `--all` returns the whole scoped result, as today. It is not picked and not filtered.
   - `--block --json` prints the picked records as the JSON array.
   - `recall` with no `--block` (the text view and `--json`), `recurrence` and `status` are
     unchanged: no pick, no promoted filter.
6. **One home for the contract.** A new leaf, `packages/knowledge/src/memory/recall-pick.mjs`,
   holds the shortlist size, the promoted filter, the request a picker is handed, and the reader
   of its answer. It is pure. It touches no disk and no process.
7. **The request and the answer.** The request numbers the cards from 1. Each card is the record's
   block line and its `text`, cut at 1,500 characters. The answer is a JSON array of card numbers,
   most applicable first, and `[]` when none applies. The reader takes the first JSON array in the
   answer, drops a number outside the cards and a repeat, and cuts at the cap. An answer with no
   array, or a non-empty array with no number inside the cards, is unreadable (ADR-003).
8. **The pick is reported on the result.** The result carries a non-enumerable `pick`:
   `{ mode, code, shortlisted, model }`, where `mode` is `model` or `lexical`. It is the
   `graphSignal` pattern (10/ADR-004), so the frozen four keys stay four.

### Alternatives considered

- **In the ranker or a backend.** 31 suites and both backends depend on the ranker, and the SPEC
  keeps the backend contract. A backend that called a model would also make the pick differ by
  backend.
- **In the command door.** The door has one dependent, but the in-process door (`runMemory`) would
  then hand out a different block from the CLI's.
- **Ask the backend for 20, then drop promoted lessons.** The shortlist would shrink by however
  many it dropped. The SPEC puts the filter ahead of the shortlist.

### Consequences

A caller that injects no picker gets today's block: the first 5 of the shortlist. That is what the
existing in-process harnesses do, so they keep passing. 148/FF-14801 keeps its pass line, because
the first 5 of the ranking is still what a degraded block shows.

### Invariant

The pick has one home and no backend knows it (FF-20101). Knowledge starts no model (FF-20102).

## ADR-003 — The pick fails soft, and says so on stderr

**Status:** Accepted · **Date:** 2026-11-17

### Decision

1. Recall never fails because of the pick. On any miss the block is the first cap records of the
   shortlist, which is today's lexical top 5 with promoted lessons already dropped.
2. Each miss has a code:

   | code | when | announced |
   |---|---|---|
   | `pick-off` | the project turned the pick off | no |
   | `pick-unwired` | the caller injected no picker | no |
   | `pick-unavailable` | no `claude` resolves, or it resolves to a shell shim | yes |
   | `pick-timeout` | no answer inside the time limit; the child is ended | yes |
   | `pick-failed` | the process could not start, exited non-zero, or reported an error | yes |
   | `pick-unreadable` | the answer held no usable array of card numbers | yes |

3. An announced miss is one line on **stderr**, written by the routed command:
   `[memory] pick unavailable (<code>) — this block is the lexical top <n>; records intact.`
   It mirrors the graph-signal line. Stdout stays the block and nothing else, because prompts paste
   it and its lines are exactly its records.
4. The exit code is 0 on every miss.

### Alternatives considered

- **A line in the block.** It would break "block lines are the records", which three consumers
  parse.
- **Silence.** The SPEC asks for the degrade to be reported, and a node with no signed-in `claude`
  would otherwise run on the old block with nobody knowing.

## ADR-004 — The model call: `claude`, once, lean, outside the project

**Status:** Accepted · **Date:** 2026-11-17

### Decision

1. **Who is asked.** The `claude` CLI, resolved through the provider seam, at the model the
   project names. The default is `haiku`, which is what 177 measured. A shell shim is
   `pick-unavailable`, as it is for the board's headless conversation.
2. **How.** One process per recall. The request goes in on stdin. The launch is the one measured
   above: print mode, JSON output, no tools, no MCP servers, no slash commands, no session saved,
   no permission prompt, and a system prompt of the pick's own. It never passes `--bare`, which
   refuses the subscription sign-in, and never a permission bypass.
3. **Where.** The child's working directory is an empty directory outside the project, and its
   environment is the caller's with the parent session's keys removed (`isSessionAttachmentKey`).
   So no project hook fires, no `CLAUDE.md` is read, and no transcript lands where
   `aof work observe` would count it as an agent session.
4. **One module makes the call.** A new leaf, `packages/execution/src/model-ask.mjs`, builds the
   argv and the environment, writes stdin, reads the answer, enforces the time limit and ends the
   child. Core composes the picker from it, the provider seam, the request and answer contract of
   ADR-002 §6, and the settings below, in the command binding that already builds `recordRecall`.
5. **Settings.** `memory.recall.pick` is an object read only by `readMemoryConfig` (180/ADR-001):

   | key | default | accepted |
   |---|---|---|
   | `enabled` | `true` | a boolean |
   | `model` | `"haiku"` | a non-blank string |
   | `timeoutMs` | `20000` | an integer from 1,000 to 120,000 |

   Anything else is refused with `invalid-memory-recall-pick` at the path the author wrote. The
   schema's memory node gains `recall`. 20 s is about twice 177's p95 of 10.7 s.
6. **What a project sees.** Absent keys mean the pick is on, so there is nothing to adopt. `aof
   memory status` gains one line, `recall: pick <model>, <n> s (<source>)`, followed by whether
   `claude` resolves on this node. `aof project show --json` carries the three values and where
   each came from. A node where `claude` does not resolve is told at every recall (ADR-003).
7. **What leaves the machine.** The query, and for each shortlisted record its block line and up
   to 1,500 characters of its text, go to the provider behind `claude`. For a Claude session that
   is the provider it already sends the work stream to. For a Codex or opencode session it is a
   second provider. `enabled: false` turns it off, and `aof project show` names it.

### Alternatives considered

- **The session's own runtime picks** (Codex for a Codex session). Not measured, and it is three
  launchers to keep. A node with no `claude` degrades to today's block instead.
- **The Anthropic API with a key.** It needs a key the project does not have. 177 used the CLI
  subscription on purpose.
- **Reuse the headless conversation** (`conversation-session.mjs`). It holds a long-lived
  stream-json session with tools. The pick is one answer and no tools.

### Consequences

Story 01 adds a child process, so it owes an entry in `scripts/workspace-runtime-audit.json`, and a
re-stamp for any audited file it edits. The pick reads record text, so a record could try to steer
it. The answer is only card numbers checked against the shortlist, and the call has no tools, so
the worst a hostile record can do is get itself or a neighbour picked.

### Invariant

The pick's launch has one builder, never `--bare` and never a permission bypass (FF-20103).
`memory.recall.pick` has one reader (FF-20104), and the schema's keys are the reader's (FF-20105).

## ADR-005 — Promoted lessons leave the shortlist

**Status:** Accepted · **Date:** 2026-11-17

### Context

The SPEC says the retire-promoted filter "keeps working ahead of the pick". It does not exist yet.
153 indexes a lesson's `Promoted to` as its `status`, and nothing on the recall path reads it. 177
measured the filter in throwaway code (candidate 4) and kept "the mechanism", which is the field.
So this milestone builds the filter. It is small, and it bites on 5 of 957 lessons today.

### Decision

1. On the `--block` path, before the shortlist is cut, a record is dropped when it is a lesson and
   its `status` names at least one promotion pointer: `control:`, `rule:` or `prompt:`. The
   pointers are read by `promotionPointers` from the vocabulary's one home
   (`@aof/work/memory-vocabulary`).
2. A lesson whose promotion is `none`, blank (a legacy lesson) or outside the three forms stays.
   ADRs, gaps and every other record type are never dropped, whatever their `status` says.
3. The filter stands down when the caller's scope names `status`. That caller is asking by
   promotion.
4. It runs on a degraded block too, and on no other path. `recurrence` must still see a promoted
   lesson, because a promoted lesson that recurs is a failed promotion.

### Alternatives considered

- **Drop only lessons promoted to a control**, the SPEC's literal word. 177's candidate 4 is "a
  rule, prompt or control", and its finding is that a rule file or a prompt is where a promoted
  procedure is already loaded.
- **Filter in the ranker.** It would hide promoted lessons from `recurrence` and `status`.

## ADR-006 — The ledger keeps its shape; every recall is recorded, and the PO asks by title

**Status:** Accepted · **Date:** 2026-11-17

### Decision

1. **The ledger answer is 153's, unchanged.** A recall row's `records` are the lines of the block
   the agent was handed, which are now the picked ones. The agent keeps that result and submits it
   with its verdicts. Nothing re-runs a recall to rebuild what it returned, so a pick that would
   differ on a second run is never asked twice. The row's key set does not change, and no
   consumer of the ledger moves.
2. **`refine-po` asks by title.** The PO's recall becomes
   `aof memory recall "<the item's title, verbatim>" --block`, with no `--item` and no `--area`.
   Its observation records the title as the query and `{}` as the scope.
3. **The retrospective records both of its recalls**, on the item it is written for, once each:

   | edge | recall | scope recorded | a verdict means |
   |---|---|---|---|
   | `retrospective-domain` | the `--block` recall before triage | `{}` | `honoured`: an earlier lesson stopped a duplicate or earned a `Recurs`. `departed`: judged close, and a new lesson was written anyway. `irrelevant`: neither |
   | `retrospective-evidence` | `"" --item <ref> --area delivery --all --json` | `{"item":"<ref>","area":"delivery"}` | `honoured`: a lesson cites the record. `irrelevant`: it carried no lesson |

   The actor is `product-owner`. Both are submitted after the lessons are written and before the
   ingest, and a retrospective that writes no document still submits both. An empty result is
   submitted as `"records": []`. This supersedes the last sentence of 157/ADR-004, "Evidence
   gathering is not a third decision-recall ledger edge", and the case in 124/FF-12405 that holds
   the retrospective to it. The rest of 157/ADR-004 stands.
4. **The other five edges keep their words.** `shatter-po`, `refine-architect`,
   `continue-developer` and `verify-finding` reach the pick through `--block` with no prompt
   change. `continue-episodic` asks with `--all`, so it is not picked.
5. **The edits land everywhere a prompt lives:** the command, the Codex variant, the manifest, the
   three renders and the lock.

### Alternatives considered

- **A `pick` field on the row**, saying whether the block was picked or degraded. It would let a
  later replay split the two from the ledger alone. It is rejected because 153 made the key set
  strict on purpose, six consumers read it, and the agent would have to copy the value from stderr
  at eight call sites.
- **The recall command writes the row.** The row needs verdicts, which exist only after the
  agent's decision.

### Invariant

Every recall a bundled command runs is paired with a capture that names its own edge, and the
roster of edges is asserted in both directions (FF-20106).

## ADR-007 — The replay drives the shipped block from the ledgers

**Status:** Accepted · **Date:** 2026-11-17

### Decision

1. A project script, `scripts/memory-recall-replay.mjs`, reads every `recall` row in the ledgers
   under the work directory, through the ledger's own reader.
2. It keeps the rows whose edge hands out a block. `continue-episodic` and
   `retrospective-evidence` ask with `--all` and are left out.
3. For each row it runs the recorded query and scope twice through the seam the CLI runs, over
   the index as it stands: once with the pick off (the lexical block) and once as shipped. A miss
   that ADR-003 announces counts the recall as degraded.
4. It takes `--edge`, `--sample <n>` and `--seed <s>`, so a run is repeatable in which recalls it
   replays, though not in what the model picks.
5. It writes one report: per edge and overall, the recalls replayed, records shown per recall for
   each block, empty blocks and degraded recalls. It writes no ledger and no index.
6. **How a block is graded is not decided here.** It is the operator's, asked in story 03's
   example map. The answer lands in that story's contract.

### Consequences

The replay is how the pick's instruction is held to 177's numbers. The probe above showed haiku
picking everything from four bare titles, so "it runs" is not evidence that it picks well.

## ADR-008 — Four stories: a seam, a model call, the edges, a replay

**Status:** Accepted · **Date:** 2026-11-17

| story | owns | waits on |
|---|---|---|
| 00 · recall hands over a picked block | the seam, the contract leaf, the promoted filter, the soft failure | nothing |
| 01 · the pick is a model call a project can see and set | the one-shot call, the composition in core, the settings, status and inspection | 00 |
| 02 · every recall leaves a record, and the PO asks by title | the two prompts, the Codex variant, the renders, the edge control | nothing |
| 03 · the recorded recalls replay against the shipped block | the replay script and the direction check | 00, 01 |

The cuts follow the coupling `aof graph impact` reports. Story 00 stays inside knowledge: the seam
and the command door, whose only dependent is core's binding. Story 01 owns that binding, the
settings reader with its eight runtime dependents, and the new execution leaf. Story 02 writes no
runtime module at all. Stories 00 and 02 share no file and build together. 01 follows 00 because
it implements the capability 00 defines, and both edit the seam (00 the block path, 01 the status
line). 03 follows 01 because it replays the block end to end.

No story touches `packages/work/src/feedback-records.mjs`. ADR-006 §1 is what keeps its six
consumers still.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-20101 | **The pick has one home, and no backend knows it.** In comment-stripped runtime source, the shortlist size, the promoted-lesson filter and the pick's request and answer are spelt only in `packages/knowledge/src/memory/recall-pick.mjs`. `local-retrieval.mjs`, `engine.mjs` and the three backends import nothing from it, and none of them reads a `block` option. | `test/arch/memory/acd-recall-pick-single-home.test.mjs` — **pending**, lands with 201/00 | ADR-002 §1, §2, §6 |
| FF-20102 | **Knowledge starts no model.** `recall-pick.mjs` and `memory.mjs` import no `node:child_process` and nothing from `@aof/execution`. The pick reaches a process only through the capability core injects. | `test/arch/memory/acd-recall-pick-is-injected.test.mjs` — **pending**, lands with 201/00 | ADR-002 §3 |
| FF-20103 | **The pick's launch has one builder.** The argv of the pick's `claude` call is built only in `packages/execution/src/model-ask.mjs`. It never carries `--bare` or a permission bypass, and always carries the no-tools and no-session flags. The child's environment passes through `isSessionAttachmentKey`, and its working directory is never the project root. | `test/arch/memory/acd-recall-pick-launch.test.mjs` — **pending**, lands with 201/01 | ADR-004 §2–§4 |
| FF-20104 | **`memory.recall.pick` has one reader.** In comment-stripped runtime source the key is read only in `packages/knowledge/src/memory-config.mjs`. | `test/arch/memory/acd-memory-config-one-reader.test.mjs` (cases beside 180/FF-18001) — **pending**, cases land with 201/01 | ADR-004 §5 |
| FF-20105 | **The schema's pick keys are the reader's.** The property names under the schema's `memory.recall.pick` equal the keys `readMemoryConfig` accepts, and the memory node stays closed. | `test/arch/memory/acd-memory-node-schema.test.mjs` (cases beside 180/FF-18002) — **pending**, cases land with 201/01 | ADR-004 §5 |
| FF-20106 | **Every recall a command runs is recorded.** In each bundled command and in the Codex variant, every `aof memory recall` invocation is paired with a `record-recall` capture that names its own edge. The roster of eight edges is asserted in both directions, and the three renders of each edited command match a fresh render. | `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` (cases beside 124/FF-12405) — **pending**, cases land with 201/02 | ADR-006 §3–§5 |
