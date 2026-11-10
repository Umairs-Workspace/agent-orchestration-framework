# 134/05 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## Mechanism

This story is prose, a template and one suite. It has no code seam. The bundle is the seam: edit
the four bundle sources, re-render with `aof work update`, regenerate the manifest, and hand-edit
no rendered copy.

**Refine.** The discovery passage becomes the story Contract's first paragraph. It is conditional
prose in the same shape as the build-brief block below it: "only when `work.examples.enabled` is
on". The sentence that says the PO writes the headline Scenarios moves BELOW the passage, because
the contract measures the order. The passage covers five steps. The PO drafts the map, and the
template is its form. The architect reviews the technical labels. The main session asks. Doctor
runs, and an error stops the stage while a warn does not. The passage shows the token once as a
shape and once as a worked question with a numeric story ref. The `--autonomous` rule is one
added sentence in the milestone cascade bullet, beside the documented-default sentence, and
names the gate. The one-stop asking goes in the same block. The output section gains its
questions-apart-from-defaults clause.

**The briefs.** The PO brief's `<ownership>` gains the map, the three label-to-token pairings, a
worked question per form, and "you do not ask; return the questions". The architect brief's
`<ownership>` gains the classification review and "an ADR never settles a business question".

**The template** has no frontmatter, because the render puts its marker at byte zero. Its
guidance and the `Not applicable:` line go in one multi-line comment, and its live lines are a
full legal map. Feasibility sketched one at 35 installed lines. **The guide** gains one heading
of its own above the three zoom levels, and names the template's bundle source path.

**The suite** joins story 02's examples index. It reads the sources and uses the dry-run of
`aof work update` for byte-identity (133/05's idiom), the command registry for `work:doctor`, and
02's `parseExampleMap` / `readMapToken`. It imports nothing from 04: the doctor codes are row
data.

## Verification step

Run `aof work update`, then the manifest generator. Then run
`aof work update --dry-run --json` and read every copy this story declares as `skip`. A `create`
on the installed template means the `.aof/` copy was dropped, and an `update` means the copy
drifted. Then, with `AOF_GLOBAL_HOME` set to a fresh temp directory, run through
`scripts/test.mjs --only`:

- the new suite
- the manifest-hash control
- the declared-writes-include-generated-siblings control (FF-7106)
- the architect-draws suite and the plan-document suite
- the learning-edge control, the intake write-side control and the graph controls

Last, parse the installed template through 02's module in a one-line `node -e` and read back zero
malformed lines.

## Out of scope

- Any doctor lane, door or budget row. Those belong to 04. This story's prose names the stop, and
  04 makes it real.
- Loop-driven asking, which belongs to 136, and formulation from the map, which belongs to 135.
- QA's Examples tables and the aof-qa brief, which are unchanged.
- Turning the gate on in this repo. That is the milestone's live run.

## Known traps

- A lane's reconcile commit drops `.aof/`. Commit the installed template, the other rendered
  `.aof/` files and the lock file by hand, or task 03 goes red after the merge.
- `aof work update` also rewrites two `.aof/loops` copies that have been stale since 130. They
  are declared, so commit them.
- Refine must keep exactly two `aof work memory` invocations and one `aof diagram plan` passage,
  and must keep `aof graph build` before `aof graph impact`. Add no such mention.
- No bundle agent brief or template may contain the word "intake" (FF-12704). Don't put a bolded
  role word in a clause that holds an `aof …` code span. Don't copy a sentence of 120 or more
  characters between refine and the PO brief (the prompt-layer audit).
- In the template, close every comment on its own line. Put no trailing comment on a live line.
  A `defaulted` pointer is one token (`ADR-004`, not `ADR-004 §2`), and ids are unique across the
  whole map.
- The token goes at the head of the AskUserQuestion `question` field, not the `header`. One call
  carries at most four questions, so the autonomous stop asks in batches.
