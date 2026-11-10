@bug @finding-F-01 @executable @docs @work-stream
Feature: the verify prose keeps the words 160/05 reads

  WHY. At `aof:verify 190` (finding F-01), the case `160/05 The verify prose names the word`
  (`test/run/regression-gate.test.mjs`) went red. 190/03 rewrote the `not-finished` paragraph of
  `packages/core/assets/commands/verify.md` to name `--resume` first, and the reflow split
  "re-run the gate, or to speed the run up" across a line break. 160/05 reads that phrase as one
  literal line, so the paragraph still said it, but the control could no longer see it. 03's own
  scenarios passed, and no lane selected 160's case, because the story's run was scoped.

  Rule: R1 · A stopped gate's fallback repair is still said where 160/05 reads it

    Scenario: E1 · the fallback repair is one readable line after the resume
      When `verify.md` is read
      Then it says a `not-finished` row is no verdict on the code
      And it names `aof work regression-gate <NN> --resume` as the repair
      And "re-run the gate, or to speed the run up" stands on one line, as the fallback when the content changed
      And it says never to route a not-finished row to a code repair
      And the shipped bundle manifest matches the rendered bundle
