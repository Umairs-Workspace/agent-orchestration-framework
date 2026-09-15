import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blockOrStatementAfter, markedRegion, matchedBraceBody, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { assertFamilyPurity } from "../../support/module-family.mjs";
// 61/FF-6111 — the leaf whose clamp and whose derived refusal this guard now also keeps.
import * as loopBounds from "../../../src/loop-bounds.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const EXPECTED_READERS = Object.freeze([
  "src/commands/run-retry.mjs",
  "src/commands/resume.mjs",
  "src/commands/run-start.mjs",
  "src/commands/loop.mjs",
]);
const DECLARATION_INSPECTORS = Object.freeze(["src/work/doctor-loop-ready.mjs"]);
const SHELL_TOKENS = Object.freeze(["Loop until", "aof work next", "aof work run-start", "run-retry", "maxAttempts", "heartbeatStaleMs", "stop_conditions"]);
// THE CLOSED COLLECTION OF RANGE DRIVERS (ADR-008 §1; ADR-010 §21; task 05's `CAP-MUT-14`/`15`).
// The seven-token denylist above names SEVEN LITERALS and can therefore only ever reject the seven
// spellings someone already thought of: measured, appending "run `aof work drive-continue <range>`
// — that is the command that drives the range" to the prompt left this gate 4/4 green. The rule the
// contract actually states is CLOSED, not enumerated — "names no OTHER command for driving the
// range" — so the instrument has to be a closed SET over the `aof work <verb>` commands the prompt
// names, not a longer denylist. The denylist is deliberately NOT widened (STORY.md's feasibility
// pass is explicit); it keeps answering for the seven prose-shell tokens, and this set answers for
// the alternate-driver rule.
const RANGE_DRIVERS = Object.freeze(["loop"]);
const PROCESS_OPEN = "<process>";
const PROCESS_CLOSE = "</process>";
const AUTONOMOUS = "src/bundle/commands/autonomous.md";

async function modules(dir = path.join(root, "src")) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modules(target));
    else if (entry.name.endsWith(".mjs")) out.push(target);
  }
  return out;
}

function stripHtml(source) {
  return source.replace(/<!--[\s\S]*?-->/gu, " ");
}

function lineOf(text, at) {
  return text.slice(0, at).split("\n").length;
}

// THE CUT COMES FROM THE ONE HOME — `test/support/source-slice.mjs` (m47 / F-47-04-ARCH-2), and
// this gate is where that ratchet was still owed a payment. The retired form was
// `after.slice(0, after.indexOf(";"))`.
//
// THE TRUE REASON IT HAD TO GO, stated without embroidery. A SENTINEL END is forbidden AS A
// SPECIES: `acd-test-suite-registration`'s `SENTINEL_END` detector fails any `test/arch` gate
// holding one that the `POSITIONAL_SLICE_LEDGER` does not admit, and this gate was that ratchet's
// one outstanding red. The species is banned because the cut it makes is bounded by a token whose
// position nothing pins, so the region asserted over is not the region the rule is about; the one
// home cuts what the LANGUAGE says the read belongs to and returns null when no such region
// exists, which is why NOT FOUND is reported loudly here (naming the module and the line) rather
// than asserted over.
//
// AND THE REACH OF THE CHANGE, MEASURED rather than reasoned — both instruments driven over the
// same planted inputs, 2026-08-20:
//
//   plant                                     OLD sentinel cut      NEW structural cut
//   `maxAttempts`⏎`?? 3;`  (wrap BEFORE `??`)  resolver(3)           resolver(3)     — no delta
//   `maxAttempts ??`⏎`3;`  (wrap AFTER  `??`)  resolver(3)           inspector, body `"??"`
//   `maxAttempts ?? 3;`    (inline)            resolver(3)           resolver(3)     — no delta
//   `maxAttempts;`         (inspector)         inspector             inspector       — no delta
//   `maxAttempts` with NO `;` after it         inspector             NOT FOUND (null)
//
// So: a wrap BEFORE the `??` is SPANNED — `blockOrStatementAfter` skips leading whitespace before
// it computes the line boundary — which is the form the tree actually uses
// (`loop.mjs:136`, `:375` wrap the sibling `heartbeatStaleMs` exactly that way), and `CAP-PC-01`
// drives it. A wrap BETWEEN the `??` and its literal is NOT spanned and reads as an INSPECTOR —
// which fails LOUDLY on both set equalities (an unadmitted second inspector AND a recorded
// resolver gone stale), never silently. That is the honest reach; it is not "nothing changed".
//
// What the retired form did NOT do, also measured, because overclaiming in the other direction is
// the same defect: widening the slice's end could not manufacture a FALSE resolver here. The
// predicate `/^\s*\?\?\s*(\d+)\b/u` is `^`-ANCHORED, so a `?? 3` further downstream never matched;
// with no `;` after the read the "statement" simply became empty or the whole remainder, and the
// site read as an inspector. The defect was the species and the silence, not a measured false pass.
function capSites(code, rel) {
  const sites = [];
  for (const match of code.matchAll(/autonomous\?\.maxAttempts\b/gu)) {
    const line = lineOf(code, match.index);
    const region = blockOrStatementAfter(code, match.index + match[0].length);
    assert.ok(
      region != null,
      `${rel}:${line}: NOT FOUND — no statement or block follows the \`autonomous?.maxAttempts\` read, so the region this gate classifies cannot be cut. Fix the cut; never widen it back into a positional slice.`,
    );
    const fallback = /^\s*\?\?\s*(\d+)\b/u.exec(region.body);
    sites.push({ kind: fallback == null ? "inspector" : "resolver", fallback: fallback?.[1] ?? null, line });
  }
  return sites;
}

// PURE — a list of `{ rel, code }` source units in, a list of problems out. `[]` is green.
//
// This is the instrument the REAL `src/` tree is measured by AND the one every `CAP-MUT-0x` plant
// below is driven through, so what the plants prove is the reading the tree gets rather than a
// second, kinder reading written beside it. Before this existed, `CAP-MUT-01`/`02`/`03` were
// discharged by a real-tree `deepEqual` with no executed mutation at all — which the story's own
// Acceptance clause refuses as "a neighbouring assertion".
function capProblems(units) {
  const problems = [];
  const resolvers = new Set();
  const inspectors = new Set();
  for (const { rel, code } of units) {
    for (const site of capSites(code, rel)) {
      if (site.kind === "resolver") {
        resolvers.add(rel);
        if (site.fallback !== "3") {
          problems.push(`CAP-MUT-06: ${rel}:${site.line} resolves the cap with \`?? ${site.fallback}\` — every resolver falls back to the one existing literal 3; a second literal is a second bound`);
        }
      } else {
        inspectors.add(rel);
      }
    }
  }
  for (const rel of [...resolvers].sort()) {
    if (!EXPECTED_READERS.includes(rel)) {
      problems.push(`CAP-MUT-01/02: ${rel} RESOLVES work.autonomous.maxAttempts — a new resolution site is a second home for the bound, not a convenience. Supplying a default is what makes a module a resolver, whichever partition it would otherwise fall into.`);
    }
  }
  for (const rel of EXPECTED_READERS) {
    if (!resolvers.has(rel)) {
      problems.push(`CAP-MUT-04: ${rel} is a RECORDED cap resolver that no longer resolves the key — a stale permission. The record may now be REDUCED; a recorded reader with no subject is how a fifth one later slips in unnoticed.`);
    }
  }
  for (const rel of [...inspectors].sort()) {
    if (!DECLARATION_INSPECTORS.includes(rel)) {
      problems.push(`CAP-MUT-03: ${rel} reads work.autonomous.maxAttempts with NO default and is not the one admitted declaration inspector — declaration inspection is a closed one-module admission (ADR-007 §4, ADR-010 §12), not a fifth reader.`);
    }
  }
  for (const rel of DECLARATION_INSPECTORS) {
    if (!inspectors.has(rel)) {
      problems.push(`CAP-MUT-05: ${rel} is the admitted \`cap-declared\` inspector but no longer reads the declaration — the admission has no subject and must be struck.`);
    }
  }
  return problems;
}

// PURE — the same units, over the CLOSED `work.autonomous.*` key set (CAP-MUT-07 / CAP-MUT-08).
// Milestone 69 retires heartbeatStaleMs from the legacy autonomous namespace.
// maxAttempts remains independently owned and is the namespace's sole reader.
const AUTONOMOUS_KEYS = Object.freeze(["maxAttempts"]);
function keyProblems(units) {
  const problems = [];
  const found = new Map();
  for (const { rel, code } of units) {
    for (const match of code.matchAll(/autonomous\?\.([A-Za-z][A-Za-z0-9]*)/gu)) {
      if (!found.has(match[1])) found.set(match[1], new Set());
      found.get(match[1]).add(rel);
    }
  }
  for (const key of [...found.keys()].sort()) {
    if (!AUTONOMOUS_KEYS.includes(key)) {
      problems.push(`CAP-MUT-07: work.autonomous.${key} is read by ${[...found.get(key)].sort().join(", ")} — the key set is closed at ${AUTONOMOUS_KEYS.join(" + ")}; this milestone introduces no third key under any spelling`);
    }
  }
  for (const key of AUTONOMOUS_KEYS) {
    if (!found.has(key)) {
      problems.push(`CAP-MUT-08: work.autonomous.${key} is read by NO src module — a member of the closed two-key set disappeared, and the set is closed in both directions`);
    }
  }
  return problems;
}

const LOOP_BOUND_HOME = "src/loop-bounds.mjs";
const LOOP_BOUND_DEFAULTS = Object.freeze([
  "DEFAULT_START_TO_CLOSE_MS",
  "DEFAULT_HEARTBEAT_MS",
  "DEFAULT_SCHEDULE_TO_START_MS",
  "DEFAULT_SCHEDULE_TO_CLOSE_MS",
  "DEFAULT_STARTUP_GRACE_MS",
  "DEFAULT_REVIEW_ROUNDS",
  "MAX_REVIEW_ROUNDS",
  "DEFAULT_BUILD_NO_PROGRESS_ROUNDS",
  "MAX_BUILD_NO_PROGRESS_ROUNDS",
  "DEFAULT_PROGRESS_MAX_RESETS",
]);

function loopBoundHomeProblems(units) {
  const problems = [];
  const readers = units
    .filter(({ code }) => /(?:\.config|\bconfig)\?*\.work\?*\.loop\b/u.test(code))
    .map(({ rel }) => rel)
    .sort();
  if (readers.length !== 1 || readers[0] !== LOOP_BOUND_HOME) {
    problems.push(`FF-6901: work.loop.* resolves only in ${LOOP_BOUND_HOME}; found ${readers.join(", ") || "none"}`);
  }
  const home = units.find(({ rel }) => rel === LOOP_BOUND_HOME)?.code ?? "";
  for (const name of LOOP_BOUND_DEFAULTS) {
    if (!new RegExp(`\\b${name}\\b`, "u").test(home)) problems.push(`FF-6901: ${LOOP_BOUND_HOME} is missing ${name}`);
    for (const unit of units.filter(({ rel }) => rel !== LOOP_BOUND_HOME)) {
      if (new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`, "u").test(unit.code)) {
        problems.push(`FF-6901: ${unit.rel} declares standalone loop-bound authority ${name}`);
      }
    }
  }
  for (const unit of units.filter(({ rel }) => rel !== LOOP_BOUND_HOME)) {
    if (/\b15\s*\*\s*60\s*\*\s*1000\b|\b900_?000\b/u.test(unit.code)) {
      problems.push(`FF-6901: ${unit.rel} declares a standalone 15-minute heartbeat default`);
    }
    if (/\bheartbeatStaleMs\b/u.test(unit.code)) {
      problems.push(`FF-6901: ${unit.rel} reads the retired work.autonomous.heartbeatStaleMs bypass`);
    }
  }
  // ANNEXATION — the home reads no `work.autonomous.maxAttempts` and no POOL bound
  // (`work?.dispatch?.concurrency`, `src/work/dispatch.mjs`'s key). Its OWN
  // `work.loop.dispatch.concurrency` (129/07) is read as `loopConfig(workspace)?.dispatch?.concurrency`
  // and is a `work.loop.*` key this home exists to hold, so the pool read is told apart by the
  // object it hangs off (`work?.`), never by the key's last two segments.
  if (/autonomous\?\.maxAttempts|work\??\.dispatch\??\.concurrency/u.test(home)) {
    problems.push("FF-6901: loop-bounds annexes maxAttempts or dispatch concurrency");
  }
  return problems;
}

// PURE — CAP-MUT-09, over the loop command's own text.
function privateDefaultProblems(rel, code) {
  const match = /\bconst\s+(DEFAULT_?CAP|CAP_DEFAULT)\b/u.exec(code);
  return match == null ? [] : [`CAP-MUT-09: ${rel}:${lineOf(code, match.index)} declares \`${match[1]}\` — the loop reads the existing fallback literal; it never chooses a private default`];
}

// PURE — prompt TEXT in, problems out, so every prompt row is driven by a plant rather than by a
// second reading of the shipped file (CAP-MUT-10…15, CAP-PC-04/05).
function promptProblems(raw) {
  const prompt = stripHtml(raw);
  const problems = [];
  for (const token of SHELL_TOKENS) {
    const at = prompt.indexOf(token);
    if (at >= 0) problems.push(`CAP-MUT-10: the loop-shell token \`${token}\` survives in non-comment prompt text at line ${lineOf(prompt, at)} — the loop, its sequencing, its retry and its stop conditions are the shell's`);
  }
  // THE ONE HOME FOR THE BODY. `markedRegion` returns null when either marker is absent, so a
  // prompt that lost its `<process>` block fails as NOT FOUND instead of being read as a prompt
  // that names no driver at all.
  const region = markedRegion(prompt, PROCESS_OPEN, PROCESS_CLOSE);
  if (region == null) {
    problems.push(`CAP-MUT-14: NOT FOUND — the prompt carries no \`${PROCESS_OPEN}\` … \`${PROCESS_CLOSE}\` block, so the one home for the range-driving command cannot be cut`);
  }
  const named = [...prompt.matchAll(/aof work ([a-z][a-z0-9-]*)/gu)];
  const inside = region == null ? [] : [...region.matchAll(/aof work ([a-z][a-z0-9-]*)/gu)];
  for (const verb of [...new Set(named.map((match) => match[1]))].sort()) {
    if (!RANGE_DRIVERS.includes(verb)) {
      problems.push(`CAP-MUT-14/15: the prompt names \`aof work ${verb}\` — the range has exactly ONE driver, \`aof work ${RANGE_DRIVERS.join("`/`aof work ")}\`. One body, not a second procedure.`);
    }
  }
  const bodyCount = inside.filter((match) => match[1] === "loop").length;
  if (bodyCount < 1) {
    problems.push(`CAP-MUT-11: \`aof work loop\` is named ZERO times inside \`${PROCESS_OPEN}\` — a prompt that deleted its loop and named no replacement is worse than the prose loop it removed`);
  }
  if (named.length !== inside.length) {
    problems.push(`CAP-MUT-15: ${named.length - inside.length} \`aof work …\` invocation(s) sit OUTSIDE \`${PROCESS_OPEN}\` — the command that drives the range has one home, and a driving command named beside it is a second procedure`);
  }
  if (!prompt.includes("--solo")) problems.push("the `--solo` block was deleted from autonomous.md — execution-mode resolution is not loop shell and stays in the prompt");
  if (!prompt.includes("--ship")) problems.push("the `--ship` step was deleted from autonomous.md — post-accept shipping is not loop shell and stays in the prompt");
  return problems;
}

// PURE — CAP-MUT-18…20, over the bundle manifest's command ids.
function manifestProblems(commandIds) {
  const problems = [];
  if (!commandIds.includes("autonomous")) problems.push("the `autonomous` member was removed from the bundle manifest — the door coexists, only its body changed");
  if (commandIds.includes("loop")) problems.push("a `loop` member was added to the bundle manifest — the loop is a CLI verb, never a second prompt door");
  for (const id of commandIds.filter((candidate) => /^drive-/u.test(candidate))) {
    problems.push(`a \`${id}\` member was added to the bundle manifest — a \`drive-*\` door is a second range driver`);
  }
  return problems;
}

async function sourceUnits() {
  const files = await modules();
  const units = [];
  for (const file of files) {
    units.push({ rel: path.relative(root, file).replaceAll("\\", "/"), code: stripComments(await readFile(file, "utf8")) });
  }
  return units;
}

const without = (units, rel) => units.filter((unit) => unit.rel !== rel);
const replacing = (units, rel, code) => [...without(units, rel), { rel, code }];

// ── 61/FF-6111 — THE CLAMP, AND THE KEY THAT IS TWO BOUNDS ───────────────────
//
// 61/ADR-009 adds one clamp and refuses one key. Both legs are measured HERE, in
// the guard 53 and 69 already keep over this key, because the question "how many
// bounds does this key resolve to?" is answered by its call sites and nowhere else
// — a note recording "two" would go stale the day one of them changed, which is
// exactly the failure mode ADR-009 §4's refusal is designed to outlive.
//
// THE TUNABLE SET IS THE REGISTRY'S, never restated here: the keys are read from
// the arbiter record's `parameter-tuning:` edge (ADR-008 §4), so a key added to or
// removed from that record moves this census with it.
const ARBITER = "src/bundle/loops/speed-thoroughness-autonomy.md";
const CAP_KEY = "work.autonomous.maxAttempts";

// The BOUND each cap resolution site actually resolves, keyed by the identifier the
// language binds the read to. CLOSED in both directions: a binder this table does
// not name is reported (never silently counted as a new bound, and never silently
// dropped), so the day a fifth spelling appears the census says so instead of
// quietly changing the count that drives the refusal.
const BOUND_BY_BINDER = Object.freeze({
  resolveAttemptCeiling: Object.freeze({ bound: "the attempt ceiling", exhaustedBy: "a run being retried" }),
  maxAttempts: Object.freeze({ bound: "the attempt ceiling", exhaustedBy: "a run being retried" }),
  cap: Object.freeze({ bound: "the per-(ref, phase) drive-cycle ceiling", exhaustedBy: "a phase being driven again" }),
});

// THE BINDER A READ BELONGS TO — the outward cut, and the counterpart to
// `blockOrStatementAfter`'s inward one. It walks back to the nearest statement
// DELIMITER (`;` `{` `}` `,`), which is a boundary the language draws, never a
// fixed window and never an `indexOf` sentinel whose position nothing pins; and it
// returns null when the head holds no binding at all, so the caller reports NOT
// FOUND rather than classifying a region it could not cut. A `return` is bound to
// the function it returns from, which is how `resolveAttemptCeiling` — a resolver
// with no assignment target — is classified at all.
const STATEMENT_DELIMITERS = ";{},";
function binderOf(code, at) {
  let start = at;
  while (start > 0 && !STATEMENT_DELIMITERS.includes(code[start - 1])) start -= 1;
  const head = code.slice(start, at);
  const declared = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/u.exec(head);
  if (declared != null) return declared[1];
  const property = /^\s*([A-Za-z_$][\w$]*)\s*:/u.exec(head);
  if (property != null) return property[1];
  if (/^\s*return\b/u.test(head)) {
    const enclosing = [...code.slice(0, at).matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/gu)];
    if (enclosing.length > 0) return enclosing.at(-1)[1];
  }
  return null;
}

// PURE — the same `{ rel, code }` units, and out comes the set of DISTINCT bounds
// the attempt key resolves to, with the sites that resolve each. Declaration
// INSPECTION resolves no bound (it supplies no default), so it is not counted: the
// question is how many bounds a single write to this key would move.
function resolvedAttemptBounds(units) {
  const problems = [];
  const bounds = new Map();
  for (const { rel, code } of units) {
    for (const match of code.matchAll(/autonomous\?\.maxAttempts\b/gu)) {
      const line = lineOf(code, match.index);
      const region = blockOrStatementAfter(code, match.index + match[0].length);
      if (region == null || !/^\s*\?\?\s*\d+\b/u.test(region.body)) continue;
      const binder = binderOf(code, match.index);
      if (binder == null) {
        problems.push(`FF-6111: ${rel}:${line}: NOT FOUND — the resolved cap is bound to nothing this cut can name, so the BOUND it resolves cannot be classified. Fix the cut; never guess the bound.`);
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(BOUND_BY_BINDER, binder)) {
        problems.push(`FF-6111: ${rel}:${line} binds the resolved cap to \`${binder}\`, which BOUND_BY_BINDER does not name — a resolution site whose bound is unclassified would silently move the count that drives \`step-would-be-compound\`. Name the bound it resolves, or stop resolving the key here.`);
        continue;
      }
      const declared = BOUND_BY_BINDER[binder];
      if (!bounds.has(declared.bound)) bounds.set(declared.bound, { ...declared, sites: [] });
      bounds.get(declared.bound).sites.push(`${rel}:${line}`);
    }
  }
  return { bounds: [...bounds.values()], problems };
}

// PURE — 61/ADR-009 §2's "no floors/ceilings table anywhere". A second home for a
// bound that already exists where the knob is resolved is the species F-6900 /
// F-69-V7 / F-69-V8 indict; two homes for one number become two different numbers
// the first time either is edited. A module that spells a tunable key AND declares
// a `floor:`/`ceiling:` beside it is that second home.
function rangeTableProblems(units, tunableKeys) {
  const problems = [];
  for (const { rel, code } of units) {
    const named = tunableKeys.filter((key) => code.includes(key));
    if (named.length === 0) continue;
    const declaration = /\b(floor|ceiling)\s*:/u.exec(code);
    if (declaration != null) {
      problems.push(`FF-6111: ${rel}:${lineOf(code, declaration.index)} declares \`${declaration[1]}:\` beside the tunable key(s) ${named.join(", ")} — the range lives in each bound's own resolver and is ASKED, never looked up. A table here is a second home for a number that already exists.`);
    }
  }
  return problems;
}

function tunableKeysFrom(record) {
  const declared = /^parameter-tuning:\s*\[([^\]]*)\]/mu.exec(record);
  if (declared == null) return null;
  return declared[1].split(",").map((entry) => entry.trim().replace(/^config:/u, "")).filter(Boolean);
}

export const archTests = [
  {
    name: "arch/69 FF-6901 extension (acd-loop-cap-single-home): work.loop deadlines and caps have one leaf while maxAttempts and dispatch concurrency stay put",
    run: async () => {
      const units = await sourceUnits();
      assert.deepEqual(loopBoundHomeProblems(units), []);
      assert.deepEqual(capProblems(units), [], "the pre-existing maxAttempts reader set is byte-for-byte intact");

      const secondHome = [...units, {
        rel: "src/second-loop-bound-home.mjs",
        code: "const grace = workspace?.config?.work?.loop?.startupGraceMs ?? 99;\n",
      }];
      assert.match(loopBoundHomeProblems(secondHome).join("\n"), /second-loop-bound-home/u);
      const annexed = replacing(units, LOOP_BOUND_HOME, `${units.find((unit) => unit.rel === LOOP_BOUND_HOME).code}\nconst cap = config?.work?.autonomous?.maxAttempts;\n`);
      assert.match(loopBoundHomeProblems(annexed).join("\n"), /annexes maxAttempts/u);
      // 129/07 — the POOL bound annexed into the home is named; the home's own
      // `loopConfig(workspace)?.dispatch?.concurrency` (the real tree) is not an annexation.
      const annexedPool = replacing(units, LOOP_BOUND_HOME, `${units.find((unit) => unit.rel === LOOP_BOUND_HOME).code}\nconst lanes = workspace?.config?.work?.dispatch?.concurrency;\n`);
      assert.match(loopBoundHomeProblems(annexedPool).join("\n"), /annexes maxAttempts or dispatch concurrency/u);
      assert.match(units.find((unit) => unit.rel === LOOP_BOUND_HOME).code, /loopConfig\(workspace\)\?\.dispatch\?\.concurrency/u, `${LOOP_BOUND_HOME}: NOT FOUND — the home's own lane-bound read is absent (129/07)`);
      assert.doesNotMatch(loopBoundHomeProblems(units).join("\n"), /annexes/u, "the home's own work.loop.dispatch.concurrency read is not an annexation");
      const duplicate = [...units, { rel: "src/commands/private-loop-bound.mjs", code: "const DEFAULT_HEARTBEAT_MS = 15 * 60 * 1000;\n" }];
      const duplicateProblems = loopBoundHomeProblems(duplicate).join("\n");
      assert.match(duplicateProblems, /private-loop-bound.*standalone loop-bound authority DEFAULT_HEARTBEAT_MS/u);
      assert.match(duplicateProblems, /private-loop-bound.*standalone 15-minute heartbeat default/u);
      const retired = [...units, { rel: "src/commands/legacy-heartbeat.mjs", code: "const stale = config?.work?.autonomous?.heartbeatStaleMs;\n" }];
      assert.match(loopBoundHomeProblems(retired).join("\n"), /retired work\.autonomous\.heartbeatStaleMs/u);
    },
  },
  {
    name: "arch/53 FF-5310 (acd-loop-cap-single-home): four cap resolvers use literal three and one named declaration inspector supplies no default",
    run: async () => {
      const units = await sourceUnits();
      assert.ok(units.length > 150, `src/**/*.mjs was actually walked: ${units.length} modules`);
      assert.deepEqual(capProblems(units), [], "the measured RESOLUTION and DECLARATION-INSPECTION sets are each closed by exact equality, in both directions");
      for (const rel of EXPECTED_READERS) {
        const code = stripComments(await readFile(path.join(root, rel), "utf8"));
        assert.ok(capSites(code, rel).some((site) => site.kind === "resolver" && site.fallback === "3"), `${rel}: the cap access itself is followed by ?? 3, in the statement the language says the read belongs to`);
      }
      const inspectorRel = DECLARATION_INSPECTORS[0];
      const inspector = stripComments(await readFile(path.join(root, inspectorRel), "utf8"));
      assert.deepEqual(capSites(inspector, inspectorRel).map((site) => site.kind), ["inspector"], "the cap-declared scorer yields a boolean/evidence and never resolves a value");
    },
  },
  {
    name: "arch/53 FF-5310 (acd-loop-cap-single-home): CAP-MUT-01…06 and CAP-PC-01…03 — each planted cap-classification defect is caught by the same classifier the real tree is measured by",
    run: async () => {
      const units = await sourceUnits();
      // THE CONTROL FIRST: the unmutated tree is clean, so a classifier that simply always
      // complains cannot be mistaken for one that detects the plants.
      assert.deepEqual(capProblems(units), [], "control: the unmutated src tree is clean");

      const inspectorRel = DECLARATION_INSPECTORS[0];
      const plants = [
        {
          id: "CAP-MUT-01",
          units: [...units, { rel: "src/commands/fifth-home.mjs", code: "const cap = ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3;\n" }],
          reports: ["CAP-MUT-01/02", "src/commands/fifth-home.mjs"],
        },
        {
          id: "CAP-MUT-02",
          units: replacing(units, inspectorRel, "  const declaredCap = config?.work?.autonomous?.maxAttempts ?? 3;\n"),
          reports: ["CAP-MUT-01/02", inspectorRel, "CAP-MUT-05"],
        },
        {
          id: "CAP-MUT-03",
          units: [...units, { rel: "src/second-inspector.mjs", code: "const declared = config?.work?.autonomous?.maxAttempts;\n" }],
          reports: ["CAP-MUT-03", "src/second-inspector.mjs"],
        },
        {
          id: "CAP-MUT-04",
          units: without(units, "src/commands/run-start.mjs"),
          reports: ["CAP-MUT-04", "src/commands/run-start.mjs", "may now be REDUCED"],
        },
        {
          id: "CAP-MUT-05",
          units: replacing(units, inspectorRel, "const nothing = 1;\n"),
          reports: ["CAP-MUT-05", inspectorRel],
        },
        {
          id: "CAP-MUT-06",
          units: replacing(units, "src/commands/run-retry.mjs", "const maxAttempts = input.maxAttempts ?? ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 5;\n"),
          reports: ["CAP-MUT-06", "src/commands/run-retry.mjs", "?? 5"],
        },
      ];
      for (const plant of plants) {
        const problems = capProblems(plant.units);
        assert.ok(problems.length > 0, `${plant.id}: the plant was NOT caught — this classifier is what the real tree is measured by`);
        const report = problems.join("\n");
        for (const needle of plant.reports) assert.ok(report.includes(needle), `${plant.id}: the report must name ${needle}\n${report}`);
      }

      // CAP-PC-01 — a resolver whose `?? 3` WRAPS onto the next line is still a resolver. No
      // resolver in the tree wraps today, so this control has to be SYNTHETIC or it is vacuous;
      // the shape planted is the one the tree really uses for the sibling key
      // (`src/commands/loop.mjs:136`, `:375` wrap `heartbeatStaleMs` exactly this way).
      const wrapped = "    const cap = ctx.workspace.config?.work?.autonomous?.maxAttempts\n      ?? 3;\n";
      assert.deepEqual(capSites(wrapped, "synthetic/wrapped.mjs"), [{ kind: "resolver", fallback: "3", line: 1 }], "CAP-PC-01: adjacency spans a wrap placed BEFORE the `??` — it is still a resolver");
      assert.deepEqual(capProblems(replacing(units, "src/commands/loop.mjs", wrapped)), [], "CAP-PC-01: a wrapped resolver raises no problem at all");

      // …and the reach recorded honestly: a wrap placed BETWEEN the `??` and its literal is NOT
      // spanned. It reads as an inspector, which is LOUD on both closed sets rather than silent.
      const wrappedAfter = "    const cap = ctx.workspace.config?.work?.autonomous?.maxAttempts ??\n      3;\n";
      assert.deepEqual(capSites(wrappedAfter, "synthetic/wrapped-after.mjs").map((site) => site.kind), ["inspector"], "measured: a wrap between `??` and its literal is not spanned");
      const loud = capProblems(replacing(units, "src/commands/loop.mjs", wrappedAfter));
      assert.ok(loud.some((problem) => problem.includes("CAP-MUT-03")) && loud.some((problem) => problem.includes("CAP-MUT-04")), `a wrap after the \`??\` fails loudly on BOTH closed sets, never silently:\n${loud.join("\n")}`);

      // CAP-PC-02 — an unrelated `??` PRECEDING the cap access is ignored; classification follows
      // the cap access itself. This is `run-retry.mjs:62` and `loop.mjs:155`'s real shape.
      assert.deepEqual(
        capSites("const cap = input.maxAttempts ?? config?.work?.autonomous?.maxAttempts ?? 3;\n", "synthetic/preceding.mjs"),
        [{ kind: "resolver", fallback: "3", line: 1 }],
        "CAP-PC-02: the preceding operator is not the cap's default",
      );

      // CAP-PC-03 — the sole admitted inspector reading the declaration with no `??` is no
      // violation, and its `FALLBACK_MAX_ATTEMPTS` living only in the evidence text is admitted.
      assert.deepEqual(capProblems(replacing(units, inspectorRel, "const declaredCap = config?.work?.autonomous?.maxAttempts;\nconst why = `retry fallback: ${FALLBACK_MAX_ATTEMPTS}`;\n")), [], "CAP-PC-03: declaration inspection is an admitted act");

      // …and the one-home cut reports NOT FOUND, naming the MODULE and the line, rather than
      // asserting over a region it could not cut.
      assert.throws(
        () => capSites("export const cap = config?.work?.autonomous?.maxAttempts", "src/synthetic/no-statement.mjs"),
        /src\/synthetic\/no-statement\.mjs:1: NOT FOUND/u,
        "an uncuttable region fails loudly and names the module, not just a bare line number",
      );
    },
  },
  {
    name: "arch/53 FF-5310 (acd-loop-cap-single-home): work.autonomous introduces no second key and loop declares no private cap default",
    run: async () => {
      const units = await sourceUnits();
      assert.ok(units.length > 150, `src/**/*.mjs was actually walked: ${units.length} modules`);
      assert.deepEqual(keyProblems(units), [], "control: work.autonomous retains maxAttempts and no retired heartbeat reader");
      const loopRel = "src/commands/loop.mjs";
      const loop = units.find((unit) => unit.rel === loopRel);
      assert.ok(loop != null, `${loopRel}: was read`);
      assert.deepEqual(privateDefaultProblems(loopRel, loop.code), [], "control: the loop reads the existing fallback literal");

      // CAP-MUT-07 — a third key under work.autonomous.
      const extra = keyProblems([...units, { rel: "src/commands/greedy.mjs", code: "const n = config?.work?.autonomous?.maxCycles;\n" }]);
      assert.equal(extra.length, 1, `CAP-MUT-07: exactly the new key is reported\n${extra.join("\n")}`);
      assert.ok(extra[0].includes("CAP-MUT-07") && extra[0].includes("maxCycles") && extra[0].includes("src/commands/greedy.mjs"), extra[0]);

      // CAP-MUT-08 — the remaining member of the closed set disappearing is equally a failure.
      const gone = keyProblems(units.map((unit) => ({ rel: unit.rel, code: unit.code.replaceAll("autonomous?.maxAttempts", "autonomous?.other") })));
      assert.ok(gone.some((problem) => problem.includes("CAP-MUT-08") && problem.includes("maxAttempts")), `CAP-MUT-08: a lost member of the closed set is caught\n${gone.join("\n")}`);

      // CAP-MUT-09 — a private cap default declared in the loop command.
      const priv = privateDefaultProblems(loopRel, "const DEFAULT_CAP = 5;\nexport const loopCommand = {};\n");
      assert.equal(priv.length, 1, "CAP-MUT-09: a private default is caught");
      assert.ok(priv[0].includes("CAP-MUT-09") && priv[0].includes("DEFAULT_CAP") && priv[0].includes(`${loopRel}:1`), priv[0]);
    },
  },
  {
    name: "arch/53 FF-5310 (acd-loop-cap-single-home): autonomous is a thin work-loop door with no surviving prose shell and `<process>` is the one home for the range driver",
    run: async () => {
      const raw = await readFile(path.join(root, AUTONOMOUS), "utf8");
      assert.ok(raw.length > 500, "autonomous prompt was actually read");
      assert.deepEqual(promptProblems(raw), [], "the shipped prompt names `aof work loop` as its body and no other command for driving the range");
      const prompt = stripHtml(raw);
      const region = markedRegion(prompt, PROCESS_OPEN, PROCESS_CLOSE);
      assert.ok(region != null, `${AUTONOMOUS}: NOT FOUND — the ${PROCESS_OPEN} block could not be cut`);
      assert.ok([...region.matchAll(/aof work loop/gu)].length >= 1, "autonomous must name aof work loop as its body; two occurrences (invoke + resume) are allowed");
    },
  },
  {
    name: "arch/53 FF-5310 (acd-loop-cap-single-home): CAP-MUT-10…15 and CAP-PC-04/05 — the seven deletion tokens AND the closed one-driver rule are each driven by a plant",
    run: async () => {
      // A faithful minimal prompt, so a plant mutates a real shape rather than a strawman. The
      // unmutated form is itself a control: it must be clean.
      const control = [
        "---",
        "description: Drives a milestone range through the code-owned loop shell.",
        "---",
        "<config>",
        "- **--solo** — force solo role execution for this wrapper session.",
        "- **--ship** — after the shell reports a milestone accepted, run `aof:code-review <NN>`.",
        "</config>",
        "",
        PROCESS_OPEN,
        "Run `aof work loop <range> --level L2`, adding `--cap N` when `--max-attempts N` was supplied.",
        "If it halted, report the exact resume command it printed (`aof work loop <range> --resume`).",
        PROCESS_CLOSE,
        "",
      ].join("\n");
      assert.deepEqual(promptProblems(control), [], "control: a two-occurrence prompt is clean");
      // CAP-PC-05 — TWO `aof work loop` occurrences PASS (the invocation and the `--resume` hint);
      // FF-5310's original "exactly once" would have failed a verbatim ADR-008 §1 implementation.
      assert.equal([...stripHtml(control).matchAll(/aof work loop/gu)].length, 2, "CAP-PC-05: the invocation plus the --resume hint");

      // CAP-MUT-10 — each of the seven tokens, planted back one at a time.
      for (const token of SHELL_TOKENS) {
        const problems = promptProblems(`${control}\nA line that says ${token} in the body.\n`);
        assert.ok(
          problems.some((problem) => problem.includes("CAP-MUT-10") && problem.includes(token) && problem.includes("line 14")),
          `CAP-MUT-10: planting \`${token}\` must be reported with its line\n${problems.join("\n")}`,
        );
      }

      // CAP-PC-04 — the same token inside an HTML comment is prose, not instruction. The SHIPPED
      // prompt carries ZERO HTML comments, so reading `stripHtml` off it proves nothing; the
      // control has to be synthetic or it is vacuous.
      assert.equal((await readFile(path.join(root, AUTONOMOUS), "utf8")).includes("<!--"), false, "recorded: the shipped prompt has no HTML comment, which is why this control is synthetic");
      for (const token of SHELL_TOKENS) {
        assert.deepEqual(promptProblems(`${control}\n<!-- historical note: this block used to say ${token} -->\n`), [], `CAP-PC-04: \`${token}\` inside a stripped HTML comment is prose, not instruction`);
      }

      // CAP-MUT-11 — the loop deleted and no replacement named.
      const deleted = promptProblems(control.replaceAll("aof work loop", "the shell"));
      assert.ok(deleted.some((problem) => problem.includes("CAP-MUT-11")), `CAP-MUT-11: zero occurrences fail\n${deleted.join("\n")}`);

      // CAP-MUT-12 / CAP-MUT-13 — `aof work next` / `aof work run-start` planted as the alternate
      // driver. Each is caught as an ALTERNATE DRIVER by the closed set, independently of the
      // deletion-token leg: the reports name the verb, not merely the denylisted literal.
      for (const [id, verb] of [["CAP-MUT-12", "next"], ["CAP-MUT-13", "run-start"]]) {
        const problems = promptProblems(control.replace(PROCESS_CLOSE, `Then run \`aof work ${verb} <range>\` to advance.\n${PROCESS_CLOSE}`));
        assert.ok(
          problems.some((problem) => problem.includes("CAP-MUT-14/15") && problem.includes(`aof work ${verb}`)),
          `${id}: the closed driver set must name \`aof work ${verb}\` as an alternate driver\n${problems.join("\n")}`,
        );
      }

      // CAP-MUT-14 — ANOTHER `aof work <verb>` labelled as the command that drives the range, with
      // every one of the seven deletion tokens still absent. THIS IS THE MEASURED HOLE: before the
      // closed set existed, this exact text left the gate 4 passed / 0 failed.
      const alternate = `${control}\nTo drive the range, run \`aof work drive-continue <range>\` — that is the command that drives the range.\n`;
      assert.deepEqual(SHELL_TOKENS.filter((token) => stripHtml(alternate).includes(token)), [], "CAP-MUT-14: the plant trips NONE of the seven deletion tokens — which is the whole point");
      const extracted = promptProblems(alternate);
      assert.ok(extracted.some((problem) => problem.includes("CAP-MUT-14/15") && problem.includes("aof work drive-continue")), `CAP-MUT-14: the alternate command must be EXTRACTED and named\n${extracted.join("\n")}`);
      assert.ok(extracted.some((problem) => problem.includes("CAP-MUT-15") && problem.includes("OUTSIDE")), `CAP-MUT-15: a driving command outside <process> is a second procedure\n${extracted.join("\n")}`);

      // CAP-MUT-15 — a second range-driving command placed BESIDE the valid loop invocation,
      // inside `<process>`: both driving commands are reported and the one-body rule fails.
      const beside = promptProblems(control.replace(PROCESS_CLOSE, `Alternatively drive it with \`aof work drive-range <range>\`.\n${PROCESS_CLOSE}`));
      assert.ok(beside.some((problem) => problem.includes("CAP-MUT-14/15") && problem.includes("aof work drive-range")), `CAP-MUT-15: a second driver beside the valid one fails the closed rule\n${beside.join("\n")}`);

      // …and the `<process>` block itself is cut from the one home, so a prompt that lost it fails
      // as NOT FOUND rather than as "names no driver".
      const unmarked = promptProblems(control.replaceAll(PROCESS_OPEN, "<body>").replaceAll(PROCESS_CLOSE, "</body>"));
      assert.ok(unmarked.some((problem) => problem.includes("NOT FOUND")), `a prompt with no ${PROCESS_OPEN} block fails as NOT FOUND\n${unmarked.join("\n")}`);

      // …and the two blocks that are NOT loop shell must stay.
      assert.ok(promptProblems(control.replaceAll("--solo", "--single")).some((problem) => problem.includes("`--solo`")), "a dropped --solo block is named");
      assert.ok(promptProblems(control.replaceAll("--ship", "--deliver")).some((problem) => problem.includes("`--ship`")), "a dropped --ship block is named");
    },
  },
  {
    name: "arch/53 FF-5310 (acd-loop-cap-single-home): bundle gains no loop/drive wrapper and retains autonomous",
    run: async () => {
      const manifest = JSON.parse(await readFile(path.join(root, "src", "bundle", "bundle.json"), "utf8"));
      const members = manifest.members ?? manifest;
      assert.ok(Array.isArray(members) && members.length > 20, `bundle manifest was actually read: ${members.length} members`);
      const commandIds = members.filter((member) => member.kind === "command").map((member) => member.id);
      assert.deepEqual(manifestProblems(commandIds), [], "the door coexists and no second range driver was added beside it");
      // The plants, through the same pure checker.
      assert.ok(manifestProblems([...commandIds, "loop"]).some((problem) => problem.includes("`loop` member")), "a /aof:loop member is named");
      assert.ok(manifestProblems([...commandIds, "drive-continue"]).some((problem) => problem.includes("drive-continue")), "a /aof:drive-continue member is named");
      assert.ok(manifestProblems(commandIds.filter((id) => id !== "autonomous")).some((problem) => problem.includes("autonomous")), "the removed door is named");
      for (const name of ["refine.md", "continue.md", "verify.md"]) {
        const text = await readFile(path.join(root, "src", "bundle", "commands", name), "utf8");
        assert.ok(text.length > 500, `${name} was actually read`);
      }
    },
  },
  {
    name: "arch/61 FF-6111 (acd-loop-cap-single-home): the one missing clamp lands at its own funnel, and the value-shaped resolvers are DERIVED from the callables rather than a parallel allow-list",
    run: async () => {
      const units = await sourceUnits();
      // THE PRE-EXISTING RECORDS FIRST — this extension is additive, and both
      // standing rules are re-asserted from 61's side before anything new is.
      assert.deepEqual(loopBoundHomeProblems(units), [], "69/FF-6901: the new ceiling constant lives in the leaf and in no other module, and the leaf still annexes neither the cap nor dispatch concurrency");
      assert.deepEqual(capProblems(units), [], "53/FF-5310: the four-site reader set and each site's `?? 3` fallback are byte-intact");

      // ADR-009 §2's probe bounds something only where a clamp exists, so this is
      // the leg that makes the probe more than a bound-shaped nothing.
      const ranges = [
        ["work.loop.reviewRounds", loopBounds.MAX_REVIEW_ROUNDS],
        ["work.loop.buildNoProgressRounds", loopBounds.MAX_BUILD_NO_PROGRESS_ROUNDS],
      ];
      for (const [key, ceiling] of ranges) {
        const resolve = loopBounds.LOOP_BOUND_VALUE_RESOLVERS[key];
        assert.notEqual(resolve(ceiling + 1), ceiling + 1, `${key}: resolve(ceiling + 1) !== ceiling + 1`);
        assert.notEqual(resolve(0), 0, `${key}: resolve(floor - 1) !== floor - 1`);
        assert.equal(resolve(ceiling), ceiling, `${key}: and the ceiling resolves to itself, so the clamp bounds rather than refuses`);
        assert.equal(loopBounds.rangeProbe(key, ceiling + 1).admissible, false, `${key}: one past the ceiling is not admissible`);
        assert.equal(loopBounds.rangeProbe(key, ceiling).admissible, true, `${key}: the ceiling itself is`);
      }

      // DERIVED FROM THE CALLABLES, and the key sets are equal in both directions.
      assert.deepEqual(
        Object.keys(loopBounds.LOOP_BOUND_VALUE_RESOLVERS).sort(),
        Object.keys(loopBounds.LOOP_BOUND_CONFIG_RESOLVERS).sort(),
        "a value-shaped resolver cannot name a key its config-shaped sibling does not",
      );
      const callables = new Set(Object.values(loopBounds).filter((value) => typeof value === "function"));
      for (const [key, resolver] of Object.entries(loopBounds.LOOP_BOUND_VALUE_RESOLVERS)) {
        assert.equal(typeof resolver, "function", `${key} maps to a callable`);
        assert.ok(callables.has(resolver), `${key} maps to one of the leaf's OWN resolvers, not to a copy of one`);
      }

      // …and in the source the map's values are bare identifiers. A quoted name
      // there would be a parallel allow-list wearing a resolver's shape — able to
      // claim a key nothing actually resolves.
      const home = units.find((unit) => unit.rel === LOOP_BOUND_HOME)?.code ?? "";
      const declaredAt = home.indexOf("LOOP_BOUND_VALUE_RESOLVERS");
      assert.ok(declaredAt >= 0, `${LOOP_BOUND_HOME}: NOT FOUND — LOOP_BOUND_VALUE_RESOLVERS is not declared`);
      const literal = matchedBraceBody(home, declaredAt);
      assert.ok(literal != null, `${LOOP_BOUND_HOME}: NOT FOUND — the value-resolver map's object literal could not be cut`);
      const entries = [...literal.matchAll(/"([^"]+)"\s*:\s*([^,\n]+)/gu)];
      assert.equal(entries.length, Object.keys(loopBounds.LOOP_BOUND_VALUE_RESOLVERS).length, "every declared entry was read from the literal");
      for (const [, key, value] of entries) {
        assert.match(value.trim(), /^[A-Za-z_$][\w$]*$/u, `${key} maps to a bare identifier, never a quoted resolver name`);
      }

      // THE CLAMP IS AT THE ONE FUNNEL both stall paths and the config path arrive
      // through — cut structurally, so a moved declaration reports NOT FOUND.
      const funnelAt = home.indexOf("resolveBuildNoProgressRounds =");
      assert.ok(funnelAt >= 0, `${LOOP_BOUND_HOME}: NOT FOUND — the no-progress resolver is not declared`);
      const params = matchedParenSpan(home, funnelAt);
      const clamp = params == null ? null : matchedParenSpan(home, params.close);
      assert.ok(clamp != null, `${LOOP_BOUND_HOME}: NOT FOUND — the no-progress resolver's clamping call could not be cut`);
      assert.match(clamp.body, /MAX_BUILD_NO_PROGRESS_ROUNDS/u, "the ceiling is applied inside the resolver every door funnels through");
      assert.match(clamp.body, /positiveInteger/u, "and the floor is still enforced by the same funnel");

      // The leaf is still a leaf: it depends on nothing outside itself, so asking it whether a value
      // is in range cannot read a file, and cannot write one. The unit is the FAMILY (119/ADR-002) —
      // if the bounds home is ever decomposed into `src/loop-bounds/`, the edges inside it are the
      // module's own wiring rather than dependencies out of it, while a bare specifier or a node
      // builtin is still a violation.
      await assertFamilyPurity(assert, root, LOOP_BOUND_HOME);
    },
  },
  {
    name: "arch/61 FF-6111 (acd-loop-cap-single-home): the attempt key resolves to MORE THAN ONE bound — counted from its own call sites — so every step on it is refused step-would-be-compound, and no range is declared for it anywhere",
    run: async () => {
      const units = await sourceUnits();
      const record = await readFile(path.join(root, ARBITER), "utf8");
      const tunable = tunableKeysFrom(record);
      assert.ok(tunable != null, `${ARBITER}: NOT FOUND — the \`parameter-tuning:\` edge could not be read, so the tunable set cannot be resolved from the registry`);
      assert.ok(tunable.includes(CAP_KEY), "the key stays in the declared tunable set — what 61 refuses is COMMITTING a step on it, never proposing one");

      const measured = resolvedAttemptBounds(units);
      assert.deepEqual(measured.problems, [], "control: every resolution site in the real tree binds a bound this census can name");
      assert.ok(measured.bounds.length > 1, `the key resolves to MORE THAN ONE bound: ${measured.bounds.map((entry) => entry.bound).join(" + ")}`);
      assert.equal(measured.bounds.length, 2, "two of them, at HEAD");
      assert.deepEqual(
        measured.bounds.map((entry) => entry.exhaustedBy).sort(),
        ["a phase being driven again", "a run being retried"],
        "and they are exhausted by different events",
      );
      const sites = [...new Set(measured.bounds.flatMap((entry) => entry.sites).map((site) => site.slice(0, site.lastIndexOf(":"))))].sort();
      assert.deepEqual(sites, [...EXPECTED_READERS].sort(), "the sites counted are exactly 53/FF-5310's recorded resolver set");

      // …THEREFORE the refusal — computed from that count and from nothing else.
      const bounds = measured.bounds.map((entry) => entry.bound);
      const refusal = loopBounds.compoundStepRefusal({ key: CAP_KEY, bounds });
      assert.equal(refusal?.code, loopBounds.STEP_WOULD_BE_COMPOUND);
      assert.equal(refusal.code, "step-would-be-compound", "reported by its own name");
      assert.deepEqual([...refusal.bounds].sort(), [...bounds].sort(), "and it names the bounds the one write would have moved");
      assert.notEqual(refusal.code, loopBounds.OUTSIDE_DECLARED_RANGE, "never reported as a value that fell outside a range");

      // NO FLOOR AND NO CEILING ARE DECLARED FOR IT ANYWHERE, and none is invented
      // so that it has one.
      assert.ok(!Object.keys(loopBounds.LOOP_BOUND_VALUE_RESOLVERS).includes(CAP_KEY), "no value-shaped resolver declares a range for it");
      assert.ok(!Object.keys(loopBounds.LOOP_BOUND_CONFIG_RESOLVERS).includes(CAP_KEY), "and no config-shaped one does either");
      assert.equal(loopBounds.rangeProbe(CAP_KEY, 4).code, loopBounds.NO_DECLARED_RANGE, "asked for a range, the machinery answers silence rather than admitting the value");
      assert.deepEqual(rangeTableProblems(units, tunable), [], "and no module in src/ declares a floor or a ceiling beside a tunable key");
    },
  },
  {
    name: "arch/61 FF-6111 (acd-loop-cap-single-home): CLAMP-MUT-01…04 — the bound census, the derived refusal and the second-range-home sweep are each driven by a plant through the instrument the real tree is measured by",
    run: async () => {
      const units = await sourceUnits();
      const record = await readFile(path.join(root, ARBITER), "utf8");
      const tunable = tunableKeysFrom(record);
      // THE CONTROL FIRST, so an instrument that always complains cannot be
      // mistaken for one that detects the plants.
      assert.deepEqual(resolvedAttemptBounds(units).problems, [], "control: the unmutated tree classifies cleanly");
      assert.deepEqual(rangeTableProblems(units, tunable), [], "control: the unmutated tree declares no second range home");

      // CLAMP-MUT-01 — THE DAY THE KEY STOPS MEANING TWO THINGS. The drive-cycle
      // site comes to resolve the attempt ceiling like its three siblings, the
      // count falls to one, and the refusal lifts on its own with nothing edited
      // anywhere and no fact about the key's name to remember to delete.
      const single = resolvedAttemptBounds(replacing(units, "src/commands/loop.mjs", "  const maxAttempts = ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3;\n"));
      assert.deepEqual(single.problems, []);
      assert.equal(single.bounds.length, 1, `CLAMP-MUT-01: one bound remains — ${single.bounds.map((entry) => entry.bound).join(", ")}`);
      assert.equal(loopBounds.compoundStepRefusal({ key: CAP_KEY, bounds: single.bounds.map((entry) => entry.bound) }), null, "CLAMP-MUT-01: and the refusal stops applying, computed from the count rather than recorded against the name");

      // CLAMP-MUT-02 — a resolution site whose binder this census cannot classify
      // is reported, never silently counted as a third bound nor silently dropped.
      const unmapped = resolvedAttemptBounds([...units, { rel: "src/commands/budgeted.mjs", code: "const attemptBudget = config?.work?.autonomous?.maxAttempts ?? 3;\n" }]);
      assert.ok(unmapped.problems.some((problem) => problem.includes("attemptBudget") && problem.includes("src/commands/budgeted.mjs")), `CLAMP-MUT-02: an unclassifiable binder is reported\n${unmapped.problems.join("\n")}`);

      // CLAMP-MUT-03 — a site bound to nothing at all fails as NOT FOUND, naming
      // the module and the line, rather than being classified by a guess.
      const uncuttable = resolvedAttemptBounds([...units, { rel: "src/commands/bare.mjs", code: "config?.work?.autonomous?.maxAttempts ?? 3;\n" }]);
      assert.ok(uncuttable.problems.some((problem) => problem.includes("NOT FOUND") && problem.includes("src/commands/bare.mjs:1")), `CLAMP-MUT-03: an uncuttable binder fails loudly and names the module\n${uncuttable.problems.join("\n")}`);

      // CLAMP-MUT-04 — a second home for a range that already exists where the
      // knob is resolved. Two homes for one number become two different numbers.
      const secondHome = rangeTableProblems([...units, {
        rel: "src/work-acceptor/ranges.mjs",
        code: 'export const RANGES = { "work.loop.reviewRounds": { floor: 1, ceiling: 5 } };\n',
      }], tunable);
      assert.ok(secondHome.some((problem) => problem.includes("src/work-acceptor/ranges.mjs") && problem.includes("work.loop.reviewRounds")), `CLAMP-MUT-04: a declared range table is reported\n${secondHome.join("\n")}`);

      // …and the census's own cut, driven directly: the four shapes the tree
      // actually uses each resolve to the binder the language binds them to.
      const binderIn = (code) => binderOf(code, code.indexOf("autonomous?.maxAttempts"));
      assert.equal(binderIn("  const maxAttempts = input.maxAttempts ?? ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3;\n"), "maxAttempts", "an assignment binds the read to its declared name");
      assert.equal(binderIn("function resolveAttemptCeiling(config) {\n  return config?.work?.autonomous?.maxAttempts ?? 3;\n}\n"), "resolveAttemptCeiling", "a return binds it to the function it returns from");
      assert.equal(binderIn("const settings = {\n  level: DEFAULT_LEVEL,\n  cap: input?.cap ?? ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3,\n};\n"), "cap", "a property binds it to the property name");
      assert.equal(binderIn("config?.work?.autonomous?.maxAttempts ?? 3;\n"), null, "and a read bound to nothing is NOT FOUND, never guessed");
    },
  },
];
