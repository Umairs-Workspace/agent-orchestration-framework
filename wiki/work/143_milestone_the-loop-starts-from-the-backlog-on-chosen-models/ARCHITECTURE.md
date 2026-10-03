---
doc: architecture
---
# 143 · Architecture

Four decisions, one per story. Every one extends a home that already exists: the promote door, the
loop's bounds leaf (`work.loop.*`), the session resolver (`work.agents.session`) and the loop
declaration (`brief.loop`). No new store, no new config surface, no new record type.

## Memory recall

- **m53 ADR-004, the loop is resumed, not restored.** Durable loop state is the frozen `brief.loop`
  envelope on the runs the loop already mints. Honoured: the minted ref, the refine scope and the
  per-phase session choices all ride that envelope as appended keys (ADR-001 §3, ADR-002 §3, ADR-004 §2).
- **m68 ADR-002, the phase is read from `brief.loop.phase` and never minted again.** Honoured: the
  per-phase session record is keyed by those same phase names.
- **126/02 and 141, an explicit flag wins and an absent one inherits.** Kept for `--refine`. For the
  session flags it is applied to the flag SET as a whole (ADR-004 §3), a deliberate and stated change
  of grain.

## Measured facts this document reasons from

- The loop scope admits only `NN` and `NN-MM` (`decideLoopScope`, `packages/work-loop/src/engine.mjs:749`).
  A slug answers `loop-scope-unsupported`. `phase-backlog-ref` is the refine/continue door's refusal
  (`packages/work/src/commands/continue.mjs:232`), which the loop never reaches today.
- `aof work promote <slug> --json` answers `created.ref` (`packages/work/src/commands/promote.mjs:580`).
- A milestone with no stories decides `refine` on the milestone (`decideLoopPhase`, `engine.mjs:1236`).
  The drive composes the prompt in `phaseCommand` (`packages/work-loop/src/commands/drive.mjs:126`),
  which today appends only `--solo`/`--orchestrated`.
- A loop drive crosses into the drive two ways: in-process through `ctx.loopDrive`, and as a child
  process through `spawnLaneDrive` argv (`packages/work-loop/src/child-drive.mjs:157`). `--thinking`
  already rides both (`packages/work-loop/src/cycle.mjs:544-607`, `packages/work-loop/src/wave.mjs:517`).
- `resolveSessionLaunch(config, phase, { thinking })` (`packages/execution/src/session-model.mjs:76`)
  resolves the model from config only and the effort from `--thinking`, then config, then `high`.
- `parseSpecArgv` (`packages/core/src/application/bindings/spine/face.mjs:56`) keeps the LAST value of
  a repeated string flag, so no flag can be given twice today.
- `work.loop.*` has one home, `packages/contracts/src/loop-bounds.mjs`, held by FF-6901.

## ADR-001 — The loop promotes a backlog ref through the one promote door

**Decision.**

1. **Resolve before deciding the scope.** When `aof work loop <scope>` gets a scope that is neither
   `NN` nor `NN-MM`, the shell resolves it with `resolveItemExact`, the exact resolver the refine/continue
   door uses (`work:find` is a query and would guess), before `decideLoopScope` runs. A row with `number: null` (the backlog marker, the test `continue.mjs` already uses) is
   promoted. Anything else answers the `loop-scope-unsupported` refusal unchanged. The engine's scope
   grammar is not widened, and the engine stays pure.
2. **The one door.** The promotion is `invokeRegistered("work:promote", { slug })`, the same command
   `aof work promote` runs. It appends (no `--at`; a position is the operator's to name). The loop
   then runs at `created.ref`, exactly as if the operator had typed that number. A promote refusal is
   the loop's refusal: its code and message are surfaced, and nothing is minted.
3. **The record.** The loop declaration gains one appended key, `promotedFrom`: the slug the operator
   typed, or `null`. With `scope` holding the minted number, the declaration says both. The narration
   prints one line before the first drive: `Promoted <slug> → <ref>.`
4. **Dry run, stop, hand-off and resume never promote.** A promotion is a write. `--dry-run` reports
   `wouldPromote: <slug>` and stops. `--stop`, `--hand-off` and `--resume` with a backlog slug refuse
   `loop-backlog-ref-not-running` and name `aof work loop <slug>` (no running loop can hold a scope that
   has no number yet). After the promotion the slug is a live row, so a later `--resume` names the number.
5. **Local only.** The loop already runs on the operator's node, and that is where the mint belongs
   (ADR-003 §7 of the backlog milestone). Nothing here dispatches a promotion.

**Why.** The promote door alone mints numbers (127). A second minting path in the loop would be a
second home for numbering. Resolving in the shell keeps the decision engine importing nothing.

## ADR-002 — A whole-item refine is one refine drive carrying `--autonomous`

**Decision.**

1. **Home.** `work.loop.refine` in `packages/contracts/src/loop-bounds.mjs`, members `per-story`
   (default, today's behaviour) and `whole-item`, with the same resolver discipline as
   `work.loop.concurrency`: a member verbatim, the default for anything else, never a throw. The
   SPEC's proposed `work.autonomous.refine` is NOT used: FF-6901 makes `work.loop.*` the one home for
   the loop's settings, and a loop-only setting under `work.autonomous` would be a second one.
2. **The flag.** `aof work loop <ref> --refine whole-item|per-story` overrides it for the run. An
   unknown value refuses `loop-refine-unknown`, naming the two members.
3. **The record.** The resolved value is the declaration's appended key `refine`. A resume inherits it
   unless `--refine` is given (126/02's rule).
4. **The decision.** `decideLoopPhase` takes the resolved value as an input (`refine`), as it takes
   `concurrency`, and compares it against one literal. Under `whole-item`, the drive it decides for a
   **milestone with no stories** carries `autonomous: true`. Every other refine decision is unchanged.
   So a whole-item cascade that dies part-way leaves stories without tasks, and the existing
   per-story refine decisions finish them. The mode self-heals and needs no resume logic of its own.
5. **The prompt.** The drive composes `/aof:refine <ref> --solo --autonomous`: `phaseCommand` appends
   `--autonomous` after the mode flag. `aof:refine --autonomous` is the cascade that already exists
   (break down, then every contract). The flag crosses both drive seams, `ctx.loopDrive.autonomous`
   in-process and `--autonomous` on the child argv. `aof work drive refine <ref> --autonomous` is the
   CLI door. On any other phase it refuses `drive-autonomous-refine-only`.

**Why.** The loop already knows a milestone with no stories is the break-down drive. Making THAT drive
a cascade needs no new phase, no new engine state and no change to the refine prompt.

## ADR-003 — One grammar for per-phase session choices, in the session leaf

**Decision.**

1. **Home.** `parseSessionChoices({ model = [], thinking = [] })` in
   `packages/execution/src/session-model.mjs`, beside `normalizeEffort`. It is pure and returns
   `{ choices }` or `{ refusal: { code, message } }`. `choices` maps each phase to
   `{ model?, modelFlag?, effort?, effortFlag? }`, where the `*Flag` field is `--model` or `--thinking`.
2. **`--model [<phase>=][<model>][:<effort>]`.** Split on the first `=`. The prefix must be a phase
   (`refine`, `continue`, `verify`), or the value refuses `session-choice-unknown-phase`. Then split
   the rest on the LAST `:`, and only when the suffix is an effort spelling (`normalizeEffort`).
   Otherwise the whole rest is the model id, so `…-v1:0` is a model. A rest that starts with `:` and
   does not end in an effort spelling refuses `thinking-unknown-level`. An empty value, or one with
   neither a model nor an effort, refuses `session-choice-empty`.
3. **`--thinking [<phase>=]<effort>`.** The same phase rule. The level goes through `normalizeEffort`,
   and an unknown level is the existing `thinking-unknown-level`.
4. **Specificity, not order.** A phased value beats an unphased one for its phase. Two values at the
   SAME specificity that set the same part (model, or effort) for the same phase refuse
   `session-choice-conflict`, naming both values. That covers the same flag given twice and
   `--model verify=fable:high --thinking verify=max`. It refuses even when the values are equal: the
   rule is that nothing picks a winner.
5. **Resolution.** `resolveSessionLaunch(config, phase, { choice })` resolves per part: the flag, then
   `work.agents.session.models`/`.effort`, then the default (no model; `DEFAULT_EFFORT`). It answers
   `modelSource` (`--model` or `config`, absent when there is no model) beside the existing
   `effortSource` (`--model`, `--thinking`, `config` or `default`). The `{ thinking }` option stays
   and means an unphased `--thinking`, so the drive and 141's callers are unchanged.
6. **Repeatable flags.** `parseSpecArgv` gains `repeatable: true` on a string flag spec. A repeatable
   flag collects every value, in order, into an array. A non-repeatable flag keeps today's
   last-value behaviour byte for byte.
7. **Subagent role models are out of scope.** `--model` sets the session aof spawns.
   `work.agents.models` stays config-only, and FF-7006 still holds the split (70/ADR-005).

## ADR-004 — The loop resolves every phase once, records it, and lends each drive its own

**Decision.**

1. **Resolve once, at launch.** The loop's `--model` and `--thinking` are repeatable. The shell parses
   them through `parseSessionChoices` before any registered read, with the other vocabulary guards,
   and refuses with its codes. It resolves all three phases through `resolveSessionLaunch`.
2. **The record.** The declaration gains one appended key, `sessions`:
   `{ refine | continue | verify: { model, modelSource, effort, effortSource } }` with `model: null`
   when none. This is "which model ran which phase", on every run the loop mints. `thinking` keeps
   141's meaning: the unphased `--thinking` level, or `null`.
3. **Resume.** With no `--model`/`--thinking` given, a resume re-applies the recorded entries whose
   source is a flag, and re-resolves config-sourced and default entries from the current config (a
   config edit is the operator's standing choice, as in 141). With any session flag given, the
   recorded flag choices are dropped and the new flags resolve alone. A pre-143 declaration (no
   `sessions`) falls back to its `thinking`, so 141's resume still holds.
4. **Lending: flag parts only.** Each drive is lent the parts of its own phase's choice that came
   from a FLAG: in-process on `ctx.loopDrive.model`/`.thinking`, and in a child (primary or lane) as
   `--model <id>` / `--thinking <level>` on the argv. A part resolved from config or the default is
   not lent. The drive resolves it the same way from the same config, so 141's rule that "with no
   flag the loop passes nothing" stays true. The drive resolves in this order: its own flag, then the
   loop's lend, then config, then the default. The drive gains a single-phase `--model <id>` (no phase
   prefix, since a drive is one phase), and its dry run reports `model` beside `effort`, each with a
   source.
5. **Narration.** 141's one `Thinking:` line becomes one `Sessions:` line, which names per phase the
   model (or `default model`) and its source, and the effort and its source:
   `Sessions: refine opus (--model) at xhigh (--model); continue default model at high (config); verify fable (--model) at high (--thinking).`
   This SUPERSEDES the narration scenario of 141's
   `tasks/01_the-loop-carries-thinking-to-every-drive.feature`, deliberately and in the open. That
   delivered feature is not edited; the new rule lives in 143/03's contract. The dry-run probe
   carries the same `sessions` table.

**Why.** A per-drive record would need a new run-record key and a second writer. The declaration is
already on every run the loop mints and is already what resume reads (m53 ADR-004).

## ADR-005 — Four stories, cut on the seams above

`00` (promote) and `02` (grammar) share no file and start together. `01` (whole-item refine) and
`03` (wiring) both write the loop shell, the engine's declaration and the drive. The write sets
serialise them; there is no `depends:` edge between them, because the scheduler reads the write sets.
`03` depends on `02` because it composes `parseSessionChoices`.

The cut follows the coupling `aof graph impact` reports (graph built 2026-10-02T18:39Z, code-only,
egress none). `commands/loop.mjs` and `commands/drive.mjs` each have one dependent, their core
binding, so the shell and the drive are leaves that a story can own outright. `engine.mjs` has ten
source dependents, among them `packages/mesh/src/assignment-directive.mjs` and
`packages/work-loop/src/trigger/declaration.mjs`, which build loop declarations too. So every
appended declaration key (ADR-001 §3, ADR-002 §3, ADR-004 §2) must default to `null` for a caller
that does not pass it, and `01` and `03` both read those two callers. `loop-bounds.mjs` is read by the
loop registry and the bounds audit (`packages/work-graph/src/registry.mjs`,
`work-audit/declared-bounds.mjs`), which is why `01` reads them when it adds a key there.
`session-model.mjs` reports no edges: the graph does not resolve the `@aof/execution/session-model`
package specifier. Its importers were found with grep instead (`drive.mjs`, `loop.mjs` through their
bindings, `config-inspect.mjs`, `claude-settings.mjs`, `work/bundle.mjs`). `02` changes no export it
already has, so none of them is in its write set.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-14301 | **The loop promotes through the one door.** No module under `packages/work-loop/src/` imports from `packages/work/src/promote/` or `packages/work/src/commands/promote.mjs`. The shell reaches a promotion only as `invokeRegistered("work:promote", …)`. | `test/arch/loop/acd-loop-scope-guard.test.mjs` (the FF-14301 case; folded in at 143/00 because `test/arch/loop` is at its budget ceiling) | ADR-001 §2 |
| FF-14302 | **The refine scope has one home.** The members `per-story`/`whole-item` are a frozen array exported once from `packages/contracts/src/loop-bounds.mjs`. Outside it, comment-stripped `packages/**/src` spells `"whole-item"` only once, in `engine.mjs`'s one comparison constant. | `test/arch/loop/acd-loop-concurrency-single-home.test.mjs` (the FF-14302 case, beside FF-12901; folded in at 143/01 because `test/arch/loop` is at its budget ceiling) | ADR-002 §1, §4 |
| FF-14303 | **The session choice has one grammar and one resolver.** `parseSessionChoices` and `resolveSessionLaunch` are defined only in `packages/execution/src/session-model.mjs`. No module under `packages/work-loop/src/` reads `agents?.session` / `agents.session` from config. | `test/arch/session/acd-agent-model-source-map.test.mjs` (the FF-14303 case, beside FF-7006; folded in at 143/02 because `test/arch/session` is at its budget ceiling) | ADR-003 §1, §5 |
