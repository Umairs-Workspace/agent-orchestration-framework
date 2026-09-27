@executable @cli @adapter @planning
Feature: the browser ladder picks the first rung that exists, and no rung downloads anything

  WHY. The plugin's own PNG path needs Python Playwright, which is policy-blocked here and absent on
  the worker nodes. ADR-005 §3 has aof FIND a Chromium-family browser instead: an explicit config
  path, an env override, the cached Playwright headless shell, Chrome, Edge, then `PATH`. Every
  rung is a lookup. None installs, fetches or spawns a package manager.

  RULINGS (QA, 2026-09-23).
  (1) `findBrowser` is pure over injected facts: `{ configured, env, platform, home, localAppData,
      exists, which }`. The suites drive every rung through fakes. None of them touches a real
      browser or the real cache.
  (2) An explicit rung (config or env) that names a file which does NOT exist is a coded miss
      `diagram-png-renderer-missing` whose message names that path. It does not fall through
      silently: a pinned browser that has gone missing is something the operator must hear about.
  (3) "Newest cached shell" means the greatest NUMERIC suffix of `chromium_headless_shell-<n>`,
      so `-1234` beats `-999`. A directory without its executable is skipped.
  (4) The answer carries `kind`: `"headless-shell"` for the cached shell and `"full"` for Chrome,
      Edge and a `PATH` browser. Only `"full"` gets `--headless=new` (ADR-005 §3). A config or env
      path is classified by its file name: `chrome-headless-shell` or `headless_shell` means shell,
      anything else means full.
  (5) The answer also carries `rung`, naming which rung answered, so a render can be explained.

  Background:
    Given `findBrowser` is imported from `src/diagrams/rasterize.mjs`
    And a fake `exists` and a fake `which` that answer only for the paths each example lists

  Scenario Outline: the first rung that exists wins
    Given the platform is `win32`, `localAppData` is `L`, and <present>
    When `findBrowser` is asked with `configured` <configured> and env `AOF_DIAGRAM_BROWSER` <env>
    Then it answers `rung` <rung>, `kind` <kind> and `path` <path>

    Examples:
      | present                                                                                              | configured      | env             | rung               | kind              | path                                                                                   |
      | `C:/T/chrome.exe` and every other rung                                                               | `C:/T/chrome.exe` | unset         | `"config"`         | `"full"`          | `C:/T/chrome.exe`                                                                      |
      | `D:/B/chrome-headless-shell.exe` and every rung below env                                            | `null`          | `D:/B/chrome-headless-shell.exe` | `"env"` | `"headless-shell"` | `D:/B/chrome-headless-shell.exe`                                                       |
      | `L/ms-playwright/chromium_headless_shell-999/…` and `…-1234/chrome-headless-shell-win64/chrome-headless-shell.exe`, and Chrome | `null` | unset | `"playwright-cache"` | `"headless-shell"` | `L/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe` |
      | a `chromium_headless_shell-1234` dir with no executable, and Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` | `null` | unset | `"chrome"` | `"full"` | `C:/Program Files/Google/Chrome/Application/chrome.exe` |
      | only Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`                          | `null`          | unset           | `"edge"`           | `"full"`          | `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`                         |
      | only `chromium` on `PATH`                                                                            | `null`          | unset           | `"path"`           | `"full"`          | the path `which("chromium")` answered                                                  |

  Scenario Outline: each OS looks in its own cache root
    Given the platform is <platform> and home is `H`
    And the only present browser is a headless shell under <root>
    When `findBrowser` is asked with nothing configured
    Then it answers `rung: "playwright-cache"` with a path under <root>

    Examples:
      | platform   | root                               |
      | `win32`    | `<localAppData>/ms-playwright`     |
      | `darwin`   | `H/Library/Caches/ms-playwright`   |
      | `linux`    | `H/.cache/ms-playwright`           |

  Scenario: nothing found is a coded miss that says how to fix it
    Given no rung exists
    When `findBrowser` is asked with nothing configured
    Then it answers `{ ok: false, code: "diagram-png-renderer-missing", fix }`
    And the `fix` names `work.diagrams.browser` and `AOF_DIAGRAM_BROWSER`

  Scenario Outline: a pinned browser that has gone missing is heard, not skipped
    Given <pinned> names a path that does not exist, and Chrome exists
    When `findBrowser` is asked
    Then it answers `ok: false` with code `diagram-png-renderer-missing`
    And the message names the missing path and <pinned>

    Examples:
      | pinned                   |
      | `work.diagrams.browser`  |
      | `AOF_DIAGRAM_BROWSER`    |

  Scenario: looking is all it does
    Given the fakes record every call they receive
    When `findBrowser` is asked through every rung to a miss
    Then only `exists` and `which` were called
    And no process was spawned and no file was written
