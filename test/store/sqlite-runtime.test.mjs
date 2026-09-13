// Traceability wiring for milestone 126 / story 05, tasks 00_one-import-home.feature and
// 01_the-filter-is-targeted-and-restored.feature.
//
// The SQLite ExperimentalWarning is filtered at ONE home both callers use, by a targeted
// `emitWarning` wrap restored in a `finally` — never a blanket flag (ADR-008).
//
// THE SEAM, stated once: the leaf takes an INJECTED IMPORTER defaulting to the real
// `() => import("node:sqlite")`, beside the `options.sqlite` injected MODULE both callers
// already accept. Every row that plants a warning mid-import, makes an import throw, or
// counts an import drives it through that seam. Without it none of this is drivable
// in-process — Node raises the warning ONCE per process, so an in-process counting fake
// proves nothing after any earlier test has opened the store. The real-runtime leg is
// therefore driven in a FRESH CHILD carrying no warning flag of its own.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { importSqliteRuntime } from "../../src/sqlite-runtime.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { openEffectsJournal } from "../../src/effects/journal.mjs";
import { globalMeshPaths } from "../../src/workspace.mjs";

const run = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function withGlobalHome(fn) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-sqlite-runtime-"));
  try {
    return await fn({ home, paths: globalMeshPaths({ env: { AOF_GLOBAL_HOME: home } }) });
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

// Capture what actually reached the ORIGINAL `process.emitWarning` while the leaf ran. The
// recorder is installed FIRST, so the leaf's filter wraps it: a swallowed warning never
// arrives here, a passed one arrives with its arguments intact.
async function withWarningRecorder(fn) {
  const original = process.emitWarning;
  const seen = [];
  process.emitWarning = (...args) => {
    seen.push(args);
  };
  try {
    return { seen, result: await fn(process.emitWarning) };
  } finally {
    process.emitWarning = original;
  }
}

// A module shaped enough for both callers to actually OPEN on — the contract row is "opens
// on the fake", so the fake has to answer the handful of calls an open makes (a PRAGMA, the
// schema probe, the migration) rather than merely exist.
const fakeRuntime = () => ({
  DatabaseSync: class FakeDatabase {
    exec() {}
    prepare() {
      return { get: () => undefined, run: () => ({ changes: 1 }), all: () => [] };
    }
    close() {}
  },
});

export const sqliteRuntimeTests = [
  // ── task 00 ────────────────────────────────────────────────────────────────────

  {
    name: "126/05 task00 the store's refusal and its injected seam are unchanged",
    async run() {
      await withGlobalHome(async ({ paths }) => {
        // | `sqlite: false` | throws sqlite-unavailable, 501 |
        await assert.rejects(
          openGlobalWorkProjectionStore({ paths, sqlite: false }),
          (error) => {
            assert.equal(error.code, "sqlite-unavailable");
            assert.equal(error.status, 501);
            assert.match(error.message, /global work projection/, "in the projection's words");
            return true;
          },
        );

        // | a fake module exposing DatabaseSync | opens on the fake — the importer is never called |
        let calls = 0;
        const counting = () => {
          calls += 1;
          return import("node:sqlite");
        };
        const onFake = await openGlobalWorkProjectionStore({ paths, sqlite: fakeRuntime(), importer: counting });
        assert.ok(onFake, "opens on the fake");
        assert.equal(calls, 0, "the injected importer is never called when a module was injected");

        // | a fake module with no DatabaseSync | used AS GIVEN — a raw TypeError, no coded refusal |
        await assert.rejects(
          openGlobalWorkProjectionStore({ paths, sqlite: {} }),
          (error) => {
            assert.ok(error instanceof TypeError, `an injected module is passed through unvalidated, got ${error.code ?? error.name}`);
            assert.equal(error.code, undefined, "no coded refusal — this is the seam's behaviour today and it does not move");
            return true;
          },
        );

        // | no sqlite, the runtime resolvable | opens through the leaf on the real runtime |
        const real = await openGlobalWorkProjectionStore({ paths });
        assert.ok(real.db, "opens through the leaf on the real runtime");
        real.close?.();

        // | no sqlite, an importer that throws | throws sqlite-unavailable, 501 |
        await assert.rejects(
          openGlobalWorkProjectionStore({ paths, importer: () => { throw new Error("no runtime"); } }),
          (error) => error.code === "sqlite-unavailable" && error.status === 501,
        );

        // | no sqlite, an importer resolving a module with no DatabaseSync | 501 — the check
        //   stays in the caller's own body, which is why this differs from the injected case |
        await assert.rejects(
          openGlobalWorkProjectionStore({ paths, importer: async () => ({}) }),
          (error) => error.code === "sqlite-unavailable" && error.status === 501,
        );
      });
    },
  },

  {
    name: "126/05 task00 the journal's refusal is unchanged, and it is the journal's OWN — including the parts that look uneven",
    async run() {
      await withGlobalHome(async ({ paths }) => {
        // | no sqlite, the runtime resolvable | opens journal.sqlite at schema 1 through the leaf |
        const opened = await openEffectsJournal({ paths });
        assert.equal(opened.schemaVersion, 1, "opens at schema 1");
        assert.match(opened.databasePath, /journal\.sqlite$/);
        opened.close?.();

        // | a fake module exposing DatabaseSync | opens on the fake — the importer is never called |
        let calls = 0;
        const onFake = await openEffectsJournal({
          paths,
          sqlite: fakeRuntime(),
          importer: () => { calls += 1; return import("node:sqlite"); },
        });
        assert.ok(onFake, "opens on the fake");
        assert.equal(calls, 0, "the injected importer is never called");

        // | a fake module with no DatabaseSync | used as given — a raw TypeError |
        await assert.rejects(
          openEffectsJournal({ paths, sqlite: {} }),
          (error) => error instanceof TypeError && error.code === undefined,
        );

        // | `sqlite: false` | OPENS NORMALLY — the forced-unavailable is the store's, not this.
        //   The journal's guard is a TRUTHINESS check, so `false` falls through it. The two
        //   refusals are deliberately not the same refusal (ADR-008 §2).
        const forced = await openEffectsJournal({ paths, sqlite: false });
        assert.ok(forced.db, "the journal opens normally on `sqlite: false`");
        forced.close?.();

        // | an importer that throws | 501, in the journal's words |
        for (const importer of [() => { throw new Error("no runtime"); }, async () => ({})]) {
          await assert.rejects(
            openEffectsJournal({ paths, importer }),
            (error) => {
              assert.equal(error.code, "sqlite-unavailable");
              assert.equal(error.status, 501);
              assert.match(error.message, /effects journal/, "in the journal's words, not the projection's");
              return true;
            },
          );
        }
      });
    },
  },

  {
    name: "126/05 task00 both callers open and work through the LEAF — one counted import each",
    async run() {
      await withGlobalHome(async ({ paths }) => {
        let calls = 0;
        const counting = () => {
          calls += 1;
          return import("node:sqlite");
        };

        const store = await openGlobalWorkProjectionStore({ paths, importer: counting });
        store.db.exec("CREATE TABLE IF NOT EXISTS probe_126_05 (k TEXT PRIMARY KEY)");
        store.db.prepare("INSERT OR REPLACE INTO probe_126_05 (k) VALUES (?)").run("written");
        assert.equal(store.db.prepare("SELECT k FROM probe_126_05").get().k, "written", "the store works");
        store.close?.();

        const journal = await openEffectsJournal({ paths, importer: counting });
        journal.db.exec("CREATE TABLE IF NOT EXISTS probe_126_05 (k TEXT PRIMARY KEY)");
        journal.db.prepare("INSERT OR REPLACE INTO probe_126_05 (k) VALUES (?)").run("written");
        assert.equal(journal.db.prepare("SELECT k FROM probe_126_05").get().k, "written", "the journal works");
        journal.close?.();

        assert.equal(calls, 2, "one call for the store's open and one for the journal's — the leaf is what imported the runtime for both");
      });
    },
  },

  // ── task 01 ────────────────────────────────────────────────────────────────────

  {
    name: "126/05 task01 only an ExperimentalWarning naming SQLite is swallowed — across all three `emitWarning` shapes, and only while the import is in flight",
    async run() {
      const cases = [
        { why: "SQLite / ExperimentalWarning as the 2nd arg", emit: (e) => e("SQLite is an experimental feature", "ExperimentalWarning"), when: "during", verdict: "swallowed" },
        { why: "another experimental warning", emit: (e) => e("Foo is an experimental feature", "ExperimentalWarning"), when: "during", verdict: "passed" },
        { why: "SQLite but a DeprecationWarning", emit: (e) => e("The SQLite journal is deprecated", "DeprecationWarning"), when: "during", verdict: "passed" },
        {
          why: "an Error whose .name is ExperimentalWarning",
          emit: (e) => {
            const warning = new Error("SQLite is an experimental feature");
            warning.name = "ExperimentalWarning";
            // A type argument beside an Error is IGNORED by Node, so the predicate must
            // ignore it too — measured at the contract beat.
            e(warning, "DeprecationWarning");
          },
          when: "during",
          verdict: "swallowed",
        },
        {
          why: "an Error whose .name is DeprecationWarning",
          emit: (e) => {
            const warning = new Error("SQLite is deprecated");
            warning.name = "DeprecationWarning";
            e(warning);
          },
          when: "during",
          verdict: "passed",
        },
        { why: "the options form", emit: (e) => e("SQLite is an experimental feature", { type: "ExperimentalWarning" }), when: "during", verdict: "swallowed" },
        { why: "raised AFTER the import returned", emit: (e) => e("SQLite is an experimental feature", "ExperimentalWarning"), when: "after", verdict: "passed" },
      ];

      for (const testCase of cases) {
        const { seen } = await withWarningRecorder(async () => {
          const importer = async () => {
            if (testCase.when === "during") testCase.emit(process.emitWarning);
            return fakeRuntime();
          };
          const runtime = await importSqliteRuntime({ importer });
          if (testCase.when === "after") testCase.emit(process.emitWarning);
          return runtime;
        });

        const arrived = seen.length;
        if (testCase.verdict === "swallowed") {
          assert.equal(arrived, 0, `${testCase.why}: swallowed — it never reaches the original`);
        } else {
          assert.equal(arrived, 1, `${testCase.why}: passed — it reaches the original`);
        }
      }
    },
  },

  {
    name: "126/05 task01 a passed warning is forwarded UNCHANGED — its code and ctor survive the wrapper",
    async run() {
      const { seen } = await withWarningRecorder(async () =>
        await importSqliteRuntime({
          importer: async () => {
            process.emitWarning("Foo is experimental", "ExperimentalWarning", "ERR_FOO");
            return fakeRuntime();
          },
        }),
      );
      assert.equal(seen.length, 1, "the unrelated warning passed");
      assert.deepEqual(
        seen[0].slice(0, 3),
        ["Foo is experimental", "ExperimentalWarning", "ERR_FOO"],
        "arguments forwarded unchanged — a wrapper that rebuilt the call would strip the code",
      );
    },
  },

  {
    name: "126/05 task01 the original is restored after success AND after a throw, and the thrown object reaches the caller intact",
    async run() {
      const captured = process.emitWarning;

      await importSqliteRuntime({ importer: async () => fakeRuntime() });
      assert.equal(process.emitWarning, captured, "restored after a successful import");

      const thrown = new Error("no runtime here");
      thrown.code = "ERR_MODULE_NOT_FOUND";
      await assert.rejects(
        importSqliteRuntime({ importer: () => { throw thrown; } }),
        (error) => {
          assert.equal(error, thrown, "the caller catches the SAME object the importer threw");
          assert.equal(error.code, "ERR_MODULE_NOT_FOUND", "its code intact — the leaf never re-wraps it");
          return true;
        },
      );
      assert.equal(process.emitWarning, captured, "restored after a throwing import too — the `finally` is what makes this true");
    },
  },

  {
    name: "126/05 task01 the filter is scoped to the import, not to the process — loading the leaf installs nothing",
    async run() {
      // A FRESH instance of the module (a cache-busting query), so this asserts the load
      // itself rather than the load this suite already performed.
      const captured = process.emitWarning;
      const fresh = await import(`../../src/sqlite-runtime.mjs?probe=${Date.now()}`);
      assert.equal(typeof fresh.importSqliteRuntime, "function", "the fresh module loaded");
      assert.equal(process.emitWarning, captured, "loading it, and asking no import of it, changes nothing");
    },
  },

  {
    name: "126/05 task01 in a FRESH child with no warning flag, the leaf's import prints nothing — and a control child importing node:sqlite directly still prints the warning",
    async run() {
      // Node raises this warning ONCE per process, so the real-runtime leg cannot be driven
      // in-process after any earlier test has opened the store. The child's environment is
      // BUILT rather than inherited: `NODE_NO_WARNINGS` and `NODE_OPTIONS` are stripped, and
      // the argv carries no warning flag — otherwise the assertion is vacuous.
      const env = { ...process.env };
      delete env.NODE_NO_WARNINGS;
      delete env.NODE_OPTIONS;

      // A file:// URL, not a bare path: on Windows the ESM loader refuses `C:…` as an
      // unsupported URL scheme.
      const leafUrl = JSON.stringify(pathToFileURL(path.join(repoRoot, "src", "sqlite-runtime.mjs")).href);
      const throughLeaf = await run(
        process.execPath,
        ["-e", `const { importSqliteRuntime } = await import(${leafUrl}); const m = await importSqliteRuntime(); process.stdout.write(typeof m.DatabaseSync);`],
        { env, cwd: repoRoot },
      );
      assert.equal(throughLeaf.stderr, "", "its stderr is empty");
      assert.equal(throughLeaf.stdout, "function", "and the module it returns exposes DatabaseSync");

      const control = await run(
        process.execPath,
        ["-e", `const m = await import("node:sqlite"); process.stdout.write(typeof m.DatabaseSync);`],
        { env, cwd: repoRoot },
      );
      assert.match(
        control.stderr,
        /ExperimentalWarning[\s\S]*SQLite/,
        "a control child spawned the same way, importing node:sqlite directly, still prints the warning — so the leg is not vacuous",
      );
      assert.equal(control.stdout, "function", "and both children got the same runtime");
    },
  },

  // ── task 02 (the behavioural half; the sweeps are FF-12608's) ───────────────────

  {
    name: "126/05 task02 a command that opens the store prints NOTHING to stderr — the red this story turns green",
    async run() {
      await withGlobalHome(async ({ home }) => {
        // The child's environment is BUILT, not borrowed: the suite already spawns the CLI
        // with `NODE_NO_WARNINGS` in some twenty places and `--no-warnings` in three, and
        // inheriting any of that would make this assertion vacuous. The argv carries no
        // warning flag either.
        const env = { ...process.env, AOF_GLOBAL_HOME: home };
        delete env.NODE_NO_WARNINGS;
        delete env.NODE_OPTIONS;

        const { stdout, stderr } = await run(
          process.execPath,
          [path.join(repoRoot, "bin", "aof.mjs"), "work", "find", "126", "--json"],
          { env, cwd: repoRoot },
        );

        assert.equal(stderr, "", `stderr is empty, got: ${JSON.stringify(stderr)}`);
        const parsed = JSON.parse(stdout);
        assert.ok(Array.isArray(parsed) || typeof parsed === "object", "stdout parses as one document");
        // Non-vacuity: the command really did reach the store — a run that refused before
        // opening it would print nothing to stderr for an uninteresting reason.
        assert.ok(stdout.length > 0, "and it answered");
      });
    },
  },
];
