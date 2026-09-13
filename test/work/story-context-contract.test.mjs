import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateWork } from "../../src/commands/validate.mjs";
import { MAX_REVIEW_ROUNDS, reviewRoundsFromConfig } from "../../src/loop-bounds.mjs";
import { partitionReadySetByDeclaredFiles } from "../../src/ready-wave.mjs";
import {
  contractSetCovers,
  declaresDirectory,
  namesBackslashPath,
  resolveDeclaredSet,
  resolveStoryContractPath,
  storyAnchorResolves,
  storyContractList,
} from "../../src/story-contract.mjs";
// milestone 124 / story 00 — the census is asked the SAME coverage question the wave is asked, on
// the one input where equality and coverage disagree. Importing the lane here is the point of
// task 01's last scenario: two surfaces, one predicate.
import { classifyDependsEdges } from "../../src/work/doctor-depends.mjs";
import { listItems } from "../../src/work.mjs";
import {
  decideExecutionMode,
  decideReviewGate,
  EXECUTION_MODE_REASONS,
  EXECUTION_MODES,
  REVIEW_BLOCKER_CLASSES,
  reviewBlockerClaim,
} from "../../src/work/loop.mjs";
// 71/00 — the marked regions of `continue.md` are cut structurally, so a renumbered step does not
// move what these assertions read.
// 124/00 — `stripComments`, for the one structural clause task 01 states in terms of the module's
// own source ("holds no second coverage rule"). A claim about what a module does NOT contain has
// to be read off the code, and a comment naming the thing it refuses would otherwise fail it.
import { markedRegion, stripComments } from "../support/source-slice.mjs";

// A marked region of a bundled prompt, with its line wrapping collapsed: the prompt is hand-wrapped
// prose, so a clause that fits on one line today wraps tomorrow, and an assertion keyed on the
// wrapping would fail on a reflow that changed nothing it claims to check.
const region = (text, open, close) => {
  const cut = markedRegion(text, open, close);
  return cut == null ? null : cut.replace(/\s+/gu, " ");
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundle = path.join(root, "src", "bundle");
const fm = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;

async function withStory({ reads = "[]", files = "[]" } = {}, body) {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "aof-story-context-"));
  const repo = path.join(fixture, "repo");
  const workDir = path.join(repo, "wiki", "work");
  const milestoneDir = path.join(workDir, "00_milestone_context");
  const storyDir = path.join(milestoneDir, "stories", "00_story_slice");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await mkdir(path.join(repo, "src"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work", tags: {} } };
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify(config), "utf8");
  await writeFile(path.join(repo, "src", "app.mjs"), "export const app = true;\n", "utf8");
  await writeFile(path.join(milestoneDir, "ARCHITECTURE.md"), "# Architecture\n\n## ADR-004 — Context contract\n\nDecision.\n", "utf8");
  await writeFile(path.join(milestoneDir, "SPEC.md"), fm({
    type: "milestone", number: "00", slug: "context", title: "Context", status: "in-progress",
    owner: "product-owner", created: "2026-08-24", updated: "2026-08-24", schema: 1, aofVersion: "0.1.0",
  }), "utf8");
  await writeFile(path.join(storyDir, "STORY.md"), fm({
    type: "story", number: "00", slug: "slice", title: "Slice", parent: "00", status: "in-progress",
    owner: "product-owner", created: "2026-08-24", updated: "2026-08-24", schema: 1, aofVersion: "0.1.0",
    reads, files,
  }), "utf8");
  try {
    return await body({ repo, workDir, milestoneDir, storyDir, config });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

const contextFindings = (findings) => findings.filter((finding) => /story (reads|files)/.test(finding.problem));
// The scaffold finding names neither field, so it needs the wider net.
const contractFindings = (findings) => findings.filter((finding) => /^story (reads|files|declares)/.test(finding.problem));

async function withWaveStories(declarations, body) {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "aof-ready-wave-"));
  const repo = path.join(fixture, "repo");
  const members = [];
  try {
    for (let index = 0; index < declarations.length; index += 1) {
      const storyDir = path.join(repo, "wiki", "work", "00_milestone_wave", "stories", `${String(index).padStart(2, "0")}_story_wave`);
      await mkdir(storyDir, { recursive: true });
      await writeFile(path.join(storyDir, "STORY.md"), declarations[index], "utf8");
      members.push({ ref: `00/${String(index).padStart(2, "0")}`, type: "story", path: storyDir });
    }
    return await body({ repo, members });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

// A whole stream, so a story's read can name a path only a SIBLING declares. `withStory`
// builds one story and cannot express the stage-1/stage-2 shape 62/R8 is about.
async function withStream(milestones, body) {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "aof-forward-reads-"));
  const repo = path.join(fixture, "repo");
  const workDir = path.join(repo, "wiki", "work");
  const config = { name: "fixture", work: { dir: "./wiki/work", tags: {} } };
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(path.join(repo, "src"), { recursive: true });
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify(config), "utf8");
  try {
    for (const milestone of milestones) {
      const milestoneDir = path.join(workDir, `${milestone.number}_milestone_stage`);
      await mkdir(milestoneDir, { recursive: true });
      await writeFile(path.join(milestoneDir, "SPEC.md"), fm({
        type: "milestone", number: milestone.number, slug: "stage", title: "Stage", status: "in-progress",
        owner: "product-owner", created: "2026-09-04", updated: "2026-09-04", schema: 1, aofVersion: "0.1.0",
      }), "utf8");
      for (const story of milestone.stories) {
        const storyDir = path.join(milestoneDir, `stories/${story.number}_story_slice`);
        await mkdir(path.join(storyDir, "tasks"), { recursive: true });
        await writeFile(path.join(storyDir, "STORY.md"), fm({
          type: "story", number: story.number, slug: "slice", title: "Slice", parent: milestone.number,
          status: "in-progress", owner: "product-owner", created: "2026-09-04", updated: "2026-09-04",
          schema: 1, aofVersion: "0.1.0", reads: story.reads ?? "[]", files: story.files ?? "[]",
        }), "utf8");
      }
    }
    return await body({ repo, workDir, config });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}
// ── milestone 124 / story 00 — the shared home, and the wave that adopts it ───────────────────
//
// Tasks `00_the-contract-set-has-one-home` and `01_ready-wave-adopts-the-predicate`. The two legs
// that are STRUCTURAL claims about the leaf (its zero project imports, its zero filesystem reach)
// are FF-12403's and live in `test/arch/planning/acd-contract-set-has-one-home.test.mjs`; the
// generated-corpus form of the tightening property lives there too. What follows is the driven
// half — the answers, over the rows the two features tabulate, and over this stream.

// A PROJECT ROOT THAT DOES NOT EXIST. Every coverage row below is decided against paths that are
// on no disk anywhere, so a predicate that had reached for `stat` would answer differently here
// than on a tree where `src/commands/` is real — which is precisely the case a write-set collision
// matters in, since the colliding path has usually not been created yet.
const NOWHERE_ROOT = path.join(root, "no-such-root-124-00");
const NOWHERE_STORY = path.join(NOWHERE_ROOT, "wiki", "work", "00_milestone_m", "stories", "00_story_s");
const NOWHERE_AT = { storyDir: NOWHERE_STORY, projectRoot: NOWHERE_ROOT };

// The declared set of a key, through the ONE HOME rather than hand-rolled here: a fixture that
// spelled `{ path, directory }` itself would keep passing on the day the resolver's answer moved.
const declaredSet = (text, key, at = NOWHERE_AT) => resolveDeclaredSet(text, key, at).entries;
const shapeOf = (entries) => (entries == null ? null : entries.map(({ path: entry, directory }) => ({ path: entry, directory })));

// Task 00's coverage outline, verbatim — the rule, its boundary, and the two real 119 shapes.
const COVERAGE_ROWS = [
  { declared: "src/commands/test.mjs", probed: "src/commands/test.mjs", covers: true, why: "equal" },
  { declared: "src/commands/", probed: "src/commands", covers: true, why: "equal once resolved — the leg that keeps the adoption a tightening" },
  { declared: "src/commands/", probed: "src/commands/test.mjs", covers: true, why: "authored directory, probed path beneath it" },
  { declared: "src/commands/", probed: "src/commands/mesh/gate.mjs", covers: true, why: "beneath it at any depth" },
  { declared: "src/commands", probed: "src/commands/test.mjs", covers: false, why: "no authored slash, so no directory was claimed" },
  { declared: "src/commands/", probed: "src/commands-old.mjs", covers: false, why: "a shared prefix is not containment — the separator is required" },
  { declared: "src/commands/test.mjs", probed: "src/commands", covers: false, why: "a file covers no directory" },
  { declared: "test/", probed: "test/arch/work/index.mjs", covers: true, why: "119/03's declared read against 119/02's declared write" },
  { declared: "src/", probed: "src/commands/test.mjs", covers: true, why: "119/04's declared read against 119/01's declared write" },
];

// Task 00's four-answers outline. `entries: null` is UNKNOWN and `entries: []` is a real empty
// set; the whole point of the table is that those two never collapse into each other.
const DECLARED_KEY_ROWS = [
  {
    declaration: "absent entirely",
    text: "---\nreads: [src/a.mjs]\n---\n",
    answer: "unknown — the story has declared nothing",
    present: false, malformed: false, entries: null,
  },
  {
    declaration: "an empty list beside a non-empty `reads:`",
    text: "---\nreads: [src/a.mjs]\nfiles: []\n---\n",
    answer: "a real empty set — the story genuinely writes nothing",
    present: true, malformed: false, entries: [],
  },
  {
    declaration: "an empty list with no `reads:` either",
    text: "---\nfiles: []\n---\n",
    answer: "unknown — an untouched scaffold is not a claim",
    present: true, malformed: false, entries: null,
  },
  {
    declaration: "an inline list that never closes",
    text: "---\nfiles: [src/a.mjs\n---\n",
    answer: "unknown, and reported malformed rather than empty",
    present: true, malformed: true, entries: null,
  },
  {
    declaration: "a list holding one absolute path",
    text: "---\nreads: [src/a.mjs]\nfiles: [/etc/passwd]\n---\n",
    answer: "unknown — a single unresolvable entry poisons the whole set",
    present: true, malformed: false, entries: null,
  },
  {
    declaration: "a list holding one `..`-escaping path",
    text: "---\nreads: [src/a.mjs]\nfiles: [../../../../../../outside.mjs]\n---\n",
    answer: "unknown — same rule, same reason",
    present: true, malformed: false, entries: null,
  },
  {
    declaration: "a list of two, the second ending in `/`",
    text: "---\nfiles: [src/a.mjs, src/commands/]\n---\n",
    answer: "a set of two, the second carrying directory intent",
    present: true, malformed: false,
    entries: [{ path: "src/a.mjs", directory: false }, { path: "src/commands", directory: true }],
  },
];

// Task 01's verdict outline, verbatim.
const WAVE_ROWS = [
  { earlier: "src/commands/", later: "src/commands/test.mjs", verdict: "held", why: "the file sits beneath the authored directory" },
  { earlier: "src/commands/", later: "src/commands", verdict: "held", why: "the two resolve to one path, as they already did today" },
  { earlier: "src/commands", later: "src/commands/test.mjs", verdict: "waved", why: "no authored slash, so one path was claimed and not a subtree" },
  { earlier: "src/commands/", later: "src/commands-old.mjs", verdict: "waved", why: "a shared prefix is not containment" },
  { earlier: "src/Commands/", later: "src/commands/test.mjs", verdict: "held", why: "the collision key case-folds, and still does" },
  { earlier: "test/", later: "test/arch/work/index.mjs", verdict: "held", why: "119/02's real declaration against 119/03's" },
  { earlier: "src/story-contract.mjs", later: "src/ready-wave.mjs", verdict: "waved", why: "genuinely disjoint, exactly as today" },
];

// THE EXACT-STRING RULE THIS STORY REPLACES, re-implemented here so the adoption is measured as a
// DIFFERENTIAL rather than asserted about the new rule alone. This is `ready-wave`'s pre-124 body
// verbatim: the resolved project path, case-folded, into a `Set`, and `Set.has` for the collision
// test — no directory intent anywhere, because `path.relative` had already thrown the authored
// slash away before the string reached the set. It lives in the TEST because the claim is about a
// rule the tree no longer holds; keeping it in `src/` would be the second home this story removes.
const collisionKey = (projectPath) => projectPath.replaceAll("\\", "/").toLowerCase();

async function exactStringWriteSet(member, projectRoot) {
  const storyDir = path.resolve(member.path);
  let text;
  try {
    text = await readFile(path.join(storyDir, "STORY.md"), "utf8");
  } catch {
    return null;
  }
  const declared = storyContractList(text, "files");
  if (!declared.present || declared.malformed) return null;
  if (declared.values.length === 0) {
    const reads = storyContractList(text, "reads");
    if (!reads.present || reads.malformed || reads.values.length === 0) return null;
  }
  const writes = new Set();
  for (const entry of declared.values) {
    const resolved = resolveStoryContractPath(entry, { storyDir, projectRoot });
    if (resolved == null || resolved.anchor != null) return null;
    writes.add(collisionKey(resolved.projectPath));
  }
  return writes;
}

async function exactStringWave(members, { projectRoot }) {
  const sets = await Promise.all(members.map((member) => exactStringWriteSet(member, projectRoot)));
  const wave = [];
  const heldSet = [];
  const occupied = new Set();
  let unknownSelected = false;
  for (let index = 0; index < members.length; index += 1) {
    const writes = sets[index];
    if (writes == null) {
      if (wave.length === 0) {
        wave.push(members[index]);
        unknownSelected = true;
      } else {
        heldSet.push(members[index]);
      }
      continue;
    }
    if (unknownSelected || [...writes].some((entry) => occupied.has(entry))) {
      heldSet.push(members[index]);
      continue;
    }
    wave.push(members[index]);
    for (const entry of writes) occupied.add(entry);
  }
  return { wave, heldSet };
}

const refsOf = (members) => members.map((member) => member.ref);

// The stream's own stories, with the `files:` set each one declares — resolved once, both ways.
// Only the stories whose set RESOLVES are carried: a member with an unknown set is waved alone if
// it is first and held otherwise, and a walk that let the first unrefined story in would make
// every comparison after it read "held" for a reason that has nothing to do with coverage.
async function streamWriteSets() {
  const items = await listItems(path.join(root, "wiki", "work"));
  const known = [];
  for (const item of items) {
    if (item.type !== "story") continue;
    let text;
    try {
      text = await readFile(path.join(item.dir, "STORY.md"), "utf8");
    } catch {
      continue;
    }
    const declared = resolveDeclaredSet(text, "files", { storyDir: item.dir, projectRoot: root });
    if (declared.entries == null) continue;
    known.push({
      ref: item.ref,
      type: "story",
      path: item.dir,
      entries: declared.entries.map((entry) => ({ path: collisionKey(entry.path), directory: entry.directory })),
    });
  }
  return known;
}

// The two rules, as PAIRWISE predicates over two resolved write sets. Equality is what the tree
// held before this story; coverage is what it holds now, asked both ways because a write/write
// collision is not directional even though coverage is.
const collidesByEquality = (left, right) => left.some((a) => right.some((b) => a.path === b.path));
const collidesByCoverage = (left, right) =>
  left.some((entry) => contractSetCovers(right, entry)) || right.some((entry) => contractSetCovers(left, entry));

export const storyContextContractTests = [
  {
    name: "proposed-fixes/read-contract parses inline and block lists without widening work.mjs",
    run() {
      assert.deepEqual(storyContractList("---\nreads: [src/a.mjs, 'src/b,c.mjs']\n---\n", "reads"), {
        present: true, malformed: false, values: ["src/a.mjs", "src/b,c.mjs"],
      });
      assert.deepEqual(storyContractList("---\nreads:\n  - src/a.mjs\n  - ../ARCHITECTURE.md#adr-004\nfiles: []\n---\n", "reads"), {
        present: true, malformed: false, values: ["src/a.mjs", "../ARCHITECTURE.md#adr-004"],
      });
      assert.deepEqual(storyContractList("---\nfiles: nope\n---\n", "files"), {
        present: true, malformed: true, values: [],
      });
      assert.equal(storyAnchorResolves("## ADR-004 — Context contract\n", "adr-004"), true);
    },
  },
  {
    name: "proposed-fixes/read-contract validates existing project paths and named ADR anchors",
    run: () => withStory({
      reads: "[src/app.mjs, wiki/work/00_milestone_context/ARCHITECTURE.md#adr-004]",
      files: "[src/app.mjs, src/not-created-yet.mjs]",
    }, async ({ repo, workDir, config }) => {
      const findings = await validateWork(workDir, config, "00/00", { projectRoot: repo });
      assert.deepEqual(contextFindings(findings), [], JSON.stringify(findings));
    }),
  },
  {
    name: "proposed-fixes/read-contract reports missing reads and drifting anchors but permits future writes",
    run: () => withStory({
      reads: "[src/missing.mjs, wiki/work/00_milestone_context/ARCHITECTURE.md#adr-999]",
      files: "[src/future.mjs]",
    }, async ({ repo, workDir, config }) => {
      const problems = contextFindings(await validateWork(workDir, config, "00/00", { projectRoot: repo })).map((finding) => finding.problem);
      assert.deepEqual(problems, [
        'story reads path "src/missing.mjs" does not exist',
        'story reads anchor "wiki/work/00_milestone_context/ARCHITECTURE.md#adr-999" does not resolve',
      ]);
    }),
  },
  {
    // 62/R8 — a stage-2 story composes stage-1 modules that do not exist yet, and the
    // gate used to call that honest declaration a defect. It is clean when some story
    // under the SAME milestone claims the path in its `files:`, and a finding otherwise.
    name: "chore-97/a reads entry a sibling story will create validates clean, and nothing else does",
    run: async () => {
      const problems = async (milestones, scope) => contextFindings(
        await withStream(milestones, ({ repo, workDir, config }) =>
          validateWork(workDir, config, scope, { projectRoot: repo })),
      ).map((finding) => finding.problem);

      // Stage 1 declares the write; stage 2 reads it. Neither file is on disk.
      assert.deepEqual(await problems([{
        number: "00",
        stories: [
          { number: "00", files: "[src/stage-one.mjs]" },
          { number: "01", reads: "[src/stage-one.mjs, src/stage-one.mjs#adr-001]", files: "[src/stage-two.mjs]" },
        ],
      }], "00/01"), []);

      // The teeth: a path no story under the milestone claims is still a finding — and
      // the anchor case is not a loophole either, because the file part is what is claimed.
      assert.deepEqual(await problems([{
        number: "00",
        stories: [
          { number: "00", files: "[src/stage-one.mjs]" },
          { number: "01", reads: "[src/nobody-writes.mjs]", files: "[]" },
        ],
      }], "00/01"), ['story reads path "src/nobody-writes.mjs" does not exist']);

      // Case-SENSITIVE, unlike ready-wave's collision key: a borrowed claim under a
      // different spelling passes here and reds on the Linux worker.
      assert.deepEqual(await problems([{
        number: "00",
        stories: [
          { number: "00", files: "[src/stage-one.mjs]" },
          { number: "01", reads: "[src/Stage-One.mjs]", files: "[]" },
        ],
      }], "00/01"), ['story reads path "src/Stage-One.mjs" does not exist']);

      // The claim set is the story's OWN milestone. Another milestone's write is not a
      // promise this milestone can lean on, so the finding stands.
      assert.deepEqual(await problems([
        { number: "00", stories: [{ number: "00", files: "[src/stage-one.mjs]" }] },
        { number: "01", stories: [{ number: "00", reads: "[src/stage-one.mjs]", files: "[]" }] },
      ], "01/00"), ['story reads path "src/stage-one.mjs" does not exist']);

      // A read the milestone claims is clean whether or not this story is the claimant:
      // its own declared write is the strongest claim that the path will exist.
      assert.deepEqual(await problems([{
        number: "00",
        stories: [{ number: "00", reads: "[src/stage-one.mjs]", files: "[src/stage-one.mjs]" }],
      }], "00/00"), []);
    },
  },
  {
    name: "proposed-fixes/story-contract refuses malformed lists and paths outside the project",
    run: () => withStory({ reads: "nope", files: "[../../../../../../outside.mjs]" }, async ({ repo, workDir, config }) => {
      const problems = contextFindings(await validateWork(workDir, config, "00/00", { projectRoot: repo })).map((finding) => finding.problem);
      assert.deepEqual(problems, [
        "story reads declaration must be an inline or block list",
        'story files entry "../../../../../../outside.mjs" must resolve inside the project',
      ]);
    }),
  },
  {
    name: "proposed-fixes/work-next partition keeps ready order, serialises overlaps, and holds unknown writes",
    run: async () => {
      await withWaveStories([
        "---\nfiles: [src/shared.mjs]\n---\n",
        "---\nfiles: [SRC/shared.mjs]\n---\n",
        "---\nfiles: [src/independent.mjs]\n---\n",
      ], async ({ repo, members }) => {
        const partition = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
        assert.deepEqual(partition.wave.map((member) => member.ref), ["00/00", "00/02"]);
        assert.deepEqual(partition.heldSet.map((member) => member.ref), ["00/01"]);
      });
      await withWaveStories([
        "---\nreads: []\n---\n",
        "---\nfiles: [src/independent.mjs]\n---\n",
      ], async ({ repo, members }) => {
        const partition = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
        assert.deepEqual(partition.wave.map((member) => member.ref), ["00/00"]);
        assert.deepEqual(partition.heldSet.map((member) => member.ref), ["00/01"]);
      });
    },
  },
  {
    name: "proposed-fixes/review runtime deduplicates Blockers, stalls on no decrease, and refuses round four",
    run() {
      const first = reviewBlockerClaim("production-defect", "first defect");
      const second = reviewBlockerClaim("locked-contract-violation", "second defect");
      const cap = reviewRoundsFromConfig({ config: {} });
      assert.equal(reviewRoundsFromConfig({ config: { work: { loop: { reviewRounds: 99 } } } }), MAX_REVIEW_ROUNDS);

      const secondRound = decideReviewGate({
        completedRounds: 1, cap, hardCap: MAX_REVIEW_ROUNDS,
        findings: [], blockerClaims: [first, first, second],
      });
      assert.equal(secondRound.round, 2);
      assert.equal(secondRound.blockerCount, 2, "duplicate claims spend no extra blocker budget");

      const stalled = decideReviewGate({
        completedRounds: 2, cap, hardCap: MAX_REVIEW_ROUNDS, previousBlockerCount: 2,
        findings: [], blockerClaims: [first, second],
      });
      assert.equal(stalled.stop, "no-progress");
      assert.equal(stalled.producer, "review:blocker-count-not-decreasing");

      const thirdRound = decideReviewGate({
        completedRounds: 2, cap, hardCap: MAX_REVIEW_ROUNDS, previousBlockerCount: 2,
        findings: [], blockerClaims: [first],
      });
      assert.equal(thirdRound.round, 3);

      const hardStop = decideReviewGate({
        completedRounds: 3, cap, hardCap: MAX_REVIEW_ROUNDS, previousBlockerCount: 1,
        findings: [], blockerClaims: [first],
      });
      assert.equal(hardStop.stop, "cap-exhausted");
      assert.equal(hardStop.producer, "review:rounds>=hard-cap");
    },
  },
  {
    name: "proposed-fixes/bundle carries read/write sets, wave partitioning, evidence bars, and bounded review rounds",
    async run() {
      const template = await readFile(path.join(bundle, "templates", "story", "STORY.md"), "utf8");
      assert.match(template, /^reads: \[\]$/m);
      assert.match(template, /^files: \[\]$/m);

      const continuePrompt = await readFile(path.join(bundle, "commands", "continue.md"), "utf8");
      for (const phrase of [
        "Read exactly the story's `reads:` set",
        "Do not recompute or widen `wave`",
        "never substitute `readySet` for `wave`",
        "Three rounds is the hard cap",
        "not strictly lower than the previous round",
      ]) assert.ok(continuePrompt.includes(phrase), phrase);

      const codeReview = await readFile(path.join(bundle, "commands", "code-review.md"), "utf8");
      assert.match(codeReview, /Three rounds is the hard cap/);
      assert.match(codeReview, /equal to or higher than round N-1/);

      for (const agent of ["aof-architect", "aof-qa", "aof-designer", "aof-security", "aof-compliance"]) {
        const prompt = await readFile(path.join(bundle, "agents", `${agent}.md`), "utf8");
        assert.match(prompt, /more than 80% confident/iu, agent);
        assert.match(prompt, /clean (review|CONFORMS verdict)[\s\S]*valid/iu, agent);
        assert.match(prompt, /<reporting_bar>/u, agent);
        assert.match(prompt, /suspected \*\*Blocker\*\*[\s\S]*explicit\s+question/iu, agent);
      }
      const developer = await readFile(path.join(bundle, "agents", "aof-developer.md"), "utf8");
      assert.match(developer, /<build_context>[\s\S]*task `\.feature` files and its declared `reads:` set/iu);
      assert.match(developer, /report the incomplete `reads:` contract/iu);
    },
  },
  {
    name: "proposed-fixes/story-contract keeps a commented entry and refuses a backslash path",
    run() {
      assert.deepEqual(storyContractList("---\nreads:\n  - src/a.mjs # the entry point\n  - '../ARCHITECTURE.md#adr-004'\n---\n", "reads"), {
        present: true, malformed: false, values: ["src/a.mjs", "../ARCHITECTURE.md#adr-004"],
      });
      assert.deepEqual(storyContractList("---\nfiles: [src/a.mjs] # authored at refine\n---\n", "files"), {
        present: true, malformed: false, values: ["src/a.mjs"],
      });
      assert.deepEqual(storyContractList("---\nfiles: [src/a.mjs\n---\n", "files"), {
        present: true, malformed: true, values: [],
      });
      assert.equal(namesBackslashPath("src\\a.mjs"), true);
      assert.equal(namesBackslashPath("src/a.mjs"), false);
      // The resolver refuses it on EVERY node, so a Windows-authored story cannot pass
      // here and red on the Mac or WSL worker.
      assert.equal(resolveStoryContractPath("src\\a.mjs", { storyDir: "/repo/w", projectRoot: "/repo" }), null);
    },
  },
  {
    name: "proposed-fixes/validate names the backslash, the anchor in files, and the untouched scaffold",
    run: () => withStory({
      reads: "[src\\app.mjs]",
      files: "[src/app.mjs#adr-004]",
    }, async ({ repo, workDir, config }) => {
      const problems = contractFindings(await validateWork(workDir, config, "00/00", { projectRoot: repo }))
        .map((finding) => finding.problem);
      assert.deepEqual(problems, [
        'story reads entry "src\\app.mjs" must use forward slashes so it resolves on every node',
        'story files entry "src/app.mjs#adr-004" must not name a section anchor',
      ]);
    }),
  },
  {
    name: "proposed-fixes/an untouched scaffold is a finding, not a contract, and never joins a wave",
    run: async () => {
      await withStory({ reads: "[]", files: "[]" }, async ({ repo, workDir, config }) => {
        const problems = contractFindings(await validateWork(workDir, config, "00/00", { projectRoot: repo }))
          .map((finding) => finding.problem);
        assert.deepEqual(problems, [
          "story declares neither reads nor files — run `aof:refine` to author the context contract",
        ]);
      });
      // An authored doc-only story reads something and writes nothing; it is a real
      // claim and still parallelises. Only the template's own both-empty signature is
      // treated as no declaration at all.
      await withStory({ reads: "[src/app.mjs]", files: "[]" }, async ({ repo, workDir, config }) => {
        const problems = contractFindings(await validateWork(workDir, config, "00/00", { projectRoot: repo }))
          .map((finding) => finding.problem);
        assert.deepEqual(problems, []);
      });
      await withWaveStories([
        "---\nreads: []\nfiles: []\n---\n",
        "---\nfiles: [src/independent.mjs]\n---\n",
      ], async ({ repo, members }) => {
        const partition = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
        assert.deepEqual(partition.wave.map((member) => member.ref), ["00/00"]);
        assert.deepEqual(partition.heldSet.map((member) => member.ref), ["00/01"]);
      });
      await withWaveStories([
        "---\nreads: [src/app.mjs]\nfiles: []\n---\n",
        "---\nfiles: [src/independent.mjs]\n---\n",
      ], async ({ repo, members }) => {
        const partition = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
        assert.deepEqual(partition.wave.map((member) => member.ref), ["00/00", "00/01"]);
        assert.deepEqual(partition.heldSet, []);
      });
    },
  },
  // ── milestone 71 / story 00 ────────────────────────────────────────────────
  // The build's spoken terminator (ADR-002 §1) and what the story lane DOES with each gate rung's
  // answer (ADR-001, ADR-009 §A/§E). The STRUCTURAL claims — rung-set parity with the shell, and a
  // stated bound naming its home — are FF-7105's and FF-7101's and are not restated here; these are
  // the behaviour clauses those two controls do not reach.
  {
    name: "71/00 the build step states BOTH terminators — success in all three legs, and the failure-to-progress stop with its round accounting",
    async run() {
      const prompt = await readFile(path.join(bundle, "commands", "continue.md"), "utf8");
      const step = region(prompt, "<build_terminator>", "</build_terminator>");
      assert.ok(step != null, "continue.md: NOT FOUND — the build terminator is not marked");

      // Success is all three legs: a green scenario over a tree that does not typecheck is not a
      // built story, and before this story the prompt named only the first.
      for (const leg of [/`@executable` scenarios/u, /typecheck/u, /lint/u, /fitness functions? pass/u]) {
        assert.match(step, leg, `the success terminator states ${leg}`);
      }

      // The failure-to-progress stop, its bound, and the three accounting rules the task's decision
      // table turns on: reduction resets, no-reduction records, and the first round is never one.
      assert.match(step, /work\.loop\.buildNoProgressRounds/u, "the bound's home is named so a raise is possible");
      assert.match(step, /no reduction|reduces the count/u, "the stop is failure-to-progress, not an iteration count");
      assert.match(step, /first round has no predecessor/u, "a first round is never a no-progress round");
      assert.match(step, /Success is checked first/u, "a round reaching zero hands on however many no-progress rounds stand against it");

      // …and the hand-back is a STOP, reported, never another round.
      assert.match(step, /stop and hand back/iu, "the bound stops the build");
      assert.match(step, /failing scenarios by name/u, "the hand-back names the failing scenarios");
      assert.match(step, /Do not start another round/iu, "…and does not start another");
      assert.match(step, /do not hand on to the gate ladder or the review lanes/iu, "…and does not fall through to the gate or the reviewers");
      assert.match(step, /never print the accept hand-off/iu, "…and never prints the accept hand-off");

      // The build step writes the BUILD's rules and no review-round rule; the review step is the
      // converse. Two copies of a round rule drift, and the one that drifts is the one nobody reads.
      assert.equal(/hard cap|review round/iu.test(step), false, "the build step states no review-round rule");
      const rounds = region(prompt, "<review_rounds>", "</review_rounds>");
      assert.ok(rounds != null, "continue.md: NOT FOUND — the review rounds are not marked");
      assert.equal(/buildNoProgressRounds|failing-scenario count/u.test(rounds), false, "the review step states no build-round rule");
    },
  },
  {
    name: "71/00 the gate ladder step says what each rung's answer decides, and a red gate is its own outcome",
    async run() {
      const prompt = await readFile(path.join(bundle, "commands", "continue.md"), "utf8");
      const gate = region(prompt, "<gate_ladder>", "</gate_ladder>");
      assert.ok(gate != null, "continue.md: NOT FOUND — the gate ladder is not marked");

      // A red first rung short-circuits: the second is not walked and no reviewer is spawned.
      assert.match(gate, /stop here/iu, "a validate rung with findings stops the ladder");
      assert.match(gate, /second rung is not walked/u, "…the doctor rung is not walked");
      assert.match(gate, /no reviewer is spawned/iu, "…and no reviewer is spawned");
      // Only ADMITTED doctor findings count — the shell's own rule, so a doctor answer whose
      // findings are all filtered out still admits the review lanes.
      assert.match(gate, /admitted findings/u, "only the doctor's admitted findings count");
      assert.match(gate, /Only when both rungs answer clean is any review lane spawnable/u, "…so a doctor rung WITH admitted findings still spawns nobody");

      // ADR-009 §E — a rung that throws is a RED rung, never a clean one.
      assert.match(gate, /exits non-zero is a red rung/u, "a throwing rung is red");
      assert.match(gate, /report the rung, the ref and the error/iu, "…and the refusal is reported rather than stepped past");

      // A red gate is reported as a gate, never as a review verdict — and it moves nothing.
      assert.match(gate, /print no review verdict/iu, "a red gate prints no review verdict");
      assert.match(gate, /do not print the accept hand-off/iu, "…nor the accept hand-off");
      assert.match(gate, /do not move the item to `in-review`/iu, "…and does not move the item to in-review");
      assert.match(gate, /walk the ladder again from its first rung/iu, "a fixed rung is re-gated, never assumed green");

      // ADR-009 §A — the ladder re-runs after a fix round, and a red one does not consume a round.
      assert.match(gate, /re-runs after every fix round/u, "the ladder re-runs before any re-review is admitted");
      assert.match(gate, /does not consume a review round/u, "…and a red ladder after a fix round costs no round");

      // The two halves agree: the review-round rules point back at the same ladder.
      const rounds = region(prompt, "<review_rounds>", "</review_rounds>");
      assert.match(rounds, /gate ladder/iu, "the review rounds name the ladder that re-runs before them");
      assert.match(rounds, /does not consume a round/u, "…and repeat that a red ladder costs no round");

      // The hand-back vocabulary carries a gate outcome, so a red gate is reportable as itself.
      const output = region(prompt, "<output>", "</output>");
      assert.ok(output != null, "continue.md: NOT FOUND — the output block is not marked");
      assert.match(output, /stopped: the gate is red/u, "a red gate is a named outcome");
      assert.match(output, /stopped: the build stopped progressing/u, "…and so is a build that stopped converging");
    },
  },
  // ── milestone 71 / story 02 ────────────────────────────────────────────────
  // One review pass: the lanes spawned together (ADR-006), the execution mode read off the wave
  // (ADR-006, landed as code by ADR-009 §B), round two confined to the delta (ADR-007, ADR-009 §F),
  // and an amendment ratified in the beat that raised it (ADR-007). This story declares NO fitness
  // function, by decision — every claim below is a behaviour over a seam, and a grep for the word
  // "together" in a prompt would be a control that proves nothing.
  {
    name: "71/02 the review lanes are spawned together, staggered, bounded — and no lane waits on another's output",
    async run() {
      const prompt = await readFile(path.join(bundle, "commands", "continue.md"), "utf8");
      const lanes = region(prompt, "<review_lanes>", "</review_lanes>");
      assert.ok(lanes != null, "continue.md: NOT FOUND — the review lanes are not marked");

      // Spawned together and waited on together — in the SAME terms the build fan-out already uses,
      // which is the whole complaint: `:135` said it for builds and the review step said nothing.
      assert.match(lanes, /Spawn the review lanes together and wait for all of them/u, "the lanes are spawned together and waited on together");
      const sharedClause = "rather than starting the next after the previous returns";
      assert.match(lanes, new RegExp(sharedClause, "u"), "…in the build fan-out's own words");
      // Counted over the prompt with its hand-wrapping collapsed: the clause spans a line break in
      // the build fan-out today, and an assertion keyed on the wrapping would fail on a reflow.
      const flat = prompt.replace(/\s+/gu, " ");
      assert.match(flat, /Spawn the builds together .* and wait for all of them/u, "the build fan-out still says it");
      assert.equal(flat.split(sharedClause).length - 1, 2, "both fan-outs use the one clause — neither drifted");

      // No lane's spawn waits on a prior lane's return.
      assert.match(lanes, /spawn waits on a prior lane's return/u, "a lane that waits on a prior lane buys nothing");

      // The concurrent set, by the story's shape: three lenses always, the designer as a fourth when
      // the story has UI — and in solo mode nothing is spawned at all, UI or not.
      for (const lens of [/`aof-architect` \(structural\)/u, /`aof-qa` \(behavioural\)/u, /automated craft pass/u]) {
        assert.match(lanes, lens, `the concurrent set names ${lens}`);
      }
      assert.match(lanes, /`aof-designer` \(design conformance\) joins them as a fourth when the story has UI/u, "the designer joins only for a UI story");
      assert.match(lanes, /and not otherwise/u, "…and not otherwise");
      assert.match(lanes, /In solo mode nothing is spawned at all/u, "solo spawns no lane");
      assert.match(lanes, /in this session, in turn, whether or not the story has UI/u, "…and performs every lens in turn instead");

      // The stagger — stated, reasoned, and deliberately NOT a knob. FF-7101 sweeps `src/bundle/**`
      // for stated bounds, and this clause is the standing proof its scope is a key's neighbourhood
      // rather than a numeral hunt.
      assert.match(lanes, /Stagger the spawns by a handful of seconds/u, "a short interval between spawns");
      assert.match(lanes, /warms the shared prompt prefix the rest read/u, "…with the reason stated");
      assert.match(lanes, /neither a config key nor a `work\.loop\.\*` bound/u, "…and declared as neither");

      // Independent lenses: nothing reads another lane's output, findings merge only at the end, and
      // an early finding cancels nobody.
      assert.match(lanes, /No lane reads another lane's verdict or findings/u, "no lane reads another lane's output");
      assert.match(lanes, /only once all of them have returned/u, "findings merge only after every lane returns");
      assert.match(lanes, /never cancels the lanes still running/u, "…and an early finding cancels nobody");

      // Concurrency stays inside the dispatch bound the CLI reports.
      assert.match(lanes, /`aof work dispatch --list --json`/u, "the bound comes from the CLI");
      assert.match(lanes, /Never spawn more lanes at once than the `bound`/u, "…and is never exceeded");
      assert.match(lanes, /spawn the remainder as earlier lanes return/u, "…the remainder waits for a slot");
    },
  },
  {
    name: "71/02 execution mode is derived from the wave, before anything is dispatched — and never widens a solo setting",
    async run() {
      const prompt = await readFile(path.join(bundle, "commands", "continue.md"), "utf8");
      const mode = region(prompt, "<execution_mode>", "</execution_mode>");
      assert.ok(mode != null, "continue.md: NOT FOUND — the execution-mode derivation is not marked");

      // The derivation is taken BEFORE the dispatch step, which is what makes "no worktree, no agent"
      // reachable at all. The step header carries it, so it is read before the region is entered.
      assert.match(prompt, /Derive the execution mode from that wave — before anything is dispatched/u, "the derivation precedes the dispatch");

      // A wave of one is inline, and inline is defined by what it does NOT do.
      assert.match(mode, /`wave` of exactly one member runs INLINE/u, "a wave of one runs inline");
      assert.match(mode, /Dispatch no worktree, spawn no build agent and write no dispatch record/u, "…dispatching and spawning nothing");
      assert.match(mode, /still built and reviewed in full/u, "…and the member is still built and reviewed");
      assert.match(mode, /two or more members is dispatched/u, "a real wave is still dispatched");

      // The asymmetry: it removes a fan-out, never adds one.
      assert.match(mode, /never ADDS one against a solo setting/u, "the derivation never widens a solo setting");

      // An empty wave is the dangerous case — it reads as a finished milestone and is not one.
      assert.match(mode, /EMPTY `wave` dispatches nothing and spawns nothing/u, "an empty wave runs nothing");
      assert.match(mode, /is not a finished milestone/u, "…and is not finished");
      assert.match(mode, /`heldSet`/u, "…the held members are named as held");
      assert.match(mode, /do not print the accept hand-off/u, "…and the accept hand-off is not printed");

      // Read, never recomputed — and breadth and the lens set are both untouched by the derivation.
      assert.match(mode, /Read the wave; never recompute it/u, "the wave is read, not recomputed");
      assert.match(mode, /not from `readySet`/u, "…and never substituted for by readySet");
      assert.match(mode, /re-ask `aof work next <NN> --through-review --json` once the member closes/u, "the walk still re-asks");
      assert.match(mode, /drive every story of the milestone/u, "…and breadth is unchanged");
      assert.match(mode, /no review lens is dropped on the strength of the wave's size/u, "no lens is dropped");

      // ADR-009: the pinned literals sit in the paragraph this derivation was inserted beside. This is
      // the milestone's highest-risk adjacency, so it is asserted here rather than only in the older
      // block that owns them.
      for (const pinned of ["Do not recompute or widen `wave`", "never substitute `readySet` for `wave`"]) {
        assert.ok(prompt.includes(pinned), `the pinned literal survives the insertion: ${pinned}`);
      }
    },
  },
  {
    name: "71/02 decideExecutionMode resolves (configured mode x --solo x wave size) to one mode, and refuses a wave it cannot count",
    run() {
      // The feature's own Examples table, row for row.
      const rows = [
        { config: "orchestrated", solo: false, members: 1, mode: "inline", reason: "wave-of-one" },
        { config: "orchestrated", solo: false, members: 2, mode: "orchestrated", reason: "wave-parallel" },
        { config: "orchestrated", solo: false, members: 5, mode: "orchestrated", reason: "wave-parallel" },
        { config: "orchestrated", solo: true, members: 1, mode: "inline", reason: "solo-flag" },
        { config: "orchestrated", solo: true, members: 5, mode: "inline", reason: "solo-flag" },
        { config: "solo", solo: false, members: 1, mode: "inline", reason: "solo-configured" },
        { config: "solo", solo: false, members: 5, mode: "inline", reason: "solo-configured" },
        { config: "solo", solo: true, members: 5, mode: "inline", reason: "solo-flag" },
        { config: undefined, solo: false, members: 1, mode: "inline", reason: "wave-of-one" },
      ];
      for (const row of rows) {
        const wave = Array.from({ length: row.members }, (_, index) => ({ ref: `00/0${index}` }));
        const decision = decideExecutionMode({ configuredMode: row.config, solo: row.solo, wave });
        assert.equal(decision.mode, row.mode, `${row.config ?? "unset"} / solo=${row.solo} / ${row.members} → ${row.mode}`);
        assert.equal(decision.reason, row.reason, `…for the reason ${row.reason}`);
        assert.equal(decision.members, row.members);
        assert.equal(decision.dispatches, row.mode === "orchestrated", "inline dispatches nothing");
        assert.equal(decision.spawns, row.mode === "orchestrated", "…and spawns nothing");
        assert.equal(decision.emptyWave, false);
        assert.ok(EXECUTION_MODES.includes(decision.mode), "the mode is one of the closed set");
        // The count is read off the wave, and a wave passed as a bare count answers identically.
        assert.equal(decideExecutionMode({ configuredMode: row.config, solo: row.solo, wave: row.members }).mode, row.mode);
      }

      // `any / any / 0` — nothing is dispatched or spawned, and the empty wave is REPORTED, which is
      // the flag the prompt's "not a finished milestone" clause turns on.
      for (const config of ["orchestrated", "solo", undefined]) {
        for (const solo of [true, false]) {
          const empty = decideExecutionMode({ configuredMode: config, solo, wave: [] });
          assert.equal(empty.dispatches, false, "an empty wave dispatches nothing");
          assert.equal(empty.spawns, false, "…and spawns nothing");
          assert.equal(empty.emptyWave, true, "…and is reported as empty");
          assert.equal(empty.reason, EXECUTION_MODE_REASONS.waveEmpty, "…for that reason, whatever the config");
          assert.equal(empty.members, 0);
        }
      }

      // A wave it cannot count is NOT an empty wave: answering 0 there would report a finished
      // milestone off a malformed input. It refuses instead, and the caller stops and looks.
      for (const wave of [undefined, null, "two", -1, 1.5, {}]) {
        assert.equal(decideExecutionMode({ configuredMode: "orchestrated", wave }), null, `a wave of ${JSON.stringify(wave)} is not countable`);
      }
      // Solo is an explicit boolean, never a truthy string: an unparsed flag must not silently
      // disable a fan-out the operator never asked to disable.
      assert.equal(decideExecutionMode({ configuredMode: "orchestrated", solo: "no", wave: 5 }).mode, "orchestrated");
    },
  },
  {
    name: "71/02 a granted second round re-reviews the delta — only the raising lens, only over the fix",
    async run() {
      const prompt = await readFile(path.join(bundle, "commands", "continue.md"), "utf8");
      const delta = region(prompt, "<delta_review>", "</delta_review>");
      assert.ok(delta != null, "continue.md: NOT FOUND — the delta review is not marked");

      // Which lenses re-spawn, and what happens to the ones that do not.
      assert.match(delta, /Re-spawn only the lens or lenses that raised a surviving Blocker/u, "only a raising lens re-spawns");
      assert.match(delta, /left with its round-one verdict standing/u, "every other lens keeps its verdict");
      assert.match(delta, /reported clean in round one is not spawned again/u, "a clean lens is not re-spawned");
      assert.match(delta, /nothing is re-spawned at all/u, "a Blocker that did not survive re-spawns nobody");

      // What a re-spawned lens is handed — and, as explicitly, what it is not.
      for (const handed of [/the fix diff/u, /the Blockers that lens itself raised/u, /the contract clauses those Blockers cite/u]) {
        assert.match(delta, handed, `the brief carries ${handed}`);
      }
      assert.match(delta, /Not another lens's Blockers/u, "…and not another lens's Blockers");
      assert.match(delta, /not another lens's round-one verdict/u, "…nor another lens's clean verdict");
      assert.match(delta, /not the round-one findings below Blocker/u, "…nor the sub-Blocker findings");
      assert.match(delta, /not the story's whole `reads:` set/u, "…nor the whole reads: set");

      // The design lane re-renders the named surfaces and nothing else.
      assert.match(delta, /re-renders only the surfaces a surviving design-gap Blocker NAMED/u, "only the named surfaces re-render");
      assert.match(delta, /names no surface names nothing to re-render/u, "…and an unnamed surface re-renders nothing");

      // ADR-009 §F — one deduplicated claim, exactly one lens, chosen by the claim's CLASS. The class
      // tokens are the frozen ones, so a renamed class fails here rather than drifting silently.
      assert.match(delta, /exactly ONE lens/u, "one deduplicated Blocker re-spawns one lens");
      assert.match(delta, /`production-defect` is the architect's/u, "a production defect is the architect's");
      assert.match(delta, /`locked-contract-violation` is QA's/u, "a locked-contract violation is QA's");
      assert.match(delta, /a design gap is the designer's/u, "a design gap is the designer's");
      assert.match(delta, /ambiguous it is the lens whose report survived reproduction/u, "…and ambiguity falls to the surviving report");
      for (const blockerClass of ["production-defect", "locked-contract-violation"]) {
        assert.ok(REVIEW_BLOCKER_CLASSES.includes(blockerClass), `${blockerClass} is a real blocker class, not prose`);
        assert.ok(delta.includes(`\`${blockerClass}\``), `…and the prompt routes it by that name`);
      }

      // The delta is NAMED by the step that already exists, not guessed at.
      assert.match(delta, /Reproduce every outstanding Blocker against actual code first/u, "reproduce first");
      assert.match(delta, /deduplicate the overlapping lens reports/u, "…then deduplicate");
      assert.match(delta, /discarded claim earns its lens no re-spawn/u, "…and a discarded claim earns no round");
      const rounds = region(prompt, "<review_rounds>", "</review_rounds>");
      assert.match(rounds, /reproduce every outstanding Blocker against actual code/iu, "the round rules still own the reproduce step the delta reads from");

      // The delta bound narrows what a round COVERS; it does not touch the cap, which is 83's.
      assert.ok(prompt.includes("Three rounds is the hard cap"), "the round cap is untouched");
      assert.equal(/hard cap|fourth round/iu.test(delta), false, "the delta review restates no round cap");
    },
  },
  {
    name: "71/02 refine's cascade closes the ADR set before the contract fan-out, and routes a later delta instead of re-authoring",
    async run() {
      const prompt = await readFile(path.join(bundle, "commands", "refine.md"), "utf8");
      const beat = region(prompt, "<amendment_ratification>", "</amendment_ratification>");
      assert.ok(beat != null, "refine.md: NOT FOUND — the amendment ratification is not marked");

      // The ordering claim, and its consequence.
      assert.match(beat, /Decide stage CLOSES before the Contract fan-out begins/u, "Decide closes before the fan-out");
      assert.match(beat, /delta the architecture pass raised folded in/u, "…and a delta raised there is folded in there");
      assert.match(beat, /No step re-applies an architecture delta to a contract after the fan-out/u, "nothing re-applies a delta afterwards");
      assert.match(beat, /exactly ONE authoring beat named/u, "each contract is authored once");

      // Where a delta lands, by WHEN it was raised — the feature's five rows.
      assert.match(beat, /During the architecture pass.{0,80}in the ADR set, before the fan-out/u, "raised during the architecture pass → the ADR set");
      assert.match(beat, /While a contract is being authored.{0,80}in that contract, in the same authoring beat/u, "raised while authoring → that contract");
      assert.match(beat, /While the fan-out is still in flight.{0,120}routed by the triage rule/u, "raised mid-fan-out → a routed finding");
      assert.match(beat, /contracts already authored are not re-opened/u, "…and the authored contracts stand");
      assert.match(beat, /After the contracts are authored.{0,120}routed by the triage rule/u, "raised after authoring → a routed finding");
      assert.match(beat, /After the item is delivered.{0,120}ACCEPTING item's own contract, as a new superseding ADR/u, "raised after delivery → the accepting item's contract");
      assert.match(beat, /not edited, not annotated and not tagged/u, "…and the delivered .feature is never touched");

      // The one delta that still earns its round is already a Blocker under the frozen class set —
      // so it is bounded by the round cap, and licenses no re-authoring wave.
      assert.match(beat, /would leave a delivered criterion wrong/u, "a wrong delivered criterion is the exception");
      assert.match(beat, /`locked-contract-violation`/u, "…classified as a locked-contract violation");
      assert.ok(REVIEW_BLOCKER_CLASSES.includes("locked-contract-violation"), "…which is a real blocker class");
      assert.match(beat, /already a \*\*Blocker\*\*/u, "…and therefore already a Blocker");
      assert.match(beat, /round bound the review lane already carries/u, "…handled inside the existing round bound");
      assert.match(beat, /never a re-authoring wave over the other contracts/u, "…and it licenses no re-authoring wave");

      // A re-authoring wave is refused in terms, which is the measured m52 failure.
      assert.match(beat, /A re-authoring wave is not a legal response to a delta/u, "a re-authoring wave is refused");
      assert.match(beat, /whose only work is re-applying a decision to an already-authored contract/u, "…and no stage spawns an agent to do it");

      // The cascade still fans the contracts out — the rule bounds the fan-out, it does not remove it.
      assert.match(prompt, /fanning out the Three Amigos in parallel/u, "the contract fan-out survives");
    },
  },
  // ── milestone 124 / story 00 ──────────────────────────────────────────────
  // Task 00 (the one home) and task 01 (the wave adopts it), driven. The two structural legs —
  // the leaf's zero project imports and zero filesystem reach, and the tightening asserted over a
  // GENERATED corpus — are FF-12403's, in test/arch/planning/acd-contract-set-has-one-home.test.mjs.
  {
    name: "124/00 task 00 directory intent survives the resolver that strips it",
    run: () => {
      const withSlash = resolveStoryContractPath("src/commands/", NOWHERE_AT);
      const without = resolveStoryContractPath("src/commands", NOWHERE_AT);

      // BOTH RESOLVE TO THE SAME PROJECT PATH — `path.relative` never returns a trailing
      // separator, so the authored slash is gone before any consumer sees the string.
      assert.equal(withSlash.projectPath, "src/commands");
      assert.equal(without.projectPath, "src/commands");

      // …AND THE RESOLVER'S OWN RETURN KEYS AND VALUES ARE UNCHANGED FOR BOTH. Three modules
      // already read this shape (`validate.mjs`, `test-declared.mjs`, `ready-wave.mjs`), so a
      // fourth key here would be a silent edit to three modules' answers.
      assert.deepEqual(Object.keys(withSlash).sort(), ["absolutePath", "anchor", "projectPath"]);
      assert.deepEqual(withSlash, without, "the resolver cannot tell the two entries apart, and does not try");

      // ONLY THE FIRST CARRIES A DIRECTORY'S INTENT, and it is read off the RAW entry — which is
      // the only place it still exists.
      assert.equal(declaresDirectory("src/commands/"), true);
      assert.equal(declaresDirectory("src/commands"), false);
      assert.equal(declaresDirectory(withSlash.projectPath), false, "the resolved path can never answer it");
      // An anchored entry is judged on its FILE part, as the resolver judges it.
      assert.equal(declaresDirectory("src/commands/#adr-001"), true);
      assert.equal(declaresDirectory("src/commands#adr-001"), false);
    },
  },
  {
    name: "124/00 task 00 an entry covers another only when equal, or authored as a directory above it",
    run: () => {
      // Everything is resolved FIRST, so the only work done under the stubbed `process.cwd` below
      // is the predicate's own — the thing the row claims decides without consulting it.
      const rows = COVERAGE_ROWS.map((row) => ({
        ...row,
        set: declaredSet(`---\nfiles: [${row.declared}]\n---\n`, "files"),
        probedPath: resolveStoryContractPath(row.probed, NOWHERE_AT).projectPath,
      }));
      for (const row of rows) {
        assert.notEqual(row.set, null, `${row.declared}: the declared set resolves, so the row is not vacuous`);
      }

      const realCwd = process.cwd;
      process.cwd = () => {
        throw new Error("the coverage predicate consulted process.cwd()");
      };
      try {
        for (const row of rows) {
          assert.equal(
            contractSetCovers(row.set, row.probedPath),
            row.covers,
            `{${row.declared}} covers ${row.probed}? expected ${row.covers} — ${row.why}`,
          );
        }
      } finally {
        process.cwd = realCwd;
      }

      // …and it read no file and stat'd no path to decide, which is what makes every row above
      // meaningful: `NOWHERE_ROOT` is on no disk, so `src/commands/` is not a directory anywhere
      // and `src/commands-old.mjs` is not a file. The answers are the authored rule's, not the
      // tree's. (FF-12403 asserts the same claim structurally, over the module's source.)
      assert.equal(contractSetCovers(declaredSet("---\nfiles: [src/commands/]\n---\n", "files"), "src/commands/test.mjs"), true);
    },
  },
  {
    name: "124/00 task 00 the four answers a declared key can give stay four different answers",
    run: () => {
      for (const row of DECLARED_KEY_ROWS) {
        const resolved = resolveDeclaredSet(row.text, "files", NOWHERE_AT);
        assert.deepEqual(
          { present: resolved.present, malformed: resolved.malformed, entries: shapeOf(resolved.entries) },
          { present: row.present, malformed: row.malformed, entries: row.entries },
          `${row.declaration} → ${row.answer}`,
        );
      }

      // THE TWO ANSWERS THAT MUST NEVER COLLAPSE INTO EACH OTHER. "The story has declared
      // nothing" and "the story has declared that it touches nothing" are different facts, and a
      // consumer that conflated them would either serialise the whole stream or parallelise a
      // collision onto one disk.
      const unknown = DECLARED_KEY_ROWS.filter((row) => row.entries == null);
      const empty = DECLARED_KEY_ROWS.filter((row) => Array.isArray(row.entries) && row.entries.length === 0);
      assert.equal(unknown.length, 5, "five of the seven rows answer unknown");
      assert.equal(empty.length, 1, "and exactly one is a real empty set");
      assert.notEqual(
        resolveDeclaredSet(empty[0].text, "files", NOWHERE_AT).entries,
        resolveDeclaredSet(unknown[0].text, "files", NOWHERE_AT).entries,
      );

      // THE RULE IS KEYED ON THE KEY, NOT ON THE CALLER: the scaffold rule reads the OTHER key,
      // so `reads: []` beside a non-empty `files:` is a real empty read set by the same rule.
      assert.deepEqual(shapeOf(declaredSet("---\nreads: []\nfiles: [src/a.mjs]\n---\n", "reads")), []);
      assert.equal(declaredSet("---\nreads: []\nfiles: []\n---\n", "reads"), null);
      // …and an anchored entry is poison under `files:` and ordinary under `reads:`, because
      // nothing writes half a file.
      assert.equal(declaredSet("---\nfiles: [src/a.mjs#adr-001]\n---\n", "files"), null);
      assert.deepEqual(shapeOf(declaredSet("---\nreads: [src/a.mjs#adr-001]\n---\n", "reads")), [{ path: "src/a.mjs", directory: false }]);
    },
  },
  {
    name: "124/00 task 01 the authored directory and the file beneath it stop sharing a wave",
    run: () => withWaveStories([
      "---\nfiles: [src/commands/]\n---\n",
      "---\nfiles: [src/commands/test.mjs]\n---\n",
    ], async ({ repo, members }) => {
      // This partition IS `aof work next --json`'s `wave`/`heldSet`: `src/commands/next.mjs`
      // projects both keys straight off this call (`withReadyWave`), which the last clause of
      // the "one rule, not two" case below pins to this function by name.
      const partition = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
      assert.deepEqual(refsOf(partition.wave), ["00/00"], "the earlier member is in wave");
      assert.deepEqual(refsOf(partition.heldSet), ["00/01"], "…and the later member is in heldSet");

      // THE SAME TWO MEMBERS ARE IN ONE WAVE UNDER THE EXACT-STRING RULE THIS REPLACES — the live
      // defect, measured rather than described: `path.relative` had stripped the slash, so
      // `src/commands` and `src/commands/test.mjs` were read as disjoint and both dispatched.
      const exact = await exactStringWave(members, { projectRoot: repo });
      assert.deepEqual(refsOf(exact.wave), ["00/00", "00/01"], "the rule this replaces waved both onto one path");
      assert.deepEqual(exact.heldSet, []);

      // THE ORIGINAL READY SET IS RETURNED UNREORDERED AND UNREDUCED: every member appears
      // exactly once, and each list keeps the ready order it arrived in.
      assert.deepEqual([...refsOf(partition.wave), ...refsOf(partition.heldSet)].sort(), refsOf(members).slice().sort());
      for (const list of [partition.wave, partition.heldSet]) {
        const positions = list.map((member) => members.indexOf(member));
        assert.deepEqual(positions, positions.slice().sort((a, b) => a - b), "ready order survives the partition");
        assert.equal(positions.includes(-1), false, "and every member is the ready set's own object, not a copy");
      }
    }),
  },
  {
    name: "124/00 task 01 the wave's verdict for a pair of declared write sets",
    run: async () => {
      for (const row of WAVE_ROWS) {
        await withWaveStories([
          `---\nfiles: [${row.earlier}]\n---\n`,
          `---\nfiles: [${row.later}]\n---\n`,
        ], async ({ repo, members }) => {
          const { wave, heldSet } = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
          assert.deepEqual(refsOf(wave).includes("00/00"), true, `${row.earlier}: the earlier member always waves`);
          assert.deepEqual(
            refsOf(row.verdict === "held" ? heldSet : wave),
            row.verdict === "held" ? ["00/01"] : ["00/00", "00/01"],
            `earlier ${row.earlier} / later ${row.later} → the later member is ${row.verdict} (${row.why})`,
          );
        });
      }
    },
  },
  {
    name: "124/00 task 01 no pair that collides today enters a wave tomorrow",
    run: async () => {
      // EVERY PAIR OF DECLARED WRITE SETS IN THIS STREAM, both ways. A generated corpus is
      // FF-12403's instrument; this one is the stream, which is where a rule that widened would
      // actually cost something.
      const known = await streamWriteSets();
      assert.ok(known.length >= 40, `the stream yielded ${known.length} resolvable write sets — a walk over nothing proves nothing`);

      let byEquality = 0;
      let byCoverage = 0;
      const widened = [];
      const newlyColliding = [];
      for (let i = 0; i < known.length; i += 1) {
        for (let j = i + 1; j < known.length; j += 1) {
          const equal = collidesByEquality(known[i].entries, known[j].entries);
          const covered = collidesByCoverage(known[i].entries, known[j].entries);
          if (equal) byEquality += 1;
          if (covered) byCoverage += 1;
          // EVERY PAIR THAT COLLIDES UNDER EQUALITY STILL COLLIDES UNDER COVERAGE. Equality is
          // coverage's first leg, which is what makes the adoption a tightening by construction —
          // but a parallelism gate that quietly WIDENED is invisible until two builders write one
          // file, so it is measured rather than argued.
          if (equal && !covered) widened.push(`${known[i].ref} ~ ${known[j].ref}`);
          if (covered && !equal) newlyColliding.push([known[i], known[j]]);
        }
      }
      assert.deepEqual(widened, [], "no pair that collides under exact-string equality stops colliding under coverage");
      assert.ok(byCoverage >= byEquality, "the colliding-pair set under coverage is a superset of the set under equality");
      assert.ok(
        newlyColliding.length > 0,
        "non-vacuity: the tightening bites on this stream — at least one pair collides under coverage that did not under equality",
      );

      // …AND NO MEMBER HELD UNDER THE OLD RULE IS WAVED UNDER THE NEW ONE, over the stream's own
      // ready order, through the SHIPPED partition on one side and the replaced rule on the other.
      const members = known.map(({ ref, type, path: dir }) => ({ ref, type, path: dir }));
      const now = await partitionReadySetByDeclaredFiles(members, { projectRoot: root });
      const before = await exactStringWave(members, { projectRoot: root });
      const wavedNow = new Set(refsOf(now.wave));
      assert.deepEqual(
        refsOf(before.heldSet).filter((ref) => wavedNow.has(ref)),
        [],
        "every member the old rule held is still held",
      );
      assert.ok(now.wave.length <= before.wave.length, "the wave can lose a member; it can never gain one");

      // The differential, DRIVEN on a real newly-colliding pair rather than asserted about the
      // whole stream at once — where the greedy walk saturates long before the pair is reached.
      const [earlier, later] = newlyColliding[0];
      const pair = [earlier, later].map(({ ref, type, path: dir }) => ({ ref, type, path: dir }));
      const pairNow = await partitionReadySetByDeclaredFiles(pair, { projectRoot: root });
      const pairBefore = await exactStringWave(pair, { projectRoot: root });
      assert.deepEqual(refsOf(pairBefore.wave), refsOf(pair), `${earlier.ref} and ${later.ref} shared a wave under the rule this replaces`);
      assert.deepEqual(refsOf(pairNow.heldSet), [later.ref], `…and ${later.ref} is held under coverage`);
    },
  },
  {
    name: "124/00 task 01 an unresolvable write set is still handled conservatively",
    run: async () => {
      // A MEMBER WHOSE SET COULD NOT BE RESOLVED IS HELD when it is not first…
      await withWaveStories([
        "---\nfiles: [src/independent.mjs]\n---\n",
        "---\nfiles: [/etc/passwd]\n---\n",
        "---\nfiles: [src/other.mjs]\n---\n",
      ], async ({ repo, members }) => {
        const { wave, heldSet } = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
        assert.deepEqual(refsOf(heldSet), ["00/01"], "an unresolvable set is held rather than waved");
        assert.deepEqual(refsOf(wave), ["00/00", "00/02"], "and it claims nothing, so the members after it are unaffected");
      });

      // …AND IS WAVED ALONE when it IS first, because nothing is known about what it will touch.
      await withWaveStories([
        "---\nfiles: [/etc/passwd]\n---\n",
        "---\nfiles: [src/independent.mjs]\n---\n",
      ], async ({ repo, members }) => {
        const { wave, heldSet } = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
        assert.deepEqual(refsOf(wave), ["00/00"], "first with an unknown set runs alone");
        assert.deepEqual(refsOf(heldSet), ["00/01"]);
      });

      // …AND THE UNTOUCHED SCAFFOLD SURVIVED THE COLLAPSE ONTO THE SHARED HOME. The template ships
      // BOTH keys empty, so a story created and never refined would otherwise declare "I write
      // nothing" and parallelise against every sibling.
      assert.equal(declaredSet("---\nreads: []\nfiles: []\n---\n", "files"), null, "both empty is unknown, not a claim");
      await withWaveStories([
        "---\nreads: []\nfiles: []\n---\n",
        "---\nfiles: [src/independent.mjs]\n---\n",
      ], async ({ repo, members }) => {
        const { wave, heldSet } = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
        assert.deepEqual(refsOf(wave), ["00/00"], "an untouched scaffold is treated as unknown");
        assert.deepEqual(refsOf(heldSet), ["00/01"]);
      });
    },
  },
  {
    name: "124/00 task 01 the wave and the census read one rule, not two",
    run: async () => {
      // THE DISCRIMINATING INPUT — a dependent READING a path beneath the dependency's AUTHORED
      // directory. Equality and coverage disagree here, so "one rule" is observable: both
      // surfaces answer the coverage way, or one of them holds a second rule.
      await withWaveStories([
        "---\nfiles: [src/commands/]\n---\n",
        "---\nreads: [src/commands/test.mjs]\nfiles: [src/commands/test.mjs]\n---\n",
      ], async ({ repo, members }) => {
        const { heldSet } = await partitionReadySetByDeclaredFiles(members, { projectRoot: repo });
        assert.deepEqual(refsOf(heldSet), ["00/01"], "the wave says the two collide");
        assert.deepEqual((await exactStringWave(members, { projectRoot: repo })).heldSet, [], "…where the rule this replaces said they did not");
      });

      // …and the depends lane, handed the same two declarations, calls the edge WITNESSED — the
      // answer only the shared predicate gives. An intersection over raw declared strings would
      // report it unwitnessed, which is the 14-versus-10 difference ADR-003 is about.
      const storyDir = (number) => path.join(NOWHERE_ROOT, "wiki", "work", "00_milestone_m", "stories", `${number}_story_s`);
      const at = (number) => ({ storyDir: storyDir(number), projectRoot: NOWHERE_ROOT });
      const census = classifyDependsEdges({
        items: [
          {
            ref: "00/00", dir: storyDir("00"), type: "story", number: "00", parent: "00", meta: {},
            contract: { reads: null, files: declaredSet("---\nfiles: [src/commands/]\n---\n", "files", at("00")) },
          },
          {
            ref: "00/01", dir: storyDir("01"), type: "story", number: "01", parent: "00", meta: { depends: ["00"] },
            contract: { reads: declaredSet("---\nreads: [src/commands/test.mjs]\nfiles: [src/x.mjs]\n---\n", "reads", at("01")), files: null },
          },
        ],
      });
      assert.equal(census.considered, 1, "the edge resolves");
      assert.equal(census.witnessed.length, 1, "…and the census witnesses it through the same predicate");
      assert.equal(census.unwitnessed.length, 0);

      // AND `src/ready-wave.mjs` HOLDS NO SECOND COVERAGE RULE AND NO `Set` INTERSECTION OVER RAW
      // DECLARED STRINGS. A claim about what a module does not contain is read off its source,
      // comment-stripped — the prose above `collisionKey` names both of the things it refuses.
      const wave = stripComments(await readFile(path.join(root, "src", "ready-wave.mjs"), "utf8"));
      assert.match(wave, /import \{[^}]*\bcontractSetCovers\b[^}]*\} from "\.\/story-contract\.mjs"/u, "the predicate comes from its one home");
      assert.ok((wave.match(/\bcontractSetCovers\(/gu) ?? []).length >= 2, "and the collision test is that predicate, asked both ways");
      assert.doesNotMatch(wave, /new Set\(/u, "no Set intersection over raw declared strings");
      assert.doesNotMatch(wave, /\.startsWith\(|\.includes\(/u, "no re-implemented containment rule");
      assert.doesNotMatch(wave, /function\s+\w*[Cc]overs|\w*[Cc]overs\s*=\s*(?:\(|function)/u, "and no second coverage helper");
      // The census's side of the same claim: it imports the predicate rather than re-deriving one.
      const lane = stripComments(await readFile(path.join(root, "src", "work", "doctor-depends.mjs"), "utf8"));
      assert.match(lane, /import \{[^}]*\bcontractSetCovers\b[^}]*\} from "\.\.\/story-contract\.mjs"/u, "one home, two consumers");
      assert.doesNotMatch(lane, /\.startsWith\(/u, "and the lane holds no containment rule of its own");
      // `work:next` projects the wave off THIS partition, so the rows above are that command's answer.
      const next = stripComments(await readFile(path.join(root, "src", "commands", "next.mjs"), "utf8"));
      assert.match(next, /partitionReadySetByDeclaredFiles\(/u, "`aof work next --json` partitions the ready set through this function");
      assert.match(next, /wave: wave\.map|wave,/u, "…and returns its wave");
    },
  },
];
