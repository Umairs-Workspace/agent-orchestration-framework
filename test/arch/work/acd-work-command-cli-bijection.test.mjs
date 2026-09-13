// Fitness function for milestone 08 / ADR-004 inv. 2, GENERALISED by milestone 15
// / ADR-005 from "exactly six" to REGISTRY-DERIVED (command → CLI injection):
// "Every registry work:* command has a non-null `cli` adapter (`cli.argv`/
//  `cli.render` are functions) AND a reachable `aof work <sub>` dispatch branch,
//  AND `aof work <sub> --json` runs cleanly + emits parseable JSON. The sub set is
//  DERIVED from listCommands() (NOT the hard-coded SUBCOMMANDS), so work:doctor /
//  any future work:* is covered with no edit ('no new door')."
//
// Three proofs, over the registry-derived work:* sub set:
//   (a) import the registry; assert each work:* command's `cli` adapter is present
//       with `argv`/`render` functions;
//   (b) source-grep `workCommand` in `cli.mjs` for a reachable dispatch branch per
//       subcommand (`subcommand === "<sub>"`, comments discounted);
//   (c) CLI spawn-and-parse: build a fixture stream and `spawnSync` each
//       `aof work <sub> --json` with sensible args, asserting a clean run +
//       parseable JSON. feedback WRITES, so its args target a real fixture item and
//       it must succeed + append. doctor (like validate) may exit 0 OR non-zero
//       cleanly (a warn/error finding can gate) — accept [0,1] for both.
import assert from "node:assert/strict";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { mkdtemp, rm, mkdir, writeFile, readFile, cp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCommands } from "../../../src/command-core.mjs";
// m42 wave (d) leg d1 — a work:* command may now dispatch through the
// registry-DERIVED route table (cli.route + the one generic face) instead of a
// hand-kept `subcommand === "…"` ladder branch; the gate accepts EITHER door
// and re-derives the routed set from the registry, never from grepping.
import { deriveRouteTable } from "../../../src/spine/face.mjs";
import { startRun } from "../../../src/run-store.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");
const CLI_MJS = path.join(repoRoot, "src", "cli.mjs");

// The work-surface subcommands DERIVED from the registry — every work:* command's
// op segment. (NOT a hard-coded literal: a new work:* command is covered with no
// edit. graph:*/project:*/import:* are non-work and correctly excluded.)
const subcommands = () =>
  listCommands()
    .filter((command) => command.id.startsWith("work:"))
    .map((command) => command.id.slice("work:".length))
    .sort();

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// Isolate the `workCommand` function body so the dispatch grep cannot be satisfied
// by a `subcommand === "<sub>"` that belongs to some OTHER command's dispatcher.
function workCommandBody(source) {
  const start = source.search(/(?:async\s+)?function\s+workCommand\s*\(/);
  if (start === -1) return "";
  // Walk to the next top-level `function ` declaration after the start.
  const re = /\n(?:export\s+)?(?:async\s+)?function\s/g;
  re.lastIndex = start + 1;
  const next = re.exec(source);
  return source.slice(start, next ? next.index : source.length);
}

// --- the CLI fixture stream (mirrors acd-work-list-contract's builder) --------

const FIXTURE_ITEMS = [
  { ref: "03", type: "milestone", slug: "board", status: "in-progress", title: "Board" },
  { ref: "03/01", type: "story", slug: "board-ui", status: "in-progress", title: "Board UI" },
];

function frontmatter(fields) {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

async function buildFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-cli-bijection-"));
  const aofDir = path.join(root, ".aof");
  const workDir = path.join(root, "wiki", "work");
  await mkdir(aofDir, { recursive: true });
  const milestoneDir = path.join(workDir, "03_milestone_board");
  const storyDir = path.join(milestoneDir, "stories", "01_story_board-ui");
  const tasksDir = path.join(storyDir, "tasks");
  await mkdir(tasksDir, { recursive: true });
  await writeFile(
    path.join(aofDir, "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`,
    "utf8"
  );
  // milestone 41 / story 02 — insert-milestone/insert-uat scaffold from
  // `.aof/templates/work/<type>/`, the SAME templates add-* uses; copy the
  // repo's real committed templates into the fixture so the bijection probe's
  // insert calls (below) can actually scaffold a valid record doc.
  await cp(path.join(repoRoot, ".aof", "templates", "work", "milestone"), path.join(aofDir, "templates", "work", "milestone"), { recursive: true });
  await cp(path.join(repoRoot, ".aof", "templates", "work", "uat"), path.join(aofDir, "templates", "work", "uat"), { recursive: true });
  // milestone 41 / story 03 — insert-story scaffolds from
  // `.aof/templates/work/story/`, the SAME template add-story uses; copy it in
  // too so the bijection probe's insert-story call (below) can actually
  // scaffold a valid record doc.
  await cp(path.join(repoRoot, ".aof", "templates", "work", "story"), path.join(aofDir, "templates", "work", "story"), { recursive: true });
  // milestone 39 / story 03 — insert-chore/promote-gap scaffold from
  // `.aof/templates/work/chore/`, the SAME template add-chore uses; copy it in
  // too so the bijection probes below can actually scaffold a valid chore.
  await cp(path.join(repoRoot, ".aof", "templates", "work", "chore"), path.join(aofDir, "templates", "work", "chore"), { recursive: true });
  // milestone 63 / story 05 — `work:trigger` reads the INSTALLED trigger declaration (the copy
  // `aof work update` writes), and a workspace with none is a coded "nothing is armed" refusal at
  // exit 1. Copy the bundled source into the fixture exactly as the templates above are copied,
  // so this probe exercises the verb's real resolving path — four declared triggers resolving to
  // four `work:loop` argvs — rather than its missing-file refusal.
  await cp(path.join(repoRoot, "src", "bundle", "triggers.jsonc"), path.join(aofDir, "triggers.jsonc"));
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    frontmatter({ type: "milestone", number: "03", slug: "board", status: "in-progress", title: '"Board"', created: "2026-06-19", updated: "2026-06-19" }),
    "utf8"
  );
  await writeFile(
    path.join(storyDir, "STORY.md"),
    frontmatter({ type: "story", number: "01", slug: "board-ui", parent: "03", status: "in-progress", title: '"Board UI"', created: "2026-06-19", updated: "2026-06-19" }),
    "utf8"
  );
  await writeFile(path.join(storyDir, "STATE.md"), "# 03/01 · State\n", "utf8");
  // One task feature so `work tasks 03/01` parses a real scenario (not just []).
  await writeFile(
    path.join(tasksDir, "01_probe.feature"),
    "Feature: Probe\n\n  @executable\n  Scenario: it runs\n    Given a thing\n    When it happens\n    Then it works\n",
    "utf8"
  );
  // milestone 19 — seed ONE running run under 03/01 (a discrete runs/<id>.json,
  // the ADR-002 layout) so `aof work run-complete 03/01 --outcome done` finds
  // exactly one in-flight run and exits 0. The subs run alphabetically, so
  // run-complete runs BEFORE run-start while only this seed exists; run-start then
  // mints a second running run (exit 0). Without this seed run-complete would hit
  // no-running-run → exit 1 → the smoke would RED (Build note, LOAD-BEARING).
  await startRun({ ref: "03/01", dir: storyDir }, { sessionId: null, brief: {} });
  // milestone 20 — seed a retryable FAILED run under MILESTONE 03 directly so
  // `aof work run-retry 03` resolves a retryable prior and resumes it (exit 0). It
  // lives on the milestone (not 03/01) so the alphabetical run-complete/run-start on
  // 03/01 leave it untouched. 20/ADR-006 dedup forbids minting a second non-terminal
  // run via the store, so this failed precondition is written directly as a fixture.
  const milestoneRuns = path.join(milestoneDir, "runs");
  await mkdir(milestoneRuns, { recursive: true });
  await writeFile(
    path.join(milestoneRuns, "20260629T000000000Z-0000.json"),
    `${JSON.stringify({ runId: "20260629T000000000Z-0000", itemRef: "03", state: "failed", attempt: 1, outcome: "failed", sessionId: "sess-bij", brief: {}, createdAt: "2026-06-29T00:00:00.000Z", updatedAt: "2026-06-29T00:00:00.000Z", failureReason: "timeout", heartbeatAt: null, retryOf: null, reclaimedAt: null }, null, 2)}\n`,
    "utf8"
  );
  return root;
}

// Sensible args per subcommand against the fixture above. Reads resolve `03/01`;
// feedback writes to the milestone/story STATE.md with a real note.
function argsFor(sub) {
  switch (sub) {
    // m42 wave (d) leg d1 (wave-3 tail) — work:ui rides the launcher seam:
    // --json is the NON-BLOCKING probe by FACE POLICY (--json never launches),
    // so the spawn returns with the would-serve document — exit 0 + parseable.
    case "ui": return ["work", "ui", "--json"];
    // m42 wave (d) leg d1 (wave-3 tail, the CLI-only batch). find: the fixture's
    // milestone 03 resolves — the bare-array rows document, exit 0. observe: no
    // Claude transcripts exist for the fixture — found:false, exit 0. The
    // headroom pair: config-only read-merge-write into the fixture's own
    // .aof/aof.config.json — { configPath, notes }, exit 0.
    // init: a dry-run render plan into the fixture — exit 0. update: the bare
    // fixture carries no install manifest, so the run reports the retired
    // { notInitialized: true, … } document — exit 1 + parseable (the gate
    // accepts [0,1]).
    case "init": return ["work", "init", "--dry-run", "--json"];
    case "update": return ["work", "update", "--dry-run", "--json"];
    // chore 51 — init-config is a config-only read-merge-write into the
    // fixture's own .aof/aof.config.json (the headroom-pair precedent): it fills
    // memory.backend and the given vocabulary and leaves every other key alone,
    // so the fixture's `work.dir` (which every read probe above depends on)
    // survives. Exit 0 + parseable.
    case "init-config": return ["work", "init-config", "--layers", "@cli", "--domains", "@bijection", "--json"];
    case "find": return ["work", "find", "03", "--json"];
    case "observe": return ["work", "observe", "03", "--json"];
    // 348 auto-resume — the BARE sweep (no ref) is the read face: it scans the
    // fixture's items for retryable failed runs and finds none, so the document is
    // { resumed: false, pending: [] } — exit 0. A ref would ACT (mint a retry),
    // which is not what a spawn probe should do.
    case "resume": return ["work", "resume", "--json"];
    // milestone 54 / story 01 — `grade`'s BARE face is the READ (54/ADR-003 §3), and this
    // gate is the reason the rule is not stylistic: it spawns the verb as a REAL subprocess
    // from inside this repo's own suite, so an executing bare face would make the suite
    // spawn itself. The fixture declares no `work.rubric`, so the document is the honest
    // no-op — { verdict: "indeterminate", codes: ["rubric-unconfigured"] } — at exit 0,
    // with nothing launched. `--run` is the only door to a spawn and is never probed here.
    case "grade": return ["work", "grade", "03", "--json"];
    // milestone 57 / story 03 — the fixture deliberately has no git history,
    // so ratchet exercises its defined no-base refusal (exit 1 + one JSON doc).
    case "ratchet": return ["work", "ratchet", "03/01", "--json"];
    // milestone 57 / story 04 — a read-only counter over the fixture's existing
    // item records. Missing feedback/runs is an explicit measurable result.
    case "counters": return ["work", "counters", "03", "--json"];
    case "use-headroom": return ["work", "use-headroom", "--json"];
    case "unuse-headroom": return ["work", "unuse-headroom", "--json"];
    // m42 wave (d) leg d1 (the CLI-only batch, closing half) — the model-config
    // trio probes with --show: the read face (config-only, mutates nothing on
    // the fixture) — the set faces would prompt (orchestrator/delegation) or
    // write config, neither of which belongs in a spawn probe.
    case "orchestrator": return ["work", "orchestrator", "--show", "--json"];
    case "delegation": return ["work", "delegation", "--show", "--json"];
    case "delegation-model": return ["work", "delegation-model", "--show", "--json"];
    case "loops-show": return ["work", "loops", "show", "--json"];
    case "loops-graph": return ["work", "loops", "graph", "--json"];
    case "loops-validate": return ["work", "loops", "validate", "--json"];
    case "loops-groundedness": return ["work", "loops", "groundedness", "--json"];
    // story 79 — `loop-document`'s BARE face is the READ (compose + emit, touching no disk), and
    // this gate is the reason that rule is not stylistic: it spawns the verb as a REAL subprocess
    // from inside this repository's own suite, so a writing bare face would make the suite write
    // a tracked file into the fixture — and, run from the repo root, into the repo. The fixture
    // declares no `.aof/loops/` registry, so the document composed here is the honest
    // absent-registry rendering at exit 0. `--write` is the only door to disk and is never probed.
    case "loop-document": return ["work", "loops", "document", "--json"];
    // milestone 78 / story 02 — `loop-record`'s BARE face is the READ (resolve, project, emit,
    // touching no disk), and this gate is why that rule is not stylistic: it spawns the verb as a
    // REAL subprocess from inside this repository's own suite, so a writing bare face would write
    // an `EXECUTION.md` into the fixture's milestone 03 — and, run from the repo root, into a
    // tracked work item. The fixture declares no `.aof/loops/` registry and item 03 carries the
    // seeded runs the run-verb probes leave, none of them bearing `brief.loop`, so the document
    // composed here is the honest zero-coverage rendering at exit 0. `--write` is the only door to
    // disk and is never probed.
    case "loop-record": return ["work", "loop-record", "03", "--json"];
    // milestone 53 / story 02 — work:loop's machine face is the non-mutating
    // launcher probe; phase drivers use their explicit report-only form so this
    // real subprocess gate can never start an interactive agent.
    case "loop": return ["work", "loop", "03", "--json"];
    case "drive-refine": return ["work", "drive", "refine", "03/01", "--dry-run", "--json"];
    case "drive-continue": return ["work", "drive", "continue", "03/01", "--dry-run", "--json"];
    case "drive-verify": return ["work", "drive", "verify", "03/01", "--dry-run", "--json"];
    case "list": return ["work", "list", "--json"];
    // work:debt reads the ledger at the work directory root. The fixture has never accrued one,
    // so this probe exercises the `present: false` answer — the healthy state for most
    // repositories — at exit 0. The BARE face is deliberately taken (no --prune): a writing
    // probe here would have this gate rewrite whatever ledger it was pointed at.
    case "debt": return ["work", "debt", "--json"];
    case "doc": return ["work", "doc", "03", "SPEC", "--json"];
    case "tasks": return ["work", "tasks", "03/01", "--json"];
    case "validate": return ["work", "validate", "--json"];
    case "doctor": return ["work", "doctor", "--json"];
    // milestone 59 / story 04 — work:audit EXECUTES by design (59/ADR-002 §1): its census lane
    // asks a child process what `scripts/test.mjs` assembles, and its evidence lane drives one
    // bounded child per cited control. A bare probe here would therefore make this suite re-run
    // the repository's own test tree from inside itself. The scope `99` resolves to no fixture
    // item, which is the command's own defined no-op — nothing matched, no lane runs, no child is
    // started, one parseable document at exit 0. Scope-as-filter is covered behaviourally in
    // test/audit/audit-command.test.mjs; what this probe proves is that the VERB is reachable.
    case "audit": return ["work", "audit", "99", "--json"];
    // milestone 61 / story 06 — the acceptor is report-only by default. The fixture
    // declares no tunable set, so this is a zero-proposal report at exit 0: no value is
    // moved and no proposal is invented merely to make the probe interesting.
    case "acceptor": return ["work", "acceptor", "--json"];
    // milestone 62 / story 04 — unresolved scope is the tuner's defined no-op;
    // the route is exercised without walking the repository-sized corpus.
    case "tune": return ["work", "tune", "99", "--json"];
    // milestone 63 / story 05 — the trigger's face is a READ that launches nothing: the bare form
    // resolves every trigger the fixture's installed declaration declares into a `work:loop`
    // input and the argv that carries it, and starts none of them. No member of the shipped
    // declaration asks for a level the gate governs, so this probe reaches neither `work:doctor`
    // nor `work:loops-groundedness` — exit 0, one parseable document, and no registry read paid
    // for by a gate this run never needed.
    case "trigger": return ["work", "trigger", "--json"];
    case "next": return ["work", "next", "--json"];
    // story 65 / task 02 — work:dispatch. The BARE (list) face is the READ: it reports the
    // live lanes, the ready set and the configured bound. The fixture is not a git repo, so
    // `git worktree list` faults, the inspector degrades to an empty lane list, and the
    // probe still emits ONE parseable document at exit 0 — nothing is materialised and no
    // worktree is created by this spawn. A ref would ACT (materialise a lane), which does
    // not belong in a bijection probe.
    case "dispatch": return ["work", "dispatch", "--list", "--json"];
    case "feedback": return ["work", "feedback", "03/01", "--note", "bijection probe", "--actor", "arch-test", "--json"];
    // milestone 19 — the three work:run-* verbs. Subs run alphabetically, so
    // run-complete runs BEFORE run-start: it completes buildFixture()'s seeded
    // running run on 03/01 (exit 0), then run-start mints a fresh running run on
    // 03/01 (exit 0). run-status reads the milestone 03 (empty history → exit 0).
    case "run-complete": return ["work", "run-complete", "03/01", "--outcome", "done", "--json"];
    case "run-start": return ["work", "run-start", "03/01", "--json"];
    case "run-status": return ["work", "run-status", "03", "--json"];
    // milestone 20 — run-retry resumes the seeded retryable failed run on milestone 03
    // (exit 0). The switch THROWS on an unmapped sub (19/R1), so this case is required.
    case "run-retry": return ["work", "run-retry", "03", "--json"];
    // 2026-08-16 — work:status, the item-lifecycle door. The BARE (no target) form is the
    // READ: the current status plus the item's legal next moves — exit 0, one parseable
    // document, and NOTHING moved. A target would MUTATE the fixture's "03/01" status, which
    // the probes running after it (validate/verify) read, so it does not belong in a
    // bijection probe; the move itself is covered behaviourally by
    // test/work/work-item-status-lifecycle.test.mjs.
    case "status": return ["work", "status", "03/01", "--json"];
    // milestone 41 / story 02 — insert-milestone/insert-uat place a new top-level
    // driver. --at is chosen WELL ABOVE the fixture's highest number (03) so the
    // insert shifts ZERO existing items (no --yes needed) and never disturbs the
    // "03"/"03/01" refs the other subcommand probes above depend on.
    case "insert-milestone": return ["work", "insert-milestone", "bijection-milestone", "--at", "50", "--json"];
    case "insert-uat": return ["work", "insert-uat", "bijection-uat", "--at", "51", "--json"];
    // milestone 41 / story 03 — insert-story places a new story under the
    // fixture's milestone "03". --at is chosen WELL ABOVE the fixture's one
    // existing nested story (03/01) so the insert shifts ZERO siblings (no
    // --yes needed) and never disturbs the "03/01" ref the other subcommand
    // probes above depend on.
    case "insert-story": return ["work", "insert-story", "bijection-story", "--at", "50", "--under", "3", "--json"];
    // milestone 39 / story 03 — insert-chore places a new top-level chore;
    // --at 49 stays well clear of the other insert-* probes' targets (50/51)
    // and the fixture's own "03"/"03/01" refs, so it shifts zero items.
    case "insert-chore": return ["work", "insert-chore", "bijection-chore", "--at", "49", "--json"];
    // promote-gap composes over the SAME chore insert engine; --at 60 is a
    // fourth, disjoint slot so this probe never collides with any of the
    // above regardless of subcommand execution order.
    case "promote-gap":
      return [
        "work",
        "promote-gap",
        "bijection gap field",
        "--discharge",
        "a production path writes bijection_gap_field",
        "--at",
        "60",
        "--json",
      ];
    // milestone 71 / story 01 — work:promote-finding, the SECOND face on the one promotion engine.
    // It WRITES, like `feedback` above, so the probe targets the real fixture item `03/01`. Unlike
    // `promote-gap` it takes no `--at`: the loop never chooses a position (71/ADR-009 §1), so the
    // chore APPENDS after the highest existing number and renumbers nothing the other probes read.
    case "promote-finding": return ["work", "promote-finding", "03/01", "a bijection probe finding", "--remedy", "record the probe", "--json"];
    // milestone 127 / story 02 — work:promote, the ONE mint (127/ADR-003 §1). The fixture holds no
    // `backlog/`, so the verb refuses `promote-not-found` as ONE parseable `{ ok:false, error, code }`
    // document at exit 1 — the `update` precedent below (a coded refusal that still emits one
    // document is a clean probe), and deliberately so: a promote that SUCCEEDED would MINT a
    // number into the fixture the other probes read.
    case "promote": return ["work", "promote", "bijection-probe", "--json"];
    // milestone 40 / story 02 — work:upgrade. --dry-run so the probe never
    // mutates the fixture's "03"/"03/01" refs the other subcommand probes
    // above depend on (it only REPORTS what would change).
    case "upgrade": return ["work", "upgrade", "--dry-run", "--json"];
    // 2026-07-26 — work:continue, THE single "continue this task [--node <id>]" door.
    // The fixture is NOT mesh-configured and "03/01" has no prior run, so WHERE resolves
    // to `local`: exit 0, one parseable envelope, and NOTHING is dispatched or minted.
    case "continue": return ["work", "continue", "03/01", "--json"];
    // m42 wave (b) — refine/verify are the SAME door (one factory, one decision).
    case "refine": return ["work", "refine", "03/01", "--json"];
    case "verify": return ["work", "verify", "03/01", "--json"];
    // m43 / story 04 (ADR-010/R4.2) — work:resync asks the node that REPORTED a cached row
    // to push a fresh copy. The fixture is not mesh-configured and its cache holds no row
    // for "03/01", so the door resolves NO OWNING NODE and answers the coded
    // `resync-no-owner` document at exit 0 — nothing is written, nothing is dispatched, and
    // no bounded poll is entered (the refusal is decided before any request row exists).
    // A coded refusal that still emits ONE parseable document is a clean probe, the same
    // shape `update` above establishes.
    case "resync": return ["work", "resync", "03/01", "--json"];
    // milestone 96 / story 04 — work:regression-gate. The fixture root is not a git repository, so
    // the verb takes its FIRST door and refuses `regression-gate-dirty-tree` — it cannot show the
    // checkout is clean — before any suite is launched. That is a clean probe on the `update`
    // precedent: a coded refusal that still emits ONE parseable document, and it is what keeps this
    // probe from running a whole test suite as a side effect of being probed.
    case "regression-gate": return ["work", "regression-gate", "03", "--json"];
    // story 128 — work:memory, the memory seam's door on the route table. `status` is the READ
    // face (05/ADR-003's introspection method): the fixture declares no `memory.backend`, so the
    // seam selects `none` (absent memory ≡ "none", 05/ADR-002) and the document is the honest
    // `{ backend: "none", recordCount: 0 }` at exit 0 — nothing is indexed, nothing is written.
    // `reindex`/`ingest` would rebuild an index into the fixture's `.aof/` and, under a `local`
    // selection, mutate its `.aof/.gitignore`; neither belongs in a bijection probe.
    case "memory": return ["work", "memory", "status", "--json"];
    default: throw new Error(`unmapped subcommand ${sub}`);
  }
}

function runCli(root, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export const archTests = [
  {
    name: "arch/15 ADR-005: every registered work:* command carries a non-null cli adapter (argv + render functions)",
    run: async () => {
      const commands = listCommands();
      assert.ok(commands.length > 0, "the registry is non-empty");
      for (const command of commands) {
        assert.ok(command.cli != null, `${command.id} has a non-null cli adapter`);
        assert.equal(typeof command.cli.argv, "function", `${command.id} cli.argv is a function`);
        assert.equal(typeof command.cli.render, "function", `${command.id} cli.render is a function`);
      }
    },
  },
  {
    name: "arch/15 ADR-005: every registry-derived work:* subcommand is CLI-reachable — a route-table entry or a workCommand dispatch branch",
    run: async () => {
      const body = workCommandBody(stripComments(await readFile(CLI_MJS, "utf8")));
      assert.ok(body.length > 0, "workCommand is defined in cli.mjs");
      // m42 wave (d) leg d1: the route table is derived from the registry, so a
      // migrated verb's reachability is a registry fact, not a source grep.
      const routes = deriveRouteTable(listCommands());
      const workCommands = listCommands().filter((command) => command.id.startsWith("work:"));
      for (const command of workCommands) {
        const sub = command.id.slice("work:".length);
        const route = command.cli?.route;
        const routed = Array.isArray(route) && routes.has(route.join(" "));
        const laddered = new RegExp(`subcommand\\s*===\\s*["']${sub}["']`).test(body);
        assert.ok(
          routed || laddered,
          `${command.id} is CLI-reachable — via its declared cli.route or a workCommand dispatch branch (no command the CLI cannot run)`
        );
      }
    },
  },
  {
    name: "arch/15 ADR-005: aof work <sub> --json runs cleanly and emits parseable JSON for every registry-derived work:* subcommand",
    run: async () => {
      const root = await buildFixture();
      try {
        for (const sub of subcommands()) {
          const result = runCli(root, argsFor(sub));
          // `validate` and `doctor` are the reads that DESIGN to exit 1 when
          // findings exist (validate on any finding; doctor on an error or a
          // warn-under-strict); `update` on the bare fixture reports the coded
          // { notInitialized: true, … } refusal document at exit 1 (m42 wave (d)
          // — the mesh-bijection precedent: a coded refusal that still emits ONE
          // parseable document is a clean probe). `promote` (127/02) is the same
          // shape on purpose: the fixture holds no `backlog/`, so it refuses
          // `promote-not-found` as one coded document at exit 1 — a promote that
          // succeeded would MINT a number into the fixture the other probes read.
          // Both 0 and 1 are clean runs for those; every other op exits 0. None
          // may crash (>1 or a null status from a thrown error).
          const acceptable = ["validate", "doctor", "update", "ratchet", "regression-gate", "debt", "promote"].includes(sub) ? [0, 1] : [0];
          assert.ok(
            acceptable.includes(result.status),
            `aof ${argsFor(sub).join(" ")} exits ${acceptable.join("/")} (got ${result.status}; stderr: ${result.stderr})`
          );
          // The --json face emits a single parseable JSON document on stdout.
          let parsed;
          assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); }, `aof ${argsFor(sub).join(" ")} emits parseable JSON (stdout: ${result.stdout.slice(0, 200)})`);
          assert.ok(parsed !== undefined, `aof ${argsFor(sub).join(" ")} produced a JSON value`);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/ADR-004 inv.2: aof work feedback --json writes exactly one bullet to the target STATE.md",
    run: async () => {
      const root = await buildFixture();
      try {
        const statePath = path.join(root, "wiki", "work", "03_milestone_board", "stories", "01_story_board-ui", "STATE.md");
        const before = await readFile(statePath, "utf8");
        assert.ok(!before.includes("## Feedback (for retro)"), "fixture STATE.md starts with no feedback heading");

        const result = runCli(root, argsFor("feedback"));
        assert.equal(result.status, 0, `aof work feedback exits 0 (stderr: ${result.stderr})`);
        const parsed = JSON.parse(result.stdout);
        assert.equal(parsed.ok, true, "the feedback result envelope is { ok: true, … }");

        const after = await readFile(statePath, "utf8");
        const headingCount = after.split("## Feedback (for retro)").length - 1;
        assert.equal(headingCount, 1, "exactly one verbatim feedback heading after the write");
        assert.ok(after.includes("bijection probe"), "the appended bullet carries the note");
        const bullets = after.split(/\r?\n/).filter((line) => line.trim().startsWith("- "));
        assert.equal(bullets.length, 1, "exactly one bullet appended under the heading");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];
