---
description: Promote a backlog item into the stream — one verb mints its number, at the tail or at a named position, moves the folder and stamps the record doc. The way an idea becomes scheduled work.
---

<objective>
Give a backlog item its number and move it into the stream. An item captured by `aof:add-*` is born
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
1. **Resolve the slug + the optional position.** Slug = the backlog item's slug, verbatim (the ref
   `aof work find` answered with). `at <P>` — optional — is the position the operator named. With no
   position the item is APPENDED at the tail, which shifts nothing.
2. **The mint is MECHANICAL — the CLI, never hand-edited.** Run
   `aof work promote "<slug>" [--at <P>] --json`. The verb resolves the one backlog row, takes the
   next number (an append) or opens the slot at `P` through the same re-index engine `aof:insert-*`
   uses, renames the backlog folder into the stream and stamps `number:` into the record doc's
   frontmatter. **Never** move the folder, renumber anything or write a `number:` line by hand, and
   never work the number out yourself — deciding it is the verb's job and nothing else's (ADR-003 §1,
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
   identity — `created.ref` is the number the item now answers to, and `created.dir` its new folder. A **milestone** or a **story** goes to `aof:refine <NN>` — the
   number is now the ref every later command uses. A **chore**, a **spike** or a **uat** session is
   worked directly in its own record doc (`CHORE.md` / `SPIKE.md` / `SESSION.md`) and closed by
   `aof:verify <NN>`, never refined.
</process>

<progress_tracking>
Promotion is PLACEMENT, not authorship: the item keeps the `status:` it had, its `updated:` is not
bumped, and nothing in the folder changes but the `number:` line and the `# NN · ` heading prefix.
What tracks the item afterwards is what tracked it before — its own record doc.
</progress_tracking>

<output>
Report the minted ref and the path it now lives at, and confirm `aof work validate` is green after
the move. Next: `aof:refine <NN>` for a milestone or a story; for a chore, spike or uat session, do
the work in its record doc and then `aof:verify <NN>`.
</output>
