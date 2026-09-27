// milestone 133 / story 02 / tasks 00 + 01 — the browser ladder and the rasterizer (ADR-005 §2-§3).
//
// Pure over injected facts: `findBrowser` gets fake lookups, `rasterizeSvg` a fake spawn and a fake
// clock whose `sleep` advances time and fires the fake browser's scheduled acts. No real browser
// starts and the real Playwright cache is never read.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { browserArgv, findBrowser, rasterizeSvg } from "../../src/diagrams/rasterize.mjs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const NEW_SHELL = "chrome-headless-shell-win64/chrome-headless-shell.exe";

// Fake lookups: `present` paths exist, `dirs` answer a listing, `path` answers `which`.
function lookups({ present = [], dirs = {}, onPath = {} } = {}) {
  const calls = [];
  const exists = (file) => { calls.push(["exists", file]); return present.includes(file); };
  const list = (dir) => {
    calls.push(["list", dir]);
    if (!(dir in dirs)) throw Object.assign(new Error(`ENOENT ${dir}`), { code: "ENOENT" });
    return dirs[dir];
  };
  const which = (name) => { calls.push(["which", name]); return onPath[name] ?? null; };
  return { exists, list, which, calls };
}

const WIN = { platform: "win32", home: "H", localAppData: "L", env: {} };
const shellDir = (n) => `chromium_headless_shell-${n}`;

// A fake clock: `sleep` advances it and fires every act scheduled at or before the new time.
function fakeClock() {
  let clock = 0;
  const acts = [];
  return {
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
      for (const act of acts) if (!act.done && act.at <= clock) { act.done = true; act.fn(); }
    },
    at: (ms, fn) => acts.push({ at: ms, fn, done: false }),
  };
}

// A fake browser: `behaviour({ child, out, clock })` schedules what it does.
function fakeSpawn(clock, behaviour) {
  const calls = [];
  const spawn = (file, args) => {
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    child.killed = false;
    child.kill = () => { child.killed = true; };
    const out = args.find((arg) => arg.startsWith("--screenshot=")).slice("--screenshot=".length);
    calls.push({ file, args, child });
    behaviour({ child, out, clock });
    return child;
  };
  return { spawn, calls };
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

async function withSvg(viewBox, fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-diagram-raster-"));
  const tmp = path.join(root, "tmp");
  await mkdir(tmp);
  const svgPath = path.join(root, "d.svg");
  await writeFile(svgPath, `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><rect/></svg>`, "utf8");
  try {
    return await fn({ root, tmp, svgPath, pngPath: path.join(root, "d.png") });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const BROWSER = { ok: true, rung: "config", kind: "full", path: "C:/fake/chrome.exe" };

async function render(fx, behaviour, extra = {}) {
  const clock = fakeClock();
  const fake = fakeSpawn(clock, behaviour);
  const answer = await rasterizeSvg({
    svgPath: fx.svgPath, pngPath: fx.pngPath, browser: BROWSER, spawn: fake.spawn, now: clock.now, sleep: clock.sleep, tmp: fx.tmp, ...extra,
  });
  return { answer, clock, fake };
}

export const diagramRasterizeTests = [
  {
    name: "133/02 task 00: the first rung that exists wins — config, env, newest cached shell, Chrome, Edge, PATH",
    run: () => {
      const cache = "L/ms-playwright";
      const everything = [CHROME, EDGE, `${cache}/${shellDir(1234)}/${NEW_SHELL}`];
      const rows = [
        [{ present: ["C:/T/chrome.exe", ...everything], dirs: { [cache]: [shellDir(1234)] } }, { configured: "C:/T/chrome.exe" }, ["config", "full", "C:/T/chrome.exe"]],
        [{ present: ["D:/B/chrome-headless-shell.exe", ...everything], dirs: { [cache]: [shellDir(1234)] } }, { env: { AOF_DIAGRAM_BROWSER: "D:/B/chrome-headless-shell.exe" } }, ["env", "headless-shell", "D:/B/chrome-headless-shell.exe"]],
        [{ present: [`${cache}/${shellDir(999)}/${NEW_SHELL}`, `${cache}/${shellDir(1234)}/${NEW_SHELL}`, CHROME], dirs: { [cache]: [shellDir(999), shellDir(1234), "chromium-1234"] } }, {}, ["playwright-cache", "headless-shell", `${cache}/${shellDir(1234)}/${NEW_SHELL}`]],
        [{ present: [CHROME], dirs: { [cache]: [shellDir(1234)] } }, {}, ["chrome", "full", CHROME]],
        [{ present: [EDGE] }, {}, ["edge", "full", EDGE]],
        [{ onPath: { chromium: "/usr/bin/chromium" } }, {}, ["path", "full", "/usr/bin/chromium"]],
      ];
      for (const [world, ask, [rung, kind, file]] of rows) {
        const fake = lookups(world);
        const answer = findBrowser({ ...WIN, configured: null, ...ask, exists: fake.exists, list: fake.list, which: fake.which });
        assert.deepEqual(answer, { ok: true, rung, kind, path: file }, JSON.stringify(ask));
      }
    },
  },
  {
    name: "133/02 task 00: newest means the greatest NUMERIC suffix, and the older shell layout still counts",
    run: () => {
      const cache = "L/ms-playwright";
      const older = `${cache}/${shellDir(1000)}/chrome-win/headless_shell.exe`;
      const fake = lookups({ present: [older, `${cache}/${shellDir(999)}/${NEW_SHELL}`], dirs: { [cache]: [shellDir(999), shellDir(1000)] } });
      const answer = findBrowser({ ...WIN, exists: fake.exists, list: fake.list, which: fake.which });
      assert.deepEqual(answer, { ok: true, rung: "playwright-cache", kind: "headless-shell", path: older });
    },
  },
  {
    name: "133/02 task 00: each OS looks in its own cache root",
    run: () => {
      const rows = [
        ["win32", "L/ms-playwright", `${NEW_SHELL}`],
        ["darwin", "H/Library/Caches/ms-playwright", "chrome-headless-shell-mac-arm64/chrome-headless-shell"],
        ["linux", "H/.cache/ms-playwright", "chrome-headless-shell-linux64/chrome-headless-shell"],
      ];
      for (const [platform, root, rel] of rows) {
        const file = `${root}/${shellDir(1234)}/${rel}`;
        const fake = lookups({ present: [file], dirs: { [root]: [shellDir(1234)] } });
        const answer = findBrowser({ platform, home: "H", localAppData: "L", env: {}, exists: fake.exists, list: fake.list, which: fake.which });
        assert.equal(answer.rung, "playwright-cache", platform);
        assert.ok(answer.path.startsWith(`${root}/`), `${platform}: ${answer.path}`);
      }
    },
  },
  {
    name: "133/02 task 00: nothing found is a coded miss that says how to fix it",
    run: () => {
      const fake = lookups();
      const answer = findBrowser({ ...WIN, exists: fake.exists, list: fake.list, which: fake.which });
      assert.equal(answer.ok, false);
      assert.equal(answer.code, "diagram-png-renderer-missing");
      assert.match(answer.fix, /work\.diagrams\.browser/);
      assert.match(answer.fix, /AOF_DIAGRAM_BROWSER/);
    },
  },
  {
    name: "133/02 task 00: a pinned browser that has gone missing is heard, not skipped",
    run: () => {
      for (const [ask, pinned] of [[{ configured: "C:/gone/chrome.exe" }, "work.diagrams.browser"], [{ env: { AOF_DIAGRAM_BROWSER: "C:/gone/chrome.exe" } }, "AOF_DIAGRAM_BROWSER"]]) {
        const fake = lookups({ present: [CHROME] });
        const answer = findBrowser({ ...WIN, ...ask, exists: fake.exists, list: fake.list, which: fake.which });
        assert.equal(answer.ok, false, pinned);
        assert.equal(answer.code, "diagram-png-renderer-missing");
        assert.ok(answer.message.includes("C:/gone/chrome.exe"), "names the missing path");
        assert.ok(answer.message.includes(pinned), `names ${pinned}`);
      }
    },
  },
  {
    name: "133/02 task 00: looking is all it does — only lookups are called on the way to a miss",
    run: () => {
      const fake = lookups({ dirs: { "L/ms-playwright": [shellDir(1)] } });
      findBrowser({ ...WIN, exists: fake.exists, list: fake.list, which: fake.which });
      assert.ok(fake.calls.length > 0);
      assert.deepEqual([...new Set(fake.calls.map(([kind]) => kind))].sort(), ["exists", "list", "which"]);
    },
  },
  {
    name: "133/02 task 01: the argv — the window, the scale, an isolated profile, the output, and the SVG's URL last",
    run: () => {
      const svgPath = path.resolve(os.tmpdir(), "S.svg");
      const pngPath = path.resolve(os.tmpdir(), "O.png");
      for (const [kind, headless] of [["headless-shell", false], ["full", true]]) {
        const argv = browserArgv({ kind, width: 1000, height: 480, scale: 2, userDataDir: "U", pngPath, svgPath });
        assert.equal(argv.includes("--headless=new"), headless, kind);
        assert.equal(argv.some((arg) => arg.startsWith("--headless")), headless, `${kind}: no other headless flag`);
        for (const flag of ["--window-size=1000,480", "--force-device-scale-factor=2", "--user-data-dir=U"]) assert.ok(argv.includes(flag), flag);
        const shot = argv.find((arg) => arg.startsWith("--screenshot="));
        const out = shot.slice("--screenshot=".length);
        assert.equal(out.includes("\\"), false, "the output uses forward slashes");
        assert.ok(path.isAbsolute(out), "the output is absolute");
        assert.equal(argv.at(-1), pathToFileURL(svgPath).href);
        assert.ok(argv.at(-1).startsWith("file:///"));
        assert.equal(argv.at(-1).includes("\\"), false);
      }
    },
  },
  {
    name: "133/02 task 01: the window follows the viewBox — its width and height, rounded up",
    run: async () => {
      for (const [viewBox, size] of [["0 0 1000 480", "1000,480"], ["-20 -10 640 360", "640,360"], ["0 0 800.4 600.2", "801,601"]]) {
        await withSvg(viewBox, async (fx) => {
          const { fake } = await render(fx, ({ child, out, clock }) => clock.at(0, () => { writeFileSync(out, PNG); child.emit("exit", 0); }));
          assert.ok(fake.calls[0].args.includes(`--window-size=${size}`), `${viewBox} → ${size}`);
        });
      }
    },
  },
  {
    name: "133/02 task 01: done means exited AND written — every browser behaviour, and the profile is always removed",
    run: async () => {
      const rows = [
        ["writes then exits 0", ({ child, out, clock }) => clock.at(0, () => { writeFileSync(out, PNG); child.emit("exit", 0); }), (a) => assert.equal(a.ok, true)],
        ["exits 0 at once, writes 400 ms later (the Edge launcher)", ({ child, out, clock }) => { clock.at(0, () => child.emit("exit", 0)); clock.at(400, () => writeFileSync(out, PNG)); }, (a, clock) => { assert.equal(a.ok, true); assert.ok(clock.now() >= 400, "answered only after the file appeared"); }],
        ["exits 0 and writes a zero-byte file that never grows", ({ child, out, clock }) => clock.at(0, () => { writeFileSync(out, ""); child.emit("exit", 0); }), (a, clock) => { assert.equal(a.code, "diagram-png-render-timeout"); assert.ok(clock.now() >= 30_000); }],
        ["exits 0 and never writes", ({ child, clock }) => clock.at(0, () => child.emit("exit", 0)), (a, clock) => { assert.equal(a.code, "diagram-png-render-timeout"); assert.ok(clock.now() >= 30_000); }],
        ["never exits and never writes", () => {}, (a, clock, fake) => { assert.equal(a.code, "diagram-png-render-timeout"); assert.ok(clock.now() >= 30_000); assert.equal(fake.calls[0].child.killed, true, "the process was killed"); }],
        ["exits 1 and never writes", ({ child, clock }) => clock.at(0, () => { child.stderr.emit("data", "no display\n"); child.emit("exit", 1); }), (a) => { assert.equal(a.code, "diagram-png-render-failed"); assert.equal(a.exitCode, 1); assert.equal(a.stderr, "no display"); }],
      ];
      for (const [label, behaviour, check] of rows) {
        await withSvg("0 0 1000 480", async (fx) => {
          const { answer, clock, fake } = await render(fx, behaviour);
          check(answer, clock, fake);
          if (answer.ok) assert.equal(answer.pngPath, fx.pngPath, label);
          assert.deepEqual(readdirSync(fx.tmp), [], `${label}: the temp user-data dir no longer exists`);
        });
      }
    },
  },
  {
    name: "133/02 task 01: a stale PNG cannot satisfy the poll",
    run: async () => {
      await withSvg("0 0 1000 480", async (fx) => {
        writeFileSync(fx.pngPath, PNG);
        const { answer } = await render(fx, ({ child, clock }) => clock.at(0, () => child.emit("exit", 0)));
        assert.equal(answer.code, "diagram-png-render-timeout");
        assert.equal(existsSync(fx.pngPath), false, "no file exists at the output path");
      });
    },
  },
  {
    name: "133/02 task 01: the rasterizer renders the SVG, never the source HTML",
    run: async () => {
      await withSvg("0 0 10 10", async (fx) => {
        let spawned = false;
        await assert.rejects(
          rasterizeSvg({ svgPath: path.join(fx.root, "d.html"), pngPath: fx.pngPath, browser: BROWSER, spawn: () => { spawned = true; }, tmp: fx.tmp }),
          (error) => error.code === "diagram-png-source-not-svg",
        );
        assert.equal(spawned, false, "refused before any spawn");
      });
    },
  },
];
