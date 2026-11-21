---
name: "aof-feedback"
description: "Capture feedback the instant it's noticed — a mistake, misunderstanding, blocker, or (on a UAT session) an acceptance observation — as a raw, attributed entry in the right log. Low-friction: it never classifies or asks how to file; triage does that later. Any actor can raise it."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: [ref] <feedback>   (ref optional - defaults to the active item)

Use the native skill $aof-feedback; $ARGUMENTS is the operator text after its name.

## Codex execution contract
Use only tools actually exposed by this session. File reading/editing, shell execution, search,
browser/image tools and native role tools are capability-dependent; Claude tool aliases are not
permissions. Instruction-level read-only boundaries do not claim enforced sandbox isolation.
In solo mode perform required roles inline and spawn nothing. Orchestrated independent work
requires a native launcher such as spawn_agent when exposed, independent context and support
for each selected model/effort; otherwise report native-role-capability-unavailable or
native-role-setting-unsupported before claiming independence. Stay within the resolved dispatch
bound and review/no-progress bounds. Read role settings from work.agents.runtimes.codex.
Never infer the primary assistant from the delegation toggle.
For questions, use an available native question tool, or ask explicitly in the conversation when
that tool is unavailable. Required answers remain pending until received. A driven business question
retains its map token and one-question-per-ask form. Permission approval uses the host approval flow,
not a question tool or elapsed time. AOF_NEEDS_INPUT is for an actually unanswered blocked turn,
never a fabricated native capability.

<objective>
Log feedback the instant it's noticed, with zero friction — **capture now, classify never**. Append a
raw, attributed entry to the right running log and confirm. This command does NOT judge severity,
finding-vs-lesson, or routing, and must **never stop to ask the user how or where to file it** — the
item's type decides the log, and triage (`$aof-verify` / `$aof-retrospective`) does the rest.
</objective>

<config>
Parse "$ARGUMENTS": an optional leading **ref** (milestone `NN`, story `NN/SS`, or uat session `NN`)
then the **feedback text** (free-form — what was noticed).

Resolve the ref with `aof work find "<ref>" --json` (no ref → the active item via `aof work next
--json`, else the most-recent `in-progress` milestone/uat). **Route by the target's type —
automatically, never by asking:**

- **uat session** → its `SESSION.md` **`## Findings`**. A note raised against a UAT acceptance gate
  *is* a finding — that's the session's capture surface, so it gets tracked, routed, and fixed (not
  merely distilled into a lesson). Do **not** ask whether it's "really" a finding; on a uat item it is.
- **milestone** (or a **story/task**, which bubbles up to its parent milestone) → its `STATE.md`
  **`## Feedback (for retro)`**.

Either way the entry is a raw **event**, not a triaged record. Severity, type, routing (`amend in`), or
"this was only a process lesson" are decided **later** — `$aof-verify` triages findings,
`$aof-retrospective` distils feedback. Capture is cheap; **never block on classification.**
</config>

<process>
1. **Locate + pick the log** by target type (above). Create the section if it doesn't exist.
2. **Append one raw, attributed entry** in that log's existing format — low-friction, not a distilled
   record:
   - **uat `## Findings`** → a new row/block matching the table already there: the next `F-NN` id, what
     was observed (the note, dated today), `status: open`. Leave severity / type / `amend in` blank for
     triage. Capture any concrete pointer the user gave (a screen, a design-bundle reference) verbatim.
   - **milestone/story `## Feedback (for retro)`** → one bullet: the note, **Raised by** <actor>
     (you / architect / developer / qa / po / security), optional `Refs` (ADR / scenario / commit —
     reference, never restate). Use `aof work feedback <ref> --note "<verbatim text>" --actor
     <actor> [--refs <refs>]`; do not edit `STATE.md` directly. That capture seam appends the
     immutable raw record first and only then its human-readable log projection.
3. **Confirm** what was recorded and where. Do **not** classify, prioritise, route, dedup, or prompt —
   the type already chose the log; triage happens later.
</process>

<output>
Report the item + the entry appended and which log it went to. Findings are triaged at `$aof-verify`;
feedback is distilled at `$aof-retrospective`.
</output>
