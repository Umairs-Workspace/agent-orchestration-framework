---
type: story
number: 02
slug: the-notifier-and-its-channels
title: "The notifier and its channels — work.notify names channels by type and by the env var holding the secret, one eleven-key envelope, a Discord webhook renderer under the 2,000 cap, the shared headline formatter, best-effort delivery"
parent: 131
depends: []
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-25
adrs: [ADR-005, ADR-006]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/DESIGN.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/archive/17_milestone_notion-work-sync/ARCHITECTURE.md#ADR-004
  - src/notion/cli.mjs
  - src/degrade.mjs
  - src/work.mjs
  - src/effects/item-transitions.mjs
  - src/commands/resolve.mjs
  - scripts/test.mjs
  - test/notion/notion-config-schema.test.mjs
  - test/arch/loop/acd-loop-stop-request-single-home.test.mjs
  - src/commands/item-status.mjs
  - schemas/aof.schema.json
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/run/regression-gate.test.mjs
  - src/regression-record.mjs
  - test/work/architecture-slice.test.mjs
  - src/command-core.mjs
files:
  - src/notify/form.mjs
  - src/notify/form.d.mts
  - src/notify/notify.mjs
  - src/notify/discord.mjs
  - schemas/aof.schema.json
  - src/commands/item-status.mjs
  - test/notify/notify-form.test.mjs
  - test/notify/notify-channels.test.mjs
  - test/notify/notify-discord.test.mjs
  - test/notify/index.mjs
  - scripts/test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 02 · The notifier and its channels

## User story

As **the operator who is not at the terminal when the loop needs me**,
I want **a `work.notify` config block that names channels by type and by the NAME of the env var holding the webhook URL, one envelope built in one place, a channel registry with a Discord webhook renderer (plain `content`, `allowed_mentions: { parse: [] }`, at most 2,000 characters with the headline, answer command and link kept and code fences balanced), and the one zero-import headline formatter every face shares**,
so that **an ask, an answer, a park, a halt, a death and an acceptance reach me where I am, a second channel is a renderer and a config block rather than a second pipeline, a failing webhook never blocks or fails a run, and the secret is never committed or logged**.

What lands (ADR-005, ADR-006 §1): the new `src/notify/` family — `form.mjs` + `form.d.mts` (`formatElapsed`, `oneLineAsk`, `eventPhrase`, `headline`, `cost`, `accountLine`, per DESIGN), `notify.mjs` (config resolution, `CHANNELS`, `buildNotifyEnvelope`, `notify` — awaited, 5 s bound, never retried, never throws, failures through `reportDegrade` by name, the URL never in a message) and `discord.mjs` (`renderDiscord`, `sendDiscord`); the closed `work.notify` schema (`urlEnv` defaulting to `AOF_DISCORD_WEBHOOK_URL`, no `url`/`webhook`/`token` key); the `milestone-accepted` firing point in `item-status.mjs`; `test/notify/` founded and registered; the `src/notify` exemption row.

## Tasks

- [x] `tasks/00_the-notify-family-is-founded-and-registered.feature` — the `src/notify` and `test/notify` exemptions; `test/notify/index.mjs` imported once by `scripts/test.mjs`
- [x] `tasks/01_one-form-for-every-face.feature` — `form.mjs` zero-import with its six exports and `form.d.mts`; the elapsed ladder, the 100-character one-line ask, the seven phrases, headline, cost, account line
- [x] `tasks/02_work-notify-names-the-env-var-never-the-secret.feature` — the closed `work.notify` schema (no `url`/`webhook`/`token`, `urlEnv` pattern and default, `events`, `link`); `resolveNotifyConfig`
- [x] `tasks/03_one-envelope-built-in-one-place.feature` — `buildNotifyEnvelope`: the eleven keys in order, `EVENTS`, what each event keeps, `answerPath`, `link`, `node`; `stop.ref` amended in
- [x] `tasks/04_the-discord-message-keeps-its-headline-command-and-link.feature` — `renderDiscord`: plain `content`, four lines by event, `parse: []`, the 2,000 cap with only the body yielding, the fence closed before the suffix
- [x] `tasks/05_delivery-is-bounded-and-never-throws.feature` — `notify` and `sendDiscord`: the no-op, the events filter, parallel sends bounded at 5 s, no retry, the three degrade codes, the URL never out of env
- [x] `tasks/06_an-accepted-milestone-is-announced.feature` — the `milestone-accepted` site in `item-status.mjs`: once, after the move, awaited, never failing the accept

## Notes

- Absent `work.notify` is an honest no-op with zero network calls (17/ADR-004).
- Writes `test/arch/testing/acd-source-directory-budget.test.mjs` BEFORE 06 does.
- Task 00's "live tree is green" steps need lane 137's uncommitted digest-template files to land with their budget rows raised first: `src/work` 45/44, `test/bundle` 33/32, `test/memory` 12/11, `test/work/gate` 11/10, measured 2026-09-23.

## Accept decision

**Accepted 2026-09-25 (`aof:verify 131`).**
- **Evidence.** The story lane is green: 78 cases, with FF-13106–FF-13108 green (VERIFICATION `### 131/01–06`).
- **Gates.** `aof work validate 131` returned PASS. `aof work doctor 131` reported no `control-unresolved` at either severity and no missing red probe.
- **Findings.** None. The build was clean, so there is no RETROSPECTIVE.md.
