@executable @cli @docs @work @work-stream
Feature: /aof:archive drives the verb and moves nothing by hand, and /aof:verify points at it as the operator's next step without ever archiving

  A `work:*` command is not done until its bundle wrapper ships and is reachable through `aof work
  update` (the m41 R5 parity rule, widened to `work:promote` by 127/02 task 04). The wrapper is the
  operator's door — `/aof:archive <NN>` or `/aof:archive --done` — and it is HONEST: it runs the
  verb and reports what the verb did. It never moves a folder, never edits a link, never decides
  which items are done; deciding and moving are the verb's (ADR-004 §1), exactly as computing a
  number is `promote`'s and never the prompt's (127/ADR-003 §1).

  THE WRAPPER. `src/bundle/commands/archive.md`, declared in `src/bundle/bundle.json` as
  `{ id: "archive", kind: "command", file: "commands/archive.md", runtimes: ["claude", "opencode"],
  commandNamespace: "aof" }` — the same row shape as `promote` — and rendered by `aof work update`
  into `.claude/commands/aof/archive.md`, `.codex/skills/aof-archive/SKILL.md` and
  `.opencode/commands/aof/archive.md`, with `src/bundle/manifest.json` and `.aof/aof.lock.json`
  carrying the new member's hash. Its frontmatter carries `argument-hint: "<NN> | --done"` and
  `allowed-tools: [Read, Grep, Glob, Bash, AskUserQuestion]`. Its process: resolve the ref with
  `aof work find "<ref>" --json` (a row `archived: true` is already archived; a row `number: null`
  is in the backlog and is `promote`'s, not this verb's); run `aof work archive <NN> --json` or
  `aof work archive --done --json`; on `archive-confirm-required`, surface the `candidates` list to
  the operator and re-run with `--yes` only on their confirmation (`--yes` carries autonomous
  intent, as it does for `promote`); every other refusal is a STOP that names what the verb found
  (`archive-not-done` names the status — the item is not accepted; `archive-not-a-driver` says the
  story moves with its milestone); report `archived` and `rewritten` from the envelope and confirm
  `aof work validate` is green afterwards. Next: nothing — an archived item has no next step, which
  is the point.

  THE PARITY CONTROL IS WIDENED, NOT DUPLICATED (extend the existing surface, never add a
  sibling). `test/arch/work/acd-work-insert-command-bundle-parity.test.mjs`'s `wrappedFamily`
  predicate admits `work:archive` beside `work:promote`, so the delivered "every wrapped verb has a
  bundle command wrapper" leg covers it, and the "the wrapper drives the verb and computes nothing"
  leg gains its archive twin: the prompt contains `aof work archive` and contains none of `rename`,
  `mv `, `git mv`, `../archive/` — the phrases a prompt that moved folders or rewrote links by
  hand would need.

  THE VERIFY CEREMONY NEVER ARCHIVES. `aof:verify` accepts; where the accepted folder lives
  afterwards is the operator's decision, made explicitly (ADR-004 §1: explicit only, never
  automatic on `done` — the ceremony cites the folder it just closed, and an automatic move would
  pull it out from under the retrospective, the OUTCOME and the memory ingest that follow).
  `src/bundle/commands/verify.md` gains ONE line, in its `<output>` block, after the accept
  decision: `Next, for a milestone just accepted: \`aof work archive <NN>\` moves its folder under
  \`archive/\` — the operator's act, never this ceremony's (127/ADR-004).` — and nothing else in
  the file changes. The three rendered `verify` targets and the manifest follow through `aof work
  update`. No prompt in the bundle — `verify.md`, `retrospective.md`, `continue.md`, `autonomous.md`
  — runs `aof work archive`; only `archive.md` does.

  What would quietly undo this: a wrapper that `mv`s the folder when the verb refuses; a
  `verify.md` that runs the verb "for convenience" at the milestone close; a bundle.json row
  without the manifest and lock following (the `acd-declared-writes-include-generated-siblings`
  control names the tracked renders a bundle member must declare — this story's `files:` declares
  them all).

  ADR-004 §1, §4; 127/ADR-003 §1; m41 R5; work-command-implies-claude-command.

  Scenario: the wrapper is declared, rendered into every runtime, and drives the verb
    Given the delivered bundle
    When `aof work update --dry-run --json` runs in this repository and the rendered files are read
    Then `src/bundle/bundle.json` declares the member `archive` with `file: "commands/archive.md"`, and `.claude/commands/aof/archive.md`, `.codex/skills/aof-archive/SKILL.md` and `.opencode/commands/aof/archive.md` exist and are current — the dry run reports nothing to write for them
    And `src/bundle/manifest.json` and `.aof/aof.lock.json` each carry an entry for every one of the three with the render's hash
    And `src/bundle/commands/archive.md` contains `aof work archive` and `--json`, names `archive-confirm-required` and `candidates`, and contains none of `rename(`, ` mv `, `git mv` or `../archive/`

  Scenario: the parity control admits work:archive and holds the wrapper honest
    Given `test/arch/work/acd-work-insert-command-bundle-parity.test.mjs` after this task
    When the focused suite `node scripts/test.mjs --only test/arch/work/index.mjs` runs under `AOF_GLOBAL_HOME=$(mktemp -d)`
    Then the parity leg's swept subcommands include `archive` beside `promote` and every `insert-*`, and the leg is green
    And the honesty leg reads `src/bundle/commands/archive.md` and is green
    When `src/bundle/commands/archive.md` is rewritten in a scratch copy to add the line `Move the folder with \`git mv <dir> <work.dir>/archive/\` when the verb refuses.`
    Then the honesty leg fails naming `archive.md` as a prompt that moves a folder by hand, and the message is recorded against this task in `VERIFICATION.md`

  Scenario: verify.md gains one line and no prompt but archive.md runs the verb
    Given `src/bundle/commands/verify.md` at this story's base commit and after this task
    When the two are diffed
    Then the diff is exactly one added line inside `<output>`, reading `Next, for a milestone just accepted: \`aof work archive <NN>\` moves its folder under \`archive/\` — the operator's act, never this ceremony's (127/ADR-004).`
    And `.claude/commands/aof/verify.md`, `.codex/skills/aof-verify/SKILL.md` and `.opencode/commands/aof/verify.md` carry the same line after `aof work update`
    When every `src/bundle/commands/*.md` is swept for `aof work archive`
    Then the matches are `archive.md` (which runs it) and `verify.md` (which names it in prose as the operator's next step) and no other file

  Scenario: the wrapper's text stops where the verb stops
    Given `src/bundle/commands/archive.md`
    When its `<process>` block is read
    Then it names each of `archive-not-done`, `archive-not-a-driver`, `archive-backlog-ref` and `archive-already-archived` as a stop that reports what the verb found, and names `archive-confirm-required` as the one refusal answered by re-running with `--yes` after the operator confirms the `candidates`
    And it names `aof work promote` as the door for a backlog row, and contains the sentence that a refusal is never reached around by editing the tree
