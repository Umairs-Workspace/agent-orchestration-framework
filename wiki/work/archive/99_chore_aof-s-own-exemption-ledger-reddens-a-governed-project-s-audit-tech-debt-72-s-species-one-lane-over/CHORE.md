---
type: chore
number: 99
slug: aof-s-own-exemption-ledger-reddens-a-governed-project-s-audit-tech-debt-72-s-species-one-lane-over
title: "Aof S Own Exemption Ledger Reddens A Governed Project S Audit Tech Debt 72 S Species One Lane Over"
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
# 99 · Aof S Own Exemption Ledger Reddens A Governed Project S Audit Tech Debt 72 S Species One Lane Over

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

aof's shrink-only exemption ledger (`UNREGISTERED_BASELINE`) lists AOF's own suites, and `runCensus`
applied it — existence check and all — to whatever workspace the operator pointed the audit at. So
every governed project's `aof work audit` carried two `audit-baseline-stale` errors about two files
that were never going to be in it (measured: 2 of 6 error findings over a fixture workspace). It is
TECH_DEBT 72's species one lane over: a fact about aof's own tree asserted against somebody else's.

## Definition of Done

- [x] UNREGISTERED_BASELINE in src/work-audit/census.mjs is aof's hardcoded list of AOF's own suites, and its on-disk existence check runs against the AUDITED workspace, so every governed project gets audit-baseline-stale at error for suites it was never going to have (measured: 2 of 6 error findings over a fixture workspace). Root that check at the toolkit root (src/work-audit/toolkit.mjs, shipped by 77/04), or apply the ledger only when the subject root IS the toolkit root; then update the pinned expectation in test/arch/acd-audit-travels-two-roots.test.mjs, which names this as the known remaining exception.
- [x] `aof work validate` is green (no regression)

## Outcome (build + review, 2026-09-05)

- **`src/work-audit/toolkit.mjs`** gains `isToolkitRoot(subjectRoot, toolkit)` — pure, deciding by
  `path.relative` so the platform's own drive-letter/separator rules stay Node's single answer.
- **`src/work-audit/census.mjs`** gains `LEDGER_PROJECT` + `ledgerApplies(repoRoot)`, filed next to
  the ledger they govern. `runCensus`'s `baseline` now defaults to `null` and resolves to
  `UNREGISTERED_BASELINE` only when the ledger applies. A caller that NAMES a baseline is naming its
  own and is honoured as given, so the injection seam is intact.
- **`test/arch/acd-audit-travels-two-roots.test.mjs`** — the pinned expectation is updated (the pin
  existed to force exactly this) and driven from both sides: governed workspace, the install, the
  project checked out elsewhere, an unreadable manifest, and a governed project that files a path
  aof exempts (reported on its own merits, never `carried`).

**Deviation from the DoD's two stated options, and why.** The DoD offers "root that check at the
toolkit root" or "apply the ledger only when the subject root IS the toolkit root". Measured, both
are wrong in one arrangement: under a payload install the toolkit root is `~/.aof/bin`, which ships
`src/` (the census lane included) and **no `test/`**. So when a deployed binary audits aof's OWN
repository, option one reds with two `audit-baseline-stale` findings and option two silently drops
two legitimate exemptions — a false red in aof's own audit, which this chore's own second box rules
out. The predicate therefore asks whether the subject IS THE PROJECT the ledger describes (directory
identity with the install, or the subject's own manifest naming it) rather than whether it is the
install's directory. The name is read from the SUBJECT because the payload's manifest carries a
version and no name.

**Test scope.** `aof test --scope impacted --since HEAD` widened to `scope all` (1015 suites) because
a chore's record docs are not graph nodes, and `all` cannot run on this machine (the live control
daemon holds `:4182`). The verdict above is `--scope file` over the 18 suites that import the changed
modules, enumerated by import edge — stated as the scope it ran as, not as a whole-tree claim.

## Findings (routed at review close)

- **A chore has no declaration to scope `aof test --scope impacted` by** — `--story` refuses a chore
  (`story-ref-not-a-story`) and `--since <rev>` widens to `all` on the chore's own record docs, so the
  declaration-driven test path is unavailable for every chore. Routed as **story (operator)**: how a
  chore scopes its impacted run is new acceptance criteria, so the loop creates nothing here.
- **A governed project cannot declare its own exemption ledger.** The seam exists on `runCensus`'s
  `baseline` parameter but no config path reaches it. Recorded finding; not in this chore's scope.

## Accept decision

**ACCEPTED** 2026-09-05, on the chore's two close criteria (ADR-003) — no scenario run and no
behavioural-verify step applies.

1. **Checklist ticked.** Both `## Definition of Done` boxes are `- [x]`; none left `- [ ]`.
2. **`aof work validate` green.** `aof work validate 99` → `PASS — 99 is well-formed.`

**Regression confirmed at the source, not from the record.** The 16 suites that import the changed
modules (`src/work-audit/census.mjs`, `src/work-audit/toolkit.mjs`) were re-run under an isolated
`AOF_GLOBAL_HOME` — 191 assertions, 0 failures, exit 0, the pinned
`test/arch/acd-audit-travels-two-roots.test.mjs` among them.

**The DoD deviation is accepted as recorded.** The chore states why neither of the DoD's two stated
options was taken and what each would break under a payload install; the predicate shipped satisfies
the criterion the box was written to secure — a governed project's audit no longer carries aof's
exemptions, and aof's own audit keeps them.

**Findings carried, not blocking.** Both entries under `## Findings` are routed elsewhere (a story
for the operator; a recorded gap now stated as product state in `OUTCOME.md`). Neither is a blocker
against this chore.

## Notes

- **Promoted from review finding:** "aof's own exemption ledger reddens a governed project's audit — TECH_DEBT 72's species, one lane over" (`src/work-audit/census.mjs:96`)
- **Raised reviewing:** `77/04`, review round 1
- **Promotion key:** `finding:77/04:aof's own exemption ledger reddens a governed project's audit — tech_debt 72's species, one lane over`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
