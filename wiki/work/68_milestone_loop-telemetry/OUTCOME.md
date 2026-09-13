# 68 · Loop telemetry — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

<!-- A milestone's outcome is AUTHORED, not concatenated from its stories'. The aggregation happens
     in the INDEX (`aof work memory ingest` unions every item's records into one recall surface), so
     a capability a story states whole is CITED here as `m68/SS`, never restated. What follows is
     what is true AT THE MILESTONE LEVEL that no single story's outcome states alone. -->

## Delivered

### aof measures its own spend on stored keys, end to end
The chain from spawn to answer runs on values written at the time they were true, with no
reconstruction step anywhere in it: the driver stamps a session id and OTel resource attributes at
spawn (`m68/01`), the settle copies that session's own token counts and prices them once
(`m68/02`), and observe resolves an agent run to an item by joining on the stored session id
(`m68/03`). No figure aof reports about its own cost is derived by matching free text.

### The four measured defects in this milestone's objective are each answered, and each answer is a different mechanism
The SPEC opened on four evidenced failures of the transcript miner. They did not share a fix:
double-counting is answered structurally, because a run belongs to one session which belongs to one
record (`m68/03`); the overwriting of cited evidence is answered by writing a new timestamped
artefact per run (`m68/05`); the classifier blind to this repo's toolchain is answered by
classifying on what a result EMITS rather than on the command name (`m68/03`); and the inability to
answer for one story is answered by a resolver that reads one level into `stories/` (`m68/04`).

### Absence is reported as absence, at every layer that could have guessed
One posture holds across the whole milestone rather than in any one story: a value that was not
measured is never folded in as zero and never inferred. `spend: null` reads *not measured* and is
distinct from a measured zero (`m68/00`); a run whose session never reported an id stays `null`
rather than being synthesised (`m68/01`); an agent run with no resolvable session is counted as
unattributed rather than assigned or dropped (`m68/03`); and observe carries `unmeasuredSpend` as a
count beside every total it prints, so a small total and an unmeasured one are distinguishable on
the face of the report.

### Every production path to the run fact goes through the transition seam
Both of the driver's production callers — the local drive command and the assignment sink — mint
and settle through `src/effects/run-transitions.mjs`, so every run this milestone added raises its
`run.started` / `run.completed` event and inherits the declared cascade. This was not true when the
milestone's stories were individually accepted: 68/01 first wired the drive command straight to the
store, which turned milestone 42's two ledger controls red and was caught only at this gate
(F-09, ADR-009).

### 68 records; it does not act
No cap, budget, timeout, reaper or routing decision landed. `run-store.heartbeat()` is still
unwired, nothing branches on `exitReason`, and no dispatch, lease or slot behaviour changed — the
scope refusal ADR-008 declared is intact at the close, and it is what makes milestones 69–72 a
measured before/after rather than a rewrite of what they are about to enforce.

## Assumptions

- **A collector is the project's to run, not aof's** — the OTel resource attributes set at spawn
  are useful only to a project operating its own OTLP collector; aof ships no receiver and reads
  none of them back (FF-6808), so every figure above is correct with no collector running anywhere.
- **The price table is a checked-in constant, versioned but not fetched** — `PRICE_TABLE_VERSION`
  in `src/run-store.mjs` is stamped onto each priced cost, so a later price change is detectable in
  the data; nothing updates the table automatically and a stale table yields confidently-wrong USD.
- **Spend is measured only where a settle passes its projects directory** — the drive and
  mesh-worker paths do; a settle from any other caller records `spend: null`, which reads as
  not-measured rather than as an error.
- **The toolchain classifier is a heuristic with a deliberate one-sided error** — a test run that
  emits no count-bearing markers is under-counted as `other`, which ADR-006's posture prefers to
  the retired regex's confident wrong zero.

## Gaps

### The measurements are true, and on this repo's own corpus they are almost entirely empty
- **Status:** open
- **Discharge condition:** run records minted by 68/01's producer accumulate for an item, or a
  stated backfill decision writes `sessionId` onto the historical records.
Every run record predating 68/01 carries `"sessionId": null`, so the join has nothing to join on:
`aof work observe 68` reports 0 agent runs across 0 sessions and 283 unattributed. This is the
milestone-level shape of `m68/03`'s own gap and the reason it is restated here rather than cited —
it is a property of the whole delivery, not of the join alone. aof's ACD work in this repo is
driven from the main session rather than through `aof work run`/`drive`, so the producer that
would fill the corpus is not on the path this repo actually uses. "The numbers are true" and
"there are no numbers" read very differently to a retrospective author.

### Four exit reasons are declared but unreachable
- **Status:** open
- **Discharge condition:** milestone 69 lands the loop enforcement that can end a run for these
  reasons.
`max_turns`, `timeout`, `stall` and `budget_exceeded` are accepted and recordable by the writer,
but no path in `src/` can produce them, because 68 enforces nothing (ADR-008). Only `final_output`,
`abort` and `error` are reachable at this close. Cited whole at `m68/00`.

### A story that breaks another milestone's control is invisible until this gate
- **Status:** open
- **Discharge condition:** either the cross-milestone control set runs per story, or `done` gains a
  reopen edge so a story caught at the gate can return to `in-review` without a hand-edited status.
F-09 was found at the milestone gate, against a story already accepted and marked `done`, and the
lifecycle offered no legal move back — `aof work status 68/01 in-review` was refused, so the story
read `done` on disk while a blocker stood against the code it delivered. The trade is the stated
one (`aof:verify` § Scope the suite to the item), and it was paid twice in this milestone.

### Residue in the seam this milestone delivered
- **Status:** open
- **Discharge condition:** F-05's five scenarios arrange the race they name, F-06's comment is
  rewritten to state that the driver awaits the handler, and F-10's two over-reaching classifier
  markers are qualified.
Three non-blocking defects are open against delivered code: a race guard that passes on defective
code roughly one run in four (F-05), a comment that describes the fixed race as still live (F-06),
and a classifier that still mis-calls ~1.1% of read-only inspection calls as test runs (F-10).
None makes the system do the wrong thing today; each makes a later reader believe something false.

### No declared control in this repo is known to be registered by a check
- **Status:** open
- **Discharge condition:** `work.controls.runners` is configured in `.aof/aof.config.json`, so
  `aof work doctor`'s leg B can ask whether a suite names each control file.
`aof work doctor` reports `control-runner-unchecked` for all eight of this milestone's controls,
and for every other control in the repo. Registration was confirmed by hand at each story's accept
(F-03); nothing checks it automatically, so a control that lands unregistered would read as
resolved while never running.
