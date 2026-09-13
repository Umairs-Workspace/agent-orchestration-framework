---
name: aof-assimilate-code
description: Assimilate already-done work into a governed story — from your description + the real change set (pending or last commit), author a story with acceptance criteria, review the delivered code (architect standards + QA coverage), and capture the lessons to memory. No research, no build; the code is left exactly as-is. Resistance is futile.
---

<!-- aof-generated: true; aof-runtime: codex -->

Use this skill when the user asks for `$aof-assimilate-code <description> (--pending | --committed) [--under NN] [--skip-qa]`, or asks to run the AOF `aof:assimilate-code` procedure in Codex.

Where this procedure mentions `$ARGUMENTS`, use the text the user supplied after the skill name.
Where it mentions Claude slash command `/aof:assimilate-code`, treat that as this Codex skill invocation.

<objective>
Bring work that is ALREADY DONE (by you or a coding agent) under ACD governance — the fast, REVERSE
path. From your description + the real diff, author a story with acceptance criteria, review the
delivered code against standards, judge its test coverage, and capture the lessons — WITHOUT the
forward loop's research or build stages. The code stays exactly as it is; this command governs the
change, it never writes it.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.tags`. Parse "$ARGUMENTS" into: the
free-text **description** of the done work; the REQUIRED **source flag** — `--pending` (uncommitted
working-tree changes) XOR `--committed` (the last commit, `HEAD`); optional **`--under NN`** (nest the
story under milestone NN instead of standalone); optional **`--skip-qa`** (skip the coverage lane).
- **The source flag is mandatory and exclusive.** If neither — or both — is given, STOP and ask which:
  the command never guesses whether "done" means staged-but-uncommitted or already-committed.
- Resolve execution mode from `work.agents.mode`: `"solo"` (or `--solo` in `$ARGUMENTS`) → play every
  role inline in this session; any other value → orchestrated (spawn the role agents named below).
</config>

<process>
1. **Gather the change set (read-only, FIRST).** Before writing anything, capture the real diff — it
   is the evidence every later step reasons from:
   - `--pending` → `git status --porcelain` + `git diff HEAD` (staged + unstaged working tree).
   - `--committed` → `git show --stat HEAD` + `git diff HEAD~1 HEAD` (the last commit only; on a
     root commit with no parent, fall back to `git show HEAD`).
   An **empty change set ends the command** — there is nothing to assimilate: report and stop, writing
   nothing. The change set is READ-ONLY for the whole command: never edit, stage, or commit it.

2. **Author the story + acceptance criteria (PO).** Orchestrated → spawn `aof-product-owner`; solo →
   inline. Create the story folder — standalone `<work.dir>/<NN>_story_<slug>/` (next stream number),
   or under `--under NN`'s `stories/` as `<SS>_story_<slug>/` (next local index). Scaffold `STORY.md`
   from `.aof/templates/work/story/STORY.md` (`type: story`, `owner: product-owner`, `parent:` only
   when nested).
   - **Declare the context from the delivered change.** Set `files:` to every project-relative path
     written by the captured diff. Set `reads:` to those files plus only the project files or named
     ADR anchors needed to understand the change. These are inline frontmatter lists; never put the
     diff or a whole milestone document in either field.
   - **`## User story`** — the real "so that", grounded in your description.
   - **Acceptance criteria — REVERSE-derived from the diff.** Author the AC as task `.feature`
     scenario(s) under `tasks/` (ONE task feature is enough for simple work — split only if the diff
     spans clearly separate behaviours). Each scenario is a SINGLE black-box observable (apply the
     **litmus**) stating what the delivered change now makes true — read off the diff + your
     description, never re-imagined. Tag each scenario: `@executable` when a real test already
     exercises it, `@manual` otherwise; carry the layer/domain tags from `work.tags`. List the tasks in
     `STORY.md` `## Tasks`. These scenarios ARE the AC set QA maps coverage against.
   - **No research, no design docs.** Do NOT spawn `aof-researcher`; do NOT author
     RESEARCH / ARCHITECTURE / DESIGN — the work is done and frames its own intent.

3. **Architect review — standards alignment (structural).** Orchestrated → spawn `aof-architect`; solo
   → inline. Review the CHANGE SET against the codebase's coding standards, structural invariants, and
   existing ADRs / fitness functions — does the delivered code fit how this codebase is built? The
   architect authors NO new ADRs (nothing is being decided): it returns a verdict + any structural
   findings (each: what is off, where in the diff, what fixing entails). Record findings in `STORY.md`
   `## Findings`.

4. **QA — test coverage (skipped on `--skip-qa`).** Orchestrated → spawn `aof-qa`; solo → inline. QA
   applies its standard lens in reverse: map each acceptance criterion (task scenario) to a covering
   test in the change set / suite, RUN the relevant suite to confirm green, and return a coverage
   verdict — **SUFFICIENT** (every AC has a covering, green test) or **GAPS** (list each AC with no
   test). QA ASSESSES; it does not author tests here (that is the build loop this command exists to
   skip) — a gap is a flagged finding + a retro lesson, not a blocker to fix now.
   - **On `--skip-qa`:** run no coverage lane, and record explicitly — in the retrospective AND the
     output — that **test coverage was NOT assessed**. Never let a skip read as "coverage is sufficient".

5. **Findings → memory + retrospective.** **Author a `RETROSPECTIVE.md` for the story, in the
   story's own folder** — nested or standalone, the lessons are that story's and a reader of it
   looks there (story 85). Distil the architect + QA findings (standards gaps, coverage
   gaps, anything worth not repeating) into it (`doc:
   retrospective`; one `R<n>` per lesson — absence is information, write none if clean). Then run
   `aof work memory ingest` so the lessons become recallable in later work (a no-op when memory is off),
   and `aof work observe <ref> --write --if-enabled` so the opt-in observability snapshot captures this
   run too.

6. **Accept — mark done, and leave behind what acceptance leaves behind (govern only).**

   **A COMMAND THAT ACCEPTS MUST LEAVE BEHIND WHAT ACCEPTANCE LEAVES BEHIND (story 85).** This
   command reaches the terminal state without ever meeting `aof:verify`, so the records an accepted
   item carries are authored HERE or nowhere: story 84 was assimilated, accepted, and missing its
   outcome until it was authored by hand afterwards. So, at this same juncture, **instantiate
   `OUTCOME.md`** from `.aof/templates/work/shared/OUTCOME.md` (leading marker stripped, exactly
   like any scaffolded doc) into the item's OWN folder if it does not already carry one, and
   **author it yourself** — never hand it to a developer/evidence subagent (they have `Write` and
   have been observed to clobber records and fabricate decisions). A record doc is authored by the
   main-session govern command that accepts the item; a subagent may not, ever.

   Fill each section as **product state, never motive**: `## Delivered` — one `### <Capability
   name>` per capability this item now provides, each followed by ONE line stating what the system
   now IS, never why it was built (that reasoning belongs in `RETROSPECTIVE.md`); `## Assumptions` —
   a bullet per condition the nearest-preceding capability's delivery rests on; `## Gaps` — one
   `### <declared-but-unfilled surface>` carrying `**Status:**` and `**Discharge condition:**`.
   Leave NO residual `<…>` placeholder. `STORY.md` stays the identity record — `recordDoc` never
   resolves to `OUTCOME.md`, and validate still runs on the identity record.

   **THE EXCLUSIONS TRAVEL WITH THE PERMISSION — the same table `aof:verify` names, because two
   doors that disagree about a spike inside one milestone are worse than either answer.** Both
   halves are DECISIONS, not omissions: an omission reads as an oversight and gets "fixed" by the
   next person to notice it.
   - **`milestone`** — authored, when accepting a milestone whose stories are all done.
   - **`story`** — authored, whether it sits under a milestone or is parentless. This command's own
     output is always one of these.
   - **`chore`** — authored. A chore's tick is an ACT; its outcome is the STATE that ticking made
     true, and `## Delivered` alone is enough.
   - **`spike`** — **none.** Its whole deliverable is a recorded finding in `SPIKE.md` `## Finding`
     — knowledge, not system state.
   - **`uat`** — **none.** Its deliverable is a verdict in `SESSION.md` over items that already
     carry their own outcomes, so an outcome here would index the same capability twice.

   With no BLOCKING finding open, walk the lifecycle with the
   verb rather than editing frontmatter — `aof work status <ref> in-progress --if-applicable` then
   `aof work status <ref> done` (the code exists, then it is accepted). The flag rides the STARTING
   move only, because the phase door may have started this item already; the `done` move stays bare
   on purpose — `done` is unreachable from `not-started`, which is exactly the refusal that would
   catch a story nobody assimilated, and a flag in front of it would empty that guard —
   bump `updated:`, and (when nested) tick its box in the milestone `SPEC.md` `## Stories`. The change
   set is left EXACTLY as gathered — never committed, staged, or edited (shipping stays
   `aof:code-review`'s job). A blocking finding instead stops at `aof work status <ref> in-review` and is reported as
   the open item.

7. **Validate.** Run `aof work validate <ref>` — the captured story must pass folder / frontmatter /
   tag / depends structural checks; fix any structural regression within the story folder only.
</process>

<progress_tracking>
- The story is created and driven to `status: done` in a single pass when review is clean (the work is
  already delivered) — or left `in-review` with the blocking finding named. Bump `updated:` on every
  record touched; when nested, reflect the story in the milestone `SPEC.md` `## Stories`.
- **An accepted story carries an `OUTCOME.md` and a `RETROSPECTIVE.md` in its own folder**, whichever
  door accepted it — there is no case where it has one and not the other, and no case where another
  item carries them on its behalf. `aof work doctor` reports a `done` story missing either.
- Tasks authored under the story are its acceptance criteria — captured-complete (the code that
  satisfies them already exists), each tagged by whether a real test covers it.
</progress_tracking>

<output>
Report: the story path + user story; the acceptance criteria authored (with each AC's coverage tag);
the architect verdict + any standards findings; the QA coverage verdict (SUFFICIENT / GAPS + the
untested list) OR that coverage was skipped (`--skip-qa`); where the lessons landed (RETROSPECTIVE +
memory); the `OUTCOME.md` authored at accept; and the final `aof work validate` result. State plainly that the code was left unchanged.
Next: `aof:code-review` to ship the change, or `aof:continue <ref>` if QA surfaced gaps you want built.
</output>
