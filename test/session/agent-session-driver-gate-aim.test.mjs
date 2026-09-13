// test/session/agent-session-driver-gate-aim.test.mjs — milestone 53 / story 00, task 05
// (05_the-gate-keeps-its-aim.feature; ADR-001 §1, §2 and its Consequences, ADR-010 §19).
//
// The story's second destructive edit, and the one with a silent-green in it.
// `test/arch/assignment/acd-worker-driver-no-headless-print.test.mjs` read ONE file until
// 2026-08-16 — a single `DRIVER_SOURCE` constant at SEVEN `readFile` sites. It read `six` here
// until 119/01, and the sixth was not a miscount: the old two-regex comment stripper ate the
// seventh (`:487`, the `--append-system-prompt` seam read) before this counter could see it, so
// the census agreed with a blinded reader rather than with the file. Making the stripper
// string-aware moved the count to the truth. After the
// extraction its six invariants no longer live in one file, so that constant splits in
// two: DRIVER_SOURCE for invariants 1, 2, 3, 4-producer and 6; HANDLER_SOURCE for
// invariant 4-surfacing and invariant 5. This suite is the acceptance criterion for that
// split, and it exists because a mis-aimed re-point does not fail uniformly.
//
// FIVE OF THE SIX MIS-AIMINGS FAIL LOUDLY. EXACTLY ONE GOES VACUOUSLY GREEN. Invariants
// 2, 3, 4-producer and 6 assert PRESENCE and red immediately against the wrong file; so
// do invariant 4-surfacing and invariant 5, from the other side. **Invariant 1 asserts an
// ABSENCE** — that no `bin: "claude"` + `-p` + `--output-format` one-shot survives — and
// the post-move sink contains no claude launch shape at all, so an invariant 1 left
// pointing at it PASSES while checking nothing AND its own self-check still trips,
// because the plant is appended to whatever source the test was handed. Green primary,
// green self-check, zero information. That is TECH_DEBT item 5's species landing inside
// the milestone's own gate, and the aiming control is what closes it.
//
// EVERY PLANT IS A LITERAL, and a plant that no longer matches is a self-check that
// silently stopped self-checking. Each literal must survive the move byte-for-byte into
// whichever file now owns it — the tree is CRLF, so every probe here normalises before
// matching, the near-miss this milestone family has already been burned by (memory R2,
// m10: a file-pinned source-grep gate silently weakens to vacuity when a re-exported
// helper is extracted to a new module — follow the FUNCTION, not the file).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { archTests as workerDriverGateTests } from "../arch/assignment/acd-worker-driver-no-headless-print.test.mjs";
import { stripComments, matchedBraceBody } from "../support/source-slice.mjs";
import { registeredSuitePaths, registrationSurface } from "../support/registration/registration-surface.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE_FILE = path.join(repoRoot, "test", "arch", "assignment", "acd-worker-driver-no-headless-print.test.mjs");
const DRIVER_FILE = path.join(repoRoot, "src", "agent-session-driver.mjs");
const HANDLER_FILE = path.join(repoRoot, "src", "mesh", "worker-execution.mjs");

const lf = (source) => String(source).replace(/\r\n/g, "\n");

// THE MODULE BOUNDARY IS NOT THE BODY. ADR-001 §2 makes the sink name all seventeen
// moved identifiers on two statements — the verbatim `export … from` line and the
// `import` of the two it consumes inward (ADR-010 §17a). A subject probe asking "does
// the HANDLER still carry the driver's launch composition?" must therefore measure the
// handler's BODY, not the two lines whose entire job is to spell those names. Removing
// them is the one principled rule that keeps every row of the aim table honest, and it
// weakens nothing: a handler that composed or appended the instruction ITSELF would
// still be caught.
function withoutDriverBoundary(code) {
  // 119/01 — `(?:\.\.?\/)+` rather than a pinned `./`: the sink now sits in `src/mesh/` and reaches
  // the driver as `../agent-session-driver.mjs`. A pinned spelling silently stopped cutting the
  // boundary block, which put every re-exported name back into the "body" these aims read.
  return code.replace(/^[ \t]*(?:import|export)\s*\{[\s\S]*?\}\s*from\s*["'](?:\.\.?\/)+agent-session-driver\.mjs["'];?/gm, "");
}

let sourcesCache = null;
async function sources() {
  if (sourcesCache != null) return sourcesCache;
  const gateRaw = lf(await readFile(GATE_FILE, "utf8"));
  const driverRaw = lf(await readFile(DRIVER_FILE, "utf8"));
  const handlerRaw = lf(await readFile(HANDLER_FILE, "utf8"));
  sourcesCache = {
    gate: { raw: gateRaw, stripped: stripComments(gateRaw) },
    driver: { raw: driverRaw, stripped: stripComments(driverRaw), body: withoutDriverBoundary(stripComments(driverRaw)) },
    handler: { raw: handlerRaw, stripped: stripComments(handlerRaw), body: withoutDriverBoundary(stripComments(handlerRaw)) },
  };
  return sourcesCache;
}

// The gate's own source-path constants: `const NAME = path.join(repoRoot, …);`.
function sourceConstants(gateStripped) {
  const out = [];
  const re = /const\s+([A-Z_]+)\s*=\s*path\.join\(\s*repoRoot\s*,\s*([^)]*)\)/g;
  let match;
  while ((match = re.exec(gateStripped)) !== null) {
    const segments = [...match[2].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    out.push({ name: match[1], target: segments.join("/") });
  }
  return out;
}

// Every `readFile(IDENT, …)` site in the gate, by the constant it names.
function readSites(gateStripped) {
  return [...gateStripped.matchAll(/readFile\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,/g)].map((m) => m[1]);
}

// The `run` body of the gate entry whose name contains `marker` — cut on the language's
// own braces (test/support/source-slice.mjs), never a character window.
function gateEntryBody(gateStripped, marker) {
  const at = gateStripped.indexOf(marker);
  if (at < 0) return null;
  return matchedBraceBody(gateStripped, at);
}

// THE AIM TABLE. Each row pairs an invariant with the constant it must read and a probe
// that decides whether the file that constant names actually carries its subject. `absent`
// is what makes the aim non-vacuous: a subject present in BOTH files would pin nothing.
const AIM = [
  {
    invariant: "invariant 1",
    marker: "invariant 1 — no `claude -p`",
    reads: ["DRIVER_SOURCE"],
    subject: "buildDriverCommand's `bin: \"codex\"` argv form — the only launch shape left",
    present: (s) => /bin\s*:\s*["']codex["'][\s\S]{0,120}args\s*:\s*\[/.test(s.driver.body),
    absent: (s) => /bin\s*:\s*["']codex["'][\s\S]{0,120}args\s*:\s*\[/.test(s.handler.body) === false,
  },
  {
    invariant: "invariant 2",
    marker: "invariant 2 — the interactive launch resolves through the terminal-providers seam",
    reads: ["DRIVER_SOURCE"],
    subject: "the resolveProvider import AND a genuine call site",
    present: (s) => /import\s*\{\s*resolveProvider\s*\}\s*from\s*["']\.\/terminal-providers\.mjs["']/.test(s.driver.raw) && /resolveProvider\s*\(/.test(s.driver.body),
    // COMMENT-STRIPPED on the absence side: the handler's own header still NARRATES the
    // terminal-providers seam in prose, and prose is not an import. That is exactly the
    // distinction the census makes too — a mention is not a dependency.
    absent: (s) => /from\s*["'][^"']*terminal-providers\.mjs["']/.test(s.handler.body) === false && /resolveProvider\s*\(/.test(s.handler.body) === false,
  },
  {
    invariant: "invariant 3",
    marker: "invariant 3 — the directive command is typed into PTY stdin",
    reads: ["DRIVER_SOURCE"],
    // 70/06 — the write is now a bracketed-paste BODY (the Enter that submits it is a
    // separate write). The subject the aim tracks is unchanged: the one place the
    // directive + compiled brief is typed into the PTY rather than passed as argv.
    subject: "the one bracketed-paste term.write (directive + compiled brief, 70/00, 70/06)",
    present: (s) => /term\.write\(\s*`\$\{BRACKETED_PASTE_START\}\$\{body\}\$\{BRACKETED_PASTE_END\}`\s*\)/.test(s.driver.body),
    absent: (s) => /term\.write\(\s*`\$\{BRACKETED_PASTE_START\}\$\{body\}\$\{BRACKETED_PASTE_END\}`\s*\)/.test(s.handler.body) === false,
  },
  {
    invariant: "invariant 4",
    marker: "invariant 4 — session_id is captured by the TRANSCRIPT-DIR WATCH",
    reads: ["DRIVER_SOURCE", "HANDLER_SOURCE"],
    subject: "the producer half on the driver (claudeProjectsDir + the watch-seam wiring) and the surfacing half on the handler (sessionId on both frames)",
    present: (s) =>
      /import\s*\{[^}]*\bclaudeProjectsDir\b[^}]*\}\s*from\s*["']\.\/work\/observe\.mjs["']/.test(s.driver.raw)
      && /claudeProjectsDir\s*\(/.test(s.driver.body)
      && /options\.watchTranscriptSessionId\s*\?\?\s*defaultWatchTranscriptSessionId/.test(s.driver.body)
      && /(?:sendAssignmentStatus\?\.|reportSettled)\(\s*assignmentId,\s*["']done["'],\s*\{[^}]*sessionId[^}]*\}\s*\)/.test(s.handler.body),
    absent: (s) =>
      /from\s*["'][^"']*work-observe\.mjs["']/.test(s.handler.body) === false
      && /claudeProjectsDir\s*\(/.test(s.handler.body) === false
      && /sendAssignmentStatus/.test(s.driver.body) === false
      && /reportSettled/.test(s.driver.body) === false,
  },
  {
    invariant: "invariant 6",
    marker: "invariant 6 — BOTH sentinel producers EXIST",
    reads: ["DRIVER_SOURCE"],
    subject: "both producers composed into WORKER_SESSION_INSTRUCTION and appended to the launch",
    present: (s) =>
      /WORKER_SESSION_INSTRUCTION\s*=\s*`\$\{\s*NEEDS_INPUT_INSTRUCTION\s*\}[\s\S]*?\$\{\s*DIRECTIVE_COMPLETE_INSTRUCTION\s*\}/.test(s.driver.body)
      && /["']--append-system-prompt["'][\s\S]{0,40}WORKER_SESSION_INSTRUCTION/.test(s.driver.body),
    absent: (s) => /WORKER_SESSION_INSTRUCTION/.test(s.handler.body) === false,
  },
  {
    invariant: "invariant 5",
    marker: "invariant 5 — a needs-input outcome's branch calls NO removeWorktree",
    reads: ["HANDLER_SOURCE"],
    subject: "the needs-input branch, the done branch's force-remove, and the assignment vocabulary itself",
    present: (s) =>
      /if\s*\(\s*outcome\.outcome\s*===\s*["']needs-input["']\s*\)\s*\{/.test(s.handler.body)
      && /removeWorktree\s*\(/.test(s.handler.body)
      && /force\s*:\s*true/.test(s.handler.body)
      && /\bassignmentId\b/.test(s.handler.body),
    // `assignmentId` outside a comment is the sharpest single token of the whole split:
    // the driver is mesh-blind, so the assignment lifecycle's own vocabulary must not
    // appear in its body at all (the moved block's only occurrences were in comments,
    // ADR-010 §19d).
    absent: (s) =>
      /if\s*\(\s*outcome\.outcome\s*===\s*["']needs-input["']\s*\)\s*\{/.test(s.driver.body) === false
      && /removeWorktree\s*\(/.test(s.driver.body) === false
      && /\bassignmentId\b/.test(s.driver.body) === false,
  },
  {
    invariant: "registration",
    marker: "this fitness test and the 4 task-traceability test files are registered",
    // ── 119/03 AMENDMENT: the subject moved, so the aim moved with it ──────────────────────
    // This row said the registration invariant reads TEST_SUITE, because until 119/03 the
    // runner's own text WAS where registration was written down. The registry names DIRECTORIES
    // now: a suite is registered by its own directory's index, and the runner spreads that index.
    // `scripts/test.mjs` names no suite at all, so a leg still reading it would be reading a file
    // that no longer carries its subject — which is precisely what this table exists to catch.
    //
    // The aim survives, and is not weakened, because the invariant reaches its subject through
    // ONE named home instead of a `readFile`: `registeredSuitePaths` (119/ADR-010, the surface's
    // single assembler). So `reads` is empty — no file path constant is read — and `present`
    // asserts the leg reaches that home, which is the same question "does it read the file that
    // carries its subject?" was asking. `absent` keeps the other half honest: the leg must NOT
    // have quietly kept a hand-rolled read of the runner beside the helper.
    reads: [],
    subject: "the registration surface, reached through registeredSuitePaths",
    present: (s) => /\bregisteredSuitePaths\s*\(/.test(s.gate.stripped),
    absent: (s) => /readFile\s*\(\s*(?:TEST_SUITE|RUNNER)/.test(s.gate.stripped) === false,
  },
];

// THE PLANT ANCHORS. Every self-check in the gate replaces or strips one of these
// literals; a literal that no longer matches the source it is applied to is a self-check
// that silently stopped self-checking. `owner` is the file that must carry it after the
// move.
const PLANT_ANCHORS = [
  { invariant: "invariant 2", owner: "driver", on: "raw", literal: 'import { resolveProvider } from "./terminal-providers.mjs";' },
  { invariant: "invariant 3", owner: "driver", on: "stripped", literal: "term.write(`${BRACKETED_PASTE_START}${body}${BRACKETED_PASTE_END}`);" },
  { invariant: "invariant 4 producer", owner: "driver", on: "stripped", literal: "options.watchTranscriptSessionId ?? defaultWatchTranscriptSessionId" },
  { invariant: "invariant 6 (launch append)", owner: "driver", on: "stripped", literal: '"--append-system-prompt", WORKER_SESSION_INSTRUCTION' },
  { invariant: "invariant 6 (composition)", owner: "driver", on: "stripped", literal: "${DIRECTIVE_COMPLETE_INSTRUCTION}" },
];

export const agentSessionDriverGateAimTests = [
  {
    name: "53/00 task05 — the gate is green after the split, and its exported array is non-empty (a suite that stopped exporting cannot pass by being empty)",
    run: async () => {
      assert.ok(Array.isArray(workerDriverGateTests), "the arch test exports an archTests array");
      assert.ok(workerDriverGateTests.length >= 7, `and it is non-empty: ${workerDriverGateTests.length} entries`);
      for (const entry of workerDriverGateTests) {
        assert.equal(typeof entry.run, "function", `${entry.name} is runnable`);
        await entry.run();
      }
    },
  },
  {
    name: "53/00 task05 — the gate names exactly two source files and reads no third: every readFile site uses one of them or the runner path, and neither source constant is left unread",
    run: async () => {
      const s = await sources();
      const constants = sourceConstants(s.gate.stripped);
      const sourceSide = constants.filter((c) => c.target.startsWith("src/"));
      assert.equal(sourceSide.length, 2, `exactly two source-path constants: ${constants.map((c) => `${c.name}=${c.target}`).join(", ")}`);
      assert.deepEqual(
        sourceSide.map((c) => [c.name, c.target]).sort(),
        [["DRIVER_SOURCE", "src/agent-session-driver.mjs"], ["HANDLER_SOURCE", "src/mesh/worker-execution.mjs"]],
        "one names the new module, one names the sink",
      );
      // 119/03 — there is no third constant. The gate declared a runner path because its
      // registration leg read the runner's text; that leg now reaches the registration surface
      // through `registeredSuitePaths`, so the constant went with the read. A path constant left
      // behind unread is exactly the "neither source constant is left unread" defect this leg
      // names, one file over.
      assert.equal(constants.length, 2, `the gate declares only the two source-path constants: ${constants.map((c) => `${c.name}=${c.target}`).join(", ")}`);
      assert.equal(constants.some((c) => c.target === "scripts/test.mjs"), false, "and no runner path constant survives unread");

      const known = new Set(constants.map((c) => c.name));
      const sites = readSites(s.gate.stripped);
      assert.ok(sites.length >= 8, `the gate's read sites were actually found (non-vacuous): ${sites.length}`);
      for (const ident of sites) {
        assert.ok(known.has(ident), `readFile(${ident}) names one of the gate's own path constants`);
      }
      // No read site is left pointing at a single undivided constant: BOTH halves of the
      // split are genuinely used, so a "split" that renamed one constant and aimed every
      // site at it fails here.
      assert.ok(sites.includes("DRIVER_SOURCE"), "DRIVER_SOURCE is read");
      assert.ok(sites.includes("HANDLER_SOURCE"), "HANDLER_SOURCE is read");
      assert.equal(sites.filter((i) => i === "DRIVER_SOURCE").length, 7, "the five extracted-driver invariants plus the later gate extensions read the driver source");
      assert.equal(sites.filter((i) => i === "HANDLER_SOURCE").length, 2, "two read the handler source (invariant 4-surfacing and invariant 5)");
      assert.equal(sites.filter((i) => i === "TEST_SUITE").length, 0, "and none reads the runner — 119/03 moved registration off the runner's text and onto the registration surface");
      assert.equal(sites.length, 9, "the extracted gate's seven source reads plus one later driver-source read remain explicitly counted — 10 since 119/01 (a string-aware comment stripper revealed the seventh DRIVER_SOURCE read the old one had been eating), and 9 since 119/03 dropped the runner read");
    },
  },
  {
    name: "53/00 task05 — each invariant reads the file that carries its subject, and an aim whose named file does not carry its subject fails here",
    run: async () => {
      const s = await sources();
      for (const row of AIM) {
        const body = gateEntryBody(s.gate.stripped, row.marker);
        assert.ok(body != null, `${row.invariant}: its entry was found in the gate (the cut is on braces, never a window)`);
        const reads = [...new Set(readSites(body))];
        assert.deepEqual(reads.sort(), [...row.reads].sort(), `${row.invariant} reads exactly ${row.reads.join(" + ")}`);
        assert.equal(row.present(s), true, `${row.invariant}: the file it reads carries its subject — ${row.subject}`);
        assert.equal(row.absent(s), true, `${row.invariant}: and the OTHER file does not, so the aim is not satisfiable by either`);
      }
    },
  },
  {
    name: "53/00 task05 — invariant 1 is aimed by a POSITIVE CONTROL, because its own absence assertion cannot detect a mis-aim",
    run: async () => {
      const s = await sources();
      // The control the gate itself must carry: the source invariant 1 reads has to
      // contain a driver launch shape at all.
      const body = gateEntryBody(s.gate.stripped, "invariant 1 — no `claude -p`");
      assert.ok(/hasDriverLaunchShape\s*\(/.test(body), "invariant 1's own body proves the source it read carries a launch shape before asserting the absence");
      assert.ok(body.indexOf("hasDriverLaunchShape") < body.indexOf("hasClaudeHeadlessPrintShape"), "and it does so FIRST — an absence is only evidence when measured over a source with presences in it");

      const launchShape = /bin\s*:\s*["']codex["'][\s\S]{0,120}args\s*:\s*\[/;
      assert.equal(launchShape.test(s.driver.body), true, "the file invariant 1 reads contains buildDriverCommand's `bin: \"codex\"` argv form");
      assert.equal(launchShape.test(s.handler.body), false, "the file invariant 1 does NOT read contains no launch shape at all");
      assert.equal(/bin\s*:\s*["']claude["']/.test(s.handler.body), false, "…not a claude one either — which is exactly why a mis-aimed invariant 1 would pass while checking nothing");

      // THE VACUOUS GREEN, demonstrated rather than described: the absence assertion AND
      // its own plant both pass against the post-move handler. That pair is what the
      // positive control turns into a red.
      const headlessShape = /bin\s*:\s*["']claude["'][\s\S]{0,120}args\s*:\s*\[[\s\S]{0,160}-p[\s\S]{0,160}--output-format/;
      const misaimed = s.handler.body;
      assert.equal(headlessShape.test(misaimed), false, "mis-aimed: the primary absence assertion PASSES");
      const plantedOnMisaim = `${misaimed}\nfunction plantedHeadless() { return { bin: "claude", args: ["-p", prompt, "--output-format", "json"] }; }\n`;
      assert.equal(headlessShape.test(plantedOnMisaim), true, "mis-aimed: and the self-check plant STILL trips — green primary, green self-check, zero information");
      assert.equal(launchShape.test(misaimed), false, "…and the positive control is the one thing that reds on that source");
    },
  },
  {
    name: "53/00 task05 — the invariant-4 site reads BOTH sources, and neither half is asserted against the other's source",
    run: async () => {
      const s = await sources();
      const body = gateEntryBody(s.gate.stripped, "invariant 4 — session_id is captured by the TRANSCRIPT-DIR WATCH");
      assert.ok(body != null, "the invariant-4 entry was found");
      const reads = readSites(body);
      assert.ok(reads.includes("DRIVER_SOURCE"), "it reads the driver source for the producer half");
      assert.ok(reads.includes("HANDLER_SOURCE"), "and the handler source for the surfacing half");
      // The producer detector is called on the DRIVER pair and the surfacing detector on
      // the HANDLER pair — never crossed.
      assert.match(body, /capturesSessionIdViaTranscriptWatch\(\s*raw,\s*stripped\s*\)/, "the producer half is asserted over the driver's raw/stripped pair");
      assert.match(body, /surfacesSessionIdOnStatusFrames\(\s*handlerStripped\s*\)/, "the surfacing half over the handler's");
      assert.equal(/surfacesSessionIdOnStatusFrames\(\s*stripped\s*\)/.test(body), false, "the surfacing half is never asserted against the driver's source");
      assert.equal(/capturesSessionIdViaTranscriptWatch\(\s*handlerRaw/.test(body), false, "nor the producer half against the handler's");
    },
  },
  {
    name: "53/00 task05 — every plant's literal anchor survives the move byte-for-byte into the file that now owns it (CRLF-normalised), and is absent from the other",
    run: async () => {
      const s = await sources();
      for (const anchor of PLANT_ANCHORS) {
        const owner = s[anchor.owner][anchor.on];
        const other = s[anchor.owner === "driver" ? "handler" : "driver"][anchor.on];
        assert.ok(owner.includes(anchor.literal), `${anchor.invariant}: the plant's literal is found exactly as the plant spells it — "${anchor.literal}"`);
        assert.equal(other.includes(anchor.literal), false, `${anchor.invariant}: and NOT in the other file, so the plant cannot be aimed at the wrong one`);
      }
      // Invariant 4's surfacing plant and invariant 5's branch plant are HANDLER-side and
      // are shape-matched rather than spelled, so they are anchored by their regexes.
      assert.match(s.handler.body, /(?:sendAssignmentStatus\?\.|reportSettled)\(\s*assignmentId,\s*["']done["'],\s*\{\s*runId:\s*runRecord\.runId,\s*sessionId[^}]*\}\s*\)/, "invariant 4's surfacing plant still matches the done frame it reverts");
      assert.match(s.handler.body, /if\s*\(\s*outcome\.outcome\s*===\s*["']needs-input["']\s*\)\s*\{/, "invariant 5's branch plant still finds the branch it re-plants");
      // A literal found in NEITHER file must fail here rather than at a mystery red
      // inside the gate.
      assert.equal(s.driver.stripped.includes("term.write(`${directive}\\r`);"), false, "self-check: a literal nobody owns is genuinely absent, so this probe is not trivially true");
    },
  },
  {
    name: "53/00 task05 — the plants still CHANGE the source they are planted into, so the gate's own assert.notEqual(planted, source) precondition holds for every one",
    run: async () => {
      const s = await sources();
      const plants = [
        { label: "invariant 1 — the appended headless shape", source: s.driver.stripped, apply: (src) => `${src}\nfunction plantedHeadless() { return { bin: "claude", args: ["-p", prompt, "--output-format", "json"] }; }\n` },
        { label: "invariant 2 — strip the resolveProvider import", source: s.driver.raw, apply: (src) => src.replace(/import \{ resolveProvider \} from "\.\/terminal-providers\.mjs";\r?\n/, "") },
        { label: "invariant 2 — rename every call site", source: s.driver.stripped, apply: (src) => src.replace(/resolveProvider\s*\(/g, "notResolveProvider(") },
        { label: "invariant 3 — remove the command write", source: s.driver.stripped, apply: (src) => src.replace(/term\.write\(\s*`\$\{BRACKETED_PASTE_START\}\$\{body\}\$\{BRACKETED_PASTE_END\}`\s*\);/, "/* command intentionally not written */") },
        { label: "invariant 4 — sever the watch-seam wiring", source: s.driver.stripped, apply: (src) => src.replace(/options\.watchTranscriptSessionId\s*\?\?\s*defaultWatchTranscriptSessionId/, "null /* producer removed */") },
        { label: "invariant 4 — revert the done frame to the discard shape", source: s.handler.stripped, apply: (src) => src.replace(/(?:sendAssignmentStatus\?\.|reportSettled)\(\s*assignmentId,\s*["']done["'],\s*\{\s*runId:\s*runRecord\.runId,\s*sessionId[^}]*\}\s*\)/, 'reportSettled(assignmentId, "done", { runId: runRecord.runId })') },
        { label: "invariant 6 — remove the launch append", source: s.driver.stripped, apply: (src) => src.replace(/["']--append-system-prompt["'],\s*WORKER_SESSION_INSTRUCTION/, "/* session-instruction producers removed */") },
        { label: "invariant 6 — drop DIRECTIVE_COMPLETE from the composition", source: s.driver.stripped, apply: (src) => src.replace(/\$\{\s*DIRECTIVE_COMPLETE_INSTRUCTION\s*\}/, "") },
      ];
      for (const plant of plants) {
        const planted = plant.apply(plant.source);
        assert.notEqual(planted, plant.source, `${plant.label}: the plant actually changed the source it was applied to`);
      }
      // Invariant 5's plant is derived from the branch body it finds, so it is applied
      // the same way the gate applies it.
      const gateBody = /if\s*\(\s*outcome\.outcome\s*===\s*["']needs-input["']\s*\)\s*\{/.exec(s.handler.stripped);
      assert.ok(gateBody != null, "invariant 5's branch is present in the handler (the precondition for its plant)");
      const branchBody = matchedBraceBody(s.handler.stripped, gateBody.index);
      assert.ok(branchBody != null && branchBody.length > 0, "and its body cuts on braces");
      const plantedBranch = s.handler.stripped.replace(branchBody, `${branchBody}\n await removeWorktree(ws.projectRoot, assignmentId, { exec, force: true });\n`);
      assert.notEqual(plantedBranch, s.handler.stripped, "invariant 5: the force-remove plant changes the handler source");
    },
  },
  {
    name: "53/00 task05 — the behavioural legs still drive through the re-export: the gate's import line at the top is byte-unchanged and still names the sink",
    run: async () => {
      const s = await sources();
      // 119/03 — the NAMES and the MODULE are the claim; the `../` depth is not. This assertion
      // pinned `../../`, which was true only while the gate sat at `test/arch/`; it now sits at
      // `test/arch/assignment/` and reaches the same sink one hop further out. The gate moving is
      // not the gate being re-pointed, and the second leg below is what still says so.
      assert.match(
        s.gate.raw,
        /import \{ driveInteractiveClaudeSession, NEEDS_INPUT_SENTINEL \} from "(?:\.\.\/)+src\/mesh\/worker-execution\.mjs";/u,
        "the gate's import line still takes both names FROM THE SINK — the verbatim re-export is what keeps it so",
      );
      assert.equal(/from "(?:\.\.\/)+src\/agent-session-driver\.mjs"/u.test(s.gate.raw), false, "the gate was NOT re-pointed at the new module for its behavioural legs");
      // And the legs themselves resolve their outcomes — the four gate entries carrying a
      // behavioural half are run here as well as by the green lane above.
      const behavioural = workerDriverGateTests.filter((t) => /invariant (?:2b|3|4|5)\b/.test(t.name));
      assert.ok(behavioural.length >= 4, `the behavioural legs were found: ${behavioural.length}`);
      for (const entry of behavioural) await entry.run();
    },
  },
  {
    name: "53/00 task05 — the registration leg still passes and this story's suites are additive to it: no existing registration is removed",
    run: async () => {
      const registered = await registeredSuitePaths(repoRoot);
      const surface = await registrationSurface(repoRoot);
      assert.ok(registered.has("test/arch/assignment/acd-worker-driver-no-headless-print.test.mjs") && surface.includes("...acdWorkerDriverNoHeadlessPrintTests"), "the gate still finds itself in the registration surface");
      for (const [file, spread] of [
        ["test/mesh/worker/mesh-worker-driver-interactive-pty.test.mjs", "...meshWorkerDriverInteractivePtyTests"],
        ["test/mesh/worker/mesh-worker-driver-directive-command.test.mjs", "...meshWorkerDriverDirectiveCommandTests"],
        ["test/mesh/worker/mesh-worker-driver-needs-input.test.mjs", "...meshWorkerDriverNeedsInputTests"],
        ["test/mesh/worker/mesh-worker-driver-session-id.test.mjs", "...meshWorkerDriverSessionIdTests"],
      ]) {
        assert.ok(registered.has(file) && surface.includes(spread), `${file} is still imported and spread`);
      }

      // ── 119/03 AMENDMENT: the labelled BLOCK is gone, and the claim it carried is not ────────
      // ADR-011 §1's "additive, never edits to another story's" was asserted POSITIONALLY: this
      // story's five sat under a `// milestone 53 / story 00` comment in `scripts/test.mjs`, and
      // milestone 52's six sat under their own. Since 119/03 the registry names DIRECTORIES and
      // each directory's index names its own members, so there is no block to be adjacent in —
      // this story's five live under `test/session/` and milestone 52's six under `test/loop/`.
      //
      // The claim is re-stated as OWNERSHIP: each of the five is registered exactly once, by
      // `test/session/index.mjs` and by no other index; and milestone 52's six are still spread,
      // which is the falsifiable form of "nothing else was touched". A story that edited another
      // story's registration would have to remove a name from an index that is not its own, and
      // that is what these two loops decide.
      const sessionIndex = await readFile(path.join(repoRoot, "test", "session", "index.mjs"), "utf8");
      for (const [file, spread] of [
        ["test/session/agent-session-driver-door.test.mjs", "...agentSessionDriverDoorTests"],
        ["test/session/agent-session-driver-drives.test.mjs", "...agentSessionDriverDrivesTests"],
        ["test/session/agent-session-driver-transcript.test.mjs", "...agentSessionDriverTranscriptTests"],
        ["test/session/agent-session-driver-runtime-dispatch.test.mjs", "...agentSessionDriverRuntimeDispatchTests"],
        ["test/session/agent-session-driver-gate-aim.test.mjs", "...agentSessionDriverGateAimTests"],
      ]) {
        assert.ok(registered.has(file), `${file} is registered`);
        assert.equal(sessionIndex.split(`./${path.basename(file)}"`).length - 1, 1, `${file} is named EXACTLY once, by its own directory's index`);
        assert.ok(surface.includes(spread), `${file}'s array is spread — TECH_DEBT item 50's shape is an import with no spread`);
      }
      for (const spread of ["...workLoopsRecordTests", "...workLoopsValueTests", "...workLoopsChecksTests", "...workLoopsCommandsTests", "...workLoopsRegistryCensusTests", "...workLoopsCoverageLedgerTests"]) {
        assert.ok(surface.includes(spread), `the milestone 52 / story 05 registrations are untouched: ${spread}`);
      }
    },
  },
  {
    name: "53/00 task05 — both source reads return real text: a constant naming a path that does not exist fails here rather than passing every absence assertion",
    run: async () => {
      const s = await sources();
      assert.ok(existsSync(DRIVER_FILE), "the driver source exists on disk");
      assert.ok(existsSync(HANDLER_FILE), "the handler source exists on disk");
      assert.ok(s.driver.raw.length > 10_000, `the driver source is a real document: ${s.driver.raw.length} chars`);
      assert.ok(s.handler.raw.length > 10_000, `the handler source is a real document: ${s.handler.raw.length} chars`);
      assert.ok(s.driver.stripped.trim().length > 0, "and non-empty after comment-stripping");
      assert.ok(s.handler.stripped.trim().length > 0, "and so is the handler's");
      // The subtraction is measured: the handler shrank and the driver carries what left.
      const handlerLines = s.handler.raw.split("\n").length;
      assert.ok(handlerLines < 2_600, `the sink shrank through this seam: ${handlerLines} lines (3,286 before the move)`);
      assert.ok(s.driver.raw.split("\n").length > 900, "and the driver carries the ~1,000 moved lines");
    },
  },
];
