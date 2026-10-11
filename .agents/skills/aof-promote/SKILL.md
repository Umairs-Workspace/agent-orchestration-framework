---
name: "aof-promote"
description: "Promote a backlog item into the stream — one verb mints its number, at the tail or at a named position, moves the folder and stamps the record doc. The way an idea becomes scheduled work."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <backlog slug> [at <position P>] | --next-item [at <position P>] | --show-candidates

Use the native skill $aof-promote; $ARGUMENTS is the operator text after its name.

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
Give a backlog item its number and move it into the stream. An item captured by `$aof-add-*` is born
un-numbered under `<work.dir>/backlog/[<group>/]<type>_<slug>/`; this is the moment it becomes
`NN_<type>_<slug>` at the root of the stream and enters the order of work. ONE verb mints —
`aof work promote` — so the stream's order is the order of work rather than the order of ideas, and
every re-order that happens is the one the operator asked for by naming a position (ADR-003 §1).
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`. Resolve the slug with `aof work find "<slug>" --json` —
never hand-glob `**/*.md`. A row answering `number: null` is a backlog row, and its `backlog` field
is the group path it currently sits in; a row that already carries a number is in the stream and
needs no promotion.
</config>

<process>
For: "$ARGUMENTS"
0. **Two modes name no slug — the verb chooses, never you.**
   - `--show-candidates` → run `aof work promote --show-candidates --json`. It reports `candidates`
     in order, then `waiting` with what each waits on, and writes nothing. Report both lists as the
     verb answered them — `candidates` in their order with each one's `unblocks`, and each `waiting`
     item with its `waitsOn` entries — then stop.
   - `--next-item [at <P>]` → run `aof work promote --next-item [--at <P>] --json`. It promotes the
     first candidate and reports the minted ref, exactly as a named promote does: the same
     envelope, the same refusals, the same edge rewiring. Carry on from step 3 with that envelope.

   **Never choose a candidate by reading the backlog or its `depends:` lines.** Which items are
   ready, and in what order (the one that unblocks the most first, then the oldest), is the verb's
   answer and nothing else's. `promote-no-candidates` is a stop to report — the backlog is empty, or
   nothing in it can go yet — never a reason to search the backlog for something to promote.
   `promote-flag-conflict` means a slug, `--next-item` and `--show-candidates` were mixed, or
   `--show-candidates` was given a position: pass exactly one mode.
1. **Resolve the slug + the optional position.** Slug = the backlog item's slug, verbatim (the ref
   `aof work find` answered with). `at <P>` — optional — is the position the operator named. With no
   position the item is APPENDED at the tail, which shifts nothing.
2. **The mint is MECHANICAL — the CLI, never hand-edited.** Run
   `aof work promote "<slug>" [--at <P>] --json`. The verb resolves the one backlog row, takes the
   next number (an append) or opens the slot at `P` through the same re-index engine `$aof-insert-*`
   uses, renames the backlog folder into the stream and stamps `number:` into the record doc's
   frontmatter. It then **rewrites the slug edges other backlog items hold on the promoted item**:
   every `depends:` entry in another backlog item that names this item's slug becomes its minted
   number, so a dependent that was refused while this one waited is promotable next. The envelope's
   `rewired` lists each item it rewrote (absent when there were none). **Never** move the folder,
   renumber anything, write a `number:` line or re-type a `depends:` edge by hand, and never work
   the number out yourself — deciding it is the verb's job and nothing else's (ADR-003 §1,
   41/ADR-002).
3. **Count-gated confirmation (ADR-004).** `--at <P>` re-indexes every item from `P` onward up by
   one. If the CLI reports the shift needs confirmation (many items must move — a costly re-order),
   surface the count to the user and re-run with `--yes` once they confirm. When only a handful shift
   it proceeds automatically. `--yes` carries autonomous intent. An append is never gated.
4. **A refusal is a stop, never a workaround.** `promote-not-found` / `promote-ambiguous` name what
   the text matched — ask which item was meant. `promote-depends-backlog` means this item `depends:`
   on something still in the backlog: promote that one first, or drop the entry. `promote-numeric-ref`
   means the folder's slug is all digits — rename the folder. Reaching around a refusal by editing
   the tree is the one thing this verb exists to prevent.
5. **Report the minted ref, and hand off by type.** The `--json` envelope carries the created
   identity — `created.ref` is the number the item now answers to, and `created.dir` its new folder. A **milestone** or a **story** goes to `$aof-refine <NN>` — the
   number is now the ref every later command uses. A **chore**, a **spike** or a **uat** session is
   worked directly in its own record doc (`CHORE.md` / `SPIKE.md` / `SESSION.md`) and closed by
   `$aof-verify <NN>`, never refined.
</process>

<progress_tracking>
Promotion is PLACEMENT, not authorship: the item keeps the `status:` it had, its `updated:` is not
bumped, and nothing in the folder changes but the `number:` line and the `# NN · ` heading prefix.
The one write outside the promoted folder is the `depends:` lines of the other backlog items that
named its slug — each entry rewritten to the minted number, nothing else in those docs touched.
What tracks the item afterwards is what tracked it before — its own record doc.
</progress_tracking>

<output>
Report the minted ref and the path it now lives at, and confirm `aof work validate` is green after
the move. Next: `$aof-refine <NN>` for a milestone or a story; for a chore, spike or uat session, do
the work in its record doc and then `$aof-verify <NN>`.
</output>
