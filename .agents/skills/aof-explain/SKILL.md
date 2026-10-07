---
name: "aof-explain"
description: "Say what one or more work items are for — by stream number or backlog folder path, briefly or in depth with --verbose. Read-only; the answer is printed, never stored."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: <ref…> [--verbose]

Use the native skill $aof-explain; $ARGUMENTS is the operator text after its name.

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
For each ref the operator names, say what that work item is for: what it delivers, who it is for
and why it exists. The answer is printed in the terminal, and only there. It helps the operator
decide what to schedule, refine or drop without opening every record doc.
</objective>

<read_only>
**This command writes nothing.** It mints no run, moves no status, stamps no `updated:`, captures
no feedback and writes no file, so asking leaves the work tree exactly as it was. It runs only the
read verbs `aof work find`, `aof work doc`, `aof work list` and `aof work tasks`, and no other
`aof work` verb, plus an available file/image reader on the resolved record doc. (`aof work find` may refresh the
machine-wide work cache; that cache lives outside the work tree and holds no answer, so it does
not break this promise.)
</read_only>

<config>
Parse the arguments into the refs, **in the order given**, and an optional `--verbose`. A ref is a
stream number (`147`, nested `147/01`), a backlog folder path (`wiki/work/backlog/story_…`), or a
slug fragment. Pass a folder path to `aof work find` **as typed**: the resolver resolves the path
itself, so do not strip it to a slug.
</config>

<process>
Answer every ref, one at a time, in the order given. One ref that does not resolve never stops
the others.

1. **Resolve.** Run `aof work find "<ref>" --json`. That is the only way a ref becomes an item.
   Never glob the work tree for a record doc and never guess a folder.
   - **No row:** report that `<ref>` matches no work item, then go on to the next ref.
   - **More than one row:** list each row's `ref` and `title`, explain none of them, and say to
     ask again with one ref. Then go on to the next ref.
   - **One row:** explain it (steps 2–4).
2. **Mark where it lives.** A row with `number: null` is in the backlog: explain it, and mark it
   as in the backlog and not yet scheduled. A row with `archived: true` is archived and done:
   explain it like any other item, and mark it as archived and done.
3. **Read its record doc.** For a story run `aof work doc <ref> STORY`; for a milestone,
   `aof work doc <ref> SPEC`. For a spike, chore or uat session, an available file/image reader `SPIKE.md`, `CHORE.md` or
   `SESSION.md` in the row's own `dir`. The purpose is read from a section that depends on the type:

   | type      | the purpose is read from |
   |-----------|--------------------------|
   | story     | its `## User story` (as a … I want … so that …) |
   | milestone | its `## Objective` |
   | spike     | its `## Question` |
   | chore     | its `## Intent` |
   | uat       | its `## Scope` |

4. **Write the answer.**
   - **Default (no `--verbose`): three to five sentences per item** saying what it delivers, who it
     is for and why it exists, in plain words. Head it with the ref, the title, the status and any
     backlog or archived mark. A milestone's default answer also says how many stories it groups
     and how many of those are done. Count them from `aof work list <ref>` (adding `--all` for an
     archived milestone), which prints each story indented under the milestone with its status.
     It names none of them.
   - **`--verbose`: the in-depth answer.** Give the default answer, then add:
     - its **scope**, from the record's scope or non-goals where it states them;
     - for a milestone, **the stories it groups**, read through `aof work list <ref>` (adding
       `--all` when it is archived), each with its status and a one-line purpose from its own
       `## User story` (read through `aof work doc <story-ref> STORY`);
     - for a story, **its tasks**, read through `aof work tasks <ref>`, each feature named with its
       task file;
     - its **`depends:` edges**, from the record's frontmatter;
     - **what is still open**: unticked tasks or Definition of Done items, stories not yet done,
       and open questions the record names.
</process>

<grounding>
**Say only what the record says.** Every sentence comes from the item's own record and the read
verbs above. If the purpose section is empty, or still holds the template's placeholder (`As a
<role / beneficiary>`, or nothing but an HTML comment), report that the item has **no purpose
written down yet**. Never invent one from the title, the slug or the code. If the record does not
say who an item is for or why it exists, say that it does not say.
</grounding>

<output>
One answer per ref, in the order given, separated by a blank line. Plain text in the terminal.
Nothing is saved, and nothing in the work tree changes.
</output>
