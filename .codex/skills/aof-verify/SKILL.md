---
name: aof-verify
description: Verify and accept a work item — run the automated + agent-run checks, bring a human in only for genuine @uat acceptance, log/triage findings, capture process lessons in RETROSPECTIVE, sign off, mark done. A milestone is accepted once its stories are.
---

<!-- aof-generated: true; aof-runtime: codex -->

Use this skill when the user asks for `$aof-verify <item ref> [--url <baseUrl>]`, or asks to run the AOF `aof:verify` procedure in Codex.

Where this procedure mentions `$ARGUMENTS`, use the text the user supplied after the skill name.
Where it mentions Claude slash command `/aof:verify`, treat that as this Codex skill invocation.

<objective>
Confirm a work item is truly done, then accept it. Run the automated suite and the agent-runnable
checks; pull the human in ONLY when a scenario genuinely needs one (`@uat`).
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.ui.baseUrl`. Parse `$ARGUMENTS` into the
**ref** and an optional **`--url <baseUrl>`**. Resolve the ref by running `aof work find "<ref>" --json`
(never glob `**/*.md`), then detect which verification lanes are in scope — `@executable`, `@manual`,
`@uat`. The **design-review base URL** = `--url` if given, else `work.ui.baseUrl` (may be absent — ACD
never boots the app; the project serves it).

The ref may be a **milestone**, a **story**, a **uat session**, a **spike**, or a **chore**. A uat
session (`type: uat`) is a cross-milestone acceptance gate: its record doc is its own `SESSION.md` (not
a milestone `VERIFICATION.md`), and the scenarios in scope are the `@manual`/`@uat` ones across the
milestones it accepts (its `depends:` list). Run those milestones' `@executable` suite + fitness
functions first as an integrated **regression sweep** (green) before the manual/human lanes. The same
steps below apply — just write to `SESSION.md` and read scenarios across the accepted span.

**Spike/chore dispatch (ADR-003) — skip straight to `<spike-chore>` below.** A `spike` or `chore` is
verified on its **own per-type criterion**, never through the `<process>` steps below (no
`@executable` suite, no `@manual` scenario run, no design conformance, no human `@uat` step — neither
type carries a behavioural contract, and a chore/spike folder legitimately has no `tasks/`/`.feature`
to run). Detect the type from `aof work find` and branch there first.
</config>

<spike-chore>
**Spike → finding-recorded (ADR-003).** Read the spike's `SPIKE.md`. The close criterion is the
`## Finding` section alone:
- **Accept** when `## Finding` is present and filled with a real, resolved finding (not empty, not
  absent, not a placeholder/template stub). Cite the recorded finding as the close
  criterion in the report — a spike carries no separate `VERIFICATION.md`; `SPIKE.md` is its whole
  record, so nothing else is written. Run **no scenario suite** and report **no "tests green" step** —
  the spike's code is a throwaway prototype, not shippable behaviour. **A spike carries NO
  `OUTCOME.md`** — a stated decision, not an omission (story 80): its whole deliverable is the recorded
  `## Finding` — knowledge, not system state — so there is nothing an outcome would say that
  `SPIKE.md` does not already say. Accept it with `aof work status <ref> done` (the verb stamps
  `updated:` itself).
- **Decline** when `## Finding` is empty, absent, or placeholder-only. **Placeholder = unfilled**: the
  section is placeholder-only if its body is (or still contains) the shipped template stub — the
  angle-bracket text `<the answer, and the evidence/reasoning behind it>` — or *any* residual `<…>`
  angle-bracket placeholder, or a bare stub like "TODO"; a finding still holding the template's own
  placeholder has not been filled. Report the finding as unresolved and leave `status` unchanged,
  stating plainly what is missing (heading absent / body empty / body still the `<…>` stub) so the
  owner knows what to fill in before re-running `aof:verify`.

**Chore → checklist + validate-green (ADR-003).** Read the chore's `CHORE.md`. The close criteria are
**both**, together:
1. Every box under `## Definition of Done` is ticked (`- [x]`), none left `- [ ]`.
2. `aof work validate` (scoped to the chore, or the whole stream if scope is ambiguous) reports
   **PASS** — no regression.
- **Accept** only when both hold: cite the ticked checklist and the green validate as the close
  criteria in the report. Run **no `.feature` and no behavioural-verify step** — a chore carries no
  acceptance scenarios by design. **Then author the chore's `OUTCOME.md`** (story 80) — a chore's tick
  is an ACT ("pinned the rendered tree `text eol=lf`"), its outcome is the STATE that ticking made true
  ("the rendered tree is byte-stable across platforms"), and it is the state a later reader needs.
  Instantiate it from `.aof/templates/work/shared/OUTCOME.md` into the chore's own folder (leading
  marker stripped) and fill **`## Delivered` alone** — one `### <Capability name>` plus one line of
  product state; Assumptions and Gaps stay optional and are normally empty. This does NOT turn the
  chore into a story: the deliverable is still the ticked checklist, plus one statement of what the
  ticking made true. `CHORE.md` stays the identity record — `recordDoc` never resolves to
  `OUTCOME.md`. Accept it with `aof work status <ref> done` (the verb stamps `updated:` itself).
- **Decline** when either fails: an unticked box, or a red/failing `validate` (or both) — report which
  gate(s) failed (name the unticked item(s); quote the validate finding) and leave `status` unchanged.

Neither path runs `aof:validate <ref>`'s milestone-acceptance/retrospective machinery (progress_tracking
below is for milestone/story/uat only) — a spike/chore closes standalone, on its own record doc.
</spike-chore>

<process>
Record results in the milestone `VERIFICATION.md` (or, for a uat session, in its `SESSION.md` — its
`## Live / environmental checks`, `## Findings`, `## Sign-off / verdict`). **Write only the sections
that have content** — no empty "None" placeholders (absence of a section is information).

1. **Automated + agent-run (always; no human).** Run the `@executable` suite + fitness functions and
   confirm green. For each `@manual` scenario (agent-runnable — run a command, hit an endpoint, inspect
   state), spawn `aof-developer` (or run inline) to execute it and record procedure + result + a
   `verifies →` pointer under **## Verification evidence**. Never restate the outcome.

   **Scope the suite to the item.** Verifying a **story** runs that story's own scenarios + the fitness
   functions — NOT the whole repo's suite. The full suite runs **once**, at the **milestone** gate,
   where the per-story commits make bisecting a cross-story poisoner mechanical. Re-running a long lane
   per story multiplies its cost by the story count to catch a class of defect that only has to be
   caught before the branch merges. If a story's own scenarios can't be selected from the suite, say so
   and run the narrowest lane that contains them — never silently widen to everything. The honest cost:
   a poisoning story is caught at the gate, not immediately, and may need rework after being marked
   done. That is the intended trade, not an oversight. **At the milestone gate that full run is
   `aof work regression-gate <NN>`, and its recorded row is what the accept door reads** — see the
   regression gate under `<progress_tracking>` below.

   **Design conformance (UI items) — render → hand to the designer → spawn QA (ADR-001/002/003).** When
   the item has UI (a `DESIGN.md` / frontend surface), run the design-conformance review and log every
   divergence as a **design-gap** finding (step 3). The orchestration is the only party that bridges
   "run the browser" to "judge the result" — it renders, then hands the screenshot to the read-only
   designer to JUDGE. A green `@executable` suite does **not** prove design fidelity (the litmus keeps
   visual fidelity out of the `.feature`), so catch the drift here. The step:
   - **Renderability precondition — evaluated BEFORE any render is attempted, and before anything is spawned.** Resolve both halves: **(a) a base URL** — `--url` when given, else `work.ui.baseUrl`; and **(b) a renderer** — `work.ui.renderer` when declared, else the highest-revision Chromium found by GLOBBING the platform's `ms-playwright` cache. Glob it, never template a path: the cache layout is not stable (`chromium-1187 → chrome-win`, `chromium-1234 → chrome-win64`, plus `chromium_headless_shell-<rev>`), so a templated path is a bug with a release-number fuse. **Resolvable means EXISTS AND IS EXECUTABLE**, not merely that the key is set — a declared path that is not there is this precondition's finding, named with the path that failed, rather than a render-time crash. If either half is unresolved, or the surface declares no `Route`: **attempt no render at any breakpoint** — record the reason naming the missing key, the missing binary or the missing `Route`, return `INCONCLUSIVE`, spawn no designer session and no QA session, and continue the gate. The precondition is per surface, so a surface that resolves is still rendered and judged when a sibling surface does not.
   - **Render** each DESIGN surface by driving the resolved renderer directly, one render per breakpoint — `<renderer> --headless=new --disable-gpu --hide-scrollbars --window-size=<W>,<H> --screenshot="<absolute forward-slash path>" "<baseUrl><Route>"`. The output path is made absolute and forward-slashed on every platform before it is passed. A render that exits non-zero, exits zero but writes no file at the named path, writes a zero-byte file, or does not return within the step's own wait is `INCONCLUSIVE` with that failure recorded as the reason.
   - **Breakpoints.** Take the render at the defined breakpoints — the `390` / `768` / `1280` default (mobile / tablet / desktop), DESIGN-overridable per milestone (a surface's `DESIGN.md` may state its own widths). The breakpoint's width is what `--window-size=` carries, so each breakpoint is one invocation at its own width and one screenshot at its own output path; a render that dropped the width would be rendering a different surface than the one being judged.
   - **Playwright stays off the dependency list.** It is NOT a `package.json` dependency and does not become one — the render above drives an already-cached browser binary (browser availability is a build-time `@manual` confirmation, never a refine blocker or a hard dep). QA's own lane is untouched: it still runs the Playwright harness and owns the `toHaveScreenshot` regression.
   - **Hand off to the designer.** Spawn `aof-designer` to JUDGE the rendered screenshot they pass it (the ADR-001 hand-off) — give it the screenshot path(s) + the conformance baseline (the committed mock under `mocks/` and/or the binding checklist) and have it return the region-by-region verdict. Do NOT instruct the designer to run the browser itself — it has no `Bash`; it only judges the screenshot it is handed.
   - **Spawn QA.** Spawn `aof-qa` for the browser harness / regression / a11y — QA runs the Playwright harness, owns the `toHaveScreenshot` visual-regression that locks the designer-approved baseline, and the optional axe-core-via-Playwright a11y lane.
   - **Verdict.** The verdict is `CONFORMS` / `GAPS` / `INCONCLUSIVE`. It is `INCONCLUSIVE` when no base URL / screenshot is available or no baseline exists (no committed mock AND no binding checklist). A DESIGN surface with no renderable `Route` collapses to `INCONCLUSIVE` naming the missing `Route`. Name the missing baseline as the gap rather than inferring from component code — never read the component code and call it a `CONFORMS`/`GAPS` verdict; the honest answer is `INCONCLUSIVE` + "produce the missing baseline / render".
2. **Human acceptance — only if `@uat` scenarios exist.** Spawn `aof-qa` to broker it: **stop and
   prompt the user** to perform each `@uat` procedure, then record their result + sign-off under
   **## User sign-off**. Skip this step entirely when there are no `@uat` scenarios (most
   technical/foundational milestones — so the user is not pestered for nothing).
3. **Findings.** Log each defect/gap found in either step under **## Findings** (id, observed, type,
   severity, triage, routed-to, status), with the **id ALONE in the first cell** — that is what makes
   the block a register a check can read. Triage (PO): **blocker** → new `@bug` (+ `@finding-<id>`)
   task scenario + fix (back to `aof:continue`); **non-blocker** → defer to backlog; **design-gap** →
   `aof-designer` sets the `DESIGN.md` rule first. Findings live in `VERIFICATION.md`, never in a task folder.

   **Who fills the `id` column, and when.** Reviewers report findings UNNUMBERED — an ordered list,
   one line each — and you number them here.

   **The single writer allocates ids at the moment of landing them in the register** — for a `VERIFICATION.md` that is the product owner running `aof:verify`, already the sole author of the record documents. Nobody is asked to check first, because a stale read is impossible when there is no second reader.

   That is the prevention, and it is not a restatement of "check the register first" — that
   countermeasure is not weak, it is **unsound**. An architect executed it exactly: read the
   register's last entry, saw `D-28`, allocated `D-29` — and collided anyway, because `D-29` had been
   allocated hours earlier in a concurrent lane. **A stale read looks exactly like a fresh one**, and
   concurrent story dispatch makes that the normal case rather than the unlucky one.
   `register-duplicate-id` (`aof work doctor`) is the **residue-catcher, not the prevention**: the
   rule prevents the collision and the check proves the rule held. The check alone is never
   sufficient — it reports a collision two lanes have already written.

   **Record the red probe per declared control.** Under **## Fitness functions** — a CITING register,
   one row per `FF-NN` declared in the sibling `ARCHITECTURE.md` — record `id | enforced by | result |
   red probe`. The `red probe` cell records what was changed to make the control fail, and the message observed.
   An untouched template placeholder is a MISSING probe, not a recorded one. This catches an assertion
   nobody has ever seen fail, and the boundary is the SAME paragraph the template ships, word for word:
   - This field does NOT catch a fabricated probe, which no declarative model catches.
   - This field does NOT reach any assertion that is not a declared control — the obligation reaches `FF-NN` ids alone, never every scenario in every `.feature`, and never an assertion inside a behavioural suite.
   - This field does NOT record whether the probe was performed on the bytes that actually shipped.
   - This field does NOT survive a reflow of its own placeholder: the check compares the probe cell against one frozen literal, so a placeholder that gains an extra internal space reads as a RECORDED probe rather than a missing one.

   **Cite another item's id as `m?<itemRef>/<ID>`** — the `m` prefix is optional, because both spellings are real — **and cite only ids that resolve**: a bare id is addressable only inside its own item's documents, so a cross-item citation carries the ref.
4. **Gate.** Run `aof:validate <ref>`; require **PASS**. Then apply the accept rule yourself, because
   no gate applies it for you:

   **Do not accept an item whose `ARCHITECTURE.md` register declares a control that does not resolve** — marker or no marker. Nothing refuses the transition for you: `aof work doctor <ref>` reports each one as `control-unresolved`, a standing `pending` marker downgrades it to `warn`, and a warn-only doctor result does not fail `aof:validate`. What clears it is landing the file or dropping the declaration, never re-marking it `pending`.

   So run `aof work doctor <ref>` and read the `control-unresolved` findings at BOTH severities before
   you set `status: done` — the marker changes what doctor prints, never whether the control exists.
5. **Retrospective (conditional).** Run `aof:retrospective <ref>` — the retrospective session: it
   triages the milestone's STATE `## Feedback (for retro)` notes + the VERIFICATION findings + any
   blocker stops, and distils the lessons into `RETROSPECTIVE.md` (no doc if the run was clean).

   **EVERY STORY GETS ITS OWN `RETROSPECTIVE.md`, IN ITS OWN FOLDER — nesting is not a reason to
   skip it (story 85).** Accepting a story runs the session on THAT story's ref, so the doc lands
   beside its `STORY.md`; accepting a milestone runs it on the milestone, whose retro carries the
   milestone-level lessons. They are different documents answering different questions, and a
   reader of one story finds nothing of that story in the milestone above it. Measured before story
   85: 57 `RETROSPECTIVE.md` at driver level and **zero** under `stories/`. The conditional is
   unchanged — a story that surfaced nothing worth a lesson writes no doc, and says so. Then
   **fold the just-written lessons into memory**: run `aof work memory ingest` so this milestone's
   `R<n>` entries + `ADR-NNN` blocks become recallable in the next milestone's `aof:refine`/`aof:continue`
   (a no-op when memory is off — safe to run always). Then **archive** the STATE `## Feedback (for retro)`
   section as part of the compaction — its lessons have graduated, exactly as durable decisions graduate
   into ADRs.
6. **Outcome (every DELIVERING item — 39/ADR-004/ADR-006, widened at story 80).** At the SAME juncture
   as step 5 (STATE compaction / RETROSPECTIVE / `memory ingest`), instantiate `OUTCOME.md` from
   `.aof/templates/work/shared/OUTCOME.md` (leading-marker stripped, exactly like any scaffolded doc)
   if the item's own folder does not already carry one, then **author it yourself** — never hand this
   to a developer/evidence subagent (they have `Write` and have been observed to clobber records and
   fabricate decisions — the exact failure mode this artifact exists to counter).

   **THE ONE-WRITER RULE, STATED AS WHAT IT PROTECTS (story 85).** 39/ADR-004's threat model names a
   SUBAGENT, and that is the whole of it: a record doc is authored by the **main-session govern
   command that ACCEPTS the item**, and by nothing else. `aof:verify` is one such command;
   `aof:assimilate-code` is the other, and it reaches `status: done` in its own step without ever
   meeting this prompt — so it authors the same two records, under the same type table below. A
   subagent still may not, ever. The rule was never "only `verify.md`"; that was its implementation,
   and an accepted story that structurally could not carry the record every other accepted item
   carries is what the distance cost.

   **Which types get one, and which do not — both halves are DECISIONS, not omissions.** An omission
   reads as an oversight and gets "fixed" by the next person to notice it, so each answer is written
   here:
   - **`milestone`** — authored, when accepting a milestone whose stories are all done.
   - **`story`** — authored, whether it sits under a milestone or is parentless. A parentless story
     delivers a capability with no milestone above it, so without one the delivered state is
     recoverable only by reading its accept block.
   - **`chore`** — authored. A chore's tick is an ACT ("pinned the rendered tree `text eol=lf`"); its
     outcome is a STATE ("the rendered tree is byte-stable across platforms"), which is what a later
     reader needs. This does NOT turn a chore into a story: the deliverable stays the ticked
     `## Definition of Done`, and the outcome adds `## Delivered` alone — Assumptions and Gaps stay
     optional and are normally empty.
   - **`spike`** — **none.** Its whole deliverable is a recorded finding in `SPIKE.md` `## Finding` —
     knowledge, not system state.
   - **`uat`** — **none.** Its deliverable is a verdict in `SESSION.md` over items that already carry
     their own outcomes, so an outcome here would index the same capability twice under two items.

   Fill each section as **product state, never motive**:
   - `## Delivered` — one `### <Capability name>` per capability this item now provides, each followed
     by ONE line stating what the system now IS ("`warnings_delivered` is written only by test
     fixtures; no production path populates it"), never why it was built ("for testing purposes" is
     reasoning, not an outcome — that belongs in `RETROSPECTIVE.md`).
   - `## Assumptions` — a `- **<assumption>** — <condition>` bullet under the nearest-preceding
     capability for each condition its delivery rests on.
   - `## Gaps` — one `### <declared-but-unfilled surface>` per gap this item declared but did not
     fill, each carrying `**Status:** open` (or `discharged`) and `**Discharge condition:**` — the
     condition that stops the gap being true. Leave NO residual `<…>` placeholder in any section.

   **A milestone's outcome is AUTHORED, never a concatenation of its stories'.** The aggregation
   happens in the INDEX — `aof work memory ingest` unions every item's records into one recall surface
   — so a milestone that restates its stories' capabilities writes one fact twice, and every recall
   then has to dedupe it. State what is true AT THE MILESTONE LEVEL that no single story's outcome
   states alone; where a story states a capability whole, CITE it as `m<NN/SS>/<id>` rather than
   repeating it.

   `OUTCOME.md` stays an ADDITIONAL artifact for every type, never the record doc — `SPEC.md` (or
   `AOF.md`) / `STORY.md` / `CHORE.md` stays the item's identity record, validate still runs on the
   identity record, and `recordDoc` never resolves to `OUTCOME.md`.
</process>

<progress_tracking>
Accept only when validate passes and **no blocker finding is open**. **`aof work status <ref> done` is
how an item is accepted** — never a hand-edited `status:` line: the verb checks the move against the
lifecycle, stamps `updated:`, and publishes the acceptance to the board and the fleet. `done` is
reachable from `in-progress` or `in-review` and from NEITHER `not-started` NOR `blocked` — so an item
nobody ever started cannot be accepted, and a blocked one must be unblocked first. If the verb refuses,
read it as evidence about the item (it never started; it is still blocked), never as a reason to edit
the file by hand. Whether a STORY has been through `aof:continue`'s Review gate stays YOUR gate here:
a story you are accepting should already read `in-review`.
- **Story** — `aof work status <ref> done`; tick its box in the milestone `SPEC.md` `## Stories`.
- **Milestone** — `aof work status <NN> done` **only when ALL its stories are done**; then **compact**
  `STATE.md` (graduate durable decisions into ADRs / the next SPEC; archive the blow-by-blow).

  **The regression gate is a REFUSAL at this door, and it is not something you report (96/ADR-008).**
  A milestone's `done` is refused — `regression-gate-missing` / `regression-gate-red` — unless the
  whole-tree suite has actually run and its row is recorded. Story-scoped lanes are what make it
  load-bearing: 63/R7 records a story lane green while the failure appeared only at the full-suite
  gate, so **never accept a milestone on story-scoped greens alone.**
  - **The ordinary path is `aof work regression-gate <NN>`.** It runs the whole tree on a CLEAN
    checkout (a dirty one is refused, naming what is dirty), and appends a row to the milestone's own
    `REGRESSION.md` carrying the commit, the instant, the scope and the result. Run it, then accept.
  - **The escape is `--gate-override "<reason>"`, for an ENVIRONMENT that cannot host the run** — the
    case m66 and 63/R12 both name (a node with no browser lane, a runner that cannot start here). It
    permits the move and writes the reason into `REGRESSION.md` as its own row. It is not the way
    past a slow gate: an override with no reason is refused, and a silent override is
    indistinguishable from no gate at all within two milestones.
  - **Reporting the gate as passed is not a form of evidence.** There is no flag, environment
    variable or sentence you can write that substitutes a claim for a run — the two admissible
    inputs are a recorded run and a recorded reason, and both are written by the command rather than
    by the party being checked. This is milestone 59's `@manual` thesis applied to the last thing
    that should carry it.
- **UAT session** — `aof work status <NN> done` once every check has a result and **no blocker
  finding is open**; record the verdict in `## Sign-off / verdict`. Accepting it **unblocks** anything
  that `depends:` on it (`aof work next` advances past the gate).
- Bump `updated:` on every record you touch by hand (the status verb stamps its own); record the
  **## Accept decision** (for a uat session, the **## Sign-off / verdict**) in the record doc.
</progress_tracking>

<output>
Report the verification evidence, any human sign-offs, findings (with triage + routing), the validate
result, and the accept decision. For a spike/chore, report the per-type close criterion checked (the
recorded finding, or the ticked checklist + validate result) and the accept/decline decision — no
scenario-run or human sign-off section applies.
Next, for a milestone just accepted: `aof work archive <NN>` moves its folder under `archive/` — the operator's act, never this ceremony's (127/ADR-004).
</output>
