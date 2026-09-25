---
type: story
doc: retrospective
number: 08
parent: 131
slug: the-messaging-cli
title: "Retrospective — the messaging CLI"
created: 2026-09-25
updated: 2026-09-25
---
# 131/08 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — Neither build nor review saw the story's own run records carry a machine name

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner (verify) · **Raised by:** the verify gate, reading the story's `runs/` directory

The story's two run records landed at `runs/<machine-name>/` with `"node": "<machine-name>"`. The cause was
not 08's code: the live identity sidecar had been re-derived to the hostname form by a stale build
earlier that morning. The build lane and the solo review both went green over the records without
looking at them. 132's machine-name guard only fires once a record is tracked, so nothing reds before
the commit. The records were moved at verify, before any commit.

**Why.** The run records are written by the harness, not by the story, so no lane treats them as its
output. The identity that names them lives in `~/.aof`, outside every test's isolated home. A green
suite therefore says nothing about it.

**Lesson.** Before accepting any item, list its `runs/` directories. Anything other than an opaque
`node-*` segment means the machine's identity has drifted. Fix it at the source (the operator re-pins
the sidecar) before the next run writes more records. Moving the files only treats the symptom.

**Refs:** `m131/F-131-01`, `m131/F-131-02`, precedent `m133/F-133-05`.
