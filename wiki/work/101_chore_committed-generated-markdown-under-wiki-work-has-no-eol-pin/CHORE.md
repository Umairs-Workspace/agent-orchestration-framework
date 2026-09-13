---
type: chore
number: 101
slug: committed-generated-markdown-under-wiki-work-has-no-eol-pin
title: "Committed Generated Markdown Under Wiki Work Has No Eol Pin"
status: done
owner: <role>
created: 2026-09-03
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
# 101 · Committed Generated Markdown Under Wiki Work Has No Eol Pin

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

`.gitattributes` pins no `eol` for `wiki/work/**/*.md` while this control node runs
`core.autocrlf=true`, so story 79's committed `wiki/work/loops.md` checks out CRLF against an LF
composer and its drift gate reds on a fresh Windows checkout — reporting a registry change that
never happened. Pin the committed generated markdown to `text eol=lf` before that costs someone a
debugging session (m22/R5, already once).

## Definition of Done

- [x] core.autocrlf=true on the Windows control node and .gitattributes pins no eol for wiki/work/**/*.md, so story 79's committed wiki/work/loops.md checks out CRLF while its composer emits LF — acd-loop-document-current would red on a fresh Windows checkout with a message about a registry that had not changed (m22/R5). Add a text eol=lf pin covering committed generated markdown under the work directory, then verify with git check-attr eol.
- [x] The SOURCE tree is consistent too, or the inconsistency is deliberate and recorded: `src/loop-record-render.mjs` is CRLF while its three milestone-78 siblings (`src/loop-record.mjs`, `src/commands/loop-record.mjs`, `src/work-doctor-loop-record.mjs`) are LF. No rendered byte depends on it and no control reads it, which is why it went unnoticed until an editing tool's LF anchor failed to match (`78/VERIFICATION.md` **F-78-J**, routed here).
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "Committed generated markdown under wiki/work has no eol pin" (`.gitattributes:31`)
- **Raised reviewing:** `78/02`, review round 1
- **Promotion key:** `finding:78/02:committed generated markdown under wiki/work has no eol pin`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

**Discharged 2026-09-05.** `.gitattributes` gains one rule — `wiki/work/loops.md text eol=lf`
— pinned by PATH, the same shape `UPGRADE-CHANGELOG.md` already carries for the same reason: a
generated projection whose guard is byte-identity. A `wiki/work/**/*.md` glob was written first and
**rejected under review**: it also covers the hand-authored record docs, one of which
(`wiki/work/26_.../SPEC.md`) is the non-vacuity CONTROL in `acd-runs-eol-pinned` (asserted `unspecified`), so the
blanket pin turned that proof vacuous. Measured, not reasoned: the glob version ran the suite red on
that control entry (`got {"text":"set","eol":"lf"}` where `unspecified` was asserted). The pin is
scoped to the one file a gate reads.

**Box 1 — reproduced, then fixed.** Before the pin, on this control node
(`core.autocrlf=true`), `acd-loop-document-current` red with *“The committed loop document
wiki/work/loops.md is STALE — a loop record changed and the document was not regenerated”* over a
registry that had not changed: `git ls-files --eol` reported `i/lf w/crlf attr/` for `loops.md`, so the
guard compared CRLF checkout bytes with the composer's LF output. After the pin and a re-checkout of
that one file it reports `i/lf w/lf attr/text eol=lf`, `git check-attr eol -- wiki/work/loops.md`
answers `lf`, and the gate is green 8/8. `git check-attr` also answers `unspecified` for
`wiki/work/26_.../SPEC.md`, `wiki/work/ROADMAP.md` and `src/loop-record-render.mjs`, so the pin is
scoped as intended rather than blanket.

**Box 2 — the source tree is consistent; nothing committed was ever inconsistent.** Measured
2026-09-05, `git ls-files --eol` reports all four milestone-78 modules **identically** as
`i/lf w/crlf attr/`: `src/loop-record-render.mjs`, `src/loop-record.mjs`, `src/commands/loop-record.mjs`,
`src/work-doctor-loop-record.mjs`. Every one is LF in the index and CRLF in the checkout, because
`core.autocrlf=true` writes CRLF for any file no attribute pins. **F-78-J measured a WORKTREE
difference with a transient cause**: a file just written by a tool still holds the LF bytes that tool
emitted, and only becomes CRLF when git next checks it out — so at that gate the three freshly-written
siblings read LF while the older render module had already been through a checkout. A checkout cycle
removes the difference and there is no committed byte to repair. **No `src/**` pin is added**, and that
is deliberate: the source tree carries no byte-identity guard — F-78-J itself records that no rendered
byte depends on it and no control reads it — so a pin there would be a rule with no gate behind it.

**Box 3 —** `aof work validate` **PASS — work stream is well-formed** (whole stream), and
`aof work validate 101` **PASS**. `aof work doctor 101` returns one `numbering-gap` **warn** (a
pre-existing top-level numbering gap across the stream, not admitted by the gate ladder, which admits
only `error`-severity gate codes) and no `error`.

### Findings at the review close (round 1, no Blocker outstanding)

- **The loops.md eol pin has no platform-independent guard** (Important) — **discharged in this
  chore at `aof:verify`, no driver created.** The rule's absence only manifests on a
  `core.autocrlf=true` Windows checkout, where `acd-loop-document-current` reds; on Linux CI
  nothing reds, so deleting the rule would land green and re-arm the exact false `STALE` red this
  chore was raised for. The guard is `test/arch/acd-loop-document-eol-pinned.test.mjs`, mirroring
  `acd-runs-eol-pinned`'s `git check-attr` method (git's own matcher, never a literal grep) and
  carrying two non-vacuity controls — `wiki/work/26_.../SPEC.md` (which is `acd-runs-eol-pinned`'s
  own control, so the blanket-glob regression cannot return unseen) and `wiki/work/ROADMAP.md`,
  both asserted `unspecified`. Registered in `scripts/test.mjs` and accepted by
  `instrument-census`. **Red probe:** commenting out the `.gitattributes` rule reds the first
  assertion — *"the committed loop document wiki/work/loops.md is pinned eol=lf"* — while the
  scoping assertion stays green; rule restored and re-verified at `.gitattributes:86`.

  This finding was originally promoted to a top-level **chore 118** by `aof:continue`'s
  `<finding_triage>` question 2, which routes every surviving Important finding by SHAPE
  ("discharged by a checklist against existing code") with no test of COST — so a ~40-line arch
  test drew a whole driver folder, exactly as this chore itself was drawn out of `78/02`. The
  stub was never committed; it was deleted at accept and the remedy folded here instead. Operator
  decision, 2026-09-05.

- **A chore lane has no declaration-driven test scope** (Important) — routed **story
  (operator)**, nothing created. `aof test --scope impacted --story 101` refuses with
  `story-ref-not-a-story` (*“only a story declares a write set”*), which is correct, but the loop's
  build terminator names that command for every driver. A chore therefore falls back to suites
  chosen by judgement, which is the selection the declaration exists to remove. Teaching the loop
  (or `aof test`) what a chore's scope is needs acceptance criteria a `.feature` must state, so it
  is the operator's call rather than the loop's.

**Review verdicts (solo, — this session played every lens).** Structural: **PASS**, one Important
finding above. Behavioural: **PASS** against all three Definition-of-Done boxes, one Important
finding above. Craft: **PASS**, with one defect found and fixed in-flight (the first write of the
rule was encoded `latin1`, which truncated three U+2014 em-dashes to stray `0x14` bytes; rewritten
as UTF-8 and re-verified at 0 control bytes). Design conformance: **not applicable** — no UI
surface. One Blocker was raised and cleared inside the build round, before review: the first
version of the rule was the glob `wiki/work/**/*.md`, which made `acd-runs-eol-pinned`'s
non-vacuity control vacuous; the rule was narrowed to the single path and the suite re-ran green.

**Test scope, stated as it ran.** Not a whole-tree run. `aof test --scope impacted --story 101`
refuses a chore ref, so the suites were selected as the ones that read `.gitattributes` or the
pinned file: `acd-loop-document-current`, `acd-runs-eol-pinned`, `acd-mesh-eol-pinned`,
`acd-trigger-declaration-is-data` (FF-6302/7, the eol ratchet), `work-insert-crlf-template-strip`
and `acd-chore-dod-checklist` — **23/23 green, 0 failures**. That stands as this chore's evidence,
not as a verdict on the tree.
