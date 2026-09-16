---
type: story
number: 04
slug: the-audit-face
title: "The audit face — one command over the instruments, addressed to the reference-owner, with a bypass the audited loop cannot absorb"
parent: 59
status: done
owner: product-owner
created: 2026-08-29
updated: 2026-08-30
depends: [59/00, 59/01, 59/02, 59/03]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-002, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-006, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-007, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-008, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-001, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-005, wiki/work/15_milestone_work-doctor-core/ARCHITECTURE.md, src/commands/doctor.mjs, src/commands/loops-validate.mjs, src/command-core.mjs, wiki/work/59_milestone_audit-loops/stories/01_story_the-instrument-census/STORY.md, wiki/work/59_milestone_audit-loops/stories/02_story_evidence-re-run/STORY.md, wiki/work/59_milestone_audit-loops/stories/03_story_staleness-silence-and-the-prune/STORY.md, src/work-loops-checks.mjs, src/bundle/loops/build-to-green-watcher.md, src/bundle/loops/operator.md]
files: [src/commands/audit.mjs, src/command-core.mjs, src/bundle/loops/instrument-audit.md, src/bundle/bundle.json, src/bundle/manifest.json, test/arch/acd-audit-reports-to-the-owner.test.mjs, test/arch/acd-day-one-audit-complete.test.mjs, test/audit-command.test.mjs, test/work-loops-commands.test.mjs, test/groundedness-report.test.mjs, scripts/test.mjs]
---
# 04 · The audit face

## User story

As the operator who owns this system's references,
I want one command that runs every instrument check and addresses each finding to whoever owns the
reference of the loop it concerns — never to that loop itself — with a channel that reaches me
directly when what it found is serious,
so that bad news about a loop's instruments never has to travel through the loop responsible for it,
and "the audit is independent" is a property of the report rather than a claim in a document.

Three lanes exist by the time this story runs: the census that knows which gates are actually
assembled, the evidence lane that has re-run what the registers claim, and the checks that know which
anchors have gone stale and which loops nobody consults. What none of them has is a face, an audience,
or a route to that audience. This is the story that supplies all three, and the day-one auditor record
written in 59/00's grammar so the framework audits itself out of the box.

The addressing is the part worth arguing about, and it is computed rather than configured: the
instrument a finding is about resolves to the loop that owns it, that loop's `target-setting` source
is who hears about it, and the auditor's declared escalation actor gets a second copy of anything
serious. Severity says how bad; addressing says who hears. They are separate axes because a warning
routed to the culprit is compromised in exactly the way an error routed to the culprit is.

## Tasks

- [x] `tasks/00_one-command-over-the-instruments.feature` — `aof work audit [scope] [--json] [--strict]` on the command core, doctor's finding shape, scope as a filter, and the exit decision on the face alone
- [x] `tasks/01_bad-news-does-not-travel-through-the-culprit.feature` — every finding is addressed to the reference-owner of the loop that owns the instrument, and never to that loop
- [x] `tasks/02_the-escalation-bypass.feature` — a serious finding reaches the declared actor directly, as a second copy the owner's copy does not replace
- [x] `tasks/03_the-day-one-auditor.feature` — the shipped auditor record: what it audits, what it may not audit, where it reports, and zero gating findings over the registry
- [x] `tasks/04_the-limits-are-stated-in-one-shape.feature` — every declared limit renders in the human face with its own text, in ONE shape across all lanes (raised at `aof:verify 59` as finding D-59-3, fixed inline at the same pass)

## Notes

- **This is a sibling of `work:doctor`, not a sixth doctor lane.** ADR-002 §2. Doctor's recorded
  ratchet says the sixth lane folds the family into a directory; nothing here trips it, and doctor's
  never-executes rule is left exactly as 66 froze it. The finding shape, the raw-absolute path, the
  scope-as-filter semantics and `--strict` as a face concern are all reused unchanged.
- **Milestone 77 extends this command.** ADR-002 §4. It plans the same verb with harness lanes; the
  lane registry and the finding envelope that land here are what it inherits. That is why the envelope
  is frozen by a control now rather than settled later.
- **`src/command-core.mjs` is a god-node with 136 dependents** (`aof graph impact`, 2026-08-29) where a
  new command costs one import and one array entry. One story owns it for the whole milestone, on 58's
  own reasoning: three stories appending to one array is merge friction wearing an independence claim.
- **Addressing is computed and asserted over the shipped registry.** FF-5909 does not check the
  resolution function in isolation; it checks that over the records this repository actually ships, no
  finding's addressee is the loop that owns the instrument it is about. A transitively-correct resolver
  with one bad edge in the registry would pass the first and fail the second.
- **Where no owner resolves, the finding escalates rather than disappearing.** An unowned instrument is
  not a reason for silence — it is a reason to go straight to the actor.
- **The audit is declared, not scheduled.** ADR-007 §1: the cost ladder is a delivered acceptance
  criterion and is not edited here. The auditor's cadence is on its record; the trigger that honours it
  is milestone 63's. This story ships a command an operator or a loop can run, and says so plainly.
