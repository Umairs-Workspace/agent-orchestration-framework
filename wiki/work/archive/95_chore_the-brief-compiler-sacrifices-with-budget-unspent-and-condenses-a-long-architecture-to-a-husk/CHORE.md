---
type: chore
number: 95
slug: the-brief-compiler-sacrifices-with-budget-unspent-and-condenses-a-long-architecture-to-a-husk
title: "The brief compiler sacrifices sections with budget unspent on a long story record, and condenses a long ARCHITECTURE to a husk"
status: done
owner: developer
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
# 95 · The brief compiler sacrifices sections with budget unspent on a long story record, and condenses a long ARCHITECTURE to a husk

## Intent

Three of 70/05's regression lanes over the real stream (`test/brief-pinned-to-the-stream.test.mjs`)
are red on milestone 72's records, and the defect is the compiler's, not the records':
`src/phase-brief.mjs` condenses a long `story` block to its one form and then sacrifices every section
below it although budget remains, and its architecture condenser keeps zero decision passages when
none fits the room whole. Measured at 72's gate (`72/F-72-AS`): 72/02's refine brief is 5,671 of
8,000 chars with `objective`, `tasks`, `fitness` and `dependencies` all sacrificed; 72/03's keeps
`objective` and loses the other three at 7,838; the milestone's refine brief carries an ARCHITECTURE
section naming 0 of 4 entries at 5,178. Every 72 story's refine brief therefore carries no contract
index and no dependency edge — F-11's own symptom, manufactured by the packer on records longer than
70/05's witnesses.

## Definition of Done

- [x] After the `story` block is placed in its one form, the sections below it that fit the remaining room are placed rather than sacrificed — `72/00`, `72/01`, `72/02` and `72/04`'s refine briefs carry `tasks`, `fitness` and `dependencies`, and no real item's brief sacrifices anything with more than a tenth of the ceiling unspent (the "nothing dropped with budget left" row of `70/05 task02`'s outline lane is green over the stream).
- [x] Every real story declaring a non-empty `depends:` receives a `DEPENDENCIES` section in its refine brief (`70/05 task02`'s dependency-edge regression lane green; today `72/02` and `72/04` are the two without one).
- [x] The architecture condenser never emits a husk: when no decision passage fits the room whole it carries a bounded form of the first — a decision this chore must take (heading plus the passage's opening lines, or the heading alone with the count) — so `72/refine`'s ARCHITECTURE section names at least one of its entries and `70/05 task02`'s husk lane is green.
- [x] `test/brief-pinned-to-the-stream.test.mjs` runs green as its own `--only` lane with the three lanes above named in the evidence, and 70/05's own contract suites over the compiler stay green with no leg weakened.
- [x] `aof work validate` is green (no regression)

## Notes

- Raised at `aof:verify 72` (2026-09-03) as `72/F-72-AS`. The three reds were already visible at 71's
  gate the same day and attributed there to "72's refine": the trigger is 72's record sizes
  (`STORY.md` bodies of 8–11k chars against 71's 6k; ADR decision passages each larger than the room
  the planner leaves), the cause is the compiler.
- Reproduce with `compileBriefForItem` (`src/phase-brief-read.mjs`) over `72/02` at phase `refine`:
  `sacrificed: ["objective","tasks","fitness","dependencies"]`, `chars: 5671`, `ceiling: 8000`,
  `sections: [["item",11],["story",4278]]`. The milestone at `refine`: `dispositions:
  [["architecture","condensed",0,4]]`, `chars: 5178`.
- The mechanism is the one `src/phase-brief.mjs`'s own comment on the exhaustion pass describes for a
  non-condensable `objective`: a section with one form is taken whole regardless of `available`, the
  sections below are squeezed, and bottom-up sacrifice bills them — and the re-plan that would hand
  the freed room back engages only while the rendered brief is OVER the ceiling, so once sacrifice has
  brought it under, nothing offers the room back. `condenseStory` accepts and ignores `budget` by
  design, which is what makes `story` that one-form section.
- The fix lives in `src/phase-brief.mjs` (milestone 70/05); this chore, not 72, is its home — 72's
  partition has no story that may write there.
- **AMENDMENT, ratified here (a delivered contract, so it lands in this chore's record and the
  `.feature` is not edited).** `70/05 task01`'s `sacrifice starts at the lowest declared priority`
  locks two rules: *the lowest-priority section is sacrificed first*, and *a higher-priority section
  is sacrificed only after every lower one has been*. The second, read as a claim about the FINAL
  sacrificed set — a suffix of the priority order — is exactly what this chore's first row overturns:
  `72/02` must carry `tasks`, `fitness` and `dependencies` while `objective`, which outranks all
  three, is the section given up. No packing satisfies both, because on these records nothing else
  can go. The amended rule: **shedding is still strictly bottom-up, but shedding is no longer the
  last word — the room a sacrifice frees is offered back, highest priority first, so the retained set
  need not be a prefix of the priority order.** What replaces the suffix rule is a stronger claim, and
  the one the notice already makes: a section is named SACRIFICED only when it could not be carried in
  the room the finished brief has left. Both delivered rules survive in the amended form — the shed
  order is unchanged, and `test/brief-carries-the-contract.test.mjs` keeps a direct witness that
  priority still decides who pays (two equal non-condensable rivals, only one of which fits: the
  lower priority is the one given up).
- The fix is three steps in `compilePhaseBrief`'s settlement, plus one in the architecture condenser:
  **reinstate** what the freed room can hold, **re-plan** the survivors so the bounded condensers get
  the shares the departure changed, and **spend the slack** a bounded condenser's granular fill
  strands (72/02's register had 1,080 chars of room its next whole row would not fit). The condenser
  gains a second declared FORM — heading plus the opening lines of the first decision passage — used
  only when no passage fits the room whole, which is also what un-starves the ADR headings
  `boundedFill` was holding room back from.
- Evidence (2026-09-04, `node scripts/test.mjs --only <file>`, `AOF_GLOBAL_HOME` isolated — this
  machine cannot run `scripts/check.mjs`, whose test stage binds the live daemon's `:4182`):
  `test/brief-pinned-to-the-stream.test.mjs` 12/12 green, including the three lanes this chore was
  raised on — the outline's `nothing dropped with budget left` row, the `dependency edge` regression
  and the `husk` regression. 70/05's own compiler suites re-run green with no leg weakened, together
  with the driver, seam and arch gates over the compiler: **159 ok, 0 not ok**
  (`phase-brief-compile`, `brief-carries-the-contract`, `architecture-slice`, `phase-brief-seams`,
  `brief-pinned-to-the-stream`, both `arch/acd-phase-brief-*`, `drive-command-phase-drivers`,
  `mesh-worker-driver-directive-command`, `agent-session-driver-door`, `loop-command-probe`,
  `loop-command-stops`, `grade-payload-bounded-in-the-writer`, `arch/acd-feature-parser-single-home`,
  `arch/acd-one-promotion-engine`). `aof work validate 95` PASS; `aof work doctor 95` exit 0;
  supply-chain audit 0 warnings.
- **The change is surgical, measured against the stream itself.** Every brief in `wiki/work` was
  compiled through `compileBriefForItem` before and after and compared byte-for-byte: **1,167 of
  1,173 identical**, and the 6 that changed are exactly the ones this chore names — `72/refine`
  (5,231 → 7,925, its ARCHITECTURE now naming 1 of 4 rather than 0) and `72/00`–`72/04`'s refine
  briefs (4,199–5,725 → 7,669–7,839, each now carrying `tasks`, `fitness` and `dependencies`).
  Husk sections across the stream: 1 → 0. Compile time over 1,173 briefs is unchanged (2,296 ms →
  2,111 ms) because the settlement engages only on the 5 briefs that sacrifice anything.
