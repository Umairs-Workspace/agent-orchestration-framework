---
doc: architecture
---
# 192 · Discovery researches the domain before it asks — Architecture

The SPEC asks for four things: two labels where there was one, a research step before a person is
asked, an operator profile, and a question that explains itself. ADR-001 is the map's grammar,
ADR-002 the gate that judges it, ADR-003 the profile, ADR-004 the routing (who is asked what, and
when), ADR-005 the shape of a question, ADR-006 the switch (it is off unless a project turns it on,
and its prose ships as fragments of the practice), and ADR-007 the break-down.

Revised 2026-11-12, the day it was written and before anything was built, at the operator's
review: the practice became opt-in, and its prose moved from core's commands to fragments that
milestone 193 makes possible. ADR-003 §8–§9, ADR-004, ADR-005 §5, ADR-006 and ADR-007 changed.

## Memory recall: what was surfaced, and what it changed

Recall `9a62a92f-ba18-464b-b96b-b22b40aa696a` (architect, "example map question classes domain
policy researched provenance operator profile config") returned five ADRs and no near-miss:

- **154/ADR-002**, "Resolve runtime and model once, retain provenance". **Honoured.** The profile
  is resolved by one function, and `aof project show` keeps where each value came from (ADR-003).
- 154/ADR-004, 154/ADR-005, 49/ADR-001 and 62/ADR-003 do not bear on these decisions.

The PO recall for the milestone's domain (`81ab7638-b609-41c1-9b3c-528eb4acbd15`) came back empty.

One operator rule from the session's own memory shaped ADR-006: a config key whose absence keeps the
old behaviour owes its adoption path in the same milestone. Here that path is split: this
milestone says what a project that turned the switch on still needs, and milestone 193 says that
the switch exists.

## Measured facts this document reasons from

Measured 2026-11-12 on `fb39cc73` (branch `feature/discord-remote-control`). Graph:
`aof graph build .`, built `2026-11-12T16:28:59Z`, code only, no egress, 21,528 nodes.

| Fact | Where |
|---|---|
| The map's grammar is closed and has one parser, a leaf with no imports. Four modules of its package import it | `packages/specification-by-example/src/map.mjs:19-25`; `aof graph impact` |
| A class the grammar does not admit reads `business`, and a state it does not admit reads `open` | `packages/specification-by-example/src/map.mjs:194-195` |
| A `business` question is closed only by `answered` | `packages/specification-by-example/src/map.mjs:257` |
| The trace requires every example that is not `proposed` | `packages/specification-by-example/src/map.mjs:390` |
| The lane and the build door share one judgement, `examplesFindings`. The lane has one dependent, core's binding | `packages/specification-by-example/src/doctor-lane.mjs:73`; `aof graph impact` |
| The story probe reads through the engine's own `fileState`, only with the gate on and the map present | `packages/specification-by-example/src/story-probe.mjs:16-24` |
| A finding anchored at the work directory is stream-level: it is reported once, whatever the scope | `packages/work/src/doctor/index.mjs:1028-1036` |
| `loadWorkspace` already lays one global block under the project's, in memory only: `mesh` | `packages/core/src/application/bindings/work.mjs:167-171` |
| `aof project show --json` already answers resolved settings with their source (`memory`, `delegation`) | `packages/core/src/application/bindings/config-inspect.mjs:135-139` |
| The examples gate's resolver and validator sit together, and the block is closed | `packages/core/src/application/bindings/config-inspect.mjs:1445-1479` |
| Config vocabulary that several packages read lives in `@aof/contracts` (`agent-mode.mjs`, `loop-bounds.mjs`), whose source row is at its ceiling of 9 | `packages/contracts/src`; `test/arch/testing/acd-source-directory-budget.test.mjs:120` |
| `aof work init-config` is the one config writer. `aof:init` renders the bundle before it writes any config | `packages/core/src/application/bindings/work/init.mjs:308`; `packages/core/assets/commands/init.md` (steps 1 and 3) |
| About 20% of `refine.md` (462 lines) is prose gated on `work.examples.enabled` or `work.plan.enabled`, which a project with both off still loads | measured 2026-11-12 over `packages/core/assets/commands/refine.md` |
| The render already drops what a project has not enabled, but only whole members; a practice cannot contribute part of a command | `packages/core/src/work/bundle-synthesis.mjs:68`; `packages/core/src/practices.mjs` |
| Rendered commands are committed files in this repository | `.claude/commands/aof/refine.md` |
| `aof work update` already prints the project doctor's adoption warnings for a new key | `packages/core/src/application/bindings/commands/init-update.mjs:270` |
| The loop's ask already carries `I would pick:`; the interactive discovery question does not | `packages/execution/src/session-driver.mjs:163`; `packages/core/assets/commands/refine.md` |
| The Codex bodies of `refine` and of each role brief are authored a second time, by hand | `packages/core/assets/variants/codex/workflow.md:410`, `:549`, `:3814` |
| `RESEARCH.md` has no grammar code reads today; its headings differ by milestone | `wiki/work/191_milestone_discord-remote-control/RESEARCH.md:11` |
| `packages/core/assets/manifest.json` hashes every bundle asset, so two stories that change prose both write it | 134/ADR-007 |

## ADR-001 — The map tells a fact from a decision

### Context

Today a question is `business` or `technical`, and one nobody can place is `business`. So "what
does the regulation require" and "what risk will you accept" are the same kind of line, and both
can only be closed by the operator's answer. The grammar has to say which is which, and has to give
a fact a way to be closed that is not a person and is not a default.

### Decision

1. **Three classes for a new map, and the old one still reads.** `QUESTION_CLASSES` becomes
   `domain`, `policy`, `technical` and `business`.
   - `domain` is a fact about the world: a regulation, an industry convention, how a process
     normally runs.
   - `policy` is a choice only the operator or their client can make.
   - `technical` is unchanged.
   - `business` is the old spelling of `policy`. Every reader treats the two alike. It stays in
     the grammar for good, because a delivered map is never rewritten, and it is what the beat
     that ships today still teaches. The operator-aware beat and its template variant teach
     `policy` (ADR-006 §2).
2. **A fifth state, `researched F<n>`,** beside `open`, `asked`, `answered` and
   `defaulted <pointer>`. It parses as state `researched` with the finding id as its pointer.
3. **A fourth provenance, `[researched F<n>]`,** beside `proposed`, `confirmed` and `stated Q<n>`.
   A parsed example gains a `finding` field, which is null for the other three.
4. **What closes what.**

   | Class | Closed by | Not closed by |
   |---|---|---|
   | `policy`, `business` | `answered` | `defaulted`, `researched` |
   | `domain` | `answered`, `researched F<n>` | `defaulted` |
   | `technical` | never gated | |

   A fact is cited, never defaulted, so `defaulted` on a `domain` question counts as open. A
   decision is a person's, so `researched` on a `policy` question counts as open.
5. **The parser still fails closed, and its reading does not change.** A class it does not admit
   reads `business` (the strictest: only a person closes it) and is reported `bad-class`. A state
   it does not admit, including `researched` with no id, reads `open` and is `bad-state`. A bad
   `[researched …]` label is `bad-provenance`. The SPEC's "an unplaceable question defaults to
   `domain`" is the PO's labelling rule (ADR-004 §1), not this reading: a typo must only ever make
   the gate stricter.
6. **A finding is a sourced heading in the research document, and one function reads it.**
   `readFindings(text)` sits in `map.mjs`, beside the label that cites it, so the id is spelt in
   one place. A finding is a level-2 heading `## F<n> · <the question>`. Its block runs to the
   next level-1 or level-2 heading. It is **sourced** when the block holds a line that starts
   `- **Source:**` with text after it. An id used twice resolves to neither.
7. **Which document.** A milestone's story cites its milestone's `RESEARCH.md`. A standalone story
   cites a `RESEARCH.md` in its own folder. One function answers this, and the probe and the door
   both call it (ADR-002 §3).
8. **The trace needs no change.** It already requires every example that is not `proposed`, so a
   `researched` example must be carried into the contract under its rule, like an agreed one.
9. **What the citation proves:** a finding with that id exists and names a source. It does not
   prove the source says what the finding says, or that the example follows from it. The reviewer
   judges that, and the operator sees every researched example once (ADR-004 §6).

### Alternatives considered

- *Rename `business` to `policy` and migrate old maps.* A delivered map is immutable, and a
  migration would rewrite the record of what a person answered. Rejected.
- *Anchor `researched` on the operator's answer to the batch.* One ask anchors one token
  (136/ADR-001 §2), and a batch covers many examples. Rejected: the anchor is the finding.
- *Let an ADR settle a domain fact.* That is the `ruled` label 134/ADR-001 §3 refused. Rejected.
- *A separate `findings.mjs`.* It would spell the `F<n>` id a second time. Rejected.

### Consequences

Every map written before this milestone parses to the same value it did, plus `finding: null`. No
store and no schema version changes. A map that uses the new labels needs a build that knows them:
an older build reports `bad-class` or `bad-provenance`, which is the safe direction.

## ADR-002 — The gate accepts a cited finding, and nothing less

### Decision

1. **`example-question-open` is judged by who owns the question** (ADR-001 §4). Its message says
   which: a decision still waiting on a person, or a fact still waiting on research.
2. **One new code, `example-research-unanchored`.** It fires for a `researched F<n>` example or
   question whose finding does not resolve (no research document, no such heading, or the id is
   used twice) or resolves with no source. It takes the acceptance horizon like the lane's other
   error codes: `error` while the story is open, `warn` once it is `done`.

   | Code | Severity | Fires when |
   |---|---|---|
   | `example-question-open` | error | a `policy` or `business` question is not `answered`; a `domain` question is neither `answered` nor `researched` |
   | `example-research-unanchored` | error | a `researched F<n>` claim cites a finding that does not resolve, or one with no source |
   | the lane's other four codes | unchanged | unchanged |

3. **The probe and the door read the research document as they read the map.** The story probe
   reads it through `fileState` and hands its text to the lane as `extensions.examples.research`.
   It reads only when the gate is on and the story has a map. The build door reads the same
   document through the same path function and calls the same `examplesFindings`. The lane still
   reads no disk.
4. **A `domain` question the operator answered** (ADR-004 §3) is anchored exactly as today, by the
   answer record for its token. Nothing in 134's anchor or 136's second source changes.
5. **Off is still today.** With the gate off (`work.examples.enabled`) the probe reads no research
   document, the lane returns nothing and the door refuses nothing.
6. **The switch of ADR-006 gates nothing here.** A map is judged by what it says, not by which
   beat wrote it. A project that turns operator-aware discovery off keeps the maps it wrote while
   it was on, and the lane and the door still read them.

### Consequences

A story whose milestone has no `RESEARCH.md` and whose map cites a finding is refused at the build
door, with the finding named. A finding heading renumbered after a map cited it reports
unanchored; the fix is to correct the citation.

## ADR-003 — The operator profile: one block, resolved one way, with a machine-wide default

### Context

The level that decides how a fact is handled belongs to the person, and differs by domain. The
SPEC puts it in config, per project, with a default for the whole machine. The readers are a
doctor lane, `aof work update`, `aof work init-config` and the refine session, which is prose.

### Decision

1. **The block.** `work.operator = { role, expertise }`, closed.

   ```json
   { "work": { "operator": {
       "role": "I run the build for a lettings agency. I am a developer, not a property manager.",
       "expertise": { "property-management": "working", "tenancy-law": "new" } } } }
   ```

   - `role` is a non-empty string of at most 500 characters. It rides every PO and researcher
     prompt, so it is a sentence or two.
   - `expertise` maps a domain slug (lowercase kebab) to `expert`, `working` or `new`.
2. **Validation.** A wrong type, an empty or over-long role, a bad slug or an unknown level is
   `operator-profile-bad-value`; an unknown key is `operator-profile-unknown-key`. Both are errors
   of `aof project validate`, for the project file and the global file alike. The resolver never
   throws: a level it does not know resolves `new`, and a role that is not a string resolves
   absent.
3. **One home.** `packages/contracts/src/operator-profile.mjs`, a pure leaf: the three levels, the
   merge, the resolver and the level lookup. A domain the profile does not list is `new`.
4. **A machine-wide default, overridden key by key.** The same block may sit in
   `~/.aof/aof.config.json`. The project's `role` wins when it has one. `expertise` merges per
   domain, the project's entry winning.
5. **`loadWorkspace` lays the global block under the project's,** as it does for `mesh`
   (`packages/core/src/application/bindings/work.mjs:167`). The merge is in memory only and is
   never written back. Every code reader asks the one resolver over that config.
6. **`aof project show --json` answers the resolved profile:**
   `operator: { declared, role, roleSource, expertise: [{ domain, level, source }] }`, each source
   `project` or `global`. This is the refine session's reader. A session that merged two files by
   hand would be a second resolver, and would read the real home under a test's isolated one.
7. **`declared`** means the resolved profile has a role or at least one expertise entry.
8. **A milestone names its domains in its record doc's frontmatter:** `domains: [tenancy-law]` on
   `SPEC.md`, or on `STORY.md` for a standalone story. No template gains the key: the PO writes it
   at refine, in a project that has the switch on (ADR-004 §2). No code reads it in this milestone.
9. **Nothing is refused for want of a profile, and nothing reads one while the switch is off.**
   The block validates and resolves in every project. Discovery reads it only where operator-aware
   discovery is on (ADR-006), and there an undeclared profile means every domain is `new`.

### Alternatives considered

- *The session reads both config files itself.* Two resolvers. Rejected (§6).
- *A new verb for the profile.* `project show` already answers resolved settings with their
  source. Rejected.
- *The profile in the specification-by-example package.* The role also reaches the researcher at a
  milestone's Decide stage, outside discovery. Rejected in favour of `@aof/contracts`.
- *A default level in the profile.* The SPEC says unlisted is `new`. Rejected.

### Consequences

`domains:` on a record doc and `work.tags.domains` in config are different things with one word:
the first is a subject area the operator may or may not know, the second a feature-area tag. The
beat's own prose says so where it tells the PO to write the key. `packages/contracts/src` goes from 9 to 10, stated in its budget row.

## ADR-004 — A fact is researched before anyone is asked

### Context

The beat today drafts the map, strikes what the record answers, and asks every `business` question.
There is no step between "the record does not say" and "ask the operator".

### Decision

Everything in this ADR and in ADR-005 is prose of the operator-aware fragments (ADR-006 §2). It
applies in a project that has turned the switch on, and nowhere else.

1. **The PO labels each question `domain`, `policy` or `technical`, and one it cannot place is
   `domain`.** The architect still reviews every `technical` label, and relabels one that is
   really a fact as `domain` and one that is really a choice as `policy`. Striking is unchanged.
2. **The session reads the profile once per refine,** from `aof project show --json` (ADR-003 §6),
   and the item's `domains:`. When the record doc names none, the PO adds the key, reusing the
   profile's own slugs where one fits. The profile's `role` opens every PO and researcher prompt
   the session writes; in solo mode the session holds it while it plays those roles.
3. **A `domain` question takes the level of its domain.** The PO attributes each to one of the
   item's domains. One it cannot attribute takes the lowest level among them, and `new` when the
   item names none.

   | Level | What happens to a `domain` question |
   |---|---|
   | `expert` | Asked directly, by its token. It closes `answered`, and its examples are `stated Q<n>`. |
   | `working` | Researched. What research settles returns in the batch, one line each with its source. |
   | `new`, or unlisted | Researched. What research settles returns in the batch, background first. |

4. **One researcher pass per refine, and it is the research document's only writer.** The session
   collects the domain questions to research from every story it is refining and hands them over
   together: one `aof-researcher` in orchestrated mode, the session itself in solo. Each question
   gets one finding in the form of ADR-001 §6, with a `- **Finding:**` line and a
   `- **Source:**` line. A fact about the world cites a URL, or a named document and its section. A
   fact in this repository cites `path:line`. What the model recalls is not a source.
5. **What a finding does to its question.**
   - **It settles it:** the question becomes `researched F<n>`, and the examples it supports become
     `[researched F<n>]`.
   - **It cannot** (no source that settles it, sources that disagree, or the finding shows it is a
     choice): the question is relabelled `policy` and asked, with the finding as its background
     and a recommendation (ADR-005).
6. **The batch.** A story's researched examples reach the operator as **one** question, to skim
   and object to. It carries no map token, so it anchors nothing: the anchor is the finding. The
   operator answers "no objection" or says which example is wrong. An objection puts that example
   back to `proposed`, relabels its question `policy`, and asks it by its own token.
7. **When the batch is asked.** Interactively it goes with the story's other questions; in an
   `--autonomous` cascade that is the one end review. In a driven session (`AOF_RUN_ID`) it is one
   ask per story, after that story's policy questions. A batch left unanswered leaves its story at
   the Contract gate, as an unanswered question does.
8. **Never a default.** A `policy` question is asked and never defaulted, as `business` was. A
   cited finding is not a default; a finding with no source is nothing.
9. **What does not change:** the token, the anchor and its two sources (134/ADR-003, 136/ADR-001);
   one tokened question per driven ask (136/ADR-002); the doctor stop before the first Scenario.

### Alternatives considered

- *One researcher per story.* Each re-reads the same SPEC and sources, and several would write one
  `RESEARCH.md`. Rejected for the single pass.
- *Research at `expert` too.* The SPEC says an expert is asked directly; research they did not
  need is the cost this milestone removes in the other direction. Rejected.
- *The batch as one question per example.* That is the stream of questions the SPEC rules out.
- *Gate the build on a recorded batch answer.* It needs a new token kind that covers a set which
  can grow after it was asked. Deferred with the question-quality lints.

### Consequences

Research uses the researcher's web tools on the project's own domain questions. That is the
researcher's existing reach, now used at the Contract stage as well as at Decide. `RESEARCH.md`
grows by one short block per researched question.

### Diagram

**Why:** one question can take five paths, and the reviewer needs to see that only two of them end
at the operator, and that every path ends at a check code makes.
**View:** a decision flow, left to right.
**Components:** the PO's draft question; the class (`technical`, `policy`, `domain`); the operator
profile's level for the question's domain; the researcher; `RESEARCH.md` (`## F<n>`, with its
source); the map (`EXAMPLES.md`); the operator; the doctor lane.
**Flows:** question → class. `technical` → documented default. `policy` → operator (background and
recommendation) → `answered`. `domain` → level. `expert` → operator → `answered`. `working` or
`new` → researcher → finding in `RESEARCH.md`. Finding settles → `researched F<n>` in the map →
the batch → operator skims; an objection → `policy` → operator. Finding does not settle → `policy`
→ operator. Map → doctor lane, which checks an answer record for every `answered` and a sourced
finding for every `researched`.

## ADR-005 — Every question explains itself

### Decision

1. **`I would pick:` is on every question discovery puts to the operator:** a question by its
   `Q<n>` token, an example put for confirmation by its `E<n>` token, and the batch. It names one
   of the question's own options and gives the reason in a clause. That option is the tool's first
   option. A driven ask already carries the line (136/ADR-002 §3); the interactive one gains it.
2. **Below `expert`, a `Background:` line comes first.** It says what the term means, why it
   matters to this build, and what is normal in the industry, with a source. When research ran,
   the source is the finding's (`F<n>`, and what it cites). The level is the question's domain's
   (ADR-004 §3); a `policy` question takes the level of the domain it bears on.
3. **The order.**
   - Interactive: the token and the question on the first line, then `Background:`, then
     `I would pick:`. Each option's description says what it costs, as today.
   - Driven: 136's first line, then `Background:`, then the loop's four lines. The whole stays
     under 1,500 characters, background included.
4. **The question asks the operator to confirm or override,** not to supply the answer cold.
5. **Prose, not a lint.** The shape lives in the practice's fragments for refine and the PO brief
   (ADR-006 §2), pinned by the practice's own suite over a render. A doctor check that a question carried its recommendation is deferred with the SPEC's
   other question-quality lints. The loop's general instruction
   (`packages/execution/src/session-driver.mjs:158`) is unchanged.

## ADR-006 — Off unless a project turns it on, shipped as fragments, and honest about what it needs

### Context

As first refined, this practice was on wherever discovery was on, and its prose went into core's
`refine.md` and three role briefs. Two things were wrong with that. A project where the operator
is the domain expert, or where nobody needs facts looked up, would get research and background on
every question. And every project would load the prose on every refine, on top of the 20% of
`refine.md` that is already gated prose. The operator asked for it to be an extension.

### Decision

1. **One switch, in the project's config: `work.examples.operatorAware`.** It is a boolean whose
   default is off, and only `true` turns it on, as the examples gate itself works. It means
   nothing without discovery: `operatorAware: true` while `work.examples.enabled` is not `true`
   resolves off and is diagnosed `examples-operator-aware-without-discovery`. It is read from the
   project's file only. A render must not depend on the machine it runs on, because rendered
   commands are committed.
2. **The prose is the practice's, not core's.** Everything ADR-004 and ADR-005 decide is written
   as fragments of the specification-by-example package, turned on by `work.examples.enabled` and
   `work.examples.operatorAware` together: the beat for refine's discovery slot, which replaces
   the beat that ships today; the halves for the PO, researcher and architect briefs; and a
   variant of the `EXAMPLES.md` and `RESEARCH.md` templates that teaches the new forms. The slot
   and fragment mechanism is milestone 193's. With the switch off, a project's rendered commands
   and installed templates hold none of it.
3. **What the switch does not gate: the grammar, the gate and the profile.** A map is data and is
   judged by what it says (ADR-002 §6). `work.operator` validates and resolves in every project
   (ADR-003 §9). Only the prose, and the warning in §5, depend on the switch.
4. **`aof work init-config` turns it on and writes the profile.** It gains
   `--operator-aware <on|off>`, `--operator-role <text>`, `--expertise <domain>=<level>[,…]` and
   `--global`. Turning it on is refused when discovery is off, before anything is written. Unlike
   the tag vocabulary, which fills a hole, a profile flag replaces what it names: the operator is
   correcting a statement about themselves. `--global` writes the profile into
   `~/.aof/aof.config.json` and nothing else; the switch has no machine-wide form (§1).
5. **A project that turned it on is told, once, when it has no profile.** A new doctor code,
   `operator-profile-undeclared`, `warn`, fires when the switch is on and the resolved profile is
   undeclared. It is anchored at the work directory, so it is reported once whatever the scope,
   and its message names the command in §4. It is its own check group,
   `packages/specification-by-example/src/operator-lane.mjs`, appended after the examples lane.
   `init-config` prints the same sentence at the moment the switch is turned on, and
   `aof work update` prints it too, from the same function (190/ADR-008 §5). The beat names the
   gap in its hand-back (ADR-004).
6. **How a project learns the switch exists is milestone 193's.** Its `aof work update` lists each
   optional practice and the key that turns it on. This milestone adds no standing notice to a
   project that has left the switch off: that would nag every project the practice is not for.
7. **`aof:init` does not ask.** It renders the bundle before any config exists, so in a new
   project the switch is off and there is nobody to ask on behalf of. The moment to say who the
   operator is, is the moment the switch is turned on (§5).

### Alternatives considered

- *On wherever discovery is on* (the first refinement). Rejected for the two reasons above.
- *The profile's presence as the switch.* The profile has a machine-wide default, so a render
  would depend on the machine. Rejected (§1).
- *A separate package for operator-aware discovery.* It changes the practice's own grammar and
  gate, which have one parser and one lane. Rejected: it is a variant of the practice's beat.
- *Keep the prose in core, behind a second "only when" sentence.* That is the growth this change
  exists to stop.

### Consequences

Story 04 cannot be built until milestone 193 delivers slots and fragments, and a story cannot name
another milestone in `depends:`, so the milestone as a whole waits on 193. The SPEC's
"`aof:init` asking for the operator's role" is dropped, with the reason in §7.
`packages/specification-by-example/src` gains its sixth module.

## ADR-007 — Five stories: a grammar, a gate, a profile, a switch, a beat

| Story | Owns | Depends |
|---|---|---|
| 00 the-map-tells-a-fact-from-a-decision | ADR-001: the classes, the state, the provenance, the finding reader; FF-19201 | none |
| 01 the-gate-accepts-a-cited-finding | ADR-002: the lane, the probe, the door; FF-19202 | 00 |
| 02 the-operator-says-who-they-are | ADR-003: the leaf, the schema, the validator, the global default, `project show`; FF-19203 | none |
| 03 a-project-turns-it-on-and-is-told-what-it-needs | ADR-006 §1, §4, §5: the switch's key and resolver, `init-config`'s flags, the doctor's warning, the update's line | 02 |
| 04 discovery-researches-before-it-asks | ADR-004, ADR-005 and ADR-006 §2: the practice's fragments for refine and the three briefs, with their Codex bodies; the two template variants; the guide; FF-19204 | 00, 01, 02, 03, and milestone 193 |

**Where the graph put the cuts** (`aof graph impact`, on the graph above):

- `map.mjs` imports nothing and is imported by the package's other four modules, so the grammar
  can land alone (00) and the gate after it (01).
- `doctor-lane.mjs`, `story-probe.mjs` and `build-door.mjs` each have one dependent in `src`, a
  core binding. 01 changes no binding: the probe's and the door's signatures hold.
- `config-inspect.mjs` and `bindings/work.mjs` each have one dependent in `src`. 02's changes to
  both are additive. 03 adds the switch's resolver to `config-inspect.mjs` after it.
- 03's warning is its own module so that 01 and 03 share no file and build in one wave. Its
  profile cases join 02's suite, not the lane's.
- 00 to 03 write no bundle prose, so none of them writes the manifest and none needs 193.
- 04 writes fragments and their suite inside the practice's package. They are not in the code
  graph. Their paths are 193's to fix, so 04's write set is settled when 193 is refined.

Waves: 00 and 02; then 01 and 03; then 04. All of them wait on milestone 193, because the edge
can only be drawn at the milestone.

**The live run** is the milestone's `@manual` check in `STATE.md`, not a story: one real refine of
a story in a domain declared `new`, in a project with the switch on, read at the source. It needs
all five delivered.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-19201 | **The grammar still has one home.** The four classes, the five states and the four provenance labels are frozen arrays exported once from `packages/specification-by-example/src/map.mjs`. No other runtime module spells a `researched F<n>` label or state, or builds a finding id. The research document's file name is spelt in one module of that package. | `test/arch/examples/acd-example-map-single-home.test.mjs` (cases beside 134/FF-13402) — pending, lands with 192/00 | ADR-001 §1–§3, §6, §7 |
| FF-19202 | **Off is still today.** With `work.examples` absent and with `enabled: false`, the snapshot row of a story whose map cites a finding carries no research text, `doctorWork` yields no `example-research-unanchored`, and `continue` on it is not refused. | `test/arch/examples/acd-examples-off-is-today.test.mjs` (cases beside 134/FF-13403) — pending, lands with 192/01 | ADR-002 §5 |
| FF-19203 | **The operator profile has one resolver.** In comment-stripped runtime source, the three levels are spelt as a vocabulary only in `packages/contracts/src/operator-profile.mjs`, and `work.operator` is read from a config only through that module's resolver and merge. | `test/arch/examples/acd-operator-profile-one-resolver.test.mjs` — pending, lands with 192/02 | ADR-003 §3, §5 |
| FF-19204 | **Off renders none of it.** For a fixture project with `work.examples.operatorAware` absent or `false`, the rendered refine command, the rendered PO, researcher and architect briefs (for Claude and for Codex) and the installed `EXAMPLES.md` and `RESEARCH.md` templates are byte-for-byte what the same project renders from a bundle with the practice's operator-aware members removed. | `test/arch/examples/acd-examples-off-is-today.test.mjs` (cases beside FF-19202) — pending, lands with 192/04 | ADR-006 §2 |
