// THE DIAGRAM EDITOR, SERVED AND DRIVEN IN A REAL BROWSER (milestone 170 / story 07).
//
// The headless harness stubs the editor (the canvas needs a real DOM), so nothing in the registered
// suites proves the served path: the board's link, the lazy SDK, a first draft drawn by Excalidraw's own
// Mermaid converter, a library item and free drawing saved into the scene and named in the Mermaid view,
// a proposal compiled in the browser and accepted, Publish writing the figure.
// This script does. It is a SMOKE, not a registered suite — it needs a Chromium and the
// playwright-core driver, neither of which this repository depends on — run by hand at a gate:
//
//   npm i --prefix /tmp/pw playwright-core@1.49.1          # once; any directory outside the repo
//   node test/smoke/diagram-editor.smoke.mjs --playwright /tmp/pw [--channel chrome] [--shots <dir>]
//
// It builds two throwaway projects (diagrams on, diagrams off), serves each with the real
// `aof work ui` on a free port, and drives the installed browser through them. The ARCHITECT is
// stood in for by the real CLI calls `/aof:diagram-review` makes (`--action respond|propose`), so no
// paid agent session starts unattended; a live review is a separate, human-run check.
// `apps/ui/dist` must be built (`node scripts/ui-build.mjs`).
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderDiagramBlock } from "@aof/diagrams/layout";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cli = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const argOf = (name, fallback = null) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const driverDir = argOf("playwright");
if (!driverDir) { console.error("usage: node test/smoke/diagram-editor.smoke.mjs --playwright <dir holding node_modules/playwright-core> [--channel chrome] [--shots <dir>]"); process.exit(2); }
const { chromium } = createRequire(path.join(path.resolve(driverDir), "noop.js"))("playwright-core");
if (!existsSync(path.join(repoRoot, "apps", "ui", "dist", "index.html"))) { console.error("apps/ui/dist is not built: run node scripts/ui-build.mjs"); process.exit(2); }

const work = mkdtempSync(path.join(os.tmpdir(), "aof-diagram-smoke-"));
const shots = argOf("shots") ?? path.join(work, "shots");
mkdirSync(shots, { recursive: true });
const FILE = "ADR-002-scene.excalidraw";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect x="20" y="40" width="160" height="80" fill="#dbe7f3" stroke="#1f3a5f"/><text x="100" y="86" text-anchor="middle" font-family="sans-serif" font-size="16">old figure</text></svg>';
const META = process.platform === "darwin" ? "Meta" : "Control";

// One library element, as the sets from the public site write them.
const part = (id, type, x, y, w, h, extra = {}) => ({ id, type, x, y, width: w, height: h, angle: 0, strokeColor: "#0078d4", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: 7, version: 1, versionNonce: 7, isDeleted: false, boundElements: null, link: null, locked: false, ...extra });

function project(name, diagrams) {
  const root = path.join(work, name);
  const item = path.join(root, "wiki/work/07_milestone_scene");
  mkdirSync(path.join(root, ".aof"), { recursive: true });
  mkdirSync(path.join(item, "diagrams"), { recursive: true });
  writeFileSync(path.join(root, ".aof/aof.config.json"), JSON.stringify({ name: `smoke-${name}`, resources: [], work: { dir: "./wiki/work", ...(diagrams ? { diagrams } : {}) } }));
  writeFileSync(path.join(item, "SPEC.md"), "---\ntype: milestone\nnumber: 07\nslug: scene\ntitle: The scene seam\nstatus: in-progress\nschema: 1\n---\n# The scene seam\n");
  const block = renderDiagramBlock({ adrId: "ADR-002", title: "the scene seam", stem: "ADR-002-scene", sourceExt: ".excalidraw", formats: ["svg"] });
  // A project library with one item of three loose elements — as libraries from the public site often are.
  mkdirSync(path.join(root, ".aof/diagrams/libraries"), { recursive: true });
  writeFileSync(path.join(root, ".aof/diagrams/libraries/azure.excalidrawlib"), JSON.stringify({ type: "excalidrawlib", version: 2, source: "smoke", libraryItems: [{ id: "fn", status: "unpublished", created: 1, name: "Function App", elements: [
    part("p1", "rectangle", 0, 0, 60, 60, { backgroundColor: "#cce4f6", roundness: { type: 3 } }),
    part("p2", "line", 15, 15, 30, 30, { points: [[0, 0], [30, 30]] }),
    part("p3", "line", 15, 45, 30, 30, { points: [[0, 0], [30, -30]] }),
  ] }] }));
  writeFileSync(path.join(item, "ARCHITECTURE.md"), `# Architecture\n\n## ADR-002 — the scene seam\n\nThe API writes through the store.\n\n### Diagram\n\nAn API box and a Store box, the API writing to the store.\n\n${block}\n`);
  writeFileSync(path.join(item, "diagrams/ADR-002-scene.svg"), SVG);
  return { root, item, diagram: path.join(item, "diagrams", FILE) };
}

const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once("error", reject); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const home = path.join(work, "global");
const env = { ...process.env, AOF_GLOBAL_HOME: home };
// 172/02: the board's headless architect session is the stand-in, launched through the one test seam
// (172/ADR-001 §5). It answers the notes the 172/02 checks ask, records them with the real CLI, and
// only acknowledges the rest — the older checks record their own answers — leaving the session then,
// so a later ask starts a fresh one. What it was handed is read from its log.
const architectLog = path.join(work, "stand-in-architect.jsonl");
const ARCHITECT = {
  AOF_ARCHITECT_EXECUTABLE: path.join(repoRoot, "test", "smoke", "stand-in-architect.mjs"),
  STAND_IN_LOG: architectLog, STAND_IN_RESPOND_TO: "re-stamp|watch cannot start", STAND_IN_EXIT_NOTED: "1",
};
const architectSaw = () => (existsSync(architectLog) ? readFileSync(architectLog, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
const architectReceived = () => architectSaw().filter((entry) => "received" in entry).map((entry) => entry.received);
async function serve(fixture, extra = {}) {
  const port = await freePort();
  const child = spawn(process.execPath, [cli, "work", "ui", "--port", String(port), "--target", fixture.root], { env: { ...env, ...extra }, stdio: "ignore" });
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) {
    try { if ((await fetch(`${origin}/api/diagram/capability`)).ok) return { origin, child }; } catch { /* not listening yet */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill(); throw new Error(`the board for ${fixture.root} did not answer on ${origin}`);
}
// The architect's side, through the very CLI calls the review command makes.
function scene(fixture, action, input = null) {
  const args = [cli, "diagram", "scene", "07", FILE, "--action", action, "--json"];
  if (input) { const file = path.join(work, `input-${action}.json`); writeFileSync(file, JSON.stringify(input)); args.push("--input", file); }
  const result = spawnSync(process.execPath, args, { cwd: fixture.root, env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`aof diagram scene --action ${action}: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "ok  " : "FAIL"} - ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(name);
}
const waitForText = (page, text, timeout = 15000) => page.getByText(text, { exact: false }).first().waitFor({ timeout });
const diagramText = (fixture) => readFileSync(fixture.diagram, "utf8");
// 172/01 (ADR-003): every conversation is read in the panel beside the canvas — its composer, its
// thread cards and its Proposals tab. A proposal's card shows in its open thread or on that tab.
const composer = (page) => page.locator("#architect-request");
const proposalsTab = (page) => page.getByRole("tab", { name: /^Proposals/ });
const conversationsTab = (page) => page.getByRole("tab", { name: /^Conversations/ });
const openThread = (page) => page.locator("[data-aof-thread][data-open]");

async function openFigure(page, origin) {
  await page.goto(`${origin}/board#07`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^ARCHITECTURE$/ }).or(page.getByRole("tab", { name: /ARCHITECTURE/ })).or(page.getByText("ARCHITECTURE", { exact: true })).first().click({ timeout: 15000 });
  const figure = page.locator("button[data-diagram-expand]").first();
  await figure.waitFor({ timeout: 15000 });
  await figure.click();
  await page.getByRole("button", { name: "Close diagram" }).waitFor({ timeout: 10000 });
}
// A point on the canvas, as a fraction of the editor's canvas area.
async function canvasPoint(page, fx, fy) {
  const area = await page.locator(".excalidraw").first().boundingBox();
  return { x: area.x + area.width * fx, y: area.y + area.height * fy };
}

// The diagrams-on project names a copy of this repository's style guide, so drafts and hand-drawn
// shapes start in the house style (171/03).
const on = project("on", { generator: "diagram-design", formats: ["svg", "png"], style: "style.md" });
writeFileSync(path.join(on.root, "style.md"), readFileSync(path.join(repoRoot, ".aof", "diagrams", "style.md"), "utf8"));
// 172/04 (F-171-03): a copy of the very scene the right-click skew was seen on at 171's `@uat` — its
// 36 elements, its figure and its review records (so the overlay draws the pins it drew then).
const SKEW = "ADR-003-push-stream";
// Live in the stream, or under `archive/` once `aof:archive` has moved it — the folder name is verbatim.
const skewSource = ["", "archive"].map((under) => path.join(repoRoot, "wiki", "work", under, "171_milestone_excalidraw-phase-2", "diagrams")).find((dir) => existsSync(dir));
for (const ext of [".excalidraw", ".svg", ".review"]) cpSync(path.join(skewSource, `${SKEW}${ext}`), path.join(on.item, "diagrams", `${SKEW}${ext}`), { recursive: true });
const skewSaved = JSON.parse(readFileSync(path.join(skewSource, `${SKEW}.excalidraw`), "utf8")).elements.filter((e) => !e.isDeleted);
const skewShape = (mermaidId) => skewSaved.find((e) => e.customData?.aof?.id === mermaidId && e.type !== "text");
// The architect-session → review-store edge, its label ("3 writes a record") and the store's box.
const SKEW_STORE = skewShape("store");
const SKEW_EDGE = skewSaved.find((e) => e.type === "arrow" && e.startBinding?.elementId === skewShape("architect").id && e.endBinding?.elementId === SKEW_STORE.id);
const SKEW_LABEL = skewSaved.find((e) => e.type === "text" && e.containerId === SKEW_EDGE.id);
const SKEW_FRAME = skewSaved.find((e) => e.type === "frame");

// The live scene and the drawn canvas, read from the SDK's own App instance — the editor exposes no
// handle and the smoke adds none to it. The STATIC canvas holds the drawing alone: the selection
// outline and the context menu paint elsewhere, so a pixel that moved there is the drawing moving.
const liveCanvas = (page) => page.evaluate(() => {
  const host = document.querySelector(".excalidraw");
  const key = host && Object.keys(host).find((k) => k.startsWith("__reactFiber$"));
  for (let fiber = key ? host[key] : null; fiber; fiber = fiber.return) {
    const app = fiber.stateNode;
    if (!app?.scene?.getNonDeletedElements || !app.state?.zoom) continue;
    const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = app.state;
    return { view: { scrollX, scrollY, zoom: zoom.value, offsetLeft, offsetTop }, elements: app.scene.getNonDeletedElements().map((e) => ({ id: e.id, type: e.type, x: e.x, y: e.y, width: e.width, height: e.height, points: e.points ?? null, containerId: e.containerId ?? null, text: e.text ?? null })) };
  }
  return null;
});
// The static canvas's pixels, carried out of the page so two loads can be compared.
const drawnPixels = (page) => page.evaluate(() => {
  const canvas = document.querySelector(".excalidraw canvas.excalidraw__canvas:not(.interactive)");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let binary = "";
  for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000));
  return btoa(binary);
}).then((base64) => Buffer.from(base64, "base64"));
// The share of pixels that differ between two snapshots (1 when the canvas changed size).
const drawnDiff = (a, b) => {
  if (a.length !== b.length) return 1;
  let differ = 0;
  for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) differ += 1;
  return differ / (a.length / 4);
};
// Every arrow's points and position, and every label's container and position, that differ from the
// saved scene's — the scene-level half, which points at a different cause than a render-only skew.
const sceneDrift = (live) => {
  const round = (n) => Math.round(n * 100) / 100;
  const shape = (e) => e.type === "arrow" ? JSON.stringify([round(e.x), round(e.y), e.points.map(([x, y]) => [round(x), round(y)])]) : e.type === "text" ? JSON.stringify([e.containerId, round(e.x), round(e.y)]) : null;
  const now = new Map(live.elements.map((e) => [e.id, e]));
  return skewSaved.filter((e) => shape(e) != null && (!now.has(e.id) || shape(now.get(e.id)) !== shape(e))).map((e) => e.id);
};
// A scene point on the page, through the view the SDK draws with.
const onPage = ({ view }, x, y) => ({ x: (x + view.scrollX) * view.zoom + view.offsetLeft, y: (y + view.scrollY) * view.zoom + view.offsetTop });
// A point of canvas well clear of every element, the overlay's pins and the SDK's own toolbars.
async function emptyCanvas(page, live) {
  const area = await page.locator(".excalidraw").first().boundingBox();
  const boxes = live.elements.map((e) => { const a = onPage(live, e.x, e.y); return { x0: a.x, y0: a.y, x1: a.x + e.width * live.view.zoom, y1: a.y + e.height * live.view.zoom }; });
  for (let fy = 0.3; fy <= 0.8; fy += 0.05) for (let fx = 0.2; fx <= 0.8; fx += 0.05) {
    const p = { x: area.x + area.width * fx, y: area.y + area.height * fy };
    if (boxes.every((b) => p.x < b.x0 - 40 || p.x > b.x1 + 40 || p.y < b.y0 - 40 || p.y > b.y1 + 40)) return p;
  }
  throw new Error("no empty canvas clear of the scene");
}
const settleDrawing = (page) => page.waitForTimeout(400).then(() => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
const PAPER = "#f3f5f7";
const INK = "#1b1f27";
const element = (fixture, mermaidId, type) => stored(fixture).elements.find((e) => e.customData?.aof?.id === mermaidId && (!type || e.type === type) && !e.isDeleted);
const off = project("off", undefined);
const servers = [];
const browser = await chromium.launch({ channel: argOf("channel", "chrome"), headless: true });
let failed = false;
const view = (fixture) => scene(fixture, "context", { selectedIds: [] }).view;
const stored = (fixture) => JSON.parse(readFileSync(fixture.diagram, "utf8"));
try {
  const ON = (servers[servers.push(await serve(on, ARCHITECT)) - 1]).origin;
  const OFF = (servers[servers.push(await serve(off)) - 1]).origin;
  // ── 172/04 (F-171-03): a right-click leaves the drawing true ───────────────────────────────
  // Reproduced FIRST, then checked: each gesture the operator could have made at 171's `@uat` is
  // driven over a copy of that scene, measured before and after (the static canvas's pixels, and every
  // arrow and label against the saved scene), and every measurement is logged before any check runs,
  // so one gesture that reproduces the skew does not hide what the others did.
  {
    // At a device pixel ratio of 2, as the operator's display drew it.
    const skewPage = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
    const openSkew = async () => {
      await skewPage.goto(`${ON}/diagram?ref=07&file=${SKEW}.svg`, { waitUntil: "load" });
      await skewPage.locator(".excalidraw canvas").first().waitFor({ timeout: 30000 });
      await skewPage.locator("header [role=status]").filter({ hasText: /^Saved$/ }).first().waitFor({ timeout: 30000 });
      await settleDrawing(skewPage);
      return liveCanvas(skewPage);
    };
    const menu = skewPage.locator(".context-menu");
    // Which menu a right-click opened: an element's offers Delete, the canvas's does not.
    const hits = {};
    const rightClick = async (point, name = null) => {
      await skewPage.mouse.click(point.x, point.y, { button: "right" });
      await menu.waitFor({ timeout: 5000 });
      if (name) hits[name] = await menu.getByText("Delete", { exact: true }).count() > 0;
    };
    const escape = async () => { await skewPage.keyboard.press("Escape"); await menu.waitFor({ state: "detached", timeout: 5000 }); };
    const centreOf = (live, id) => { const e = live.elements.find((el) => el.id === id); return onPage(live, e.x + e.width / 2, e.y + e.height / 2); };
    // `fit` brings the whole drawing into view first (the SDK's own Shift+1), as the operator had it, so a
    // gesture aimed at a shape lands on it rather than under the panel; the keys need the canvas focused.
    const measure = async (name, gesture, { fit = false } = {}) => {
      let live = await openSkew();
      if (fit) {
        const empty = await emptyCanvas(skewPage, live);
        await skewPage.mouse.click(empty.x, empty.y);
        await skewPage.keyboard.press("Shift+Digit1");
        await settleDrawing(skewPage);
        live = await liveCanvas(skewPage);
      }
      const before = await drawnPixels(skewPage);
      await skewPage.locator(".excalidraw").first().screenshot({ path: path.join(shots, `172-04-${name}-before.png`) });
      await gesture(live);
      // The selection a right-click on a shape makes is cleared (Escape does not clear a line's), so the
      // screenshots show the drawing alone; the static canvas never held the outline either way.
      const clear = await emptyCanvas(skewPage, await liveCanvas(skewPage));
      await skewPage.mouse.click(clear.x, clear.y);
      await settleDrawing(skewPage);
      const drawn = await drawnPixels(skewPage);
      await skewPage.locator(".excalidraw").first().screenshot({ path: path.join(shots, `172-04-${name}-after.png`) });
      const after = await liveCanvas(skewPage);
      const result = { name, loaded: sceneDrift(live), drift: sceneDrift(after), pixels: drawnDiff(before, drawn), after, drawn };
      console.log(`     right-click: ${name} — ${(result.pixels * 100).toFixed(3)}% of the drawing's pixels changed; ${result.drift.length} element(s) off the saved scene after (${result.loaded.length} at load)${result.drift.length ? ` ${JSON.stringify(result.drift)}` : ""}`);
      return result;
    };
    const e1 = await measure("E1-empty-canvas", async (live) => { await rightClick(await emptyCanvas(skewPage, live)); await escape(); });
    const e2 = await measure("E2-edge-label", async (live) => { await rightClick(centreOf(live, SKEW_LABEL.id), "label"); await escape(); }, { fit: true });
    const e3 = await measure("E3-copy", async (live) => {
      await rightClick(centreOf(live, SKEW_STORE.id), "store");
      await menu.getByText("Copy", { exact: true }).first().click();
      await menu.waitFor({ state: "detached", timeout: 5000 });
      const empty = await emptyCanvas(skewPage, live);
      await skewPage.mouse.click(empty.x, empty.y);
    }, { fit: true });
    const body = await measure("arrow-body", async (live) => {
      const arrow = live.elements.find((e) => e.id === SKEW_EDGE.id);
      const [[x0, y0], [x1, y1]] = arrow.points;
      await rightClick(onPage(live, arrow.x + x0 + (x1 - x0) * 0.3, arrow.y + y0 + (y1 - y0) * 0.3), "arrow");
      await escape();
    }, { fit: true });
    // A frame is selected by its name, drawn just above its top-left corner.
    const frame = await measure("frame-name", async (live) => {
      const corner = onPage(live, SKEW_FRAME.x, SKEW_FRAME.y);
      await rightClick({ x: corner.x + 12, y: corner.y - 8 }, "frame");
      await escape();
    }, { fit: true });
    // E4: a pan of 100 px and one zoom step, after a right-click — compared with the same pan and zoom
    // on a fresh load, since the view itself moves.
    const panAndZoom = async (live) => {
      const empty = await emptyCanvas(skewPage, live);
      await skewPage.mouse.click(empty.x, empty.y);
      await skewPage.mouse.wheel(0, 100);
      await skewPage.keyboard.press(`${META}+Equal`);
      await settleDrawing(skewPage);
    };
    const plain = await measure("E4-pan-zoom-alone", panAndZoom);
    const e4 = await measure("E4-pan-zoom-after-right-click", async (live) => { await rightClick(await emptyCanvas(skewPage, live)); await escape(); await panAndZoom(live); });
    const e4pixels = drawnDiff(plain.drawn, e4.drawn);
    console.log(`     right-click: E4 — the view after is ${JSON.stringify(e4.after.view)} (alone: ${JSON.stringify(plain.after.view)}); ${(e4pixels * 100).toFixed(3)}% of its pixels differ from the same pan and zoom with no right-click`);

    // The measures are not vacuous: each shape gesture opened that shape's own menu, a pan moves the
    // drawn pixels, and the drift measure names a label moved by 5 px.
    const nudged = { elements: skewSaved.map((e) => (e.id === SKEW_LABEL.id ? { ...e, x: e.x + 5 } : e)) };
    check("right-click: self-check — every shape gesture opened its element's menu, the pan moved pixels, and a moved label is named", Object.values(hits).length === 4 && Object.values(hits).every(Boolean) && plain.pixels > 0.01 && JSON.stringify(sceneDrift(nudged)) === JSON.stringify([SKEW_LABEL.id]), JSON.stringify({ hits, pan: plain.pixels }));
    check("right-click: 172/04 E1 a right-click on empty canvas and Escape leave the drawing and every arrow as saved", e1.pixels < 0.005 && e1.drift.length === 0, `${(e1.pixels * 100).toFixed(3)}% · ${JSON.stringify(e1.drift)}`);
    const label = e2.after.elements.find((e) => e.id === SKEW_LABEL.id);
    check("right-click: 172/04 E2 a right-click on an edge's label leaves it on the architect-session → review-store edge, and no other label moves", label?.containerId === SKEW_EDGE.id && e2.pixels < 0.005 && e2.drift.length === 0, `${JSON.stringify(SKEW_LABEL.text)} on ${label?.containerId} · ${(e2.pixels * 100).toFixed(3)}% · ${JSON.stringify(e2.drift)}`);
    check("right-click: 172/04 E3 Copy from the menu, then a click on empty canvas, moves nothing", e3.pixels < 0.005 && e3.drift.length === 0, `${(e3.pixels * 100).toFixed(3)}% · ${JSON.stringify(e3.drift)}`);
    check("right-click: 172/04 a right-click on an arrow's body leaves the drawing as saved", body.pixels < 0.005 && body.drift.length === 0, `${(body.pixels * 100).toFixed(3)}% · ${JSON.stringify(body.drift)}`);
    check("right-click: 172/04 a right-click on a frame's name leaves the drawing as saved", frame.pixels < 0.005 && frame.drift.length === 0, `${(frame.pixels * 100).toFixed(3)}% · ${JSON.stringify(frame.drift)}`);
    check("right-click: 172/04 E4 a pan and a zoom after a right-click draw exactly what they draw without one", e4pixels < 0.005 && e4.drift.length === 0 && JSON.stringify(e4.after.view) === JSON.stringify(plain.after.view), `${(e4pixels * 100).toFixed(3)}% · ${JSON.stringify(e4.drift)}`);
    await skewPage.context().close();
  }

  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));

  // ── the board links to the editor and loads none of it ────────────────────────────────────
  await openFigure(page, ON);
  const edit = page.getByRole("link", { name: "Edit draft" });
  check("board: the viewer offers Edit draft as a link to /diagram", (await edit.getAttribute("href")) === "/diagram?ref=07&file=ADR-002-scene.svg");
  check("board: no SDK chunk is loaded before Edit draft", !requests.some((url) => /excalidraw|mermaid/i.test(url)));

  // ── an empty diagram: a first draft is offered; Save writes the canonical scene ────────────
  await edit.click();
  await page.waitForURL(/\/diagram\?ref=07&file=ADR-002-scene\.svg$/, { timeout: 15000 });
  await page.locator(".excalidraw canvas").first().waitFor({ timeout: 30000 });
  await waitForText(page, "This diagram is empty", 30000);
  check("editor: an empty diagram renders with the first-draft offer", await page.getByRole("button", { name: "Request a first draft" }).count() === 1);
  check("editor: the nav lists four items, none current", (await page.locator('nav[aria-label="Surfaces"] a, nav[aria-label="Surfaces"] [data-nav-item]').count()) === 4 && (await page.locator('nav[aria-label="Surfaces"] [aria-current]').count()) === 0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForText(page, "Saved.");
  check("editor: Save writes an Excalidraw scene file", stored(on).type === "excalidraw" && Array.isArray(stored(on).elements));

  // ── a first draft: the architect proposes Mermaid; Accept draws it with the converter ──────
  let current = scene(on, "read");
  const { request: draftRequest } = scene(on, "request", { baseRevision: current.revision, selectedIds: [], request: "Draw a first draft of this diagram from its ADR and diagram brief." });
  const draftContext = scene(on, "context", { requestId: draftRequest.id });
  check("architect: the context offers the project library items by name", JSON.stringify(draftContext.libraries) === JSON.stringify(['azure/"Function App"']));
  scene(on, "propose", { requestId: draftRequest.id, baseRevision: current.revision, summary: "First draft from ADR-002", rationale: "The brief names an API that writes through a store.", text: 'flowchart LR\n  API["API"] -->|"writes"| Store[("Store")]\n' });
  // `load`, never `networkidle`, on the editor: it holds its review stream open (171/ADR-003).
  await page.reload({ waitUntil: "load" });
  await proposalsTab(page).click();
  await page.getByRole("button", { name: /^Accept proposal: First draft/ }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /^Preview proposal: First draft/ }).click();
  await waitForText(page, "only adds to the diagram");
  await page.getByRole("button", { name: /^Accept proposal: First draft/ }).click();
  await waitForText(page, "Proposal accepted", 30000);
  check("draft: Accept draws the proposal and the scene reads back as it", /API\["API"\]/.test(view(on)) && /Store\["Store"\]/.test(view(on)) && /API -->\|"writes"\| Store/.test(view(on)), view(on).split("\n").slice(2, 6).join(" | "));
  const apiBox = element(on, "API", "rectangle");
  const apiLabel = stored(on).elements.find((e) => e.type === "text" && e.containerId === apiBox?.id);
  check("house style: the accepted first draft is stored in the house style — paper fill, ink stroke, ink label", /style API fill:#f3f5f7,stroke:#1b1f27,color:#1b1f27/.test(view(on)) && apiBox?.backgroundColor === PAPER && apiBox?.strokeColor === INK && apiLabel?.strokeColor === INK, JSON.stringify({ fill: apiBox?.backgroundColor, stroke: apiBox?.strokeColor, label: apiLabel?.strokeColor }));
  check("draft: the first-draft offer is gone once the diagram holds shapes", await page.getByRole("button", { name: "Request a first draft" }).count() === 0);
  check("172/01 · E12 a decided proposal shows its outcome in place of its actions", await page.locator("[data-aof-proposal-outcome]").filter({ hasText: /^Accepted \d\d:\d\d$/ }).count() === 1);
  await conversationsTab(page).click();
  await page.screenshot({ path: path.join(shots, "01-first-draft-accepted.png") });

  // ── the person adds a library item and free drawing: both save, and the view names them ─────
  // The SDK's own Library panel: its trigger, then a click on an item inserts it (the panel's `onClick`).
  // Nothing may be selected first — with a selection the panel leads with an "add selection" unit.
  const empty = await canvasPoint(page, 0.12, 0.85);
  await page.mouse.click(empty.x, empty.y);
  await page.keyboard.press("Escape");
  await page.locator(".default-sidebar-trigger").first().click();
  const unit = page.locator(".library-unit__active .library-unit__dragger:not(.library-unit__pulse)").first();
  await unit.waitFor({ timeout: 15000 });
  await unit.click();
  // Focus back in the canvas (the panel holds it), then the freehand tool.
  await page.mouse.click(empty.x, empty.y);
  await page.keyboard.press("Escape");
  await page.keyboard.press("7");
  // Clear of the left properties panel and the shapes, or the stroke never reaches the canvas.
  const a = await canvasPoint(page, 0.6, 0.72);
  const b = await canvasPoint(page, 0.75, 0.82);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForText(page, "Saved.");
  const drawn = view(on);
  const libLine = /%% aof:lib (\w+) azure\/"Function App"/.exec(drawn);
  check("library: an item clicked in from the panel is saved and named in the Mermaid view by library and item", Boolean(libLine), libLine?.[0] ?? drawn);
  check("sketch: free drawing is saved, not refused, and named as a sketch", /%% aof:sketch \w+ "freedraw/.test(drawn), (/%% aof:sketch.*/.exec(drawn) ?? [""])[0]);
  await page.screenshot({ path: path.join(shots, "02-library-and-sketch.png") });

  // ── notes: one withdrawn, two answered by one batch review ─────────────────────────────────
  const dockBefore = await page.locator(".xterm").count();
  await composer(page).fill("Should the store be a queue instead?");
  await page.getByRole("button", { name: "Save as note" }).click();
  await waitForText(page, "Note recorded.");
  check("note: Save as note records the note and starts no session", (await page.locator(".xterm").count()) === dockBefore && scene(on, "proposals").requests.some((request) => request.status === "open" && request.request.startsWith("Should the store")));
  await openThread(page).getByText("Should the store be a queue instead?").waitFor({ timeout: 10000 });
  check("172/01 · E10 a saved note's thread opens in the panel and reads \"Waiting for the architect\"", (await openThread(page).innerText()).includes("Waiting for the architect"));
  await page.getByRole("button", { name: /^Withdraw note: Should the store/ }).click();
  await waitForText(page, "Note withdrawn.");
  for (const text of ["Why does the API write directly to the store?", "Call the API the gateway, and add an Azure Function that the store triggers."]) {
    await composer(page).fill(text);
    await page.getByRole("button", { name: "Save as note" }).click();
    await waitForText(page, "Note recorded.");
  }
  await waitForText(page, "2 notes waiting", 15000);

  // The batch review, as `/aof:diagram-review 07 ADR-002-scene.excalidraw` runs it: every open note, oldest first.
  const open = scene(on, "proposals").requests.filter((request) => request.status === "open").reverse();
  const ctx = scene(on, "context", { requestId: open[1].id });
  scene(on, "respond", { requestId: open[0].id, answer: "Because ADR-002 keeps one writer: the API owns every write, so the store has no second path in." });
  const edited = ctx.view.replace('API["API"]', 'API["Gateway"]').replace("  API -->", '  Trigger["Order events"]\n  API -->').replace(/\n$/, '\n  Store --> Trigger\n  %% aof:lib Trigger azure/"Function App"\n');
  const proposed = scene(on, "propose", { requestId: open[1].id, baseRevision: ctx.revision, summary: "Gateway and a store trigger", rationale: "Renames the API and adds the Function the store triggers.", text: edited });
  check("batch: the proposal's changes are the rename, the new library node and its edge", JSON.stringify(proposed.proposal.changes.map((c) => c.key).sort()) === JSON.stringify(["edge:Store->Trigger#1", "lib:Trigger", "node:API", "node:Trigger"]), JSON.stringify(proposed.proposal.changes));
  await waitForText(page, "the API owns every write", 20000);
  check("batch: the answer appears in the panel on its own (the editor is told, or polls)", true);
  await page.getByRole("button", { name: /^Accept proposal: Gateway and a store trigger/ }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /^Accept proposal: Gateway and a store trigger/ }).click();
  await waitForText(page, "Proposal accepted", 30000);
  const after = view(on);
  check("batch: Accept compiles the rename, the library item and the edge, and the scene reads back as the proposal", /API\["Gateway"\]/.test(after) && /%% aof:lib Trigger azure\/"Function App"/.test(after) && /Store --> Trigger/.test(after), after.split("\n").filter((l) => /Gateway|Trigger/.test(l)).join(" | "));
  check("batch: the person's own library item and drawing are untouched", after.includes(libLine[0]) && /%% aof:sketch \w+ "freedraw/.test(after));
  check("batch: no note is left to review", await page.getByRole("button", { name: "Review notes" }).count() === 0);
  await page.screenshot({ path: path.join(shots, "03-proposal-accepted.png") });

  // ── Publish: the figure the ADR shows is exported from this canvas ─────────────────────────
  await page.getByRole("button", { name: "Publish figure" }).click();
  await waitForText(page, "Diagram published.", 60000);
  const svg = readFileSync(path.join(on.item, "diagrams", "ADR-002-scene.svg"), "utf8");
  const png = readFileSync(path.join(on.item, "diagrams", "ADR-002-scene.png"));
  check("publish: the SVG the ADR links is the editor's export, and the owed PNG is written", svg.includes("<svg") && !svg.includes("old figure") && png.subarray(1, 4).toString() === "PNG", `${svg.length} B svg, ${png.length} B png`);
  check("publish: the status line says the saved diagram is published", (await page.locator("header [role=status]").first().innerText()) === "Saved and published");
  // F-172-16: the ADR already links the figure, so the notice says only that it published, and no block is handed over.
  check("publish: 172/02 task04 E1 · the notice says the diagram was published, with no block to paste", (await page.locator("[data-aof-editor-notice]").innerText()) === "Diagram published." && await page.getByLabel("ADR diagram block").count() === 0 && await page.getByRole("button", { name: "Copy block" }).count() === 0);
  await page.screenshot({ path: path.join(shots, "04-published.png") });

  // ── 171/00: Ask architect at the selection, on the drawn canvas ─────────────────────────────
  // A box drawn at a known place is selected as it is drawn, so the action is measured against where
  // the box is. A pan moves the box by the wheel's delta, and a zoom about a point keeps that point
  // fixed — so with the cursor on the box's top-centre, both have a known answer.
  const action = page.locator("[data-aof-canvas-action=ask]");
  const barAsk = page.locator('button[aria-label="Ask architect"]');
  const near = (a, b) => Math.abs(a - b) <= 3;
  const sitsAbove = async (top) => { const r = await action.boundingBox(); return r && near(r.x + r.width / 2, top.x) && near(r.y + r.height, top.y - 8) ? r : null; };
  // Points of its own, clear of the shapes and of the SDK's panels on this (now shorter) canvas.
  const clear = await canvasPoint(page, 0.8, 0.2);
  await page.mouse.click(clear.x, clear.y);
  await page.keyboard.press("Escape");
  check("canvas: with nothing selected no action is drawn, and the panel's composer offers Save as note and Ask", await action.count() === 0 && await page.getByRole("button", { name: "Save as note" }).count() === 1 && await barAsk.count() === 1, `${await action.count()} actions`);
  const composerLabel = () => page.locator("[data-aof-composer] label").first().innerText();
  check("172/01 · E9 with nothing selected the composer asks about the whole diagram", (await composerLabel()) === "Ask the architect · about the whole diagram", await composerLabel());
  check("172/01 · the review list and the note bar are gone from under the canvas, and no thread popover exists", await page.locator('[aria-label="Architect review"]').count() === 0 && await page.getByRole("button", { name: "Add note" }).count() === 0 && await page.locator("[data-aof-note-thread]").count() === 0);
  // Clear of the properties panel the rectangle tool opens on the left — the canvas is narrower beside
  // the conversation panel (172/01) — and of the shapes already drawn.
  const p = await canvasPoint(page, 0.32, 0.74);
  const q = await canvasPoint(page, 0.42, 0.84);
  await page.keyboard.press("r");
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps: 6 }); await page.mouse.up();
  await action.waitFor({ timeout: 10000 });
  let top = { x: (p.x + q.x) / 2, y: p.y };
  const drawnAt = await sitsAbove(top);
  check("canvas: a selected box offers one Ask architect, centred just above it", Boolean(drawnAt) && await action.count() === 1 && await page.locator("[data-aof-canvas-overlay]").getByText("Save as note").count() === 0, JSON.stringify({ action: await action.boundingBox(), top }));
  const islands = await page.locator(".excalidraw .Island").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()).filter((r) => r.width && r.height).map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })));
  const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  check("canvas: the action is clear of Excalidraw's own panels", islands.length > 0 && !islands.some((island) => overlaps(drawnAt, island)), `${islands.length} panels`);
  await page.screenshot({ path: path.join(shots, "06-ask-at-selection.png") });
  await page.mouse.move(top.x, top.y);
  await page.mouse.wheel(0, -60);
  top = { x: top.x, y: top.y + 60 };
  await page.waitForTimeout(300);
  check("canvas: the action follows the box on a pan", Boolean(await sitsAbove(top)), JSON.stringify({ action: await action.boundingBox(), top }));
  // A zoom about the top-centre leaves that point — and so the action — where it was; the zoom
  // readout is what shows the canvas really zoomed, and the box's drawn width what shows by how much.
  const zoomShown = () => page.locator(".excalidraw .reset-zoom-button").first().innerText();
  const zoomBefore = await zoomShown();
  await page.mouse.move(top.x, top.y);
  await page.keyboard.down("Control"); await page.mouse.wheel(0, -100); await page.keyboard.up("Control");
  await page.waitForTimeout(300);
  const zoomAfter = await zoomShown();
  check("canvas: the action follows the box on a zoom", zoomAfter !== zoomBefore && Boolean(await sitsAbove(top)), JSON.stringify({ zoomBefore, zoomAfter, action: await action.boundingBox(), top }));
  await page.screenshot({ path: path.join(shots, "07-ask-after-pan-and-zoom.png") });
  // DESIGN's second breakpoint. The canvas keeps its scroll, so the box keeps its place in the
  // canvas; only the canvas itself may move on the page as the header reflows.
  const canvasAt = async () => page.locator(".excalidraw").first().boundingBox();
  const wide = await canvasAt();
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(500);
  const narrow = await canvasAt();
  const topAt768 = { x: top.x - wide.x + narrow.x, y: top.y - wide.y + narrow.y };
  check("canvas: at 768 px the action still sits just above the box", Boolean(await sitsAbove(topAt768)), JSON.stringify({ action: await action.boundingBox(), top: topAt768 }));
  await page.screenshot({ path: path.join(shots, "07b-ask-at-768.png") });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(500);
  const field = page.getByLabel("Question for the architect");
  await action.click();
  await page.mouse.click(clear.x, clear.y);
  check("canvas: choosing elsewhere closes the open field", await field.count() === 0 && await action.count() === 0);
  await page.mouse.click(top.x, top.y);
  await action.waitFor({ timeout: 10000 });
  await action.click();
  await field.fill("Leave this");
  await field.press("Escape");
  const before = scene(on, "proposals").requests.length;
  check("canvas: Escape closes the field, asks nothing and gives the action back", await field.count() === 0 && await action.count() === 1 && scene(on, "proposals").requests.length === before);
  await action.click();
  check("canvas: the field's Ask is disabled until the question has text", await page.getByRole("button", { name: "Ask", exact: true }).isDisabled());
  await field.fill("Why is this box here?");
  // Wider than the action, the field can reach the SDK's panels: nothing may be drawn over it.
  const uncovered = await page.locator("[data-aof-canvas-overlay] [role=group]").evaluate((group) => {
    const r = group.getBoundingClientRect();
    return [[r.left + 4, r.top + r.height / 2], [r.right - 4, r.top + r.height / 2], [r.left + r.width / 2, r.top + 4]].every(([x, y]) => group.contains(document.elementFromPoint(x, y)));
  });
  check("canvas: the open field is drawn over everything around it, the SDK's panels included", uncovered);
  await page.screenshot({ path: path.join(shots, "08-ask-field-open.png") });
  await field.press("Enter");
  const asked = scene(on, "proposals").requests.find((request) => request.request === "Why is this box here?");
  check("canvas: the unsaved box was saved first, and the request names it", Boolean(asked) && asked.selectedIds?.length === 1 && new RegExp(`\\b${asked.selectedIds[0]}\\b`).test(view(on)) && (await page.locator("header [role=status]").first().innerText()) === "Saved", JSON.stringify(asked));
  const drawnBox = element(on, asked.selectedIds[0]);
  check("house style: a rectangle drawn by hand is saved with an ink stroke, a paper background and a solid fill", drawnBox?.strokeColor === INK && drawnBox?.backgroundColor === PAPER && drawnBox?.fillStyle === "solid", JSON.stringify({ stroke: drawnBox?.strokeColor, background: drawnBox?.backgroundColor, fill: drawnBox?.fillStyle }));
  await openThread(page).getByText("Why is this box here?").waitFor({ timeout: 15000 });
  const firstCard = await page.locator("[data-aof-conversation-panel] [data-aof-thread]").first().getAttribute("data-open");
  const invocation = `/aof:diagram-review 07 ${FILE} ${asked.id}`;
  for (let i = 0; i < 50 && !architectReceived().includes(invocation); i += 1) await page.waitForTimeout(100);
  check("172/01 · asking at the selection opens the new thread at the top of the panel holding that question", firstCard === "" && (await openThread(page).innerText()).includes(asked.selectedIds[0]));
  check("172/02 · E1 the ask reached the server's architect session as its invocation, and no terminal opened", architectReceived().includes(invocation) && await page.locator(".xterm").count() === 0, JSON.stringify(architectReceived()));
  check("canvas: the field closed once asked", await field.count() === 0);
  await page.screenshot({ path: path.join(shots, "09-asked.png") });

  // ── 171/04 → 172/02: a note saved while the session runs sends nothing ────────────────────────
  const receivedBefore = architectReceived().length;
  check("172/01 · E8 with a box selected the composer names it", (await composerLabel()) === `Ask the architect · about ${asked.selectedIds[0]}`, await composerLabel());
  await composer(page).fill("Is the cache needed at all?");
  await page.screenshot({ path: path.join(shots, "09a-note-typed.png") });
  await page.getByRole("button", { name: "Save as note" }).click();
  await waitForText(page, "Note recorded.", 15000);
  const sentNote = scene(on, "proposals").requests.find((request) => request.request === "Is the cache needed at all?");
  await page.waitForTimeout(1500);
  check("172/02 · E6 Save as note records the note and hands the architect's session nothing", Boolean(sentNote) && sentNote.status === "open" && architectReceived().length === receivedBefore, JSON.stringify(architectReceived().slice(receivedBefore)));
  await page.screenshot({ path: path.join(shots, "09b-note-saved.png") });

  // ── 171/01: Find in libraries, over a real-sized set ─────────────────────────────────────────
  // A 30-item library in the global home, written now — after the checks that read the project's
  // one library by name — and loaded by a reload, as the editor reads libraries once when it opens.
  const AWS = "aws-architecture-icons";
  const ICONS = ["API Gateway", "AppSync", "Athena", "Aurora", "Batch", "CloudFront", "CloudWatch", "Cognito", "DynamoDB", "EC2", "ECS", "EFS",
    "ElastiCache", "EventBridge", "Glue", "IAM", "Kinesis", "Kinesis Data Firehose", "Kinesis Data Streams", "Kinesis Video Streams", "Lambda",
    "Lambda Function URL", "RDS", "Route 53", "S3", "SNS", "SQS", "Step Functions", "VPC", "WAF"];
  mkdirSync(path.join(home, "diagrams", "libraries"), { recursive: true });
  writeFileSync(path.join(home, "diagrams", "libraries", `${AWS}.excalidrawlib`), JSON.stringify({ type: "excalidrawlib", version: 2, source: "smoke", libraryItems: ICONS.map((name, i) => ({ id: `aws-${i}`, status: "unpublished", created: 1, name, elements: [
    part(`r${i}`, "rectangle", 0, 0, 48, 48, { backgroundColor: "#ff9900", roundness: { type: 3 } }),
    part(`l${i}`, "line", 12, 24, 24, 0, { points: [[0, 0], [24, 0]] }),
  ] })) }));
  await page.reload({ waitUntil: "load" });
  await page.locator(".excalidraw canvas").first().waitFor({ timeout: 30000 });
  await page.locator(".default-sidebar-trigger").first().click();
  await page.getByRole("tab", { name: "Find in libraries" }).click();
  const search = page.getByRole("searchbox", { name: "Find in libraries" });
  await search.waitFor({ timeout: 10000 });
  await page.screenshot({ path: path.join(shots, "10a-find-open.png") });
  const focused = await search.evaluate((input) => input === document.activeElement);
  const tabs = await page.locator(".default-sidebar [role=tab]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? node.textContent));
  check("find: the Find tab sits beside the Library tab, its field focused", focused && tabs.length >= 3, JSON.stringify({ focused, tabs }));
  await search.fill("kin");
  const tiles = page.locator("[data-aof-library-search] ul > li");
  const kin = ICONS.filter((name) => /kin/i.test(`${name} ${AWS}`));
  await page.waitForTimeout(800);
  const shownNames = await tiles.locator("span.truncate:first-of-type").allInnerTexts();
  const previewed = await tiles.locator("svg").count();
  check("find: typing \"kin\" leaves only the items whose name has it, each with a preview, its name and its library", JSON.stringify(shownNames) === JSON.stringify(kin) && previewed === kin.length && await tiles.getByText(AWS).count() === kin.length && (await page.locator("[data-aof-library-search] [role=status]").innerText()) === `${kin.length} items`, JSON.stringify({ shownNames, previewed }));
  await page.screenshot({ path: path.join(shots, "10-find-tab.png") });
  const libLines = () => view(on).split("\n").filter((line) => line.includes(`${AWS}/`));
  const canvasBox = await page.locator(".excalidraw").first().boundingBox();
  await page.getByRole("button", { name: `Insert Kinesis from ${AWS}` }).click();
  await action.waitFor({ timeout: 10000 });
  const clicked = await action.boundingBox();
  check("find: a clicked item lands at the centre of the visible canvas", near(clicked.x + clicked.width / 2, canvasBox.x + canvasBox.width / 2) && clicked.y + clicked.height < canvasBox.y + canvasBox.height / 2, JSON.stringify({ action: clicked, canvas: canvasBox }));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForText(page, "Saved.");
  check("find: the clicked item saves as a library node", libLines().some((line) => line.endsWith(`${AWS}/"Kinesis"`)), JSON.stringify(libLines()));
  // Save is pressed outside the sidebar, which closes it as any outside press does: open Find again.
  if (!await search.isVisible()) {
    await page.locator(".default-sidebar-trigger").first().click();
    await page.getByRole("tab", { name: "Find in libraries" }).click();
  }
  await search.fill("kin");
  const dropAt = await canvasPoint(page, 0.3, 0.72);
  await page.getByRole("button", { name: `Insert Kinesis Data Streams from ${AWS}` }).hover();
  await page.mouse.down(); await page.mouse.move(dropAt.x, dropAt.y, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(500);
  const dropped = await action.boundingBox();
  check("find: a dragged item lands where it is dropped", Boolean(dropped) && near(dropped.x + dropped.width / 2, dropAt.x) && dropped.y + dropped.height < dropAt.y, JSON.stringify({ action: dropped, dropAt }));
  await page.screenshot({ path: path.join(shots, "11-find-inserted.png") });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForText(page, "Saved.");
  check("find: the dragged item saves as a library node", libLines().some((line) => line.endsWith(`${AWS}/"Kinesis Data Streams"`)), JSON.stringify(libLines()));

  // ── 171/02: review records and saved drafts are pushed ──────────────────────────────────────
  // A mark on the window proves the page was never reloaded; the stand-in architect writes through
  // the real CLI, and each write must reach the open panel within 2 seconds.
  await page.evaluate(() => { window.__aofNoReload = true; });
  const within = async (what, timeout) => { const started = Date.now(); await what(timeout); return Date.now() - started; };
  const openNote = scene(on, "proposals").requests.find((request) => request.status === "open" && request.request === "Why is this box here?");
  scene(on, "respond", { requestId: openNote.id, answer: "It is the store's cache, drawn before its arrows." });
  const answered = await within((timeout) => waitForText(page, "the store's cache, drawn before its arrows", timeout), 2000);
  await proposalsTab(page).click();
  const nowRevision = scene(on, "read").revision;
  const { request: second } = scene(on, "request", { baseRevision: nowRevision, selectedIds: [], request: "Name the store for what it holds." });
  const secondView = scene(on, "context", { requestId: second.id }).view;
  scene(on, "propose", { requestId: second.id, baseRevision: nowRevision, summary: "Orders store", rationale: "Named for what it holds.", text: secondView.replace('Store["Store"]', 'Store["Orders store"]') });
  const proposed2 = await within((timeout) => page.getByRole("button", { name: "Accept proposal: Orders store" }).waitFor({ timeout }), 2000);
  check("push: an answer and a proposal appear in the open panel within 2 seconds each, with no reload", await page.evaluate(() => window.__aofNoReload === true) && await page.getByRole("button", { name: "Preview proposal: Orders store" }).count() === 1 && await page.getByRole("button", { name: "Reject proposal: Orders store" }).count() === 1, `answer ${answered} ms, proposal ${proposed2} ms`);
  await page.screenshot({ path: path.join(shots, "12-pushed-answer-and-proposal.png") });
  // DESIGN "A proposal in its thread": the pending proposal read in the thread that asked for it.
  await conversationsTab(page).click();
  await page.getByRole("button", { name: "Open the conversation on Whole diagram" }).click();
  await openThread(page).getByRole("button", { name: "Accept proposal: Orders store" }).waitFor({ timeout: 5000 });
  const card = openThread(page).locator("[data-aof-proposal]").filter({ hasText: "Orders store" });
  const accentEdge = await card.evaluate((element) => getComputedStyle(element).borderLeftColor);
  // The console's own accent, resolved by the page rather than restated here.
  const consoleAccent = await page.evaluate(() => { const probe = document.createElement("span"); probe.style.color = "var(--color-accent)"; document.body.append(probe); const colour = getComputedStyle(probe).color; probe.remove(); return colour; });
  check("172/01 · E11 a pending proposal is decided in the thread that asked for it, its card edged in the accent", (await openThread(page).innerText()).includes("A proposal answers this") && accentEdge === consoleAccent, `${accentEdge} vs ${consoleAccent}`);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(shots, "172-proposal-1280.png") });
  // A second window on the same diagram saves; the first window's canvas follows.
  const other = await page.context().newPage();
  await other.goto(page.url(), { waitUntil: "load" });
  await other.locator(".excalidraw canvas").first().waitFor({ timeout: 30000 });
  const drawIn = async (target, fx, fy) => {
    const area = await target.locator(".excalidraw").first().boundingBox();
    const from = { x: area.x + area.width * fx, y: area.y + area.height * fy };
    await target.mouse.click(area.x + area.width * 0.8, area.y + area.height * 0.2);
    await target.keyboard.press("Escape");
    await target.keyboard.press("r");
    await target.mouse.move(from.x, from.y); await target.mouse.down(); await target.mouse.move(from.x + 60, from.y + 40, { steps: 4 }); await target.mouse.up();
    await target.keyboard.press("Escape");
  };
  const status = (target) => target.locator("header [role=status]").first().innerText();
  // The node ids a view names: what the second window's save adds is the one id that was not there.
  const nodeIds = (text) => new Set([...text.matchAll(/\bn\d+\b/g)].map((match) => match[0]));
  const idsBefore = nodeIds(view(on));
  await drawIn(other, 0.62, 0.62);
  await other.getByRole("button", { name: "Save", exact: true }).click();
  await waitForText(other, "Saved.");
  const added = [...nodeIds(view(on))].filter((id) => !idsBefore.has(id));
  await page.locator("header [role=status]").filter({ hasText: "Updated from the saved draft" }).first().waitFor({ timeout: 4000 });
  await page.getByRole("button", { name: "Show the Mermaid view" }).click();
  const shownView = await page.getByRole("textbox", { name: "Mermaid view" }).inputValue();
  check("push: a draft saved in a second window reaches the first window's clean canvas, with no reload", await page.evaluate(() => window.__aofNoReload === true) && added.length === 1 && nodeIds(shownView).has(added[0]), `${JSON.stringify(added)} in the first window's view`);
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  // Clear of the properties panel the rectangle tool opens on the left.
  await drawIn(page, 0.3, 0.6);
  await page.locator("header [role=status]").filter({ hasText: "Unsaved changes" }).first().waitFor({ timeout: 4000 });
  await drawIn(other, 0.7, 0.3);
  await other.getByRole("button", { name: "Save", exact: true }).click();
  await waitForText(other, "Saved.");
  const line = page.locator("[data-aof-changed-elsewhere]");
  await line.waitFor({ timeout: 4000 });
  check("push: a dirty canvas keeps its unsaved shape and offers a reload", (await status(page)) === "Unsaved changes" && (await line.innerText()).includes("changed in another window") && await line.getByRole("button", { name: "Reload" }).count() === 1);
  await page.screenshot({ path: path.join(shots, "13-changed-elsewhere.png") });
  await line.getByRole("button", { name: "Reload" }).click();
  await page.locator("header [role=status]").filter({ hasText: "Updated from the saved draft" }).first().waitFor({ timeout: 4000 });
  check("push: Reload takes the saved draft and closes the line", await line.count() === 0 && await page.evaluate(() => window.__aofNoReload === true));
  await other.close();

  // ── 171/05 → 172/01: a note's pin opens its thread in the panel ─────────────────────────────
  // The drawn box `n2` holds two notes: 171/00's question (answered above) and 171/04's. Its pin sits
  // on the box's top-right corner; choosing it opens the thread at the top of the panel (172/ADR-003),
  // which takes a reply and shows the answer the stand-in architect writes next — pushed, no reload.
  const pin = page.locator('[data-aof-note-pin][aria-label*=" on n2"]');
  await pin.waitFor({ timeout: 10000 });
  const pinBox = async () => { const r = await pin.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, r }; };
  // The console's primary (teal, the style guide's `link` #13766d) — never the SDK's own purple, which
  // Excalidraw's container defines under the same token name.
  const pinColour = await pin.evaluate((element) => getComputedStyle(element).backgroundColor);
  check("thread: the box's notes share one pin that counts them, in the console's primary colour once answered", (await pin.innerText()).trim() === "2" && pinColour === "rgb(19, 118, 109)", `${await pin.getAttribute("aria-label")} · ${pinColour}`);
  // E5: the Whole diagram thread is open; the pin opens n2's at the top and collapses the other.
  await pin.click();
  const threadBox = openThread(page);
  await threadBox.filter({ hasText: "Why is this box here?" }).waitFor({ timeout: 5000 });
  const cards = page.locator("[data-aof-conversation-panel] [data-aof-thread]");
  check("172/01 · E5 a pin opens its thread at the top of the panel and closes the open one; nothing opens over the canvas", await cards.first().getAttribute("data-open") === "" && await threadBox.count() === 1 && await page.locator("[data-aof-canvas-overlay] [role=dialog], [data-aof-note-thread]").count() === 0 && (await threadBox.innerText()).indexOf("Why is this box here?") < (await threadBox.innerText()).indexOf("the store's cache"));
  const borderColour = await threadBox.evaluate((element) => getComputedStyle(element).borderTopColor);
  check("172/01 · the console's colours hold: the answered pin and the open thread's border are the console's teal", pinColour === "rgb(19, 118, 109)" && borderColour === "rgb(19, 118, 109)", `${pinColour} · ${borderColour}`);
  // E6: a collapsed panel opens on the pin's thread.
  await page.getByRole("button", { name: "Collapse the conversation panel" }).click();
  check("172/01 · the collapsed panel leaves a tab on the edge", await page.locator("[data-aof-conversation-tab]").count() === 1 && await page.locator("[data-aof-conversation-panel]").count() === 0);
  await pin.click();
  await threadBox.waitFor({ timeout: 5000 });
  check("172/01 · E6 a pin opens a collapsed panel on its thread", await page.locator("[data-aof-conversation-panel]").count() === 1 && (await threadBox.innerText()).includes("Why is this box here?"));
  // E7: Show on canvas selects the thread's shapes and brings them into view — scrolled away first.
  const away = await canvasPoint(page, 0.5, 0.5);
  await page.mouse.click(away.x, away.y);
  await page.keyboard.press("Escape");
  await page.mouse.move(away.x, away.y);
  for (let i = 0; i < 6; i += 1) await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  await threadBox.getByRole("button", { name: "Show on canvas" }).click();
  await page.waitForTimeout(400);
  const shownBox = await pin.boundingBox().catch(() => null);
  const canvasNow = await page.locator(".excalidraw").first().boundingBox();
  check("172/01 · E7 Show on canvas selects the thread's shapes and brings them into the visible canvas", await action.count() === 1 && Boolean(shownBox) && shownBox.x >= canvasNow.x && shownBox.y >= canvasNow.y && shownBox.y <= canvasNow.y + canvasNow.height, JSON.stringify({ shownBox, canvasNow }));
  await page.getByLabel("Reply to the architect").fill("Should it be a write-through cache?");
  await threadBox.getByRole("button", { name: "Reply", exact: true }).click();
  await threadBox.getByText("Should it be a write-through cache?").waitFor({ timeout: 10000 });
  const latest = scene(on, "proposals").requests.find((request) => request.request === "Is the cache needed at all?");
  const replyInvocation = `/aof:diagram-review 07 ${FILE} ${latest.id}`;
  for (let i = 0; i < 50 && !architectReceived().includes(replyInvocation); i += 1) await page.waitForTimeout(100);
  check("thread: a reply is the thread's next turn, reopening the note, and is posted to the architect's session (172/02 E4/E5)", latest.status === "open" && latest.thread.at(-1).text === "Should it be a write-through cache?" && latest.thread.length === 2 && architectReceived().includes(replyInvocation), JSON.stringify(latest.thread));
  scene(on, "respond", { requestId: latest.id, answer: "Write-through would double the writes; keep it read-through." });
  await threadBox.getByText("keep it read-through").waitFor({ timeout: 4000 });
  check("thread: the architect's answer appears in the open thread, pushed, with no reload", await page.evaluate(() => window.__aofNoReload === true));
  await page.screenshot({ path: path.join(shots, "14-note-thread.png") });
  // DESIGN's two breakpoints for the panel, the answered thread open (task 02's mock readings).
  await page.screenshot({ path: path.join(shots, "172-panel-answered-1280.png") });
  await page.setViewportSize({ width: 768, height: 800 });
  await page.waitForTimeout(500);
  const drawer = await page.locator("[data-aof-conversation-panel]").boundingBox();
  check("172/01 · at 768 the panel is a 340 px drawer over the canvas's right edge", Boolean(drawer) && Math.round(drawer.width) === 340 && Math.round(drawer.x + drawer.width) === 768, JSON.stringify(drawer));
  await page.screenshot({ path: path.join(shots, "172-panel-drawer-768.png") });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(500);
  // A pan moves the pin by the wheel's delta; a zoom about another point P moves it to P + (C − P)·k.
  const pinBefore = await pinBox();
  const canvasArea = await page.locator(".excalidraw").first().boundingBox();
  const zoomAbout = { x: canvasArea.x + canvasArea.width * 0.7, y: canvasArea.y + canvasArea.height * 0.5 };
  await page.mouse.move(zoomAbout.x, zoomAbout.y);
  await page.mouse.wheel(0, -40);
  await page.waitForTimeout(300);
  const panned = await pinBox();
  const zoomFrom = parseInt(await page.locator(".excalidraw .reset-zoom-button").first().innerText(), 10);
  await page.keyboard.down("Control"); await page.mouse.wheel(0, -100); await page.keyboard.up("Control");
  await page.waitForTimeout(300);
  const zoomTo = parseInt(await page.locator(".excalidraw .reset-zoom-button").first().innerText(), 10);
  const zoomed = await pinBox();
  const k = zoomTo / zoomFrom;
  const expected = { x: zoomAbout.x + (panned.x - zoomAbout.x) * k, y: zoomAbout.y + (panned.y - zoomAbout.y) * k };
  check("thread: the pin stays on the box's corner as the canvas pans and zooms", near(panned.x, pinBefore.x) && near(panned.y, pinBefore.y + 40) && zoomTo !== zoomFrom && Math.abs(zoomed.x - expected.x) <= 4 && Math.abs(zoomed.y - expected.y) <= 4, JSON.stringify({ pinBefore, panned, zoomed, expected, zoomFrom, zoomTo }));

  // ── 172/02: the answer streams into its thread, and a reply's answer does too ─────────────────
  // The earlier sessions ended once the stand-in had acknowledged them, so this ask starts a fresh one.
  const liveText = () => openThread(page).locator("[data-aof-live-text]").first().innerText().catch(() => "");
  const lengthsWhileStreaming = async (name) => {
    await openThread(page).locator("[data-aof-live-text]").filter({ hasText: /Stand-in answer/ }).first().waitFor({ timeout: 15000 });
    const first = (await liveText()).length;
    await page.screenshot({ path: path.join(shots, `${name}-a.png`) });
    await page.waitForTimeout(500);
    const second = (await liveText()).length;
    await page.screenshot({ path: path.join(shots, `${name}-b.png`) });
    return { first, second };
  };
  await threadBox.getByRole("button", { name: "Show on canvas" }).click();
  await action.waitFor({ timeout: 10000 });
  await action.click();
  await field.fill("Why does the route re-stamp?");
  await field.press("Enter");
  await openThread(page).getByText("Why does the route re-stamp?").waitFor({ timeout: 15000 });
  await openThread(page).getByText("Starting the architect…").waitFor({ timeout: 5000 });
  check("172/02 · E1 the new thread opens in the panel reading \"Starting the architect…\", the chip starting", (await page.locator("[data-aof-session-chip]").innerText()).trim() === "Starting…");
  const grew = await lengthsWhileStreaming("172-streaming-1280");
  check("172/02 · E1 the answer visibly grows in its thread, and no terminal appears", grew.second > grew.first && await page.locator(".xterm").count() === 0 && (await page.locator("[data-aof-session-chip]").innerText()).trim() === "Answering", JSON.stringify(grew));
  const restamp = () => scene(on, "proposals").requests.find((request) => request.request === "Why does the route re-stamp?");
  for (let i = 0; i < 100 && restamp()?.status !== "answered"; i += 1) await page.waitForTimeout(100);
  await openThread(page).locator("[data-aof-live-turn]").waitFor({ state: "detached", timeout: 5000 });
  check("172/02 · E8 the stand-in's recorded answer replaces the live turn: no caret and no activity list",
    restamp()?.status === "answered" && (await openThread(page).innerText()).includes('Stand-in answer to "Why does the route re-stamp?"') && await page.locator("[data-aof-caret]").count() === 0 && await openThread(page).getByLabel("What the architect has done").count() === 0);
  check("172/02 · E8 the thread's pin reads answered", /the architect answered/.test(await pin.getAttribute("aria-label") ?? ""), await pin.getAttribute("aria-label"));
  await page.screenshot({ path: path.join(shots, "172-recorded-1280.png") });
  // The reply's answer at DESIGN's second breakpoint, the panel a drawer (mocks/conversation-streaming-768.png).
  await page.setViewportSize({ width: 768, height: 800 });
  await page.waitForTimeout(500);
  await page.getByLabel("Reply to the architect").fill("And if the watch cannot start?");
  await openThread(page).getByRole("button", { name: "Reply", exact: true }).click();
  await openThread(page).getByText("And if the watch cannot start?").waitFor({ timeout: 10000 });
  const grewAgain = await lengthsWhileStreaming("172-streaming-768");
  const watch = () => scene(on, "proposals").requests.find((request) => request.request === "Why does the route re-stamp?");
  for (let i = 0; i < 100 && !(watch()?.thread ?? []).some((turn) => turn.by === "architect" && /watch cannot start/.test(turn.text)); i += 1) await page.waitForTimeout(100);
  await openThread(page).locator("[data-aof-live-turn]").waitFor({ state: "detached", timeout: 5000 });
  check("172/02 · E4 a reply's answer streams under it, then is replaced by its recorded turn", grewAgain.second > grewAgain.first && (await openThread(page).innerText()).includes('Stand-in answer to "And if the watch cannot start?"') && await page.locator(".xterm").count() === 0, JSON.stringify(grewAgain));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(500);

  // ── reload, close, the board shows the new figure, a hostile address ───────────────────────
  await page.reload({ waitUntil: "load" });
  // A reload cannot know whether an earlier session published this revision, so it claims only "Saved".
  await page.locator("header [role=status]").filter({ hasText: /^Saved$/ }).first().waitFor({ timeout: 30000 });
  check("route: a reload reopens the diagram at the same address", page.url().endsWith("/diagram?ref=07&file=ADR-002-scene.svg"));
  // E13: a delivered item's diagram is read, never written — its threads and proposals list, and
  // nothing in the panel writes.
  const spec = path.join(on.item, "SPEC.md");
  const specText = readFileSync(spec, "utf8");
  writeFileSync(spec, specText.replace("status: in-progress", "status: done"));
  await page.reload({ waitUntil: "load" });
  await page.locator("header [role=status]").filter({ hasText: "Read-only" }).first().waitFor({ timeout: 30000 });
  await page.locator("[data-aof-conversation-panel] [data-aof-thread]").first().waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Open the conversation on Whole diagram" }).click();
  check("172/01 · E13 a delivered item's diagram reads its threads with no composer, no reply field and no proposal actions",
    await page.locator("[data-aof-composer]").count() === 0 && await page.getByLabel("Reply to the architect").count() === 0
      && await page.getByRole("button", { name: /^(Preview|Accept|Reject) proposal/ }).count() === 0 && (await openThread(page).innerText()).includes("Orders store"));
  writeFileSync(spec, specText);
  await page.reload({ waitUntil: "load" });
  await page.locator("header [role=status]").filter({ hasText: /^Saved$/ }).first().waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Close editor" }).click();
  await page.waitForURL(/\/board#07$/, { timeout: 15000 });
  await openFigure(page, ON);
  const shown = await page.locator('img[src^="data:image/svg+xml"]').last().getAttribute("src");
  check("route: Close returns to the board, whose figure is now the published export", decodeURIComponent(shown ?? "").includes(svg.slice(0, 200)));
  await page.screenshot({ path: path.join(shots, "05-board-figure.png") });
  await page.goto(`${ON}/diagram?ref=07&file=..%2Fsecret.svg`, { waitUntil: "networkidle" });
  check("route: a hostile member names nothing and opens no editor", await page.getByText("No diagram is named.").count() === 1 && await page.locator(".excalidraw").count() === 0);

  // ── diagrams off: no capability, no link, nothing fetched ─────────────────────────────────
  const offPage = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const offRequests = [];
  offPage.on("request", (request) => offRequests.push(request.url()));
  await openFigure(offPage, OFF);
  check("off: the viewer shows no Edit draft", await offPage.getByRole("link", { name: "Edit draft" }).count() === 0);
  check("off: the board fetches no scene and no SDK", !offRequests.some((url) => /\/api\/diagram\/scene|excalidraw|mermaid/i.test(url)));
} catch (error) {
  failed = true;
  if (!results.some((result) => !result.ok)) console.log(`FAIL - ${error.message}`);
  // What each open page showed when the run stopped.
  let shot = 0;
  for (const context of browser.contexts()) for (const open of context.pages()) await open.screenshot({ path: path.join(shots, `zz-failure-${shot++}.png`) }).catch(() => {});
} finally {
  await browser.close();
  for (const { child } of servers) child.kill();
  console.log(`\n${results.filter((result) => result.ok).length}/${results.length} checks passed; screenshots in ${shots}`);
}
process.exit(failed ? 1 : 0);
