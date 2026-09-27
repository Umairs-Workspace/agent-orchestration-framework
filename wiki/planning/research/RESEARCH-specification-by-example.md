# RESEARCH — Specification by Example for aof (discovery before formulation)

**2026-09-23.** Subject: whether aof should adopt Specification by Example (and its working format,
Example Mapping) as a discovery step before a story's contract is authored, and what that step would
be. Prompted by a conversation while drafting an answer to *"how do you validate your understanding
of a requirement before writing code?"*: the answer in practice is *turn the requirement into
specific cases with real values in them and walk them through with the people who own it*, and aof
has no step that does that with a person in it.

Method: the bundle prompts, the acceptance-criteria doctrine and the work stream were **read and
counted, not changed**. Every count below is a command over this tree on 2026-09-23 (§8 lists them);
every behavioural claim cites the file it was read from. External sources are in §9.

---

## 0 · The headline

**aof is very good at formulation and has no discovery.** It writes examples everywhere, but they
are written by agents, for coverage, after the behaviour has been decided. Specification by Example
says the value of an example is in the conversation that produces it, where a concrete case with real
values exposes a rule nobody stated or a question nobody asked. That conversation has no home in aof
today. Six findings:

1. **Formulation is mature.** 880 of 1,163 task features (76%) use a `Scenario Outline`, and
   `acceptance-criteria.md` already teaches the three zoom levels (headline Scenario, Examples table,
   step definitions). Nothing here needs rebuilding.
2. **The Three Amigos are three agents.** `refine.md` names the story Contract stage "Three Amigos":
   the PO agent writes headline Scenarios, `aof-qa` writes the Examples tables, `aof-developer` checks
   feasibility, and in solo mode one session plays all three (the same wording in `README.md:74` and
   `docs/acd.md:60`; no file in the tree mentions Specification by Example or Example Mapping). The practice exists to put business,
   development and testing *people* in one conversation; in aof no person is in it.
3. **aof's examples are a test matrix, not discovery.** `aof-qa`'s brief is *"the Scenario-Outline
   Examples tables in task features (boundaries, error codes, malformed inputs). The PO writes the
   headline outcome; you enumerate the cases."* That is exhaustive enumeration of a behaviour already
   decided. Discovery examples come earlier and do a different job: a few *key* examples per business
   rule, chosen to find the rule's edges and the questions nobody asked.
4. **Open questions are answered by the agent, not asked.** `--autonomous` refine takes *"documented
   default decisions for non-critical open questions"* and records them in `STATE.md`, stopping only
   for a blocking unknown. 30 of 83 `STATE.md` files record default decisions. Only 5 of 336
   `STORY.md` files and 2 of 73 `SPEC.md` files carry an open-questions heading. The PO agent has
   `AskUserQuestion` in its tool list, but nothing in refine says which questions must go to a person.
5. **Business rules have no home.** 0 feature files use Gherkin's `Rule:` keyword (the construct
   added in Gherkin 6 to hold an example map). `src/feature-parse.mjs` already tolerates `Rule:` as a
   header (lines 65 and 213), so the parser is not the blocker. Rules live implicitly in scenario
   titles or not at all.
6. **Provenance of example values is not recorded.** A reviewer cannot tell which rows in an Examples
   table a person stated or confirmed and which an agent proposed. For a coverage matrix that hardly
   matters; for a business rule it is the whole question.

The proposal (§5) adds one short artefact, an **example map** per story, and one beat at the head of
the Contract stage that produces it. Business-rule questions go to a person (through 131's channel
once it lands), a story with unanswered questions cannot reach build, and the confirmed key examples
become the headline scenarios. The existing Examples tables stay exactly as they are, as the test
matrix.

---

## 1 · The practice

### 1.1 Specification by Example

Gojko Adzic's *Specification by Example* (Manning, 2011; preceded by *Bridging the Communication Gap*,
2009) describes teams that pin requirements down with **concrete examples using real values**,
worked out collaboratively, which then become the executable specification and, over time, the
living documentation. Its process patterns, in order: derive scope from goals; specify
collaboratively; illustrate using examples; refine the specification (to **key examples**, not every
case); automate validation without changing the specification; validate frequently; evolve a
documentation system.

The load-bearing idea for aof: *a general sentence hides disagreement; a specific case exposes it.*
"Existing loan customers should be offered a credit card" sounds agreed until someone asks about the
loan customer who is in arrears.

### 1.2 BDD's three practices

The BDD community (Rose and Nagy's *The BDD Books*: *Discovery*, 2017; *Formulation*, 2021) splits
the work into **Discovery** (explore behaviour through examples in conversation), **Formulation**
(write the agreed examples as Given/When/Then) and **Automation** (bind them to code). A line widely
attributed to Liz Keogh puts the order of value: having conversations matters more than capturing
them, which matters more than automating them. aof's investment is almost entirely in the second and
third.

### 1.3 Example Mapping

Matt Wynne's format (Cucumber blog, 8 December 2015; presented at Agile2015). One story, four kinds
of card, a short timebox (about 25 minutes):

| Card | Holds |
|---|---|
| Story (yellow) | the story under discussion |
| Rule (blue) | each business rule or acceptance criterion the story implies |
| Example (green) | concrete examples under each rule, with real values |
| Question (red) | anything nobody in the room can answer |

The map is also a **readiness signal**: many red cards means the story is not ready; many blue cards
means it is too big and should be split; a rule with many green cards is complex; a rule with none is
not understood.

### 1.4 Three Amigos

Business, development and testing perspectives in one conversation before build (the term is usually
credited to George Dinwiddie). The point is the collision of viewpoints, which is why three instances
of the same model, briefed differently, recover only part of it.

### 1.5 Gherkin `Rule:`

Added in Gherkin 6 (late 2018) specifically so an example map can be written down: a `Rule:` groups
the scenarios that illustrate one business rule. `Example:` is a synonym for `Scenario:`.

---

## 2 · Where aof is today (measured)

| Fact | Value | Source |
|---|---|---|
| Task feature files | 1,163 | §8 (1) |
| … using `Scenario Outline` | 880 (76%) | §8 (2) |
| … with an `Examples:` table | 964 | §8 (3) |
| … using `Rule:` | 0 | §8 (4) |
| Scenario lines / of which Outlines | 8,115 / 1,802 | §8 (5) |
| Features tagged `@manual` / `@uat` | 248 / 102 | §8 (6) |
| `STORY.md` with an open-questions heading | 5 of 336 | §8 (7) |
| `SPEC.md` with an open-questions heading | 2 of 73 | §8 (8) |
| `STATE.md` recording default decisions | 30 of 83 | §8 (9) |
| Who writes the Contract | PO headline Scenarios, `aof-qa` Examples tables, `aof-developer` feasibility; one session in solo | `src/bundle/commands/refine.md`, story Contract |
| What QA's examples are for | "boundaries, error codes, malformed inputs" | `src/bundle/agents/aof-qa.md:16` |
| What autonomous refine does with open questions | "documented default decisions for non-critical open questions", stop only for a blocking unknown | `src/bundle/commands/refine.md`, `--autonomous` |
| PO's tools | includes `AskUserQuestion` | `src/bundle/agents/aof-product-owner.md:5` |
| Parser support for `Rule:` | tolerated as a header returning to description state | `src/feature-parse.mjs:65`, `:213` |

---

## 3 · The gap, stage by stage

| SbE / BDD stage | What it asks for | aof today |
|---|---|---|
| Derive scope from goals | the why before the what | SPEC objective and the user story in `STORY.md`. Present. |
| Specify collaboratively | the people who own the rule are in the conversation | three agents, no person. **Missing.** |
| Illustrate with examples | key examples with real values, per rule | examples exist, but as QA's coverage matrix, after the rule is decided. **Partly present, wrong job.** |
| Surface questions | red cards, asked of someone who knows | answered by the agent as a default decision. **Missing.** |
| Refine to key examples | a few that illustrate, the rest to tests | the three-zoom-level doctrine does this for formulation. Present. |
| Formulate | Given/When/Then, grouped by rule | Given/When/Then yes; grouping by rule never (`Rule:` in 0 files). **Partly present.** |
| Automate without changing the spec | the scenario is the test | the traceability lint and `@executable`. Present. |
| Living documentation | the spec stays true | delivered features are immutable, superseded by ADR. Present. |

aof has the back half of the method and not the front half.

---

## 4 · Why this matters more with agents than with people

A human team that skips discovery still has hallway conversations that catch some of it. An agent
team has none, and an agent's failure mode is exactly the one examples expose: **it fills a gap with a
plausible answer and moves on.** A default decision recorded in `STATE.md` is honest, but it is found
at review, after contracts are authored, when changing it costs an amendment round (the milestone-52
measurement in `refine.md`: thirteen runs, 38% of agent-active time, existed only to re-apply deltas
to authored contracts).

A key example with real values is the cheapest place for a person to intervene. Reading
*"a loan customer in arrears applies for a card: offered / not offered?"* takes seconds and needs no
knowledge of the code. It is also the question an agent is least equipped to answer, because the
answer is policy, not engineering. This is the same principle as 131 (the human in the loop): a
session that needs a human asks, it does not guess.

---

## 5 · Proposal (for discussion, nothing decided)

### 5.1 The example map: one short artefact per story

A `## Example map` section in `STORY.md` (or a sibling `EXAMPLES.md`, see §7 Q1), written in the
Contract stage before any `.feature`:

```markdown
## Example map

### R1 · An existing loan customer is offered a credit card
- E1 · active loan, up to date → offered              [stated: operator, 2026-09-23]
- E2 · active loan, two payments in arrears → not offered   [confirmed: operator]
- E3 · loan settled last month → offered              [proposed: agent]

### R2 · A new customer sees the standard journey
- E4 · no account → standard card journey             [confirmed: operator]

### Questions
- Q1 · Does a customer in a payment plan count as in arrears?   [open → asked 2026-09-23]
```

Each example carries its **provenance**: `stated` (the person gave it), `confirmed` (the agent
proposed it and a person agreed), `proposed` (agent only). Questions carry their state: open, asked,
answered (the answer turns into an example).

### 5.2 A discovery beat at the head of the Contract stage

Before the Three Amigos formulate anything, the PO agent drafts the map from the user story and SPEC:
the rules it implies, two or three key examples per rule with real values (always including the
awkward edge), and every question it cannot answer from the record. Business-rule questions go to a
person: `AskUserQuestion` in an interactive session, 131's notifier when the refine is loop-driven.
Technical questions (which library, which seam) stay with the architect and may still take a
documented default.

### 5.3 A readiness gate

- A story with an **open business-rule question** cannot move to build. `aof work doctor` reports it
  (for example `example-map-open-question`) and the Contract stage stops on it.
- A rule with **no example** warns: the rule is not understood yet.
- Many rules on one story warns: the Example Mapping split signal, measured against the story's task
  count.
- In `--autonomous`, business-rule questions are the one class that may not take a default decision;
  they batch into the single end-of-cascade review as questions, not as defaults.

### 5.4 Formulation keeps two kinds of example apart

- **Key examples** (from the map) become the headline Scenarios, grouped under `Rule:` blocks, with
  the rule's name on the block. The parser already tolerates the keyword.
- **The test matrix** (QA's Examples tables: boundaries, error codes, malformed inputs) stays exactly
  as it is, under the headline scenarios. `acceptance-criteria.md`'s zoom levels are unchanged: the
  map adds the level above them.

### 5.5 Traceability

The existing lint ties every `@executable` scenario to a passing test. The extension ties every
`confirmed` or `stated` example to a scenario or an Examples row, so an example a person agreed can
never silently fall out of the contract. `proposed` examples are not required to survive.

### 5.6 Proportion

Off for chores and spikes (they already refuse refine). Optional per project through config (for
example `work.examples.enabled`, defaulting off, as `work.plan.enabled` does for `PLAN.md`). Small,
purely technical stories can declare the map not applicable in one line.

---

## 6 · Risks, and what it must not become

- **Ceremony.** Example Mapping works because it is short. A map that grows past a screen is a story
  to split, not a document to write; the doc-budget lane can hold it to size like `PLAN.md`.
- **Fake confirmation.** An agent must never write `confirmed` or `stated`. Only an answer recorded
  from a person (the `AskUserQuestion` result, 131's answer record) may upgrade provenance, and the
  check for that belongs in code, not in the prompt (the cap-in-a-prompt lesson).
- **Smuggled design.** The litmus test still applies to examples: an example states an observable
  outcome with real values, never how the code produces it.
- **Duplicating the matrix.** Key examples illustrate; the matrix covers. If a map row and a table
  row say the same thing, the map row is the headline and the table keeps the edge cases.
- **Slowing the loop.** A business question that blocks one story must not halt the wave; with 131,
  that lane waits and the others build.

---

## 7 · Open questions (to talk about)

1. **Where does the map live?** A section in `STORY.md` (one record, visible at review) or a sibling
   `EXAMPLES.md` (own budget, own lint target)?
2. **Which questions must go to a person?** Is "business rule versus technical choice" the right
   line, and who classifies a question, the PO agent or a rule in code?
3. **Does it need 131 first?** Interactive refine can use `AskUserQuestion` today; loop-driven refine
   needs 131's notifier and answer path to ask without halting.
4. **`Rule:` blocks or a feature per rule?** `Rule:` keeps one task feature per coherent unit; a
   feature per rule may fit aof's task granularity better. Also check that the projects' BDD runners
   (vitest-cucumber and the rest) bind scenarios under `Rule:`.
5. **Provenance vocabulary.** Is `stated / confirmed / proposed` enough, or does a `ruled` (decided by
   an ADR) belong too?
6. **Milestone level.** Does the SPEC get a lighter map (rules only) at break-down, so stories are cut
   along rules?
7. **Measuring whether it works.** Candidate: amendment rounds and review findings of type
   *misunderstood requirement* per story, before and after, on a few milestones.

---

## 8 · Commands (2026-09-23, from the repository root)

```sh
# (1) task feature files
find wiki/work -name "*.feature" | wc -l                                   # 1163
# (2) features using Scenario Outline
grep -rl 'Scenario Outline' --include=*.feature wiki/work | wc -l          # 880
# (3) features with an Examples table
grep -rl '^\s*Examples:' --include=*.feature wiki/work | wc -l             # 964
# (4) features using Rule:
grep -rl '^\s*Rule:' --include=*.feature wiki/work | wc -l                 # 0
# (5) scenario lines, and outlines among them
grep -rh '^\s*Scenario' --include=*.feature wiki/work | wc -l              # 8115
grep -rh '^\s*Scenario Outline' --include=*.feature wiki/work | wc -l      # 1802
# (6) @manual / @uat features
grep -rl '@manual' --include=*.feature wiki/work | wc -l                   # 248
grep -rl '@uat' --include=*.feature wiki/work | wc -l                      # 102
# (7) STORY.md with an open-questions heading
grep -li '^#\+ .*open question\|^#\+ open' $(find wiki/work -name STORY.md) | wc -l   # 5 of 336
# (8) SPEC.md with an open-questions heading
grep -li '^#\+ .*open question' $(find wiki/work -name SPEC.md) | wc -l               # 2 of 73
# (9) STATE.md recording default decisions
grep -li 'default decision\|documented default\|defaulted' $(find wiki/work -name STATE.md) | wc -l   # 30 of 83
```

Counts (7) to (9) are heading and phrase matches, so they are floors: a question or a default
recorded in other words is not counted.

---

## 9 · Sources

- Gojko Adzic, *Specification by Example: How Successful Teams Deliver the Right Software*, Manning,
  2011; and *Bridging the Communication Gap*, Neuri, 2009.
- Matt Wynne, "Introducing Example Mapping", Cucumber blog, 8 December 2015:
  <https://cucumber.io/blog/bdd/example-mapping-introduction/>; also the Cucumber docs page
  <https://cucumber.io/docs/bdd/example-mapping/>.
- Cucumber, "Gherkin Rules" (the `Rule:` keyword, Gherkin 6):
  <https://cucumber.io/blog/bdd/gherkin-rules/>; Gherkin reference
  <https://cucumber.io/docs/gherkin/reference/>.
- Seb Rose and Gáspár Nagy, *The BDD Books: Discovery* (2017) and *Formulation* (2021).
- In this repository: `src/bundle/commands/refine.md` (story Contract, `--autonomous`,
  amendment ratification), `src/bundle/agents/aof-qa.md`, `src/bundle/agents/aof-product-owner.md`,
  `wiki/acceptance-criteria.md` (zoom levels, litmus), `src/feature-parse.mjs`,
  `wiki/work/131_milestone_the-human-in-the-loop/SPEC.md`.
