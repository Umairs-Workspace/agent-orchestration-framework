# 136/02 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**One paragraph in the story Contract's discovery bullets.** In `refine.md`, after the bullet that
says the main session asks each business question through `AskUserQuestion`, add a bullet for a
driven session: one whose environment carries `AOF_RUN_ID`. It says, in order:

- One question per call. The call becomes the loop's ask, and one ask carries one answer.
- The question's first line: its token, then "Discovery question", the rule as `R<n> · <rule>`,
  and the example it would settle (or that it adds one). Give one specimen in backticks that
  `readMapToken` reads back, for example
  `7/2 Q1 · Discovery question — rule R1 · A member may hold at most five loans; settles E2.`
- Then 131's four lines, `Decision needed:`, `Options:`, `I would pick:`,
  `What the answer changes:`, under 1,500 characters, with the options also given as the tool's
  options.
- Mark the question `asked` before the call. Never a default and never the NEEDS_INPUT sentinel for
  a business question. A technical question keeps its documented default.
- The answer arrives as the next input of the resumed session: write it into the map (`answered`,
  then `stated Q<n>` or `confirmed`), then run the doctor as the beat already says. Parked
  unanswered, the story stays at the Contract gate with no `tasks/`.

Keep it inside the passage the examples gate governs, and write no line that opens like a map line
(`## R`, `- E`, `- Q`).

**One sentence in the `--autonomous` block.** On the business-question rule: in a driven session
the questions go one per call, each its own ask and wait; the interactive batch of four stays.

**Render and pin.** Update `manifest.json`'s hash for `refine.md`, run `aof work update`, and extend
`refine-discovery-beat.test.mjs` with this story's cases, reusing its slices (`contractOf`,
`passageOf`, `autonomousOf`) and its `readMapToken` import.

## The verification step

The repo test runner with `--only test/examples/refine-discovery-beat.test.mjs` and `AOF_GLOBAL_HOME`
isolated, then `aof work update --dry-run --json` answering `skip` for the three copies. The live
proof is the milestone's `@manual` run: a loop refine whose ask arrives in Discord with the token
and the discovery marker on its first line.

## Out of scope

131's producer paragraph (`NEEDS_INPUT_INSTRUCTION`), the PO and architect briefs, and the map
template. None changes.
