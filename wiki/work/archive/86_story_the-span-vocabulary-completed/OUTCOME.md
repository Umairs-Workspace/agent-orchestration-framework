# 86 · The span vocabulary, completed — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### A story-grained scope that cannot be parsed is refused
`aof work next` throws `invalid-scope` (400) for any scope matching `^\d+/` that is not a story ref or
a span — `44/01-03x`, `44/`, `44/01-`, `44/01-02-03` and the en-dashed `44/01–02` each name the
admitted forms in the refusal instead of silently walking the whole stream.

### `find` and `next` answer for the same vocabulary
The two surfaces agree about every story-grained ref: what `findWork` resolves, `nextWork` scopes to,
and what `findWork` answers `[]` for, `nextWork` refuses — there is no shape one admits and the other
widens.

### A bare story ref is a scope
`NN/SS` is the one-story span `NN/SS-SS`: `aof work next 44/01` answers with story 44/01 alone, offers
neither another milestone's stories nor milestone 44 itself for acceptance, and `parseStorySpan` admits
the bare form through the same rule as the span rather than through a second narrowing beside it.

### A free-text scope still falls through
A slug scope is unaffected by the refusal, which reaches exactly `^\d+/` — and the driver form `44`,
the driver range `44-46`, the span `44/01-03` and the descending span `44/03-01` (which parses and
admits nothing) all answer exactly as they did before.

### The `next` command face resolves a span to the one driver it names
A finished span answers `done` rather than naming an unrelated held driver; a span whose own driver is
held still reports that driver and names its holder; and a driver **range** keeps its documented
over-reporting unchanged.

### `parseStorySpan` is `src/work.mjs`'s exported, single scope parser
The span shape is defined once and read by three surfaces — `findWork`, `inRange`/`inSpan`, and
`skippedEntries` in `src/commands/next.mjs` — rather than re-derived in the command face.

### The shipped `continue.md` span branch is pinned by a test
`test/work-story-span-scope.test.mjs` asserts that the shipped prompt dispatches on a story span,
scopes the walk to the span rather than to the bare milestone, and states each of the branch's three
obligations; the pin is non-vacuous — the same assertions applied to a copy with the branch cut out
throw.

## Assumptions

- **A slug carries no `/`** — the refusal's reach is the character class, so `^\d+/` is assumed to
  contain no legal free-text scope. A future scope vocabulary admitting a slash-bearing slug would
  bring legal scopes inside the refusal.
- **A driver's ref may be zero-padded** — `skippedEntries` compares a span's driver to an execution
  scope ref **numerically** (`Number.parseInt`), because `04` and `4` are the same driver and a string
  comparison would silence the report for a zero-padded one.
- **`work.mjs` gains no import from this** — `parseStorySpan` is an *export*, which is why the ADR-015
  §5 reach ceiling of 24, which `src/work.mjs` sits at exactly, is untouched and FF-5301 stays green.
- **`parseStorySpan` is not a disk reader** — `acd-cache-read-surface-boundary` forbids the control
  side importing `listItems`, `findWork`, `nextWork` or `listStream` from `work.mjs`, and the new
  `src/commands/next.mjs → src/work.mjs` edge carries a parser, none of those four.

## Gaps

### `LOOP_SCOPE_FORMS` still refuses the two story-grained forms the parser now admits
- **Status:** open
- **Discharge condition:** 53/ADR-003 records a decision — widen `aof work loop`'s frozen vocabulary
  to `NN/SS` and `NN/MM-PP`, or state why it stays `driver` + `range` — and FF-5308's SCOPE-NEC-01
  necessity leg is retired, so `test/arch/acd-loop-scope-guard.test.mjs` is green.

`aof work loop` admits `driver` and `range` alone and refuses a story-shaped scope with
`loop-scope-unsupported`, while `aof work next` now scopes to one. FF-5308's necessity leg — which
asserts the defect this story paid — is consequently red, carrying its own designed message that the
red means the fix landed. Scheduled as chore `111`.

### TECH_DEBT item 49's three parsers are still three
- **Status:** open
- **Discharge condition:** one `inScope` predicate and one `admittedForms` vocabulary in a single leaf,
  imported by `nextWork`, `validateWork` and `work-doctor.mjs`.

The fail-open half of item 49 is paid — `inRange` no longer falls through for a story-shaped ref — but
`validateWork`'s `inScope`, `work-doctor.mjs`'s `inScope` and `inRange` remain three independently
written answers to "is this item in scope". The consolidation is unbuildable at HEAD: `src/work.mjs`
measures the ADR-015 §5 reach ceiling of 24 exactly, so importing any leaf reddens FF-5301, and raising
that ceiling is an ADR this story did not pay for. Item 49's own record is corrected by chore `109`.
