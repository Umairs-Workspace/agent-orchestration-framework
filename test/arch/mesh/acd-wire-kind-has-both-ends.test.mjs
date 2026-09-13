// Fitness function: acd-wire-kind-has-both-ends (milestone 50 / story 04; ARCHITECTURE
// ADR-008 FF-B — THE RATCHET).
//
//   "Every wire kind declared in `src/` has BOTH ends: something builds/sends it, and
//    something reads/branches on it — and at least one of those ends lives outside the
//    module that declares it."
//
// ═══ WHY IT EXISTS, AND WHY IT IS EARNED RATHER THAN SPECULATIVE ═══════════════════════
// This is the THIRD measured instance of "a shipped seam with no counterpart":
//   1. `wireTerminalBridge` — built, exported and unit-tested with NO production caller,
//      deleted at m46/story 01 (ADR-007). The gate aimed at it had read green for a month
//      while asserting nothing about the bytes reaching an operator's screen.
//   2. TECH_DEBT item 38 — two shipped, tested RENDERING paths with no production producer.
//   3. `SESSION_SPAWN_ACK_KIND` — a wire kind with a builder (`buildSessionSpawnAckFrame`),
//      a sender (`worker-stream-client.sendSessionSpawnAck`), a transport, an accepted
//      story and a passing unit test, and NO READER ANYWHERE IN `src/` across THREE
//      accepted stories. The frame fell through the control's `applyStreamFrame` kind
//      table into `unknown-frame-kind` and was reported to the operator as a discarded
//      workspace payload — a sentence with three false claims in it. Every failed session
//      spawn in milestone 50 died there.
//
// MEASURED, AND THIS GATE IS RED AT HEAD-BEFORE-THIS-TASK: on the pre-ADR-008 tree
// `SESSION_SPAWN_ACK_KIND`'s reading-end set is EMPTY (its only referencing module is its
// own declaring home). It turns green with ADR-008's lane — the two modules that now
// branch on it, `control-stream-server.mjs` and `mesh-session-spawn-outcome.mjs`, are the
// lane this story built. A gate that goes red→green with the fix is the strongest evidence
// available that it is not vacuous.
//
// ═══ THE RULE, AND HOW IT WAS NARROWED (this is the part to read before editing) ═══════
// ADR-008 FF-B's own wording is "referenced by at least TWO modules other than its
// declaring home". DRIVEN OVER THE LIVE `src/` TREE ON 2026-08-14 (the axis: every
// `export const *_KIND` under `src/`, 15 string-valued + 1 object-valued), that literal
// wording is RED for roughly seven of the fifteen string-valued kinds — and every one of
// those reds is a FALSE POSITIVE with a boring explanation:
//   · `RECOVERY_PUSH_RESULT_KIND`, `RESYNC_KIND`, `RESYNC_RESULT_KIND`,
//     `LOG_ENTRIES_FRAME_KIND` — their BUILDER legitimately lives in the declaring home
//     (that is what a wire-contract module IS), so only ONE other module ever names them.
//   · `PRESENCE_SIGNAL_KIND`, `WITHDRAW_KIND` — each has a genuine second end that is
//     RE-SPELLED as a bare string literal. (`PRESENCE_SIGNAL_KIND` was FIXED at delivery
//     rather than exempted — see the enumeration below.)
//   · `WORKFLOW_KIND` — not a wire kind at all; its value is an OBJECT.
// A gate that needs a seven-of-sixteen exemption list is a gate that mostly exempts, and
// this repo has measured what that costs: a gate that cries wolf gets relaxed rather than
// obeyed. So the rule is NARROWED rather than exempted, in three ways, each of which
// removes a whole class of false positive without weakening the invariant:
//
//   (N1) THE SWEEP IS SCOPED TO STRING-VALUED DECLARATIONS. `export const X_KIND = "…"`.
//        `WORKFLOW_KIND = { … }` is not a wire kind and is excluded BY THE SWEEP'S SHAPE
//        rather than by an exemption — a named exemption would imply it is one.
//   (N2) THE ENDS ARE NAMED, NOT COUNTED. A kind needs a PRODUCING end (`kind: X_KIND`) and
//        a READING end (`=== X_KIND`, `!== X_KIND`, `case X_KIND:`). This is what the
//        invariant is actually about — "two modules" was only ever a proxy for it, and the
//        proxy is what the four builder-at-home kinds fail.
//   (N3) THE DECLARING HOME MAY SUPPLY ONE END, NEVER BOTH. A contract module owning its
//        own builder is the house shape. A contract module owning BOTH ends is a lane that
//        talks only to itself, which is exactly instance 1 above.
//
// AND THE RE-SPELLING CLAUSE IS KEPT SHARP: an end spelled as a bare literal does NOT
// count. It must be either FIXED at that site (import the constant) or named in the
// EXPLICIT EXEMPTION ENUMERATION below, with the site and the reason. That enumeration is
// ONE entry today, measured, and it is an enumeration — never a pattern (ADR-001
// decision 5). A stale exemption (one naming a kind that no longer needs it) is itself a
// problem, so the list can only shrink by being noticed.
//
// IT WAS DRAFTED WITH TWO, AND THE SECOND WAS DELETED BEFORE DELIVERY (review 2026-08-14).
// `PRESENCE_SIGNAL_KIND`'s re-spelling sat at `src/control-stream-server.mjs`'s kind table —
// a file THIS story already edits, and one that already imports six other `*_KIND`
// constants — so the exemption's own stated reason ("this story may not reach into those
// lanes") did not hold for it. It is fixed at the site instead, in the same diff that
// introduced the ratchet. An enumeration that admits an AVOIDABLE entry on its first day is
// precisely the decay this header warns about; the bar for an entry is that the fix is out
// of the diff's reach, not that the fix is somewhere else.
//
// Every plant below is a HAND-WRITTEN synthesized snippet fed to the shipped detector —
// never a string-replace on a real file — and each asserts it LANDED before the detector
// is asked about it.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC_DIR = path.join(repoRoot, "src");

// LINE COMMENTS FIRST, BLOCK COMMENTS SECOND — the order is load-bearing (TECH_DEBT item
// 24): strip blocks first and a line comment containing `/*` deletes the rest of the file
// before the detector sees it, which on a both-ends sweep is a silent PASS (every kind
// after the wreck would have no ends and… no declarations either).
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

// N1 — the SWEEP. String-valued only, and the value is captured because the re-spelling
// clause below is stated over it.
const KIND_DECLARATION = /export\s+const\s+([A-Za-z0-9_]*_KIND)\s*=\s*["']([^"']*)["']/g;

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// N2 — THE TWO ENDS, spelled with the IMPORTED CONSTANT.
//
//   a PRODUCING end stamps the kind onto a frame/envelope: `kind: X_KIND`.
//   a READING end branches on it: `=== X_KIND`, `!== X_KIND`, `case X_KIND:`.
//
// Deliberately NOT "the identifier appears somewhere in the file": an import line, a
// re-export and a mention inside a `problems.push` string all satisfy that, and a kind
// whose only other reference is `export { X_KIND }` has no more of a counterpart than one
// with none at all.
function producingEnds(sources, name) {
  const needle = new RegExp(`\\bkind\\s*:\\s*${escapeRe(name)}\\b`);
  return [...sources].filter(([, source]) => needle.test(source)).map(([file]) => file);
}

function readingEnds(sources, name) {
  const needle = new RegExp(`(?:[=!]==\\s*${escapeRe(name)}\\b|\\b${escapeRe(name)}\\s*[=!]==|case\\s+${escapeRe(name)}\\s*:)`);
  return [...sources].filter(([, source]) => needle.test(source)).map(([file]) => file);
}

// The RE-SPELLING probe — the same two shapes, written with the bare literal instead. It
// exists to make a refusal HONEST: "this kind has no reading end" and "this kind's reading
// end is re-spelled two modules over" are different facts and want different fixes.
function respeltEnds(sources, value) {
  const produce = new RegExp(`\\bkind\\s*:\\s*["']${escapeRe(value)}["']`);
  const read = new RegExp(`(?:[=!]==\\s*["']${escapeRe(value)}["']|["']${escapeRe(value)}["']\\s*[=!]==|case\\s+["']${escapeRe(value)}["']\\s*:)`);
  return {
    producing: [...sources].filter(([, source]) => produce.test(source)).map(([file]) => file),
    reading: [...sources].filter(([, source]) => read.test(source)).map(([file]) => file),
  };
}

// ═══ THE EXEMPTION ENUMERATION — ONE ENTRY, MEASURED, WITH ITS SITE ════════════════════
//
// An ENUMERATION and never a pattern (ADR-001 decision 5). The entry names the kind, the
// end that is re-spelled, the FILE it is re-spelled in, and why it has not simply been
// fixed. It is a genuine second end that predates this milestone and belongs to another
// lane; fixing it is a one-line import at that site and is the RIGHT eventual answer — it
// is exempted here rather than edited because THIS STORY'S DIFF DOES NOT TOUCH THAT FILE,
// and a gate that forces unrelated edits to land is a gate that gets reverted.
//
// THE BAR IS "OUT OF THE DIFF'S REACH", NOT "SOMEWHERE ELSE" — the drafted second entry
// (`PRESENCE_SIGNAL_KIND`, re-spelled in `src/control-stream-server.mjs`) failed that bar,
// because this story edits that file, and it was FIXED at the site and deleted from here
// before delivery. `src/mesh/assignment-reclaim.mjs` genuinely is untouched by this diff.
//
// A stale entry is itself reported (see `wireKindProblems`), so this list cannot quietly
// outlive its subjects.
export const RESPELT_END_EXEMPTIONS = Object.freeze([
  Object.freeze({
    kind: "WITHDRAW_KIND",
    end: "producing",
    site: "src/mesh/assignment-reclaim.mjs",
    reason: "the reclaim driver sends `kind: \"withdraw\"` as a bare literal rather than importing the constant from worker-stream-client.mjs (which declares it and reads it). A genuine producing end, re-spelled — m35's reclaim lane, predating this milestone.",
  }),
]);

function exemptionFor(kind, end) {
  return RESPELT_END_EXEMPTIONS.find((entry) => entry.kind === kind && entry.end === end) ?? null;
}

// wireKindProblems(sources) — `sources` is a Map<relativePath, comment-stripped source>.
export function wireKindProblems(sources) {
  const problems = [];
  const declarations = [];
  for (const [file, source] of sources) {
    for (const match of source.matchAll(KIND_DECLARATION)) {
      declarations.push({ name: match[1], value: match[2], home: file });
    }
  }

  const satisfiedExemptions = new Set();

  for (const declaration of declarations) {
    const { name, value, home } = declaration;
    const producing = producingEnds(sources, name);
    const reading = readingEnds(sources, name);
    const respelt = respeltEnds(sources, value);

    for (const [end, found, respeltFound] of [
      ["producing", producing, respelt.producing],
      ["reading", reading, respelt.reading],
    ]) {
      if (found.length > 0) continue;
      const exemption = exemptionFor(name, end);
      const respeltElsewhere = respeltFound.filter((file) => file !== home);
      if (exemption != null && respeltElsewhere.length > 0) {
        satisfiedExemptions.add(`${name}:${end}`);
        continue;
      }
      if (respeltElsewhere.length > 0) {
        problems.push(
          `${name} (declared in ${home}) has NO ${end} end spelled with the constant — it is RE-SPELLED as the bare literal "${value}" in ${respeltElsewhere.join(", ")}. Either FIX it at that site (import the constant: one line, and the two sides can then never drift) or add an entry to RESPELT_END_EXEMPTIONS naming the kind, the end, the site and the reason. Never a pattern.`,
        );
        continue;
      }
      problems.push(
        `${name} (declared in ${home}) has NO ${end} end anywhere in src/ — a wire kind with only one end is a lane that cannot work, and it will pass every unit test on the end that exists. This is the exact shape SESSION_SPAWN_ACK_KIND shipped in across THREE accepted stories: built, sent, transported, tested, and read by NOTHING, so every failed session spawn was reported to the operator as a discarded workspace payload. ${end === "reading" ? "Give it a reader (a `=== " + name + "` branch), or delete the kind and its builder." : "Give it a producer (`kind: " + name + "`), or delete the kind and its reader."}`,
      );
    }

    // N3 — the declaring home may supply ONE end, never BOTH.
    const elsewhere = new Set([...producing, ...reading].filter((file) => file !== home));
    if (producing.length > 0 && reading.length > 0 && elsewhere.size === 0) {
      problems.push(
        `${name} (declared in ${home}) has both of its ends INSIDE its own declaring module — nothing else in src/ builds it or branches on it, so it is a wire kind that only ever talks to itself. A contract module owning its own BUILDER is the house shape and is fine; owning both ends is the `
        + `\`wireTerminalBridge\` shape m46/ADR-007 deleted. Either wire the far end, or the kind is not a wire kind and should stop being exported as one.`,
      );
    }
  }

  // …AND THE ENUMERATION CANNOT OUTLIVE ITS SUBJECTS. A stale exemption is a standing
  // permission nobody re-examined — the mechanism by which an enumeration becomes a
  // pattern one entry at a time.
  for (const entry of RESPELT_END_EXEMPTIONS) {
    // AN EXEMPTION IS ONLY IN SCOPE FOR A SWEEP THAT DECLARES ITS KIND. Over the real
    // src/ tree every entry is in scope, which is what makes the staleness check bite; a
    // synthesized two-file fixture simply is not the tree the entry is about.
    if (!declarations.some((declaration) => declaration.name === entry.kind)) continue;
    if (satisfiedExemptions.has(`${entry.kind}:${entry.end}`)) continue;
    problems.push(
      `RESPELT_END_EXEMPTIONS carries a STALE entry for ${entry.kind} (${entry.end} end, ${entry.site}) — that end is no longer missing-and-re-spelled, so the exemption is a standing permission nobody needs. DELETE it: an enumeration that only ever grows becomes a pattern.`,
    );
  }

  return problems;
}

async function listSourceFiles(dir, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listSourceFiles(full, found);
    else if (entry.name.endsWith(".mjs")) found.push(full);
  }
  return found;
}

async function readSrcSources() {
  const sources = new Map();
  for (const file of await listSourceFiles(SRC_DIR)) {
    sources.set(
      path.relative(repoRoot, file).split(path.sep).join("/"),
      lf(stripComments(await readFile(file, "utf8"))),
    );
  }
  return sources;
}

export const archTests = [
  {
    name: "arch/50 ADR-008 FF-B (acd-wire-kind-has-both-ends): every string-valued `*_KIND` declared in src/ has a producing end AND a reading end, both spelled with the constant, with at least one end outside the declaring home — and a re-spelled end is enumerated by name, never matched by a pattern",
    async run() {
      const sources = await readSrcSources();
      assert.ok(sources.size > 100, `the src/ sweep found ${sources.size} modules — a sweep that found almost nothing would pass vacuously`);

      // NON-VACUITY: the sweep must actually FIND the declarations it is about. A regex
      // that matched nothing would make every clause below trivially satisfied.
      const declared = [];
      for (const [, source] of sources) for (const match of source.matchAll(KIND_DECLARATION)) declared.push(match[1]);
      assert.ok(declared.length >= 15, `the sweep found ${declared.length} string-valued *_KIND declarations — expected the full wire vocabulary (>= 15)`);
      assert.ok(declared.includes("SESSION_SPAWN_ACK_KIND"), "the sweep reaches the kind this gate was written about");
      assert.ok(
        !declared.includes("WORKFLOW_KIND"),
        "…and does NOT reach WORKFLOW_KIND, whose value is an OBJECT: it is excluded by the sweep's own shape (N1), never by an exemption that would imply it is a wire kind",
      );

      assert.deepEqual(
        wireKindProblems(sources),
        [],
        "every declared wire kind has both ends, and the re-spelling enumeration is exactly as long as it needs to be",
      );
    },
  },

  {
    name: "arch/50 ADR-008 FF-B (acd-wire-kind-has-both-ends): SESSION_SPAWN_ACK_KIND's reading end is REAL and lives where ADR-008 put it — the control's pre-apply branch and the spawn-outcome registry's filter",
    async run() {
      const sources = await readSrcSources();
      const reading = readingEnds(sources, "SESSION_SPAWN_ACK_KIND");
      const producing = producingEnds(sources, "SESSION_SPAWN_ACK_KIND");

      // THE MEASURED BEFORE/AFTER, pinned as an assertion rather than left in prose. On the
      // tree this story started from, `reading` was EMPTY — the two files below are exactly
      // what this lane added. If a future diff removes either, this gate goes red on the
      // same fact it was written for.
      assert.deepEqual(
        reading.sort(),
        ["src/control-stream-server.mjs", "src/mesh/session-spawn-outcome.mjs"],
        "the ack is branched by the control stream server (before applyStreamFrame) and filtered by the spawn-outcome registry — the two ends the milestone shipped without",
      );
      assert.deepEqual(
        producing.sort(),
        ["src/mesh/session-spawn-directive.mjs"],
        "…and it is built in the lane's ONE contract home, which is the house shape for a wire kind (N3 permits the home to supply exactly this end)",
      );

      // THE RED-AT-HEAD PROOF, driven: delete the two reading ends from the sweep and the
      // gate must fire on THIS kind with the reading-end refusal. That is the pre-ADR-008
      // tree, reconstructed.
      const beforeThisTask = new Map(sources);
      beforeThisTask.delete("src/mesh/session-spawn-outcome.mjs");
      beforeThisTask.set(
        "src/control-stream-server.mjs",
        sources.get("src/control-stream-server.mjs").replace(/frame\?\.kind === SESSION_SPAWN_ACK_KIND/g, 'frame?.kind === "__removed__"'),
      );
      assert.notEqual(
        beforeThisTask.get("src/control-stream-server.mjs"),
        sources.get("src/control-stream-server.mjs"),
        "the reconstruction actually removed the control's branch",
      );
      const beforeProblems = wireKindProblems(beforeThisTask);
      assert.ok(
        beforeProblems.some((problem) => /^SESSION_SPAWN_ACK_KIND/.test(problem) && /NO reading end anywhere/.test(problem)),
        `self-check: the PRE-ADR-008 tree (no registry, no control branch) is RED for SESSION_SPAWN_ACK_KIND's reading end — this gate goes red -> green with the lane. Got: ${JSON.stringify(beforeProblems)}`,
      );
    },
  },

  {
    name: "arch/50 ADR-008 FF-B (acd-wire-kind-has-both-ends) self-check: a kind with no reader, a kind with no producer, a kind whose both ends sit in its own home, a RE-SPELLED end and a STALE exemption each trip — and the clean shape stays quiet",
    async run() {
      const asSweep = (entries) => new Map(entries.map(([file, source]) => [file, lf(stripComments(source))]));

      // The CLEAN shape: a contract home declaring the kind and owning its builder, plus a
      // far module that branches on it. This is the house shape N3 permits.
      const clean = asSweep([
        ["src/lane-contract.mjs", 'export const LANE_KIND = "lane";\nexport function buildLaneFrame(x) { return { kind: LANE_KIND, x }; }'],
        ["src/lane-reader.mjs", 'import { LANE_KIND } from "./lane-contract.mjs";\nif (frame?.kind === LANE_KIND) { handle(frame); }'],
      ]);
      assert.deepEqual(wireKindProblems(clean), [], "self-check: the clean contract-home + far-reader shape stays quiet");

      // PLANT — NO READER. Precisely SESSION_SPAWN_ACK_KIND's shipped shape: a builder, a
      // sender, a transport, a test, and nothing that branches.
      const noReader = asSweep([
        ["src/lane-contract.mjs", 'export const LANE_KIND = "lane";\nexport function buildLaneFrame(x) { return { kind: LANE_KIND, x }; }'],
        ["src/lane-sender.mjs", 'import { buildLaneFrame } from "./lane-contract.mjs";\nexport function send(x) { return sendFrame(buildLaneFrame(x)); }'],
      ]);
      const noReaderProblems = wireKindProblems(noReader);
      assert.equal(noReaderProblems.length, 1, `self-check: a kind with no reader trips exactly once. Got: ${JSON.stringify(noReaderProblems)}`);
      assert.match(noReaderProblems[0], /NO reading end anywhere in src\//, "…with the reading-end refusal");
      assert.match(noReaderProblems[0], /SESSION_SPAWN_ACK_KIND shipped in/, "…and the refusal names the measured instance, so the next reader learns why the rule exists rather than only that it fired");

      // PLANT — NO PRODUCER. The mirror image: something branches on a kind nothing ever
      // sends, which is a reader waiting forever for a frame that cannot arrive.
      const noProducer = asSweep([
        ["src/lane-contract.mjs", 'export const LANE_KIND = "lane";'],
        ["src/lane-reader.mjs", 'import { LANE_KIND } from "./lane-contract.mjs";\nif (frame?.kind === LANE_KIND) { handle(frame); }'],
      ]);
      const noProducerProblems = wireKindProblems(noProducer);
      assert.equal(noProducerProblems.length, 1, `self-check: a kind with no producer trips exactly once. Got: ${JSON.stringify(noProducerProblems)}`);
      assert.match(noProducerProblems[0], /NO producing end anywhere in src\//, "…with the producing-end refusal, which is a DIFFERENT line from the reading-end one");

      // PLANT — BOTH ENDS AT HOME (N3). The `wireTerminalBridge` shape: a module that
      // builds and reads its own kind, so the lane compiles, tests and does nothing.
      const bothAtHome = asSweep([
        ["src/lane-contract.mjs", 'export const LANE_KIND = "lane";\nexport function buildLaneFrame(x) { return { kind: LANE_KIND, x }; }\nexport function apply(frame) { if (frame?.kind === LANE_KIND) return true; return false; }'],
      ]);
      const bothAtHomeProblems = wireKindProblems(bothAtHome);
      assert.equal(bothAtHomeProblems.length, 1, `self-check: both ends inside the declaring home trips. Got: ${JSON.stringify(bothAtHomeProblems)}`);
      assert.match(bothAtHomeProblems[0], /both of its ends INSIDE its own declaring module/, "…naming the self-talking lane");
      assert.match(bothAtHomeProblems[0], /wireTerminalBridge/, "…and the deleted precedent, so the fix is obvious");

      // PLANT — A RE-SPELLED END that is NOT enumerated. It must trip, and the refusal must
      // say RE-SPELLED and point at the site, because "no reader" would send the engineer
      // to write a second one beside the reader already there.
      const respelt = asSweep([
        ["src/lane-contract.mjs", 'export const LANE_KIND = "lane";\nexport function buildLaneFrame(x) { return { kind: LANE_KIND, x }; }'],
        ["src/lane-reader.mjs", 'if (frame?.kind === "lane") { handle(frame); }'],
      ]);
      const respeltProblems = wireKindProblems(respelt);
      assert.equal(respeltProblems.length, 1, `self-check: an unenumerated re-spelled end trips. Got: ${JSON.stringify(respeltProblems)}`);
      assert.match(respeltProblems[0], /RE-SPELLED as the bare literal "lane" in src\/lane-reader\.mjs/, "…naming BOTH the re-spelling and the file it is in");
      assert.match(respeltProblems[0], /RESPELT_END_EXEMPTIONS/, "…and the enumeration it must be added to, if it is not simply fixed");
      assert.ok(
        !/NO reading end anywhere/.test(respeltProblems[0]),
        "…and it does NOT claim the end is missing: 'gone' and 're-spelled' are different facts wanting different fixes, and telling an engineer the reader vanished when it is right there is how a gate gets deleted",
      );

      // THE TWO REAL EXEMPTIONS ARE LIVE, and each is checked against the REAL tree rather
      // than asserted in prose: each names a kind whose end is genuinely missing-as-constant
      // and genuinely present-as-literal, at the file the entry names.
      const sources = await readSrcSources();
      for (const entry of RESPELT_END_EXEMPTIONS) {
        const declaration = [...sources].flatMap(([file, source]) => [...source.matchAll(KIND_DECLARATION)].map((match) => ({ name: match[1], value: match[2], home: file }))).find((d) => d.name === entry.kind);
        assert.ok(declaration != null, `the exempted kind ${entry.kind} is actually declared in src/`);
        const found = entry.end === "reading" ? readingEnds(sources, entry.kind) : producingEnds(sources, entry.kind);
        assert.deepEqual(found, [], `${entry.kind}'s ${entry.end} end is genuinely absent as a constant — the exemption is about a real gap, not a hedge`);
        const respeltFound = respeltEnds(sources, declaration.value)[entry.end];
        assert.ok(
          respeltFound.includes(entry.site),
          `${entry.kind}'s ${entry.end} end is genuinely present as the bare literal at ${entry.site} — the exemption's own site is measured. Found: ${respeltFound.join(", ") || "(none)"}`,
        );
      }

      // PLANT — A STALE EXEMPTION. Drive the mechanism by which an enumeration decays into a
      // pattern: an entry whose subject was fixed and which nobody removed. It is aimed at
      // the ONE live entry, so it exercises the entry that is actually standing rather than a
      // name that no longer appears in the list.
      const staleSweep = asSweep([
        ["src/worker-stream-client.mjs", 'export const WITHDRAW_KIND = "withdraw";\nexport function apply(frame) { if (frame?.kind === WITHDRAW_KIND) return true; return false; }'],
        ["src/mesh/assignment-reclaim.mjs", 'import { WITHDRAW_KIND } from "./worker-stream-client.mjs";\nsend({ kind: WITHDRAW_KIND, to: nodeId });'],
      ]);
      const staleProblems = wireKindProblems(staleSweep);
      assert.ok(
        staleProblems.some((problem) => /STALE entry for WITHDRAW_KIND/.test(problem)),
        `self-check: an exemption whose subject was FIXED is reported as stale, so the list can only shrink by being noticed. Got: ${JSON.stringify(staleProblems)}`,
      );

      // …AND THE SHRINK PATH IS NOT HYPOTHETICAL: `PRESENCE_SIGNAL_KIND` was drafted as this
      // enumeration's second entry and deleted at review, because its re-spelling site
      // (src/control-stream-server.mjs) is a file this story edits. The list is asserted to
      // no longer name it — a deleted exemption that crept back would mean the fix at the
      // site was reverted, and the real-tree sweep above would then be the only thing left
      // to notice.
      assert.ok(
        !RESPELT_END_EXEMPTIONS.some((entry) => entry.kind === "PRESENCE_SIGNAL_KIND"),
        "self-check: the enumeration does NOT carry a PRESENCE_SIGNAL_KIND entry — it was fixed at the site (control-stream-server.mjs imports the constant) rather than exempted",
      );
      assert.deepEqual(
        readingEnds(sources, "PRESENCE_SIGNAL_KIND"),
        ["src/control-stream-server.mjs"],
        "…and the fix is REAL over the live tree: the control's kind table branches the imported constant, so the exemption has nothing left to be about",
      );
    },
  },
];
