---
type: story
number: 01
slug: the-hook-wiring
title: "The hook wiring — the duplicate is detected, and the merge that produced it is not touched"
parent: 77
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-005, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010, wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-005, src/work-audit/reads.mjs, src/claude-settings.mjs, src/frozen-set.mjs, src/model.mjs, src/bundle/hooks/claude-session-start.json, .claude/settings.json, test/support/source-slice.mjs, scripts/test.mjs, test/arch/acd-audit-never-imports-project-code.test.mjs, test/support/read-src-files.mjs]
files: [src/work-audit/hook-wiring.mjs, test/work-audit-hook-wiring.test.mjs, test/arch/acd-hook-rule-detects-never-writes.test.mjs, scripts/test.mjs]
---
# 01 · The hook wiring

## User story

As an operator whose settings file aof merges into on every `aof work update`,
I want to be told when a hook is registered twice under one matcher, without the framework ever deciding on my behalf which copy is disposable,
so that I pay one process per event instead of two, and my own hand-authored hooks are never at risk from the fix.

## Tasks

- [ ] `tasks/00_an-unmarked-twin-of-a-managed-hook-is-reported.feature` — a marked entry and an unmarked entry, one event and one matcher, equivalent in RESOLVED INVOCATION → one `audit-hook-duplicated` at `error`; the marker key injected, a reformatted copy still a copy, a differing `args` not
- [ ] `tasks/01_the-rule-refuses-to-claim-an-operators-hook-and-writes-nothing.feature` — the four entries the rule may not claim — the operator's own unpaired guard, a twin under a different matcher, a twin in a different event, a marked/marked pair — and the write refusals: nothing mutated, no route to a settings write, no trace on disk

## Notes

- **This story DETECTS and does not repair, and the reason is a standing decision in another milestone.** `72/ARCHITECTURE.md#ADR-005 §3` refused to change the merge rule, on the ground that *"the framework must never silently delete a user's hand-authored hook"* — the same mechanism that keeps this repo's own unmarked `guard-test-isolation` entry alive across every `aof work update`. **A collapse rule in the merge would delete that too.** `ADR-005` here honours that refusal and records the only admissible future repair: non-destructive *suppression* — decline to add a second copy; never delete, never adopt.
- **The repo-local ratchet belongs to 72, not here.** `72/FF-7206` asserts that no unmanaged entry in this repo's `.claude/settings.json` is command-equivalent to a managed one, and `72/ADR-005 §4` says in as many words that it *does not travel*. This story builds the half 72 declared out of its own reach: the rule that ships with the bundle and runs in a project nobody has gated.
- **The control is a RATCHET, green on arrival.** Measured 2026-09-03: this repo now carries six hook entries, five marked and one deliberately unmarked, and **zero duplicate pairs** — 72/03 deleted the three that `RESEARCH.md` measured, mid-session. FF-7703's red probe is therefore a PLANTED unmarked twin of a managed entry, not a repaired defect.
- The lane is a pure function over an injected settings object and marker key. It reaches no merge, opens no file for writing, and `ADR-005 §2`'s entry-versus-entry predicate is what removes the need to resolve canonical declarations from 77/04's toolkit root — the stage-1 edge that nearly existed and now does not (`ADR-010 §3`).
- **A `TECH_DEBT.md` entry is owed for the merge blind spot** and is written by the product owner alongside this breakdown, per `ADR-005 §5`.
