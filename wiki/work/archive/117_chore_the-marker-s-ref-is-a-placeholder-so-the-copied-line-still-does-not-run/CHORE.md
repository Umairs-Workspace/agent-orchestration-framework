---
type: chore
number: 117
slug: the-marker-s-ref-is-a-placeholder-so-the-copied-line-still-does-not-run
title: "The Marker S Ref Is A Placeholder So The Copied Line Still Does Not Run"
status: done
owner: <role>
created: 2026-09-05
updated: 2026-09-05
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 117 · The Marker S Ref Is A Placeholder So The Copied Line Still Does Not Run

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Chore 100 fixed the `aof-generated` marker's missing ref by spelling the literal `<ref>` — so the
line an operator copies out of `EXECUTION.md` is now well-formed but still not runnable: they must
substitute the ref themselves before it does anything. The document already knows which item it is
about, so this renders the item's own ref in both faces of the spelling (the marker and the sign-off
prose that names the same command), making the copied line invokable verbatim.

## Definition of Done

- [x] Render the item's own ref in the aof-generated marker (and in the sign-off prose that names the same command), so the line an operator copies out of EXECUTION.md is invokable verbatim rather than needing <ref> substituted. The ref is already an input to renderExecutionDocument and to composeSignoffBlock, so the bytes stay deterministic per item; re-pin 78/01's marker byte assertion over the interpolated form.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "The marker's ref is a placeholder, so the copied line still does not run" (`src/loop-record-render.mjs:38`)
- **Raised reviewing:** `100`, review round 1
- **Promotion key:** `finding:100:the marker's ref is a placeholder, so the copied line still does not run`

### What the fix actually cost (the shape of the change)

`REGENERATE_COMMAND` could not stay a constant: the spelling is now a function of the item, so it is
`regenerateCommand(ref)` with `REGENERATE_REF_PLACEHOLDER` surviving only as the fallback for a call
carrying no ref. A function rather than a constant interpolated at each of the two call sites —
spelling the `--write` tail twice is exactly how the marker and the sign-off prose drifted apart in
the first place, which is the defect chore 100 was raised for.

The DoD's premise was half right. `ref` was already an input to `renderExecutionDocument`, but NOT
to `composeSignoffBlock` — it had to be threaded in from `item.ref` at the call site, and
`SIGNOFF_PROSE` had to stop being a module-load `Object.freeze` and become `signoffProse(ref)`.

A third surface the DoD did not name carried the same defect and was fixed with it: the `--json`
face's `regenerate` field (`src/commands/loop-record.mjs`), which handed out the same uncopyable
line and already had `result.ref` in hand.

Nothing was left stale: no committed `EXECUTION.md` exists anywhere under `wiki/`, so the byte change
has no artefact to disagree with.

### Recorded finding (review close, routed: recorded — not promoted)

**FF-7809 freezes five literals, and the regeneration command is not one of them.** The spelling now
has two independent homes — `regenerateCommand(ref)` here, and the hand-spelled
`` `aof work loop-record ${item.ref} --write` `` at `src/work-doctor-loop-record.mjs:260` — and the
gate that holds the writer, the checker and itself byte-equal covers only `heading`, `header`,
`divider`, `placeholder` and `basename`.

Recorded rather than promoted, for two reasons that both point the same way. Each copy IS pinned in
bytes by its own suite (`loop-record-render.test.mjs` for the marker, `doctor-loop-record-lane.test.mjs`
for the remedy), so a change to either turns its own test red — drift cannot happen silently. And the
doctor module's own header argues at length that independent copies is the DESIGN here: importing the
writer would put the writer's opinion of the shape into the instrument that checks it, and FF-5202
forbids the import edge outright. Worth knowing that the "three readers agree" argument is asserted
for the sign-off shape and not extended to the remedy spelling; not worth a driver.

Note the two copies used to DISAGREE visibly (`<ref>` here against `${item.ref}` there) and now
agree. That is the fix working, but it also means the disagreement is no longer self-announcing.
