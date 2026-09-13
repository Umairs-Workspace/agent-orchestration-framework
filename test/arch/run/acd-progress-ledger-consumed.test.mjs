// F-69-V7: a declared progress authority is not delivered until the production
// build loop consumes it. This guard distinguishes a resolvable ceiling pointer
// from a runtime reader and keeps measurement in loop-progress.mjs.
//
// F-69-V8 widens the same distinction from the ONE bound this story wired to
// EVERY framework loop record that declares a `config:` ceiling. FF-6902 and
// `work-loops-resolved-ceilings` both stop at resolution — they prove a pointer
// names a callable resolver, and are satisfied whether or not anything calls it.
// That is precisely the half F-6900 (69/00's review cap) and F-69-V7 (69/03's
// progress ledger) each slipped through, and the generalisation 69/06's own
// `## Notes` committed to making so there is not a third.
//
// What the F-69-V8 half does NOT reach, stated so it is not mistaken for cover:
// it proves the BOUND has a production reader outside its declaring home, which
// is what the criterion asks. It does not prove that reader is itself reachable
// from a production entry point — `src/loop-progress.mjs` read
// `work.loop.buildNoProgressRounds` throughout F-69-V7, while nothing called
// `src/loop-progress.mjs`. Reachability for THIS bound is the first test above;
// the quantified check is the register, not the call graph.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

// 54/03 review finding D5 — "is this a usable argv array" is `work:grade`'s own predicate and
// is read here rather than restated, so the declaration and the command that runs it can
// never disagree about what usable means.
import { usableCommand } from "../../../src/commands/grade.mjs";
import { LOOP_BOUND_CONFIG_RESOLVERS, resolvesLoopBoundConfigKey } from "../../../src/loop-bounds.mjs";
import { loadLoops } from "../../../src/work/loops.mjs";
// 61/FF-6109 — the DECISION-SITE half is the acceptor's own predicate, imported rather than
// restated. Two implementations of "does this bound have a consumer?" would be two answers
// the first time either changed, which is the species this whole file exists to indict.
import {
  HARNESS_NOT_INTROSPECTABLE,
  HARNESS_OF_RECORD,
  NOT_ADMISSIBLE,
  consumptionReport,
  executedConsumerRefusal,
  harnessRefusal,
  tunableSet,
} from "../../../src/work-acceptor/admissibility.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { matchedParenSpan } from "../../support/source-slice.mjs";

const root = process.cwd();

// The module that DECLARES a bound cannot be the module that proves it consumed.
// ADR-001 gave the `work.loop.*` family one home and deliberately left
// `work.autonomous.maxAttempts` with its pre-existing readers, so a key the
// bounds leaf does not resolve has no declaring module to exclude.
const BOUND_DECLARING_HOME = "loop-bounds.mjs";
const declaringHomeFor = (key) => (resolvesLoopBoundConfigKey(key) ? BOUND_DECLARING_HOME : null);

// `src/bundle/**` is shipped ASSETS — the loop records themselves and the hook
// bodies installed into a project. An asset mentioning a bound is not the
// running program reading it.
const isProductionUnit = (rel) => !rel.startsWith("bundle/");

// A dotted config path inside a QUOTED STRING is a diagnostic, not a read:
// `resolveLoopBound(cap, "reviewRounds", "work.loop.reviewRounds")` names the key
// it could not resolve. Counting that as consumption would let the real reader be
// deleted while the guard stayed green — the exact failure this check exists to
// catch, one level up.
// EXPORTED for 61/FF-6110 (`acd-tunable-set-is-the-registry`), which asks the same question
// of a different subject — "does this module SPELL a knob key, as opposed to quoting one in
// a message?" — and must ask it with the same reading. A second copy of this stripper is a
// second definition of what counts as code, and the two would answer differently the first
// time either was touched.
export function codeOnly(source) {
  return source
    .replace(/(^|[^:])\/\/[^\n]*/gu, "$1 ")
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/"(?:[^"\\\n]|\\.)*"/gu, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/gu, "''")
    .replace(/`(?:[^`\\]|\\.)*`/gu, "``");
}

// Three spellings of a read, and no fourth:
//   1. the bound's own resolver, called by name;
//   2. the config path, read directly off the workspace;
//   3. the resolved field, taken off the policy object the declaring home
//      composes — admitted ONLY for a module that imports that home, because a
//      bare field name matches any identifier that happens to share it, and a
//      matcher that broad turns this guard into a formality.
function readsBound(unit, key) {
  const home = declaringHomeFor(key);
  if (home !== null && unit.rel.endsWith(home)) return false;
  const segments = key.split(".");
  const leaf = segments.at(-1);
  const parent = segments.at(-2);
  const capitalised = `${leaf[0].toUpperCase()}${leaf.slice(1)}`;
  const code = codeOnly(unit.code);
  if (new RegExp(`\\b${leaf}FromConfig\\b`, "u").test(code)) return true;
  if (new RegExp(`\\bresolve${capitalised}\\b`, "u").test(code)) return true;
  if (new RegExp(`\\b${parent}\\s*\\??\\.\\s*${leaf}\\b`, "u").test(code)) return true;
  const importsHome = home !== null && new RegExp(`from\\s+"[^"]*${home}"`, "u").test(unit.code);
  return importsHome && new RegExp(`\\b${leaf}\\b`, "u").test(code);
}

// Every `config:` ceiling on every framework loop record, as `{ nodeId, key }`.
function configCeilings(model) {
  return model.nodes
    .filter((node) => node.kind === "loop")
    .flatMap((node) => (Array.isArray(node.fields.ceiling) ? node.fields.ceiling : [])
      .filter((entry) => entry.kind === "pointer"
        && entry.pointer?.scheme === "config"
        && typeof entry.pointer.operand === "string")
      .map((entry) => ({ nodeId: node.id, key: entry.pointer.operand })));
}

// PURE — ceilings in, production units in, findings out. Pure so the unconsumed
// state can be PLANTED without deleting a real production reader in order to
// prove the check can see one missing.
export function unconsumedCeilings(ceilings, units) {
  const production = units.filter((unit) => isProductionUnit(unit.rel));
  return ceilings.flatMap(({ nodeId, key }) => {
    const readers = production.filter((unit) => readsBound(unit, key)).map((unit) => unit.rel);
    if (readers.length > 0) return [];
    return [{
      code: "loop-ceiling-unconsumed",
      nodeId,
      key,
      message: `${nodeId}: ceiling config:${key} RESOLVES but no production module${declaringHomeFor(key) === null ? "" : ` outside src/${BOUND_DECLARING_HOME}`} reads the bound — a resolvable pointer is a declaration, not a caller (F-6900, F-69-V7, F-69-V8).`,
    }];
  });
}

function readerIndex(ceilings, units) {
  const production = units.filter((unit) => isProductionUnit(unit.rel));
  return new Map(ceilings.map(({ key }) => [
    key,
    production.filter((unit) => readsBound(unit, key)).map((unit) => unit.rel).sort(),
  ]));
}

// Strips the read spellings of ONE bound and leaves every other key standing, so
// the planted mutation reports the ceiling that lost its reader rather than every
// ceiling that shared a module with it.
function withoutReadsOf(code, key) {
  const segments = key.split(".");
  const leaf = segments.at(-1);
  const parent = segments.at(-2);
  const capitalised = `${leaf[0].toUpperCase()}${leaf.slice(1)}`;
  return code
    .replaceAll(`${leaf}FromConfig`, "elidedFromConfig")
    .replaceAll(`resolve${capitalised}`, "resolveElided")
    .replace(new RegExp(`${parent}(\\s*\\??\\.\\s*)${leaf}\\b`, "gu"), `${parent}$1elided`)
    .replace(new RegExp(`\\b${leaf}\\b`, "gu"), "elided");
}

async function productionUnits() {
  const files = await readSrcFiles(root);
  return Promise.all(files.map(async (file) => ({ rel: file.rel, code: await readFile(file.path, "utf8") })));
}

// ── 61/FF-6109 — THE SECOND PREDICATE, BESIDE THE FIRST (61/ADR-008 §1) ───────────────────
//
// This file's own header already names the residue it does not reach: *"it does not prove
// that reader is itself reachable from a production entry point."* Milestone 60's spike
// measured what that residue costs — worded on READERS the check above finds a live reader
// for every knob the registry declares tunable and refuses NONE of them; worded on
// CONSUMERS, a resolved value that reaches a DECISION, it refuses all of them at HEAD.
//
// So the rule ships HERE, as a second exported predicate beside `unconsumedCeilings`, and
// NOT as a sibling file and NOT as a weakening of the first. The two questions are
// different and both are worth asking: `unconsumedCeilings` still returns `[]` on this tree
// and its legs are untouched, while this one returns three findings on the same tree from
// the same units. That difference, asserted below, IS the control — a change that turns
// this predicate green by relaxing what counts as consumption has broken it, not fixed it.
//
// The analysis itself is the acceptor's (`src/work-acceptor/admissibility.mjs`), imported
// rather than copied, so the gate and the running acceptor cannot disagree about what a
// consumer is. This predicate adds only the registry's `nodeId` to each finding.
export function unconsumedAtDecisionSites(ceilings, units, { model = null } = {}) {
  return ceilings.flatMap(({ nodeId, key }) => {
    const refusal = executedConsumerRefusal(key, units, { model });
    return refusal == null ? [] : [{ ...refusal, nodeId }];
  });
}

// A planted consumer for ONE bound: a production module that resolves it through the
// declared resolver and lets that value decide. Planted rather than written into `src/`,
// because the evidence wanted is "the check can see a consumer appear", not a change to the
// tree — and a knob given one must DROP OUT, which is what makes this a ratchet pointing at
// fixing the tree rather than at freezing its defect.
function withDecisionSiteConsumerFor(units, key) {
  const leaf = key.split(".").at(-1);
  return [...units, {
    rel: "commands/planted-consumer.mjs",
    code: [
      `import { ${leaf}FromConfig } from "../loop-bounds.mjs";`,
      "export function drive(workspace, taken) {",
      `  const bound = ${leaf}FromConfig(workspace);`,
      "  if (taken >= bound) return \"stop\";",
      "  return \"go\";",
      "}",
      "",
    ].join("\n"),
  }];
}

export const archTests = [
  {
    name: "arch/69 F-69-V7 the loop command reaches the progress producer and decision authority",
    run: async () => {
      const command = await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8");
      const engine = await readFile(path.join(root, "src", "work", "loop.mjs"), "utf8");
      assert.match(command, /sampleWorktreeProgress/u);
      assert.match(command, /appendProgressSample/u);
      assert.match(command, /readProgressSamples/u);
      // RE-AIMED 2026-08-27 (milestone 55 / VERIFICATION F-55-M-5), and re-aimed rather than
      // re-pinned. This asserted one literal ARGUMENT SPELLING —
      // `invokeRegistered("work:grade", { ref: act.ref, run: true }` with `}` required
      // immediately after `run: true` — so 55/02's provenance work adding a THIRD key
      // (`claimRun: phaseRun.record.runId`) and wrapping the call across lines turned it red
      // without touching the reach it exists to protect. Re-measuring the regex to the new
      // spelling would restore green and leave the same tripwire for the next refactor; the
      // rule is that the loop REACHES the grade with the acting item and a real run, not how
      // the object is typed. The call's own argument span is cut by MATCHING PARENS through
      // the one home, so a moved or renamed call fails as NOT FOUND rather than as a false
      // claim about the rule, and extra keys are admitted while a missing `ref`/`run` is not.
      const gradeCall = command.indexOf('invokeRegistered("work:grade"');
      assert.ok(gradeCall >= 0, "the loop command invokes work:grade through the registry");
      const gradeArgs = matchedParenSpan(command, gradeCall);
      assert.ok(gradeArgs != null, "the work:grade invocation's argument list is balanced and closes");
      assert.match(gradeArgs.body, /\bref:\s*act\.ref\b/u, "the grade is taken for the ACTING item, not a re-derived ref");
      assert.match(gradeArgs.body, /\brun:\s*true\b/u, "the grade is RUN, not read from a stale record");
      assert.match(command, /decideLoopProgress/u);
      assert.match(engine, /evaluateProgressPolicy/u);
      assert.match(engine, /decideBuildProgress/u);
      const productionWrite = command.indexOf("const sample = await recordBuildProgress({");
      const productionDecision = command.indexOf("const progressDecision = decideLoopProgress({", productionWrite);
      assert.ok(productionWrite >= 0 && productionDecision > productionWrite, "the producer runs before its decision is consumed");
      assert.ok(engine.indexOf("evaluateProgressPolicy(") < engine.indexOf("decideBuildProgress("), "attempt stalls are decided before the failing-count derivative");
    },
  },
  {
    name: "arch/69 F-69-V7 the command creates no second progress measurement home",
    run: async () => {
      const command = await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8");
      assert.doesNotMatch(command, /\["status",\s*"--porcelain"\]/u);
      assert.doesNotMatch(command, /\["diff",\s*"--numstat"/u);
      assert.doesNotMatch(command, /\["rev-list",\s*"--count"/u);
      assert.match(command, /commit:\s*head\.trim\(\)/u, "capturing the round's starting commit is not a second measurement");
    },
  },
  {
    name: "arch/69 F-69-V7 this repository declares a runnable grade rubric",
    run: async () => {
      // RE-AIMED AT WHAT THIS CONTROL'S NAME CLAIMS (54/03 review finding D5, cross-lane;
      // recorded in `54/STATE.md` citing 54/02's standing rule). It pinned the literal
      // `["node", "scripts/test.mjs"]` — and on this control node that command is exactly
      // what a runnable rubric is NOT: it spawns the whole suite with no `AOF_GLOBAL_HOME`
      // (fixtures into the real `~/.aof`, which this repo's own PreToolUse hook exists to
      // block) and `global-work-propagation` binds `:4182`, which the live control daemon
      // holds, so the declaration this control froze could never grade green here. A control
      // whose assertion contradicts its own name is the m45/R5 shape; the name is the
      // contract, so the assertions are the name's.
      const config = JSON.parse(await readFile(path.join(root, ".aof", "aof.config.json"), "utf8"));
      const rubric = config.work.rubric;
      // DECLARED, and as an argv ARRAY — through `work:grade`'s OWN predicate rather than a
      // second copy of it (`54/ADR-004` §1: never a shell string).
      assert.ok(rubric != null && typeof rubric === "object", "a rubric is declared");
      assert.equal(usableCommand(rubric.command), true, "…as a usable argv array, never a shell string");
      // RUNNABLE: the runner it names is a file this repository actually carries. A
      // declaration naming a script nobody wrote grades `runner-spawn-failed` forever, and
      // that is the failure this control exists to catch before a loop meets it.
      const runner = rubric.command.find((element) => element.endsWith(".mjs") || element.endsWith(".js"));
      assert.ok(runner != null, `the declared command names a runner script: ${JSON.stringify(rubric.command)}`);
      assert.equal(existsSync(path.resolve(root, runner)), true, `the declared runner exists on disk: ${runner}`);
      // AND ITS REPORT IS DECLARED, with a floor that is real evidence rather than one case.
      assert.equal(rubric.report.format, "tap");
      assert.ok(rubric.report.floor > 0);
    },
  },
  {
    name: "arch/69 F-69-V8 every framework config ceiling has a production reader outside the module that declares it",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const ceilings = configCeilings(model);
      const units = await productionUnits();

      // Non-vacuity, both sides: a real registry with real ceilings, measured
      // against a real src tree. A check that walks nothing passes everything.
      assert.ok(units.length > 50, `the src tree was actually read: ${units.length} modules`);
      assert.ok(ceilings.length >= 3, `the registry supplied config ceilings to resolve: ${ceilings.length}`);
      assert.deepEqual(
        [...new Set(ceilings.map((entry) => entry.key))].sort(),
        ["work.autonomous.maxAttempts", "work.loop.buildNoProgressRounds", "work.loop.reviewRounds"],
        "the quantification covers every config ceiling on disk, not a hand-listed subset",
      );

      assert.deepEqual(
        unconsumedCeilings(ceilings, units),
        [],
        "a ceiling whose pointer resolves but whose bound nothing reads is a declaration, not a caller",
      );

      // Name the readers rather than counting them, so a failure says which
      // module was carrying the bound and is now gone.
      for (const [key, readers] of readerIndex(ceilings, units)) {
        assert.ok(readers.length > 0, `${key}: at least one production reader`);
        assert.ok(
          readers.every((rel) => declaringHomeFor(key) === null || !rel.endsWith(BOUND_DECLARING_HOME)),
          `${key}: the declaring home does not count as its own consumer (${readers.join(", ")})`,
        );
      }
    },
  },
  {
    name: "arch/69 F-69-V8 a ceiling that resolves but is read by nothing names itself unconsumed",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const ceilings = configCeilings(model);
      const units = await productionUnits();
      const subject = "work.loop.buildNoProgressRounds";

      // RESOLUTION and CONSUMPTION are the two states this check exists to tell
      // apart: the planted bound still resolves to a callable, so FF-6902 and
      // work-loops-resolved-ceilings stay green on exactly the tree this reports.
      assert.equal(resolvesLoopBoundConfigKey(subject), true);
      assert.equal(typeof LOOP_BOUND_CONFIG_RESOLVERS[subject], "function");

      const readers = readerIndex(ceilings, units).get(subject);
      assert.ok(readers.length > 0, "the mutation has something real to remove");
      const silenced = units.map((unit) => ({ rel: unit.rel, code: withoutReadsOf(unit.code, subject) }));

      const findings = unconsumedCeilings(ceilings, silenced);
      assert.deepEqual(findings.map((finding) => finding.code), ["loop-ceiling-unconsumed"]);
      assert.deepEqual(findings.map((finding) => finding.key), [subject]);
      assert.match(findings[0].nodeId, /build-to-green/u);
      assert.match(findings[0].message, /RESOLVES but no production module/u);

      // The other ceilings are untouched by the mutation — the check reports the
      // bound that lost its reader, not every bound in the registry.
      assert.equal(unconsumedCeilings(ceilings, units).length, 0);
    },
  },
  {
    name: "arch/69 F-69-V8 the reader detector admits the three real spellings and refuses a quoted key",
    run: () => {
      const key = "work.loop.buildNoProgressRounds";
      const unit = (code) => ({ rel: "commands/probe.mjs", code });
      assert.equal(readsBound(unit("const n = buildNoProgressRoundsFromConfig(ws);\n"), key), true, "the declared resolver");
      assert.equal(readsBound(unit("const n = resolveBuildNoProgressRounds(raw);\n"), key), true, "the pure resolver");
      assert.equal(readsBound(unit("const n = config?.work?.loop?.buildNoProgressRounds;\n"), key), true, "a direct config read");
      assert.equal(
        readsBound(unit('import { loopBoundsFromConfig } from "../loop-bounds.mjs";\nconst { buildNoProgressRounds } = loopBoundsFromConfig(ws);\n'), key),
        true,
        "the resolved field, off the policy the declaring home composes",
      );

      // A diagnostic naming the key it could not resolve is not a read. Without
      // this, deleting the real reader would leave the guard green on the error
      // string that reports the deletion.
      assert.equal(readsBound(unit('throw new Error("work.loop.buildNoProgressRounds is unset");\n'), key), false, "a quoted config path");
      assert.equal(readsBound(unit("// reads work.loop.buildNoProgressRounds one day\n"), key), false, "a comment");
      assert.equal(readsBound(unit("const { buildNoProgressRounds } = somethingElse();\n"), key), false, "a bare field name with no import of the declaring home");
      assert.equal(readsBound({ rel: "loop-bounds.mjs", code: "export const resolveBuildNoProgressRounds = (v) => v;\n" }, key), false, "the declaring home is not its own consumer");

      // The `work.autonomous.maxAttempts` family has no declaring leaf to
      // exclude (ADR-001 left it with its pre-existing readers), so any
      // production module reading the path counts.
      assert.equal(declaringHomeFor("work.autonomous.maxAttempts"), null);
      assert.equal(readsBound(unit("const cap = ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3;\n"), "work.autonomous.maxAttempts"), true);
    },
  },

  // ── 61/FF-6109 (ADR-008 §1–§3) ─────────────────────────────────────────────────────────
  {
    name: "arch/61 FF-6109 a READER is not a CONSUMER: the same tree that satisfies the reader leg fails the decision-site leg for every declared knob",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const ceilings = configCeilings(model);
      const units = await productionUnits();
      assert.ok(units.length > 50, `the src tree was actually read: ${units.length} modules`);

      // THE MEASURED CLAIM, ASSERTED FROM BOTH SIDES AT ONCE. If these two ever agree on
      // this tree, either the tree was fixed (and the second array shrinks, which the leg
      // below allows) or somebody re-worded consumption as reading — the failure this
      // control exists to prevent, and the one that let the same defect survive twice.
      assert.deepEqual(unconsumedCeilings(ceilings, units), [], "every ceiling has a live READER outside its declaring home");
      const reported = unconsumedAtDecisionSites(ceilings, units, { model });
      assert.ok(reported.length > 0, "…and not one of them has a CONSUMER: a vacuous control is the failure this exists to prevent");

      // SHRINK-ONLY, NEVER A COUNT: the reported set is a subset of what the registry
      // declares tunable, so a knob that gains a decision-site consumer drops out without
      // this gate needing an edit, and a knob that is merely renamed cannot sneak in.
      const declared = tunableSet(model).keys;
      for (const finding of reported) {
        assert.equal(finding.code, NOT_ADMISSIBLE);
        assert.ok(declared.includes(finding.key), `${finding.key}: reported key is in the declared tunable set`);
        assert.ok(finding.nodeId.length > 0, `${finding.key}: the finding names the record that declares the ceiling`);
        assert.match(finding.message, /RESOLVES/u, `${finding.key}: the refusal says the bound still resolves`);
        assert.match(finding.message, /Resolution is not consumption/u);
      }
    },
  },
  {
    name: "arch/61 FF-6109 a knob given a decision-site consumer DROPS OUT, and the others are untouched — the ratchet points at fixing the tree",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const ceilings = configCeilings(model);
      const units = await productionUnits();
      const before = unconsumedAtDecisionSites(ceilings, units, { model }).map((finding) => finding.key).sort();
      assert.ok(before.length > 0, "the mutation has something real to remove");

      for (const subject of before) {
        const after = unconsumedAtDecisionSites(ceilings, withDecisionSiteConsumerFor(units, subject), { model })
          .map((finding) => finding.key)
          .sort();
        assert.deepEqual(after, before.filter((key) => key !== subject), `${subject}: gaining a consumer drops it, and only it`);
      }

      // AND THE DISTINCTION IS THE VERB, not the module: the SAME planted module that only
      // reads the bound and throws the value away leaves the finding standing.
      const [subject] = before;
      const leaf = subject.split(".").at(-1);
      const readerOnly = [...units, {
        rel: "commands/planted-reader.mjs",
        code: `import { ${leaf}FromConfig } from "../loop-bounds.mjs";\nexport function drive(workspace) {\n  const bound = ${leaf}FromConfig(workspace);\n  report(bound);\n  return "go";\n}\n`,
      }];
      assert.deepEqual(
        unconsumedAtDecisionSites(ceilings, readerOnly, { model }).map((finding) => finding.key).sort(),
        before,
        `${subject}: a reader that discards the value is not a consumer`,
      );
      const report = consumptionReport(subject, readerOnly);
      assert.ok(report.resolvedIn.includes("commands/planted-reader.mjs"), "…and the site IS seen, so this is a verdict rather than a miss");
      assert.deepEqual(report.consumers.map((site) => site.rel), []);
    },
  },
  {
    name: "arch/61 FF-6109 the harness switch is EVALUATED over the declared document: it refuses alike every declared knob that document does not name, and has already lifted for the ones it does",
    run: async () => {
      const model = await loadLoops(path.join(root, "src", "bundle"));
      const declared = tunableSet(model).keys;
      assert.ok(declared.length >= 3, `the declaration is non-vacuous: ${declared.length} knobs`);

      // The harness of record is a real document in this repository, and it is READ rather
      // than assumed: the condition is a property of that file's text, not a constant here.
      const document = path.join(root, ...HARNESS_OF_RECORD.document.split("/"));
      assert.equal(existsSync(document), true, `the declared harness exists on disk: ${HARNESS_OF_RECORD.document}`);
      const text = await readFile(document, "utf8");
      const harness = { ...HARNESS_OF_RECORD, text };

      // THE ANTICIPATED EVENT HAS HAPPENED, and this leg records it rather than pinning the
      // tree to the day before it. Until milestone 71 this ground applied to all three declared
      // knobs, and the "NOT HARDCODED" leg below said what would end that: *"the day `continue.md`
      // names the key this ground lifts with nothing in the acceptor edited."* 71/00 (FF-7101) is
      // that day — `commands/continue.md` now states each round bound beside its own config key,
      // so `work.loop.reviewRounds` and `work.loop.buildNoProgressRounds` are named in the harness
      // and the switch has stopped applying to them. Nothing in the acceptor was edited to do it,
      // which is the property this leg was always asserting.
      //
      // THE PARTITION IS READ OFF THE DOCUMENT, never listed here: the next key the prompt names
      // moves sides by itself, and this gate goes on being about the rule rather than about
      // today's two keys. It is derived from the TEXT rather than from `harnessRefusal`'s own
      // answer, so the two are independent and the assertions below are not circular.
      const names = (key) => new RegExp(`(?<![\\w.$-])${key.replaceAll(".", "\\.")}(?![\\w.])`, "u").test(text);
      const named = declared.filter(names);
      const unnamed = declared.filter((key) => !names(key));
      assert.ok(named.length > 0, `${HARNESS_OF_RECORD.document} names at least one declared knob — the lift is real`);
      assert.ok(
        unnamed.length > 0,
        `GOOD NEWS if this is the red: ${HARNESS_OF_RECORD.document} now names EVERY declared knob, so the fail-closed ground applies to nothing and the refusal leg below has nothing left to measure. That is the switch finishing its job, not this gate breaking. FOLLOW-ON: retire the refusal leg and keep the two that do not depend on an unnamed key — the "named ⇒ not refused" leg above and the silent-harness leg below.`,
      );

      // Named in the harness ⇒ NOT refused on this ground. The question is re-opened and falls to
      // be judged on the other grounds (which is what `61/03 task 02`'s row measures one layer up).
      for (const key of named) {
        assert.equal(harnessRefusal(key, harness), null, `${key}: named in the harness, so this ground no longer applies`);
      }

      // Unnamed ⇒ refused, on the one ground, with the one reason.
      const refusals = unnamed.map((key) => harnessRefusal(key, harness));
      assert.equal(refusals.every((refusal) => refusal?.code === HARNESS_NOT_INTROSPECTABLE), true);
      assert.equal(refusals.every((refusal) => refusal.fallback === true && refusal.discriminating === false), true);

      // A SWITCH, not a discriminating control — proven over a harness that names NO key, so the
      // claim does not rest on how many knobs `continue.md` happens to name today. With one
      // unnamed key left in the real document, "one reason for all of them" would be trivially
      // true there; here it is asserted over all three at once.
      const silent = { ...harness, text: "Review the work and apply the confirmed fixes.\n" };
      const alike = declared.map((key) => harnessRefusal(key, silent));
      assert.equal(alike.every((refusal) => refusal?.code === HARNESS_NOT_INTROSPECTABLE), true, "a harness naming no key refuses every declared knob");
      assert.equal(new Set(alike.map((refusal) => refusal.message)).size, 1, "one reason for all of them, particular to none");
      assert.equal(alike.every((refusal) => refusal.fallback === true && refusal.discriminating === false), true);

      // NOT HARDCODED. The same predicate, over the same document with the key named in it,
      // stops refusing — so the day `continue.md` names the REMAINING key this ground lifts for
      // it too, with nothing in the acceptor edited. Driven from the silent harness, so the leg
      // measures the naming rather than inheriting a lift the real document already supplies.
      for (const key of declared) {
        assert.equal(
          harnessRefusal(key, { ...silent, text: `${silent.text}\nResolve the round cap from \`${key}\`.\n` }),
          null,
          `${key}: naming the key in the harness re-opens the question`,
        );
      }
    },
  },
];
