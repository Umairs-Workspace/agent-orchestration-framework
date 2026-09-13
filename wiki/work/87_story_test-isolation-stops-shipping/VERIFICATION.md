---
doc: verification
updated: 2026-08-27
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 87 truly done, and what is the evidence?
  Written at aof:verify --solo, invoked as `85` and renumbered 85 → 87 at this gate (F-87-A).
  Only sections with content appear (absence is information).
  Parentless story (parent: null) → this is the story's verification record; there is no milestone
  SPEC box to tick. The story DOES carry an OUTCOME.md — story 80 widened ADR-004/006 to every
  delivering item, parentless stories included.
  NO @uat scenarios → no ## User sign-off section (no human was pestered).
  NO UI surface (a CLI/distribution concern, no DESIGN.md) → no design-conformance section.
  NO sibling ARCHITECTURE.md → no FF-NN controls are declared here → no ## Fitness functions register.
  The control this story RE-AIMS is 55/FF-5505, which stays on 55's register; the whole test/arch/**
  lane was still run, and its reds are recorded as F-87-C below.
-->
# 87 · The test-isolation guard stops shipping — Verification

## Method

Lanes in scope: **`@executable` only** — all three tasks carry `@executable` and nothing else. No
`@manual`, no `@uat`, no UI, no design-conformance lane.

Run **solo** (`--solo`): no evidence subagent was spawned. Every probe was executed inline by the
product owner who authors this record — also the single writer that allocates the finding ids below,
which is why no id was checked against the register before being allocated.

The suite was run **focused**, never as the whole repo lane (`global-work-propagation.test.mjs` binds
`:4182`, which the live control daemon holds) and always under an isolated `AOF_GLOBAL_HOME`, via
test-array imports rather than `node --test` — which passes these files silently with 0 assertions.

## Verification evidence

Run 2026-08-27 at the accept gate. Each row names the procedure and the observation; the outcome is
never restated.

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | an isolated `AOF_GLOBAL_HOME` plus a focused runner importing the story's two new test arrays and the seven suites its change set moves — `framework-stops-shipping-guard`, `repo-test-isolation-guard`, `acd-frozen-set-compiled`, `acd-frozen-set-tamper-coded`, `frozen-set-compiled`, `bundle-asset-manifest-complete`, `acd-artifact-sync-hook-derivation-free`, `claude-settings-merge`, `bundle-claude-session-hooks` | **61 cases, 0 failures** — every case of all three tasks green | tasks 00–02 |
| `@executable` (fitness) | the ENTIRE `test/arch/**` lane, imported from the runner's own assembled `tests` array and filtered to `arch/` | **1229 cases, 5 failed** — the 5 are F-87-C, every one in a file byte-identical to `HEAD` | 55/FF-5505 re-aim + the standing arch lane |
| withdrawal, at the source | a `test-isolation` search across `src/bundle/bundle.json`, `src/bundle/manifest.json` and `src/bundle/frozen-set.jsonc`; a listing of `src/bundle/hooks/` | no match in any of the three descriptors; the hook tree holds 13 files and no guard body; `git status` records the deletion | task 00 sc. 1–2 |
| withdrawal, at the source | reading the member ids the shipped declaration still carries | five, in order: `locked-contract`, `litmus`, `tag-vocabulary`, `gate-order`, `anchors` — the sixth is gone and the other five are unmoved | task 00 Outline rows 1–3 |
| re-homed guard, at the source | `.claude/settings.json` `PreToolUse` read directly; an `aofManaged` census over the whole file | the entry invokes the project-dir-absolute guard path and carries **no** `aofManaged` key; the file's four markers all sit on the `SessionStart` / `UserPromptSubmit` / `SessionEnd` / `PostToolUse` session-lifecycle entries | task 02 sc. 2 |
| re-homed guard, live | the installed hook driven end-to-end over stdin with real `tool_name` / `tool_input` payloads, one per Examples row, reading the process exit code | unisolated suite script **2**, unisolated package-manager test script **2**, unisolated runner over one test file **2**, nested shell invocation **2**; the isolation prefix **0**, an isolation exported earlier in the command **0**, a search whose pattern quotes the suite path **0**, a here-document whose body names it **0**, an aggregate entry point chaining the suite **0** | task 02 Outline, all ten rows |
| re-homed guard, shape | reading the predicate this tree executes: here-document stripping, then segment split, then tokenisation, then the executable-name test and the isolation test | the segment- and token-aware compiled predicate, not the pre-55 raw-text match; both the PowerShell env spelling and a prior `export` clear it | task 02 sc. 1 |
| 55's gap | reading the ledger entry naming this repository's pre-55 hand-wired hook in `55`'s `OUTCOME.md` | `**Status:** discharged (story 87, 2026-08-27)`, with `**Route actually taken:**` naming the by-hand replacement in place of the withdrawn update route | task 02 sc. 3 |
| delivered criteria | a diff of every `.feature` under milestone 55 against `HEAD` | empty — `55/04`'s `00_the-declaration.feature` is superseded in task 00's contract and **not edited**; only 55's two `OUTCOME.md` files moved | task 00 preamble |
| registration | a search for both new suites in `scripts/test.mjs` | imported at `:2922-2923` and spread into `tests` at `:3018-3019` — the re-homed cases run in the repo lane, not only in a focused one | task 02 sc. 4 |
| gate | `aof work validate 87` | `PASS — 87 is well-formed.` | step 4 |
| gate | `aof work doctor 87` | **no `control-unresolved` at either severity** (this story declares no `FF-NN` register); warns only — `cache-status-divergence` ×2, `numbering-gap`, `doc-over-budget` (STORY.md 156/150 — F-87-D, later refused at the accept gate and trimmed to 149), `rubric-join-unchecked` ×2 | step 4 |

**No `## Fitness functions` register is written, and that is a decision.** This is a parentless story
with no sibling `ARCHITECTURE.md`, so it declares no `FF-NN` controls of its own — and the red-probe
obligation reaches declared `FF-NN` ids alone. The control this story **re-aims**, `55/FF-5505`, stays
on milestone 55's register, which the story deliberately leaves unchanged. `aof work doctor 87`
confirms the position: zero `control-unresolved` findings at either severity.

**The two red probes the contract asks for were run and are green.** Task 01's anti-vacuity leg — *an
empty compiled hook set while a member names that point* — is asserted inside `acd-frozen-set-compiled`'s
red-probe case, alongside one stripped-id probe per compiled enforcement point and a census-disagreement
probe. Task 02's *a regression in the re-homed guard is caught here* runs as its own case and names a
read-only command the weakened predicate would block. Neither is a declared `FF-NN`, so neither is owed
a register row; both are recorded here because the contract names them.

## Findings

Ids are allocated here by the single writer of this record. **No blocker finding is open** — F-87-A was
resolved at this gate, and the framework-level check it exposes is routed as Important.

| id | finding | severity | route |
|---|---|---|---|
| F-87-A | **Ref `85` was ambiguous on disk, and the accept verb resolved it to the wrong item. RESOLVED at this gate by renumbering this story 85 → 87.** A concurrent lane scaffolded a second story numbered 85 — `wiki/work/85_story_records-follow-the-story` — while this gate was running, and then an 86 beside it. `resolveItemExact` in `src/commands/resolve.mjs:57` returns the FIRST row whose ref matches, so resolving `85` exactly answered the other lane's folder, confirmed live against the real workspace. `aof work status 85 done` would have addressed their story, not this one — where the lifecycle would have refused it, so it failed safe rather than corrupting, but this story could not be accepted by its number. The other 85 is in progress, so **this** story took the free number: the folder, its `number:` frontmatter, both new suites' case labels, the `story 85` comments across seven files and 55's two ledger citations were all moved to 87. **The framework-level defect stands:** `aof work doctor` reports a duplicate number only obliquely, as two `cache-status-divergence` warns naming two different folders, and there is no `duplicate-number` check — the collision was found by reading doctor's output carefully, not by being told | ~~Blocker on the accept mechanism~~ → **resolved**; the missing check is Important | a `duplicate-number` finding in `aof work doctor`, and an ambiguity refusal in `resolveItemExact` rather than a silent first-match |
| F-87-B | **A scaffold wrote two empty item folders into a doubled work path.** `wiki/work/wiki/work/85_story_records-follow-the-story/` and `wiki/work/wiki/work/86_story_the-span-vocabulary-completed/` exist, both empty, both created 21:48 — the work dir joined onto itself. They sit inside a tracked directory and are not ignored, so an `add -A` would commit them. Not caused by this story's change set; recorded because an orphan nobody named is the same defect in a quieter form, which is the boundary task 00 sets for itself | Important | route to the lane that ran the scaffold; delete the doubled path |
| F-87-C | **Five fitness-function controls are red in this working tree, and none implicates this story's change set.** Measured over the whole `test/arch/**` lane (1229 cases): `acd-loop-scope-guard` (`inRange` in `src/work.mjs` off its pinned hash — the `parseStorySpan` widening, now committed at `830e4f9`), `acd-memory-backend-selection` and `acd-graphify-backend-selection` (the memory-backend read appears in 7 locations, not 1), `acd-no-new-silent-catch` (`board-worker-stream.mjs`, `bundle/hooks/run-heartbeat-enqueue.mjs`, `commands/mesh-terminal-resume.mjs` above baseline) and `acd-feature-parser-single-home` (`src/phase-brief.mjs` is a second Gherkin recogniser). **All nine files these controls name are byte-identical to `HEAD`**, verified per file, so every red is pre-existing. Recorded because a red fitness lane must never be inherited silently. Continues `F-83-L` | Important | route to the owning lanes (84's span work and the standing arch debt); not a story 87 defect |
| F-87-D | **`STORY.md` was 156 lines against a 150-line budget, and the accept verb refused on it. RESOLVED by trimming to 149.** The advisory `aof work doctor 87` reports `doc-over-budget` at **warn**, which is what this register first recorded — wrongly reasoning that acceptance was therefore unaffected. The accept-time preflight in `src/commands/item-status.mjs:96-112` runs the same check with the accepting ref injected, which raises it to **error**, and `aof work status 87 done` refused with `artifact-budget-exceeded`. The advisory severity is not the gate severity, and reading the warn alone predicts the wrong outcome. What was trimmed is the `## Notes` control survey — refine-time scaffolding whose six controls are each carried as a measured row in this record, condensed to a pointer. No `## Why`, `## Scope`, `## The refine decision` or task line was touched | ~~Nit~~ → **resolved**; the two-severity surprise is a Nit | note the accept-gate escalation where doctor prints the warn, so a reader is not told `warn` by the only surface that shows it |

**The known side door is open by design, and the probe confirms it.** An aggregate entry point that
chains the suite passes the guard. Task 02's Examples table declares that row *allows it — the side
door this story leaves open*, and its preamble says the structural fix belongs in the suite runner. It
is verified as declared behaviour, not logged as a finding.

**What is green.** The story's own three tasks: **61 cases, 0 failures**, covering the withdrawal from
all three bundle descriptors and the hook tree, the retraction of an installed consumer's entry, the
re-aim of the trace control from a shipped-set census to a declaration-derived universal with its
anti-vacuity red probe, the three re-measured census literals, and the re-homed guard's ten cases plus
its own red probe. The `test/arch/**` fitness lane is green apart from the five pre-existing reds of
F-87-C. `aof work validate 87` reports `PASS`.

## Accept decision

**Accepted 2026-08-27** — `aof work status 87 done` moved it `in-review` → `done`. `aof work validate 87` reports
`PASS — 87 is well-formed.`; `aof work doctor 87` reports no `control-unresolved` at either severity;
every scenario of all three tasks is green; the withdrawal, the retraction, the re-aim and the
re-homed guard were each confirmed **at the source** rather than through the suite alone, and the live
hook was driven end-to-end over stdin for all ten of task 02's Examples rows.

**The story was renumbered at this gate, and that is recorded rather than tidied away.** F-87-A was a
collision in the stream's numbering created by a concurrent lane part-way through this gate: the accept
verb resolved `85` to `85_story_records-follow-the-story`, so stamping the acceptance through that ref
would have addressed the wrong item. The other 85 is in progress, so this story moved to the free
number — the operator's call, taken at the operator's direction. Nothing about the deliverable changed;
what moved is an identifier, and every reference to it moved with it.

**What acceptance claims.** That the framework no longer ships this
repository's lab hygiene: the member, the asset and the guard body are gone from all three bundle
descriptors and the hook tree, a fresh consumer install plants nothing over their build commands, and
an existing consumer's entry is retracted on the next update while their own entries survive in place.
That `55/FF-5505`'s control now derives its expectation from the declaration rather than from a census
of what happened to ship, so it binds the next hook member anyone declares without anybody re-arming
it, and refuses the vacuous repair spike 82 exists to catch. And that this repository keeps the
protection it actually needs, as the better predicate, hand-owned on an unmarked entry the framework
will never touch again.

**What it will not claim.** That the orphaned guard file an earlier version installed in a consumer's
tree is removed — it is left on disk, invoked by nothing, exactly as task 00's contract says. That the
aggregate-entry-point side door is closed — it is not, by declaration. And that the three redundant
census literals will not move again; they will, and that is the tripwire working.
