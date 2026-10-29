@executable @cli @distribution @adapter
Feature: install places the app bundle on macOS, with no bootstrapper

  WHY. On macOS the desktop app is an `.app` directory, not one exe, and it needs no WebView2
  bootstrapper (ADR-002, ADR-003 §1). The install keeps its stage-then-swap and its coded
  refusals; only what it places changes with the platform it is handed.

  Background:
    Given an isolated install dir and a fixture bundle "aof-mesh-desktop.app" whose "Contents/MacOS/aof-mesh-desktop" is executable

  Rule: R1 · On macOS, install places the app bundle and needs no bootstrapper

    Scenario: E1 · a bundle is placed whole on darwin, and run then finds its executable
      When "aof mesh desktop install --app-artifact <fixture bundle> --json" runs with platform "darwin"
      Then it answers ok with appPath "<installDir>/aof-mesh-desktop.app"
      And "<installDir>/aof-mesh-desktop.app/Contents/MacOS/aof-mesh-desktop" exists and is executable
      And the answer names no bootstrapper path
      And discovery with platform "darwin" answers "<installDir>/aof-mesh-desktop.app/Contents/MacOS/aof-mesh-desktop"

    Scenario: E2 · a bundle with no executable inside is refused, and nothing is placed
      Given a fixture directory "aof-mesh-desktop.app" holding only "Contents/Info.plist"
      When "aof mesh desktop install --app-artifact <that directory> --json" runs with platform "darwin"
      Then it answers ok false with code "app-artifact-missing"
      And the install dir holds exactly what it held before

    Scenario: E3 · Windows still requires the bootstrapper
      Given a fixture "aof-mesh-desktop.exe"
      When "aof mesh desktop install --app-artifact <fixture exe> --json" runs with platform "win32"
      Then it answers ok false with code "bootstrapper-artifact-missing"

    Scenario: a re-install over a placed bundle replaces it in place
      Given the fixture bundle was installed once with platform "darwin"
      When it is installed again with a fixture whose executable prints "v2"
      Then "<installDir>/aof-mesh-desktop.app/Contents/MacOS/aof-mesh-desktop" prints "v2"
      And exactly one "aof-mesh-desktop.app" directory sits in the install dir beside at most one "aof-mesh-desktop.app.bak.<ts>"

    Scenario Outline: discovery on darwin refuses a bundle it cannot run
      Given the install dir holds "<placed>"
      When discovery runs with platform "darwin"
      Then it is refused with code "<code>"

      Examples:
        | placed                                                 | code                  |
        | nothing                                                | desktop-not-installed |
        | a bundle whose inner executable has no execute bit      | desktop-not-runnable  |
        | a regular file named "aof-mesh-desktop.app"             | desktop-not-runnable  |

    Scenario: --dry-run on darwin names the bundle it would place and places nothing
      When "aof mesh desktop install --app-artifact <fixture bundle> --dry-run --json" runs with platform "darwin"
      Then it answers dryRun true with appPath "<installDir>/aof-mesh-desktop.app"
      And the install dir is unchanged
