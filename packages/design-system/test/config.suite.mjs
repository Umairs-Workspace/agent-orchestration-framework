// Traceability wiring for milestone 198 / story 01 — "aof design-system use" and the block's shape check.
//
// Covers the R5 scenarios of
//   tasks/04_use-names-one-system-and-the-validator-holds-it.feature, E22 and E23 (the canvas,
//   amended 2026-11-27) among them,
// and the shape check's codes at the package seam. The R6 scenarios run through `aof project
// validate`'s own validator in test/command/config-inspect.test.mjs (`designSystemBlockTests`).
//
// The verb is built from the package's own factory and run over a copy of this repository's own
// `.aof/aof.config.json`, in a project in a fresh temp directory that also holds
// `apps/ui/src/index.css`. node:assert/strict, `{ name, run }`, Scenario Outline rows folded.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDesignSystemCommands, USE_MODES } from "@aof/design-system/commands";
import { DESIGN_SYSTEM_CODES, DESIGN_SYSTEM_MODES, designSystemDiagnostics } from "@aof/design-system/config";
import { commandError } from "./tokens.suite.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const INDEX_CSS = "apps/ui/src/index.css";
const LINK = "https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd";
const CANVAS_LINK = "https://claude.ai/artifact/NeFyvPA4cnuBx9CXwD8Fpb";
const OTHER_CANVAS = "https://claude.ai/artifact/9Qm2LrT4vWx8YbN3cK7pZd";
const E13 = Object.freeze({ enabled: true, name: "AOF", mode: "owned", source: [INDEX_CSS] });
const { useCommand } = createDesignSystemCommands({ commandError });

async function withRepoConfig(body, { block } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ds-use-"));
  try {
    const configPath = path.join(root, ".aof", "aof.config.json");
    await mkdir(path.dirname(configPath), { recursive: true });
    await mkdir(path.join(root, "apps", "ui", "src"), { recursive: true });
    await writeFile(path.join(root, INDEX_CSS), await readFile(path.join(REPO, INDEX_CSS), "utf8"), "utf8");
    let text = await readFile(path.join(REPO, ".aof", "aof.config.json"), "utf8");
    // The fixture starts from this repository's config with the block this case asks for, and with
    // none when it asks for none: the repository's own config may already name a system.
    const config = JSON.parse(text);
    if (block !== undefined || config.work?.ui?.designSystem !== undefined) {
      const { designSystem: _named, ...ui } = config.work.ui ?? {};
      config.work.ui = block !== undefined ? { ...ui, designSystem: block } : ui;
      if (Object.keys(config.work.ui).length === 0) delete config.work.ui;
      text = `${JSON.stringify(config, null, 2)}\n`;
    }
    await writeFile(configPath, text, "utf8");
    const ctx = { workspace: { projectRoot: root, configPath, config: JSON.parse(text) } };
    const use = (options) => useCommand.run(useCommand.cli.argv([], options), ctx);
    const read = () => readFile(configPath, "utf8");
    return await body({ root, use, read, original: text });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const blockIn = (text) => JSON.parse(text).work.ui?.designSystem;

export const configTests = [
  {
    name: "198/01 04 E13 · naming the system by its title writes the block, and every other key and the indentation are unchanged",
    run: () => withRepoConfig(async ({ use, read, original }) => {
      const result = await use({ name: "AOF", mode: "owned", source: [INDEX_CSS] });
      assert.equal(result.changed, true);
      const text = await read();
      assert.deepEqual(blockIn(text), E13);
      const before = JSON.parse(original);
      const after = JSON.parse(text);
      delete after.work.ui;
      delete before.work.ui;
      assert.deepEqual(after, before, "every other key is unchanged");
      assert.deepEqual(Object.keys(JSON.parse(text)), Object.keys(JSON.parse(original)), "key order is kept");
      // The surgical merge: the text outside the new block is the original text, line for line.
      const untouched = original.split("\n").filter((line) => !text.includes(line));
      assert.deepEqual(untouched, [], "no original line was rewritten");
    }),
  },
  {
    name: "198/01 04 E14 · naming it by its link removes the title, and \"reference\" drops the source",
    run: () => withRepoConfig(async ({ use, read }) => {
      await use({ artifact: LINK, mode: "reference" });
      assert.deepEqual(blockIn(await read()), { enabled: true, artifact: LINK, mode: "reference" });
    }, { block: E13 }),
  },
  {
    name: "198/01 04 E15 · both forms at once are refused, and nothing is written",
    run: () => withRepoConfig(async ({ use, read, original }) => {
      await assert.rejects(use({ name: "AOF", artifact: LINK, mode: "owned", source: [INDEX_CSS] }), (error) => {
        assert.equal(error.code, "design-system-name-and-artifact");
        assert.match(error.message, /"--name" or "--artifact", not both/);
        return true;
      });
      assert.equal(await read(), original);
    }),
  },
  {
    name: "198/01 04 outline · what use refuses, writing nothing (8 rows)",
    run: async () => {
      const rows = [
        [{ mode: "owned", source: [INDEX_CSS] }, /"--name" or "--artifact" is required/],
        [{ name: "", mode: "reference" }, /name is empty/],
        [{ artifact: "https://example.com/x", mode: "reference" }, /is not a claude\.ai artifact link/],
        [{ name: "AOF", mode: "shared" }, /mode is "owned" or "reference"/],
        [{ name: "AOF", mode: "owned" }, /"owned" needs "--source"/],
        [{ name: "AOF", mode: "reference", source: [INDEX_CSS] }, /"reference" takes no "--source"/],
        [{ name: "AOF", mode: "owned", source: ["apps/ui/src/missing.css"] }, /"apps\/ui\/src\/missing\.css" does not exist/],
        [{ name: "AOF", mode: "owned", source: ["../elsewhere/index.css"] }, /leaves the project root/],
      ];
      for (const [options, reason] of rows) {
        await withRepoConfig(async ({ use, read, original }) => {
          await assert.rejects(use(options), (error) => {
            assert.match(error.message, reason, JSON.stringify(options));
            return true;
          });
          assert.equal(await read(), original, `${JSON.stringify(options)}: the config is byte-identical`);
        });
      }
    },
  },
  {
    name: "198/01 04 outline · both link forms are accepted (2 rows)",
    run: async () => {
      for (const link of [LINK, "https://claude.ai/code/artifact/7d3f0c2e-1b4a-4f6e-9a2b-0c1d2e3f4a5b"]) {
        await withRepoConfig(async ({ use, read }) => {
          await use({ artifact: link, mode: "reference" });
          assert.equal(blockIn(await read()).artifact, link);
        });
      }
    },
  },
  {
    name: "198/01 04 running it again with the same values changes nothing",
    run: () => withRepoConfig(async ({ use, read }) => {
      await use({ name: "AOF", mode: "owned", source: [INDEX_CSS] });
      const once = await read();
      const result = await use({ name: "AOF", mode: "owned", source: [INDEX_CSS] });
      assert.equal(result.changed, false, "reported unchanged");
      assert.equal(useCommand.cli.json(result).changed, false, "--json says so");
      assert.equal(await read(), once, "byte-identical");
    }),
  },
  {
    name: "198/01 04 a source given in Windows form is stored with forward slashes",
    run: () => withRepoConfig(async ({ use, read }) => {
      await use({ name: "AOF", mode: "owned", source: ["apps\\ui\\src\\index.css"] });
      assert.deepEqual(blockIn(await read()).source, [INDEX_CSS]);
    }),
  },
  // ── 198 amended 2026-11-27 · the block holds the project's one canvas ──────────────────────────
  {
    name: "198/01 04 E22 · \"--canvas\" alone names the canvas and keeps the system, and naming the system again keeps the canvas",
    run: () => withRepoConfig(async ({ use, read }) => {
      const result = await use({ canvas: CANVAS_LINK });
      assert.equal(result.changed, true);
      assert.deepEqual(blockIn(await read()), { ...E13, canvas: CANVAS_LINK });
      await use({ artifact: LINK, mode: "reference" });
      assert.deepEqual(blockIn(await read()), { enabled: true, artifact: LINK, mode: "reference", canvas: CANVAS_LINK });
      const named = await use({ name: "AOF", mode: "owned", source: [INDEX_CSS], canvas: OTHER_CANVAS });
      assert.equal(named.block.canvas, OTHER_CANVAS, "a given canvas replaces the old one");
    }, { block: E13 }),
  },
  {
    name: "198/01 04 E23 · a canvas before any system, a bad canvas link, and the system's own link as the canvas are refused, writing nothing",
    run: async () => {
      await withRepoConfig(async ({ use, read, original }) => {
        await assert.rejects(use({ canvas: CANVAS_LINK }), (error) => error.code === "design-system-unnamed" && /name it first/.test(error.message));
        assert.equal(await read(), original);
      });
      await withRepoConfig(async ({ use, read, original }) => {
        await assert.rejects(use({ canvas: "https://example.com/x" }), (error) => error.code === "design-system-bad-canvas");
        await assert.rejects(use({ artifact: LINK, mode: "reference", canvas: `${LINK}/` }), (error) => error.code === "design-system-canvas-is-system");
        assert.equal(await read(), original);
      }, { block: E13 });
    },
  },
  {
    name: "198/01 04 the verb's modes are the block's modes, and every code the shape check emits is a declared code",
    run: () => {
      assert.deepEqual([...USE_MODES], [...DESIGN_SYSTEM_MODES]);
      const declared = new Set(Object.values(DESIGN_SYSTEM_CODES));
      const blocks = ["on", { enabled: "yes" }, { enabled: true }, { enabled: true, name: 1, artifact: "x", mode: "x", source: "x", y: 1, canvas: "x" }, { mode: "owned", source: [1] }, { artifact: LINK, canvas: LINK }];
      for (const block of blocks) {
        for (const entry of designSystemDiagnostics(block)) assert.ok(declared.has(entry.code), `${entry.code} is declared`);
      }
      assert.deepEqual(designSystemDiagnostics(undefined), [], "no block is no entry");
    },
  },
];
