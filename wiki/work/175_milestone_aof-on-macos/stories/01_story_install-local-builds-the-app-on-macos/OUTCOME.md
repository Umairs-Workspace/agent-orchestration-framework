# 01 · `install-local` builds the app on macOS — Outcome

## Delivered

### The app bundle is built and placed
`node scripts/install-local.mjs --desktop` on darwin builds the release app, assembles an ad-hoc-signed `aof-mesh-desktop.app` (executable `AOF Desktop`, `LSUIElement`) and places it in `~/.aof/bin` beside the payload.

### The install leaves the shell alone
No shell profile is edited and `ensureOnPath` is gone, so the npm-linked `aof` stays first on PATH, while `~/.aof/bin/aof --version` answers `payload <buildId>`.

## Assumptions

- **Rust and the Xcode command-line tools are present to build** — they are not needed to run the app.

## Gaps

### arm64
- **Status:** open
- **Discharge condition:** the app is built and run on an Apple-silicon Mac.
Only x86_64 is measured. arm64 builds the same way and is unverified (RESEARCH Q3).
