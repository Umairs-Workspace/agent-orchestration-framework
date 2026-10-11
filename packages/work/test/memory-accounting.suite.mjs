// Milestone 153 / story 03 task 00 — the accounting read model: surfaced / honoured / departed /
// irrelevant from completed recall observations, recurred from distinct new lessons, joined on the
// composite `<item>/R<n>` and never on a bare id. Pure cases drive `buildAccounting`; the stream
// cases drive `accountMemory` over a disposable work tree (live, story and archived items).
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ACCOUNTING_COUNTERS, accountMemory, buildAccounting, readLedgerText } from "../src/memory-accounting.mjs";

const observation = (id, records) => ({ kind: "recall", id, at: "2026-10-10T10:00:00.000Z", edge: "refine.architect", actor: "architect", query: "junction", scope: {}, records });
const returned = (item, id, verdict, recordType = "lesson") => ({ item, id, recordType, verdict });
const ledger = (...rows) => rows.map((row) => (typeof row === "string" ? row : JSON.stringify(row))).join("\n") + "\n";
const retro = (...lessons) => ["# Retrospective", "", ...lessons.flatMap(([heading, ...lines]) => [heading, "", ...lines, ""])].join("\n");
const META = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";
const counts = (surfaced, honoured, departed, irrelevant, recurred) => ({ surfaced, honoured, departed, irrelevant, recurred });
const pick = (entry) => Object.fromEntries(ACCOUNTING_COUNTERS.map((counter) => [counter, entry[counter]]));

const sourceLedger = (text, owner = "45", source = `${owner}/FEEDBACK.ndjson`) => ({ owner, source, text });
const sourceRetro = (owner, text) => ({ owner, source: `${owner}/RETROSPECTIVE.md`, text });

async function scratch(run) {
  const root = await mkdtemp(path.join(await realpath(os.tmpdir()), "aof-accounting-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const writeItem = async (dir, doc, fields, extra = {}) => {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, doc), `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\nschema: 1\n---\n# ${fields.slug}\n`);
  for (const [name, text] of Object.entries(extra)) await writeFile(path.join(dir, name), text);
};

export const memoryAccountingTests = [
  {
    name: "153/03 E1: surfacing, verdicts and recurrence are counted from their separate evidence",
    run: () => {
      const effectiveness = buildAccounting({
        ledgers: [sourceLedger(ledger(observation("r1", [returned("45", "R13", "honoured")]), observation("r2", [returned("45", "R13", "departed")])))],
        retrospectives: [sourceRetro("68", retro(["## R10 — repeat", META, "- **Recurs:** 45/R13"]))],
        indexed: [{ item: "45", id: "R13", title: "t" }],
        lessons: true,
      });
      assert.deepEqual(pick(effectiveness.lessons["45/R13"]), counts(2, 1, 1, 0, 1));
      assert.deepEqual(pick(effectiveness.types.lesson), counts(2, 1, 1, 0, 1));
      assert.match(effectiveness.basis, /not proof/);
      assert.equal(effectiveness.complete, true);
    },
  },
  {
    name: "153/03 E2: a bare lesson id joins nothing — 68/R13 keeps zeros beside 45/R13's evidence",
    run: () => {
      const effectiveness = buildAccounting({
        ledgers: [sourceLedger(ledger(observation("r1", [returned("45", "R13", "honoured")])))],
        indexed: [{ item: "45", id: "R13" }, { item: "68", id: "R13" }],
        lessons: true,
      });
      assert.deepEqual(pick(effectiveness.lessons["68/R13"]), counts(0, 0, 0, 0, 0));
      assert.deepEqual(pick(effectiveness.lessons["45/R13"]), counts(1, 1, 0, 0, 0));
    },
  },
  {
    name: "153/03 E3: a removed target keeps its observed history with unresolved provenance, and still totals",
    run: () => {
      const effectiveness = buildAccounting({ ledgers: [sourceLedger(ledger(observation("r1", [returned("45", "R13", "honoured")])))], indexed: [], lessons: true });
      assert.equal(effectiveness.lessons["45/R13"].provenance, "unresolved");
      assert.deepEqual(pick(effectiveness.lessons["45/R13"]), counts(1, 1, 0, 0, 0));
      assert.equal(effectiveness.types.lesson.surfaced, 1);
      assert.equal(buildAccounting({ ledgers: [], indexed: [{ item: "45", id: "R13" }], lessons: true }).lessons["45/R13"].provenance, "indexed");
    },
  },
  {
    name: "153/03: every returned record type contributes only its own observations, and the table is opt-in",
    run: () => {
      const effectiveness = buildAccounting({
        ledgers: [sourceLedger(ledger(observation("r1", [returned("45", "R13", "honoured"), returned("45", "ADR-001", "irrelevant", "adr"), returned("12", "cap-a", "departed", "capability")])))],
      });
      assert.deepEqual(pick(effectiveness.types.lesson), counts(1, 1, 0, 0, 0));
      assert.deepEqual(pick(effectiveness.types.adr), counts(1, 0, 0, 1, 0));
      assert.deepEqual(pick(effectiveness.types.capability), counts(1, 0, 1, 0, 0));
      assert.equal("lessons" in effectiveness, false, "per-lesson detail is omitted without the option");
    },
  },
  {
    name: "153/03: an empty observation and a missing ledger add no exposure and no diagnostic",
    run: () => {
      const effectiveness = buildAccounting({ ledgers: [sourceLedger(ledger(observation("r1", []))), sourceLedger("", "46")], lessons: true });
      assert.deepEqual(pick(effectiveness.types.lesson), counts(0, 0, 0, 0, 0));
      assert.deepEqual(effectiveness.diagnostics, []);
      assert.deepEqual(effectiveness.lessons, {});
    },
  },
  {
    name: "153/03: recurrence is direct only — a chain does not add a second count to the first predecessor",
    run: () => {
      const effectiveness = buildAccounting({
        ledgers: [sourceLedger(ledger(observation("r1", [returned("45", "R13", "honoured")])))],
        retrospectives: [
          sourceRetro("68", retro(["## R10 — a", META, "- **Recurs:** m45/R13"])),
          sourceRetro("70", retro(["## R2 — b", META, "- **Recurs:** 68/R10"])),
        ],
        lessons: true,
      });
      assert.deepEqual(pick(effectiveness.lessons["45/R13"]), counts(1, 1, 0, 0, 1));
      assert.equal(effectiveness.lessons["68/R10"].recurred, 1);
      assert.equal(effectiveness.lessons["70/R2"], undefined, "a lesson nobody repeated or recalled is not an entry");
    },
  },
  {
    name: "153/03: identical replay cannot inflate — same recall id once, same new lesson once, distinct recall ids stay distinct",
    run: () => {
      const row = observation("r1", [returned("45", "R13", "honoured")]);
      const effectiveness = buildAccounting({
        ledgers: [sourceLedger(ledger(row, row, observation("r2", [returned("45", "R13", "honoured")]))), sourceLedger(ledger(row))],
        retrospectives: [sourceRetro("68", retro(["## R10 — a", META, "- **Recurs:** 45/R13"])), sourceRetro("68", retro(["## R10 — a", META, "- **Recurs:** 45/R13"]))],
        lessons: true,
      });
      assert.deepEqual(pick(effectiveness.lessons["45/R13"]), counts(2, 2, 0, 0, 1), "r1 (twice, in two ledgers) + r2 = 2 surfaced; one new lesson");
    },
  },
  ...[
    ["malformed ledger JSON", ledger(observation("r1", []), "{not json")],
    ["unknown ledger kind", ledger({ kind: "mystery", id: "x" })],
    ["conflicting payloads for one recall id", ledger(observation("r1", [returned("45", "R13", "honoured")]), observation("r1", [returned("45", "R13", "departed")]))],
  ].map(([defect, text]) => ({
    name: `153/03: ${defect} is a diagnostic naming the source, not a successful zero`,
    run: () => {
      const effectiveness = buildAccounting({ ledgers: [sourceLedger(text)] });
      assert.equal(effectiveness.complete, false);
      assert.deepEqual(effectiveness.diagnostics.map((diagnostic) => [diagnostic.source, diagnostic.defect]), [["45/FEEDBACK.ndjson", defect]]);
    },
  })),
  {
    name: "153/03: an unreadable ledger or retrospective file is a diagnostic",
    run: () => {
      const effectiveness = buildAccounting({
        ledgers: [{ owner: "45", source: "45/FEEDBACK.ndjson", error: new Error("EACCES") }],
        retrospectives: [{ owner: "45", source: "45/RETROSPECTIVE.md", error: new Error("EISDIR") }],
      });
      assert.deepEqual(effectiveness.diagnostics.map((diagnostic) => diagnostic.defect), ["unreadable ledger file", "unreadable retrospective file"]);
    },
  },
  {
    name: "153/03: the ledger reader skips raw and classification rows and reports a bad recall row by line",
    run: () => {
      const { observations, defects } = readLedgerText(ledger({ kind: "raw", id: "a" }, { kind: "classification", id: "b" }, observation("r1", [returned("45", "R13", "honoured")]), { kind: "recall", id: "bad" }));
      assert.equal(observations.length, 1);
      assert.equal(defects.length, 1);
      assert.equal(defects[0].line, 4);
      assert.match(defects[0].defect, /^invalid recall observation/);
    },
  },
  {
    name: "153/03: the stream walk includes story-owned and archived evidence, reads without writing, and is the same whatever the index holds",
    run: () => scratch(async (root) => {
      const workDir = path.join(root, "wiki", "work");
      const live = path.join(workDir, "153_milestone_loop");
      const story = path.join(live, "stories", "03_story_report");
      const archived = path.join(workDir, "archive", "45_milestone_old");
      await writeItem(live, "SPEC.md", { type: "milestone", number: "153", slug: "loop", status: "in-progress" });
      await writeItem(story, "STORY.md", { type: "story", number: "03", slug: "report", parent: "153", status: "in-progress" }, { "FEEDBACK.ndjson": ledger(observation("s1", [returned("45", "R13", "honoured")])) });
      await writeItem(archived, "SPEC.md", { type: "milestone", number: "45", slug: "old", status: "done" }, { "RETROSPECTIVE.md": retro(["## R13 — old", META]) });
      await writeItem(path.join(workDir, "68_milestone_next"), "SPEC.md", { type: "milestone", number: "68", slug: "next", status: "done" }, { "RETROSPECTIVE.md": retro(["## R10 — repeat", META, "- **Recurs:** 45/R13"]) });
      const before = await readFile(path.join(story, "FEEDBACK.ndjson"), "utf8");

      const withIndex = await accountMemory(workDir, { indexed: [{ recordType: "lesson", item: "45", id: "R13" }], lessons: true });
      const noIndex = await accountMemory(workDir, { indexed: [], lessons: true });
      assert.deepEqual(pick(withIndex.lessons["45/R13"]), counts(1, 1, 0, 0, 1));
      assert.deepEqual(pick(noIndex.lessons["45/R13"]), counts(1, 1, 0, 0, 1));
      assert.equal(withIndex.lessons["45/R13"].provenance, "indexed");
      assert.equal(noIndex.lessons["45/R13"].provenance, "unresolved");
      assert.equal(await readFile(path.join(story, "FEEDBACK.ndjson"), "utf8"), before);
    }),
  },
  {
    name: "153/03: an unreadable ledger on disk is reported, not counted as zero",
    run: () => scratch(async (root) => {
      const workDir = path.join(root, "wiki", "work");
      const live = path.join(workDir, "153_milestone_loop");
      await writeItem(live, "SPEC.md", { type: "milestone", number: "153", slug: "loop", status: "in-progress" });
      // A directory where the ledger file belongs cannot be read as one.
      await mkdir(path.join(live, "FEEDBACK.ndjson"));
      const effectiveness = await accountMemory(workDir, {});
      assert.equal(effectiveness.complete, false);
      assert.deepEqual(effectiveness.diagnostics.map((diagnostic) => diagnostic.defect), ["unreadable ledger file"]);
    }),
  },
  {
    name: "153/05: with evidence on, each lesson names the ledger lines and the distinct new lessons its counts came from",
    run: () => {
      const effectiveness = buildAccounting({
        ledgers: [sourceLedger(ledger(observation("r1", [returned("45", "R13", "honoured")]), "", observation("r2", [returned("45", "R13", "departed")]), observation("r1", [returned("45", "R13", "honoured")])))],
        retrospectives: [sourceRetro("68", retro(["## R10 — repeat", META, "- **Recurs:** 45/R13"]))],
        lessons: true,
        evidence: true,
      });
      const cited = effectiveness.lessons["45/R13"].evidence;
      assert.deepEqual(cited.observations, [{ source: "45/FEEDBACK.ndjson", line: 1 }, { source: "45/FEEDBACK.ndjson", line: 3 }], "a blank line is counted in the numbering and an identical replay is cited once");
      assert.deepEqual(cited.recurrences, [{ source: "68/RETROSPECTIVE.md", line: 3, identity: "68/R10" }]);
      assert.deepEqual(pick(effectiveness.lessons["45/R13"]), counts(2, 1, 1, 0, 1));
      const without = buildAccounting({ ledgers: [sourceLedger(ledger(observation("r1", [returned("45", "R13", "honoured")])))], lessons: true });
      assert.equal("evidence" in without.lessons["45/R13"], false, "the extra is opt-in; the status face is unchanged");
    },
  },
  {
    name: "153/05: readLedgerText reports the line of each observation beside it",
    run: () => {
      const { observations, lines, defects } = readLedgerText(ledger("{not json", observation("r1", [returned("45", "R13", "honoured")]), { kind: "raw", id: "a" }, observation("r2", [])));
      assert.equal(observations.length, 2);
      assert.deepEqual(lines, [2, 4]);
      assert.deepEqual(defects.map((defect) => defect.line), [1]);
    },
  },
  {
    name: "153/05: the stream walk can be narrowed to selected items, and never opens the others",
    run: () => scratch(async (root) => {
      const workDir = path.join(root, "wiki", "work");
      const fields = (number) => ({ type: "milestone", number: `"${number}"`, slug: `m${number}`, status: "done" });
      const row = (id, item) => `${JSON.stringify(observation(id, [returned(item, "R13", "honoured")]))}\n`;
      const dirs = { 45: path.join(workDir, "45_milestone_m45"), 68: path.join(workDir, "68_milestone_m68") };
      await writeItem(dirs[45], "SPEC.md", fields(45), { "FEEDBACK.ndjson": "{not json\n" });
      await writeItem(dirs[68], "SPEC.md", fields(68), { "FEEDBACK.ndjson": row("c", "45") });
      const { listItems } = await import("../src/discovery.mjs");
      const selected = (await listItems(workDir)).filter((item) => item.ref === "68");
      const narrowed = await accountMemory(workDir, { items: selected, lessons: true });
      assert.equal(narrowed.complete, true, "the unselected item's corrupt ledger is neither read nor diagnosed");
      assert.deepEqual(pick(narrowed.lessons["45/R13"]), counts(1, 1, 0, 0, 0));
      const everything = await accountMemory(workDir, { lessons: true });
      assert.equal(everything.complete, false, "unnarrowed, the same stream still reports it");
    }),
  },
];
