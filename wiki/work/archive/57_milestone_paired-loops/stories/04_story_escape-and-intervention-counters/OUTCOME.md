# 04 · Escape and intervention counters — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### `aof work counters <ref>` reports both counter-metrics for one item and its direct children
A registered CLI command returns `{ ref, escape, intervention }` for a milestone (itself plus its stories) or for a single story, rendered as two lines and available verbatim under `--json`.

### A finding raised after an item was accepted is an escape, attributed to the item it escaped from
The escape counter compares each `kind: "raw"` feedback entry's `at` against the acceptance moment of items reading `status: done`, reports a per-item count with the escaping entries' ids, and totals them across the scope it was given; classification records are not in the denominator.

### Acceptance is read at day granularity and resolved conservatively
A date-only stamp is treated as `T23:59:59.999Z`, so a finding raised on the same day as acceptance is not an escape; full ISO instants keep their exact ordering.

### An intervention is a retry, a resume, an exhausted attempt ceiling or a non-retryable failure
The intervention counter reads run records already on disk and classifies per run: a record carrying `retryOf` is one intervention — `resume` when the run it retries carries `resumeAfter`, otherwise `retry` — and a terminal failure that was never retried is `attempts-exhausted` (at or above the configured ceiling, or `attempts_exhausted` by name) or `non-retryable-failure`.

### The count never exceeds the run total it is reported against
A retried run contributes exactly one intervention regardless of how its own attempt later terminates, so `count`, `runs` and `rate` are a coherent triple and `rate` is always in `[0, 1]`.

### A counter with no evidence reports that it cannot measure, and carries no count key at all
`status: "unmeasurable"` with a `reason` of `accepted-items-absent`, `feedback-absent` or `runs-absent` is returned instead of a number, and the result object has no `count` property — so a consumer cannot read a zero that was never measured. A genuine zero returns `status: "measured"` with `count: 0`, and the two are distinguishable without inspecting the number.

### A partly measurable scope reports what it measured and names what it could not
`measuredItems`, `unmeasuredItems` and `missing` accompany every measured result, and the rendered line appends `; N item(s) unmeasured`.

### The arithmetic is a pure leaf and every record read is at the command boundary
`src/work-counters.mjs` imports nothing and reaches no filesystem, process or clock; `src/commands/counters.mjs` holds the only reads (`readFeedbackRecords`, `readRuns`, the record's frontmatter) and no write API of any kind. Both properties are enforced by `test/arch/acd-work-counters-read-only.test.mjs`.

### Nothing new is written to disk by either counter
No instrumentation was added, no record gained a field, and both counters are readers over records milestone 20 and the feedback path already produce.

## Assumptions

- **The feedback ledger and the run store are the only evidence** — a quantity not already in `FEEDBACK.ndjson` or a run record is reported unmeasurable rather than estimated, so a scope with no ledger yields no number no matter how much work it contains.
- **Acceptance is approximated by the record's `updated:` stamp** — no work record carries an acceptance timestamp, so the counter reads the field `aof work status <ref> done` writes; a later hand-edit that bumps `updated:` moves the boundary forward and can only remove escapes (`F-57-04-1`).
- **A raw feedback entry is a finding** — every `kind: "raw"` entry with a parseable `at` counts, whether or not it was ever triaged as a defect; the ledger records no severity the counter could filter on.
- **The attempt ceiling comes from `work.autonomous.maxAttempts`** — a scope run under a different ceiling than the one now configured has its exhausted-ceiling classification judged against today's value.
- **A park-then-resume mints a second run record** — the `resume` classification is reachable only because `applyTransition` writes `resumeAfter` onto the parked record and the retry mints a fresh run carrying `retryOf`.

## Gaps

### Neither counter is wired to any loop
- **Status:** open
- **Discharge condition:** `57/05`'s pairing table gives the review loop and the autonomous cascade `kind: watcher` nodes whose `measurement` names `command:work:counters`, and `FF-5707` proves those pointers resolve.
- Both counters exist, are registered and run on demand. No watcher record points at either, no gate consumes their result, and an escape or an intervention is visible only to whoever types the command.

### An unmeasurable counter does not weaken the pairing gate
- **Status:** open
- **Discharge condition:** a check that reads a watcher's counter result, not only its `monitoring` edge, when deciding whether an optimizing loop is watched.
- Pairing is structural: a loop with an inbound `monitoring` edge is reported watched even when the counter behind it reports `cannot measure`. The unmeasurable verdict is honest in the counter's own output and invisible to the gate.

### The escape counter has no notion of which review let a finding through
- **Status:** open
- **Discharge condition:** a recorded link from a feedback entry to the review pass it postdates.
- A finding is attributed to the item it escaped from and to nothing finer. An item reviewed three times before acceptance yields the same number as one reviewed once, so the counter measures the loop's aggregate leakage rather than any pass's.

### No threshold, trend or target exists for either number
- **Status:** open
- **Discharge condition:** a consumer that reads a rising escape count or intervention rate as a signal about the loop rather than as a datum.
- Both counters report a count and a denominator. Nothing compares them against a previous run, a target or each other, so a loop degrading steadily looks identical to one holding steady.

### The command boundary is covered structurally, not behaviourally
- **Status:** open
- **Discharge condition:** a behavioural contract over `observeCounters` and the CLI adapter against a scaffolded work tree with feedback and run records.
- `observeCounters`, `itemObservation`, `renderCounter` and the CLI adapter are asserted by an arch-test over their source text and by the registry lane's smoke pass; no scenario drives them over real records. `F-57-04-2` is the defect that gap left in place.
