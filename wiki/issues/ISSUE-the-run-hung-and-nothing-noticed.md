# ISSUE · The run hung, and nothing noticed

**2026-08-22.** Subject: the AOF framework. Evidence: a single `aof:continue 365` invocation on a
downstream work stream, run in `orchestrated` mode.

One `/aof:continue 365` ran **1h55m and delivered nothing**. The story it was asked to finish is
still `in-progress`. Roughly **39 of those minutes were a spawned reviewer that had already stopped
producing output**, and nothing in the framework detected it — not the orchestrator, not a watchdog,
not a timeout. It was found by hand, by `stat`-ing the agent's output file.

The issues below are listed as found. Companion to
[`ISSUE-why-a-simple-story-costs-three-hours.md`](ISSUE-why-a-simple-story-costs-three-hours.md);
issues 3 and 4 of that document recur here in sharper form.

---

## The root cause

### 1 · A spawned agent can stall silently, and nothing is watching

Two reviewers were spawned concurrently in one message: `aof-architect` and `aof-qa`.

- **`aof-architect`** ran to completion — 73 tool calls, ~173k tokens, three self-initiated addenda,
  a correct and useful review.
- **`aof-qa`** created its output file at **18:44:21 at 0 bytes** and was **still 0 bytes at
  19:21:24** — 37 minutes later. When killed, its entire recorded result was one sentence:
  *"I'll start by reading the story documents and understanding the current state of the tree."*

It emitted one assistant message and then stopped. No error, no exception, no timeout, no
completion notification. Same spawn call, same message, same tools, same tree as the agent that
worked.

**Nothing surfaced this.** The orchestrator's only liveness signal is the completion notification,
which by definition never arrives for a stalled agent. There is no heartbeat, no exposed last-write
timestamp, no "agent has produced no output in N minutes" warning. The orchestrator reported *"still
waiting on QA"* three times across 37 minutes, because from inside the protocol a stalled agent and a
working agent are indistinguishable.

**The detection that eventually worked was manual and out-of-band:**

```
stat -c "%s" .../tasks/<agentId>.output   →   0
```

That check costs milliseconds. Nothing in the framework performs it.

This is issue 3 of the companion document — *"Dead air, with no watchdog"* — but worse. That one
described the **main thread** idling between notifications. This is a **spawned child** that is
formally in-flight, holds a slot in the fan-out, and will never report.

---

## The measurements

**One `aof:continue 365`, wall clock.**

| Beat | Wall | Outcome |
|---|---|---|
| Orient — `aof work resume`, resolve ref, read contract | 17:46 → 17:51 (5m) | correct, fast |
| Build — `aof-developer` | 17:51 → 18:41 (**50m**) | all lanes green; 150 tool calls, 284k tokens |
| Review — `aof-architect` | 18:43 → 19:14 (31m) | VIOLATIONS + 3 addenda; 73 calls, 173k tokens |
| Review — `aof-qa` | 18:43 → 19:22 (**39m**) | **zero bytes produced; killed** |
| Fix round | 19:26 → 19:41 (15m) | edits done in 5m; killed during re-verification |
| **Total** | **≈1h55m** | **story not delivered; still `in-progress`** |

**Where the fix round's 15 minutes went.** All eight edits landed between **19:26:29 and 19:31:51 —
five minutes**. The remaining ten were re-running verification, and it had not finished when the run
was stopped. **The verification costs more than the work it verifies**, every round.

That is structural, not incidental: `vitest.config.bdd.ts:27-38` sets `singleFork: true` **and**
`fileParallelism: false` — deliberately, because the specs share one test database — so each round
re-runs 677 + 1267 + 107 tests and two monorepo `tsc` passes, strictly serially.

---

## The other issues found

### 2 · `aof graph build` times out and exits 0 — a caller cannot tell stale from fresh

The architect ran `aof graph build .`; it timed out at the 120s default. It retried at **540s** and
got `graphify timed out after 540000ms` — **exit 0**, artifact untouched.

The artifact it then read was ~4 hours stale, and did not contain the edges the round under review
had just created. **Exit 0 on timeout means "the graph is current" and "the graph is four hours old
and missing your change" are the same observable status.** A less careful reviewer would have
grounded findings in a graph that could not see the diff.

This was survivable only because the agent noticed and re-derived every graph-grounded claim by
grep, across three addenda — confirming all of them, at the cost of those extra rounds. That is luck,
not design. A timeout must be a non-zero exit, or the artifact must carry a freshness stamp the
caller is made to check.

### 3 · Two sessions ran in one working tree, and neither was told

A second session was concurrently running story **367**'s `aof:verify` + `@uat` pass **in the same
checkout**. Neither session knew.

Consequence: this run's build lane edited 367's task-04 and task-06 contracts (adding `cy` to
ElevenLabs made one of 367's locked rows factually false) while 367's own verify session was
independently amending those same files and applying UAT fixes to shared production code.

`aof:continue` has worktree isolation — `aof work dispatch <ref>` — but it is used only for the
**milestone fan-out**. A directly-invoked `aof:continue <story>` on a standalone story dispatches
nothing and works in the current checkout. **There is no lease, no lock and no warning against a
second session targeting the same tree.** `.aof/aof.lock.json` exists but was dated two days prior;
it did not participate.

The framework's own guidance states the hazard for the fan-out case — *"never dispatch two stories
into one tree… measured, two stories an architect had partitioned as independent both edited one
file"* — and then leaves the session-level case unprotected.

**How it was actually detected:** forensic `stat` of file mtimes against the developer's run window,
plus an argument from git-status sort order (`-` sorts before `.`, so a dirty
`move-provider-body.tsx` would have appeared between two listed entries, and did not). That is not a
detection mechanism.

### 4 · Stale `runtime_offline` runs accumulate and never age out

`aof work resume` at session start reported five resumable runs, all `READY`, all `attempt 1/3`:

| Item | Run | Age at report |
|---|---|---|
| 347/03 | `20260719T131041338Z-0000` | **~5 weeks** |
| 348/04, 348/05 | `20260805T202639548Z`, `…40392Z` | ~2.5 weeks |
| 348/02, 348/03 | `20260806T103307713Z`, `20260806T171547595Z` | ~2.5 weeks |

All five are `runtime_offline`. Nothing ages them out, marks them abandoned, or distinguishes "died
90 seconds ago, resume it" from "died five weeks ago, nobody will". The sweep is the first thing
`aof:continue` runs, so this is the first thing an operator reads every session — and it has been
the same five items for weeks.

### 5 · The design-render lane still cannot succeed, and still gets reached

Issue 6 of the companion document, recurring. Story 365 has a UI surface, so `continue.md` mandates
the render lane. There is no `DESIGN.md`, no renderable `Route`, no committed mock, no binding
checklist, and **no `work.ui.baseUrl` in `.aof/aof.config.json`** — so the verdict can only ever be
`INCONCLUSIVE`.

The lane was skipped here and the `INCONCLUSIVE` carried forward from the prior verify, which saved
the ~20 discarded minutes the companion document measured on `352/07` — but that was an orchestrator
judgement call, not a gate. The prescribed behaviour is still to render first and discover
unrenderability afterwards.

### 6 · A finding was ledgered against a cause the config rules out

Story 367's finding **F-11** attributes non-deterministic test reds (35-then-4 failures) to *"six
specs running in parallel wipe each other's stubs mid-scenario"*, and ledgers a **house-wide** remedy
across 169 spec files on that basis.

`vitest.config.bdd.ts:27-38` sets `singleFork: true` and `fileParallelism: false`, with a comment
explaining why. **The specs do not run in parallel.** The flakiness is real; the stated cause cannot
be operating. A finding entered a register, acquired a house-wide remedy, and was carried into a
second verify pass without anyone reading the config it makes a claim about.

Nothing in the review lanes requires a finding's stated mechanism to be checked against the
configuration it asserts. `@executable` scenarios are verified; **findings are not.**

### 7 · The fix round has no scope discipline

`continue.md`'s review step says *"apply confirmed fixes"* — with no bound. The architect returned
eight items. All eight were dispatched as one round.

Of the eight, **two were blockers** (a contract row refused for the wrong reason, and an
operator-facing message that was false about a real vendor) and one was a falsified decision record.
The other five — an arch-test relocation, a type rename, a ledger entry, a `.gitignore` line, a
latent one-liner — were improvements nobody asked for, added to the critical path of a round the
operator was already waiting on.

This is the companion document's *"the build loop has no stop condition"* applied to the **fix**
beat. The same absence of a ceiling produces the same escalation.

---

## What worked

Recorded so the diagnosis is not read as a blanket indictment:

- **`aof work resume` was correct and decisive.** It answered "nothing in flight for 365" in one
  call — exactly the re-entry question — and it was right.
- **`aof work find` / `status` / `next` / `validate` were fast and accurate throughout.** The
  folder-name lookup resolved the ref instantly; `validate` passed and stayed passing.
- **`aof work status <ref> in-progress --if-applicable` behaved exactly as documented** — the
  `in-review → in-progress` move was legal, reported its edges, and needed no special-casing.
- **The architect agent self-corrected.** Told its graph was stale, it re-derived every load-bearing
  claim from source and *strengthened* one finding in the process. The role prompt produced genuinely
  independent judgement, including overturning two premises in its own brief.

---

## Proposed fixes

Suggestions, not measurements. Cheapest first.

1. **Expose spawned-agent liveness.** The output file's size and last-write time already exist.
   Surface them, and warn the orchestrator when a spawned agent has produced nothing for N minutes.
   This is the highest-value item here: it is a `stat` call, and it would have saved 37 of the 115
   minutes.
2. **Make `aof graph build` exit non-zero on timeout**, or stamp the artifact with a build time the
   reader must assert against. Silent staleness behind exit 0 is worse than no graph.
3. **Lease the working tree per session.** A second `aof:continue`/`aof:verify` targeting a checkout
   that already has a live lease should refuse, or say loudly what else is running. The fan-out case
   is already protected; the session case is not.
4. **Age out `runtime_offline` runs.** Distinguish a run that died minutes ago from one that died
   weeks ago, and stop reporting the latter as `READY`.
5. **Gate the render lane on renderability** — check for `work.ui.baseUrl` and a baseline before
   prescribing a screenshot, and record `INCONCLUSIVE` with its reason without paying for the
   attempt. (Unchanged from the companion document. Still not done.)
6. **Bound the fix round the way review should be bounded.** Blockers land in the round; non-blockers
   become work items. The companion document's stop condition — *"findings after round one become
   work items, not more rounds"* — applies verbatim to fixes, and was not applied here.
7. **Verify findings, not just scenarios.** A finding that names a mechanism should have that
   mechanism checked against the config or code it asserts, before it acquires a remedy. F-11 is the
   worked example.

**The through-line with the companion document:** every loop in this framework is bounded by somebody
noticing. The build loop, the review loop, the fix loop — and now the *wait* loop. The wait loop is
the cheapest to bound, and the only one where the missing signal already exists on disk.
