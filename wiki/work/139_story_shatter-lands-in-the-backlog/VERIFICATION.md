---
doc: verification
updated: 2026-09-27
---
<!--
  Story VERIFICATION.md — is story 139 truly done, and what is the evidence?
  Parentless story (parent: null) → this is the story's verification record; no milestone SPEC box.
  NO @uat scenarios → no ## User sign-off. NO UI surface → no design-conformance section.
  This record is OPENED at build time with the one lane the task contract assigns to the developer
  (task 04, `@manual`); the findings register and the accept decision are `aof:verify`'s to add.
-->
# 139 · Shatter lands its drivers in the backlog — Verification

## Method

Lanes in scope: **`@executable`** (tasks 00–03) and **one `@manual`** (task 04, a shattered PRD read
at the source). No `@uat`, no UI.

Task 04 was run at build time (2026-09-27, `aof:continue 139 --solo`), as its feature assigns it to
the developer. Three fresh scratch projects OUTSIDE this repository, each with its own `git init` and
`aof work init`, `.aof/aof.config.json` written by hand (`work.dir: ./wiki/work`, and `work.intake`
per scenario — init writes no config), a pre-existing `00_milestone_platform`, and the committed
`PRD-acme-notify.md` at the root. Every command is the CLI built from this tree,
`node <repo>/bin/aof.mjs …`, with `AOF_GLOBAL_HOME` set to a fresh scratch dir, so nothing reached
the real `~/.aof`. `aof:shatter` was played inline from the edited `src/bundle/commands/shatter.md`:
step 1's recall answered an empty block; steps 2–5 framed three milestones in PRD order (send core,
delivery tracking, rate limiting — no spike: the PRD's risks gate no milestone), each dependent
carrying the backward slug edge `depends: [channel-send-core]`; the same authored SPECs went into
each project.

**One substitution in the evidence below**: the absolute scratch prefix, which carries the machine's
user name, is written `<scratch>` (the repo scrub). Every other byte is the command's own output.

## Verification evidence — task 04 (`@manual`)

| scenario | result | verifies → |
|---|---|---|
| backlog intake | three backlog folders with a bare `number:`, `origin:` and unprefixed headings; the stream root holds only `00`; the dependents carry `[channel-send-core]`, the send core none; validate `[]`. Delivery tracking is refused `promote-depends-backlog` naming the send core; the send core mints `01` with `rewired` listing both dependents, whose lines then read `[01]`; the dependents mint `02` and `03` with `created.depends` `[1]`; validate `[]`, backlog empty | task 04 sc. 1 |
| stream intake | one `aof work promote <slug> --json` per driver in PRD order; `01`, `02`, `03` after `00`; the dependents carry `depends: [01]`; backlog empty; validate `[]` | task 04 sc. 2 |
| `in acme-notify` | all three under `backlog/acme-notify/`; promoting the send core rewires both dependents in place there | task 04 sc. 3 |

## Build-time review (`aof:continue 139 --solo`, 2026-09-27)

Every lens was played inline (solo), so none of them had a reviewer independent of the build. No UI,
so no design lane. The `@executable` lane ran focused through `node scripts/test.mjs --only` under an
isolated `AOF_GLOBAL_HOME`: the three `test/work/stream/` suites, `work-insert-top-level-places`,
`test/planning/planning-prd.test.mjs` and the controls FF-12405, FF-12702, FF-12703, FF-12704,
`acd-bundle-manifest-hashes`, `acd-declared-writes-include-generated-siblings` and
`acd-work-insert-command-bundle-parity`. Result: exit 0, **468 ok, 0 not ok**, 56 of them `139/*` cases.
The gate ladder, `aof work validate 139` then `aof work doctor 139`, was clean before the review and
again after the fix (doctor reported warns only).

| lens | verdict | notes |
|---|---|---|
| structural | one Blocker, fixed in round 1 | the predicate and the per-entry rewriter each have one home, in `src/work.mjs`, which gains no import; `promote.mjs` does not import `reindex.mjs`; the backlog graph is a separate map |
| behavioural | clean | each scenario and Examples row of tasks 00–03 has its own case; task 04 is measured above |
| craft | two Nits | recorded below |

**The round-1 Blocker, fixed.** `rewriteDependsEntry` kept the zero-pad width of any entry that
started with `0` and a digit. A slug can start that way too (`007-bond`), so promoting it rewrote
`[007-bond]` to `[00000012]`. Reproduced first, then fixed: only a NUMBER entry keeps its width.
Regression case: `139/00 a zero-led slug is rewired to the minted ref, never padded to the slug's
width`.

Findings routed at the close (the PO allocates ids at `aof:verify`):

| finding | severity | route |
|---|---|---|
| shatter's recall block still says a ref appears at "step 3", but after this story no ref exists until promotion (step 7). Task 03 pins the block byte-identical | Nit | recorded, not fixed: correcting it means a new contract clause for FF-12405's block |
| the per-entry rewriter is named `rewriteDependsEntry`, but it also serves the shift's `parent:` scalar | Nit | recorded; its comment says so |

### Scenario 1 — the backlog intake

Run from `<scratch>/t04/backlog`.

```text
$ (shatter steps 2-5) node write-drivers.mjs . 
wrote wiki/work/backlog/milestone_channel-send-core/SPEC.md
wrote wiki/work/backlog/milestone_delivery-tracking/SPEC.md
wrote wiki/work/backlog/milestone_tenant-rate-limiting/SPEC.md

$ aof work validate --json   # step 6
[]
exit=0

$ find wiki/work -name "*.md" | sort
wiki/work/00_milestone_platform/SPEC.md
wiki/work/00_milestone_platform/STATE.md
wiki/work/backlog/milestone_channel-send-core/SPEC.md
wiki/work/backlog/milestone_delivery-tracking/SPEC.md
wiki/work/backlog/milestone_tenant-rate-limiting/SPEC.md

$ sed -n '1,/^# /p' wiki/work/backlog/milestone_channel-send-core/SPEC.md
---
type: milestone
number:
slug: channel-send-core
title: "Channel send core"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
schema: 1
origin: PRD-acme-notify.md
---
# Channel send core

$ sed -n '1,/^# /p' wiki/work/backlog/milestone_delivery-tracking/SPEC.md
---
type: milestone
number:
slug: delivery-tracking
title: "Delivery tracking"
status: not-started
owner: product-owner
depends: [channel-send-core]
created: 2026-09-27
updated: 2026-09-27
schema: 1
origin: PRD-acme-notify.md
---
# Delivery tracking

$ sed -n '1,/^# /p' wiki/work/backlog/milestone_tenant-rate-limiting/SPEC.md
---
type: milestone
number:
slug: tenant-rate-limiting
title: "Tenant rate limiting"
status: not-started
owner: product-owner
depends: [channel-send-core]
created: 2026-09-27
updated: 2026-09-27
schema: 1
origin: PRD-acme-notify.md
---
# Tenant rate limiting

$ aof work promote delivery-tracking --json
{
  "ok": false,
  "error": "\"delivery-tracking\" cannot be promoted as its `depends:` is written:\n- `channel-send-core` is still in the backlog — this item waits on it. Promote `channel-send-core` first, or drop the entry.",
  "code": "promote-depends-backlog",
  "entries": [
    {
      "entry": "channel-send-core",
      "code": "promote-depends-backlog"
    }
  ]
}
exit=1

$ aof work promote channel-send-core --json
{
  "shifted": 0,
  "at": 1,
  "space": "top-level",
  "created": {
    "ref": "01",
    "type": "milestone",
    "slug": "channel-send-core",
    "parent": null,
    "dir": "<scratch>/t04/backlog/wiki/work/01_milestone_channel-send-core"
  },
  "from": {
    "ref": "channel-send-core",
    "backlog": "",
    "dir": "<scratch>/t04/backlog/wiki/work/backlog/milestone_channel-send-core"
  },
  "rewired": [
    {
      "ref": "delivery-tracking",
      "dir": "<scratch>/t04/backlog/wiki/work/backlog/milestone_delivery-tracking"
    },
    {
      "ref": "tenant-rate-limiting",
      "dir": "<scratch>/t04/backlog/wiki/work/backlog/milestone_tenant-rate-limiting"
    }
  ]
}
exit=0

$ grep -rn "^depends:" wiki/work
wiki/work/backlog/milestone_delivery-tracking/SPEC.md:8:depends: [01]
wiki/work/backlog/milestone_tenant-rate-limiting/SPEC.md:8:depends: [01]

$ aof work promote delivery-tracking --json
{
  "shifted": 0,
  "at": 2,
  "space": "top-level",
  "created": {
    "ref": "02",
    "type": "milestone",
    "slug": "delivery-tracking",
    "parent": null,
    "dir": "<scratch>/t04/backlog/wiki/work/02_milestone_delivery-tracking",
    "depends": [
      1
    ]
  },
  "from": {
    "ref": "delivery-tracking",
    "backlog": "",
    "dir": "<scratch>/t04/backlog/wiki/work/backlog/milestone_delivery-tracking"
  }
}
exit=0

$ aof work promote tenant-rate-limiting --json
{
  "shifted": 0,
  "at": 3,
  "space": "top-level",
  "created": {
    "ref": "03",
    "type": "milestone",
    "slug": "tenant-rate-limiting",
    "parent": null,
    "dir": "<scratch>/t04/backlog/wiki/work/03_milestone_tenant-rate-limiting",
    "depends": [
      1
    ]
  },
  "from": {
    "ref": "tenant-rate-limiting",
    "backlog": "",
    "dir": "<scratch>/t04/backlog/wiki/work/backlog/milestone_tenant-rate-limiting"
  }
}
exit=0

$ aof work validate --json
[]
exit=0

$ find wiki/work -maxdepth 2 -type d | sort
wiki/work
wiki/work/00_milestone_platform
wiki/work/01_milestone_channel-send-core
wiki/work/02_milestone_delivery-tracking
wiki/work/03_milestone_tenant-rate-limiting
wiki/work/backlog

$ grep -rn "^depends:\|^number:\|^# " wiki/work/0*/SPEC.md
wiki/work/00_milestone_platform/SPEC.md:3:number: 00
wiki/work/00_milestone_platform/SPEC.md:12:# 00 · Platform
wiki/work/01_milestone_channel-send-core/SPEC.md:3:number: 01
wiki/work/01_milestone_channel-send-core/SPEC.md:13:# 01 · Channel send core
wiki/work/02_milestone_delivery-tracking/SPEC.md:3:number: 02
wiki/work/02_milestone_delivery-tracking/SPEC.md:8:depends: [01]
wiki/work/02_milestone_delivery-tracking/SPEC.md:14:# 02 · Delivery tracking
wiki/work/03_milestone_tenant-rate-limiting/SPEC.md:3:number: 03
wiki/work/03_milestone_tenant-rate-limiting/SPEC.md:8:depends: [01]
wiki/work/03_milestone_tenant-rate-limiting/SPEC.md:14:# 03 · Tenant rate limiting
```

### Scenario 2 — the stream intake

Run from `<scratch>/t04/stream`.

```text
$ aof work memory recall "transactional notifications send API delivery tracking tenant rate limiting objective scope" --block   # step 1
exit=0

$ (shatter steps 2-5) node write-drivers.mjs .
wrote wiki/work/backlog/milestone_channel-send-core/SPEC.md
wrote wiki/work/backlog/milestone_delivery-tracking/SPEC.md
wrote wiki/work/backlog/milestone_tenant-rate-limiting/SPEC.md

$ aof work validate --json   # step 6
[]
exit=0

# step 7 — work.intake is "stream": promote every driver, in PRD order

$ aof work promote channel-send-core --json
{
  "shifted": 0,
  "at": 1,
  "space": "top-level",
  "created": {
    "ref": "01",
    "type": "milestone",
    "slug": "channel-send-core",
    "parent": null,
    "dir": "<scratch>/t04/stream/wiki/work/01_milestone_channel-send-core"
  },
  "from": {
    "ref": "channel-send-core",
    "backlog": "",
    "dir": "<scratch>/t04/stream/wiki/work/backlog/milestone_channel-send-core"
  },
  "rewired": [
    {
      "ref": "delivery-tracking",
      "dir": "<scratch>/t04/stream/wiki/work/backlog/milestone_delivery-tracking"
    },
    {
      "ref": "tenant-rate-limiting",
      "dir": "<scratch>/t04/stream/wiki/work/backlog/milestone_tenant-rate-limiting"
    }
  ]
}
exit=0

$ aof work promote delivery-tracking --json
{
  "shifted": 0,
  "at": 2,
  "space": "top-level",
  "created": {
    "ref": "02",
    "type": "milestone",
    "slug": "delivery-tracking",
    "parent": null,
    "dir": "<scratch>/t04/stream/wiki/work/02_milestone_delivery-tracking",
    "depends": [
      1
    ]
  },
  "from": {
    "ref": "delivery-tracking",
    "backlog": "",
    "dir": "<scratch>/t04/stream/wiki/work/backlog/milestone_delivery-tracking"
  }
}
exit=0

$ aof work promote tenant-rate-limiting --json
{
  "shifted": 0,
  "at": 3,
  "space": "top-level",
  "created": {
    "ref": "03",
    "type": "milestone",
    "slug": "tenant-rate-limiting",
    "parent": null,
    "dir": "<scratch>/t04/stream/wiki/work/03_milestone_tenant-rate-limiting",
    "depends": [
      1
    ]
  },
  "from": {
    "ref": "tenant-rate-limiting",
    "backlog": "",
    "dir": "<scratch>/t04/stream/wiki/work/backlog/milestone_tenant-rate-limiting"
  }
}
exit=0

$ find wiki/work -maxdepth 2 -type d | sort
wiki/work
wiki/work/00_milestone_platform
wiki/work/01_milestone_channel-send-core
wiki/work/02_milestone_delivery-tracking
wiki/work/03_milestone_tenant-rate-limiting
wiki/work/backlog

$ grep -rn "^depends:\|^number:\|^# " wiki/work/0*/SPEC.md
wiki/work/00_milestone_platform/SPEC.md:3:number: 00
wiki/work/00_milestone_platform/SPEC.md:12:# 00 · Platform
wiki/work/01_milestone_channel-send-core/SPEC.md:3:number: 01
wiki/work/01_milestone_channel-send-core/SPEC.md:13:# 01 · Channel send core
wiki/work/02_milestone_delivery-tracking/SPEC.md:3:number: 02
wiki/work/02_milestone_delivery-tracking/SPEC.md:8:depends: [01]
wiki/work/02_milestone_delivery-tracking/SPEC.md:14:# 02 · Delivery tracking
wiki/work/03_milestone_tenant-rate-limiting/SPEC.md:3:number: 03
wiki/work/03_milestone_tenant-rate-limiting/SPEC.md:8:depends: [01]
wiki/work/03_milestone_tenant-rate-limiting/SPEC.md:14:# 03 · Tenant rate limiting

$ aof work validate --json
[]
exit=0
```

### Scenario 3 — `in acme-notify`

Run from `<scratch>/t04/group`.

```text
$ (shatter steps 2-5, "in acme-notify") node write-drivers.mjs . acme-notify
wrote wiki/work/backlog/acme-notify/milestone_channel-send-core/SPEC.md
wrote wiki/work/backlog/acme-notify/milestone_delivery-tracking/SPEC.md
wrote wiki/work/backlog/acme-notify/milestone_tenant-rate-limiting/SPEC.md

$ aof work validate --json   # step 6
[]
exit=0

$ find wiki/work -name SPEC.md | sort
wiki/work/00_milestone_platform/SPEC.md
wiki/work/backlog/acme-notify/milestone_channel-send-core/SPEC.md
wiki/work/backlog/acme-notify/milestone_delivery-tracking/SPEC.md
wiki/work/backlog/acme-notify/milestone_tenant-rate-limiting/SPEC.md

$ aof work promote channel-send-core --json
{
  "shifted": 0,
  "at": 1,
  "space": "top-level",
  "created": {
    "ref": "01",
    "type": "milestone",
    "slug": "channel-send-core",
    "parent": null,
    "dir": "<scratch>/t04/group/wiki/work/01_milestone_channel-send-core"
  },
  "from": {
    "ref": "channel-send-core",
    "backlog": "acme-notify",
    "dir": "<scratch>/t04/group/wiki/work/backlog/acme-notify/milestone_channel-send-core"
  },
  "rewired": [
    {
      "ref": "delivery-tracking",
      "dir": "<scratch>/t04/group/wiki/work/backlog/acme-notify/milestone_delivery-tracking"
    },
    {
      "ref": "tenant-rate-limiting",
      "dir": "<scratch>/t04/group/wiki/work/backlog/acme-notify/milestone_tenant-rate-limiting"
    }
  ]
}
exit=0

$ find wiki/work -name SPEC.md | sort
wiki/work/00_milestone_platform/SPEC.md
wiki/work/01_milestone_channel-send-core/SPEC.md
wiki/work/backlog/acme-notify/milestone_delivery-tracking/SPEC.md
wiki/work/backlog/acme-notify/milestone_tenant-rate-limiting/SPEC.md

$ grep -rn "^depends:" wiki/work/backlog
wiki/work/backlog/acme-notify/milestone_delivery-tracking/SPEC.md:8:depends: [01]
wiki/work/backlog/acme-notify/milestone_tenant-rate-limiting/SPEC.md:8:depends: [01]

$ aof work validate --json
[]
exit=0
```
