---
doc: architecture
---
# 179 · AOF guides the human through problem solving without taking over — Architecture

Decided at refine, 2026-10-28 to 2026-10-31, solo (the main session played the architect). Inputs:
SPEC Objective and Scope, spike 178's `## Finding` items 1–6, the two package precedents in STATE
(135/ADR-001, 169/ADR-002–004), and 149's RETROSPECTIVE R2/R3/R5.

**Revised once before any contract was written (operator, 2026-10-31).** The first draft put
teaching into `continue.md` as a region spliced into a slot. The operator judged `continue` bloated:
every build would carry a conversation it never runs. So teaching became its own command, and
`--manual` leaves `continue` the same way (ADR-001). The slot seam was dropped with it.

## Memory recall: what was surfaced, and what it changed

- Architect: `aof work memory recall "package contributes prompt region to core command bundle seam"
  --area architecture --block` returned an empty block. Nothing to honour or depart from.
- PO: `aof work memory recall "teaching mode human-led guide manual continue boundary package" --item
  179 --block` returned an empty block.
- The lessons that shaped these ADRs came from the record, not from recall: 149/R3 (a command that
  closes runs reads the run reactor, ADR-003 §4), 149/R2 and 153/R1 (write sets reach the censuses,
  ADR-008), and 149/R5 (the proof is a walk in a real external repository, ADR-008 story 04).

## ADR-001 — `continue` builds; an operator-led mode is its own command

### Context

`continue.md` is about 400 lines. It carries solo and orchestrated builds, spans, the milestone walk,
and 149's `<manual_mode>`, which is about 40 lines that no build reads. Teaching is a conversation
over many turns with a boundary to hold on every turn. That is a different kind of session from a
build, and a region inside the build prompt would grow every build's prompt to carry it.

### Decision

1. **`continue` builds, and nothing else.** Its prompt keeps no operator-led mode: `<manual_mode>`,
   the `--manual` parsing rules and the `guided:` outcome leave `continue.md` and its Codex section in
   `variants/codex/workflow.md`.
2. **Manual is its own core command, `aof:manual <ref>`** (operator, 179/00 Q1). It carries 149's
   guide unchanged in what it prints. Manual is core behaviour, not a practice, so it stays in core.
   It renders on all three runtimes, as `--manual` does today.
3. **Teaching is its own command, `aof:teach <ref>`**, shipped by `@aof/learning` (ADR-004).
4. **`continue.md` says nothing about `--manual` after the move** (operator, 179/00 Q2: "delete it
   completely"). There is no pointer line. An operator who types the old form gets a prompt that does
   not recognise the flag. The CLI and board door keeps `--manual`, which answers `/aof:manual <ref>`
   (ADR-002).
5. **Supersedes 149's delivered criteria that place manual inside `continue`.** These are 149/00's
   E1–E4, its rule outline, its `<output>` row and its argument hint, and 149/01's E7 command text.
   The delivered `.feature` files are not edited. 179/00's contract states the replacements, and the
   149 test rows follow it.

### Alternatives considered

- **A region spliced into a slot in `continue.md`** (this ADR's first draft). Rejected by the
  operator: core's source stays clean, but the rendered prompt still grows for every build.
- **Teaching as its own command, with manual left in `continue`.** Rejected: it leaves two
  operator-led modes entering in two different ways, and leaves `continue` carrying one of them.

## ADR-002 — The build door maps an operator-led flag to its command

### Decision

1. The continue door's operator-led modes are descriptors, `{ flag, command, description }`.
   `@aof/work` holds manual's as a built-in (`{ flag: "manual", command: "manual" }`), since manual
   is core behaviour. `createPhaseDoorCommands` takes `operatorModes` (default `[]`) and appends them.
   Each becomes an optional boolean input on the **continue door only**, a CLI flag and a usage token.
2. **Every mode is refused as manual is today, by the same code.** A non-story or non-task is refused
   `continue-<flag>-not-a-story`. A continue the decision would send elsewhere is refused
   `continue-<flag>-remote`. A `running` answer is returned unchanged. For manual these are the codes
   149 already ships, so they do not change.
3. **A local answer names the mode's own command**: `command: "/aof:<command> <ref>"`. This is the
   same move a milestone continue already makes when it answers `/aof:autonomous`. The story starts
   through `startedHere`, as any local continue does.
4. **The modes are exclusive.** Two operator-led flags together are refused `continue-modes-exclusive`
   right after the backlog refusal, before the type check or the overlay read. Nothing moves and
   nothing is minted.
5. Refine and verify never declare the inputs, so `aof work refine <ref> --teach` is refused as an
   unknown flag, as `--manual` is today. The loop never composes an operator-led flag: 149/01's
   control in `test/loop/drive-command-phase-drivers.test.mjs` extends to `--teach`.

## ADR-003 — An operator-led command enters through the door, then owns one run

### Decision

1. **The command's first act is the door**: `aof work continue <ref> --<flag> --json`. The refusals
   are code (spike 178 D1–D3), not prose, and the door makes the starting status move. On
   `continue-<flag>-not-a-story` for a milestone or span, the command runs `aof work next <ref> --json`
   and names the ready stories to take one at a time. On `running` it says where, and stops.
2. **It never resumes a lineage.** It does not walk the re-entry sweep. A resumed or re-entered
   session is not in the mode until the command is invoked again, and nothing reads a mode from a run
   record or a transcript (spike item 4). An agent lineage on the ref is reported by a `duplicate-run`
   refusal at the mint, never carried on.
3. **It mints its own run** with `aof work run-start <ref> --json` before printing anything.
4. **It closes that run `done`, never `failed`.** `run.completed` rolls a `failed` story back to
   `not-started` (149/R3), which would undo the operator's started story.
5. **It hands back to `aof:review <ref>`**, never to `aof:verify`. Review returns findings to the
   human and never repairs (149/02).
6. **A hand-off to an agent is whole-story, and it is written down** (operator, 179/02 Q1). When the
   human asks, in any turn, to hand the story to an agent, the command does two things:
   - It appends a **hand-off entry** under `## Notes & decisions in flight` in the item's `STATE.md`
     (the parent milestone's for a nested story, the story's own for a standalone one). The entry
     reads `- <date> — Hand-off <ref> from <teach|manual>:`, then lists the files under `files:` the
     human changed, their commits since the run was minted, and the scenarios green and red at that
     moment.
   - It then closes its run `done` and names `aof:continue <ref>`. It does not run it.
   The entry is a record in the item's own folder, never a write under `files:`. A standalone task
   has no `STATE.md`, so its hand-off is reported in the terminal only.
7. **`continue`'s story lane reads that entry.** Step 1 reads any `Hand-off <ref>` entry in the
   item's `STATE.md`, and only that entry (`<read_depth>` holds). The build treats the files it names
   as the human's starting point rather than a blank, and its report names every human-written line
   it changed, and why. Nothing is protected or enforced: the human's commits stay in git history.
   The entry informs a build. It never confers a mode, so §2 holds.

## ADR-004 — Teaching is a practice package, `@aof/learning`, composed by core

### Context

The operator ruled that teaching's behaviour lives in a new workspace package, and that core and
`@aof/work` offer only seams that name no practice (SPEC Objective). The practice route (135/ADR-001)
keeps dependencies one way but ships no prompt text. The contribution route (169/ADR-002) appends
whole bundle members, but it is for integrations: their members are gated on
`work.integrations.<id>` (`bundle-synthesis.mjs`), and FF-16901 reserves `integrations.mjs` for
integration packages.

### Decision

1. `@aof/learning` (`packages/learning`) holds teaching: the mode descriptor the door is handed
   (ADR-002), the `teach` command member and its prompt, and the pedagogy vocabulary (ADR-006).
   Milestone 180's checks land in the same package.
2. **Dependencies run one way.** `@aof/learning` may import `@aof/contracts`. `@aof/work` imports
   nothing from it, does not list it, and no comment-stripped `@aof/work` source spells `teach`.
3. **Code is composed the 135 way.** Core's `application/bindings/commands/continue.mjs` hands the
   package's mode descriptor to `createPhaseDoorCommands`, as it hands `refuseOpenExamples` today.
4. **Members are composed through a second registry, `packages/core/src/practices.mjs`.** It is the
   one core module that names a practice package whose `assets/bundle.json` the bundle appends.
   `readDescriptor` and `scripts/sea-asset-manifest.mjs` walk `INTEGRATIONS` then `PRACTICES`. A
   practice's members carry no `integration` key, so no config switch gates them. Teaching is
   opted into per invocation, never per project.

### Alternatives considered

- **Register it in `INTEGRATIONS`.** Rejected: that gates teaching behind a config block, and puts a
  practice in the registry FF-16901 keeps for integrations.
- **Ship `teach.md` from core's own assets.** Rejected by the operator's ruling: the prompt text is
  teaching's behaviour.

### Consequences

One `yarn.lock` workspace entry and no third-party dependency. Run
`node scripts/supply-chain-audit.mjs` after the install (AGENTS.md). `packages/core/src` gains one root
module, so its directory budget row moves 29 → 30 with its reason stated.

## ADR-005 — The teaching boundary is instruction, restated every turn and claimed honestly

### Context

Spike 178 proved that a single command turn holds a guide-only boundary (P1). It refuted the
follow-up turn (P2: "just write the implementation for me" edited source silently). No native
control is mode-scoped (P3, P4).

### Decision

1. **No enforcement engine.** 179 adds no hook, no `permissions.deny`, and no marker a hook could
   read (spike item 3). `teach.md` tells the human that the boundary is the session's instruction,
   not an enforced restriction. It names a project-level `permissions.deny` on `Edit`/`Write` as the
   operator's own option, and says that this does not cover shell writes.
2. **The boundary governs every turn, not just the command turn.** In any later turn, AOF edits no
   file under the story's `files:`, spawns no developer and applies no fix. A request to write the
   code, at any rung and in any wording, is answered by naming the visible exits, never by
   complying: `aof:continue <ref>` (an agent builds) or `aof:manual <ref>` (the human drives with the
   full guide).
3. **Effects are disclosed, never denied.** The opening banner names the active mode, and that the
   human owns every file under `files:`. It names what AOF may do: run
   `aof test --scope impacted --story <ref>`, mint and close the run, and read the record. It names
   the writes a teaching session really makes: the status move, `runs/<node>/*.json`, and the
   gitignored `.aof/artifact-sync-queue.ndjson` that the PostToolUse hook writes. It is never
   advertised as zero-write.
4. The outcome is `taught: <ref> is yours to build`. A hand-off to an agent follows ADR-003 §6.

## ADR-006 — The pedagogy is data in the package, and the prompt is pinned to it

### Decision

1. `packages/learning/src/vocabulary.mjs` exports three frozen lists:
   - `STAGES`: the six problem-solving stages (reinterpret, find analogies, consider solutions,
     evaluate a candidate, implement, evaluate the implementation).
   - `HELP_LADDER`: the five rungs (diagnostic question, conceptual hint, analogous example, partial
     scaffold, worked explanation).
   - `TRAPS`: the eight traps, each paired with the control the SPEC gives it.
2. `teach.md` is hand-written prose, and a package suite pins it. Every entry of the three lists
   appears in it, and it names no stage, rung or trap that the lists lack. Milestone 180 reads the
   same lists rather than spelling them again.
3. **Each task starts at the first rung** (operator, 179/03 Q1). The ladder never carries over from
   one task to the next. The human may still ask for any rung straight away.
4. Progressive help replaces 149's "order to take the tasks in, with the reason" in teaching only
   (spike item 5). `aof:manual`'s guide keeps it.
5. The package writes no file. There is no learning transcript store and no profile (SPEC scope).

## ADR-007 — Teaching ships for Claude Code only

Spike 178 proved the boundary on Claude Code only (Finding item 6). The `teach` member declares
`runtimes: ["claude"]` and carries no Codex variant, so Codex and OpenCode render no `teach` command.
Parity is never claimed. The README's command table says so. On Codex or OpenCode, the door still
answers `aof work continue <ref> --teach` with `/aof:teach <ref>`, a command that does not exist
there. The README line covers it, and no runtime-aware door is added (the door does not know the
runtime). The operator accepted this scope on 2026-10-31, when the command design was agreed.

## ADR-008 — Five stories: manual moves out, a door, a command, a guide, a walk

The cut follows the coupling that `aof graph impact` reported (graph built 2026-10-28T22:06Z,
code-only, 20,912 nodes):

- `packages/work/src/commands/continue.mjs` depends only on `@aof/contracts/error`. Its dependents
  are core's `bindings/commands/continue.mjs`, `packages/work/test/reentry.test.mjs` and
  `@aof/specification-by-example`'s `package-seams.suite.mjs`. Both door changes (00's command answer
  and 01's injected mode) write this file and `test/surfaces/board-mesh-execution.test.mjs`, so 01
  follows 00.
- `packages/core/src/work/bundle.mjs` is a hub, with more than fifty dependent suites.
  `scripts/sea-asset-manifest.mjs` feeds `build-sea.mjs`, `install-local.mjs` and
  `bundle-asset-manifest-complete.test.mjs`. Only 02 touches them, by registering `PRACTICES`.
- 03 writes `teach.md`, as 02 does, so it follows 02. 04 walks what 00–03 render.

| story | depends | why the edge |
|---|---|---|
| 00 · manual becomes its own command, and a hand-off is written down | — | — |
| 01 · `--teach` enters through the build door | 00 | both write the door, its binding's suite and `board-mesh-execution.test.mjs` |
| 02 · `aof:teach` opens and holds the boundary | 01 | it calls 01's door, and both write `packages/learning/package.json` |
| 03 · teaching guides through the problem | 02 | both write `packages/learning/assets/commands/teach.md` |
| 04 · a real teaching session holds the boundary | 00, 03 | it walks both commands' renders |

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-17901 | **`continue` builds only.** `packages/core/assets/commands/continue.md` and the `continue` section of `variants/codex/workflow.md` contain no `<manual_mode>` region and no `guided:` outcome. | `test/arch/command/acd-continue-builds-only.test.mjs` — pending (179/00) | ADR-001 §1 |
| FF-17902 | **Dependencies run one way.** No module under `packages/work/src/**` imports `@aof/learning`, `packages/work/package.json` does not list it, and no comment-stripped `@aof/work` source spells `teach`. Under `packages/core/src`, only `practices.mjs` and `application/bindings/commands/continue.mjs` import it. | `test/arch/command/acd-learning-package-one-way.test.mjs` — pending (179/01) | ADR-004 §2–§4 |
| FF-17903 | **The pedagogy has one home.** Every `STAGES`, `HELP_LADDER` and `TRAPS` entry appears in `teach.md`. No other bundle asset names `Forming` or `Dislodging`, the two trap names that are not ordinary words. | `test/arch/bundle/acd-teach-vocabulary-one-home.test.mjs` — pending (179/03) | ADR-006 §1–§2 |
