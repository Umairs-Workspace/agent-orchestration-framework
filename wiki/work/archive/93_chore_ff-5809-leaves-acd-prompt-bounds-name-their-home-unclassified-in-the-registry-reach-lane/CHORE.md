---
type: chore
number: 93
slug: ff-5809-leaves-acd-prompt-bounds-name-their-home-unclassified-in-the-registry-reach-lane
title: "Ff 5809 Leaves Acd Prompt Bounds Name Their Home Unclassified In The Registry Reach Lane"
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
# 93 · Ff 5809 Leaves Acd Prompt Bounds Name Their Home Unclassified In The Registry Reach Lane

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

FF-5809 (`test/arch/acd-registry-fixture-closed.test.mjs`) classifies BY NAME every test file that
reaches `src/bundle/loops/`, and reds until a new one is put in exactly one lane.
`test/arch/acd-prompt-bounds-name-their-home.test.mjs` (FF-7101, landed at 71's close) reached it and
sat in no lane, so the control was red — and stayed red across four milestone gates (63, 71, 72, 77),
each of which named it as an inherited red with a home rather than a defect of its own. This chore
closes that lane assignment and re-runs the control.

## Definition of Done

- [x] Classify test/arch/acd-prompt-bounds-name-their-home.test.mjs into exactly one lane of FF-5809's registry-reach taxonomy (it reaches src/bundle/loops/ and no lane claims it), or route its fixture through the one subset helper. Then re-run the control and confirm the classification lane is green.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "FF-5809 leaves acd-prompt-bounds-name-their-home unclassified in the registry-reach lane" (`test/arch/acd-test-suite-registration.test.mjs (FF-5809 lane)`)
- **Raised reviewing:** `72/03`, review round 1
- **Promotion key:** `finding:72/03:ff-5809 leaves acd-prompt-bounds-name-their-home unclassified in the registry-reach lane`

### How it was discharged (2026-09-04)

**The classification itself landed under chore 88**, whose own `## Definition of Done` named this
same red as its first item — the two chores were promoted from the same measurement at 71's gate
(F-71-H) and 72's gate, and 88 reached it first. Commit `bde9543e` added the file to **lane 3**
(`READS_WITHOUT_COPYING`) of FF-5809's four-lane taxonomy, with its reason recorded beside it. No
further code change was needed here, and none was made: this chore VERIFIED the assignment at
source rather than re-landing it.

**Lane 3 is the honest lane, checked against the leg each lane carries.** FF-7101 walks
`src/bundle/**` IN PLACE (`bundleAssets()`) and pins the `ceiling:` lines of
`loops/review-fix-rereview.md` and `loops/build-to-green.md` as bound facts — a cited bound read out
of shipped record text, which is exactly what lane 3 is for. It plants its mutations on the
in-memory asset list it already read (`planted()`) and copies nothing into a temp registry, so
endpoint-closure is not a property it can hold and lanes 1/2 are ruled out. It is not lane 4
either: lane 4 is for a suite that only spells the path inside its OWN fixture tree, and this one
reaches the shipped directory. Lane 3's own leg — that the file names neither `shippedFiles` nor
`shippedOriginalFiles` — passes.

**Measured, not assumed:**

| Check | Result |
| --- | --- |
| `node scripts/test.mjs --only test/arch/acd-registry-fixture-closed.test.mjs` (FF-5809, the control this chore names) | **3/3 green**, the classification lane included |
| `node scripts/test.mjs --only test/arch/acd-test-suite-registration.test.mjs` (the registration guard, to confirm the classified file is imported AND spread) | **4/4 green**, and it names this file in no unregistered set |
| `aof work validate` (whole stream) | **PASS** — work stream is well-formed |
| `aof work validate 93` / `aof work doctor 93` (the gate ladder) | clean; doctor's only finding is the stream-wide `numbering-gap` **warn**, which is not this chore's and not admitted |

Both runs were taken under an isolated `AOF_GLOBAL_HOME`, per the repo's standing test rule.

### Review findings (2026-09-04) — neither is a blocker for this chore

- **Important — this chore and chore 88 were promoted from the same red, and neither record knew
  about the other.** 71's gate routed it by HAND into chore 88's `## Definition of Done` (F-71-H);
  72/03's review round 1 promoted it through `aof work promote-finding`, which allocated chore 93
  under its own promotion key. The key-based dedupe cannot see a hand-routed sibling, so the two
  paths cannot converge. The remedy needs new acceptance criteria rather than a checklist, so it is
  routed to the OPERATOR as a story shape, not promoted: *a finding routed into an existing item's
  DoD registers under the same promotion key a later promotion would use.*
- **Important — `arch/chore-dod-checklist` is RED, and the subject is chore 97, not this one.**
  `wiki/work/97_chore_validate-refuses-the-honest-forward-reference/CHORE.md` carries **0**
  `## Definition of Done` sections and cannot close without one. Pre-existing (the file is untouched
  here), already named at milestone 77's gate, and already owned by chore 97 itself — so it is
  reported rather than promoted a second time. This chore's own row in that sweep is green.

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

## Accept decision (2026-09-04)

**Accepted.** Both chore close criteria (ADR-003) hold, re-checked at the source rather than read off
the ticks or off chore 88's record:

1. **Checklist ticked** — both boxes under `## Definition of Done` read `- [x]`, none left `- [ ]`.
   The classification is real and is where the record says it is:
   `test/arch/acd-registry-fixture-closed.test.mjs:107` carries
   `test/arch/acd-prompt-bounds-name-their-home.test.mjs` inside **lane 3**
   (`READS_WITHOUT_COPYING`), with the lane's own reason recorded immediately above it — FF-7101
   sweeps `src/bundle/**` in place, pins the `ceiling:` lines of `loops/review-fix-rereview.md` and
   `loops/build-to-green.md` as bound facts, and copies no subset into a temp registry, so
   endpoint-closure is not a property it can hold. `node scripts/test.mjs --only
   test/arch/acd-registry-fixture-closed.test.mjs` → **3/3 green**, the classification lane
   (`every test file that reaches the shipped registry is classified…`) included; `node
   scripts/test.mjs --only test/arch/acd-test-suite-registration.test.mjs` → **4/4 green**, naming
   this file in no unregistered set. Both runs under an isolated `AOF_GLOBAL_HOME`.
2. **Validate green** — `aof work validate` → `PASS — work stream is well-formed.`

`aof work doctor 93` reports no `control-unresolved` at either severity (a chore declares no
`ARCHITECTURE.md` register); its single finding is the stream-wide `warn: numbering-gap`, which is not
this chore's and is not admitted here. No blocker finding is open. `OUTCOME.md` authored alongside
(story 80): the state the ticking made true is a taxonomy under which no suite reaching
`src/bundle/loops/` is unclassified.

**Carried forward, not blocking** — both are the pre-recorded review findings above, re-affirmed at
accept:

- Chores **88** and **93** were promoted from the same red down two paths that cannot converge (71's
  gate routed it by hand into 88's DoD; 72/03's review promoted it under its own key). The remedy
  needs acceptance criteria, so it stays routed to the operator as a story shape.
- `arch/chore-dod-checklist` is RED on **chore 97**, which carries no `## Definition of Done`.
  Pre-existing, untouched here, and owned by 97 itself. This chore's own row in that sweep is green.
