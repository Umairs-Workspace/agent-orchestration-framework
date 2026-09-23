# 133/05 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

A prose change to two bundle sources, then a re-render.

**Where the step goes.** In `aof-architect.md`, extend the "what you write" bullets beside the ADR
bullet. In `refine.md`, extend the milestone Decide step beside "`aof-architect` → ADRs in
`ARCHITECTURE.md`". Do not add a new top-level section in either file. The contract measures that
the passage sits inside the ADR authoring it extends.

**What the step says** (ADR-008 §1): draw only when the design has moving parts, which most ADRs do
not. Write the `### Diagram` brief first. Ask `aof diagram plan <ref> <ADR-NNN> --slug <slug> --json`.
Then branch: `enabled: false` → drop the brief and record nothing. `available: false` → keep the
brief, note `diagram not drawn: <code>` in `STATE.md`, and continue, never stop. Otherwise the
drawing agent follows `instructions`, then `aof diagram export … --json`, then paste `block` under
the brief. In refine, add that a solo refine's main session runs the same step. Name the verbs.
Never name the generator, not even in an example.

Keep it short. Both documents are long already, and their doc budgets apply.

**Render.** Regenerate the bundle manifest, then `aof work update` to refresh the six rendered
copies and `.aof/aof.lock.json`. Never hand-edit a rendered copy. The lock file sits under `.aof/`,
which a lane reconcile drops, so commit it by hand on the branch.

## The verification step

After the render, `git diff --stat` should show exactly the two sources, the manifest, the six
copies and the lock. Then run the new bundle suite and the existing bundle suites
(`bundle.test.mjs`, the runnable-path and EOL controls) plus FF-13301 through
`node scripts/test.mjs --only` under a fresh `AOF_GLOBAL_HOME`. Finally, read one rendered copy
(`.claude/agents/aof-architect.md`) and confirm the passage reads as one step a cold agent could
follow.

## Out of scope

- Adding `Skill` to the architect's tools, or any frozen-set edit.
- Teaching the designer or researcher to draw. ADRs only.
- Drawing anything. Story 06 is the first real draw.
