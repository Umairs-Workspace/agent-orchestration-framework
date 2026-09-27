# 98 · The Reference Corpus, Re-Fetched And Confirmed At Source — Outcome

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

### Harness reference corpus confirmed at source
All six rows of `src/harness-reference.mjs` carry `checked: "2026-09-04"`, the date each row's value
was reached at its cited source, and `wiki/reference/harness-baselines.md` was regenerated from that
same run.

### Every corpus row cites a source that states its number outright
`langchain-agent-executor-max-iterations` and `openai-agents-runner-max-turns` now cite the upstream
declarations (`langchain_classic/agents/agent.py`, `agents/run_config.py`) that carry `15` and `10`
in the response body, replacing two client-rendered doc pages whose bodies never contained the value.

## Assumptions

- **The refresh probe checks reachability, not value** — `scripts/refresh-harness-reference.mjs`
  reports a six-field row CONFIRMED on a `200`, so the value's substantiation is the operator's act
  at each re-run, not the program's.
