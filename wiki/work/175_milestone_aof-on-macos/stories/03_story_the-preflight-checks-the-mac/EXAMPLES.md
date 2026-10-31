# 175/03 · The preflight checks the Mac — example map

## R1 · On macOS the preflight adds four checks after the existing four
- E1 · On darwin with every probe answering well: eight checks, the last four being `macos-command-line-tools`, `rust-toolchain`, `app-not-quarantined` and `daemon-claude-authenticated`, all `pass` [proposed]
- E2 · On win32: exactly the existing four, in their order, and no darwin probe is run [proposed]

## R2 · A build-only prerequisite says it matters only for building
- E3 · `cargo --version` cannot be run: `rust-toolchain` fails, and its message says Rust is needed only to build the desktop app and names `rustup` [proposed]
- E4 · `xcode-select -p` exits 2: `macos-command-line-tools` fails and names `xcode-select --install` [proposed]

## R3 · A quarantined app is named, with the command that clears it
- E5 · `xattr -p com.apple.quarantine <bundle>` prints `0083;6720d2a1;Safari;`: `app-not-quarantined` fails and names `xattr -dr com.apple.quarantine <bundle>` [proposed]
- E6 · `xattr` exits 1 because the attribute is absent: `app-not-quarantined` passes [proposed]

## R4 · The daemons' `claude` is probed with the daemons' PATH, not the terminal's
- E7 · The LaunchAgent's PATH is `/usr/bin:/bin`, and the terminal's `claude` is signed in: `daemon-claude-authenticated` fails, saying `claude` is not on the LaunchAgent's PATH [proposed]
- E8 · The LaunchAgent's PATH holds `claude`, and `claude auth status` there answers `{"loggedIn": true, "authMethod": "claude.ai"}`: it passes, naming `claude.ai` [proposed]
- E9 · No LaunchAgent is registered: `daemon-claude-authenticated` is `skip`, rendered `--`, and its message names `aof mesh desktop install --autostart` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-004 · Are Rust and the command-line tools checked on a Mac that only runs the app? Yes, as the SPEC asks. Their messages say they are needed only to build.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-004 · What does a check that does not apply report? A third status, `skip`, rendered `--`, never `pass`.
