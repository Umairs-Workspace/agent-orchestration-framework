---
type: chore
number: 114
slug: doctor-s-lane-module-roster-omits-work-doctor-loop-record-mjs-and-ff-5905-is-red
title: "Doctor S Lane Module Roster Omits Work Doctor Loop Record Mjs And Ff 5905 Is Red"
status: done
owner: product-owner
created: 2026-09-04
updated: 2026-09-04
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
# 114 · Doctor S Lane Module Roster Omits Work Doctor Loop Record Mjs And Ff 5905 Is Red

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Milestone 78 landed `loopRecordLane` in doctor's spine and nothing added it to FF-5905's named
roster, so `acd-controls-never-execute` read RED from that day on. Nothing ran it until 96/04's
whole-tree gate — which is how a control stays red for weeks without anybody seeing it.

## Definition of Done

- [x] Either name './work-doctor-loop-record.mjs' in DOCTOR_LANE_MODULES with the ADR act m47/R9 requires for a seventh doctor lane, or drop the import from src/commands/doctor.mjs. Red on this branch today (committed by b1ba1197, items 78/79/81) and unrelated to chore 97's diff, which touches neither doctor nor the audit.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "doctor's lane-module roster omits work-doctor-loop-record.mjs, and FF-5905 is red" (`test/arch/acd-controls-never-execute.test.mjs:673`)
- **Raised reviewing:** `97`, review round 1
- **Promotion key:** `finding:97:doctor's lane-module roster omits work-doctor-loop-record.mjs, and ff-5905 is red`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

- **Closed at 96's milestone gate, 2026-09-04.** The roster now names the seventh lane, with why it
  is a doctor lane and not an audit one: it READS a record and reports findings, which is the side
  of 59/ADR-002's boundary this control exists to keep it on. The control's own comment already
  said "a seventh arriving is an edit here" — this is that edit. See 96 `VERIFICATION.md` F-96-E.
