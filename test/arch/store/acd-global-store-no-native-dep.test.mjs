import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const BANNED_SQLITE_PACKAGES = new Set([
  "better-sqlite3",
  "sqlite3",
  "sqlite",
  "@sqlite.org/sqlite-wasm",
]);

export const archTests = [
  {
    name: "arch/34 ADR-003: package.json adds no native SQLite dependency for the global work store",
    run: async () => {
      const pkg = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
      const deps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
        ...(pkg.optionalDependencies ?? {}),
      };
      const present = Object.keys(deps).filter((name) => BANNED_SQLITE_PACKAGES.has(name));
      assert.deepEqual(present, [], `no SQLite npm package was added: ${JSON.stringify(present)}`);
    },
  },
  {
    // AMENDED by milestone 126 / story 05 (ADR-008 §1), in this control's own file and never
    // as a sibling. THE CLAIM IS UNCHANGED — the store's SQLite runtime is `node:sqlite`,
    // loaded DYNAMICALLY (so a Node without it degrades rather than failing to load), and no
    // native package is imported. What moved is the SITE: the dynamic import was one of two
    // identical copies, and 126/05 collapsed both onto `src/sqlite-runtime.mjs` so the
    // ExperimentalWarning could be filtered at one home instead of suppressed by a blanket
    // flag. So the claim now follows its subject across the seam — the store reaches the
    // runtime dynamically through that home, and the `node:sqlite` import lives there.
    //
    // Asserting the store's own body alone would now be asserting the ABSENCE of a copy that
    // was deliberately removed; asserting only the leaf would lose the store's own half. Both
    // are checked, which is strictly stronger than the one line this replaces.
    name: "arch/34 ADR-003 (AMENDED by 126/ADR-008): the global work store loads node:sqlite DYNAMICALLY — through the one runtime home — and imports no SQLite package",
    run: async () => {
      const source = await readFile(path.join(repoRoot, "src", "global-work-store.mjs"), "utf8");
      const leaf = await readFile(path.join(repoRoot, "src", "sqlite-runtime.mjs"), "utf8");

      // The store's half: it reaches the runtime through the one home, and it still resolves
      // it lazily — an `await` inside `resolveSqlite`, never a module-load-time dependency.
      assert.ok(
        /import \{ importSqliteRuntime \} from "\.\/sqlite-runtime\.mjs"/.test(source),
        "the store reaches the runtime through the one home",
      );
      assert.ok(/await importSqliteRuntime\(/.test(source), "and resolves it lazily, at open time");

      // The home's half: the load is a DYNAMIC import of the Node builtin. This is the line
      // that used to live in the store, asserted where it now lives.
      assert.ok(/import\(\s*["']node:sqlite["']\s*\)/.test(leaf), "node:sqlite is loaded dynamically");
      assert.ok(!/from\s+["']node:sqlite["']/.test(leaf), "and never as a STATIC import, which would make it a load-time dependency");

      // Neither file — nor any other — reaches for a native package.
      for (const [where, text] of [["the store", source], ["the runtime home", leaf]]) {
        assert.ok(!/from\s+["'](?:better-sqlite3|sqlite3|sqlite)["']/.test(text), `no static SQLite package import in ${where}`);
        assert.ok(!/require\(\s*["'](?:better-sqlite3|sqlite3|sqlite)["']\s*\)/.test(text), `no SQLite package require in ${where}`);
      }
    },
  },
];
