// FF-6305 / 63/ADR-005, ADR-010 §2, §5 — THE FOURTH ENFORCEMENT POINT COMPILES, AND EVERY
// ATTENDED LAUNCH IS BYTE-IDENTICAL.
//
// The register's row in five claims:
//
//   1. `compileFrozenSet(bundledFrozenSet()).deferred` is EMPTY and `installed` contains
//      `gate-order`; `COMPILED_POINTS` equals `FROZEN_ENFORCEMENT_POINTS` IN FULL, asserted
//      against the exported constant rather than against a retyped list of four.
//   2. The fourth point's artifact comes FROM THE DECLARATION — asserted by changing the
//      declared shape in a fixture and watching the compiled artifact change with it. A
//      compiled value that would be the same with its rule deleted is decoration with a
//      compile step in front of it, which is exactly what this point has been since 55.
//   3. An unattended request that does not match the declaration is a CODED REFUSAL with no
//      launch object, asserted for a mismatched program and for mismatched argv independently.
//   4. BYTE-IDENTITY for attended launches, asserted exhaustively against the same call with
//      the fourth point compiled out. This seam is the sole producer of the NEEDS_INPUT
//      sentinel and of two milestones' cache and telemetry decisions, and it has 23 dependents.
//   5. The fourth point is TRACED, NOT MERELY COUNTED (ADR-010 §5).
//
// WHY CLAIM 5 IS THE ONE TO READ TWICE. The delivered arch pin this story widens
// (`test/arch/bundle/acd-frozen-set-compiled.test.mjs`) holds a LOCAL enforcement-point map and its
// `traceProblems` `continue`s past any member whose point is not a key of it. The map shipped
// with three entries and a comment saying the envelope was "deliberately absent". So the
// cheapest conforming edit — change the `deferred` deepEqual and nothing else — would have
// ARMED THIS ENFORCEMENT POINT AND BLINDED ITS OWN TRACE IN ONE COMMIT: green while tracing
// nothing at the very point the milestone had just armed, which is "report as enforced while
// holding nothing", the thing that file's own header says it was re-aimed to refuse. This
// control therefore asserts the delivered pin's map keys are the WHOLE vocabulary, and drives
// the three-entry map as a planted violation so the leg cannot be vacuous.
//
// NON-VACUITY. Every ban below is driven against a PLANTED violation in the same test that
// asserts the ban, and every absence is paired with a positive assertion that the thing it
// searched really was read. A ban whose subject is an empty string is green and worthless.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// The ONE comment stripper (TECH_DEBT items 24 and 57). Never re-implemented here: a local
// copy that strips block comments first can delete a whole file between two ordinary `//`
// comments and leave the bans below sweeping an empty string while reporting green.
import { stripComments } from "../../support/source-slice.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { bundledFrozenSet, compileFrozenSet, FROZEN_ENFORCEMENT_POINTS } from "../../../src/frozen-set.mjs";
import { resolveInteractiveDriverLaunch } from "../../../src/agent-session-driver.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMPILER_SOURCE = path.join(repoRoot, "src", "frozen-set.mjs");
const SEAM_SOURCE = path.join(repoRoot, "src", "agent-session-driver.mjs");
const DELIVERED_PIN_SOURCE = path.join(repoRoot, "test", "arch", "bundle", "acd-frozen-set-compiled.test.mjs");

const ENVELOPE_POINT = "the worker launch envelope";
const ENVELOPE_MEMBER_ID = "gate-order";

// The member's identity as a delivered guard already pins it (`[id, enforcementPoint]`, plus
// what it protects). The re-declaration moves the RULE and nothing else; renaming or
// re-pointing the member would be closing the record rather than the gap it was opened for.
const DELIVERED_IDENTITY = Object.freeze({
  id: ENVELOPE_MEMBER_ID,
  protects: "the continue, validate, doctor, grade and verify gate order",
  enforcementPoint: ENVELOPE_POINT,
});

const which = (bin) => `/stub/bin/${bin}`;
const launchEnv = () => ({
  PATH: "/stub/bin",
  HOME: "/stub/home",
  VSCODE_PID: "4242",
  TERM_PROGRAM: "vscode",
  CLAUDECODE: "1",
  CLAUDE_CODE_SSE_PORT: "1234",
  CLAUDE_EFFORT: "inherited-high",
  ORDINARY_INHERITED: "rides-through",
});

const envelopeMemberOf = (declaration) => declaration.members.find((member) => member.id === ENVELOPE_MEMBER_ID);

function withEnvelopeRule(rule) {
  const declaration = structuredClone(bundledFrozenSet());
  envelopeMemberOf(declaration).rule = rule;
  return declaration;
}

function withoutEnvelopeMember() {
  const declaration = structuredClone(bundledFrozenSet());
  return { ...declaration, members: declaration.members.filter((member) => member.id !== ENVELOPE_MEMBER_ID) };
}

// The FOUR attended shapes FF-6305 names, plus the three single-phase mesh directives. The
// directive never reaches the argv — it is written into the PTY — so a row carrying one that
// resolved differently from the bare session would be the regression, not the baseline.
const ATTENDED = Object.freeze([
  { name: "the human session", options: {} },
  { name: "the refine directive's session", options: { command: "/aof:refine 63/02" } },
  { name: "the continue directive's session", options: { command: "/aof:continue 63/02" } },
  { name: "the verify directive's session", options: { command: "/aof:verify 63/02" } },
  { name: "a resumed session", options: { resumeSessionId: "resumed-conversation-id" } },
  { name: "a session with model and effort", options: { session: { model: "opus-5", effort: "high" } } },
  { name: "a session with a model and no effort", options: { session: { model: "opus-5" } } },
  { name: "a session with neither", options: { session: {} } },
]);

const resolveAttended = (row, extra = {}) => resolveInteractiveDriverLaunch("claude", {
  which,
  env: launchEnv(),
  terminalSessionId: "fixed-terminal-session",
  ...row.options,
  ...extra,
});

// ---- the two source readings, each with its own not-found guard --------------------------

// The `COMPILED_POINTS` declaration in the compiler, as text. A `null` here fails the caller
// loudly ("the declaration was not found") rather than letting a ban sweep nothing.
function compiledPointsDeclaration(source) {
  const match = /const\s+COMPILED_POINTS\s*=\s*([^;]+);/u.exec(stripComments(source));
  return match == null ? null : match[1].trim();
}

// The enforcement-point keys of the delivered arch pin's local map — the map whose three
// entries would have blinded the trace.
function deliveredPinPointKeys(source) {
  const stripped = stripComments(source);
  const start = stripped.indexOf("const COMPILED_POINTS");
  if (start < 0) return null;
  const open = stripped.indexOf("{", start);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = open; i < stripped.length; i += 1) {
    if (stripped[i] === "{") depth += 1;
    else if (stripped[i] === "}" && --depth === 0) { end = i; break; }
  }
  if (end < 0) return null;
  return [...stripped.slice(open, end).matchAll(/"([^"]+)"\s*:\s*\{/gu)].map((match) => match[1]);
}

// The launch as a LITERAL: the program followed by its declared arguments as adjacent string
// literals. This is the shape that would let a caller build the unattended launch without
// consulting the declaration, and it is the one thing ADR-010 §2 forbids outside the
// declaration. It is deliberately NOT "the token `aof` appears": that token is an adapter id,
// a namespace and a directory name all over this tree, and a ban that red-flags those is a
// ban nobody can keep.
function launchLiteralPattern(launch) {
  const quoted = [launch.program, ...launch.args].map((token) => `["'\`]${token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}["'\`]`);
  return new RegExp(quoted.join("\\s*,\\s*"), "u");
}

export const archTests = [
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): the fourth point compiles, nothing is deferred, and the compiled set is the declared vocabulary in full",
    run: async () => {
      const compiled = compileFrozenSet(bundledFrozenSet());
      assert.deepEqual(compiled.deferred, [], "no declared member is left deferred");
      assert.ok(compiled.installed.includes(ENVELOPE_MEMBER_ID), "gate-order reached its enforcement point");
      assert.notEqual(compiled.unattendedLaunch, null, "the fourth point produced a compiled artifact");

      // Asserted against the EXPORTED constant, never a retyped list of four: the declaration
      // is derived from the vocabulary, so the set a member may name and the set that
      // compiles cannot drift apart.
      const declaration = compiledPointsDeclaration(await readFile(COMPILER_SOURCE, "utf8"));
      assert.notEqual(declaration, null, "the COMPILED_POINTS declaration was found in the compiler");
      assert.equal(declaration, "new Set(FROZEN_ENFORCEMENT_POINTS)", "COMPILED_POINTS is the vocabulary itself");
      assert.doesNotMatch(declaration, /\.slice\(/u, "…not a slice of it");
      assert.doesNotMatch(declaration, /\[/u, "…and not a literal list of points");

      // The behavioural half of the same claim: every declarable point actually compiles.
      for (const point of FROZEN_ENFORCEMENT_POINTS) {
        const probe = compileFrozenSet({
          version: 1,
          members: [{
            id: "probe",
            protects: `the probe at ${point}`,
            enforcementPoint: point,
            aofManaged: "probe",
            rule: {
              "tool-call hook entries": { event: "PreToolUse", matcher: "Bash", command: "node", args: ["probe.mjs"] },
              "permission denials": { deny: ["Edit(probe)"] },
              "agent tool scope": { agents: { probe: ["Read"] } },
              [ENVELOPE_POINT]: { program: "probe-runner", args: ["probe"] },
            }[point],
          }],
        });
        assert.deepEqual(probe.installed, ["probe"], `a member at "${point}" compiles`);
        assert.deepEqual(probe.deferred, [], `…and is not deferred`);
      }
      assert.equal(FROZEN_ENFORCEMENT_POINTS.length, 4, "the census ran over four points, not over an empty vocabulary");
    },
  },
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): red probe - the pre-63 three-point COMPILED_POINTS is detected",
    run: async () => {
      const source = await readFile(COMPILER_SOURCE, "utf8");
      const mutated = source.replace(
        "const COMPILED_POINTS = new Set(FROZEN_ENFORCEMENT_POINTS);",
        "const COMPILED_POINTS = new Set(FROZEN_ENFORCEMENT_POINTS.slice(0, 3));",
      );
      assert.notEqual(mutated, source, "the red probe changed the real declaration");
      assert.match(compiledPointsDeclaration(mutated), /\.slice\(/u, "the pre-63 slice form is reported");

      const literal = source.replace(
        "const COMPILED_POINTS = new Set(FROZEN_ENFORCEMENT_POINTS);",
        'const COMPILED_POINTS = new Set(["tool-call hook entries", "permission denials", "agent tool scope", "the worker launch envelope"]);',
      );
      assert.match(compiledPointsDeclaration(literal), /\[/u, "…and so is a retyped list of four, which would pass a count-shaped check");
    },
  },
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): the compiled artifact's program and argv come from the declaration and move when it moves",
    run: () => {
      const declared = envelopeMemberOf(bundledFrozenSet()).rule;
      const shipped = compileFrozenSet(bundledFrozenSet()).unattendedLaunch;
      assert.deepEqual({ program: shipped.program, args: [...shipped.args] }, { program: declared.program, args: [...declared.args] });

      const moved = compileFrozenSet(withEnvelopeRule({ program: "moved-runner", args: ["moved", "argv"] })).unattendedLaunch;
      assert.deepEqual({ program: moved.program, args: [...moved.args] }, { program: "moved-runner", args: ["moved", "argv"] }, "the artifact moved with the declared shape");
      assert.notEqual(moved.program, shipped.program, "…so it is not a value the compiler holds of its own");
      assert.equal(compileFrozenSet(withoutEnvelopeMember()).unattendedLaunch, null, "…and with the rule removed there is no artifact at all");
    },
  },
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): a mismatched program and mismatched argv each refuse with a code and no launch object",
    run: () => {
      const declaredLaunch = compileFrozenSet(bundledFrozenSet()).unattendedLaunch;
      const request = (overrides) => resolveInteractiveDriverLaunch("claude", {
        which,
        env: launchEnv(),
        declaredLaunch,
        unattended: { program: declaredLaunch.program, args: [...declaredLaunch.args], ...overrides },
      });

      const admitted = request({});
      assert.equal(admitted.refused, undefined, "the matching request is admitted, so the refusals below are not vacuous");
      assert.equal(admitted.bin, declaredLaunch.program);

      for (const [label, overrides] of [
        ["a mismatched program", { program: "claude" }],
        ["mismatched argv", { args: [...declaredLaunch.args].reverse() }],
      ]) {
        const refusal = request(overrides);
        assert.equal(refusal.refused, true, `${label} is refused`);
        assert.equal(typeof refusal.code, "string", `${label} carries a code`);
        assert.ok(refusal.code.length > 0);
        assert.equal(refusal.memberId, ENVELOPE_MEMBER_ID, `${label} names the member`);
        assert.equal(Object.hasOwn(refusal, "bin"), false, `${label} returns no launch object`);
        assert.equal(Object.hasOwn(refusal, "args"), false);
        assert.equal(Object.hasOwn(refusal, "env"), false);
      }
    },
  },
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): every attended launch is identical to the same call with the fourth point compiled out",
    run: () => {
      const compiledOut = compileFrozenSet(withoutEnvelopeMember()).unattendedLaunch;
      const declaredLaunch = compileFrozenSet(bundledFrozenSet()).unattendedLaunch;
      assert.equal(compiledOut, null, "the comparison arm really does have the fourth point compiled out");
      assert.notEqual(declaredLaunch, null, "…and the other arm really does have it compiled in");

      for (const row of ATTENDED) {
        const withPoint = resolveAttended(row, { declaredLaunch });
        const withoutPoint = resolveAttended(row, { declaredLaunch: compiledOut });
        const bare = resolveAttended(row);
        assert.notEqual(withPoint, null, `${row.name} resolves`);
        assert.equal(withPoint.refused, undefined, `${row.name} is never refused`);
        assert.deepEqual(withPoint.bin, withoutPoint.bin, `${row.name}: same program`);
        assert.deepEqual(withPoint.args, withoutPoint.args, `${row.name}: same argument tokens in the same order`);
        assert.deepEqual(withPoint.env, withoutPoint.env, `${row.name}: same environment, key for key and value for value`);
        assert.deepEqual({ ...bare }, { ...withPoint }, `${row.name}: and the same again with no declaration in the bag at all`);
        assert.ok(withPoint.args.includes("--append-system-prompt"), `${row.name}: the NEEDS_INPUT-producing instruction is still appended`);
        assert.equal(withPoint.env.ENABLE_PROMPT_CACHING_1H, "1", `${row.name}: the one-hour cache window is still held`);
        assert.equal(withPoint.args.includes(declaredLaunch.program), false, `${row.name}: an attended launch names nothing the envelope declares`);
      }
      assert.equal(ATTENDED.length, 8, "the byte-identity leg is driven over every attended shape the row names");
      assert.equal(new Set(ATTENDED.map((row) => JSON.stringify(row.options))).size, 8, "…and the eight are eight DISTINCT inputs, not a table wider than its shapes");
    },
  },
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): the re-declared member keeps its id, what it protects and its enforcement point",
    run: () => {
      const member = envelopeMemberOf(bundledFrozenSet());
      assert.deepEqual(
        { id: member.id, protects: member.protects, enforcementPoint: member.enforcementPoint },
        { ...DELIVERED_IDENTITY },
        "the member→point census a delivered guard already pins stays true and is not edited",
      );
      assert.equal(member.aofManaged, ENVELOPE_MEMBER_ID, "…and it is still aof's to compile");
    },
  },
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): the fourth point is TRACED, and the delivered pin's own map carries it",
    run: async () => {
      const declaration = bundledFrozenSet();
      const compiled = compileFrozenSet(declaration);

      // The trace the other three points already get: the artifact names its declaring member,
      // and a declared, owned member at this point that reaches no output is a failure.
      const traced = (compiledSet) => {
        const problems = [];
        for (const member of declaration.members) {
          if (member.enforcementPoint !== ENVELOPE_POINT || member.aofManaged !== member.id) continue;
          if (compiledSet.unattendedLaunch == null) problems.push(`a declared member at "${ENVELOPE_POINT}" compiled to nothing: ${member.id}`);
          else if (compiledSet.unattendedLaunch.memberId !== member.id) problems.push(`an unattended launch shape that no member declared`);
        }
        return problems;
      };
      assert.deepEqual(traced(compiled), [], "the shipped declaration's envelope member traces to its artifact");
      assert.equal(compiled.unattendedLaunch.memberId, ENVELOPE_MEMBER_ID);
      assert.deepEqual(traced({ ...compiled, unattendedLaunch: null }), [`a declared member at "${ENVELOPE_POINT}" compiled to nothing: ${ENVELOPE_MEMBER_ID}`], "…and the trace is non-vacuous");
      assert.deepEqual(traced({ ...compiled, unattendedLaunch: { ...compiled.unattendedLaunch, memberId: "somebody-else" } }), ["an unattended launch shape that no member declared"]);

      // ADR-010 §5: the delivered pin's LOCAL map must carry the fourth point, or its own
      // `traceProblems` skips this member and the control goes green holding nothing.
      const pinSource = await readFile(DELIVERED_PIN_SOURCE, "utf8");
      const keys = deliveredPinPointKeys(pinSource);
      assert.notEqual(keys, null, "the delivered pin's enforcement-point map was found");
      assert.deepEqual([...keys].sort(), [...FROZEN_ENFORCEMENT_POINTS].sort(), "the delivered pin traces every declared enforcement point, the fourth included");
      assert.ok(pinSource.includes("compiled.unattendedLaunch"), "…through the compiled artifact this milestone added");
    },
  },
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): red probe - a three-entry delivered map is detected as a blinded trace",
    run: async () => {
      const source = await readFile(DELIVERED_PIN_SOURCE, "utf8");
      const line = /^.*"the worker launch envelope":.*$/mu.exec(source);
      assert.notEqual(line, null, "the fourth map entry is present to be removed");
      const blinded = source.replace(line[0], "");
      assert.notEqual(blinded, source, "the red probe removed the real entry");

      const keys = deliveredPinPointKeys(blinded);
      assert.equal(keys.length, 3, "the pre-63 three-entry map is what the probe produced");
      assert.notDeepEqual([...keys].sort(), [...FROZEN_ENFORCEMENT_POINTS].sort(), "…and this control refuses it, which is the whole of ADR-010 §5");
    },
  },
  {
    name: "arch/63 FF-6305 (acd-unattended-launch-is-declared): the milestone's ONE launch literal is the declaration's",
    run: async () => {
      const launch = compileFrozenSet(bundledFrozenSet()).unattendedLaunch;
      const pattern = launchLiteralPattern(launch);

      const offenders = [];
      let scanned = 0;
      for (const file of await readSrcFiles(repoRoot)) {
        const source = stripComments(await readFile(file.path, "utf8"));
        scanned += 1;
        if (pattern.test(source)) offenders.push(file.rel);
      }
      assert.ok(scanned > 100, `the sweep actually read the tree: ${scanned} modules`);
      assert.deepEqual(offenders, [], "no module in src/ spells the unattended launch; the declaration is its sole speller");

      // The seam that ADMITS the launch spells neither the program nor its arguments.
      const seam = stripComments(await readFile(SEAM_SOURCE, "utf8"));
      assert.ok(seam.includes("declaredLaunch"), "the seam was read and does consult the declaration");
      for (const token of [launch.program, ...launch.args]) {
        assert.doesNotMatch(seam, new RegExp(`["'\`]${token}["'\`]`, "u"), `the launch seam does not spell "${token}"`);
      }

      // Non-vacuity: the same sweep over a planted module DOES report it.
      const planted = `const launch = ["${launch.program}", ${launch.args.map((token) => `"${token}"`).join(", ")}];`;
      assert.match(planted, pattern, "the detector catches a second speller of the whole launch");
      assert.doesNotMatch('const namespace = "aof";', pattern, "…while an ordinary use of the program token alone is not a launch literal");
    },
  },
];
