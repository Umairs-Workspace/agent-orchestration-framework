---
type: chore
number: 121
slug: the-import-specifier-extractor-has-twenty-homes-and-119-00-added-the-twentieth
title: "The Import Specifier Extractor Has Twenty Homes And 119 00 Added The Twentieth"
status: done
owner: <role>
created: 2026-09-06
updated: 2026-09-11
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
# 121 · The Import Specifier Extractor Has Twenty Homes And 119 00 Added The Twentieth

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Point every `extract an import specifier` copy under `test/` at the one home 119/00 built
(`test/support/module-family.mjs`'s `importSpecifiers`), and make FF-11901's "spells no specifier
extractor of its own" leg a CLASS over `test/arch/**` — so the twenty-first copy fails CI instead of
needing a reviewer's eyes. The copies disagreed (one was blind to a multi-line import clause; others
dropped `export … from`, the bare form, `require(` or `import(`), so each was a quiet hole in a
closure or purity claim.

## Definition of Done

- [x] TECH_DEBT item 24's species one class over: 20 files under test/ declare their own 'extract an import specifier' (grep -rlE 'function (directImports|staticImports|importSpecifiers|imports)\('), and they disagree — the line-bounded [^;\n]*? spelling is blind to a multi-line import, which 119/00 fixed in its own one home only. Point the existing declarers at test/support/module-family.mjs's importSpecifiers, then widen FF-11901's 'spells no specifier extractor of its own' leg from the nine converted purity carriers to test/arch/**, with a shrink-only named baseline for whatever remains — the shape acd-comment-stripper-order.test.mjs already uses for item 24.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "The import-specifier extractor has twenty homes, and 119/00 added the twentieth" (`test/support/module-family.mjs:85`)
- **Raised reviewing:** `119/00`, review round 1
- **Promotion key:** `finding:119/00:the import-specifier extractor has twenty homes, and 119/00 added the twentieth`

### What the run measured (2026-09-11)

- **The DoD's grep undercounted by half.** Its four function names found 20 files; the shape
  detector FF-11901 now carries (a regex literal that *captures* a quoted specifier after
  `from`/`import`/`require`, read over `blankStringLiterals`) found **26 more** under `test/arch/`
  alone — 35 literals, under other names (`moduleSpecifiers`, `importsOf`, `specifiers`,
  `staticImportSpecifiers`) or inline at the call site. Two of them were among FF-11901's own nine
  "converted" purity carriers (`acd-loop-checks-pure`, `acd-session-driver-mesh-blind`): the old
  per-carrier check was name-based and never saw an inline `matchAll(/(?:import|export)…/)`.
- **Converted: 41 files.** 17 of the named 20 under `test/arch/` (12 flat `importSpecifiers`, 3
  `{clause, specifier}` `imports()` whose clause no caller read, `directImports`, `staticImports` —
  the last two kept as one-line delegates because their `!dynamic` narrowing is the caller's contract
  and they have 13 and 3 call sites), 21 of the 26 inline/other-name spellings, the duplicate export
  in `test/support/terminal-gate-detectors.mjs` (deleted; its two consumers now import the home), and
  FF-11901 itself.
- **Baseline: 5 files, each with a named reason** (`EXTRACTOR_BASELINE`): three need the import
  **clause/bindings** (`acd-loop-document-current`, `acd-loop-suite-registration`,
  `acd-feature-parser-single-home`), one needs the **call form** to tell `import(`/`require(` from
  static (`acd-test-command-reports-not-decides`), and one is
  **byte-frozen** by FF-5311 ACCEPT-02 as an accepted milestone-52 suite (`acd-loop-finding-envelope`
  — converted, went red on the freeze, reverted; lifting a freeze is not this chore's call).
- **The home follows dynamic `import()`; two closure walkers did not, on purpose.** Pointing
  `acd-trigger-holds-no-clock` and `acd-session-driver-mesh-blind` at the home without a filter moved
  three controls' reach ceilings (FF-6301 reads its closure through the first; FF-6303's "one setTimeout, in src/fs.mjs" → 8 more files via a deferred
  `import()`; FF-5301's "reach is exactly 71" → 74). The ceilings were right and the walkers' contract
  is STATIC closure, so both keep it with `.filter((entry) => !entry.dynamic)`; recorded in FF-11901's
  baseline comment for the next converter.
- **The home grew one form (review round 1, QA lens).** The converted trigger pair (`acd-trigger-level-is-a-ceiling`,
  `acd-trigger-never-classifies`) used to see a backtick-quoted call specifier — `` import(`./x.mjs`) `` — and the
  home did not: it reported every backtick as *computed* and `importSpecifiers` dropped it, so FF-6303/6304's
  closure had quietly lost a form. Fixed in the home rather than baselined: a template literal with no
  `${…}` is a literal in both call forms (`importSpecifiers`), one with a substitution stays computed
  (`computedDynamicImports`), and the two partition the call. That also converted
  `acd-loop-module-import-boundary` (baselined for exactly this) — the ratchet went 6 → 5 in-flight.
- **Left as they are, outside `test/arch/**`, by decision:** `test/session/agent-session-driver-door.test.mjs`
  (`staticImports` reads the clause AND its own self-check asserts a plant inside a template literal
  is NOT an import — the home is not string-literal-aware, and making a purity instrument so is a
  story about the home, not this chore); `test/support/census-carrier-plants.mjs` (the extractor
  there is planted SOURCE TEXT inside a string, the census's synthetic carrier — not a live copy).
### Review (solo, 2026-09-11 — architect · QA · craft, one round)

- **Blocker (QA, round 1) — fixed at the close:** the converted trigger pair lost the backtick call
  form its own `moduleSpecifiers` carried (see above). Fixed in the home; plants added to FF-11901
  leg 5; red-probed by restoring one converted control (the sweep named it by file:line).
- **Recorded findings (no item created; question 5 of the triage):**
  1. FF-11901 grew 499 → 640 lines carrying the new leg — TECH_DEBT item 39's species (no gate has
     a size ratchet). The DoD placed the leg here by name, so it is recorded, not moved.
  2. The extractor detector's signature is the house spelling, `([^"']+)` after
     `from`/`import`/`require`; a `(\S+)` or `(.+?)` capture would evade it. Widening it risks
     reading a clause capture (`import\s+(.+?)\s+from "x"`) as an extractor across 452 controls, so
     the bound is kept narrow and named here — the same class of limit `classifyImportBan` carries.
  3. `computedDynamicImports` covers `import(` only: a `require(\`./${x}.mjs\`)` is reported by
     neither function (pre-existing — before 121 no backtick `require` was seen at all).
  4. `computedDynamicImports` truncates a nested call's expression at its first `)`
     (`import(pathOf(x))` → `pathOf(x`); the call is still named, so cosmetic (pre-existing).
- **Handed back as a story shape (question 4 — new criteria the operator must author):** *the one
  home carries the import clause and is string-literal-aware.* `importSpecifiers` returns `clause`
  for the static form and extracts over `blankStringLiterals` (recovering the specifier from the
  stripped source at the same offsets), so a plant inside a template literal is not an import. That
  converts three of the five baseline files (`acd-loop-document-current`, `acd-loop-suite-registration`,
  `acd-feature-parser-single-home`) and the one declarer left outside `test/arch/`
  (`test/session/agent-session-driver-door.test.mjs`, whose census oracle FF-11902 drives), and the
  ratchet shrinks to two. Not done here because it changes a purity instrument's semantics for every
  carrier — a decision with acceptance criteria, not housekeeping.
- **Semantics note for the converted callers:** the home is a superset of every copy (it adds
  whichever of `export … from` / bare `import "x"` / `require(` / dynamic `import(` the copy lacked).
  With the three static-only walkers filtered as above, every exact-list assertion
  (`["node:path"]`, `["../claim-provenance.mjs"]`, the trigger leaf's `["../work/loop.mjs"]`, …)
  stayed green — measured over 63 suites (every changed suite plus every suite importing a changed
  module, the home's nine purity carriers among them), 428 ok / 0 not ok, `node scripts/test.mjs --only …` under an isolated `AOF_GLOBAL_HOME`. (`aof test --scope
  impacted` resolved this diff to the FULL suite, which this machine cannot run — `:4182` is the live
  daemon's — so the selection was derived from the diff by hand: every changed suite plus every
  suite importing a changed module.)
