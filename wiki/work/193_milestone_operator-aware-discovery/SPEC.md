---
type: milestone
number: 193
slug: operator-aware-discovery
title: "Discovery researches the domain before it asks — the operator is asked only what is theirs to decide, at their level"
status: not-started
owner: product-owner
created: 2026-11-12
updated: 2026-11-12
schema: 1
aofVersion: 0.1.0
depends: [192]
---
# 193 · Discovery researches the domain before it asks — the operator is asked only what is theirs to decide, at their level

## Objective

The operator is first of all the operator: the person steering the build. They are not, by default,
a specialist in the build's subject area, whether that is fraud, property management or regulation.
Today, refine's discovery beat sorts every question into `business` (asked of a person and never
defaulted) or `technical` (may take a documented default), and an unplaceable question counts as
`business`. So "what does the regulation require" and "what risk will you accept" travel the same
path: straight to the operator, with no research step. The operator ends up being asked questions
as though they were the domain specialist.

After this milestone, discovery tells facts about the world apart from decisions only the operator
can make. It researches the facts first, with sources, and asks the operator only what is genuinely
theirs, pitched at their declared expertise in that domain. That expertise is set per project,
because an operator can be expert in one domain and new to another.

An outsider can verify the result. Run refine on a story in a domain the operator has declared
`new`. Every domain question is either settled by a cited RESEARCH finding, or reaches the operator
as a policy question with background, a recommendation and the cost of each option. No question
reaches them that a cited source could have answered.

## Scope

In scope:
- **Off unless a project turns it on.** Operator-aware discovery is a part of the discovery
  practice that a project opts into, with `work.examples.operatorAware`. With it off, discovery is
  what it is today, and the commands carry none of this milestone's prose. Its prose ships as
  fragments of the specification-by-example practice (milestone 192), not as text in core's
  commands. The one thing that does not depend on the switch is the map's grammar: a map that
  uses the new labels is judged the same wherever it is read.
- **`domain` vs `policy` questions.** The example map's `business` label splits into `domain` (a
  fact about the world: regulation, industry convention, how a process normally runs) and `policy`
  (a choice only the operator or their client can make). An unplaceable question defaults to
  `domain`, so it is researched first. The template grammar, the parser and the doctor's examples
  lane all learn the new labels, and existing maps that use `business` stay valid (store
  compatibility).
- **Research before asking.** Domain questions go to `aof-researcher`, whose findings land in the
  milestone's RESEARCH.md with sources. Each one then either:
  - closes with a citation, as a new provenance such as `[researched F<n>]` alongside `proposed` /
    `confirmed` / `stated`; or
  - becomes a policy question that carries the finding and a recommendation.

  Researched examples come to the operator as one batch to skim and object to, not as individual
  questions. The rule against agent-invented business rules holds: a cited finding is not a
  default.
- **An operator profile, set per project.** A new config block, `work.operator`:
  - `role` — free text, a sentence or two on who the operator is in this project;
  - `expertise` — a map from domain to level, `expert` / `working` / `new`.

  A global default lives in `~/.aof/aof.config.json` and a project can override it. Each milestone
  SPEC names its domains, and the level decides how domain questions are handled:
  - `expert` — asked directly;
  - `working` — researched, then a short confirmation;
  - `new` or unlisted — researched, and asked with background first.

  `role` reaches every PO and researcher prompt of a project that has turned this on.
- **Explain-first question shape.** `I would pick` becomes mandatory on every operator question,
  interactive or driven. Below `expert`, a question also carries a `Background:` line: what the term
  means, why it matters to this build, and what is normal in the industry, with a source. The
  question becomes "confirm or override", not "tell me".

Out of scope (deferred to a follow-up milestone once this one has been used in anger):
- A project `GLOSSARY.md` maintained by the researcher, with questions linking its terms. Deferred
  because it is valuable but separable, and should be shaped by real use of the profile.
- A "not mine to decide" answer: `deferred-to <who>`, plus a self-contained question pack the
  operator can forward to a stakeholder. Deferred for the same reason.
- Doctor lints on question quality: a domain question with no citation below `expert`, a question
  with no recommendation, an unglossaried term. These depend on the glossary and on this
  milestone's labels settling.
- Learning the profile from answers, where "I don't know" or "what does X mean?" suggests lowering
  a level. Deferred.

The adoption path is not deferred (see the operator's rule on opt-in config). This milestone
delivers:
- `aof work init-config` turning operator-aware discovery on and writing the profile, and saying
  at that moment what a missing profile means;
- `aof work doctor` and `aof work update` warning once when it is on but no `work.operator` is
  declared.

How a project learns that the practice exists at all is milestone 192's: `aof work update` lists
each optional practice and the key that turns it on.

## Stories

- [ ] `00_story_the-map-tells-a-fact-from-a-decision` — the map's grammar gains `domain`, `policy` and a cited `researched F<n>`, and every existing map and the default template read as they did
- [ ] `01_story_the-gate-accepts-a-cited-finding` — the doctor and the build door accept a fact a named source settles, and refuse a citation that leads nowhere
- [ ] `02_story_the-operator-says-who-they-are` — `work.operator` holds a role and a level per domain, with a machine-wide default a project overrides
- [ ] `03_story_a-project-turns-it-on-and-is-told-what-it-needs` — `work.examples.operatorAware` is off by default; `init-config` turns it on and writes the profile, and the doctor and the update say once when it is on with no profile
- [ ] `04_story_discovery-researches-before-it-asks` — as fragments of the practice, rendered only where the switch is on: refine researches a fact before it asks, returns what it settled as one batch, and every question explains itself

## Dependencies

- `134_milestone_discovery-the-example-map` and `135_milestone_key-examples-in-the-contract`, both
  done. This milestone changes the example-map grammar, the doctor's examples lane and refine's
  discovery beat that they delivered (`packages/specification-by-example`,
  `packages/core/assets/commands/refine.md`, `packages/core/assets/agents/aof-product-owner.md`,
  `.aof/templates/work/story/EXAMPLES.md`).
- `schemas/aof.schema.json`, for the new `work.operator` block and the `work.examples.operatorAware`
  switch.
- `192_milestone_buildable-commands`, not started. It delivers the slots and fragments this
  milestone's prose is written as (story 04). Stories 00–03 are code and do not need it, but a
  story cannot name another milestone in `depends:`, so the whole milestone waits on it.
