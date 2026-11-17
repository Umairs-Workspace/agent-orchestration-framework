# @aof/specification-by-example

Private workspace for specification by example: a story's example map (`EXAMPLES.md`), the
answers a person gave to its questions, the doctor lane that judges the map, and the build-door
check that refuses a story while a business question stands. The practice is off unless a project
sets `work.examples.enabled` to `true` (134/ADR-006).

| Export | Responsibility |
| --- | --- |
| `map` | The map's closed grammar, its one parser, the pure queries over it and the answer token. A question is a fact (`domain`), a decision (`policy`, or its old spelling `business`) or a `technical` choice, and a fact may be closed by a cited `researched F<n>`. It also reads a research document's findings, the `## F<n> ·` headings that citation names, and says which name a source. |
| `answers` | Reads a person's tokened answers from the harness transcript and the run records. |
| `doctor-lane` | The doctor's examples lane and the one judgement the door shares with it. |
| `story-probe` | The doctor snapshot's story probe, and the map's row in the budget family. |
| `build-door` | The continue door's before-build check. |
| `contribution` | The one object core's practices registry reads to append this package's bundle fragment. |
| `operator-lane` | The doctor's operator lane: once, at the work directory, `operator-profile-undeclared` when a project turned operator-aware discovery on (`work.examples.operatorAware`) and declared no operator profile. `aof work update` and `aof work init-config --operator-aware on` print the same warning from its one function (193/ADR-006 §5). |

## The prose it ships

The package is a registered practice (192/ADR-005). Its `assets/bundle.json` declares the practice
`discovery`, keyed on `work.examples.enabled`, and the fragments that fill refine's and the PO,
architect and QA briefs' slots: the discovery beat, formulating from the map, the `--all`
cascade's business questions, the classification review and QA's tables under a map rule. Each
fragment has a body for Claude Code and opencode (`assets/fragments/discovery/<target>.md`) and one
for Codex in its own wording (`<target>.codex.md`).

It declares a second practice, `operator-aware`, keyed on `work.examples.enabled` and
`work.examples.operatorAware` together (193/ADR-006). Its fragments
(`assets/fragments/operator-aware/`) replace every discovery fragment that labels a question
`business` — the beat, the formulation, the cascade, the hand-back, Codex's entry rule, and the PO
and architect briefs — so a question is `domain`, `policy` or `technical`, a fact is researched
before anyone is asked, and every question says what the agent would pick. Two more fill slots
of their own: refine's `config.roles`, which opens each PO and researcher prompt with the
operator's role, and the researcher brief's `ownership.research`. Its template variants
(`assets/templates/operator-aware/`) stand in for the story's `EXAMPLES.md` and the milestone's
`RESEARCH.md`, to show the new forms.

That prose is given only to a project that has turned the key on and run `aof work update`; a
project with the key off renders its commands with none of it. How a fragment is written, and how a
slot is marked, is in [`wiki/reference/practice-prose.md`](../../wiki/reference/practice-prose.md).

Dependencies run one way (135/ADR-001 §2): this package imports `@aof/work` and `@aof/contracts`,
and `@aof/work` imports nothing from it. `@aof/work` offers three seams that name no practice — a
story probe and budget rows on the doctor engine, and a `beforeBuild` list on the phase doors — and
core composes this package into them. The gate's resolver (`examplesEnabledFromConfig`), the
transcript reader and the human-input tool vocabulary are injected by core; no module here reads
config, the environment or a clock of its own.
