import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function FF-17502 · acd-desktop-layout-one-home (milestone 175 / ADR-002 §5).
//
//   The bundle, executable, bundle-id and LaunchAgent names are spelled only in the layout
//   module, `Info.plist` and `tauri.conf.json`.
//
// Before 175 the names the install and the verbs share were spelled twice: `install-local.mjs`
// said it "mirrors" `desktop.mjs`, and the two files shared no import. A rename in one would
// leave the other placing, finding or killing a file by a name nothing uses any more, and every
// behavioural test would stay green, because each suite drives one side. Only a sweep sees it.
//
// Over the source, comments stripped:
//   1. The macOS names — the bundle, its inner `Contents/MacOS` path, the bundle id and the
//      LaunchAgents directory — appear in no `packages/*/src` module and not in
//      `scripts/install-local.mjs`, except the layout module.
//   2. The Windows names and the bare executable name appear in no `packages/*/src` module
//      except the layout module, and not in `scripts/install-local.mjs` either: 175/01 moved
//      the install onto the layout and widened this sweep over it.
//   3. The layout module does no I/O: it imports `node:path` and `node:os` and nothing that
//      reads, writes or spawns.
//   4. `desktop.mjs` takes its names from the layout and re-exports the Windows constants, so
//      the binding's `commandTools` shape is unchanged.
// Self-check (non-vacuous): a planted bundle name, bundle id and bare executable name outside
// the home each trip the detector the real tree passes.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LAYOUT = "packages/mesh/src/commands/desktop-layout.mjs";
const DESKTOP = "packages/mesh/src/commands/desktop.mjs";
const INSTALL_LOCAL = "scripts/install-local.mjs";

// The inner path is matched only with this app's executable after it: another app's bundle
// path (the SVG rasterizer's Chrome, say) is not this app's name.
const MAC_NAMES = [
  /aof-mesh-desktop\.app\b/,
  /com\.aof\.mesh\.desktop/,
  /\bLaunchAgents\b/,
  /["'`]Contents["'`]\s*,\s*["'`]MacOS["'`]\s*,\s*["'`]aof-mesh-desktop|Contents\/MacOS\/aof-mesh-desktop/,
];
const WINDOWS_AND_BARE_NAMES = [/aof-mesh-desktop\.exe/, /MicrosoftEdgeWebview2Setup\.exe/, /["'`]aof-mesh-desktop["'`]/];

const spelled = (code, names) => names.filter((name) => name.test(code)).map(String);

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") out.push(...(await sourceFiles(full)));
    else if (entry.isFile() && /\.m?js$/.test(entry.name)) out.push(full);
  }
  return out;
}

async function packageSources() {
  const files = [];
  for (const pkg of await readdir(path.join(repoRoot, "packages"), { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    const src = path.join(repoRoot, "packages", pkg.name, "src");
    try {
      files.push(...(await sourceFiles(src)));
    } catch {
      // a package with no src/ has nothing to sweep
    }
  }
  return files;
}

const code = async (rel) => stripComments(await readFile(path.join(repoRoot, rel), "utf8"));

export const archTests = [
  {
    name: "arch/175 FF-17502 (acd-desktop-layout-one-home): the desktop app's names are spelled only in the layout module, across every package source and install-local",
    run: async () => {
      const files = await packageSources();
      assert.ok(files.length > 100, `the package sources were swept (non-vacuous): ${files.length}`);
      assert.ok(files.some((file) => path.relative(repoRoot, file) === DESKTOP), "including the desktop verbs");
      const offenders = [];
      for (const file of files) {
        const rel = path.relative(repoRoot, file).split(path.sep).join("/");
        if (rel === LAYOUT) continue;
        const found = spelled(stripComments(await readFile(file, "utf8")), [...MAC_NAMES, ...WINDOWS_AND_BARE_NAMES]);
        if (found.length > 0) offenders.push({ file: rel, found });
      }
      const installLocal = spelled(await code(INSTALL_LOCAL), [...MAC_NAMES, ...WINDOWS_AND_BARE_NAMES]);
      if (installLocal.length > 0) offenders.push({ file: INSTALL_LOCAL, found: installLocal });
      assert.deepEqual(offenders, [], "no module spells a name the layout owns");

      const layout = await code(LAYOUT);
      for (const name of [...MAC_NAMES.slice(0, 3), ...WINDOWS_AND_BARE_NAMES]) {
        assert.match(layout, name, `the layout spells ${name}`);
      }
    },
  },
  {
    name: "arch/175 FF-17502 (acd-desktop-layout-one-home): the layout module is pure, and desktop.mjs takes its names from it with the commandTools shape unchanged",
    run: async () => {
      const layout = await code(LAYOUT);
      const imports = importSpecifiers(layout).map((found) => found.specifier).sort();
      assert.deepEqual(imports, ["node:os", "node:path"], "the layout imports path and os, and nothing that does I/O");
      assert.doesNotMatch(layout, /\bprocess\.platform\b/, "the platform is handed in, never read");

      const desktop = await code(DESKTOP);
      assert.match(desktop, /from "\.\/desktop-layout\.mjs"/, "desktop.mjs imports the layout");
      const layoutModule = await import(path.join(repoRoot, LAYOUT));
      const tools = _aofApplication.mesh.commandTools.mesh.desktop;
      for (const name of ["DESKTOP_APP_EXE", "WEBVIEW2_BOOTSTRAPPER", "AUTOSTART_RUN_KEY", "AUTOSTART_VALUE_NAME"]) {
        assert.equal(tools[name], layoutModule[name], `commandTools.${name} is the layout's`);
      }
      assert.equal(typeof tools.resolveDesktopInstallDir, "function", "the install-dir derivation is still a command tool");
    },
  },
  {
    name: "arch/175 FF-17502 (acd-desktop-layout-one-home): self-check — a planted bundle name, bundle id or bare executable name outside the layout trips the detector",
    run: () => {
      const all = [...MAC_NAMES, ...WINDOWS_AND_BARE_NAMES];
      assert.deepEqual(spelled('const dir = path.join(installDir, layout.placed);', all), []);
      assert.ok(spelled('const app = path.join(installDir, "aof-mesh-desktop.app");', all).length > 0, "a bundle name trips");
      assert.ok(spelled('run("launchctl", ["kickstart", `gui/${uid}/com.aof.mesh.desktop`]);', all).length > 0, "a bundle id trips");
      assert.ok(spelled('run("pgrep", ["-x", "aof-mesh-desktop"]);', all).length > 0, "a bare executable name trips");
      assert.ok(spelled('path.join(bundle, "Contents", "MacOS", "aof-mesh-desktop")', all).length > 0, "the inner path trips");
      assert.deepEqual(spelled('chrome: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]', all), [], "another app's bundle path is not this app's name");
      assert.ok(spelled('path.join(home, "Library", "LaunchAgents")', all).length > 0, "the LaunchAgents directory trips");
      assert.deepEqual(spelled('mkdtemp(path.join(os.tmpdir(), "aof-mesh-desktop-install-"))', all), [], "a temp prefix is not a name");
    },
  },
];
