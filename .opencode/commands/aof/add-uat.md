---
description: Capture a UAT session — a cross-milestone acceptance gate over the delivery so far. Scaffolds a self-contained uat_slug folder (SESSION + STATE) on the project's intake, depending on the milestones it accepts. Numbered by aof work promote, run/accepted later by aof:verify.
---

<objective>
Frame a **UAT session**: a self-contained `uat_<slug>/` folder with its SESSION + STATE, born
un-numbered on the project's intake and given its number by one verb, `aof work promote`. A uat
session is an acceptance **gate** — it delivers no new behaviour and groups no stories; it references
the existing scenarios of the milestones it accepts (`depends:`), re-runs what can be automated, and
brokers the human `@uat` lane. It **gates the stream**: downstream work that `depends:` on it waits
until it is `done`. Don't confuse it with the `@uat` *tag* (a per-scenario lane within one milestone).
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.intake`. An ABSENT `work.intake` reads
as `"stream"`; only the exact string `"backlog"` selects the backlog. Resolve refs with
`aof work find` / `aof work next --json` — never hand-glob `**/*.md`.
</config>

<process>
For: "$ARGUMENTS"
1. **The folder — the backlog, under either setting.** Slug = kebab (e.g. `alpha-acceptance`,
   `release-r1`). An optional group comes from the arguments (`in <group/path>`) and is a PATH and
   nothing more. The folder is `<work.dir>/backlog/[<group>/]uat_<slug>/`: that is where a new session
   is written whichever way `work.intake` is set. Do NOT work out a stream number — deciding one is
   `aof work promote`'s job (41/ADR-002).
2. **Scope (`depends:`).** Determine which milestones this session accepts:
   - **Given explicitly** (`accepting 01,02,03`) → use those.
   - **Otherwise** → the delivered span: the contiguous run of NUMBERED milestones up to here whose
     acceptance this session gates (default to every milestone in the stream that isn't itself a uat
     session), confirmed with the operator.
   Confirm the span with the user if it's ambiguous; the entries are written AS CONFIRMED and are
   VALIDATED at promotion (each must resolve to a real milestone — live or archived).
3. **Scaffold** (templates: `.aof/templates/work/uat/`):
   - `SESSION.md` — frontmatter (`type: uat`, a bare `number:` with NO value, `slug`, `title`,
     `status: not-started`, `owner: qa`, `depends: [<the accepted milestones>]`, `created`/`updated`:
     today); the heading is `# <Title>` with no number prefix; `## Scope`
     (the accepted milestones — referenced, never restated; entry/exit criteria); `## Plan` (the
     automated regression sweep + agent-runnable `@manual` vs the human `@uat` lane); `## Live /
     environmental checks`; `## Acceptance judgment`; `## Findings`; `## Sign-off / verdict`.
   - `STATE.md` — frontmatter `doc: state`; `## Progress`; `## Notes & decisions in flight`;
     `## Feedback (for retro)`.
4. **Then the intake decides whether it stays there.** Under `work.intake: "backlog"` it STAYS:
   `aof:promote <slug>` is what later schedules it, and the only way to name a position. Under
   `"stream"` (or an absent key) run `aof work promote <slug> --json` immediately and report the
   minted ref — appended at the tail, as `add-uat` has always landed it.
5. Ask only the framing questions you can't infer (the acceptance objective, the span boundary).
6. **Frame ONLY** — no checks executed, no findings, no sign-off (that's `aof:verify`). Absence is
   information.
</process>

<progress_tracking>
The session starts at `status: not-started` in `SESSION.md` frontmatter. Running it (re-run the
`@executable`/`@manual` lanes, broker `@uat`, log + triage findings, sign off) and flipping it to
`done` — which unblocks anything that `depends:` on it — is `aof:verify <NN>`.
</progress_tracking>

<output>
Report the path + the milestones it accepts, and that the span is validated at promotion. Under
`"backlog"`: next is `aof:promote <slug>`. Under `"stream"`: report the minted ref. Then
`aof:verify <NN>` to run the session and record acceptance.
</output>
