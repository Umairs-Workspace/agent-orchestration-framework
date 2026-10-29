
import { defaultApplication as _aofApplication } from "aof/default-application";
// work-memory-command — story 128 / task 00
// (`00_the-memory-door-rides-the-route-table.feature`): `aof work memory` rides the route
// table, and every verb answers what it answered before.
//
// One entry per @executable scenario (a Scenario Outline's rows folded into one entry, each
// row asserted by name), each traceable to the feature:
//
//   the door resolves through the registry's route table — `deriveRouteTable` carries
//        `work memory`, `resolveRoute` lands on `work:memory` with `["status"]` as the rest.
//   every verb's human render is byte-identical to the ladder's — six invocations spawned
//        through the REAL CLI over a deterministic fixture (the `local` backend over a
//        two-record stream), each compared byte for byte against a LITERAL GOLDEN.
//   every verb's --json document is the projection the seam defined — the records ARRAY,
//        the digest sans `text`, the summary sans `records`, the status object; literal too.
//   an empty block prints nothing, not a blank line — zero bytes through the real CLI, and
//        the face's `null`-render rule asserted over `packages/core/src/spine/face.mjs`.
//   the adapter keeps the seam's parsing rules — nine argv rows through the command's own
//        `cli.spec` + `cli.argv`.
//   an unknown or missing verb is a coded refusal, and exits 1 with the usage.
//   an undeclared flag is refused, the spine's policy inherited.
//   the bijection probe answers one document at exit 0.
//   the migrated verb lands with its integration scenario — the feature file's three rows.
//   (review round 1) `-h` never reaches a backend — `reindex -h`, `ingest -h`, `recall -h`
//        print the usage at exit 0 and the index is untouched; and `help` typed as a verb is
//        still the unknown verb it was at HEAD (the sentinel is a boolean, not a string).
//
// THE GOLDENS ARE LITERAL, AND WHERE THEY CAME FROM. Until this story the ladder door was
// `workMemoryCommand` in the seam — `loadWorkspace` → the memory ctx → `runMemory(argv, { …,
// log: (line) => console.log(line) })`. Its output for each row below was CAPTURED ONCE, at the
// story's review, by materialising `git show HEAD:packages/core/src/work/memory.mjs` into a scratch module
// (imports re-pointed at the live tree), spawning it with cwd = THIS fixture, and pinning what
// it printed. That is what "what the ladder door printed" means here — a string that cannot
// drift with the seam, not an oracle computed by the seam. (The first cut of this suite used
// `runMemory` as the oracle; the review named that tautological — `runMemory`'s default render
// is the same `renderMemory`/`memoryJson` the routed command calls — and it was.) The one path
// a golden carries (`store`, an absolute temp path) is normalised to `<STORE>`. The fixture
// texts are therefore load-bearing: change one byte of them and the goldens are wrong.
//
// 178/01 (`00_aof-memory-answers-through-both-doors.feature`, `01_help-and-hints-name-aof-memory.feature`)
// adds the canonical door. `aof memory` is the command and `aof work memory` its alias
// (178/ADR-001), so the cases below run each argv through BOTH doors over a milestone-39 fixture
// and compare stdout, stderr and exit code. The command module's FF-17801 control lives in
// test/arch/command/acd-memory-alias-one-implementation.test.mjs.
//
// Mirrors cli-face-contract.test.mjs: a temp fixture workspace, `spawnCliSync` of the real
// `bin/aof.mjs` with cwd = the fixture root, exit code + stdout/stderr asserted.
import assert from "node:assert/strict";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { stripComments, functionBody } from "../support/source-slice.mjs";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const getCommand = _aofApplication.getCommand;
const deriveRouteTable = _aofApplication.cli.deriveRouteTable;
const parseSpecArgv = _aofApplication.cli.parseSpecArgv;
const resolveRoute = _aofApplication.cli.resolveRoute;
const memoryCommand = _aofApplication.getCommand("work:memory");
const memoryUsage = _aofApplication.knowledge.work.memory.memoryUsage;
const runMemory = _aofApplication.knowledge.work.memory.runMemory;
const resolveConfiguredBackend = _aofApplication.knowledge.work.memory.resolveConfiguredBackend;
import { parseFeature } from "../integration/support/feature-runner.mjs";
import { withCacheReadFixture, plantCacheRow, refuseCommand, runCommand, itemDirOf, WORKER_NODE, SYNCED_AT } from "../support/cache-read-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const FACE = path.join(repoRoot, "packages/core/src/application/bindings/spine/face.mjs");
const FEATURE = path.join(repoRoot, "test", "integration", "features", "work-memory.feature");

// ----------------------------------------------------------- fixtures ----

// A two-record stream: one lesson whose title the recall query hits, one ADR. The lesson
// carries every meta field the block line renders (`kind`, `area`) and a `source` the
// retrospective parser derives from its heading line, so the block's one line is fully
// determined by this text. LOAD-BEARING for the goldens below (see the header).
const FIXTURE_RETRO = [
  "---",
  "doc: retrospective",
  "---",
  "# 07 · Fixture — Retrospective",
  "",
  "## R1 — Pin line endings on every generated file",
  "",
  "- **Kind:** near-miss · **Area:** tooling · **Stage:** build · **Owner:** developer",
  "- **What happened:** a generated file shipped with CRLF and the diff was every line.",
  "- **Why:** nothing pinned the line endings at the writer.",
  "- **Lesson:** pin line endings at the writer, never at the reviewer.",
  "",
].join("\n");

const FIXTURE_ARCH = [
  "---",
  "doc: architecture",
  "---",
  "# 07 · Fixture — Architecture Decisions",
  "",
  "## ADR-001: The fixture keeps one decision",
  "",
  "**Status:** Accepted",
  "",
  "**Decision.** One ADR, so the brief's split has an adr to count.",
  "",
].join("\n");

// ------------------------------------------------------------ goldens ----

// What HEAD's ladder door printed for each human row, over the fixture above with its index
// built. Captured as described in the header; `\n` is what `console.log` appended.
const HUMAN_GOLDENS = [
  // 148/05 — the first line is unchanged; the layers and conformance lines follow it (148/ADR-004 §3).
  {
    invocation: ["status"],
    stdout: "memory: backend=local records=2\n"
      + "layers: episodic 0 · semantic 1 · procedural 1\n"
      + "conformance: kind blank 0 non-enum 0 · area blank 0 non-enum 1 · stage blank 0 non-enum 0 · owner blank 0 · gap status non-enum 0\n"
      // 153/03 — observed effectiveness follows conformance; this fixture has no ledger and no recurrence.
      + "effectiveness: lesson surfaced 0 honoured 0 departed 0 irrelevant 0 recurred 0\n",
  },
  { invocation: ["reindex"], stdout: "reindex: 2 record(s)\n" },
  { invocation: ["ingest"], stdout: "reindex: 2 record(s)\n" },
  {
    invocation: ["recall", "pin line endings"],
    stdout: "recall \"pin line endings\"  →  2 hit(s)\n"
      + "  > [R1 · m07] Pin line endings on every generated file  (near-miss/tooling, score 4.89)\n"
      + "    pin line endings at the writer, never at the reviewer.\n"
      + "    ↳ 07_milestone_fixture/RETROSPECTIVE.md:6\n"
      + "  > [ADR-001 · m07] The fixture keeps one decision  (adr/Accepted, score 0)\n"
      + "    One ADR, so the brief's split has an adr to count.\n"
      + "    ↳ 07_milestone_fixture/ARCHITECTURE.md:6\n"
      + "\n",
  },
  {
    invocation: ["recall", "pin line endings", "--block"],
    stdout: "R1 (m07) · near-miss · tooling · Pin line endings on every generated file · 07_milestone_fixture/RETROSPECTIVE.md:6\n"
      + "ADR-001 (m07) · adr · architecture · The fixture keeps one decision · 07_milestone_fixture/ARCHITECTURE.md:6\n"
      + "\n",
  },
];

// What HEAD's ladder door printed for each --json row: `JSON.stringify(projection, null, 2)`
// through console.log. `<STORE>` stands for the fixture's absolute index path.
const JSON_GOLDENS = [
  {
    invocation: ["recall", "pin line endings"],
    shape: "the records ARRAY, never an object wrapping it",
    stdout: "[\n"
      + "  {\n"
      + "    \"recordType\": \"lesson\",\n"
      + "    \"id\": \"R1\",\n"
      + "    \"item\": \"07\",\n"
      + "    \"itemSlug\": \"fixture\",\n"
      + "    \"title\": \"Pin line endings on every generated file\",\n"
      + "    \"area\": \"tooling\",\n"
      + "    \"stage\": \"build\",\n"
      + "    \"kind\": \"near-miss\",\n"
      + "    \"owner\": \"developer\",\n"
      + "    \"status\": \"\",\n"
      + "    \"tags\": [],\n"
      + "    \"origin\": [],\n"
      + "    \"summary\": \"pin line endings at the writer, never at the reviewer.\",\n"
      + "    \"text\": \"Pin line endings on every generated file \\n a generated file shipped with CRLF and the diff was every line. \\n nothing pinned the line endings at the writer. \\n pin line endings at the writer, never at the reviewer.\",\n"
      + "    \"source\": \"07_milestone_fixture/RETROSPECTIVE.md:6\",\n"
      + "    \"score\": 4.893906456867505\n"
      + "  },\n"
      + "  {\n"
      + "    \"recordType\": \"adr\",\n"
      + "    \"id\": \"ADR-001\",\n"
      + "    \"item\": \"07\",\n"
      + "    \"itemSlug\": \"fixture\",\n"
      + "    \"title\": \"The fixture keeps one decision\",\n"
      + "    \"area\": \"architecture\",\n"
      + "    \"stage\": \"\",\n"
      + "    \"kind\": \"\",\n"
      + "    \"owner\": \"\",\n"
      + "    \"status\": \"Accepted\",\n"
      + "    \"tags\": [],\n"
      + "    \"origin\": [],\n"
      + "    \"summary\": \"One ADR, so the brief's split has an adr to count.\",\n"
      + "    \"text\": \"The fixture keeps one decision \\n One ADR, so the brief's split has an adr to count.\",\n"
      + "    \"source\": \"07_milestone_fixture/ARCHITECTURE.md:6\",\n"
      + "    \"score\": 0\n"
      + "  }\n"
      + "]\n",
    check: (doc) => { assert.ok(Array.isArray(doc), "recall --json is an ARRAY"); assert.equal(doc[0].id, "R1"); },
  },
  {
    invocation: ["reindex"],
    shape: "the build summary without the `records` dump",
    stdout: "{\n"
      + "  \"backend\": \"local\",\n"
      + "  \"recordCount\": 2,\n"
      + "  \"store\": \"<STORE>\",\n"
      + "  \"version\": 4\n"
      + "}\n",
    check: (doc) => { assert.equal("records" in doc, false, "reindex --json carries no `records`"); assert.equal(doc.recordCount, 2); },
  },
  {
    invocation: ["status"],
    shape: "the { backend, recordCount } object",
    // 148/05 — the seam composes `types`, `layers` and `conformance` after the backend's own facts
    // (148/ADR-004); the fixture lesson's Area `tooling` is the one non-enum value.
    stdout: "{\n"
      + "  \"backend\": \"local\",\n"
      + "  \"recordCount\": 2,\n"
      + "  \"store\": \"<STORE>\",\n"
      + "  \"present\": true,\n"
      + "  \"lessons\": 1,\n"
      + "  \"adrs\": 1,\n"
      + "  \"summaries\": 0,\n"
      + "  \"capabilities\": 0,\n"
      + "  \"gaps\": 0,\n"
      + "  \"findings\": 0,\n"
      + "  \"feedback\": 0,\n"
      + "  \"runs\": 0,\n"
      + "  \"index\": {\n"
      + "    \"version\": 4,\n"
      + "    \"current\": 4,\n"
      + "    \"stale\": false\n"
      + "  },\n"
      // 178/ADR-002 — the declared origin values the ingest dropped; the fixture declares none.
      + "  \"origin\": {\n"
      + "    \"unresolved\": 0\n"
      + "  },\n"
      + "  \"types\": {\n"
      + "    \"adr\": {\n"
      + "      \"count\": 1,\n"
      + "      \"layer\": \"semantic\"\n"
      + "    },\n"
      + "    \"lesson\": {\n"
      + "      \"count\": 1,\n"
      + "      \"layer\": \"procedural\"\n"
      + "    }\n"
      + "  },\n"
      + "  \"layers\": {\n"
      + "    \"episodic\": 0,\n"
      + "    \"semantic\": 1,\n"
      + "    \"procedural\": 1\n"
      + "  },\n"
      + "  \"conformance\": {\n"
      + "    \"kind\": {\n"
      + "      \"blank\": 0,\n"
      + "      \"nonEnum\": 0\n"
      + "    },\n"
      + "    \"area\": {\n"
      + "      \"blank\": 0,\n"
      + "      \"nonEnum\": 1\n"
      + "    },\n"
      + "    \"stage\": {\n"
      + "      \"blank\": 0,\n"
      + "      \"nonEnum\": 0\n"
      + "    },\n"
      + "    \"owner\": {\n"
      + "      \"blank\": 0\n"
      + "    },\n"
      + "    \"gapStatus\": {\n"
      + "      \"nonEnum\": 0\n"
      + "    }\n"
      + "  },\n"
      // 153/03 — the work-owned accounting reader's nested block; the legacy fields above are untouched.
      + "  \"effectiveness\": {\n"
      + "    \"basis\": \"observed decisions and repeats; a verdict is not proof that a lesson prevented a mistake\",\n"
      + "    \"complete\": true,\n"
      + "    \"diagnostics\": [],\n"
      + "    \"types\": {\n"
      + "      \"lesson\": {\n"
      + "        \"surfaced\": 0,\n"
      + "        \"honoured\": 0,\n"
      + "        \"departed\": 0,\n"
      + "        \"irrelevant\": 0,\n"
      + "        \"recurred\": 0\n"
      + "      }\n"
      + "    }\n"
      + "  }\n"
      + "}\n",
    check: (doc) => { assert.equal(doc.backend, "local"); assert.equal(doc.recordCount, 2); },
  },
];

// A workspace whose `memory.backend` is `local` (the deterministic fixture backend) — or,
// with `memory` absent, the `none` backend (05/ADR-002), which is what a bare fixture and the
// bijection probe run over.
async function makeRoot({ backend } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-work-memory-"));
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const milestone = path.join(root, "wiki", "work", "07_milestone_fixture");
  await mkdir(milestone, { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, ...(backend ? { memory: { backend } } : {}) };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(milestone, "SPEC.md"),
    "---\ntype: milestone\nnumber: 07\nslug: fixture\nstatus: in-progress\ntitle: \"Fixture\"\ncreated: 2026-09-12\nupdated: 2026-09-12\nschema: 1\n---\n# 07 · Fixture\n",
    "utf8",
  );
  await writeFile(path.join(milestone, "RETROSPECTIVE.md"), FIXTURE_RETRO, "utf8");
  await writeFile(path.join(milestone, "ARCHITECTURE.md"), FIXTURE_ARCH, "utf8");
  return root;
}

// The fixture's index path, JSON-escaped as it appears inside a `--json` document — the one
// absolute path a golden carries.
function storeToken(root) {
  return JSON.stringify(path.join(root, ".aof", "aof.memory.index.json")).slice(1, -1);
}

// The REAL CLI, spawned with cwd = the fixture root — the route table's door.
function runCli(root, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

// Build the fixture's index through the real CLI and answer the record count it reports.
function buildIndex(root) {
  const built = runCli(root, ["work", "memory", "reindex", "--json"]);
  assert.equal(built.status, 0, `the fixture index builds (stderr: ${built.stderr})`);
  return JSON.parse(built.stdout).recordCount;
}

function recordCount(root) {
  const status = runCli(root, ["work", "memory", "status", "--json"]);
  assert.equal(status.status, 0, `status answers (stderr: ${status.stderr})`);
  return JSON.parse(status.stdout).recordCount;
}

// The command's own parse: the face's spec-parse, then its argv adapter — exactly the two
// steps `runCommandFace` takes before `invoke`.
function adapt(tokens) {
  const options = parseSpecArgv(tokens, memoryCommand.cli.spec, memoryCommand.id);
  return memoryCommand.cli.argv(options._, options);
}

// ------------------------------------------------- 178/01 both doors ----

// THE 178/01 FIXTURE: milestone 39 with one ADR titled "pin line endings" and one near-miss
// lesson, under the `local` backend, ingested once unless a case says otherwise. Every spawn gets
// its own isolated AOF_GLOBAL_HOME.
const DOORS = [["memory"], ["work", "memory"]];

async function makeRoot39({ backend = "local", ingest = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-178-01-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-178-01-home-"));
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const milestone = path.join(root, "wiki", "work", "39_milestone_fixture");
  await mkdir(milestone, { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, ...(backend ? { memory: { backend } } : {}) };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(milestone, "SPEC.md"),
    "---\ntype: milestone\nnumber: 39\nslug: fixture\nstatus: in-progress\ntitle: \"Fixture\"\ncreated: 2026-10-29\nupdated: 2026-10-29\nschema: 1\n---\n# 39 · Fixture\n",
    "utf8",
  );
  await writeFile(path.join(milestone, "ARCHITECTURE.md"), [
    "---", "doc: architecture", "---", "# 39 · Fixture — Architecture Decisions", "",
    "## ADR-001: pin line endings", "", "**Status:** Accepted", "",
    "**Decision.** Pin line endings at the writer.", "",
  ].join("\n"), "utf8");
  await writeFile(path.join(milestone, "RETROSPECTIVE.md"), [
    "---", "doc: retrospective", "---", "# 39 · Fixture — Retrospective", "",
    "## R1 — Line endings drifted on a generated file", "",
    "- **Kind:** near-miss · **Area:** tooling · **Stage:** build · **Owner:** developer",
    "- **What happened:** a generated file shipped with CRLF.",
    "- **Lesson:** pin line endings at the writer.", "",
  ].join("\n"), "utf8");
  const fx = { root, home, milestone, run: (args) => runIsolated(root, home, args) };
  if (ingest && backend) assert.equal(fx.run(["memory", "ingest"]).status, 0, "the fixture ingests");
  return fx;
}

function runIsolated(root, home, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function dropRoot39(fx) {
  await rm(fx.root, { recursive: true, force: true });
  await rm(fx.home, { recursive: true, force: true });
}

// A completed recall observation for item 39, as `record-recall --input` reads it.
async function writeObservation(fx, id = "6f1c2d3e-0000-4000-8000-000000000178") {
  const file = path.join(fx.root, "obs.json");
  await writeFile(file, JSON.stringify({
    id, at: "2026-10-29T12:00:00.000Z", edge: "continue-developer", actor: "developer", query: "pin line endings",
    scope: { kind: "near-miss" }, records: [{ item: "39", id: "R1", recordType: "lesson", verdict: "honoured" }],
  }), "utf8");
  return id;
}

function helpSections(text) {
  const sections = new Map();
  let current = null;
  for (const line of text.split("\n")) {
    const heading = /^([A-Z][^:]*):$/.exec(line);
    if (heading) { current = heading[1]; sections.set(current, []); continue; }
    if (current && line.startsWith("  ")) sections.get(current).push(line.trim());
  }
  return sections;
}

export const workMemoryCommandTests = [
  {
    name: "work-memory/00 the door resolves through the registry's route table: `work memory` is a key, it resolves to work:memory, and [\"status\"] is the rest",
    run: async () => {
      const table = deriveRouteTable();
      assert.ok(table.has("work memory"), "the derived route table carries the key `work memory`");
      assert.equal(table.get("work memory").id, "work:memory", "…and it is the work:memory command");
      const resolved = resolveRoute(["work", "memory", "status"]);
      assert.ok(resolved, "resolveRoute finds a command for [work, memory, status]");
      assert.equal(resolved.command.id, "work:memory", "the route resolves to the command whose id is work:memory");
      assert.deepEqual(resolved.rest, ["status"], "and [\"status\"] is passed through as the rest");
      assert.equal(getCommand("work:memory"), memoryCommand, "the registered command is the module's own export");
    },
  },

  {
    name: "work-memory/00 every verb's human render is byte-identical to the ladder's — outline: status | reindex | ingest | recall \"pin line endings\" | recall … --block (literal goldens captured from HEAD's workMemoryCommand over this fixture)",
    run: async () => {
      const root = await makeRoot({ backend: "local" });
      try {
        assert.equal(buildIndex(root), 2, "the fixture indexes its lesson and its ADR — the corpus the goldens were captured over");
        for (const { invocation, stdout } of HUMAN_GOLDENS) {
          const actual = runCli(root, ["work", "memory", ...invocation]);
          assert.equal(actual.status, 0, `aof work memory ${invocation.join(" ")} exits 0 (stderr: ${actual.stderr})`);
          assert.equal(actual.stdout, stdout, `aof work memory ${invocation.join(" ")}: stdout is byte-identical to what the ladder door printed`);
        }
        // Non-vacuity: the goldens are the fixture's own records, not a placeholder.
        assert.ok(HUMAN_GOLDENS.every((row) => row.stdout.length > 0), "every human golden is non-empty");
        assert.ok(HUMAN_GOLDENS.some((row) => row.stdout.includes("R1 (m07) · near-miss · tooling")), "the block golden is the fixture lesson's own line");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "work-memory/00 every verb's --json document is the projection the seam defined — outline: recall → the records ARRAY | reindex → the summary sans `records` | status → { backend, recordCount } (one document each, byte-identical to the ladder's goldens)",
    run: async () => {
      const root = await makeRoot({ backend: "local" });
      try {
        assert.equal(buildIndex(root), 2, "the fixture indexes its lesson and its ADR");
        const store = storeToken(root);
        for (const { invocation, shape, stdout, check } of JSON_GOLDENS) {
          const actual = runCli(root, ["work", "memory", ...invocation, "--json"]);
          assert.equal(actual.status, 0, `aof work memory ${invocation.join(" ")} --json exits 0 (stderr: ${actual.stderr})`);
          let doc;
          assert.doesNotThrow(() => { doc = JSON.parse(actual.stdout); }, `aof work memory ${invocation.join(" ")} --json: stdout is exactly one JSON document`);
          check(doc);
          assert.equal(actual.stdout.split(store).join("<STORE>"), stdout, `aof work memory ${invocation.join(" ")} --json is ${shape} — byte-identical to the ladder's document`);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "work-memory/00 an empty block prints nothing, not a blank line: `recall <miss> --block` is zero bytes at exit 0, and the face's rule — a `null` render prints nothing — is asserted over src/spine/face.mjs",
    run: async () => {
      const root = await makeRoot({ backend: "local" });
      try {
        // A recall that matches no record, two ways the local backend actually yields one:
        // (1) the stream is not yet indexed (an absent store reads as an empty corpus);
        // (2) a scope filter nothing carries — the way the bundle prompts scope
        //     (`--kind near-miss`) — leaves no survivors. Ranking alone never empties a recall
        //     (every record is scored and kept), so a bare miss is not the shape to test.
        const unindexed = runCli(root, ["work", "memory", "recall", "no such thing", "--block"]);
        assert.equal(unindexed.status, 0, `the unindexed recall exits 0 (stderr: ${unindexed.stderr})`);
        assert.equal(unindexed.stdout.length, 0, `stdout is zero bytes on an unindexed stream (got ${JSON.stringify(unindexed.stdout)})`);

        buildIndex(root);
        // HEAD's golden for this row: nothing — zero bytes, captured like the others.
        const miss = runCli(root, ["work", "memory", "recall", "no such thing", "--kind", "no-such-kind", "--block"]);
        assert.equal(miss.status, 0, `the empty-block recall exits 0 (stderr: ${miss.stderr})`);
        assert.equal(miss.stdout, "", `stdout is zero bytes (got ${JSON.stringify(miss.stdout)})`);
        // And the render itself answers null for an empty block — the value the face keys on.
        const rendered = memoryCommand.cli.render({ verb: "recall", block: true, limit: undefined, result: { records: [], text: "" } });
        assert.equal(rendered, null, "the command's render answers `null` for an empty block");
        // A non-empty block still renders — the rule is about `null`, not about `--block`.
        const hit = runCli(root, ["work", "memory", "recall", "pin line endings", "--kind", "near-miss", "--block"]);
        assert.ok(hit.stdout.length > 0, "a non-empty block still prints");
      } finally {
        await rm(root, { recursive: true, force: true });
      }

      // THE FACE'S RULE, over the shipped source: the non-json branch of runCommandFace binds
      // the render and prints it only when it is not null. Comment-stripped, so a comment
      // describing the rule cannot satisfy it.
      const face = stripComments(await readFile(FACE, "utf8"));
      const body = functionBody(face, "async function runCommandFace(");
      assert.ok(body, "runCommandFace was located in packages/core/src/spine/face.mjs");
      assert.match(
        body,
        /const rendered = cli\.render\(result, faceCtx\);\s*if \(rendered !== null\) console\.log\(rendered\);/,
        "the face prints a render only when it is not null (a `null` render prints nothing)",
      );
      assert.doesNotMatch(body, /console\.log\(cli\.render\(/, "and no unconditional print of the render survives");
    },
  },

  {
    name: "work-memory/00 the adapter keeps the seam's parsing rules — outline: --kind + --item → scope | `a b c` → one query | reindex 07 → only | --item 07 → only + scope.item | --all → only null | --limit 3 | --limit 0 → backend default | --limit abc → backend default | --block → block",
    run: async () => {
      const rows = [
        { argv: ["recall", "q", "--kind", "near-miss", "--item", "04"], check: (input) => { assert.deepEqual(input.scope, { kind: "near-miss", item: "04" }, "scope carries kind and item"); assert.equal(input.query, "q", "and the query is `q`"); } },
        { argv: ["recall", "a", "b", "c"], check: (input) => assert.equal(input.query, "a b c", "the positionals after the verb join into one query") },
        { argv: ["reindex", "07"], check: (input) => assert.equal(input.only, "07", "the first positional is the rebuild scope") },
        { argv: ["reindex", "--item", "07"], check: (input) => { assert.equal(input.only, "07", "--item is the rebuild scope"); assert.equal(input.scope.item, "07", "…and lands on scope.item"); } },
        { argv: ["reindex", "--all"], check: (input) => assert.equal(input.only, null, "--all maps the rebuild scope to the whole stream (null)") },
        { argv: ["recall", "q", "--limit", "3"], check: (input) => assert.equal(input.opts.limit, 3, "a positive --limit parses into opts.limit") },
        { argv: ["recall", "q", "--limit", "0"], check: (input) => assert.equal(input.opts.limit, undefined, "--limit 0 sets no limit, so the backend default applies") },
        { argv: ["recall", "q", "--limit", "abc"], check: (input) => assert.equal(input.opts.limit, undefined, "a non-numeric --limit sets no limit, so the backend default applies") },
        { argv: ["recall", "q", "--block"], check: (input) => assert.equal(input.block, true, "--block is carried as block: true") },
        { argv: ["recurrence", "a", "b", "--exclude", "68/R10"], check: (input) => { assert.equal(input.query, "a b", "the positionals are the new lesson's text"); assert.equal(input.exclude, "68/R10", "--exclude is carried as exclude"); } },
        { argv: ["recurrence", "a"], check: (input) => assert.equal(input.exclude, null, "no --exclude excludes nothing") },
      ];
      for (const { argv, check } of rows) {
        const input = adapt(argv);
        assert.equal(input.verb, argv[0], `[${argv.join(" ")}] the verb is the first positional`);
        check(input);
        assert.equal("json" in input, false, `[${argv.join(" ")}] --json is the face's flag and never reaches the seam's input`);
      }
      // The ONE usage line: the spec's is the seam's, and the seam's usage text opens with it.
      assert.equal(memoryCommand.cli.spec.usage, memoryUsage().split("\n")[0].replace(/^Usage: /, ""), "cli.spec.usage and memoryUsage()'s first line are one string");
    },
  },

  {
    name: "work-memory/00 (review round 1) `-h` never reaches a backend: `reindex -h`, `ingest -h` and `recall -h` through the real CLI print the usage at exit 0 and leave the index's record count unchanged — the seam's parse answers help: true for both doors",
    run: async () => {
      const root = await makeRoot({ backend: "local" });
      try {
        const before = buildIndex(root);
        assert.ok(before >= 1, `the fixture holds ≥ 1 indexed record (${before})`);
        const usage = `${memoryUsage()}\n`;
        for (const invocation of [["reindex", "-h"], ["ingest", "-h"], ["recall", "-h"], ["-h"]]) {
          const help = runCli(root, ["work", "memory", ...invocation]);
          assert.equal(help.status, 0, `aof work memory ${invocation.join(" ")} exits 0 (stderr: ${help.stderr})`);
          assert.equal(help.stdout, usage, `aof work memory ${invocation.join(" ")}: stdout is the usage text, as runMemory's guard always answered it`);
          assert.equal(recordCount(root), before, `aof work memory ${invocation.join(" ")}: the record count is unchanged — no rebuild ran`);
        }
        // Under --json the help answer is still one document, and still no rebuild.
        const json = runCli(root, ["work", "memory", "reindex", "-h", "--json"]);
        assert.equal(json.status, 0);
        assert.equal(JSON.parse(json.stdout).usage, memoryUsage(), "help --json is { usage }");
        assert.equal(recordCount(root), before, "…and the index is untouched");
      } finally {
        await rm(root, { recursive: true, force: true });
      }

      // ONE GUARD, BOTH DOORS: the adapter parses `-h` to `help: true` with no verb (so `run`
      // answers usage before any backend is resolved), and the in-process entry answers the
      // same bytes. The sentinel is a BOOLEAN: nothing a user types can spell it.
      for (const argv of [["reindex", "-h"], ["ingest", "-h"], ["recall", "-h"]]) {
        const input = adapt(argv);
        assert.equal(input.help, true, `[${argv.join(" ")}] the adapter parses -h to help: true`);
        assert.equal(input.verb, null, `[${argv.join(" ")}] …and the help shape carries no verb`);
      }
      assert.equal(adapt(["help"]).help, false, "`help` typed as a verb is not a help request");
      const calls = [];
      const stub = { name: "stub", async recall() { calls.push("recall"); }, async reindex() { calls.push("reindex"); }, async status() { calls.push("status"); } };
      const lines = [];
      const outcome = await runMemory(["reindex", "-h"], { config: {}, resolveBackend: async () => stub, log: (line) => lines.push(line) });
      assert.deepEqual({ ok: outcome.ok, exitCode: outcome.exitCode }, { ok: true, exitCode: 0 }, "runMemory answers help at exit 0");
      assert.deepEqual(lines, [memoryUsage()], "…logging the usage text once");
      assert.deepEqual(calls, [], "…and no backend method was invoked");
      const routed = await memoryCommand.run(adapt(["reindex", "-h"]), { workspace: { config: { memory: { backend: "no-such-backend" } } } });
      assert.equal(memoryCommand.cli.render(routed), memoryUsage(), "the routed door renders the same usage text — with a backend name the registry does not carry, so resolution was never attempted");
    },
  },

  {
    name: "work-memory/00 an unknown or missing verb is a coded refusal, and exits 1 with the usage: `bogus` names the verb, no verb says it is missing, --json is the one envelope with code unknown-verb — and the gate precedes any backend resolution",
    run: async () => {
      const root = await makeRoot();
      try {
        const bogus = runCli(root, ["work", "memory", "bogus"]);
        assert.equal(bogus.status, 1, "an unknown verb exits 1");
        assert.ok(bogus.stderr.includes("Unknown memory verb \"bogus\"."), `stderr names the verb (stderr: ${bogus.stderr.slice(0, 200)})`);
        assert.ok(bogus.stderr.includes("Usage: aof memory <verb>"), "and carries the seam's usage text");
        assert.ok(bogus.stderr.includes("Verbs: recall, record-recall, recurrence, ingest, reindex, status"), "…including the verb vocabulary");
        assert.equal(bogus.stdout, "", "nothing on stdout");

        const missing = runCli(root, ["work", "memory"]);
        assert.equal(missing.status, 1, "a missing verb exits 1");
        assert.ok(missing.stderr.includes("Missing memory verb."), `stderr says the verb is missing (stderr: ${missing.stderr.slice(0, 200)})`);
        assert.ok(missing.stderr.includes("Usage: aof memory <verb>"), "and carries the usage");

        // `help` TYPED AS A VERB is what it was at HEAD — an unknown verb, refused — never a
        // second spelling of `-h` (the help sentinel is the parse's boolean, not a string).
        const typedHelp = runCli(root, ["work", "memory", "help"]);
        assert.equal(typedHelp.status, 1, "`aof work memory help` exits 1");
        assert.ok(typedHelp.stderr.includes("Unknown memory verb \"help\"."), `stderr refuses the typed verb (stderr: ${typedHelp.stderr.slice(0, 200)})`);
        assert.equal(typedHelp.stdout, "", "…and prints no usage on stdout");
        const typedHelpJson = runCli(root, ["work", "memory", "help", "--json"]);
        assert.equal(typedHelpJson.status, 1);
        assert.equal(JSON.parse(typedHelpJson.stdout).code, "unknown-verb", "under --json the typed verb is the unknown-verb envelope");

        const envelope = runCli(root, ["work", "memory", "bogus", "--json"]);
        assert.equal(envelope.status, 1, "under --json the refusal still exits 1");
        let doc;
        assert.doesNotThrow(() => { doc = JSON.parse(envelope.stdout); }, "stdout is the face's one envelope");
        assert.equal(doc.ok, false, "{ ok: false, … }");
        assert.equal(doc.code, "unknown-verb", "carrying code unknown-verb");
        assert.ok(doc.error.includes("Unknown memory verb \"bogus\"."), "and the seam's message");
      } finally {
        await rm(root, { recursive: true, force: true });
      }

      // PRECEDES ANY BACKEND RESOLUTION: with a backend name the registry does not carry, a
      // bad verb is still refused as `unknown-verb` — never as the registry's "Unknown memory
      // backend" — because the gate runs before `resolveConfiguredBackend` is reached.
      const workspace = { config: { memory: { backend: "no-such-backend" } }, workDir: "x", projectRoot: "y" };
      await assert.rejects(
        () => memoryCommand.run({ verb: "bogus", query: "", only: null, scope: {}, opts: {}, block: false }, { workspace }),
        (error) => error.code === "unknown-verb" && error.status === 400,
        "the verb gate refuses before the backend is resolved",
      );
      await assert.rejects(
        () => memoryCommand.run({ verb: undefined, query: "", only: null, scope: {}, opts: {}, block: false }, { workspace }),
        (error) => error.code === "unknown-verb" && error.message.startsWith("Missing memory verb."),
        "a missing verb is the same coded refusal, with the seam's missing-verb message",
      );
      // And in-process: `runMemory(["help"])` is the refusal HEAD gave it, not the usage.
      const lines = [];
      const typed = await runMemory(["help"], { config: {}, resolveBackend: async () => { throw new Error("never resolved"); }, log: (line) => lines.push(line) });
      assert.deepEqual({ ok: typed.ok, exitCode: typed.exitCode }, { ok: false, exitCode: 1 }, "runMemory([\"help\"]) exits non-zero");
      assert.deepEqual(lines, [], "…logging nothing (the refusal goes to stderr, as at HEAD)");
    },
  },

  {
    name: "work-memory/00 an undeclared flag is refused, the spine's policy inherited: `status --bogus` exits 1 with `Unknown flag \"--bogus\"` (and --json turns it into the unknown-flag envelope)",
    run: async () => {
      const root = await makeRoot();
      try {
        const refused = runCli(root, ["work", "memory", "status", "--bogus"]);
        assert.equal(refused.status, 1, "an undeclared flag exits 1");
        assert.ok(refused.stderr.includes("Unknown flag \"--bogus\""), `stderr names the flag (stderr: ${refused.stderr.slice(0, 200)})`);
        assert.ok(refused.stderr.includes("for work:memory"), "…and the command it was refused for");
        const envelope = runCli(root, ["work", "memory", "status", "--bogus", "--json"]);
        assert.equal(envelope.status, 1);
        assert.equal(JSON.parse(envelope.stdout).code, "unknown-flag", "under --json the refusal is the one envelope with code unknown-flag");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "work-memory/00 the bijection probe answers one document at exit 0: `aof work memory status --json` on a bare fixture (no memory.backend ⇒ none) is the none backend's status: zero records and an empty partition",
    run: async () => {
      const root = await makeRoot();
      try {
        const probe = runCli(root, ["work", "memory", "status", "--json"]);
        assert.equal(probe.status, 0, `the probe exits 0 (stderr: ${probe.stderr})`);
        let doc;
        assert.doesNotThrow(() => { doc = JSON.parse(probe.stdout); }, "exactly one parseable JSON document");
        // 148/05 — the seam's composition over no records: an empty partition, every count zero.
        assert.deepEqual(doc, {
          backend: "none",
          recordCount: 0,
          types: {},
          layers: { episodic: 0, semantic: 0, procedural: 0 },
          conformance: {
            kind: { blank: 0, nonEnum: 0 },
            area: { blank: 0, nonEnum: 0 },
            stage: { blank: 0, nonEnum: 0 },
            owner: { blank: 0 },
            gapStatus: { nonEnum: 0 },
          },
          // 153/03 — none has no index, but the ledgers and retrospectives are still read: all zero here.
          effectiveness: {
            basis: "observed decisions and repeats; a verdict is not proof that a lesson prevented a mistake",
            complete: true,
            diagnostics: [],
            types: { lesson: { surfaced: 0, honoured: 0, departed: 0, irrelevant: 0, recurred: 0 } },
          },
        }, "the none backend's honest status");
        assert.equal(probe.stdout, `${JSON.stringify(doc, null, 2)}\n`, "and nothing else on stdout");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "work-memory/00 the migrated verb lands with its integration scenario: test/integration/features/work-memory.feature carries the three rows — status renders `memory: backend=none records=0`, status --json answers backend \"none\", bogus fails naming the verb",
    run: async () => {
      const feature = await parseFeature(FEATURE);
      assert.equal(feature.scenarios.length, 3, "three scenarios, one per row of the task's scenario");
      const runs = feature.scenarios.map((scenario) => scenario.steps.find((step) => step.startsWith("I run `")));
      assert.deepEqual(
        runs,
        ["I run `work memory status`", "I run `work memory status --json`", "I run `work memory bogus`"],
        "each scenario runs the invocation the row names, through the real CLI",
      );
      const steps = feature.scenarios.flatMap((scenario) => scenario.steps);
      assert.ok(steps.includes("stdout should contain `memory: backend=none records=0`"), "status renders its one line on a bare fixture");
      assert.ok(steps.includes("the JSON result field \"backend\" should be \"none\""), "status --json answers a document whose backend is \"none\"");
      assert.ok(steps.includes("stderr should contain `Unknown memory verb \"bogus\".`"), "bogus fails with stderr naming the verb");
      // And the steps module the runner resolves by convention exists and exports the runner.
      const steps_ = await import(new URL("../integration/steps/work-memory.steps.mjs", import.meta.url));
      assert.equal(typeof steps_.runStep, "function", "steps/work-memory.steps.mjs exports runStep");
    },
  },

  {
    name: "153/01 E7 brief is retired through BOTH doors — the routed door and the in-process door each refuse it as the normal unknown verb before any backend is resolved, help no longer advertises it, and recall keeps its public shape",
    run: async () => {
      const root = await makeRoot({ backend: "local" });
      try {
        const routed = runCli(root, ["work", "memory", "brief"]);
        assert.equal(routed.status, 1, "the routed door refuses brief at exit 1");
        assert.ok(routed.stderr.includes('Unknown memory verb "brief".'), `stderr names the verb (stderr: ${routed.stderr.slice(0, 200)})`);
        const envelope = runCli(root, ["work", "memory", "brief", "--json"]);
        assert.equal(JSON.parse(envelope.stdout).code, "unknown-verb", "under --json it is the unknown-verb envelope");

        // The in-process door: the gate answers before the backend resolver is ever called.
        let resolved = 0;
        const refusal = await runMemory(["brief"], { config: {}, resolveBackend: async () => { resolved += 1; return {}; }, log: () => {} });
        assert.deepEqual({ ok: refusal.ok, exitCode: refusal.exitCode }, { ok: false, exitCode: 1 }, "runMemory refuses brief");
        assert.equal(resolved, 0, "…before resolving a backend");
        await assert.rejects(
          () => memoryCommand.run(adapt(["brief"]), { workspace: { config: { memory: { backend: "no-such-backend" } } } }),
          (error) => error.code === "unknown-verb",
          "the routed command refuses with the coded unknown-verb — a backend name the registry does not carry proves none was resolved",
        );

        assert.ok(!memoryUsage().includes("brief"), "help no longer advertises brief");
        assert.ok(!("briefDigest" in _aofApplication.knowledge.work.memory), "the digest export is gone with the verb");
        assert.ok(memoryUsage().includes("record-recall"), "…and names the verb that replaced the unwired surface");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  {
    name: "153/01 record-recall resolves no backend through either door — the routed command and runMemory hand the observation to the injected ledger capability even when the configured backend does not exist",
    run: async () => {
      const calls = [];
      const stub = async (ctx, request) => { calls.push(request); return { ok: true, ref: request.ref, id: "c1", replayed: false, verdicts: 2 }; };
      let resolved = 0;
      const outcome = await runMemory(["record-recall", "153", "--input", "obs.json"], {
        config: { memory: { backend: "no-such-backend" } },
        resolveBackend: async () => { resolved += 1; return {}; },
        recordRecall: stub,
        log: () => {},
      });
      assert.equal(outcome.ok, true);
      assert.equal(resolved, 0, "no backend was resolved for a ledger write");
      assert.deepEqual(calls, [{ ref: "153", inputPath: "obs.json" }], "the parsed ref and --input reach the capability");

      const unwired = await runMemory(["record-recall", "153", "--input", "obs.json"], { config: {}, resolveBackend: async () => ({}), log: () => {} }).then(
        () => null,
        (error) => error,
      );
      assert.equal(unwired?.code, "record-recall-unavailable", "a door without the capability refuses by code rather than falling through to a backend");

      const input = adapt(["record-recall", "153", "--input", "obs.json"]);
      assert.deepEqual([input.verb, input.ref, input.inputFile], ["record-recall", "153", "obs.json"], "the routed adapter carries the ref and the --input file");
      assert.equal(adapt(["recall", "q"]).ref, null, "other verbs carry no ref");
    },
  },

  {
    name: "153/01 a remote-only item is refused with the local-checkout code and nothing is written — record-recall resolves exactly and locally",
    run: () => withCacheReadFixture(async (fx) => {
      await plantCacheRow(fx, "07/01", { status: "done", title: "The readers migrate", slug: "cache-read-surface", parent: "07", node: WORKER_NODE, at: SYNCED_AT });
      const file = path.join(fx.root, "observation.json");
      await writeFile(file, JSON.stringify({
        id: "c1", at: "2026-10-10T12:00:00Z", edge: "refine-architect", actor: "architect", query: "q", scope: {},
        records: [{ item: "45", id: "R13", recordType: "lesson", verdict: "honoured" }],
      }), "utf8");
      const error = await refuseCommand(() => runCommand(fx, "work:memory", { verb: "record-recall", ref: "07/01", inputFile: file }));
      assert.equal(error.code, "item-not-local", "the refusal names the absent local checkout");
      assert.equal(error.status, 409);
      const { existsSync } = await import("node:fs");
      assert.ok(!existsSync(itemDirOf(fx, "07/01")), "no folder was created for the cache-only ref");
    }, { stream: [{ number: "06", stories: [] }, { number: "07", stories: [] }] }),
  },

  {
    name: "153/02 the recurrence verb is routed: through the real CLI it scores the whole lesson index, honours --exclude, and answers a null decision with memory off",
    run: async () => {
      const text = "Pin line endings on every generated file a generated file shipped with CRLF and the diff was every line nothing pinned the line endings at the writer pin line endings at the writer, never at the reviewer";
      const on = await makeRoot({ backend: "local" });
      const off = await makeRoot();
      try {
        buildIndex(on);
        const hit = runCli(on, ["work", "memory", "recurrence", text, "--json"]);
        assert.equal(hit.status, 0, hit.stderr);
        const decision = JSON.parse(hit.stdout);
        assert.equal(decision.qualifying, "07/R1");
        assert.deepEqual(Object.keys(decision).sort(), ["calibration", "candidates", "qualifying", "score", "threshold"]);

        const self = JSON.parse(runCli(on, ["work", "memory", "recurrence", text, "--exclude", "07/R1", "--json"]).stdout);
        assert.deepEqual([self.qualifying, self.score, self.candidates], [null, null, []], "the lesson being written is never its own candidate");

        const human = runCli(on, ["work", "memory", "recurrence", text]);
        assert.match(human.stdout, /^recurrence: 07\/R1 \(score [0-9.]+ > threshold [0-9.]+, calibration /);

        const none = runCli(off, ["work", "memory", "recurrence", text, "--json"]);
        assert.equal(none.status, 0, none.stderr);
        assert.deepEqual([JSON.parse(none.stdout).qualifying, JSON.parse(none.stdout).candidates], [null, []]);

        const bad = runCli(on, ["work", "memory", "recurrence", text, "--exclude", "R1", "--json"]);
        assert.notEqual(bad.status, 0);
        assert.match(bad.stdout + bad.stderr, /invalid-exclude/);
      } finally {
        await rm(on, { recursive: true, force: true });
        await rm(off, { recursive: true, force: true });
      }
    },
  },

  // ═════════════════════ 178/01 task 00 — both doors answer every verb ═════════════════════
  {
    name: "178/01 E1 · the canonical door renders the recall block: `aof memory recall \"pin line endings\" --block` exits 0 with one line per record, the ADR among them, each ending in its source",
    run: async () => {
      const fx = await makeRoot39();
      try {
        const result = fx.run(["memory", "recall", "pin line endings", "--block"]);
        assert.equal(result.status, 0, result.stderr);
        const lines = result.stdout.split("\n").filter(Boolean);
        assert.ok(lines.length >= 2, `one line per recalled record (stdout: ${result.stdout})`);
        assert.ok(lines.some((line) => line.startsWith("ADR-001 (m39) · adr")), "the ADR is among them");
        for (const line of lines) assert.match(line, /· 39_milestone_fixture\/[A-Z]+\.md:\d+$/, `each line ends in its source: ${line}`);
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 E2 · `aof memory status --json` on a project with no memory object answers the none backend's status document at exit 0",
    run: async () => {
      const fx = await makeRoot39({ backend: null });
      try {
        const result = fx.run(["memory", "status", "--json"]);
        assert.equal(result.status, 0, result.stderr);
        const status = JSON.parse(result.stdout);
        assert.equal(status.backend, "none");
        assert.equal(status.recordCount, 0);
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 E3 · `aof memory recall <miss> --kind no-such-kind --block` prints zero bytes at exit 0 (a bare miss is never empty under the local backend, which ranks every survivor)",
    run: async () => {
      const fx = await makeRoot39();
      try {
        const result = fx.run(["memory", "recall", "no-such-term-xyzzy", "--kind", "no-such-kind", "--block"]);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout, "", "stdout is zero bytes");
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 outline: every verb is routed under `aof memory` — recall | ingest | reindex 39 | status | recurrence | record-recall exit 0, help exits 1, and each resolves to the registered command at route `memory`",
    run: async () => {
      const fx = await makeRoot39();
      try {
        await writeObservation(fx);
        const rows = [
          [["recall", "pin line endings", "--json"], 0],
          [["ingest"], 0],
          [["reindex", "39"], 0],
          [["status", "--json"], 0],
          [["recurrence", "line endings drift", "--json"], 0],
          [["record-recall", "39", "--input", "obs.json", "--json"], 0],
          [["help"], 1],
        ];
        for (const [argv, exit] of rows) {
          const resolved = resolveRoute(["memory", ...argv]);
          assert.equal(resolved?.command.id, "memory", `aof memory ${argv.join(" ")} resolves to the registered command`);
          assert.deepEqual(resolved.command.cli.route, ["memory"], "…at route `memory`");
          const result = fx.run(["memory", ...argv]);
          assert.equal(result.status, exit, `aof memory ${argv.join(" ")} exits ${exit} (stderr: ${result.stderr})`);
        }
      } finally {
        await dropRoot39(fx);
      }
    },
  },

  {
    name: "178/01 E4 outline: both doors print the same bytes — stdout, stderr and exit code — for every verb and projection",
    run: async () => {
      const fx = await makeRoot39();
      try {
        const rows = [
          ["recall", "seam", "--json"],
          ["recall", "pin line endings", "--kind", "near-miss", "--block"],
          ["recall", "pin line endings", "--item", "39", "--limit", "1"],
          ["recall", "no-such-term-xyzzy", "--block"],
          ["status"],
          ["status", "--json", "--lessons"],
          ["reindex", "39"],
          ["recurrence", "line endings drift", "--json"],
          ["-h"],
        ];
        for (const argv of rows) {
          const [canonical, alias] = DOORS.map((door) => fx.run([...door, ...argv]));
          const row = argv.join(" ");
          assert.equal(alias.stdout, canonical.stdout, `${row}: the two stdouts are byte-identical`);
          assert.equal(alias.stderr, canonical.stderr, `${row}: the two stderrs are byte-identical`);
          assert.equal(alias.status, canonical.status, `${row}: the two exit codes are equal`);
        }
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 an undeclared flag is refused alike through both doors, each naming its own command: both exit 1, equal stdout, and stderr equal once the refused command's name is set aside",
    run: async () => {
      const fx = await makeRoot39({ ingest: false });
      try {
        const [canonical, alias] = DOORS.map((door) => fx.run([...door, "--undeclared-flag"]));
        assert.deepEqual([canonical.status, alias.status], [1, 1], "both exit 1");
        assert.equal(alias.stdout, canonical.stdout, "the two stdouts are byte-identical");
        assert.ok(canonical.stderr.startsWith('Unknown flag "--undeclared-flag" for memory.'), `aof memory refuses it for memory: ${canonical.stderr.split("\n")[0]}`);
        assert.ok(alias.stderr.startsWith('Unknown flag "--undeclared-flag" for work:memory.'), `aof work memory refuses it for work:memory: ${alias.stderr.split("\n")[0]}`);
        assert.equal(alias.stderr.replace(" for work:memory.", " for <command>."), canonical.stderr.replace(" for memory.", " for <command>."), "the two stderrs are byte-identical once the name is set aside");
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 E5 · a replayed record-recall is idempotent across the two doors: the second answer is replayed, and milestone 39's ledger holds one row with that id",
    run: async () => {
      const fx = await makeRoot39();
      try {
        const id = await writeObservation(fx);
        const first = fx.run(["memory", "record-recall", "39", "--input", "obs.json", "--json"]);
        assert.equal(first.status, 0, first.stderr);
        const second = fx.run(["work", "memory", "record-recall", "39", "--input", "obs.json", "--json"]);
        assert.equal(second.status, 0, second.stderr);
        assert.equal(JSON.parse(second.stdout).replayed, true, "the second answer carries replayed: true");
        const ledger = await readFile(path.join(fx.milestone, "FEEDBACK.ndjson"), "utf8");
        const rows = ledger.split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((row) => JSON.stringify(row).includes(id));
        assert.equal(rows.length, 1, `exactly one recall row with that id (ledger: ${ledger})`);
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 E6 · the alias prints nothing extra: `aof work memory status` has an empty stderr and no deprecated/alias/aof memory line",
    run: async () => {
      const fx = await makeRoot39();
      try {
        const result = fx.run(["work", "memory", "status"]);
        assert.equal(result.status, 0);
        assert.equal(result.stderr, "", "stderr is empty");
        for (const line of result.stdout.split("\n")) assert.doesNotMatch(line, /deprecated|alias|aof memory/i, `no notice: ${line}`);
      } finally {
        await dropRoot39(fx);
      }
    },
  },

  // ══════════════════ 178/01 task 01 — help and every hint name aof memory ══════════════════
  {
    name: "178/01 E7 outline: `aof memory -h` and `aof work memory -h` both open `Usage: aof memory <verb>` and hold no `aof work memory`",
    run: async () => {
      const fx = await makeRoot39({ ingest: false });
      try {
        for (const door of DOORS) {
          const result = fx.run([...door, "-h"]);
          assert.equal(result.status, 0, result.stderr);
          assert.ok(result.stdout.split("\n")[0].startsWith("Usage: aof memory <verb>"), `aof ${door.join(" ")} -h opens the canonical usage: ${result.stdout.split("\n")[0]}`);
          assert.ok(!result.stdout.includes("aof work memory"), "…and never names the alias");
        }
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 a refused flag prints the canonical usage through either door: `aof work memory recall x --bogus` exits 1 naming `aof memory <verb>`",
    run: async () => {
      const fx = await makeRoot39({ ingest: false });
      try {
        const result = fx.run(["work", "memory", "recall", "x", "--bogus"]);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /^Usage: aof memory <verb>/m, `the usage line names aof memory (stderr: ${result.stderr})`);
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 E8 · `aof --help` lists memory in a section of its own: a Memory section opening `aof memory <verb>`, none in Usage, the Work section still carries the line, and the Also tail does not mention memory",
    run: async () => {
      const fx = await makeRoot39({ ingest: false });
      try {
        const result = fx.run(["--help"]);
        assert.equal(result.status, 0, result.stderr);
        const sections = helpSections(result.stdout);
        assert.ok(sections.get("Memory")?.some((line) => line.startsWith("aof memory <verb>")), `a Memory section opens aof memory <verb> (sections: ${[...sections.keys()].join(" | ")})`);
        assert.equal(sections.get("Usage").some((line) => line.startsWith("aof memory")), false, "the Usage section holds no aof memory line");
        assert.ok(sections.get("Work (ACD work stream)").some((line) => line.includes("memory <verb>")), "the Work section still holds a memory line");
        assert.equal(sections.get("Also").some((line) => /memory/.test(line)), false, "the Also tail does not mention memory");
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 E9 · a stale store names `aof memory ingest` as the fix: `aof memory status` over a version-1 index ends naming it, and no line names aof work memory",
    run: async () => {
      const fx = await makeRoot39();
      try {
        const store = path.join(fx.root, ".aof", "aof.memory.index.json");
        const index = JSON.parse(await readFile(store, "utf8"));
        await writeFile(store, JSON.stringify({ ...index, version: 1 }), "utf8");
        const result = fx.run(["memory", "status"]);
        assert.equal(result.status, 0, result.stderr);
        const lines = result.stdout.split("\n").filter(Boolean);
        assert.match(lines.at(-1), /`aof memory ingest`/, `the last line names the fix: ${lines.at(-1)}`);
        assert.ok(!result.stdout.includes("aof work memory"), "no line names aof work memory");
      } finally {
        await dropRoot39(fx);
      }
    },
  },
  {
    name: "178/01 the unknown-work-command examples name aof memory: `aof work no-such-subcommand` lists `aof memory recall \"pin line endings\"` and no aof work memory",
    run: async () => {
      const fx = await makeRoot39({ ingest: false });
      try {
        const result = fx.run(["work", "no-such-subcommand"]);
        const text = `${result.stdout}${result.stderr}`;
        assert.ok(text.includes("aof memory recall \"pin line endings\""), `the examples list names aof memory (output: ${text.slice(0, 300)})`);
        assert.ok(!text.includes("aof work memory"), "…and never the alias");
      } finally {
        await dropRoot39(fx);
      }
    },
  },
];
