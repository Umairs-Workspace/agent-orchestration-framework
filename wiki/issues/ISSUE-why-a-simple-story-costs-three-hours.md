# ISSUE · Why a simple story costs three hours

**2026-08-16.** Subject: the AOF framework. Evidence: story `352/07` of a downstream work stream.

The issues below were found while investigating why `352/07` — a one-sentence user-facing outcome —
cost ~3 hours. They are listed as found.

---

## The two root causes

### 1 · Every phase re-orients from zero

`352/07` ran five agent phases: build, architect review, QA review, fix, amendment. Each boots blank
and re-reads the milestone to orient — a 292 KB `ARCHITECTURE.md`, 100 KB `STATE.md`, 83 KB
`DESIGN.md`, plus SPEC, RESEARCH and the contract. **≈610 KB, re-read five times, for one story.**

That is what **1.66M output tokens across 655 tool calls** bought.

**The cost does not scale down.** A trivial story and a hard one pay the same orientation toll,
because nothing sizes it. This is why "the story was simple" and "it took three hours" are not in
tension.

`STORY.md` already contains most of a usable brief — `352/07`'s carries eight ⚠ notes resolving the
exact ADR/DESIGN/SPEC references for that story. The extraction is performed at refine and then
discarded; agents are still pointed at the source tree.

### 2 · The build loop has no stop condition

The build was green after round one. Rounds two through five were quality escalation nobody
requested. Of 176.5 min of agent time, **72 was building; 104 was rounds.**

`continue.md:7` still reads *"Build a work item's tasks until every `@executable` scenario is green"*
— no ceiling. The only `ceiling`/`attempts` hits in that file (lines 38, 43) are the mesh run-retry
ceiling on the **validate** gate, which is a different, later gate.

---

## The measurements

**`352/07` — where the ~3 hours went.** From `story-07-session-cost.md`, which states it is
hand-written from task-notification telemetry and **not** machine-derived.

| Round | Agent time | Tool calls | Output tokens |
|---|---:|---:|---:|
| Build | 71.7 min | 268 | 511k |
| Architect review | 31.0 min | 126 | 284k |
| QA review | 23.5 min | 72 | 272k |
| Fix round | 38.6 min | 162 | 287k |
| Amendment round | 11.7 min | 27 | 310k |
| **Total** | **176.5 min** | **655** | **1.66M** |

Reviews ran concurrently → **≈2h53m** wall. That figure **excludes the contract-authoring round**,
which `aof work observe` records separately at 31m50s active / 1h24m wall. Counting it, `352/07`
cost **≈208 min**.

**What the story produced.** 31 files, 4,727 insertions: **3,632 test / 1,095 production — 3.32:1**.
Its contract: 4 features, **1,672 lines of Gherkin, 48 scenarios, 20 `Examples:` blocks**.
Milestone-wide: 37 `.feature` files, 1,179,627 bytes.

**Milestone 352 overall**, from a live `aof work observe 352`: span **50h00m**, real active
**21h29m**, real idle **28h31m**, **16 agents stalled**, parallelism **1.39×**.

---

## The other issues found

### 3 · Dead air, with no watchdog
**6h54m** (14% of the milestone span) with the main thread quiet, nothing driving, and no human
asked. Largest gaps 2h11m, 1h20m, 40m — each woke on a task-notification. Nothing detects or closes
these windows.

### 4 · Grind — the test suite is the inner-loop cost
20 agents flagged grinding. Worst case, story `352/04`'s developer: **33% of active time waiting on
the toolchain, 61 test runs averaging 55s with a 600s worst case**, one spec file edited 14×, one
command re-run 35×, 52 error-ish results. The developer re-runs the full suite after ~every edit.

### 5 · `orchestrated` mode is static, but the correct answer is derivable
`work.agents.mode` is a fixed config value. `352/07` had **no siblings to parallelise against** — 08
and 09 both `depends` on it — so five-agent fan-out paid full cold-start cost and bought nothing.
`aof:continue` already computes the ready set from the `depends` graph; a ready set of one is
knowably solo before any agent spawns. Nothing checks.

### 6 · The design-render lane is unconditional and cannot succeed on auth-gated routes
`continue.md:125-134` mandates rendering every DESIGN surface at 390/768/1280 for any UI story. It
defines `INCONCLUSIVE` as the outcome when no render is available, but has **no gate that skips the
lane when the surfaces are known unrenderable**. Auth-gated admin routes can only ever reach
`INCONCLUSIVE`. Reported to have done so on `352/06`, and to have consumed ~20 discarded minutes on
`352/07`. It also prescribes `npx playwright`, which is policy-blocked on this machine.

### 7 · Observability is milestone-only and post-hoc
- `aof work observe 352/07` fails — *"No milestone folder under wiki/work matching 352/07"*
  (`work-observe.mjs:1021`). You cannot ask why **one story** was slow.
- The committed `observability/report.md` predates story 07 entirely. It is an autopsy; nothing
  reports during a run.

### 8 · Sequencing — contract amendments ratified in the wrong beat
The two PO contract amendments were knowable when QA raised them, but were ratified **after** the fix
round, so the developer re-opened files it had just closed. That is the entire 11.7-minute amendment
round.

---

## Why none of this has changed

Both root causes were diagnosed, scoped and costed in
[`PRD-acd-loop-performance.md`](../planning/PRD-acd-loop-performance.md) **in 2026-07**, a month
before `352/07` ran:

> *"Every iteration starts cold… Every fix-loop respawn re-reads config, SPEC, ADRs, DESIGN, all
> `.feature` files."*
>
> *"The build-to-green inner loop is the only uncapped loop in the framework."*

Shipped status of its five loop-discipline levers:

| Lever | Shipped |
|---|---|
| (a) build-loop cap in `continue.md` | **No** |
| (c) delta re-review after a fix loop | **No** |
| (d) consolidated per-story build brief | **No** |
| (e) targeted test execution during the loop | **No** |
| `developer → opus` (model-economics) | **Yes** |

**The PRD has zero work items.** It is one of only two PRDs on disk cited as `origin:` by no work
item; every other has produced between 2 and 10 milestones. Its four named milestones —
`loop-telemetry`, `model-economics`, `loop-discipline`, `headless-driver-hardening` — exist as no
folder in `wiki/work/` and appear nowhere in `ROADMAP.md`.

**Four milestones defer their own bounds to it:**

| Item | Status | Defers |
|---|---|---|
| **53** loop-artifact | in-progress | *"Loop economics — telemetry, budget, model map, **the cap's value**… all owned by `PRD-acd-loop-performance.md`."* (`SPEC.md:84`) |
| **54** verification-loop | **not-started** | *"The bound itself is deliberately not this milestone's to choose: **the cap belongs to the loop-performance arc**… This milestone enforces a bound; it does not invent its value."* (`SPEC.md:38`) |
| **62** self-improvement-loop | not-started | *"Trace collection and telemetry economics — `PRD-acd-loop-performance.md`."* (`SPEC.md:62`) |
| **65** concurrent-story-dispatch | done | *"**Does not address.** Issue 2 (grind — `PRD-acd-loop-performance.md`)"* (`RESEARCH.md:160`) |

**The deadlock:** milestone 54 builds the machinery to enforce a cap and refuses to pick `N`, because
`N` belongs to loop-performance. Loop-performance has no milestone in which to pick it. 54 is
`not-started`.

The loop is not undiagnosed. It is unscheduled — and four milestones are waiting behind the thing
that was never put on the board.

---

## Proposed fixes

Suggestions, not measurements. The PRD's own ordering, cheapest first.

1. **Schedule the arc.** `PRD-acd-loop-performance.md` needs work items. Until it does, 54 stays
   blocked on a number nobody is scheduled to choose.
2. **Targeted test execution** — the PRD's own "highest-confidence, cheapest win", and
   model-independent. Failing spec while converging; full suite once at the gate.
3. **The build brief** — compile `STORY.md`'s already-resolved references once at continue-start and
   pass it in the spawn prompt, not as a path. Split the 292 KB `ARCHITECTURE.md` into per-ADR files
   so a story reads its slice; story frontmatter already declares which ADRs it needs.
4. **The build-loop cap**, and its value — 54's blocker.
5. **Gate the render lane** on renderability; record the reason and skip.
6. **Derive solo vs orchestrated from the ready set** rather than static config.

**A stop condition, concretely:**

- **Build is done** when every task feature is green, typecheck/lint clean, arch tests pass.
- **Review is one round by default.** A second requires a named blocker — a production defect, a
  guard that protects nothing, or a contract violation.
- **Findings after round one become work items, not more rounds.** This is the load-bearing part: it
  turns an unbounded loop into a bounded one with a queue behind it.
- **Contract amendments ratify in the review beat that raised them.**

**This is not "review is too expensive."** `352/07`'s first review round found a live production 500
and three fitness functions guarding nothing. The cap belongs on **rounds**, not on review.
