---
type: story
number: 87
slug: test-isolation-stops-shipping
title: "The test-isolation guard stops shipping — aof's lab hygiene leaves the bundle"
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-08-27
depends: [55]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 87 · The test-isolation guard stops shipping

## User story

As a team installing aof into a repository of our own,
I want `aof work init` / `aof work update` to stop planting a `PreToolUse` hook that blocks our
`npm test`,
so that the framework governs our work stream without also enforcing aof's private lab hygiene on a
codebase that has no `~/.aof` store to protect.

## Why

The guard is a bundle member, so every consumer gets it. `src/bundle/bundle.json` declares:

```json
{ "id": "test-isolation-guard", "kind": "asset", "file": "hooks/guard-test-isolation.mjs",
  "target": ".claude/hooks/aof/guard-test-isolation.mjs", "runtimes": ["claude"] }
```

and `src/bundle/frozen-set.jsonc` compiles the matching hook entry into the consumer's
`.claude/settings.json`. Both landed together when the operator ran `aof work update` on an unrelated
repo — that is what raised this.

**The member's own words name the problem.** It declares
`protects: "the real ~/.aof global store from unisolated aof test runs"`. The subject of that
sentence is *aof's own test suite*: this repo's tests write mesh and config fixtures into
`~/.aof` unless `AOF_GLOBAL_HOME` points somewhere throwaway, and unisolated runs polluted the live
fleet often enough to earn a hook. That hazard belongs to this repository. It does not travel.

**But the predicate does travel, and it over-reaches.** `isTestInvocation` in
`src/bundle/hooks/guard-test-isolation.mjs` matches any `npm test`, `node --test` or
`scripts/test.mjs`, and `segmentIsolated` clears it only when the command carries
`AOF_GLOBAL_HOME=`. In a consumer repo that is a blocked, legitimate command plus an instruction to
prefix an environment variable which does nothing there — the framework refusing the host project's
own test run to protect a store the host project never writes to.

**And there is no supported way out.** `claudeSettingsPatch` compiles from `bundledFrozenSet()` — the
declaration inside the aof package — not from the `.aof/frozen-set.jsonc` it installs into the
consumer's tree. Editing the installed copy changes nothing; the next `aof work update` recompiles
from the bundled declaration and reasserts the entry. The only lever is deleting the `aofManaged`
marker from the settings entry, since aof manages only entries carrying it — undocumented, and it
leaves the asset file behind regardless.

The frozen-set *mechanism* — a reviewable declaration compiled into the boundary aof already owns —
is genuinely framework-level and is not in question. This one *member* is not: it is repo-specific
policy that rode along with the machinery it was the worked example for.

## Scope

**Unships** — the framework stops installing the rule anywhere:

- the `test-isolation` member leaves `src/bundle/frozen-set.jsonc`
- the `test-isolation-guard` asset leaves `src/bundle/bundle.json` (and the generated
  `src/bundle/manifest.json`)
- `src/bundle/hooks/guard-test-isolation.mjs` leaves the bundle tree

**Re-homed** — this repository keeps the protection it actually needs. The compiled guard body
becomes this repo's own `.claude/hooks/aof/guard-test-isolation.mjs`, hand-owned: no `aofManaged`
marker on its settings entry, so aof neither adopts, edits nor retracts it. The behaviour this repo
relies on is the *compiled* predicate (segment- and token-aware), not the pre-55 three-regex version
currently on disk here, which over-blocks commands that merely mention the suite path.

**Unchanged** — the frozen set itself, its compiler, its tamper coding, and its five remaining
members. Nothing about the enforcement machinery is being withdrawn.

## The refine decision (the open question, answered)

**The question.** `test-isolation` is the only member whose `enforcementPoint` is
`"tool-call hook entries"`. Remove it and the frozen set compiles no hook at all, which leaves
`test/arch/acd-frozen-set-compiled.test.mjs:32,40` asserting a non-empty hook set and the marker on
`compiled.hooks[0]` with nothing to assert — the vacuous-control class spike 82 exists to catch. The
choice was: re-aim the control, or carry a hook-shaped member that is truly framework-wide.

**Decided: re-aim the control. No replacement hook member is invented.** Task 01 carries it.

**Why not a replacement member.** The frozen set's subject is *invariants protected from agent
tampering*. The two other bundled hook bodies — the artifact-sync enqueue and the run-heartbeat
enqueue — are plumbing installed by sibling `.json` descriptors; neither protects an invariant, and
promoting one into the frozen set to keep an assertion company would be adding enforcement to satisfy
a control. That is the inversion, not the fix. No framework-wide hook-shaped invariant exists today,
and the honest answer is to say so rather than manufacture one.

**Why the re-aim is not a relaxation.** `55/FF-5505`'s declared invariant is a universal — *"no
aof-authored rule exists at any enforcement point without a frozen-set member declaring it"* — and it
says nothing about the set being non-empty. `compiled.hooks.length > 0` and
`compiled.hooks[0].claude[…] === "test-isolation"` are a **census of what shipped**, over-specified
beyond the invariant they answer to. The re-aim derives the expectation **from the declaration**: a
point no member names must compile to nothing *and be asserted to*; a point a member names must
produce member-traced output. The control then binds the moment anyone declares a hook member again,
which the pinned literal never would have. The forbidden repair — relaxing to
`compiled.hooks.every(…)`, vacuously true over `[]` — is red-probed against in task 01's Examples.

**And the compiler keeps its hook coverage.** The hook branch (marker, surgical splice, retraction,
coded tamper) moves from riding on whatever the bundle happens to ship to a **synthetic hook-shaped
member** built in the test. Coverage stays with the compiler that owns the behaviour.

**No new fitness function is declared.** `55/FF-5505` already resolves to
`test/arch/acd-frozen-set-compiled.test.mjs`, registered in the runner; this story re-aims that
control rather than adding one, so `55`'s register is unchanged and no `pending` marker is owed.

**One delivered criterion is superseded, and the delivered file is not edited.** `55/04`'s
`00_the-declaration.feature` carries *"the test-isolation rule is a compiled member rather than a
hand-wired entry"* — its general claim (a rule at an enforcement point traces to a declaration)
survives verbatim in task 01; only its worked example is withdrawn. The supersession is stated in
task 00's contract, which is where a new rule over delivered criteria belongs.

## Tasks

<!-- Authored by `aof:refine 87`. Each is a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria; a task is done when its @executable feature is green. -->

- [x] `tasks/00_the-framework-stops-shipping-the-rule.feature` — the member, the asset and the guard
      body leave the bundle; a fresh install plants nothing, an existing consumer is retracted, and
      the orphaned file is declared left-inert rather than quietly forgotten.
- [x] `tasks/01_the-trace-control-answers-to-the-declaration.feature` — `55/FF-5505` re-aimed from a
      shipped-set census to a declaration-derived universal, with the hook path held by a synthetic
      member and the vacuous repair red-probed against.
- [x] `tasks/02_this-repository-keeps-its-own-guard.feature` — the compiled predicate re-homed as
      this repo's hand-owned, unmarked hook, its cases re-homed with it, discharging `55`'s open gap.

## Notes

Refine surveyed the six controls that keyed off the member — the ordered member-id list, the
`installed` set, the bundle-path import, the compiled hook marker and asset target, the
`src/bundle/**` file census, and the every-hook-body-needs-a-descriptor rule — so the task features
could be scoped against real ground rather than guesswork. Each is carried as a measured row in this
story's `VERIFICATION.md`. The removal path was already reachable before the story started:
`frozen-set-compiled.test.mjs` exercises `withoutMember(bundledFrozenSet(), "test-isolation")` and
asserts the compiled rule disappears with its member. This story makes the shipped declaration match
what that test already proved was possible.
