---
type: story
doc: retrospective
number: 13
parent: 131
slug: test-and-allow-from-the-cli
title: "Retrospective — test and allow from the CLI"
created: 2026-09-26
updated: 2026-09-26
---
# 131/13 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — A setup path is not done until the operator can prove it from the CLI

- **Kind:** insight · **Area:** product · **Stage:** verify · **Owner:** product-owner · **Raised by:** the operator, during 07's setup

09 shipped the bot with a guide whose "send a test message" step was a hand-built PowerShell or curl
request, and 10 shipped the answer list with "there is no verb for it, so edit the file". The first
thing the operator asked for while setting up was a test command and a flag for the list. The first
live test then showed that nothing said which project a message came from.

**Lesson.** A capability that needs a secret or an external account gets a CLI check of its own in
the same story (a `test` verb that uses the real path), and a setting a person must provide gets a
flag, not a file edit. A message posted to a shared place names its source.

**Refs:** STATE `(aof:verify 131, 2026-09-26)`, VERIFICATION `### 131/13`.
