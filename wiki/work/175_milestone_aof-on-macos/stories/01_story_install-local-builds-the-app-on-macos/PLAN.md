# 01 · `install-local` builds the app on macOS — build plan

## Mechanism

**Split step 4 of `main()` by platform, behind a pure plan.** Today the Windows branch builds,
then calls `backupThenPlace` on one exe. Add `planMacAppBundle`, a pure, exported function shaped
like `planMacCodesignSteps`. It returns an ordered list: make `Contents/MacOS`, copy the release
binary to `Contents/MacOS/aof-mesh-desktop`, copy `apps/desktop/crates/app/Info.plist` to
`Contents/Info.plist`, then `codesign --force --deep --sign -` over the staged bundle. `main()`
carries the list out against a staging directory beside the install dir, then rotates and swaps it
in. Every name comes from story 02's layout module.

**Rotation for a directory.** `backupThenPlace` renames, which works for a directory on POSIX.
`pruneBaks` needs a recursive `rmSync` for a `.app.bak.*` entry. Keep the newest 3, as for
binaries.

**`Info.plist`.** It holds `CFBundleIdentifier com.aof.mesh.desktop`, `CFBundleExecutable
aof-mesh-desktop`, `CFBundleName aof mesh`, `CFBundlePackageType APPL`,
`CFBundleShortVersionString 0.1.0` and `NSHighResolutionCapable`, plus `LSUIElement` as 175/01
Q1 decides. The file is committed where the Tauri bundler would merge it (ADR-002 §7).

The refusal of `--desktop` on darwin goes, and linux is still refused. `--wsl` stays
Windows-only. Delete `ensureOnPath` and its commented call.

## Verification step

On a Mac with Rust installed:
1. `node scripts/install-local.mjs --skip-ui --desktop`.
2. `codesign -v ~/.aof/bin/aof-mesh-desktop.app` exits 0.
3. `plutil -p ~/.aof/bin/aof-mesh-desktop.app/Contents/Info.plist` shows the bundle id.
4. `~/.aof/bin/aof --version` shows the new buildId.
5. Run the install a second time: one `.app.bak.<ts>` appears.
6. `git diff ~/.zshrc` is empty (compare against a copy taken first).

A `codesign -v` failure means the signature was taken before the plist was copied in. The sign
must be the last step.

## Out of scope

- Moving the app into `/Applications`, or creating a `.dmg`: a release milestone.
- The verb `aof mesh desktop install`, which places a built bundle: story 02. `install-local`
  stays the dev deploy (m126/ADR-007 §6).
- A universal (arm64 + x64) binary: each Mac builds for its own arch.
