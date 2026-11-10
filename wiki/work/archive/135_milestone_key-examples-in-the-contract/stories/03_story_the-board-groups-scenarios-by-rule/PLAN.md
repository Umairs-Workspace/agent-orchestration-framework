# 135/03 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**The projection.** `tasks.mjs` builds each scenario as `({ name, outline, lane })` from
`parseFeature`. Add `rule: scenario.rule?.name ?? null`. Only the rule's *title* crosses the API,
never its line or tags: the board has no use for them, and a smaller projection is a smaller
contract. The remote path (`readWorkerDocMembers`) goes through the same function, so cached and
local tasks are shaped the same way. FF-5704's guard that core's tasks binding never reads
`.examples` is unaffected.

**The type.** `TaskScenario` in `api.ts` gains `rule: string | null`. A cached payload from an older
node has no `rule`. Treat `undefined` as `null` at the point of use, not in the type.

**The panel.** In `TaskList`, replace the single `<ul>` with a grouping pass over
`task.scenarios`, in order. Start a new group whenever `rule` changes, so the scenarios outside any
rule (which Gherkin puts first) form a leading group with no heading. Render the leading group as
today's list. Render each rule group as a heading (`text-xs font-semibold mt-3`) over the same list
markup, indented (`pl-3 border-l border-border`). Keep the list item itself unchanged, ideally by
pulling it into a small `ScenarioItem` so both paths share one item. With no rule anywhere, the
output must be today's markup exactly. That is DESIGN.md's "pixel for pixel" state, and the suite
asserts it.

**The suite.** A new `board-rule-groups.suite.mjs` mounts the panel through the existing board app
harness, the way `board-diagrams.suite.mjs` mounts its surface, with a stubbed `/api/work/tasks`.
Register it in `apps/ui/test/index.mjs` and raise `apps/ui/test`'s ceiling by one, stating why.

## The verification step

With `AOF_GLOBAL_HOME` set to a fresh temp directory, run through `--only`: `read.test.mjs`, the new
UI suite and `board-diagrams.suite.mjs`, plus the source-directory budget. Then run `yarn ui:build`.
Finally render the panel over a story with a ruled task (03's own tasks once 05 has formulated one,
or a fixture), take a screenshot for the design-conformance review, and compare it with DESIGN.md.

## Out of scope

Collapsing rules, linking a rule to `EXAMPLES.md`, and showing provenance (DESIGN.md).
