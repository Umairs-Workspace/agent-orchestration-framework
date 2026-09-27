---
type: chore
number: 98
slug: the-reference-corpus-rows-were-authored-never-re-fetched-run-the-hand-run-refresh-once-to-confirm-each-source
title: "The Reference Corpus Rows Were Authored Never Re Fetched Run The Hand Run Refresh Once To Confirm Each Source"
status: done
owner: developer
created: 2026-09-03
updated: 2026-09-04
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 98 · The Reference Corpus Rows Were Authored Never Re Fetched Run The Hand Run Refresh Once To Confirm Each Source

## Intent

The six rows of `src/harness-reference.mjs` were written by hand at `77/03` and each carried
`checked: "2026-09-03"` — a date that recorded the day the row was AUTHORED, not a day anybody
re-reached its source. That is precisely the state the corpus's own prose refuses: "a row with no
date is an assertion that was true once." `scripts/refresh-harness-reference.mjs` exists to close
that gap and had never been run against the shipped rows, so every value in the corpus was a claim
whose citation nobody had followed. This chore runs the refresh once, confirms each of the six
values at its source, and restamps the corpus and its generated view together.

## Definition of Done

- [x] Run 'node scripts/refresh-harness-reference.mjs' by hand on a networked machine; for each row it reports as DRIFTED, supply the corrected value with --set <id>=<value> and re-run; for each row it reports as UNREACHABLE, fix the source URL in src/harness-reference.mjs and re-run. Then commit the restamped corpus and the regenerated wiki/reference/harness-baselines.md together.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "The reference corpus rows were authored, never re-fetched — run the hand-run refresh once to confirm each source" (`src/harness-reference.mjs:56`)
- **Raised reviewing:** `77/03`, review round 1
- **Promotion key:** `finding:77/03:the reference corpus rows were authored, never re-fetched — run the hand-run refresh once to confirm each source`

### What the run reported

`node scripts/refresh-harness-reference.mjs` (2026-09-04): `checked 6 row(s): 6 confirmed, 0
drifted, 0 unreachable`, exit 0. **No row's value had moved**, so no `--set` was supplied and every
`value:` in the corpus is the one `77/03` authored. All six rows restamped to `checked: 2026-09-04`,
and `wiki/reference/harness-baselines.md` regenerated from the same run.

### Two sources answered 200 without stating their value

The refresh's probe is a reachability check by design — the module's own comment is explicit that "a
six-field row declares no extraction rule, so a value is CONFIRMED and never scraped", and the
confirming is the operator's act. Confirming each of the six by hand found two rows whose cited page
answers `200` but does not carry the number anywhere a reader of the response can find it:

- `langchain-agent-executor-max-iterations` cited the client-rendered API-reference page, whose
  response body does not contain the string `max_iterations` at all (26 lines, 0 occurrences). The
  value is unconfirmable from that URL by any reader who is not running a browser.
- `openai-agents-runner-max-turns` cited `ref/run/`, which renders the signature
  `max_turns: int | None = DEFAULT_MAX_TURNS` — the SYMBOL, in all 33 of its occurrences, and never
  the number `10`.

Both `source:` values were replaced with the upstream declaration that states the number outright,
which is also the only form the refresh program can ever re-confirm unaided:

| id | source now cited | what it states |
| --- | --- | --- |
| `langchain-agent-executor-max-iterations` | `.../langchain/libs/langchain/langchain_classic/agents/agent.py` | `class AgentExecutor(Chain)` … `max_iterations: int \| None = 15` |
| `openai-agents-runner-max-turns` | `.../openai-agents-python/src/agents/run_config.py` | `DEFAULT_MAX_TURNS = 10` (line 45) |

Note for whoever refreshes next: `AgentExecutor` now lives under `langchain_classic`, not
`langchain.agents` — the old docs path is legacy as well as unreadable.

### The other four, confirmed verbatim at source

- `github-actions-job-timeout-minutes` = 360 — "jobs.&lt;job_id&gt;.timeout-minutes … **Default: 360**".
- `kubernetes-job-backoff-limit` = 6 — "The `.spec.backoffLimit` is set by default to **6**, unless
  the backoff limit per index (only Indexed Job) is specified."
- `temporal-workflow-task-timeout-seconds` = 10 — "Workflow Task Timeout period **The default value
  is 10 seconds.**"
- `aws-step-functions-standard-execution-days` = 365 — the quota table states Standard's "Maximum
  execution time **1 year**". The row's unit is days, so 365 is a conversion of the source's wording
  rather than a quotation of it; the value is right and the unit is the row's own.

### Not a defect, recorded so the next reader does not re-raise it

That a `200` from a client-rendered page passes the probe is the design's intent, not a gap: the
program deliberately declares no extraction rule, because a rule that scraped would make the
corpus's contents depend on the day it ran. Substantiation stays a human act; what this chore
changes is that the two rows which could not be substantiated now cite sources that can be.
