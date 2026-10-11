---
name: "aof-archive"
description: "Archive an accepted driver — move its folder, name verbatim, under archive/ so the root of the work tree reads as what is live. One verb moves; nothing is renumbered and every reader that resolves by ref still answers."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <NN> | --done

Use the native skill $aof-archive; $ARGUMENTS is the operator text after its name.

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
Move an accepted driver out of the stream root. A `done` milestone, chore, spike, uat session or
standalone story keeps its number — its number is its identity, and 3,102 citations say so — but its
folder goes to `<work.dir>/archive/<NN_type_slug>/`, name verbatim, so the root of `wiki/work` reads as
"what is happening" rather than "what has ever happened". ONE verb moves — `aof work archive` — and it
moves nothing but the folder: no number changes, no citation by ref is rewritten, only the relative
prose links that cross the archive line are adjusted so each still resolves to what it did before
(127/ADR-004).
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`. Resolve the ref with `aof work find "<ref>" --json` — never
hand-glob `**/*.md`. A row answering `archived: true` is already under `archive/` and needs no move; a
row answering `number: null` is in the backlog — it has no number yet and is `aof work promote`'s,
not this verb's.
</config>

<process>
For: "$ARGUMENTS"
1. **Resolve the form.** `<NN>` names ONE top-level driver by number — a milestone, chore, spike, uat
   or standalone story at the stream root. `--done` names the SET: every top-level driver at the root
   whose status is `done`. The two are one verb and refuse each other's flags.
2. **The move is MECHANICAL — the CLI, never by hand.** Run `aof work archive <NN> --json` or
   `aof work archive --done --json`. The verb resolves the row, refuses anything that is not a done
   top-level driver, renames the folder under `archive/` and rewrites only the relative links that
   cross the line. **Never** move the folder yourself, edit a link, or decide which items are done —
   deciding and moving are the verb's job and nothing else's (127/ADR-004 §1).
3. **The confirm gate (`--done` only).** Without `--yes`, `--done` refuses with
   `archive-confirm-required` after listing what it would move: the envelope's `candidates` carry each
   `{ ref, name, type }` in number order. Surface that list to the operator, and re-run with `--yes`
   only on their confirmation — `--yes` carries autonomous intent, as it does for `promote`. There is
   no threshold: one done driver is gated exactly like fifty, because the operator asked for a set
   and the list is the point. `<NN>` is never gated — one named folder is already the confirmation.
4. **Every other refusal is a STOP that reports what the verb found.** `archive-not-done` names the
   status — the item is not accepted, and archiving is not the place to re-litigate that; send it to
   `$aof-verify <NN>`. `archive-not-a-driver` says the story moves with its milestone — archive the
   milestone. `archive-backlog-ref` means the row has no number: `aof work promote <slug>` is the
   door for a backlog row. `archive-already-archived` names where the folder already is.
   `archive-destination-exists` names a hand-made collision under `archive/`. A refusal is never
   reached around by editing the tree — that is the one thing this verb exists to prevent.
5. **Report from the envelope.** `archived` lists each moved driver as `{ ref, type, slug, name, from,
   to }`; `rewritten` lists each file whose crossing links changed, with the count. Read them rather
   than re-deriving them, then confirm `aof work validate` is green afterwards — `find <NN>`,
   `read <NN>`, `depends` and `validate` all still answer for an archived item, and `next`, `loop` and
   the default listings no longer offer it.
</process>

<progress_tracking>
Archiving is PLACEMENT, not authorship: the item keeps `status: done`, its `updated:` is not bumped,
its frontmatter is not reserialised and no `number:` line is written anywhere. The only bytes that
change are the relative links that cross the archive line, so every one still resolves to what it
resolved to before. What tracks the item afterwards is what tracked it before — its own record doc,
now under `archive/`.
</progress_tracking>

<output>
Report each archived ref with the folder it now lives at and the files whose links were rewritten,
and confirm `aof work validate` is green after the move. Next: nothing — an archived item has no next
step, which is the point.
</output>
