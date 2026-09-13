// Traceability wiring for story 79 / task 01 — the writer, its one home, and its bytes.
//
// Covers EVERY @executable scenario in
//   wiki/work/79_story_committed-loop-graph/tasks/01_the-writer-and-its-one-home.feature
// exercising the REAL src/commands/loop-document.mjs against a temp fixture repo
// (mkdtemp → build a registry → run → rm in finally), through the REAL `loadWorkspace` so the
// configured `work.dir` is genuinely read rather than assumed. One test object per @executable
// scenario (the Scenario Outline folded into one entry iterating its rows), each name tracing to
// feature + scenario. node:assert/strict.
//
// THE BARE FACE IS A READ. Every scenario that must not touch disk asserts that by SNAPSHOTTING
// the whole fixture tree before and after, not by trusting the flag — a writer that ignored
// `--write` would pass a narrower check.
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { spawnCliSync } from "../support/cli-spawn.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { loopDocumentCommand } from "../../src/commands/loop-document.mjs";
import { loopDocumentPath } from "../../src/loop-document.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

// The fixture repo, its registry grammar and the tree snapshot live in ONE home
// (`test/support/loop-registry-fixture.mjs`) — the drift gate stands up the same tree, and a
// second copy of the loader's record grammar is the copy that drifts.
import { RECORDS, loop, makeRepo, record, snapshot, withRepo, writeRegistry } from "../support/loop-document-fixture.mjs";

const ctxFor = async (repo) => ({ workspace: await loadWorkspace(repo.root) });

export const loopDocumentCommandTests = [
  {
    name: "loop-document-command/01 the bare face emits the document and writes nothing",
    async run() {
      await withRepo({}, async (repo) => {
        const before = await snapshot(repo.root);
        const result = await loopDocumentCommand.run({}, await ctxFor(repo));
        assert.ok(result.text.includes("```mermaid"), "the composed document is emitted");
        assert.equal(result.written, false, "and it reports that it wrote nothing");
        assert.deepEqual(await snapshot(repo.root), before, "no file is created or modified anywhere in the repository");
      });
    },
  },
  {
    name: "loop-document-command/01 `--write` creates the document at the derived path",
    async run() {
      await withRepo({}, async (repo) => {
        const ctx = await ctxFor(repo);
        const target = path.join(repo.workDir, "loops.md");
        await assert.rejects(stat(target), "the project starts with no committed loop document");

        const result = await loopDocumentCommand.run({ write: true }, ctx);
        assert.equal(result.path, target, "the document lands at the root of the configured work directory");
        assert.equal(await readFile(target, "utf8"), result.text, "its contents are the composed document for the current registry");
        // The composed document is the CURRENT registry's — the fixture's four records and its
        // two declared edges, not a stale or empty rendering.
        assert.match(result.text, /^- Declared records: 4$/m);
        assert.match(result.text, /^- Declared edges: 2$/m);
        assert.ok(result.text.includes("loop:build-to-green · Build to green"), "and the picture is of that registry");
      });
    },
  },
  {
    name: "loop-document-command/01 the path follows the configured work directory",
    async run() {
      await withRepo({ workDir: "./docs/stream" }, async (repo) => {
        const ctx = await ctxFor(repo);
        await loopDocumentCommand.run({ write: true }, ctx);
        assert.equal(
          (await readFile(path.join(repo.root, "docs", "stream", "loops.md"), "utf8")).split("\n")[0],
          "<!-- aof-generated: `aof work loops document --write` – do not edit by hand -->",
          "the document lands at the root of THAT directory"
        );
        await assert.rejects(stat(path.join(repo.root, "wiki", "work", "loops.md")), "and no file is written at the default location");
      });
    },
  },
  {
    name: "loop-document-command/01 there is no way to redirect the write to an arbitrary path",
    async run() {
      const { input, cli } = loopDocumentCommand;
      assert.deepEqual(Object.keys(input.properties), ["write"], "the declared input contract accepts no caller-supplied output path");
      assert.equal(input.additionalProperties, false, "and admits nothing beyond it");
      assert.deepEqual(Object.keys(cli.spec.flags), ["write"], "the CLI face declares the same one flag — the only door to disk");
      assert.equal(cli.spec.flags.write.type, "boolean", "and it carries no value that could name a path");
      assert.deepEqual(cli.argv([], {}), {}, "no positional becomes an output path");
      assert.deepEqual(cli.argv(["somewhere/else.md"], {}), {}, "not even one that looks like one");
      assert.deepEqual(cli.argv([], { write: true }), { write: true }, "`--write` is the whole surface");

      // The refusal is REAL at the process boundary too: an undeclared flag is a loud coded
      // refusal, not a silently ignored string option.
      await withRepo({}, async (repo) => {
        const spawned = spawnCliSync(process.execPath, [cliPath, "work", "loops", "document", "--out", "elsewhere.md", "--json"], {
          cwd: repo.root,
          encoding: "utf8",
          env: { ...process.env, AOF_GLOBAL_HOME: repo.root },
        });
        assert.notEqual(spawned.status, 0, "`--out` is refused");
        assert.match(`${spawned.stdout}${spawned.stderr}`, /unknown-flag|Unknown flag/, "and the refusal names the unknown flag");
        await assert.rejects(stat(path.join(repo.root, "elsewhere.md")), "nothing was written where it pointed");
      });
    },
  },
  {
    name: "loop-document-command/01 regeneration on an unchanged registry is byte-identical",
    async run() {
      await withRepo({}, async (repo) => {
        const ctx = await ctxFor(repo);
        await loopDocumentCommand.run({ write: true }, ctx);
        const first = await readFile(loopDocumentPath(ctx.workspace), "utf8");
        const again = await loopDocumentCommand.run({ write: true }, ctx);
        assert.equal(await readFile(loopDocumentPath(ctx.workspace), "utf8"), first, "the file's bytes are unchanged");
        assert.equal(again.changed, false, "and the writer says so rather than leaving a reader to diff");
      });
    },
  },
  {
    name: "loop-document-command/01 regeneration is byte-identical across separate processes",
    async run() {
      await withRepo({}, async (repo) => {
        const env = { ...process.env, AOF_GLOBAL_HOME: repo.root };
        const first = spawnCliSync(process.execPath, [cliPath, "work", "loops", "document", "--write"], { cwd: repo.root, encoding: "utf8", env });
        assert.equal(first.status, 0, `one process writes it: ${first.stderr}`);
        const written = await readFile(path.join(repo.workDir, "loops.md"), "utf8");

        const second = spawnCliSync(process.execPath, [cliPath, "work", "loops", "document", "--write"], { cwd: repo.root, encoding: "utf8", env });
        assert.equal(second.status, 0, `a fresh process writes it again: ${second.stderr}`);
        assert.equal(await readFile(path.join(repo.workDir, "loops.md"), "utf8"), written, "the two files are byte-identical");
      });
    },
  },
  {
    name: "loop-document-command/01 a registry change moves the bytes, and the reader can see what moved",
    async run() {
      const rows = [
        {
          change: "a new record declaring a new node",
          edit: (registry) => ({ ...registry, "extra.md": loop("loop:extra", "Extra loop") }),
          visible: (before, after) => {
            assert.ok(!before.includes("loop:extra"), "the node was not there before");
            assert.ok(after.includes("loop:extra · Extra loop"), "the new node");
            assert.match(before, /^- Declared records: 4$/m);
            assert.match(after, /^- Declared records: 5$/m, "and the raised node count");
          },
        },
        {
          change: "a new edge between two declared nodes",
          edit: (registry) => ({
            ...registry,
            "run-liveness.md": record({ id: "anchor:run-liveness", kind: "anchor", title: "Run liveness", ground: "live-soak", observes: "module:src/run-store.mjs#isStale", "data-feed": ["loop:build-to-green", "loop:review-fix"] }),
          }),
          visible: (before, after) => {
            assert.ok(!before.includes("-->|data-feed| loop_review_fix"), "the edge was not there before");
            assert.ok(after.includes("anchor_run_liveness -->|data-feed| loop_review_fix"), "the new edge");
            assert.match(before, /^- Declared edges: 2$/m);
            assert.match(after, /^- Declared edges: 3$/m, "and the raised edge count");
          },
        },
        {
          change: "a record's ceiling moving off `uncapped`",
          edit: (registry) => ({ ...registry, "review-fix.md": loop("loop:review-fix", "Review, fix, re-review", { ceiling: ["config:work.loop.reviewRounds"] }) }),
          visible: (before, after) => {
            // The ceiling is NOT an edge, so this change moves no line of the diagram at all —
            // which is exactly why the document carries each record's declared fields. Without
            // that section the registry would have changed and the committed artefact would not.
            assert.ok(!before.includes("- ceiling: config:work.loop.reviewRounds"), "the ceiling was uncapped");
            assert.ok(after.includes("- ceiling: config:work.loop.reviewRounds"), "the changed record's own line");
            // And the DIAGRAM is byte-identical across the change, which is the positive form of
            // the same claim: the picture alone could not have shown this edit.
            const fence = (text) => text.slice(text.indexOf("```mermaid"), text.indexOf("## The records"));
            assert.equal(fence(after), fence(before), "the diagram is unmoved — only the record's own line carries this edit");
          },
        },
        {
          change: "a record's title changing",
          edit: (registry) => ({ ...registry, "operator.md": record({ id: "actor:operator", kind: "actor", title: "The human operator", ground: "exogenous", "target-setting": ["loop:build-to-green"] }) }),
          visible: (before, after) => {
            assert.ok(before.includes('actor:operator · Operator"'), "the label was the old title");
            assert.ok(after.includes('actor:operator · The human operator"'), "that node's label inside the fenced block");
          },
        },
        {
          change: "a record removed",
          edit: ({ "run-liveness.md": _removed, ...rest }) => rest,
          visible: (before, after) => {
            assert.ok(before.includes("anchor:run-liveness · Run liveness"), "the node was drawn as a declared record");
            assert.ok(!after.includes("anchor:run-liveness"), "the node gone");
            assert.match(after, /^- Declared records: 3$/m, "and the lowered counts");
            assert.match(after, /^- Declared edges: 1$/m);
          },
        },
        {
          change: "an edge pointing at an id nothing declares",
          edit: (registry) => ({
            ...registry,
            "operator.md": record({ id: "actor:operator", kind: "actor", title: "Operator", ground: "exogenous", "target-setting": ["loop:build-to-green", "loop:nothing-declares-this"] }),
          }),
          visible: (before, after) => {
            const errorsOf = (text) => Number(text.match(/^- Findings: (\d+) error, (\d+) warning$/m)[1]);
            assert.ok(errorsOf(after) > errorsOf(before), `the raised finding totals (${errorsOf(before)} → ${errorsOf(after)})`);
          },
        },
      ];

      for (const row of rows) {
        await withRepo({ registry: row.registry ?? RECORDS }, async (repo) => {
          const ctx = await ctxFor(repo);
          const target = loopDocumentPath(ctx.workspace);
          await loopDocumentCommand.run({ write: true }, ctx);
          const before = await readFile(target, "utf8");

          await writeRegistry(repo, row.edit(row.registry ?? RECORDS));

          const regenerated = await loopDocumentCommand.run({ write: true }, ctx);
          const after = await readFile(target, "utf8");
          assert.notEqual(after, before, `${row.change}: the file differs`);
          assert.equal(regenerated.changed, true, `${row.change}: and the writer reports that the bytes moved`);
          row.visible(before, after);
        });
      }
    },
  },
  {
    name: "loop-document-command/01 the write scope is exactly one file",
    async run() {
      await withRepo({}, async (repo) => {
        const ctx = await ctxFor(repo);
        const before = await snapshot(repo.root);
        await loopDocumentCommand.run({ write: true }, ctx);
        const after = await snapshot(repo.root);

        const moved = Object.keys(after).filter((key) => after[key] !== before[key]);
        const gone = Object.keys(before).filter((key) => !(key in after));
        assert.deepEqual(moved, ["wiki/work/loops.md"], "only the loop document is created or modified");
        assert.deepEqual(gone, [], "and nothing is removed");
        for (const key of Object.keys(after)) {
          if (key === "wiki/work/loops.md") continue;
          assert.ok(!key.startsWith(".aof/loops/") || after[key] === before[key], "no file under the loop registry directory is written");
          assert.ok(!key.startsWith("wiki/work/03_milestone_board/") || after[key] === before[key], "no file inside any work item folder is written");
        }
        // And nothing was stranded beside it either.
        assert.deepEqual((await readdir(repo.workDir)).filter((name) => name.startsWith(".tmp-")), [], "no temporary file is left in the work directory");
      });
    },
  },
  {
    name: "loop-document-command/01 the registry is left byte-identical by both faces",
    async run() {
      await withRepo({}, async (repo) => {
        const ctx = await ctxFor(repo);
        const loops = path.join(repo.aofDir, "loops");
        const before = await snapshot(loops);
        await loopDocumentCommand.run({}, ctx);
        await loopDocumentCommand.run({ write: true }, ctx);
        assert.deepEqual(await snapshot(loops), before, "every file in the registry directory is byte-identical to before");
      });
    },
  },
  {
    name: "loop-document-command/01 an absent registry is written honestly rather than refused",
    async run() {
      await withRepo({ registry: null }, async (repo) => {
        const spawned = spawnCliSync(process.execPath, [cliPath, "work", "loops", "document", "--write"], {
          cwd: repo.root,
          encoding: "utf8",
          env: { ...process.env, AOF_GLOBAL_HOME: repo.root },
        });
        assert.equal(spawned.status, 0, `it exits 0: ${spawned.stderr}`);
        const written = await readFile(path.join(repo.workDir, "loops.md"), "utf8");
        assert.match(written, /^No loop registry is declared\. The registry was looked for at `\.aof\/loops`\.$/m, "the document states that no registry is declared and where it was looked for");
        assert.match(written, /^- Declared records: 0$/m, "rather than being silently empty");
      });
    },
  },
  {
    name: "loop-document-command/01 `--write` reports what it did",
    async run() {
      await withRepo({}, async (repo) => {
        const env = { ...process.env, AOF_GLOBAL_HOME: repo.root };
        const first = spawnCliSync(process.execPath, [cliPath, "work", "loops", "document", "--write", "--json"], { cwd: repo.root, encoding: "utf8", env });
        assert.equal(first.status, 0, first.stderr);
        const created = JSON.parse(first.stdout);
        assert.equal(path.resolve(repo.root, created.path), path.join(repo.workDir, "loops.md"), "the result names the path written");
        assert.equal(created.changed, true, "and reports that the file's bytes changed");
        assert.equal(created.written, true);
        assert.equal(created.nodeCount, 4, "it carries the same counts the document states");
        assert.equal(created.edgeCount, 2);
        assert.equal(typeof created.summary.error, "number", "and the finding totals the checks computed");
        assert.equal(typeof created.summary.warn, "number");
        const document = await readFile(path.join(repo.workDir, "loops.md"), "utf8");
        assert.match(document, new RegExp(`^- Declared records: ${created.nodeCount}$`, "m"), "the same counts, not a second computation of them");
        assert.match(document, new RegExp(`^- Declared edges: ${created.edgeCount}$`, "m"));
        assert.match(document, new RegExp(`^- Findings: ${created.summary.error} error, ${created.summary.warn} warning$`, "m"));

        const again = spawnCliSync(process.execPath, [cliPath, "work", "loops", "document", "--write", "--json"], { cwd: repo.root, encoding: "utf8", env });
        assert.equal(again.status, 0, again.stderr);
        assert.equal(JSON.parse(again.stdout).changed, false, "a second run reports that the bytes did NOT change");

        // AND THE HUMAN FACE REPORTS THE SAME THING. `--json` is not the only reader: an operator
        // running the verb without it must be told what happened and where, not handed the whole
        // document back as though nothing had been written.
        const human = loopDocumentCommand.cli.render({ ...created, path: path.join(repo.workDir, "loops.md"), source: path.join(repo.aofDir, "loops") });
        assert.match(human, /loops\.md/, "the human render names the path");
        assert.match(human, new RegExp(`${created.nodeCount} declared record\\(s\\)`), "and the counts");
        assert.ok(!human.includes("```mermaid"), "and does NOT emit the document — that is the bare face's job");
        assert.match(
          loopDocumentCommand.cli.render({ ...created, changed: false, existed: true, path: "x/loops.md", source: "y" }),
          /^Unchanged /,
          "a regeneration that moved nothing says so"
        );
        assert.match(
          loopDocumentCommand.cli.render({ ...created, present: false, path: "x/loops.md", source: "y/loops" }),
          /No loop registry is declared at/,
          "and an absent registry is stated rather than left to be inferred from a zero"
        );
      });
    },
  },
  {
    name: "loop-document-command/01 a write that cannot complete leaves the previous document intact",
    async run() {
      await withRepo({}, async (repo) => {
        const ctx = await ctxFor(repo);
        const target = loopDocumentPath(ctx.workspace);
        await loopDocumentCommand.run({ write: true }, ctx);
        const previous = await readFile(target, "utf8");

        // A registry that CANNOT BE LISTED: a plain FILE where the loader expects the registry
        // directory faults on every platform with a code that is not `ENOENT` — which the loader
        // deliberately does not swallow, because an unlistable registry is not an absent one. The
        // run therefore fails part-way, after the previous document exists and before any new
        // bytes could reach it.
        await rm(path.join(repo.aofDir, "loops"), { recursive: true, force: true });
        await writeFile(path.join(repo.aofDir, "loops"), "not a directory", "utf8");
        await assert.rejects(loopDocumentCommand.run({ write: true }, ctx), "the write genuinely failed and says so");

        assert.equal(await readFile(target, "utf8"), previous, "the existing document is left with its previous bytes");
        assert.deepEqual(
          (await readdir(repo.workDir)).filter((name) => name.startsWith(".tmp-")),
          [],
          "and no partial or temporary file is left beside it"
        );

        // The other half of the guarantee, on the write path itself: the writer never opens the
        // target in place — it renames a temp over it — so a failed rename reclaims its own temp
        // rather than stranding one beside the document (m42/F26, the leak this repository has
        // already been bitten by). A non-empty DIRECTORY at the target makes that rename fail on
        // every platform with a non-retryable code.
        const blocked = await makeRepo({});
        try {
          const blockedCtx = { workspace: await loadWorkspace(blocked.root) };
          const occupied = loopDocumentPath(blockedCtx.workspace);
          await mkdir(occupied, { recursive: true });
          await writeFile(path.join(occupied, "occupant"), "x", "utf8");
          await assert.rejects(loopDocumentCommand.run({ write: true }, blockedCtx), "a write that cannot complete propagates its failure");
          assert.equal(await readFile(path.join(occupied, "occupant"), "utf8"), "x", "what was there is untouched");
          assert.deepEqual(
            (await readdir(blocked.workDir)).filter((name) => name.startsWith(".tmp-")),
            [],
            "and the failure path reclaimed the temp it created — no orphan"
          );
        } finally {
          await rm(blocked.root, { recursive: true, force: true });
        }
      });
    },
  },
];
