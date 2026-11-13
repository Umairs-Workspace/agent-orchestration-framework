---
doc: architecture
---
# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — Architecture

The SPEC asks for a mechanism and its first use. ADR-001 is the slot and where composition
happens. ADR-002 is what a practice declares. ADR-003 is how "on" is decided. ADR-004 is the
template variant. ADR-005 is the first move: which prose leaves core, where it goes, and what
"says the same" means. ADR-006 and ADR-007 are the adoption path: a stale render is reported, and
`aof work update` lists what a project could turn on. ADR-008 is the break-down.

## Memory recall: what was surfaced, and what it changed

Recall `0a012672-cf9a-4ff6-afe6-ede842643888` (architect, "compose command prose at render from
practice fragments gated by project config") returned five ADRs and no near-miss:

- **169/ADR-005**, "An integration's members render only for a project that enables it".
  **Honoured.** A fragment is dropped the way an integration's member is: before the render, from
  the project's own config, so a later update removes what was turned off (ADR-001, ADR-003).
- **193/ADR-006**, "Off unless a project turns it on, shipped as fragments". **Honoured.** It is
  this milestone's first customer. Its fragment that replaces the classic beat, its template
  variants and its file layout are each provided for here (ADR-002, ADR-004, ADR-005 §3).
- **12/ADR-003**, the config lifecycle checks on the project doctor's seam. **Departed.** The
  stale-render check goes to the work doctor, for the reasons in ADR-006 §4.
- **01/ADR-001**, the bundle is located through the module path. **Honoured.** A fragment's text
  is read through the same asset seam as a member's, so it rides the payload and the packaged
  binary (ADR-002 §3).
- 71/ADR-005 does not bear on these decisions.

The PO recall for the milestone's domain (`dafbb868-7a02-45a7-8c87-b3984d2311c9`) came back empty.

One operator rule from the session's own memory shaped ADR-006 and ADR-007: a config key whose
absence keeps the old behaviour owes its adoption path in the same milestone. This milestone is
that path for every practice that ships prose, 193's included.

## What was measured before deciding

- `packages/core/assets/commands/refine.md` is 461 lines. Its prose that applies only when
  `work.examples.enabled` or `work.plan.enabled` is on sits in five places: the discovery beat
  (lines 253–309), the formulation from the map (313–326), the build brief (351–368), the
  `--autonomous` sentences (378–388) and the output sentence (454–455).
- The Codex body of refine is the `procedure-refine` section of
  `packages/core/assets/variants/codex/workflow.md`, attached to the skill as `procedure.md`. It
  differs from the Claude body on 46 lines, all wording (`AskUserQuestion` against the native
  question tool, `aof:verify` against `$aof-verify`). The gated passages sit at the same places.
- The role briefs carry three gated passages: two bullets in the PO brief, one in the architect
  brief and one sub-bullet in the QA brief, each with a Codex twin in `workflow.md`.
- `loadBundle()` has ten source dependents (graph, 2026-11-13). Three read `resource.body`
  without going through `synthesizeBundleConfig`: `bundle-manifest.mjs`, `planning/cowork-plugin.mjs`
  and `work/orchestrator.mjs`.
- `synthesizeBundleConfig` already reads the project's config file and nothing else
  (`readConfig(targetDir)`, `bundle-synthesis.mjs:78`).
- `PRACTICES` holds `@aof/learning` alone. `@aof/specification-by-example` has no `assets/` and
  no contribution; core already depends on it.
- Every directory this milestone adds a module to is at its ceiling in
  `test/arch/testing/acd-source-directory-budget.test.mjs`: `packages/core/src/work` (10 of 10)
  and `packages/core/src/application/bindings/work` (15 of 15). `test/arch/bundle` may only fall.

## ADR-001 — A slot is a marker line in a source, and the loader fills it

### Context

A source needs a way to say "a practice may add prose here" that costs nothing when no practice
does. Three modules read a member's body straight from the loaded bundle, so a marker that is
resolved later than the loader would reach a rendered file through one of them.

### Decision

1. **The marker.** A slot is the line `<!-- slot:<name> -->`, alone on its line; leading spaces
   are allowed and mean nothing. A name is lower-case words joined by dots and hyphens
   (`contract.discovery`). A name appears at most once in one text.
2. **Where a slot may stand.** In a member's common source, and in every text of an authored
   runtime variant: its body and each associated file. The Codex refine procedure is an
   associated file, and it carries slots like any body.
3. **Filling a slot.** The marker line is replaced by the bodies of the fragments that are on
   (ADR-002, ADR-003), in order. Two shapes follow from the line above the marker:
   - **A block slot** has a blank line above it (or is the first line). Its fragments are joined
     by one blank line. With nothing on, the marker line and the blank line above it are removed.
   - **An inline slot** has text on the line above it. Its fragments are joined by a newline.
     With nothing on, the marker line alone is removed.

   Nothing else in the text changes. A fragment's body is inserted as written, with its own
   indentation.
4. **Composition happens in the loader.** `loadBundle({ config })` returns members whose texts
   are already composed for that config. The default is an empty config, which is every practice
   off, and that is the canonical render `packages/core/assets/manifest.json` catalogues. No text
   that holds a marker leaves `loadBundle`.
5. **Who hands in a config.** `aof work init`, `aof work update` and the role launcher
   (`work/orchestrator.mjs`) pass the project's own config (ADR-003). The manifest generator and
   the Cowork plugin pass none.
6. **One pure module.** The slot grammar, the fragment selection and the composition live in
   `packages/core/src/work/bundle-compose.mjs`. It reads no file. `packages/core/src/work` moves
   from 10 to 11 in the directory budget, with this ADR as its reason.

### Alternatives considered

- *A `{{slot.<name>}}` token.* The `{{…}}` tokens are resolved per runtime by the adapters, late,
  and may stand mid-line. An empty one would leave a hole in a sentence. Rejected.
- *Compose in `synthesizeBundleConfig`.* The manifest generator, the Cowork plugin and the role
  launcher do not pass through it, so each would render a marker. Rejected.
- *An include in the source that names the practice's file.* Core would name a practice's prose,
  which is the dependency 135 and 188 turned around. Rejected.

### Consequences

A source with no slot is untouched, so every command but refine renders as it does today. A test
that reads a source file directly now reads markers; a test that wants the prose reads a render.

## ADR-002 — A practice declares itself and its fragments in its own bundle fragment

### Context

A practice can already append whole members through its `assets/bundle.json` (188/ADR-004 §4).
The SPEC asks for parts of a member. 193 needs a fragment that replaces another, and a file
layout it has already guessed at (193/04, `files:`).

### Decision

1. **A practice is declared.** A `bundle.json` may carry a top-level `practices` list. Each entry
   has an `id`, a `title`, a one-line `summary` and a non-empty `keys` list of dotted config
   paths. The keys have this one home: a fragment names its practice, never its keys. An id is
   unique across every contributor. Core's own `bundle.json` may declare a practice too, for
   prose that has no package of its own.
2. **A fragment is a member of kind `fragment`.** It names its `practice`, its `target` as
   `<kind>:<id>` (`command:refine`, `agent:aof-qa`), its `slot`, and where its body is.
3. **A body per runtime, read like a member's.** `file` is the common body, used by every
   runtime that renders the target from its common source. `variants.<runtime>.file` is the body
   for a runtime that renders the target from an authored variant. Both are read through the
   asset seam, from the contributor's own asset class. A file may hold several slots' bodies,
   each under a line `<!-- fragment:<slot> -->`; `section` names another section when the slot's
   own name is not used. Blank lines at either end of a body are dropped. Nothing else is.
4. **Order is declared by position.** Within a slot, fragments keep the order of their
   contributors (core, then integrations, then practices, each in registry order) and, within one
   contributor, the order of its `members`.
5. **A fragment may replace another.** `replaces` names a fragment of the same contributor, with
   the same target and slot. When both are on, the replaced one is dropped and the replacer
   stands at its own position. When only the replaced one is on, it renders as if `replaces`
   were absent.
6. **What is refused at load, naming the member and its contributor:** a fragment whose practice,
   target or slot is not declared; a slot that a runtime's texts carry with no body for that
   runtime; a body for a runtime whose texts do not carry the slot; a body file or section that
   is missing; a `replaces` that names another contributor's fragment, another slot, or nothing;
   a practice with no keys; a duplicate practice id; a slot name repeated in one text.
7. **Slots across runtimes.** Every slot in a member's common source is in each authored
   variant's texts. A variant may carry a slot the common source lacks, filled by fragments that
   have a body for that runtime only. The Codex skill entry has no Claude twin, and this is how
   its one gated sentence moves (ADR-005 §2).
8. **This supersedes one sentence of 188/ADR-004 §4:** "A practice's members carry no
   `integration` key, so no config switch gates them." It still holds for whole members. A
   practice's fragments and template variants are gated by its keys.

### Alternatives considered

- *A fragment names its keys itself* (the SPEC's wording). Ten fragments would spell
  `work.examples.enabled` ten times, and the list in ADR-007 would have no title to print.
  Rejected; the practice entry is where the keys are named.
- *A numeric `order` field.* Two packages would have to agree on numbers. Rejected.
- *One member per target file, its slots found by scanning the file.* A replacement is per slot,
  so the descriptor could not say it. Rejected.

### Consequences

193 writes its operator-aware beat as a fragment that `replaces` the classic beat, and adds a
sentence to the `--autonomous` and output slots as further fragments after the classic ones. Its
guessed layout holds: `assets/fragments/<practice>/<target>.md` and `<target>.codex.md`.

## ADR-003 — What is on is decided by the project's own config file, through one resolver

### Context

Rendered commands are committed. A render that read the machine-wide config would differ between
two clones of one commit (193/ADR-006 §1).

### Decision

1. A practice is on when every one of its keys holds the boolean `true` in the project's config
   file. Absent, `false`, `"true"`, `1` and any other value are off.
2. The config is the object `readConfig(targetDir)` returns: the project's `.aof/aof.config.json`,
   unmerged. The machine-wide config and the environment are never asked.
3. One function, `practiceStates(practices, config)` in `bundle-compose.mjs`, answers which
   practices are on. The composition, the lock record (ADR-006), the list (ADR-007) and the
   doctor's comparison all take its answer.
4. The gate readers the practices already have (`examplesEnabledFromConfig`,
   `planEnabledFromConfig`) stay as they are. They decide what code does at run time; this
   resolver decides what prose a render holds, and spells no key itself.

### Consequences

A project whose machine-wide config turns a practice on, and whose own file does not, renders
without it. The practice's code may still run there, as it does today.

## ADR-004 — A practice can ship a variant of a template

### Decision

1. A member of kind `template-variant` names its `practice`, the `template` member it belongs to
   (`story`), the file's `name` (`EXAMPLES.md`) and its own `file`.
2. When the practice is on, the template's output at its usual path
   (`.aof/templates/work/<template>/<name>`) holds the variant's text, stamped as every template
   is. When it is off, the default is rendered, unchanged.
3. Two variants of one file that are both on are refused at render, naming both. A variant of a
   file the bundle does not ship is refused at load.
4. The path does not change, so the update classifies the file as it classifies any managed
   file: `update` when the practice is turned on or off, `drift-warning` when a person edited it.

### Consequences

This milestone ships no variant of its own. The default `EXAMPLES.md` and `PLAN.md` templates are
still installed in every project. 193 is the first user; the mechanism is proved here on a
fixture.

## ADR-005 — The first move: what leaves core, where it goes, and what "says the same" means

### Decision

1. **Two practices are declared.**
   - `discovery`, by `@aof/specification-by-example`, keyed on `work.examples.enabled`. The
     package becomes a registered practice: a `contribution.mjs`, an `assets/bundle.json`, and
     the second entry of `PRACTICES`.
   - `build-brief`, by core's own `bundle.json`, keyed on `work.plan.enabled`. The build brief
     has no package, and a package for one paragraph is not worth its registration.
2. **The slots, by target.** Each is in the common source and in its Codex text.

   | target | slot | shape | what fills it |
   |---|---|---|---|
   | `command:refine` | `contract.discovery` | block | discovery: the beat, the driven-session bullet included |
   | `command:refine` | `contract.formulation` | inline | discovery: "With an applicable example map, formulate from it." |
   | `command:refine` | `contract.brief` | block | build-brief: the build brief and its four bullets |
   | `command:refine` | `autonomous.milestone` | inline | discovery: the sentences from "When `work.examples.enabled` is on" to "the other stories go on." |
   | `command:refine` | `output.autonomous` | inline | discovery: the sentence that lists the questions asked |
   | `command:refine` | `entry.rules` | inline, Codex only | discovery: "Business-rule questions require actual answers, never autonomous defaults or elapsed-time approval. Doctor the example map before writing tasks." |
   | `agent:aof-product-owner` | `ownership.examples` | inline | discovery: the map bullet with its sub-bullets, and "Formulating from the map" |
   | `agent:aof-architect` | `ownership.examples` | inline | discovery: the classification review |
   | `agent:aof-qa` | `ownership.examples` | inline | discovery: "Under a map rule" |

3. **Where the bodies live.**
   `packages/specification-by-example/assets/fragments/discovery/<target>.md` and
   `<target>.codex.md`, and `packages/core/assets/fragments/build-brief/refine.md` and
   `refine.codex.md`. `<target>` is the member's id.
4. **"Says the same" is measured on the render.** With both keys on, each rendered artefact
   equals what it rendered before the move once every run of whitespace is collapsed to one
   space, except for two seam edits:
   - The refine Contract's opening loses "opening with the discovery beat below when the project
     has turned it on", for Claude and for Codex. With discovery off it would point at nothing,
     and with it on the beat's own first sentence says the same.
   - The Codex skill entry's "…before writing tasks; retain executable/manual/UAT lanes…"
     becomes two sentences, so the second can stand alone when the first is absent.
5. **A fragment keeps its own gate sentence.** The beat still opens "Discovery comes first, and
   ONLY when the project has turned it on: read `work.examples.enabled`". A project that turns
   the key off and has not yet updated is therefore still told to skip it.
6. **What does not move.** The developer brief's `PLAN.md` paragraph, `manual.md`'s line, and
   the architect and QA briefs' sentence that a deviation from the build plan is not a finding
   are conditional on a file, and belong to the build and its review. The sentence "A driven business question
   retains its map token…" is ungated and stands in all 45 copies of the Codex execution
   contract. `continue.md` and `verify.md` are out of the SPEC's scope. The templates stay.
7. **A check that read the moved prose reads it where it now is.** A suite that pinned a moved
   passage reads the render of a project with the practice on. A control that sweeps the bundle's
   prose sources sweeps the fragment files too.

### Consequences

This checkout has both keys on, so its committed copies change only by the two seam edits and by
line breaks at the inline slots. The canonical manifest changes, because the canonical render is
every practice off. `packages/specification-by-example/package.json` gains `./contribution` in
`exports` and `assets` in `files`.

## ADR-006 — A render records the practices it was built with, and the work doctor compares

### Context

Turning a key on changes nothing until `aof work update` runs. The dangerous direction is a key
that is on while the commands lack the prose: refine would write a contract with no example map,
and no check would say so, because the examples lane judges only a map that exists.

### Decision

1. **The record.** `aof work init` and `aof work update` write `practices` into the `work`
   section of `.aof/aof.lock.json`: one boolean per declared practice id, the answer
   `practiceStates` gave for that render. A dry run writes nothing.
2. **The lane.** A check group `practice-render` is appended to the work doctor through
   `extensionGroups`. The lock's record, the current states and each practice's keys and targets
   are read by core at the command's edge and handed to the engine as data, as the rename history
   is. The lane is a pure function of them, and says nothing when they are absent, so the
   engine's other callers are unchanged. The engine names no practice.
3. **The findings,** each anchored at the work directory so it is reported once whatever the
   scope, and each ending "Run `aof work update`.":

   | code | when | severity |
   |---|---|---|
   | `practice-render-stale` | the practice is on and the record says it was rendered off | error |
   | `practice-render-stale` | the practice is off and the record says it was rendered on | warn |
   | `practice-render-unrecorded` | the lock has a `work` section with no `practices` | warn, once |

   A stale finding names the practice's keys and the commands and briefs its fragments belong to.
   A project with no `work` section in its lock has no install to judge, and gets nothing. A
   practice the record does not name counts as rendered off; a recorded id the bundle no longer
   declares is ignored.
4. **Why the work doctor, against 190/ADR-008 §1.** That ADR put a config-fit check in
   `aof project doctor`. The SPEC names `aof work doctor`, and it is the doctor refine, validate
   and the loop already run. A practice the operator turned on and refine ignores must stop the
   stream, and only this doctor can. 193/ADR-006 §5 places its own switch warning the same way.
5. **Why an error in one direction only.** On-but-not-rendered silently drops what the operator
   asked for. Off-but-still-rendered is guarded by the prose itself (ADR-005 §5).

### Consequences

A project that upgrades aof sees `practice-render-unrecorded` until its first update, which is
also where it reads the list in ADR-007. `packages/core/src/application/bindings/work` moves from
15 to 16 for the lane's binding.

## ADR-007 — `aof work update` lists the optional practices

### Decision

1. The update's result carries `practices`: for each declared practice its `id`, `title`,
   `summary`, `keys` and `on`. `--json` prints it. A dry run prints it too.
2. The text face ends with one block, after the summary line and before any warning:

   ```
   Optional practices (set every key to true in .aof/aof.config.json, then run `aof work update`):
     on   discovery    An example map before each story's contract    work.examples.enabled
     off  build-brief  A one-page build brief for each story          work.plan.enabled
   ```

   A practice with several keys lists them joined by ` + `. With no practice declared, the block
   is absent.
3. `aof work init` does not print it. It renders before a config exists (193/ADR-006 §7).

## ADR-008 — Four stories, cut along what the graph and the write sets draw

`loadBundle` is the one seam everything hangs off (ten source dependents), so the mechanism is
one story and it comes first. After it, the template variant and the first move share no file:
one edits the loader's template half, the other edits assets and registers a practice. The
adoption story writes the lock and the update's face, which the first move also re-renders in
this checkout, so it comes last.

| story | what it delivers | depends | ADRs |
|---|---|---|---|
| 00 | slots and fragments compose in the loader | none | 001, 002, 003 |
| 01 | a practice ships a variant of a template | 00 | 004 |
| 02 | the gated prose leaves core | 00 | 005 |
| 03 | a project sees its practices and hears of a stale render | 00, 02 | 006, 007 |

Waves: 00; then 01 and 02 together; then 03.

## Fitness functions

This milestone's ids start at FF-19205. FF-19201 to FF-19204 are 193's, written when it carried
this number, and one number is not used for two controls.

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-19205 | **A slot leaves nothing behind.** No text `loadBundle` returns, and no file of the canonical render or of a render with every declared practice on, holds a slot marker. Composing a source with every practice off equals that source with each marker line removed, and with the blank line above a block slot removed. | `test/arch/practices/acd-slot-leaves-nothing-behind.test.mjs` — pending, lands with 192/00 | ADR-001 §3, §4 |
| FF-19206 | **Every fragment lands on every runtime.** For each shipped fragment, its practice, target and slot are declared; each runtime whose texts carry the slot has a body; and every slot of a member's common source is in each authored variant's texts. | `test/arch/practices/acd-fragment-lands-on-every-runtime.test.mjs` — pending, lands with 192/00 | ADR-002 §6, §7 |
| FF-19207 | **A render reads the project's config and nothing else.** `packages/core/src/work/bundle-compose.mjs` imports no module that reads a file, the environment or the home directory, and a fixture project whose machine-wide config turns a practice on renders without it. | `test/arch/practices/acd-render-reads-project-config-only.test.mjs` — pending, lands with 192/00 | ADR-003 §2, §3 |
| FF-19208 | **Off renders no practice prose, and core holds none.** With no practice on, the rendered refine command and the PO, architect and QA briefs, for each runtime, hold none of `EXAMPLES.md`, `example map`, `work.examples.enabled` and `discovery beat`, and the refine command holds none of `PLAN.md`, `work.plan.enabled` and `build brief`. Core's own sources of those four members hold none of them either. | `test/arch/practices/acd-off-renders-no-practice-prose.test.mjs` — landed with 192/02 | ADR-005 §2, §6 |
