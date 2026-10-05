// 151 — `/aof:add-diagram <ref> [ADR-NNN]`: refine's diagram step run after the fact, over the ADRs a
// refine left undrawn. The command adds no CLI verb, so every scenario reads the command's prose
// (`packages/core/assets/commands/add-diagram.md`), as 145/03 reads `/aof:loop-diagram`'s. The plan
// and export answers it acts on are held by 133's and 145's suites; this one holds what the session
// is told to do with them. Task 00's census rows live with the censuses they move.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMMAND = path.join(repoRoot, "packages", "core", "assets", "commands", "add-diagram.md");

// The prose with every run of whitespace collapsed to one space, so an assertion reads a sentence
// the way a reader does, whatever column it wrapped at.
async function prose() {
  return (await readFile(COMMAND, "utf8")).replace(/\s+/g, " ");
}

// The list item that opens at `needle`: up to the next bullet or numbered step.
function itemAt(text, needle) {
  const at = text.indexOf(needle);
  assert.ok(at >= 0, `the prose says: ${needle}`);
  const rest = text.slice(at + needle.length);
  const end = rest.search(/ - | \d\. /);
  return needle + (end < 0 ? rest : rest.slice(0, end));
}

const has = (text, needle) => assert.ok(text.includes(needle), `the prose says: ${needle}`);
const before = (text, first, second) => {
  const a = text.indexOf(first);
  const b = text.indexOf(second);
  assert.ok(a >= 0, `the prose says: ${first}`);
  assert.ok(b >= 0, `the prose says: ${second}`);
  assert.ok(a < b, `"${first}" comes before "${second}"`);
};

export const addDiagramCommandTests = [
  // ── task 01 · R1 — with no ADR named ─────────────────────────────────────────────────────────
  {
    name: "151/01 E1: with no ADR named, only a briefed ADR with no diagrams/ link is a candidate",
    run: async () => {
      const text = await prose();
      has(text, "read its `ARCHITECTURE.md`");
      has(text, "List each ADR whose `### Diagram` brief has no `diagrams/` link under it");
      has(text, "An ADR with no brief is not a candidate");
      has(text, "An ADR whose diagram is drawn is already drawn");
      has(text, "The ADR's design is never revisited");
    },
  },
  {
    name: "151/01 E2: a brief kept by 'diagram not drawn' is a candidate, and the STATE.md line is left as it is",
    run: async () => {
      const text = await prose();
      has(text, "A `diagram not drawn:` line in `STATE.md` left its brief behind, so that ADR is a candidate like any other");
      has(text, "Leave the `STATE.md` line as it is");
    },
  },
  {
    name: "151/01 E11: every candidate is listed before the first draw, and each is drawn without pausing",
    run: async () => {
      const text = await prose();
      has(text, "List every candidate before the first draw");
      has(text, "draw each candidate in turn, without pausing for confirmation");
      before(text, "List every candidate before the first draw", "**Draw.**");
    },
  },
  {
    name: "151/01 E3: no candidate reports nothing to draw, writes nothing, and names the one-ADR form",
    run: async () => {
      const text = await prose();
      has(text, "With no candidate, report that the item has nothing to draw and write nothing.");
      has(text, "`aof:add-diagram <ref> ADR-NNN` as the way to draw one ADR");
      has(text, "Never search the ADRs for one that would benefit from a picture");
    },
  },
  // ── task 01 · R2 — an ADR named ──────────────────────────────────────────────────────────────
  {
    name: "151/01 E4: a named ADR with no brief gets one first, in refine's words, and only it is planned",
    run: async () => {
      const text = await prose();
      has(text, "No `### Diagram` section");
      has(text, "write the brief under that ADR before planning");
      before(text, "write the brief under that ADR before planning", "**Plan — the CLI.**");
      has(text, "Use the words refine's diagram step uses: why a picture helps, the view (architecture, sequence, state machine…), the components and the flows");
      has(text, "Plan that ADR only, whatever other ADRs are undrawn");
      // The words are refine's own: its diagram step names the same four parts of a brief.
      const refine = await readFile(path.join(repoRoot, "packages", "core", "assets", "commands", "refine.md"), "utf8");
      assert.match(refine.replace(/\s+/g, " "), /why a picture helps, the view, the components, the flows/);
    },
  },
  {
    name: "151/01 E5: a non-zero plan exit is reported with its code and message, diagram-adr-unknown among them",
    run: async () => {
      const text = await prose();
      const refusal = itemAt(text, "**A non-zero exit** is a coded refusal");
      assert.ok(refusal.includes("Report its code and message, and stop for that ADR"), refusal);
      assert.ok(refusal.includes("`diagram-adr-unknown`"), refusal);
      const unknown = itemAt(text, "No `## ADR-NNN` heading: write nothing and run the plan");
      assert.ok(unknown.includes("which refuses it"), unknown);
    },
  },
  {
    name: "151/01 E6: a named ADR that is already drawn is reported, with no plan and no write",
    run: async () => {
      const text = await prose();
      has(text, "Already drawn (a `diagrams/` link in its section): report it as already drawn and stop");
      has(text, "Run no plan for it and write no file");
    },
  },
  // ── task 02 · R3 — the diagram step's own answers ────────────────────────────────────────────
  {
    name: "151/02: the command plans, follows the instructions, exports, then pastes the block — and never edits through aof or commits",
    run: async () => {
      const text = await prose();
      const raw = await readFile(COMMAND, "utf8");
      assert.match(raw, /^argument-hint: "<ref> \[ADR-NNN\]"$/m);
      const plan = text.indexOf("`aof diagram plan <ref> <ADR-NNN> --slug <slug> --json`");
      const follows = text.indexOf("follow the answer's `instructions` exactly");
      const exported = text.indexOf("`aof diagram export <ref> <ADR-NNN> --json`");
      assert.ok(plan >= 0, "it runs the plan for each ADR");
      assert.ok(follows > plan && exported > follows, "it follows the instructions after the plan and before the export");
      has(text, "paste the returned `block` under the ADR's brief");
      has(text, "aof never edits `ARCHITECTURE.md`");
      has(text, "never commits what was drawn");
      has(text, "The slug is the ADR's title in kebab case");
    },
  },
  {
    name: "151/02 E7-E9: an answer that draws nothing is reported, never a failure (outline, three rows)",
    run: async () => {
      const text = await prose();
      const rows = [
        { example: "E7", answer: "**`enabled: false`**", report: "Report the answer's `reason`", then: "write nothing, and stop" },
        { example: "E8", answer: "**`available: false`**", report: "Report the answer's `code` and `fix`", then: "keep every brief, and stop" },
        { example: "E9", answer: "**`diagram-item-delivered`**", report: "a delivered ADR's diagram is immutable", then: "write nothing, and stop" },
      ];
      for (const row of rows) {
        const clause = itemAt(text, row.answer);
        assert.ok(clause.includes(row.report), `${row.example}: on ${row.answer} it reports ${row.report}\n${clause}`);
        assert.ok(clause.includes(row.then), `${row.example}: on ${row.answer} it says ${row.then}\n${clause}`);
      }
      // E7's "writes nothing" holds when a named ADR's brief was drafted first: refine drops it.
      has(text, "If this run wrote a brief for a named ADR, remove it again");
    },
  },
  {
    name: "151/02 E10: a missing PNG still pastes the block, and names the doctor as red until a node with a browser exports it",
    run: async () => {
      const text = await prose();
      has(text, "**A PNG miss still pastes the block.**");
      has(text, "An answer whose `png` is not ok exits non-zero, but its `block` and `written` still stand. Paste the block.");
      has(text, "Report the PNG's `code` and `fix`");
      has(text, "`aof work doctor` stays red on that diagram until a node with a browser exports it");
    },
  },
];
