---
type: story
number: 07
slug: claude-session-hooks
title: "Claude sessions reach the index — the bundled hooks without which the terminals home is empty in every workspace except this one; built any time, LANDED LAST"
parent: 49
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-13
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 07 · Claude sessions reach the index

## User story

As the operator who installs aof into a repo and opens the terminals home,
I want my **Claude** sessions to appear there the same way Codex sessions already do,
so that the screen is populated in a normally-provisioned workspace instead of only in the one repo
that happens to have been hand-wired for dogfooding.

## Tasks

- [ ] `tasks/00_the-bundle-wires-claude-session-hooks.feature`

## Notes

**Order.** Independent to build. **STRICTLY LAST TO LAND — after story 05.** This is the one hard
sequencing rule in the milestone and it is ARCHITECTURE's bad cut 1.

### The gap, measured at source

- `startSession`/`pingSession` ([mesh-session.mjs](../../../../../src/mesh-session.mjs)) have exactly
  **one** production caller: the `aof session start|ping|end` CLI verb
  ([commands/mesh-session.mjs:318,323](../../../../../src/commands/mesh-session.mjs#L318)). The worker
  never writes a session record directly, and a board PTY writes to an unrelated pid registry
  (`.aof/terminal-sessions.json`) that no index reads.
- That verb fires only from a `SessionStart`/`UserPromptSubmit`/`SessionEnd` hook in the **cwd's own**
  hook config — so **hook wiring, not process origin, decides whether a session is ever recorded.**
- [bundle.json:12-16](../../../../../src/bundle/bundle.json#L12) wires those three hooks for
  **`runtimes: ["codex"]` only**. The sole claude-runtime bundle member is `claude-artifact-sync`, which
  is unrelated.
- This repo has Claude session records purely because its **hand-authored** `.claude/settings.json`
  wires them — a dogfooding artefact, not something `aof work init`/`update` gives anyone.

**So in every workspace aof provisions, a Claude session produces no presence record, no index entry,
and nothing for the terminals home to render.** Measured live on the three-node fleet at refine: every
node reported `sessions: []`.

### Why it lands LAST, and why "it's independent, land it early so we have data" is the trap

ARCHITECTURE bad cut 1, and it is worth stating as a rule rather than a preference. Every session these
hooks newly record is a **free** session — no assignment — and by ADR-003's arithmetic a free session is
`no-producer`: nothing feeds the relay for it, because `sendTerminalFrame` has exactly two call sites
and both are worker-execution. So landing the hooks **before** story 05's honest feed rendering converts
an empty grid into **a grid full of panes that will never receive a byte**, and the milestone's own demo
becomes a live demonstration of the failure it was built to prevent.

**The hooks land after the honest rendering, or they do not land in this milestone.**

### What this story does NOT claim

It makes a Claude session **visible and addressable**. It does **not** make one **stream** unless it is
also a worker execution — that is the relay's producer boundary and it is out of scope here and in this
milestone. An operator's hand-run `claude` in a hook-wired workspace becomes a tile that honestly says
`no live output`; it does not become a live terminal. Do not let the task's scenarios imply otherwise,
and do not "fix" it by widening the relay's producers — ARCHITECTURE ratchets that count deliberately
(`acd-terminal-output-signal-source` gains a shrink-only **ceiling** of two producers, precisely because
the browser's `no-producer` derivation depends on it).

### PO rulings, 2026-08-13 (from QA's contract pass)

**"Mirror the Codex three exactly" was MY framing and it is wrong — the two runtimes do not share event
names (QA F-49-07-a).** Verified at source: `src/bundle/hooks/codex-session-stop-ping.json` is
`{"event":"Stop","command":"aof session ping --assistant codex"}` — event `Stop`, verb **`ping`**. So
"same events, same verb" and "`SessionStart`/`UserPromptSubmit`/`SessionEnd` → `aof session
start|ping|end`" cannot both hold. **Ruling: the explicit event/verb triple wins.** Two reasons, both
checkable: it is the triple this repo's own hand-authored config has proven since 2026-07-26, and only
`end` **removes** the record (`src/mesh-session.mjs`) — a runtime with no end hook leaves every session
to TTL expiry. Mirror the Codex set in *shape and intent* (three members, one per lifecycle moment, the
same CLI verb family), mapped onto **each runtime's own event names**.

**The Codex asymmetry is left alone.** Codex having no `end` hook is a real gap and it is **not this
story's to fix** — changing the Codex members would put a second, unrelated behaviour change inside the
milestone's last-landing story. Note it for a chore; do not touch it here.

**`test/bundle.test.mjs` IS ALREADY RED AT HEAD, and this story cannot land without repairing it
(QA F-49-07-b, verified independently).** Measured 2026-08-13: the exported `bundleTests` array is
**12 pass / 6 fail**, and it is imported by [scripts/test.mjs:441](../../../../../scripts/test.mjs#L441)
and spread into the runner at `:2197` — so the **full suite is red**, and nothing says so because
`node --test test/bundle.test.mjs` runs only the file's wrapper (1 pass) and never the array. Cause is
**not this milestone**: m43 landed `claude-artifact-sync` / `artifact-sync-enqueue` without moving
`HOOK_IDS`, the `byKind("hook") === 3` count, or the valid-kind list, and `src/bundle/manifest.json`'s
hashes have drifted since.

**Ruling: this story repairs the member lists and the manifest it must touch anyway, and no more.** You
cannot add three hooks to a list that is already wrong and tell whether you broke it — the gate goes
from 3-vs-4 to 3-vs-7. Repair `HOOK_IDS`, the kind count, the valid-kind list, the manifest hashes, and
`test/bundle-asset-manifest-complete.test.mjs`'s file-count pin (57 today → 60 with three new hooks,
both counts measured). **Do not** audit the rest of the bundle suite; that is a chore, and this is
TECH_DEBT item 27's recurring class, not a defect this story owns.

<!-- ARITHMETIC CORRECTED at build, 2026-08-13 (PO; developer measured it, QA independently recounted
and agreed). The pin is **58 → 61**, not 57 → 60. Chore 51 landed `src/bundle/commands/init.md`
(57 → 58) WITHOUT moving this pin, so the "57 today" above was already one behind when it was written.
The delivered value is **61** (2 + 8 + 25 + 8 + 3 + 15), counted from the tree by two agents
independently. Recorded rather than silently overwritten because this is the NINTH stale premise in
this milestone and its cause is the same as the others: a number measured once, written into a record
doc, and true only until the next commit — here, a commit that landed WHILE this document was being
authored. The lesson the retro should take is not "re-measure more often" but that a count a GATE
enforces should be cited by the gate's own expression at the moment of use, never carried in prose. -->


**The `SessionStart` matcher is the architect's, not the builder's (QA F-49-07-d).** Codex declares
`startup|resume|clear`; this repo's hand-authored entry declares `""`. The source set is documented
nowhere in the tree, so the contract pins a behavioural floor and the string is routed. Settle it at
kickoff rather than typing whichever looks right.

**One spelling for one runtime (QA F-49-07-e).** `src/commands/mesh-session.mjs` defaults the assistant
to `"claude-code"` when identity arrives from a hook channel, and the Codex hooks pass
`--assistant codex` to escape that default. A new hook passing `--assistant claude` would create a
**second spelling of one runtime**, which is the drift class this codebase keeps paying for. The
contract pins *agreement* rather than a literal; pick the spelling that already wins and do not
introduce a third.

**Expect DOUBLE invocations in THIS repo after landing, and do not "fix" them here (QA F-49-07-f).**
Once the bundle declares these members, `aof work update` in this repo adds a marked entry beside each
existing **unmarked, hand-authored** one — two `aof session start` calls per `SessionStart`. ADR-005
defers that reconciliation to a chore. Nobody should log it as a defect of this story, and nobody should
delete the hand-authored entries as part of it.

**Deploy reality — say it in the handback, do not build it.** Hooks are bundle members, so an existing
workspace only gets them via `aof work update`; a workspace that never updates stays invisible to the
home. That is expected and is the bundle's normal distribution path, not a defect this story fixes.
