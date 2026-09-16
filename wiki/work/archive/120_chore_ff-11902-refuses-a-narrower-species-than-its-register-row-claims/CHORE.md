---
type: chore
number: 120
slug: ff-11902-refuses-a-narrower-species-than-its-register-row-claims
title: "Ff 11902 Refuses A Narrower Species Than Its Register Row Claims"
status: done
owner: <role>
created: 2026-09-06
updated: 2026-09-10
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
# 120 · Ff 11902 Refuses A Narrower Species Than Its Register Row Claims

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

FF-11902's register row claims that no control asserts an exact equality against a tree-derived set and that no sweep can pass by going vacuous, but the control 119/00 shipped refused only a `startsWith("x-")` prefix filter, a swallowed catch, and the door's own equalities. This chore widens the control to the species the row names — every repository walk narrowed by a filename predicate, and every retyped tree-walk equality across every control — and converts the live carriers the widened detector finds, so the row's claim is measured rather than stated.

## Definition of Done

- [x] Widen FF-11902 from the prefix-filtered/silent-catch species to every repository walk narrowed by a filename predicate, and to every retyped tree-walk equality. Measured at 119/00 review: 24 filename-predicate repository walks of which 14 carry no non-vacuity leg, plus 4 live retyped equalities (acd-home-pane-truth.test.mjs:469, acd-tunable-set-is-the-registry.test.mjs:113, fleet-terminal-view-surface.test.mjs:811, work-validate-contract-parses.test.mjs:275). For each: add a floor over the swept set naming the directory walked, or derive the equality into a per-member property plus a floor. Then widen the control's refusing legs and re-measure. Re-measure with the exported prefixFilteredWalks/treeWalkEqualities rather than a fresh grep.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "FF-11902 refuses a narrower species than its register row claims" (`test/arch/acd-control-derives-its-census.test.mjs:207`)
- **Raised reviewing:** `119/00`, review round 1
- **Promotion key:** `finding:119/00:ff-11902 refuses a narrower species than its register row claims`
- **Re-measured 2026-09-10 with the widened control's own exports, against the tree at HEAD before
  any conversion:** 27 predicate-narrowed repository walks, 15 with no floor, 3 retyped
  tree-walk equalities (`acd-home-pane-truth:479`, `fleet-terminal-view-surface:811`,
  `work-validate-contract-parses:275`). The fourth site the DoD names,
  `acd-tunable-set-is-the-registry:113`, was a detector defect — an expression-bodied arrow's
  "body" was cut from the next `{` in the file, so a pure in-memory filter read as a rooted walk.
  Fixed in the control; that site reads the tree through an imported loader and was converted by
  hand to a floor plus a declared ceiling. After conversion the exports report 0 unguarded, 0
  retyped, 0 silent, over 1,053 controls.
- **Exports renamed with the species:** `prefixFilteredWalks` → `predicateFilteredWalks`,
  `unguardedPrefixFilters` → `unguardedPredicateFilters`. `treeWalkEqualities` keeps its name and
  now also sees `.size`, `strictEqual`, and the literal on the left.
- **Two further detector defects fixed on the way:** the statement cut ended at the `}` of
  `readdir(dir, { withFileTypes: true })` and lost the walk (now paren-aware, over literal-blanked
  text); and `test/support/source-slice.mjs`'s blanker collapsed an astral character to one space
  under the `u` flag, shifting every offset after it by one (measured in one control). The
  control now asserts every control is read faithfully, by name.
- **Second round (operator: no debt, fix inline).** The line was widened again and every carrier
  converted: a walked set is now followed through pure set-narrowing (the bind-first shape), a
  read handed a root-derived path seeds it (`readFile(path.join(root, …))`, `loadLoops(…)`), and a
  retyped member census (`deepEqual(derived, ["…"])`) is refused as its own species. Derivation is
  position-scoped, stops at a CALL (a checker handed the tree plus a plant is a red probe, not a
  fact), skips a test body that builds a temp directory, and no longer reads a dynamic
  `import(…, import.meta.url)` as a root. Measured at HEAD with the shipped detectors: 61
  predicate-narrowed walks, 22 unguarded, 6 retyped equalities, 9 retyped censuses; after
  conversion 60 walks, 0/0/0/0. Twenty-one further controls converted, each to the admitted form —
  a floor, a declared ceiling where the number is a decision ("exactly one home", "no new parity
  control"), and the named members asserted AMONG the set; a policy allowlist is spelled as
  "each named member among the set, every member admitted", never the set enumerated.
- **`TECH_DEBT` item 81 discharged and deleted.** Its five frozen-set censuses (two suites, five
  sites cross-read by FF-6105) now DERIVE from `src/bundle/frozen-set.jsonc` — installed set,
  member ids, enforcement points, deny rules — with one declared floor on the member count that a
  withdrawal ceremony lowers; FF-6105 is re-based on 119/ADR-003 and asserts no site retypes the
  set (its literal parser now requires the literal to sit immediately after its anchor). The
  fourth named carrier, `NAMES_THE_NEW_MODULE`, is a policy allowlist admitted by 119/ADR-003 §2
  and the control's own classifier — every entry carries its reason — and stays.
- **Outside the line, named in the control's header:** an absence claim over a HELPER's whole
  return (`deepEqual(await srcFilesContaining(root, X), [])`), whose floor would sit on the helper's
  own walk inside `test/support/`; a zero-argument imported reader (`bundledFrozenSet()`); and a
  NUMBER ABOUT a file's content (119/F-34), a different species from a set drawn from the tree.
- **Test scope:** `aof test --scope impacted` widens to the whole suite here because the chore's
  record doc is in the changed set and not in the graph (119/F-09's species); the build ran every
  touched suite by file, isolated — 40 suites, 400 rows green after the second round.

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
