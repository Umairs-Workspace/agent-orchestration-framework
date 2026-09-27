# 89 · FF-7106 is declared in milestone 71's fitness register but owned by no story — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. An ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `CHORE.md` is.
-->

## Delivered

### A story that lands a bundle member is held to its whole write set, in CI
`test/arch/acd-declared-writes-include-generated-siblings.test.mjs` is on disk and registered in
`scripts/test.mjs`. Over every `STORY.md` under `wiki/work` whose item is open, a `files:` entry that
is a bundle member obliges `src/bundle/manifest.json` and every git-tracked rendered output of that
member; each omission is reported naming the story and the missing sibling. Milestone 71's register
declares six controls and all six now resolve — `aof work doctor 71` reports no `control-unresolved`
at either severity.

### The member→render mapping is asked of the render engine, not pattern-matched
Each member's outputs are obtained by rendering that member alone, so no runtime's id-mapping
convention is encoded here. This is load-bearing rather than stylistic: the codex render of
`src/bundle/commands/continue.md` presents as `skill:aof-continue`, not `command:continue`, so a
control keyed on an output's own resource id loses `.codex/skills/aof-continue/SKILL.md` — one of the
three tracked files commit `231ee134` moved as one — and would pass the story this control exists to
catch. The union of per-member renders equals the whole-bundle render exactly (143 = 143), and that
equality is asserted, so an unattributable member fails here rather than hiding.

### Membership, the runtime set and the tracked set are all derived
Membership comes from `loadBundle()`'s descriptor, never a `src/bundle/` prefix: `frozen-set.jsonc`
is a member that renders to `.aof/frozen-set.jsonc`, while `manifest.json` and `bundle.json` sit
under the same prefix and are machinery that render to nothing. The runtimes handed to the render are
the union of what the members themselves declare, so a fourth runtime is covered with no edit to the
file (`renderBundleOutputs` defaults to `["claude"]` alone, so passing the derived set is load-bearing).
The demanded renders are intersected with `git ls-files`, so a render the repository does not keep is
never asked for.

### The control is non-vacuous by construction, and green over the stream today
The decision is a pure function over story records; the live leg feeds it the real tree and four
further legs feed it synthetic ones. Measured at landing: 276 `STORY.md` walked, 84 member source
paths, 143 tracked renders, 9 open stories of which **0** declare a bundle member — so the live leg
has no subject today and the plants are what keep the control falsifiable. The scan's own reach is
asserted separately from the existence of a subject.

### The horizon is read through the one predicate, and the read itself is pinned
`isOpen` is imported from `src/acceptance-horizon.mjs` rather than re-derived from the literal
`"done"` (FF-6602). Every `STORY.md` here is checked out CRLF, and a status read that keeps the `\r`
hands `isOpen` a word it does not recognise, which fails OPEN and puts every accepted story back in
scope — measured, that is **33 violations across four `done` stories** (59/04, 61/01, 83, 84). The
contract "a done record reads done in both checkouts" is asserted directly, so a rewrite to the
obvious `line.slice("status: ".length)` shape fails here.

## Assumptions

- **The obligation is triggered by a story's `files:` declaration, not by its diff** — the control
  reads what a story says it will land. A story that edits a bundle member without declaring it is
  outside this control's reach and remains `aof work validate`'s and review's business.
- **The registration leg is deliberately absent, and that absence is asserted** —
  `acd-test-suite-registration` already walks the whole test tree, so this control names no runner
  and a self-check asserts it names none, so nobody "completes" it by adding one back.
- **`git ls-files` answers for the tracked set** — the control shells `git` in argv form from the
  repository root; a checkout without git is outside its assumptions.
