---
type: milestone
number: 193
slug: buildable-commands
title: "Commands are built at render from a core body and the fragments of the practices a project has turned on"
status: not-started
owner: product-owner
created: 2026-11-12
updated: 2026-11-12
schema: 1
aofVersion: 0.1.0
---
# 193 · Commands are built at render from a core body and the fragments of the practices a project has turned on

## Objective

A practice's code already lives in its own package and plugs into neutral seams. Its prose does
not. The discovery beat, the formulation from the map and the build brief are written straight
into `refine.md` and the role briefs, so every project loads them on every run, only to be told to
skip them when the practice is off. Measured 2026-11-12: about 20% of `refine.md`'s 462 lines is
prose that applies only when `work.examples.enabled` or `work.plan.enabled` is on. Each new
practice makes every command longer for every project, and each one is then written a second time
by hand for Codex.

After this milestone, a command or a role brief is assembled when the bundle is rendered: a core
body with named slots, plus the fragments that practice packages contribute to those slots. A
project's rendered commands hold only the prose of the practices it has turned on.

An outsider can verify the result. Render the bundle in a project with discovery off: its refine
command holds no sentence about the example map. Turn discovery on and run `aof work update`: the
command now holds the discovery beat, saying what it says today.

## Scope

In scope:
- **Slots.** A command or role-brief source marks named places where a practice may add prose.
  The Claude source and the Codex body of the same command carry the same slots.
- **Fragments.** A practice package contributes fragments through its own bundle fragment, beside
  the whole commands it can already contribute. A fragment names the command or brief it belongs
  to, the slot, a body per runtime, and the project config keys that turn it on. Only the boolean
  `true` turns a key on, and every key it names must be on.
- **Project config only.** Rendered commands are committed files, so what a render includes is
  decided by the project's own config and never by the machine-wide one.
- **Composition at render.** The render fills each slot with the fragments that are on, in a
  declared order. A fragment can replace another in its slot, so a practice can ship a variant of
  its own beat. A slot with nothing on leaves nothing behind: no heading, no marker, no "skip
  this" sentence.
- **Variants of a template.** A practice can ship a variant of a template, installed in place of
  the default when its keys are on.
- **The first move.** The prose that is gated today moves out of core with no change in what it
  says: the discovery beat, the formulation from the map, the driven-session paragraph and the
  `--autonomous` sentences (gated on `work.examples.enabled`) move to the
  specification-by-example practice, and the build brief (gated on `work.plan.enabled`) becomes a
  fragment too. The gated bullets of the PO, architect and QA briefs move with them. With a
  practice on, the rendered command says what it says today.
- **A config change is not silent.** Turning a key on or off leaves the rendered commands stale
  until `aof work update` runs. `aof work doctor` says so, naming the key and the command, and the
  update re-renders.
- **A project can see what is available.** `aof work update` lists each optional practice whose
  prose a project could turn on, whether it is on, and the key that turns it on. This is the
  adoption path for every later extension, this milestone's first move included.

Out of scope:
- One source for the Claude and Codex bodies. A fragment carries a body per runtime, as a command
  does today. Unifying them is a separate question, and the two differ in wording, not only in
  content.
- Fragments that a project or a third party supplies from outside the aof packages. That is a
  packaging and trust question of its own; this milestone serves the practices aof ships.
- Moving the gated prose of `continue.md` and `verify.md`. The mechanism serves every command;
  the first move is `refine.md` and the role briefs, where the gated share was measured. The
  others follow once theirs is.
- Operator-aware discovery. Its prose is milestone 192's, and it is the first new practice prose
  written as fragments from the start.

## Stories

To be broken down by `aof:refine`.

## Dependencies

- `134_milestone_discovery-the-example-map`, `135_milestone_key-examples-in-the-contract` and
  `136_milestone_discovery-questions-in-the-loop`, all done. Their prose in
  `packages/core/assets/commands/refine.md`, the role briefs and
  `packages/core/assets/variants/codex/workflow.md` is what the first move relocates, and their
  prose suite (`test/examples/refine-discovery-beat.test.mjs`) is what proves it says the same.
- The practices registry (`packages/core/src/practices.mjs`) and the config-aware render
  (`packages/core/src/work/bundle-synthesis.mjs`), which this milestone extends from whole
  commands to parts of one.
- `192_milestone_operator-aware-discovery` waits on this milestone for its prose.
