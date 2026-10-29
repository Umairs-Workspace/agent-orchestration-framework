# @aof/desktop

The aof mesh desktop supervisor: a Tauri v2 shell (`crates/app`) over a pure Rust core
(`crates/core`), with a small static frontend (`ui/`, tray + status window). It supervises the
installed `aof` daemons (`mesh serve --serve`, `mesh ui`) as children and consumes the installed
AOF process and HTTP API — it carries no mesh logic of its own. Not part of the CLI-only
distribution; the CLI works without it.

Cargo is authoritative for Rust dependencies (`Cargo.lock` is committed). `crates/app` is
deliberately excluded from the `crates/core` workspace so ordinary Rust core tests never need the
native GUI toolchain.

## Prerequisites

- Rust stable (`cargo`) for everything here.
- Windows native build of `crates/app`: MSVC build tools and the WebView2 runtime.
- macOS native build of `crates/app`: the Xcode command-line tools (`xcode-select --install`)
  and Rust through `rustup`. Both are needed only to build the app; running it needs neither.
  Each Mac builds for its own architecture (x86_64 is the verified one).

## Scripts (run from the repository root)

| Command | What it does |
| --- | --- |
| `yarn workspace @aof/desktop test` | `cargo test --locked` over the pure core workspace (no GUI toolchain). |
| `yarn workspace @aof/desktop check` | `cargo check --locked` of the Tauri shell (needs the native toolchain). |
| `yarn workspace @aof/desktop build` | Release build of the shell. |
| `node scripts/install-local.mjs --desktop` | Release build **and** place it in the install dir: `aof-mesh-desktop.exe` on Windows, an ad-hoc-signed `aof-mesh-desktop.app` (menu bar only, from the committed `crates/app/Info.plist`) on macOS. |

Start or restart it through the CLI (`aof mesh desktop run`), never by launching daemons by hand.
The per-node setup, deploy, restart and verification steps, including the macOS single-node
setup, live in `.claude/rules/build-deploy-restart.md`.
