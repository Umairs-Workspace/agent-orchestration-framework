---
type: milestone
number: 192
slug: operator-aware-discovery
title: "Discovery researches the domain before it asks — the operator is asked only what is theirs to decide, at their level"
status: not-started
owner: product-owner
created: 2026-11-12
updated: 2026-11-12
schema: 1
aofVersion: 0.1.0
---
# 192 · Discovery researches the domain before it asks — the operator is asked only what is theirs to decide, at their level

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

  `role` reaches every PO and researcher prompt.
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
- `aof:init` asking for the operator's role;
- `aof work doctor` warning once when `work.examples.enabled` is on but no `work.operator` is
  declared.

## Stories

To be broken down by `aof:refine`.

## Dependencies

- `134_milestone_discovery-the-example-map` and `135_milestone_key-examples-in-the-contract`, both
  done. This milestone changes the example-map grammar, the doctor's examples lane and refine's
  discovery beat that they delivered (`packages/specification-by-example`,
  `packages/core/assets/commands/refine.md`, `packages/core/assets/agents/aof-product-owner.md`,
  `.aof/templates/work/story/EXAMPLES.md`).
- `schemas/aof.schema.json`, for the new `work.operator` block.
