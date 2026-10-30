---
doc: retrospective
promotionFrom: 1
---
# 00 · Quit reaps the whole tree on macOS — retrospective

## R1 · The research question needed sources the read set did not name

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** RESEARCH Q1 (which `RunEvent` a macOS quit arrives as) could only be answered from the installed `tao` 0.35.3 (`platform_impl/macos/app_delegate.rs`) and `tauri-runtime-wry` 2.11.4 sources, and the cargo lane's shape from `scripts/test.mjs`. None of them was in `reads:`.

**Why:** The read set named the repo's own files, and the answer lived in the installed dependencies.

**Lesson:** When a research question is about a dependency's behaviour, name the installed dependency source paths in `reads:`.

**Refs:** milestone STATE `## Feedback (for retro)` (175/00, read set); RESEARCH Q1.

## R2 · A Windows-only compile error passed the Mac's cargo check

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The first `kill_now` took `&Child`, but `start_kill` needs `&mut`. The macOS `cargo check` was green because that arm is `#[cfg(windows)]`. `cargo check --target x86_64-pc-windows-msvc` from the Mac, with a check-only `llvm-rc` stub for `tauri-winres`, caught it.

**Why:** A darwin build compiles no `cfg(windows)` arm.

**Lesson:** A change to a `cfg(windows)` arm made from a Mac is type-checked with `--target x86_64-pc-windows-msvc` before it is called done.

**Refs:** milestone STATE `## Feedback (for retro)` (175/00, cross-target check).

## R3 · The Mac's menu and window were judged against Windows behaviour

**Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** designer · **Raised by:** operator · **Promoted to:** none

**What happened:** Three defects reached the operator. The menu closed within seconds of a click, because `rebuild_tray` called `set_menu` on every refresh and macOS's `setMenu` dismisses an open menu (F-04). The window's node row overlapped and misaligned its badges with a real hostname (F-12, F-13). The window drew Windows –/☐/✕ caption buttons on a Mac (F-13).

**Why:** The end review chose no macOS mock, so the m36 Windows mocks were the baseline. Fake-driven tests cannot see a native call's platform semantics, and a Windows baseline cannot flag Windows chrome.

**Lesson:** When a native surface is ported to a new platform, check each native call the port relies on against that platform's implementation, and state the platform's own chrome conventions in DESIGN. "No new mock" accepts the old platform's look and must be said as such.

**Refs:** VERIFICATION `## Findings` F-04, F-12, F-13; DESIGN Surface M3, M4.
