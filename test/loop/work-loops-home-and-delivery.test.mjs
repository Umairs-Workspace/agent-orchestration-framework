// Story 53/07 behavioural proof: fresh delivery, lock addressing, refresh and drift semantics.
//
// EXTENDED by 58/01 (`04_the-registry-ships-and-installs.feature`). One milestone ago, 57/05 was
// declined on its first pass for shipping records that were never installed — a record that lives
// only in the framework's own bundle sources is in nobody's registry, and the validate run reads
// the copy under a project's own `.aof/`. So the delivery path is where 58/01's two new records are
// proved to reach a project, and every count below is DERIVED from the loaded bundle rather than
// typed, so the day the registry grows again the suite grows with it instead of being edited to
// agree. (This suite reaches the bundle through `loadBundle()`, never the shipped directory, so it
// is not a registry fixture in FF-5809's sense and belongs in none of its lanes.)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loopBoundsFromConfig } from "../../src/loop-bounds.mjs";
import { initWork } from "../../src/work/init.mjs";
import { loadBundle } from "../../src/work/bundle.mjs";
import { loadLoops } from "../../src/work/loops.mjs";
import { updateWork, workLockPath } from "../../src/work/update.mjs";

const LOOP_PREFIX = ".aof/loops/";
const LOOP_ASSETS = loadBundle().assets.filter((asset) => asset.target?.startsWith(LOOP_PREFIX));
const LOOP_COUNT = LOOP_ASSETS.length;

// The ten records 58/01 puts into a project's registry — two it creates and eight it edits — named
// by the NODE id a reader of the registry sees, resolved to the file that carries it. A record
// dropped from the bundle fails on the row that names it rather than on a count that shifted.
const SUPERVISION_RECORDS = Object.freeze([
  ["anchor:run-lifecycle-policy", "run-lifecycle-policy.md", "created"],
  ["arbiter:speed-thoroughness-autonomy", "speed-thoroughness-autonomy.md", "created"],
  ["actor:operator", "operator.md", "edited"],
  ["loop:autonomous-cascade", "autonomous-cascade.md", "edited"],
  ["loop:build-to-green", "build-to-green.md", "edited"],
  ["loop:review-fix-rereview", "review-fix-rereview.md", "edited"],
  ["loop:run-resilience", "run-resilience.md", "edited"],
  ["loop:mesh-assignment-reclaim", "mesh-assignment-reclaim.md", "edited"],
  ["loop:retrospective-memory-ingest", "retrospective-memory-ingest.md", "edited"],
  ["loop:verify-triage-accept", "verify-triage-accept.md", "edited"],
].map((row) => Object.freeze(row)));

const bundledBody = (name) => LOOP_ASSETS.find((asset) => asset.target === `${LOOP_PREFIX}${name}`)?.body;

async function withRepo(run) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-loop-delivery-"));
  try {
    await initWork({ targetDir: repo, runtimes: ["claude", "codex"] });
    return await run(repo);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
}

async function workSection(repo) {
  return JSON.parse(await readFile(workLockPath(repo), "utf8")).work;
}

function loopActions(result) {
  return result.actions.filter((entry) => String(entry.path).replaceAll("\\", "/").startsWith(LOOP_PREFIX));
}

function changedLoopBundle(name, transform) {
  const bundle = loadBundle();
  return {
    ...bundle,
    assets: bundle.assets.map((asset) => asset.target === `${LOOP_PREFIX}${name}` ? { ...asset, body: transform(asset.body) } : asset),
  };
}

export const workLoopsHomeAndDeliveryTests = [
  {
    name: "loops-home-delivery/00 fresh init installs every valid byte-addressed record for both runtimes",
    run: () => withRepo(async (repo) => {
      const model = await loadLoops({ aofDir: path.join(repo, ".aof"), workDir: path.join(repo, "wiki", "work") });
      assert.equal(model.present, true);
      assert.equal(model.nodes.length, LOOP_COUNT);
      assert.equal(model.nodes.filter((node) => node.kind === "loop").length, 7);
      assert.equal(model.nodes.filter((node) => node.kind === "actor").length, 2);
      // 58/01 adds `anchor:run-lifecycle-policy` — the `frozen-rule` authority that carries
      // `loop:run-resilience`'s reference — and `arbiter:speed-thoroughness-autonomy`, the one
      // node that owns the standing speed/thoroughness/autonomy trade-off.
      assert.equal(model.nodes.filter((node) => node.kind === "anchor").length, 3);
      assert.equal(model.nodes.filter((node) => node.kind === "watcher").length, 3);
      assert.equal(model.nodes.filter((node) => node.kind === "arbiter").length, 1);
      assert.equal(model.findings.some((finding) => finding.severity === "error"), false);

      const entries = (await workSection(repo)).files.filter((entry) => entry.path.startsWith(LOOP_PREFIX));
      assert.equal(entries.length, LOOP_COUNT);
      for (const entry of entries) {
        assert.equal(entry.resource.kind, "asset");
        assert.match(entry.hash, /^sha256:[0-9a-f]{64}$/);
        assert.match(await readFile(path.join(repo, entry.path), "utf8"), /^---\r?\n/);
      }
      assert.equal(await stat(path.join(repo, "wiki", "work", "loops")).then(() => true, () => false), false);
    }),
  },
  {
    name: "loops-home-delivery/01 unchanged update skips all records without touching mtimes",
    run: () => withRepo(async (repo) => {
      const target = path.join(repo, ".aof", "loops", "build-to-green.md");
      const before = (await stat(target)).mtimeMs;
      const result = await updateWork({ targetDir: repo });
      assert.deepEqual(loopActions(result).map((entry) => entry.action), Array(LOOP_COUNT).fill("skip"));
      assert.equal((await stat(target)).mtimeMs, before);
    }),
  },
  {
    name: "loops-home-delivery/02 edited record is repeatedly drift-warned, then force restores source",
    run: () => withRepo(async (repo) => {
      const target = path.join(repo, ".aof", "loops", "build-to-green.md");
      const original = await readFile(target, "utf8");
      const edited = `${original}\nconsumer edit\n`;
      await writeFile(target, edited);
      for (let pass = 0; pass < 2; pass += 1) {
        const result = await updateWork({ targetDir: repo });
        const actions = loopActions(result);
        const action = actions.find((entry) => entry.path.endsWith("build-to-green.md"));
        assert.equal(action.action, "drift-warning");
        assert.equal(actions.filter((entry) => entry.action === "skip").length, LOOP_COUNT - 1, "one drift leaves the other records alone");
        assert.equal(await readFile(target, "utf8"), edited, "consumer bytes survive");
      }
      const forced = await updateWork({ targetDir: repo, force: true });
      assert.equal(loopActions(forced).find((entry) => entry.path.endsWith("build-to-green.md")).action, "update");
      assert.equal(await readFile(target, "utf8"), original);
    }),
  },
  {
    name: "loops-home-delivery/03 changed and withdrawn shipped assets use the generic update matrix",
    run: async () => {
      await withRepo(async (repo) => {
        const target = path.join(repo, ".aof", "loops", "run-resilience.md");
        const changed = changedLoopBundle("run-resilience.md", (body) => `${body}\nupstream correction\n`);
        const result = await updateWork({ targetDir: repo, bundleOverride: changed });
        assert.equal(loopActions(result).find((entry) => entry.path.endsWith("run-resilience.md")).action, "update");
        assert.match(await readFile(target, "utf8"), /upstream correction/);
      });

      await withRepo(async (repo) => {
        const bundle = loadBundle();
        const withdrawn = { ...bundle, assets: bundle.assets.filter((asset) => asset.target !== `${LOOP_PREFIX}operator.md`) };
        const result = await updateWork({ targetDir: repo, bundleOverride: withdrawn });
        assert.equal(result.actions.find((entry) => entry.path.endsWith("operator.md")).action, "delete");
        assert.equal(await stat(path.join(repo, ".aof", "loops", "operator.md")).then(() => true, () => false), false);
      });

      await withRepo(async (repo) => {
        const target = path.join(repo, ".aof", "loops", "operator.md");
        await writeFile(target, `${await readFile(target, "utf8")}\nconsumer edit\n`);
        const bundle = loadBundle();
        const withdrawn = { ...bundle, assets: bundle.assets.filter((asset) => asset.target !== `${LOOP_PREFIX}operator.md`) };
        const result = await updateWork({ targetDir: repo, bundleOverride: withdrawn });
        assert.equal(result.actions.find((entry) => entry.path.endsWith("operator.md")).action, "drift-warning");
        assert.equal(await stat(target).then(() => true, () => false), true);
      });

      await withRepo(async (repo) => {
        const target = path.join(repo, ".aof", "loops", "operator.md");
        await rm(target);
        const bundle = loadBundle();
        const withdrawn = { ...bundle, assets: bundle.assets.filter((asset) => asset.target !== `${LOOP_PREFIX}operator.md`) };
        const result = await updateWork({ targetDir: repo, bundleOverride: withdrawn });
        assert.equal(result.actions.find((entry) => entry.path.endsWith("operator.md")).action, "skip", "an already-absent stale record is skipped");
      });
    },
  },
  {
    name: "loops-home-delivery/04 an old lock gains every record and git does not ignore them",
    run: () => withRepo(async (repo) => {
      const lockPath = workLockPath(repo);
      const lock = JSON.parse(await readFile(lockPath, "utf8"));
      lock.work.files = lock.work.files.filter((entry) => !entry.path.startsWith(LOOP_PREFIX));
      await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
      await rm(path.join(repo, ".aof", "loops"), { recursive: true, force: true });
      const result = await updateWork({ targetDir: repo });
      assert.deepEqual(loopActions(result).map((entry) => entry.action), Array(LOOP_COUNT).fill("create"));

      execFileSync("git", ["init", "-q"], { cwd: repo });
      for (const entry of loopActions(result)) {
        let ignored = true;
        try { execFileSync("git", ["check-ignore", "-q", "--", entry.path], { cwd: repo }); } catch { ignored = false; }
        assert.equal(ignored, false, `${entry.path}: visible to git`);
      }
    }),
  },
  {
    name: "loops-home-delivery/05 config pointers tune values outside the bundle-managed record",
    run: () => withRepo(async (repo) => {
      const configPath = path.join(repo, ".aof", "aof.config.json");
      await mkdir(path.dirname(configPath), { recursive: true });
      await writeFile(configPath, `${JSON.stringify({ work: { autonomous: { maxAttempts: 7 } } }, null, 2)}\n`);
      const before = await readFile(path.join(repo, ".aof", "loops", "autonomous-cascade.md"), "utf8");
      const result = await updateWork({ targetDir: repo });
      assert.equal(loopActions(result).find((entry) => entry.path.endsWith("autonomous-cascade.md")).action, "skip");
      assert.equal(await readFile(configPath, "utf8"), `${JSON.stringify({ work: { autonomous: { maxAttempts: 7 } } }, null, 2)}\n`);
      assert.equal(await readFile(path.join(repo, ".aof", "loops", "autonomous-cascade.md"), "utf8"), before);
    }),
  },
  {
    // 58/01 task 04. A REGISTRY THAT PREDATES THIS STORY is built by deleting the ten records from
    // a fresh install and dropping their lock entries — the state a project on the previous bundle
    // is actually in — and then taking the update. It receives them ALONGSIDE the ones it already
    // had: nothing is dropped to make room.
    name: "loops-home-delivery/06 a registry that predates the supervision hierarchy receives the ten records on its first update",
    run: () => withRepo(async (repo) => {
      const lockPath = workLockPath(repo);
      const lock = JSON.parse(await readFile(lockPath, "utf8"));
      const shipped = SUPERVISION_RECORDS.map(([, file]) => `${LOOP_PREFIX}${file}`);
      lock.work.files = lock.work.files.filter((entry) => !shipped.includes(entry.path));
      await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
      for (const [, file] of SUPERVISION_RECORDS) await rm(path.join(repo, ".aof", "loops", file));

      const survivors = (await loadLoops(path.join(repo, ".aof"))).nodes.map((node) => node.id).sort();
      assert.equal(survivors.length, LOOP_COUNT - SUPERVISION_RECORDS.length, "the older registry is genuinely smaller");

      const result = await updateWork({ targetDir: repo });
      const actions = new Map(loopActions(result).map((entry) => [path.basename(entry.path), entry.action]));
      for (const [, file] of SUPERVISION_RECORDS) {
        assert.equal(actions.get(file), "create", `${file}: installed by the update, not typed`);
      }
      assert.equal(actions.size, LOOP_COUNT, "and every other record is accounted for in the same pass");
      assert.equal(
        [...actions.values()].filter((action) => action === "skip").length,
        LOOP_COUNT - SUPERVISION_RECORDS.length,
        "the records the project already had are left alone",
      );

      const model = await loadLoops(path.join(repo, ".aof"));
      const ids = model.nodes.map((node) => node.id);
      for (const id of survivors) assert.ok(ids.includes(id), `${id}: the record it already had is still there`);
      for (const [id] of SUPERVISION_RECORDS) assert.ok(ids.includes(id), `${id}: is in the project's registry`);
      assert.equal(ids.length, LOOP_COUNT, "no duplicate and nothing dropped");
      assert.equal(model.findings.some((finding) => finding.severity === "error"), false);
    }),
  },
  {
    // 58/01 task 04. NOBODY TYPES INTO THE INSTALLED TREE: the installed bytes equal the bytes the
    // bundle ships, and that equality is the evidence the update wrote them. Updating twice is the
    // same as updating once — not doubled, not reordered, not churned.
    name: "loops-home-delivery/07 the installed copies are the bundle's bytes, declare themselves framework-owned, and a second update changes nothing",
    run: () => withRepo(async (repo) => {
      const loopsDir = path.join(repo, ".aof", "loops");
      for (const [id, file] of SUPERVISION_RECORDS) {
        const installed = await readFile(path.join(loopsDir, file), "utf8");
        assert.equal(installed, bundledBody(file), `${file}: matches the record the bundle ships`);
        assert.match(installed, /^---\r?\n# aof-generated: true\b/u, `${file}: declares itself framework-owned`);
        assert.match(installed, /installed by `aof work update`/u, `${file}: names the update as what installs it`);
        assert.match(installed, /\.aof\/aof\.config\.json/u, `${file}: sends per-project values to the config`);
        assert.match(installed, new RegExp(`^id: ${id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`, "mu"), `${file}: carries ${id}`);
      }

      const before = new Map();
      for (const entry of await readdir(loopsDir)) {
        before.set(entry, await readFile(path.join(loopsDir, entry), "utf8"));
      }
      assert.equal(before.size, LOOP_COUNT, "the registry holds exactly the records the bundle ships");

      const again = await updateWork({ targetDir: repo });
      assert.deepEqual(loopActions(again).map((entry) => entry.action), Array(LOOP_COUNT).fill("skip"));
      for (const [entry, text] of before) {
        assert.equal(await readFile(path.join(loopsDir, entry), "utf8"), text, `${entry}: unchanged by the second update`);
      }
      assert.equal((await readdir(loopsDir)).length, LOOP_COUNT, "and no duplicate appeared");
    }),
  },
  {
    // 58/01 task 03's last scenario, in the only honest executable form: NOTHING ACTS ON THE ORDER
    // OR THE DWELL TODAY. The claim is about what the tree does not contain, so what is observable
    // is that installing the arbiter moves no bound and no resolved ceiling — the loops it orders
    // run within exactly what they ran within before it existed. (58/ADR-004 §6 assigns the
    // structural half — `priority` and `dwell` reach no execution path — to FF-5804, which is
    // 58/02's control; this is the behavioural residue, not a second copy of it.)
    name: "loops-home-delivery/08 installing the arbiter moves no bound the loops it orders run within",
    run: () => withRepo(async (repo) => {
      const loopsDir = path.join(repo, ".aof", "loops");
      const workspace = { config: JSON.parse(await readFile(path.join(repo, ".aof", "aof.config.json"), "utf8").catch(() => "{}")) };
      const withArbiter = loopBoundsFromConfig(workspace);

      const arbiterPath = path.join(loopsDir, "speed-thoroughness-autonomy.md");
      const arbiter = await readFile(arbiterPath, "utf8");
      assert.match(arbiter, /^priority: \[/mu, "the order is declared");
      assert.match(arbiter, /^dwell: cycles:\d+$/mu, "and so is the dwell");

      await rm(arbiterPath);
      const without = loopBoundsFromConfig(workspace);
      assert.deepEqual(withArbiter, without, "every loop bound is identical with and without the arbiter installed");

      const bare = await loadLoops(path.join(repo, ".aof"));
      const restored = await updateWork({ targetDir: repo });
      assert.equal(
        loopActions(restored).find((entry) => entry.path.endsWith("speed-thoroughness-autonomy.md")).action,
        "create",
        "the update is what puts it back",
      );
      const full = await loadLoops(path.join(repo, ".aof"));
      const ceilingOf = (model) => Object.fromEntries(model.nodes
        .filter((node) => node.kind === "loop")
        .map((node) => {
          const ceiling = node.fields.ceiling;
          return [node.id, Array.isArray(ceiling) ? ceiling.map((entry) => entry.raw) : ceiling?.raw ?? null];
        }));
      const ceilings = ceilingOf(full);
      assert.deepEqual(ceilings, ceilingOf(bare), "and no loop's declared ceiling moved either");
      assert.equal(Object.keys(ceilings).length, 7, "over all seven loops the arbiter's order ranks or leaves alone");
    }),
  },
];
