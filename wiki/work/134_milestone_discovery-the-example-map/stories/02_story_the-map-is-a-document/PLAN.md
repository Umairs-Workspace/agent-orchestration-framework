# 134/02 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

Three seams, one of them new.

**The grammar** is a new pure leaf, `map.mjs`, with no imports at all. It normalises CRLF, then
walks the text one line at a time with a small state machine (preamble → body; inside a rule;
inside `## Questions`). Each line is matched against the admitted shapes in order. A line that
fails is recorded as `{ line, text, reason }` and the walk continues, so one bad line never hides
the lines after it. Duplicate ids and a `stated Q<n>` that names no question are checked in a
second pass over the collected value, because a question may be written after the example that
cites it. Freeze the result deeply before returning it.

The frozen vocabularies (`PROVENANCE`, `QUESTION_STATES`, `QUESTION_CLASSES`,
`MALFORMED_REASONS`) are the one spelling. The queries and the token pair (`mapToken`,
`readMapToken`) sit in the same module, and every `R<n>` / `E<n>` / `Q<n>` map pattern in the
source tree lives there and nowhere else (FF-13402). Read question fields by position, as the
rulings say: an unadmitted class is `business`, an unadmitted state is `open`, and the line is
still reported.

**The gate** is `examplesEnabledFromConfig` plus `validateWorkExamples`, copied in shape from the
`work.plan` pair in the config inspector and called from `validateWork` beside
`validateWorkPlan`. Unlike the plan gate, it will have code readers (story 04). The schema gains
`$defs.work.properties.examples`, closed, with one boolean.

**The family** is three new directories, each an EXEMPTION in the source-directory budget control,
on the diagram family's precedent (133/01). Each exemption's `why` names every member the
milestone plans for it, so 03, 04 and 05 add files without touching a budget line. The engine
directory holds this story's grammar and 03's answer reader. The suite directory holds seven by
the milestone's end: its index, this story's parse and config-gate suites, 03's answer suite, 04's
lane and door suites, and 05's discovery-beat suite. That is under the threshold of eight. The
control directory holds five: its index, FF-13402 here, FF-13401 and FF-13404 from 03, and
FF-13403 from 04. Take the members' names from the sibling stories' write sets.

Register both indexes in the test runner (one import and one spread each, in alphabetical order),
as the diagram family did. Another lane is editing the budget control concurrently: milestone
130's gate raised three rows. Check its mtime and re-read it before you edit, and touch only the
exemption list.

FF-13402's control scans the comment-stripped source tree for the map's id shapes and for a
written file named `EXAMPLES.md`. Scope the pattern tightly. Bare ids like `R1`, `E2` and `Q3`
occur in unrelated code, so match the map's own shapes (a rule heading, an example bullet, a
`stated Q<n>` bracket, a regex source that builds one), never a bare id. The retrospective
heading grammar in the declared-id module shares the `## R<n>` shape; admit that one module by
name rather than widen the pattern (measured at feasibility). Record its red probe in the
milestone's `VERIFICATION.md` fitness register: spell a provenance label in a second module and
note the failure message you see.

## The verification step

With `AOF_GLOBAL_HOME` set to a fresh temp directory, run the two new indexes, the budget control,
the plan-gate suite, the config-inspect suite and the schema suite together through
`scripts/test.mjs --only`. Then parse ADR-001 §2's sample through the real module in a one-line
`node -e` and read the value it returns. Last, run `aof project validate` in this repo. Its config
does not set `work.examples`, so the validate must raise nothing new.

## Out of scope

- The `EXAMPLES.md` template. It belongs to 05, because the manifest hashes it with `refine.md`.
- Any reader of the gate. The snapshot probe, the lane and the door belong to 04.
- The answer reader and the settle stamp, which belong to 03.
- Turning the gate on in this repo's config. That is the live run's decision.
