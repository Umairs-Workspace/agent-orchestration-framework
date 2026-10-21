// THE DIAGRAM EDITOR, SERVED AND DRIVEN IN A REAL BROWSER (milestone 200 / story 07).
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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  const part = (id, type, x, y, w, h, extra = {}) => ({ id, type, x, y, width: w, height: h, angle: 0, strokeColor: "#0078d4", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: 7, version: 1, versionNonce: 7, isDeleted: false, boundElements: null, link: null, locked: false, ...extra });
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
async function serve(fixture) {
  const port = await freePort();
  const child = spawn(process.execPath, [cli, "work", "ui", "--port", String(port), "--target", fixture.root], { env, stdio: "ignore" });
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

const on = project("on", { generator: "diagram-design", formats: ["svg", "png"] });
const off = project("off", undefined);
const servers = [];
const browser = await chromium.launch({ channel: argOf("channel", "chrome"), headless: true });
let failed = false;
const view = (fixture) => scene(fixture, "context", { selectedIds: [] }).view;
const stored = (fixture) => JSON.parse(readFileSync(fixture.diagram, "utf8"));
try {
  const ON = (servers[servers.push(await serve(on)) - 1]).origin;
  const OFF = (servers[servers.push(await serve(off)) - 1]).origin;
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
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Accept proposal: First draft/ }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /^Preview proposal: First draft/ }).click();
  await waitForText(page, "only adds to the diagram");
  await page.getByRole("button", { name: /^Accept proposal: First draft/ }).click();
  await waitForText(page, "Proposal accepted", 30000);
  check("draft: Accept draws the proposal and the scene reads back as it", /API\["API"\]/.test(view(on)) && /Store\["Store"\]/.test(view(on)) && /API -->\|"writes"\| Store/.test(view(on)), view(on).split("\n").slice(2, 6).join(" | "));
  check("draft: the first-draft offer is gone once the diagram holds shapes", await page.getByRole("button", { name: "Request a first draft" }).count() === 0);
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
  await page.getByLabel(/Note, question or requested change/).fill("Should the store be a queue instead?");
  await page.getByRole("button", { name: "Add note" }).click();
  await waitForText(page, "Note recorded.");
  check("note: Add note records the note and starts no session", (await page.locator(".xterm").count()) === dockBefore && scene(on, "proposals").requests.some((request) => request.status === "open" && request.request.startsWith("Should the store")));
  await page.getByRole("button", { name: /^Withdraw note: Should the store/ }).click();
  await waitForText(page, "Note withdrawn.");
  for (const text of ["Why does the API write directly to the store?", "Call the API the gateway, and add an Azure Function that the store triggers."]) {
    await page.getByLabel(/Note, question or requested change/).fill(text);
    await page.getByRole("button", { name: "Add note" }).click();
    await waitForText(page, "Note recorded.");
  }
  await page.getByRole("button", { name: "Review notes" }).getByText("2 notes").waitFor({ timeout: 15000 });

  // The batch review, as `/aof:diagram-review 07 ADR-002-scene.excalidraw` runs it: every open note, oldest first.
  const open = scene(on, "proposals").requests.filter((request) => request.status === "open").reverse();
  const ctx = scene(on, "context", { requestId: open[1].id });
  scene(on, "respond", { requestId: open[0].id, answer: "Because ADR-002 keeps one writer: the API owns every write, so the store has no second path in." });
  const edited = ctx.view.replace('API["API"]', 'API["Gateway"]').replace("  API -->", '  Trigger["Order events"]\n  API -->').replace(/\n$/, '\n  Store --> Trigger\n  %% aof:lib Trigger azure/"Function App"\n');
  const proposed = scene(on, "propose", { requestId: open[1].id, baseRevision: ctx.revision, summary: "Gateway and a store trigger", rationale: "Renames the API and adds the Function the store triggers.", text: edited });
  check("batch: the proposal's changes are the rename, the new library node and its edge", JSON.stringify(proposed.proposal.changes.map((c) => c.key).sort()) === JSON.stringify(["edge:Store->Trigger#1", "lib:Trigger", "node:API", "node:Trigger"]), JSON.stringify(proposed.proposal.changes));
  await waitForText(page, "the API owns every write", 20000);
  check("batch: the answer appears in the panel on its own (the editor polls)", true);
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
  await waitForText(page, "Published diagrams/", 60000);
  const svg = readFileSync(path.join(on.item, "diagrams", "ADR-002-scene.svg"), "utf8");
  const png = readFileSync(path.join(on.item, "diagrams", "ADR-002-scene.png"));
  check("publish: the SVG the ADR links is the editor's export, and the owed PNG is written", svg.includes("<svg") && !svg.includes("old figure") && png.subarray(1, 4).toString() === "PNG", `${svg.length} B svg, ${png.length} B png`);
  check("publish: the status line says the saved diagram is published", (await page.locator("header [role=status]").first().innerText()) === "Saved and published");
  check("publish: the editor shows the block to paste under the ADR", (await page.getByLabel("ADR diagram block").inputValue()).includes("Source: [ADR-002-scene.excalidraw](diagrams/ADR-002-scene.excalidraw)"));
  await page.screenshot({ path: path.join(shots, "04-published.png") });

  // ── reload, close, the board shows the new figure, a hostile address ───────────────────────
  await page.reload({ waitUntil: "networkidle" });
  // A reload cannot know whether an earlier session published this revision, so it claims only "Saved".
  await page.locator("header [role=status]").filter({ hasText: /^Saved$/ }).first().waitFor({ timeout: 30000 });
  check("route: a reload reopens the diagram at the same address", page.url().endsWith("/diagram?ref=07&file=ADR-002-scene.svg"));
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
} finally {
  await browser.close();
  for (const { child } of servers) child.kill();
  console.log(`\n${results.filter((result) => result.ok).length}/${results.length} checks passed; screenshots in ${shots}`);
}
process.exit(failed ? 1 : 0);
