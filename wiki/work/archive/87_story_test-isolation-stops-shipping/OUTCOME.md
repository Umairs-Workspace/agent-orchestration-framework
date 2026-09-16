# 87 · The test-isolation guard stops shipping — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The shipped frozen set carries five members, and none of them is repo-specific policy
The declaration the framework ships names `locked-contract`, `litmus`, `tag-vocabulary`, `gate-order`
and `anchors`; no member protects a global store from unisolated suite invocations, and no member
names the tool-call hook enforcement point.

### The bundle installs no test-isolation guard
Neither `src/bundle/bundle.json` nor the generated `src/bundle/manifest.json` targets a guard in a
consumer's hook directory, `src/bundle/hooks/` holds no such body, and the asset census is re-measured
to the smaller tree as an exact 79-file set-equality in both directions.

### A consumer's own build commands are the consumer's own business
A fresh `aof work init` plants no framework-authored entry that judges a command before it runs; an
already-installed consumer has that entry retracted by the next `aof work update`, with the operator's
own entries at the same event surviving in their own positions and no other compiled member's output
moved.

### `55/FF-5505` is enforced against the declaration rather than against a census of what shipped
The control asserts that every rule produced at every enforcement point carries its declaring member's
id, that a point no member names compiles to nothing and is reported as unnamed rather than as
satisfied, and that a declared member reaching no enforcement point fails — so it binds the next hook
member anyone declares without being re-armed, and refuses the vacuously-true repair over an empty
set.

### The compiler's hook path is exercised by a member built for the purpose
The marker, the surgical splice into a co-authored settings file, the retraction when the member
leaves and the coded tamper are all driven through a synthetic hook-shaped member in the test, so the
coverage sits with the compiler that owns the behaviour rather than with whatever the bundle happens
to ship.

### This repository runs the compiled predicate as its own hand-owned hook
`.claude/hooks/aof/guard-test-isolation.mjs` here is the segment- and token-aware predicate — it
strips here-documents, splits into segments, tokenises each, and clears on an isolation prefix in any
of its spellings — invoked from a `PreToolUse` entry carrying no `aofManaged` marker, so aof neither
adopts, edits, retracts nor drift-reports it. Its cases are re-homed onto
`test/repo-test-isolation-guard.test.mjs` and registered in the repo suite.

### `55`'s pre-55-hook gap is discharged, by the route actually taken
`55`'s ledger entry reads `discharged (story 87, 2026-08-27)` and records that its written discharge
condition — an update replacing the file with the compiled member — was withdrawn with the member, and
that the file was replaced by hand instead.

## Assumptions

- **The operator keeps the entry unmarked** — the guard survives every future `aof work update` only
  because its settings entry carries no ownership marker; re-marking it would hand it back to a
  framework that no longer declares it.
- **`55/04`'s delivered feature file stays unedited** — its general criterion is carried forward by
  task 01 and its worked example is superseded in task 00's contract, not annotated in place.

## Gaps

### An orphaned guard file in an already-installed consumer's tree
- **Status:** open
- **Discharge condition:** the installer gains an asset-retraction path, or a documented one-line
  removal is published for consumers who took an earlier version.
Retraction reaches the settings entry, so the rule stops firing; the asset file an earlier version
wrote is left on disk, invoked by nothing, because the installer writes assets and does not prune
them.

### An aggregate entry point that chains the suite is not a suite invocation by any spelling
- **Status:** open
- **Discharge condition:** the isolation check moves into the suite runner itself — the one place no
  side door can bypass — rather than being widened in the predicate.
The guard judges what a command invokes, so a wrapper script that calls the suite passes it; one such
wrapper once ran the whole suite unisolated for eighteen minutes with the guard silent.

### No framework-wide hook-shaped invariant exists to declare
- **Status:** open
- **Discharge condition:** an invariant that must hold in every consumer, at the tool-call hook
  enforcement point, is identified and declared as a member.
The frozen set now compiles no hook at all. The two other bundled hook bodies are plumbing installed
by sibling descriptors and protect no invariant, so neither was promoted to keep an assertion company.
