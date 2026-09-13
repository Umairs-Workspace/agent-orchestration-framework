// THE PROMPT LAYER — milestone 77 / story 00. ADR-003, ADR-004, ADR-010 §3.
//
// Two rules over the prompt documents an audited project has INSTALLED, and both are designed to
// under-report. The lane is a pure function over injected inputs and a subject root: no clock is
// read at call time, no configuration key is reached for, nothing on the inputs is mutated, and it
// registers nothing (ADR-010 §2 puts every `REPORT_LANES` entry in 77/05).
//
// ── RULE ONE: A ROLE ORDERED TO RUN A PROGRAM ITS GRANT NEVER INCLUDED ───────────────────────
//
// A subagent told to run a verb its `tools:` never granted does not fail loudly. It reads the
// instruction, cannot obey it, and continues — so the failure surfaces as a step that quietly did
// not happen. One instance is live and has been for as long as this repository has run the
// command: the refine command orders the product owner to run a memory recall, and that agent
// document grants no `Bash`.
//
// THE NAIVE DETECTOR WAS BUILT AND MEASURED FIRST, and it is the reason for every narrow gate
// below. Any code span whose first token is a program name, attributed to any role word in the
// sentence, produced 17 findings over this repository's prompt corpus, of which ZERO were the true
// one: the product-owner agent id matches a program prefix, a slash command is not a program, and
// "spawn <the designer>" instructs the orchestrator rather than the designer.
//
// So the evidence is narrowed four ways, and each gate is measured rather than intuited:
//
//   1. Only a backticked CODE SPAN is evidence. A rule that reads English reads the designer's own
//      "you have no Bash; you are structurally read-only" as an instruction.
//   2. The span's first token must be in the CLOSED map below AND be followed by a space and an
//      argument. The space is what excludes an agent id and a slash command BY CONSTRUCTION rather
//      than by an exception list — there is no second row and no tool-name-token row.
//   3. The clause must order the reader to RUN it. A document that MENTIONS a command is not a
//      document that orders one.
//   4. Attribution is exactly ONE bolded role word through the declared map. Zero, or two or more,
//      reports nothing — the live instance shares one SENTENCE with the architect's instruction, so
//      clause granularity is what keeps it visible at all.
//
// Measured over this repository's prompt corpus at the decision point: 33 documents, 165
// program-shaped spans, 5 attributed, 1 finding, 0 false positives. 165 → 1 is what "under-report
// rather than cry wolf" looks like when it is measured instead of asserted.
//
// ── RULE TWO: ONE RULE COPIED INTO TWO DOCUMENTS ─────────────────────────────────────────────
//
// A rule stated in four places is a rule that goes stale in three of them. The measured case is
// four logical copies of one block totalling 8,402 B across three render targets — and exact
// duplicate BLOCK matching finds ZERO of them, because at 2,217 / 1,204 / 3,472 / 1,509 bytes they
// are paraphrases rather than copies. The tempting repair is a similarity threshold, and it is
// refused: a threshold is a model inside a command specified to have none, and the number that
// decides truth is un-reviewable.
//
// So the unit is smaller than the block. Paraphrases share long verbatim SENTENCES even when their
// blocks differ, and exact matching at sentence granularity is deterministic, has no threshold that
// decides truth, and a reviewer can check it by reading two lines. Findings aggregate per FILE PAIR
// because of what the corpus holds: 21 duplicated groups over 33 documents is a lint nobody reads;
// 18 pairs ranked by redundant bytes is a list somebody acts on, and the aggregate is a number a
// retrospective can plot.
//
// THE FLOOR IS A GRADIENT, NOT A DETAIL: 21 groups at 120 characters, 12 at 200, and 0 at 300. A
// number that decides the entire output that steeply is declared once, below, and the value the run
// actually used is reported in the run's OWN output — so a reader of a clean result can tell how
// much of the corpus the floor hid.
//
// ── AND BOTH RULES STATE THEIR BLINDNESS IN THE OUTPUT, ON EVERY RUN ─────────────────────────
//
// A clean result from two deliberately blind rules over a corpus nobody confirmed was read is a
// falsehood in the shape of an answer. The remedy is not a caveat in an architecture document,
// where no operator is standing: both sweeps declare `basis: "text"`, which is what obliges them to
// state a limit (`./reads.mjs`), and the limit is emitted whatever was found. A limit quoted only
// into findings says nothing in exactly the case a reader most needs it — the run that returned
// none.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { RESOURCE_KINDS, RUNTIMES } from "../model.mjs";
import { limitRecord, readRecord } from "./reads.mjs";

// ── THE FROZEN VOCABULARY ────────────────────────────────────────────────────────────────────

// This lane's whole code space, frozen so 77/05 can derive the audit's from it rather than restate
// it. `audit-ran-on-nothing` is deliberately NOT here: the floor comparison is applied FROM THE
// REGISTRY over whatever a lane returned (`report.mjs`'s `unreportedFloorFindings`), so a lane that
// emitted its own copy would be a second emitter of one rule.
export const PROMPT_LAYER_FINDING_CODES = Object.freeze([
  "audit-agent-capability-gap",
  "audit-instruction-duplicated",
]);

// THE CLOSED, DECLARED, ONE-ROW PROGRAM MAP (ADR-003 §2). One capability, eight programs, and no
// second row — a bare tool-name token in prose is NOT evidence, and the case of QA told to `Edit`
// is deliberately outside this rule. A second row is the change that would quietly undo the whole
// design, which is why this constant is asserted CLOSED by a control rather than trusted.
export const CAPABILITY_PROGRAMS = Object.freeze({
  Bash: Object.freeze(["aof", "npm", "npx", "node", "git", "bash", "pwsh", "sh"]),
});

// THE DECLARED ROLE MAP (ADR-003 §4) — the one hand-maintained artifact in this milestone, living
// here and nowhere else so a reviewer sees it change. Keyed by the agent id a grant is read against,
// valued by the bolded words that attribute to it.
export const ROLE_WORDS = Object.freeze({
  "aof-product-owner": Object.freeze(["product owner", "po"]),
  "aof-architect": Object.freeze(["architect"]),
  "aof-developer": Object.freeze(["developer"]),
  "aof-qa": Object.freeze(["qa"]),
  "aof-designer": Object.freeze(["designer"]),
  "aof-researcher": Object.freeze(["researcher"]),
  "aof-security": Object.freeze(["security"]),
  "aof-compliance": Object.freeze(["compliance"]),
});

// THE SENTENCE FLOOR (ADR-004 §3). Declared once, never a literal at a comparison site, and
// reported in the run's own limit as the value that run applied.
export const SENTENCE_FLOOR = 120;

// ── THE SWEEP REGISTRY ───────────────────────────────────────────────────────────────────────
//
// The floor is 1 because this lane TRAVELS. The census can set its floors below a measured
// population because it walks THIS repository; a rule that must run in a project nobody has
// gated has exactly one honest floor — an installed prompt layer with no documents in it means
// the audit read nothing, and that is the shortfall worth naming. The root is a placeholder here
// and the real subject root arrives on the read record, which is the evidence lane's shape.
//
// `blindness` is a FUNCTION of the run's own inputs rather than a string, so the floor a limit
// reports is the value that run used and cannot drift from it.
export const PROMPT_LAYER_SWEEPS = Object.freeze([
  Object.freeze({
    id: "prompt-capability",
    what: "every installed prompt document under the declared runtime local roots and resource kinds, read for clauses ordering a named role to run a program",
    root: "<the audited project's installed prompt layer>",
    floor: 1,
    basis: "text",
    question: "does an instruction this sweep could not read still order a role to run something it was never granted?",
    blindness: () => "This rule reads only a BACKTICKED CODE SPAN whose first token is one of the eight declared programs FOLLOWED BY AN ARGUMENT, in a clause ordering a run, attributed by exactly ONE bolded role word. It therefore does NOT detect: an instruction written in prose rather than a code span; an instruction naming a role without bold, or naming two roles in one clause; and a required capability other than `Bash`. Under-reporting is the chosen direction — the naive detector produced 17 findings over this repository's corpus of which none was the true one.",
  }),
  Object.freeze({
    id: "prompt-duplication",
    what: "the same installed prompt documents, read for normalised sentences at or above the declared floor repeated byte-identically in two of them",
    root: "<the audited project's installed prompt layer>",
    floor: 1,
    basis: "text",
    question: "does a rule this sweep could not match still stand duplicated across two documents?",
    blindness: ({ sentenceFloor }) => `This rule matches normalised sentences EXACTLY, at or above a floor of ${sentenceFloor} bytes for this run. A rule restated in different words is INVISIBLE to it: the four measured copies of the graph-grounding block total 8,402 B and share no sentence between them, so roughly 1.2 KB of that block is all this rule can see. Raising the floor hides more — measured over this repository's corpus, 21 groups at 120 bytes, 12 at 200 and 0 at 300 — and no similarity threshold is applied, because a threshold is a model inside a command specified to have none.`,
  }),
]);

// ── THE INSTALLED CORPUS ─────────────────────────────────────────────────────────────────────
//
// Discovered through the runtime local roots and the resource-kind plurals the model already
// declares, never a second spelling of a runtime directory. What runs is what is INSTALLED: the
// bundle source exists only in a framework checkout, and this repository's own installed copies
// already drift from its bundle, which is what makes the distinction operational rather than
// academic.

const toPosix = (value) => value.split(path.sep).join("/").split("\\").join("/");

async function collectMarkdown(dir, kindId, into, runtimeId) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // a runtime or kind this project does not install is an absence, not an error
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdown(full, kindId, into, runtimeId);
    } else if (entry.name.endsWith(".md")) {
      into.push({ full, kindId, runtimeId, text: await readFile(full, "utf8") });
    }
  }
}

/**
 * Every installed prompt document beneath `root`, as frozen
 * `{ path, kind, agentId, tools, text }` records ordered by path.
 *
 * `agentId` is the identity a grant is read against and is set for an AGENT-kind document only —
 * its own `name:` frontmatter, falling back to its basename. `tools` is the document's declared
 * grant, or null when it declares none; the distinction is load-bearing, because a document with
 * no `tools:` key grants nothing rather than granting everything.
 */
async function readInstalledPromptLayer(root) {
  const found = [];
  for (const runtime of Object.values(RUNTIMES)) {
    for (const kind of Object.values(RESOURCE_KINDS)) {
      await collectMarkdown(path.join(root, runtime.localRoot, kind.plural), kind.id, found, runtime.id);
    }
  }
  const documents = found.map((entry) => {
    const front = frontmatter(entry.text);
    const isAgent = entry.kindId === RESOURCE_KINDS.agent.id;
    return Object.freeze({
      path: toPosix(entry.full),
      runtime: entry.runtimeId,
      kind: entry.kindId,
      agentId: isAgent ? (front.get("name") ?? path.basename(entry.full, ".md")) : null,
      tools: isAgent ? toolList(front.get("tools")) : null,
      text: entry.text,
    });
  });
  documents.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return Object.freeze(documents);
}

// A leading `---` block as a map of scalar keys. Deliberately not a YAML parser: the two keys this
// lane reads are scalars, and a parser would be a dependency this family may not take.
function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const keys = new Map();
  if (match == null) return keys;
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (pair != null) keys.set(pair[1], pair[2].trim());
  }
  return keys;
}

// The grant, or null when the key is absent. An empty list is a DECLARED empty grant and is not the
// same answer as no key at all, so the two are kept apart here even though both currently yield a
// finding — a later capability could be granted by default, and this is where that would be decided.
function toolList(raw) {
  if (typeof raw !== "string") return null;
  return Object.freeze(raw.replace(/^\[|\]$/gu, "").split(",").map((tool) => tool.trim()).filter(Boolean));
}

// ── NORMALISATION: PARAGRAPHS FIRST, THEN CLAUSES ────────────────────────────────────────────
//
// A markdown code span WRAPS ACROSS LINES, and the only true positive in this repository's corpus
// breaks between two of its own tokens. A line-oriented reader misses it entirely — so whitespace
// is collapsed per PARAGRAPH before anything is split, which is also what makes reflow invisible
// to the duplication rule: the same sentence hand-wrapped to 100 columns in one document and 120
// in another is the same sentence.

function paragraphsOf(text) {
  return text.split(/\r?\n[ \t]*\r?\n/).map((block) => block.replace(/\s+/gu, " ").trim()).filter((block) => block.length > 0);
}

// Segments of `paragraph`, cut at any terminator in `terminators` that is NOT inside a code span.
// The backtick state is the point: a span naming a script file carries a full stop, and a splitter
// blind to spans would cut the only evidence this lane has in half.
function segments(paragraph, terminators) {
  const out = [];
  let start = 0;
  let inCode = false;
  for (let i = 0; i < paragraph.length; i += 1) {
    const char = paragraph[i];
    if (char === "`") inCode = !inCode;
    else if (!inCode && terminators.includes(char)) {
      out.push(paragraph.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  const tail = paragraph.slice(start).trim();
  if (tail.length > 0) out.push(tail);
  return out.filter((segment) => segment.length > 0);
}

// CLAUSE granularity (ADR-003 §4). The live instance shares ONE SENTENCE with the architect's
// instruction, so at sentence granularity two role words appear, the ambiguity rule fires, and the
// only true finding in the corpus is dropped. A comma and an em dash are deliberately NOT
// terminators: they join two role words into one clause, which reports nothing.
const clausesOf = (paragraph) => segments(paragraph, ".!?;");

// SENTENCE granularity for the duplication rule. A semicolon is not a terminator here — the
// measured byte-identical sentence carries one mid-way.
const sentencesOf = (paragraph) => segments(paragraph, ".!?");

// ── RULE ONE: THE CAPABILITY GAP ─────────────────────────────────────────────────────────────

// The capability a code span REQUIRES, or null. The space and the argument are the gate: they
// exclude an agent id and a slash command by construction rather than by an exception list.
function requiredCapability(span) {
  const shape = /^(\S+)[ ](\S[\s\S]*)$/u.exec(span.trim());
  if (shape == null) return null;
  for (const [capability, programs] of Object.entries(CAPABILITY_PROGRAMS)) {
    if (programs.includes(shape[1])) return capability;
  }
  return null;
}

// A form of `run`. A document that MENTIONS a command is not a document that orders one.
const ordersARun = (clause) => /\b(?:run|runs|running|ran)\b/iu.test(clause);

// Every bolded word in the clause that names a role in the declared map, in order and with
// repeats — the count is what decides attribution, and two mentions are an ambiguity whichever
// roles they name.
function boldedRoles(clause) {
  const found = [];
  for (const match of clause.matchAll(/\*\*([^*]+)\*\*/gu)) {
    const word = match[1].toLowerCase().replace(/[^a-z ]+/gu, " ").replace(/\s+/gu, " ").trim();
    for (const [role, words] of Object.entries(ROLE_WORDS)) {
      if (words.includes(word)) found.push(role);
    }
  }
  return found;
}

// THE GRANT IS SCOPED TO THE DOCUMENT'S OWN RUNTIME, and that is ADR-003 §5 rather than an extra.
// Measured on this repository: the three installed renderings of one agent are NOT the same
// document — `.claude`'s carries `tools: … Bash …`, Codex's carries no `tools:` key at all, and
// OpenCode's expresses its grant as a `permission:` block. Keyed by agent id ALONE, whichever
// rendering sorted last decided the grant for all three, so a Claude instruction was answered by an
// OpenCode file. That is precisely the mirrored list §5 forbids, one indirection along.
function grantKey(document, role) {
  return `${document.runtime ?? ""} ${role}`;
}

function capabilityFindings(documents, roleRouting) {
  const grants = new Map();
  for (const document of documents) {
    if (document.agentId != null) grants.set(grantKey(document, document.agentId), document.tools);
  }

  const findings = [];
  for (const document of documents) {
    for (const paragraph of paragraphsOf(document.text)) {
      for (const clause of clausesOf(paragraph)) {
        if (!ordersARun(clause)) continue;

        const capabilities = [];
        for (const match of clause.matchAll(/`([^`]+)`/gu)) {
          const capability = requiredCapability(match[1]);
          if (capability != null && !capabilities.includes(capability)) capabilities.push(capability);
        }
        if (capabilities.length === 0) continue;

        // Zero role words attributes to the document's OWN role, and only an agent document has
        // one. Two or more is an ambiguity and reports nothing.
        const roles = boldedRoles(clause);
        const role = roles.length === 1 ? roles[0] : (roles.length === 0 ? document.agentId : null);
        if (role == null) continue;

        // A role whose agent document is not in this corpus has an UNKNOWN grant, and an unknown
        // may not narrow to a claim: no document, no finding.
        if (!grants.has(grantKey(document, role))) continue;
        const granted = grants.get(grantKey(document, role)) ?? [];

        for (const capability of capabilities) {
          if (granted.includes(capability)) continue;
          findings.push(Object.freeze({
            code: "audit-agent-capability-gap",
            // Not this rule's choice: it follows the AUDITED configuration's routing for the role
            // the finding names, supplied among the inputs. The same gap is an error where a
            // project spawns that role and a warning where the main session plays it inline.
            severity: roleRouting?.[role] === "agent" ? "error" : "warn",
            path: document.path,
            message: `${document.path} orders \`${role}\` to run a program, and that role's \`tools:\` frontmatter does not grant \`${capability}\` — the subagent will read the instruction, be unable to obey it, and continue, so the step quietly does not happen. The clause: "${clause}"`,
          }));
        }
      }
    }
  }
  return findings;
}

// ── RULE TWO: THE DUPLICATED INSTRUCTION ─────────────────────────────────────────────────────

const byteLength = (value) => Buffer.byteLength(value, "utf8");

function duplicationFindings(documents, sentenceFloor) {
  // sentence → the DISTINCT documents carrying it. Distinct is what makes a sentence repeated
  // twice inside one document not a pair: one document cannot duplicate a rule ACROSS documents.
  const carriers = new Map();
  for (const document of documents) {
    const seen = new Set();
    for (const paragraph of paragraphsOf(document.text)) {
      for (const sentence of sentencesOf(paragraph)) {
        if (byteLength(sentence) < sentenceFloor) continue;
        seen.add(sentence);
      }
    }
    for (const sentence of seen) {
      if (!carriers.has(sentence)) carriers.set(sentence, new Set());
      carriers.get(sentence).add(document.path);
    }
  }

  // Aggregated per FILE PAIR, never per sentence group: 21 findings is a lint nobody reads, and
  // 18 pairs ranked by the bytes they cost is a list somebody acts on.
  const pairs = new Map();
  for (const [sentence, holders] of carriers) {
    if (holders.size < 2) continue;
    const paths = [...holders].sort();
    for (let i = 0; i < paths.length; i += 1) {
      for (let j = i + 1; j < paths.length; j += 1) {
        const key = `${paths[i]}\u0000${paths[j]}`;
        if (!pairs.has(key)) pairs.set(key, { left: paths[i], right: paths[j], bytes: 0, sentences: [] });
        const pair = pairs.get(key);
        pair.bytes += byteLength(sentence);
        pair.sentences.push(sentence);
      }
    }
  }

  return [...pairs.values()]
    .sort((a, b) => b.bytes - a.bytes || (a.left < b.left ? -1 : a.left > b.left ? 1 : (a.right < b.right ? -1 : 1)))
    .map((pair) => Object.freeze({
      code: "audit-instruction-duplicated",
      // Always `warn`, whatever the byte total. Eighteen pairs arrive on day one, and a rule that
      // fails eighteen builds on arrival is a rule that gets disabled; its value was never the
      // first eighteen, it is the nineteenth.
      severity: "warn",
      path: pair.left,
      message: `${pair.left} and ${pair.right} state ${pair.sentences.length} sentence(s) byte-identically — ${pair.bytes} redundant bytes. Editing one leaves the other instructing agents with the superseded wording. Duplicated: ${[...pair.sentences].sort().map((sentence) => `"${sentence}"`).join(" ")}`,
    }));
}

// ── THE LANE ─────────────────────────────────────────────────────────────────────────────────

/**
 * PURE over its inputs and the subject root. Returns `{ findings, reads, limits }`.
 *
 * Every input arrives on the call. No clock is read — `now` is accepted among the inputs and this
 * lane derives nothing from it, so two runs separated by real time are equal. No configuration key
 * is reached for: the role routing is RESOLVED BY THE FACE and supplied here.
 *
 * THE CORPUS IS NOT AN INJECTION POINT, deliberately. A `documents` parameter was written and then
 * removed at review: nothing called it, and an exported seam with no production caller is precisely
 * what 77/02's lane exists to name — a bound that lives only in prose. The subject root is the one
 * door, the reader behind it is private, and the lane opens no file for writing, so the corpus it
 * audits is unchanged by having been audited.
 */
export async function runPromptLayer({
  root,
  roleRouting = {},
  sentenceFloor = SENTENCE_FLOOR,
  sweeps = PROMPT_LAYER_SWEEPS,
  now = null,
} = {}) {
  void now;
  const corpus = await readInstalledPromptLayer(root);
  const subjectRoot = toPosix(String(root ?? ""));

  const findings = [
    ...capabilityFindings(corpus, roleRouting),
    ...duplicationFindings(corpus, sentenceFloor),
  ];

  const reads = sweeps.map((sweep) => readRecord(sweep, corpus.length, subjectRoot));

  // Emitted on EVERY run, clean or not, derived from the registry rather than hand-maintained: a
  // sweep declaring `basis: "text"` contributes one, so a third text sweep cannot arrive without
  // declaring what it cannot see.
  const limits = sweeps
    .filter((sweep) => sweep.basis === "text")
    .map((sweep) => limitRecord({
      sweep: sweep.id,
      basis: sweep.basis,
      question: sweep.question,
      answeredBy: null,
      consequence: sweep.blindness({ sentenceFloor }),
      authority: null,
    }));

  return Object.freeze({ findings: Object.freeze(findings), reads: Object.freeze(reads), limits: Object.freeze(limits) });
}
