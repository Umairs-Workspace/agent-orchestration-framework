---
doc: retrospective
updated: 2026-10-02
---
# 05 · The discovery beat — Retrospective

## R1 — the beat's first live questions were ones the record already answered

- **Kind:** misunderstanding · **Area:** product · **Stage:** verify · **Owner:** product-owner
- **Raised by:** the operator, at 134's live run on 144 (F-134-01)

**What happened.** The beat said to ask "every question the PO cannot answer from the record", and
the suite proved the beat exists. In its first real use, the PO asked four questions. Three were
answered by the story's own user story, title and Notes, and one was an engineering call worded
with an internal the operator had not been given ("16 workers"). The operator rejected all four.
Re-asked with their context, three got real answers.

**Lesson.** A question's quality is not something a prose test can prove. The beat now says to
strike what the record answers, relabel engineering choices as `technical`, and give each remaining
question its context in the person's terms (`5c0685e6`). Only a live run tests whether that works.
