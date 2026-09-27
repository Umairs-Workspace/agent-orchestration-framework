---
type: chore
number: 92
slug: ff-6109-s-harness-switch-lane-reds-on-the-shipped-declared-document
title: "Ff 6109 S Harness Switch Lane Reds On The Shipped Declared Document"
status: done
owner: <role>
created: 2026-09-03
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
# 92 · Ff 6109 S Harness Switch Lane Reds On The Shipped Declared Document

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

`test/arch/acd-progress-ledger-consumed.test.mjs`'s FF-6109 harness-switch lane went red on the shipped declared document (`src/bundle/commands/continue.md`): the leg asserted that EVERY declared knob is refused on the fail-closed harness ground, and 71/00 had made the prompt name each round bound beside its own config key — so the ground lifted for two of the three and the snapshot stopped holding. The repair is to re-point the leg at the rule it was always asserting, never to relax or delete it.

## Definition of Done

- [x] Reproduce test/arch/acd-progress-ledger-consumed.test.mjs:451 against the declared document it evaluates, decide whether the document or the control moved, and repair the side that drifted. Then re-run that control and confirm the harness-switch lane is green.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "FF-6109's harness-switch lane reds on the shipped declared document" (`test/arch/acd-progress-ledger-consumed.test.mjs:451`)
- **Raised reviewing:** `72/03`, review round 1
- **Promotion key:** `finding:72/03:ff-6109's harness-switch lane reds on the shipped declared document`

### What was done (2026-09-04) — discharged by chore 88, verified here

**No code change was needed: the side that drifted was the DOCUMENT, and the control has already been
re-pointed at it — in exactly the direction this chore prescribes.** Chore **88** (commit `bde9543e`,
"re-point the four controls 71/00 and 71/01 moved out from under") rewrote the FF-6109 harness leg so
the named/unnamed partition is **read off the harness document's text** rather than pinned to the day
before 71/00. The leg was re-pointed, never relaxed: the fail-closed ground still refuses every knob the
prompt does not name, and the "a switch, not a discriminating control" claim is now re-proved over a
synthetic harness that names *no* key, so it no longer rests on how many knobs `continue.md` happens to
name today.

Verified at source in this checkout rather than taken from 88's record:

| check | result |
| --- | --- |
| the lane this chore names | `test/arch/acd-progress-ledger-consumed.test.mjs:435`. The finding's `:451` anchor now lands inside that lane's own explanatory comment: 88's rewrite grew the leg, so the line moved while the lane did not |
| the harness of record | `src/bundle/commands/continue.md`, declared at `src/work-acceptor/admissibility.mjs:104` — and it exists on disk |
| declared knobs (`tunableSet`) | 3 — `work.loop.reviewRounds`, `work.loop.buildNoProgressRounds`, `work.autonomous.maxAttempts` |
| named in the document ⇒ the ground has lifted | 2 — `harnessRefusal` returns `null` for both round bounds |
| unnamed ⇒ still refused, on the one ground | 1 — `work.autonomous.maxAttempts` → `harness-not-introspectable`, `fallback: true`, `discriminating: false` |
| so all three legs still have something to measure | yes — both `named.length > 0` and `unnamed.length > 0` hold, so neither the lift leg nor the refusal leg is vacuous |
| `node scripts/test.mjs --only test/arch/acd-progress-ledger-consumed.test.mjs` | **9/9 green, exit 0** — the FF-6109 harness-switch lane included |
| the green is not an artifact of uncommitted work | every input the lane reads — the control itself, `src/work-acceptor/admissibility.mjs`, `src/bundle/commands/continue.md`, `src/work-loops.mjs`, `src/loop-bounds.mjs` — is **clean at HEAD**, and the first two measurements were taken with `git status` reporting no uncommitted change anywhere under `src/` or `test/` at all |
| `aof work validate 92` | **PASS — 92 is well-formed.** |
| `aof work doctor 92` | 0 admitted findings (its one `numbering-gap` is `warn`, stream-wide, not this chore's) |

**Which side moved, stated plainly** — the checklist's own question. The **document** moved: 71/00
(FF-7101) made `commands/continue.md` state each round bound beside its own config key, which is the
event the leg's own comment had named in advance as the thing that would end the all-three refusal
(*"the day `continue.md` names the key this ground lifts with nothing in the acceptor edited"*). Nothing
in the acceptor was edited to bring it about — which is the property the leg exists to assert — so the
control, not the acceptor, was the side to repair, and 88 repaired it.

**Duplicate promotion, as 88 already recorded.** Chore 88's OUTCOME names this chore among the four
(91, 92, 93, 107) that the promotion idempotence key `(reviewed ref + finding title)` admitted for
defects 88 was already discharging: 88 was raised at `71/02`'s review gate and this one at `72/03`'s, under a
different title for the same red. 92 is the only other CHORE that names this control (61, 69, 71 and 72 name it from
their own records, as the milestones that built and verified it), so there is no third copy of *this*
finding scheduled as work. The idempotence gap itself is not fixed here — it is the same
carried-forward gap chore 91 recorded, and it belongs to the promotion surface rather than to this chore.

**One fragility worth naming, by design rather than as a defect.** Exactly one declared knob is left
unnamed by the prompt, so the day `continue.md` names `work.autonomous.maxAttempts` the refusal leg goes
red with the message that already prescribes the follow-on: retire the refusal leg and keep the two legs
that do not depend on an unnamed key. That is the switch finishing its job, not the gate breaking.

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

## Accept decision

**Accepted 2026-09-04** on the chore close criteria (ADR-003), both checked at source in this checkout
rather than read off the record above:

1. **`## Definition of Done` fully ticked** — 2 of 2 boxes `- [x]`, none left `- [ ]`.
2. **`aof work validate 92` → PASS** — "92 is well-formed." `aof work doctor 92` admits 0 findings for
   this chore (its one `numbering-gap` is a stream-wide `warn`, and no `control-unresolved` at either
   severity).

Re-measured independently at accept: `node scripts/test.mjs --only test/arch/acd-progress-ledger-consumed.test.mjs`
→ **9/9 green, exit 0**, the FF-6109 harness-switch lane included. The lane was confirmed **re-pointed,
not relaxed** — it still refuses every unnamed declared knob on the one fail-closed ground, and re-proves
"a switch, not a discriminating control" over a synthetic harness naming no key, so the claim no longer
rests on how many knobs `continue.md` names today.

**The green is not an artifact of the dirty tree.** The control is committed at HEAD (`bde9543e`). Three
`src/` files carry uncommitted chore-94 work (`work.mjs`, `fs.mjs`, `commands/doctor.mjs`); the lane
reaches `src/work.mjs` only through `work-loops.mjs`'s `parseFrontmatter` import, and that diff touches
`loadWorkspace`/`configFaultFrom` alone — `parseFrontmatter` is untouched, and `work-loops.mjs` imports
nothing from `fs.mjs` or `doctor.mjs`.

No scenario suite and no behavioural-verify step applies — a chore carries no acceptance contract by
design. `OUTCOME.md` authored alongside this decision (story 80).
