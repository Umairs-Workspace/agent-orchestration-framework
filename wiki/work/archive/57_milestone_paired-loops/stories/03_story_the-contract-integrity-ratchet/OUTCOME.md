# 03 · The contract-integrity ratchet — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### `aof work ratchet <ref>` reports contract movement as four legs
A registered CLI command returns `contract`, `closed-set`, `marker` and `compensating-assertion`, each carrying `fired` / `discharged` / `unclassified` / `clear` and the findings behind it; `--json` and the rendering carry no precision claim of any kind.

### The baseline is the item's own record, and an unresolvable one produces nothing
The base commit is the first `--first-parent` commit whose version of the item's record document carries `status: in-progress`; a shallow clone, an unborn ref or a record never committed in-progress yields `ratchet-base-unresolved`, exit 1, **no legs computed** and no comparison against `HEAD~1`. `--base <commit>` overrides it and is recorded in the output as `supplied`.

### An acceptance criterion is a scenario or an Examples row, counted item-wide
Leg (a) compares `@executable` scenarios plus Examples rows across all of the item's task features as one total, so deleting a row shrinks the contract and moving a scenario between task files does not.

### A closed-set assertion may not be relaxed on a file that existed at the base
Leg (b) fires on closed-to-open only, over files present at the base commit; a closed-set assertion added to the same file in the same change clears it as leg (d); anything the frozen vocabulary cannot classify is reported `ratchet-unclassified` and counted as neither fired nor clear.

### A skip, only or todo added to a pre-existing test is a fire
Leg (c) fires only when the marker is added and only when the test existed at the base commit; a marker inside a comment is not a marker, a removed marker is not a fire, and a newly authored todo is not a retreat.

### Discharge requires an authority the optimizer could not have written
A fired leg clears only against an ADR that (i) is **cited by the artifact as it stood at the base commit**, (ii) **names the owning item** — `57/ADR-007`, `m57/` admitted, a bare `ADR-007` never — and (iii) **resolves as a heading in that item's `ARCHITECTURE.md` at the base commit**. The owning ref is built from the numbered path segments between the work dir and the register-bearing ancestor, so a milestone register is `57` and a story-level one is `57/03`.

### The justification comment is structurally outside the inputs
Citations are harvested from the artifact's base text, so a comment written with a weakening does not exist in the text the ratchet reads. The prohibition holds by construction rather than by a rule the code is trusted to follow.

### The engine is pure and every repository read is at the command boundary
`src/work-ratchet.mjs` imports exactly `./feature-parse.mjs` and `./work-doctor-rubric.mjs` and reaches no filesystem, git, process or clock; the diff, both trees' feature texts, the owning item's register at the base commit and its ref all arrive as parameters assembled by `src/commands/ratchet.mjs`.

### FF-5705, armed across three legs
`test/arch/acd-ratchet-pure-and-discharge-scoped.test.mjs` fails when the engine gains a repository read, when the boundary stops handing it a completed observation, when the no-base refusal stops exiting non-zero, when citations are harvested from head instead of base, when a bare ADR id is admitted, and when an unresolved owner stops blocking discharge — each leg observed red and restored.

## Assumptions

- **The item's record document was committed while it read `in-progress`** — base resolution reads status out of committed history, so an item whose record only ever reached `in-progress` in the working tree has no baseline and the ratchet refuses rather than approximating one.
- **The closed-set vocabulary is this repository's idiom, frozen** — classification recognises the assertion shapes ADR-004 §2 enumerates; a project writing assertions outside that vocabulary gets `unclassified`, not a fire.
- **A citation is an address, not an argument** — discharge tests only that an independently-authored authority pre-existed the change and was already cited; it makes no claim that the cited ADR is *relevant* to the weakening, which ADR-004 §6 routes to the architect node.
- **Test-file identity is textual** — the marker leg matches tests by `test`/`it` name within a file, so renaming a test at the same time as adding a skip marker reads as a new test rather than a retreat.

## Gaps

### The ratchet is not wired to any loop
- **Status:** open
- **Discharge condition:** `57/05`'s pairing table gives the build loop a `kind: watcher` node whose `measurement` names `command:work:ratchet`, and `FF-5707` proves that pointer resolves.
- The command exists, is registered and runs on demand. Nothing invokes it as part of a loop, no watcher record points at it, and no gate consumes its disposition — a fire is visible only to whoever types the command.

### A discharge is never checked for relevance
- **Status:** open
- **Discharge condition:** a declared owner for reviewing discharged legs — ADR-004 §6 routes disposition to the architect node, and no such review step is scheduled in this milestone.
- Any pre-existing, owning-item-qualified ADR citation anywhere in the artifact clears any fire in that artifact. The three qualifiers make the citation something the optimizer cannot manufacture during the work; they do not make it *about* the weakening.

### `unclassified` is reported and counted by nobody
- **Status:** open
- **Discharge condition:** a consumer that treats a rising unclassified count as a signal about the vocabulary rather than as noise.
- The honest third answer is produced per finding and returned, but no threshold, trend or gate reads it, so a ratchet drifting toward classifying nothing looks identical to one finding nothing.

### Precision is unmeasured on the shapes this story added
- **Status:** open
- **Discharge condition:** a measurement over commits containing the compensating-assertion shape and the base-commit citation rule, of the kind spike 56 ran for the original legs.
- 56's ~89% file-level figure was measured over n=8 commits from a single milestone and does not cover leg (d) or the discharge scoping this story built. No rate is claimed anywhere in the output, and none is known for the delivered resolver.
