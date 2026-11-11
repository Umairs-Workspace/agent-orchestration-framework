@executable @docs @assets @work-stream
Feature: `/aof:map-tests` says what it does, what it writes and what it will not claim

  WHY. A skill's behaviour is its prose, and an agent follows it to the letter. The command must
  replay before it declares, write only `work.test.*`, preview under `--dry-run`, write resume
  templates only for a program that honours the resume contract, and report the replay rather than
  a saving (ADR-008 §3, §4; 190/04 Q2). These cases read the bundle source and its renders, the way
  `work-test-declared.test.mjs` reads `continue.md`.

  Rule: R3 · /aof:map-tests declares the layout and proves it by replay

    Scenario: the command ships in the bundle and renders for every runtime
      When the manifest at `packages/core/assets/manifest.json` is read
      Then it lists `map-tests` as a command whose source is `packages/core/assets/commands/map-tests.md`
      And after `aof work update` the Claude, Codex and OpenCode renders of it exist

    Scenario: it replays before it declares, and again after
      When the `<process>` region of `map-tests.md` is read
      Then its first step runs `aof test --scope impacted --commit <sha> --plan --json` over the last 30 non-merge commits that touch a file outside the work dir
      And a later step runs the same replay after the declaration is written
      And its last step runs `aof project doctor`

    Scenario: E17 · it writes `work.test.*` and nothing else
      When `map-tests.md` is read
      Then it names `.aof/aof.config.json` `work.test.*` as its only write
      And it says it edits no test, no runner config and no source

    Scenario: E18 · with no flag it writes, then shows the diff and both replays
      When the `<output>` region of `map-tests.md` is read
      Then it prints the `work.test.*` diff, the before and after replays, and the doctor's `test-layout-*` checks

    Scenario: E19 · `--dry-run` previews and writes nothing
      When `map-tests.md` is read
      Then `--dry-run` stops after the before replay and the proposed `work.test.*` change
      And it says the config is left byte-identical

    Scenario: E15 · resume templates only for a program that honours the contract
      When `map-tests.md` is read
      Then it states the resume contract: a newline-separated file list at `{files}`, and a JSON report of `units`, `lanes`, `notFinished` and `notStarted` at `{report}`
      And it writes `reportArgs` and `filesArgs` only when the gate program is shown to honour that contract
      And otherwise it says resume is unavailable for this runner, names the contract, and leaves the gate unchanged

    Scenario: E16 · the report is the replay, never a promise
      When `map-tests.md` is read
      Then the report gives, before and after, the widened count, the median and 75th-percentile selected count, and the total
      And it names every reason that still widens
      And it says that when the narrowed median is within 10% of the total, the narrowed runs are near-total
      And it gives no estimate of time saved

    Scenario: couplings are judged, each with its reason
      When `map-tests.md` is read
      Then each coupling is authored from a search of the suites for the coupled paths, with its `why`
      And `couplings: []` is written when no suite reads a document

    Scenario: the Codex variant says the same
      When `map-tests.md` and its Codex render are compared
      Then both carry the same replay command, the same resume contract and the same `--dry-run` rule
