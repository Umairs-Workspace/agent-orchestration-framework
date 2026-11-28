// Traceability wiring for milestone 198 / story 02 — "aof design-system mocks import" and
// "aof design-system mocks capture".
//
// Covers EVERY @executable scenario in
//   tasks/01_import-commits-an-approved-canvas-with-its-provenance.feature — E11, the E12 outline, the
//     "cannot render offline" outline, E13, the bad-provenance outline, E14, the hand-written README
//     and the same-version re-import, and R4a's E21–E23 and E25–E28 (a page per milestone and the
//     canvas pages verb, amended 2026-11-27)
//     (E15 is FF-19805, test/arch/ui/acd-imported-mock-self-contained)
//   tasks/02_capture-frames-each-board-at-its-own-size.feature — E16, the re-capture, E17, the failing
//     board, E18, the size outline, and "the package spawns nothing" (the rasterizer's own rules are
//     packages/execution/test/diagram-rasterize.suite.mjs; FF-13303 is its arch control)
//
// The verbs are built from the package's own factory, with core's collaborators faked: a work stream
// holding milestone "12" and its story "12/01", a browser ladder, and a page entry that records what
// it was asked for and writes (or fails to write) each frame. "The pulled dir" is written per case
// into a fresh temp project. node:assert/strict, `{ name, run }`, Scenario Outline rows folded.
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDesignSystemCommands } from "@aof/design-system/commands";
import { planImport } from "../src/mocks.mjs";
import { commandError } from "./tokens.suite.mjs";

const PACKAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MILESTONE = "wiki/work/12_milestone_fleet-filter";
const MOCKS = `${MILESTONE}/mocks`;
const CANVAS = "https://claude.ai/artifact/9Qm2LrT4vWx8YbN3cK7pZd";
const SYSTEM = "https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd";
const APPROVAL = "run 20261126T204530509Z-0000 ask 1";
const FLAGS = Object.freeze({ item: "12", canvas: CANVAS, canvasVersion: "4", system: SYSTEM, systemVersion: "2", approval: APPROVAL });
const RUNTIME_BYTES = "/* GENERATED from dc-runtime */\nwindow.DC = {};\n";
const BOARD = (name) => `<!doctype html>\n<html><head><script src="./support.js"></script></head><body data-board="${name}"></body></html>\n`;
const BOARDS_V4 = Object.freeze({ "fleet-filter.dc.html": { x: 0, y: 0, w: 1280, h: 884 }, "fleet-filter-390.dc.html": { x: 1340, y: 0, w: 390, h: 274 } });
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const today = () => new Date().toISOString().slice(0, 10);

// The pulled dir's files for a canvas whose boards are `boards`, in key order.
function pulledFiles(boards = BOARDS_V4) {
  return {
    "project/canvas.json": `${JSON.stringify({ boards, order: Object.keys(boards), designSystems: [{ folder: "aof", artifact: SYSTEM }] }, null, 2)}\n`,
    ...Object.fromEntries(Object.keys(boards).map((name) => [`project/${name}`, BOARD(name)])),
    "project/ds/aof/tokens.json": '{"color":{"themes":[],"tokens":[]}}\n',
    "artifact-type/dc-runtime.js": RUNTIME_BYTES,
  };
}

// The faked collaborators core injects. `browser` is the ladder's answer; `fail` names a board the
// page entry exits 1 on without writing.
function services({ browser = { ok: true, rung: "config", kind: "full", path: "/fake/chrome" }, fail = null } = {}) {
  const asked = [];
  const rows = [
    { ref: "12", type: "milestone", slug: "fleet-filter", parent: null, dir: MILESTONE },
    { ref: "05", type: "milestone", slug: "directory", title: "Directory provider contract and Connect Google", parent: null, dir: "wiki/work/05_milestone_directory" },
    { ref: "12/01", type: "story", parent: "12", dir: `${MILESTONE}/stories/01_story_chips` },
  ];
  const verbs = createDesignSystemCommands({
    commandError,
    listItemsCacheFirst: async () => rows,
    requireLocalCheckout: (item) => item,
    findBrowser: () => browser,
    rasterizePage: async (request) => {
      asked.push(request);
      if (path.basename(request.pagePath) === fail) return { ok: false, code: "diagram-png-render-failed", exitCode: 1, stderr: "", fix: "Try another browser." };
      await writeFile(request.pngPath, PNG);
      return { ok: true, pngPath: request.pngPath };
    },
  });
  return { verbs, asked };
}

const write = async (root, files) => {
  for (const [rel, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), text);
  }
};

// A project with milestone 12, its mocks/ holding `mocks`, and a pulled dir holding `pulled`.
async function withProject({ pulled = pulledFiles(), mocks = {}, collaborators = {} } = {}, body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ds-mocks-"));
  try {
    await write(root, { [`${MILESTONE}/SPEC.md`]: "---\ntype: milestone\n---\n" });
    await write(root, Object.fromEntries(Object.entries(mocks).map(([rel, text]) => [`${MOCKS}/${rel}`, text])));
    const pull = async (files, dir = "pulled") => {
      await rm(path.join(root, dir), { recursive: true, force: true });
      await write(root, Object.fromEntries(Object.entries(files).map(([rel, text]) => [`${dir}/${rel}`, text])));
    };
    await pull(pulled);
    const { verbs, asked } = services(collaborators);
    const ctx = { workspace: { projectRoot: root, config: {} }, env: {} };
    const importIt = (flags = FLAGS, dir = "pulled") => verbs.mocksImportCommand.run(verbs.mocksImportCommand.cli.argv([dir], flags), ctx);
    const capture = (item = "12") => verbs.mocksCaptureCommand.run(verbs.mocksCaptureCommand.cli.argv([], { item }), ctx);
    const mocksDir = path.join(root, MOCKS);
    const snapshot = async () => {
      if (!existsSync(mocksDir)) return null;
      const out = {};
      for (const entry of readdirSync(mocksDir, { recursive: true, withFileTypes: true })) {
        if (entry.isFile()) out[path.relative(mocksDir, path.join(entry.parentPath ?? entry.path, entry.name)).replaceAll("\\", "/")] = (await readFile(path.join(entry.parentPath ?? entry.path, entry.name))).toString("base64");
      }
      return out;
    };
    const readme = () => readFile(path.join(mocksDir, "README.md"), "utf8");
    const pagesOf = ({ canvas, ...flags }) => verbs.canvasPagesCommand.run(verbs.canvasPagesCommand.cli.argv([canvas], flags), ctx);
    const readJson = async (rel) => JSON.parse(await readFile(path.join(root, rel), "utf8"));
    return await body({ root, mocksDir, pull, importIt, capture, snapshot, readme, asked, pagesOf, readJson });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const refusedWith = (...needles) => (error) => {
  for (const needle of needles) assert.ok(error.message.includes(needle), `"${needle}" in: ${error.message}`);
  return true;
};

export const mocksTests = [
  // ── task 01 · mocks import ────────────────────────────────────────────────────────────────────
  {
    name: "198/02 01 E11 · an approved canvas is imported with its runtime and provenance",
    run: () => withProject({}, async ({ mocksDir, importIt, readme }) => {
      const answer = await importIt();
      for (const file of ["canvas.json", "fleet-filter.dc.html", "fleet-filter-390.dc.html", "support.js", "ds/aof/tokens.json", "README.md"]) {
        assert.ok(existsSync(path.join(mocksDir, file)), `mocks/ holds ${file}`);
      }
      assert.equal(await readFile(path.join(mocksDir, "support.js"), "utf8"), RUNTIME_BYTES, "support.js holds dc-runtime.js's bytes");
      const text = await readme();
      assert.ok(text.split("\n").includes(`Canvas: ${CANVAS} (version 4)`), text);
      assert.ok(text.split("\n").includes(`System: ${SYSTEM} (version 2)`), "the system's link and version");
      assert.ok(text.includes(today()), "today's date");
      assert.ok(text.includes(`Approval: ${APPROVAL}`), "the approval");
      for (const file of ["canvas.json", "fleet-filter.dc.html", "fleet-filter-390.dc.html", "support.js", "ds/aof/tokens.json"]) assert.ok(text.includes(`- \`${file}\``), `the README lists ${file}`);
      assert.equal(answer.mocks, MOCKS);
      assert.deepEqual(answer.written, ["canvas.json", "fleet-filter.dc.html", "fleet-filter-390.dc.html", "support.js", "ds/aof/tokens.json", "README.md"].map((file) => `${MOCKS}/${file}`));
      assert.equal(answer.changed, true);
    }),
  },
  {
    name: "198/02 01 E12 outline · a pulled file outside the canvas's own list is refused, and nothing is written (5 rows)",
    run: async () => {
      // Rows a directory listing can hold, through the verb.
      for (const [file, reason] of [
        ["project/notes.md", "it is not a file a canvas is imported from"],
        ["project/stray.dc.html", '"canvas.json" names no such board'],
      ]) {
        await withProject({ pulled: { ...pulledFiles(), [file]: "x\n" } }, async ({ importIt, snapshot }) => {
          await assert.rejects(importIt(), refusedWith(file, reason));
          assert.equal(await snapshot(), null, `${file}: mocks/ is as it was`);
        });
      }
      // Rows no file system lists as a child of the pulled dir: the plan the verb applies refuses them
      // the same way, before any copy is planned.
      const listing = Object.keys(pulledFiles());
      const canvasText = pulledFiles()["project/canvas.json"];
      for (const [file, reason] of [
        ["project/../../.aof/aof.config.json", 'a path may not hold ".."'],
        ["project\\fleet-filter.dc.html", 'a path may not hold "\\"'],
        ["/etc/passwd", 'a path may not start with "/"'],
      ]) {
        const { refusal, plan } = planImport({ pulled: [...listing, file], canvasText, provenance: FLAGS, date: today() });
        assert.equal(plan, undefined, `${file}: nothing is planned`);
        assert.ok(refusal.message.includes(file) && refusal.message.includes(reason), refusal.message);
      }
    },
  },
  {
    name: "198/02 01 outline · a pull that cannot render offline is refused, and nothing is written (3 rows)",
    run: async () => {
      for (const file of ["project/canvas.json", "artifact-type/dc-runtime.js", "project/fleet-filter-390.dc.html"]) {
        const pulled = pulledFiles();
        delete pulled[file];
        await withProject({ pulled }, async ({ importIt, snapshot }) => {
          await assert.rejects(importIt(), refusedWith(file));
          assert.equal(await snapshot(), null, `${file}: mocks/ is as it was`);
        });
      }
    },
  },
  {
    name: "198/02 01 E13 · an import without an approval is refused, and nothing is written",
    run: () => withProject({}, async ({ importIt, snapshot }) => {
      const { approval: _none, ...flags } = FLAGS;
      await assert.rejects(importIt(flags), refusedWith("a baseline only once the operator has approved it"));
      await assert.rejects(importIt({ ...flags, approval: "  " }), refusedWith("a baseline only once the operator has approved it"));
      assert.equal(await snapshot(), null);
    }),
  },
  {
    name: "198/02 01 outline · bad provenance is refused, and nothing is written (4 rows)",
    run: async () => {
      for (const [change, reason, code] of [
        [{ canvas: "https://example.com/x" }, "the link is not a claude.ai artifact link", "design-system-mocks-bad-link"],
        [{ systemVersion: "" }, "the system's version is empty", "design-system-mocks-empty-version"],
        [{ item: "12/01" }, "mocks belong to a milestone", "design-system-mocks-not-a-milestone"],
        [{ item: "99" }, 'No item "99" exists', "ref-not-found"],
      ]) {
        await withProject({}, async ({ importIt, snapshot }) => {
          await assert.rejects(importIt({ ...FLAGS, ...change }), (error) => refusedWith(reason)(error) && error.code === code);
          assert.equal(await snapshot(), null, JSON.stringify(change));
        });
      }
    },
  },
  {
    name: "198/02 01 E14 · a re-approved canvas is re-imported whole, and a hand-written file beside it is untouched",
    run: () => withProject({}, async ({ mocksDir, pull, importIt, capture, readme }) => {
      await importIt();
      await capture();
      await writeFile(path.join(mocksDir, "PROMPT.md"), "# The brief\nMine.\n");
      const v5 = { "fleet-filter.dc.html": BOARDS_V4["fleet-filter.dc.html"] };
      await pull(pulledFiles(v5));
      const approval = "session 7f3c 2026-11-27T10:00:00Z";
      const answer = await importIt({ ...FLAGS, canvasVersion: "5", approval });
      for (const gone of ["fleet-filter-390.dc.html", "fleet-filter-390.png"]) assert.equal(existsSync(path.join(mocksDir, gone)), false, `${gone} is gone`);
      const text = await readme();
      assert.ok(text.includes(`Canvas: ${CANVAS} (version 5)`) && text.includes(`Approval: ${approval}`), text);
      assert.equal(text.includes("## Frames"), false, "no frame table until the next capture");
      assert.equal(await readFile(path.join(mocksDir, "PROMPT.md"), "utf8"), "# The brief\nMine.\n", "PROMPT.md is unchanged");
      assert.ok(answer.removed.includes(`${MOCKS}/fleet-filter-390.dc.html`) && answer.removed.includes(`${MOCKS}/fleet-filter-390.png`), answer.removed.join(", "));
    }),
  },
  {
    name: "198/02 01 · the import refuses to overwrite a README it did not write",
    run: () => withProject({ mocks: { "README.md": "# Mocks\nDrawn by hand.\n" } }, async ({ importIt, snapshot }) => {
      const before = await snapshot();
      await assert.rejects(importIt(), refusedWith("mocks/README.md", "Move it aside"));
      assert.deepEqual(await snapshot(), before);
    }),
  },
  {
    name: "198/02 01 · importing the same version again changes nothing",
    run: () => withProject({}, async ({ importIt, snapshot }) => {
      await importIt();
      const before = await snapshot();
      const again = await importIt();
      assert.equal(again.changed, false, "it reports the import unchanged");
      assert.deepEqual(again.written, []);
      assert.deepEqual(await snapshot(), before, "every file in mocks/ is byte-identical");
    }),
  },
  // ── task 02 · mocks capture ───────────────────────────────────────────────────────────────────
  {
    name: "198/02 02 E16 · each board is framed at its own size, and the frames are recorded",
    run: () => withProject({}, async ({ mocksDir, importIt, capture, readme, asked }) => {
      await importIt();
      const answer = await capture();
      assert.deepEqual(asked.map((request) => [path.basename(request.pagePath), request.width, request.height, request.scale]), [
        ["fleet-filter.dc.html", 1280, 884, 2],
        ["fleet-filter-390.dc.html", 390, 274, 2],
      ], "each board is asked for at its own size, at scale 2, in canvas order");
      assert.ok(asked.every((request) => path.dirname(request.pagePath) === mocksDir), "the imported copy is framed, never the canvas");
      for (const frame of ["fleet-filter.png", "fleet-filter-390.png"]) assert.ok(existsSync(path.join(mocksDir, frame)), frame);
      const table = (await readme()).split("\n").filter((line) => line.startsWith("| `"));
      assert.deepEqual(table, ["| `fleet-filter.png` | `fleet-filter.dc.html` | 1280x884 |", "| `fleet-filter-390.png` | `fleet-filter-390.dc.html` | 390x274 |"]);
      assert.deepEqual(answer.frames.map((frame) => [frame.frame, frame.width, frame.height]), [[`${MOCKS}/fleet-filter.png`, 1280, 884], [`${MOCKS}/fleet-filter-390.png`, 390, 274]]);
    }),
  },
  {
    name: "198/02 02 · capturing again replaces the frames and the table",
    run: () => withProject({}, async ({ importIt, capture, readme }) => {
      await importIt();
      await capture();
      await capture();
      const text = await readme();
      assert.equal(text.split("## Frames").length - 1, 1, "one frame table");
      assert.equal(text.split("\n").filter((line) => line.startsWith("| `")).length, 2, "listing the same two frames");
    }),
  },
  {
    name: "198/02 02 E17 · with no browser, capture is refused with the rasterizer's fix and writes nothing",
    run: () => withProject({
      collaborators: { browser: { ok: false, code: "diagram-png-renderer-missing", message: "No Chromium-family browser was found to render the PNG.", fix: "Install Chrome or Edge, or name a Chromium-family executable with work.diagrams.browser in .aof/aof.config.json or the AOF_DIAGRAM_BROWSER environment variable. aof downloads no browser." } },
    }, async ({ mocksDir, importIt, capture, readme, asked }) => {
      await importIt();
      const before = await readme();
      await assert.rejects(capture(), (error) => refusedWith("work.diagrams.browser", "AOF_DIAGRAM_BROWSER")(error) && error.code === "diagram-png-renderer-missing");
      assert.equal(asked.length, 0, "no page was rendered");
      assert.deepEqual(readdirSync(mocksDir).filter((file) => file.endsWith(".png")), [], "no PNG is written");
      assert.equal(await readme(), before, "README.md is unchanged");
    }),
  },
  {
    name: "198/02 02 · a board the browser fails on stops the capture without a partial table",
    run: () => withProject({ collaborators: { fail: "fleet-filter-390.dc.html" } }, async ({ mocksDir, importIt, capture, readme }) => {
      await importIt();
      const before = await readme();
      await assert.rejects(capture(), refusedWith("fleet-filter-390.dc.html", "exited 1"));
      assert.equal(await readme(), before, "README.md is unchanged");
      assert.deepEqual(readdirSync(mocksDir).filter((file) => file.endsWith(".png")), [], "not even the board that succeeded is written");
    }),
  },
  {
    // Review close (198/02): Q5's rule, "never overwrite a file it did not write", holds for frames too.
    name: "198/02 02 · capture refuses to overwrite a frame it did not write",
    run: () => withProject({ mocks: { "fleet-filter.png": "a hand-taken frame" } }, async ({ mocksDir, importIt, capture, readme, asked }) => {
      await importIt();
      const before = await readme();
      await assert.rejects(capture(), refusedWith("mocks/fleet-filter.png", "Move it aside"));
      assert.equal(asked.length, 0, "nothing is rendered");
      assert.equal(await readFile(path.join(mocksDir, "fleet-filter.png"), "utf8"), "a hand-taken frame");
      assert.equal(await readme(), before, "README.md is unchanged");
    }),
  },
  {
    name: "198/02 02 E18 · capture with nothing imported is refused, saying to import first",
    run: async () => {
      for (const mocks of [{}, { "README.md": "# Mocks\nDrawn by hand.\n" }]) {
        await withProject({ mocks }, async ({ capture }) => {
          await assert.rejects(capture(), refusedWith('Run "aof design-system mocks import" first'));
        });
      }
    },
  },
  {
    name: "198/02 02 outline · a board with no usable size is refused (2 rows)",
    run: async () => {
      for (const frame of [{ x: 0, y: 0, w: 0, h: 884 }, { x: 0, y: 0, w: 1280 }]) {
        await withProject({ pulled: pulledFiles({ ...BOARDS_V4, "fleet-filter.dc.html": frame }) }, async ({ importIt, capture, asked }) => {
          await importIt();
          await assert.rejects(capture(), refusedWith("fleet-filter.dc.html", "its size is not usable"));
          assert.equal(asked.length, 0, `${JSON.stringify(frame)}: nothing is rendered`);
        });
      }
    },
  },
  {
    name: "198/02 02 · the package spawns nothing: no module under packages/design-system/src imports node:child_process",
    run: async () => {
      const dir = path.join(PACKAGE, "src");
      const modules = readdirSync(dir).filter((name) => name.endsWith(".mjs"));
      assert.ok(modules.includes("mocks.mjs") && modules.includes("commands.mjs"), "the sweep reads the mocks verbs");
      for (const name of modules) {
        const text = await readFile(path.join(dir, name), "utf8");
        assert.equal(/["'](?:node:)?child_process["']/u.test(text), false, `${name} reaches no child process`);
      }
    },
  },
  // ── 198 amended 2026-11-27 · one canvas, a page per milestone ─────────────────────────────────
  {
    name: "198/02 01 E21 · --page imports that page's boards alone, and capture frames only them",
    run: async () => {
      const boards = {
        "other.dc.html": { x: 0, y: 0, w: 800, h: 600 },
        "fleet-filter.dc.html": { x: 0, y: 0, w: 1280, h: 884, page: "m12" },
        "fleet-filter-390.dc.html": { x: 1340, y: 0, w: 390, h: 274, page: "m12" },
      };
      const pulled = pulledFiles(boards);
      const canvas = JSON.parse(pulled["project/canvas.json"]);
      canvas.pages = [{ id: "earlier", name: "Portal" }, { id: "m12", name: "12 Fleet filter" }];
      canvas.notes = { a: { x: 0, y: -300, text: "Earlier" }, b: { x: 0, y: -300, text: "Filter", page: "m12" } };
      pulled["project/canvas.json"] = `${JSON.stringify(canvas, null, 2)}\n`;
      delete pulled["project/other.dc.html"];
      await withProject({ pulled }, async ({ mocksDir, importIt, capture, readme }) => {
        const answer = await importIt({ ...FLAGS, page: "m12" });
        assert.equal(answer.canvas.page, "m12");
        const written = JSON.parse(await readFile(path.join(mocksDir, "canvas.json"), "utf8"));
        assert.deepEqual(Object.keys(written.boards), ["fleet-filter.dc.html", "fleet-filter-390.dc.html"], "only the page's boards");
        assert.deepEqual(written.order, ["fleet-filter.dc.html", "fleet-filter-390.dc.html"]);
        assert.deepEqual(written.pages, [{ id: "m12", name: "12 Fleet filter" }]);
        assert.deepEqual(Object.keys(written.notes), ["b"], "only the page's notes");
        assert.ok((await readme()).split("\n").includes("Page: m12 (12 Fleet filter)"));
        const again = await importIt({ ...FLAGS, page: "m12" });
        assert.equal(again.changed, false, "the same page at the same version is unchanged");
        const framed = await capture();
        assert.deepEqual(framed.frames.map((frame) => frame.board), ["fleet-filter.dc.html", "fleet-filter-390.dc.html"]);
      });
    },
  },
  {
    name: "198/02 01 E22 · a board with no page is on the first page, and a board from another page is refused",
    run: async () => {
      const boards = { "old.dc.html": { x: 0, y: 0, w: 800, h: 600 }, "new.dc.html": { x: 0, y: 0, w: 800, h: 600, page: "m12" } };
      const pulled = pulledFiles(boards);
      const canvas = JSON.parse(pulled["project/canvas.json"]);
      canvas.pages = [{ id: "earlier", name: "Portal" }, { id: "m12", name: "12 Fleet filter" }];
      pulled["project/canvas.json"] = `${JSON.stringify(canvas, null, 2)}\n`;
      await withProject({ pulled }, async ({ importIt, snapshot }) => {
        const before = await snapshot();
        await assert.rejects(importIt({ ...FLAGS, page: "m12" }), refusedWith("project/old.dc.html", "another page"));
        assert.deepEqual(await snapshot(), before, "nothing is written");
      });
      const earlier = pulledFiles(boards);
      earlier["project/canvas.json"] = pulled["project/canvas.json"];
      delete earlier["project/new.dc.html"];
      await withProject({ pulled: earlier }, async ({ mocksDir, importIt }) => {
        await importIt({ ...FLAGS, page: "earlier" });
        assert.deepEqual(Object.keys(JSON.parse(await readFile(path.join(mocksDir, "canvas.json"), "utf8")).boards), ["old.dc.html"]);
      });
    },
  },
  {
    name: "198/02 01 E23 · a page the canvas does not hold, or one with no boards, is refused, naming the pages",
    run: async () => {
      const pulled = pulledFiles();
      const canvas = JSON.parse(pulled["project/canvas.json"]);
      canvas.pages = [{ id: "earlier", name: "Portal" }, { id: "m13", name: "13 Next" }];
      pulled["project/canvas.json"] = `${JSON.stringify(canvas, null, 2)}\n`;
      await withProject({ pulled }, async ({ importIt }) => {
        await assert.rejects(importIt({ ...FLAGS, page: "m12" }), refusedWith('no page "m12"', '"earlier", "m13"'));
        await assert.rejects(importIt({ ...FLAGS, page: "m13" }), refusedWith('no boards on the page "m13"'));
      });
    },
  },
  // ── 198 amended 2026-11-27 · canvas pages: sorted once by the verb, never by eye ─────────────
  {
    name: "198/02 01 E25 · a canvas with no pages is sorted once by the milestone number each title starts with, and only each board's page changes",
    run: async () => {
      const canvas = {
        v: 3, title: "Portal Redesign", pages: [], order: ["a.dc.html", "b.dc.html", "c.dc.html"], notes: { n: { x: 0, y: -300, text: "Flows" } },
        boards: {
          "a.dc.html": { x: 0, y: 0, w: 800, h: 600, title: "37 · A discussion on a CRM company" },
          "b.dc.html": { x: 880, y: 0, w: 800, h: 600, title: "Shell — product nav" },
          "c.dc.html": { x: 0, y: 720, w: 390, h: 844, title: "034 · Messaging at 390 px" },
        },
      };
      await withProject({}, async ({ root, pagesOf, readJson }) => {
        await write(root, { "pulled/canvas.json": JSON.stringify(canvas) });
        const answer = await pagesOf({ canvas: "pulled/canvas.json", out: "out/canvas.json", item: "12" });
        assert.equal(answer.changed, true);
        assert.deepEqual(answer.pages.map((page) => [page.id, page.boards]), [["earlier", ["b.dc.html"]], ["m34", ["c.dc.html"]], ["m37", ["a.dc.html"]], ["m12", []]]);
        assert.equal(answer.pages[0].name, "Portal Redesign", "earlier is named for the canvas, and first, so its notes stay with it");
        assert.equal(answer.pages.at(-1).name, "12 fleet-filter", "the asked-for milestone's page is named for it");
        assert.deepEqual(answer.moved.map((entry) => entry.page), ["m37", "earlier", "m34"]);
        const written = await readJson("out/canvas.json");
        for (const [name, frame] of Object.entries(canvas.boards)) {
          const { page, ...rest } = written.boards[name];
          assert.deepEqual(rest, frame, `${name}: only its page changed`);
          assert.ok(page, `${name} has a page`);
        }
        assert.deepEqual(written.notes, canvas.notes);
        assert.deepEqual(written.order, canvas.order);
      });
    },
  },
  {
    name: "198/02 01 E26 · a canvas that has pages is never re-sorted: only the milestone's missing page is added, and one already there changes nothing",
    run: async () => {
      const canvas = { pages: [{ id: "earlier", name: "Portal" }], boards: { "x.dc.html": { x: 0, y: 0, w: 10, h: 10, title: "37 · Late" } } };
      await withProject({}, async ({ root, pagesOf, readJson }) => {
        await write(root, { "pulled/canvas.json": JSON.stringify(canvas) });
        const added = await pagesOf({ canvas: "pulled/canvas.json", out: "out/canvas.json", item: "12" });
        assert.deepEqual(added.moved, [], "no board is moved");
        assert.deepEqual(added.added, ["m12"]);
        assert.equal((await readJson("out/canvas.json")).boards["x.dc.html"].page, undefined, "the board stays on the first page");
        await write(root, { "pulled/canvas.json": JSON.stringify(await readJson("out/canvas.json")) });
        const again = await pagesOf({ canvas: "pulled/canvas.json", out: "out/again.json", item: "12" });
        assert.equal(again.changed, false);
        assert.equal(again.page, "m12");
      });
    },
  },
  {
    name: "198/02 01 E28 · a milestone's own page is found by the number its name starts with, and a ref's leading zero is the stream's spelling",
    run: async () => {
      // The shape of a real canvas: pages the operator made, named for their milestones, with ids of their own.
      const handMade = { pages: [{ id: "portal-03", name: "03 · Task portal" }, { id: "directory-05", name: "05 · Directory" }], boards: { "d.dc.html": { x: 0, y: 0, w: 10, h: 10, title: "Directory · setup", page: "directory-05" } } };
      const unpaged = { pages: [], boards: { "e.dc.html": { x: 0, y: 0, w: 10, h: 10, title: "5 · Directory at 390" } } };
      await withProject({}, async ({ root, pagesOf, readJson }) => {
        await write(root, { "pulled/hand.json": JSON.stringify(handMade), "pulled/unpaged.json": JSON.stringify(unpaged) });
        for (const item of ["05", "5"]) {
          const found = await pagesOf({ canvas: "pulled/hand.json", out: `out/hand-${item}.json`, item });
          assert.equal(found.changed, false, `--item ${item}: no page is added beside the operator's own`);
          assert.equal(found.page, "directory-05", `--item ${item}: the operator's page is the milestone's page`);
        }
        const sorted = await pagesOf({ canvas: "pulled/unpaged.json", out: "out/unpaged.json", item: "5" });
        assert.deepEqual(sorted.pages.map((page) => [page.id, page.name, page.boards]), [["m05", "05 Directory provider contract and Connect Google", ["e.dc.html"]]], "the board and the item share one page, spelt as the stream spells the ref");
        assert.equal(sorted.page, "m05");
        assert.equal((await readJson("out/unpaged.json")).boards["e.dc.html"].page, "m05");
      });
    },
  },
  {
    name: "198/02 01 E27 · over the type's 40 pages, a story, or an unreadable index is refused, writing nothing",
    run: async () => {
      const boards = Object.fromEntries(Array.from({ length: 41 }, (_, n) => [`b${n}.dc.html`, { title: `${n + 1} · board` }]));
      await withProject({}, async ({ root, pagesOf }) => {
        await write(root, { "pulled/full.json": JSON.stringify({ pages: [], boards }), "pulled/ok.json": JSON.stringify({ pages: [], boards: {} }) });
        await assert.rejects(pagesOf({ canvas: "pulled/full.json", out: "out/a.json" }), (error) => error.code === "design-system-canvas-full" && /limit of 40/.test(error.message));
        await assert.rejects(pagesOf({ canvas: "pulled/ok.json", out: "out/b.json", item: "12/01" }), (error) => error.code === "design-system-mocks-not-a-milestone");
        await assert.rejects(pagesOf({ canvas: "pulled/missing.json", out: "out/c.json" }), (error) => error.code === "design-system-unreadable");
        assert.equal(existsSync(path.join(root, "out")), false, "nothing is written");
      });
    },
  },
];
