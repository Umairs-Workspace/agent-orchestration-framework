// Traceability wiring for story 80 /
// tasks/02_the-index-reads-an-outcome-from-any-item.feature (@executable, every
// scenario and every Examples row).
//
// THE CONSUMER WAS NOT AS READY AS THE STORY SAID. `buildRecords` DID join OUTCOME.md
// onto `item.dir` and parse it whatever the type, but the SET it walked was
// `items.filter(item => item.type === "milestone" && item.parent == null)` — so a
// story's or a chore's outcome was never opened. Widening that scan is the load-bearing
// half of story 80, and it drags two consequences with it, both asserted below:
//   (a) a record's `item` must carry the REF, not the number — recall renders
//       `m${record.item}`, so a nested story `39/02` would have cited `m02`, a
//       different and real milestone;
//   (b) the `--item` / `--only` scopes must therefore match the SUBTREE, or the fix
//       that makes citations true breaks the aggregation the index exists for.
//
// Every assertion runs the REAL `buildRecords` / `applyScope` over temp fixture
// streams — no re-implemented parser, no hand-built record.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRecords, INDEX_VERSION } from "../../src/memory/local-indexing.mjs";
import { applyScope, MEMORY_RECORD_FIELDS, recall } from "../../src/memory/local-retrieval.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DELIVERY = new Set(["capability", "gap"]);

// An authored OUTCOME.md — one capability, one gap. `title` varies so a record can be
// traced back to the item that produced it.
function outcomeDoc(title) {
  return [
    `# NN · ${title} — Outcome`,
    "",
    "## Delivered",
    "",
    `### ${title} capability`,
    `The system now provides the ${title} capability.`,
    "",
    "## Gaps",
    "",
    `### ${title} unfilled surface`,
    "- **Status:** open",
    "- **Discharge condition:** a producer exists.",
    `The ${title} gap statement.`,
    "",
  ].join("\n");
}

async function makeStream() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-80-index-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
  return { projectRoot, workDir };
}

// Plant a top-level item folder; `outcome` (a title) authors its OUTCOME.md.
async function item(workDir, { number, type, slug, outcome = null, files = {} }) {
  const dir = path.join(workDir, `${number}_${type}_${slug}`);
  await mkdir(dir, { recursive: true });
  if (outcome) await writeFile(path.join(dir, "OUTCOME.md"), outcomeDoc(outcome), "utf8");
  for (const [name, body] of Object.entries(files)) await writeFile(path.join(dir, name), body, "utf8");
  return dir;
}

// Plant a story under a milestone (the nested `stories/SS_story_slug` shape listItems reads).
async function story(workDir, { milestone, number, slug, outcome = null }) {
  const dir = path.join(workDir, milestone, "stories", `${number}_story_${slug}`);
  await mkdir(dir, { recursive: true });
  if (outcome) await writeFile(path.join(dir, "OUTCOME.md"), outcomeDoc(outcome), "utf8");
  return dir;
}

const deliveryOf = (records) => records.filter((r) => DELIVERY.has(r.recordType));
const capabilitiesOf = (records) => records.filter((r) => r.recordType === "capability");

export const outcomeIndexAnyItemTests = [
  // ==================================================================
  // Scenario Outline: an OUTCOME.md is read from any item that carries one.
  // The read is PATH-DRIVEN and consults no type — which is why the spike row
  // expects records and the uat row expects none: the difference is what is on
  // disk, never what type the folder is.
  // ==================================================================
  {
    name: "80/02 index: an OUTCOME.md is read from a milestone, a nested story, a parentless story, a chore and a spike — and an item carrying none yields nothing",
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        await item(workDir, { number: "39", type: "milestone", slug: "delivery", outcome: "milestone" });
        await story(workDir, { milestone: "39_milestone_delivery", number: "02", slug: "nested", outcome: "nested-story" });
        await item(workDir, { number: "80", type: "story", slug: "parentless", outcome: "parentless-story" });
        await item(workDir, { number: "81", type: "chore", slug: "pin-eol", outcome: "chore" });
        await item(workDir, { number: "82", type: "spike", slug: "probe", outcome: "spike" });
        await item(workDir, { number: "83", type: "uat", slug: "gate" }); // carries NO OUTCOME.md
        await item(workDir, { number: "84", type: "milestone", slug: "bare" }); // carries NO OUTCOME.md

        const records = await buildRecords(null, { workDir, projectRoot });
        const byItem = (ref) => capabilitiesOf(records).filter((r) => r.item === ref);

        for (const [label, ref] of [
          ["a top-level milestone with an authored OUTCOME.md", "39"],
          ["a story under that milestone with one", "39/02"],
          ["a parentless story with one", "80"],
          ["a chore with one", "81"],
          ["a spike carrying an OUTCOME.md", "82"],
        ]) {
          assert.ok(byItem(ref).length >= 1, `${label} produces at least 1 capability record (item "${ref}")`);
        }
        assert.equal(byItem("83").length, 0, "a uat carrying no OUTCOME.md produces 0 capability records");
        assert.equal(byItem("84").length, 0, "a milestone carrying no OUTCOME.md produces 0 capability records");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },

  // ==================================================================
  // Scenario: a nested item's records carry its full ref, and today's records
  // are unchanged.
  // ==================================================================
  {
    name: '80/02 index: a nested story\'s records carry `item: "39/02"` and render the citation "m39/02"; a top-level item\'s `item` value is unmoved',
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        await item(workDir, { number: "39", type: "milestone", slug: "delivery", outcome: "milestone" });
        await story(workDir, { milestone: "39_milestone_delivery", number: "02", slug: "nested", outcome: "nested-story" });

        const records = await buildRecords(null, { workDir, projectRoot });
        const fromStory = deliveryOf(records).filter((r) => r.source.includes("stories"));
        const fromMilestone = deliveryOf(records).filter((r) => !r.source.includes("stories"));

        assert.ok(fromStory.length > 0, "sanity: the nested story produced delivery records");
        for (const record of fromStory) {
          assert.equal(record.item, "39/02", `every capability record from the story carries item "39/02"; got "${record.item}"`);
        }
        assert.ok(fromMilestone.length > 0, "sanity: the milestone produced delivery records");
        for (const record of fromMilestone) {
          assert.equal(record.item, "39", `every capability record from the milestone carries item "39"; got "${record.item}"`);
        }

        // The rendered citation — the whole reason the ref, not the number, is stored.
        // `m02` would have pointed at a different, real milestone.
        const result = await recall("capability", { item: "39/02" }, {}, { records });
        assert.match(result.text, /m39\/02/, `a recall surfacing the story's capability renders "m39/02"; got:\n${result.text}`);
        assert.ok(!/\bm02\b/.test(result.text), `the citation is never the bare nested number "m02"; got:\n${result.text}`);
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },
  {
    name: "80/02 index: no record produced from a TOP-LEVEL item changes its `item` value — every record over the real repo corpus still carries its own driver number",
    run: async () => {
      // The real corpus, not a fixture: `item.ref === item.number` for a top-level item,
      // so this story is a no-op for every record that exists today — asserted rather
      // than argued, over the stream that actually holds 300+ ADR and lesson records.
      const workDir = path.join(repoRoot, "wiki", "work");
      const records = await buildRecords(null, { workDir, projectRoot: repoRoot });
      const workStream = records.filter((r) => /^\d+(\/\d+)?$/.test(String(r.item)));
      assert.ok(workStream.length > 100, `sanity: the real corpus yields a substantial record set; got ${workStream.length}`);
      for (const record of workStream) {
        if (record.item.includes("/")) continue; // nested — the new shape, asserted above
        assert.match(
          record.item,
          /^\d+$/,
          `a top-level item's record still carries a bare driver number; got "${record.item}" (${record.id})`,
        );
      }
    },
  },

  // ==================================================================
  // The widening is ADDITIVE IN POSITION, not only in content. `rankRecords` sorts
  // stable and its own comment makes input order the documented tie-break ("equal-score
  // records keep their fixture order"), so appending the outcome read as a SECOND loop
  // after the milestone walk would have moved every delivery record behind every
  // ADR/lesson — the same record set, a different recall for every exact tie. One walk,
  // in `items` order, keeps each item's records contiguous; a new item's outcome slots
  // in at its own position and displaces nothing.
  // ==================================================================
  {
    name: "80/02 index: records stay grouped by item in stream order — each item's records are contiguous, so recall's stable-sort tie-break is undisturbed",
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        await item(workDir, {
          number: "39",
          type: "milestone",
          slug: "delivery",
          outcome: "m39",
          files: { "ARCHITECTURE.md": "# 39\n\n## ADR-001: A decision\n\n**Decision.** Decided.\n" },
        });
        await story(workDir, { milestone: "39_milestone_delivery", number: "00", slug: "a", outcome: "m39-s00" });
        await item(workDir, {
          number: "40",
          type: "milestone",
          slug: "other",
          outcome: "m40",
          files: { "ARCHITECTURE.md": "# 40\n\n## ADR-001: Another\n\n**Decision.** Decided.\n" },
        });

        const records = await buildRecords(null, { workDir, projectRoot });
        const order = records.map((r) => r.item);
        const runs = order.filter((ref, i) => i === 0 || order[i - 1] !== ref);
        assert.deepEqual(
          runs,
          [...new Set(runs)],
          `each item's records are contiguous — no item's records are split by another's; got ${JSON.stringify(order)}`,
        );
        assert.deepEqual(runs, ["39", "39/00", "40"], `…and the runs follow stream order; got ${JSON.stringify(runs)}`);

        // Within milestone 39, its own ADR still precedes its own outcome — the read
        // sequence inside an item is unchanged.
        const m39 = records.filter((r) => r.item === "39").map((r) => r.recordType);
        assert.equal(m39[0], "adr", `a milestone's ADR records still come before its delivery records; got ${JSON.stringify(m39)}`);
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },

  // ==================================================================
  // Scenario Outline: an --item recall scope matches the item and its subtree.
  // ==================================================================
  {
    name: "80/02 recall: --item 39 matches 39, 39/02 and 39/03; --item 39/02 that story alone; --item 80 the parentless story; --item 41 nothing",
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        await item(workDir, { number: "39", type: "milestone", slug: "delivery", outcome: "milestone" });
        await story(workDir, { milestone: "39_milestone_delivery", number: "02", slug: "two", outcome: "story-two" });
        await story(workDir, { milestone: "39_milestone_delivery", number: "03", slug: "three", outcome: "story-three" });
        await item(workDir, { number: "80", type: "story", slug: "parentless", outcome: "parentless" });

        const records = deliveryOf(await buildRecords(null, { workDir, projectRoot }));
        const itemsMatched = (scope) => [...new Set(applyScope(records, { item: scope }).map((r) => r.item))].sort();

        assert.deepEqual(itemsMatched("39"), ["39", "39/02", "39/03"], "--item 39 matches the driver and its whole subtree");
        assert.deepEqual(itemsMatched("39/02"), ["39/02"], "--item 39/02 matches that story alone");
        assert.deepEqual(itemsMatched("80"), ["80"], "--item 80 matches the parentless story alone");
        assert.deepEqual(itemsMatched("41"), [], "--item 41 resolves to nothing — an empty block");

        // Regression caught in review: `refInScope` reads an EMPTY scope as "unscoped",
        // which is right for the `--only` rebuild (absent and empty both mean the whole
        // stream) and wrong here, where the filter's PRESENCE is the user's intent. A
        // bare `--item ""` is reachable (SCOPE_FLAGS lands it on scope.item) and used to
        // narrow to nothing; widening it to every record would be a silent unscoping.
        assert.deepEqual(itemsMatched(""), [], '--item "" still narrows to nothing — a present filter never silently widens');
        // …and a slug, which no bare ref can answer, likewise matches nothing.
        assert.deepEqual(itemsMatched("delivery"), [], "--item <slug> matches nothing — a record carries no slug to match against");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },

  // ==================================================================
  // Scenario: an unresolved scope returns an empty block rather than throwing.
  // ==================================================================
  {
    name: "80/02 recall: --item 999 over an ingested stream returns an empty block, no throw and no error envelope",
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        await item(workDir, { number: "39", type: "milestone", slug: "delivery", outcome: "milestone" });
        const records = await buildRecords(null, { workDir, projectRoot });
        assert.ok(records.length > 0, "sanity: the stream ingested something to be scoped away");

        const result = await recall("capability", { item: "999" }, {}, { records });
        assert.deepEqual(result.records, [], "the block is empty");
        assert.deepEqual(result.scope, { item: "999" }, "the applied scope is echoed back, not rewritten");
        assert.equal(typeof result.text, "string", "a text projection is still produced — an empty block, not an error");
        assert.ok(!("error" in result), "no error envelope is emitted");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },

  // ==================================================================
  // Scenario: a milestone-scoped rebuild includes its stories' and its own
  // outcomes, and no other item's.
  // ==================================================================
  {
    name: "80/02 index: `ingest --only 39` carries milestone 39's and every story under it, and none from milestone 40 or its stories",
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        await item(workDir, { number: "39", type: "milestone", slug: "delivery", outcome: "m39" });
        await story(workDir, { milestone: "39_milestone_delivery", number: "00", slug: "a", outcome: "m39-s00" });
        await story(workDir, { milestone: "39_milestone_delivery", number: "01", slug: "b", outcome: "m39-s01" });
        await item(workDir, { number: "40", type: "milestone", slug: "other", outcome: "m40" });
        await story(workDir, { milestone: "40_milestone_other", number: "00", slug: "c", outcome: "m40-s00" });

        const scoped = deliveryOf(await buildRecords("39", { workDir, projectRoot }));
        const refs = [...new Set(scoped.map((r) => r.item))].sort();
        assert.deepEqual(refs, ["39", "39/00", "39/01"], `--only 39 carries 39 and its subtree alone; got ${JSON.stringify(refs)}`);
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },

  // ==================================================================
  // Scenario: the widening is ONE edit at the shared seam — no forked parser,
  // no bumped index version, no field added to the frozen record.
  // ==================================================================
  {
    name: "80/02 seam: no source parser lives in a backend, graphify's record source is the imported buildRecords, and INDEX_VERSION === GRAPHIFY_INDEX_VERSION, unchanged at 1",
    run: async () => {
      const parserDef = /(?:function|const)\s+(parse(?:Outcome|Architecture|Retrospective|Aof)\b)/g;
      for (const rel of ["src/memory/local-backend.mjs", "src/memory/graphify-backend.mjs"]) {
        const src = await readFile(path.join(repoRoot, rel), "utf8");
        const defs = [...src.matchAll(parserDef)].map((m) => m[1]);
        assert.deepEqual(defs, [], `${rel} defines no source parser (found: ${defs.join(", ") || "none"})`);
      }

      const graphify = await readFile(path.join(repoRoot, "src", "memory", "graphify-backend.mjs"), "utf8");
      assert.match(
        graphify,
        /import\s*\{[^}]*\bbuildRecords\b[^}]*\}\s*from\s*["']\.\/local-indexing\.mjs["']/,
        "the graphify backend's record source is the imported buildRecords",
      );

      const { GRAPHIFY_INDEX_VERSION } = await import("../../src/memory/graphify-backend.mjs");
      assert.equal(INDEX_VERSION, GRAPHIFY_INDEX_VERSION, "INDEX_VERSION and GRAPHIFY_INDEX_VERSION are equal");
      assert.equal(INDEX_VERSION, 1, "…and unchanged — this story alters no record shape");
    },
  },
  {
    name: "80/02 seam: a delivery record carries exactly the frozen MemoryRecord fields — none added, none omitted",
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        await item(workDir, { number: "80", type: "story", slug: "parentless", outcome: "parentless" });
        const delivery = deliveryOf(await buildRecords(null, { workDir, projectRoot }));
        assert.ok(delivery.length > 0, "sanity: the parentless story produced delivery records");
        for (const record of delivery) {
          assert.deepEqual(
            Object.keys(record).sort(),
            [...MEMORY_RECORD_FIELDS].sort(),
            `the record carries exactly the frozen field set; got ${JSON.stringify(Object.keys(record))}`,
          );
        }
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },

  // ==================================================================
  // Scenario: a stream with no OUTCOME.md anywhere indexes exactly as before.
  // ==================================================================
  {
    name: "80/02 index: a stream carrying no OUTCOME.md yields no capability and no gap record, and its ADR/retrospective/digest records are identical to the pre-story run",
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        const dir = await item(workDir, {
          number: "39",
          type: "milestone",
          slug: "delivery",
          files: {
            "ARCHITECTURE.md": "# 39 · Delivery\n\n## ADR-001: A decision\n\n**Decision.** The thing is decided.\n",
            "RETROSPECTIVE.md": "# 39 · Delivery — Retrospective\n\n## R1 — A lesson\n\n- **Kind:** near-miss\n\nThe lesson body.\n",
          },
        });
        assert.ok(dir, "sanity: the milestone folder was planted");

        const records = await buildRecords(null, { workDir, projectRoot });
        assert.deepEqual(deliveryOf(records), [], "no capability record and no gap record is produced");

        // The non-delivery records are the ONLY thing this stream can yield, and they
        // are what the pre-story run yielded: one adr + one lesson, each citing "39".
        const kinds = records.map((r) => r.recordType).sort();
        assert.deepEqual(kinds, ["adr", "lesson"], `only the adr + lesson records survive; got ${JSON.stringify(kinds)}`);
        for (const record of records) assert.equal(record.item, "39", "each still cites the milestone's own ref");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },

  // ==================================================================
  // "MIRRORING the predicate `inScope` already applies rather than authoring a
  // second one" (the task's own words), pinned. The rule moved to a zero-import
  // leaf and `work-doctor.mjs`'s `inScope` + `validateWork`'s closure now delegate
  // to it — so the refactor is asserted BEHAVIOUR-PRESERVING against the rule as it
  // was written, held here as a local constant (a test is code; the no-second-copy
  // invariant is scoped to `src/`).
  // ==================================================================
  {
    name: "80/02 scope-rule: itemInScope is byte-for-byte the pre-story `inScope` over every ref/scope shape, and doctor's inScope now delegates to it",
    run: async () => {
      const { itemInScope, refInScope } = await import("../../src/work/ref-scope.mjs");
      const { inScope } = await import("../../src/work/doctor.mjs");

      // The rule AS IT WAS, before the re-home (work-doctor.mjs, pre-story 80).
      const before = (item, scopeRef) => {
        if (!scopeRef) return true;
        const ref = scopeRef.trim();
        if (ref === "") return true;
        if (/^\d+$/.test(ref)) return Number.parseInt(item.parent ?? item.number, 10) === Number.parseInt(ref, 10);
        const pair = ref.match(/^(\d+)\/(\d+)$/);
        if (pair) return item.ref === `${pair[1]}/${pair[2]}` || item.ref === ref;
        return item.slug.includes(ref);
      };

      const items = [
        { number: "39", ref: "39", parent: null, slug: "delivery-memory-outcome" },
        { number: "02", ref: "39/02", parent: "39", slug: "parse-records" },
        { number: "80", ref: "80", parent: null, slug: "outcome-per-delivered-item" },
        { number: "9", ref: "9", parent: null, slug: "single-digit" },
        { number: "09", ref: "09", parent: null, slug: "zero-padded" },
      ];
      const scopes = ["39", "39/02", "39/03", "80", "41", "999", "9", "09", "delivery", "outcome", "nope", "", "  ", null, undefined];

      for (const item of items) {
        for (const scope of scopes) {
          const expected = before(item, scope);
          assert.equal(
            itemInScope(item, scope),
            expected,
            `itemInScope(${item.ref}, ${JSON.stringify(scope)}) matches the pre-story rule (${expected})`,
          );
          assert.equal(
            inScope(item, scope),
            expected,
            `doctor's inScope(${item.ref}, ${JSON.stringify(scope)}) still answers ${expected} — it delegates, it does not re-implement`,
          );
        }
      }

      // The ref-only face: answerable for numeric/pair scopes, and honestly `null`
      // for a slug — which a bare ref cannot decide. `null` is what makes the memory
      // `--item` filter match nothing on a slug, exactly as its exact-string
      // predecessor did.
      assert.equal(refInScope("39/02", "39"), true, "a nested ref is inside its driver's subtree");
      assert.equal(refInScope("39", "39"), true, "a driver is inside its own subtree");
      assert.equal(refInScope("39/02", "39/03"), false, "a sibling story is not in scope");
      assert.equal(refInScope("39/02", "delivery"), null, "a slug scope is not answerable from a bare ref");
      assert.equal(refInScope("39", null), true, "an absent scope narrows nothing");
      assert.equal(refInScope(undefined, "39"), false, "a record with no ref matches no numeric scope");
    },
  },

  // ==================================================================
  // Scenario Outline: an UNAUTHORED placeholder heading yields no record,
  // whatever item carries it. A story accepted before its outcome is authored
  // would otherwise index "<Capability name>" as a delivered capability.
  // ==================================================================
  ...[
    { type: "milestone", number: "39", slug: "delivery" },
    { type: "story", number: "80", slug: "parentless" },
    { type: "chore", number: "81", slug: "pin-eol" },
  ].map(({ type, number, slug }) => ({
    name: `80/02 index: a ${type} whose OUTCOME.md is the freshly instantiated template produces no capability and no gap record`,
    run: async () => {
      const { projectRoot, workDir } = await makeStream();
      try {
        // The REAL shipped template, marker-stripped exactly as a scaffold would
        // instantiate it — not a hand-written stand-in that could drift from it.
        const shipped = await readFile(path.join(repoRoot, "src", "bundle", "templates", "shared", "OUTCOME.md"), "utf8");
        const dir = path.join(workDir, `${number}_${type}_${slug}`);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "OUTCOME.md"), shipped, "utf8");

        const records = await buildRecords(null, { workDir, projectRoot });
        assert.deepEqual(
          deliveryOf(records),
          [],
          `an unauthored template on a ${type} yields no delivery record; got ${JSON.stringify(deliveryOf(records))}`,
        );
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  })),
];
