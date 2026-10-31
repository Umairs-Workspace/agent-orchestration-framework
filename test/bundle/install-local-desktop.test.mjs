// Traceability wiring for milestone 175 / story 01 — `install-local` builds the desktop app on
// macOS, and never edits a shell profile.
//   tasks/00_desktop-builds-and-places-the-app-bundle.feature
//   tasks/01_the-install-leaves-the-shell-alone-and-names-its-payload.feature
//
// THE PLAN IS PURE, THE ACTS ARE INJECTED (175/01 STORY notes). `planDesktopApp` is asserted on
// any host, as `planMacCodesignSteps` is; nothing here runs cargo or codesign. The two spawns of
// the real script are a `--dry-run` (which places nothing) and the payload install into an
// isolated install dir with an isolated HOME — never the operator's `~/.aof/bin` or profiles.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backupThenMove, describeDesktopStep, desktopRefusal, planDesktopApp, pruneBaks } from "../../scripts/install-local.mjs";
import { parseLaunchAgent } from "@aof/mesh/commands/desktop-launch-agent";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "install-local.mjs");
const BUNDLE = "aof-mesh-desktop.app";
const INNER = ["Contents", "MacOS", "AOF Desktop"];

// The plan's prose with this host's separators read as `/`, and the release dir as `<target>`,
// so a row reads the same on every host.
function steps(platform) {
  const release = path.join(repoRoot, "apps", "desktop", "crates", "app", "target", "release");
  return planDesktopApp({ platform, installDir: "<installDir>", stagingDir: "<staged>" }).map((step) =>
    describeDesktopStep(step).split(release).join("<target>/release").replaceAll("\\", "/"),
  );
}

function withDir(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "aof-install-local-desktop-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedBundle(at, bytes) {
  const inner = path.join(at, ...INNER);
  mkdirSync(path.dirname(inner), { recursive: true });
  writeFileSync(inner, bytes, "utf8");
  return at;
}

export const installLocalDesktopTests = [
  // ── task 00 ──────────────────────────────────────────────────────────────────────────────

  // Scenario: E1 · the darwin plan builds, assembles, then signs last
  {
    name: "175/01 task00 E1 · the darwin plan builds, assembles, then signs last, then places",
    run: () => {
      assert.deepEqual(steps("darwin"), [
        "cargo build --release --manifest-path apps/desktop/crates/app/Cargo.toml",
        "copy the built binary to <staged>/aof-mesh-desktop.app/Contents/MacOS/AOF Desktop",
        "copy apps/desktop/crates/app/Info.plist to <staged>/aof-mesh-desktop.app/Contents/Info.plist",
        "codesign --force --deep --sign - <staged>/aof-mesh-desktop.app",
        "place <staged>/aof-mesh-desktop.app at <installDir>/aof-mesh-desktop.app",
      ]);
      const plan = planDesktopApp({ platform: "darwin", installDir: "i", stagingDir: "s" });
      assert.equal(plan[1].from, path.join(repoRoot, "apps", "desktop", "crates", "app", "target", "release", "mesh-desktop-app"), "the built binary is the release one");
    },
  },

  // Scenario: E2 · linux is still refused, naming where it builds
  {
    name: "175/01 task00 E2 · linux is still refused, naming darwin and win32",
    run: () => {
      const refusal = desktopRefusal("linux");
      assert.ok(refusal, "linux is refused");
      assert.match(refusal, /darwin/);
      assert.match(refusal, /win32/);
      assert.equal(desktopRefusal("darwin"), null);
      assert.equal(desktopRefusal("win32"), null);
      // The script refuses through that function, before its dry-run plan, and exits non-zero.
      const source = readFileSync(SCRIPT, "utf8");
      assert.ok(source.indexOf("desktopRefusal(process.platform)") < source.indexOf("if (o.dryRun)"), "main() refuses before it plans");
      if (process.platform === "linux") {
        const result = spawnSync(process.execPath, [SCRIPT, "--desktop", "--dry-run"], { encoding: "utf8" });
        assert.notEqual(result.status, 0, "it exits non-zero");
        assert.match(result.stderr, /darwin/);
        assert.match(result.stderr, /win32/);
      }
    },
  },

  // Scenario: the Windows plan is unchanged
  {
    name: "175/01 task00 the Windows plan is unchanged — the release exe placed beside aof, and no codesign step",
    run: () => {
      assert.deepEqual(steps("win32"), [
        "cargo build --release --manifest-path apps/desktop/crates/app/Cargo.toml",
        "place <target>/release/mesh-desktop-app.exe at <installDir>/aof-mesh-desktop.exe",
      ]);
      assert.ok(!steps("win32").some((step) => step.includes("codesign")), "no codesign step");
    },
  },

  // Scenario: --dry-run on darwin lists the bundle steps and builds nothing
  {
    name: "175/01 task00 --dry-run on darwin lists the bundle steps and builds nothing",
    run: () =>
      withDir((dir) => {
        const installDir = path.join(dir, "bin");
        if (process.platform !== "darwin") {
          // Off a Mac the script plans for its own host; the darwin plan is the pure one above.
          assert.ok(steps("darwin").some((step) => step.includes(BUNDLE)) && steps("darwin").some((step) => step.startsWith("codesign")));
          return;
        }
        const out = execFileSync(process.execPath, [SCRIPT, "--desktop", "--skip-ui", "--dry-run", "--install-dir", installDir], { encoding: "utf8" });
        assert.match(out, /aof-mesh-desktop\.app/, "the plan names the bundle");
        assert.match(out, /codesign/, "and the signature");
        assert.equal(existsSync(installDir), false, "the install dir is unchanged — never even created");
      }),
  },

  // Scenario: E3 · a fourth re-install prunes the oldest bundle
  {
    name: "175/01 task00 E3 · a re-install over three old bundles prunes the oldest, with its whole tree",
    run: () =>
      withDir((dir) => {
        seedBundle(path.join(dir, BUNDLE), "live");
        for (const day of ["01", "02", "03"]) seedBundle(path.join(dir, `${BUNDLE}.bak.202610${day}T100000`), `old-${day}`);
        const staged = seedBundle(path.join(dir, ".desktop-staging", BUNDLE), "new");
        backupThenMove(staged, path.join(dir, BUNDLE));
        pruneBaks(dir, BUNDLE);
        const baks = readdirSync(dir).filter((entry) => entry.startsWith(`${BUNDLE}.bak.`)).sort();
        assert.equal(baks.length, 3, `three .bak bundles remain: ${baks}`);
        assert.ok(!baks.includes(`${BUNDLE}.bak.20261001T100000`), "the oldest is gone");
        assert.equal(existsSync(path.join(dir, `${BUNDLE}.bak.20261001T100000`)), false, "with its whole tree");
      }),
  },

  // Scenario: E4 · the live bundle is renamed aside, never deleted, before the new one lands
  {
    name: "175/01 task00 E4 · the live bundle is renamed aside, never deleted, before the new one lands",
    run: () =>
      withDir((dir) => {
        seedBundle(path.join(dir, BUNDLE), "v1");
        backupThenMove(seedBundle(path.join(dir, ".desktop-staging", BUNDLE), "v2"), path.join(dir, BUNDLE));
        assert.equal(readFileSync(path.join(dir, BUNDLE, ...INNER), "utf8"), "v2");
        const baks = readdirSync(dir).filter((entry) => /^aof-mesh-desktop\.app\.bak\.\d{8}T\d{6}$/.test(entry));
        assert.equal(baks.length, 1, `one .bak.<ts>: ${readdirSync(dir)}`);
        assert.equal(readFileSync(path.join(dir, baks[0], ...INNER), "utf8"), "v1", "it holds the old executable");
      }),
  },

  // Scenario: E7 · the committed Info.plist makes the app menu-bar only
  {
    name: "175/01 task00 E7 · the committed Info.plist makes the app menu-bar only, under tauri.conf.json's identifier",
    run: () => {
      const plist = parseLaunchAgent(readFileSync(path.join(repoRoot, "apps", "desktop", "crates", "app", "Info.plist"), "utf8"));
      assert.ok(plist, "the Info.plist parses");
      const conf = JSON.parse(readFileSync(path.join(repoRoot, "apps", "desktop", "crates", "app", "tauri.conf.json"), "utf8"));
      assert.equal(plist.LSUIElement, true, "LSUIElement is true");
      assert.equal(plist.CFBundleIdentifier, "com.aof.mesh.desktop");
      assert.equal(plist.CFBundleIdentifier, conf.identifier, "the identifier in tauri.conf.json");
      assert.equal(plist.CFBundleExecutable, "AOF Desktop");
    },
  },

  // ── task 01 ──────────────────────────────────────────────────────────────────────────────

  // Scenario: E5 · no shell profile is written — and the payload install stamps its build.
  // ONE real payload install serves both scenarios: it is the slow step, and both read its result.
  {
    name: "175/01 task01 E5 · a payload install writes no shell profile, and stamps the build it placed with this checkout as its source",
    run: () =>
      withDir((dir) => {
        const home = path.join(dir, "home");
        const installDir = path.join(dir, "bin");
        mkdirSync(home, { recursive: true });
        mkdirSync(installDir, { recursive: true });
        const zshrc = "# fixture zshrc\nexport FOO=1\n";
        const bashProfile = "# fixture bash_profile\n";
        writeFileSync(path.join(home, ".zshrc"), zshrc, "utf8");
        writeFileSync(path.join(home, ".bash_profile"), bashProfile, "utf8");
        // A launcher already sits in the install dir, so no SEA build runs.
        writeFileSync(path.join(installDir, process.platform === "win32" ? "aof.exe" : "aof"), "fixture-launcher", "utf8");

        execFileSync(process.execPath, [SCRIPT, "--skip-ui", "--install-dir", installDir], {
          encoding: "utf8",
          env: { ...process.env, HOME: home, USERPROFILE: home, AOF_GLOBAL_HOME: path.join(dir, "aof-home") },
          stdio: ["ignore", "pipe", "pipe"],
        });

        assert.equal(readFileSync(path.join(home, ".zshrc"), "utf8"), zshrc, ".zshrc is byte-identical");
        assert.equal(readFileSync(path.join(home, ".bash_profile"), "utf8"), bashProfile, ".bash_profile is byte-identical");
        assert.equal(existsSync(path.join(home, ".bashrc")), false, "no .bashrc was created");
        assert.equal(existsSync(path.join(home, ".profile")), false, "no .profile was created");

        const stamp = JSON.parse(readFileSync(path.join(installDir, "BUILD_ID.json"), "utf8"));
        assert.match(stamp.buildId, /^(?:[0-9a-f]{4,40}(?:\+dirty)?|unversioned)\.\d{8}T\d{6}$/, `buildId is <sha>[+dirty].<yyyymmddThhmmss>: ${stamp.buildId}`);
        assert.equal(stamp.sourceRepo, repoRoot, "its sourceRepo is this checkout");
      }),
  },

  // The structural half of E5: the profile writer is gone, not commented out (175/ADR-002 §6).
  {
    name: "175/01 task01 install-local has no path to a shell profile — ensureOnPath is deleted and nothing appends to a file",
    run: () => {
      const source = readFileSync(SCRIPT, "utf8");
      assert.doesNotMatch(source, /\bensureOnPath\b/, "ensureOnPath is deleted, not left commented out");
      assert.doesNotMatch(source, /\bappendFileSync\b/, "nothing appends to a file");
      assert.doesNotMatch(source, /\.zshrc|\.bash_profile|\.bashrc|"\.profile"/, "no profile is named");
    },
  },
];
