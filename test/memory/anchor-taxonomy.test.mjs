import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMITTED_KEYS, GROUND_VALUES, NODE_KINDS, SENTINEL_TOKENS, loadLoops,
} from "../../src/work/loops.mjs";
import { loadBundle, renderBundleOutputs } from "../../src/work/bundle.mjs";
import { examplesTables } from "../support/feature-parse.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const classes = ["process-exit", "build-stamp", "landed-commit", "live-soak", "frozen-rule", "exogenous"];

function anchor(stem, { id = `anchor:${stem}`, ground = "process-exit", observes = "command:work:next", extra = "" } = {}) {
  const observesLine = observes == null ? "" : `observes: ${observes}\n`;
  return `---\nid: ${id}\nkind: anchor\ntitle: ${stem}\nground: ${ground}\n${observesLine}${extra}---\n# ${stem}\n`;
}

function loop(stem, extra = "") {
  return `---\nid: loop:${stem}\nkind: loop\ntitle: ${stem}\ncontrolled: state\nreference: [module:src/run-store.mjs#isRetryable]\nmeasurement: [module:src/run-store.mjs#retryReadiness]\nactuator: [command:work:next]\ncadence: event:per-item\nceiling: none\nowner: actor:product-owner\noptimizing: false\n${extra}---\n# ${stem}\n`;
}

async function withRegistry(files, run) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "aof-anchor-taxonomy-"));
  try {
    const loops = path.join(temp, "loops");
    await mkdir(loops);
    for (const [name, content] of Object.entries(files)) await writeFile(path.join(loops, name), content);
    return await run(await loadLoops(temp));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

// ————— milestone 59 / story 00 · task 04 — the anchor's `checked:` date ————————————————

const CHECKED_FEATURE_59 =
  "wiki/work/59_milestone_audit-loops/stories/00_story_the-auditor-kind/tasks/04_an-anchor-says-when-it-was-checked.feature";

/** A complete `kind: watcher` record — 57/ADR-001 §2, unchanged by this story. */
const watcher59 = (stem, extra = {}) =>
  renderFields59(stem, { id: `watcher:${stem}`, kind: "watcher", title: stem, counter: "contract changes", determinism: "counter", measurement: "[command:work:next]", ...extra });

/** A complete `kind: arbiter` record — 58/ADR-003 §2, unchanged by this story. */
const arbiter59 = (stem, extra = {}) =>
  renderFields59(stem, { id: `arbiter:${stem}`, kind: "arbiter", title: stem, resolves: "which loop wins the shared agent", priority: "[loop:alpha]", dwell: "cycles:2", ...extra });

/** A complete `kind: auditor` record — 59/ADR-001 §1, the kind this story adds. */
const auditor59 = (stem, extra = {}) =>
  renderFields59(stem, { id: `auditor:${stem}`, kind: "auditor", title: stem, audits: "[command:work:doctor]", measurement: "[command:work:doctor]", cadence: "event:per-milestone", escalation: "actor:operator", ...extra });

function renderFields59(stem, fields) {
  const lines = Object.entries(fields).filter(([, value]) => value !== null).map(([key, value]) => `${key}: ${value}\n`).join("");
  return `---\n${lines}---\n# ${stem}\n`;
}

/** One complete record of the named kind, carrying `extra` as authored lines. */
function recordOfKind59(kind, stem, extra = {}) {
  if (kind === "loop") return loop(stem, Object.entries(extra).map(([key, value]) => `${key}: ${value}\n`).join(""));
  if (kind === "actor") return renderFields59(stem, { id: `actor:${stem}`, kind: "actor", title: stem, ground: "exogenous", ...extra });
  if (kind === "anchor") return anchor(stem, { extra: Object.entries(extra).map(([key, value]) => `${key}: ${value}\n`).join("") });
  if (kind === "watcher") return watcher59(stem, extra);
  if (kind === "arbiter") return arbiter59(stem, extra);
  if (kind === "auditor") return auditor59(stem, extra);
  throw new Error(`recordOfKind59: ${kind} is not a declared kind`);
}

// `04_an-anchor-says-when-it-was-checked` Examples 0 — a value that is not a date (5 rows). Two are
// sentinels, two are reserved field prefixes, and the fifth is ten characters shaped like a date
// that no calendar has: each is a different way an anchor could look dated while declaring nothing.
const CHECKED_VALUE_59_CASES = [
  { value: "the unknown sentinel", raw: "unknown", file: "unknown" },
  { value: "the none sentinel", raw: "none", file: "none" },
  { value: "a prose pointer", raw: "prose:docs/evidence.md", file: "prose" },
  { value: "a module pointer", raw: "module:src/run-store.mjs#isStale", file: "module" },
  { value: "a date that is not a date", raw: "2026-02-30", file: "not-a-date" },
];

// `04_an-anchor-says-when-it-was-checked` Examples 1 — no other kind admits the key (5 rows), which
// is every declared kind but the anchor.
const CHECKED_KIND_59_CASES = [
  { kind: "loop" },
  { kind: "actor" },
  { kind: "watcher" },
  { kind: "arbiter" },
  { kind: "auditor" },
];

export const anchorTaxonomyTests = [
  {
    name: "anchor-taxonomy/00 every frozen ground class is typed on an anchor",
    run: async () => {
      await withRegistry({
        ...Object.fromEntries(classes.map((ground, index) => [`anchor-${index}.md`, anchor(`anchor-${index}`, { ground })])),
        "actor.md": "---\nid: actor:actor\nkind: actor\ntitle: Actor\nground: process-exit\n---\n# Actor\n",
      }, (model) => {
        assert.deepEqual(model.findings, []);
        assert.equal(model.nodes.length, classes.length + 1);
        for (const [index, ground] of classes.entries()) {
          const node = model.nodes.find((candidate) => candidate.id === `anchor:anchor-${index}`);
          assert.equal(node.kind, "anchor");
          assert.deepEqual(node.fields.ground, { key: "ground", raw: ground, kind: "enum", value: ground });
          assert.equal(node.fields.observes.kind, "pointer");
        }
        assert.equal(model.nodes.find((node) => node.id === "actor:actor").fields.ground.value, "process-exit");
      });
      const before = [...GROUND_VALUES];
      for (const [index, ground] of ["verified", "true", ""].entries()) {
        await withRegistry({ [`invalid-${index}.md`]: anchor(`invalid-${index}`, { ground }) }, (model) => {
          assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value"]);
          assert.match(model.findings[0].message, /ground/);
        });
      }
      assert.deepEqual([...GROUND_VALUES], before, "invalid records cannot widen the literal taxonomy");
    },
  },
  {
    name: "anchor-taxonomy/01 loops cannot claim ground and anchors require a machine authority",
    run: async () => {
      for (const [index, observes] of [
        "module:src/run-store.mjs#isStale",
        "command:work:next",
        "config:work.loop.reviewRounds",
      ].entries()) {
        await withRegistry({ [`authority-${index}.md`]: anchor(`authority-${index}`, { observes }) }, (model) => {
          assert.deepEqual(model.findings, []);
          assert.equal(model.nodes[0].fields.observes.pointer.scheme, observes.slice(0, observes.indexOf(":")));
        });
      }
      const cases = [
        { file: "loop-ground.md", content: loop("loop-ground", "ground: process-exit\n"), code: "loop-key-not-admitted-for-kind", key: "ground" },
        { file: "missing.md", content: anchor("missing", { observes: null }), code: "loop-missing-field", key: "observes" },
        { file: "prose.md", content: anchor("prose", { observes: "prose:docs/evidence.md" }), code: "loop-bad-value", key: "observes" },
        { file: "unknown.md", content: anchor("unknown", { observes: "unknown" }), code: "loop-bad-value", key: "observes" },
        { file: "free-text.md", content: anchor("free-text", { observes: "the test runner" }), code: "loop-bad-value", key: "observes" },
      ];
      for (const row of cases) await withRegistry({ [row.file]: row.content }, (model) => {
        assert.deepEqual(model.findings.map((finding) => finding.code), [row.code]);
        assert.match(model.findings[0].message, new RegExp(row.key));
      });
    },
  },
  {
    name: "anchor-taxonomy/02 anchor id mismatches and malformed anchors are isolated",
    run: async () => withRegistry({
      "mismatch.md": anchor("mismatch", { id: "anchor:other" }),
      "healthy-loop.md": loop("healthy-loop"),
    }, (model) => {
      assert.ok(model.nodes.some((node) => node.id === "loop:healthy-loop"));
      assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-id-mismatch"]);
      assert.match(model.findings[0].message, /anchor:other must equal anchor:mismatch/);
    }),
  },
  {
    name: "anchor-taxonomy/03 day-one anchors are verbatim framework assets with resolvable authorities and cited edges",
    run: async () => {
      const bundle = loadBundle();
      // WHICH RECORDS ARE ANCHORS IS THE BUNDLE'S ANSWER, NOT A LITERAL. It was the two day-one
      // anchors when 55 wrote this; 58/01 adds `anchor:run-lifecycle-policy`, the `frozen-rule`
      // authority that carries `loop:run-resilience`'s reference. The CLAIM — every shipped anchor
      // is installed verbatim, resolves its authority and cites its edges in its own body — is
      // unchanged and now covers whatever the bundle ships, so it cannot go stale for the reason
      // it just did.
      const expected = bundle.assets
        .filter((asset) => asset.target?.startsWith(".aof/loops/") && /^kind: anchor$/mu.test(asset.body ?? ""))
        .map((asset) => path.basename(asset.target))
        .sort();
      assert.ok(expected.length >= 2, `non-vacuous: ${expected.length} shipped anchor records`);
      const outputs = renderBundleOutputs(bundle, { runtimes: ["claude", "codex"] });
      const installed = await loadLoops(path.join(root, ".aof"));
      const anchors = installed.nodes.filter((node) => node.kind === "anchor");
      assert.deepEqual(anchors.map((node) => path.basename(node.path)).sort(), expected);
      for (const filename of expected) {
        const source = await readFile(path.join(root, "src", "bundle", "loops", filename), "utf8");
        const copy = await readFile(path.join(root, ".aof", "loops", filename), "utf8");
        assert.equal(copy, source);
        assert.match(source, /^---\r?\n# aof-generated: true/m);
        const member = bundle.assets.find((asset) => asset.file === `loops/${filename}`);
        assert.deepEqual(member?.runtimes, ["claude", "codex"]);
        const output = outputs.find((candidate) => candidate.path.replaceAll("\\", "/") === `.aof/loops/${filename}`);
        assert.equal(output?.content, source);
        const node = anchors.find((candidate) => path.basename(candidate.path) === filename);
        const authority = node.fields.observes.pointer;
        assert.equal(authority.scheme, "module");
        const authoritySource = await readFile(path.join(root, authority.operand), "utf8");
        assert.match(authoritySource, new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|class)\\s+${authority.symbol}\\b`));
        const body = source.slice(source.indexOf("\n---\n") + 5);
        for (const endpoints of Object.values(node.edges)) for (const endpoint of endpoints) {
          assert.match(body, new RegExp(endpoint.operand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        }
      }
    },
  },
  // ————— milestone 59 / story 00 · task 04 — `04_an-anchor-says-when-it-was-checked` ————
  //
  // Homed HERE, in the anchor's own taxonomy suite (59/ADR-008 §2 assigns this file to 59/00 for
  // exactly that): `checked:` is a key on `kind: anchor` and on no other kind, so what a reader
  // needs to know about it is what an anchor may say. Whether a given date is too OLD is a window,
  // and the window is 59/03's — nothing below compares a date to anything.
  //
  // Contract: `wiki/work/59_milestone_audit-loops/stories/00_story_the-auditor-kind/tasks/
  // 04_an-anchor-says-when-it-was-checked.feature`. ADR-005 §2. FF-5902.
  {
    name: "anchor-taxonomy/59 an anchor records when it was last checked, and its other declarations are untouched",
    run: async () => {
      await withRegistry({
        "dated.md": anchor("dated", { ground: "live-soak", extra: "checked: 2026-08-29\n" }),
      }, (model) => {
        assert.deepEqual(model.findings, [], "a dated anchor raises nothing");
        const node = model.nodes[0];
        assert.equal(node.fields.checked.kind, "date", "the date is readable off the anchor…");
        assert.equal(node.fields.checked.raw, "2026-08-29", "…verbatim as authored");
        assert.equal(node.fields.checked.value, "2026-08-29");
        // THE EPOCH RIDES ON THE PARSED FIELD (ADR-005 §4), so 59/03's window comparison is handed a
        // number and the pure checks module can hold no date literal and read no clock.
        assert.equal(node.fields.checked.ms, Date.UTC(2026, 7, 29), "…carrying the epoch a window is compared against");
        // AND THE ANCHOR'S EXISTING GROUND AND AUTHORITY ARE UNCHANGED.
        assert.deepEqual(node.fields.ground, { key: "ground", raw: "live-soak", kind: "enum", value: "live-soak" });
        assert.equal(node.fields.observes.pointer.scheme, "command");
        assert.equal(node.fields.observes.raw, "command:work:next");
      });
      // EVERY FROZEN GROUND CLASS STILL PARSES BESIDE A DATE — the new key is orthogonal to the
      // taxonomy 55 froze, not a sixth branch of it.
      for (const [index, ground] of classes.entries()) {
        await withRegistry({
          [`dated-${index}.md`]: anchor(`dated-${index}`, { ground, extra: "checked: 2026-01-31\n" }),
        }, (model) => {
          assert.deepEqual(model.findings, [], ground);
          assert.equal(model.nodes[0].fields.checked.raw, "2026-01-31", ground);
          assert.equal(model.nodes[0].fields.ground.value, ground, ground);
        });
      }
    },
  },

  {
    name: "anchor-taxonomy/59 an anchor that has never declared a date is UNDATED, which is not stale",
    run: async () => {
      // OVER THE ANCHORS ACTUALLY SHIPPED, read off the bundle rather than listed — none of them
      // carries a `checked:` date, because 59/00 ships the key and no record. What must be true is
      // that their silence costs them nothing: no finding, and no date invented on their behalf.
      const bundle = loadBundle();
      const shipped = bundle.assets
        .filter((asset) => asset.target?.startsWith(".aof/loops/") && /^kind: anchor$/mu.test(asset.body ?? ""))
        .map((asset) => path.basename(asset.target))
        .sort();
      assert.ok(shipped.length >= 2, `non-vacuous: ${shipped.length} shipped anchor records`);
      const installed = await loadLoops(path.join(root, ".aof"));
      const anchors = installed.nodes.filter((node) => node.kind === "anchor");
      assert.deepEqual(anchors.map((node) => path.basename(node.path)).sort(), shipped, "every shipped anchor is parsed");
      for (const node of anchors) {
        const name = path.basename(node.path);
        assert.equal("checked" in node.fields, false, `${name}: reported as UNDATED — the key is absent, not empty`);
        assert.equal(node.fields.checked, undefined, `${name}: and no date is readable off it`);
        assert.equal(
          installed.findings.some((finding) => finding.path === node.path && /checked/u.test(finding.message)), false,
          `${name}: gains no finding for the absent date`,
        );
      }
      // …AND THE KEY IS OPTIONAL AT THE SCHEMA, decided over a clean fixture rather than only over
      // the records that happen to be on disk today.
      await withRegistry({ "undated.md": anchor("undated") }, (model) => {
        assert.deepEqual(model.findings, [], "an anchor with no date is a valid anchor");
        assert.equal("checked" in model.nodes[0].fields, false, "undated, and undated is a third state");
      });
    },
  },

  {
    name: "anchor-taxonomy/59 a value that is not a date is refused (table)",
    run: async () => {
      for (const row of CHECKED_VALUE_59_CASES) {
        await withRegistry({
          [`bad-${row.file}.md`]: anchor(`bad-${row.file}`, { extra: `checked: ${row.raw}\n` }),
        }, (model) => {
          assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value"], `${row.value}: refused`);
          assert.equal(model.findings[0].message, `Invalid value for checked: ${row.raw}`,
            `${row.value}: naming the checked key and quoting the value`);
          assert.equal(model.findings[0].severity, "error", `${row.value}: and it gates`);
          assert.equal("checked" in model.nodes[0].fields, false, `${row.value}: no date is readable off the anchor`);
        });
      }
      // THE TWO SENTINEL ROWS ARE SENTINELS, AND THE PROSE ROW IS A RESERVED PREFIX — decided over
      // the exported vocabularies, so the refusals above are a rule about the sentinel set rather
      // than about three strings somebody chose. `checked: unknown` is precisely the shape that
      // would let an anchor opt out of freshness while appearing to declare it.
      for (const token of SENTINEL_TOKENS) {
        await withRegistry({ "sentinel.md": anchor("sentinel", { extra: `checked: ${token}\n` }) }, (model) => {
          assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value"], `${token}: refused`);
          assert.equal("checked" in model.nodes[0].fields, false, token);
        });
      }
      for (const prefix of ["module:src/run-store.mjs#isStale", "command:work:next", "config:work.audit.anchorStaleDays", "prose:docs/evidence.md"]) {
        await withRegistry({ "prefixed.md": anchor("prefixed", { extra: `checked: ${prefix}\n` }) }, (model) => {
          assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value"], `${prefix}: refused`);
        });
      }
      // NON-VACUITY: real calendar dates land, including a leap day — so the refusals above decide a
      // grammar rather than refusing everything.
      for (const raw of ["2024-02-29", "2026-01-01", "2026-12-31"]) {
        await withRegistry({ "good.md": anchor("good", { extra: `checked: ${raw}\n` }) }, (model) => {
          assert.deepEqual(model.findings, [], raw);
          assert.equal(model.nodes[0].fields.checked.raw, raw, raw);
        });
      }
    },
  },

  {
    name: "anchor-taxonomy/59 no other kind admits the key (table)",
    run: async () => {
      for (const row of CHECKED_KIND_59_CASES) {
        await withRegistry({ "subject.md": recordOfKind59(row.kind, "subject", { checked: "2026-08-29" }) }, (model) => {
          const refused = model.findings.filter((finding) => finding.code === "loop-key-not-admitted-for-kind");
          assert.equal(refused.length, 1, `${row.kind}: the EXISTING not-admitted-for-kind finding`);
          assert.equal(refused[0].message, `Key checked is not admitted for kind ${row.kind}`,
            `${row.kind}: naming the checked key and the kind`);
          assert.equal("checked" in model.nodes[0].fields, false, `${row.kind}: nothing reached the model`);
        });
      }
      // DECIDED OVER THE VOCABULARY TOO, so the table could not be satisfied by a loader that
      // admitted the key everywhere and reported nothing.
      assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has("checked")), ["anchor"],
        "`checked:` is admitted on the anchor and on no other kind");
      assert.equal(CHECKED_KIND_59_CASES.length, NODE_KINDS.size - 1, "every kind that is not the anchor has a row");
    },
  },

  {
    name: "anchor-taxonomy/59 the anchor's other rules are untouched by the new key",
    run: async () => {
      await withRegistry({
        "gauge.md": anchor("gauge", { ground: "measured", extra: "checked: 2026-08-29\n" }),
      }, (model) => {
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value"],
          "the ground finding is exactly the one it was before this milestone");
        assert.equal(model.findings[0].message, "Invalid value for ground: measured", "…naming the ground key");
        assert.equal(model.nodes[0].fields.checked.raw, "2026-08-29", "and the checked date is still readable");
      });
      // …and the same holds for 55's other two anchor rules — a `prose:` authority and an absent
      // one — so "untouched" is decided over every rule the anchor had, not over one of them.
      await withRegistry({
        "prose.md": anchor("prose", { observes: "prose:docs/evidence.md", extra: "checked: 2026-08-29\n" }),
      }, (model) => {
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-bad-value"]);
        assert.match(model.findings[0].message, /observes/u);
        assert.equal(model.nodes[0].fields.checked.raw, "2026-08-29");
      });
      await withRegistry({
        "authorityless.md": anchor("authorityless", { observes: null, extra: "checked: 2026-08-29\n" }),
      }, (model) => {
        assert.deepEqual(model.findings.map((finding) => finding.code), ["loop-missing-field"]);
        assert.match(model.findings[0].message, /observes/u);
        assert.equal(model.nodes[0].fields.checked.raw, "2026-08-29");
      });
    },
  },

  {
    name: "anchor-taxonomy/59 every Examples row of 59/00's anchor feature is driven by a case",
    run: async () => {
      const parsed = examplesTables(await readFile(path.join(root, CHECKED_FEATURE_59), "utf8"));
      const traced = [
        { header: ["value"], cases: CHECKED_VALUE_59_CASES },
        { header: ["kind"], cases: CHECKED_KIND_59_CASES },
      ];
      assert.equal(parsed.length, traced.length, "one traced table per Examples block");
      for (const [index, entry] of traced.entries()) {
        assert.equal(entry.cases.length, parsed[index].rows.length, `table ${index}: a case per row`);
        assert.deepEqual(parsed[index].header, entry.header, `table ${index}: the feature's own column names`);
        // THE CELL TEXT, NOT JUST THE SHAPE — see the same leg in `test/loop/work-loops-record.test.mjs`.
        // Row count and header are satisfied by a table whose rows were rewritten; this is not.
        assert.deepEqual(
          entry.cases.map((row) => row[entry.header[0]]),
          parsed[index].rows.map((row) => row[0]),
          `table ${index}: each case names the feature's own first-column cell, in row order`,
        );
      }
    },
  },

];
