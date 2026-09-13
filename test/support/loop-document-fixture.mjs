// test/support/loop-document-fixture.mjs — the ONE fixture REPO for story 79's committed loop
// document. Two suites stand up the same tree: the behavioural writer suite
// (`test/loop/loop-document-command.test.mjs`) and the drift gate
// (`test/arch/loop/acd-loop-document-current.test.mjs`). A second copy of a registry builder is a
// second spelling of the loader's record grammar, and the copy that drifts is the one whose suite
// then proves something about a registry this repository could not load.
//
// THIS IS NOT `loop-registry-fixture.mjs`, and the difference is the point. That module (52/05)
// materialises a bare `<work.dir>/loops/` directory for suites whose subject is `loadLoops`
// itself. This one materialises a whole PROJECT — a real `.aof/aof.config.json` whose `work.dir`
// is read, a registry under `.aof/loops/` where 53/07 put it, and a work stream carrying an item
// and a roadmap — because the subject here is a command that resolves a workspace and writes one
// file into it, and the write-scope claim can only be measured against a tree that has other
// files in it to leave alone.
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// A loop record as the registry actually spells one. A LIST value is written as the inline list
// the loader requires — every edge key and every pointer field is a `LIST_KEYS` member, and a
// scalar there is `loop-expected-list`, so a fixture that spelled them as scalars would declare no
// edges at all and would prove nothing about a graph.
export function record({ id, kind, title, ...rest }) {
  const value = (raw) => (Array.isArray(raw) ? `[${raw.join(", ")}]` : String(raw));
  const lines = [`id: ${id}`, `kind: ${kind}`, `title: ${title}`];
  for (const [key, raw] of Object.entries(rest)) lines.push(`${key}: ${value(raw)}`);
  return [`---`, ...lines, `---`, `# ${title}`, ``].join("\n");
}

export const loop = (id, title, extra = {}) => record({
  id,
  kind: "loop",
  title,
  controlled: "the fixture's controlled variable",
  reference: ["prose:docs/fixture.md"],
  measurement: ["prose:docs/fixture.md"],
  actuator: ["prose:docs/fixture.md"],
  cadence: "event:per-phase",
  ceiling: ["uncapped"],
  owner: "unknown",
  optimizing: "true",
  layer: "operational",
  ...extra,
});

// FOUR RECORDS AND TWO EDGES. The two edges are declared from the actor and the anchor, because
// those are the kinds whose endpoint schemes admit a `loop:` target — an `anchor:` endpoint is not
// admissible anywhere (`ENDPOINT_SCHEMES`), so a fixture pointing at one would be measuring the
// loader's refusal rather than the document's rendering.
export const RECORDS = {
  "operator.md": record({ id: "actor:operator", kind: "actor", title: "Operator", ground: "exogenous", "target-setting": ["loop:build-to-green"] }),
  "run-liveness.md": record({ id: "anchor:run-liveness", kind: "anchor", title: "Run liveness", ground: "live-soak", observes: "module:src/run-store.mjs#isStale", "data-feed": ["loop:build-to-green"] }),
  "build-to-green.md": loop("loop:build-to-green", "Build to green"),
  "review-fix.md": loop("loop:review-fix", "Review, fix, re-review"),
};

export async function makeRepo({ workDir = "./wiki/work", registry = RECORDS } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-loop-document-"));
  const aofDir = path.join(root, ".aof");
  await mkdir(aofDir, { recursive: true });
  await writeFile(
    path.join(aofDir, "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: workDir } }, null, 2)}\n`,
    "utf8"
  );
  if (registry) await writeRegistry({ aofDir }, registry);
  const resolvedWorkDir = path.resolve(root, workDir);
  const itemDir = path.join(resolvedWorkDir, "03_milestone_board");
  await mkdir(itemDir, { recursive: true });
  await writeFile(
    path.join(itemDir, "SPEC.md"),
    "---\ntype: milestone\nnumber: 03\nslug: board\nstatus: in-progress\ntitle: \"Board\"\n---\n# 03 · Board\n",
    "utf8"
  );
  await writeFile(path.join(resolvedWorkDir, "ROADMAP.md"), "# Roadmap\n", "utf8");
  return { root, aofDir, workDir: resolvedWorkDir };
}

// Replace the registry wholesale with the given records — the way a drift row expresses "the
// registry changed", including a row that REMOVES one.
export async function writeRegistry(repo, registry) {
  const loops = path.join(repo.aofDir, "loops");
  await rm(loops, { recursive: true, force: true });
  await mkdir(loops, { recursive: true });
  for (const [name, body] of Object.entries(registry)) await writeFile(path.join(loops, name), body, "utf8");
}

export async function withRepo(options, fn) {
  const repo = await makeRepo(options);
  try {
    return await fn(repo);
  } finally {
    await rm(repo.root, { recursive: true, force: true });
  }
}

// Every file below `dir`, keyed by POSIX-relative path, valued by content hex — so a snapshot
// difference names the file that moved and proves the ones that did not.
export async function snapshot(dir) {
  const out = {};
  async function walk(current, prefix) {
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((left, right) => (left.name < right.name ? -1 : 1))) {
      const full = path.join(current, entry.name);
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(full, key);
      else out[key] = (await readFile(full)).toString("hex");
    }
  }
  await walk(dir, "");
  return out;
}
