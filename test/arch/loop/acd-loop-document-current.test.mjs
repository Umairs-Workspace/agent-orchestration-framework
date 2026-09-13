// Fitness function for story 79 / task 02 — THE DRIFT CHECK.
//
//   "A committed projection of a deterministic function is a thing CI can check."
//
// This is the payoff, and it is the reason committing the artefact is worth more than piping the
// command to a file. The Mermaid output is byte-deterministic and frozen by 52/FF-5208, and every
// other line of the document is composed by a pure function over the registry (story 79/task 00),
// so the whole file can be regenerated and compared: a non-empty difference means somebody edited
// a loop record and did not regenerate the graph. That check cannot exist until the artefact does,
// which is why it lands with it and not later.
//
// WHAT IT GATES, AND WHAT IT DELIBERATELY DOES NOT. Story 79's scope excludes making the graph
// gate anything: no item transition, no acceptor, no doctor severity depends on it. What it gates
// is THE TEST SUITE — the same way every other structural invariant in this repository is held.
// The last two entries assert that boundary from both sides.
//
// AND IT NEVER REPAIRS THE FILE. A check that regenerates on failure is not a check; it is a
// writer with an opinion. Every entry below runs the command's BARE face, which touches no disk.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke, loadWorkspace } from "../../../src/command-core.mjs";
import { loopDocumentCommand } from "../../../src/commands/loop-document.mjs";
import { loopDocumentPath, REGENERATE_COMMAND } from "../../../src/loop-document.mjs";
import { RECORDS, loop, record, snapshot, withRepo, writeRegistry } from "../../support/loop-document-fixture.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SELF = "test/arch/loop/acd-loop-document-current.test.mjs";
// `scripts/test.mjs` imports this gate, so the assembled suite is resolved LAZILY inside run() —
// a deferred dynamic import — to avoid an eager cycle that would read `tests` before the array
// literal has finished evaluating. The same reason `acd-test-suite-registration` and
// `acd-roundtrip-registration` both give for the same move.
const runnerUrl = new URL("../../../scripts/test.mjs", import.meta.url).href;

// THE CHECK. It obtains the document's bytes THROUGH THE REGISTERED COMMAND'S OWN COMPOSITION —
// the same door the writer uses — and compares them with what is committed. It restates no part
// of the document's shape of its own: it knows the path (from the one home that derives it) and
// nothing else about what a loop document looks like.
//
// It must fail LOUDLY AND USEFULLY. A guard that reds with "files differ" teaches nothing; the
// reader is one command away from green and the message has to say so.
async function checkLoopDocument(workspace) {
  const fresh = await loopDocumentCommand.run({}, { workspace });
  const target = loopDocumentPath(workspace);
  let committed = null;
  try {
    committed = await readFile(target, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const shown = path.relative(repoRoot, target).split(path.sep).join("/") || target;
  if (committed === null) {
    return { ok: false, path: target, reason: `The committed loop document is ABSENT at ${shown}. Run \`${REGENERATE_COMMAND}\`.` };
  }
  if (committed !== fresh.text) {
    return { ok: false, path: target, reason: `The committed loop document ${shown} is STALE — a loop record changed and the document was not regenerated. Run \`${REGENERATE_COMMAND}\`.` };
  }
  return { ok: true, path: target, reason: null };
}

export const archTests = [
  {
    name: "arch/79/02 the committed loop document matches a fresh render of this repository's registry",
    run: async () => {
      const verdict = await checkLoopDocument(await loadWorkspace(repoRoot));
      assert.ok(verdict.ok, verdict.reason ?? "");
    },
  },
  {
    name: "arch/79/02 a registry edit without regeneration reds the check, naming the document and the command that regenerates it",
    run: async () => {
      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        await loopDocumentCommand.run({ write: true }, { workspace });
        assert.ok((await checkLoopDocument(workspace)).ok, "the freshly written document passes");

        await writeRegistry(repo, { ...RECORDS, "extra.md": loop("loop:extra", "Extra loop") });
        const verdict = await checkLoopDocument(workspace);
        assert.equal(verdict.ok, false, "it fails");
        assert.match(verdict.reason, /loops\.md/, "the failure names the committed document");
        assert.ok(verdict.reason.includes(REGENERATE_COMMAND), "and the failure names the command that regenerates it");
      });
    },
  },
  {
    name: "arch/79/02 every kind of registry drift is caught",
    run: async () => {
      const drifts = [
        { drift: "a record added", edit: (registry) => ({ ...registry, "extra.md": loop("loop:extra", "Extra loop") }) },
        { drift: "a record removed", edit: ({ "review-fix.md": _gone, ...rest }) => rest },
        {
          drift: "an edge added between declared nodes",
          edit: (registry) => ({ ...registry, "run-liveness.md": record({ id: "anchor:run-liveness", kind: "anchor", title: "Run liveness", ground: "live-soak", observes: "module:src/run-store.mjs#isStale", "data-feed": ["loop:build-to-green", "loop:review-fix"] }) }),
        },
        {
          drift: "an edge removed",
          edit: (registry) => ({ ...registry, "operator.md": record({ id: "actor:operator", kind: "actor", title: "Operator", ground: "exogenous" }) }),
        },
        {
          drift: "a record's title changed",
          edit: (registry) => ({ ...registry, "operator.md": record({ id: "actor:operator", kind: "actor", title: "The human operator", ground: "exogenous", "target-setting": ["loop:build-to-green"] }) }),
        },
        {
          // NOT AN EDGE, and that is why this row matters most: a ceiling change moves no line of
          // the diagram. It is caught because the document carries each record's declared fields.
          drift: "a record's ceiling changed",
          edit: (registry) => ({ ...registry, "review-fix.md": loop("loop:review-fix", "Review, fix, re-review", { ceiling: ["config:work.loop.reviewRounds"] }) }),
        },
        {
          drift: "a finding-raising edge introduced",
          edit: (registry) => ({ ...registry, "operator.md": record({ id: "actor:operator", kind: "actor", title: "Operator", ground: "exogenous", "target-setting": ["loop:build-to-green", "loop:nothing-declares-this"] }) }),
        },
      ];

      for (const row of drifts) {
        await withRepo({}, async (repo) => {
          const workspace = await loadWorkspace(repo.root);
          await loopDocumentCommand.run({ write: true }, { workspace });
          assert.ok((await checkLoopDocument(workspace)).ok, `${row.drift}: the check passes before the drift`);
          await writeRegistry(repo, row.edit(RECORDS));
          assert.equal((await checkLoopDocument(workspace)).ok, false, `${row.drift}: the check fails`);
        });
      }
    },
  },
  {
    name: "arch/79/02 the check reads and renders, and writes nothing",
    run: async () => {
      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        await loopDocumentCommand.run({ write: true }, { workspace });
        await writeRegistry(repo, { ...RECORDS, "extra.md": loop("loop:extra", "Extra loop") });

        const before = await snapshot(repo.root);
        const stale = await readFile(loopDocumentPath(workspace), "utf8");
        const verdict = await checkLoopDocument(workspace);
        assert.equal(verdict.ok, false, "the check runs and fails");
        assert.equal(await readFile(loopDocumentPath(workspace), "utf8"), stale, "the committed document is left byte-identical");
        assert.deepEqual(await snapshot(repo.root), before, "and no file anywhere is created or modified by the check");
      });
    },
  },
  {
    name: "arch/79/02 an absent document is reported, not silently passed",
    run: async () => {
      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        const target = loopDocumentPath(workspace);
        await assert.rejects(stat(target), "the project has a registry and no committed document");
        const verdict = await checkLoopDocument(workspace);
        assert.equal(verdict.ok, false, "it fails");
        assert.match(verdict.reason, /ABSENT/, "and the failure states that the document is absent rather than that it matched");
        assert.doesNotMatch(verdict.reason, /STALE/, "the two states are told apart");
      });
    },
  },
  {
    name: "arch/79/02 the check renders through the same door the writer uses and restates no part of the document's shape",
    run: async () => {
      // BOTH obtain the bytes from the registered command's composition: the writer is
      // `loopDocumentCommand.run({ write: true })` and the check is the same command's BARE face.
      // Nothing here re-composes a document.
      const self = stripComments(await readFile(path.join(repoRoot, SELF), "utf8"));
      assert.match(self, /loopDocumentCommand\.run\(\{\}/, "the check obtains its bytes from the registered command");

      // AND IT COMPOSES NOTHING OF ITS OWN. Asserted on the IMPORT BINDINGS rather than by
      // grepping for the composer's name — a whole-file grep for a symbol would be satisfied by
      // the assertion that spells it, which is a gate that can only pass.
      const bindings = [...self.matchAll(/^import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm)]
        .filter(([, , from]) => from.endsWith("/loop-document.mjs") && !from.includes("/commands/"))
        .flatMap(([, names]) => names.split(",").map((name) => name.trim()).filter(Boolean));
      assert.deepEqual(bindings.sort(), ["REGENERATE_COMMAND", "loopDocumentPath"], "it takes the path and the remedy from the one home, and no composer");

      // THE DOCUMENT'S SHAPE IS DERIVED, NOT LISTED. A literal list of shape tokens inside this
      // file would be the file restating the very thing it asserts it does not restate — a gate
      // that could only ever fail on itself. So the shape is computed: the lines common to the
      // document composed for THIS repository's registry and the one composed for a project with
      // no registry at all are exactly the template, with every datum of either removed.
      const composedHere = (await loopDocumentCommand.run({}, { workspace: await loadWorkspace(repoRoot) })).text;
      await withRepo({ registry: null }, async (empty) => {
        const emptyLines = new Set(
          (await loopDocumentCommand.run({}, { workspace: await loadWorkspace(empty.root) })).text.split("\n").map((line) => line.trim())
        );
        const shape = [...new Set(composedHere.split("\n").map((line) => line.trim()).filter((line) => line.length >= 6 && emptyLines.has(line)))];
        assert.ok(shape.length >= 8, `the derived shape is non-vacuous (${shape.length} lines)`);
        for (const line of shape) {
          assert.ok(!self.includes(line), `the check restates no part of the document's shape (${line})`);
        }
      });

      // The one thing it does know is WHERE the document lives, and it takes that from the one
      // home that derives it rather than spelling a path.
      assert.doesNotMatch(self, /"loops\.md"/, "not even the basename — `loopDocumentPath` owns it");
    },
  },
  {
    name: "arch/79/02 the check gates the suite and nothing in the work lifecycle",
    run: async () => {
      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        await loopDocumentCommand.run({ write: true }, { workspace });
        await writeRegistry(repo, { ...RECORDS, "extra.md": loop("loop:extra", "Extra loop") });
        assert.equal((await checkLoopDocument(workspace)).ok, false, "the committed loop document is stale");

        // A work item's status is moved, its doctor snapshot is taken, and the stream is
        // validated. None of the three may report a finding sourced from the stale document.
        const moved = await invoke("work:status", { ref: "03", status: "in-review" }, { workspace });
        assert.ok(moved, "a status move is taken over the stale document");
        const doctor = await invoke("work:doctor", {}, { workspace });
        const validate = await invoke("work:validate", {}, { workspace });
        const reported = [...(doctor.findings ?? []), ...(validate.findings ?? [])];
        for (const finding of reported) {
          const text = `${finding.path ?? ""} ${finding.message ?? ""} ${finding.code ?? ""}`;
          assert.doesNotMatch(text, /loops\.md/, `no finding is sourced from the stale document: ${text}`);
        }

        // AND NO ACCEPTOR DOOR READS IT. The document has exactly two readers in `src/`: the
        // module that derives its path and the command that writes it. Anything else — a doctor
        // lane, the acceptor, a status edge — would be this story making the graph gate something,
        // which its scope excludes.
        const readers = [];
        async function walk(dir) {
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) await walk(full);
            else if (entry.name.endsWith(".mjs")) {
              const source = stripComments(await readFile(full, "utf8"));
              if (/loopDocumentPath|LOOP_DOCUMENT_BASENAME|["'`]loops\.md["'`]/.test(source)) {
                readers.push(path.relative(repoRoot, full).split(path.sep).join("/"));
              }
            }
          }
        }
        await walk(path.join(repoRoot, "src"));
        assert.deepEqual(
          readers.sort(),
          ["src/commands/loop-document.mjs", "src/loop-document.mjs"],
          "the document is read by its own two modules and by no lifecycle, doctor or acceptor door"
        );
      });
    },
  },
  {
    name: "arch/79/02 the check is registered in a runner and reachable by the project's own test command",
    run: async () => {
      // REGISTRATION IS DECIDED BY MEMBERSHIP IN THE ASSEMBLED ARRAY, never by grepping the
      // runner's source — the authority `acd-test-suite-registration` established (59/ADR-003 §4)
      // after twenty-six suites sat imported-but-never-spread for a month.
      const runner = await import(runnerUrl);
      const mine = archTests.map((entry) => entry.name);
      const registered = new Set(runner.tests.map((entry) => entry.name));
      for (const name of mine) assert.ok(registered.has(name), `${name} is a member of the array scripts/test.mjs exports`);

      // AND IT IS SELECTABLE BY THE PROJECT'S OWN TEST COMMAND, through the runner's own
      // selection path rather than a claim about it. `loadSelected` is what `--only` calls; it is
      // used here to LOAD rather than to run, because a gate that spawned the runner on its own
      // file would recurse.
      assert.deepEqual(runner.selectionArgv(["--only", SELF]), [SELF], "the runner parses a selection naming this file");
      const { selected, unusable } = await runner.loadSelected([path.join(repoRoot, SELF)]);
      assert.deepEqual(unusable, [], "the runner finds this file usable");
      assert.deepEqual(selected.map((entry) => entry.name).sort(), [...mine].sort(), "and selecting it selects exactly these checks — it is not discoverable only by being named by hand");
    },
  },
];
