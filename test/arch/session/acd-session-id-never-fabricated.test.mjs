// Fitness function: acd-session-id-never-fabricated (milestone 48 / ADR-001,
// fitness #1) — "the routable session id is READ from the assistant, never made."
//
// WHY THIS IS THE LOAD-BEARING NEGATIVE. RESEARCH §2 measured that the id a hook
// delivers is the SAME Claude Code UUID the worker captures off the transcript
// filename and stamps onto an assignment — the id the terminal mirror already routes
// on. A fabricated id would be stable and unique and WRONG: indistinguishable on the
// wire from a real one, so a surface would open a socket on a tuple that routes
// nowhere. A per-invocation random id would also break pingSession's idempotency
// (every ping would mint a new session, unbounded); a hash of
// (nodeId, workspaceId, assistant) is just today's colliding triple wearing a UUID's
// clothes. So: no id on any channel is `null` — live, first-class, NOT addressable —
// and that is a state the record STATES rather than papers over.
//
// SCOPE, per 48/ADR-010 R1's explicit instruction to this test's author: the detector
// is scoped to a value ASSIGNED TO A SESSION ID, not to any generator call in the
// file. The 4th leaf segment's percent-ENCODING (sessionSegment) is a filename
// composition, not an id transformation, and must not be read as one.
//
// Proofs:
//  1. STRUCTURAL — in BOTH files of the id path (src/commands/mesh-session.mjs,
//     src/mesh/session.mjs), no value assigned to a session id is produced by a
//     generator (randomUUID / Math.random / createHash(...).digest / randomBytes /
//     Date.now()) or by a normalisation (toLowerCase / trim / slice / replace / …).
//  2. STRUCTURAL — the ladder is ORDERED and complete: `--session` is a real member of
//     SESSION_FLAGS; the flag is read FIRST (ahead of the hook rungs); inside
//     resolveSessionIdentity the payload rung is evaluated BEFORE the env rung; and an
//     unresolved id returns `sessionId: null`.
//  3. BEHAVIOURAL (m38/ADR-008, fed by the REAL producer) — the real
//     `meshSessionCommand` with NO id on any channel writes `sessionId: null` (not a
//     generated value, not a missing key), stably across two invocations; a
//     payload-supplied id is stored BYTE-IDENTICAL.
//  Self-check (m03 non-vacuous): four plants plant INTO THE REAL SOURCE TEXT — a
//  randomUUID() fallback, a triple-derived hash fallback, a lowercasing normalisation,
//  and a RENAME that empties the detector's match list — and each is asserted to have
//  LANDED (the tree is CRLF: the plant normalises line endings and fails loudly if its
//  needle was not found) before it is asserted to trip the SAME detector the real source
//  passes. The rename plant is the one that keeps the others honest: `fabricationViolations`
//  LOOPS a match list, so an emptied list would pass having checked nothing — it now
//  refuses to rule until it has found an id being assigned.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { meshSessionCommand } from "../../../src/commands/mesh/session.mjs";
import { readSessionRecord, readSessionRecordsForNode } from "../../../src/mesh/session.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const commandSourcePath = path.join(repoRoot, "src", "commands", "mesh", "session.mjs");
const sessionSourcePath = path.join(repoRoot, "src", "mesh", "session.mjs");

const NODE_ID = "node-a";
const NOW = "2026-08-10T12:00:00.000Z";

// The tree is CRLF (src/mesh/session.mjs) AND LF (src/commands/mesh-session.mjs) —
// every plant below normalises first, so a needle can never miss for an invisible
// reason.
function normalise(source) {
  return source.replace(/\r\n/g, "\n");
}

// ORDER MATTERS (TECH_DEBT item 24): LINE comments are stripped FIRST. Blocks-first lets
// a `/*` inside a line comment (`templates/work/<type>/*.md`) open a PHANTOM block that
// swallows everything to the next `*/` — measured at 33,549 characters across five src/
// modules, work.mjs's `loadWorkspace` among them. `acd-session-ttl-reuses-isstale` has
// had the correct order all along. The `(^|[^:])` guard stays: a `://` is not a comment.
function stripComments(source) {
  return source.replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

const GENERATORS = /\brandomUUID\b|\bMath\.random\b|\bcreateHash\b|\brandomBytes\b|\buuidv4\b|\bnanoid\b|\bDate\.now\s*\(/;
const NORMALISATIONS = /\.toLowerCase\s*\(|\.toUpperCase\s*\(|\.trim\s*\(|\.slice\s*\(|\.substring\s*\(|\.replace\s*\(|\.padStart\s*\(|\.normalize\s*\(/;

// Every value ASSIGNED TO a session id, in either the `sessionId = …` or the
// `sessionId: …` form — the exact scope ADR-010 R1 requires.
function sessionIdAssignments(code) {
  return [...stripComments(code).matchAll(/\b(?:sessionId|session_id)\s*(?:=|:)\s*([^;\n]*)/g)].map((match) => match[1].trim());
}

function fabricationViolations(code, label) {
  const problems = [];
  const assignments = sessionIdAssignments(code);
  // NON-VACUITY, STATED RATHER THAN ASSUMED — the shape `recordViolations` uses in
  // acd-session-attribution-single-authority, which refuses to rule on what is ABSENT
  // until it has seen what should be PRESENT. This rule LOOPS a match list, so an empty
  // list makes it pass having checked nothing: a rename of `sessionId`, or a comment
  // stripper that deleted the region (TECH_DEBT item 24), empties it silently and this
  // file stays green. Measured yield today: 4 assignments in the CLI face, 6 in the
  // session module.
  if (assignments.length === 0) {
    problems.push(`${label}: this file assigns NOTHING to a session id — the detector cannot rule on HOW an id is produced until it has found an id being produced, and an empty match list would pass for the wrong reason (a rename, or a blinded stripper, is the usual cause)`);
    return problems;
  }
  for (const rhs of assignments) {
    if (GENERATORS.test(rhs)) problems.push(`${label}: a session id is assigned a GENERATED value — "${rhs}"`);
    if (NORMALISATIONS.test(rhs)) problems.push(`${label}: a session id is assigned a TRANSFORMED value — "${rhs}"`);
  }
  return problems;
}

// The plant helper: replace `needle` with `plant`, and PROVE the replacement landed
// before any assertion is made about it.
function plant(source, needle, replacement) {
  const code = normalise(source);
  assert.ok(code.includes(needle), `the plant's needle must exist in the real source (CRLF-normalised): ${needle}`);
  const planted = code.replace(needle, replacement);
  assert.notEqual(planted, code, "the plant LANDED in the source text");
  assert.ok(planted.includes(replacement), "the planted text is present in the planted source");
  return planted;
}

async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-acd-session-id-never-fabricated-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  return { tmp, root, home, env, ws: await loadWorkspace(root, undefined, { env }) };
}

function ctxFor(fixture, { stdinText = "", env, now = NOW } = {}) {
  return {
    cwd: fixture.root,
    env: env ?? fixture.env,
    nodeId: NODE_ID,
    stdinText,
    now: () => now,
    loadWorkspace: (cwd, config) => loadWorkspace(cwd, config, { env: fixture.env }),
  };
}

// The CLI face writes its envelope on stdout; a fitness function should not.
async function runCommand(args, ctx) {
  const lines = [];
  const originalLog = console.log;
  console.log = (message) => lines.push(message);
  try {
    await meshSessionCommand(args, ctx);
  } finally {
    console.log = originalLog;
  }
  return lines;
}

export const archTests = [
  {
    name: "arch/48 ADR-001 (acd-session-id-never-fabricated): STRUCTURAL — no value assigned to a session id, in either file of the id path, is generated or normalised",
    run: async () => {
      const problems = [
        ...fabricationViolations(await readFile(commandSourcePath, "utf8"), "src/commands/mesh/session.mjs"),
        ...fabricationViolations(await readFile(sessionSourcePath, "utf8"), "src/mesh/session.mjs"),
      ];
      assert.deepEqual(problems, [], `the id must be READ, never made or rewritten:\n  ${problems.join("\n  ")}`);
    },
  },
  {
    name: "arch/48 ADR-001 (acd-session-id-never-fabricated): STRUCTURAL — the ladder is ORDERED (`--session` → payload session_id → CLAUDE_SESSION_ID → null) and `--session` is a real flag",
    run: async () => {
      const code = stripComments(normalise(await readFile(commandSourcePath, "utf8")));

      const flagSet = code.match(/const SESSION_FLAGS = new Set\(\[([^\]]*)\]\)/);
      assert.ok(flagSet, "SESSION_FLAGS is declared as a literal set");
      assert.ok(/"session"/.test(flagSet[1]), "`--session` is a REAL flag — a member of SESSION_FLAGS, not a test seam");

      // Rung 1 beats rungs 2-3: the flag is consulted first, and only then the
      // hook-resolved id.
      assert.match(
        code,
        /const sessionId\s*=\s*nonBlank\(options\.session\)\s*\?\?\s*identity\.sessionId/,
        "the `--session` flag HEADS the ladder, falling through to the hook-resolved id",
      );

      // Rung 2 beats rung 3, INSIDE resolveSessionIdentity: payload.session_id is
      // evaluated before env.CLAUDE_SESSION_ID, and an unresolved id is null.
      const resolver = code.slice(code.indexOf("export function resolveSessionIdentity"));
      const body = resolver.slice(0, resolver.indexOf("\n}"));
      const payloadRung = body.indexOf("session_id");
      const envRung = body.indexOf("CLAUDE_SESSION_ID");
      assert.ok(payloadRung >= 0, "the payload rung is present");
      assert.ok(envRung >= 0, "the env rung is present");
      assert.ok(payloadRung < envRung, "the payload rung is evaluated BEFORE the env rung");
      assert.match(body, /sessionId:\s*null/, "an unresolved id resolves to null — the ladder's last rung");
    },
  },
  {
    name: "arch/48 ADR-001 (acd-session-id-never-fabricated): BEHAVIOURAL (real producer) — no id on any channel writes sessionId: null, stably; a supplied id is stored byte-identical",
    run: async () => {
      const fixture = await makeFixture();
      try {
        // No flag, no payload, no env — the anonymous path.
        await runCommand(["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code"], ctxFor(fixture, { env: {} }));
        const anonymous = await readSessionRecord(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code", sessionId: null });
        assert.ok(anonymous, "an anonymous session is still written — a session with no id is a session");
        assert.ok(Object.hasOwn(anonymous, "sessionId"), "the key is PRESENT");
        assert.strictEqual(anonymous.sessionId, null, "the value is exactly null — not a UUID, not \"null\", not \"\"");

        // The cheap oracle for "was this generated": a generator produces a DIFFERENT
        // value the second time. `null` twice cannot have been made.
        await runCommand(["start", "--workspace", "ws-1", "--repo", "demo", "--assistant", "claude-code"], ctxFor(fixture, { env: {}, now: "2026-08-10T12:00:05.000Z" }));
        const again = await readSessionRecord(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code", sessionId: null });
        assert.strictEqual(again.sessionId, null, "an absent id is STABLE, not a value that varies per invocation");
        const records = await readSessionRecordsForNode(fixture.ws, NODE_ID);
        assert.equal(records.length, 1, "the second anonymous start resolved to the SAME one record — no id was minted to distinguish them");

        // A payload-supplied id is stored byte-identical — mixed case, the leaf
        // separator, and surrounding space all survive.
        const supplied = "  3F2b9C14-8a7E-4d61-9F03-1c5EA77B42d9~weird  ";
        await runCommand(
          ["start", "--workspace", "ws-2", "--repo", "demo", "--assistant", "claude-code"],
          ctxFor(fixture, { env: {}, stdinText: JSON.stringify({ session_id: supplied }) }),
        );
        const addressable = await readSessionRecord(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-2", assistant: "claude-code", sessionId: supplied });
        assert.ok(addressable, "the record is keyed by the id exactly as supplied");
        assert.strictEqual(addressable.sessionId, supplied, "stored BYTE-IDENTICAL — no case change, no trim, no hash, no truncation");
        assert.equal(addressable.sessionId.length, supplied.length, "same length");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-001 (acd-session-id-never-fabricated): self-check — a randomUUID fallback, a triple-derived hash fallback, and a lowercasing normalisation each LAND in the real source and trip the SAME detector",
    run: async () => {
      const realCommandSource = await readFile(commandSourcePath, "utf8");
      assert.deepEqual(fabricationViolations(realCommandSource, "real"), [], "the real command source is clean");

      // …and it is clean because the detector RULED, not because it found nothing to
      // rule on: the yield is stated, and a source whose id has been renamed away is
      // FLAGGED rather than passing silently.
      assert.ok(sessionIdAssignments(realCommandSource).length > 0, `the CLI face genuinely assigns session ids (measured ${sessionIdAssignments(realCommandSource).length})`);
      const renamed = normalise(realCommandSource).replace(/\bsessionId\b|\bsession_id\b/g, "sid");
      assert.notEqual(renamed, normalise(realCommandSource), "the planted RENAME genuinely landed in the real source text");
      assert.equal(sessionIdAssignments(renamed).length, 0, "…and it genuinely emptied the match list (the vacuous state this guard exists for)");
      assert.ok(
        fabricationViolations(renamed, "renamed").some((problem) => problem.includes("assigns NOTHING to a session id")),
        "an emptied match list is FLAGGED — this rule never passes by having checked nothing",
      );

      const needle = "const sessionId = nonBlank(options.session) ?? identity.sessionId;";

      const plantedRandom = plant(realCommandSource, needle, "const sessionId = nonBlank(options.session) ?? identity.sessionId ?? randomUUID();");
      assert.ok(fabricationViolations(plantedRandom, "planted").length > 0, "a planted randomUUID() fallback trips the generator detector");

      const plantedHash = plant(
        realCommandSource,
        needle,
        'const sessionId = nonBlank(options.session) ?? identity.sessionId ?? createHash("sha256").update(`${nodeId}~${workspaceId}~${assistant}`).digest("hex");',
      );
      assert.ok(fabricationViolations(plantedHash, "planted").length > 0, "a planted triple-derived hash fallback trips the generator detector");

      const plantedLower = plant(realCommandSource, needle, "const sessionId = (nonBlank(options.session) ?? identity.sessionId)?.toLowerCase() ?? null;");
      assert.ok(fabricationViolations(plantedLower, "planted").length > 0, "a planted lowercasing normalisation trips the transformation detector");

      // ADR-010 R1's scoping clause, proven rather than promised: the REAL filename
      // encoder (sessionSegment) contains a .replace-free byte loop and, crucially,
      // assigns nothing to a session id — a filename composition is not an id
      // transformation, and this detector must never read it as one.
      const realSessionSource = await readFile(sessionSourcePath, "utf8");
      assert.ok(/function sessionSegment\(/.test(normalise(realSessionSource)), "the 4th-segment encoder exists");
      assert.deepEqual(fabricationViolations(realSessionSource, "real"), [], "…and the encoder does not trip the id-assignment detector");
    },
  },
];
