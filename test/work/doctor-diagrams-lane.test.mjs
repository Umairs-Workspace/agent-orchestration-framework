// milestone 133 / story 03 — the diagrams doctor lane (ADR-006): tasks 00 and 01.
//
// The lane is asked over LITERAL snapshots whose item dirs name directories that do not exist, so a
// lane that reached the disk would see nothing and the rows would fail. The engine's half — the one
// `diagrams/` listing per item — is driven end to end through the real CLI, and the repository's
// own stream is swept for any `diagram-*` finding.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { invoke, loadWorkspace } from "../../src/command-core.mjs";
import { renderDiagramBlock } from "../../src/diagrams/layout.mjs";
import { CHECK_GROUPS } from "../../src/work/doctor.mjs";
import { DIAGRAM_LANE_CODES, diagramsGroup } from "../../src/work/doctor-diagrams.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");
const GHOST = path.join(os.tmpdir(), "aof-diagrams-lane-no-such-dir", "07_milestone_m");
const ON = (formats = ["svg", "png"]) => ({ work: { diagrams: { generator: "diagram-design", formats } } });
const BLOCK = renderDiagramBlock({ adrId: "ADR-002", title: "seam", stem: "ADR-002-seam", sourceExt: ".html", formats: ["svg", "png"] });

const item = ({ architecture, listing, status = "in-progress", dir = GHOST, ref = "07" }) => ({
  ref,
  type: "milestone",
  dir,
  meta: { status },
  docTexts: architecture == null ? {} : { "ARCHITECTURE.md": architecture },
  diagramListing: listing,
});

const ask = (items, config = ON()) => diagramsGroup({ items: [].concat(items) }, { config });
const shape = (findings) => findings.map((finding) => [finding.code, finding.severity]).sort();
const doc = (...lines) => lines.join("\n");
const WITH_BLOCK = doc("# 07", "", "## ADR-002 — seam", "", BLOCK, "");
const ALL = ["ADR-002-seam.html", "ADR-002-seam.png", "ADR-002-seam.svg"];

export const doctorDiagramsLaneTests = [
  {
    name: "133/03 task 00: each linked file must be present",
    run: () => {
      assert.deepEqual(ask(item({ architecture: WITH_BLOCK, listing: ALL })), []);
      const svgPng = ask(item({ architecture: WITH_BLOCK, listing: ["ADR-002-seam.png", "ADR-002-seam.svg"] }));
      assert.deepEqual(shape(svgPng), [["diagram-link-missing", "error"]]);
      assert.match(svgPng[0].message, /diagrams\/ADR-002-seam\.html/);
      assert.deepEqual(shape(ask(item({ architecture: WITH_BLOCK, listing: ["ADR-002-seam.html", "ADR-002-seam.png"] }))), [["diagram-export-missing", "error"], ["diagram-link-missing", "error"]]);
      const noPng = ask(item({ architecture: WITH_BLOCK, listing: ["ADR-002-seam.html", "ADR-002-seam.svg"] }));
      assert.deepEqual(shape(noPng), [["diagram-export-missing", "error"], ["diagram-link-missing", "error"]]);
      assert.ok(noPng.every((finding) => finding.message.includes(".png")), "both name the .png");
      const none = ask(item({ architecture: WITH_BLOCK, listing: null }));
      assert.deepEqual(shape(none), [
        ["diagram-export-missing", "error"], ["diagram-export-missing", "error"],
        ["diagram-link-missing", "error"], ["diagram-link-missing", "error"], ["diagram-link-missing", "error"],
      ]);
    },
  },
  {
    name: "133/03 task 00: an export is owed even when the pasted block forgot to link it",
    run: () => {
      const text = doc("## ADR-002 — seam", "![a](diagrams/ADR-002-seam.svg)", "[s](diagrams/ADR-002-seam.html)");
      const listing = ["ADR-002-seam.html", "ADR-002-seam.svg"];
      const owed = ask(item({ architecture: text, listing }), ON(["svg", "png"]));
      assert.deepEqual(shape(owed), [["diagram-export-missing", "error"]]);
      assert.match(owed[0].message, /ADR-002-seam\.png/);
      assert.deepEqual(ask(item({ architecture: text, listing }), ON(["svg"])), []);
      assert.deepEqual(ask(item({ architecture: text, listing }), {}), [], "only the SVG is owed while diagrams are off");
    },
  },
  {
    name: "133/03 task 00: a delivered item's missing export is reported, but does not gate",
    run: () => {
      const text = doc("## ADR-002 — seam", "![a](diagrams/ADR-002-seam.svg)");
      assert.deepEqual(shape(ask(item({ architecture: text, listing: ["ADR-002-seam.html"], status: "done" }), ON(["svg"]))), [["diagram-export-missing", "warn"], ["diagram-link-missing", "warn"]]);
    },
  },
  {
    name: "133/03 task 00: a row this node does not hold is skipped",
    run: () => {
      assert.deepEqual(ask(item({ architecture: WITH_BLOCK, listing: null, dir: null })), []);
    },
  },
  {
    name: "133/03 task 00: a finding names where to look",
    run: () => {
      const lines = Array.from({ length: 36 }, (_, index) => `filler ${index}`);
      const text = doc(...lines, "## ADR-002 — seam", "", BLOCK);
      // The block's Source line — and so the `.html` link — is line 36 + 1 + 1 + 3 = 41.
      const [missing] = ask(item({ architecture: text, listing: ["ADR-002-seam.png", "ADR-002-seam.svg"] }));
      assert.equal(missing.code, "diagram-link-missing");
      assert.match(missing.message, /ADR-002/);
      assert.match(missing.message, /line 41/);
      assert.match(missing.message, /diagrams\/ADR-002-seam\.html/);
      assert.ok(missing.message.startsWith("07:"), "the finding carries the item's ref");
    },
  },
  {
    name: "133/03 task 00: the engine carries the lane end to end, and a repaired block goes clean",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-diagrams-doctor-"));
      try {
        const project = path.join(root, "P");
        const milestone = path.join(project, "wiki", "work", "07_milestone_m");
        await mkdir(path.join(milestone, "diagrams"), { recursive: true });
        await mkdir(path.join(project, ".aof"), { recursive: true });
        await mkdir(path.join(root, "G"));
        await writeFile(path.join(project, ".aof", "aof.config.json"), JSON.stringify({ name: "p", resources: [], work: { dir: "./wiki/work", diagrams: { generator: "diagram-design" } } }), "utf8");
        await writeFile(path.join(milestone, "SPEC.md"), "---\ntype: milestone\nnumber: 07\nslug: m\ntitle: m\nstatus: in-progress\nschema: 1\n---\n# 07 · m\n", "utf8");
        await writeFile(path.join(milestone, "ARCHITECTURE.md"), doc("# 07", "", "## ADR-002 — seam", "", "![a](diagrams/ADR-002-seam.svg)", ""), "utf8");
        await writeFile(path.join(milestone, "diagrams", "ADR-002-seam.html"), "<svg viewBox='0 0 1 1'></svg>", "utf8");
        const doctor = () => {
          const result = spawnSync(process.execPath, [cliPath, "work", "doctor", "07", "--json"], {
            cwd: project, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, "G"), NODE_NO_WARNINGS: "1" },
          });
          return JSON.parse(result.stdout).findings.filter((finding) => finding.code.startsWith("diagram-"));
        };
        const first = doctor();
        assert.ok(first.some((f) => f.code === "diagram-link-missing" && f.severity === "error"), JSON.stringify(first));
        assert.ok(first.some((f) => f.code === "diagram-export-missing" && f.severity === "error"));
        await writeFile(path.join(milestone, "diagrams", "ADR-002-seam.svg"), "<svg/>", "utf8");
        await writeFile(path.join(milestone, "diagrams", "ADR-002-seam.png"), "png", "utf8");
        await writeFile(path.join(milestone, "ARCHITECTURE.md"), doc("# 07", "", "## ADR-002 — seam", "", BLOCK, ""), "utf8");
        assert.deepEqual(doctor(), []);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "133/03 task 01: a link's stem must name the ADR it sits under",
    run: () => {
      const listing = ["ADR-002-seam.html", "ADR-002-seam.svg", "ADR-002-seam.png", "ADR-003-seam.html", "ADR-003-seam.svg", "ADR-003-seam.png"];
      assert.deepEqual(ask(item({ architecture: doc("## ADR-002 — a", "![a](diagrams/ADR-002-seam.svg)"), listing: listing.slice(0, 3) }), ON(["svg"])), []);
      const wrong = ask(item({ architecture: doc("## ADR-002 — a", "![a](diagrams/ADR-003-seam.svg)"), listing: listing.slice(3) }), ON(["svg"]));
      assert.deepEqual(shape(wrong), [["diagram-adr-mismatch", "error"]]);
      assert.match(wrong[0].message, /ADR-002/);
      assert.match(wrong[0].message, /ADR-003-seam/);
      assert.match(wrong[0].message, /line 2/);
      const above = ask(item({ architecture: doc("![a](diagrams/ADR-002-seam.svg)", "## ADR-002 — a"), listing: listing.slice(0, 3) }), ON(["svg"]));
      assert.deepEqual(shape(above), [["diagram-adr-mismatch", "error"]]);
      assert.match(above[0].message, /under no ADR/);
      const done = ask(item({ architecture: doc("## ADR-002 — a", "![a](diagrams/ADR-003-seam.svg)"), listing: listing.slice(3), status: "done" }), ON(["svg"]));
      assert.deepEqual(shape(done), [["diagram-adr-mismatch", "warn"]]);
    },
  },
  {
    name: "133/03 task 01: an unlinked file is a warning",
    run: () => {
      for (const [extra, expected] of [[null, []], ["ADR-002-seam-v1.html", ["ADR-002-seam-v1.html"]], ["ADR-004-other.svg", ["ADR-004-other.svg"]], ["notes.txt", ["notes.txt"]]]) {
        const found = ask(item({ architecture: WITH_BLOCK, listing: [...ALL, ...(extra ? [extra] : [])] }));
        assert.deepEqual(shape(found), expected.map(() => ["diagram-orphan", "warn"]), String(extra));
        for (const name of expected) assert.ok(found[0].message.includes(name));
      }
    },
  },
  {
    name: "133/03 task 01: an unlinked export of a linked stem is not an orphan, and an orphan warns on an open item",
    run: () => {
      const found = ask(item({ architecture: doc("## ADR-002 — a", "![a](diagrams/ADR-002-seam.svg)"), listing: ALL }));
      assert.equal(found.some((f) => f.code === "diagram-orphan"), false);
      assert.deepEqual(shape(ask(item({ architecture: doc("## ADR-001 — x", "prose"), listing: ["ADR-001-x.svg"] }))), [["diagram-orphan", "warn"]]);
    },
  },
  {
    name: "133/03 task 01: an item with no diagrams reports nothing",
    run: () => {
      const tenAdrs = Array.from({ length: 10 }, (_, i) => `## ADR-${String(i + 1).padStart(3, "0")} — d${i}\n\nprose`).join("\n\n");
      assert.deepEqual(ask(item({ architecture: null, listing: null })), []);
      assert.deepEqual(ask(item({ architecture: tenAdrs, listing: null })), []);
      assert.deepEqual(ask(item({ architecture: doc("## ADR-001 — a", "[spec](../SPEC.md)", "![m](mocks/board.png)"), listing: null })), []);
    },
  },
  {
    name: "133/03 task 01: this repository's own stream carries no diagram finding",
    run: async () => {
      const workspace = await loadWorkspace(repoRoot);
      const { findings } = await invoke("work:doctor", {}, { workspace });
      assert.deepEqual(findings.filter((finding) => finding.code.startsWith("diagram-")), []);
    },
  },
  {
    name: "133/03 task 01: the lane is registered where the roster says lanes are registered, and its codes are its own",
    run: async () => {
      assert.equal(CHECK_GROUPS.at(-1), diagramsGroup, "diagramsGroup is the registry's last entry");
      const spine = await readFile(path.join(repoRoot, "src", "work", "doctor.mjs"), "utf8");
      assert.match(spine, /from\s*["']\.\/doctor-diagrams\.mjs["']/);
      const roster = await readFile(path.join(repoRoot, "test", "arch", "audit", "acd-controls-never-execute.test.mjs"), "utf8");
      assert.match(roster, /"\.\/doctor-diagrams\.mjs"/, "DOCTOR_LANE_MODULES names the lane");
      const others = (await readdir(path.join(repoRoot, "src", "work"))).filter((name) => /^doctor(-.*)?\.mjs$/.test(name) && name !== "doctor-diagrams.mjs");
      assert.ok(others.length >= 8, "the other lanes and the spine are swept");
      for (const name of others) {
        const source = await readFile(path.join(repoRoot, "src", "work", name), "utf8");
        for (const code of DIAGRAM_LANE_CODES) assert.equal(source.includes(`"${code}"`), false, `${name} emits ${code}`);
      }
    },
  },
];
