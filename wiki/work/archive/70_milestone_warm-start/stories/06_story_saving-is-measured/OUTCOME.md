# 06 · The saving is a number, not a claim — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The stream carries a measured phase, where every run record said `unmeasured`
Run `20260824T101918473Z-0005` is settled `done` with `brief.loop.phase: "continue"` and a `spend`
envelope carrying all four token buckets, the model, the effort key and a priced cost source
(`$4.0940`, `price-table-2026-08-v1`). `aof work observe` reports a cache ratio of **12.921** for that
phase instead of `unmeasured`.

### The milestone's before-and-after is a committed artifact, not a claim in a commit message
`observability/snapshots/2026-08-24T10-28-17-153Z/report.md` holds every figure this milestone is
judged by, each re-read rather than quoted: a 143-row baseline across six pre-70 milestones
(2026-08-08 → 2026-08-14), the after side taken by the same per-agent instrument, the delta for each
headline figure, four figures reported **not taken** with a reason each, the sample size behind every
number, and the confounders that bound them.

### A delta that went the wrong way is recorded with its measured direction
The per-agent cache read÷create ratio is stated as **23.936 → 10.383, a regression**, with the
structural reason it is probably a lifetime artefact and the explicit statement that the comparison
cannot settle whether prefix sharing improved. The comparison is not restricted to the figures that
improved.

### `work.observability.cacheRatioTarget` is a number derived from a measurement
Set to **13** — `ceil(12.921)`, the smallest integer strictly above the worst measured phase — and
recorded with the run count, phase count and date it was taken over. The report states it, and states
`missed` for the measured phase.

### The cache-ratio verdict actuates nothing
`cacheRatioTarget` and `cacheTargetStatus` are read in exactly two modules, both reporting surfaces
(`src/commands/observe.mjs`, `src/work-observe.mjs`). No loop, drive, run-store or transition module
reads either: a missed target fails, retries, caps and kills no run.

### A directive crosses the PTY as ONE atomic input at any length
The body is written as a bracketed paste and the Enter follows as its own write, after a settle
derived from the caller's readiness delay. A 43-line directive that previously arrived as eight
separate user turns now arrives as one; the live transcript records it as a single 1,249-character
message with no ESC byte in the content.

### A directive body cannot close its own paste
An end-of-paste sequence occurring inside assembled brief content is stripped before the write, with a
coded `directive-paste-marker-stripped` degrade, so content can never be reinterpreted as protocol.

### A settled run is never sent a late Enter
The queued submit reads the settle flag at fire time as well as being cleared at cleanup, so a PTY
that exits on the body write cannot receive a keystroke afterwards.

### A worker session no longer presents as a child of the operator's Claude Code session
The launch env is scrubbed of `CLAUDECODE`, every `CLAUDE_CODE_*` key, `CLAUDE_PID`, `CLAUDE_EFFORT`
and `CLAUDE_AGENT_SDK_VERSION`. With those inherited, a real turn ran to completion and **no
transcript was written at all**, leaving the session id, the spend envelope and the phase ratio
permanently absent; scrubbed, the transcript appears ~2s after the directive write. Everything aof
sets for itself is set after the scrub, so the widened scrub cannot eat the 1-hour cache window.

### The folder-trust pre-write lands under the key `claude` actually reads
Trust keys are normalised to the separator spelling `claude` uses. `~/.claude.json` held **661**
backslash-spelled project keys carrying exactly one field each — aof's own write, never read — beside
`claude`'s own forward-slash keys for the same directories.

### The shared PTY double separates the wire from the input, and consumers no longer re-derive it
`createScriptedPty` exposes `pty.writes`/`rawChunk` as the bytes written and `chunk` as the input a
paste-aware terminal would present. Suites that previously carried their own paste-strip now read the
view they mean, and the local re-derivations were deleted rather than duplicated. A transport change
invalidates doubles in one place instead of in every suite that models a spawn.

## Assumptions

- **`claude` enables bracketed paste itself** — measured at `ESC[?2004h` ~1.9s after spawn, inside the
  readiness delay, so the markers are consumed as protocol. The framing is applied unconditionally to
  every provider; see Gaps.
- **The submit settle derives from the readiness delay, never a second knob** — a call site that wired
  readiness but forgot a submit window would otherwise type a directive that is never sent.
- **The measurement is n=1, in a fixture repository** — one settled run under `aof work loop 01
  --cap 1` in `aof-test-repo`, with n=2 on the after side's per-agent figures.
- **The committed pre-70 snapshots are the only admitted baseline available** — the second baseline
  task 01 admits (the same reader re-run over pre-70 sessions) returns nothing; see Gaps.

## Gaps

### The delta does not answer whether the milestone paid for itself
- **Status:** open
- **Discharge condition:** a matched-workload per-agent measurement — before and after taken on
  comparable work in a single repository — so the ratio and the ingest figures are attributable to
  prefix sharing rather than to workload.
The two sides come from different repositories, the before is hours-long production milestones against
~9 minutes on a one-function fixture, and read÷create rises with agent lifetime. The human deciding
read the delta and stated that it does not settle the question. Recorded as `m70/F-22`.

### ADR-005's effort routing is not evidenced by any measurement
- **Status:** open
- **Discharge condition:** a measured run whose `spend.effort` carries a resolved per-phase effort
  rather than `"unknown"`.
The envelope carries all six required keys and is honest about the absence, but the fixture repo
configures no `work.agents.session`, so no effort was resolved to pass. The stable-prefix flag, the
1-hour window and the model were carried. Recorded as `m70/F-26`.

### The framing is unconditional across providers, and only `claude` is measured
- **Status:** open
- **Discharge condition:** the framing is gated on an observed `ESC[?2004h` from the provider, or a
  non-`claude` provider's paste handling is measured and recorded.
`terminal-providers.mjs` resolves three runtimes; a provider that never enables paste mode would read
`ESC[200~` as literal input. The one test that would have caught it drove a real provider shim, and
that shim is now paste-aware — correctly, since it stands in for `claude` — so the signal is gone.
Recorded as `m70/F-28`.

### The reader attributes no pre-70 session, so one admitted baseline route is dead
- **Status:** open
- **Discharge condition:** `aof work observe` attributes historical sessions to their milestone again,
  or reports why runs went unattributed instead of returning an empty agent list.
All six baseline milestones report `agentCount = 0` with **284** unattributed agent runs, though the
transcripts are still on disk. Recorded as `m70/F-23`.

### The derived-settle rule has no guard of its own
- **Status:** open
- **Discharge condition:** an assertion fails when a call site introduces a second submit-timing knob
  instead of deriving it from the readiness delay.
The rule is stated in ADR-004's amendment and honoured in the code, and nothing enforces it. Recorded
as `m70/F-25`.
