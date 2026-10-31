@executable @cli @distribution @adapter
Feature: --desktop builds and places the app bundle on macOS

  WHY. On macOS the app is an `.app` bundle assembled from the cargo build and one committed
  `Info.plist`, ad-hoc signed, and placed beside `aof` (ADR-002 §1-§4). The plan is pure, so it
  is asserted on any host the way `planMacCodesignSteps` is; a real Mac runs it.

  Background:
    Given a built binary path "<target>/release/mesh-desktop-app" and an isolated install dir

  Rule: R1 · On macOS, --desktop builds and places an ad-hoc-signed app bundle

    Scenario: E1 · the darwin plan builds, assembles, then signs last
      When the desktop plan is made for platform "darwin"
      Then its steps are, in order:
        | step                                                                                       |
        | cargo build --release --manifest-path apps/desktop/crates/app/Cargo.toml                   |
        | copy the built binary to <staged>/aof-mesh-desktop.app/Contents/MacOS/AOF Desktop     |
        | copy apps/desktop/crates/app/Info.plist to <staged>/aof-mesh-desktop.app/Contents/Info.plist |
        | codesign --force --deep --sign - <staged>/aof-mesh-desktop.app                             |
        | place <staged>/aof-mesh-desktop.app at <installDir>/aof-mesh-desktop.app                   |

    Scenario: E2 · linux is still refused, naming where it builds
      When "node scripts/install-local.mjs --desktop --dry-run" runs with platform "linux"
      Then it exits non-zero
      And the message names "darwin" and "win32"

    Scenario: the Windows plan is unchanged
      When the desktop plan is made for platform "win32"
      Then it places "<target>/release/mesh-desktop-app.exe" at "<installDir>/aof-mesh-desktop.exe"
      And it holds no codesign step

    Scenario: --dry-run on darwin lists the bundle steps and builds nothing
      When "node scripts/install-local.mjs --desktop --skip-ui --dry-run --install-dir <dir>" runs on a darwin host
      Then its plan names "aof-mesh-desktop.app" and "codesign"
      And the install dir is unchanged

  Rule: R2 · A re-install keeps the newest three old bundles

    Scenario: E3 · a fourth re-install prunes the oldest bundle
      Given the install dir holds "aof-mesh-desktop.app" and three bundles "aof-mesh-desktop.app.bak.20261001T100000", "…bak.20261002T100000", "…bak.20261003T100000"
      When a new bundle is placed
      Then three ".bak" bundles remain, and "aof-mesh-desktop.app.bak.20261001T100000" is gone, with its whole tree

    Scenario: E4 · the live bundle is renamed aside, never deleted, before the new one lands
      Given the install dir holds "aof-mesh-desktop.app" whose executable prints "v1"
      When a bundle whose executable prints "v2" is placed
      Then "aof-mesh-desktop.app/Contents/MacOS/AOF Desktop" prints "v2"
      And one "aof-mesh-desktop.app.bak.<ts>" holds the executable that prints "v1"

  Rule: R4 · The app sits in the menu bar only

    Scenario: E7 · the committed Info.plist makes the app menu-bar only
      When "apps/desktop/crates/app/Info.plist" is read
      Then "LSUIElement" is true
      And "CFBundleIdentifier" is "com.aof.mesh.desktop", the identifier in "tauri.conf.json"
      And "CFBundleExecutable" is "aof-mesh-desktop"
