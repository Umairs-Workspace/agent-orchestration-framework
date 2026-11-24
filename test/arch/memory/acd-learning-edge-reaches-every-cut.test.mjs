import { readBundleProse } from "../../support/cli-spawn.mjs";
import { defaultApplication as _aofApplication } from "aof/default-application";
// FF-12405 — "The learning edge reaches EVERY cut-making command, in a form the shipped CLI
// actually parses, and the edited bundle source re-renders into all three of its mirrors."
//
// milestone 124 / story 02, ADR-007. Four claims, and each one is a claim about a different tree:
//
//   1. `shatter.md` carries ONE PO recall, keyed to the seam, placed before the cut (task 00).
//   2. Every verb and flag a recall block spells resolves in `packages/core/src/work/memory.mjs`'s OWN parse
//      surface — never in `memoryUsage()`, never in `--help`, never in the command registry, which
//      has no `work memory` entry to find (task 01).
//   3. The cut-making roster is named and asserted in BOTH directions, so a third cutter cannot
//      arrive without a recall and the roster cannot be shrunk to keep this green (task 02).
//   4. The three tracked renders of the edited member match a fresh re-render, and the two hash
//      records agree where they overlap (task 03).
//
// WHY THE SURFACE IS READ FROM CODE. `aof work memory` WAS a deliberately-unrouted door:
// `packages/core/src/cli.mjs` dispatched it by string compare and `packages/core/src/command-core.mjs` named it nowhere, so a
// registry lookup found nothing and a lenient one passed forever. Story 128 registered it
// (`work:memory`, route `work memory`), and the surface is STILL the seam: the routed command's
// `cli.argv` re-serialises the face's parse and hands it to `parseMemoryArgv`, so the module's own
// branches remain the one place a flag either resolves or does not. Worse, an invented flag produces
// NO runtime signal — `parseMemoryArgv` skips an unknown flag without consuming its value, so the
// value falls through to the positionals and is folded into the query. `--scope architecture` exits
// 0 and silently rewrites the question. There is nothing downstream to catch it, which is the whole
// reason this assertion is static.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MEMORY_VERBS = _aofApplication.knowledge.work.memory.MEMORY_VERBS;
const SCOPE_FLAGS = _aofApplication.knowledge.work.memory.SCOPE_FLAGS;
import { loadBundle, renderBundleOutputs, readDescriptor } from "../../../packages/core/src/work/bundle.mjs";
import { assetPath } from "../../../packages/core/src/asset-base.mjs";
import { hashContent } from "../../../packages/core/src/lock.mjs";
const listCommands = _aofApplication.listCommands;

const root = fileURLToPath(new URL("../../../", import.meta.url));
const slash = (value) => String(value).split("\\").join("/");
const read = (rel) => readBundleProse(rel, root);

const COMMANDS_DIR = "packages/acd/assets/commands";
const SHATTER = `${COMMANDS_DIR}/shatter.md`;
const REFINE = `${COMMANDS_DIR}/refine.md`;
const RETROSPECTIVE = `${COMMANDS_DIR}/retrospective.md`;

// ────────────────────────────────────────────────── reading an invocation, not a line ──
//
// Markdown wraps a command mid-token: `refine.md`'s block ends one line at `aof memory` and
// begins the next at `recall "<…>" --area architecture --block`. A per-line regex reads that as
// one invocation with no verb and no flags — which is the shape most likely to pass vacuously. So
// every reading below is over the JOINED body, and an invocation runs to the end of its sentence.
const joined = (text) => text.replace(/\r?\n\s*/gu, " ");

// One invocation: `aof memory <verb> …` up to the terminator that ends a command in prose.
// The trailing set is deliberately narrow — a backtick closes an inline code span, and `.`/`;`/`—`
// end the sentence that carries it.
const INVOCATION = /aof memory\s+([a-z-]+)((?:\s+(?:--[a-z-]+(?:=[^\s`]+)?|"[^"]*"|`[^`]*`|<[^>]*>|[A-Za-z0-9_./-]+))*)/gu;

function invocationsIn(text) {
  return [...joined(text).matchAll(INVOCATION)].map((match) => ({
    verb: match[1],
    tail: match[2] ?? "",
    flags: [...(match[2] ?? "").matchAll(/--[a-z-]+/gu)].map((flag) => flag[0]),
    whole: match[0],
  }));
}

// ─────────────────────────────────────────────────── the recall block, cut STRUCTURALLY ──
//
// NOT a fixed window. `47/F-47-04-ARCH-2` names the species: a `+ N` character or line window
// measures the LENGTH of the region containing the thing the rule is about, and this repo has
// measured six instruments made confidently wrong about the TREE that way. The recall block has a
// real boundary — it begins at its own bolded lead and ends where step 2's numbered heading begins
// — so the cut is made against those, and a cut that cannot be made returns `null` and the caller
// reports NOT FOUND loudly rather than asserting over the wrong region.
const STEP_HEADING = /^\d+\. \*\*/u;

function recallBlock(text) {
  const lines = text.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.includes("**Recall prior lessons first"));
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && STEP_HEADING.test(line));
  if (end < 0) return null;
  return { lines, start, end, text: joined(lines.slice(start, end).join("\n")) };
}

// 169/01 — an integration's command lives in its own package (169/ADR-004), so the census is core's
// command directory PLUS every contributed command member, each read from where it lives.
const contributedCommands = () => new Map(readDescriptor().members
  .filter((member) => member.kind === "command" && member.assetClass)
  .map((member) => [path.basename(member.file), slash(path.relative(root, path.join(assetPath(member.assetClass), member.file)))]));

/** Every `.md` under the bundle's command directory, plus every contributed command, sorted. */
const commandFiles = () => [...readdirSync(path.join(root, COMMANDS_DIR)).filter((name) => name.endsWith(".md")), ...contributedCommands().keys()]
  .sort();

/** A command file's repo-relative path: core's directory, or the package that contributes it. */
const commandRel = (name) => contributedCommands().get(name) ?? `${COMMANDS_DIR}/${name}`;

// ──────────────────────────────────────────────────────────────── the cut roster ──
//
// AUTHORED, and it has to be. `grep -ln "aof-product-owner"` answers SIX files and five of them
// frame or insert exactly one named item — spawning the PO does not make a command a cutter. So
// membership is stated, and the direction that bites is the one that refuses an UNCLASSIFIED file:
// every command file is on this roster or on the excluded list with its own reason, and the union
// must equal the directory listing. A 27th command then reds this control by EXISTING.
const CUT_MAKING = Object.freeze({
  "shatter.md": "partitions one PRD into many drivers",
  "refine.md": "partitions one milestone into many stories",
});

// Each exclusion carries its reason, because a list of bare filenames cannot tell a considered
// exclusion from an oversight — which is the failure this direction exists to prevent.
const EXCLUDED = Object.freeze({
  "add-chore.md": "creates one chore; partitions nothing",
  // 151 — re-runs refine's diagram step for an existing item's briefed ADRs; no partition, no memory call.
  "add-diagram.md": "draws an existing item's ADR diagrams; cuts nothing",
  "add-milestone.md": "frames one named driver; spawns the PO but partitions nothing",
  // PR #13 — answers one human request about a saved Excalidraw draft or proposes element operations; no partition, no memory call.
  "diagram-review.md": "answers or proposes changes for one diagram draft request; cuts nothing",
  "add-spike.md": "creates one spike; partitions nothing",
  "add-story.md": "adds one story to an existing milestone",
  "add-task.md": "adds one task feature",
  "add-uat.md": "creates one uat session",
  // 127/03 task 04 — the one wrapper over `work:archive`: moves ONE done driver's folder under
  // `archive/`, name verbatim; spawns no agent, carries no memory call, partitions nothing.
  "archive.md": "archives one done driver's folder under archive/; no partition",
  "assimilate-code.md": "governs code already written; its memory call is `ingest`",
  "autonomous.md": "sequences existing items through the loop shell; cuts nothing",
  "continue.md": "builds an existing story; carries its own recall regardless",
  "delegate.md": "sets two model decisions",
  // 150 — says what items are for, composed of the read verbs; writes nothing, carries no memory call.
  "explain.md": "explains items; reads only, cuts nothing",
  // The Hyperagent integration (contributed by @aof/integration-hyperagent since 169/01) — hands
  // planning to the AOF Planner over MCP; the partition is made by the planner's own shatter/refine
  // skills, which carry their recall, never by this delegation.
  "hyperplan.md": "delegates planning to Hyperagent; the cut is the planner's shatter or refine, not this command's",
  "feedback.md": "captures one raw entry",
  "init.md": "installs ACD and authors a config",
  "insert-chore.md": "inserts one chore at a position and renumbers; no partition",
  "insert-milestone.md": "inserts one driver at a position and renumbers; no partition",
  "insert-story.md": "inserts one story at a position; no partition",
  "insert-uat.md": "inserts one uat session at a position; no partition",
  // 145 — draws the waves the loop's own rules already computed (`aof diagram plan <ref> loop`);
  // it reads a partition, never makes one, and carries no memory call.
  "loop-diagram.md": "draws an existing milestone's wave plan; cuts nothing",
  // 179/00 — 149's guide moved out of continue into its own command; it builds nothing and cuts nothing.
  "manual.md": "guides the operator's own build of one story; cuts nothing",
  // 190/04 — declares the project's `work.test` layout and proves it by replay; no partition, no memory call.
  "map-tests.md": "declares one project's test layout in its config; cuts nothing",
  "migrate.md": "migrates one source folder into one milestone",
  "observe.md": "reads transcript telemetry",
  "pay-debt.md": "pays down ledger entries in the files at hand",
  // 127/02 task 04 — the one wrapper over `work:promote`: moves ONE backlog item into the numbered
  // stream and mints its number; spawns no agent, carries no memory call, partitions nothing.
  "promote.md": "promotes one backlog item into the stream and mints its number; no partition",
  // 168/01 — builds one prototype inline in the operator's session; no partition, no memory call.
  "prototype.md": "builds one prototype in the operator's session; cuts nothing",
  // 163 — the wrapper over `work:questions`: prints the loop's open questions; answers none.
  "questions.md": "reads the loop's open questions; answers none, cuts nothing",
  "recent.md": "reads the stream chronologically",
  // 147 — the session a loop hands a halt to: repairs its cause and cuts nothing. Classified at 149,
  // whose run of this control first met it unclassified; widened past the lane halts 2026-11-14.
  "repair.md": "repairs one loop halt's cause; cuts nothing",
  "retrospective.md": "distils one milestone's lessons",
  // 149 — reviews the operator's own build through continue's ladder and lanes; fixes nothing.
  "review.md": "reviews one story's build; cuts nothing",
  // 179/02 — teaching: the human writes one story's code while AOF teaches; no partition, no memory call.
  "teach.md": "teaches the operator one story's build; cuts nothing",
  "validate.md": "a structural check that spawns no agent and cuts nothing",
  "verify.md": "accepts an item; its memory calls are `ingest`",
});

// ───────────────────────────────────────────── FF-15303 · the capture protocol, per edge ──
//
// 153/04, ADR-004. Every declared decision-recall edge records its OWN completed observation, so the
// control is stated per EDGE and every failure names the edge it belongs to. An edge is a block of
// shipped prose cut structurally (from its bolded lead to the next numbered step), then read as
// invocations over the joined body — never as a grep for a new verb. The checks a protocol owes:
//   - the recall keeps its existing filters, exactly (the retrieval is unchanged);
//   - the observation is retained from the ACTUAL result and never re-retrieved;
//   - every returned record carries an explicit verdict (honoured / departed / irrelevant), no default;
//   - ONE record-recall submission, AFTER the recall, with the edge's own attribution and scope;
//   - the empty result is still submitted (`"records": []`), with no verdict or retrieval invented.
const EDGES = Object.freeze({
  "shatter-po": {
    file: SHATTER,
    lead: "**Recall prior lessons first — ONCE",
    recallFlags: ["--block"],
    capture: "<observation file>",
    refPlaceholder: "<first driver ref>",
    must: [
      [/`edge` `shatter-po`/u, "names its edge"],
      [/`actor` `product-owner`/u, "attributes the product owner"],
      [/`scope` `\{\}`/u, "keeps the original unscoped query"],
      [/first driver in PRD order/u, "assigns the single ledger owner"],
      [/cites that owner/u, "has every other driver cite the owner"],
      [/never replayed per driver/u, "never replays the recall per driver"],
      [/no ledger capture\s+was completed/u, "reports an incomplete capture when no driver exists"],
      [/placeholder item or recall store/u, "invents no placeholder item or sibling store"],
    ],
  },
  "refine-architect": {
    file: REFINE,
    lead: "**Recall prior lessons first (before",
    recallFlags: ["--area", "--block"],
    capture: "<architect observation file>",
    refPlaceholder: "<ref>",
    must: [
      [/edge\s+`refine-architect`/u, "names its edge"],
      [/actor\s+`architect`/u, "attributes the architect"],
      [/scope `\{"area":"architecture"\}`/u, "keeps the architect's area filter in the scope"],
    ],
  },
  // 201/ADR-006 §2 — the PO asks by the item's title, with no item filter: an item that has just
  // entered the stream has no records, so the item-scoped recall was empty by construction (177
  // measured it empty on 12 of 14 recalls).
  "refine-po": {
    file: REFINE,
    lead: "**Recall prior lessons first (before",
    recallFlags: ["--block"],
    capture: "<PO observation file>",
    refPlaceholder: "<ref>",
    must: [
      [/edge\s+`refine-po`/u, "names its edge"],
      [/actor\s+`product-owner`/u, "attributes the product owner"],
      [/aof memory recall "<the item's title,\s+verbatim>" --block/u, "asks by the item's title, verbatim"],
      [/the item's title as its `query` and scope `\{\}`/u, "records the title as the query and an empty scope"],
    ],
  },
  "continue-developer": {
    file: `${COMMANDS_DIR}/continue.md`,
    lead: "**Recall prior gotchas first",
    recallFlags: ["--block", "--kind"],
    capture: "<observation file>",
    refPlaceholder: "<ref>",
    must: [
      [/`edge` `continue-developer`/u, "names its edge"],
      [/`actor` `developer`/u, "attributes the developer"],
      [/`scope` `\{"kind":"near-miss"\}`/u, "keeps the existing near-miss filter in the scope"],
      [/no verdict and no extra retrieval is invented/u, "invents no verdict and no second retrieval"],
    ],
  },
  // milestone 157 / ADR-004 — FF-15702: two more decision edges, each refreshing the index first.
  "continue-episodic": {
    file: `${COMMANDS_DIR}/continue.md`,
    lead: "**Recall the prior attempt on a retry",
    recallFlags: ["--item", "--area", "--all", "--json"],
    ingestFirst: true,
    capture: "<episodic observation file>",
    refPlaceholder: "<ref>",
    must: [
      [/`edge` `continue-episodic`/u, "names its edge"],
      [/`actor` `developer`/u, "attributes the developer"],
      [/`scope` `\{"item":"<ref>","area":"delivery"\}`/u, "keeps the item's delivery scope"],
      [/attempt 2 or later/u, "runs on attempt 2 or later"],
      [/Attempt 1 has no episodic edge/u, "has no edge on attempt 1"],
      [/BEFORE any implementation/u, "recalls before any implementation"],
      [/`retryOf` names, otherwise the latest terminal earlier attempt/u, "identifies the prior attempt through retryOf"],
      [/evidence is unavailable/u, "reports unavailable evidence rather than inventing it"],
      [/No stage filter/u, "hides no verify finding behind a stage filter"],
    ],
  },
  "verify-finding": {
    file: `${COMMANDS_DIR}/verify.md`,
    lead: "**Recall prior findings at triage",
    recallFlags: ["--kind", "--block"],
    ingestFirst: true,
    capture: "<triage observation file>",
    refPlaceholder: "<ref>",
    must: [
      [/`edge` `verify-finding`/u, "names its edge"],
      [/`actor` `verifier`/u, "attributes the verifier"],
      [/`scope` `\{"kind":"finding"\}`/u, "keeps the finding kind in the scope"],
      [/no item and no stage filter/u, "recalls across the whole stream"],
      [/excluding the finding's own identity/u, "excludes the finding being triaged"],
      [/never closed automatically/u, "never closes a match automatically"],
      [/not a duplicate by id alone/u, "never matches a bare F id across items"],
    ],
  },
  // 201/ADR-006 §3 — FF-20106: the retrospective's two recalls are edges like the others. Each
  // recall sits where it is used (before triage; in the evidence step) and both captures sit in one
  // later step, so the block these two are read over is the whole `<process>`, not one step.
  "retrospective-domain": {
    file: RETROSPECTIVE,
    lead: "<process>",
    until: "</process>",
    recallFlags: ["--block"],
    capture: "<domain observation file>",
    refPlaceholder: "<ref>",
    must: [
      [/`edge` `retrospective-domain` and `scope` `\{\}`/u, "names its edge and its empty scope"],
      [/`actor` `product-owner`/u, "attributes the product owner"],
      [/`honoured`: the earlier lesson stopped a duplicate from being written, or earned a new lesson its `Recurs`/u, "says what honoured means for the domain recall"],
      [/`departed`: it was judged close, and a new lesson was written anyway/u, "says what departed means for the domain recall"],
      [/`irrelevant`: neither/u, "says what irrelevant means for the domain recall"],
    ],
  },
  "retrospective-evidence": {
    file: RETROSPECTIVE,
    lead: "<process>",
    until: "</process>",
    recallFlags: ["--item", "--area", "--all", "--json"],
    ingestFirst: true,
    capture: "<evidence observation file>",
    refPlaceholder: "<ref>",
    must: [
      [/`edge` `retrospective-evidence`, `query` `""` and `scope` `\{"item":"<ref>","area":"delivery"\}`/u, "names its edge, its empty query and the item's delivery scope"],
      [/`actor` `product-owner`/u, "attributes the product owner"],
      [/`honoured`: a lesson cites the record/u, "says what honoured means for the evidence recall"],
      [/`irrelevant`: it carried no lesson/u, "says what irrelevant means for the evidence recall"],
      [/Evidence is never `departed`/u, "gives the evidence recall no departed verdict"],
    ],
  },
});

/**
 * The edge's own block, joined: from its bolded lead to the next numbered step heading — or, for an
 * edge whose recall and capture sit in different steps, to the line its spec names as `until`.
 */
function edgeBlock(text, lead, until) {
  const lines = text.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.includes(lead));
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && (until == null ? /^\s*\d+\. \*\*/u.test(line) : line.includes(until)));
  if (end < 0) return null;
  return joined(lines.slice(start, end).join("\n"));
}

/** Every protocol failure of ONE edge over a rendered procedure body; empty when the edge is whole. */
function edgeFailures(text, edge) {
  const spec = EDGES[edge];
  const block = edgeBlock(text, spec.lead, spec.until);
  if (block == null) return [`${edge}: the recall block was not found by its lead`];
  const failures = [];
  const calls = invocationsIn(block);
  const recall = calls.filter((call) => call.verb === "recall" && sameFlags(call.flags, spec.recallFlags));
  const captures = calls.filter((call) => call.verb === "record-recall" && call.tail.includes(spec.capture));
  if (recall.length !== 1) failures.push(`${edge}: expected exactly one recall spelling ${spec.recallFlags.join(" ")} (found ${recall.length})`);
  if (captures.length !== 1) failures.push(`${edge}: expected exactly one record-recall submission (found ${captures.length})`);
  else {
    if (!captures[0].flags.includes("--input") || captures[0].flags.length !== 1) failures.push(`${edge}: the submission spells --input alone`);
    if (!captures[0].tail.includes(spec.refPlaceholder)) failures.push(`${edge}: the submission names ${spec.refPlaceholder}`);
    if (recall.length === 1 && block.indexOf(recall[0].whole) > block.indexOf(captures[0].whole)) failures.push(`${edge}: the recall must precede its capture`);
  }
  if (spec.ingestFirst) {
    const ingest = calls.find((call) => call.verb === "ingest");
    if (ingest == null || (recall.length === 1 && block.indexOf(ingest.whole) > block.indexOf(recall[0].whole))) failures.push(`${edge}: the index is refreshed (ingest) before the recall`);
  }
  const checks = [
    [/actual result/u, "retains the recall's actual result"],
    [/never re-runs? the recall/iu, "never re-runs the recall to rebuild the result"],
    [/explicit verdict `honoured`,\s+`departed`\s+or `irrelevant`/u, "requires an explicit per-record verdict"],
    [/never a default/u, "allows no default verdict"],
    [/`item`, `id` and\s+`recordType`/u, "retains each returned identity"],
    [/empty block is still\s+submitted, as `"records": \[\]`/u, "submits an empty result as an empty observation"],
    [/fresh UUID/u, "mints one id per recall"],
    ...spec.must,
  ];
  for (const [pattern, what] of checks) if (!pattern.test(block)) failures.push(`${edge}: ${what}`);
  return failures;
}

const sameFlags = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/** The same body with ONE edge's capture obligation removed — the red probe. */
function withoutCapture(text, edge) {
  const spec = EDGES[edge];
  // Whitespace inside a placeholder may wrap across lines, so every space is read as `\s+`.
  const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").replace(/ /gu, "\\s+");
  const capture = new RegExp(`aof memory\\s+record-recall\\s+${literal(spec.refPlaceholder)}\\s+--input\\s+${literal(spec.capture)}`, "u");
  assert.ok(capture.test(text), `guard: ${edge}'s capture invocation was located in the body it is being removed from`);
  return text.replace(capture, "aof memory (capture removed)");
}

// 157/ADR-004 — the retrospective gathers its episodic evidence through recall: the observability
// refresh, then ingest, then ONE `--item <ref> --area delivery --all --json` recall, inside its
// evidence step and before the recurrence pass. Every failure names the retrospective.
function retrospectiveEvidenceFailures(text) {
  const failures = [];
  const lines = text.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.startsWith("2. **Gather the evidence through recall**"));
  const end = lines.findIndex((line, index) => index > start && STEP_HEADING.test(line));
  if (start < 0 || end < 0) return ["retrospective: the evidence step was not found by its lead"];
  const body = joined(text);
  const step = joined(lines.slice(start, end).join("\n"));
  const calls = invocationsIn(step);
  const evidence = calls.filter((call) => call.verb === "recall" && sameFlags(call.flags, ["--item", "--area", "--all", "--json"]) && call.tail.includes("<ref>") && call.tail.includes("delivery"));
  const ingest = calls.find((call) => call.verb === "ingest");
  if (evidence.length !== 1) failures.push(`retrospective: expected exactly one --item <ref> --area delivery --all --json evidence recall (found ${evidence.length})`);
  if (ingest == null || (evidence.length === 1 && step.indexOf(ingest.whole) > step.indexOf(evidence[0].whole))) failures.push("retrospective: the index is refreshed (ingest) before the evidence recall");
  const observe = body.indexOf("aof work observe");
  if (observe < 0 || observe > body.indexOf(step)) failures.push("retrospective: the observability refresh precedes the evidence step");
  if (evidence.length === 1 && body.indexOf(evidence[0].whole) > body.indexOf("aof memory recurrence")) failures.push("retrospective: the evidence is gathered before the recurrence pass");
  for (const [pattern, what] of [
    [/never enumerate `VERIFICATION\.md`, `FEEDBACK\.ndjson` or run records as the evidence path/u, "makes recall the evidence path, not a raw-file enumeration"],
    [/report the episodic evidence as unavailable — do not fall back to reading the raw ledgers/u, "reports unavailable evidence rather than reading raw ledgers"],
    [/do not count it twice/u, "never counts STATE's feedback projection twice"],
  ]) if (!pattern.test(step)) failures.push(`retrospective: ${what}`);
  // 201/ADR-006 §3 supersedes the last sentence of 157/ADR-004: the evidence recall IS recorded now
  // (`retrospective-evidence`), so the sentence that kept it off the ledger must be gone.
  if (/records\s+no recall observation/u.test(body)) failures.push("retrospective: still says the evidence step records no recall observation");
  return failures;
}

// ──────────────────────────────── FF-20106 · every recall has a capture that names its edge ──
//
// 201/ADR-006's invariant, read per command FILE and in both directions: every `aof memory recall`
// the file spells is claimed by exactly one edge on the roster (by its flags), that edge's capture
// follows it, and the file names the edge; and every roster edge of the file claims a recall. So a
// ninth recall cannot arrive without a capture, and the roster cannot keep an edge nothing runs.

/** Every edge a body names: the token after `edge` in a capture's own words. */
const namedEdges = (text) => [...joined(text).matchAll(/`?edge`?\s+`([a-z]+-[a-z-]+)`/gu)].map((match) => match[1]);

function recallPairingFailures(name, text) {
  const failures = [];
  const mine = Object.entries(EDGES).filter(([, spec]) => path.basename(spec.file) === name);
  const body = joined(text);
  const calls = invocationsIn(text);
  const named = namedEdges(text);
  const claimed = new Set();
  for (const call of calls.filter((each) => each.verb === "recall")) {
    const owner = mine.find(([edge, spec]) => !claimed.has(edge) && sameFlags(call.flags, spec.recallFlags));
    if (owner == null) {
      failures.push(`${name}: \`${call.whole}\` belongs to no declared edge`);
      continue;
    }
    const [edge, spec] = owner;
    claimed.add(edge);
    const capture = calls.find((each) => each.verb === "record-recall" && each.tail.includes(spec.capture));
    if (capture == null || body.indexOf(capture.whole) < body.indexOf(call.whole)) failures.push(`${edge}: its recall is followed by no capture`);
    if (!named.includes(edge)) failures.push(`${edge}: its capture does not name the edge`);
  }
  for (const [edge] of mine) if (!claimed.has(edge)) failures.push(`${edge}: ${name} runs no recall for it`);
  return failures;
}

/** One member as every reader is handed it: the bundle's source and its three tracked renders. */
const handedTo = (member) => [
  ["the bundle's source", `${COMMANDS_DIR}/${member}.md`],
  ["claude", `.claude/commands/aof/${member}.md`],
  ["codex", `.agents/skills/aof-${member}/procedure.md`],
  ["opencode", `.opencode/commands/aof/${member}.md`],
].map(([reader, rel]) => ({ reader, rel, text: read(rel) }));

/** The memory seam's own flag vocabulary — `parseMemoryArgv`'s branches plus the scope flags. */
function seamFlags() {
  const parse = /function parseMemoryArgv[\s\S]*?\n\}/u.exec(read("packages/knowledge/src/memory.mjs"))?.[0] ?? "";
  assert.ok(parse.length > 0, "guard: the parse function was located");
  return new Set([...[...parse.matchAll(/key === "([a-z-]+)"/gu)].map((match) => `--${match[1]}`), ...SCOPE_FLAGS.map((flag) => `--${flag}`)]);
}

export const archTests = [
  {
    name: "arch/124/02 FF-12405 leg 1 (task 00): shatter carries exactly ONE memory invocation, it is a PO recall, and it runs before the cut",
    run: () => {
      const text = read(SHATTER);
      const calls = invocationsIn(text);
      // 153/04 — the recall is still the ONE retrieval; the second invocation is the capture of its result.
      assert.deepEqual(calls.map((call) => call.verb), ["recall", "record-recall"], `shatter spells exactly one recall and then its one capture, never an \`ingest\` (found ${calls.map((call) => call.verb).join(", ")})`);

      // THE ROLE. The block names the role that runs it, and it is the one the `<process>` spawns.
      const lines = text.split(/\r?\n/u);
      const at = lines.findIndex((line) => line.includes("aof memory"));
      assert.ok(at >= 0, "guard: the invocation was located by line");
      // CUT STRUCTURALLY AND READ OVER JOINED LINES. Structurally, because a `+ N` window measures
      // the length of the region rather than finding it; joined, because markdown wraps prose
      // mid-phrase and `An **empty block means nothing to / surface**` is exactly the sentence a
      // per-line reading would miss while the clause it checks for is plainly there.
      const cut = recallBlock(text);
      assert.ok(cut != null, "the recall block was located by its own lead and by the step heading that ends it — NOT FOUND is reported loudly rather than asserted over the wrong region");
      const block = cut.text;
      assert.ok(block.includes("aof-product-owner"), "the block names `aof-product-owner` as the role that runs it");
      assert.equal(/aof-architect/u.test(text), false, "no clause in the file names an architect at all, let alone one running a recall");

      // PLACEMENT: after step 1's seam read, before step 2's heading.
      const stepTwo = lines.findIndex((line) => line.startsWith("2. **Identify the drivers"));
      const stepThree = lines.findIndex((line) => line.startsWith("3. **Frame each driver"));
      const seam = lines.findIndex((line) => line.startsWith("1. **Read the seam"));
      assert.ok(seam >= 0 && stepTwo > seam && stepThree > stepTwo, "guard: the numbered steps were located and keep their order");
      assert.ok(at > seam, "the recall sits after step 1's seam read");
      assert.ok(at < stepTwo, "…and before step 2 identifies the drivers");

      // ONCE PER PRD, never once per driver.
      assert.ok(/ONCE for this PRD|Once for the PRD session/u.test(block), "the block states the recall runs once for the PRD session");
      assert.ok(/never once per driver/u.test(block), "…and says explicitly that it is not per driver");

      // THE EMPTY CASE, and the recall's unconditionality.
      assert.ok(/empty block means nothing to surface/u.test(block), "an empty block means nothing to surface");
      assert.ok(/proceed unchanged/u.test(block), "…and the instruction is to proceed unchanged");
      assert.ok(/unconditionally/u.test(block), "the recall itself is unconditional — running it does not depend on memory being enabled");

      // THE ACKNOWLEDGEMENT IS AN OUTCOME, and it lands in a driver's record doc — never in
      // documents that do not exist at framing time.
      assert.ok(/honoured, or consciously departed from/u.test(block), "a surfaced near-miss is honoured or consciously departed from");
      assert.equal(/ARCHITECTURE\.md|STATE\.md/u.test(block), false, "…with no escape to a document framing time has not created");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 2 (task 00): the acknowledgement names only headings the driver's OWN template declares",
    run: () => {
      const cut = recallBlock(read(SHATTER));
      assert.ok(cut != null, "the recall block was located structurally, by its lead and the step heading that ends it");
      const named = [...cut.text.matchAll(/`## ([^`]+)`/gu)].map((match) => match[1].trim());
      assert.ok(named.length >= 2, `the clause names at least two headings (found ${named.length})`);

      // The two record docs shatter frames, and the headings each template really declares. ADR-007
      // §4 was AMENDED for exactly this: a spike's template has neither `## Scope` nor
      // `## Dependencies`, so a fixed pair of section names would name a heading half the drivers
      // do not have.
      const templates = {
        milestone: ".aof/templates/work/milestone/SPEC.md",
        spike: ".aof/templates/work/spike/SPIKE.md",
      };
      const declared = new Map();
      for (const [type, rel] of Object.entries(templates)) {
        const headings = [...read(rel).matchAll(/^## (.+)$/gmu)].map((match) => match[1].trim());
        assert.ok(headings.length > 0, `guard: ${rel} declares headings`);
        declared.set(type, headings);
      }
      assert.ok(declared.get("milestone").includes("Scope"), "guard: the milestone template really declares `## Scope`");
      assert.equal(declared.get("spike").includes("Scope"), false, "guard: the spike template really does NOT — which is what §4 was amended for");

      // EVERY named heading resolves in AT LEAST ONE of the two templates, and the clause covers
      // BOTH types: a clause naming only milestone headings sends a spike's acknowledgement nowhere.
      const all = new Set([...declared.get("milestone"), ...declared.get("spike")]);
      for (const heading of named) {
        assert.ok(all.has(heading), `\`## ${heading}\` is declared by a template shatter frames`);
      }
      assert.ok(named.some((heading) => declared.get("milestone").includes(heading)), "the clause reaches a milestone's own headings");
      assert.ok(named.some((heading) => declared.get("spike").includes(heading)), "…and a spike's");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 3 (task 00): the query is keyed to the seam, and refine is read rather than written",
    run: () => {
      const shatter = read(SHATTER);
      const call = invocationsIn(shatter).find((each) => each.verb === "recall");
      const query = /"([^"]*)"/u.exec(call.whole)?.[1] ?? "";
      assert.ok(query.length > 0, "the invocation carries a quoted query");
      assert.ok(/objective/iu.test(query) && /scope/iu.test(query), "…keyed to the PRD's objective and scope words — the read-out `readSeam` pins");
      assert.equal(/<ref>|\bNN\b/u.test(query), false, "…and it carries no item-ref placeholder");

      // THE ROLES THE COMMAND SPAWNS ARE UNCHANGED. `aof-researcher` appears at `:53` as PROSE
      // about what `aof:refine` does later — a role sweep that counted it would report two.
      const roles = [...shatter.matchAll(/aof-[a-z-]+/gu)].map((match) => match[0]);
      assert.deepEqual([...new Set(roles)].sort(), ["aof-product-owner", "aof-researcher"], "guard: two role tokens appear, and only one is a spawn");
      assert.ok(/Spawn `aof-product-owner`/u.test(shatter), "the `<process>` spawns the product owner");
      assert.equal(/Spawn `aof-researcher`/u.test(shatter), false, "…and never the researcher");

      // REFINE IS READ, NEVER WRITTEN — the property is asserted over the WORKING tree: refine.md
      // still carries exactly its two recall invocations, the architect's and the PO's. It used to
      // be a byte-identity check against `git show HEAD:`, which was a commit-timing tripwire rather
      // than a control — red for every uncommitted legitimate edit to the file (a story's Step 0, a
      // driving-shell hunk) and trivially green after ANY commit, so it guarded nothing (127/02,
      // 2026-09-13). What shatter must not do is take one of these two away or add a third.
      const refineCalls = invocationsIn(read(REFINE)).filter((call2) => call2.verb === "recall");
      assert.equal(refineCalls.length, 2, "refine.md carries exactly its two recalls");
      assert.ok(refineCalls.some((call2) => call2.flags.includes("--area")), "the architect's, with `--area`");
      // 201/ADR-006 §2 — the PO's lost its `--item`: it asks by the item's title, with no filter.
      assert.ok(refineCalls.some((call2) => sameFlags(call2.flags, ["--block"])), "and the PO's, with `--block` alone");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 4 (task 01): the surface is read from CODE — the door is asserted routed (story 128) with the seam still its parser, and every token a carrier spells resolves in it",
    run: () => {
      // THE REGISTRY CARRIES THE DOOR (story 128: `work:memory`, route `work memory`), and the surface
      // below is STILL the module, because the routed command's `cli.argv` defers to `parseMemoryArgv`
      // — a registry lookup finds the door but not the flag vocabulary the carriers spell. Asserted,
      // not assumed, so a second unrouting (or a route rename) reds here rather than passing quietly.
      const registered = listCommands().map((command) => (command.cli?.route ?? []).join(" "));
      assert.equal(registered.includes("work memory"), true, "a registered command's route is `work memory` — the door rides the route table since story 128");

      // THE SURFACE: the seam module's own exports, plus `parseMemoryArgv`'s own branches. Never
      // `memoryUsage()` and never `--help`, neither of which knows `--block` — the one flag both
      // carriers actually spell.
      const memory = read("packages/knowledge/src/memory.mjs");
      const parse = /function parseMemoryArgv[\s\S]*?\n\}/u.exec(memory)?.[0] ?? "";
      assert.ok(parse.length > 0, "guard: the parse function was located");
      const branchFlags = [...parse.matchAll(/key === "([a-z-]+)"/gu)].map((match) => `--${match[1]}`);

      assert.deepEqual([...MEMORY_VERBS], ["recall", "record-recall", "recurrence", "ingest", "reindex", "status"], "guard: the verb vocabulary is non-empty and is the module's own");
      assert.equal(SCOPE_FLAGS.length, 6, "guard: six scope flags");
      assert.ok(branchFlags.includes("--block"), "guard: `--block` is a real branch of the parser");

      const usage = /function memoryUsage[\s\S]*?\n\}/u.exec(memory)?.[0] ?? "";
      assert.ok(usage.length > 0, "guard: `memoryUsage` exists");
      assert.equal(usage.includes("block"), false, "…and does NOT mention `--block`, which is why it is not the surface");

      const resolves = (token) => token.startsWith("--")
        ? branchFlags.includes(token) || SCOPE_FLAGS.includes(token.slice(2))
        : MEMORY_VERBS.includes(token);

      // The tokens the carriers spell, plus one that exists nowhere.
      const rows = [
        ["recall", true], ["ingest", true],
        ["--block", true], ["--json", true], ["--limit", true],
        ["--area", true], ["--item", true], ["--kind", true],
        ["--scope", false],
      ];
      let present = 0;
      let absent = 0;
      for (const [token, expected] of rows) {
        assert.equal(resolves(token), expected, `${token} is ${expected ? "present" : "absent"} in the shipped surface`);
        if (expected) present += 1; else absent += 1;
      }
      assert.ok(present > 0 && absent > 0, `non-vacuous in both directions: ${present} present, ${absent} absent`);
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 5 (task 01): EVERY memory invocation in the bundle is read over joined lines, and every token each one spells resolves",
    run: () => {
      const memory = read("packages/knowledge/src/memory.mjs");
      const parse = /function parseMemoryArgv[\s\S]*?\n\}/u.exec(memory)?.[0] ?? "";
      const branchFlags = [...parse.matchAll(/key === "([a-z-]+)"/gu)].map((match) => `--${match[1]}`);
      const known = new Set([...branchFlags, ...SCOPE_FLAGS.map((flag) => `--${flag}`)]);

      const found = [];
      for (const name of commandFiles()) {
        const rel = commandRel(name);
        for (const call of invocationsIn(read(rel))) found.push({ rel, ...call });
      }
      // 154/05 adds retrospective's recall and ingest edge, retaining the seven existing calls; 153/04 adds
      // four captures (one per declared decision-recall edge) and retrospective's recurrence match.
      // 157/ADR-004 adds eight: continue's and verify's ingest, recall and capture, and retrospective's
      // evidence ingest and recall. 201/ADR-006 adds two: the retrospective's two captures.
      assert.equal(found.length, 24, `the bundle carries twenty-four memory invocations (found ${found.length}: ${found.map((f) => f.rel).join(", ")})`);
      assert.ok(found.length > 1, "the count it examined is reported and is greater than one");

      // THE TWO THAT MARKDOWN WRAPPED MID-COMMAND are each read as ONE invocation with a real verb
      // — the property a per-line regex loses.
      const refineFound = found.filter((call) => call.rel === REFINE);
      assert.deepEqual(refineFound.map((call) => call.verb), ["recall", "recall", "record-recall", "record-recall"], "refine's wrapped invocations are each read as one, with their verbs intact across the wrap");

      // EVERY verb and EVERY flag, not only shatter's.
      for (const call of found) {
        assert.ok(MEMORY_VERBS.includes(call.verb), `${call.rel}: \`${call.verb}\` is a verb the module declares`);
        for (const flag of call.flags) {
          assert.ok(known.has(flag), `${call.rel}: \`${flag}\` resolves in the shipped surface — an invented flag exits 0 and folds its value into the query, so nothing downstream would catch it`);
        }
      }

      // NON-VACUITY: an invented flag really is caught by this reading.
      const planted = invocationsIn('run `aof memory recall "seam" --scope architecture --block`');
      assert.equal(planted.length, 1);
      assert.equal(planted[0].flags.includes("--scope"), true, "the reading sees a planted `--scope`…");
      assert.equal(known.has("--scope"), false, "…and the surface does not know it, so the leg above would fail and name it");
      // 178/02 — the reading follows the canonical spelling only: a prompt still on the alias is
      // FF-17802's to refuse, so this control never has to read it.
      assert.deepEqual(invocationsIn('run `aof work memory recall "seam" --block`'), [], "a body holding only the alias's spelling yields no invocation");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 6 (task 00, 02): the flags shatter's form spells, and the two it must not",
    run: () => {
      const call = invocationsIn(read(SHATTER)).find((each) => each.verb === "recall");
      assert.deepEqual(call.flags, ["--block"], "shatter's recall spells `--block` alone");
      for (const forbidden of ["--item", "--area", "--kind"]) {
        assert.equal(call.flags.includes(forbidden), false, `${forbidden} is absent from the invocation`);
      }
      // The two carriers' FORMS DIFFER, and that is ADR-007's decision rather than an
      // inconsistency — a control asserting one shared shape would red the very form it decided.
      // Since 201/ADR-006 the PO's refine recall spells shatter's flags; what differs is the query,
      // which is the item's title where shatter's is the PRD's objective and scope words.
      const refineCalls = invocationsIn(read(REFINE)).filter((each) => each.verb === "recall");
      assert.equal(refineCalls.length, 2, "refine carries two recalls, for two roles");
      assert.deepEqual(
        refineCalls.map((each) => [...each.flags].sort()),
        [["--area", "--block"], ["--block"]],
        "…the architect's with its area filter, and the PO's with no filter at all",
      );
      assert.match(refineCalls[1].tail, /"<the item's title, verbatim>"/u, "the PO's query is the item's title, where shatter's is the PRD's objective and scope words");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 7 (task 02): the cut-making roster is asserted in BOTH directions, and every command file is classified",
    run: () => {
      const files = commandFiles();
      const roster = Object.keys(CUT_MAKING);
      const excluded = Object.keys(EXCLUDED);

      // DIRECTION 1 — every roster entry carries a RECALL. An `ingest` would not satisfy it.
      for (const name of roster) {
        const calls = invocationsIn(read(commandRel(name)));
        const recalls = calls.filter((call) => call.verb === "recall");
        assert.ok(recalls.length >= 1, `${name} is a roster entry and carries at least one \`aof memory recall\``);
      }
      // …and a file carrying only `ingest` would NOT: shown on a real one rather than asserted.
      // 157/ADR-004 gave verify a triage recall, which is a declared decision edge and not a cut; every
      // OTHER memory call verify makes is an `ingest`.
      const triage = EDGES["verify-finding"];
      const verify = invocationsIn(read(`${COMMANDS_DIR}/verify.md`))
        .filter((call) => !(call.verb === "recall" && sameFlags(call.flags, triage.recallFlags)) && !(call.verb === "record-recall" && call.tail.includes(triage.capture)));
      assert.ok(verify.length > 0 && verify.every((call) => call.verb === "ingest"), "guard: verify's memory calls besides its triage edge really are all `ingest`, so the recall test has teeth");

      // DIRECTION 2 — every command file is classified, so a 27th reds this by EXISTING.
      const classified = new Set([...roster, ...excluded]);
      const unclassified = files.filter((name) => !classified.has(name));
      assert.deepEqual(unclassified, [], "every command file is on the roster or on the excluded list with its own reason");
      const missing = [...classified].filter((name) => !files.includes(name));
      assert.deepEqual(missing, [], "…and neither list names a file that is not there");
      assert.equal(roster.length + excluded.length, files.length, "the union of the two lists equals the directory listing");

      // EVERY EXCLUSION CARRIES A REASON, so a considered exclusion is distinguishable from an
      // oversight — the failure a list of bare filenames cannot prevent.
      for (const [name, reason] of Object.entries(EXCLUDED)) {
        assert.equal(typeof reason === "string" && reason.trim().length > 10, true, `${name}'s exclusion states why`);
      }

      // THE MEMBERSHIP RULE IS NOT A ROLE GREP. Six files spawn the product owner and five of them
      // partition nothing — asserted so nobody rewrites the roster as a grep.
      const spawnsPo = files.filter((name) => read(commandRel(name)).includes("aof-product-owner"));
      assert.ok(spawnsPo.length > roster.length, `${spawnsPo.length} files name the product owner against ${roster.length} cutters — spawning it does not make a command a cutter`);

      // THE DENOMINATOR, REPORTED.
      assert.equal(files.length, roster.length + excluded.length, `${files.length} command files enumerated: ${roster.length} on the roster, ${excluded.length} excluded`);
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 8 (task 03): every tracked render of the edited member matches a fresh re-render, and the block reached all three",
    run: async () => {
      const bundle = await loadBundle();
      const runtimes = ["claude", "codex", "opencode"];
      const outputs = renderBundleOutputs(bundle, { runtimes });
      const mirrors = [
        ".claude/commands/aof/shatter.md",
        ".agents/skills/aof-shatter/SKILL.md",
        ".opencode/commands/aof/shatter.md",
      ];
      const byPath = new Map(outputs.map((output) => [slash(output.path), output]));
      for (const rel of mirrors) {
        const rendered = byPath.get(rel);
        assert.ok(rendered != null, `${rel} is in the render set — asked of \`renderBundleOutputs\`, never derived from a path prefix`);
        const onDisk = read(rel);
        assert.equal(
          hashContent(onDisk.replace(/\r\n/gu, "\n")),
          hashContent(String(rendered.content).replace(/\r\n/gu, "\n")),
          `${rel} matches a fresh re-render — including the opencode mirror, which the shipped manifest hash-checks not at all`,
        );
        // THE NEW BLOCK REACHED IT, exactly once, as a RENDER of the source rather than a
        // separately worded copy.
        const calls = invocationsIn(onDisk).filter((each) => each.verb === "recall");
        assert.equal(calls.length, 1, `${rel} carries the recall exactly once`);
        assert.equal(calls[0].verb, "recall");
        assert.deepEqual(calls[0].flags, ["--block"], `${rel}'s invocation is the source's, flag for flag`);
      }
      // NON-VACUITY: all three really are distinct resources, so one hash cannot be standing in
      // for three.
      assert.equal(new Set(mirrors.map((rel) => hashContent(read(rel)))).size, 3, "the three mirrors are three distinct renders");
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 9 (task 03): the manifest is a true content address, and it agrees with the lock on every path they both name",
    run: async () => {
      const manifest = JSON.parse(read("packages/acd/assets/manifest.json"));
      const bundle = await loadBundle();
      const rendered = new Map(
        renderBundleOutputs(bundle, { runtimes: manifest.runtimes }).map((output) => [slash(output.path), output]),
      );
      assert.ok(Array.isArray(manifest.entries) && manifest.entries.length > 0, "guard: the manifest has entries");

      for (const entry of manifest.entries) {
        assert.match(entry.hash, /^sha256:[0-9a-f]{64}$/u, `${entry.path} carries a well-formed content address`);
        const output = rendered.get(slash(entry.path));
        assert.ok(output != null, `${entry.path} is in the render set under \`manifest.runtimes\``);
        assert.equal(entry.hash, hashContent(String(output.content)), `${entry.path}'s hash equals the hash of the member it names`);
      }
      // …AND NO EXTRA, NO MISSING.
      assert.deepEqual(
        manifest.entries.map((entry) => slash(entry.path)).sort(),
        [...rendered.keys()].sort(),
        "the manifest's path set equals the rendered path set",
      );

      // THE TWO RECORDS AGREE WHERE THEY OVERLAP. The lock is the wider record — it holds the
      // opencode mirror the manifest does not — so this is an intersection, not an equality.
      const lock = JSON.parse(read(".aof/aof.lock.json"));
      const lockHashes = new Map();
      const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === "object") {
          if (typeof node.path === "string" && typeof node.hash === "string") lockHashes.set(slash(node.path), node.hash);
          Object.values(node).forEach(walk);
        }
      };
      walk(lock);
      assert.ok(lockHashes.size > 0, "guard: the lock carries hashed paths");
      const shared = manifest.entries.filter((entry) => lockHashes.has(slash(entry.path)));
      assert.ok(shared.length > 0, `guard: the two records overlap (${shared.length} shared paths)`);
      // 192/ADR-001 §4, ADR-005 — the manifest catalogues the CANONICAL render (every practice off) and
      // the lock records what THIS checkout rendered, with its own practices on. Where a member's text
      // holds a slot the two renders legitimately differ, so the lock is held to the render of this
      // checkout's own config, and agrees with the manifest wherever that render does.
      const own = new Map(renderBundleOutputs(await loadBundle({ config: JSON.parse(read(".aof/aof.config.json")) }), { runtimes: manifest.runtimes })
        .map((output) => [slash(output.path), hashContent(String(output.content))]));
      for (const entry of shared) {
        const expected = own.get(slash(entry.path)) ?? entry.hash;
        assert.equal(lockHashes.get(slash(entry.path)), expected, `${entry.path} carries the hash of this checkout's render in the lock`);
      }
      assert.ok(shared.filter((entry) => own.get(slash(entry.path)) === entry.hash).length > shared.length / 2, "guard: most shared paths are untouched by any practice, and those still agree with the manifest");
      assert.ok(
        shared.some((entry) => slash(entry.path) === ".claude/commands/aof/shatter.md"),
        "…and the edited member's claude render is one of them",
      );

      // AND THE LOCK IS TRUE OF THE DISK, not merely of a re-render — the gap the shipped manifest
      // control has by construction (it hashes its own re-render).
      for (const [rel, hash] of lockHashes) {
        let onDisk;
        try {
          onDisk = readFileSync(path.join(root, rel), "utf8");
        } catch {
          continue;
        }
        assert.equal(hashContent(onDisk), hash, `${rel}'s recorded hash matches the file on disk`);
      }
    },
  },

  {
    name: "arch/124/02 FF-12405 leg 10 (task 03): no new parity control is added, and every file this change lands is line-ending-pinned",
    run: () => {
      // ADR-007's Consequences is explicit: the existing pair already governs the write set and the
      // hashes, and a sibling control is what this tree keeps refusing.
      const bundleControls = readdirSync(path.join(root, "test", "arch", "bundle")).filter((name) => name.endsWith(".test.mjs"));
      // A DECLARED CEILING, never a retyped count (FF-11902): "no new parity control" is the
      // decision, so the bound may fall with a deletion and may never rise; the two controls named
      // below are the floor that keeps it non-vacuous.
      const BUNDLE_CONTROL_CEILING = 23;
      assert.ok(bundleControls.length <= BUNDLE_CONTROL_CEILING, `no new control joins test/arch/bundle — a sibling control is what this tree keeps refusing (found ${bundleControls.length}, ceiling ${BUNDLE_CONTROL_CEILING})`);
      assert.ok(bundleControls.includes("acd-bundle-manifest-hashes.test.mjs"), "…including the manifest hash control the parity claim leans on");
      assert.ok(bundleControls.includes("acd-declared-writes-include-generated-siblings.test.mjs"), "…and the declared-writes one");

      // THE SIX FILES, EACH PINNED. A CRLF-checked-out mirror committed back turns a six-file
      // change into a whole-file diff nobody reads (`01/R2` — content-addressed artifacts must pin
      // line endings or cross-platform hashes diverge).
      const six = [
        SHATTER,
        ".claude/commands/aof/shatter.md",
        ".agents/skills/aof-shatter/SKILL.md",
        ".opencode/commands/aof/shatter.md",
        "packages/acd/assets/manifest.json",
        ".aof/aof.lock.json",
      ];
      const attrs = execFileSync("git", ["check-attr", "text", "eol", "--", ...six], { cwd: root, encoding: "utf8", maxBuffer: 1 << 24 });
      for (const rel of six) {
        assert.match(attrs, new RegExp(`${rel.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}: text: set`, "u"), `${rel} is pinned \`text=set\``);
        assert.match(attrs, new RegExp(`${rel.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}: eol: lf`, "u"), `${rel} is pinned \`eol=lf\``);
        assert.equal(read(rel).includes("\r\n"), false, `${rel} holds no CRLF on disk`);
      }
    },
  },

  {
    name: "arch/153/04 FF-15303 + 157 FF-15702 + 201 FF-20106 leg 1: every declared decision-recall edge binds the complete capture protocol in the authored source, and the roster is exactly the eight edges",
    run: () => {
      assert.deepEqual(Object.keys(EDGES), ["shatter-po", "refine-architect", "refine-po", "continue-developer", "continue-episodic", "verify-finding", "retrospective-domain", "retrospective-evidence"], "guard: the edge roster is m153's four decision-recall edges, 157's two and 201's two");
      for (const edge of Object.keys(EDGES)) {
        const failures = edgeFailures(read(EDGES[edge].file), edge);
        assert.deepEqual(failures, [], `${edge}'s capture protocol is whole in ${EDGES[edge].file}`);
      }
      // Every recall in the bundle belongs to a declared edge (201/ADR-006: the retrospective's two
      // are edges now) — a ninth cannot arrive without a roster entry.
      const recalls = [];
      for (const name of commandFiles()) {
        for (const call of invocationsIn(read(commandRel(name)))) if (call.verb === "recall") recalls.push(name);
      }
      assert.deepEqual(recalls.sort(), ["continue.md", "continue.md", "refine.md", "refine.md", "retrospective.md", "retrospective.md", "shatter.md", "verify.md"], "eight recalls exist, one per declared edge");
      const submissions = [];
      for (const name of commandFiles()) {
        for (const call of invocationsIn(read(commandRel(name)))) if (call.verb === "record-recall") submissions.push(name);
      }
      assert.deepEqual(submissions.sort(), ["continue.md", "continue.md", "refine.md", "refine.md", "retrospective.md", "retrospective.md", "shatter.md", "verify.md"], "one submission per declared edge, and none anywhere else");
    },
  },

  {
    name: "arch/153/04 FF-15303 leg 2: removing one edge's capture obligation fails the control naming THAT edge and no other",
    run: () => {
      for (const edge of Object.keys(EDGES)) {
        const mutated = withoutCapture(read(EDGES[edge].file), edge);
        const failures = edgeFailures(mutated, edge);
        assert.ok(failures.length > 0, `${edge}: removing its capture is detected`);
        assert.ok(failures.every((failure) => failure.startsWith(`${edge}:`)), `${edge}: every failure names the edge`);
        for (const other of Object.keys(EDGES)) {
          if (other === edge || EDGES[other].file !== EDGES[edge].file) continue;
          assert.deepEqual(edgeFailures(mutated, other), [], `${edge}'s removal does not red its sibling ${other} in the same file`);
        }
      }
      // Weakening the protocol without deleting the invocation is caught too: a defaulted verdict, a re-run, a dropped filter.
      const shatter = read(SHATTER);
      assert.ok(edgeFailures(shatter.replace("never a default", "defaulting to honoured"), "shatter-po").some((failure) => failure.includes("allows no default verdict")), "a default verdict is detected");
      assert.ok(edgeFailures(shatter.replace("Never re-run the recall", "Re-run the recall"), "shatter-po").some((failure) => failure.includes("never re-runs the recall")), "a second retrieval is detected");
      const refine = read(REFINE);
      assert.ok(edgeFailures(refine.replace("--area architecture --block", "--block"), "refine-architect").some((failure) => failure.includes("recall spelling")), "a dropped area filter is detected");
    },
  },

  {
    name: "arch/153/04 FF-15303 leg 3: Claude, Codex and OpenCode renders each carry every edge's protocol — on disk and freshly rendered — and removing capture from one render is detected",
    run: async () => {
      const bundle = await loadBundle();
      const outputs = renderBundleOutputs(bundle, { runtimes: ["claude", "codex", "opencode"] });
      const byPath = new Map(outputs.map((output) => [slash(output.path), output]));
      // The body that carries the edge is the candidate holding the edge's own lead — a Codex skill's
      // `SKILL.md` is a summary, and the procedure beside it is what the agent is told to read.
      const bodyOf = (runtime, member, lead) => {
        const candidates = {
          claude: [`.claude/commands/aof/${member}.md`],
          codex: [`.agents/skills/aof-${member}/procedure.md`, `.agents/skills/aof-${member}/SKILL.md`],
          opencode: [`.opencode/commands/aof/${member}.md`],
        }[runtime];
        for (const rel of candidates) {
          const rendered = byPath.get(rel);
          if (rendered != null && String(rendered.content).includes(lead)) return { rel, rendered: String(rendered.content) };
        }
        return null;
      };
      let checked = 0;
      for (const edge of Object.keys(EDGES)) {
        const member = path.basename(EDGES[edge].file, ".md");
        for (const runtime of ["claude", "codex", "opencode"]) {
          const found = bodyOf(runtime, member, EDGES[edge].lead);
          assert.ok(found != null, `${edge}: the ${runtime} render of ${member} carries the recall block`);
          assert.deepEqual(edgeFailures(found.rendered, edge), [], `${edge}: the ${runtime} render (${found.rel}) carries the whole protocol`);
          assert.deepEqual(edgeFailures(read(found.rel), edge), [], `${edge}: the ${runtime} file on disk (${found.rel}) carries the whole protocol`);
          // THE RED PROBE: capture removed from ONE render is detected, naming the edge.
          const probe = edgeFailures(withoutCapture(found.rendered, edge), edge);
          assert.ok(probe.length > 0 && probe.every((failure) => failure.startsWith(`${edge}:`)), `${edge}: removing capture from the ${runtime} render is detected by name`);
          checked += 1;
        }
      }
      assert.equal(checked, 24, "eight edges across three runtimes were each checked");
    },
  },

  {
    name: "arch/157 FF-15702: the retrospective gathers its episodic evidence through one --all recall — observe, ingest, recall, then the m153 passes — in the authored source and every render, and removing the recall is detected",
    run: async () => {
      assert.deepEqual(retrospectiveEvidenceFailures(read(`${COMMANDS_DIR}/retrospective.md`)), [], "the authored retrospective gathers through recall");
      const outputs = renderBundleOutputs(await loadBundle(), { runtimes: ["claude", "codex", "opencode"] });
      const renders = outputs.filter((output) => /(^|\/)(retrospective\.md|aof-retrospective\/(procedure|SKILL)\.md)$/u.test(slash(output.path)) && String(output.content).includes("Gather the evidence through recall"));
      assert.equal(new Set(renders.map((output) => slash(output.path).split("/")[0])).size, 3, `non-vacuity: a render per runtime carries the step (${renders.map((output) => slash(output.path)).join(", ")})`);
      for (const output of renders) {
        assert.deepEqual(retrospectiveEvidenceFailures(String(output.content)), [], `${slash(output.path)} gathers through recall`);
        assert.deepEqual(retrospectiveEvidenceFailures(read(slash(output.path))), [], `${slash(output.path)} on disk gathers through recall`);
      }
      // THE RED PROBE: the --all recall removed is named as the retrospective's.
      const probe = retrospectiveEvidenceFailures(read(`${COMMANDS_DIR}/retrospective.md`).replace(/aof memory recall "" --item <ref> --area delivery --all --json/u, "(evidence recall removed)"));
      assert.ok(probe.length > 0 && probe.every((failure) => failure.startsWith("retrospective:")), `removing the evidence recall is detected, naming the retrospective: ${probe.join("; ")}`);
    },
  },
  {
    name: "arch/153/04 FF-15303 leg 4: retrospective matches before it writes and indexes after — recurrence precedes ingest, the watermark and both lesson fields are authored first, and a clean pass invents nothing",
    run: () => {
      const text = read(`${COMMANDS_DIR}/retrospective.md`);
      const calls = invocationsIn(text);
      assert.deepEqual(calls.map((call) => call.verb), ["recall", "ingest", "recall", "recurrence", "record-recall", "record-recall", "ingest"], "the domain recall, the evidence ingest and recall (157/ADR-004), the whole-index recurrence match, the two captures (201/ADR-006), then ingest — in that order");
      const recurrence = calls[3];
      assert.deepEqual([...recurrence.flags].sort(), ["--exclude", "--json"], "the match excludes the lesson's own identity and reads JSON");
      const body = joined(text);
      assert.ok(body.indexOf("promotionFrom: <the next R number>") < body.lastIndexOf("aof memory ingest"), "the watermark is established before the post-authoring ingest");
      for (const needle of ["`**Recurs:** <item>/R<n>`", "`**Promoted to:**`", "`none`", "`control:<qualified-id>`", "`rule:<repo-path>`", "`prompt:<repo-path>`"]) {
        assert.ok(body.includes(needle), `retrospective names ${needle}`);
      }
      assert.match(body, /when it is null, the lesson has no Recurs field/u, "an unmatched lesson carries no Recurs field");
      assert.match(body, /never claim a planned control/u, "an unmatched lesson never claims a planned control");
      assert.match(body, /the prior lesson is not touched/u, "the prior lesson is never rewritten");
      assert.match(body, /report no new lesson, leave every existing lesson body byte-identical, and invent no recurrence\s+or promotion/u, "a clean pass reports no lesson and invents nothing");
      assert.match(body, /only AFTER the lesson pass has authored `promotionFrom`, `Recurs` and `Promoted to`/u, "ingest runs only after the fields are authored");
      // The recurrence match is still no decision-recall edge: the only two submissions are the two
      // recalls' own (201/ADR-006 §3), and neither is spelled for the match.
      const submissions = calls.filter((call) => call.verb === "record-recall");
      assert.deepEqual(submissions.map((call) => /<[a-z]+ observation file>/u.exec(call.tail)?.[0]), ["<domain observation file>", "<evidence observation file>"], "retrospective's recurrence match records no observation — the two submissions are the two recalls'");
    },
  },

  // ───────────────────────────────────────────────────────────── 201/02 · FF-20106 ──
  {
    name: "arch/201/02 FF-20106 leg 1 (task 00 E1 + E2 + E3 + outline): refine's PO recall is the item's title with --block alone, its capture records the title and {}, the architect's edge is as it was, and both roles spell only flags the seam reads",
    run: () => {
      const known = seamFlags();
      for (const { reader, rel, text } of handedTo("refine")) {
        const recalls = invocationsIn(text).filter((call) => call.verb === "recall");
        assert.equal(recalls.length, 2, `${reader} (${rel}): refine carries two recalls`);
        const [architect, po] = recalls;

        // E1 — the item's title, verbatim, and `--block`; no `--item`, no `--area`.
        assert.match(po.tail, /^\s+"<the item's title, verbatim>"\s+--block$/u, `${reader}: the PO's recall is the item's title, verbatim, and --block`);
        assert.deepEqual(po.flags, ["--block"], `${reader}: the PO's recall carries no --item and no --area`);

        // E2 — the capture names what was asked, and is submitted once, on the item being refined.
        const block = edgeBlock(text, EDGES["refine-po"].lead);
        assert.ok(block != null, `${reader}: the recall block was located by its lead`);
        assert.match(block, /The PO uses edge `refine-po`, actor `product-owner`, the item's title as its `query` and scope `\{\}`/u, `${reader}: the PO's capture names its edge, its actor, the title as the query and {} as the scope`);
        assert.equal(invocationsIn(block).filter((call) => call.verb === "record-recall" && call.tail.includes("<PO observation file>") && call.tail.includes("<ref>")).length, 1, `${reader}: the PO's observation has one submission, on <ref>`);
        assert.match(block, /Each submits exactly once, on the item being refined/u, `${reader}: …once, on the item being refined`);
        assert.equal(/"item":"<ref>"/u.test(block), false, `${reader}: no capture still records the item as the PO's scope`);

        // E3 — the architect's recall and capture are as they were.
        assert.match(architect.tail, /--area architecture --block$/u, `${reader}: the architect's recall still carries --area architecture --block`);
        assert.match(block, /The architect uses edge `refine-architect`, actor `architect` and scope `\{"area":"architecture"\}`/u, `${reader}: the architect's capture still names its area scope`);

        // The outline — architect | PO: every flag each role spells is one the seam reads.
        for (const [role, call] of [["architect", architect], ["PO", po]]) {
          assert.ok(call.flags.length > 0 && call.flags.every((flag) => known.has(flag)), `${reader}: the ${role}'s recall uses only flags the memory seam reads (${call.flags.join(" ")})`);
        }
      }
      // NON-VACUITY: the old spelling is refused by name, and an invented flag is not one the seam reads.
      const spelled = /"<the item's title,\s+verbatim>" --block/u;
      assert.ok(spelled.test(read(REFINE)), "guard: the PO's recall was located in the source it is being rewritten in");
      const old = read(REFINE).replace(spelled, '"<milestone objective keywords>" --item <ref> --block');
      assert.ok(edgeFailures(old, "refine-po").some((failure) => failure.includes("recall spelling")), "the item-scoped recall is detected as no longer the PO's edge");
      assert.equal(known.has("--title"), false, "an invented `--title` is not a flag the seam reads");
    },
  },

  {
    name: "arch/201/02 FF-20106 leg 2 (task 01 E4 + E5 + E6 + placement + outline): the retrospective captures both recalls under their own edges, after the lessons and before the closing ingest, a clean item still submits both, and 157's evidence rules stand",
    run: () => {
      for (const { reader, rel, text } of handedTo("retrospective")) {
        const body = joined(text);
        const at = (needle) => {
          const index = body.indexOf(needle);
          assert.ok(index >= 0, `${reader} (${rel}): guard: "${needle}" was located`);
          return index;
        };

        // E4 — each recall under its own edge and scope, one verdict per record with its meaning,
        // submitted once on the item (`edgeFailures` holds the whole protocol, meanings included).
        for (const edge of ["retrospective-domain", "retrospective-evidence"]) {
          assert.deepEqual(edgeFailures(text, edge), [], `${reader}: ${edge}'s capture is whole`);
        }
        assert.match(body, /becomes one observation on the item this retrospective is for/u, `${reader}: both are submitted on the item the retrospective is for`);
        assert.equal(body.split("Submit it once:").length - 1, 2, `${reader}: each is submitted once`);

        // E5 — the step that writes no document still submits both.
        const lines = text.split(/\r?\n/u);
        const clean = lines.findIndex((line) => line.startsWith("5. **Conditional.**"));
        const cleanEnd = lines.findIndex((line, index) => index > clean && STEP_HEADING.test(line));
        assert.ok(clean >= 0 && cleanEnd > clean, `${reader}: guard: the clean-item step was located`);
        assert.match(joined(lines.slice(clean, cleanEnd).join("\n")), /write no doc[\s\S]*both observations of step 6 are still submitted/u, `${reader}: the step that writes no document says both observations are still submitted`);

        // E6 — an empty result is recorded as empty.
        assert.match(body, /An empty block is still submitted, as `"records": \[\]`, and so is an empty evidence array: no verdict and no extra retrieval is invented/u, `${reader}: an empty result is submitted as "records": [], with no verdict invented`);

        // Placement — after the lessons are written, before the closing ingest.
        const lessons = at("4. **Distil + write**");
        const closing = body.lastIndexOf("aof memory ingest");
        for (const capture of ["<domain observation file>", "<evidence observation file>"]) {
          assert.ok(at(capture) > lessons, `${reader}: ${capture} is submitted after the lessons are written`);
          assert.ok(at(capture) < closing, `${reader}: …and before the closing ingest`);
        }
        assert.equal(/records\s+no recall observation/u.test(body), false, `${reader}: the command no longer says the evidence step records no recall observation`);
        const output = body.slice(at("<output>"), at("</output>"));
        assert.match(output, /`RETROSPECTIVE\.md` by hand\. Step 6's two submissions append two recall rows to the item's `FEEDBACK\.ndjson`/u, `${reader}: the output note admits the two ledger rows beside RETROSPECTIVE.md`);

        // The outline — what the evidence step keeps from 157 (all six rows).
        assert.deepEqual(retrospectiveEvidenceFailures(text), [], `${reader}: observe, ingest, the one --all recall, no raw enumeration and unavailable-not-raw all stand`);
        const match = at("**Match before you write.** For each NEW lesson, run `aof memory recurrence");
        assert.ok(match > lessons && match < at("5. **Conditional.**"), `${reader}: the recurrence match still runs inside the lesson pass, before each new lesson is written`);
      }
    },
  },

  {
    name: "arch/201/02 FF-20106 leg 3 (task 02 E7 + E8 + outline): every runtime's refine carries the title recall and no item-scoped one, every runtime's retrospective names both edges, and each tracked render is the one a fresh render writes, with the lock and the manifest agreeing",
    run: async () => {
      const runtimes = ["claude", "codex", "opencode"];
      const config = JSON.parse(read(".aof/aof.config.json"));
      // The tracked renders are THIS checkout's (its own practices on, 192/ADR-005); the manifest
      // catalogues the canonical render. Each record is held to the render it describes.
      const own = new Map(renderBundleOutputs(await loadBundle({ config }), { runtimes }).map((output) => [slash(output.path), String(output.content)]));
      const canonical = new Map(renderBundleOutputs(await loadBundle(), { runtimes }).map((output) => [slash(output.path), String(output.content)]));
      const manifest = new Map(JSON.parse(read("packages/acd/assets/manifest.json")).entries.map((entry) => [slash(entry.path), entry.hash]));
      const lock = new Map();
      const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === "object") {
          if (typeof node.path === "string" && typeof node.hash === "string") lock.set(slash(node.path), node.hash);
          Object.values(node).forEach(walk);
        }
      };
      walk(JSON.parse(read(".aof/aof.lock.json")));

      const mirrors = {
        claude: (member) => [`.claude/commands/aof/${member}.md`],
        codex: (member) => [`.agents/skills/aof-${member}/SKILL.md`, `.agents/skills/aof-${member}/procedure.md`],
        opencode: (member) => [`.opencode/commands/aof/${member}.md`],
      };
      let compared = 0;
      for (const runtime of runtimes) {
        // E7 — the title recall, and no PO recall with `--item <ref> --block`.
        const refine = handedTo("refine").find((each) => each.reader === runtime).text;
        assert.match(joined(refine), /the \*\*PO\*\*, before the break-down, runs a recall on the item's title — `aof memory recall "<the item's title, verbatim>" --block`/u, `${runtime}: the refine command tells the PO to recall by the item's title`);
        assert.equal(/--item <ref> --block/u.test(joined(refine)), false, `${runtime}: it carries no PO recall with --item <ref> --block`);

        // E8 — both edges, and not the retired sentence.
        const retrospective = handedTo("retrospective").find((each) => each.reader === runtime).text;
        assert.deepEqual(namedEdges(retrospective), ["retrospective-domain", "retrospective-evidence"], `${runtime}: the retrospective command names both edges`);
        assert.equal(/records\s+no recall observation/u.test(joined(retrospective)), false, `${runtime}: it does not say the evidence step records no recall observation`);

        // The outline — tracked render == fresh render, and the two hash records agree with the files.
        for (const member of ["refine", "retrospective"]) {
          for (const rel of mirrors[runtime](member)) {
            const fresh = own.get(rel);
            assert.ok(fresh != null, `${rel} is in the render set`);
            const onDisk = readFileSync(path.join(root, rel), "utf8");
            assert.equal(hashContent(onDisk), hashContent(fresh), `${rel} equals a fresh render of the bundle`);
            assert.equal(lock.get(rel), hashContent(onDisk), `${rel}: the lock records the hash of the file on disk`);
            if (manifest.has(rel)) assert.equal(manifest.get(rel), hashContent(canonical.get(rel)), `${rel}: the manifest records the hash of the canonical render`);
            compared += 1;
          }
        }
        assert.ok(mirrors[runtime]("refine").some((rel) => manifest.has(rel)) || runtime === "opencode", `guard: the manifest catalogues the ${runtime} render`);
      }
      assert.equal(compared, 8, "eight tracked renders were compared: two members across claude, codex's two files, and opencode");
    },
  },

  {
    name: "arch/201/02 FF-20106 leg 4 (task 02): every aof memory recall in a bundled command is followed by a capture that names its own edge, the edges named across the bundle are exactly the eight, and a ninth recall, a removed capture or an unnamed edge is detected",
    run: () => {
      const roster = ["shatter-po", "refine-architect", "refine-po", "continue-developer", "continue-episodic", "verify-finding", "retrospective-domain", "retrospective-evidence"];
      const named = [];
      let recalls = 0;
      for (const name of commandFiles()) {
        const text = read(commandRel(name));
        assert.deepEqual(recallPairingFailures(name, text), [], `${name}: every recall is paired with a capture that names its own edge`);
        recalls += invocationsIn(text).filter((call) => call.verb === "recall").length;
        named.push(...namedEdges(text));
      }
      assert.equal(recalls, roster.length, `${recalls} recalls were examined, one per edge`);
      // BOTH DIRECTIONS: an edge named in a command and absent from the roster reds here, and so
      // does a roster edge no command names.
      assert.deepEqual([...new Set(named)].sort(), [...roster].sort(), "the edges named across the bundle are exactly the eight");
      assert.deepEqual(Object.keys(EDGES), roster, "…and they are the roster the protocol legs above walk");

      // RED PROBES, each on the real file.
      const retrospective = read(RETROSPECTIVE);
      assert.deepEqual(recallPairingFailures("retrospective.md", `${retrospective}\nThen run \`aof memory recall "<anything>" --limit 3\`.`), ['retrospective.md: `aof memory recall "<anything>" --limit 3` belongs to no declared edge'], "a ninth recall with no edge is named");
      for (const edge of roster) {
        const name = path.basename(EDGES[edge].file);
        const text = read(EDGES[edge].file);
        assert.deepEqual(recallPairingFailures(name, withoutCapture(text, edge)), [`${edge}: its recall is followed by no capture`], `${edge}: a removed capture is detected, naming the edge and no other`);
        assert.deepEqual(recallPairingFailures(name, text.replace(new RegExp(`\`${edge}\``, "u"), "`an-edge`")), [`${edge}: its capture does not name the edge`], `${edge}: a capture that names no edge of its own is detected`);
      }
    },
  },

  {
    name: "arch/201/02 FF-20106 leg 5 (task 02): wiki/memory.md lists refine-po as a recall on the item's title with no item filter, and both retrospective edges among the decision edges",
    run: () => {
      const page = read("wiki/memory.md");
      const lines = page.split(/\r?\n/u);
      const start = lines.findIndex((line) => line === "## The decision edges");
      const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
      assert.ok(start >= 0 && end > start, "guard: the decision-edges section was located by its heading");
      const rows = new Map(lines.slice(start, end).filter((line) => line.startsWith("| `")).map((line) => [/^\| `([a-z-]+)`/u.exec(line)[1], line]));
      assert.deepEqual([...rows.keys()], Object.keys(EDGES), "the table lists the eight edges, in the roster's order");
      assert.match(rows.get("refine-po"), /`recall "<the item's title>" --block`/u, "refine-po is a recall on the item's title");
      assert.match(rows.get("refine-po"), /no item filter/u, "…with no item filter");
      assert.equal(rows.get("refine-po").includes("--item"), false, "…and the row spells no --item");
      assert.match(rows.get("retrospective-domain"), /product owner/u, "retrospective-domain is listed with its actor");
      assert.match(rows.get("retrospective-evidence"), /`recall "" --item <ref> --area delivery --all --json`/u, "retrospective-evidence is listed with its recall");
      assert.equal(/records no (recall )?observation/u.test(page.replace(/\r?\n/gu, " ")), false, "the page no longer says the evidence recall records no observation");
    },
  },
];
