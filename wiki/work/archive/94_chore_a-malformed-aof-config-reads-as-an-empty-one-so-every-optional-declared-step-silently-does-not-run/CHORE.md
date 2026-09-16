---
type: chore
number: 94
slug: a-malformed-aof-config-reads-as-an-empty-one-so-every-optional-declared-step-silently-does-not-run
title: "A Malformed Aof Config Reads As An Empty One So Every Optional Declared Step Silently Does Not Run"
status: done
owner: <role>
created: 2026-09-03
updated: 2026-09-04
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 94 · A Malformed Aof Config Reads As An Empty One So Every Optional Declared Step Silently Does Not Run

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

`loadWorkspace` answered `{ config: {} }` for a project with **no** config, and the same `{ config: {} }` for a config with a JSON typo. Since every optional declaration is read as `config.x ?? default`, one trailing comma silently disabled the lot — `work.worktree.prepare` never prepared, `work.test` never selected, the loop bounds quietly fell back — and every reader was *correct* to take its default for a key it could not see. Nothing said so anywhere.

## Definition of Done

- [x] Decide and implement what loadWorkspace should do when .aof/aof.config.json is present and does not parse: today it answers { config: {} }, indistinguishable from no config at all, so a JSON typo silently disables every optional declaration (the worktree prepare step among them) with no warning anywhere. Then drive the distinction from a caller.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "A malformed aof config reads as an empty one, so every optional declared step silently does not run" (`src/work.mjs (loadWorkspace)`)
- **Raised reviewing:** `72/04`, review round 1
- **Promotion key:** `finding:72/04:a malformed aof config reads as an empty one, so every optional declared step silently does not run`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

### What was done (2026-09-04)

**The decision: RECORD the fault, do not throw on it — and give it a caller that speaks.**

Throwing was rejected. Every daemon, board face and CLI door loads through `loadWorkspace`, and
`board-ui.mjs` already maps a throw from it to a 500 precisely because a door that dies on a torn
config takes the fleet with it. The degrade to `{}` is deliberate and stays. What was missing was
not the tolerance — it was that the tolerance **erased the distinction**, so nothing downstream
could tell "no config" from "a config with a trailing comma".

| leg | change |
| --- | --- |
| `src/fs.mjs` | `readJson`'s PARSE leg now carries `code: "malformed-json"` — the word `config-inspect.mjs` and the board face already use, so the fact has one vocabulary and not a third. The read leg keeps node's own `ENOENT`, untouched. |
| `src/work.mjs` | `loadWorkspace` still answers `{ config: {} }`, and now also returns `configFault` — `{ path, code, message }` when the file is present but unreadable, `null` when it parses AND when there is no config at all. An absent config is **not** a fault: an unconfigured project is legitimate, and a warning there would fire on every repo that never opted in. |
| `src/commands/doctor.mjs` | **The caller that drives the distinction.** `work:doctor` — the health lane — turns a recorded fault into an `error` finding (`config-unparseable` / `config-unreadable`) naming the file, the parse error, and what is consequently not running. Appended at the same impure edge as the fabric preflight, so it is a workspace fact and is never filtered away by `scope`. |

Two notes on what was deliberately *not* done:

- **The finding does not gate the loop.** `DOCTOR_GATE_CODES` is derived from `CONTROL_FINDING_CODES`
  (54/ADR-007 §2d) — declared *controls*, not general health — and quietly widening it here would
  change loop-gating behaviour well outside this chore's remit.
- **The message spells no configuration key.** A dotted key inside a string literal reads as a second
  reader of that key to FF-7201's one-reader census (it strips comments before it looks; a message is
  not a comment). Caught by the fitness tier during this build, and fixed by naming the consequences
  in prose instead.

Verified at source in this checkout:

| check | result |
| --- | --- |
| `test/config-fault-visible.test.mjs` (new, registered in `scripts/test.mjs`) | **6/6 green** — torn ≠ absent ≠ valid; the door still never throws; doctor's finding, its envelope and its absence when the config is fine; the unreadable (non-parse) leg; the finding surviving a scope that selects no item |
| regression — hydration, mesh-operator-guidance, doctor command-core, config-inspect/editor, finding-envelope, FF-7201 | 70 green, 0 red |
| the declared craft/fitness lane — `node scripts/test-rubric.mjs` (`work.rubric`), the whole of `test/arch/**` | exit 1 on **seven pre-existing reds and nothing else**, every one reproduced on a baseline with this chore's source changes stashed: `chore-dod-checklist` (chore 97 carries no DoD), `acd-command-layer-imports-downward` ×2 and `FF-5905` (this branch's in-flight loop-record work), `FF-7106` (milestone 96's stories), `FF-5308` (a follow-on red that fires because TECH_DEBT item 49 was fixed elsewhere), `FF-6807` (offender `src/commands/loop-record.mjs`) |
| `aof work validate 94` | PASS |
| `aof work doctor 94` | exit 0 — 0 admitted findings (the `numbering-gap` warn is stream-wide and pre-existing) |

### Review (solo, 2026-09-04) — round 1

- **Structural (architect lens):** one Blocker, fixed — `configFaultFrom` had been inserted *between*
  `loadWorkspace`'s header comment and the function, leaving that header documenting the wrong thing.
  Moved above the block. Otherwise: detection at the one door, reporting at the one health lane, no
  new import, no upward dependency.
- **Behavioural (QA lens):** two claims the code made and no test drove — the unreadable-but-present
  (non-parse) leg, and "never filtered by `scope`". Both are now tests, both green.
- **Craft:** no lint/typecheck exists in this repo; the declared craft lane is `work.rubric` →
  `scripts/test-rubric.mjs` (the fitness tier), run and reported above.

**Routed at review close:** one Important finding — an explicitly named `--config <path>` that does
not exist is still silent, because `configFaultFrom` treats every `ENOENT` as the legitimate
no-config case. That is right for a *discovered* config and wrong for one the operator *named*.
Promoted to its own chore — **113** (`aof work promote-finding 94 … --round 1`) — rather than widened into this one.

**Prior lesson that shaped this build** (`aof work memory recall --kind near-miss`): **R3 (m13) — "a
non-fatal catch must still emit a signal"** (`13_milestone_external-milestone-import/RETROSPECTIVE.md:43`).
This chore is that rule applied at `loadWorkspace`: the catch stays non-fatal, and now emits.

## Accept decision

**Accepted 2026-09-04** — `in-review → done`, on the two chore close criteria (ADR-003), both checked at source:

1. **Ticked checklist** — both `## Definition of Done` boxes are `- [x]`, none left open. The implementation the first box claims resolves in this checkout: `configFault` in `src/work.mjs` (`loadWorkspace` returns it; `configFaultFrom` builds it), `code: "malformed-json"` in `src/fs.mjs`, and the `config-unparseable` / `config-unreadable` findings in `src/commands/doctor.mjs` — the caller that drives the distinction. `test/config-fault-visible.test.mjs` re-run under isolation: **6/6 green**.
2. **`aof work validate 94`** — **PASS**, "94 is well-formed."

`aof work doctor 94` exits 0 with no `control-unresolved` at either severity; the only warn is the stream-wide, pre-existing `numbering-gap`.

No scenario suite and no human sign-off apply — a chore carries no behavioural contract by design. `OUTCOME.md` authored alongside this record (story 80): the three capabilities the ticking made true, as product state.
