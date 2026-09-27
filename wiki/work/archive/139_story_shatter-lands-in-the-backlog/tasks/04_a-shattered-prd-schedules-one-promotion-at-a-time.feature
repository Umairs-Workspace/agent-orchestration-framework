@manual @cli @planning @work-stream
Feature: a shattered PRD lands as backlog candidates the operator schedules one promotion at a time

  WHY MANUAL. Shatter is a prompt an agent plays, not a verb, so no suite can run it. Tasks 00–03
  pin every mechanical piece. This task is the one place the pieces are seen working together as
  the operator will use them: a real PRD, the real prompt, the real CLI, and the result read at the
  source. The developer runs it and records the evidence in the story's `VERIFICATION.md`.

  THE SETUP. The PRD is the committed fixture
  `wiki/work/archive/02_milestone_planning-init/stories/01_story_shatter-consumes-prd/fixtures/PRD-acme-notify.md`
  — three milestones, where delivery tracking and rate limiting each build on the send core. Each
  run is in a fresh scratch project OUTSIDE this repository. It has its own `aof work init`,
  `work.intake` set per scenario, and one pre-existing numbered milestone `00_milestone_platform` so
  the stream is not empty. Every command is the CLI built from THIS tree
  (`node <repo>/bin/aof.mjs …`), run from the scratch root with `AOF_GLOBAL_HOME` set to a fresh
  temp dir, so nothing reaches the real `~/.aof`. The developer plays `aof:shatter` from the edited
  `src/bundle/commands/shatter.md`, inline, following it as written.

  Evidence is pasted, never paraphrased: the `find`/`ls` listings, each record doc's frontmatter,
  each `--json` envelope and each refusal, verbatim.

  Scenario: under the backlog intake, nothing is numbered and the order holds by refusal
    Given a scratch project with `work.intake: "backlog"` and the Acme Notify PRD at its root
    When the developer plays `aof:shatter` over the PRD
    Then the backlog holds three milestone folders with no number, each record doc carrying a bare `number:`, `origin:` naming the PRD, and a heading with no number prefix
    And the stream root holds only `00_milestone_platform`
    And the delivery-tracking and rate-limiting SPECs carry the send core's slug in `depends:`, and the send core carries none
    And `aof work validate --json` reports zero findings
    When `aof work promote` runs on the delivery-tracking slug
    Then it is refused `promote-depends-backlog`, naming the send core's slug
    When `aof work promote` runs on the send core's slug
    Then it is minted `01`, and the envelope's `rewired` lists both dependents
    And both dependents' `depends:` lines now read `[01]`
    When `aof work promote` runs on each dependent in turn
    Then they are minted `02` and `03`, each with `created.depends` `[1]`
    And `aof work validate --json` reports zero findings and the backlog is empty

  Scenario: under the stream intake, the same shatter ends as today's contiguous block
    Given a scratch project with `work.intake: "stream"` and the Acme Notify PRD at its root
    When the developer plays `aof:shatter` over the PRD
    Then the stream holds `01`, `02` and `03` in PRD order after `00_milestone_platform`, and the backlog is empty
    And the two dependents carry `depends: [01]`, a number, as today's shatter wrote it
    And the transcript shows one `aof work promote <slug> --json` per driver, in PRD order, and no number the prompt worked out itself
    And `aof work validate --json` reports zero findings

  Scenario: a shatter into a named group stays in that group until promoted
    Given a scratch project with `work.intake: "backlog"` and the Acme Notify PRD at its root
    When the developer plays `aof:shatter` over the PRD with `in acme-notify`
    Then all three folders sit under `backlog/acme-notify/`
    And promoting the send core rewrites the two dependents in place, under `backlog/acme-notify/`
