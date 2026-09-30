---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this item truly done, and what is the
  evidence? Written at `aof:verify`, per story as each lands. Owner: product-owner — the SINGLE
  WRITER. Evidence agents REPORT; they never author here.
  Four sections: the evidence, the fitness register (the red probe per declared control), the
  findings, and the accept decision. Write only the sections that have content — the absence of a
  section is information, and an empty "None" placeholder is not.
-->
# NN · <Item Title> — Verification

## Verification evidence

<!-- One entry per lane that ran. For each `@manual` scenario record the PROCEDURE, the RESULT and a
     `verifies →` pointer at the scenario it discharges; never restate the outcome the scenario
     already states. Re-run what an agent reports rather than transcribing it. -->

### <story or lane> — <what ran>

- **`<suite / command>`** — <what it exercised, and the result>.
  `verifies → tasks/<NN>_<slug>.feature`

## Fitness functions

<!-- THE RED-PROBE REGISTER, and the one section that is new. This block CITES: every row resolves to
     a declaration in the sibling `ARCHITECTURE.md` `## Fitness functions` register and declares
     nothing of its own — one id, one declaration, with the evidence living in its own document. Each
     row still writes its id ALONE in the first cell, the positional form both registers share.

     The `red probe` cell records what was changed to make the control fail, and the message observed.

     A control must fail when the invariant it guards is broken, so the probe is that assertion's
     positive control and this row is where a reviewer reads that it was observed failing. A guard
     whose passing state is "found nothing" is indistinguishable from a broken one by every signal
     except a red probe: an assertion nobody has ever seen red cannot be falsified by its own green,
     which makes it vacuous however good the suite looks.

     WHAT THIS FIELD DOES NOT CATCH, stated plainly so it is never read as a promise:
     - This field does NOT catch a fabricated probe, which no declarative model catches.
     - This field does NOT reach any assertion that is not a declared control — the obligation reaches `FF-NN` ids alone, never every scenario in every `.feature`, and never an assertion inside a behavioural suite.
     - This field does NOT record whether the probe was performed on the bytes that actually shipped.
     - This field does NOT survive a reflow of its own placeholder: the check compares the probe cell against one frozen literal, so a placeholder that gains an extra internal space reads as a RECORDED probe rather than a missing one.
     So a recorded probe does NOT prove the assertion was ever really run. What changes is that an
     invisible absence becomes a specific, checkable claim in a document a reviewer reads — a smaller
     surface, not a closed one.

     An untouched placeholder cell is a MISSING red probe rather than a recorded one, and a control
     whose file has not landed is declared `pending` in `ARCHITECTURE.md`.

     **Do not accept an item whose `ARCHITECTURE.md` register declares a control that does not resolve** — marker or no marker. Nothing refuses the transition for you: `aof work doctor <ref>` reports each one as `control-unresolved`, a standing `pending` marker downgrades it to `warn`, and a warn-only doctor result does not fail `aof:validate`. What clears it is landing the file or dropping the declaration, never re-marking it `pending`. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| <FF-NN> | `test/arch/<name>.test.mjs` | <GREEN, or what failed> | <what was changed to make it fail, and the message observed> |

## Findings

<!-- The seven columns, with the id ALONE in the first cell — that is what makes this block a register
     a check can read, and what makes a duplicate id detectable. A reviewer reports findings
     UNNUMBERED, an ordered list one line each; the single writer allocates each id here, at the
     moment of landing it. Findings live here, never in a task folder.

     **Cite another item's id as `m?<itemRef>/<ID>`** — the `m` prefix is optional, because both spellings are real — **and cite only ids that resolve**: a bare id is addressable only inside its own item's documents, so a cross-item citation carries the ref. -->

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| <F-NN> | <what was observed, concretely> | defect \| design-gap \| enhancement \| test-gap | <low \| medium \| high> | <blocker → `@bug` scenario + fix; non-blocker → backlog; design-gap → DESIGN rule first> | <role / item> | <open \| closed> |

## Accept decision

<!-- The verdict, its date, and what it rests on: the lanes that ran green, the human sign-off if any
     `@uat` scenario existed, and every blocker finding closed. Accept only when validate passes and
     no blocker finding is open. -->

**<ACCEPTED | DECLINED>** — <date>. <What the decision rests on, and anything carried forward.>
