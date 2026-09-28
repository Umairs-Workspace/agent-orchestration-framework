---
type: story
doc: retrospective
number: 09
parent: 131
slug: the-bot-posts
title: "Retrospective — the bot posts"
created: 2026-09-25
updated: 2026-09-25
---
# 131/09 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — A config-shape change greps for the key, not the module's importers

- **Kind:** near-miss · **Area:** planning · **Stage:** refine · **Owner:** architect · **Raised by:** 09's build

09 retired `urlEnv` and the webhook URL from a channel. Its declared `files:` named the notify
suites, the modules that import `notify.mjs`. Five more suites (`acd-loop-ask-waits-in-place`,
`loop-command-reconcile`, `-stops`, `-wave`, `run-session-limit-resume`) built webhook-era
channels in their own fixtures and would have gone red. The build found them and moved them.

**Why.** The refine traced readers through imports. A fixture that builds a config object by hand
imports nothing from the module whose shape it spells.

**Lesson.** When a story changes a config key's shape, refine greps the tree for the key itself
and lists every hit's suite in `files:`, not only the module's importers.

**Refs:** STATE `(continue 131/09)`, VERIFICATION `### 131/09`.
