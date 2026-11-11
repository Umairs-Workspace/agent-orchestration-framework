# 175/01 · `install-local` builds the app on macOS — example map

## R1 · On macOS, `--desktop` builds and places an ad-hoc-signed app bundle
- E1 · On darwin, `--desktop` plans `cargo build --release`, then places `<installDir>/aof-mesh-desktop.app` holding `Contents/MacOS/aof-mesh-desktop` and `Contents/Info.plist`, then runs `codesign --force --deep --sign - <installDir>/aof-mesh-desktop.app` [proposed]
- E2 · On linux, `--desktop` is still refused, and the refusal names darwin and win32 as the platforms it builds on [proposed]

## R2 · A re-install keeps the newest three old bundles
- E3 · Three `aof-mesh-desktop.app.bak.*` bundles exist, and a fourth install runs: three remain, and the oldest is gone [proposed]
- E4 · A re-install while the app runs: the live bundle is renamed aside to `.bak.<ts>`, and the new one is placed [proposed]

## R3 · The install leaves the shell alone and names its payload
- E5 · A home holding `.zshrc` and `.bash_profile`: after `install-local`, both are byte-identical [proposed]
- E6 · After `install-local` on darwin x64, `~/.aof/bin/aof --version` reads `0.1.0 (payload <buildId>)`, with the buildId stamped in `BUILD_ID.json` [proposed]

## R4 · The app sits in the menu bar only
- E7 · The placed bundle's `Info.plist` makes the app menu-bar only: it has no Dock tile [stated Q1]

## Questions
- Q1 · business · answered · Should the Mac app show a Dock icon? (a) Menu bar only: no Dock icon and no app menu, and it does not appear in Cmd-Tab. It is reached only through the menu-bar icon, the way Windows reaches it through the tray. (b) A Dock icon as well: it is easier to find and shows in Cmd-Tab, but it is a second presence for an app that is meant to stay in the background. Answer (2026-10-28): (a) menu bar only.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-002 · Is the bundle produced by the Tauri CLI or assembled? Assembled from the cargo build, so there is no new build tool.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-002 · Does `install-local` add `~/.aof/bin` to PATH on darwin? No. `ensureOnPath` is deleted, and the npm-linked `aof` stays first.
