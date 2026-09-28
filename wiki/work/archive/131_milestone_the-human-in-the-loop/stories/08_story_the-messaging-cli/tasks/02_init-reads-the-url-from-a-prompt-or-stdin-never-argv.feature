@executable @cli @work @work-stream
Feature: aof messaging init discord reads the URL from a prompt or stdin, never from argv, and never echoes it

  ADR-005 §1, as amended at 131/08. `aof messaging init discord` is the one way the URL enters
  aof. On a TTY it prompts `Discord webhook URL:` through `@inquirer/prompts`' `password`, which
  is already a dependency, so nothing is echoed. With stdin not a TTY, it reads the first line of
  stdin. It checks the shape with the type's `accepts`, then stores the URL through
  `writeMessagingSecret`. It writes nothing in the project.

  RULINGS (PO, 2026-09-25). (1) argv is refused, never read. Any positional after the type is
  refused as `messaging-secret-in-argv`, before any read or write, whatever it holds. The
  refusal's message and every other line printed never contain the argument. (2) On success it
  prints `Stored the Discord webhook for this machine at <path>.`, then
  `Switch it on per project with \`aof messaging enable discord\`.`. The path is the store's path,
  never the URL. When a URL was already stored, the first line says `Replaced` in place of
  `Stored`. (3) `--json` answers `{ type, path, replaced }`, with no URL key.
  (4) It needs no project. It runs from any directory.

  RULINGS (developer, feasibility, 2026-09-25). (1) Prompting is a FACE concern, as
  `promptOrchestratorModel` is. The argv adapter reads the URL and hands `run()` an input the
  registry never prints, so `run()` stays headless. (2) The face never echoes a flag's value:
  `parseSpecArgv` refuses `--url=<value>` as `Unknown flag "--url"`. (3) The source of input is an
  injectable seam (`{ stdin, isTTY, promptSecret }`), so the TTY path is driven with a fake
  prompt and no real terminal.

  RULINGS (QA, 2026-09-25). (1) A URL used in a case is a fixture, never a real webhook:
  `https://discord.com/api/webhooks/123/tok_EN-1`. "Never echoes" is asserted over stdout plus
  stderr plus the degrade sink, for both the whole URL and its token segment `tok_EN-1`.
  (2) Every case runs under a fresh `AOF_GLOBAL_HOME`.

  Scenario: a URL piped on stdin is stored
    Given a fresh global home
    When `aof messaging init discord` runs with stdin `https://discord.com/api/webhooks/123/tok_EN-1\n`
    Then it exits 0, `readMessagingSecret("discord")` answers that URL, and the output contains neither the URL nor `tok_EN-1`

  Scenario: the TTY prompt hides the URL
    Given stdin is a TTY and the prompt seam answers the fixture URL
    When `aof messaging init discord` runs
    Then the prompt was `password`-shaped with the message `Discord webhook URL:`, the URL is stored, and nothing printed contains it

  Scenario: a second init replaces the first
    Given a URL is already stored
    When `init` runs with a different valid URL on stdin
    Then the stored URL is the new one, and the first line begins `Replaced`

  Scenario Outline: a refused init stores nothing and echoes nothing
    Given a fresh global home
    When `<argv>` runs with stdin `<stdin>`
    Then it exits non-zero with code `<code>`, no `discord.secret` exists, and nothing printed contains `tok_EN-1`

    Examples:
      | argv                                                                   | stdin                                            | code                     |
      | `aof messaging init discord https://discord.com/api/webhooks/123/tok_EN-1` | ``                                           | messaging-secret-in-argv |
      | `aof messaging init discord tok_EN-1`                                   | ``                                               | messaging-secret-in-argv |
      | `aof messaging init discord --url=https://discord.com/api/webhooks/123/tok_EN-1` | ``                                     | unknown-flag             |
      | `aof messaging init discord`                                            | `\n`                                             | messaging-url-empty      |
      | `aof messaging init discord`                                            | `https://evil.example/api/webhooks/123/tok_EN-1` | messaging-url-invalid    |
      | `aof messaging init discord`                                            | `http://discord.com/api/webhooks/123/tok_EN-1`   | messaging-url-invalid    |
