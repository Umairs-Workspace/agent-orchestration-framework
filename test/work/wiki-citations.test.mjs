// Traceability wiring for milestone 161 / story 01 — the wiki source-citation probe.
//
// Covers the probe-level behaviour of tasks 01_report-unresolved-source-citations and
// 02_check-the-workspace-wiki: extraction policy (source files only, full prefixes, no URLs, no
// families, no directories), resolution through the shared resolver (current file, recorded move,
// chained move, deleted destination, directory-only), de-duplication to the first occurrence,
// stable ordering, traversal containment, no execution, direct-pages-only scope and the unreadable
// findings. The command-edge and CLI behaviour lives in doctor-command-core.test.mjs.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildRenameMap } from "../../packages/work/src/cited-path-resolve.mjs";
import { UNREADABLE_CODE, UNRESOLVED_CODE, probeWikiCitations, sourceCitationsIn } from "../../packages/work/src/wiki-citations.mjs";

async function project(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-wiki-cite-"));
  for (const [rel, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), text, "utf8");
  }
  return root;
}

async function probing(files, { renameMap = new Map(), then } = {}) {
  const root = await project(files);
  try {
    const found = await probeWikiCitations({ projectRoot: root, renameMap });
    return await then?.(found, root) ?? found;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const unresolved = (found) => found.filter((finding) => finding.code === UNRESOLVED_CODE);

export const wikiCitationTests = [
  {
    name: "wiki-citations/R1 E1 a nonexistent source file is named at its wiki occurrence",
    async run() {
      await probing({ "wiki/memory.md": "a\nb\nc\nSee `src/never-existed.mjs` here.\n" }, {
        then(found, root) {
          assert.equal(found.length, 1);
          assert.equal(found[0].code, "wiki-source-unresolved");
          assert.equal(found[0].severity, "warn");
          assert.equal(found[0].path, path.join(root, "wiki", "memory.md"));
          assert.match(found[0].message, /src\/never-existed\.mjs/u);
          assert.match(found[0].message, /line 4/u);
        },
      });
    },
  },
  {
    name: "wiki-citations/R1 E2 a recorded move to an existing file keeps the citation valid; E3 a deleted destination does not",
    async run() {
      const renameMap = buildRenameMap([
        { from: "src/moved.mjs", to: "packages/work/src/moved.mjs" },
        { from: "src/deleted.mjs", to: "packages/work/src/deleted.mjs" },
      ]);
      await probing({
        "wiki/memory.md": "src/moved.mjs and src/deleted.mjs\n",
        "packages/work/src/moved.mjs": "export {};\n",
      }, {
        renameMap,
        then(found) {
          assert.deepEqual(unresolved(found).map((finding) => /src\/\w+\.mjs/u.exec(finding.message)[0]), ["src/deleted.mjs"]);
        },
      });
    },
  },
  {
    name: "wiki-citations/R1 current files and chained moves resolve without requiring old line numbers",
    async run() {
      const renameMap = buildRenameMap([
        { from: "src/first.mjs", to: "src/second.mjs" },
        { from: "src/second.mjs", to: "packages/work/src/final.mjs" },
        { from: "src/loop-a.mjs", to: "src/loop-b.mjs" },
        { from: "src/loop-b.mjs", to: "src/loop-a.mjs" },
      ]);
      const rows = [
        ["src/current.mjs", 0],
        ["../src/current.mjs:9999", 0],
        ["src/current.mjs#L9999", 0],
        ["src/first.mjs", 0],
        ["src/loop-a.mjs", 1],
        ["src/directory.mjs", 1],
        ["src/missing.mjs", 1],
      ];
      for (const [citation, warnings] of rows) {
        await probing({
          "wiki/memory.md": `cites ${citation}\n`,
          "src/current.mjs": "1\n2\n3\n",
          "packages/work/src/final.mjs": "export {};\n",
          "src/directory.mjs/inner.txt": "a directory, not a file\n",
        }, {
          renameMap,
          then(found) {
            assert.equal(unresolved(found).length, warnings, `${citation} → ${warnings} warning(s)`);
          },
        });
      }
    },
  },
  {
    name: "wiki-citations/R1 local citations retain their entire source path",
    async run() {
      const rows = [
        ["[implementation](../packages/work/src/absent.mjs)", 1, "packages/work/src/absent.mjs"],
        ["inline `apps/ui/src/absent.tsx` code", 1, "apps/ui/src/absent.tsx"],
        ["```js\nimport x from 'src/absent.js';\n```", 1, "src/absent.js"],
        ["[external](https://example.com/src/absent.mjs)", 0, null],
        ["the family src/*.mjs", 0, null],
        ["the directory src/", 0, null],
        ["the non-source file test/absent.test.mjs", 0, null],
      ];
      for (const [form, warnings, cited] of rows) {
        await probing({ "wiki/page.md": `${form}\n` }, {
          then(found) {
            const hits = unresolved(found);
            assert.equal(hits.length, warnings, form);
            if (cited != null) assert.ok(hits[0].message.includes(cited), `${form} → ${hits[0].message}`);
          },
        });
      }
    },
  },
  {
    name: "wiki-citations/R1 repeated link labels and locators produce one finding at the first occurrence, identically on repeat",
    async run() {
      const files = { "wiki/memory.md": "x\ny\nz\n[src/missing.mjs](src/missing.mjs)\nq\nr\ns\nt\nsee ../src/missing.mjs:12\n" };
      const first = await probing(files, { then: (found, root) => found.map((finding) => ({ ...finding, path: path.relative(root, finding.path) })) });
      const second = await probing(files, { then: (found, root) => found.map((finding) => ({ ...finding, path: path.relative(root, finding.path) })) });
      assert.equal(first.length, 1);
      assert.match(first[0].message, /line 4/u);
      assert.deepEqual(first, second);
    },
  },
  {
    name: "wiki-citations/R1 a source file is inspected for existence without being run",
    async run() {
      const root = await project({
        "wiki/memory.md": "cites src/side-effect.mjs\n",
        "src/side-effect.mjs": 'import { writeFileSync } from "node:fs";\nwriteFileSync(new URL("./marker.txt", import.meta.url), "ran");\n',
      });
      try {
        assert.deepEqual(unresolved(await probeWikiCitations({ projectRoot: root, renameMap: new Map() })), []);
        await assert.rejects(import("node:fs/promises").then((fs) => fs.stat(path.join(root, "src", "marker.txt"))), { code: "ENOENT" });
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "wiki-citations/R1 an external traversal cannot be accepted as a project source citation",
    async run() {
      const outer = await mkdtemp(path.join(os.tmpdir(), "aof-wiki-out-"));
      try {
        await mkdir(path.join(outer, "outside", "src"), { recursive: true });
        await writeFile(path.join(outer, "outside", "src", "secret.mjs"), "export {};\n", "utf8");
        await mkdir(path.join(outer, "proj", "wiki"), { recursive: true });
        await writeFile(path.join(outer, "proj", "wiki", "page.md"), "see docs/../../outside/src/secret.mjs\n", "utf8");
        const found = await probeWikiCitations({ projectRoot: path.join(outer, "proj"), renameMap: new Map() });
        assert.equal(unresolved(found).length, 1);
      } finally {
        await rm(outer, { recursive: true, force: true });
      }
    },
  },
  {
    name: "wiki-citations/R2 only direct pages are checked; nested records are outside; a missing wiki is silent",
    async run() {
      await probing({
        "wiki/memory.md": "src/ok.mjs\n",
        "src/ok.mjs": "export {};\n",
        "wiki/work/old/SPEC.md": "src/absent.mjs\n",
        "wiki/notes.txt": "src/absent.mjs\n",
      }, { then: (found) => assert.deepEqual(found, []) });
      await probing({ "src/ok.mjs": "x\n" }, { then: (found) => assert.deepEqual(found, []) });
    },
  },
  {
    name: "wiki-citations/R2 every direct page is checked, including one added later, in stable page order",
    async run() {
      await probing({
        "wiki/memory.md": "src/ok.mjs\n",
        "src/ok.mjs": "x\n",
        "wiki/new-guide.md": "src/gone-a.mjs\n",
        "wiki/agents.md": "src/gone-b.mjs\n",
      }, {
        then(found, root) {
          assert.deepEqual(found.map((finding) => path.relative(root, finding.path)), [path.join("wiki", "agents.md"), path.join("wiki", "new-guide.md")]);
        },
      });
    },
  },
  {
    name: "wiki-citations/R2 an unreadable page or directory is reported, never claimed clean, and other pages still count",
    async run() {
      const root = await project({ "wiki/agents.md": "src/a.mjs\n", "wiki/other.md": "src/gone.mjs\n" });
      try {
        // A directory named like a page: reading it fails (EISDIR) after the listing succeeded.
        await mkdir(path.join(root, "wiki", "broken.md"), { recursive: true });
        const found = await probeWikiCitations({ projectRoot: root, renameMap: new Map() });
        assert.equal(found.filter((finding) => finding.code === UNREADABLE_CODE).length, 0, "a directory entry is simply not a page");
        assert.equal(unresolved(found).length, 2, "both readable pages were still checked");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
      // The wiki "directory" is a file: the listing cannot succeed.
      const odd = await project({ wiki: "not a directory\n" });
      try {
        assert.deepEqual(await probeWikiCitations({ projectRoot: odd, renameMap: new Map() }), []);
      } finally {
        await rm(odd, { recursive: true, force: true });
      }
    },
  },
  {
    name: "wiki-citations/R2 a permission failure is reported against the unreadable input; other pages are still checked",
    async run() {
      const denied = (code = "EACCES") => Object.assign(new Error(code), { code });
      const files = { "wiki/agents.md": "src/a.mjs\n", "wiki/other.md": "src/gone.mjs\n" };
      const { readFile } = await import("node:fs/promises");
      await probing(files, {
        then: async (_found, root) => {
          const listing = await probeWikiCitations({ projectRoot: root, renameMap: new Map(), io: { readdir: async () => { throw denied(); } } });
          assert.deepEqual(listing.map((finding) => [finding.code, finding.path]), [[UNREADABLE_CODE, path.join(root, "wiki")]]);
          const page = await probeWikiCitations({
            projectRoot: root,
            renameMap: new Map(),
            io: { readFile: async (file, enc) => { if (file.endsWith("agents.md")) throw denied(); return readFile(file, enc); } },
          });
          assert.deepEqual(page.map((finding) => [finding.code, path.basename(finding.path)]), [[UNREADABLE_CODE, "agents.md"], [UNRESOLVED_CODE, "other.md"]]);
          assert.match(page[0].message, /NOT checked/u);
        },
      });
    },
  },
  {
    name: "wiki-citations/R2 a Markdown symlink pointing outside the project is reported unreadable, not followed",
    async run() {
      const outer = await mkdtemp(path.join(os.tmpdir(), "aof-wiki-link-"));
      try {
        await mkdir(path.join(outer, "proj", "wiki"), { recursive: true });
        await writeFile(path.join(outer, "elsewhere.md"), "src/absent.mjs\n", "utf8");
        await writeFile(path.join(outer, "proj", "wiki", "ok.md"), "src/absent2.mjs\n", "utf8");
        try {
          await symlink(path.join(outer, "elsewhere.md"), path.join(outer, "proj", "wiki", "agents.md"), "file");
        } catch (error) {
          if (error?.code === "EPERM" || error?.code === "EACCES") return; // symlinks unavailable to this user
          throw error;
        }
        const found = await probeWikiCitations({ projectRoot: path.join(outer, "proj"), renameMap: new Map() });
        const bad = found.filter((finding) => finding.code === UNREADABLE_CODE);
        assert.deepEqual(bad.map((finding) => path.basename(finding.path)), ["agents.md"]);
        assert.match(bad[0].message, /NOT checked/u);
        assert.equal(unresolved(found).length, 1, "the readable page is still checked; the external target is never read");
      } finally {
        await rm(outer, { recursive: true, force: true });
      }
    },
  },
  {
    name: "wiki-citations: the extractor reports the first line of each normalized source file",
    run() {
      const found = sourceCitationsIn("x\n`src/a.mjs:3` and [l](../src/a.mjs#L9)\nhttps://h.example/src/u.mjs\nsrc/*.mjs src/\n");
      assert.deepEqual([...found], [["src/a.mjs", 2]]);
    },
  },
];
